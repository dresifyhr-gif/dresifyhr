import { NextResponse } from "next/server";

import { isActiveAdmin } from "@/lib/admin-auth";
import { prisma } from "@/lib/prisma";
import { sendPushToAll, pushConfigured } from "@/lib/push";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// UTC trenutak ponoći DANAS po Europe/Zagreb — neovisno o TZ poslužitelja i DST-u.
function zagrebStartOfToday(): Date {
  const now = new Date();
  // Zagreb kalendarski datum "danas"
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Zagreb",
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).formatToParts(now);
  const y = Number(parts.find((p) => p.type === "year")!.value);
  const m = Number(parts.find((p) => p.type === "month")!.value);
  const d = Number(parts.find((p) => p.type === "day")!.value);
  // Pretpostavi ponoć u UTC, pa korigiraj za stvarni Zagreb offset na TAJ trenutak
  // (offset u ponoć je nedvojben — DST prijelaz je u 02/03h, ne u ponoć).
  const guess = Date.UTC(y, m - 1, d, 0, 0, 0);
  const asUTC = new Date(guess);
  const zagrebWall = new Date(asUTC.toLocaleString("en-US", { timeZone: "Europe/Zagreb" }));
  const utcWall = new Date(asUTC.toLocaleString("en-US", { timeZone: "UTC" }));
  const offsetMs = zagrebWall.getTime() - utcWall.getTime();
  return new Date(guess - offsetMs);
}

async function run() {
  if (!pushConfigured()) return NextResponse.json({ ok: false, error: "not_configured" }, { status: 503 });

  const start = zagrebStartOfToday();
  let count = 0;
  let revenue = 0;
  try {
    const orders = await prisma.order.findMany({
      where: { createdAt: { gte: start }, status: { notIn: ["cancelled"] } },
      select: { total: true }
    });
    count = orders.length;
    revenue = orders.reduce((s, o) => s + (o.total || 0), 0);
  } catch (e) {
    console.error("[push/daily] upit nije uspio:", e);
    return NextResponse.json({ ok: false, error: "db" }, { status: 500 });
  }

  const eur = `${revenue.toFixed(2).replace(".", ",")} €`;
  const body =
    count === 0
      ? "Danas još nema narudžbi."
      : `${count} ${count === 1 ? "narudžba" : count < 5 ? "narudžbe" : "narudžbi"} · ${eur}`;

  const res = await sendPushToAll({ title: "📅 Dnevni sažetak", body, url: "/admin/", tag: "daily", kind: "daily" });
  return NextResponse.json({ ok: true, count, revenue, push: res });
}

// Vercel Cron šalje GET s "Authorization: Bearer <CRON_SECRET>".
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET?.trim();
  const authHeader = request.headers.get("authorization");
  const fromCron = secret ? authHeader === `Bearer ${secret}` : false;
  if (!fromCron && !(await isActiveAdmin())) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }
  return run();
}

// Ručno okidanje iz admina (gumb "Pošalji sažetak sad").
export async function POST() {
  if (!(await isActiveAdmin())) return NextResponse.json({ ok: false }, { status: 401 });
  return run();
}
