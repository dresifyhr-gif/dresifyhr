import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { isAdmin } from "@/lib/admin-auth";
import { getDashboardMetrics } from "@/lib/admin-metrics";
import { AdminAiChat } from "@/components/admin/ai-chat";
import { AdSpendForm } from "@/components/admin/ad-spend-form";
import { ShippingQueue } from "@/components/admin/shipping-queue";
import { RecentOrders } from "@/components/admin/recent-orders";

export const metadata: Metadata = { title: "Dresify Admin", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

const eur = (n: number) => `${(n ?? 0).toFixed(2).replace(".", ",")} €`;

function waLink(phone: string | null) {
  if (!phone) return null;
  let d = phone.replace(/\D/g, "");
  if (d.startsWith("00")) d = d.slice(2);
  else if (d.startsWith("0")) d = "385" + d.slice(1);
  else if (!d.startsWith("385")) d = "385" + d;
  return d.length >= 11 ? `https://wa.me/${d}` : null;
}

function Stat({ label, value, profit, sub, change }: { label: string; value: string; profit?: string; sub?: string; change?: number | null }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between">
        <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">{label}</div>
        {change != null && (
          <span className={`text-[11px] font-semibold ${change >= 0 ? "text-emerald-600" : "text-red-500"}`}>
            {change >= 0 ? "▲" : "▼"} {Math.abs(change).toFixed(0)}%
          </span>
        )}
      </div>
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
          <Stat label="7 dana" value={eur(m.weekRev)} profit={eur(m.weekProfit)} sub={`${m.weekOrders} narudžbi`} change={m.weekChange} />
          <Stat label="30 dana" value={eur(m.monthRev)} profit={eur(m.monthProfit)} sub={`${m.monthOrders} narudžbi`} change={m.monthChange} />
          <Stat label="Ukupno" value={eur(m.totalRev)} profit={eur(m.totalProfit)} sub={`${m.orderCount} narudžbi`} />
          <Stat label="Prosj. košarica" value={eur(m.aov)} />
          <Stat label="Poslano" value={eur(m.shippedRev)} profit={eur(m.shippedProfit)} sub={`${m.shippedCount} narudžbi`} />
        </div>

        {/* Partner split — Igor / Ivica (samo poslane narudžbe) */}
        <div className="mt-6">
          <Panel title="Sažetak — podjela Igor / Ivica (50 / 50, samo poslano)">
            <div className="mb-4 flex flex-wrap items-end justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50/60 p-4">
              <div>
                <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">Ukupni profit (poslane narudžbe)</div>
                <div className="mt-1 text-2xl font-bold text-slate-900">{eur(m.split.shippedProfitTotal)}</div>
              </div>
              <div className="text-right">
                <div className="text-[11px] uppercase tracking-wider text-slate-400">Svakom pripada (50%)</div>
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

            {/* Poravnanje */}
            <div className="mt-4 rounded-xl border-2 border-dashed border-slate-300 bg-slate-50 p-4 text-center">
              {m.split.settleFrom == null ? (
                <div className="text-sm font-semibold text-slate-600">Profit je izjednačen — nitko nikom ne duguje ✅</div>
              ) : (
                <div className="text-sm text-slate-700">
                  Poravnanje profita:{" "}
                  <span className="font-bold text-slate-900">{m.split.settleFrom === "igor" ? "Igor" : "Ivica"}</span> daje{" "}
                  <span className="font-bold text-slate-900">{m.split.settleFrom === "igor" ? "Ivici" : "Igoru"}</span>{" "}
                  <span className="font-bold text-emerald-600">{eur(m.split.settleAmount)}</span>{" "}
                  <span className="text-slate-500">→ nakon toga oboje imaju {eur(m.split.halfShare)} profita.</span>
                </div>
              )}
            </div>

            {m.split.unassigned.count > 0 && (
              <p className="mt-3 text-xs text-amber-600">
                ⚠ {m.split.unassigned.count} poslanih narudžbi nema označenog pošiljatelja ({eur(m.split.unassigned.profit)} profita) — nisu uračunate u podjelu. Označi ih s „✓ Ja” ili „✓ Ivica” u redu za slanje.
              </p>
            )}
            <p className="mt-2 text-xs text-slate-400">
              Profit = prodaja − nabava (6 € po dresu). Nabava je Ivicina i ne dira se — gleda se samo čisti profit. Gotovinu pokuplja onaj tko šalje.
            </p>
          </Panel>
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

        {/* Shipping queue + win-back */}
        <div className="mt-6 grid gap-6 lg:grid-cols-2">
          <Panel title={`Red za slanje (${m.pending.length}) · ${eur(m.pendingTotal)}`}>
            <ShippingQueue
              orders={m.pending.map((o) => ({
                id: o.id,
                dateLabel: o.createdAt.toLocaleDateString("hr-HR"),
                customerName: o.customerName,
                itemCount: o.itemCount,
                total: o.total
              }))}
            />
          </Panel>

          <Panel title={`Vrati kupce (30+ dana bez kupnje) · ${m.inactive.length}`}>
            {m.inactive.length === 0 ? (
              <div className="text-sm text-slate-400">Nema neaktivnih kupaca.</div>
            ) : (
              <ul className="max-h-72 space-y-2 overflow-y-auto">
                {m.inactive.map((c) => {
                  const wa = waLink(c.phone);
                  return (
                    <li key={c.id} className="flex items-center justify-between text-sm">
                      <span className="text-slate-700">
                        {c.name || c.phone || "—"} <span className="text-slate-400">· zadnja {c.lastOrderAt.toLocaleDateString("hr-HR")}</span>
                      </span>
                      <span className="flex items-center gap-2">
                        <span className="font-semibold text-emerald-600">{eur(c.totalSpent)}</span>
                        {wa && (
                          <a href={wa} target="_blank" rel="noopener noreferrer" className="rounded bg-emerald-500 px-2 py-0.5 text-[11px] font-semibold text-white hover:bg-emerald-600">
                            WhatsApp
                          </a>
                        )}
                      </span>
                    </li>
                  );
                })}
              </ul>
            )}
          </Panel>
        </div>

        {/* Cities + ad ROI */}
        <div className="mt-6 grid gap-6 lg:grid-cols-2">
          <Panel title="Odakle kupci (top gradovi)">
            {m.topCities.length === 0 ? (
              <div className="text-sm text-slate-400">Nema podataka.</div>
            ) : (
              <ul className="space-y-2">
                {m.topCities.map((c) => (
                  <li key={c.name} className="flex items-center justify-between text-sm">
                    <span className="text-slate-700">{c.name}</span>
                    <span className="text-slate-500">
                      <span className="font-semibold text-slate-900">{c.count}</span> narudžbi · {eur(c.total)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </Panel>

          <Panel title="Reklame — isplativost">
            <div className="grid grid-cols-3 gap-3">
              <div>
                <div className="text-[11px] uppercase tracking-wider text-slate-400">Potrošeno</div>
                <div className="mt-1 text-lg font-bold text-slate-900">{eur(m.adSpendTotal)}</div>
              </div>
              <div>
                <div className="text-[11px] uppercase tracking-wider text-slate-400">ROAS</div>
                <div className="mt-1 text-lg font-bold text-slate-900">{m.roas != null ? `${m.roas.toFixed(1)}×` : "—"}</div>
              </div>
              <div>
                <div className="text-[11px] uppercase tracking-wider text-slate-400">Neto profit</div>
                <div className={`mt-1 text-lg font-bold ${m.netAfterAds >= 0 ? "text-emerald-600" : "text-red-500"}`}>{eur(m.netAfterAds)}</div>
              </div>
            </div>
            <p className="mt-3 mb-2 text-xs text-slate-400">Profit nakon oduzetih reklama. ROAS = promet ÷ potrošnja.</p>
            <AdSpendForm />
          </Panel>
        </div>

        {/* Recent orders */}
        <div className="mt-6">
          <Panel title={m.returnedCount > 0 ? `Zadnje narudžbe · vraćeno ${m.returnedCount} (${eur(m.returnedTotal)})` : "Zadnje narudžbe"}>
            <RecentOrders
              orders={m.recentOrders.map((o) => ({
                id: o.id,
                dateLabel: o.createdAt.toLocaleDateString("hr-HR"),
                customerName: o.customerName,
                itemCount: o.itemCount,
                total: o.total,
                status: o.status
              }))}
            />
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
