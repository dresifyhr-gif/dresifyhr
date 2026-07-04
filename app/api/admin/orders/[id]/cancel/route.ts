import { NextResponse } from "next/server";

import { isAdmin } from "@/lib/admin-auth";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

// Marks an order cancelled (customer called it off) so it drops out of the shipping
// queue and never gets sent. Un-cancelling returns it to "new".
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await isAdmin())) return NextResponse.json({ ok: false }, { status: 401 });

  const { id } = await params;
  const body = await request.json().catch(() => ({}));
  const cancelled = body?.cancelled !== false; // default: mark cancelled

  const order = await prisma.order.findUnique({ where: { id }, select: { id: true } });
  if (!order) return NextResponse.json({ ok: false, message: "Narudžba ne postoji" }, { status: 404 });

  await prisma.order.update({
    where: { id },
    data: cancelled ? { status: "cancelled" } : { status: "new", shippedBy: null, shippedAt: null }
  });

  return NextResponse.json({ ok: true, cancelled });
}
