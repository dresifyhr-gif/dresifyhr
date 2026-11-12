import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { getAdminUser, isAdmin } from "@/lib/admin-auth";
import { getDashboardMetrics } from "@/lib/admin-metrics";
import { getGaStats } from "@/lib/ga";
import { getIgStats } from "@/lib/instagram";
import { prisma } from "@/lib/prisma";
import { AdminShell } from "@/components/admin/admin-shell";
import { AnalyticsTabs } from "@/components/admin/analytics-tabs";
import { GaStatsPanel } from "@/components/admin/ga-stats";
import { InstagramConnect } from "@/components/admin/instagram-connect";
import { InstagramStatsPanel } from "@/components/admin/instagram-stats";
import { Panel, Stat } from "@/components/admin/ui";

export const metadata: Metadata = { title: "Analitika — Dresify Admin", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

export default async function AnalyticsPage({ searchParams }: { searchParams?: { tab?: string } }) {
  if (!(await isAdmin())) redirect("/admin/login/");
  const user = await getAdminUser();

  const NOT_VOID = { notIn: ["cancelled", "returned"] };
  const [m, ga, ig, sizeRows, clubRows, soldOrders, repeatCust, totalCust, allCount, cancelCount, returnCount, reasonRows] =
    await Promise.all([
      getDashboardMetrics(),
      getGaStats(),
      getIgStats(),
      // Prodaja po veličinama (samo prodane) → za nabavu.
      prisma.orderItem.groupBy({ by: ["size"], _sum: { quantity: true }, where: { order: { status: NOT_VOID } } }),
      // Prodaja po klubovima/reprezentacijama.
      prisma.orderItem.groupBy({ by: ["klub"], _sum: { quantity: true }, where: { order: { status: NOT_VOID } } }),
      // Za trend prometa + kad kupci naručuju.
      prisma.order.findMany({ where: { status: NOT_VOID }, select: { createdAt: true, total: true, shipping: true } }),
      // Ponovljeni kupci.
      prisma.customer.count({ where: { totalOrders: { gt: 1 } } }),
      prisma.customer.count({ where: { totalOrders: { gt: 0 } } }),
      // Otkazi/povrati.
      prisma.order.count(),
      prisma.order.count({ where: { status: "cancelled" } }),
      prisma.order.count({ where: { status: "returned" } }),
      prisma.order.groupBy({ by: ["cancelReason"], _count: { _all: true }, where: { status: "cancelled" } })
    ]);

  const sizes = sizeRows
    .map((r) => ({ size: r.size || "—", qty: r._sum.quantity ?? 0 }))
    .filter((r) => r.qty > 0)
    .sort((a, b) => b.qty - a.qty);
  const sizeMax = Math.max(1, ...sizes.map((s) => s.qty));

  // Prodaja po klubovima (top 12).
  const clubs = clubRows
    .map((r) => ({ klub: r.klub || "—", qty: r._sum.quantity ?? 0 }))
    .filter((r) => r.qty > 0)
    .sort((a, b) => b.qty - a.qty)
    .slice(0, 12);
  const clubMax = Math.max(1, ...clubs.map((c) => c.qty));

  // Trend prometa — zadnjih 30 dana (Zagreb), promet bez dostave.
  const zDay = new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Zagreb", year: "numeric", month: "2-digit", day: "2-digit" });
  const zWeekday = new Intl.DateTimeFormat("en-US", { timeZone: "Europe/Zagreb", weekday: "short" });
  const zHour = new Intl.DateTimeFormat("en-GB", { timeZone: "Europe/Zagreb", hour: "2-digit", hour12: false });
  const DAY = 86400000;
  const now = Date.now();
  const trend: { day: string; total: number }[] = [];
  const trendIdx = new Map<string, number>();
  for (let i = 29; i >= 0; i--) {
    const key = zDay.format(new Date(now - i * DAY));
    trendIdx.set(key, trend.length);
    trend.push({ day: key, total: 0 });
  }
  // Kad kupci naručuju — po danu u tjednu i po satu.
  const WD = ["Pon", "Uto", "Sri", "Čet", "Pet", "Sub", "Ned"];
  const wdMap: Record<string, string> = { Mon: "Pon", Tue: "Uto", Wed: "Sri", Thu: "Čet", Fri: "Pet", Sat: "Sub", Sun: "Ned" };
  const byWeekday = new Map<string, number>(WD.map((d) => [d, 0]));
  const byHour = new Array(24).fill(0) as number[];
  for (const o of soldOrders) {
    const key = zDay.format(o.createdAt);
    const ti = trendIdx.get(key);
    if (ti !== undefined) trend[ti].total += (o.total ?? 0) - (o.shipping ?? 0);
    const wd = wdMap[zWeekday.format(o.createdAt)] || "Pon";
    byWeekday.set(wd, (byWeekday.get(wd) ?? 0) + 1);
    const h = parseInt(zHour.format(o.createdAt), 10);
    if (!Number.isNaN(h) && h >= 0 && h < 24) byHour[h] += 1;
  }
  const trendMax = Math.max(1, ...trend.map((t) => t.total));
  const wdArr = WD.map((d) => ({ d, n: byWeekday.get(d) ?? 0 }));
  const wdMax = Math.max(1, ...wdArr.map((w) => w.n));
  const hourMax = Math.max(1, ...byHour);
  const peakHour = byHour.indexOf(hourMax);
  const peakWd = wdArr.reduce((a, b) => (b.n > a.n ? b : a), wdArr[0]);

  // Ponovljeni kupci.
  const repeatPct = totalCust > 0 ? Math.round((repeatCust / totalCust) * 100) : 0;

  // Otkazi/povrati.
  const failRate = allCount > 0 ? Math.round(((cancelCount + returnCount) / allCount) * 100) : 0;
  const reasons = reasonRows
    .map((r) => ({ reason: r.cancelReason || "(bez razloga)", n: r._count._all }))
    .sort((a, b) => b.n - a.n)
    .slice(0, 6);

  // Instagram KPI promjene (za strelice).
  const igFollowersChange =
    ig.newFollowers7d != null && ig.followers - ig.newFollowers7d > 0
      ? Math.round((ig.newFollowers7d / (ig.followers - ig.newFollowers7d)) * 100)
      : null;
  const igReachChange =
    ig.reach7d != null && ig.reachPrev7d != null && ig.reachPrev7d > 0
      ? Math.round(((ig.reach7d - ig.reachPrev7d) / ig.reachPrev7d) * 100)
      : null;

  const initialTab = (["prodaja", "google", "instagram"] as const).includes(searchParams?.tab as never)
    ? (searchParams?.tab as "prodaja" | "google" | "instagram")
    : "prodaja";

  const prodaja = (
    <>
      <div className="mb-5">
        <Panel title="Trend prometa (30 dana)">
          <p className="mb-3 -mt-2 text-xs text-[var(--a-text-3)]">Dnevni promet bez dostave — vidiš rasteš li i koji su dani najjači.</p>
          <div className="flex h-32 items-end gap-[3px]">
            {trend.map((t) => (
              <div key={t.day} className="group relative flex-1" title={`${t.day}: ${Math.round(t.total)} €`}>
                <div className="w-full rounded-t-[3px] bg-accent transition-all group-hover:opacity-80" style={{ height: `${Math.max(2, (t.total / trendMax) * 128)}px` }} />
              </div>
            ))}
          </div>
          <div className="mt-1.5 flex justify-between text-[10px] text-[var(--a-text-3)]">
            <span>{trend[0]?.day.slice(5)}</span>
            <span>{trend[trend.length - 1]?.day.slice(5)}</span>
          </div>
        </Panel>
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <Panel title="Najprodavaniji">
          {m.topItems.length === 0 ? (
            <div className="text-sm text-[var(--a-text-3)]">Nema podataka još.</div>
          ) : (
            <ul className="space-y-2.5">
              {m.topItems.map((t, i) => (
                <li key={`${t.slug}-${t.klub}-${t.igrac}`} className="flex items-center justify-between text-sm">
                  <span className="flex min-w-0 items-center gap-2.5">
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded bg-[var(--a-surface-2)] text-[10px] font-bold text-[var(--a-text-3)]">{i + 1}</span>
                    <span className="truncate text-[var(--a-text)]">{t.klub} — {t.igrac}</span>
                  </span>
                  <span className="ml-2 shrink-0 font-semibold text-[var(--a-text)]">{t._sum.quantity ?? 0} kom</span>
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

      <div className="mt-5 grid grid-cols-1 gap-5 lg:grid-cols-2">
        <Panel title="Prodaja po klubovima">
          <p className="mb-3 -mt-2 text-xs text-[var(--a-text-3)]">Koje reprezentacije/klubovi nose prodaju (top 12).</p>
          {clubs.length === 0 ? (
            <div className="text-sm text-[var(--a-text-3)]">Nema podataka još.</div>
          ) : (
            <ul className="space-y-2">
              {clubs.map((c) => (
                <li key={c.klub} className="flex items-center gap-3 text-sm">
                  <span className="w-28 shrink-0 truncate font-semibold text-[var(--a-text)]">{c.klub}</span>
                  <span className="h-2.5 flex-1 overflow-hidden rounded-full bg-[var(--a-surface-2)]">
                    <span className="block h-full rounded-full bg-accent" style={{ width: `${(c.qty / clubMax) * 100}%` }} />
                  </span>
                  <span className="w-14 shrink-0 text-right font-semibold text-[var(--a-text)]">{c.qty} kom</span>
                </li>
              ))}
            </ul>
          )}
        </Panel>

        <Panel title="Kad kupci naručuju">
          <p className="mb-3 -mt-2 text-xs text-[var(--a-text-3)]">Najviše narudžbi: <span className="font-semibold text-[var(--a-text)]">{peakWd.d}</span> · oko <span className="font-semibold text-[var(--a-text)]">{String(peakHour).padStart(2, "0")}h</span> — dobar trenutak za reklamu.</p>
          <div className="mb-4">
            <div className="mb-1.5 text-[11px] font-semibold uppercase tracking-wider text-[var(--a-text-3)]">Po danu</div>
            <div className="flex items-end gap-1.5" style={{ height: 64 }}>
              {wdArr.map((w) => (
                <div key={w.d} className="flex flex-1 flex-col items-center gap-1">
                  <div className="flex w-full items-end" style={{ height: 44 }}>
                    <div className="w-full rounded-t-[3px] bg-accent" style={{ height: `${Math.max(2, (w.n / wdMax) * 44)}px` }} title={`${w.d}: ${w.n}`} />
                  </div>
                  <span className="text-[10px] text-[var(--a-text-3)]">{w.d}</span>
                </div>
              ))}
            </div>
          </div>
          <div>
            <div className="mb-1.5 text-[11px] font-semibold uppercase tracking-wider text-[var(--a-text-3)]">Po satu (0–23)</div>
            <div className="flex items-end gap-[2px]" style={{ height: 44 }}>
              {byHour.map((n, h) => (
                <div key={h} className="flex-1 rounded-t-[2px] bg-accent/70" style={{ height: `${Math.max(1, (n / hourMax) * 44)}px` }} title={`${String(h).padStart(2, "0")}h: ${n}`} />
              ))}
            </div>
          </div>
        </Panel>

        <Panel title="Ponovljeni kupci">
          <div className="flex items-baseline gap-2">
            <span className="text-4xl font-extrabold text-[var(--a-text)]">{repeatPct}%</span>
            <span className="text-sm text-[var(--a-text-3)]">kupaca se vratilo</span>
          </div>
          <p className="mt-2 text-xs text-[var(--a-text-3)]">
            {repeatCust} od {totalCust} kupaca naručilo je više od jednom. Više = jača vjernost (Klub pomaže).
          </p>
        </Panel>

        <Panel title="Otkazi i povrati">
          <div className="flex items-baseline gap-2">
            <span className={`text-4xl font-extrabold ${failRate > 15 ? "text-red-500" : "text-[var(--a-text)]"}`}>{failRate}%</span>
            <span className="text-sm text-[var(--a-text-3)]">narudžbi propalo</span>
          </div>
          <p className="mt-1 mb-3 text-xs text-[var(--a-text-3)]">{cancelCount} otkazano · {returnCount} vraćeno · od {allCount} ukupno.</p>
          {reasons.length > 0 && (
            <>
              <div className="mb-1.5 text-[11px] font-semibold uppercase tracking-wider text-[var(--a-text-3)]">Top razlozi otkaza</div>
              <ul className="space-y-1 text-sm">
                {reasons.map((r) => (
                  <li key={r.reason} className="flex items-center justify-between">
                    <span className="min-w-0 truncate text-[var(--a-text-2)]">{r.reason}</span>
                    <span className="ml-2 shrink-0 font-semibold text-[var(--a-text)]">{r.n}×</span>
                  </li>
                ))}
              </ul>
            </>
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
    </>
  );

  const instagram = (
    <>
      {ig.ok && (
        <div className="mb-5 grid grid-cols-2 gap-3 md:grid-cols-4">
          <Stat
            label="Pratitelji"
            value={ig.followers.toLocaleString("hr-HR")}
            change={igFollowersChange}
            sub={ig.newFollowers7d != null ? `${ig.newFollowers7d >= 0 ? "+" : ""}${ig.newFollowers7d.toLocaleString("hr-HR")} u 7 dana` : undefined}
          />
          <Stat label="Doseg (7 dana)" value={ig.reach7d != null ? ig.reach7d.toLocaleString("hr-HR") : "—"} change={igReachChange} />
          <Stat label="Novi (7 dana)" value={ig.newFollowers7d != null ? `${ig.newFollowers7d >= 0 ? "+" : ""}${ig.newFollowers7d.toLocaleString("hr-HR")}` : "—"} />
          <Stat label="Objava ukupno" value={ig.mediaCount != null ? ig.mediaCount.toLocaleString("hr-HR") : "—"} />
        </div>
      )}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <InstagramStatsPanel ig={ig} />
        <InstagramConnect isOwner={user?.role === "OWNER"} />
      </div>
      <p className="mt-5 text-[12px] text-[var(--a-text-3)]">
        Dresove objavljuješ jednim klikom sa stranice <b className="text-[var(--a-text-2)]">Proizvodi</b> — gumb „📸 Objavi na IG&quot; na kartici proizvoda.
      </p>
    </>
  );

  return (
    <AdminShell title="Analitika" subtitle="Prodaja, Google i Instagram">
      <AnalyticsTabs initialTab={initialTab} prodaja={prodaja} google={<GaStatsPanel ga={ga} />} instagram={instagram} />
    </AdminShell>
  );
}
