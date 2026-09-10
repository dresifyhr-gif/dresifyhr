import { NextResponse } from "next/server";

import { isActiveAdmin } from "@/lib/admin-auth";
import { prisma } from "@/lib/prisma";
import { adjustCustomerTotals } from "@/lib/order-db";
import { setOrderStatusInSheet } from "@/lib/sheets";

export const runtime = "nodejs";

// Marks an order as returned (package came back / never picked up) so the AI and
// dashboard can surface it. Un-returning sends it back to "new".
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await isActiveAdmin())) return NextResponse.json({ ok: false }, { status: 401 });

  const { id } = await params;
  const body = await request.json().catch(() => ({}));
  const returned = body?.returned !== false; // default: mark returned

  const order = await prisma.order.findUnique({
    where: { id },
    select: { id: true, phone: true, customerName: true, createdAt: true, status: true, total: true, shipping: true, shippedAt: true, deliveredAt: true, cashCollected: true }
  });
  if (!order) return NextResponse.json({ ok: false, message: "Narudžba ne postoji" }, { status: 404 });

  // Poništavanje povrata: naplaćena/dostavljena → vrati na stvarno stanje (čuva
  // novac u obračunu); inače → "new" (čeka slanje) da se roba ponovno pošalje.
  const restoreStatus = order.deliveredAt ? "done" : order.cashCollected ? "shipped" : "new";
  const netGoods = order.total - (order.shipping ?? 0);
  // Oba terminalna stanja ("returned"/"cancelled") već su skinuta s totala → idempotentno.
  const alreadyOffTotals = order.status === "returned" || order.status === "cancelled";

  if (returned) {
    // Atomski uvjetni prijelaz: totale skini SAMO ako je OVAJ poziv stvarno promijenio
    // red (spriječi dvostruko kod dvoklika / dva admina istovremeno).
    const res = await prisma.order.updateMany({
      where: { id, status: { not: "returned" } },
      data: { status: "returned", returnedAt: new Date() }
    });
    if (res.count === 1 && !alreadyOffTotals) {
      await adjustCustomerTotals(order.phone, -netGoods, -1);
    }
  } else {
    // Kad se vraća na "čeka slanje", očisti i datum/izvršitelja slanja da bude
    // stvarno svježa narudžba za ponovno slanje (status vodi prikaz i obračun).
    const restoreData =
      restoreStatus === "new"
        ? { status: "new", returnedAt: null, shippedAt: null, shippedBy: null }
        : { status: restoreStatus, returnedAt: null };
    const res = await prisma.order.updateMany({
      where: { id, status: "returned" },
      data: restoreData
    });
    if (res.count === 1) {
      await adjustCustomerTotals(order.phone, netGoods, 1);
    }
  }

  if (returned) {
    await setOrderStatusInSheet({ phone: order.phone, name: order.customerName, createdAt: order.createdAt, note: "VRAĆENO — nije pokupljeno" });
  }

  return NextResponse.json({ ok: true, returned });
}
