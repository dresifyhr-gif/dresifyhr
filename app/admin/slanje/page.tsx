import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { isAdmin } from "@/lib/admin-auth";
import { getDashboardMetrics } from "@/lib/admin-metrics";
import { prisma } from "@/lib/prisma";
import { AdminShell } from "@/components/admin/admin-shell";
import { ShippingQueue } from "@/components/admin/shipping-queue";
import { Panel, eur, waLinkText } from "@/components/admin/ui";
import { formatCroatianName, repairText } from "@/lib/utils";

export const metadata: Metadata = { title: "Za slanje — Dresify Admin", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

const DAY = 86_400_000;
const OLD_DAYS = 14; // narudžbe starije od ovoliko dana koje još nisu poslane

function apologyMessage(name: string, product: string) {
  return `Pozdrav ${name} 👋\n\nJavljamo se iz Dresify shopa. Iskreno se ispričavamo — zbog velike gužve na početku nažalost nismo uspjeli poslati tvoju narudžbu (${product}).\n\nAko si i dalje zainteresiran/a, rado ćemo ti je poslati odmah. Samo nam javi! 🙏`;
}

export default async function ShippingPage() {
  if (!(await isAdmin())) redirect("/admin/login/");

  const m = await getDashboardMetrics();

  const oldUnshipped = await prisma.order.findMany({
    where: { status: "new", createdAt: { lt: new Date(Date.now() - OLD_DAYS * DAY) } },
    orderBy: { createdAt: "asc" },
    select: {
      id: true,
      createdAt: true,
      customerName: true,
      phone: true,
      total: true,
      items: { select: { klub: true, igrac: true }, take: 3 }
    }
  });

  const oldRows = oldUnshipped.map((o) => {
    const name = formatCroatianName(o.customerName);
    const products = o.items.map((it) => repairText([it.klub, String(it.igrac || "").split("—")[0].trim()].filter(Boolean).join(" ")));
    const product = products.slice(0, 2).join(", ") + (o.items.length > 2 ? " i još…" : "");
    return {
      id: o.id,
      name,
      dateLabel: o.createdAt.toLocaleDateString("hr-HR"),
      total: o.total,
      product: product || "dres",
      wa: waLinkText(o.phone, apologyMessage(name, product || "dres"))
    };
  });

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
          <Panel title={`Stare neposlane (${OLD_DAYS}+ dana) — javi se kupcima (${oldRows.length})`}>
            <p className="mb-3 -mt-2 text-xs text-slate-400">
              Prošlo je dosta od narudžbe, a nije poslana. Klikni „WhatsApp isprika” — poruka je već napisana, samo pošalji (možeš je urediti prije slanja).
            </p>
            <ul className="space-y-2">
              {oldRows.map((o) => (
                <li key={o.id} className="flex items-center justify-between gap-2 rounded-lg border border-slate-100 px-2.5 py-2 text-sm">
                  <span className="min-w-0 truncate text-slate-700">
                    <span className="text-slate-400">{o.dateLabel}</span> · {o.name}{" "}
                    <span className="text-slate-400">· {o.product} · {eur(o.total)}</span>
                  </span>
                  {o.wa ? (
                    <a
                      href={o.wa}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="shrink-0 rounded-md bg-emerald-500 px-2.5 py-1 text-[11px] font-semibold text-white hover:bg-emerald-600"
                    >
                      WhatsApp isprika
                    </a>
                  ) : (
                    <span className="shrink-0 text-[11px] text-slate-300">nema broja</span>
                  )}
                </li>
              ))}
            </ul>
          </Panel>
        </div>
      )}

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
