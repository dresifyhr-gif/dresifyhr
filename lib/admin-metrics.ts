import "server-only";

import { prisma } from "@/lib/prisma";
import { jerseys } from "@/lib/data/jerseys";

const DAY = 86_400_000;
// Nabavna cijena po artiklu (dres). Profit = prodajna cijena − nabava.
export const COST_PER_ITEM = 6;

export async function getDashboardMetrics() {
  const now = new Date();
  const startToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  // Rolling windows so periods are always nested (7d ≤ 30d) — no month-boundary confusion.
  const startWeek = new Date(now.getTime() - 7 * DAY);
  const startMonth = new Date(now.getTime() - 30 * DAY);

  const rev = (gte?: Date) =>
    prisma.order.aggregate({ _sum: { total: true }, _count: true, where: gte ? { createdAt: { gte } } : undefined });
  // Profit basis = sum of item prices − (items × cost). Uses jersey prices, not shipping.
  const items = (gte?: Date) =>
    prisma.orderItem.aggregate({ _sum: { unitPrice: true }, _count: true, where: gte ? { order: { createdAt: { gte } } } : undefined });

  const [today, week, month, total, iToday, iWeek, iMonth, iTotal, orderCount, shippedAgg, iShipped, topItems, bestCustomers, recentOrders, windowOrders, soldSlugRows] =
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
      prisma.order.aggregate({ _sum: { total: true }, _count: true, where: { status: { in: ["shipped", "done"] } } }),
      prisma.orderItem.aggregate({ _sum: { unitPrice: true }, _count: true, where: { order: { status: { in: ["shipped", "done"] } } } }),
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

  // ── Extras: trends, shipping queue, win-back, cities, ad ROI ──────────────
  const [prev7, prev30, pending, inactive, allAddr, adAll] = await Promise.all([
    prisma.order.aggregate({ _sum: { total: true }, where: { createdAt: { gte: new Date(now.getTime() - 14 * DAY), lt: startWeek } } }),
    prisma.order.aggregate({ _sum: { total: true }, where: { createdAt: { gte: new Date(now.getTime() - 60 * DAY), lt: startMonth } } }),
    prisma.order.findMany({ where: { status: "new" }, orderBy: { createdAt: "asc" }, take: 40, select: { id: true, createdAt: true, customerName: true, phone: true, itemCount: true, total: true } }),
    prisma.customer.findMany({ where: { lastOrderAt: { lt: new Date(now.getTime() - 60 * DAY) }, totalOrders: { gt: 0 } }, orderBy: { totalSpent: "desc" }, take: 20 }),
    prisma.order.findMany({ select: { address: true, total: true } }),
    prisma.adSpend.aggregate({ _sum: { amount: true } })
  ]);

  const pct = (cur: number, prev: number | null) => (prev && prev > 0 ? ((cur - prev) / prev) * 100 : null);
  const weekChange = pct(week._sum.total ?? 0, prev7._sum.total);
  const monthChange = pct(month._sum.total ?? 0, prev30._sum.total);

  // top cities (parse from address; best-effort)
  const cityMap = new Map<string, { name: string; count: number; total: number }>();
  for (const o of allAddr) {
    const parts = String(o.address || "").split(",").map((s) => s.trim()).filter(Boolean);
    let city = (parts[parts.length - 1] || "").replace(/\d{4,6}/g, "").replace(/^grad\s+/i, "").replace(/\s+/g, " ").trim();
    if (!city) continue;
    const key = city.toLowerCase();
    const e = cityMap.get(key) || { name: city, count: 0, total: 0 };
    e.count++;
    e.total += o.total;
    cityMap.set(key, e);
  }
  const topCities = [...cityMap.values()].sort((a, b) => b.count - a.count).slice(0, 10);

  const adSpendTotal = adAll._sum.amount ?? 0;
  const pendingTotal = pending.reduce((s, o) => s + o.total, 0);

  return {
    weekChange,
    monthChange,
    pending,
    pendingTotal,
    inactive,
    topCities,
    adSpendTotal,
    roas: adSpendTotal > 0 ? totalRev / adSpendTotal : null,
    netAfterAds: profit(iTotal) - adSpendTotal,
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
    shippedCount: shippedAgg._count,
    shippedRev: shippedAgg._sum.total ?? 0,
    shippedProfit: profit(iShipped),
    aov: orderCount ? totalRev / orderCount : 0,
    topItems,
    bestCustomers,
    recentOrders,
    byDay,
    deadProducts
  };
}
