"use client";

import { useCallback, useEffect, useRef, useState } from "react";

const eur = (n: number) => `${(n ?? 0).toFixed(2).replace(".", ",")} €`;

type Order = {
  id: string;
  date: string;
  reference: string;
  customerName: string;
  phone: string;
  address: string;
  itemCount: number;
  total: number;
  status: string;
  shippedBy: string | null;
};

const STATUS: Record<string, { label: string; cls: string }> = {
  new: { label: "čeka slanje", cls: "bg-amber-100 text-amber-700" },
  shipped: { label: "poslano", cls: "bg-emerald-100 text-emerald-700" },
  done: { label: "gotovo", cls: "bg-emerald-100 text-emerald-700" },
  returned: { label: "vraćeno", cls: "bg-red-100 text-red-700" },
  cancelled: { label: "otkazano", cls: "bg-slate-200 text-slate-600" }
};

export function OrdersManager() {
  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);
  const [data, setData] = useState<{ orders: Order[]; total: number; pages: number }>({ orders: [], total: 0, pages: 1 });
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const debounce = useRef<ReturnType<typeof setTimeout>>();

  const load = useCallback(async (query: string, p: number) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/orders/search/?q=${encodeURIComponent(query)}&page=${p}`);
      const d = await res.json();
      if (d?.ok) setData({ orders: d.orders, total: d.total, pages: d.pages });
    } catch {
      /* ignore */
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    load("", 1);
  }, [load]);

  // debounce search
  useEffect(() => {
    clearTimeout(debounce.current);
    debounce.current = setTimeout(() => {
      setPage(1);
      load(q, 1);
    }, 300);
    return () => clearTimeout(debounce.current);
  }, [q, load]);

  async function act(id: string, endpoint: string, body: object) {
    if (busy) return;
    setBusy(id);
    await fetch(`/api/admin/orders/${id}/${endpoint}/`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body)
    }).catch(() => {});
    await load(q, page);
    setBusy(null);
  }

  function go(p: number) {
    const np = Math.min(data.pages, Math.max(1, p));
    setPage(np);
    load(q, np);
  }

  return (
    <div>
      <div className="mb-4 flex items-center gap-3">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Traži po imenu, broju mobitela ili adresi…"
          className="flex-1 rounded-lg border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm text-slate-900 outline-none transition focus:border-slate-400 focus:bg-white"
        />
        <span className="shrink-0 text-xs text-slate-400">{loading ? "…" : `${data.total} narudžbi`}</span>
      </div>

      {data.orders.length === 0 ? (
        <div className="py-8 text-center text-sm text-slate-400">{loading ? "Učitavam…" : "Nema rezultata."}</div>
      ) : (
        <div className="space-y-2">
          {data.orders.map((o) => {
            const st = STATUS[o.status] || { label: o.status, cls: "bg-slate-100 text-slate-500" };
            const isBusy = busy === o.id;
            return (
              <div key={o.id} className="rounded-lg border border-slate-100 p-3">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-slate-900">{o.customerName}</span>
                      <span className={`rounded px-1.5 py-0.5 text-[10px] font-semibold ${st.cls}`}>{st.label}</span>
                      {o.shippedBy && <span className="text-[10px] text-slate-400">({o.shippedBy})</span>}
                    </div>
                    <div className="mt-0.5 text-xs text-slate-500">
                      {o.date} · {o.phone}
                      {o.address ? ` · ${o.address}` : ""}
                    </div>
                    <div className="mt-0.5 text-xs text-slate-400">#{o.reference} · {o.itemCount} kom · <span className="font-semibold text-slate-700">{eur(o.total)}</span></div>
                  </div>
                  <a
                    href={`/admin/print/${o.id}/`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="shrink-0 rounded-md border border-slate-200 px-2 py-1 text-[11px] font-medium text-slate-500 hover:text-slate-800"
                  >
                    🖨 Naljepnica
                  </a>
                </div>

                <div className="mt-2.5 flex flex-wrap gap-1.5">
                  <button type="button" disabled={isBusy} onClick={() => act(o.id, "ship", { shipped: true, by: "igor" })}
                    className="rounded-md bg-emerald-500 px-2 py-1 text-[11px] font-semibold text-white hover:bg-emerald-600 disabled:opacity-50">✓ Igor poslao</button>
                  <button type="button" disabled={isBusy} onClick={() => act(o.id, "ship", { shipped: true, by: "ivica" })}
                    className="rounded-md bg-sky-500 px-2 py-1 text-[11px] font-semibold text-white hover:bg-sky-600 disabled:opacity-50">✓ Ivica poslao</button>
                  <button type="button" disabled={isBusy} onClick={() => act(o.id, "return", { returned: true })}
                    className="rounded-md border border-red-200 px-2 py-1 text-[11px] font-medium text-red-500 hover:bg-red-50 disabled:opacity-50">↩ Vraćeno</button>
                  <button type="button" disabled={isBusy} onClick={() => act(o.id, "cancel", { cancelled: true })}
                    className="rounded-md border border-slate-200 px-2 py-1 text-[11px] font-medium text-slate-500 hover:bg-slate-50 disabled:opacity-50">✕ Otkazano</button>
                  <button type="button" disabled={isBusy} onClick={() => act(o.id, "ship", { shipped: false })}
                    className="rounded-md border border-slate-200 px-2 py-1 text-[11px] font-medium text-slate-400 hover:bg-slate-50 disabled:opacity-50">↺ Vrati u nove</button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {data.pages > 1 && (
        <div className="mt-4 flex items-center justify-center gap-3 text-sm">
          <button type="button" onClick={() => go(page - 1)} disabled={page <= 1}
            className="rounded-md border border-slate-200 px-3 py-1.5 text-slate-600 disabled:opacity-40">← Prethodna</button>
          <span className="text-slate-500">{page} / {data.pages}</span>
          <button type="button" onClick={() => go(page + 1)} disabled={page >= data.pages}
            className="rounded-md border border-slate-200 px-3 py-1.5 text-slate-600 disabled:opacity-40">Sljedeća →</button>
        </div>
      )}
    </div>
  );
}
