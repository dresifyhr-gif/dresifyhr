import { NextResponse } from "next/server";

import { isAdmin } from "@/lib/admin-auth";
import { prisma } from "@/lib/prisma";
import { updateOrderFieldsInSheet } from "@/lib/sheets";
import { formatCroatianName, formatCroatianPhone, repairText } from "@/lib/utils";

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

  // Zrcali izmjenu u Sheet (traži red po STAROM broju + datumu). Best-effort.
  const sheetFields: Record<string, string> = {};
  if (data.customerName != null) sheetFields["Ime"] = formatCroatianName(data.customerName);
  if (data.phone !== undefined) sheetFields["Telefon"] = data.phone ? formatCroatianPhone(data.phone) : "";
  if (data.address !== undefined) sheetFields["Adresa"] = data.address ? repairText(data.address) : "";
  await updateOrderFieldsInSheet({ phone: order.phone, name: order.customerName, createdAt: order.createdAt, fields: sheetFields });

  return NextResponse.json({ ok: true });
}
