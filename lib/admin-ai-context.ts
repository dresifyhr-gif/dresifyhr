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
    where: { lastOrderAt: { lt: new Date(Date.now() - 60 * DAY) }, totalOrders: { gt: 0 } },
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

  return [
    `DANAS: ${eur(m.todayRev)} prometa (profit ${eur(m.todayProfit)}), ${m.todayOrders} narudžbi.`,
    `ZADNJIH 7 DANA: ${eur(m.weekRev)} prometa (profit ${eur(m.weekProfit)}), ${m.weekOrders} narudžbi.`,
    `ZADNJIH 30 DANA: ${eur(m.monthRev)} prometa (profit ${eur(m.monthProfit)}), ${m.monthOrders} narudžbi.`,
    `UKUPNO: ${eur(m.totalRev)} prometa (profit ${eur(m.totalProfit)}), ${m.orderCount} narudžbi, prosječna košarica ${eur(m.aov)}.`,
    `POSLANO (označeno kvačicom, stvarno isporučeno): ${eur(m.shippedRev)} prometa, profit ${eur(m.shippedProfit)}, ${m.shippedCount} narudžbi.`,
    ``,
    `PROMET ZADNJIH 14 DANA (dan: iznos): ${m.byDay.map((d) => `${d.day.slice(5)}: ${eur(d.total)}`).join(" · ")}`,
    ``,
    `NAJPRODAVANIJI:\n${top.length ? top.map((t, i) => `${i + 1}. ${t}`).join("\n") : "nema podataka"}`,
    ``,
    `NAJBOLJI KUPCI:\n${best.length ? best.join("\n") : "nema podataka"}`,
    ``,
    `NEAKTIVNI KUPCI (60+ dana bez kupnje):\n${inact.length ? inact.join("\n") : "nema"}`,
    ``,
    `NISU SE PRODALI (mrtvi modeli, ${m.deadProducts.length}):\n${m.deadProducts.slice(0, 30).join(", ") || "nema"}`,
    ``,
    `NISKA/NEMA ZALIHA (iz kataloga):\n${lowStock.length ? lowStock.join("\n") : "sve dostupno"}`,
    ``,
    `Napomena o profitu: nabavna cijena je 6 € po dresu, prodajna 20 €, dakle profit 14 € po dresu. Profit iznad je već izračunat (prodaja − nabava po artiklu).`
  ].join("\n");
}
