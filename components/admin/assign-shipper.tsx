"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

const eur = (n: number) => `${(n ?? 0).toFixed(2).replace(".", ",")} €`;

export type UnassignedOrder = {
  id: string;
  dateLabel: string;
  customerName: string;
  total: number;
};

// Lists shipped orders with no shipper tagged and lets you assign Igor/Ivica,
// so the profit split counts them correctly.
export function AssignShipper({ orders }: { orders: UnassignedOrder[] }) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [done, setDone] = useState<Set<string>>(new Set());

  async function assign(id: string, by: "igor" | "ivica") {
    if (busy) return;
    setBusy(id);
    await fetch(`/api/admin/orders/${id}/ship/`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ shipped: true, by })
    }).catch(() => {});
    setDone((s) => new Set(s).add(id));
    setBusy(null);
    router.refresh();
  }

  const remaining = orders.filter((o) => !done.has(o.id));
  if (remaining.length === 0) {
    return <div className="text-sm text-[var(--a-text-3)]">Sve poslane narudžbe imaju označenog pošiljatelja ✅</div>;
  }

  return (
    <ul className="max-h-96 space-y-2 overflow-y-auto">
      {remaining.map((o) => (
        <li key={o.id} className="flex items-center justify-between gap-2 rounded-[12px] border border-black/[0.04] px-2.5 py-2 text-sm">
          <span className="min-w-0 truncate text-[var(--a-text)]">
            <span className="text-[var(--a-text-3)]">{o.dateLabel}</span> · {o.customerName}{" "}
            <span className="text-[var(--a-text-3)]">· {eur(o.total)}</span>
          </span>
          <span className="flex shrink-0 items-center gap-1.5">
            <button
              type="button"
              onClick={() => assign(o.id, "igor")}
              disabled={busy === o.id}
              className="rounded-[10px] bg-emerald-500 px-2.5 py-1 text-[11px] font-semibold text-white hover:bg-emerald-600 disabled:opacity-50"
            >
              {busy === o.id ? "…" : "Igor"}
            </button>
            <button
              type="button"
              onClick={() => assign(o.id, "ivica")}
              disabled={busy === o.id}
              className="rounded-[10px] bg-sky-500 px-2.5 py-1 text-[11px] font-semibold text-white hover:bg-sky-600 disabled:opacity-50"
            >
              {busy === o.id ? "…" : "Ivica"}
            </button>
          </span>
        </li>
      ))}
    </ul>
  );
}
