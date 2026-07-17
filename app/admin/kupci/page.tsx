import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { isAdmin } from "@/lib/admin-auth";
import { getDashboardMetrics } from "@/lib/admin-metrics";
import { AdminShell } from "@/components/admin/admin-shell";
import { TestimonialsManager } from "@/components/admin/testimonials-manager";
import { Panel, eur, waLink } from "@/components/admin/ui";
import { formatCroatianName } from "@/lib/utils";

export const metadata: Metadata = { title: "Kupci — Dresify Admin", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

export default async function CustomersPage() {
  if (!(await isAdmin())) redirect("/admin/login/");

  const m = await getDashboardMetrics();

  return (
    <AdminShell title="Kupci" subtitle="Najbolji kupci i oni koje treba vratiti">
      <div className="mb-5">
        <TestimonialsManager />
      </div>
      <div className="grid gap-5 lg:grid-cols-2">
        <Panel title="Najbolji kupci">
          {m.bestCustomers.length === 0 ? (
            <div className="text-sm text-slate-400">Nema podataka još.</div>
          ) : (
            <ul className="space-y-2.5">
              {m.bestCustomers.map((c) => (
                <li key={c.id} className="flex items-center justify-between text-sm">
                  <span className="text-slate-700">
                    {c.name ? formatCroatianName(c.name) : c.phone || "—"} <span className="text-slate-400">· {c.totalOrders}×</span>
                  </span>
                  <span className="font-semibold text-emerald-600">{eur(c.totalSpent)}</span>
                </li>
              ))}
            </ul>
          )}
        </Panel>

        <Panel title={`Vrati kupce (30+ dana bez kupnje) · ${m.inactive.length}`}>
          {m.inactive.length === 0 ? (
            <div className="text-sm text-slate-400">Nema neaktivnih kupaca.</div>
          ) : (
            <ul className="max-h-96 space-y-2 overflow-y-auto">
              {m.inactive.map((c) => {
                const wa = waLink(c.phone);
                return (
                  <li key={c.id} className="flex items-center justify-between gap-2 text-sm">
                    <span className="min-w-0 truncate text-slate-700">
                      {c.name ? formatCroatianName(c.name) : c.phone || "—"} <span className="text-slate-400">· {c.lastOrderAt.toLocaleDateString("hr-HR")}</span>
                    </span>
                    <span className="flex shrink-0 items-center gap-2">
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

      <div className="mt-5">
        <Panel title={`Rizični kupci (odbili pouzeće) · ${m.riskyCustomers.length}`}>
          {m.riskyCustomers.length === 0 ? (
            <div className="text-sm text-slate-400">Nema rizičnih kupaca — svi uredno preuzimaju. 👌</div>
          ) : (
            <ul className="max-h-96 space-y-2 overflow-y-auto">
              {m.riskyCustomers.map((c, i) => {
                const wa = waLink(c.phone);
                return (
                  <li key={`${c.phone}-${i}`} className="flex items-center justify-between gap-2 text-sm">
                    <span className="min-w-0 truncate text-slate-700">
                      {c.name ? formatCroatianName(c.name) : c.phone || "—"}
                      {c.phone ? <span className="text-slate-400"> · {c.phone}</span> : null}
                    </span>
                    <span className="flex shrink-0 items-center gap-2">
                      <span className="rounded bg-red-100 px-2 py-0.5 text-[11px] font-bold text-red-700">{c.failed}× odbio</span>
                      {c.collected > 0 && <span className="text-[11px] text-emerald-600">{c.collected}× ok</span>}
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

      <div className="mt-5">
        <Panel title="Odakle kupci (top gradovi)">
          {m.topCities.length === 0 ? (
            <div className="text-sm text-slate-400">Nema podataka.</div>
          ) : (
            <ul className="grid gap-2 sm:grid-cols-2">
              {m.topCities.map((c) => (
                <li key={c.name} className="flex items-center justify-between text-sm">
                  <span className="text-slate-700">{c.name}</span>
                  <span className="text-slate-500">
                    <span className="font-semibold text-slate-900">{c.count}</span> · {eur(c.total)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>
    </AdminShell>
  );
}
