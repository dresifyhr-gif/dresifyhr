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
};

export function ShippingQueue({ orders }: { orders: PendingOrder[] }) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [note, setNote] = useState<string | null>(null);

  async function markShipped(id: string) {
    if (busy) return;
    setBusy(id);
    await fetch(`/api/admin/orders/${id}/ship/`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ shipped: true })
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
          className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-600 shadow-sm transition hover:text-slate-900 disabled:opacity-50"
        >
          {syncing ? "Sinkroniziram…" : "↻ Sinkroniziraj sa Sheetom"}
        </button>
      </div>

      {note && <div className="mb-3 rounded-lg bg-slate-100 px-3 py-2 text-xs text-slate-600">{note}</div>}

      {orders.length === 0 ? (
        <div className="text-sm text-slate-400">Sve poslano ✅</div>
      ) : (
        <ul className="max-h-96 space-y-2 overflow-y-auto">
          {orders.map((o) => (
            <li key={o.id} className="flex items-center justify-between gap-2 rounded-lg border border-slate-100 px-2.5 py-2 text-sm">
              <span className="min-w-0 truncate text-slate-700">
                <span className="text-slate-400">{o.dateLabel}</span> · {o.customerName}{" "}
                <span className="text-slate-400">· {o.itemCount} kom · {eur(o.total)}</span>
              </span>
              <span className="flex shrink-0 items-center gap-1.5">
                <a
                  href={`/admin/print/${o.id}/`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="rounded-md border border-slate-200 px-2 py-1 text-[11px] font-medium text-slate-500 transition hover:text-slate-800"
                  title="Isprintaj otpremnicu"
                >
                  🖨 Print
                </a>
                <button
                  type="button"
                  onClick={() => markShipped(o.id)}
                  disabled={busy === o.id}
                  className="rounded-md bg-emerald-500 px-2.5 py-1 text-[11px] font-semibold text-white transition hover:bg-emerald-600 disabled:opacity-50"
                >
                  {busy === o.id ? "…" : "✓ Poslano"}
                </button>
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
