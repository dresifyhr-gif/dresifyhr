import "server-only";

import { unstable_cache } from "next/cache";
import { cache } from "react";

import { dbQuery, withLastGood } from "@/lib/db-guard";
import { prisma } from "@/lib/prisma";
import type { Jersey } from "@/lib/data/jerseys";

// ── Keširani DB dohvati ───────────────────────────────────────────────────────
// Stranice su dinamičke (i18n cookie), pa bi bez keša svaki posjet i svaki bot
// gađao bazu. Prije je keš trajao 60 s — svaki posjet nakon isteka budio je Neon,
// pa baza nikad nije zaspala i potrošila je mjesečnu kvotu (ispad 15.10.2026.).
// Svježinu sad daje revalidateTag (admin spremanje i smanjenje zalihe →
// "products", narudžba → "orders"). TTL je samo sigurnosna mreža ako se signal
// izgubi (Next 14.2 ga može tiho progutati): 1 h za cijene/vidljivost/zalihe,
// 6 h za ocjene.
const PRODUCTS_TTL = 3600;
const SOLD_TTL = 21600;

// VAŽNO: keširane funkcije namjerno NEMAJU try/catch. U Next 14.2 unstable_cache
// sprema sve što funkcija VRATI — stari `catch { return [] }` je prazan popis
// spremao preko dobrih podataka, pa su tijekom ispada nestali streetwear i
// dresovi dodani kroz admin. Kad funkcija BACI grešku, ništa se ne sprema i Next
// nastavlja služiti zadnji dobar unos. Zamjena za grešku je u withLastGood.
// Ključevi su "-v2" da se napusti eventualni prazni unos iz vremena ispada.
const fetchOverrideRowsCached = unstable_cache(
  async () => {
    if (!process.env.DATABASE_URL) return [];
    return dbQuery(() => prisma.productOverride.findMany());
  },
  ["product-override-rows-v2"],
  { revalidate: PRODUCTS_TTL, tags: ["products"] }
);

const fetchCustomRowsCached = unstable_cache(
  async () => {
    if (!process.env.DATABASE_URL) return [] as CustomRow[];
    return (await dbQuery(() => prisma.customProduct.findMany({ where: { hidden: false }, orderBy: { createdAt: "desc" } }))) as unknown as CustomRow[];
  },
  ["custom-product-rows-v2"],
  { revalidate: PRODUCTS_TTL, tags: ["products"] }
);

const fetchSoldSlugsCached = unstable_cache(
  async () => {
    if (!process.env.DATABASE_URL) return [] as string[];
    // groupBy: baza vraća samo različite slugove (stotinjak), ne cijeli stupac
    // svih stavki narudžbi kao `distinct` (koji se razvrstava tek nakon prijenosa).
    const rows = await dbQuery(() => prisma.orderItem.groupBy({ by: ["slug"] }));
    return rows.map((r) => r.slug).filter((s): s is string => !!s);
  },
  ["sold-slugs-v2"],
  { revalidate: SOLD_TTL, tags: ["orders"] }
);

const fetchOverrideRows = () => withLastGood("overrides", [] as Awaited<ReturnType<typeof fetchOverrideRowsCached>>, fetchOverrideRowsCached);
const fetchCustomRows = () => withLastGood("custom", [] as CustomRow[], fetchCustomRowsCached);
const fetchSoldSlugs = () => withLastGood("sold", [] as string[], fetchSoldSlugsCached);

// Podaci za sitemap iz ISTOG keša (bez zasebnih upita koji bude bazu).
// NAMJERNO strogo (baca grešku): ako se sitemap generira dok baza ne radi, Next
// zadrži prethodni dobar sitemap umjesto da spremi verziju bez custom proizvoda.
// Datumi iz keša stižu kao tekst (unstable_cache ih serijalizira u JSON) → new Date().
export async function getSitemapProductData(): Promise<{ customSlugs: string[]; lastMod: Map<string, Date> }> {
  const [ov, cu] = await Promise.all([fetchOverrideRowsCached(), fetchCustomRowsCached()]);
  const lastMod = new Map<string, Date>();
  for (const r of [...ov, ...cu] as { slug: string; updatedAt?: Date | string | null }[]) {
    if (!r.updatedAt) continue;
    const d = new Date(r.updatedAt);
    if (!Number.isNaN(d.getTime())) lastMod.set(r.slug, d);
  }
  return { customSlugs: cu.map((r) => r.slug), lastMod };
}

// Admin-managed overrides (price / stock) merged onto the static catalog. Best-effort:
// if the DB is unavailable or empty, the shop uses the base catalog unchanged.
type Override = { slug: string; klub: string | null; igrac: string | null; liga: string | null; images: string | null; price: number | null; stock: number | null; sizeStock: string | null; outOfStock: string | null; soldOutSizes: string | null; sizes: string | null; hidden: boolean; badge: string | null; description: string | null; featured?: boolean };

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
  // null = override red NIKAD nije dirao stanje (npr. red je nastao samo zbog opisa
  // iz AI generatora) → zadrži statičku vrijednost iz kataloga. "" = admin izričito
  // rekao "na stanju". Prije je svaki null gazio statičko "adults"/"kids" u dostupno,
  // pa su rasprodani proizvodi prikazivali sve veličine.
  const outOfStock =
    ov.outOfStock == null
      ? j.outOfStock
      : ov.outOfStock === "all" || ov.outOfStock === "adults" || ov.outOfStock === "kids"
        ? ov.outOfStock
        : undefined;
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
    featured: ov.featured ?? j.featured,
    descriptionOverride: ov.description || undefined,
    soldOutSizes: ov.soldOutSizes != null ? (ov.soldOutSizes ? ov.soldOutSizes.split(",").map((s) => s.trim()).filter(Boolean) : []) : j.soldOutSizes,
    // Ručno postavljene veličine (prazno = zadana lista po kategoriji).
    customSizes: ov.sizes != null && ov.sizes.trim() ? ov.sizes.split(",").map((s) => s.trim()).filter(Boolean) : j.customSizes
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
  outOfStock: string | null; soldOutSizes: string | null; sizes: string | null; description: string | null; images: string; hidden: boolean;
  featured?: boolean;
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
    featured: Boolean(c.featured),
    stock: c.stock ?? undefined,
    sizeStock: parseSizeStock(c.sizeStock),
    outOfStock,
    soldOutSizes: c.soldOutSizes ? c.soldOutSizes.split(",").map((s) => s.trim()).filter(Boolean) : undefined,
    customSizes: c.sizes ? c.sizes.split(",").map((s) => s.trim()).filter(Boolean) : undefined,
    descriptionOverride: c.description || undefined,
    images: urls.map((src) => ({ src, altLabel: `${c.klub} ${c.igrac}` })),
    isCustom: true,
    category: c.category || "dres"
  };
}

// Custom DRESOVI za katalog (bez streetweara i trenirki — one imaju svoje stranice).
async function getCustomJerseys(): Promise<Jersey[]> {
  const rows = await fetchCustomRows();
  return rows.map(customToJersey).filter((j) => {
    const cat = j.category ?? "dres";
    return cat !== "streetwear" && cat !== "trenirka";
  });
}

// Streetwear proizvodi (zasebna stranica /streetwear). fetchCustomRows je već
// sortiran po createdAt desc, pa filtriranje čuva redoslijed.
export async function getStreetwearProducts(): Promise<Jersey[]> {
  const rows = await fetchCustomRows();
  return rows.filter((c) => (c.category ?? "dres") === "streetwear").map(customToJersey);
}

// Trenirke (kompleti: jakna + hlače) — zasebna stranica /trenirke.
export async function getTrenirkaProducts(): Promise<Jersey[]> {
  const rows = await fetchCustomRows();
  return rows.filter((c) => (c.category ?? "dres") === "trenirka").map(customToJersey);
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

// Zadani "Najprodavaniji" ako Gazda još nije ručno označio nijedan proizvod.
const DEFAULT_FEATURED_SLUGS = [
  "hrvatska-modric-2026",
  "milan-modric",
  "alnassr-ronaldo-zuti",
  "argentina-messi-retro",
  "bayern-kane-crveni",
  "dortmund-adeyemi",
  "atletico-griezmann",
  "real-bellingham"
];

// Proizvodi za sekciju "Najprodavaniji dresovi" na naslovnici.
// Ručno označeni u adminu (featured); ako ih nema, koristi se zadani popis.
export async function getFeaturedProducts(base: Jersey[], limit = 12): Promise<Jersey[]> {
  // "U top" (featured) može biti BILO KOJI proizvod — dres, streetwear ILI trenirka.
  // getCatalogProducts namjerno izostavlja streetwear/trenirke, pa ovdje uzimamo SVE
  // custom kategorije + katalog, da se svaki "u top" označen proizvod pojavi.
  const [withOv, customRows, sold] = await Promise.all([withOverrides(base), fetchCustomRows(), getSoldSlugs()]);
  const all = [...customRows.map(customToJersey), ...withOv].map((j) => withRating(j, sold));
  const picked = all.filter((j) => j.featured);
  if (picked.length) return picked.slice(0, limit);
  const bySlug = new Map(all.map((j) => [j.slug, j]));
  return DEFAULT_FEATURED_SLUGS.map((s) => bySlug.get(s)).filter((j): j is Jersey => Boolean(j));
}

// Svježe iz baze — SAMO za provjeru rasprodanih veličina na blagajni. Trgovina
// drži proizvode u kešu do 1 h; ako se signal o smanjenju zalihe izgubi, keš bi
// propustio upravo rasprodanu veličinu. Narudžba ionako budi bazu, pa ovo ne
// smeta spavanju. JEDAN upit za sve slugove (custom + override). Ista logika
// spajanja kao getProductBySlug (custom prvo, pa osnovni katalog + override);
// ako baza ne radi, pada na keširanu verziju (i zapiše to u log).
export async function getProductsFresh(items: { slug: string; base: Jersey | undefined }[]): Promise<Map<string, Jersey | undefined>> {
  const out = new Map<string, Jersey | undefined>();
  const unique = Array.from(new Map(items.map((i) => [i.slug, i])).values());
  if (!unique.length) return out;
  try {
    const slugs = unique.map((i) => i.slug);
    const [customs, overrides] = await Promise.all([
      dbQuery(() => prisma.customProduct.findMany({ where: { slug: { in: slugs }, hidden: false } })),
      dbQuery(() => prisma.productOverride.findMany({ where: { slug: { in: slugs } } }))
    ]);
    const cBy = new Map(customs.map((c) => [c.slug, c]));
    const oBy = new Map(overrides.map((o) => [o.slug, o]));
    for (const { slug, base } of unique) {
      const c = cBy.get(slug);
      if (c) out.set(slug, customToJersey(c as unknown as CustomRow));
      else out.set(slug, base ? merge(base, oBy.get(slug) as Override | undefined) : undefined);
    }
  } catch (error) {
    console.error("[orders] svježa provjera zaliha nije uspjela — koristim keš", error);
    for (const { slug, base } of unique) out.set(slug, await getProductBySlug(slug, base));
  }
  return out;
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
