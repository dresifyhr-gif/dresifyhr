import { NextResponse } from "next/server";

import { isActiveAdmin } from "@/lib/admin-auth";
import { prisma } from "@/lib/prisma";
import { adjustCustomerTotals } from "@/lib/order-db";
import { setOrderStatusInSheet } from "@/lib/sheets";

export const runtime = "nodejs";

// Marks an order cancelled (customer called it off) so it drops out of the shipping
// queue and never gets sent. Un-cancelling returns it to "new".
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await isActiveAdmin())) return NextResponse.json({ ok: false }, { status: 401 });

  const { id } = await params;
  const body = await request.json().catch(() => ({}));
  const cancelled = body?.cancelled !== false; // default: mark cancelled
  const reason = typeof body?.reason === "string" ? body.reason.trim().slice(0, 200) : "";

  const order = await prisma.order.findUnique({
    where: { id },
    select: { id: true, phone: true, customerName: true, createdAt: true, status: true, total: true, shipping: true, shippedAt: true, deliveredAt: true, cashCollected: true }
  });
  if (!order) return NextResponse.json({ ok: false, message: "Narudžba ne postoji" }, { status: 404 });

  // Poništavanje otkazivanja: naplaćena/dostavljena → vrati na stvarno stanje (čuva
  // novac u obračunu); inače → "new" (čeka slanje).
  const restoreStatus = order.deliveredAt ? "done" : order.cashCollected ? "shipped" : "new";
  const netGoods = order.total - (order.shipping ?? 0);
  // Oba terminalna stanja ("returned"/"cancelled") već su skinuta s totala → idempotentno.
  const alreadyOffTotals = order.status === "returned" || order.status === "cancelled";

  if (cancelled) {
    const res = await prisma.order.updateMany({
      where: { id, status: { not: "cancelled" } },
      data: { status: "cancelled", cancelReason: reason || null }
    });
    if (res.count === 1 && !alreadyOffTotals) {
      await adjustCustomerTotals(order.phone, -netGoods, -1);
    }
  } else {
    const restoreData =
      restoreStatus === "new"
        ? { status: "new", cancelReason: null, shippedAt: null, shippedBy: null }
        : { status: restoreStatus, cancelReason: null };
    const res = await prisma.order.updateMany({
      where: { id, status: "cancelled" },
      data: restoreData
    });
    if (res.count === 1) {
      await adjustCustomerTotals(order.phone, netGoods, 1);
    }
  }

  if (cancelled) {
    await setOrderStatusInSheet({ phone: order.phone, name: order.customerName, createdAt: order.createdAt, note: "OTKAZANO" });
  }

  return NextResponse.json({ ok: true, cancelled });
}
