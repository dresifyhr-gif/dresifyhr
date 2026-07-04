import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { isAdmin } from "@/lib/admin-auth";
import { getDashboardMetrics } from "@/lib/admin-metrics";
import { AdminAiChat } from "@/components/admin/ai-chat";
import { AdminShell } from "@/components/admin/admin-shell";
import { Stat, Panel, eur } from "@/components/admin/ui";

export const metadata: Metadata = { title: "Pregled — Dresify Admin", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

export default async function AdminOverview() {
  if (!(await isAdmin())) redirect("/admin/login/");

  const m = await getDashboardMetrics();
  const maxDay = Math.max(1, ...m.byDay.map((d) => d.total));

  return (
    <AdminShell title="Pregled">
      {/* KPI cards */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
        <Stat label="Danas" value={eur(m.todayRev)} profit={eur(m.todayProfit)} sub={`${m.todayOrders} narudžbi`} />
        <Stat label="7 dana" value={eur(m.weekRev)} profit={eur(m.weekProfit)} sub={`${m.weekOrders} narudžbi`} change={m.weekChange} />
        <Stat label="30 dana" value={eur(m.monthRev)} profit={eur(m.monthProfit)} sub={`${m.monthOrders} narudžbi`} change={m.monthChange} />
        <Stat label="Ukupno" value={eur(m.totalRev)} profit={eur(m.totalProfit)} sub={`${m.orderCount} narudžbi`} />
        <Stat label="Prosj. košarica" value={eur(m.aov)} />
        <Stat label="Poslano" value={eur(m.shippedRev)} profit={eur(m.shippedProfit)} sub={`${m.shippedCount} narudžbi`} />
      </div>

      {/* Partner split */}
      <div className="mt-5">
        <Panel title="Podjela Igor / Ivica (50 / 50, samo poslano)">
          <div className="mb-4 flex flex-wrap items-end justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50/60 p-4">
            <div>
              <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">Ukupni profit (poslano)</div>
              <div className="mt-1 text-2xl font-bold text-slate-900">{eur(m.split.shippedProfitTotal)}</div>
            </div>
            <div className="text-right">
              <div className="text-[11px] uppercase tracking-wider text-slate-400">Svakom (50%)</div>
              <div className="mt-1 text-lg font-bold text-emerald-600">{eur(m.split.halfShare)}</div>
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {[
              { name: "Igor", color: "emerald", d: m.split.igor },
              { name: "Ivica", color: "sky", d: m.split.ivica }
            ].map((p) => (
              <div key={p.name} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-900">{p.name}</span>
                  <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${p.color === "emerald" ? "bg-emerald-50 text-emerald-600" : "bg-sky-50 text-sky-600"}`}>{p.d.count} poslao</span>
                </div>
                <div className="mt-3 space-y-1.5 text-sm">
                  <div className="flex justify-between text-slate-600"><span>Pokupio gotovine</span><span className="font-semibold text-slate-900">{eur(p.d.cash)}</span></div>
                  <div className="flex justify-between text-slate-600"><span>Generirao profita</span><span className="font-semibold text-slate-900">{eur(p.d.profit)}</span></div>
                </div>
              </div>
            ))}
          </div>
          <div className="mt-4 rounded-xl border-2 border-dashed border-slate-300 bg-slate-50 p-4 text-center">
            {m.split.settleFrom == null ? (
              <div className="text-sm font-semibold text-slate-600">Profit je izjednačen — nitko nikom ne duguje ✅</div>
            ) : (
              <div className="text-sm text-slate-700">
                Poravnanje:{" "}
                <span className="font-bold text-slate-900">{m.split.settleFrom === "igor" ? "Igor" : "Ivica"}</span> daje{" "}
                <span className="font-bold text-slate-900">{m.split.settleFrom === "igor" ? "Ivici" : "Igoru"}</span>{" "}
                <span className="font-bold text-emerald-600">{eur(m.split.settleAmount)}</span>{" "}
                <span className="text-slate-500">→ oboje po {eur(m.split.halfShare)}.</span>
              </div>
            )}
          </div>
          {m.split.unassigned.count > 0 && (
            <p className="mt-3 text-xs text-amber-600">
              ⚠ {m.split.unassigned.count} poslanih narudžbi bez pošiljatelja ({eur(m.split.unassigned.profit)}) — označi ih u „Za slanje”.
            </p>
          )}
        </Panel>
      </div>

      {/* AI assistant */}
      <div className="mt-5">
        <AdminAiChat />
      </div>

      {/* Revenue chart */}
      <div className="mt-5">
        <Panel title="Promet — zadnjih 14 dana">
          <div className="flex h-36 items-end gap-1.5">
            {m.byDay.map((d) => (
              <div key={d.day} className="group flex flex-1 flex-col items-center gap-1.5" title={`${d.day}: ${eur(d.total)}`}>
                <div
                  className="w-full rounded-t bg-slate-800 transition group-hover:bg-emerald-500"
                  style={{ height: `${(d.total / maxDay) * 100}%`, minHeight: d.total > 0 ? 4 : 0 }}
                />
                <div className="text-[9px] text-slate-400">{d.day.slice(8)}.{d.day.slice(5, 7)}</div>
              </div>
            ))}
          </div>
        </Panel>
      </div>
    </AdminShell>
  );
}
