import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { isAdmin } from "@/lib/admin-auth";
import { getDashboardMetrics } from "@/lib/admin-metrics";
import { getGaStats } from "@/lib/ga";
import { prisma } from "@/lib/prisma";
import { AdminShell } from "@/components/admin/admin-shell";
import { GaStatsPanel } from "@/components/admin/ga-stats";
import { Panel } from "@/components/admin/ui";

export const metadata: Metadata = { title: "Analitika — Dresify Admin", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

export default async function AnalyticsPage() {
  if (!(await isAdmin())) redirect("/admin/login/");

  const [m, ga, sizeRows] = await Promise.all([
    getDashboardMetrics(),
    getGaStats(),
    // Prodaja po veličinama (samo prodane — bez otkaza/povrata) → za nabavu.
    prisma.orderItem.groupBy({
      by: ["size"],
      _sum: { quantity: true },
      where: { order: { status: { notIn: ["cancelled", "returned"] } } }
    })
  ]);

  const sizes = sizeRows
    .map((r) => ({ size: r.size || "—", qty: r._sum.quantity ?? 0 }))
    .filter((r) => r.qty > 0)
    .sort((a, b) => b.qty - a.qty);
  const sizeMax = Math.max(1, ...sizes.map((s) => s.qty));

  return (
    <AdminShell title="Analitika" subtitle="Što se prodaje, reklame i trendovi">
      <div className="mb-5">
        <GaStatsPanel ga={ga} />
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <Panel title="Najprodavaniji">
          {m.topItems.length === 0 ? (
            <div className="text-sm text-[var(--a-text-3)]">Nema podataka još.</div>
          ) : (
            <ul className="space-y-2.5">
              {m.topItems.map((t, i) => (
                <li key={`${t.slug}-${t.klub}-${t.igrac}`} className="flex items-center justify-between text-sm">
                  <span className="flex items-center gap-2.5">
                    <span className="flex h-5 w-5 items-center justify-center rounded bg-[var(--a-surface-2)] text-[10px] font-bold text-[var(--a-text-3)]">{i + 1}</span>
                    <span className="text-[var(--a-text)]">{t.klub} — {t.igrac}</span>
                  </span>
                  <span className="font-semibold text-[var(--a-text)]">{t._sum.quantity ?? 0} kom</span>
                </li>
              ))}
            </ul>
          )}
        </Panel>

        <Panel title="Prodaja po veličinama">
          <p className="mb-3 -mt-2 text-xs text-[var(--a-text-3)]">Koje se veličine najviše prodaju — za nabavu (bez otkaza/povrata).</p>
          {sizes.length === 0 ? (
            <div className="text-sm text-[var(--a-text-3)]">Nema podataka još.</div>
          ) : (
            <ul className="space-y-2">
              {sizes.map((s) => (
                <li key={s.size} className="flex items-center gap-3 text-sm">
                  <span className="w-14 shrink-0 font-semibold text-[var(--a-text)]">{s.size}</span>
                  <span className="h-2.5 flex-1 overflow-hidden rounded-full bg-[var(--a-surface-2)]">
                    <span className="block h-full rounded-full bg-accent" style={{ width: `${(s.qty / sizeMax) * 100}%` }} />
                  </span>
                  <span className="w-16 shrink-0 text-right font-semibold text-[var(--a-text)]">{s.qty} kom</span>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>

      <div className="mt-5">
        <Panel title={`Nisu se prodali (${m.deadProducts.length})`}>
          <p className="mb-3 -mt-2 text-xs text-[var(--a-text-3)]">Modeli iz kataloga bez ijedne prodaje.</p>
          <div className="flex flex-wrap gap-1.5">
            {m.deadProducts.slice(0, 60).map((d) => (
              <span key={d} className="rounded-[10px] border border-[var(--a-line)] bg-[var(--a-surface-2)] px-2 py-0.5 text-xs text-[var(--a-text-2)]">{d}</span>
            ))}
          </div>
        </Panel>
      </div>
    </AdminShell>
  );
}
