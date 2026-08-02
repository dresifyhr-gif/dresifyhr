import { NextResponse } from "next/server";

import { isAdmin } from "@/lib/admin-auth";
import { prisma } from "@/lib/prisma";
import { markOrderShippedInSheet, markCashCollectedInSheet } from "@/lib/sheets";
import { issueKlubRewardIfEarned } from "@/lib/klub";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Skupne akcije nad više narudžbi odjednom (red za slanje).
// action: "ship" (+by igor/ivica) | "collect" | "assign" (+by)
export async function POST(request: Request) {
  if (!(await isAdmin())) return NextResponse.json({ ok: false }, { status: 401 });

  const body = await request.json().catch(() => ({}));
  const ids: string[] = Array.isArray(body?.ids) ? body.ids.filter((x: unknown) => typeof x === "string") : [];
  const action = String(body?.action || "");
  const by = body?.by === "ivica" ? "ivica" : body?.by === "igor" ? "igor" : null;

  if (!ids.length) return NextResponse.json({ ok: false, message: "Ništa nije označeno" }, { status: 400 });

  const orders = await prisma.order.findMany({
    where: { id: { in: ids } },
    select: { id: true, phone: true, customerName: true, createdAt: true, shippedBy: true, status: true }
  });

  let done = 0;

  for (const o of orders) {
    if (action === "ship") {
      await prisma.order.update({
        where: { id: o.id },
        data: { status: "shipped", shippedBy: by, shippedAt: new Date(), courier: "gls" }
      });
      await markOrderShippedInSheet({ phone: o.phone, name: o.customerName, createdAt: o.createdAt, shipped: true, by }).catch(() => {});
      done++;
    } else if (action === "assign") {
      // Dodijeli pošiljatelja bez mijenjanja statusa (za već poslane).
      await prisma.order.update({ where: { id: o.id }, data: { shippedBy: by } });
      await markOrderShippedInSheet({ phone: o.phone, name: o.customerName, createdAt: o.createdAt, shipped: true, by }).catch(() => {});
      done++;
    } else if (action === "collect") {
      await prisma.order.update({
        where: { id: o.id },
        data: { cashCollected: true, cashCollectedAt: new Date() }
      });
      await markCashCollectedInSheet({ phone: o.phone, name: o.customerName, createdAt: o.createdAt, collected: true, by: o.shippedBy }).catch(() => {});
      // Dresify Klub: preuzeta narudžba može značiti novu nagradu (idempotentno).
      await issueKlubRewardIfEarned(o.phone).catch(() => {});
      done++;
    }
  }

  if (!action || done === 0) return NextResponse.json({ ok: false, message: "Nepoznata akcija" }, { status: 400 });

  return NextResponse.json({ ok: true, done });
}
