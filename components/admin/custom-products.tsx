"use client";

import Image from "next/image";
import { useEffect, useState } from "react";

import { useLeagues } from "@/components/admin/use-leagues";

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
  sizeStock?: Record<string, number>;
};


// Veličine: sastavi "Odrasli" / "Djeca" dio (getJerseySizeOptions gleda ove ključne riječi u vel).
const buildVel = (adults: boolean, kids: boolean) =>
  [kids ? "Djeca: 104-176" : "", adults ? "Odrasli: S-XXL" : ""].filter(Boolean).join(" · ") || "Odrasli: S-XXL";
const empty = { id: "", category: "dres", klub: "", igrac: "", liga: "Reprezentacija", price: "20", retro: false, adults: true, kids: true, badge: "", description: "", images: [] as string[], sizeStock: {} as Record<string, string> };

// Veličine za unos količine (po segmentu). Prazno polje = ne pratim (nepoznato).
const FORM_ADULT = ["S", "M", "L", "XL", "XXL"];
const FORM_KIDS = ["104", "116", "128", "140", "152", "164", "176"];
const FORM_STREET = ["XS", "S", "M", "L"];
// Dugi rukav — fiksni raspon 152–L (youth 152-176 + odrasli S-L).
const FORM_LONGSLEEVE = ["152", "164", "176", "S", "M", "L"];
// Zadana cijena po kategoriji (streetwear 50 €, dugi rukav 35 €, obični dres 20 €).
const defaultPriceFor = (cat: string) => (cat === "streetwear" ? "50" : cat === "dugi-rukav" ? "35" : "20");

export function CustomProducts() {
  const LIGE = useLeagues();
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
          // Dugi rukav ne diramo — AI sa slike prepozna "dres", ne smije pregaziti izbor.
          category: prev.category === "dugi-rukav" ? "dugi-rukav" : d.category || prev.category,
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
    setF({ id: p.id, category: p.category || "dres", klub: p.klub, igrac: p.igrac, liga: p.liga, price: String(p.price), retro: p.retro, adults: vel.includes("Odrasli"), kids: vel.includes("Djeca"), badge: p.badge || "", description: p.description || "", images: p.images, sizeStock: Object.fromEntries(Object.entries(p.sizeStock || {}).map(([k, v]) => [k, String(v)])) });
    setOpen(true);
  }

  async function save() {
    if (saving || !f.klub.trim() || !f.igrac.trim()) return;
    setSaving(true);
    await fetch("/api/admin/custom-products/", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...f,
        price: Number(f.price.replace(",", ".")) || 20,
        vel: f.category === "dugi-rukav" ? "Djeca: 152-176 · Odrasli: S-L" : buildVel(f.adults, f.kids),
        // Samo upisane veličine (prazno = ne pratim/nepoznato).
        sizeStock: Object.fromEntries(
          Object.entries(f.sizeStock)
            .filter(([, v]) => String(v).trim() !== "")
            .map(([k, v]) => [k, Number(v)])
        )
      })
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
    <div className="mb-5 a-card p-4 sm:p-5">
      {/* Na mobitelu naslov i gumbi idu jedno ispod drugog — u istom redu bi
          gumbi stisnuli naslov na jednu riječ po retku. */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <div className="text-sm font-bold text-[var(--a-text)]">Novi proizvodi — dresovi i streetwear</div>
          <div className="text-xs text-[var(--a-text-3)]">{list.length} dodano · dodaj dres ili 🔥 streetwear sa slikama</div>
        </div>
        <div className="flex flex-wrap items-center gap-2 sm:shrink-0">
          {list.length > 0 && (
            <button
              type="button"
              onClick={() => setShowList((v) => !v)}
              className="rounded-[12px] border border-[var(--a-line)] px-3 py-1.5 text-xs font-semibold text-[var(--a-text-2)] transition hover:bg-[var(--a-surface-2)]"
            >
              {showList ? "Sakrij popis" : `📋 Popis (${list.length})`}
            </button>
          )}
          <button
            type="button"
            onClick={() => setShowBulk((v) => !v)}
            className="rounded-[12px] bg-violet-600 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-violet-700"
          >
            {showBulk ? "Zatvori" : "📦 Masovno"}
          </button>
          <button
            type="button"
            onClick={() => { setF({ ...empty }); setOpen((v) => !v); }}
            className="rounded-[12px] bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-slate-800"
          >
            {open ? "Zatvori" : "➕ Dodaj proizvod"}
          </button>
        </div>
      </div>

      {showBulk && <BulkAdd onDone={load} />}

      {open && (
        <div className="mt-4 space-y-3 rounded-[12px] border border-[var(--a-line)] bg-[var(--a-surface-2)] p-4">
          <div className="flex items-center gap-2 rounded-[12px] border border-orange-200 bg-orange-50/50 p-2.5">
            <span className="text-xs font-semibold text-[var(--a-text-2)]">Što dodaješ?</span>
            {[
              { v: "dres", label: "👕 Dres" },
              { v: "dugi-rukav", label: "🧥 Dugi rukav" },
              { v: "streetwear", label: "🔥 Streetwear" }
            ].map((c) => (
              <button
                key={c.v}
                type="button"
                onClick={() => setF((prev) => ({ ...prev, category: c.v, price: (!prev.price || ["20", "35", "50"].includes(prev.price)) ? defaultPriceFor(c.v) : prev.price }))}
                className={`rounded-[10px] px-3 py-1.5 text-xs font-semibold transition ${f.category === c.v ? (c.v === "streetwear" ? "bg-orange-500 text-white" : c.v === "dugi-rukav" ? "bg-sky-600 text-white" : "bg-[var(--a-text)] text-[var(--a-card)]") : "border border-[var(--a-line)] bg-[var(--a-card)] text-[var(--a-text-2)] hover:bg-[var(--a-surface-2)]"}`}
              >
                {c.label}
              </button>
            ))}
          </div>
          {f.category !== "streetwear" && (
            <div className="rounded-[12px] border border-slate-900/10 bg-slate-900/5 p-3">
              <div className="mb-1.5 text-xs font-semibold text-[var(--a-text)]">🪄 AI popuni — upiši naziv, ostalo složi AI</div>
              <div className="flex gap-2">
                <input
                  value={aiName}
                  onChange={(e) => setAiName(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); aiFill(); } }}
                  placeholder="npr. Hrvatska Modrić 2026"
                  className="min-w-0 flex-1 rounded-[10px] border border-[var(--a-line)] bg-[var(--a-card)] px-3 py-2 text-sm outline-none focus:border-slate-400"
                />
                <button type="button" onClick={aiFill} disabled={aiBusy || !aiName.trim()} className="shrink-0 rounded-[10px] bg-slate-900 px-3 py-2 text-xs font-semibold text-white transition hover:bg-slate-800 disabled:opacity-40">
                  {aiBusy ? "Slažem…" : "🪄 Popuni"}
                </button>
              </div>
              <div className="mt-1 text-[11px] text-[var(--a-text-3)]">Ispuni klub, igrača, ligu i opis. Ti dodaš cijenu i slike.</div>
            </div>
          )}

          <div className="grid gap-3 sm:grid-cols-2">
            <label className="text-xs font-medium text-[var(--a-text-2)]">{f.category === "streetwear" ? "Brend (npr. Nike)" : "Klub / reprezentacija"}
              <input value={f.klub} onChange={(e) => setF({ ...f, klub: e.target.value })} placeholder={f.category === "streetwear" ? "npr. Nike" : "npr. Hrvatska"} className="mt-1 w-full rounded-[10px] border border-[var(--a-line)] bg-[var(--a-card)] px-3 py-2 text-sm text-[var(--a-text)] outline-none focus:border-slate-400" />
            </label>
            <label className="text-xs font-medium text-[var(--a-text-2)]">{f.category === "streetwear" ? "Model / naziv" : "Igrač / naziv"}
              <input value={f.igrac} onChange={(e) => setF({ ...f, igrac: e.target.value })} placeholder={f.category === "streetwear" ? "npr. Cortez — bijele" : "npr. Modrić nr10 — 2026"} className="mt-1 w-full rounded-[10px] border border-[var(--a-line)] bg-[var(--a-card)] px-3 py-2 text-sm text-[var(--a-text)] outline-none focus:border-slate-400" />
            </label>
            {f.category !== "streetwear" && (
              <label className="text-xs font-medium text-[var(--a-text-2)]">Liga
                <select value={f.liga} onChange={(e) => setF({ ...f, liga: e.target.value })} className="mt-1 w-full rounded-[10px] border border-[var(--a-line)] bg-[var(--a-card)] px-3 py-2 text-sm text-[var(--a-text)] outline-none focus:border-slate-400">
                  {LIGE.map((l) => <option key={l} value={l}>{l}</option>)}
                </select>
              </label>
            )}
            <label className="text-xs font-medium text-[var(--a-text-2)]">Cijena (€)
              <input value={f.price} onChange={(e) => setF({ ...f, price: e.target.value })} inputMode="decimal" className="mt-1 w-full rounded-[10px] border border-[var(--a-line)] bg-[var(--a-card)] px-3 py-2 text-sm text-[var(--a-text)] outline-none focus:border-slate-400" />
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

          <div className="flex flex-wrap items-center gap-2 text-xs text-[var(--a-text-2)]">
            <span className="font-medium text-[var(--a-text-2)]">Veličine:</span>
            {f.category === "streetwear" ? (
              <span className="rounded-[10px] bg-orange-50 px-3 py-1 font-semibold text-orange-600">XS · S · M · L (streetwear)</span>
            ) : f.category === "dugi-rukav" ? (
              <span className="rounded-[10px] bg-sky-50 px-3 py-1 font-semibold text-sky-600">152 · 164 · 176 · S · M · L (dugi rukav)</span>
            ) : (
              <>
                <button type="button" onClick={() => setF({ ...f, adults: !f.adults })} className={`rounded-[10px] px-3 py-1 font-semibold transition ${f.adults ? "bg-[var(--a-text)] text-[var(--a-card)]" : "border border-[var(--a-line)] text-[var(--a-text-3)] hover:bg-[var(--a-surface-2)]"}`}>Odrasli S–XXL</button>
                <button type="button" onClick={() => setF({ ...f, kids: !f.kids })} className={`rounded-[10px] px-3 py-1 font-semibold transition ${f.kids ? "bg-[var(--a-text)] text-[var(--a-card)]" : "border border-[var(--a-line)] text-[var(--a-text-3)] hover:bg-[var(--a-surface-2)]"}`}>Djeca 104–176</button>
                {!f.adults && !f.kids && <span className="text-red-500">Odaberi barem jedno</span>}
              </>
            )}
          </div>

          {/* Količina po veličini (opcionalno). Prazno = ne pratim zalihu te veličine.
              Broj se automatski smanjuje nakon narudžbe; 0 = rasprodano (crveno). */}
          {(() => {
            const sizes =
              f.category === "streetwear" ? FORM_STREET : f.category === "dugi-rukav" ? FORM_LONGSLEEVE : [...(f.adults ? FORM_ADULT : []), ...(f.kids ? FORM_KIDS : [])];
            if (!sizes.length) return null;
            return (
              <div>
                <p className="mb-1.5 text-[11px] text-[var(--a-text-3)]">
                  Količina po veličini <span className="opacity-70">(ostavi prazno ako ne pratiš)</span>
                </p>
                <div className="grid grid-cols-4 gap-2 sm:grid-cols-6">
                  {sizes.map((s) => (
                    <label key={s} className="flex flex-col gap-0.5">
                      <span className="text-[10px] text-[var(--a-text-3)]">{s}</span>
                      <input
                        type="number"
                        min={0}
                        inputMode="numeric"
                        value={f.sizeStock[s] ?? ""}
                        onChange={(e) => setF({ ...f, sizeStock: { ...f.sizeStock, [s]: e.target.value } })}
                        placeholder="—"
                        className="a-input w-full px-2 py-1 text-sm"
                      />
                    </label>
                  ))}
                </div>
              </div>
            );
          })()}

          <div className="flex items-center gap-4 text-xs text-[var(--a-text-2)]">
            {f.category !== "streetwear" && (
              <label className="flex items-center gap-1.5"><input type="checkbox" checked={f.retro} onChange={(e) => setF({ ...f, retro: e.target.checked })} /> Retro</label>
            )}
            <label className="flex items-center gap-1.5">Badge:
              <select value={f.badge} onChange={(e) => setF({ ...f, badge: e.target.value })} className="rounded border border-[var(--a-line)] bg-[var(--a-card)] px-2 py-1">
                <option value="">Bez</option>
                <option value="bestseller">⭐ Bestseller</option>
                <option value="novo">🆕 Novo</option>
              </select>
            </label>
          </div>

          <label className="block text-xs font-medium text-[var(--a-text-2)]">
            <span className="flex items-center justify-between">
              <span>Opis (svaki red = odlomak)</span>
              {f.category === "streetwear" && (
                <button
                  type="button"
                  onClick={aiDesc}
                  disabled={aiDescBusy || (!f.klub.trim() && !f.igrac.trim())}
                  className="rounded-[10px] bg-orange-500 px-2.5 py-1 text-[11px] font-semibold text-white transition hover:bg-orange-600 disabled:opacity-40"
                >
                  {aiDescBusy ? "AI piše…" : "🪄 AI opis"}
                </button>
              )}
            </span>
            <textarea value={f.description} onChange={(e) => setF({ ...f, description: e.target.value })} rows={4} className="mt-1 w-full rounded-[10px] border border-[var(--a-line)] bg-[var(--a-card)] px-3 py-2 text-[13px] leading-6 text-[var(--a-text)] outline-none focus:border-slate-400" />
          </label>

          <div>
            <div className="mb-1 flex items-center justify-between">
              <span className="text-xs font-medium text-[var(--a-text-2)]">Slike</span>
              {f.images.length > 0 && (
                <button
                  type="button"
                  onClick={() => aiFromImage()}
                  disabled={aiImgBusy}
                  title="AI pročita sliku i popuni klub, igrača, broj, ligu i opis"
                  className="rounded-[10px] bg-violet-600 px-2.5 py-1 text-[11px] font-semibold text-white transition hover:bg-violet-700 disabled:opacity-40"
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
              <p className={`mt-1.5 break-words text-[11px] ${aiImgInfo.confidence === "low" ? "text-amber-600" : "text-[var(--a-text-2)]"}`}>
                {aiImgInfo.confidence === "low" ? "⚠️ " : "👁 "}
                {aiImgInfo.seen}
                {aiImgInfo.confidence === "low" && " — provjeri podatke prije spremanja."}
              </p>
            )}
          </div>

          <button type="button" onClick={save} disabled={saving || !f.klub.trim() || !f.igrac.trim()} className="rounded-[12px] bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:opacity-40">
            {saving ? "Spremam…" : f.id ? "Spremi izmjene" : f.category === "streetwear" ? "🔥 Spremi streetwear" : "Spremi dres"}
          </button>
        </div>
      )}

      {list.length > 0 && showList && (
        <ul className="mt-4 max-h-[360px] space-y-2 overflow-y-auto pr-1">
          {list.map((p) => (
            <li key={p.id} className="flex items-center justify-between gap-3 rounded-[12px] border border-black/[0.04] p-2 text-sm">
              <span className="flex min-w-0 items-center gap-2">
                <span className="relative h-10 w-10 shrink-0 overflow-hidden rounded bg-[var(--a-surface-2)]">
                  {p.images[0] && <Image src={p.images[0]} alt="" fill sizes="40px" className="object-cover" />}
                </span>
                <span className="min-w-0">
                  <span className="block truncate font-medium text-[var(--a-text)]">{p.klub} — {p.igrac}</span>
                  <span className="text-[11px] text-[var(--a-text-3)]">{p.liga} · {p.price} € · {p.images.length} slika{p.hidden ? " · skriveno" : ""}</span>
                </span>
              </span>
              <span className="flex shrink-0 gap-1.5">
                <a href={`/dres/${p.slug}`} target="_blank" rel="noopener noreferrer" className="rounded-[10px] border border-[var(--a-line)] px-2 py-1 text-[11px] text-[var(--a-text-2)] hover:text-[var(--a-text)]">Vidi</a>
                <button type="button" onClick={() => edit(p)} className="rounded-[10px] border border-[var(--a-line)] px-2 py-1 text-[11px] text-[var(--a-text-2)] hover:bg-[var(--a-surface-2)]">Uredi</button>
                <button type="button" onClick={() => remove(p.id)} className="rounded-[10px] border border-red-200 px-2 py-1 text-[11px] text-red-500 hover:bg-red-50">Obriši</button>
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
