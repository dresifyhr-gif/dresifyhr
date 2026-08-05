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

  const paidBy = body?.paidBy === "ivica" ? "ivica" : "igor";
  await prisma.adSpend.create({
    data: { amount, note: typeof body?.note === "string" ? body.note : null, paidBy }
  });

  return NextResponse.json({ ok: true });
}

// Reset oglasa TRENUTNOG razdoblja (od zadnjeg poravnanja) → obriše te zapise, cifra pada na 0.
export async function DELETE() {
  if (!(await isAdmin())) return NextResponse.json({ ok: false }, { status: 401 });

  const last = await prisma.settlement.findFirst({ orderBy: { settledAt: "desc" } });
  const where = last ? { date: { gt: last.settledAt } } : {};
  const res = await prisma.adSpend.deleteMany({ where });

  return NextResponse.json({ ok: true, deleted: res.count });
}
