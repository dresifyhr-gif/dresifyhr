import { NextResponse } from "next/server";

import { requireAction } from "@/lib/admin-auth";
import { getDashboardMetrics } from "@/lib/admin-metrics";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

// Records a settlement point: from now on the Igor/Ivica split only counts profit
// after this moment. Stores a snapshot of the current period's amounts for history.
export async function POST() {
  if (!(await requireAction("settlement"))) return NextResponse.json({ ok: false, message: "Nemaš ovlast za poravnanje." }, { status: 403 });

  const m = await getDashboardMetrics();
  const s = m.split;

  await prisma.settlement.create({
    data: {
      amount: s.settleAmount,
      fromPartner: s.settleFrom,
      igorProfit: s.igor.profit,
      ivicaProfit: s.ivica.profit
    }
  });

  return NextResponse.json({ ok: true });
}

// Undo the last settlement (in case of a mistake).
export async function DELETE() {
  if (!(await requireAction("settlement"))) return NextResponse.json({ ok: false, message: "Nemaš ovlast za poravnanje." }, { status: 403 });

  const last = await prisma.settlement.findFirst({ orderBy: { settledAt: "desc" } });
  if (last) await prisma.settlement.delete({ where: { id: last.id } });

  return NextResponse.json({ ok: true });
}
