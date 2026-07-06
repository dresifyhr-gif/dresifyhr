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
  tracking: string;
  items: { label: string; size: string; quantity: number }[];
};

function TrackingRow({ id, initial }: { id: string; initial: string }) {
  const [val, setVal] = useState(initial);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  async function save() {
    if (saving) return;
    setSaving(true);
    setSaved(false);
    await fetch(`/api/admin/orders/${id}/tracking/`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tracking: val })
    }).catch(() => {});
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 1500);
  }

  return (
    <div className="mt-2 flex items-center gap-2">
      <input
        value={val}
        onChange={(e) => setVal(e.target.value)}
        placeholder="Tracking / broj pošiljke"
        className="flex-1 rounded-md border border-slate-200 bg-slate-50 px-2.5 py-1 text-[12px] text-slate-900 outline-none focus:border-slate-400 focus:bg-white"
      />
      <button
        type="button"
        onClick={save}
        disabled={saving || val === initial}
        className="rounded-md border border-slate-200 px-2.5 py-1 text-[11px] font-medium text-slate-600 transition hover:bg-slate-50 disabled:opacity-40"
      >
        {saving ? "…" : saved ? "✓ spremljeno" : "Spremi"}
      </button>
      {val.trim() && (
        <a
          href="https://posiljka.posta.hr/en"
          target="_blank"
          rel="noopener noreferrer"
          className="shrink-0 rounded-md bg-slate-900 px-2.5 py-1 text-[11px] font-semibold text-white transition hover:bg-slate-800"
          title="Otvori praćenje pošiljke na Hrvatskoj pošti (zalijepi broj)"
        >
          🔗 Prati na Pošti
        </a>
      )}
    </div>
  );
}

const STATUS: Record<string, { label: string; cls: string }> = {
  new: { label: "čeka slanje", cls: "bg-amber-100 text-amber-700" },
  shipped: { label: "poslano", cls: "bg-emerald-100 text-emerald-700" },
  done: { label: "gotovo", cls: "bg-emerald-100 text-emerald-700" },
  returned: { label: "vraćeno", cls: "bg-red-100 text-red-700" },
  cancelled: { label: "otkazano", cls: "bg-slate-200 text-slate-600" }
};

const TABS = [
  { value: "", label: "Sve" },
  { value: "new", label: "Za slanje" },
  { value: "shipped", label: "Poslano" },
  { value: "returned", label: "Vraćeno" },
  { value: "cancelled", label: "Otkazano" }
];

export function OrdersManager() {
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("");
  const [orders, setOrders] = useState<Order[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const debounce = useRef<ReturnType<typeof setTimeout>>();
  const sentinel = useRef<HTMLDivElement>(null);
  const reqId = useRef(0);
  const statusRef = useRef("");
  statusRef.current = status;

  const fetchPage = useCallback(async (query: string, p: number, append: boolean) => {
    const my = ++reqId.current;
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/orders/search/?q=${encodeURIComponent(query)}&status=${statusRef.current}&page=${p}`);
      const d = await res.json();
      if (my !== reqId.current) return; // stale response, ignore
      if (d?.ok) {
        setOrders((prev) => (append ? [...prev, ...d.orders] : d.orders));
        setTotal(d.total);
        setPages(d.pages);
        setPage(p);
      }
    } catch {
      /* ignore */
    }
    if (my === reqId.current) setLoading(false);
  }, []);

  // initial + debounced search (resets list); also refetches when status tab changes
  useEffect(() => {
    clearTimeout(debounce.current);
    debounce.current = setTimeout(() => fetchPage(q, 1, false), 300);
    return () => clearTimeout(debounce.current);
  }, [q, status, fetchPage]);

  // infinite scroll
  useEffect(() => {
    const el = sentinel.current;
    if (!el) return;
    const io = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && !loading && page < pages) {
          fetchPage(q, page + 1, true);
        }
      },
      { rootMargin: "400px" }
    );
    io.observe(el);
    return () => io.disconnect();
  }, [q, page, pages, loading, fetchPage]);

  async function act(id: string, endpoint: string, body: object) {
    if (busy) return;
    setBusy(id);
    await fetch(`/api/admin/orders/${id}/${endpoint}/`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body)
    }).catch(() => {});
    // refresh current list in place (keeps scroll position, updated statuses)
    await fetchPage(q, 1, false);
    setBusy(null);
  }

  return (
    <div>
      <div className="mb-3 flex flex-wrap gap-1.5">
        {TABS.map((tb) => (
          <button
            key={tb.value}
            type="button"
            onClick={() => setStatus(tb.value)}
            className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${status === tb.value ? "bg-slate-900 text-white" : "border border-slate-200 text-slate-600 hover:bg-slate-50"}`}
          >
            {tb.label}
          </button>
        ))}
      </div>
      <div className="mb-4 flex items-center gap-3">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Traži po imenu, broju mobitela ili adresi…"
          className="flex-1 rounded-lg border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm text-slate-900 outline-none transition focus:border-slate-400 focus:bg-white"
        />
        <span className="shrink-0 text-xs text-slate-400">{total} narudžbi</span>
      </div>

      {orders.length === 0 ? (
        <div className="py-8 text-center text-sm text-slate-400">{loading ? "Učitavam…" : "Nema rezultata."}</div>
      ) : (
        <div className="grid gap-3 xl:grid-cols-2">
          {orders.map((o) => {
            const st = STATUS[o.status] || { label: o.status, cls: "bg-slate-100 text-slate-500" };
            const isBusy = busy === o.id;
            return (
              <div key={o.id} className="rounded-lg border border-slate-200 p-3">
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
                    {o.items.length > 0 && (
                      <ul className="mt-1.5 space-y-0.5">
                        {o.items.map((it, idx) => (
                          <li key={idx} className="text-[13px] text-slate-700">
                            📦 {it.quantity > 1 ? `${it.quantity}× ` : ""}<span className="font-medium">{it.label}</span>
                            {it.size ? <span className="text-slate-500"> · veličina {it.size}</span> : null}
                          </li>
                        ))}
                      </ul>
                    )}
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

                <TrackingRow id={o.id} initial={o.tracking} />
              </div>
            );
          })}
        </div>
      )}

      {/* infinite-scroll sentinel */}
      <div ref={sentinel} className="h-8" />
      {loading && orders.length > 0 && <div className="py-3 text-center text-xs text-slate-400">Učitavam još…</div>}
      {page >= pages && orders.length > 0 && <div className="py-3 text-center text-xs text-slate-300">— kraj popisa —</div>}
    </div>
  );
}
