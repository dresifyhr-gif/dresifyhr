import "server-only";

import { prisma } from "@/lib/prisma";
import { jerseys } from "@/lib/data/jerseys";
import { getSettings } from "@/lib/settings";
import { phoneKey } from "@/lib/utils";

const DAY = 86_400_000;
// Nabavne cijene (dres/komplet) dolaze iz Postavki — vidi getSettings().
// Trošak vraćene pošiljke i besplatne dostave dolaze iz Postavki (getSettings).
// Komplet se prepoznaje po slugu/nazivu koji sadrži "komplet".
const kompletItemWhere = {
  OR: [{ slug: { contains: "komplet" } }, { igrac: { contains: "komplet", mode: "insensitive" as const } }]
};

// GLS fiksne cijene dostave koje GLS naplati NAMA (kupac plaća punu dostavu iz Postavki).
// Povratni put je besplatan (GLS/HP ne naplate povrat) → gubitak povrata = samo odlazak.
const GLS_SHIP_UNDER = 5.5; // GLS nam uvijek naplati 5,50 (i velike i male i povrat)
const GLS_SHIP_OVER = 5.5;

// GLS saldo dostave vrijedi tek od ovog datuma (nove narudžbe). Starije narudžbe
// ostaju po dosadašnjem računu (fiksni deliveryCost/returnCost, bez GLS marže) —
// da se već zatvorena/tekuća stara podjela ne mijenja unatrag.
const GLS_LOGIC_SINCE = new Date("2026-07-28T00:00:00Z");

type ShipItem = { slug?: string | null; klub?: string | null; igrac?: string | null };
const itemIsKomplet = (it: ShipItem) =>
  /komplet/i.test(it.slug || "") || /komplet/i.test(it.klub || "") || /komplet/i.test(it.igrac || "");
const glsCostFor = (goods: number, items: ShipItem[], threshold: number) =>
  items.some(itemIsKomplet) || goods > threshold ? GLS_SHIP_OVER : GLS_SHIP_UNDER;

// Dobit/gubitak dostave po narudžbi (dodaje se na maržu).
//  GLS: plaćena → (kupac platio − GLS trošak); besplatna → −GLS trošak; vraćena → −GLS trošak (odlazak).
//  HP (promjenjivo, legacy): plaćena → 0 (ne znamo točan trošak); besplatna → −deliveryCost; vraćena → −returnCost.
type ShipOrder = { total: number; shipping: number | null; status?: string; courier?: string | null; createdAt?: Date; items: ShipItem[] };
function shipPLFor(o: ShipOrder, threshold: number, deliveryCost: number, returnCost: number) {
  const goods = o.total - (o.shipping ?? 0);
  // Stare narudžbe (prije GLS_LOGIC_SINCE) računaju se kao dosad = kao HP (fiksni trošak, bez GLS marže).
  const isHP = o.courier === "hp" || (!!o.createdAt && o.createdAt < GLS_LOGIC_SINCE);
  const paid = (o.shipping ?? 0) > 0;
  if (o.status === "returned") return isHP ? -returnCost : -glsCostFor(goods, o.items, threshold);
  if (isHP) return paid ? 0 : -deliveryCost;
  return paid ? (o.shipping ?? 0) - glsCostFor(goods, o.items, threshold) : -glsCostFor(goods, o.items, threshold);
}

export async function getDashboardMetrics() {
  const now = new Date();
  // Nabavne cijene iz Postavki (fallback na zadane) — utječu na profit i poravnanje.
  const { costDres, costKomplet, costStreetwear, deliveryCost, returnCost, freeShipThreshold, igorSharePct, winbackDays, riskMinFailed, monthlyGoal } = await getSettings();
  // Početak današnjeg dana po Europe/Zagreb (Vercel radi u UTC-u) kao UTC instant —
  // inače bi "promet danas" u ranim satima gledao krivi (UTC) dan.
  const zp = new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Zagreb", year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(now);
  const zGet = (t: string) => Number(zp.find((p) => p.type === t)!.value);
  const zagrebOffsetMin = Math.round(
    (new Date(now.toLocaleString("en-US", { timeZone: "Europe/Zagreb" })).getTime() -
      new Date(now.toLocaleString("en-US", { timeZone: "UTC" })).getTime()) / 60000
  );
  const startToday = new Date(Date.UTC(zGet("year"), zGet("month") - 1, zGet("day")) - zagrebOffsetMin * 60000);
  // Rolling windows so periods are always nested (7d ≤ 30d) — no month-boundary confusion.
  const startWeek = new Date(now.getTime() - 7 * DAY);
  const startMonth = new Date(now.getTime() - 30 * DAY);
  // Kalendarski mjesec (1. u mjesecu po Zagrebu) — za mjesečni CILJ prometa i projekciju.
  const startMonthCal = new Date(Date.UTC(zGet("year"), zGet("month") - 1, 1) - zagrebOffsetMin * 60000);
  const dayOfMonth = zGet("day");
  const daysInMonth = new Date(Date.UTC(zGet("year"), zGet("month"), 0)).getUTCDate();

  // Otkazane i vraćene narudžbe NE ulaze u promet/zaradu/količine (nisu prodaja).
  const VOID = ["cancelled", "returned"];
  const notVoid = { status: { notIn: VOID } };

  // Promet = total − dostava (dostava nije prihod; naplati se i vrati kroz pouzeće).
  const rev = (gte?: Date) =>
    prisma.order.aggregate({ _sum: { total: true, shipping: true }, _count: true, where: { ...(gte ? { createdAt: { gte } } : {}), ...notVoid } });
  const net = (a: { _sum: { total: number | null; shipping: number | null } }) => (a._sum.total ?? 0) - (a._sum.shipping ?? 0);
  // Streetwear slugovi trebaju i profitu (svoja nabava) — kreće odmah, paralelno.
  const streetwearP = prisma.customProduct.findMany({ where: { category: "streetwear" }, select: { slug: true } });
  // Točan profit = Σ prodajne cijene artikala − popust − nabava (komplet 18€, dres 6€).
  const profitFor = async (orderWhere: object = {}) => {
    const sw = [...streetwearSlugs];
    const [all, komplet, street, disc] = await Promise.all([
      prisma.orderItem.aggregate({ _sum: { unitPrice: true }, _count: true, where: { order: orderWhere } }),
      // Komplet BEZ streetweara (streetwear ima svoju nabavu, da se ne broji dvaput).
      // NULL-sigurno: `slug NOT IN (...)` je u SQL-u NULL za retke bez sluga, pa bi
      // ih tiho izbacio iz brojanja — zato eksplicitno dopuštamo slug = null.
      prisma.orderItem.count({
        where: {
          order: orderWhere,
          AND: [
            kompletItemWhere,
            ...(sw.length ? [{ OR: [{ slug: null }, { slug: { notIn: sw } }] }] : [])
          ]
        }
      }),
      sw.length ? prisma.orderItem.count({ where: { order: orderWhere, slug: { in: sw } } }) : Promise.resolve(0),
      prisma.order.aggregate({ _sum: { discount: true }, where: orderWhere })
    ]);
    const count = all._count;
    const revenue = all._sum.unitPrice ?? 0;
    const discount = disc._sum.discount ?? 0;
    // Tri nabavne cijene: streetwear (prodaja 50€), komplet (40€), dres (20€).
    const cost = street * costStreetwear + komplet * costKomplet + (count - street - komplet) * costDres;
    return revenue - discount - cost;
  };

  const shippedWhere = { status: { in: ["shipped", "done"] } };

  // Neovisne grupe upita kreću ODMAH (paralelno), await kasnije — bez sekvencijalnih barijera.
  const extrasP = Promise.all([
    prisma.order.aggregate({ _sum: { total: true, shipping: true }, where: { createdAt: { gte: new Date(now.getTime() - 14 * DAY), lt: startWeek } } }),
    prisma.order.aggregate({ _sum: { total: true, shipping: true }, where: { createdAt: { gte: new Date(now.getTime() - 60 * DAY), lt: startMonth } } }),
    prisma.order.findMany({ where: { status: "new" }, orderBy: { createdAt: "asc" }, take: 500, select: { id: true, createdAt: true, customerName: true, phone: true, itemCount: true, total: true, shipping: true, items: { select: { klub: true, igrac: true, size: true, quantity: true } } } }),
    prisma.order.aggregate({ _count: { _all: true }, _sum: { total: true, shipping: true }, where: { status: "new" } }),
    prisma.customer.findMany({ where: { lastOrderAt: { lt: new Date(now.getTime() - winbackDays * DAY) }, totalOrders: { gt: 0 } }, orderBy: { totalSpent: "desc" }, take: 20 }),
    prisma.order.findMany({ select: { address: true, total: true, shipping: true } }),
    prisma.adSpend.aggregate({ _sum: { amount: true } }),
    prisma.order.findMany({ where: { status: "returned" }, orderBy: { createdAt: "desc" }, take: 500, select: { id: true, createdAt: true, customerName: true, phone: true, total: true, shipping: true, itemCount: true, courier: true, items: { select: { slug: true, klub: true, igrac: true } } } }),
    prisma.order.findMany({ where: { status: "cancelled" }, orderBy: { createdAt: "desc" }, take: 50, select: { id: true, createdAt: true, customerName: true, phone: true, total: true, shipping: true, itemCount: true } }),
    prisma.order.findMany({ where: { status: { in: ["shipped", "done"] }, shippedBy: null }, orderBy: { createdAt: "desc" }, take: 200, select: { id: true, createdAt: true, customerName: true, total: true } }),
    // Točan ukupan broj vraćenih (lista gore je ograničena na 50) — za trošak povrata.
    prisma.order.count({ where: { status: "returned" } }),
    // Rizik po kupcu: minimalna polja SVIH narudžbi (mali skup) — grupira se po
    // telefonu u JS-u da izračunamo tko je odbijao pouzeće.
    prisma.order.findMany({ select: { customerName: true, phone: true, status: true, cashCollected: true, createdAt: true } }),
    // Pouzeće UKUPNO (sve poslano, neovisno o poravnanju) — za pregled na naslovnoj
    // da se brojke poklapaju s onima na stranici Narudžbe.
    prisma.order.findMany({
      where: { status: { in: ["shipped", "done"] } },
      select: { total: true, shipping: true, cashCollected: true, courier: true, createdAt: true, items: { select: { slug: true, klub: true, igrac: true, quantity: true } } }
    })
  ]);
  const settlementsP = prisma.settlement.findMany({ orderBy: { settledAt: "desc" }, take: 6 });
  // Treba i profitu (streetwear ima svoju nabavu) i besplatnim dostavama —
  // mora biti spremno PRIJE profitFor poziva ispod.
  const streetwearSlugs = new Set((await streetwearP).map((r) => r.slug));

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

  // Mjesečni cilj prometa: koliko je ostvareno OVAJ kalendarski mjesec + projekcija po tempu.
  const monthCalRev = net(await rev(startMonthCal));
  const monthProjected = dayOfMonth > 0 ? (monthCalRev / dayOfMonth) * daysInMonth : monthCalRev;
  // Profit i broj narudžbi ovog kalendarskog mjeseca (za "Ovaj mjesec" karticu).
  const [monthCalProfit, monthCalOrders] = await Promise.all([
    profitFor({ createdAt: { gte: startMonthCal }, ...notVoid }),
    prisma.order.count({ where: { createdAt: { gte: startMonthCal }, ...notVoid } })
  ]);

  // ── Extras (trends, shipping queue, win-back, cities, ad ROI): već pokrenuto gore, samo await ──
  const [prev7, prev30, pending, pendingAgg, inactive, allAddr, adAll, returned, cancelled, unassignedShipped, returnedCountAll, riskRows, allSentOrders] = await extrasP;

  // Komadi koji ČEKAJU slanje (nove narudžbe) — za progress na "Poslano komada".
  const toShipPieces = pending.reduce((s, o) => s + o.items.reduce((a, it) => a + (it.quantity || 1), 0), 0);

  // ── Rizični kupci ─────────────────────────────────────────────────────────
  // Grupiraj sve narudžbe po telefonu (phoneKey iz lib/utils) i izbroji propale
  // (otkazano/vraćeno) vs. uredno preuzete. Rizičan = ≥1 propala.
  const riskMap = new Map<string, { name: string; phone: string; failed: number; collected: number; lastAt: Date }>();
  for (const o of riskRows) {
    const key = phoneKey(o.phone);
    if (!key) continue;
    const cur = riskMap.get(key) || { name: o.customerName || o.phone || "—", phone: o.phone || "", failed: 0, collected: 0, lastAt: o.createdAt };
    // Rizik = SAMO vraćene pošiljke (kupac odbio pouzeće → gubimo dostavu). Otkazane
    // NE broje se: njih otkaže Gazda ili su zbog njegove greške (kasno poslano), pa
    // na njih nije izgubljeno ništa (nisu ni poslane).
    if (o.status === "returned") cur.failed++;
    else if ((o.status === "shipped" || o.status === "done") && o.cashCollected) cur.collected++;
    if (o.createdAt >= cur.lastAt) { cur.lastAt = o.createdAt; cur.name = o.customerName || cur.name; cur.phone = o.phone || cur.phone; }
    riskMap.set(key, cur);
  }
  const riskyCustomers = [...riskMap.values()]
    .filter((c) => c.failed >= riskMinFailed)
    .sort((a, b) => b.failed - a.failed || b.lastAt.getTime() - a.lastAt.getTime())
    .slice(0, 200)
    .map((c) => ({ name: c.name, phone: c.phone, failed: c.failed, collected: c.collected }));

  // Saldo dostave nad SVIME poslanim + vraćenim: GLS marža (+), besplatne dostave (−),
  // povrati (−). HP legacy: plaćeno 0, besplatno −deliveryCost, vraćeno −returnCost.
  const shipPLShipped = allSentOrders.reduce((s, o) => s + shipPLFor({ ...o, status: "shipped" }, freeShipThreshold, deliveryCost, returnCost), 0);
  const shipPLReturned = returned.reduce((s, o) => s + shipPLFor({ ...o, status: "returned" }, freeShipThreshold, deliveryCost, returnCost), 0);
  const shipPLTotal = shipPLShipped + shipPLReturned;

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

  // ── UKUPNA ČISTA ZARADA (trajna evidencija — NE resetira se poravnanjem) ──────
  // "Koliko mi je stvarno ostalo u džepu do sad." Uzima SVE naplaćene narudžbe ikad:
  //   neto roba − nabava robe + saldo dostave (GLS marža/besplatne) − svi povrati − svi oglasi.
  // Rezultat se dijeli po vlasničkom udjelu (igorSharePct). Ovo je čisti profit, ne bruto cash.
  const lifeShareIgor = Math.min(100, Math.max(0, igorSharePct)) / 100;
  let lifeNet = 0, lifeD = 0, lifeK = 0, lifeS = 0, lifeShipPL = 0, lifeCollectedCount = 0;
  for (const o of allSentOrders) {
    if (!o.cashCollected) continue;
    lifeCollectedCount++;
    lifeNet += o.total - (o.shipping ?? 0);
    for (const it of o.items) {
      const q = it.quantity || 1;
      if (it.slug && streetwearSlugs.has(it.slug)) lifeS += q;
      else if (itemIsKomplet(it)) lifeK += q;
      else lifeD += q;
    }
    lifeShipPL += shipPLFor({ ...o, status: "shipped" }, freeShipThreshold, deliveryCost, returnCost);
  }
  const lifeReturnPL = returned.reduce((s, o) => s + shipPLFor({ ...o, status: "returned" }, freeShipThreshold, deliveryCost, returnCost), 0);
  const lifeCost = lifeD * costDres + lifeK * costKomplet + lifeS * costStreetwear;
  const lifeMargin = lifeNet - lifeCost + lifeShipPL + lifeReturnPL;
  const lifeCleanProfit = lifeMargin - adSpendTotal; // čista zarada oba partnera zajedno
  const lifeProfit = {
    total: lifeCleanProfit,
    igor: lifeCleanProfit * lifeShareIgor,
    ivica: lifeCleanProfit * (1 - lifeShareIgor),
    collectedCount: lifeCollectedCount,
    margin: lifeMargin,
    ads: adSpendTotal
  };

  // ── Podjela po pošiljatelju (Igor / Ivica) — poslane narudžbe OD zadnjeg poravnanja ──
  const settlements = await settlementsP;
  const lastSettlement = settlements[0] ?? null;
  const sinceFilter = lastSettlement ? { createdAt: { gt: lastSettlement.settledAt } } : {};
  // Gotovina ulazi u podjelu tek kad je označena kao prikupljena, ne prema
  // datumu kada je kupac prvotno napravio narudžbu.
  const collectedSinceFilter = lastSettlement ? { cashCollectedAt: { gt: lastSettlement.settledAt } } : {};

  const byShipper = async (who: "igor" | "ivica" | null) => {
    const where = { status: { in: ["shipped", "done"] }, shippedBy: who, ...sinceFilter };
    const [ord, prof] = await Promise.all([
      prisma.order.aggregate({ _count: { _all: true }, _sum: { total: true, shipping: true }, where }),
      profitFor(where)
    ]);
    return { count: ord._count._all, cash: net(ord), profit: prof };
  };
  // Poslano + prikupljena gotovina po pošiljatelju OD ZADNJEG PORAVNANJA (resetira se na svako
  // poravnanje). Kompleti se broje odvojeno od dresova (drukčija marža).
  const isKomplet = (it: { slug?: string | null; klub?: string | null; igrac?: string | null }) =>
    /komplet/i.test(it.slug || "") || /komplet/i.test(it.klub || "") || /komplet/i.test(it.igrac || "");
  // ── Faza B: sve ovisi o sinceFilter → jedan paralelni batch (bez sekvencijalnih upita) ──
  const [igor, ivica, unassigned, cashOrders, collectedCashOrders, shippedProfitTotal, adsAgg, returnedSinceCount] = await Promise.all([
    byShipper("igor"),
    byShipper("ivica"),
    byShipper(null),
    prisma.order.findMany({
      where: { status: { in: ["shipped", "done"] }, ...sinceFilter },
      select: { total: true, shipping: true, shippedBy: true, cashCollected: true, promoCode: true, items: { select: { slug: true, klub: true, igrac: true, quantity: true } } }
    }),
    prisma.order.findMany({
      where: { status: { in: ["shipped", "done"] }, cashCollected: true, ...collectedSinceFilter },
      select: { total: true, shipping: true, shippedBy: true, promoCode: true, courier: true, createdAt: true, items: { select: { slug: true, klub: true, igrac: true, quantity: true } } }
    }),
    profitFor({ status: { in: ["shipped", "done"] }, ...sinceFilter }),
    prisma.adSpend.aggregate({ _sum: { amount: true }, where: lastSettlement ? { date: { gt: lastSettlement.settledAt } } : undefined }),
    // Vraćene pošiljke OD ZADNJEG PORAVNANJA — njihov trošak (4 € svaka) skida se sa zajedničke marže.
    prisma.order.count({ where: { status: "returned", ...sinceFilter } })
  ]);
  const mkCash = () => ({ sentCount: 0, sentDresovi: 0, sentKompleti: 0, sentStreet: 0, collected: 0, collectedDresovi: 0, collectedKompleti: 0, collectedStreet: 0, pending: 0, pendingDresovi: 0, pendingKompleti: 0, pendingStreet: 0, pendingMargin: 0 });
  const cashSplit: Record<"igor" | "ivica", ReturnType<typeof mkCash>> = { igor: mkCash(), ivica: mkCash() };
  let freeDeliveries = 0; // prikupljene narudžbe s besplatnom dostavom (mi platili dostavu ~5€)
  for (const o of cashOrders) {
    const who = o.shippedBy === "igor" ? "igor" : o.shippedBy === "ivica" ? "ivica" : null;
    if (!who) continue;
    const amt = o.total - (o.shipping ?? 0);
    let d = 0, k = 0;
    let s = 0;
    for (const it of o.items) { const q = it.quantity || 1; if (it.slug && streetwearSlugs.has(it.slug)) s += q; else if (isKomplet(it)) k += q; else d += q; }
    const b = cashSplit[who];
    b.sentCount++; b.sentDresovi += d; b.sentKompleti += k; b.sentStreet += s;
    if (!o.cashCollected) { b.pending += amt; b.pendingDresovi += d; b.pendingKompleti += k; b.pendingStreet += s; }
  }
  // Neto marža neprikupljenog (fali) po osobi = bruto pending − nabava robe u tim narudžbama.
  for (const who of ["igor", "ivica"] as const) {
    const b = cashSplit[who];
    b.pendingMargin = b.pending - (b.pendingDresovi * costDres + b.pendingKompleti * costKomplet + b.pendingStreet * costStreetwear);
  }
  let shipPLCollected = 0; // saldo dostave nad prikupljenim narudžbama (GLS marža − besplatne dostave)
  for (const o of collectedCashOrders) {
    shipPLCollected += shipPLFor({ ...o, status: "shipped" }, freeShipThreshold, deliveryCost, returnCost);
    const who = o.shippedBy === "igor" ? "igor" : o.shippedBy === "ivica" ? "ivica" : null;
    if (!who) continue;
    const amt = o.total - (o.shipping ?? 0);
    let d = 0, k = 0;
    let s = 0;
    for (const it of o.items) { const q = it.quantity || 1; if (it.slug && streetwearSlugs.has(it.slug)) s += q; else if (isKomplet(it)) k += q; else d += q; }
    const b = cashSplit[who];
    b.collected += amt; b.collectedDresovi += d; b.collectedKompleti += k; b.collectedStreet += s;
    // Besplatna dostava = roba ≥ 60€ ILI osvojeno na igrici ILI streetwear → mi platili ~5€ pošti.
    const isFreeShip = amt >= 60 || Boolean(o.promoCode && o.promoCode.trim()) || o.items.some((it) => it.slug && streetwearSlugs.has(it.slug));
    if (isFreeShip) freeDeliveries++;
  }
  // ── Pouzeće UKUPNO (sve poslano, neovisno o poravnanju) ────────────────────
  // Iste brojke kao na stranici Narudžbe: koliko je prikupljeno, koliko još fali,
  // te koliko je komada poslano vs. koliko ih se još čeka preuzeti.
  const cashOverview = {
    collectedTotal: 0, collectedDresovi: 0, collectedKompleti: 0, collectedStreet: 0, collectedCount: 0,
    pendingTotal: 0, pendingDresovi: 0, pendingKompleti: 0, pendingStreet: 0, pendingCount: 0,
    pendingHP: 0, pendingGLS: 0, // koliko još fali prikupiti, razdvojeno po kuriru
    sentDresovi: 0, sentKompleti: 0, sentStreet: 0, sentCount: 0
  };
  for (const o of allSentOrders) {
    // PRIKAZ: puni iznos pouzeća (roba + dostava) jer to je što stvarno prođe kroz račun —
    // usklađeno s "za sjesti na račun" i bankom. Obračun (cashSplit) i dalje koristi neto robu.
    const amt = o.total;
    let d = 0, k = 0, s = 0;
    for (const it of o.items) { const q = it.quantity || 1; if (it.slug && streetwearSlugs.has(it.slug)) s += q; else if (isKomplet(it)) k += q; else d += q; }
    cashOverview.sentCount++; cashOverview.sentDresovi += d; cashOverview.sentKompleti += k; cashOverview.sentStreet += s;
    if (o.cashCollected) {
      cashOverview.collectedCount++; cashOverview.collectedTotal += amt;
      cashOverview.collectedDresovi += d; cashOverview.collectedKompleti += k; cashOverview.collectedStreet += s;
    } else {
      cashOverview.pendingCount++; cashOverview.pendingTotal += amt;
      cashOverview.pendingDresovi += d; cashOverview.pendingKompleti += k; cashOverview.pendingStreet += s;
      if (o.courier === "hp") cashOverview.pendingHP += amt; else cashOverview.pendingGLS += amt; // null = GLS
    }
  }

  // Povrati od zadnjeg poravnanja: njihov trošak dostave (GLS 5,50/6,50 · HP fiksni returnCost)
  // skida se sa zajedničke marže (po pola svakome). shipPLReturnedSettle je negativan.
  const returnedSince = lastSettlement ? returned.filter((o) => o.createdAt > lastSettlement.settledAt) : returned;
  const shipPLReturnedSettle = returnedSince.reduce((s, o) => s + shipPLFor({ ...o, status: "returned" }, freeShipThreshold, deliveryCost, returnCost), 0);

  // Profit poslanih i oglasi od zadnjeg poravnanja — oboje već dohvaćeno u Fazi B.
  // Udio iz Postavki (50 = pola-pola). Igorov udio; Ivici ide ostatak.
  const igorShare = Math.min(100, Math.max(0, igorSharePct)) / 100;
  const halfShare = shippedProfitTotal * igorShare;
  const adsSpend = adsAgg._sum.amount ?? 0;

  // Poravnanje: Ivica je platila SVU robu → prvo joj se vrati nabava prikupljenih artikala,
  // pa se ostatak (marža) dijeli 50/50, pa pola oglasa (Igor platio → Ivica vraća pola).
  const totalCollected = cashSplit.igor.collected + cashSplit.ivica.collected;
  const collectedDresovi = cashSplit.igor.collectedDresovi + cashSplit.ivica.collectedDresovi;
  const collectedKompleti = cashSplit.igor.collectedKompleti + cashSplit.ivica.collectedKompleti;
  const collectedStreet = cashSplit.igor.collectedStreet + cashSplit.ivica.collectedStreet;
  const collectedCost = collectedDresovi * costDres + collectedKompleti * costKomplet + collectedStreet * costStreetwear; // Ivici nazad
  // Saldo dostave (GLS marža + / besplatne dostave −) i povrati (−) ulaze u maržu
  // prije podjele, pa ih oboje snose pola-pola.
  const collectedMargin = totalCollected - collectedCost + shipPLCollected + shipPLReturnedSettle;
  const marginHalf = collectedMargin * igorShare;
  // Igor treba zadržati samo svoju polovicu marže; sve preko toga (koje drži) ide Ivici (roba + njena marža).
  // Oglasi: Igor platio → Ivica vraća pola. Pozitivno = Ivica → Igoru; negativno = Igor → Ivici.
  // Oglase (Igor plaća) Ivica vraća razmjerno svom udjelu (1 − igorShare).
  const ivicaToIgor = adsSpend * (1 - igorShare) - (cashSplit.igor.collected - marginHalf);
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
    returnedCount: returnedCountAll,
    returnedTotal: returned.reduce((s, o) => s + o.total - (o.shipping ?? 0), 0),
    returnedQty: returned.reduce((s, o) => s + (o.itemCount ?? 0), 0),
    cancelled: cancelled.map((o) => ({ ...o, total: o.total - (o.shipping ?? 0) })),
    cancelledCount: cancelled.length,
    cancelledTotal: cancelled.reduce((s, o) => s + o.total - (o.shipping ?? 0), 0),
    cancelledQty: cancelled.reduce((s, o) => s + (o.itemCount ?? 0), 0),
    topCities,
    adSpendTotal,
    lifeProfit,
    roas: adSpendTotal > 0 ? totalRev / adSpendTotal : null,
    netAfterAds: totalProfit + shipPLTotal - adSpendTotal,
    // Saldo dostave (GLS marža + / besplatne dostave − / povrati −) nad svime poslanim + vraćenim.
    shipPLTotal,
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
    // Mjesečni cilj prometa (Postavke) + ostvareno ovaj kalendarski mjesec + projekcija po tempu.
    monthlyGoal,
    monthCalRev,
    monthProjected,
    dayOfMonth,
    monthCalProfit,
    monthCalOrders,
    toShipPieces,
    dailyGoal: daysInMonth > 0 ? monthlyGoal / daysInMonth : monthlyGoal,
    // Ukupni profit + saldo dostave (GLS marža umanjena za besplatne dostave i povrate).
    totalProfit: totalProfit + shipPLTotal,
    orderCount,
    shippedCount: shippedAgg._count,
    shippedRev: net(shippedAgg),
    shippedProfit,
    aov: orderCount ? totalRev / orderCount : 0,
    split: { igor, ivica, unassigned, shippedProfitTotal, halfShare, totalCollected, collectedCost, freeDeliveries, shipPLCollected, returnedSinceCount, returnShipLossSettle: shipPLReturnedSettle, collectedMargin, marginHalf, adsSpend, settleAmount, settleFrom, lastSettlement, settlements, cashSplit },
    topItems,
    bestCustomers,
    riskyCustomers,
    cashOverview,
    // Pragovi iz Postavki — da naslovi u UI-u ne lažu kad se promijene.
    winbackDays,
    riskMinFailed,
    recentOrders,
    byDay,
    deadProducts
  };
}
