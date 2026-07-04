import "server-only";

import { prisma } from "@/lib/prisma";
import { getDashboardMetrics } from "@/lib/admin-metrics";
import { jerseys } from "@/lib/data/jerseys";

const eur = (n: number) => `${(n ?? 0).toFixed(2).replace(".", ",")} €`;
const DAY = 86_400_000;

// Compact, factual snapshot of the business injected into the AI prompt so the
// assistant answers from real numbers (not guesses).
export async function buildBusinessContext(): Promise<string> {
  const m = await getDashboardMetrics();

  const inactive = await prisma.customer.findMany({
    where: { lastOrderAt: { lt: new Date(Date.now() - 30 * DAY) }, totalOrders: { gt: 0 } },
    orderBy: { totalSpent: "desc" },
    take: 15
  });

  const lowStock = jerseys
    .filter((j) => j.outOfStock || (j.soldOutSizes && j.soldOutSizes.length))
    .map((j) => {
      const label = `${j.klub} — ${j.igrac}`;
      if (j.outOfStock === "all") return `${label}: rasprodano (sve)`;
      if (j.outOfStock === "adults") return `${label}: nema odrasle veličine`;
      if (j.outOfStock === "kids") return `${label}: nema dječje veličine`;
      return `${label}: nema veličine ${(j.soldOutSizes ?? []).join(", ")}`;
    });

  const top = m.topItems.map((t) => `${t.klub} ${t.igrac}: ${t._sum.quantity ?? 0} kom`);
  const best = m.bestCustomers.map((c) => `${c.name || c.phone || "?"}: ${eur(c.totalSpent)} (${c.totalOrders} narudžbi)`);
  const inact = inactive.map((c) => `${c.name || c.phone || "?"}: zadnja kupnja ${c.lastOrderAt.toLocaleDateString("hr-HR")}, ukupno ${eur(c.totalSpent)}`);
  const ret = m.returned.map((o) => `${o.customerName}${o.phone ? ` (${o.phone})` : ""}: ${eur(o.total)}, ${o.createdAt.toLocaleDateString("hr-HR")}`);

  return [
    `DANAS: ${eur(m.todayRev)} prometa (profit ${eur(m.todayProfit)}), ${m.todayOrders} narudžbi.`,
    `ZADNJIH 7 DANA: ${eur(m.weekRev)} prometa (profit ${eur(m.weekProfit)}), ${m.weekOrders} narudžbi.`,
    `ZADNJIH 30 DANA: ${eur(m.monthRev)} prometa (profit ${eur(m.monthProfit)}), ${m.monthOrders} narudžbi.`,
    `UKUPNO: ${eur(m.totalRev)} prometa (profit ${eur(m.totalProfit)}), ${m.orderCount} narudžbi, prosječna košarica ${eur(m.aov)}.`,
    `POSLANO (označeno kvačicom, stvarno isporučeno): ${eur(m.shippedRev)} prometa, profit ${eur(m.shippedProfit)}, ${m.shippedCount} narudžbi.`,
    `TREND: 7 dana ${m.weekChange == null ? "n/a" : (m.weekChange >= 0 ? "+" : "") + m.weekChange.toFixed(0) + "%"} vs prethodnih 7; 30 dana ${m.monthChange == null ? "n/a" : (m.monthChange >= 0 ? "+" : "") + m.monthChange.toFixed(0) + "%"} vs prethodnih 30.`,
    `ZA SLANJE (čeka, nije poslano): ${m.pending.length} narudžbi, ${eur(m.pendingTotal)}.`,
    `REKLAME: potrošeno ${eur(m.adSpendTotal)}, ROAS ${m.roas == null ? "n/a" : m.roas.toFixed(1) + "x"}, neto profit nakon reklama ${eur(m.netAfterAds)}.`,
    ``,
    `TOP GRADOVI (grad: narudžbi, promet): ${m.topCities.slice(0, 8).map((c) => `${c.name}: ${c.count}, ${eur(c.total)}`).join(" · ") || "nema"}`,
    ``,
    `PROMET ZADNJIH 14 DANA (dan: iznos): ${m.byDay.map((d) => `${d.day.slice(5)}: ${eur(d.total)}`).join(" · ")}`,
    ``,
    `NAJPRODAVANIJI:\n${top.length ? top.map((t, i) => `${i + 1}. ${t}`).join("\n") : "nema podataka"}`,
    ``,
    `NAJBOLJI KUPCI:\n${best.length ? best.join("\n") : "nema podataka"}`,
    ``,
    `NEAKTIVNI KUPCI (30+ dana bez kupnje):\n${inact.length ? inact.join("\n") : "nema"}`,
    ``,
    `VRAĆENE POŠILJKE (nije pokupljeno, gubitak dostave) — ${m.returnedCount}, ukupno ${eur(m.returnedTotal)}:\n${ret.length ? ret.join("\n") : "nema vraćenih"}`,
    ``,
    `NISU SE PRODALI (mrtvi modeli, ${m.deadProducts.length}):\n${m.deadProducts.slice(0, 30).join(", ") || "nema"}`,
    ``,
    `NISKA/NEMA ZALIHA (iz kataloga):\n${lowStock.length ? lowStock.join("\n") : "sve dostupno"}`,
    ``,
    `Napomena o profitu: nabavna cijena je 6 € po dresu, prodajna 20 €, dakle profit 14 € po dresu. Profit iznad je već izračunat (prodaja − nabava po artiklu).`
  ].join("\n");
}
