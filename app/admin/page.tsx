import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { isAdmin } from "@/lib/admin-auth";
import { getDashboardMetrics } from "@/lib/admin-metrics";
import { getCeoInsights } from "@/lib/admin-ceo";
import { getOldUnshipped, OLD_UNSHIPPED_DAYS } from "@/lib/admin-winback";
import { AdminShell } from "@/components/admin/admin-shell";
import { AssignShipper } from "@/components/admin/assign-shipper";
import { SettlementButton } from "@/components/admin/settlement-button";
import { ApologyList } from "@/components/admin/apology-list";
import { ReturnedList } from "@/components/admin/winback-panels";
import { Stat, Panel, eur, komLabel, waLink } from "@/components/admin/ui";
import { formatCroatianName } from "@/lib/utils";

export const metadata: Metadata = { title: "Pregled — Dresify Admin", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

function greeting() {
  const h = Number(new Intl.DateTimeFormat("en-GB", { timeZone: "Europe/Zagreb", hour: "2-digit", hour12: false }).format(new Date()));
  if (h < 12) return "Dobro jutro";
  if (h < 18) return "Dobar dan";
  return "Dobra večer";
}

function SectionHeading({ children }: { children: React.ReactNode }) {
  return <h3 className="mb-3 mt-8 text-sm font-bold uppercase tracking-[0.14em] text-slate-500">{children}</h3>;
}

function Highlight({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">{label}</div>
      <div className="mt-1 truncate text-lg font-bold text-slate-900">{value}</div>
      {sub && <div className="text-xs text-slate-400">{sub}</div>}
    </div>
  );
}

export default async function AdminOverview() {
  if (!(await isAdmin())) redirect("/admin/login/");

  // Metrike i "stari neposlani" su neovisni → paralelno; CEO insights ovisi o prometu pa ide nakon.
  const [m, oldRows] = await Promise.all([getDashboardMetrics(), getOldUnshipped(30)]);
  const ceo = await getCeoInsights(m.todayRev);
  const maxDay = Math.max(1, ...m.byDay.map((d) => d.total));

  const bestProduct = m.topItems[0];
  const topInactive = m.inactive[0];
  const inactiveWa = topInactive ? waLink(topInactive.phone) : null;

  return (
    <AdminShell title="Pregled" subtitle="Sve najvažnije na jednom mjestu">
      {/* Greeting */}
      <div className="mb-5">
        <h2 className="text-2xl font-bold tracking-tight text-slate-900">{greeting()}, Gazda 👋</h2>
        <p className="text-sm text-slate-500">
          {new Date().toLocaleDateString("hr-HR", { timeZone: "Europe/Zagreb", weekday: "long", day: "numeric", month: "long", year: "numeric" })}
        </p>
      </div>

      {/* KPI strip */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
        <Stat label="Promet danas" value={eur(m.todayRev)} profit={eur(m.todayProfit)} sub={`${m.todayOrders} novih`} />
        <Stat label="Za slanje" value={eur(m.pendingTotal)} profit={eur(m.pendingProfit)} sub={`${m.pendingCount} narudžbi`} />
        <Stat label="Poslano ukupno" value={eur(m.shippedRev)} profit={eur(m.shippedProfit)} sub={`${m.shippedCount} narudžbi`} />
        <Stat label="Sve narudžbe" value={eur(m.totalRev)} profit={eur(m.totalProfit)} sub={`${m.orderCount} narudžbi`} />
        <Stat label="Prosj. košarica" value={eur(m.aov)} />
        <Stat label="Procjena dana" value={eur(ceo.projection)} sub="predviđeni promet" />
      </div>

      <SectionHeading>⚡ Za danas</SectionHeading>

      {/* To-do + watch */}
      <div className="grid gap-5 lg:grid-cols-2">
        <Panel title="Što danas trebam napraviti">
          <ul className="space-y-2.5 text-sm">
            {m.pendingCount > 0 && (
              <li className="flex items-start gap-2">
                <span>📦</span>
                <span className="text-slate-700">
                  Pošalji <b>{m.pendingCount}</b> narudžbi ({eur(m.pendingTotal)}) —{" "}
                  <a href="/admin/slanje" className="font-semibold text-emerald-600 hover:underline">otvori red za slanje</a>
                </span>
              </li>
            )}
            {ceo.reorder && (
              <li className="flex items-start gap-2">
                <span>🛒</span>
                <span className="text-slate-700">Naruči <b>{ceo.reorder.name}</b> — najbrže se prodaje ({ceo.reorder.qty} kom u 14 dana)</span>
              </li>
            )}
            {topInactive && (
              <li className="flex items-start gap-2">
                <span>📞</span>
                <span className="text-slate-700">
                  Kontaktiraj <b>{topInactive.name ? formatCroatianName(topInactive.name) : topInactive.phone}</b> — nije kupio od {topInactive.lastOrderAt.toLocaleDateString("hr-HR")}
                  {inactiveWa && (
                    <> · <a href={inactiveWa} target="_blank" rel="noopener noreferrer" className="font-semibold text-emerald-600 hover:underline">WhatsApp</a></>
                  )}
                </span>
              </li>
            )}
            {m.unassignedShipped.length > 0 && (
              <li className="flex items-start gap-2">
                <span>✍️</span>
                <span className="text-slate-700">Označi <b>{m.unassignedShipped.length}</b> poslanih narudžbi (tko je poslao) — dolje ↓</span>
              </li>
            )}
            {m.pendingCount === 0 && !ceo.reorder && !topInactive && m.unassignedShipped.length === 0 && (
              <li className="text-slate-400">Sve pod kontrolom — nema hitnih zadataka ✅</li>
            )}
          </ul>
        </Panel>

        <Panel title="Na što trebam paziti">
          <ul className="space-y-2.5 text-sm">
            {m.returnedCount > 0 && (
              <li className="flex items-start gap-2">
                <span>↩️</span>
                <span className="text-slate-700">Vraćene pošiljke: <b>{m.returnedCount}</b> · {m.returnedQty} kom ({eur(m.returnedTotal)}) — <span className="text-slate-400">nije u prometu</span></span>
              </li>
            )}
            {m.cancelledCount > 0 && (
              <li className="flex items-start gap-2">
                <span>✖️</span>
                <span className="text-slate-700">Otkazane narudžbe: <b>{m.cancelledCount}</b> · {m.cancelledQty} kom ({eur(m.cancelledTotal)}) — <span className="text-slate-400">nije u prometu</span></span>
              </li>
            )}
            {ceo.declining && (
              <li className="flex items-start gap-2">
                <span>📉</span>
                <span className="text-slate-700"><b>{ceo.declining.name}</b> pada ({ceo.declining.prior}→{ceo.declining.recent} kom u 14 dana)</span>
              </li>
            )}
            {ceo.rising && (
              <li className="flex items-start gap-2">
                <span>📈</span>
                <span className="text-slate-700"><b>{ceo.rising.name}</b> raste ({ceo.rising.prior}→{ceo.rising.recent} kom) — pojačaj zalihu</span>
              </li>
            )}
            <li className="flex items-start gap-2">
              <span>💀</span>
              <span className="text-slate-700">Mrtvih modela: <b>{m.deadProducts.length}</b> bez ijedne prodaje — razmisli o gašenju (<a href="/admin/analitika" className="font-semibold text-slate-500 hover:underline">Analitika</a>)</span>
            </li>
          </ul>
        </Panel>
      </div>

      {/* WhatsApp apology (old unsent) + returned + cancelled */}
      {(oldRows.length > 0 || m.returnedCount > 0 || m.cancelledCount > 0) && (
        <div className="mt-5 grid gap-5 lg:grid-cols-2">
          {oldRows.length > 0 && (
            <Panel title={`Javi se kupcima — stare neposlane (${oldRows.length})`}>
              <ApologyList rows={oldRows} />
            </Panel>
          )}
          {m.returnedCount > 0 && (
            <Panel title={`Vraćeno · ${m.returnedCount} · ${m.returnedQty} kom (${eur(m.returnedTotal)})`}>
              <ReturnedList items={m.returned} />
            </Panel>
          )}
          {m.cancelledCount > 0 && (
            <Panel title={`Otkazano · ${m.cancelledCount} · ${m.cancelledQty} kom (${eur(m.cancelledTotal)})`}>
              <ReturnedList items={m.cancelled} />
            </Panel>
          )}
        </div>
      )}

      {/* Assign shipper for the shipped-but-untagged orders */}
      {m.unassignedShipped.length > 0 && (
        <div className="mt-5">
          <Panel title={`Poslane bez oznake — tko je poslao? (${m.unassignedShipped.length})`}>
            <p className="mb-3 -mt-2 text-xs text-slate-400">Ove su poslane, ali nemaju označeno tko — klikni Igor ili Ivica da uđu u podjelu profita.</p>
            <AssignShipper
              orders={m.unassignedShipped.map((o) => ({
                id: o.id,
                dateLabel: o.createdAt.toLocaleDateString("hr-HR"),
                customerName: formatCroatianName(o.customerName),
                total: o.total
              }))}
            />
          </Panel>
        </div>
      )}

      <SectionHeading>📊 Brojke</SectionHeading>

      {/* Highlights */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <Highlight
          label="Najprodavaniji"
          value={bestProduct ? `${bestProduct.klub} — ${bestProduct.igrac}` : "—"}
          sub={bestProduct ? `${bestProduct._sum.quantity ?? 0} kom ukupno` : undefined}
        />
        <Highlight
          label="Kupac dana"
          value={ceo.customerOfDay ? ceo.customerOfDay.name : "još nema danas"}
          sub={ceo.customerOfDay ? eur(ceo.customerOfDay.total ?? 0) : undefined}
        />
        <Highlight
          label="Najveća narudžba danas"
          value={ceo.biggestOrderToday ? ceo.biggestOrderToday.name : "još nema danas"}
          sub={ceo.biggestOrderToday ? eur(ceo.biggestOrderToday.total ?? 0) : undefined}
        />
      </div>

      {/* Partner split */}
      <div className="mt-5">
        <Panel title="Podjela Igor / Ivica (50 / 50, samo poslano)">
          <div className="mb-4 rounded-xl border border-slate-200 bg-slate-50/60 p-4">
            <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">
              Podjela prikupljene gotovine {m.split.lastSettlement ? `od zadnjeg poravnanja (${m.split.lastSettlement.settledAt.toLocaleDateString("hr-HR")})` : "(od početka)"}
            </div>
            <div className="mt-2 flex flex-wrap items-center gap-x-6 gap-y-1.5 text-sm">
              <span className="text-slate-500">Prikupljeno <b className="ml-1 text-slate-900">{eur(m.split.totalCollected)}</b></span>
              <span className="text-slate-500">− Roba natrag Ivici <b className="ml-1 text-slate-900">{eur(m.split.collectedCost)}</b></span>
              {m.split.freeDeliveries > 0 && (
                <span className="text-slate-500">− Dostave <b className="ml-1 text-slate-900">{eur(m.split.freeShipCost)}</b> <span className="text-slate-400">({m.split.freeDeliveries} besplatnih × 3€)</span></span>
              )}
              <span className="text-slate-500">= Marža <b className="ml-1 text-emerald-600">{eur(m.split.collectedMargin)}</b> <span className="text-slate-400">· svakom {eur(m.split.marginHalf)}</span></span>
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {[
              { name: "Igor", color: "emerald", c: m.split.cashSplit.igor },
              { name: "Ivica", color: "sky", c: m.split.cashSplit.ivica }
            ].map((p) => (
              <div key={p.name} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-900">{p.name}</span>
                  <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${p.color === "emerald" ? "bg-emerald-50 text-emerald-600" : "bg-sky-50 text-sky-600"}`}>{p.c.sentCount} poslao</span>
                </div>
                <div className="mt-3 space-y-1.5 text-sm">
                  <div className="flex justify-between gap-2 text-slate-600"><span>Poslano</span><span className="text-right font-semibold text-slate-900">{komLabel(p.c.sentDresovi, p.c.sentKompleti)}</span></div>
                  <div className="flex justify-between gap-2 text-slate-600"><span>Prikupio</span><span className="text-right font-semibold text-emerald-600">{eur(p.c.collected)} <span className="font-normal text-slate-400">({komLabel(p.c.collectedDresovi, p.c.collectedKompleti)})</span></span></div>
                  {p.c.pending > 0 && <div className="flex justify-between gap-2 text-slate-600"><span>Za prikupit (fali)</span><span className="font-semibold text-amber-600">{eur(p.c.pending)}</span></div>}
                </div>
              </div>
            ))}
          </div>
          {m.split.adsSpend > 0 && (
            <div className="mt-3 flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50/60 px-4 py-2.5 text-sm">
              <span className="text-slate-600">📣 Oglasi (platio Igor) — dijeli se 50/50</span>
              <span className="text-slate-700"><span className="font-semibold text-slate-900">{eur(m.split.adsSpend)}</span> · svakom {eur(m.split.adsSpend / 2)}</span>
            </div>
          )}
          <div className="mt-4 flex flex-col items-center gap-3 rounded-xl border-2 border-dashed border-slate-300 bg-slate-50 p-4 text-center">
            {m.split.settleFrom == null ? (
              <div className="text-sm font-semibold text-slate-600">Sve je izjednačeno — nitko nikom ne duguje ✅</div>
            ) : (
              <div className="text-sm text-slate-700">
                Za isplatu:{" "}
                <span className="font-bold text-slate-900">{m.split.settleFrom === "igor" ? "Igor" : "Ivica"}</span> daje{" "}
                <span className="font-bold text-slate-900">{m.split.settleFrom === "igor" ? "Ivici" : "Igoru"}</span>{" "}
                <span className="font-bold text-emerald-600">{eur(m.split.settleAmount)}</span>{" "}
                <span className="text-slate-500">(roba vraćena Ivici + marža 50/50 + pola oglasa).</span>
              </div>
            )}
            <SettlementButton />
            <p className="text-[11px] text-slate-400">Kad Igor i Ivica fizički poravnate novac, klikni ovo — podjela se resetira i dalje broji od tog dana.</p>
          </div>

          {m.split.settlements.length > 0 && (
            <div className="mt-4">
              <div className="mb-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">Povijest poravnanja</div>
              <ul className="space-y-1.5 text-sm">
                {m.split.settlements.map((s) => (
                  <li key={s.id} className="flex items-center justify-between text-slate-600">
                    <span>{s.settledAt.toLocaleDateString("hr-HR")}</span>
                    <span>
                      {s.fromPartner ? (
                        <>
                          <span className="font-medium text-slate-700">{s.fromPartner === "igor" ? "Igor → Ivici" : "Ivica → Igoru"}</span>{" "}
                          <span className="font-semibold text-slate-900">{eur(s.amount)}</span>
                        </>
                      ) : (
                        <span className="text-slate-400">poravnato (0 €)</span>
                      )}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </Panel>
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
