import "server-only";

import { prisma } from "@/lib/prisma";
import { jerseys } from "@/lib/data/jerseys";

const DAY = 86_400_000;
// Nabavna cijena po artiklu (dres). Profit = prodajna cijena − nabava.
export const COST_PER_ITEM = 6;

function startOfWeek(now: Date) {
  const d = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const offset = (d.getDay() + 6) % 7; // Monday = 0
  d.setDate(d.getDate() - offset);
  return d;
}

export async function getDashboardMetrics() {
  const now = new Date();
  const startToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startWeek = startOfWeek(now);
  const startMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  const rev = (gte?: Date) =>
    prisma.order.aggregate({ _sum: { total: true }, _count: true, where: gte ? { createdAt: { gte } } : undefined });
  // Profit basis = sum of item prices − (items × cost). Uses jersey prices, not shipping.
  const items = (gte?: Date) =>
    prisma.orderItem.aggregate({ _sum: { unitPrice: true }, _count: true, where: gte ? { order: { createdAt: { gte } } } : undefined });

  const [today, week, month, total, iToday, iWeek, iMonth, iTotal, orderCount, shippedCount, topItems, bestCustomers, recentOrders, windowOrders, soldSlugRows] =
    await Promise.all([
      rev(startToday),
      rev(startWeek),
      rev(startMonth),
      rev(),
      items(startToday),
      items(startWeek),
      items(startMonth),
      items(),
      prisma.order.count(),
      prisma.order.count({ where: { status: { in: ["shipped", "done"] } } }),
      prisma.orderItem.groupBy({ by: ["slug", "klub", "igrac"], _sum: { quantity: true }, orderBy: { _sum: { quantity: "desc" } }, take: 8 }),
      prisma.customer.findMany({ orderBy: { totalSpent: "desc" }, take: 8 }),
      prisma.order.findMany({ orderBy: { createdAt: "desc" }, take: 12 }),
      prisma.order.findMany({ where: { createdAt: { gte: new Date(now.getTime() - 13 * DAY) } }, select: { createdAt: true, total: true } }),
      prisma.orderItem.findMany({ distinct: ["slug"], select: { slug: true } })
    ]);

  const profit = (i: { _sum: { unitPrice: number | null }; _count: number }) => (i._sum.unitPrice ?? 0) - i._count * COST_PER_ITEM;

  // revenue by day, last 14 days
  const byDay: { day: string; total: number }[] = [];
  for (let i = 13; i >= 0; i--) byDay.push({ day: new Date(now.getTime() - i * DAY).toISOString().slice(0, 10), total: 0 });
  const idx = new Map(byDay.map((b, i) => [b.day, i]));
  for (const o of windowOrders) {
    const i = idx.get(o.createdAt.toISOString().slice(0, 10));
    if (i !== undefined) byDay[i].total += o.total;
  }

  const sold = new Set(soldSlugRows.map((r) => r.slug));
  const deadProducts = jerseys.filter((j) => j.liga !== "Komplet" && !sold.has(j.slug)).map((j) => `${j.klub} — ${j.igrac}`);

  const totalRev = total._sum.total ?? 0;

  return {
    todayRev: today._sum.total ?? 0,
    todayOrders: today._count,
    todayProfit: profit(iToday),
    weekRev: week._sum.total ?? 0,
    weekOrders: week._count,
    weekProfit: profit(iWeek),
    monthRev: month._sum.total ?? 0,
    monthOrders: month._count,
    monthProfit: profit(iMonth),
    totalRev,
    totalProfit: profit(iTotal),
    orderCount,
    shippedCount,
    aov: orderCount ? totalRev / orderCount : 0,
    topItems,
    bestCustomers,
    recentOrders,
    byDay,
    deadProducts
  };
}
