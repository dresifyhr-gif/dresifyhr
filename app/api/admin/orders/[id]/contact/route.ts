import { NextResponse } from "next/server";

import { isAdmin } from "@/lib/admin-auth";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

// Ispravak kontakt-podataka narudžbe (kad kupac krivo napiše slovo u adresi/imenu/broju).
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await isAdmin())) return NextResponse.json({ ok: false }, { status: 401 });

  const { id } = await params;
  const body = await request.json().catch(() => ({}));

  const data: { customerName?: string; phone?: string | null; address?: string | null } = {};
  if (typeof body?.customerName === "string" && body.customerName.trim()) data.customerName = body.customerName.trim();
  if (typeof body?.phone === "string") data.phone = body.phone.trim() || null;
  if (typeof body?.address === "string") data.address = body.address.trim() || null;

  if (Object.keys(data).length === 0) return NextResponse.json({ ok: false, message: "Ništa za spremiti" }, { status: 400 });

  const order = await prisma.order.findUnique({ where: { id } });
  if (!order) return NextResponse.json({ ok: false, message: "Narudžba ne postoji" }, { status: 404 });

  await prisma.order.update({ where: { id }, data });
  return NextResponse.json({ ok: true });
}
