import type { MetadataRoute } from "next";

import { blogPosts } from "@/lib/data/blog-posts";
import {
  getJerseyCategoryCollections,
  getJerseyClubCollections,
  getJerseyPlayerCollections
} from "@/lib/data/seo-collections";
import { jerseys } from "@/lib/data/jerseys";
import { prisma } from "@/lib/prisma";
import { absoluteUrl } from "@/lib/utils";

// Slugovi custom proizvoda (streetwear + eventualni custom dresovi) iz baze.
// Best-effort: ako baza nije dostupna, sitemap koristi samo statički katalog.
async function getCustomSlugs(): Promise<string[]> {
  try {
    if (!process.env.DATABASE_URL) return [];
    const rows = await prisma.customProduct.findMany({ where: { hidden: false }, select: { slug: true } });
    return rows.map((r) => r.slug);
  } catch {
    return [];
  }
}

// Datum zadnje promjene po slugu (iz productOverride/customProduct updatedAt).
// Kad se promijeni opis/cijena, Google to vidi u sitemapu i brže ponovno posjeti
// stranicu — pomaže onima "Discovered – currently not indexed". Iskreno: koristi
// STVARNI datum iz baze, ne "danas", pa Google signalu vjeruje.
async function getLastModMap(): Promise<Map<string, Date>> {
  const map = new Map<string, Date>();
  try {
    if (!process.env.DATABASE_URL) return map;
    const [ov, cu] = await Promise.all([
      prisma.productOverride.findMany({ select: { slug: true, updatedAt: true } }),
      prisma.customProduct.findMany({ select: { slug: true, updatedAt: true } })
    ]);
    for (const r of [...ov, ...cu]) if (r.updatedAt) map.set(r.slug, r.updatedAt);
  } catch {
    /* best-effort */
  }
  return map;
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const staticRoutes = ["", "/dresovi", "/streetwear", "/trenirke", "/kontakt", "/blog", "/o-nama", "/dostava-i-povrat", "/pravila-privatnosti", "/igre", "/igra", "/flappy", "/gadaj"];
  const categoryRoutes = (await getJerseyCategoryCollections()).map((collection) => collection.path);
  const clubRoutes = (await getJerseyClubCollections()).map((collection) => collection.path);
  const playerRoutes = (await getJerseyPlayerCollections()).map((collection) => collection.path);
  const customSlugs = await getCustomSlugs();
  const lastMod = await getLastModMap();

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
    }))
  ];
}
