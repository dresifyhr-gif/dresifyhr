import { NextResponse } from "next/server";

import { isActiveAdmin } from "@/lib/admin-auth";
import { adjustCustomerTotals } from "@/lib/order-db";
import { bustCache } from "@/lib/cache-tags";
import { getOrderReference } from "@/lib/orders";
import { prisma } from "@/lib/prisma";
import { setOrderStatusInSheet, updateOrderFieldsInSheet } from "@/lib/sheets";
import { phoneKey, repairText } from "@/lib/utils";

export const runtime = "nodejs";

// Spoji dvije NEPOSLANE narudžbe istog kupca (isti broj) u jednu pošiljku.
// Zadržava se STARIJA narudžba; artikli novije prelaze u nju, novija se briše.
// Dostava se naplaćuje jednom (manja od dvije), popusti se zbrajaju; ne spaja ako obje
// imaju popust-kod. Zaliha i potrošnja kupca ostaju (ista roba); broj narudžbi kupca -1.
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await isActiveAdmin())) return NextResponse.json({ ok: false }, { status: 401 });

  const { id } = await params;
  const body = await request.json().catch(() => ({}));
  const otherId = String(body?.otherId || "");
  if (!otherId || otherId === id) return NextResponse.json({ ok: false, message: "Neispravna narudžba." }, { status: 400 });

  const [a0, b0] = await Promise.all([
    prisma.order.findUnique({ where: { id }, include: { items: true } }),
    prisma.order.findUnique({ where: { id: otherId }, include: { items: true } })
  ]);
  if (!a0 || !b0) return NextResponse.json({ ok: false, message: "Narudžba ne postoji." }, { status: 404 });

  const open = (o: typeof a0) => o.status === "new" && !o.tracking && !o.pin;
  if (!open(a0) || !open(b0)) {
    return NextResponse.json({ ok: false, message: "Spajati se mogu samo neposlane narudžbe (bez trackinga)." }, { status: 400 });
  }
  if (!phoneKey(a0.phone) || phoneKey(a0.phone) !== phoneKey(b0.phone)) {
    return NextResponse.json({ ok: false, message: "Narudžbe nisu od istog kupca (različit broj)." }, { status: 400 });
  }

  // Popust-kodovi se broje po narudžbi (Order.promoCode, točno podudaranje) — dva koda
  // u jednom retku pokvarila bi brojanje (jednokratni Klub/Kolo kod bi opet vrijedio).
  if (a0.promoCode && b0.promoCode) {
    return NextResponse.json(
      { ok: false, message: "Obje narudžbe imaju popust-kod — takve se ne mogu spojiti (pokvarilo bi brojanje kodova). Pošalji ih zasebno ili makni jednu." },
      { status: 400 }
    );
  }

  // Zadrži stariju (ona je prva u Sheetu i ima pravi datum).
  const [keepId, dropId] = a0.createdAt <= b0.createdAt ? [a0.id, b0.id] : [b0.id, a0.id];
  const ref = (o: { reference: string | null; createdAt: Date }) => o.reference || getOrderReference(o.createdAt.toISOString());

  let result: { keep: NonNullable<typeof a0>; drop: NonNullable<typeof a0>; items: NonNullable<typeof a0>["items"]; subtotal: number; itemCount: number; total: number };
  try {
    result = await prisma.$transaction(async (tx) => {
      // Svježe čitanje UNUTAR transakcije (zaštita od dvostrukog klika / izmjene u međuvremenu).
      const keep = await tx.order.findUnique({ where: { id: keepId }, include: { items: true } });
      const drop = await tx.order.findUnique({ where: { id: dropId }, include: { items: true } });
      if (!keep || !drop || !open(keep) || !open(drop) || (keep.promoCode && drop.promoCode)) throw new Error("STALE");

      const items = [...keep.items, ...drop.items];
      const subtotal = items.reduce((s, it) => s + it.unitPrice * (it.quantity || 1), 0);
      const itemCount = items.reduce((s, it) => s + (it.quantity || 1), 0);
      // Jedna pošiljka → jedna dostava. Ako je jedna već imala besplatnu dostavu
      // (prag za registrirane), spojena (još veća) je ima također → manja od dvije.
      const shipping = Math.min(keep.shipping || 0, drop.shipping || 0);
      const discount = (keep.discount || 0) + (drop.discount || 0);
      const total = subtotal + shipping - discount;
      const note = [keep.note, drop.note, `🔗 Spojeno s ${ref(drop)}`].filter(Boolean).join("\n");

      await tx.orderItem.updateMany({ where: { orderId: drop.id }, data: { orderId: keep.id } });
      await tx.order.update({
        where: { id: keep.id },
        data: {
          subtotal,
          itemCount,
          shipping,
          discount,
          total,
          promoCode: keep.promoCode || drop.promoCode,
          note,
          email: keep.email || drop.email,
          address: keep.address || drop.address,
          userId: keep.userId || drop.userId,
          igHandle: keep.igHandle || drop.igHandle
        }
      });
      await tx.order.delete({ where: { id: drop.id } });
      return { keep, drop, items, subtotal, itemCount, total };
    });
  } catch (e) {
    if (e instanceof Error && e.message === "STALE") {
      return NextResponse.json({ ok: false, message: "Jedna od narudžbi se u međuvremenu promijenila — osvježi popis." }, { status: 409 });
    }
    throw e;
  }
  const { keep, drop, items, subtotal, itemCount, total } = result;

  // Dvije narudžbe su postale jedna → kupcu -1 narudžba (potrošnja ostaje ista: ista roba).
  await adjustCustomerTotals(keep.phone, 0, -1);

  // Sheet (best-effort): starija dobiva sve artikle, novija se označi kao spojena.
  const artikli = items
    .map((it, i) => `${i + 1}. ${[repairText(it.klub || ""), repairText(it.igrac || "")].filter(Boolean).join(" ")}${it.size ? " — " + it.size : ""}`)
    .join("\n");
  await updateOrderFieldsInSheet({
    phone: keep.phone,
    name: keep.customerName,
    createdAt: keep.createdAt,
    fields: { Artikli: artikli, Kolicina: itemCount, Ukupno: subtotal }
  });
  await setOrderStatusInSheet({ phone: drop.phone, name: drop.customerName, createdAt: drop.createdAt, note: `SPOJENO u ${ref(keep)}` });

  bustCache("orders");
  return NextResponse.json({ ok: true, keptId: keep.id, reference: ref(keep), total, itemCount });
}
