import "server-only";

import { prisma } from "@/lib/prisma";
import type { Jersey } from "@/lib/data/jerseys";

// Admin-managed overrides (price / stock) merged onto the static catalog. Best-effort:
// if the DB is unavailable or empty, the shop uses the base catalog unchanged.
type Override = { slug: string; price: number | null; stock: number | null; sizeStock: string | null; outOfStock: string | null; soldOutSizes: string | null; hidden: boolean; badge: string | null; description: string | null };

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
  try {
    if (!process.env.DATABASE_URL) return new Map();
    const rows = await prisma.productOverride.findMany();
    return new Map(rows.map((r) => [r.slug, r]));
  } catch {
    return new Map();
  }
}

function merge(j: Jersey, ov?: Override): Jersey {
  if (!ov) return j;
  const outOfStock = ov.outOfStock === "all" || ov.outOfStock === "adults" || ov.outOfStock === "kids" ? ov.outOfStock : undefined;
  const badge = ov.badge === "bestseller" || ov.badge === "novo" ? ov.badge : undefined;
  return {
    ...j,
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
type CustomRow = {
  id: string; slug: string; category: string; klub: string; igrac: string; liga: string; price: number;
  retro: boolean; vel: string; badge: string | null; outOfStock: string | null;
  soldOutSizes: string | null; description: string | null; images: string; hidden: boolean;
};

function slugHashId(slug: string): number {
  let h = 0;
  for (let i = 0; i < slug.length; i++) h = (h * 31 + slug.charCodeAt(i)) | 0;
  return 900000 + (Math.abs(h) % 90000); // stabilan sintetički id (izvan raspona kataloga)
}

function customToJersey(c: CustomRow): Jersey {
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
  try {
    if (!process.env.DATABASE_URL) return [];
    const rows = (await prisma.customProduct.findMany({ where: { hidden: false } })) as unknown as CustomRow[];
    return rows.map(customToJersey).filter((j) => (j.category ?? "dres") !== "streetwear");
  } catch {
    return [];
  }
}

// Streetwear proizvodi (zasebna stranica /streetwear).
export async function getStreetwearProducts(): Promise<Jersey[]> {
  try {
    if (!process.env.DATABASE_URL) return [];
    const rows = (await prisma.customProduct.findMany({ where: { hidden: false, category: "streetwear" }, orderBy: { createdAt: "desc" } })) as unknown as CustomRow[];
    return rows.map(customToJersey);
  } catch {
    return [];
  }
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
  try {
    if (!process.env.DATABASE_URL) return new Set();
    const rows = await prisma.orderItem.findMany({ distinct: ["slug"], select: { slug: true } });
    return new Set(rows.map((r) => r.slug).filter((s): s is string => !!s));
  } catch {
    return new Set();
  }
}

function withRating(j: Jersey, sold: Set<string>): Jersey {
  return sold.has(j.slug) ? { ...j, rating: ratingFor(j.slug) } : j;
}

// Puni katalog za shop: osnovni (s override-ima) + custom dresovi iz admina, s ocjenama.
export async function getCatalogProducts(base: Jersey[]): Promise<Jersey[]> {
  const [withOv, custom, sold] = await Promise.all([withOverrides(base), getCustomJerseys(), getSoldSlugs()]);
  return [...custom, ...withOv].map((j) => withRating(j, sold));
}

// Dohvat pojedinog proizvoda po slugu: prvo custom (DB), pa osnovni + override.
export async function getProductBySlug(slug: string, base: Jersey | undefined): Promise<Jersey | undefined> {
  let product: Jersey | undefined;
  try {
    if (process.env.DATABASE_URL) {
      const c = (await prisma.customProduct.findUnique({ where: { slug } })) as unknown as CustomRow | null;
      if (c && !c.hidden) product = customToJersey(c);
    }
  } catch {
    /* ignore */
  }
  if (!product) product = await jerseyWithOverride(base);
  if (!product) return product;

  // Ocjena samo ako se dres prodao.
  try {
    if (process.env.DATABASE_URL) {
      const sold = await prisma.orderItem.findFirst({ where: { slug }, select: { id: true } });
      if (sold) product = { ...product, rating: ratingFor(slug) };
    }
  } catch {
    /* ignore */
  }
  return product;
}
