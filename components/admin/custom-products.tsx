"use client";

import Image from "next/image";
import { useEffect, useState } from "react";

import { ImageUploader } from "@/components/admin/image-uploader";

type Custom = {
  id: string;
  slug: string;
  klub: string;
  igrac: string;
  liga: string;
  price: number;
  retro: boolean;
  badge: string | null;
  description: string | null;
  images: string[];
  hidden: boolean;
};

const LIGE = ["Reprezentacija", "La Liga", "Premier Liga", "Serie A", "Bundesliga", "Ligue 1", "Saudi Pro", "Brazil", "MLS", "Komplet"];
const empty = { id: "", klub: "", igrac: "", liga: "Reprezentacija", price: "20", retro: false, badge: "", description: "", images: [] as string[] };

export function CustomProducts() {
  const [list, setList] = useState<Custom[]>([]);
  const [open, setOpen] = useState(false);
  const [f, setF] = useState({ ...empty });
  const [saving, setSaving] = useState(false);

  async function load() {
    const d = await fetch("/api/admin/custom-products/").then((r) => r.json()).catch(() => null);
    if (d?.ok) setList(d.products);
  }
  useEffect(() => { load(); }, []);

  function edit(p: Custom) {
    setF({ id: p.id, klub: p.klub, igrac: p.igrac, liga: p.liga, price: String(p.price), retro: p.retro, badge: p.badge || "", description: p.description || "", images: p.images });
    setOpen(true);
  }

  async function save() {
    if (saving || !f.klub.trim() || !f.igrac.trim()) return;
    setSaving(true);
    await fetch("/api/admin/custom-products/", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...f, price: Number(f.price.replace(",", ".")) || 20 })
    }).catch(() => {});
    setSaving(false);
    setF({ ...empty });
    setOpen(false);
    load();
  }

  async function remove(id: string) {
    if (typeof window !== "undefined" && !window.confirm("Obrisati ovaj dres?")) return;
    await fetch(`/api/admin/custom-products/?id=${id}`, { method: "DELETE" }).catch(() => {});
    load();
  }

  return (
    <div className="mb-5 rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-sm font-bold text-slate-900">Novi dresovi (dodani iz admina)</div>
          <div className="text-xs text-slate-400">{list.length} dodano · dodaj dres sa slikama bez koda</div>
        </div>
        <button
          type="button"
          onClick={() => { setF({ ...empty }); setOpen((v) => !v); }}
          className="rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-slate-800"
        >
          {open ? "Zatvori" : "➕ Dodaj dres"}
        </button>
      </div>

      {open && (
        <div className="mt-4 space-y-3 rounded-lg border border-slate-200 bg-slate-50/60 p-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="text-xs font-medium text-slate-500">Klub / reprezentacija
              <input value={f.klub} onChange={(e) => setF({ ...f, klub: e.target.value })} placeholder="npr. Hrvatska" className="mt-1 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-slate-400" />
            </label>
            <label className="text-xs font-medium text-slate-500">Igrač / naziv
              <input value={f.igrac} onChange={(e) => setF({ ...f, igrac: e.target.value })} placeholder="npr. Modrić nr10 — 2026" className="mt-1 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-slate-400" />
            </label>
            <label className="text-xs font-medium text-slate-500">Liga
              <select value={f.liga} onChange={(e) => setF({ ...f, liga: e.target.value })} className="mt-1 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none focus:border-slate-400">
                {LIGE.map((l) => <option key={l} value={l}>{l}</option>)}
              </select>
            </label>
            <label className="text-xs font-medium text-slate-500">Cijena (€)
              <input value={f.price} onChange={(e) => setF({ ...f, price: e.target.value })} inputMode="decimal" className="mt-1 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-slate-400" />
            </label>
          </div>

          <div className="flex items-center gap-4 text-xs text-slate-600">
            <label className="flex items-center gap-1.5"><input type="checkbox" checked={f.retro} onChange={(e) => setF({ ...f, retro: e.target.checked })} /> Retro</label>
            <label className="flex items-center gap-1.5">Badge:
              <select value={f.badge} onChange={(e) => setF({ ...f, badge: e.target.value })} className="rounded border border-slate-200 bg-white px-2 py-1">
                <option value="">Bez</option>
                <option value="bestseller">⭐ Bestseller</option>
                <option value="novo">🆕 Novo</option>
              </select>
            </label>
          </div>

          <label className="block text-xs font-medium text-slate-500">Opis (svaki red = odlomak)
            <textarea value={f.description} onChange={(e) => setF({ ...f, description: e.target.value })} rows={4} className="mt-1 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-[13px] leading-6 text-slate-900 outline-none focus:border-slate-400" />
          </label>

          <div>
            <div className="mb-1 text-xs font-medium text-slate-500">Slike</div>
            <ImageUploader value={f.images} onChange={(images) => setF({ ...f, images })} slug={f.klub && f.igrac ? "custom" : undefined} />
          </div>

          <button type="button" onClick={save} disabled={saving || !f.klub.trim() || !f.igrac.trim()} className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:opacity-40">
            {saving ? "Spremam…" : f.id ? "Spremi izmjene" : "Spremi dres"}
          </button>
        </div>
      )}

      {list.length > 0 && (
        <ul className="mt-4 space-y-2">
          {list.map((p) => (
            <li key={p.id} className="flex items-center justify-between gap-3 rounded-lg border border-slate-100 p-2 text-sm">
              <span className="flex min-w-0 items-center gap-2">
                <span className="relative h-10 w-10 shrink-0 overflow-hidden rounded bg-slate-100">
                  {p.images[0] && <Image src={p.images[0]} alt="" fill sizes="40px" className="object-cover" />}
                </span>
                <span className="min-w-0">
                  <span className="block truncate font-medium text-slate-800">{p.klub} — {p.igrac}</span>
                  <span className="text-[11px] text-slate-400">{p.liga} · {p.price} € · {p.images.length} slika{p.hidden ? " · skriveno" : ""}</span>
                </span>
              </span>
              <span className="flex shrink-0 gap-1.5">
                <a href={`/dres/${p.slug}`} target="_blank" rel="noopener noreferrer" className="rounded-md border border-slate-200 px-2 py-1 text-[11px] text-slate-500 hover:text-slate-800">Vidi</a>
                <button type="button" onClick={() => edit(p)} className="rounded-md border border-slate-200 px-2 py-1 text-[11px] text-slate-600 hover:bg-slate-50">Uredi</button>
                <button type="button" onClick={() => remove(p.id)} className="rounded-md border border-red-200 px-2 py-1 text-[11px] text-red-500 hover:bg-red-50">Obriši</button>
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
