import "server-only";

import { prisma } from "@/lib/prisma";
import type { Jersey } from "@/lib/data/jerseys";

// Admin-managed overrides (price / stock) merged onto the static catalog. Best-effort:
// if the DB is unavailable or empty, the shop uses the base catalog unchanged.
type Override = { slug: string; price: number | null; outOfStock: string | null; soldOutSizes: string | null; hidden: boolean; badge: string | null; description: string | null };

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
  id: string; slug: string; klub: string; igrac: string; liga: string; price: number;
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
    isCustom: true
  };
}

async function getCustomJerseys(): Promise<Jersey[]> {
  try {
    if (!process.env.DATABASE_URL) return [];
    const rows = (await prisma.customProduct.findMany({ where: { hidden: false } })) as unknown as CustomRow[];
    return rows.map(customToJersey);
  } catch {
    return [];
  }
}

// Puni katalog za shop: osnovni (s override-ima) + custom dresovi iz admina.
export async function getCatalogProducts(base: Jersey[]): Promise<Jersey[]> {
  const [withOv, custom] = await Promise.all([withOverrides(base), getCustomJerseys()]);
  return [...custom, ...withOv];
}

// Dohvat pojedinog proizvoda po slugu: prvo custom (DB), pa osnovni + override.
export async function getProductBySlug(slug: string, base: Jersey | undefined): Promise<Jersey | undefined> {
  try {
    if (process.env.DATABASE_URL) {
      const c = (await prisma.customProduct.findUnique({ where: { slug } })) as unknown as CustomRow | null;
      if (c && !c.hidden) return customToJersey(c);
    }
  } catch {
    /* ignore */
  }
  return jerseyWithOverride(base);
}
