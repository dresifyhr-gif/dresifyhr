import { NextResponse } from "next/server";

import { isAdmin, requireAction } from "@/lib/admin-auth";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

// Popis unosa oglasa TRENUTNOG razdoblja (od zadnjeg poravnanja) — za uređivanje/brisanje.
export async function GET() {
  if (!(await isAdmin())) return NextResponse.json({ ok: false }, { status: 401 });
  const last = await prisma.settlement.findFirst({ orderBy: { settledAt: "desc" } });
  const where = last ? { date: { gt: last.settledAt } } : {};
  const rows = await prisma.adSpend.findMany({ where, orderBy: { date: "desc" }, take: 100, select: { id: true, amount: true, paidBy: true, date: true } });
  return NextResponse.json({ ok: true, entries: rows });
}

// Ispravak unosa (npr. krivo označen platilac). { id, paidBy }
export async function PATCH(request: Request) {
  if (!(await requireAction("adspend"))) return NextResponse.json({ ok: false, message: "Nemaš ovlast za reklamu." }, { status: 403 });
  const body = await request.json().catch(() => ({}));
  const id = typeof body?.id === "string" ? body.id : null;
  if (!id) return NextResponse.json({ ok: false }, { status: 400 });
  const paidBy = body?.paidBy === "ivica" ? "ivica" : "igor";
  await prisma.adSpend.update({ where: { id }, data: { paidBy } }).catch(() => null);
  return NextResponse.json({ ok: true });
}

export async function POST(request: Request) {
  if (!(await requireAction("adspend"))) return NextResponse.json({ ok: false, message: "Nemaš ovlast za reklamu." }, { status: 403 });

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

// DELETE ?id=... → briše JEDAN unos (npr. slučajno dodan). Bez id → reset svih
// oglasa trenutnog razdoblja (od zadnjeg poravnanja), cifra pada na 0.
export async function DELETE(request: Request) {
  if (!(await requireAction("adspend"))) return NextResponse.json({ ok: false, message: "Nemaš ovlast za reklamu." }, { status: 403 });

  const id = new URL(request.url).searchParams.get("id");
  if (id) {
    await prisma.adSpend.delete({ where: { id } }).catch(() => null);
    return NextResponse.json({ ok: true, deleted: 1 });
  }

  const last = await prisma.settlement.findFirst({ orderBy: { settledAt: "desc" } });
  const where = last ? { date: { gt: last.settledAt } } : {};
  const res = await prisma.adSpend.deleteMany({ where });

  return NextResponse.json({ ok: true, deleted: res.count });
}
