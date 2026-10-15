import type { MetadataRoute } from "next";

import { blogPosts } from "@/lib/data/blog-posts";
import {
  getJerseyCategoryCollections,
  getJerseyClubCollections,
  getJerseyPlayerCollections
} from "@/lib/data/seo-collections";
import { jerseys } from "@/lib/data/jerseys";
import { getSitemapProductData } from "@/lib/data/product-overrides";
import { absoluteUrl } from "@/lib/utils";

// Custom proizvodi i datumi zadnje promjene (productOverride/customProduct
// updatedAt) dolaze iz ISTOG keša kao trgovina — bez zasebnih upita koji bude
// bazu. Kad se promijeni opis/cijena, Google to vidi u sitemapu i brže ponovno
// posjeti stranicu; koristi se STVARNI datum iz baze, ne "danas".
// getSitemapProductData je strog: ako baza ne radi, Next zadrži prethodni dobar
// sitemap umjesto da spremi verziju bez custom proizvoda.

// Najviše 1 h (inače bi sitemap naslijedio TTL keša).
export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const staticRoutes = ["", "/dresovi", "/kompleti", "/streetwear", "/trenirke", "/kontakt", "/blog", "/o-nama", "/dostava-i-povrat", "/pravila-privatnosti", "/igre", "/igra", "/flappy", "/gadaj"];
  const categoryRoutes = (await getJerseyCategoryCollections()).map((collection) => collection.path);
  const clubRoutes = (await getJerseyClubCollections()).map((collection) => collection.path);
  const playerRoutes = (await getJerseyPlayerCollections()).map((collection) => collection.path);
  const { customSlugs, lastMod } = await getSitemapProductData();

  return [
    ...staticRoutes.map((route) => ({
      url: absoluteUrl(route || "/"),
      changeFrequency: "weekly" as const,
      priority: route === "" ? 1 : 0.85
    })),
    ...categoryRoutes.map((route) => ({
      url: absoluteUrl(route),
      changeFrequency: "weekly" as const,
      priority: 0.82
    })),
    ...clubRoutes.map((route) => ({
      url: absoluteUrl(route),
      changeFrequency: "weekly" as const,
      priority: 0.8
    })),
    ...playerRoutes.map((route) => ({
      url: absoluteUrl(route),
      changeFrequency: "weekly" as const,
      priority: 0.78
    })),
    ...jerseys.map((product) => ({
      url: absoluteUrl(`/dres/${product.slug}`),
      lastModified: lastMod.get(product.slug),
      changeFrequency: "weekly" as const,
      priority: 0.7
    })),
    ...customSlugs.map((slug) => ({
      url: absoluteUrl(`/dres/${slug}`),
      lastModified: lastMod.get(slug),
      changeFrequency: "weekly" as const,
      priority: 0.7
    })),
    ...blogPosts.map((post) => ({
      url: absoluteUrl(`/blog/${post.slug}`),
      changeFrequency: "monthly" as const,
      priority: 0.62
    })),
    // PS5 nagradna igra — landing kampanje. Živa je, ali dosad izostavljena iz
    // sitemapa; niži prioritet jer je promotivna, ne katalog.
    {
      url: absoluteUrl("/ps5"),
      changeFrequency: "weekly" as const,
      priority: 0.5
    }
  ];
}
