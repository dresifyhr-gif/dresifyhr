import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { isAdmin } from "@/lib/admin-auth";
import { getDashboardMetrics } from "@/lib/admin-metrics";
import { getGaStats } from "@/lib/ga";
import { getMetaAdsInsights } from "@/lib/meta-insights";
import { AdminShell } from "@/components/admin/admin-shell";
import { AdSpendForm } from "@/components/admin/ad-spend-form";
import { GaStatsPanel } from "@/components/admin/ga-stats";
import { MetaAdsPanel } from "@/components/admin/meta-ads-panel";
import { Panel, eur } from "@/components/admin/ui";

export const metadata: Metadata = { title: "Analitika — Dresify Admin", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

export default async function AnalyticsPage() {
  if (!(await isAdmin())) redirect("/admin/login/");

  const [m, ga, ads] = await Promise.all([getDashboardMetrics(), getGaStats(), getMetaAdsInsights()]);

  return (
    <AdminShell title="Analitika" subtitle="Što se prodaje, reklame i trendovi">
      <div className="mb-5">
        <GaStatsPanel ga={ga} />
      </div>

      <div className="mb-5">
        <MetaAdsPanel ins={ads} />
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

        <Panel title="Reklame — isplativost">
          <div className="grid grid-cols-3 gap-3">
            <div>
              <div className="text-[11px] uppercase tracking-wider text-[var(--a-text-3)]">Potrošeno</div>
              <div className="mt-1 text-lg font-bold text-[var(--a-text)]">{eur(m.adSpendTotal)}</div>
            </div>
            <div>
              <div className="text-[11px] uppercase tracking-wider text-[var(--a-text-3)]">ROAS</div>
              <div className="mt-1 text-lg font-bold text-[var(--a-text)]">{m.roas != null ? `${m.roas.toFixed(1)}×` : "—"}</div>
            </div>
            <div>
              <div className="text-[11px] uppercase tracking-wider text-[var(--a-text-3)]">Neto profit</div>
              <div className={`mt-1 text-lg font-bold ${m.netAfterAds >= 0 ? "text-emerald-600" : "text-red-500"}`}>{eur(m.netAfterAds)}</div>
            </div>
          </div>
          <p className="mt-3 mb-2 text-xs text-[var(--a-text-3)]">Profit nakon oduzetih reklama. ROAS = promet ÷ potrošnja.</p>
          <AdSpendForm />
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
