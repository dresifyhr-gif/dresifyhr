import type { EMega } from "@/components/clean-demo/final/e-css";
import { getFeaturedCategoryCollections, getFeaturedClubCollections, getFeaturedPlayerCollections } from "@/lib/data/seo-collections";

/** Mega-izbornik (prave kolekcije) — layout ga dohvaća jednom. */
export async function getNoviMega(): Promise<EMega> {
  const toLink = (c: { label: string; path: string }) => ({ label: c.label, href: `${c.path.replace(/\/$/, "")}/` });
  return {
    categories: (await getFeaturedCategoryCollections(6)).map(toLink),
    clubs: (await getFeaturedClubCollections(8)).map(toLink),
    players: (await getFeaturedPlayerCollections(8)).map(toLink),
  };
}

