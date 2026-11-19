// "Ormar" (smjer G) — svi proizvodi koji imaju fotografiju na vješalici (lib/data/ormar-hanger.ts),
// povezani sa stvarnim proizvodima (statični katalog + override + custom iz admina, uklj. dugi rukav
// i trenirke). Skriveni i rasprodani se preskaču. Samo na serveru.
import "server-only";

import { getJerseySizeOptions, jerseys, type Jersey } from "@/lib/data/jerseys";
import { HANGER_IMAGES, KOMPLET_IMAGES, type HangerImages, type KompletImages } from "@/lib/data/ormar-hanger";
import { ORMAR_SLUGS, type OrmarItem } from "@/lib/data/ormar";
import { getCatalogProducts, getTrenirkaProducts } from "@/lib/data/product-overrides";
import { repairText } from "@/lib/utils";

export type OrmarGroup = "hrvatska" | "reprezentacije" | "klubovi" | "kompleti" | "dugi-rukav" | "trenirke";

// Slike za šipku: dres = leđa (+ prednja, + dječje hlačice na vlastitoj vješalici ako postoje);
// trenirka = jakna + hlače (obje obavezne) + prednja strana jakne ako postoji.
// komplet = jedna složena slika (dres + hlačice na vješalicama, lopta + kapa) u okviru dresa (0.82),
// pa na šipci ide kao "dres" bez prednje strane (bez okretanja) i bez zasebnih hlačica.
export type OrmarRailImages =
  | { kind: "dres"; back: string; front?: string; shorts?: string }
  | { kind: "trenirka"; jakna: string; hlace: string; hlaceHook: boolean; jaknaFront?: string };

export type OrmarRailItem = OrmarItem & { img: OrmarRailImages; group: OrmarGroup };

// Zamjenske slike leđa (prazno: Stanišić sada ima ispravnu sliku s kukom u ormar/hanger, 17.11.).
const FIXED_BACK: Record<string, string> = {};

// Hlače trenirke: većina slika ima samo šipku-vješalicu BEZ kuke (šipka bi sjela na šipku ormara).
// Ove dvije imaju vlastitu kuku; ostalima šipka (ormar-g-art) docrta kuku i spusti hlače ispod nje.
const PANTS_WITH_HOOK = new Set(["brazil-komplet", "portugal-ronaldo-nr7"]);

// Popularnost (redoslijed unutar dresova): ručno složen ORMAR_SLUGS, pa ostali po manifestu.
const RANK = new Map(ORMAR_SLUGS.map((s, i) => [s, i]));
const GROUP_ORDER: Record<OrmarGroup, number> = { hrvatska: 0, reprezentacije: 1, klubovi: 1, kompleti: 2, "dugi-rukav": 3, trenirke: 4 };

type AnyImages = HangerImages | KompletImages;

function groupOf(p: Jersey, img: AnyImages): OrmarGroup {
  if (img.kind === "komplet") return "kompleti";
  if (img.kind === "trenirka" || p.category === "trenirka") return "trenirke";
  if (p.category === "dugi-rukav" || /dugi-rukav|long-sleeve/.test(p.slug)) return "dugi-rukav";
  if (repairText(p.klub).trim().toLowerCase() === "hrvatska") return "hrvatska";
  if (p.liga === "Reprezentacija") return "reprezentacije";
  return "klubovi";
}

function isAvailable(p: Jersey) {
  if (p.hidden || p.outOfStock === "all") return false;
  const o = getJerseySizeOptions(p);
  const free = (arr: string[], out: boolean) => !out && arr.some((s) => !o.soldOutSizes.includes(s));
  return free(o.adults, o.adultsOutOfStock) || free(o.kids, o.kidsOutOfStock);
}

function railImages(slug: string, img: AnyImages): OrmarRailImages | null {
  if (img.kind === "komplet") return { kind: "dres", back: img.image };
  if (img.kind === "trenirka") {
    return img.jakna && img.hlace
      ? { kind: "trenirka", jakna: img.jakna, hlace: img.hlace, hlaceHook: PANTS_WITH_HOOK.has(slug), ...(img.jaknaFront ? { jaknaFront: img.jaknaFront } : {}) }
      : null;
  }
  return { kind: "dres", back: FIXED_BACK[slug] ?? img.back, front: img.front, ...(img.shorts ? { shorts: img.shorts } : {}) };
}

export async function getOrmarRailItems(): Promise<OrmarRailItem[]> {
  const [catalog, trenirke] = await Promise.all([getCatalogProducts(jerseys), getTrenirkaProducts()]);
  const bySlug = new Map<string, Jersey>();
  for (const p of [...trenirke, ...catalog]) if (!bySlug.has(p.slug)) bySlug.set(p.slug, p);

  const all: Record<string, AnyImages> = { ...HANGER_IMAGES, ...KOMPLET_IMAGES };
  const order = Object.keys(all);
  const out: (OrmarRailItem & { _k: [number, number] })[] = [];
  for (const slug of order) {
    const p = bySlug.get(slug);
    const raw = all[slug];
    if (!p || !raw || !isAvailable(p)) continue;
    const img = railImages(slug, raw);
    if (!img) continue;
    const group = groupOf(p, raw);
    // Kartice trebaju samo osnovne podatke (bez dugog opisa i galerije).
    const product: Jersey = { ...p, descriptionOverride: undefined, images: p.images?.slice(0, 2) };
    out.push({
      slug,
      cutout: img.kind === "dres" ? img.back : img.jakna,
      klub: p.klub,
      igrac: p.igrac,
      price: p.price ?? 20,
      href: `/dres/${slug}/`,
      product,
      img,
      group,
      _k: [GROUP_ORDER[group], RANK.get(slug) ?? 1000 + order.indexOf(slug)],
    });
  }
  out.sort((a, b) => a._k[0] - b._k[0] || a._k[1] - b._k[1]);
  return out.map(({ _k, ...it }) => it);
}
