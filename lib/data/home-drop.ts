import { getJerseySizeOptions, type Jersey, type StageImage } from "@/lib/data/jerseys";
import { getJerseyGallery } from "@/lib/data/jersey-media";
import { stageImageFor } from "@/lib/data/stage-images";

// Dres koji se NIKAD ne smije isticati (vlasnik: loš dres) — ni u heroju, ni u
// railovima, ni na pločicama kategorija. Na popisu kataloga može ostati.
export const NEVER_FEATURE_SLUGS = new Set(["hrvatska-modric-nr10-crveni-rukav-2026"]);

// Koncept A "Matchday Drop": hero je konfiguracija, ne hardkodirana slika.
// Slika i cijena dolaze iz STVARNOG kataloga (getCatalogProducts → overrides/Blob).
// Za novi "drop" promijeni samo ovaj objekt.
export const HOME_DROP = {
  slug: "hrvatska-gvardiol-2026",
  headline: "Vatreni",
  kicker: "Hrvatska · Kolekcija 2026",
  live: "Drop — SP 2026",
  name: "Gvardiol 4",
  sub: "domaći 2026"
} as const;

export type HomeDrop = {
  slug: string;
  headline: string;
  kicker: string;
  live: string;
  name: string;
  sub: string;
  klub: string;
  igrac: string;
  price: number;
  image?: string;
  /** Izrezani dres (pravi 3D snimak ili izrezani render) za tamnu pozornicu. */
  stage?: StageImage;
  imageAlt: string;
  /** Odrasle veličine nisu dostupne → kupac realno dobiva dječji dres + hlačice. */
  kidsOnly: boolean;
};

export function firstImage(p: Pick<Jersey, "slug" | "images">): string | undefined {
  return p.images?.[0]?.src ?? getJerseyGallery(p.slug)[0]?.src;
}

export function canFeature(p: Pick<Jersey, "slug">) {
  return !NEVER_FEATURE_SLUGS.has(p.slug);
}

/** Koliko veličina kupac STVARNO može odabrati (bez rasprodanih). */
export function availableSizeCount(p: Jersey) {
  const o = getJerseySizeOptions(p);
  const adults = o.adultsOutOfStock ? [] : o.adults;
  const kids = o.kidsOutOfStock ? [] : o.kids;
  return [...adults, ...kids].filter((s) => !o.soldOutSizes.includes(s)).length;
}

// Hero mora biti dres koji se realno može kupiti: ne rasprodan i s barem 4 slobodne veličine.
const MIN_HERO_SIZES = 4;
const heroReady = (p: Jersey) =>
  canFeature(p) && p.outOfStock !== "all" && Boolean(firstImage(p)) && availableSizeCount(p) >= MIN_HERO_SIZES;

/** "Vušković nr22 — SP 2026" → { name: "Vušković 22", sub: "SP 2026" } */
function shortName(igrac: string) {
  const [head, ...rest] = igrac.split(/\s+[—–-]\s+/);
  return { name: head.replace(/\bnr\.?\s*(\d+)/i, "$1").trim(), sub: rest.join(" · ") };
}

/**
 * Hero proizvod: HOME_DROP.slug ako je na zalihi; inače prvi hrvatski dres (ne komplet,
 * ne dugi rukav) koji ima slobodnih veličina — prednost onima s izrezanim 3D snimkom.
 */
export function resolveHomeDrop(products: Jersey[]): HomeDrop | null {
  const configured = products.find((p) => p.slug === HOME_DROP.slug);
  const candidates = products.filter(
    (p) => p.klub === "Hrvatska" && p.liga !== "Komplet" && p.category !== "dugi-rukav" && heroReady(p)
  );
  const pick =
    (configured && heroReady(configured) ? configured : undefined) ??
    candidates.find((p) => stageImageFor(p)) ??
    candidates[0] ??
    (configured && canFeature(configured) ? configured : undefined);
  if (!pick) return null;

  const isConfigured = pick.slug === HOME_DROP.slug;
  const kidsOnly = pick.outOfStock === "adults" || (!pick.vel?.includes("Odrasli") && pick.vel?.includes("Djeca"));
  const short = shortName(pick.igrac);

  return {
    slug: pick.slug,
    headline: HOME_DROP.headline,
    kicker: HOME_DROP.kicker,
    live: HOME_DROP.live,
    name: isConfigured ? HOME_DROP.name : short.name,
    sub: isConfigured ? HOME_DROP.sub : short.sub,
    klub: pick.klub,
    igrac: pick.igrac,
    price: pick.price ?? 20,
    image: firstImage(pick),
    stage: stageImageFor(pick),
    imageAlt: `${pick.klub} ${pick.igrac} — dres`,
    kidsOnly: Boolean(kidsOnly)
  };
}
