import type { Jersey } from "@/lib/data/jerseys";
import { getJerseyGallery } from "@/lib/data/jersey-media";

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

/** Hero proizvod po slugu, uz mekani pad na prvi hrvatski dres sa slikom. */
export function resolveHomeDrop(products: Jersey[]): HomeDrop | null {
  const bySlug = products.find((p) => p.slug === HOME_DROP.slug);
  const fallback =
    bySlug ??
    products.find((p) => p.klub === "Hrvatska" && canFeature(p) && p.liga !== "Komplet" && firstImage(p));
  if (!fallback || !canFeature(fallback)) return null;

  const isConfigured = fallback.slug === HOME_DROP.slug;
  const kidsOnly =
    fallback.outOfStock === "adults" || (!fallback.vel?.includes("Odrasli") && fallback.vel?.includes("Djeca"));

  return {
    slug: fallback.slug,
    headline: HOME_DROP.headline,
    kicker: HOME_DROP.kicker,
    live: HOME_DROP.live,
    name: isConfigured ? HOME_DROP.name : fallback.igrac.split("—")[0].replace(/\bnr\s*/i, "").trim(),
    sub: isConfigured ? HOME_DROP.sub : fallback.igrac.split("—")[1]?.trim() ?? "",
    klub: fallback.klub,
    igrac: fallback.igrac,
    price: fallback.price ?? 20,
    image: firstImage(fallback),
    imageAlt: `${fallback.klub} ${fallback.igrac} — dres`,
    kidsOnly: Boolean(kidsOnly)
  };
}
