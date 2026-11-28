// Zaliha po veličinama ↔ Excel (Igor 28.11.): izvoz sa slikom dresa (da se zna koji je koji
// po izgledu) i uvoz natrag. Jedan red = jedan proizvod, stupci = veličine.
import { prisma } from "@/lib/prisma";
import { jerseys, getJerseySizeOptions, trenirkaSizes, type Jersey } from "@/lib/data/jerseys";
import { customToJersey, getProductsFresh, type CustomRow } from "@/lib/data/product-overrides";
import { HANGER_IMAGES } from "@/lib/data/ormar-hanger";

// Kanonski redoslijed stupaca (dječje → odrasle → trenirke); posebne veličine idu iza.
export const SIZE_ORDER = ["104", "116", "128", "140", "152", "164", "176", "XS", "S", "M", "L", "XL", "XXL", "110/116", "128/134", "158/164", "170/176"];
export const SNAPSHOT_SHEET = "_izvoz"; // skriveni list: što je bilo u izvozu (za usporedbu pri uvozu)

export type StockRow = {
  slug: string;
  klub: string;
  igrac: string;
  category: string;
  custom: boolean;
  sizes: string[]; // dopuštene veličine proizvoda
  kids: string[]; // isto razvrstavanje kao dućan (getJerseySizeOptions)
  adults: string[];
  shown: string[]; // veličine koje dućan trenutno nudi (trenirka: samo upisane)
  stock: Record<string, number> | null; // trenutno upisano po veličini (null = nije upisano)
  outOfStock: string | null;
  soldOut: string[]; // ručno označene rasprodane veličine (kvačice u adminu)
  image: string | null; // put do slike (vješalica sprijeda, inače prva slika)
};

function sizeInfo(p: Jersey) {
  const clean = { ...p, outOfStock: undefined, soldOutSizes: [] } as Jersey;
  const o = getJerseySizeOptions(clean);
  const shown = [...o.kids, ...o.adults];
  // Trenirka: dućan nudi samo upisane veličine — u Excelu ipak pokaži cijeli raspon.
  if (p.category === "trenirka" && !(p.customSizes && p.customSizes.length)) {
    return { sizes: [...trenirkaSizes] as string[], kids: [] as string[], adults: [...trenirkaSizes] as string[], shown };
  }
  return { sizes: shown, kids: o.kids, adults: o.adults, shown };
}

function imageOf(p: Jersey): string | null {
  const h = HANGER_IMAGES[p.slug];
  if (h?.kind === "dres") return h.front ?? h.back;
  if (h?.kind === "trenirka") return h.jaknaFront ?? h.jakna ?? null;
  return p.images?.[0]?.src ?? null;
}

// Svi vidljivi proizvodi (katalog + custom dresovi, streetwear, trenirke), svježe iz baze.
export async function loadStockRows(): Promise<StockRow[]> {
  const customRows = (await prisma.customProduct.findMany({ where: { hidden: false }, orderBy: { createdAt: "desc" } })) as unknown as CustomRow[];
  const customSlugs = new Set(customRows.map((c) => c.slug));
  const hiddenOv = new Set((await prisma.productOverride.findMany({ where: { hidden: true }, select: { slug: true } })).map((o) => o.slug));
  const fresh = await getProductsFresh(jerseys.filter((j) => !customSlugs.has(j.slug) && !hiddenOv.has(j.slug)).map((j) => ({ slug: j.slug, base: j })));
  const list: { p: Jersey; custom: boolean }[] = [
    ...customRows.map((c) => ({ p: customToJersey(c), custom: true })),
    ...[...fresh.values()].filter((p): p is Jersey => !!p && !p.hidden).map((p) => ({ p, custom: false }))
  ];
  return list.map(({ p, custom }) => ({
    slug: p.slug,
    klub: p.klub,
    igrac: p.igrac,
    category: p.category ?? "dres",
    custom,
    ...sizeInfo(p),
    stock: p.sizeStock && Object.keys(p.sizeStock).length ? p.sizeStock : null,
    outOfStock: p.outOfStock ?? null,
    soldOut: p.soldOutSizes ?? [],
    image: imageOf(p)
  }));
}

// Stupci veličina za izvoz: kanonski redoslijed + posebne (custom) veličine iza.
export function sizeColumns(rows: StockRow[]): string[] {
  const used = new Set(rows.flatMap((r) => r.sizes));
  const extra = [...used].filter((s) => !SIZE_ORDER.includes(s)).sort();
  return [...SIZE_ORDER.filter((s) => used.has(s)), ...extra];
}

// Nova zaliha nakon uvoza: PROMIJENJENE veličine se prepisuju, ostale ostaju kakve su bile —
// i njihova oznaka "rasprodano" (ručna ili "sve/odrasli/djeca rasprodano").
export function mergeStock(row: StockRow, entered: Record<string, number>) {
  const stock: Record<string, number> = { ...(row.stock ?? {}) };
  for (const [s, n] of Object.entries(entered)) if (row.sizes.includes(s)) stock[s] = n;
  const wasOut = (s: string) =>
    row.soldOut.includes(s) || row.outOfStock === "all" ||
    (row.outOfStock === "adults" && row.adults.includes(s)) || (row.outOfStock === "kids" && row.kids.includes(s));
  // Promijenjena veličina: odlučuje novi broj. Nedirana: staro stanje (broj 0 ILI oznaka).
  const isZero = (s: string) => (s in entered ? entered[s] <= 0 : (s in stock && stock[s] <= 0) || wasOut(s));
  const soldOutSizes = row.sizes.filter(isZero);
  const allZero = (arr: string[]) => arr.length > 0 && arr.every(isZero);
  const outOfStock = allZero(row.sizes) ? "all" : row.kids.length && allZero(row.adults) ? "adults" : row.adults.length && allZero(row.kids) ? "kids" : "";
  return { stock, soldOutSizes: soldOutSizes.join(","), outOfStock };
}
