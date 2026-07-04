import { NextResponse } from "next/server";

import { isAdmin } from "@/lib/admin-auth";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

export async function POST(request: Request) {
  if (!(await isAdmin())) return NextResponse.json({ ok: false }, { status: 401 });

  const body = await request.json().catch(() => ({}));
  const amount = Number(body?.amount);
  if (!Number.isFinite(amount) || amount <= 0) {
    return NextResponse.json({ ok: false, message: "Neispravan iznos" }, { status: 400 });
  }

  await prisma.adSpend.create({
    data: { amount, note: typeof body?.note === "string" ? body.note : null }
  });

  return NextResponse.json({ ok: true });
}
