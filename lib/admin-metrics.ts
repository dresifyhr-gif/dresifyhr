import "server-only";

import { prisma } from "@/lib/prisma";
import { jerseys } from "@/lib/data/jerseys";

const DAY = 86_400_000;
// Nabavne cijene: dres 6€ (prodaja 20 → profit 14), KOMPLET 18€ (prodaja 40 → profit 22).
export const COST_PER_ITEM = 6; // dres
const COST_KOMPLET = 18;
// Komplet se prepoznaje po slugu/nazivu koji sadrži "komplet".
const kompletItemWhere = {
  OR: [{ slug: { contains: "komplet" } }, { igrac: { contains: "komplet", mode: "insensitive" as const } }]
};

export async function getDashboardMetrics() {
  const now = new Date();
  const startToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  // Rolling windows so periods are always nested (7d ≤ 30d) — no month-boundary confusion.
  const startWeek = new Date(now.getTime() - 7 * DAY);
  const startMonth = new Date(now.getTime() - 30 * DAY);

  // Otkazane i vraćene narudžbe NE ulaze u promet/zaradu/količine (nisu prodaja).
  const VOID = ["cancelled", "returned"];
  const notVoid = { status: { notIn: VOID } };

  // Promet = total − dostava (dostava nije prihod; naplati se i vrati kroz pouzeće).
  const rev = (gte?: Date) =>
    prisma.order.aggregate({ _sum: { total: true, shipping: true }, _count: true, where: { ...(gte ? { createdAt: { gte } } : {}), ...notVoid } });
  const net = (a: { _sum: { total: number | null; shipping: number | null } }) => (a._sum.total ?? 0) - (a._sum.shipping ?? 0);
  // Točan profit = Σ prodajne cijene artikala − popust − nabava (komplet 18€, dres 6€).
  const profitFor = async (orderWhere: object = {}) => {
    const [all, komplet, disc] = await Promise.all([
      prisma.orderItem.aggregate({ _sum: { unitPrice: true }, _count: true, where: { order: orderWhere } }),
      prisma.orderItem.count({ where: { order: orderWhere, ...kompletItemWhere } }),
      prisma.order.aggregate({ _sum: { discount: true }, where: orderWhere })
    ]);
    const count = all._count;
    const revenue = all._sum.unitPrice ?? 0;
    const discount = disc._sum.discount ?? 0;
    const cost = komplet * COST_KOMPLET + (count - komplet) * COST_PER_ITEM;
    return revenue - discount - cost;
  };

  const shippedWhere = { status: { in: ["shipped", "done"] } };

  const [today, week, month, total, orderCount, shippedAgg, topItems, bestCustomers, recentOrders, windowOrders, soldSlugRows,
    todayProfit, weekProfit, monthProfit, totalProfit, shippedProfit, pendingProfit] =
    await Promise.all([
      rev(startToday),
      rev(startWeek),
      rev(startMonth),
      rev(),
      prisma.order.count({ where: notVoid }),
      prisma.order.aggregate({ _sum: { total: true, shipping: true }, _count: true, where: shippedWhere }),
      prisma.orderItem.groupBy({ by: ["slug", "klub", "igrac"], _sum: { quantity: true }, orderBy: { _sum: { quantity: "desc" } }, take: 8, where: { order: notVoid } }),
      prisma.customer.findMany({ orderBy: { totalSpent: "desc" }, take: 8 }),
      prisma.order.findMany({ orderBy: { createdAt: "desc" }, take: 12 }),
      prisma.order.findMany({ where: { createdAt: { gte: new Date(now.getTime() - 13 * DAY) }, ...notVoid }, select: { createdAt: true, total: true, shipping: true } }),
      prisma.orderItem.findMany({ distinct: ["slug"], select: { slug: true } }),
      profitFor({ createdAt: { gte: startToday }, ...notVoid }),
      profitFor({ createdAt: { gte: startWeek }, ...notVoid }),
      profitFor({ createdAt: { gte: startMonth }, ...notVoid }),
      profitFor(notVoid),
      profitFor(shippedWhere),
      profitFor({ status: "new" })
    ]);

  // revenue by day, last 14 days
  const byDay: { day: string; total: number }[] = [];
  for (let i = 13; i >= 0; i--) byDay.push({ day: new Date(now.getTime() - i * DAY).toISOString().slice(0, 10), total: 0 });
  const idx = new Map(byDay.map((b, i) => [b.day, i]));
  for (const o of windowOrders) {
    const i = idx.get(o.createdAt.toISOString().slice(0, 10));
    if (i !== undefined) byDay[i].total += o.total - (o.shipping ?? 0);
  }

  const sold = new Set(soldSlugRows.map((r) => r.slug));
  const deadProducts = jerseys.filter((j) => j.liga !== "Komplet" && !sold.has(j.slug)).map((j) => `${j.klub} — ${j.igrac}`);

  const totalRev = net(total);

  // ── Extras: trends, shipping queue, win-back, cities, ad ROI ──────────────
  const [prev7, prev30, pending, pendingAgg, inactive, allAddr, adAll, returned, cancelled, unassignedShipped] = await Promise.all([
    prisma.order.aggregate({ _sum: { total: true, shipping: true }, where: { createdAt: { gte: new Date(now.getTime() - 14 * DAY), lt: startWeek } } }),
    prisma.order.aggregate({ _sum: { total: true, shipping: true }, where: { createdAt: { gte: new Date(now.getTime() - 60 * DAY), lt: startMonth } } }),
    // Svi neposlani (ne kapiraj na 40) — red za slanje mora pokazati sve.
    prisma.order.findMany({ where: { status: "new" }, orderBy: { createdAt: "asc" }, take: 500, select: { id: true, createdAt: true, customerName: true, phone: true, itemCount: true, total: true, shipping: true, items: { select: { klub: true, igrac: true, size: true, quantity: true } } } }),
    prisma.order.aggregate({ _count: { _all: true }, _sum: { total: true, shipping: true }, where: { status: "new" } }),
    // Neaktivni kupci: bez kupnje 30+ dana (win-back meta).
    prisma.customer.findMany({ where: { lastOrderAt: { lt: new Date(now.getTime() - 30 * DAY) }, totalOrders: { gt: 0 } }, orderBy: { totalSpent: "desc" }, take: 20 }),
    prisma.order.findMany({ select: { address: true, total: true, shipping: true } }),
    prisma.adSpend.aggregate({ _sum: { amount: true } }),
    // Vraćene pošiljke (nije pokupljeno) — za AI i evidenciju gubitka.
    prisma.order.findMany({ where: { status: "returned" }, orderBy: { createdAt: "desc" }, take: 50, select: { id: true, createdAt: true, customerName: true, phone: true, total: true, shipping: true, itemCount: true } }),
    // Otkazane narudžbe — zasebna evidencija (ne ulaze u promet/zaradu).
    prisma.order.findMany({ where: { status: "cancelled" }, orderBy: { createdAt: "desc" }, take: 50, select: { id: true, createdAt: true, customerName: true, phone: true, total: true, shipping: true, itemCount: true } }),
    // Poslane narudžbe bez oznake tko je poslao — treba ih dodijeliti (Igor/Ivica).
    prisma.order.findMany({ where: { status: { in: ["shipped", "done"] }, shippedBy: null }, orderBy: { createdAt: "desc" }, take: 200, select: { id: true, createdAt: true, customerName: true, total: true } })
  ]);

  const pct = (cur: number, prev: number | null) => (prev && prev > 0 ? ((cur - prev) / prev) * 100 : null);
  const weekChange = pct(net(week), net(prev7));
  const monthChange = pct(net(month), net(prev30));

  // top cities (parse from address; best-effort)
  const cityMap = new Map<string, { name: string; count: number; total: number }>();
  for (const o of allAddr) {
    const parts = String(o.address || "").split(",").map((s) => s.trim()).filter(Boolean);
    let city = (parts[parts.length - 1] || "").replace(/\d{4,6}/g, "").replace(/^grad\s+/i, "").replace(/\s+/g, " ").trim();
    if (!city) continue;
    const key = city.toLowerCase();
    const e = cityMap.get(key) || { name: city, count: 0, total: 0 };
    e.count++;
    e.total += o.total - (o.shipping ?? 0);
    cityMap.set(key, e);
  }
  const topCities = [...cityMap.values()].sort((a, b) => b.count - a.count).slice(0, 10);

  const adSpendTotal = adAll._sum.amount ?? 0;
  const pendingCount = pendingAgg._count._all;
  const pendingTotal = net(pendingAgg);

  // ── Podjela po pošiljatelju (Igor / Ivica) — poslane narudžbe OD zadnjeg poravnanja ──
  const settlements = await prisma.settlement.findMany({ orderBy: { settledAt: "desc" }, take: 6 });
  const lastSettlement = settlements[0] ?? null;
  const sinceFilter = lastSettlement ? { createdAt: { gt: lastSettlement.settledAt } } : {};

  const byShipper = async (who: "igor" | "ivica" | null) => {
    const where = { status: { in: ["shipped", "done"] }, shippedBy: who, ...sinceFilter };
    const [ord, prof] = await Promise.all([
      prisma.order.aggregate({ _count: { _all: true }, _sum: { total: true, shipping: true }, where }),
      profitFor(where)
    ]);
    return { count: ord._count._all, cash: net(ord), profit: prof };
  };
  const [igor, ivica, unassigned] = await Promise.all([byShipper("igor"), byShipper("ivica"), byShipper(null)]);

  // Poslano + prikupljena gotovina po pošiljatelju (SVE poslano, dresovi vs kompleti odvojeno).
  const isKomplet = (it: { slug?: string | null; klub?: string | null; igrac?: string | null }) =>
    /komplet/i.test(it.slug || "") || /komplet/i.test(it.klub || "") || /komplet/i.test(it.igrac || "");
  const cashOrders = await prisma.order.findMany({
    where: { status: { in: ["shipped", "done"] } },
    select: { total: true, shipping: true, shippedBy: true, cashCollected: true, items: { select: { slug: true, klub: true, igrac: true, quantity: true } } }
  });
  const mkCash = () => ({ sentCount: 0, sentDresovi: 0, sentKompleti: 0, collected: 0, collectedDresovi: 0, collectedKompleti: 0, pending: 0 });
  const cashSplit: Record<"igor" | "ivica", ReturnType<typeof mkCash>> = { igor: mkCash(), ivica: mkCash() };
  for (const o of cashOrders) {
    const who = o.shippedBy === "igor" ? "igor" : o.shippedBy === "ivica" ? "ivica" : null;
    if (!who) continue;
    const amt = o.total - (o.shipping ?? 0);
    let d = 0, k = 0;
    for (const it of o.items) { const q = it.quantity || 1; if (isKomplet(it)) k += q; else d += q; }
    const b = cashSplit[who];
    b.sentCount++; b.sentDresovi += d; b.sentKompleti += k;
    if (o.cashCollected) { b.collected += amt; b.collectedDresovi += d; b.collectedKompleti += k; }
    else b.pending += amt;
  }

  // Profit poslanih od zadnjeg poravnanja (baza za podjelu 50/50).
  const shippedProfitTotal = await profitFor({ status: { in: ["shipped", "done"] }, ...sinceFilter });
  const halfShare = shippedProfitTotal / 2;

  // Oglasi (reklame) od zadnjeg poravnanja — dijele se 50/50 (plaća Igor, Ivica vraća pola).
  const adsAgg = await prisma.adSpend.aggregate({ _sum: { amount: true }, where: lastSettlement ? { date: { gt: lastSettlement.settledAt } } : undefined });
  const adsSpend = adsAgg._sum.amount ?? 0;

  // Konačno poravnanje: profit-izjednačenje + pola oglasa (Igor platio → Ivica duguje pola).
  // Pozitivno = Ivica → Igoru; negativno = Igor → Ivici.
  const ivicaToIgor = (ivica.profit - igor.profit) / 2 + adsSpend / 2;
  const settleAmount = Math.abs(ivicaToIgor);
  const settleFrom = ivicaToIgor > 0.005 ? "ivica" : ivicaToIgor < -0.005 ? "igor" : null;

  return {
    weekChange,
    monthChange,
    pending: pending.map((o) => ({ ...o, total: o.total - (o.shipping ?? 0) })),
    pendingCount,
    pendingTotal,
    pendingProfit,
    inactive,
    returned: returned.map((o) => ({ ...o, total: o.total - (o.shipping ?? 0) })),
    unassignedShipped,
    returnedCount: returned.length,
    returnedTotal: returned.reduce((s, o) => s + o.total - (o.shipping ?? 0), 0),
    returnedQty: returned.reduce((s, o) => s + (o.itemCount ?? 0), 0),
    cancelled: cancelled.map((o) => ({ ...o, total: o.total - (o.shipping ?? 0) })),
    cancelledCount: cancelled.length,
    cancelledTotal: cancelled.reduce((s, o) => s + o.total - (o.shipping ?? 0), 0),
    cancelledQty: cancelled.reduce((s, o) => s + (o.itemCount ?? 0), 0),
    topCities,
    adSpendTotal,
    roas: adSpendTotal > 0 ? totalRev / adSpendTotal : null,
    netAfterAds: totalProfit - adSpendTotal,
    todayRev: net(today),
    todayOrders: today._count,
    todayProfit,
    weekRev: net(week),
    weekOrders: week._count,
    weekProfit,
    monthRev: net(month),
    monthOrders: month._count,
    monthProfit,
    totalRev,
    totalProfit,
    orderCount,
    shippedCount: shippedAgg._count,
    shippedRev: net(shippedAgg),
    shippedProfit,
    aov: orderCount ? totalRev / orderCount : 0,
    split: { igor, ivica, unassigned, shippedProfitTotal, halfShare, adsSpend, settleAmount, settleFrom, lastSettlement, settlements, cashSplit },
    topItems,
    bestCustomers,
    recentOrders,
    byDay,
    deadProducts
  };
}
