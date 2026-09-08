import { NextResponse } from "next/server";

import { isAdmin } from "@/lib/admin-auth";
import { prisma } from "@/lib/prisma";
import { sendPushToAll, pushConfigured } from "@/lib/push";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// UTC trenutak ponoći DANAS po Europe/Zagreb (radi ljeti i zimi, bez hardkodiranja).
function zagrebStartOfToday(): Date {
  const now = new Date();
  const zagreb = new Date(now.toLocaleString("en-US", { timeZone: "Europe/Zagreb" }));
  const utc = new Date(now.toLocaleString("en-US", { timeZone: "UTC" }));
  const offsetMs = zagreb.getTime() - utc.getTime(); // +1h zimi, +2h ljeti
  const wall = new Date(now.getTime() + offsetMs);
  wall.setHours(0, 0, 0, 0);
  return new Date(wall.getTime() - offsetMs);
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
  if (!fromCron && !(await isAdmin())) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }
  return run();
}

// Ručno okidanje iz admina (gumb "Pošalji sažetak sad").
export async function POST() {
  if (!(await isAdmin())) return NextResponse.json({ ok: false }, { status: 401 });
  return run();
}
