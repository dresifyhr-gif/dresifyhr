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
  const fiveDaysAgo = new Date(Date.now() - 5 * 86_400_000);
  const SENT = { in: ["shipped", "done"] };
  let count = 0;
  let revenue = 0;
  // To-do brojke (jeftini count/aggregate upiti, samo u ovom dnevnom cronu).
  let toShip = 0; // status "new" — čeka slanje
  let stuck = 0; // poslano prije >5 dana, kurir još ne javlja dostavu/povrat
  let unpaid = 0; // kurir javio dostavljeno, pouzeće još nije označeno naplaćenim
  let unpaidSum = 0;
  let toConfirmReturn = 0; // kurir javio povrat, a narudžba još nije označena "Vraćeno"
  try {
    const [orders, newCount, stuckCount, unpaidAgg, returnCount] = await Promise.all([
      prisma.order.findMany({
        where: { createdAt: { gte: start }, status: { notIn: ["cancelled"] } },
        select: { total: true }
      }),
      prisma.order.count({ where: { status: "new" } }),
      prisma.order.count({
        where: {
          status: SENT,
          cashCollected: false,
          shippedAt: { lt: fiveDaysAgo },
          // deliveryStatus null (još neprovjereno) se mora uključiti eksplicitno — notIn ne hvata NULL.
          OR: [{ deliveryStatus: null }, { deliveryStatus: { notIn: ["delivered", "returned"] } }]
        }
      }),
      prisma.order.aggregate({
        _count: { _all: true },
        _sum: { total: true },
        where: { status: SENT, deliveryStatus: "delivered", cashCollected: false }
      }),
      prisma.order.count({ where: { status: SENT, deliveryStatus: "returned" } })
    ]);
    count = orders.length;
    revenue = orders.reduce((s, o) => s + (o.total || 0), 0);
    toShip = newCount;
    stuck = stuckCount;
    unpaid = unpaidAgg._count._all;
    unpaidSum = unpaidAgg._sum.total || 0;
    toConfirmReturn = returnCount;
  } catch (e) {
    console.error("[push/daily] upit nije uspio:", e);
    return NextResponse.json({ ok: false, error: "db" }, { status: 500 });
  }

  const fmt = (n: number) => `${n.toFixed(2).replace(".", ",")} €`;
  const eur = fmt(revenue);
  const today =
    count === 0
      ? "Danas još nema narudžbi."
      : `Danas: ${count} ${count === 1 ? "narudžba" : count < 5 ? "narudžbe" : "narudžbi"} · ${eur}`;
  const todo = [
    `Za slanje: ${toShip}`,
    `Na dostavi >5 dana: ${stuck}`,
    `Dostavljeno, nije naplaćeno: ${unpaid}${unpaid > 0 ? ` (${fmt(unpaidSum)})` : ""}`,
    `Povrati za potvrdu: ${toConfirmReturn}`
  ].join(" · ");
  const body = `${today}\n${todo}`;

  const res = await sendPushToAll({ title: "📅 Dnevni sažetak", body, url: "/admin/", tag: "daily", kind: "daily" });
  return NextResponse.json({ ok: true, count, revenue, toShip, stuck, unpaid, unpaidSum, toConfirmReturn, push: res });
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
