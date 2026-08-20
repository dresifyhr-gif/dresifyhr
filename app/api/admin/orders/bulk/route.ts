import { NextResponse } from "next/server";

import { getAdminUser, isAdmin } from "@/lib/admin-auth";
import { prisma } from "@/lib/prisma";
import { markOrderShippedInSheet, markCashCollectedInSheet } from "@/lib/sheets";
import { issueKlubRewardIfEarned } from "@/lib/klub";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Skupne akcije nad više narudžbi odjednom (red za slanje).
// action: "ship" (+by igor/ivica) | "collect" | "assign" (+by)
export async function POST(request: Request) {
  if (!(await isAdmin())) return NextResponse.json({ ok: false }, { status: 401 });
  const me = await getAdminUser(); // audit: tko je pokrenuo skupnu akciju

  const body = await request.json().catch(() => ({}));
  const ids: string[] = Array.isArray(body?.ids) ? body.ids.filter((x: unknown) => typeof x === "string") : [];
  const action = String(body?.action || "");
  const by = body?.by === "ivica" ? "ivica" : body?.by === "igor" ? "igor" : null;

  // Naplata pouzeća (collect) = novac → samo vlasnik. Slanje/assign ostaje osoblju.
  if (action === "collect" && me?.role !== "OWNER") {
    return NextResponse.json({ ok: false, message: "Naplatu radi samo vlasnik." }, { status: 403 });
  }

  if (!ids.length) return NextResponse.json({ ok: false, message: "Ništa nije označeno" }, { status: 400 });

  const orders = await prisma.order.findMany({
    where: { id: { in: ids } },
    select: { id: true, phone: true, customerName: true, createdAt: true, shippedBy: true, status: true }
  });

  if (!["ship", "assign", "collect"].includes(action)) {
    return NextResponse.json({ ok: false, message: "Nepoznata akcija" }, { status: 400 });
  }

  // DB izmjena odjednom (instant) — bez čekanja na Google Sheet mirror po narudžbi.
  const now = new Date();
  if (action === "ship") {
    await prisma.order.updateMany({ where: { id: { in: ids } }, data: { status: "shipped", shippedBy: by, shippedByUser: me?.username ?? null, shippedAt: now, courier: "gls" } });
  } else if (action === "assign") {
    await prisma.order.updateMany({ where: { id: { in: ids } }, data: { shippedBy: by } });
  } else if (action === "collect") {
    await prisma.order.updateMany({ where: { id: { in: ids } }, data: { cashCollected: true, cashCollectedAt: now } });
  }

  // Sporedni efekti (Google Sheet mirror + Klub nagrade) — PARALELNO i best-effort,
  // da skupna akcija ne traje minutama (prije je bilo sekvencijalno → i po 5 min).
  await Promise.allSettled(
    orders.map(async (o) => {
      if (action === "collect") {
        await markCashCollectedInSheet({ phone: o.phone, name: o.customerName, createdAt: o.createdAt, collected: true, by: o.shippedBy }).catch(() => {});
        await issueKlubRewardIfEarned(o.phone).catch(() => {});
      } else {
        await markOrderShippedInSheet({ phone: o.phone, name: o.customerName, createdAt: o.createdAt, shipped: true, by: action === "assign" ? by : by }).catch(() => {});
      }
    })
  );

  const done = orders.length;

  return NextResponse.json({ ok: true, done });
}
