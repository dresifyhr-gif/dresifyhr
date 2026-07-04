import { NextResponse } from "next/server";

import { isAdmin } from "@/lib/admin-auth";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

// Marks an order as returned (package came back / never picked up) so the AI and
// dashboard can surface it. Un-returning sends it back to "new".
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await isAdmin())) return NextResponse.json({ ok: false }, { status: 401 });

  const { id } = await params;
  const body = await request.json().catch(() => ({}));
  const returned = body?.returned !== false; // default: mark returned

  const order = await prisma.order.findUnique({ where: { id }, select: { id: true } });
  if (!order) return NextResponse.json({ ok: false, message: "Narudžba ne postoji" }, { status: 404 });

  await prisma.order.update({
    where: { id },
    data: returned ? { status: "returned" } : { status: "new", shippedBy: null, shippedAt: null }
  });

  return NextResponse.json({ ok: true, returned });
}
