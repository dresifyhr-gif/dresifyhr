"use client";

import Image from "next/image";
import { useEffect, useState } from "react";

import { BulkAdd } from "@/components/admin/bulk-add";
import { ImageUploader } from "@/components/admin/image-uploader";

type Custom = {
  id: string;
  slug: string;
  category: string;
  klub: string;
  igrac: string;
  liga: string;
  price: number;
  retro: boolean;
  vel?: string;
  badge: string | null;
  description: string | null;
  images: string[];
  hidden: boolean;
};

const LIGE = ["Reprezentacija", "La Liga", "Premier Liga", "Serie A", "Bundesliga", "Ligue 1", "Saudi Pro", "Brazil", "MLS", "Komplet"];
// Veličine: sastavi "Odrasli" / "Djeca" dio (getJerseySizeOptions gleda ove ključne riječi u vel).
const buildVel = (adults: boolean, kids: boolean) =>
  [kids ? "Djeca: 104-176" : "", adults ? "Odrasli: S-XXL" : ""].filter(Boolean).join(" · ") || "Odrasli: S-XXL";
const empty = { id: "", category: "dres", klub: "", igrac: "", liga: "Reprezentacija", price: "20", retro: false, adults: true, kids: true, badge: "", description: "", images: [] as string[] };

export function CustomProducts() {
  const [list, setList] = useState<Custom[]>([]);
  const [open, setOpen] = useState(false);
  const [f, setF] = useState({ ...empty });
  const [saving, setSaving] = useState(false);
  const [aiName, setAiName] = useState("");
  const [aiBusy, setAiBusy] = useState(false);
  const [aiDescBusy, setAiDescBusy] = useState(false);
  const [aiImgBusy, setAiImgBusy] = useState(false);
  const [aiImgInfo, setAiImgInfo] = useState<{ seen: string; confidence: string } | null>(null);
  const [showList, setShowList] = useState(false); // duga lista skrivena po defaultu
  const [showBulk, setShowBulk] = useState(false);

  // Iz SLIKE proizvoda AI pročita klub, igrača + broj, ligu, boje i složi opis.
  async function aiFromImage(url?: string) {
    const img = url || f.images[0];
    if (!img || aiImgBusy) return;
    setAiImgBusy(true);
    setAiImgInfo(null);
    try {
      const d = await fetch("/api/admin/analyze-image/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageUrl: img })
      }).then((r) => r.json());
      if (d?.ok) {
        setF((prev) => ({
          ...prev,
          category: d.category || prev.category,
          klub: d.klub || prev.klub,
          igrac: d.igrac || prev.igrac,
          liga: LIGE.includes(d.liga) ? d.liga : prev.liga,
          retro: d.retro === true,
          badge: d.badge || prev.badge,
          description: d.description || prev.description,
          // streetwear je 50 € — postavi samo ako je cijena još zadana
          price: d.category === "streetwear" && (prev.price === "20" || !prev.price) ? "50" : prev.price
        }));
        setAiImgInfo({ seen: String(d.seen || ""), confidence: String(d.confidence || "") });
      } else {
        setAiImgInfo({ seen: d?.message || "AI nije uspio pročitati sliku.", confidence: "low" });
      }
    } catch {
      setAiImgInfo({ seen: "Greška pri čitanju slike.", confidence: "low" });
    }
    setAiImgBusy(false);
  }

  // Prva ubačena slika automatski pokreće AI (samo ako polja još nisu popunjena).
  function onImages(images: string[]) {
    const firstAdded = images.length > 0 && f.images.length === 0;
    setF((prev) => ({ ...prev, images }));
    if (firstAdded && !f.klub.trim() && !f.igrac.trim()) aiFromImage(images[0]);
  }

  // Streetwear: iz brenda + modela AI složi prodajni opis.
  async function aiDesc() {
    if (aiDescBusy || (!f.klub.trim() && !f.igrac.trim())) return;
    setAiDescBusy(true);
    try {
      const d = await fetch("/api/admin/generate-streetwear/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ brand: f.klub, model: f.igrac, price: f.price })
      }).then((r) => r.json());
      if (d?.ok && d.description) setF((prev) => ({ ...prev, description: d.description }));
    } catch {
      /* ignore */
    }
    setAiDescBusy(false);
  }

  async function aiFill() {
    if (aiBusy || !aiName.trim()) return;
    setAiBusy(true);
    try {
      const d = await fetch("/api/admin/generate-product/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: aiName })
      }).then((r) => r.json());
      if (d?.ok) {
        setF((prev) => ({
          ...prev,
          klub: d.klub || prev.klub,
          igrac: d.igrac || prev.igrac,
          liga: LIGE.includes(d.liga) ? d.liga : prev.liga,
          description: d.description || prev.description
        }));
      }
    } catch {
      /* ignore */
    }
    setAiBusy(false);
  }

  async function load() {
    const d = await fetch("/api/admin/custom-products/").then((r) => r.json()).catch(() => null);
    if (d?.ok) setList(d.products);
  }
  useEffect(() => { load(); }, []);

  function edit(p: Custom) {
    const vel = p.vel || "Djeca: 104-176 · Odrasli: S-XXL";
    setF({ id: p.id, category: p.category || "dres", klub: p.klub, igrac: p.igrac, liga: p.liga, price: String(p.price), retro: p.retro, adults: vel.includes("Odrasli"), kids: vel.includes("Djeca"), badge: p.badge || "", description: p.description || "", images: p.images });
    setOpen(true);
  }

  async function save() {
    if (saving || !f.klub.trim() || !f.igrac.trim()) return;
    setSaving(true);
    await fetch("/api/admin/custom-products/", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...f, price: Number(f.price.replace(",", ".")) || 20, vel: buildVel(f.adults, f.kids) })
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
      {/* Na mobitelu naslov i gumbi idu jedno ispod drugog — u istom redu bi
          gumbi stisnuli naslov na jednu riječ po retku. */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <div className="text-sm font-bold text-slate-900">Novi proizvodi — dresovi i streetwear</div>
          <div className="text-xs text-slate-400">{list.length} dodano · dodaj dres ili 🔥 streetwear sa slikama</div>
        </div>
        <div className="flex flex-wrap items-center gap-2 sm:shrink-0">
          {list.length > 0 && (
            <button
              type="button"
              onClick={() => setShowList((v) => !v)}
              className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 transition hover:bg-slate-50"
            >
              {showList ? "Sakrij popis" : `📋 Popis (${list.length})`}
            </button>
          )}
          <button
            type="button"
            onClick={() => setShowBulk((v) => !v)}
            className="rounded-lg bg-violet-600 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-violet-700"
          >
            {showBulk ? "Zatvori" : "📦 Masovno"}
          </button>
          <button
            type="button"
            onClick={() => { setF({ ...empty }); setOpen((v) => !v); }}
            className="rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-slate-800"
          >
            {open ? "Zatvori" : "➕ Dodaj proizvod"}
          </button>
        </div>
      </div>

      {showBulk && <BulkAdd onDone={load} />}

      {open && (
        <div className="mt-4 space-y-3 rounded-lg border border-slate-200 bg-slate-50/60 p-4">
          <div className="flex items-center gap-2 rounded-lg border border-orange-200 bg-orange-50/50 p-2.5">
            <span className="text-xs font-semibold text-slate-600">Što dodaješ?</span>
            {[
              { v: "dres", label: "👕 Dres" },
              { v: "streetwear", label: "🔥 Streetwear" }
            ].map((c) => (
              <button
                key={c.v}
                type="button"
                onClick={() => setF({ ...f, category: c.v, price: c.v === "streetwear" && (f.price === "20" || !f.price) ? "50" : c.v === "dres" && f.price === "50" ? "20" : f.price })}
                className={`rounded-md px-3 py-1.5 text-xs font-semibold transition ${f.category === c.v ? (c.v === "streetwear" ? "bg-orange-500 text-white" : "bg-slate-900 text-white") : "border border-slate-200 bg-white text-slate-500 hover:bg-slate-50"}`}
              >
                {c.label}
              </button>
            ))}
          </div>
          {f.category === "dres" && (
            <div className="rounded-lg border border-slate-900/10 bg-slate-900/5 p-3">
              <div className="mb-1.5 text-xs font-semibold text-slate-700">🪄 AI popuni — upiši naziv, ostalo složi AI</div>
              <div className="flex gap-2">
                <input
                  value={aiName}
                  onChange={(e) => setAiName(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); aiFill(); } }}
                  placeholder="npr. Hrvatska Modrić 2026"
                  className="min-w-0 flex-1 rounded-md border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-slate-400"
                />
                <button type="button" onClick={aiFill} disabled={aiBusy || !aiName.trim()} className="shrink-0 rounded-md bg-slate-900 px-3 py-2 text-xs font-semibold text-white transition hover:bg-slate-800 disabled:opacity-40">
                  {aiBusy ? "Slažem…" : "🪄 Popuni"}
                </button>
              </div>
              <div className="mt-1 text-[11px] text-slate-400">Ispuni klub, igrača, ligu i opis. Ti dodaš cijenu i slike.</div>
            </div>
          )}

          <div className="grid gap-3 sm:grid-cols-2">
            <label className="text-xs font-medium text-slate-500">{f.category === "streetwear" ? "Brend (npr. Nike)" : "Klub / reprezentacija"}
              <input value={f.klub} onChange={(e) => setF({ ...f, klub: e.target.value })} placeholder={f.category === "streetwear" ? "npr. Nike" : "npr. Hrvatska"} className="mt-1 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-slate-400" />
            </label>
            <label className="text-xs font-medium text-slate-500">{f.category === "streetwear" ? "Model / naziv" : "Igrač / naziv"}
              <input value={f.igrac} onChange={(e) => setF({ ...f, igrac: e.target.value })} placeholder={f.category === "streetwear" ? "npr. Cortez — bijele" : "npr. Modrić nr10 — 2026"} className="mt-1 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-slate-400" />
            </label>
            {f.category === "dres" && (
              <label className="text-xs font-medium text-slate-500">Liga
                <select value={f.liga} onChange={(e) => setF({ ...f, liga: e.target.value })} className="mt-1 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none focus:border-slate-400">
                  {LIGE.map((l) => <option key={l} value={l}>{l}</option>)}
                </select>
              </label>
            )}
            <label className="text-xs font-medium text-slate-500">Cijena (€)
              <input value={f.price} onChange={(e) => setF({ ...f, price: e.target.value })} inputMode="decimal" className="mt-1 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-slate-400" />
              {f.category === "streetwear" && (
                <span className="mt-1 flex gap-1.5">
                  {[
                    { p: "25", l: "Majica 25€" },
                    { p: "30", l: "Hlačice 30€" },
                    { p: "50", l: "Komplet 50€" }
                  ].map((x) => (
                    <button key={x.p} type="button" onClick={() => setF({ ...f, price: x.p })} className={`rounded px-2 py-0.5 text-[11px] font-medium transition ${f.price === x.p ? "bg-orange-500 text-white" : "border border-orange-200 text-orange-600 hover:bg-orange-50"}`}>{x.l}</button>
                  ))}
                </span>
              )}
            </label>
          </div>

          <div className="flex flex-wrap items-center gap-2 text-xs text-slate-600">
            <span className="font-medium text-slate-500">Veličine:</span>
            {f.category === "streetwear" ? (
              <span className="rounded-md bg-orange-50 px-3 py-1 font-semibold text-orange-600">XS · S · M · L (streetwear)</span>
            ) : (
              <>
                <button type="button" onClick={() => setF({ ...f, adults: !f.adults })} className={`rounded-md px-3 py-1 font-semibold transition ${f.adults ? "bg-slate-900 text-white" : "border border-slate-200 text-slate-400 hover:bg-slate-50"}`}>Odrasli S–XXL</button>
                <button type="button" onClick={() => setF({ ...f, kids: !f.kids })} className={`rounded-md px-3 py-1 font-semibold transition ${f.kids ? "bg-slate-900 text-white" : "border border-slate-200 text-slate-400 hover:bg-slate-50"}`}>Djeca 104–176</button>
                {!f.adults && !f.kids && <span className="text-red-500">Odaberi barem jedno</span>}
              </>
            )}
          </div>

          <div className="flex items-center gap-4 text-xs text-slate-600">
            {f.category === "dres" && (
              <label className="flex items-center gap-1.5"><input type="checkbox" checked={f.retro} onChange={(e) => setF({ ...f, retro: e.target.checked })} /> Retro</label>
            )}
            <label className="flex items-center gap-1.5">Badge:
              <select value={f.badge} onChange={(e) => setF({ ...f, badge: e.target.value })} className="rounded border border-slate-200 bg-white px-2 py-1">
                <option value="">Bez</option>
                <option value="bestseller">⭐ Bestseller</option>
                <option value="novo">🆕 Novo</option>
              </select>
            </label>
          </div>

          <label className="block text-xs font-medium text-slate-500">
            <span className="flex items-center justify-between">
              <span>Opis (svaki red = odlomak)</span>
              {f.category === "streetwear" && (
                <button
                  type="button"
                  onClick={aiDesc}
                  disabled={aiDescBusy || (!f.klub.trim() && !f.igrac.trim())}
                  className="rounded-md bg-orange-500 px-2.5 py-1 text-[11px] font-semibold text-white transition hover:bg-orange-600 disabled:opacity-40"
                >
                  {aiDescBusy ? "AI piše…" : "🪄 AI opis"}
                </button>
              )}
            </span>
            <textarea value={f.description} onChange={(e) => setF({ ...f, description: e.target.value })} rows={4} className="mt-1 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-[13px] leading-6 text-slate-900 outline-none focus:border-slate-400" />
          </label>

          <div>
            <div className="mb-1 flex items-center justify-between">
              <span className="text-xs font-medium text-slate-500">Slike</span>
              {f.images.length > 0 && (
                <button
                  type="button"
                  onClick={() => aiFromImage()}
                  disabled={aiImgBusy}
                  title="AI pročita sliku i popuni klub, igrača, broj, ligu i opis"
                  className="rounded-md bg-violet-600 px-2.5 py-1 text-[11px] font-semibold text-white transition hover:bg-violet-700 disabled:opacity-40"
                >
                  {aiImgBusy ? "AI gleda sliku…" : "🪄 Popuni iz slike"}
                </button>
              )}
            </div>
            <ImageUploader value={f.images} onChange={onImages} slug={f.klub && f.igrac ? "custom" : undefined} />
            {aiImgBusy && (
              <p className="mt-1.5 text-[11px] font-medium text-violet-600">🪄 AI čita sliku — popunjavam polja…</p>
            )}
            {!aiImgBusy && aiImgInfo && (
              <p className={`mt-1.5 break-words text-[11px] ${aiImgInfo.confidence === "low" ? "text-amber-600" : "text-slate-500"}`}>
                {aiImgInfo.confidence === "low" ? "⚠️ " : "👁 "}
                {aiImgInfo.seen}
                {aiImgInfo.confidence === "low" && " — provjeri podatke prije spremanja."}
              </p>
            )}
          </div>

          <button type="button" onClick={save} disabled={saving || !f.klub.trim() || !f.igrac.trim()} className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:opacity-40">
            {saving ? "Spremam…" : f.id ? "Spremi izmjene" : f.category === "streetwear" ? "🔥 Spremi streetwear" : "Spremi dres"}
          </button>
        </div>
      )}

      {list.length > 0 && showList && (
        <ul className="mt-4 max-h-[360px] space-y-2 overflow-y-auto pr-1">
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
