"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Search } from "lucide-react";

type OrderHit = { customerName: string; phone: string; reference: string; date: string; total: number; status: string };
type ProductHit = { slug: string; klub: string; igrac: string; liga: string };
type Flat =
  | { kind: "order"; hit: OrderHit }
  | { kind: "product"; hit: ProductHit };

const STATUS_HR: Record<string, string> = {
  new: "Nova", shipped: "Poslana", done: "Završena", returned: "Vraćena", cancelled: "Otkazana"
};
const eur = (n: number) => `${(n ?? 0).toFixed(0)} €`;

// Globalno pretraživanje admina — otvara se s ⌘K / Ctrl+K.
export function CommandPalette() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [orders, setOrders] = useState<OrderHit[]>([]);
  const [products, setProducts] = useState<ProductHit[]>([]);
  const [loading, setLoading] = useState(false);
  const [active, setActive] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const reqId = useRef(0);

  // Otvori s ⌘K / Ctrl+K (i zatvori s istim).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((v) => !v);
      } else if (e.key === "Escape") {
        setOpen(false);
      }
    };
    const onOpen = () => setOpen(true);
    window.addEventListener("keydown", onKey);
    window.addEventListener("open-command-palette", onOpen);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("open-command-palette", onOpen);
    };
  }, []);

  useEffect(() => {
    if (open) {
      const id = setTimeout(() => inputRef.current?.focus(), 40);
      return () => clearTimeout(id);
    }
    setQ("");
    setOrders([]);
    setProducts([]);
    setActive(0);
  }, [open]);

  // Debounced pretraga na server.
  useEffect(() => {
    const term = q.trim();
    if (!term) { setOrders([]); setProducts([]); setLoading(false); return; }
    setLoading(true);
    const my = ++reqId.current;
    const id = setTimeout(async () => {
      try {
        const d = await fetch(`/api/admin/spotlight/?q=${encodeURIComponent(term)}`).then((r) => r.json());
        if (my !== reqId.current) return;
        setOrders(d?.ok ? d.orders : []);
        setProducts(d?.ok ? d.products : []);
        setActive(0);
      } catch {
        if (my === reqId.current) { setOrders([]); setProducts([]); }
      }
      if (my === reqId.current) setLoading(false);
    }, 180);
    return () => clearTimeout(id);
  }, [q]);

  const flat: Flat[] = [
    ...orders.map((hit) => ({ kind: "order" as const, hit })),
    ...products.map((hit) => ({ kind: "product" as const, hit }))
  ];

  const go = useCallback((item: Flat) => {
    setOpen(false);
    if (item.kind === "order") {
      // Otvori Narudžbe i filtriraj na kupca (telefon je najprecizniji).
      const term = item.hit.phone || item.hit.customerName;
      router.push(`/admin/narudzbe/?q=${encodeURIComponent(term)}`);
    } else {
      router.push(`/admin/proizvodi/?q=${encodeURIComponent(`${item.hit.klub} ${item.hit.igrac}`)}`);
    }
  }, [router]);

  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key === "ArrowDown") { e.preventDefault(); setActive((a) => Math.min(a + 1, flat.length - 1)); }
    else if (e.key === "ArrowUp") { e.preventDefault(); setActive((a) => Math.max(a - 1, 0)); }
    else if (e.key === "Enter" && flat[active]) { e.preventDefault(); go(flat[active]); }
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[90] flex items-start justify-center px-4 pt-[12vh]" role="dialog" aria-modal="true">
      <button type="button" aria-label="Zatvori" onClick={() => setOpen(false)} className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" />
      <div className="relative w-full max-w-xl overflow-hidden rounded-2xl border border-[var(--a-line)] bg-[var(--a-card)] shadow-2xl">
        <div className="flex items-center gap-2.5 border-b border-black/[0.04] px-4">
          <Search className="h-4 w-4 shrink-0 text-[var(--a-text-3)]" />
          <input
            ref={inputRef}
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder="Traži kupca, telefon, broj narudžbe ili proizvod…"
            className="h-12 w-full bg-transparent text-sm text-[var(--a-text)] outline-none placeholder:text-[var(--a-text-3)]"
          />
          <kbd className="shrink-0 rounded border border-[var(--a-line)] px-1.5 py-0.5 text-[10px] font-semibold text-[var(--a-text-3)]">ESC</kbd>
        </div>

        <div className="max-h-[52vh] overflow-y-auto py-1.5">
          {!q.trim() ? (
            <p className="px-4 py-6 text-center text-xs text-[var(--a-text-3)]">Upiši pojam — npr. ime kupca, „0915…”, „DRS-…” ili „Yamal”.</p>
          ) : loading ? (
            <p className="px-4 py-6 text-center text-xs text-[var(--a-text-3)]">Tražim…</p>
          ) : flat.length === 0 ? (
            <p className="px-4 py-6 text-center text-xs text-[var(--a-text-3)]">Nema rezultata.</p>
          ) : (
            <>
              {orders.length > 0 && (
                <div className="px-2 pb-1">
                  <div className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-[var(--a-text-3)]">Narudžbe</div>
                  {orders.map((o, i) => {
                    const idx = i;
                    return (
                      <button
                        key={`${o.reference}-${i}`}
                        type="button"
                        onMouseEnter={() => setActive(idx)}
                        onClick={() => go({ kind: "order", hit: o })}
                        className={`flex w-full items-center justify-between gap-3 rounded-[12px] px-2 py-2 text-left ${active === idx ? "bg-[var(--a-surface-2)]" : "hover:bg-[var(--a-surface-2)]"}`}
                      >
                        <span className="min-w-0">
                          <span className="block truncate text-sm font-medium text-[var(--a-text)]">{o.customerName}</span>
                          <span className="block truncate text-[11px] text-[var(--a-text-3)]">{o.reference} · {o.date} · {STATUS_HR[o.status] || o.status}</span>
                        </span>
                        <span className="shrink-0 text-xs font-semibold text-[var(--a-text-2)]">{eur(o.total)}</span>
                      </button>
                    );
                  })}
                </div>
              )}
              {products.length > 0 && (
                <div className="px-2 pt-1">
                  <div className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-[var(--a-text-3)]">Proizvodi</div>
                  {products.map((p, i) => {
                    const idx = orders.length + i;
                    return (
                      <button
                        key={p.slug}
                        type="button"
                        onMouseEnter={() => setActive(idx)}
                        onClick={() => go({ kind: "product", hit: p })}
                        className={`flex w-full items-center justify-between gap-3 rounded-[12px] px-2 py-2 text-left ${active === idx ? "bg-[var(--a-surface-2)]" : "hover:bg-[var(--a-surface-2)]"}`}
                      >
                        <span className="min-w-0">
                          <span className="block truncate text-sm font-medium text-[var(--a-text)]">{p.klub} — {p.igrac}</span>
                          <span className="block truncate text-[11px] text-[var(--a-text-3)]">{p.liga}</span>
                        </span>
                        <span className="shrink-0 text-[11px] text-[var(--a-text-3)]">otvori →</span>
                      </button>
                    );
                  })}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
