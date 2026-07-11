import { NextResponse } from "next/server";

import { isAdmin } from "@/lib/admin-auth";
import { prisma } from "@/lib/prisma";
import { markCashCollectedInSheet } from "@/lib/sheets";

export const runtime = "nodejs";

// Pouzeće: označi da su novci prikupljeni (poštar predao) — ili poništi.
// Prikupio = tko je poslao (shippedBy). Zrcali se u Google Sheet (best-effort).
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await isAdmin())) return NextResponse.json({ ok: false }, { status: 401 });

  const { id } = await params;
  const body = await request.json().catch(() => ({}));
  const collected = body?.collected !== false; // default: označi prikupljeno

  const order = await prisma.order.findUnique({
    where: { id },
    select: { id: true, phone: true, customerName: true, createdAt: true, shippedBy: true }
  });
  if (!order) return NextResponse.json({ ok: false, message: "Narudžba ne postoji" }, { status: 404 });

  await prisma.order.update({
    where: { id },
    data: { cashCollected: collected, cashCollectedAt: collected ? new Date() : null }
  });

  await markCashCollectedInSheet({
    phone: order.phone,
    name: order.customerName,
    createdAt: order.createdAt,
    collected,
    by: order.shippedBy
  });

  return NextResponse.json({ ok: true, collected });
}
