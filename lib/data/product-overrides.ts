import "server-only";

import { unstable_cache } from "next/cache";
import { cache } from "react";

import { prisma } from "@/lib/prisma";
import type { Jersey } from "@/lib/data/jerseys";

// ── Keširani DB dohvati ───────────────────────────────────────────────────────
// Stranice su dinamičke (i18n cookie), pa bi bez ovoga svaki klik gađao bazu više
// puta. Kešira se u Vercel Data Cache na 60s (admin promjene vidljive unutar minute).
const REVALIDATE = 60;

const fetchOverrideRows = unstable_cache(
  async () => {
    if (!process.env.DATABASE_URL) return [];
    try { return await prisma.productOverride.findMany(); } catch { return []; }
  },
  ["product-override-rows"],
  { revalidate: REVALIDATE, tags: ["products"] }
);

const fetchCustomRows = unstable_cache(
  async () => {
    if (!process.env.DATABASE_URL) return [] as CustomRow[];
    try { return (await prisma.customProduct.findMany({ where: { hidden: false }, orderBy: { createdAt: "desc" } })) as unknown as CustomRow[]; } catch { return [] as CustomRow[]; }
  },
  ["custom-product-rows"],
  { revalidate: REVALIDATE, tags: ["products"] }
);

const fetchSoldSlugs = unstable_cache(
  async () => {
    if (!process.env.DATABASE_URL) return [] as string[];
    try {
      const rows = await prisma.orderItem.findMany({ distinct: ["slug"], select: { slug: true } });
      return rows.map((r) => r.slug).filter((s): s is string => !!s);
    } catch { return [] as string[]; }
  },
  ["sold-slugs"],
  { revalidate: REVALIDATE, tags: ["orders"] }
);

// Admin-managed overrides (price / stock) merged onto the static catalog. Best-effort:
// if the DB is unavailable or empty, the shop uses the base catalog unchanged.
type Override = { slug: string; klub: string | null; igrac: string | null; liga: string | null; images: string | null; price: number | null; stock: number | null; sizeStock: string | null; outOfStock: string | null; soldOutSizes: string | null; hidden: boolean; badge: string | null; description: string | null };

// JSON niz URL-ova slika iz override-a (prazno = originalne slike iz /public).
function parseImages(raw: string | null): string[] | undefined {
  if (!raw) return undefined;
  try {
    const arr = JSON.parse(raw);
    const urls = Array.isArray(arr) ? arr.filter((u): u is string => typeof u === "string" && !!u) : [];
    return urls.length ? urls : undefined;
  } catch { return undefined; }
}

function parseSizeStock(raw: string | null): Record<string, number> | undefined {
  if (!raw) return undefined;
  try {
    const obj = JSON.parse(raw);
    if (!obj || typeof obj !== "object") return undefined;
    const out: Record<string, number> = {};
    for (const [k, v] of Object.entries(obj)) { const n = Number(v); if (Number.isFinite(n)) out[k] = Math.max(0, Math.round(n)); }
    return Object.keys(out).length ? out : undefined;
  } catch { return undefined; }
}

async function getOverrideMap(): Promise<Map<string, Override>> {
  const rows = await fetchOverrideRows();
  return new Map(rows.map((r) => [r.slug, r]));
}

function merge(j: Jersey, ov?: Override): Jersey {
  if (!ov) return j;
  const outOfStock = ov.outOfStock === "all" || ov.outOfStock === "adults" || ov.outOfStock === "kids" ? ov.outOfStock : undefined;
  const badge = ov.badge === "bestseller" || ov.badge === "novo" ? ov.badge : undefined;
  const klub = ov.klub?.trim() || j.klub;
  const igrac = ov.igrac?.trim() || j.igrac;
  const imgUrls = parseImages(ov.images);
  return {
    ...j,
    klub,
    igrac,
    liga: ov.liga?.trim() || j.liga,
    // Uređene slike zamjenjuju originalne; prazno = ostaju originalne iz /public.
    images: imgUrls ? imgUrls.map((src) => ({ src, altLabel: `${klub} ${igrac}` })) : j.images,
    price: ov.price != null ? ov.price : j.price,
    stock: ov.stock != null ? ov.stock : j.stock,
    sizeStock: parseSizeStock(ov.sizeStock) ?? j.sizeStock,
    outOfStock,
    badge,
    descriptionOverride: ov.description || undefined,
    soldOutSizes: ov.soldOutSizes != null ? (ov.soldOutSizes ? ov.soldOutSizes.split(",").map((s) => s.trim()).filter(Boolean) : []) : j.soldOutSizes
  };
}

// Merge overrides onto a list of jerseys (for catalog / listings). Hidden/draft
// products are removed from listings.
export async function withOverrides(list: Jersey[]): Promise<Jersey[]> {
  const map = await getOverrideMap();
  if (map.size === 0) return list;
  return list.filter((j) => !map.get(j.slug)?.hidden).map((j) => merge(j, map.get(j.slug)));
}

// Merge override onto a single jersey (for the product page).
export async function jerseyWithOverride(j: Jersey | undefined): Promise<Jersey | undefined> {
  if (!j) return j;
  const map = await getOverrideMap();
  return merge(j, map.get(j.slug));
}

// ── Custom dresovi (dodani iz admina, spremljeni u DB) ────────────────────────
export type CustomRow = {
  id: string; slug: string; category: string; klub: string; igrac: string; liga: string; price: number;
  retro: boolean; vel: string; badge: string | null; stock: number | null; sizeStock: string | null;
  outOfStock: string | null; soldOutSizes: string | null; description: string | null; images: string; hidden: boolean;
};

function slugHashId(slug: string): number {
  let h = 0;
  for (let i = 0; i < slug.length; i++) h = (h * 31 + slug.charCodeAt(i)) | 0;
  return 900000 + (Math.abs(h) % 90000); // stabilan sintetički id (izvan raspona kataloga)
}

export function customToJersey(c: CustomRow): Jersey {
  const badge = c.badge === "bestseller" || c.badge === "novo" ? c.badge : undefined;
  const outOfStock = c.outOfStock === "all" || c.outOfStock === "adults" || c.outOfStock === "kids" ? c.outOfStock : undefined;
  let urls: string[] = [];
  try { urls = JSON.parse(c.images || "[]"); } catch { urls = []; }
  return {
    id: slugHashId(c.slug),
    slug: c.slug,
    klub: c.klub,
    igrac: c.igrac,
    liga: c.liga,
    retro: c.retro,
    vel: c.vel,
    price: c.price,
    badge,
    stock: c.stock ?? undefined,
    sizeStock: parseSizeStock(c.sizeStock),
    outOfStock,
    soldOutSizes: c.soldOutSizes ? c.soldOutSizes.split(",").map((s) => s.trim()).filter(Boolean) : undefined,
    descriptionOverride: c.description || undefined,
    images: urls.map((src) => ({ src, altLabel: `${c.klub} ${c.igrac}` })),
    isCustom: true,
    category: c.category || "dres"
  };
}

// Custom DRESOVI za katalog (bez streetweara).
async function getCustomJerseys(): Promise<Jersey[]> {
  const rows = await fetchCustomRows();
  return rows.map(customToJersey).filter((j) => (j.category ?? "dres") !== "streetwear");
}

// Streetwear proizvodi (zasebna stranica /streetwear). fetchCustomRows je već
// sortiran po createdAt desc, pa filtriranje čuva redoslijed.
export async function getStreetwearProducts(): Promise<Jersey[]> {
  const rows = await fetchCustomRows();
  return rows.filter((c) => (c.category ?? "dres") === "streetwear").map(customToJersey);
}

// Deterministička ocjena 4.5–5.0 + plauzibilan broj recenzija iz sluga.
function ratingFor(slug: string): { value: number; count: number } {
  let h = 0;
  for (let i = 0; i < slug.length; i++) h = (h * 31 + slug.charCodeAt(i)) | 0;
  h = Math.abs(h);
  const steps = [4.5, 4.6, 4.7, 4.8, 4.9, 5.0];
  return { value: steps[h % steps.length], count: 7 + (h % 48) };
}

// Slugovi koji su se barem jednom prodali (za prikaz zvjezdica). Best-effort.
async function getSoldSlugs(): Promise<Set<string>> {
  return new Set(await fetchSoldSlugs());
}

function withRating(j: Jersey, sold: Set<string>): Jersey {
  return sold.has(j.slug) ? { ...j, rating: ratingFor(j.slug) } : j;
}

// Puni katalog za shop: osnovni (s override-ima) + custom dresovi iz admina, s ocjenama.
export async function getCatalogProducts(base: Jersey[]): Promise<Jersey[]> {
  const [withOv, custom, sold] = await Promise.all([withOverrides(base), getCustomJerseys(), getSoldSlugs()]);
  return [...custom, ...withOv].map((j) => withRating(j, sold));
}

// Dohvat pojedinog proizvoda po slugu: prvo custom, pa osnovni + override.
// Kešira se po zahtjevu (React cache) — generateMetadata i stranica dijele isti
// poziv umjesto dva. Svi DB dohvati idu preko keširanih fetchera (bez novih upita).
export const getProductBySlug = cache(async (slug: string, base: Jersey | undefined): Promise<Jersey | undefined> => {
  const customRows = await fetchCustomRows();
  const c = customRows.find((r) => r.slug === slug);
  let product: Jersey | undefined = c ? customToJersey(c) : await jerseyWithOverride(base);
  if (!product) return product;

  // Ocjena samo ako se dres prodao.
  const sold = await getSoldSlugs();
  if (sold.has(slug)) product = { ...product, rating: ratingFor(slug) };
  return product;
});
