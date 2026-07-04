"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

const eur = (n: number) => `${(n ?? 0).toFixed(2).replace(".", ",")} €`;

export type RecentOrder = {
  id: string;
  dateLabel: string;
  customerName: string;
  itemCount: number;
  total: number;
  status: string;
};

export function RecentOrders({ orders }: { orders: RecentOrder[] }) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);

  async function toggleReturn(id: string, returned: boolean) {
    if (busy) return;
    setBusy(id);
    await fetch(`/api/admin/orders/${id}/return/`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ returned })
    }).catch(() => {});
    setBusy(null);
    router.refresh();
  }

  if (orders.length === 0) return <div className="text-sm text-slate-400">Još nema narudžbi u bazi.</div>;

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-[11px] uppercase tracking-wider text-slate-400">
            <th className="pb-2 pr-3 font-semibold">Datum</th>
            <th className="pb-2 pr-3 font-semibold">Kupac</th>
            <th className="pb-2 pr-3 font-semibold">Kom</th>
            <th className="pb-2 pr-3 font-semibold">Ukupno</th>
            <th className="pb-2 font-semibold"></th>
          </tr>
        </thead>
        <tbody>
          {orders.map((o) => {
            const isReturned = o.status === "returned";
            return (
              <tr key={o.id} className={`border-t border-slate-100 ${isReturned ? "bg-red-50/50" : ""}`}>
                <td className="py-2 pr-3 text-slate-400">{o.dateLabel}</td>
                <td className="py-2 pr-3 text-slate-700">
                  {o.customerName}
                  {isReturned && <span className="ml-1.5 rounded bg-red-100 px-1.5 py-0.5 text-[10px] font-semibold text-red-600">vraćeno</span>}
                </td>
                <td className="py-2 pr-3 text-slate-500">{o.itemCount}</td>
                <td className="py-2 pr-3 font-semibold text-slate-900">{eur(o.total)}</td>
                <td className="py-2">
                  <div className="flex items-center justify-end gap-2">
                    <a href={`/admin/print/${o.id}/`} target="_blank" rel="noopener noreferrer" className="text-xs font-medium text-slate-400 hover:text-slate-800">🖨 Naljepnica</a>
                    <button
                      type="button"
                      onClick={() => toggleReturn(o.id, !isReturned)}
                      disabled={busy === o.id}
                      className={`text-xs font-medium disabled:opacity-50 ${isReturned ? "text-emerald-500 hover:text-emerald-700" : "text-red-400 hover:text-red-600"}`}
                    >
                      {busy === o.id ? "…" : isReturned ? "↺ vrati" : "↩ vraćeno"}
                    </button>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
