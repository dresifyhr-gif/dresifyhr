"use client";

import { useEffect, useMemo, useState } from "react";

type Product = {
  slug: string;
  klub: string;
  igrac: string;
  liga: string;
  price: number;
  outOfStock: string;
  soldOutSizes: string[];
  hidden: boolean;
  badge: string;
  overridden: boolean;
};

const BADGE_OPTIONS = [
  { value: "", label: "Bez oznake" },
  { value: "bestseller", label: "⭐ Bestseller" },
  { value: "novo", label: "🆕 Novo" }
];

const STOCK_OPTIONS = [
  { value: "", label: "Na stanju" },
  { value: "adults", label: "Nema odrasle" },
  { value: "kids", label: "Nema dječje" },
  { value: "all", label: "Rasprodano" }
];

function ProductRow({ p, sizes }: { p: Product; sizes: string[] }) {
  const [price, setPrice] = useState(String(p.price));
  const [oos, setOos] = useState(p.outOfStock);
  const [soldSizes, setSoldSizes] = useState<string[]>(p.soldOutSizes);
  const [hidden, setHidden] = useState(p.hidden);
  const [badge, setBadge] = useState(p.badge);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const dirty = price !== String(p.price) || oos !== p.outOfStock || soldSizes.join(",") !== p.soldOutSizes.join(",") || hidden !== p.hidden || badge !== p.badge;

  function toggleSize(s: string) {
    setSoldSizes((cur) => (cur.includes(s) ? cur.filter((x) => x !== s) : [...cur, s]));
  }

  async function save() {
    if (saving) return;
    setSaving(true);
    setSaved(false);
    await fetch("/api/admin/products/", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ slug: p.slug, price: price === "" ? null : Number(price.replace(",", ".")), outOfStock: oos, soldOutSizes: soldSizes, hidden, badge })
    }).catch(() => {});
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 1500);
  }

  return (
    <div className="rounded-lg border border-slate-200 p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="min-w-0">
          <div className="font-semibold text-slate-900">{p.klub} — {p.igrac}</div>
          <div className="text-[11px] text-slate-400">{p.liga}{p.overridden ? " · uređeno" : ""}</div>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1">
            <input
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              inputMode="decimal"
              className="w-16 rounded-md border border-slate-200 bg-slate-50 px-2 py-1 text-sm text-slate-900 outline-none focus:border-slate-400 focus:bg-white"
            />
            <span className="text-xs text-slate-400">€</span>
          </div>
          <select
            value={oos}
            onChange={(e) => setOos(e.target.value)}
            className="rounded-md border border-slate-200 bg-slate-50 px-2 py-1 text-sm text-slate-700 outline-none focus:border-slate-400"
          >
            {STOCK_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
          <select
            value={badge}
            onChange={(e) => setBadge(e.target.value)}
            className="rounded-md border border-slate-200 bg-slate-50 px-2 py-1 text-sm text-slate-700 outline-none focus:border-slate-400"
          >
            {BADGE_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
          <button
            type="button"
            onClick={() => setHidden((v) => !v)}
            title={hidden ? "Skriveno sa shopa — klikni da prikažeš" : "Prikazano — klikni da sakriješ"}
            className={`rounded-md px-2 py-1 text-[11px] font-semibold transition ${hidden ? "bg-amber-500 text-white hover:bg-amber-600" : "border border-slate-200 text-slate-500 hover:bg-slate-50"}`}
          >
            {hidden ? "🙈 Skriveno" : "👁 Vidljivo"}
          </button>
          <button
            type="button"
            onClick={save}
            disabled={saving || !dirty}
            className="rounded-md bg-slate-900 px-3 py-1 text-[11px] font-semibold text-white transition hover:bg-slate-800 disabled:opacity-40"
          >
            {saving ? "…" : saved ? "✓" : "Spremi"}
          </button>
        </div>
      </div>

      <div className="mt-2 flex flex-wrap items-center gap-1">
        <span className="mr-1 text-[11px] text-slate-400">Rasprodane veličine:</span>
        {sizes.map((s) => {
          const on = soldSizes.includes(s);
          return (
            <button
              key={s}
              type="button"
              onClick={() => toggleSize(s)}
              className={`rounded px-1.5 py-0.5 text-[11px] font-medium transition ${on ? "bg-red-500 text-white" : "border border-slate-200 text-slate-500 hover:bg-slate-50"}`}
            >
              {s}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export function ProductsManager() {
  const [products, setProducts] = useState<Product[]>([]);
  const [sizes, setSizes] = useState<string[]>([]);
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/admin/products/")
      .then((r) => r.json())
      .then((d) => {
        if (d?.ok) {
          setProducts(d.products);
          setSizes(d.sizes);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(() => {
    const nq = q.trim().toLowerCase();
    if (!nq) return products;
    return products.filter((p) => `${p.klub} ${p.igrac} ${p.liga}`.toLowerCase().includes(nq));
  }, [q, products]);

  return (
    <div>
      <div className="mb-4 flex items-center gap-3">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Traži dres (klub, igrač, liga)…"
          className="flex-1 rounded-lg border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm text-slate-900 outline-none focus:border-slate-400 focus:bg-white"
        />
        <span className="shrink-0 text-xs text-slate-400">{loading ? "…" : `${filtered.length} dresova`}</span>
      </div>
      {loading ? (
        <div className="py-8 text-center text-sm text-slate-400">Učitavam…</div>
      ) : (
        <div className="space-y-2">
          {filtered.map((p) => <ProductRow key={p.slug} p={p} sizes={sizes} />)}
        </div>
      )}
    </div>
  );
}
