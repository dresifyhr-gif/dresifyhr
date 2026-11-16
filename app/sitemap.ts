import type { MetadataRoute } from "next";

import { blogPosts } from "@/lib/data/blog-posts";
import {
  getJerseyCategoryCollections,
  getJerseyClubCollections,
  getJerseyPlayerCollections
} from "@/lib/data/seo-collections";
import { REDIRECTED_PRODUCT_SLUGS, jerseys, type Jersey } from "@/lib/data/jerseys";
import { getSitemapProductData, withOverrides } from "@/lib/data/product-overrides";
import { absoluteUrl } from "@/lib/utils";

// Custom proizvodi i datumi zadnje promjene (productOverride/customProduct
// updatedAt) dolaze iz ISTOG keša kao trgovina — bez zasebnih upita koji bude
// bazu. Kad se promijeni opis/cijena, Google to vidi u sitemapu i brže ponovno
// posjeti stranicu; koristi se STVARNI datum iz baze, ne "danas".
// getSitemapProductData je strog: ako baza ne radi, Next zadrži prethodni dobar
// sitemap umjesto da spremi verziju bez custom proizvoda.

// Najviše 1 h (inače bi sitemap naslijedio TTL keša).
export const revalidate = 3600;

// Pri BUILDU (novi deploy) nema prethodnog sitemapa koji bi Next mogao zadržati,
// pa bi stroga greška srušila cijeli deploy — baš kad baza ne radi i treba
// objaviti popravak. Zato se pri buildu pada na statični katalog; u radu (ISR)
// greška se propušta i Next zadrži zadnji dobar sitemap.
async function sitemapProductData(): Promise<{ customSlugs: string[]; lastMod: Map<string, Date> }> {
  try {
    return await getSitemapProductData();
  } catch (error) {
    if (process.env.NEXT_PHASE !== "phase-production-build") throw error;
    console.error("[sitemap] baza nedostupna pri buildu — samo statični katalog", error);
    return { customSlugs: [], lastMod: new Map() };
  }
}

// Najnoviji datum promjene među proizvodima landinga (undefined ako nijedan nema datum).
function newestLastMod(products: Jersey[], lastMod: Map<string, Date>): Date | undefined {
  let newest: Date | undefined;
  for (const p of products) {
    const d = lastMod.get(p.slug);
    if (d && (!newest || d > newest)) newest = d;
  }
  return newest;
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  // Statične stranice namjerno BEZ lastmod — nemamo točan datum promjene, a
  // izmišljeni ("danas") Google nauči ignorirati.
  const staticRoutes = ["", "/dresovi", "/kompleti", "/slozi-mix", "/streetwear", "/trenirke", "/kontakt", "/blog", "/o-nama", "/dostava-i-povrat", "/pravila-privatnosti", "/igre", "/igra", "/kviz", "/pehar", "/zongliranje"];
  const { customSlugs, lastMod } = await sitemapProductData();
  const landing = (collections: { path: string; products: Jersey[] }[]) =>
    collections.map((collection) => ({ path: collection.path, lastModified: newestLastMod(collection.products, lastMod) }));
  const categoryRoutes = landing(await getJerseyCategoryCollections());
  const clubRoutes = landing(await getJerseyClubCollections());
  const playerRoutes = landing(await getJerseyPlayerCollections());
  // Isti filtar kao katalog: bez proizvoda skrivenih u adminu i bez slugova s
  // 301/308 (jerseys ih već izbacuje; ovdje i za custom slugove).
  const products = (await withOverrides(jerseys)).filter((p) => !REDIRECTED_PRODUCT_SLUGS.has(p.slug));
  const customs = customSlugs.filter((slug) => !REDIRECTED_PRODUCT_SLUGS.has(slug));

  return [
    ...staticRoutes.map((route) => ({
      url: absoluteUrl(route || "/"),
      changeFrequency: "weekly" as const,
      priority: route === "" ? 1 : 0.85
    })),
    ...categoryRoutes.map((route) => ({
      url: absoluteUrl(route.path),
      lastModified: route.lastModified,
      changeFrequency: "weekly" as const,
      priority: 0.82
    })),
    ...clubRoutes.map((route) => ({
      url: absoluteUrl(route.path),
      lastModified: route.lastModified,
      changeFrequency: "weekly" as const,
      priority: 0.8
    })),
    ...playerRoutes.map((route) => ({
      url: absoluteUrl(route.path),
      lastModified: route.lastModified,
      changeFrequency: "weekly" as const,
      priority: 0.78
    })),
    ...products.map((product) => ({
      url: absoluteUrl(`/dres/${product.slug}`),
      lastModified: lastMod.get(product.slug),
      changeFrequency: "weekly" as const,
      priority: 0.7
    })),
    ...customs.map((slug) => ({
      url: absoluteUrl(`/dres/${slug}`),
      lastModified: lastMod.get(slug),
      changeFrequency: "weekly" as const,
      priority: 0.7
    })),
    ...blogPosts.map((post) => ({
      url: absoluteUrl(`/blog/${post.slug}`),
      lastModified: post.updatedAt ?? post.publishedAt,
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
