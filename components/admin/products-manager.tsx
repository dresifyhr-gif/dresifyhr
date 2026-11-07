"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import { useLeagues } from "@/components/admin/use-leagues";

import { ImageUploader } from "@/components/admin/image-uploader";
import { adminPost } from "@/lib/admin-fetch";
import { SITE_URL } from "@/lib/site";



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
  // Sve slike (za pregled na klik) i prodaja po veličini u zadnjih 60 dana.
  gallery?: string[];
  sizeSales?: Record<string, number>;
  sold60?: number;
};

const eur = (n: number) => `${(n ?? 0).toFixed(0)} €`;

// ── Stanje zalihe (za filtere i tablicu "Za nabavu") ─────────────────────────
// Veličina "fali" ako je ručno označena rasprodanom, ima 0 kom, ili je cijeli
// segment (odrasli/djeca/sve) označen kao rasprodan. "Malo" = 1–2 kom.
const LOW_STOCK = 2;
const isKidSize = (s: string) => /^\d{2,3}(\/\d{2,3})?$/.test(s);

type StockInfo = { missing: string[]; low: string[]; soldOutAll: boolean };

function stockInfo(p: Product): StockInfo {
  const list = p.sizeList?.length ? p.sizeList : Object.keys(p.sizeStock || {});
  const missing = new Set<string>();
  for (const s of p.soldOutSizes || []) missing.add(s);
  for (const [s, n] of Object.entries(p.sizeStock || {})) if (n <= 0) missing.add(s);
  if (p.outOfStock === "all") list.forEach((s) => missing.add(s));
  const noSplit = p.category === "trenirka" || p.category === "streetwear"; // shop: sve veličine su "odrasle"
  if (p.outOfStock === "adults") list.filter((s) => noSplit || !isKidSize(s)).forEach((s) => missing.add(s));
  if (p.outOfStock === "kids" && !noSplit) list.filter(isKidSize).forEach((s) => missing.add(s));
  const low = Object.entries(p.sizeStock || {})
    .filter(([s, n]) => n > 0 && n <= LOW_STOCK && !missing.has(s))
    .map(([s]) => s);
  const rank = (s: string) => (list.indexOf(s) === -1 ? 999 : list.indexOf(s));
  const order = (arr: string[]) => [...arr].sort((a, b) => rank(a) - rank(b));
  const soldOutAll = p.outOfStock === "all" || (list.length > 0 && list.every((s) => missing.has(s)));
  return { missing: order([...missing]), low: order(low), soldOutAll };
}

type Cat = "dres" | "komplet" | "trenirka" | "dugi-rukav" | "streetwear";
function catOf(p: Product): Cat {
  if (p.category === "streetwear" || p.category === "trenirka" || p.category === "dugi-rukav") return p.category;
  return p.liga === "Komplet" ? "komplet" : "dres";
}
const CAT_LABEL: Record<Cat, string> = {
  dres: "👕 Dresovi",
  komplet: "🎁 Kompleti",
  trenirka: "🏃 Trenirke",
  "dugi-rukav": "🧥 Dugi rukav",
  streetwear: "🔥 Streetwear"
};

type Filter = "all" | "top" | "soldout" | "missing" | "low" | "hidden" | Cat;
type Sort = "default" | "sold" | "sold60" | "stock" | "name";

// Jedan red za nabavu = jedan proizvod + jedna veličina koju treba naručiti.
type NabavaRow = { p: Product; size: string; status: "rasprodano" | "malo"; stanje: number; sold60: number; preporuka: number };

// Preporuka = pokrij ~30 dana prodaje te veličine (pola od zadnjih 60 dana) minus
// ono što još ima; za rasprodanu veličinu barem 1 kom.
function nabavaRows(products: Product[], includeHidden: boolean): NabavaRow[] {
  const rows: NabavaRow[] = [];
  for (const p of products) {
    if (p.hidden && !includeHidden) continue;
    const info = stockInfo(p);
    for (const s of info.missing) {
      const sold60 = p.sizeSales?.[s] ?? 0;
      rows.push({ p, size: s, status: "rasprodano", stanje: 0, sold60, preporuka: Math.max(1, Math.ceil(sold60 / 2)) });
    }
    for (const s of info.low) {
      const stanje = p.sizeStock?.[s] ?? 0;
      const sold60 = p.sizeSales?.[s] ?? 0;
      const preporuka = Math.ceil(sold60 / 2) - stanje;
      rows.push({ p, size: s, status: "malo", stanje, sold60, preporuka: Math.max(0, preporuka) });
    }
  }
  return rows.sort(
    (a, b) =>
      b.sold60 - a.sold60 ||
      (b.p.sold60 ?? 0) - (a.p.sold60 ?? 0) ||
      b.p.sold - a.p.sold ||
      (a.status === b.status ? 0 : a.status === "rasprodano" ? -1 : 1)
  );
}

const todayHr = () => new Date().toLocaleDateString("hr-HR");
const productUrl = (slug: string) => `${SITE_URL}/dres/${slug}/`;

// CSV za Excel (HR Excel koristi ; kao razdjelnik, BOM za č/ć/š/ž/đ).
function downloadNabavaCsv(rows: NabavaRow[]) {
  const cell = (v: string | number) => `"${String(v).replace(/"/g, '""')}"`;
  const header = ["Klub / brend", "Igrač / model", "Kategorija", "Veličina", "Stanje", "Status", "Prodano 60 dana (ta veličina)", "Prodano ukupno (proizvod)", "Preporuka naručiti", "Link"];
  const lines = rows.map((r) =>
    [r.p.klub, r.p.igrac, CAT_LABEL[catOf(r.p)].replace(/^\S+\s/, ""), r.size, r.stanje, r.status, r.sold60, r.p.sold, r.preporuka, productUrl(r.p.slug)].map(cell).join(";")
  );
  const csv = "﻿" + [header.map(cell).join(";"), ...lines].join("\r\n");
  const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = `dresify-za-nabavu-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

// Kratak tekst za dobavljača (WhatsApp/poruka): po proizvodu, veličina ×komada.
function supplierText(rows: NabavaRow[]): string {
  const groups = new Map<string, { title: string; parts: string[]; qty: number }>();
  for (const r of rows) {
    if (r.preporuka <= 0) continue;
    const key = r.p.slug;
    const g = groups.get(key) ?? { title: `${r.p.klub} — ${r.p.igrac}`, parts: [], qty: 0 };
    g.parts.push(`${r.size} ×${r.preporuka}`);
    g.qty += r.preporuka;
    groups.set(key, g);
  }
  const total = [...groups.values()].reduce((s, g) => s + g.qty, 0);
  return [
    `DRESIFY — za nabavu (${todayHr()})`,
    "",
    ...[...groups.values()].map((g) => `• ${g.title}: ${g.parts.join(", ")}`),
    "",
    `Ukupno: ${total} kom`
  ].join("\n");
}

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
function Thumb({ src, alt, klub, size = "h-14 w-14", radius = "rounded-[10px]" }: { src: string | null; alt: string; klub: string; size?: string; radius?: string }) {
  const [err, setErr] = useState(false);
  if (!src || err) {
    return (
      <div className={`${size} flex shrink-0 items-center justify-center ${radius} border border-[var(--a-line)] bg-[var(--a-surface-2)] text-[13px] font-bold text-[var(--a-text-3)]`}>
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
      className={`${size} shrink-0 ${radius} border border-[var(--a-line)] object-cover`}
    />
  );
}

// Pregled slika preko cijelog ekrana: strelice/tipke ← →, Esc ili klik izvan zatvara.
function ImageViewer({ images, title, onClose }: { images: string[]; title: string; onClose: () => void }) {
  const [i, setI] = useState(0);
  const n = images.length;
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowRight") setI((x) => (x + 1) % n);
      if (e.key === "ArrowLeft") setI((x) => (x - 1 + n) % n);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [n, onClose]);
  if (!n) return null;
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={title}
      onClick={onClose}
      className="fixed inset-0 z-[80] flex flex-col items-center justify-center bg-black/85 p-4"
    >
      <div className="mb-3 flex w-full max-w-4xl items-center justify-between gap-3 text-white">
        <span className="truncate text-sm font-semibold">{title}</span>
        <span className="shrink-0 text-xs text-white/60">{n > 1 ? `${i + 1} / ${n}` : ""}</span>
        <button type="button" onClick={onClose} aria-label="Zatvori" className="shrink-0 rounded-full bg-white/10 px-3 py-1 text-sm hover:bg-white/20">✕</button>
      </div>
      <div className="relative flex w-full max-w-4xl flex-1 items-center justify-center" onClick={(e) => e.stopPropagation()}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={images[i]} alt={title} className="max-h-[78vh] max-w-full rounded-[12px] bg-white object-contain" />
        {n > 1 && (
          <>
            <button type="button" aria-label="Prethodna" onClick={() => setI((x) => (x - 1 + n) % n)} className="absolute left-0 top-1/2 -translate-y-1/2 rounded-full bg-black/60 px-3 py-2 text-xl text-white hover:bg-black/80">‹</button>
            <button type="button" aria-label="Sljedeća" onClick={() => setI((x) => (x + 1) % n)} className="absolute right-0 top-1/2 -translate-y-1/2 rounded-full bg-black/60 px-3 py-2 text-xl text-white hover:bg-black/80">›</button>
          </>
        )}
      </div>
      {n > 1 && (
        <div className="mt-3 flex max-w-4xl gap-2 overflow-x-auto" onClick={(e) => e.stopPropagation()}>
          {images.map((src, k) => (
            <button key={src + k} type="button" onClick={() => setI(k)} className={`shrink-0 overflow-hidden rounded-md border-2 ${k === i ? "border-[var(--a-accent)]" : "border-transparent opacity-60 hover:opacity-100"}`}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={src} alt="" className="h-14 w-14 bg-white object-cover" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

const imagesOf = (p: Product) => (p.gallery?.length ? p.gallery : p.image ? [p.image] : []);

// Tablica "Za nabavu": sve rasprodane veličine i one kojih je ostalo malo,
// poredano po tome što se najviše prodaje. Izvoz u Excel (CSV) i tekst za dobavljača.
function NabavaPanel({ products, onOpenImage }: { products: Product[]; onOpenImage: (p: Product) => void }) {
  const [includeHidden, setIncludeHidden] = useState(false);
  const [onlyMissing, setOnlyMissing] = useState(false);
  const [copied, setCopied] = useState(false);
  const rows = useMemo(() => {
    const all = nabavaRows(products, includeHidden);
    return onlyMissing ? all.filter((r) => r.status === "rasprodano") : all;
  }, [products, includeHidden, onlyMissing]);
  const total = rows.reduce((s, r) => s + r.preporuka, 0);
  const untracked = useMemo(
    () => products.filter((p) => !p.hidden && Object.keys(p.sizeStock || {}).length === 0 && !(p.soldOutSizes || []).length && !p.outOfStock).length,
    [products]
  );

  async function copyForSupplier() {
    try {
      await navigator.clipboard.writeText(supplierText(rows));
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      /* preglednik nije dopustio — ništa */
    }
  }

  return (
    <div className="mb-4 rounded-[12px] border border-[var(--a-line)] bg-[var(--a-surface-2)] p-3 sm:p-4">
      <div className="flex flex-wrap items-center gap-2">
        <div className="mr-auto">
          <div className="text-sm font-bold text-[var(--a-text)]">📋 Za nabavu — što fali</div>
          <div className="text-[11px] text-[var(--a-text-3)]">
            {rows.length} veličina · preporuka ukupno <b className="text-[var(--a-text-2)]">{total} kom</b> · prodaja iz zadnjih 60 dana
          </div>
        </div>
        <label className="flex items-center gap-1.5 text-[11px] text-[var(--a-text-2)]">
          <input type="checkbox" checked={onlyMissing} onChange={(e) => setOnlyMissing(e.target.checked)} /> samo rasprodano
        </label>
        <label className="flex items-center gap-1.5 text-[11px] text-[var(--a-text-2)]">
          <input type="checkbox" checked={includeHidden} onChange={(e) => setIncludeHidden(e.target.checked)} /> i skriveni
        </label>
        <button type="button" onClick={copyForSupplier} disabled={!rows.length} className="a-btn-sm px-3 py-1.5 text-[12px] disabled:opacity-40">
          {copied ? "✓ Kopirano" : "💬 Kopiraj za dobavljača"}
        </button>
        <button
          type="button"
          onClick={() => downloadNabavaCsv(rows)}
          disabled={!rows.length}
          className="rounded-[10px] bg-[var(--a-good)] px-3 py-1.5 text-[12px] font-semibold text-white transition hover:brightness-95 disabled:opacity-40"
        >
          ⬇️ Izvezi u Excel
        </button>
      </div>

      {rows.length === 0 ? (
        <p className="mt-3 text-[12px] text-[var(--a-text-3)]">Ništa ne fali 🎉 (gleda se samo ono što ima upisanu zalihu ili označene rasprodane veličine).</p>
      ) : (
        <div className="mt-3 max-h-[60vh] overflow-auto rounded-[10px] border border-[var(--a-line)] bg-[var(--a-card)]">
          <table className="w-full min-w-[620px] text-left text-[12px]">
            <thead className="sticky top-0 z-10 bg-[var(--a-card)] text-[10px] uppercase tracking-wide text-[var(--a-text-3)]">
              <tr className="border-b border-[var(--a-line)]">
                <th className="px-2 py-2">Proizvod</th>
                <th className="px-2 py-2">Vel.</th>
                <th className="px-2 py-2">Stanje</th>
                <th className="px-2 py-2 text-right" title="Koliko je te veličine prodano u zadnjih 60 dana">Prodano 60 d</th>
                <th className="px-2 py-2 text-right" title="Ukupno prodano tog proizvoda">Ukupno</th>
                <th className="px-2 py-2 text-right">Naruči</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={`${r.p.slug}|${r.size}`} className="border-b border-[var(--a-line)] last:border-0">
                  <td className="px-2 py-1.5">
                    <div className="flex items-center gap-2">
                      <button type="button" onClick={() => onOpenImage(r.p)} title="Otvori sliku" className="shrink-0">
                        <Thumb src={r.p.image} alt={`${r.p.klub} ${r.p.igrac}`} klub={r.p.klub} size="h-9 w-9" radius="rounded-md" />
                      </button>
                      <div className="min-w-0">
                        <div className="truncate font-medium text-[var(--a-text)]">{r.p.klub} — {r.p.igrac}</div>
                        <div className="text-[10px] text-[var(--a-text-3)]">{CAT_LABEL[catOf(r.p)]}{r.p.hidden ? " · skriveno" : ""}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-2 py-1.5 font-bold text-[var(--a-text)]">{r.size}</td>
                  <td className="px-2 py-1.5">
                    {r.status === "rasprodano" ? (
                      <span className="rounded bg-[var(--a-bad)] px-1.5 py-0.5 text-[10px] font-bold text-white">RASPRODANO</span>
                    ) : (
                      <span className="rounded bg-[var(--a-warn)] px-1.5 py-0.5 text-[10px] font-bold text-white">još {r.stanje}</span>
                    )}
                  </td>
                  <td className="px-2 py-1.5 text-right tabular-nums text-[var(--a-text-2)]">{r.sold60}</td>
                  <td className="px-2 py-1.5 text-right tabular-nums text-[var(--a-text-3)]">{r.p.sold}</td>
                  <td className="px-2 py-1.5 text-right text-[13px] font-bold tabular-nums text-[var(--a-text)]">{r.preporuka || "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <p className="mt-2 text-[11px] text-[var(--a-text-3)]">
        Preporuka = koliko te veličine se proda za ~30 dana (prema zadnjih 60 dana) minus ono što još imaš; za rasprodanu barem 1.
        {untracked > 0 && <> {untracked} proizvoda nema upisanu zalihu po veličinama pa ih ovdje nema — upiši količine u „📦 Veličine” da i njih prati.</>}
      </p>
    </div>
  );
}

function ProductRow({ p, sizes, onOpenImage, onSaved }: { p: Product; sizes: string[]; onOpenImage: (p: Product) => void; onSaved: (patch: Partial<Product> & { slug: string }) => void }) {
  const LIGE = useLeagues();
  // Urediva lista veličina ovog proizvoda (dodaj / promijeni / obriši).
  const [sizeListEdit, setSizeListEdit] = useState<string[]>(p.sizeList && p.sizeList.length ? p.sizeList : []);
  const [newSize, setNewSize] = useState("");
  // Za "rasprodane veličine" i količine koristi urediva lista (pa rade i nove veličine).
  const rowSizes = sizeListEdit.length ? sizeListEdit : sizes;
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
  // Objava na Instagram (📸) — caption predpopunjen iz podataka proizvoda.
  const [showIg, setShowIg] = useState(false);
  const [igCaption, setIgCaption] = useState(() => {
    const title = `${p.klub} — ${p.igrac}`;
    // Samo RUČNI opis (ako ga je Gazda upisao); auto-opis (materijali/brend) preskačemo — nije za IG.
    const manual = (p.description || "").trim();
    const domain = SITE_URL.replace(/^https?:\/\//, "");
    return [
      title,
      manual,
      `💶 ${p.price} €`,
      `📲 Registriraj se na ${domain} i uživaj besplatnu dostavu iznad 60 €`,
      "#dresify #nogomet #dres"
    ]
      .filter(Boolean)
      .join("\n\n");
  });
  const [igBusy, setIgBusy] = useState(false);
  const [igMsg, setIgMsg] = useState<string | null>(null);

  async function publishIg() {
    if (igBusy) return;
    setIgBusy(true);
    setIgMsg(null);
    const res = await adminPost("/api/admin/instagram/publish/", { slug: p.slug, imageUrl: p.image, caption: igCaption });
    setIgBusy(false);
    if (!res) return; // adminPost je već javio grešku (npr. 403 = nisi vlasnik)
    const d = await res.json().catch(() => ({}));
    setIgMsg(d?.ok ? "✅ Objavljeno na Instagram!" : d?.message || "Objava nije uspjela.");
  }

  // Ako je opis jednak auto-tekstu, spremamo prazno (vrati na automatski).
  const descToSave = desc.trim() === p.descriptionAuto.trim() ? "" : desc;
  const stockOrig = p.stock == null ? "" : String(p.stock);
  const sizeStockDirty = (p.sizeList || []).some((s) => (sizeStock[s] || "") !== (p.sizeStock?.[s] != null ? String(p.sizeStock[s]) : ""));
  const imagesDirty = images.join("|") !== (p.images || []).join("|");
  const sizesChanged = sizeListEdit.join(",") !== (p.sizeList || []).join(",");
  const dirty = price !== String(p.price) || stock !== stockOrig || sizeStockDirty || sizesChanged || oos !== p.outOfStock || soldSizes.join(",") !== p.soldOutSizes.join(",") || hidden !== p.hidden || badge !== p.badge || featured !== p.featured || descToSave !== p.description || klub !== p.klub || igrac !== p.igrac || liga !== p.liga || imagesDirty;
  const sizeStockTotal = rowSizes.reduce((sum, s) => sum + (Number(sizeStock[s]) || 0), 0);
  const hasSizeStock = rowSizes.some((s) => (sizeStock[s] || "").trim() !== "");

  function toggleSize(s: string) {
    setSoldSizes((cur) => (cur.includes(s) ? cur.filter((x) => x !== s) : [...cur, s]));
  }

  function addSize() {
    const s = newSize.trim().toUpperCase();
    if (!s) return;
    setSizeListEdit((cur) => (cur.includes(s) ? cur : [...cur, s]));
    setNewSize("");
  }

  async function save() {
    if (saving) return;
    setSaving(true);
    setSaved(false);
    const priceNum = price === "" ? null : Number(price.replace(",", "."));
    const stockNum = stock === "" ? null : Number(stock.replace(/[^0-9]/g, ""));
    const sizeStockNum: Record<string, number> = Object.fromEntries(sizeListEdit.filter((s) => (sizeStock[s] || "").trim() !== "").map((s) => [s, Number(sizeStock[s])]));
    const res = await adminPost("/api/admin/products/", { slug: p.slug, klub, igrac, liga, images, price: priceNum, stock: stockNum, sizeStock: sizeStockNum, sizes: sizesChanged ? sizeListEdit : undefined, outOfStock: oos, soldOutSizes: soldSizes, hidden, badge, featured, description: descToSave });
    setSaving(false);
    if (!res) return; // ne pokazuj lažni "✓" ako spremanje nije prošlo
    // Javi roditelju novo stanje → tablica "Za nabavu", filteri i "fali" redak odmah točni.
    onSaved({
      slug: p.slug, klub, igrac, liga, images,
      image: images[0] ?? p.image,
      gallery: images.length ? images : p.gallery,
      price: priceNum ?? p.price, stock: stockNum, sizeStock: sizeStockNum,
      sizeList: sizeListEdit.length ? sizeListEdit : p.sizeList,
      outOfStock: oos, soldOutSizes: soldSizes, hidden, badge, featured, description: descToSave
    });
    setSaved(true);
    setTimeout(() => setSaved(false), 1500);
  }

  // Bočna traka stanja (UVIJEK u boji, kao Narudžbe → okvir je cijeli):
  // rasprodano=crveno, skriveno=amber, u topu=lime, inače na stanju=zeleno.
  const stripe = oos === "all" ? "var(--a-bad)" : hidden ? "var(--a-warn)" : featured ? "var(--a-accent)" : "var(--a-good)";
  return (
    <div
      className="flex min-w-0 flex-col overflow-hidden rounded-[12px] border border-[var(--a-line)] p-3 transition-colors hover:border-[var(--a-text-3)]"
      style={{ borderLeftWidth: "4px", borderLeftColor: stripe }}
    >
      {/* Zaglavlje: slika + naziv/statistika + cijena (uživo) */}
      <div className="flex items-start gap-3">
        <button
          type="button"
          onClick={() => onOpenImage(p)}
          disabled={!imagesOf(p).length}
          title={imagesOf(p).length > 1 ? `Otvori slike (${imagesOf(p).length})` : "Otvori sliku"}
          className="relative shrink-0 cursor-zoom-in disabled:cursor-default"
        >
          <Thumb src={p.image} alt={`${p.klub} ${p.igrac}`} klub={p.klub} />
          {imagesOf(p).length > 1 && (
            <span className="absolute -bottom-1 -right-1 rounded-full bg-[var(--a-text)] px-1.5 text-[9px] font-bold leading-4 text-[var(--a-card)]">{imagesOf(p).length}</span>
          )}
        </button>
        <div className="min-w-0 flex-1">
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
          {(() => {
            const info = stockInfo(p);
            if (info.soldOutAll) return <div className="mt-0.5 text-[11px] font-semibold text-[var(--a-bad)]">⛔ Sve rasprodano</div>;
            if (!info.missing.length && !info.low.length) return null;
            return (
              <div className="mt-0.5 flex flex-wrap gap-x-3 text-[11px] font-medium">
                {info.missing.length > 0 && <span className="text-[var(--a-bad)]">⚠ fali: {info.missing.join(", ")}</span>}
                {info.low.length > 0 && <span className="text-[var(--a-warn)]">📉 malo: {info.low.map((s) => `${s} (${p.sizeStock[s]})`).join(", ")}</span>}
              </div>
            );
          })()}
        </div>
        <div className="shrink-0 whitespace-nowrap text-right text-[17px] font-bold tabular-nums text-[var(--a-text)]">
          {price || "—"} €
        </div>
      </div>

      <div className="my-3 h-px bg-[var(--a-line)]" />

      {/* Kontrole: cijena, zaliha, na stanju, oznaka, vidljivo, u top */}
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
      </div>

      {/* Rasprodane veličine */}
      <div className="mt-2.5 flex flex-wrap items-center gap-1">
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
      </div>

      {/* Podnožje: proširi (slike/opis/količine) + Spremi — zalijepljeno na dno (jednaka visina) */}
      <div className="mt-auto flex flex-wrap items-center gap-x-1 gap-y-1.5 border-t border-[var(--a-line)] pt-3">
        <button
          type="button"
          onClick={() => setShowEdit((v) => !v)}
          className="rounded px-1.5 py-0.5 text-[11px] font-semibold text-[var(--a-info)] underline decoration-dotted hover:opacity-80"
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
        <button
          type="button"
          onClick={() => setShowSizes((v) => !v)}
          className="rounded px-1.5 py-0.5 text-[11px] font-medium text-[var(--a-text-2)] underline decoration-dotted hover:text-[var(--a-text)]"
        >
          {showSizes ? "Sakrij veličine" : "📦 Veličine"}
          {hasSizeStock ? ` (${sizeStockTotal} kom)` : ""}
        </button>
        {p.image && (
          <button
            type="button"
            onClick={() => setShowIg((v) => !v)}
            className="rounded px-1.5 py-0.5 text-[11px] font-medium text-[var(--a-text-2)] underline decoration-dotted hover:text-[var(--a-text)]"
          >
            {showIg ? "Sakrij IG" : "📸 Objavi na IG"}
          </button>
        )}
        <button
          type="button"
          onClick={save}
          disabled={saving || !dirty}
          className="ml-auto rounded-[10px] bg-[var(--a-text)] px-3 py-1.5 text-[11px] font-semibold text-[var(--a-card)] transition hover:opacity-90 disabled:opacity-40"
        >
          {saving ? "…" : saved ? "✓ Spremljeno" : "Spremi"}
        </button>
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

      {showSizes && (
        <div className="mt-2 rounded-[12px] border border-[var(--a-line)] bg-[var(--a-surface-2)] p-2.5">
          <div className="flex flex-wrap items-end gap-2.5">
            {rowSizes.map((s) => (
              <div key={s} className="relative flex flex-col items-center gap-0.5">
                <span className="text-[11px] font-medium text-[var(--a-text-2)]">{s}</span>
                <input
                  value={sizeStock[s] ?? ""}
                  onChange={(e) => setSizeStock((cur) => ({ ...cur, [s]: e.target.value.replace(/[^0-9]/g, "") }))}
                  inputMode="numeric"
                  placeholder="–"
                  className="w-12 rounded border border-[var(--a-line)] bg-[var(--a-card)] px-1.5 py-1 text-center text-[13px] outline-none focus:border-[var(--a-text-3)]"
                />
                <button
                  type="button"
                  onClick={() => setSizeListEdit((cur) => cur.filter((x) => x !== s))}
                  title={`Obriši veličinu ${s}`}
                  className="absolute -right-1.5 -top-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-[var(--a-bad)] text-[11px] font-bold leading-none text-white hover:brightness-110"
                >
                  ×
                </button>
              </div>
            ))}
            {/* Dodaj novu veličinu */}
            <div className="flex flex-col items-center gap-0.5">
              <span className="text-[11px] font-medium text-[var(--a-text-3)]">nova</span>
              <div className="flex">
                <input
                  value={newSize}
                  onChange={(e) => setNewSize(e.target.value.toUpperCase().slice(0, 12))}
                  onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addSize(); } }}
                  placeholder="npr. 140"
                  className="w-16 rounded-l border border-[var(--a-line)] bg-[var(--a-card)] px-1.5 py-1 text-center text-[13px] outline-none focus:border-[var(--a-text-3)]"
                />
                <button type="button" onClick={addSize} title="Dodaj veličinu" className="rounded-r border border-l-0 border-[var(--a-line)] bg-[var(--a-good)] px-2 text-[15px] font-bold leading-none text-white hover:brightness-110">+</button>
              </div>
            </div>
          </div>
          <p className="mt-2 text-[11px] text-[var(--a-text-3)]">
            Dodaj/obriši veličine (× briše, „nova&quot; dodaje — npr. 140) i upiši količinu po veličini. <b>0 = rasprodano</b>. Prazno = ne pratiš zalihu te veličine. Ukupno: <b className="text-[var(--a-text-2)]">{sizeStockTotal} kom</b>. Ne zaboravi „Spremi” gore.
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

      {showIg && (
        <div className="mt-2 rounded-[12px] border border-[var(--a-line)] bg-[var(--a-surface-2)] p-2.5">
          <div className="flex gap-3">
            <Thumb src={p.image} alt="" klub={p.klub} size="h-20 w-20" />
            <textarea
              value={igCaption}
              onChange={(e) => setIgCaption(e.target.value)}
              rows={6}
              className="min-w-0 flex-1 rounded-[10px] border border-[var(--a-line)] bg-[var(--a-card)] px-3 py-2 text-[13px] leading-6 text-[var(--a-text)] outline-none focus:border-[var(--a-text-3)]"
            />
          </div>
          <div className="mt-2 flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={publishIg}
              disabled={igBusy}
              className="rounded-[10px] bg-[var(--a-accent)] px-3 py-1.5 text-[11px] font-bold text-black transition hover:brightness-95 disabled:opacity-50"
            >
              {igBusy ? "Objavljujem…" : "📸 Objavi na Instagram"}
            </button>
            {igMsg && <span className="text-[12px] text-[var(--a-text-2)]">{igMsg}</span>}
          </div>
          <p className="mt-1.5 text-[11px] text-[var(--a-text-3)]">
            Objavljuje glavnu sliku na Instagram feed. Slika mora biti JPEG. <b>Objava je javna i odmah vidljiva</b> — provjeri opis prije klika.
          </p>
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
  const [focused, setFocused] = useState(false); // prikaz autocomplete dropdowna
  const [filter, setFilter] = useState<Filter>("all");
  const [sort, setSort] = useState<Sort>("default");
  const [showNabava, setShowNabava] = useState(false);
  const [viewer, setViewer] = useState<Product | null>(null);
  const closeViewer = useCallback(() => setViewer(null), []);
  const onSaved = useCallback(
    (patch: Partial<Product> & { slug: string }) =>
      setProducts((cur) => cur.map((x) => (x.slug === patch.slug ? { ...x, ...patch } : x))),
    []
  );

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

  // Pretraga (tekst) → zatim filter (čip) → zatim poredak.
  const searched = useMemo(() => {
    const nq = q.trim().toLowerCase();
    if (!nq) return products;
    return products.filter((p) => `${p.klub} ${p.igrac} ${p.liga} ${p.category}`.toLowerCase().includes(nq));
  }, [q, products]);

  const infoMap = useMemo(() => new Map(products.map((p) => [p.slug, stockInfo(p)])), [products]);

  const matches = useCallback(
    (p: Product, f: Filter) => {
      const info = infoMap.get(p.slug)!;
      switch (f) {
        case "all": return true;
        case "top": return p.sold > 0;
        case "soldout": return info.soldOutAll;
        case "missing": return info.missing.length > 0 && !info.soldOutAll;
        case "low": return info.low.length > 0;
        case "hidden": return p.hidden;
        default: return catOf(p) === f;
      }
    },
    [infoMap]
  );

  const filtered = useMemo(() => {
    const list = searched.filter((p) => matches(p, filter));
    const stockLeft = (p: Product) => {
      const vals = Object.values(p.sizeStock || {});
      if (infoMap.get(p.slug)?.soldOutAll) return 0;
      return vals.length ? vals.reduce((a, b) => a + b, 0) : p.stock ?? Number.POSITIVE_INFINITY;
    };
    const effectiveSort: Sort = filter === "top" && sort === "default" ? "sold" : sort;
    switch (effectiveSort) {
      case "sold": return [...list].sort((a, b) => b.sold - a.sold);
      case "sold60": return [...list].sort((a, b) => (b.sold60 ?? 0) - (a.sold60 ?? 0) || b.sold - a.sold);
      case "stock": return [...list].sort((a, b) => stockLeft(a) - stockLeft(b) || b.sold - a.sold);
      case "name": return [...list].sort((a, b) => `${a.klub} ${a.igrac}`.localeCompare(`${b.klub} ${b.igrac}`, "hr"));
      default: return list;
    }
  }, [searched, filter, sort, matches, infoMap]);

  const chips = useMemo(() => {
    const base: { f: Filter; label: string }[] = [
      { f: "all", label: "Svi" },
      { f: "top", label: "🔥 Najprodavanije" },
      { f: "soldout", label: "⛔ Rasprodano" },
      { f: "missing", label: "⚠ Fale veličine" },
      { f: "low", label: "📉 Malo zalihe" },
      { f: "hidden", label: "🙈 Skriveno" },
      ...(Object.keys(CAT_LABEL) as Cat[]).map((c) => ({ f: c as Filter, label: CAT_LABEL[c] }))
    ];
    return base
      .map((c) => ({ ...c, count: searched.filter((p) => matches(p, c.f)).length }))
      .filter((c) => c.f === "all" || c.f === filter || c.count > 0);
  }, [searched, matches, filter]);

  // Promjena filtera/poretka → kreni opet od vrha liste.
  useEffect(() => setLimit(24), [filter, sort]);

  // Pretraga uvijek gleda CIJELI popis; ograničenje je samo koliko ih crtamo.
  const visible = useMemo(() => filtered.slice(0, limit), [filtered, limit]);

  return (
    <div>
      <div className="mb-4 flex items-center gap-3">
        <div className="relative flex-1">
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onFocus={() => setFocused(true)}
            onBlur={() => setTimeout(() => setFocused(false), 150)}
            placeholder="Traži proizvod (klub, igrač, liga, streetwear)…"
            className="w-full rounded-[12px] border border-[var(--a-line)] bg-[var(--a-surface-2)] px-3.5 py-2.5 text-sm text-[var(--a-text)] outline-none focus:border-[var(--a-text-3)] focus:bg-[var(--a-card)]"
          />
          {/* Autocomplete: sužava se sa svakim slovom; klik odabere taj proizvod */}
          {focused && q.trim() !== "" && !loading && filtered.length > 0 && (
            <ul className="absolute inset-x-0 top-full z-30 mt-1.5 max-h-[22rem] overflow-auto rounded-[12px] border border-[var(--a-line)] bg-[var(--a-card)] py-1 shadow-lg">
              {filtered.slice(0, 8).map((p) => (
                <li key={p.slug}>
                  <button
                    type="button"
                    onMouseDown={(e) => e.preventDefault()} // spriječi blur prije klika
                    onClick={() => {
                      setQ(`${p.klub} ${p.igrac}`);
                      setFocused(false);
                    }}
                    className="flex w-full items-center gap-2.5 px-3 py-1.5 text-left transition-colors hover:bg-[var(--a-surface-2)]"
                  >
                    <Thumb src={p.image} alt="" klub={p.klub} size="h-9 w-9" radius="rounded-md" />
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center gap-1.5">
                        {p.category === "streetwear" && <span className="shrink-0 text-[10px]">🔥</span>}
                        <span className="truncate text-sm font-medium text-[var(--a-text)]">{p.klub} — {p.igrac}</span>
                      </span>
                      <span className="block truncate text-[11px] text-[var(--a-text-3)]">{p.liga}</span>
                    </span>
                    <span className="shrink-0 text-[12px] font-semibold text-[var(--a-text-2)]">{eur(p.price)}</span>
                  </button>
                </li>
              ))}
              {filtered.length > 8 && (
                <li className="px-3 pt-1 text-[11px] text-[var(--a-text-3)]">+{filtered.length - 8} više — nastavi tipkati da suziš…</li>
              )}
            </ul>
          )}
        </div>
        <span className="shrink-0 text-xs text-[var(--a-text-3)]">{loading ? "…" : `${filtered.length} proizvoda`}</span>
      </div>

      {!loading && (
        <>
          {/* Filteri (čipovi s brojem), poredak i tablica za nabavu */}
          <div className="mb-3 flex flex-wrap items-center gap-1.5">
            {chips.map((c) => (
              <button
                key={c.f}
                type="button"
                onClick={() => setFilter(c.f)}
                className={`rounded-full px-2.5 py-1 text-[12px] font-semibold transition ${
                  filter === c.f
                    ? "bg-[var(--a-text)] text-[var(--a-card)]"
                    : "border border-[var(--a-line)] text-[var(--a-text-2)] hover:bg-[var(--a-surface-2)]"
                }`}
              >
                {c.label} <span className="opacity-60">{c.count}</span>
              </button>
            ))}
          </div>
          <div className="mb-4 flex flex-wrap items-center gap-2">
            <label className="flex items-center gap-1.5 text-[12px] text-[var(--a-text-2)]">
              Poredaj:
              <select
                value={sort}
                onChange={(e) => setSort(e.target.value as Sort)}
                className="rounded-[10px] border border-[var(--a-line)] bg-[var(--a-surface-2)] px-2 py-1 text-[12px] text-[var(--a-text)] outline-none focus:border-[var(--a-text-3)]"
              >
                <option value="default">Zadano</option>
                <option value="sold">Najprodavanije (ukupno)</option>
                <option value="sold60">Najprodavanije (60 dana)</option>
                <option value="stock">Najmanje zalihe</option>
                <option value="name">Naziv A–Ž</option>
              </select>
            </label>
            <button
              type="button"
              onClick={() => setShowNabava((v) => !v)}
              className={`ml-auto rounded-[10px] px-3 py-1.5 text-[12px] font-bold transition ${
                showNabava ? "bg-[var(--a-text)] text-[var(--a-card)]" : "bg-[var(--a-accent)] text-black hover:brightness-95"
              }`}
            >
              {showNabava ? "Zatvori nabavu" : "📋 Za nabavu (što fali)"}
            </button>
          </div>
          {showNabava && <NabavaPanel products={products} onOpenImage={setViewer} />}
        </>
      )}
      {viewer && <ImageViewer images={imagesOf(viewer)} title={`${viewer.klub} — ${viewer.igrac}`} onClose={closeViewer} />}
      {loading ? (
        <div className="py-8 text-center text-sm text-[var(--a-text-3)]">Učitavam…</div>
      ) : (
        <>
          {/* Pametan grid: mobitel 1 → laptop 2 → široki monitor 3 stupca. */}
          <div className="mb-3 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[11px] text-[var(--a-text-3)]">
            <span className="font-bold uppercase tracking-wide">Rub kartice:</span>
            {[
              { c: "var(--a-good)", l: "na stanju" },
              { c: "var(--a-warn)", l: "skriveno" },
              { c: "var(--a-bad)", l: "rasprodano" },
              { c: "var(--a-accent)", l: "u topu" }
            ].map((x) => (
              <span key={x.l} className="flex items-center gap-1.5">
                <span className="inline-block h-3 w-1.5 rounded-full" style={{ background: x.c }} />
                {x.l}
              </span>
            ))}
          </div>
          <div className="grid grid-cols-1 gap-3 xl:grid-cols-2 2xl:grid-cols-3">
            {visible.map((p) => <ProductRow key={p.slug} p={p} sizes={sizes} onOpenImage={setViewer} onSaved={onSaved} />)}
          </div>
          {filtered.length === 0 && (
            <div className="py-8 text-center text-sm text-[var(--a-text-3)]">Nema proizvoda za ovaj filter.</div>
          )}
          {filtered.length > visible.length && (
            <button
              type="button"
              onClick={() => setLimit((n) => n + 40)}
              className="a-btn-sm mt-3 w-full py-2.5 text-[13px]"
            >
              Prikaži još ({filtered.length - visible.length} preostalo)
            </button>
          )}
        </>
      )}
    </div>
  );
}
