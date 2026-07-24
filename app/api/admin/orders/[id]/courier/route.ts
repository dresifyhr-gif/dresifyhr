import { NextResponse } from "next/server";

import { isAdmin } from "@/lib/admin-auth";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

// Prebacuje kurira na već poslanoj narudžbi (GLS ↔ HP) bez ponovnog slanja.
// Zove se s male oznake GLS/HP uz poslanu narudžbu.
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await isAdmin())) return NextResponse.json({ ok: false }, { status: 401 });

  const { id } = await params;
  const body = await request.json().catch(() => ({}));
  const courier = body?.courier === "hp" ? "hp" : "gls";

  const order = await prisma.order.findUnique({ where: { id }, select: { id: true } });
  if (!order) return NextResponse.json({ ok: false, message: "Narudžba ne postoji" }, { status: 404 });

  await prisma.order.update({ where: { id }, data: { courier } });
  return NextResponse.json({ ok: true, courier });
}
