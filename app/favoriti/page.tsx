import { auth } from "@clerk/nextjs/server";

import { FavoritesPage } from "@/components/site/favorites-page";
import { jerseys, type Jersey } from "@/lib/data/jerseys";
import { forCards, getCatalogProducts, getStreetwearProducts, getTrenirkaProducts } from "@/lib/data/product-overrides";
import { prisma } from "@/lib/prisma";
import { buildMetadata } from "@/lib/seo";

export const metadata = buildMetadata({
  title: "Favoriti",
  description: "Tvoji spremljeni dresovi na jednom mjestu.",
  path: "/favoriti",
  noindex: true
});

// Popis ovisi o prijavljenom kupcu — uvijek svježe.
export const dynamic = "force-dynamic";

export default async function FavoritiRoute() {
  const { userId } = await auth();

  let products: Jersey[] = [];
  if (!userId) {
    // Gost: favoriti su na uređaju — pošalji katalog, klijent filtrira po srcima.
    try {
      const [catalog, streetwear, trenirke] = await Promise.all([getCatalogProducts(jerseys), getStreetwearProducts(), getTrenirkaProducts()]);
      const seen = new Set<string>();
      products = forCards([...catalog, ...streetwear, ...trenirke].filter((j) => (seen.has(j.slug) ? false : (seen.add(j.slug), true))));
    } catch (error) {
      console.error("[favoriti] katalog nije uspio", error);
    }
  } else {
    try {
      const rows = await prisma.wishlistItem.findMany({
        where: { userId },
        orderBy: { createdAt: "desc" },
        select: { slug: true }
      });
      if (rows.length) {
        // Katalog dolazi iz istih keširanih izvora kao /dresovi, /streetwear i /trenirke.
        const [catalog, streetwear, trenirke] = await Promise.all([
          getCatalogProducts(jerseys),
          getStreetwearProducts(),
          getTrenirkaProducts()
        ]);
        const bySlug = new Map<string, Jersey>();
        for (const j of [...catalog, ...streetwear, ...trenirke]) if (!bySlug.has(j.slug)) bySlug.set(j.slug, j);
        products = forCards(rows.map((r) => bySlug.get(r.slug)).filter((j): j is Jersey => Boolean(j)));
      }
    } catch (error) {
      console.error("[favoriti] dohvat nije uspio", error);
    }
  }

  return <FavoritesPage signedIn={Boolean(userId)} products={products} />;
}
