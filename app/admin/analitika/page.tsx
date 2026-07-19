import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { isAdmin } from "@/lib/admin-auth";
import { getDashboardMetrics } from "@/lib/admin-metrics";
import { AdminShell } from "@/components/admin/admin-shell";
import { AdSpendForm } from "@/components/admin/ad-spend-form";
import { Panel, eur } from "@/components/admin/ui";

export const metadata: Metadata = { title: "Analitika — Dresify Admin", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

export default async function AnalyticsPage() {
  if (!(await isAdmin())) redirect("/admin/login/");

  const m = await getDashboardMetrics();

  return (
    <AdminShell title="Analitika" subtitle="Što se prodaje, reklame i trendovi">
      <div className="grid gap-5 lg:grid-cols-2">
        <Panel title="Najprodavaniji">
          {m.topItems.length === 0 ? (
            <div className="text-sm text-[#8e8e93]">Nema podataka još.</div>
          ) : (
            <ul className="space-y-2.5">
              {m.topItems.map((t, i) => (
                <li key={`${t.slug}-${t.klub}-${t.igrac}`} className="flex items-center justify-between text-sm">
                  <span className="flex items-center gap-2.5">
                    <span className="flex h-5 w-5 items-center justify-center rounded bg-black/[0.06] text-[10px] font-bold text-[#8e8e93]">{i + 1}</span>
                    <span className="text-[#1d1d1f]">{t.klub} — {t.igrac}</span>
                  </span>
                  <span className="font-semibold text-[#1d1d1f]">{t._sum.quantity ?? 0} kom</span>
                </li>
              ))}
            </ul>
          )}
        </Panel>

        <Panel title="Reklame — isplativost">
          <div className="grid grid-cols-3 gap-3">
            <div>
              <div className="text-[11px] uppercase tracking-wider text-[#8e8e93]">Potrošeno</div>
              <div className="mt-1 text-lg font-bold text-[#1d1d1f]">{eur(m.adSpendTotal)}</div>
            </div>
            <div>
              <div className="text-[11px] uppercase tracking-wider text-[#8e8e93]">ROAS</div>
              <div className="mt-1 text-lg font-bold text-[#1d1d1f]">{m.roas != null ? `${m.roas.toFixed(1)}×` : "—"}</div>
            </div>
            <div>
              <div className="text-[11px] uppercase tracking-wider text-[#8e8e93]">Neto profit</div>
              <div className={`mt-1 text-lg font-bold ${m.netAfterAds >= 0 ? "text-emerald-600" : "text-red-500"}`}>{eur(m.netAfterAds)}</div>
            </div>
          </div>
          <p className="mt-3 mb-2 text-xs text-[#8e8e93]">Profit nakon oduzetih reklama. ROAS = promet ÷ potrošnja.</p>
          <AdSpendForm />
        </Panel>
      </div>

      <div className="mt-5">
        <Panel title={`Nisu se prodali (${m.deadProducts.length})`}>
          <p className="mb-3 -mt-2 text-xs text-[#8e8e93]">Modeli iz kataloga bez ijedne prodaje.</p>
          <div className="flex flex-wrap gap-1.5">
            {m.deadProducts.slice(0, 60).map((d) => (
              <span key={d} className="rounded-[10px] border border-black/[0.06] bg-black/[0.03] px-2 py-0.5 text-xs text-[#6e6e73]">{d}</span>
            ))}
          </div>
        </Panel>
      </div>
    </AdminShell>
  );
}
