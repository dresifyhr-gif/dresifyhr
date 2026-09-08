"use client";

import { useEffect, useMemo, useState } from "react";

import { useLeagues } from "@/components/admin/use-leagues";

import { ImageUploader } from "@/components/admin/image-uploader";
import { adminPost } from "@/lib/admin-fetch";



type Product = {
  slug: string;
  klub: string;
  igrac: string;
  liga: string;
  images: string[];
  image: string | null;
  category: string;
  custom: boolean;
  price: number;
  stock: number | null;
  sizeStock: Record<string, number>;
  sizeList: string[];
  outOfStock: string;
  soldOutSizes: string[];
  hidden: boolean;
  badge: string;
  featured: boolean;
  overridden: boolean;
  sold: number;
  revenue: number;
  profit: number;
  returns: number;
  description: string;
  descriptionAuto: string;
};

const eur = (n: number) => `${(n ?? 0).toFixed(0)} €`;

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

// Kvadratni thumbnail proizvoda; fallback = pločica s inicijalom kluba/brenda.
function Thumb({ src, alt, klub }: { src: string | null; alt: string; klub: string }) {
  const [err, setErr] = useState(false);
  if (!src || err) {
    return (
      <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-[10px] border border-[var(--a-line)] bg-[var(--a-surface-2)] text-[15px] font-bold text-[var(--a-text-3)]">
        {klub?.trim()?.[0]?.toUpperCase() || "👕"}
      </div>
    );
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={alt}
      loading="lazy"
      onError={() => setErr(true)}
      className="h-14 w-14 shrink-0 rounded-[10px] border border-[var(--a-line)] object-cover"
    />
  );
}

function ProductRow({ p, sizes }: { p: Product; sizes: string[] }) {
  const LIGE = useLeagues();
  // Streetwear/custom prikazuje samo svoje veličine (XS–L); dresovi svoje.
  const rowSizes = p.sizeList && p.sizeList.length ? p.sizeList : sizes;
  const isStreetwear = p.category === "streetwear";
  const [price, setPrice] = useState(String(p.price));
  const [stock, setStock] = useState(p.stock == null ? "" : String(p.stock));
  const sizeStockInit = () => Object.fromEntries((p.sizeList || []).map((s) => [s, p.sizeStock?.[s] != null ? String(p.sizeStock[s]) : ""]));
  const [sizeStock, setSizeStock] = useState<Record<string, string>>(sizeStockInit);
  const [showSizes, setShowSizes] = useState(false);
  const [oos, setOos] = useState(p.outOfStock);
  const [soldSizes, setSoldSizes] = useState<string[]>(p.soldOutSizes);
  const [hidden, setHidden] = useState(p.hidden);
  const [badge, setBadge] = useState(p.badge);
  const [featured, setFeatured] = useState(p.featured);
  const [desc, setDesc] = useState(p.description || p.descriptionAuto);
  const [showDesc, setShowDesc] = useState(false);
  const [klub, setKlub] = useState(p.klub);
  const [igrac, setIgrac] = useState(p.igrac);
  const [liga, setLiga] = useState(p.liga);
  const [images, setImages] = useState<string[]>(p.images || []);
  const [showEdit, setShowEdit] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  // Ako je opis jednak auto-tekstu, spremamo prazno (vrati na automatski).
  const descToSave = desc.trim() === p.descriptionAuto.trim() ? "" : desc;
  const stockOrig = p.stock == null ? "" : String(p.stock);
  const sizeStockDirty = (p.sizeList || []).some((s) => (sizeStock[s] || "") !== (p.sizeStock?.[s] != null ? String(p.sizeStock[s]) : ""));
  const imagesDirty = images.join("|") !== (p.images || []).join("|");
  const dirty = price !== String(p.price) || stock !== stockOrig || sizeStockDirty || oos !== p.outOfStock || soldSizes.join(",") !== p.soldOutSizes.join(",") || hidden !== p.hidden || badge !== p.badge || featured !== p.featured || descToSave !== p.description || klub !== p.klub || igrac !== p.igrac || liga !== p.liga || imagesDirty;
  const sizeStockTotal = (p.sizeList || []).reduce((sum, s) => sum + (Number(sizeStock[s]) || 0), 0);
  const hasSizeStock = (p.sizeList || []).some((s) => (sizeStock[s] || "").trim() !== "");

  function toggleSize(s: string) {
    setSoldSizes((cur) => (cur.includes(s) ? cur.filter((x) => x !== s) : [...cur, s]));
  }

  async function save() {
    if (saving) return;
    setSaving(true);
    setSaved(false);
    const res = await adminPost("/api/admin/products/", { slug: p.slug, klub, igrac, liga, images, price: price === "" ? null : Number(price.replace(",", ".")), stock: stock === "" ? null : Number(stock.replace(/[^0-9]/g, "")), sizeStock: Object.fromEntries((p.sizeList || []).filter((s) => (sizeStock[s] || "").trim() !== "").map((s) => [s, Number(sizeStock[s])])), outOfStock: oos, soldOutSizes: soldSizes, hidden, badge, featured, description: descToSave });
    setSaving(false);
    if (!res) return; // ne pokazuj lažni "✓" ako spremanje nije prošlo
    setSaved(true);
    setTimeout(() => setSaved(false), 1500);
  }

  // Bočna traka stanja: skriveno=amber, rasprodano=crveno, u topu=lime, inače bez.
  const stripe = hidden ? "var(--a-warn)" : oos === "all" ? "var(--a-bad)" : featured ? "var(--a-accent)" : "transparent";
  return (
    <div
      className="rounded-[12px] border border-[var(--a-line)] p-3 transition-colors hover:border-[var(--a-text-3)]"
      style={{ borderLeftWidth: "4px", borderLeftColor: stripe }}
    >
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="flex min-w-0 items-start gap-3">
          <Thumb src={p.image} alt={`${p.klub} ${p.igrac}`} klub={p.klub} />
          <div className="min-w-0">
          <div className="flex items-center gap-2 font-semibold text-[var(--a-text)]">
            {isStreetwear && <span className="shrink-0 rounded bg-[var(--a-warn-bg)] px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-[var(--a-warn)]">🔥 Street</span>}
            <span className="truncate">{p.klub} — {p.igrac}</span>
          </div>
          <div className="text-[11px] text-[var(--a-text-3)]">{p.liga}{p.overridden && !p.custom ? " · uređeno" : ""}</div>
          <div className="mt-0.5 flex flex-wrap gap-x-3 gap-y-0.5 text-[11px]">
            <span className="text-[var(--a-text-2)]">📦 {p.sold} prodano</span>
            <span className="text-[var(--a-text-2)]">💶 {eur(p.revenue)} prihod</span>
            <span className="font-medium text-[var(--a-good)]">📈 {eur(p.profit)} profit</span>
            {p.returns > 0 && <span className="font-medium text-[var(--a-bad)]">↩ {p.returns} vraćeno</span>}
          </div>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1">
            <input
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              inputMode="decimal"
              className="w-16 rounded-[10px] border border-[var(--a-line)] bg-[var(--a-surface-2)] px-2 py-1 text-sm text-[var(--a-text)] outline-none focus:border-[var(--a-text-3)] focus:bg-[var(--a-card)]"
            />
            <span className="text-xs text-[var(--a-text-3)]">€</span>
          </div>
          <div className="flex items-center gap-1">
            <input
              value={stock}
              onChange={(e) => setStock(e.target.value.replace(/[^0-9]/g, ""))}
              inputMode="numeric"
              placeholder="auto"
              title="Količina na stanju (prazno = automatski)"
              className="w-14 rounded-[10px] border border-[var(--a-line)] bg-[var(--a-surface-2)] px-2 py-1 text-sm text-[var(--a-text)] outline-none focus:border-[var(--a-text-3)] focus:bg-[var(--a-card)]"
            />
            <span className="text-xs text-[var(--a-text-3)]">kom</span>
          </div>
          <select
            value={oos}
            onChange={(e) => setOos(e.target.value)}
            className="rounded-[10px] border border-[var(--a-line)] bg-[var(--a-surface-2)] px-2 py-1 text-sm text-[var(--a-text)] outline-none focus:border-[var(--a-text-3)]"
          >
            {STOCK_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
          <select
            value={badge}
            onChange={(e) => setBadge(e.target.value)}
            className="rounded-[10px] border border-[var(--a-line)] bg-[var(--a-surface-2)] px-2 py-1 text-sm text-[var(--a-text)] outline-none focus:border-[var(--a-text-3)]"
          >
            {BADGE_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
          <button
            type="button"
            onClick={() => setHidden((v) => !v)}
            title={hidden ? "Skriveno sa shopa — klikni da prikažeš" : "Prikazano — klikni da sakriješ"}
            className={`rounded-[10px] px-2 py-1 text-[11px] font-semibold transition ${hidden ? "bg-[var(--a-warn)] text-white hover:brightness-95" : "border border-[var(--a-line)] text-[var(--a-text-2)] hover:bg-[var(--a-surface-2)]"}`}
          >
            {hidden ? "🙈 Skriveno" : "👁 Vidljivo"}
          </button>
          <button
            type="button"
            onClick={() => setFeatured((v) => !v)}
            title={featured ? "Prikazan u 'Najprodavaniji dresovi' na naslovnici — klikni da makneš" : "Klikni da ga staviš u 'Najprodavaniji dresovi' na naslovnici"}
            className={`shrink-0 rounded-[10px] px-2 py-1 text-[11px] font-semibold transition ${featured ? "bg-[var(--a-accent)] text-black hover:brightness-95" : "border border-[var(--a-line)] text-[var(--a-text-2)] hover:bg-[var(--a-surface-2)]"}`}
          >
            {featured ? "🔥 Najprodavaniji" : "🔥 Dodaj u top"}
          </button>
          <button
            type="button"
            onClick={save}
            disabled={saving || !dirty}
            className="rounded-[10px] bg-[var(--a-text)] px-3 py-1 text-[11px] font-semibold text-[var(--a-card)] transition hover:opacity-90 disabled:opacity-40"
          >
            {saving ? "…" : saved ? "✓" : "Spremi"}
          </button>
        </div>
      </div>

      <div className="mt-2 flex flex-wrap items-center gap-1">
        <span className="mr-1 text-[11px] text-[var(--a-text-3)]">Rasprodane veličine:</span>
        {rowSizes.map((s) => {
          const on = soldSizes.includes(s);
          return (
            <button
              key={s}
              type="button"
              onClick={() => toggleSize(s)}
              className={`rounded px-1.5 py-0.5 text-[11px] font-medium transition ${on ? "bg-[var(--a-bad)] text-white" : "border border-[var(--a-line)] text-[var(--a-text-2)] hover:bg-[var(--a-surface-2)]"}`}
            >
              {s}
            </button>
          );
        })}
        <button
          type="button"
          onClick={() => setShowEdit((v) => !v)}
          className="ml-2 rounded px-1.5 py-0.5 text-[11px] font-semibold text-[var(--a-info)] underline decoration-dotted hover:opacity-80"
        >
          {showEdit ? "Sakrij podatke" : "🖼 Naziv i slike"}
          {images.length > 0 ? ` (${images.length})` : ""}
        </button>
        <button
          type="button"
          onClick={() => setShowDesc((v) => !v)}
          className="rounded px-1.5 py-0.5 text-[11px] font-medium text-[var(--a-text-2)] underline decoration-dotted hover:text-[var(--a-text)]"
        >
          {showDesc ? "Sakrij opis" : "✏️ Uredi opis"}
          {p.description ? " (uređen)" : ""}
        </button>
        {p.sizeList && p.sizeList.length > 0 && (
          <button
            type="button"
            onClick={() => setShowSizes((v) => !v)}
            className="rounded px-1.5 py-0.5 text-[11px] font-medium text-[var(--a-text-2)] underline decoration-dotted hover:text-[var(--a-text)]"
          >
            {showSizes ? "Sakrij količine" : "📦 Količine po veličini"}
            {hasSizeStock ? ` (${sizeStockTotal} kom)` : ""}
          </button>
        )}
      </div>

      {showEdit && (
        <div className="mt-2 rounded-[12px] border border-[var(--a-line)] bg-[var(--a-surface-2)] p-2.5">
          <div className="flex flex-wrap items-center gap-1.5">
            <input value={klub} onChange={(e) => setKlub(e.target.value)} placeholder="Klub / brend" className="w-36 rounded border border-[var(--a-line)] bg-[var(--a-card)] px-2 py-1 text-[12px] outline-none focus:border-[var(--a-text-3)]" />
            <input value={igrac} onChange={(e) => setIgrac(e.target.value)} placeholder="Igrač / model" className="min-w-[150px] flex-1 rounded border border-[var(--a-line)] bg-[var(--a-card)] px-2 py-1 text-[12px] outline-none focus:border-[var(--a-text-3)]" />
            <select value={liga} onChange={(e) => setLiga(e.target.value)} className="w-32 max-w-full shrink-0 rounded border border-[var(--a-line)] bg-[var(--a-card)] px-2 py-1 text-[12px] outline-none focus:border-[var(--a-text-3)]">
              {(LIGE.includes(liga) ? LIGE : [liga, ...LIGE]).map((l) => <option key={l} value={l}>{l}</option>)}
            </select>
          </div>
          <div className="mt-2">
            <ImageUploader value={images} onChange={setImages} slug={p.slug} />
          </div>
          <p className="mt-1.5 text-[11px] text-[var(--a-text-2)]">
            {p.custom
              ? "Slike i naziv ovog proizvoda. Prva slika je glavna."
              : "Ostavi slike prazno = koriste se originalne iz kataloga. Dodaj slike da ih zamijeniš. Prva je glavna."}
            {" "}Ne zaboravi „Spremi” gore.
          </p>
        </div>
      )}

      {showSizes && p.sizeList && p.sizeList.length > 0 && (
        <div className="mt-2 rounded-[12px] border border-[var(--a-line)] bg-[var(--a-surface-2)] p-2.5">
          <div className="flex flex-wrap gap-2">
            {p.sizeList.map((s) => (
              <label key={s} className="flex flex-col items-center gap-0.5">
                <span className="text-[11px] font-medium text-[var(--a-text-2)]">{s}</span>
                <input
                  value={sizeStock[s] ?? ""}
                  onChange={(e) => setSizeStock((cur) => ({ ...cur, [s]: e.target.value.replace(/[^0-9]/g, "") }))}
                  inputMode="numeric"
                  placeholder="–"
                  className="w-12 rounded border border-[var(--a-line)] bg-[var(--a-card)] px-1.5 py-1 text-center text-[13px] outline-none focus:border-[var(--a-text-3)]"
                />
              </label>
            ))}
          </div>
          <p className="mt-2 text-[11px] text-[var(--a-text-3)]">
            Upiši koliko imaš po veličini. <b>0 = rasprodano</b> (kupac ne može naručiti tu veličinu). Prazno = ne pratiš tu veličinu. Ukupno: <b className="text-[var(--a-text-2)]">{sizeStockTotal} kom</b>. Ne zaboravi „Spremi” gore.
          </p>
        </div>
      )}

      {showDesc && (
        <div className="mt-2">
          <textarea
            value={desc}
            onChange={(e) => setDesc(e.target.value)}
            rows={6}
            className="w-full rounded-[10px] border border-[var(--a-line)] bg-[var(--a-surface-2)] px-3 py-2 text-[13px] leading-6 text-[var(--a-text)] outline-none focus:border-[var(--a-text-3)] focus:bg-[var(--a-card)]"
          />
          <div className="mt-1 flex items-center gap-2">
            <button
              type="button"
              onClick={() => setDesc(p.descriptionAuto)}
              className="text-[11px] text-[var(--a-text-3)] underline decoration-dotted hover:text-[var(--a-text-2)]"
            >
              ↺ Vrati automatski opis
            </button>
            <span className="text-[11px] text-[var(--a-text-3)]">Svaki novi red = novi odlomak. Ne zaboravi „Spremi” gore.</span>
          </div>
        </div>
      )}
    </div>
  );
}

export function ProductsManager() {
  const [products, setProducts] = useState<Product[]>([]);
  const [sizes, setSizes] = useState<string[]>([]);
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(true);
  // Koliko redaka crtamo odjednom. Svaki redak nosi ~16 gumba i polja, pa bi
  // svih 120 odjednom značilo ~2000 gumba i preračun stilova od ~375 ms
  // (mjereno) — stranica bi trzala. Ostatak se dodaje na klik.
  const [limit, setLimit] = useState(24);

  // Početni pojam iz URL-a (?q=…) — kad ⌘K paleta skoči na proizvod.
  useEffect(() => {
    const urlQ = new URLSearchParams(window.location.search).get("q");
    if (urlQ) setQ(urlQ);
  }, []);

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
    return products.filter((p) => `${p.klub} ${p.igrac} ${p.liga} ${p.category}`.toLowerCase().includes(nq));
  }, [q, products]);

  // Pretraga uvijek gleda CIJELI popis; ograničenje je samo koliko ih crtamo.
  const visible = useMemo(() => filtered.slice(0, limit), [filtered, limit]);

  return (
    <div>
      <div className="mb-4 flex items-center gap-3">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Traži proizvod (klub, igrač, liga, streetwear)…"
          className="flex-1 rounded-[12px] border border-[var(--a-line)] bg-[var(--a-surface-2)] px-3.5 py-2.5 text-sm text-[var(--a-text)] outline-none focus:border-[var(--a-text-3)] focus:bg-[var(--a-card)]"
        />
        <span className="shrink-0 text-xs text-[var(--a-text-3)]">{loading ? "…" : `${filtered.length} proizvoda`}</span>
      </div>
      {loading ? (
        <div className="py-8 text-center text-sm text-[var(--a-text-3)]">Učitavam…</div>
      ) : (
        <div className="space-y-2">
          {visible.map((p) => <ProductRow key={p.slug} p={p} sizes={sizes} />)}
          {filtered.length > visible.length && (
            <button
              type="button"
              onClick={() => setLimit((n) => n + 40)}
              className="a-btn-sm w-full py-2.5 text-[13px]"
            >
              Prikaži još ({filtered.length - visible.length} preostalo)
            </button>
          )}
        </div>
      )}
    </div>
  );
}
