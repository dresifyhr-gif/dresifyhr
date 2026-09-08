import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { getAdminUser, isAdmin } from "@/lib/admin-auth";
import { getDashboardMetrics } from "@/lib/admin-metrics";
import { AdminShell } from "@/components/admin/admin-shell";
import { SettlementButton } from "@/components/admin/settlement-button";
import { AdSpendForm } from "@/components/admin/ad-spend-form";
import { Panel, eur, komLabel } from "@/components/admin/ui";

export const metadata: Metadata = { title: "Novci — Dresify Admin", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

export default async function MoneyPage() {
  if (!(await isAdmin())) redirect("/admin/login/");
  const me = await getAdminUser();
  const m = await getDashboardMetrics();

  return (
    <AdminShell title="Novci" subtitle="Podjela Igor / Ivica, poravnanje i reklame">
      {/* Partner split */}
      <div>
        <Panel title="Podjela Igor / Ivica (50 / 50, samo poslano)">
          {/* Brzi pristup isplatama — sve na jednom mjestu (poravnanje je niže). */}
          <div className="mb-4 flex flex-wrap gap-2">
            <a href="/admin/gls-isplata" className="inline-flex items-center gap-2 rounded-[12px] border border-[var(--a-line)] bg-[var(--a-surface-2)] px-4 py-2 text-[13px] font-semibold text-[var(--a-text)] transition hover:bg-[var(--a-card)]">
              💶 GLS isplata
            </a>
            <a href="#reklame-pregled" className="inline-flex items-center gap-2 rounded-[12px] border border-[var(--a-line)] bg-[var(--a-surface-2)] px-4 py-2 text-[13px] font-semibold text-[var(--a-text)] transition hover:bg-[var(--a-card)]">
              📣 Reklame
            </a>
            <a href="#poravnanje" className="inline-flex items-center gap-2 rounded-[12px] border border-[var(--a-line)] bg-[var(--a-surface-2)] px-4 py-2 text-[13px] font-semibold text-[var(--a-text)] transition hover:bg-[var(--a-card)]">
              🤝 Poravnanje
            </a>
          </div>
          {/* Trajna evidencija — čista zarada od početka, NE resetira se poravnanjem */}
          <div className="mb-4 rounded-xl border border-emerald-500/30 bg-emerald-500/[0.06] p-4">
            <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-emerald-600">
              💰 Ukupno zarađeno do sad (čisto, od početka)
            </div>
            <div className="mt-2 grid gap-3 sm:grid-cols-3">
              <div>
                <div className="text-2xl font-extrabold text-emerald-600">{eur(m.lifeProfit.igor)}</div>
                <div className="text-[12px] text-[var(--a-text-3)]">Igor</div>
              </div>
              <div>
                <div className="text-2xl font-extrabold text-sky-600">{eur(m.lifeProfit.ivica)}</div>
                <div className="text-[12px] text-[var(--a-text-3)]">Ivica</div>
              </div>
              <div>
                <div className="text-2xl font-extrabold text-[var(--a-text)]">{eur(m.lifeProfit.total)}</div>
                <div className="text-[12px] text-[var(--a-text-3)]">Zajedno</div>
              </div>
            </div>
            <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 border-t border-emerald-500/20 pt-2.5 text-[12px] text-[var(--a-text-2)]">
              <span>Neto roba <b className="text-[var(--a-text)]">{eur(m.lifeProfit.netGoods)}</b></span>
              <span>− Nabava <b className="text-[var(--a-text)]">{eur(m.lifeProfit.cost)}</b></span>
              <span>= Bruto marža <b className="text-emerald-600">{eur(m.lifeProfit.grossMargin)}</b></span>
              {m.lifeProfit.delivMargin > 0 && (
                <span title={`${m.lifeProfit.paidShipCount} plaćenih dostava × ~1,50 €`}>+ Marža dostave <b className="text-emerald-600">{eur(m.lifeProfit.delivMargin)}</b></span>
              )}
              {m.lifeProfit.delivFreeCost < 0 && (
                <span title={`${m.lifeProfit.freeShipCount} besplatnih dostava × ~5,50 €`}>− Besplatne dostave <b className="text-red-600">{eur(Math.abs(m.lifeProfit.delivFreeCost))}</b></span>
              )}
              {m.lifeProfit.returnCostTotal < 0 && (
                <span>− Povrati <b className="text-red-600">{eur(Math.abs(m.lifeProfit.returnCostTotal))}</b></span>
              )}
              <span>− Oglasi <b className="text-[var(--a-text)]">{eur(m.lifeProfit.ads)}</b></span>
            </div>
            <p className="mt-2 text-[11px] text-[var(--a-text-3)]">
              Samo naplaćene narudžbe ({m.lifeProfit.collectedCount}) · čisto nakon svih troškova. Ne dira poravnanja — trajna evidencija.
            </p>
          </div>
          <div className="mb-4 rounded-xl border border-[var(--a-line)] bg-[var(--a-surface-2)] p-4">
            <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--a-text-3)]">
              Podjela prikupljene gotovine {m.split.lastSettlement ? `od zadnjeg poravnanja (${m.split.lastSettlement.settledAt.toLocaleDateString("hr-HR")})` : "(od početka)"}
            </div>
            <div className="mt-2 flex flex-wrap items-center gap-x-6 gap-y-1.5 text-sm">
              <span className="text-[var(--a-text-2)]">Prikupljeno <b className="ml-1 text-[var(--a-text)]">{eur(m.split.totalCollected)}</b></span>
              <span className="text-[var(--a-text-2)]">− Roba natrag Ivici <b className="ml-1 text-[var(--a-text)]">{eur(m.split.collectedCost)}</b></span>
              {m.split.shipPLCollected !== 0 && (
                <span className="text-[var(--a-text-2)]">
                  {m.split.shipPLCollected >= 0 ? "+ Dostava (saldo)" : "− Dostava (saldo)"}
                  <b className={`ml-1 ${m.split.shipPLCollected >= 0 ? "text-emerald-600" : "text-red-600"}`}>{eur(Math.abs(m.split.shipPLCollected))}</b>
                  <span className="text-[var(--a-text-3)]"> (GLS marža − besplatne dostave)</span>
                </span>
              )}
              {m.split.returnShipLossSettle < 0 && (
                <span className="text-[var(--a-text-2)]">− Povrati <b className="ml-1 text-red-600">{eur(Math.abs(m.split.returnShipLossSettle))}</b> <span className="text-[var(--a-text-3)]">({m.split.returnedSinceCount} vraćenih · po pola svakome)</span></span>
              )}
              <span className="text-[var(--a-text-2)]">= Marža <b className="ml-1 text-emerald-600">{eur(m.split.collectedMargin)}</b> <span className="text-[var(--a-text-3)]">· svakom {eur(m.split.marginHalf)}</span></span>
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {[
              { name: "Igor", color: "emerald", c: m.split.cashSplit.igor },
              { name: "Ivica", color: "sky", c: m.split.cashSplit.ivica }
            ].map((p) => (
              <div key={p.name} className="a-card p-4">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-[var(--a-text)]">{p.name}</span>
                  <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${p.color === "emerald" ? "bg-emerald-50 text-emerald-600" : "bg-sky-50 text-sky-600"}`}>{p.c.sentCount} poslao</span>
                </div>
                <div className="mt-3 space-y-1.5 text-sm">
                  <div className="flex justify-between gap-2 text-[var(--a-text-2)]"><span>Poslano</span><span className="text-right font-semibold text-[var(--a-text)]">{komLabel(p.c.sentDresovi, p.c.sentKompleti)}</span></div>
                  <div className="flex justify-between gap-2 text-[var(--a-text-2)]"><span>Prikupio</span><span className="text-right font-semibold text-emerald-600">{eur(p.c.collected)} <span className="font-normal text-[var(--a-text-3)]">({komLabel(p.c.collectedDresovi, p.c.collectedKompleti)})</span></span></div>
                  {p.c.pending > 0 && (
                    <div className="flex justify-between gap-2 text-[var(--a-text-2)]">
                      <span>Za prikupit (fali)</span>
                      <span className="text-right">
                        <span className="font-semibold text-amber-600">{eur(p.c.pending)}</span>
                        <span className="block text-[11px] font-normal text-[var(--a-text-3)]">od toga naše ~{eur(p.c.pendingMargin)} · svakom {eur(p.c.pendingMargin / 2)}</span>
                      </span>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
          {m.split.adsSpend > 0 && (
            <div className="mt-3 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-[var(--a-line)] bg-[var(--a-surface-2)] px-4 py-2.5 text-sm">
              <span className="text-[var(--a-text-2)]">
                📣 Oglasi <b className="text-[var(--a-text)]">{eur(m.split.adsSpend)}</b> — dijeli se 50/50
                <span className="ml-2 text-[12px] text-[var(--a-text-3)]">
                  (Igor platio {eur(m.split.igorAds)} · Ivica platila {eur(m.split.ivicaAds)})
                </span>
              </span>
              <span className="text-[var(--a-text)]">svakom {eur(m.split.adsSpend / 2)}</span>
            </div>
          )}
          {/* Reklame — upis potrošnje + isplativost. Novac → OWNER/PARTNER. */}
          {(me?.role === "OWNER" || me?.role === "PARTNER") && (
            <div id="reklame-pregled" className="mt-4 scroll-mt-24 rounded-xl border border-[var(--a-line)] bg-[var(--a-surface-2)] p-4">
              <div className="mb-3 text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--a-text-3)]">📣 Reklame</div>
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
            </div>
          )}

          <div id="poravnanje" className="mt-4 flex scroll-mt-24 flex-col items-center gap-3 rounded-xl border-2 border-dashed border-[var(--a-line)] bg-[var(--a-surface-2)] p-4 text-center">
            {m.split.settleFrom == null ? (
              <div className="text-sm font-semibold text-[var(--a-text-2)]">Sve je izjednačeno — nitko nikom ne duguje ✅</div>
            ) : (
              <div className="text-sm text-[var(--a-text)]">
                Za isplatu:{" "}
                <span className="font-bold text-[var(--a-text)]">{m.split.settleFrom === "igor" ? "Igor" : "Ivica"}</span> daje{" "}
                <span className="font-bold text-[var(--a-text)]">{m.split.settleFrom === "igor" ? "Ivici" : "Igoru"}</span>{" "}
                <span className="font-bold text-emerald-600">{eur(m.split.settleAmount)}</span>{" "}
                <span className="text-[var(--a-text-2)]">(roba vraćena Ivici + marža 50/50 + pola oglasa).</span>
              </div>
            )}
            <SettlementButton />
            <p className="text-[11px] text-[var(--a-text-3)]">Kad Igor i Ivica fizički poravnate novac, klikni ovo — podjela se resetira i dalje broji od tog dana.</p>
          </div>

          {m.split.settlements.length > 0 && (
            <div className="mt-4">
              <div className="mb-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--a-text-3)]">Povijest poravnanja</div>
              <ul className="space-y-1.5 text-sm">
                {m.split.settlements.map((s) => (
                  <li key={s.id} className="flex items-center justify-between text-[var(--a-text-2)]">
                    <span>{s.settledAt.toLocaleDateString("hr-HR")}</span>
                    <span>
                      {s.fromPartner ? (
                        <>
                          <span className="font-medium text-[var(--a-text)]">{s.fromPartner === "igor" ? "Igor → Ivici" : "Ivica → Igoru"}</span>{" "}
                          <span className="font-semibold text-[var(--a-text)]">{eur(s.amount)}</span>
                        </>
                      ) : (
                        <span className="text-[var(--a-text-3)]">poravnato (0 €)</span>
                      )}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </Panel>
      </div>
    </AdminShell>
  );
}
