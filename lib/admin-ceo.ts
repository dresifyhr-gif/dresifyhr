import "server-only";

import { prisma } from "@/lib/prisma";
import { jerseys } from "@/lib/data/jerseys";
import { formatCroatianName } from "@/lib/utils";

const DAY = 86_400_000;

type Named = { name: string; qty?: number; total?: number; recent?: number; prior?: number; delta?: number };

// CEO-level extras on top of getDashboardMetrics: today's standout order/customer,
// which product is rising/falling, what to reorder, and a rough day projection.
export async function getCeoInsights(todayRev: number) {
  const now = new Date();
  const startToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const start14 = new Date(now.getTime() - 14 * DAY);
  const start28 = new Date(now.getTime() - 28 * DAY);

  const nameForSlug = new Map(jerseys.map((j) => [j.slug, `${j.klub} — ${j.igrac}`]));

  const [todayOrders, recentAgg, priorAgg] = await Promise.all([
    prisma.order.findMany({
      where: { createdAt: { gte: startToday }, status: { not: "cancelled" } },
      select: { customerName: true, total: true }
    }),
    prisma.orderItem.groupBy({
      by: ["slug", "klub", "igrac"],
      where: { order: { createdAt: { gte: start14 }, status: { not: "cancelled" } } },
      _sum: { quantity: true }
    }),
    prisma.orderItem.groupBy({
      by: ["slug"],
      where: { order: { createdAt: { gte: start28, lt: start14 }, status: { not: "cancelled" } } },
      _sum: { quantity: true }
    })
  ]);

  // Biggest order today + customer of the day (most spent today)
  let biggestOrderToday: Named | null = null;
  const spend = new Map<string, number>();
  for (const o of todayOrders) {
    if (!biggestOrderToday || o.total > (biggestOrderToday.total ?? 0)) {
      biggestOrderToday = { name: formatCroatianName(o.customerName), total: o.total };
    }
    spend.set(o.customerName, (spend.get(o.customerName) ?? 0) + o.total);
  }
  let customerOfDay: Named | null = null;
  for (const [name, total] of spend) {
    if (!customerOfDay || total > (customerOfDay.total ?? 0)) customerOfDay = { name: formatCroatianName(name), total };
  }

  // Rising / declining / reorder by velocity (last 14d vs prior 14d)
  const recentMap = new Map<string, { qty: number; name: string }>();
  for (const r of recentAgg) {
    recentMap.set(r.slug ?? "", { qty: r._sum.quantity ?? 0, name: `${r.klub} — ${r.igrac}` });
  }
  const priorMap = new Map(priorAgg.map((r) => [r.slug ?? "", r._sum.quantity ?? 0]));

  let rising: Named | null = null;
  let reorder: Named | null = null;
  for (const [slug, { qty, name }] of recentMap) {
    const prior = priorMap.get(slug) ?? 0;
    const delta = qty - prior;
    if (!reorder || qty > (reorder.qty ?? 0)) reorder = { name, qty };
    if (delta > 0 && (!rising || delta > (rising.delta ?? 0))) rising = { name, delta, recent: qty, prior };
  }

  let declining: Named | null = null;
  for (const [slug, prior] of priorMap) {
    const recent = recentMap.get(slug)?.qty ?? 0;
    const drop = prior - recent;
    if (drop > 0 && (!declining || drop > ((declining.prior ?? 0) - (declining.recent ?? 0)))) {
      declining = { name: recentMap.get(slug)?.name ?? nameForSlug.get(slug) ?? slug, recent, prior };
    }
  }

  // Rough projection for the whole day based on fraction elapsed (min floor so
  // early-morning numbers aren't wild).
  const hoursElapsed = (now.getTime() - startToday.getTime()) / 3_600_000;
  const frac = Math.min(1, Math.max(0.3, hoursElapsed / 24));
  const projection = todayRev > 0 ? todayRev / frac : 0;

  return { biggestOrderToday, customerOfDay, rising, declining, reorder, projection, todayOrderCount: todayOrders.length };
}

export type CeoInsights = Awaited<ReturnType<typeof getCeoInsights>>;
