"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

const eur = (n: number) => `${(n ?? 0).toFixed(2).replace(".", ",")} €`;

export type PendingOrder = {
  id: string;
  dateLabel: string;
  customerName: string;
  itemCount: number;
  total: number;
  items: { label: string; size: string; quantity: number }[];
};

export function ShippingQueue({ orders }: { orders: PendingOrder[] }) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [note, setNote] = useState<string | null>(null);

  async function markShipped(id: string, by: "igor" | "ivica") {
    if (busy) return;
    setBusy(id);
    await fetch(`/api/admin/orders/${id}/ship/`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ shipped: true, by })
    }).catch(() => {});
    setBusy(null);
    router.refresh();
  }

  async function cancelOrder(id: string) {
    if (busy) return;
    if (typeof window !== "undefined" && !window.confirm("Otkazati ovu narudžbu? Neće se poslati.")) return;
    setBusy(id);
    await fetch(`/api/admin/orders/${id}/cancel/`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ cancelled: true })
    }).catch(() => {});
    setBusy(null);
    router.refresh();
  }

  async function syncSheet() {
    if (syncing) return;
    setSyncing(true);
    setNote(null);
    try {
      const res = await fetch("/api/admin/sync-sheet/", { method: "POST" });
      const data = await res.json().catch(() => ({}));
      setNote(data?.note || `Uskladeno: ${data?.updated ?? 0} narudžbi označeno poslano iz Sheeta.`);
    } catch {
      setNote("Greška pri sinkronizaciji.");
    }
    setSyncing(false);
    router.refresh();
  }

  return (
    <div>
      <div className="mb-3 flex items-center justify-end">
        <button
          type="button"
          onClick={syncSheet}
          disabled={syncing}
          className="rounded-[12px] border border-black/[0.06] bg-white px-3 py-1.5 text-xs font-medium text-[#6e6e73] shadow-sm transition hover:text-[#1d1d1f] disabled:opacity-50"
        >
          {syncing ? "Sinkroniziram…" : "↻ Sinkroniziraj sa Sheetom"}
        </button>
      </div>

      {note && <div className="mb-3 rounded-[12px] bg-black/[0.06] px-3 py-2 text-xs text-[#6e6e73]">{note}</div>}

      {orders.length === 0 ? (
        <div className="text-sm text-[#8e8e93]">Sve poslano ✅</div>
      ) : (
        <ul className="max-h-96 space-y-2 overflow-y-auto">
          {orders.map((o) => (
            <li key={o.id} className="rounded-[12px] border border-black/[0.04] px-2.5 py-2 text-sm">
             <div className="flex items-center justify-between gap-2">
              <span className="min-w-0 truncate text-[#1d1d1f]">
                <span className="text-[#8e8e93]">{o.dateLabel}</span> · {o.customerName}{" "}
                <span className="text-[#8e8e93]">· {o.itemCount} kom · {eur(o.total)}</span>
              </span>
              <span className="flex shrink-0 items-center gap-1.5">
                <a
                  href={`/admin/print/${o.id}/`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="rounded-[10px] border border-black/[0.06] px-2 py-1 text-[11px] font-medium text-[#6e6e73] transition hover:text-[#1d1d1f]"
                  title="Isprintaj otpremnicu"
                >
                  🖨 Print
                </a>
                <button
                  type="button"
                  onClick={() => markShipped(o.id, "igor")}
                  disabled={busy === o.id}
                  className="rounded-[10px] bg-emerald-500 px-2 py-1 text-[11px] font-semibold text-white transition hover:bg-emerald-600 disabled:opacity-50"
                  title="Ja (Igor) sam poslao"
                >
                  {busy === o.id ? "…" : "✓ Ja"}
                </button>
                <button
                  type="button"
                  onClick={() => markShipped(o.id, "ivica")}
                  disabled={busy === o.id}
                  className="rounded-[10px] bg-sky-500 px-2 py-1 text-[11px] font-semibold text-white transition hover:bg-sky-600 disabled:opacity-50"
                  title="Ivica je poslao"
                >
                  {busy === o.id ? "…" : "✓ Ivica"}
                </button>
                <button
                  type="button"
                  onClick={() => cancelOrder(o.id)}
                  disabled={busy === o.id}
                  className="rounded-[10px] border border-black/[0.06] px-2 py-1 text-[11px] font-medium text-[#8e8e93] transition hover:border-red-300 hover:text-red-500 disabled:opacity-50"
                  title="Otkaži narudžbu (neće se poslati)"
                >
                  ✕
                </button>
              </span>
             </div>
             {o.items.length > 0 && (
               <ul className="mt-1.5 space-y-0.5 border-t border-black/[0.04] pt-1.5">
                 {o.items.map((it, idx) => (
                   <li key={idx} className="text-[13px] text-[#1d1d1f]">
                     📦 {it.quantity > 1 ? `${it.quantity}× ` : ""}<span className="font-medium">{it.label}</span>
                     {it.size ? <span className="text-[#6e6e73]"> · veličina {it.size}</span> : null}
                   </li>
                 ))}
               </ul>
             )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
