import { NextResponse } from "next/server";

import { can, getAdminUser, isAdmin } from "@/lib/admin-auth";
import { issueKlubRewardIfEarned } from "@/lib/klub";
import { prisma } from "@/lib/prisma";
import { markCashCollectedInSheet, markOrderShippedInSheet } from "@/lib/sheets";
import { FREE_SHIPPING_THRESHOLD_EUR, SHIPPING_PRICE_EUR } from "@/lib/site";

export const runtime = "nodejs";

// Marks an order shipped (or back to "new") from the admin, and mirrors the
// checkmark into the Google Sheet so Ivica/wife see the same state.
//
// courier "osobno" (Igor 23.11.): narudžba predana OSOBNO — kupac plaća samo robu
// (dostava se briše iz iznosa), novac je odmah preuzet na ruke (naplaćeno), a
// shippedBy = tko je preuzeo gotovinu (igor | ivica) → ide u podjelu novca.
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await isAdmin())) return NextResponse.json({ ok: false }, { status: 401 });
  const me = await getAdminUser(); // tko je prijavljen (audit)

  const { id } = await params;
  const body = await request.json().catch(() => ({}));
  const shipped = body?.shipped !== false; // default: mark shipped
  const by = body?.by === "ivica" ? "ivica" : body?.by === "igor" ? "igor" : null;
  // Kurir: GLS je čest slučaj pa je zadan; HP se bilježi kad se izričito pošalje.
  const courier = body?.courier === "hp" ? "hp" : body?.courier === "osobno" ? "osobno" : "gls";

  const order = await prisma.order.findUnique({
    where: { id },
    select: { id: true, phone: true, customerName: true, createdAt: true, courier: true, total: true, shipping: true, subtotal: true, userId: true, shippingBeforeOsobno: true }
  });
  if (!order) return NextResponse.json({ ok: false, message: "Narudžba ne postoji" }, { status: 404 });

  // Osobna predaja = novac na ruke → samo vlasnik ili partner (oni vode novac).
  const touchesCash = (shipped && courier === "osobno") || (!shipped && order.courier === "osobno");
  if (touchesCash && !can(me?.role, "settlement")) {
    return NextResponse.json({ ok: false, message: "Osobnu predaju s novcem označava Igor ili Ivica." }, { status: 403 });
  }
  if (shipped && courier === "osobno" && !by) {
    return NextResponse.json({ ok: false, message: "Odaberi tko je preuzeo novac." }, { status: 400 });
  }

  const now = new Date();
  const shipping = order.shipping ?? 0;
  const goods = order.total - shipping;

  let data;
  if (shipped && courier === "osobno") {
    data = {
      status: "shipped",
      shippedBy: by,
      shippedByUser: me?.username ?? null,
      shippedAt: now,
      courier,
      shipping: 0,
      total: goods, // kupac plaća samo robu
      shippingBeforeOsobno: order.courier === "osobno" ? order.shippingBeforeOsobno : shipping, // za točno poništavanje
      cashCollected: true,
      cashCollectedAt: now,
      deliveryStatus: "delivered",
      deliveredAt: now
    };
  } else if (shipped) {
    // shippedBy = NOVAC (ostaje kako je bilo). shippedByUser = AUDIT (tko je stisnuo pošalji).
    data = { status: "shipped", shippedBy: by, shippedByUser: me?.username ?? null, shippedAt: now, courier };
  } else if (order.courier === "osobno") {
    // Poništi osobnu predaju: vrati TOČNO onu dostavu koja je bila prije (spremljena),
    // a samo za stare zapise bez nje — pravilo s blagajne (registriran + roba ≥ prag = 0).
    const restored = order.shippingBeforeOsobno ??
      (!!order.userId && (order.subtotal || goods) >= FREE_SHIPPING_THRESHOLD_EUR ? 0 : SHIPPING_PRICE_EUR);
    data = {
      status: "new", shippedBy: null, shippedByUser: null, shippedAt: null, courier: null, cancelReason: null,
      shipping: restored, total: goods + restored, shippingBeforeOsobno: null,
      cashCollected: false, cashCollectedAt: null, deliveryStatus: null, deliveredAt: null
    };
  } else {
    // Vraćeno u nove → stara oznaka dostave više ne vrijedi (nova pošiljka = nova provjera).
    data = { status: "new", shippedBy: null, shippedByUser: null, shippedAt: null, courier: null, cancelReason: null, deliveryStatus: null, deliveredAt: null };
  }

  await prisma.order.update({ where: { id }, data });

  // Best-effort: never block the admin action on the Sheet call.
  await markOrderShippedInSheet({
    phone: order.phone,
    name: order.customerName,
    createdAt: order.createdAt,
    shipped,
    by
  });

  let klubCode: string | null = null;
  if (courier === "osobno" || order.courier === "osobno") {
    const collected = shipped && courier === "osobno";
    await markCashCollectedInSheet({ phone: order.phone, name: order.customerName, createdAt: order.createdAt, collected, by: collected ? by : null }).catch(() => {});
    // Dresify Klub: preuzeta narudžba može značiti novu nagradu (idempotentno).
    if (collected) klubCode = await issueKlubRewardIfEarned(order.phone).catch(() => null);
  }

  return NextResponse.json({ ok: true, shipped, klubCode });
}
