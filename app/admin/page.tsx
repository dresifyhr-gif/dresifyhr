import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { isAdmin } from "@/lib/admin-auth";
import { getDashboardMetrics } from "@/lib/admin-metrics";
import { AdminAiChat } from "@/components/admin/ai-chat";

export const metadata: Metadata = { title: "Dresify Admin", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

const eur = (n: number) => `${(n ?? 0).toFixed(2).replace(".", ",")} €`;

function Stat({ label, value, profit, sub }: { label: string; value: string; profit?: string; sub?: string }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">{label}</div>
      <div className="mt-1 text-2xl font-bold text-slate-900">{value}</div>
      {profit && <div className="mt-0.5 text-xs font-semibold text-emerald-600">{profit} profit</div>}
      {sub && <div className="mt-0.5 text-xs text-slate-400">{sub}</div>}
    </div>
  );
}

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="mb-4 text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">{title}</div>
      {children}
    </div>
  );
}

export default async function AdminDashboard() {
  if (!(await isAdmin())) redirect("/admin/login");

  const m = await getDashboardMetrics();
  const maxDay = Math.max(1, ...m.byDay.map((d) => d.total));

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <div className="mx-auto max-w-6xl px-4 py-6 sm:px-8">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-slate-900 text-sm font-bold text-white">
              D<span className="text-lime-400">R</span>
            </div>
            <div>
              <div className="text-lg font-bold tracking-tight text-slate-900">Dresify Admin</div>
              <div className="text-xs text-slate-400">
                {new Date().toLocaleDateString("hr-HR", { weekday: "long", day: "numeric", month: "long" })}
              </div>
            </div>
          </div>
          <a
            href="/api/admin/logout"
            className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-500 shadow-sm transition hover:text-slate-800"
          >
            Odjava
          </a>
        </div>

        {m.orderCount === 0 && (
          <div className="mb-6 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
            Baza se tek počela puniti — prikazuju se podaci od prve narudžbe. Povijesne narudžbe uvezemo iz Google Sheeta.
          </div>
        )}

        {/* Top stats */}
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">
          <Stat label="Danas" value={eur(m.todayRev)} profit={eur(m.todayProfit)} sub={`${m.todayOrders} narudžbi`} />
          <Stat label="Tjedan" value={eur(m.weekRev)} profit={eur(m.weekProfit)} sub={`${m.weekOrders} narudžbi`} />
          <Stat label="Mjesec" value={eur(m.monthRev)} profit={eur(m.monthProfit)} sub={`${m.monthOrders} narudžbi`} />
          <Stat label="Ukupno" value={eur(m.totalRev)} profit={eur(m.totalProfit)} sub={`${m.orderCount} narudžbi`} />
          <Stat label="Prosj. košarica" value={eur(m.aov)} />
          <Stat label="Poslano" value={String(m.shippedCount)} sub="označeno" />
        </div>

        {/* AI assistant */}
        <div className="mt-6">
          <AdminAiChat />
        </div>

        {/* Revenue chart */}
        <div className="mt-6">
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

        {/* Top products + best customers */}
        <div className="mt-6 grid gap-6 lg:grid-cols-2">
          <Panel title="Najprodavaniji">
            {m.topItems.length === 0 ? (
              <div className="text-sm text-slate-400">Nema podataka još.</div>
            ) : (
              <ul className="space-y-2.5">
                {m.topItems.map((t, i) => (
                  <li key={`${t.slug}-${t.klub}-${t.igrac}`} className="flex items-center justify-between text-sm">
                    <span className="flex items-center gap-2.5">
                      <span className="flex h-5 w-5 items-center justify-center rounded bg-slate-100 text-[10px] font-bold text-slate-400">{i + 1}</span>
                      <span className="text-slate-700">{t.klub} — {t.igrac}</span>
                    </span>
                    <span className="font-semibold text-slate-900">{t._sum.quantity ?? 0} kom</span>
                  </li>
                ))}
              </ul>
            )}
          </Panel>

          <Panel title="Najbolji kupci">
            {m.bestCustomers.length === 0 ? (
              <div className="text-sm text-slate-400">Nema podataka još.</div>
            ) : (
              <ul className="space-y-2.5">
                {m.bestCustomers.map((c) => (
                  <li key={c.id} className="flex items-center justify-between text-sm">
                    <span className="text-slate-700">
                      {c.name || c.phone || "—"} <span className="text-slate-400">· {c.totalOrders}×</span>
                    </span>
                    <span className="font-semibold text-emerald-600">{eur(c.totalSpent)}</span>
                  </li>
                ))}
              </ul>
            )}
          </Panel>
        </div>

        {/* Recent orders */}
        <div className="mt-6">
          <Panel title="Zadnje narudžbe">
            {m.recentOrders.length === 0 ? (
              <div className="text-sm text-slate-400">Još nema narudžbi u bazi.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-[11px] uppercase tracking-wider text-slate-400">
                      <th className="pb-2 pr-3 font-semibold">Datum</th>
                      <th className="pb-2 pr-3 font-semibold">Kupac</th>
                      <th className="pb-2 pr-3 font-semibold">Kom</th>
                      <th className="pb-2 font-semibold">Ukupno</th>
                    </tr>
                  </thead>
                  <tbody>
                    {m.recentOrders.map((o) => (
                      <tr key={o.id} className="border-t border-slate-100">
                        <td className="py-2 pr-3 text-slate-400">{o.createdAt.toLocaleDateString("hr-HR")}</td>
                        <td className="py-2 pr-3 text-slate-700">{o.customerName}</td>
                        <td className="py-2 pr-3 text-slate-500">{o.itemCount}</td>
                        <td className="py-2 font-semibold text-slate-900">{eur(o.total)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Panel>
        </div>

        {/* Dead products */}
        <div className="mt-6">
          <Panel title={`Nisu se prodali (${m.deadProducts.length})`}>
            <p className="mb-3 -mt-2 text-xs text-slate-400">Modeli iz kataloga bez ijedne prodaje.</p>
            <div className="flex flex-wrap gap-1.5">
              {m.deadProducts.slice(0, 40).map((d) => (
                <span key={d} className="rounded-md border border-slate-200 bg-slate-50 px-2 py-0.5 text-xs text-slate-500">{d}</span>
              ))}
            </div>
          </Panel>
        </div>

        <p className="mt-6 text-center text-xs text-slate-400">
          Profit = 20 € prodaja − 6 € nabava = 14 € po dresu. Sljedeće: uvoz povijesti narudžbi.
        </p>
      </div>
    </div>
  );
}
