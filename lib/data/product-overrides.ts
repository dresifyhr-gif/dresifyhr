import "server-only";

import { prisma } from "@/lib/prisma";
import type { Jersey } from "@/lib/data/jerseys";

// Admin-managed overrides (price / stock) merged onto the static catalog. Best-effort:
// if the DB is unavailable or empty, the shop uses the base catalog unchanged.
type Override = { slug: string; price: number | null; outOfStock: string | null; soldOutSizes: string | null; hidden: boolean; badge: string | null };

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
