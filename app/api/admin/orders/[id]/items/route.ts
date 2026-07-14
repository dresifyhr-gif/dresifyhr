import { NextResponse } from "next/server";

import { isAdmin } from "@/lib/admin-auth";
import { prisma } from "@/lib/prisma";
import { updateOrderFieldsInSheet } from "@/lib/sheets";
import { repairText } from "@/lib/utils";

export const runtime = "nodejs";

// Edit an order's items: change model (klub/igrac), size, price, or remove items.
// Items not included in the payload are deleted. Order totals are recomputed.
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await isAdmin())) return NextResponse.json({ ok: false }, { status: 401 });

  const { id } = await params;
  const body = await request.json().catch(() => ({}));
  const incoming: { id?: string; klub?: string; igrac?: string; size?: string; unitPrice?: number }[] =
    Array.isArray(body?.items) ? body.items : [];

  const order = await prisma.order.findUnique({ where: { id }, include: { items: true } });
  if (!order) return NextResponse.json({ ok: false, message: "Narudžba ne postoji" }, { status: 404 });

  const keepIds = new Set(incoming.map((it) => it.id).filter(Boolean));

  // Delete removed items
  const toDelete = order.items.filter((it) => !keepIds.has(it.id)).map((it) => it.id);
  if (toDelete.length) await prisma.orderItem.deleteMany({ where: { id: { in: toDelete } } });

  // Update kept items; items WITHOUT an id are NEW → create them.
  for (const it of incoming) {
    if (!it.id) {
      const klub = typeof it.klub === "string" ? it.klub.trim() : "";
      const igrac = typeof it.igrac === "string" ? it.igrac.trim() : "";
      if (!klub && !igrac) continue; // prazan red — preskoči
      await prisma.orderItem.create({
        data: {
          orderId: id,
          klub: klub || null,
          igrac: igrac || null,
          size: typeof it.size === "string" ? it.size.trim() || null : null,
          quantity: 1,
          unitPrice: Number.isFinite(Number(it.unitPrice)) ? Number(it.unitPrice) : 0
        }
      });
      continue;
    }
    await prisma.orderItem.update({
      where: { id: it.id },
      data: {
        klub: typeof it.klub === "string" ? it.klub.trim() : undefined,
        igrac: typeof it.igrac === "string" ? it.igrac.trim() : undefined,
        size: typeof it.size === "string" ? it.size.trim() || null : undefined,
        unitPrice: Number.isFinite(Number(it.unitPrice)) ? Number(it.unitPrice) : undefined
      }
    });
  }

  // Recompute totals
  const items = await prisma.orderItem.findMany({ where: { orderId: id } });
  const subtotal = items.reduce((s, it) => s + it.unitPrice * (it.quantity || 1), 0);
  const itemCount = items.reduce((s, it) => s + (it.quantity || 1), 0);
  const total = subtotal + order.shipping - order.discount;

  await prisma.order.update({ where: { id }, data: { subtotal, itemCount, total } });

  // Zrcali izmjenu artikala u Sheet (artikli/količina/ukupno). Best-effort.
  const artikli = items
    .map((it, i) => `${i + 1}. ${[repairText(it.klub || ""), repairText(it.igrac || "")].filter(Boolean).join(" ")}${it.size ? " — " + it.size : ""}`)
    .join("\n");
  await updateOrderFieldsInSheet({
    phone: order.phone,
    name: order.customerName,
    createdAt: order.createdAt,
    fields: { Artikli: artikli, "Kolicina": itemCount, "Ukupno": subtotal }
  });

  return NextResponse.json({ ok: true });
}
