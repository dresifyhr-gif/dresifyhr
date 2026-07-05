import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { isAdmin } from "@/lib/admin-auth";
import { getDashboardMetrics } from "@/lib/admin-metrics";
import { getOldUnshipped, OLD_UNSHIPPED_DAYS } from "@/lib/admin-winback";
import { AdminShell } from "@/components/admin/admin-shell";
import { ShippingQueue } from "@/components/admin/shipping-queue";
import { ApologyList } from "@/components/admin/apology-list";
import { ReturnedList } from "@/components/admin/winback-panels";
import { Panel, eur } from "@/components/admin/ui";
import { formatCroatianName, repairText } from "@/lib/utils";

export const metadata: Metadata = { title: "Za slanje — Dresify Admin", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

export default async function ShippingPage() {
  if (!(await isAdmin())) redirect("/admin/login/");

  const m = await getDashboardMetrics();
  const oldRows = await getOldUnshipped();

  return (
    <AdminShell title="Za slanje" subtitle="Narudžbe koje čekaju da ih pošalješ">
      <Panel title={`Red za slanje (${m.pendingCount}) · ${eur(m.pendingTotal)}`}>
        <ShippingQueue
          orders={m.pending.map((o) => ({
            id: o.id,
            dateLabel: o.createdAt.toLocaleDateString("hr-HR"),
            customerName: formatCroatianName(o.customerName),
            itemCount: o.itemCount,
            total: o.total,
            items: o.items.map((it) => ({
              label: repairText([it.klub, it.igrac].filter(Boolean).join(" — ")),
              size: it.size || "",
              quantity: it.quantity
            }))
          }))}
        />
      </Panel>

      {oldRows.length > 0 && (
        <div className="mt-5">
          <Panel title={`Stare neposlane (${OLD_UNSHIPPED_DAYS}+ dana) — javi se kupcima (${oldRows.length})`}>
            <ApologyList rows={oldRows} />
          </Panel>
        </div>
      )}

      {m.returnedCount > 0 && (
        <div className="mt-5">
          <Panel title={`Vraćene pošiljke · ${m.returnedCount} (${eur(m.returnedTotal)})`}>
            <ReturnedList items={m.returned} />
          </Panel>
        </div>
      )}
    </AdminShell>
  );
}
