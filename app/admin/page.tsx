import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { getAdminUser, isAdmin } from "@/lib/admin-auth";
import { getDashboardMetrics } from "@/lib/admin-metrics";
import { getCeoInsights } from "@/lib/admin-ceo";
import { getOldUnshipped, OLD_UNSHIPPED_DAYS } from "@/lib/admin-winback";
import { AdminShell } from "@/components/admin/admin-shell";
import { ApologyList } from "@/components/admin/apology-list";
import { ReturnedList } from "@/components/admin/winback-panels";
import { Stat, Panel, eur, komLabel, waLink } from "@/components/admin/ui";
import { PushToggle } from "@/components/admin/push-toggle";
import { RevenueChart } from "@/components/admin/revenue-chart";
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
  return <h3 className="mb-3 mt-8 text-sm font-bold uppercase tracking-[0.14em] text-[var(--a-text-2)]">{children}</h3>;
}

function GoalBar({ current, goal, projected, day }: { current: number; goal: number; projected: number; day: number }) {
  const pct = goal > 0 ? Math.max(0, Math.min(100, (current / goal) * 100)) : 0;
  const onTrack = projected >= goal;
  const remaining = Math.max(0, goal - current);
  // Prvih par dana projekcija je iz premalo podataka (šum) — ne palimo zastavicu.
  const early = day < 5;
  // Marker gdje projekcija po tempu pada (može biti i preko 100%).
  const projPct = goal > 0 ? Math.max(0, Math.min(100, (projected / goal) * 100)) : 0;
  return (
    <div className="a-card relative overflow-hidden p-4 sm:p-5">
      <div
        className="pointer-events-none absolute -right-10 -top-10 h-32 w-32 rounded-full"
        style={{ background: "radial-gradient(circle, color-mix(in srgb, var(--a-accent) 22%, transparent), transparent 70%)" }}
      />
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <div className="text-[11px] font-bold uppercase tracking-[0.14em] text-[var(--a-text-3)]">🎯 Mjesečni cilj prometa</div>
          <div className="mt-1 text-[26px] font-extrabold leading-none tracking-[-0.02em] text-[var(--a-text)] tabular-nums">
            {eur(current)} <span className="text-[15px] font-semibold text-[var(--a-text-3)]">/ {eur(goal)}</span>
          </div>
        </div>
        <div className="text-right">
          <div className="text-[22px] font-extrabold leading-none text-[var(--a-text)] tabular-nums">{Math.round(pct)}%</div>
          <div className="text-[11px] font-semibold text-[var(--a-text-3)]">do cilja fali {eur(remaining)}</div>
        </div>
      </div>
      <div className="relative mt-3 h-3 w-full overflow-hidden rounded-full bg-[var(--a-surface-2)]">
        <div className="h-full rounded-full bg-[var(--a-good)] transition-[width] duration-500 ease-out" style={{ width: `${pct}%` }} />
        {/* Marker: gdje ćemo završiti po trenutnom tempu (ne prikazuje se prvih par dana — šum) */}
        {!early && <div className="absolute inset-y-0 w-[2px] bg-[var(--a-text)]" style={{ left: `calc(${projPct}% - 1px)` }} title="Projekcija po tempu" />}
      </div>
      <div className="mt-2 text-[12px] font-semibold">
        {early ? (
          <span className="text-[var(--a-text-3)]">🗓️ Mjesec tek počeo — projekcija za koji dan</span>
        ) : (
          <>
            <span className={onTrack ? "text-[var(--a-good)]" : "text-[var(--a-warn)]"}>
              {onTrack ? "✅ Na dobrom si putu" : "⚠️ Ispod tempa"}
            </span>
            <span className="text-[var(--a-text-3)]"> · projekcija po tempu ~{eur(projected)}</span>
          </>
        )}
      </div>
    </div>
  );
}

function Highlight({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="a-card p-4">
      <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--a-text-3)]">{label}</div>
      <div className="mt-1 truncate text-lg font-bold text-[var(--a-text)]">{value}</div>
      {sub && <div className="text-xs text-[var(--a-text-3)]">{sub}</div>}
    </div>
  );
}

export default async function AdminOverview() {
  if (!(await isAdmin())) redirect("/admin/login/");
  const me = await getAdminUser();

  // Metrike i "stari neposlani" su neovisni → paralelno; CEO insights ovisi o prometu pa ide nakon.
  const [m, oldRows] = await Promise.all([getDashboardMetrics(), getOldUnshipped(30)]);
  const ceo = await getCeoInsights(m.todayRev);

  const bestProduct = m.topItems[0];
  const topInactive = m.inactive[0];
  const inactiveWa = topInactive ? waLink(topInactive.phone) : null;

  // Koliko akcijskih panela na dnu ima podataka → toliko stupaca (da stanu u jedan red).
  const actionPanels = [oldRows.length > 0, m.returnedCount > 0, m.cancelledCount > 0].filter(Boolean).length;
  const actionCols = actionPanels >= 3 ? "lg:grid-cols-3" : actionPanels === 2 ? "sm:grid-cols-2" : "";

  return (
    <AdminShell title="Pregled" subtitle="Sve najvažnije na jednom mjestu">
      {/* Greeting */}
      <div className="mb-5">
        <h2
          className="text-[26px] font-bold tracking-tight text-[var(--a-text)]"
          style={{ fontFamily: "var(--font-barlow), sans-serif", letterSpacing: "-0.01em" }}
        >
          {greeting()}, {me?.username || "Gazda"} 👋
        </h2>
        <p className="text-sm text-[var(--a-text-2)]">
          {new Date().toLocaleDateString("hr-HR", { timeZone: "Europe/Zagreb", weekday: "long", day: "numeric", month: "long", year: "numeric" })}
        </p>
      </div>

      {/* Push obavijesti — uključi na ovom uređaju (svi profili) */}
      <div className="mb-5">
        <PushToggle />
      </div>

      {/* Mjesečni cilj prometa — progress + projekcija */}
      <div className="mb-5">
        <GoalBar current={m.monthCalRev} goal={m.monthlyGoal} projected={m.monthProjected} day={m.dayOfMonth} />
      </div>

      {/* KPI strip */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
        <Stat
          label="Promet danas" value={eur(m.todayRev)} profit={eur(m.todayProfit)} sub={`${m.todayOrders} novih`}
          progress={{ pct: m.dailyGoal > 0 ? m.todayRev / m.dailyGoal : 0, caption: <>dnevni cilj {eur(m.dailyGoal)}</>, tone: "good" }}
        />
        <Stat label="Za slanje" value={eur(m.pendingTotal)} profit={eur(m.pendingProfit)} sub={`${m.pendingCount} narudžbi`} />
        <Stat label="Poslano ukupno" value={eur(m.shippedRev)} profit={eur(m.shippedProfit)} sub={`${m.shippedCount} narudžbi`} />
        <Stat label="Ovaj mjesec" value={eur(m.monthCalRev)} profit={eur(m.monthCalProfit)} sub={`${m.monthCalOrders} narudžbi`} />
        <Stat
          label="Prosj. narudžbi/mj."
          value={m.avgMonthlyOrders != null ? String(Math.round(m.avgMonthlyOrders)) : "—"}
          sub={m.avgMonthsCounted > 0 ? `${m.avgMonthsCounted} punih mj. (od lipnja)` : "još nema punog mjeseca"}
        />
        <Stat label="Prosj. košarica" value={eur(m.aov)} />
      </div>

      <SectionHeading>💰 Pouzeće — novac i roba</SectionHeading>

      {/* Ukupno (sve poslano, neovisno o poravnanju) — iste brojke kao na Narudžbama */}
      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        {(() => {
          const co = m.cashOverview;
          const pipeline = co.collectedTotal + co.pendingTotal; // sve poslano u pouzeću
          const sentPieces = co.sentDresovi + co.sentKompleti + co.sentStreet;
          const pendingPieces = co.pendingDresovi + co.pendingKompleti + co.pendingStreet;
          return (
            <>
              <Stat
                label="Prikupljeno"
                value={eur(co.collectedTotal)}
                sub={`${co.collectedCount} narudžbi · ${komLabel(co.collectedDresovi, co.collectedKompleti)}${co.collectedStreet ? ` + ${co.collectedStreet} street` : ""}`}
                progress={{ pct: pipeline > 0 ? co.collectedTotal / pipeline : 0, caption: <>naplaćeno od {eur(pipeline)}</>, tone: "good" }}
              />
              <Stat
                label="Za prikupiti"
                value={eur(co.pendingTotal)}
                sub={`🚚 HP ${eur(co.pendingHP)} · GLS ${eur(co.pendingGLS)} · ${co.pendingCount} narudžbi`}
                progress={{ pct: pipeline > 0 ? co.pendingTotal / pipeline : 0, caption: <>još otvoreno</>, tone: "warn" }}
              />
              <Stat
                label="Poslano komada"
                value={String(sentPieces)}
                sub={`${komLabel(co.sentDresovi, co.sentKompleti)}${co.sentStreet ? ` + ${co.sentStreet} street` : ""}`}
                progress={{
                  pct: sentPieces + m.toShipPieces > 0 ? sentPieces / (sentPieces + m.toShipPieces) : 1,
                  caption: m.toShipPieces > 0 ? <>još {m.toShipPieces} za slanje</> : <>sve poslano ✓</>,
                  tone: "good"
                }}
              />
              <Stat
                label="Čeka preuzimanje"
                value={String(pendingPieces)}
                sub={`${komLabel(co.pendingDresovi, co.pendingKompleti)}${co.pendingStreet ? ` + ${co.pendingStreet} street` : ""}`}
                progress={{ pct: sentPieces > 0 ? pendingPieces / sentPieces : 0, caption: <>od {sentPieces} poslanih</>, tone: "info" }}
              />
            </>
          );
        })()}
      </div>

      <SectionHeading>⚡ Za danas</SectionHeading>

      {/* Samo to-do; "Na što trebam paziti" maknut — Gazda to ionako sam prati. */}
      <div className="grid gap-5">
        <Panel title="Što danas trebam napraviti">
          <ul className="space-y-2.5 text-sm">
            {m.pendingCount > 0 && (
              <li className="flex items-start gap-2">
                <span>📦</span>
                <span className="text-[var(--a-text)]">
                  Pošalji <b>{m.pendingCount}</b> narudžbi ({eur(m.pendingTotal)}) —{" "}
                  <a href="/admin/slanje" className="font-semibold text-emerald-600 hover:underline">otvori red za slanje</a>
                </span>
              </li>
            )}
            {ceo.reorder && (
              <li className="flex items-start gap-2">
                <span>🛒</span>
                <span className="text-[var(--a-text)]">Naruči <b>{ceo.reorder.name}</b> — najbrže se prodaje ({ceo.reorder.qty} kom u 14 dana)</span>
              </li>
            )}
            {topInactive && (
              <li className="flex items-start gap-2">
                <span>📞</span>
                <span className="text-[var(--a-text)]">
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
                <span className="text-[var(--a-text)]">Označi <b>{m.unassignedShipped.length}</b> poslanih narudžbi (tko je poslao) — dolje ↓</span>
              </li>
            )}
            {m.pendingCount === 0 && !ceo.reorder && !topInactive && m.unassignedShipped.length === 0 && (
              <li className="text-[var(--a-text-3)]">Sve pod kontrolom — nema hitnih zadataka ✅</li>
            )}
          </ul>
        </Panel>
      </div>

      {/* Graf prometa (na mjestu gdje su prije bili paneli); paneli su premješteni na dno. */}
      <div className="mt-5">
        <Panel title="Promet">
          <RevenueChart data={m.byDay} />
        </Panel>
      </div>

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


      {/* Akcijski paneli na dnu (istaknutije): javi se kupcima + vraćeno/otkazano */}
      {(oldRows.length > 0 || m.returnedCount > 0 || m.cancelledCount > 0) && (
        <div className={`mt-5 grid gap-5 ${actionCols}`}>
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
    </AdminShell>
  );
}
