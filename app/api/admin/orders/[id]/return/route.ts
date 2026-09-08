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
    select: { id: true, phone: true, customerName: true, createdAt: true, status: true, total: true, shipping: true, shippedAt: true, deliveredAt: true }
  });
  if (!order) return NextResponse.json({ ok: false, message: "Narudžba ne postoji" }, { status: 404 });

  // Poništavanje povrata vraća status prema STVARNOM stanju (čuva slanje/naplatu),
  // a ne slijepo u "new" — inače bi poslana+naplaćena narudžba ispala iz obračuna.
  const restoreStatus = order.deliveredAt ? "done" : order.shippedAt ? "shipped" : "new";

  await prisma.order.update({
    where: { id },
    // returnedAt bilježi KAD je označeno vraćeno → poravnanje računa povrat u ispravno razdoblje
    // (ne po datumu kreiranja narudžbe). Poništavanje povrata ga očisti i vrati raniji status.
    data: returned
      ? { status: "returned", returnedAt: new Date() }
      : { status: restoreStatus, returnedAt: null }
  });

  // Vraćena narudžba nije uspješna potrošnja → skini je s kupčevih totala (neto roba).
  // Guard protiv dvostrukog: mijenjaj samo na stvarnom prijelazu u/iz "returned".
  const netGoods = order.total - (order.shipping ?? 0);
  if (returned && order.status !== "returned") {
    await adjustCustomerTotals(order.phone, -netGoods, -1);
  } else if (!returned && order.status === "returned") {
    await adjustCustomerTotals(order.phone, netGoods, 1);
  }

  if (returned) {
    await setOrderStatusInSheet({ phone: order.phone, name: order.customerName, createdAt: order.createdAt, note: "VRAĆENO — nije pokupljeno" });
  }

  return NextResponse.json({ ok: true, returned });
}
