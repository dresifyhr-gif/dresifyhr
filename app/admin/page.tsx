import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { isAdmin } from "@/lib/admin-auth";
import { getDashboardMetrics } from "@/lib/admin-metrics";

export const metadata: Metadata = { title: "Dresify Admin", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

const eur = (n: number) => `${(n ?? 0).toFixed(2).replace(".", ",")} €`;

function Card({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="rounded-xl border border-white/10 bg-[#0d0d0d] p-4">
      <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/45">{label}</div>
      <div className="mt-1 text-2xl font-bold text-white">{value}</div>
      {sub && <div className="mt-0.5 text-xs text-white/40">{sub}</div>}
    </div>
  );
}

export default async function AdminDashboard() {
  if (!(await isAdmin())) redirect("/admin/login");

  const m = await getDashboardMetrics();
  const maxDay = Math.max(1, ...m.byDay.map((d) => d.total));

  return (
    <div className="min-h-screen bg-[#0a0a0a] px-4 py-6 text-white sm:px-8">
      <div className="mx-auto max-w-6xl">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <div className="text-lg font-bold tracking-wide">
              DRES<span className="text-accent">IFY</span> <span className="text-white/40">ADMIN</span>
            </div>
            <div className="text-xs text-white/40">Interni dashboard · {new Date().toLocaleDateString("hr-HR")}</div>
          </div>
          <a href="/api/admin/logout" className="rounded-lg border border-white/10 px-3 py-1.5 text-xs text-white/60 hover:text-white">
            Odjava
          </a>
        </div>

        {m.orderCount === 0 && (
          <div className="mb-6 rounded-xl border border-accent/30 bg-accent/5 p-4 text-sm text-white/70">
            Baza je još prazna — prikazivat će se podaci od prve narudžbe. (Povijesne narudžbe uvezemo iz Google Sheeta.)
          </div>
        )}

        {/* Top metrics */}
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">
          <Card label="Danas" value={eur(m.todayRev)} sub={`${m.todayOrders} narudžbi`} />
          <Card label="Ovaj mjesec" value={eur(m.monthRev)} sub={`${m.monthOrders} narudžbi`} />
          <Card label="Ukupno promet" value={eur(m.totalRev)} />
          <Card label="Narudžbi" value={String(m.orderCount)} />
          <Card label="Prosj. košarica" value={eur(m.aov)} />
          <Card label="Poslano" value={String(m.shippedCount)} sub="označeno" />
        </div>

        {/* Revenue last 14 days */}
        <div className="mt-6 rounded-xl border border-white/10 bg-[#0d0d0d] p-4">
          <div className="mb-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-white/45">Promet — zadnjih 14 dana</div>
          <div className="flex h-32 items-end gap-1.5">
            {m.byDay.map((d) => (
              <div key={d.day} className="flex flex-1 flex-col items-center gap-1" title={`${d.day}: ${eur(d.total)}`}>
                <div className="w-full rounded-t bg-accent/80" style={{ height: `${(d.total / maxDay) * 100}%`, minHeight: d.total > 0 ? 3 : 0 }} />
                <div className="text-[9px] text-white/30">{d.day.slice(8)}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-6 grid gap-6 lg:grid-cols-2">
          {/* Top products */}
          <div className="rounded-xl border border-white/10 bg-[#0d0d0d] p-4">
            <div className="mb-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-white/45">Najprodavaniji</div>
            {m.topItems.length === 0 ? (
              <div className="text-sm text-white/40">Nema podataka još.</div>
            ) : (
              <ul className="space-y-2">
                {m.topItems.map((t) => (
                  <li key={`${t.slug}-${t.klub}-${t.igrac}`} className="flex items-center justify-between text-sm">
                    <span className="text-white/80">{t.klub} — {t.igrac}</span>
                    <span className="font-semibold text-accent">{t._sum.quantity ?? 0} kom</span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Best customers */}
          <div className="rounded-xl border border-white/10 bg-[#0d0d0d] p-4">
            <div className="mb-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-white/45">Najbolji kupci</div>
            {m.bestCustomers.length === 0 ? (
              <div className="text-sm text-white/40">Nema podataka još.</div>
            ) : (
              <ul className="space-y-2">
                {m.bestCustomers.map((c) => (
                  <li key={c.id} className="flex items-center justify-between text-sm">
                    <span className="text-white/80">{c.name || c.phone || "—"} <span className="text-white/35">· {c.totalOrders}×</span></span>
                    <span className="font-semibold text-accent">{eur(c.totalSpent)}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        {/* Recent orders */}
        <div className="mt-6 rounded-xl border border-white/10 bg-[#0d0d0d] p-4">
          <div className="mb-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-white/45">Zadnje narudžbe</div>
          {m.recentOrders.length === 0 ? (
            <div className="text-sm text-white/40">Još nema narudžbi u bazi.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-left text-[11px] uppercase tracking-wider text-white/35">
                  <tr>
                    <th className="py-1.5 pr-3">Datum</th>
                    <th className="py-1.5 pr-3">Kupac</th>
                    <th className="py-1.5 pr-3">Kom</th>
                    <th className="py-1.5">Ukupno</th>
                  </tr>
                </thead>
                <tbody>
                  {m.recentOrders.map((o) => (
                    <tr key={o.id} className="border-t border-white/5">
                      <td className="py-1.5 pr-3 text-white/50">{o.createdAt.toLocaleDateString("hr-HR")}</td>
                      <td className="py-1.5 pr-3 text-white/80">{o.customerName}</td>
                      <td className="py-1.5 pr-3 text-white/60">{o.itemCount}</td>
                      <td className="py-1.5 font-semibold">{eur(o.total)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Dead products */}
        <div className="mt-6 rounded-xl border border-white/10 bg-[#0d0d0d] p-4">
          <div className="mb-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-white/45">
            Nisu se prodali ({m.deadProducts.length})
          </div>
          <p className="mb-2 text-xs text-white/40">Modeli iz kataloga bez ijedne prodaje.</p>
          <div className="flex flex-wrap gap-1.5">
            {m.deadProducts.slice(0, 40).map((d) => (
              <span key={d} className="rounded border border-white/10 px-2 py-0.5 text-xs text-white/55">{d}</span>
            ))}
          </div>
        </div>

        <p className="mt-6 text-center text-xs text-white/30">
          Profit/marža dolazi kad upišemo nabavne cijene proizvoda. Sljedeće: AI chat + uvoz povijesti.
        </p>
      </div>
    </div>
  );
}
