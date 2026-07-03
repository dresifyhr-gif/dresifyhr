import "server-only";

import { prisma } from "@/lib/prisma";
import { jerseys } from "@/lib/data/jerseys";

const DAY = 86_400_000;

export async function getDashboardMetrics() {
  const now = new Date();
  const startToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  const [today, month, total, orderCount, shippedCount, topItems, bestCustomers, recentOrders, windowOrders, soldSlugRows] =
    await Promise.all([
      prisma.order.aggregate({ _sum: { total: true }, _count: true, where: { createdAt: { gte: startToday } } }),
      prisma.order.aggregate({ _sum: { total: true }, _count: true, where: { createdAt: { gte: startMonth } } }),
      prisma.order.aggregate({ _sum: { total: true } }),
      prisma.order.count(),
      prisma.order.count({ where: { status: { in: ["shipped", "done"] } } }),
      prisma.orderItem.groupBy({
        by: ["slug", "klub", "igrac"],
        _sum: { quantity: true },
        orderBy: { _sum: { quantity: "desc" } },
        take: 8
      }),
      prisma.customer.findMany({ orderBy: { totalSpent: "desc" }, take: 8 }),
      prisma.order.findMany({ orderBy: { createdAt: "desc" }, take: 12 }),
      prisma.order.findMany({ where: { createdAt: { gte: new Date(now.getTime() - 13 * DAY) } }, select: { createdAt: true, total: true } }),
      prisma.orderItem.findMany({ distinct: ["slug"], select: { slug: true } })
    ]);

  // revenue by day, last 14 days (oldest -> newest)
  const byDay: { day: string; total: number }[] = [];
  for (let i = 13; i >= 0; i--) {
    const d = new Date(now.getTime() - i * DAY);
    const key = d.toISOString().slice(0, 10);
    byDay.push({ day: key, total: 0 });
  }
  const idx = new Map(byDay.map((b, i) => [b.day, i]));
  for (const o of windowOrders) {
    const key = o.createdAt.toISOString().slice(0, 10);
    const i = idx.get(key);
    if (i !== undefined) byDay[i].total += o.total;
  }

  // catalog products never sold
  const sold = new Set(soldSlugRows.map((r) => r.slug));
  const deadProducts = jerseys
    .filter((j) => j.liga !== "Komplet" && !sold.has(j.slug))
    .map((j) => `${j.klub} — ${j.igrac}`);

  const totalRev = total._sum.total ?? 0;

  return {
    todayRev: today._sum.total ?? 0,
    todayOrders: today._count,
    monthRev: month._sum.total ?? 0,
    monthOrders: month._count,
    totalRev,
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
