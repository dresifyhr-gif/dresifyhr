import { NextResponse } from "next/server";

import { isAdmin, requireAction } from "@/lib/admin-auth";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Entry = {
  id: string;
  at: string; // ISO
  amount: number | null; // upisani iznos (null za rekonstruirane)
  matchedTotal: number; // zbroj označenih narudžbi
  count: number;
  byUser: string | null;
  exact: boolean; // true = spremljen zapis, false = rekonstruiran iz cashCollectedAt
};

// Povijest GLS isplata: spremljeni zapisi (točni) + rekonstruirani prošli
// (grupirani po točnom trenutku naplate iz Order.cashCollectedAt).
export async function GET() {
  if (!(await isAdmin())) return NextResponse.json({ ok: false }, { status: 401 });

  const logs = await prisma.glsPayout.findMany({ orderBy: { createdAt: "desc" }, take: 200 });

  // Rekonstrukcija: sve naplaćene GLS narudžbe, grupirane po točnom cashCollectedAt.
  const collected = await prisma.order.findMany({
    where: {
      cashCollected: true,
      cashCollectedAt: { not: null },
      OR: [{ courier: null }, { courier: { not: "hp" } }]
    },
    select: { total: true, cashCollectedAt: true }
  });

  // Trenuci koji su već pokriveni spremljenim zapisom (±2 min) — da se ne dupliciraju.
  const loggedTimes = logs.map((l) => l.createdAt.getTime());
  const isLogged = (t: number) => loggedTimes.some((lt) => Math.abs(lt - t) < 120_000);

  const groups = new Map<string, { total: number; count: number; at: number }>();
  for (const o of collected) {
    if (!o.cashCollectedAt) continue;
    const t = o.cashCollectedAt.getTime();
    if (isLogged(t)) continue; // pokriveno točnim zapisom
    const key = o.cashCollectedAt.toISOString();
    const g = groups.get(key) || { total: 0, count: 0, at: t };
    g.total += o.total;
    g.count += 1;
    groups.set(key, g);
  }

  const entries: Entry[] = [
    ...logs.map((l) => ({
      id: l.id,
      at: l.createdAt.toISOString(),
      amount: l.amount,
      matchedTotal: l.matchedTotal,
      count: l.count,
      byUser: l.byUser,
      exact: true
    })),
    ...[...groups.entries()].map(([key, g]) => ({
      id: `rec-${key}`,
      at: key,
      amount: null,
      matchedTotal: g.total,
      count: g.count,
      byUser: null,
      exact: false
    }))
  ].sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime());

  const totalPaid = entries.reduce((s, e) => s + (e.amount ?? e.matchedTotal), 0);

  return NextResponse.json({ ok: true, entries, totalPaid });
}

// Spremi zapis isplate (poziva se nakon što se narudžbe označe naplaćenima).
export async function POST(request: Request) {
  const me = await requireAction("owner"); // GLS isplata (novac) = samo vlasnik
  if (!me) return NextResponse.json({ ok: false }, { status: 403 });
  const body = await request.json().catch(() => ({}));
  const amount = Number(body?.amount) || 0;
  const matchedTotal = Number(body?.matchedTotal) || 0;
  const count = Number(body?.count) || 0;
  if (count <= 0) return NextResponse.json({ ok: false, message: "Ništa nije označeno" }, { status: 400 });

  const rec = await prisma.glsPayout.create({
    data: { amount, matchedTotal, count, byUser: me?.username ?? null }
  });
  return NextResponse.json({ ok: true, id: rec.id });
}
