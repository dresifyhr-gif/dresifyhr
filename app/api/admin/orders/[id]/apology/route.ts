import { NextResponse } from "next/server";

import { isAdmin } from "@/lib/admin-auth";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

// Marks that the win-back apology was sent, so the order leaves the apology list
// (it stays "new" — still shippable if the customer responds).
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await isAdmin())) return NextResponse.json({ ok: false }, { status: 401 });

  const { id } = await params;
  const body = await request.json().catch(() => ({}));
  const sent = body?.sent !== false;

  const order = await prisma.order.findUnique({ where: { id }, select: { id: true } });
  if (!order) return NextResponse.json({ ok: false, message: "Narudžba ne postoji" }, { status: 404 });

  await prisma.order.update({ where: { id }, data: { apologySent: sent } });

  return NextResponse.json({ ok: true, sent });
}
