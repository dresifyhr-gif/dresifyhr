import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { isAdmin } from "@/lib/admin-auth";
import { getDashboardMetrics } from "@/lib/admin-metrics";
import { AdminShell } from "@/components/admin/admin-shell";
import { ShippingQueue } from "@/components/admin/shipping-queue";
import { Panel, eur } from "@/components/admin/ui";
import { formatCroatianName } from "@/lib/utils";

export const metadata: Metadata = { title: "Za slanje — Dresify Admin", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

export default async function ShippingPage() {
  if (!(await isAdmin())) redirect("/admin/login/");

  const m = await getDashboardMetrics();

  return (
    <AdminShell title="Za slanje">
      <Panel title={`Red za slanje (${m.pending.length}) · ${eur(m.pendingTotal)}`}>
        <ShippingQueue
          orders={m.pending.map((o) => ({
            id: o.id,
            dateLabel: o.createdAt.toLocaleDateString("hr-HR"),
            customerName: formatCroatianName(o.customerName),
            itemCount: o.itemCount,
            total: o.total
          }))}
        />
      </Panel>

      {m.returnedCount > 0 && (
        <div className="mt-5">
          <Panel title={`Vraćene pošiljke · ${m.returnedCount} (${eur(m.returnedTotal)})`}>
            <ul className="space-y-2">
              {m.returned.slice(0, 20).map((o) => (
                <li key={o.id} className="flex items-center justify-between text-sm">
                  <span className="text-slate-700">
                    <span className="text-slate-400">{o.createdAt.toLocaleDateString("hr-HR")}</span> · {formatCroatianName(o.customerName)}
                  </span>
                  <span className="font-semibold text-red-500">{eur(o.total)}</span>
                </li>
              ))}
            </ul>
          </Panel>
        </div>
      )}
    </AdminShell>
  );
}
