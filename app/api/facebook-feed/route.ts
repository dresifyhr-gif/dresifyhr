import { jerseys, isNationalTeam } from "@/lib/data/jerseys";
import { getCatalogProducts, getStreetwearProducts, getTrenirkaProducts } from "@/lib/data/product-overrides";
import { getJerseyGallery } from "@/lib/data/jersey-media";
import { JERSEY_PRICE_EUR, SITE_URL } from "@/lib/site";
import { repairText } from "@/lib/utils";

// Meta (Facebook/Instagram) catalog data feed — CSV.
// Connect in Commerce Manager: Data sources → Add items → Use a data feed →
// scheduled URL: https://dresifyshop.com/api/facebook-feed
// Uključuje SVE proizvode (statični + custom + streetwear) da pixel eventi ne
// budu "unmatched" (id = slug, isto što pixel šalje). Dinamičan (čita bazu).

export const dynamic = "force-dynamic";

const HEADER = [
  "id",
  "title",
  "description",
  "availability",
  "condition",
  "price",
  "link",
  "image_link",
  "brand",
  "product_type",
] as const;

function csvCell(value: string) {
  return `"${value.replace(/"/g, '""')}"`;
}

export async function GET() {
  // Trenirke imaju svoju stranicu (/trenirke) pa nisu u getCatalogProducts — dodaj ih
  // izričito, inače ih katalog (Meta / Google Shopping) nikad ne vidi.
  const [catalog, streetwear, trenirke] = await Promise.all([getCatalogProducts(jerseys), getStreetwearProducts(), getTrenirkaProducts()]);
  const allProducts = [...catalog, ...streetwear, ...trenirke];
  const rows = allProducts.map((product) => {
    const klub = repairText(product.klub);
    const igrac = repairText(product.igrac);
    const liga = repairText(product.liga);
    const price = product.price ?? JERSEY_PRICE_EUR;
    const rawImage = product.images?.[0]?.src ?? getJerseyGallery(product.slug)[0]?.src ?? "";
    const image = rawImage ? (rawImage.startsWith("http") ? rawImage : `${SITE_URL}${rawImage}`) : "";

    const isKomplet = product.liga === "Komplet";
    const adultRange = isNationalTeam(product) ? "S–XXL" : "S–XL";
    const isTrenirka = product.category === "trenirka";
    const isLongSleeve = product.category === "dugi-rukav";
    const title = isKomplet
      ? `${klub} ${igrac}`
      : isTrenirka
        ? `${klub} ${igrac} — trenirka (jakna + hlače)`
        : isLongSleeve
          ? `${klub} ${igrac} — dres dugih rukava`
          : `${klub} ${igrac} — nogometni dres`;
    const description = isKomplet
      ? `${klub} ${igrac}. Komplet uključuje dres, hlačice, loptu i kapu. Dostupno za djecu i odrasle. Dostava pouzećem po cijeloj Hrvatskoj.`
      : isTrenirka
        ? `Trenirka ${klub} ${igrac} — komplet jakna + hlače. Dostupne veličine odaberi na stranici. Dostava pouzećem po cijeloj Hrvatskoj.`
        : isLongSleeve
          ? `Dres dugih rukava ${klub} ${igrac}. Veličine 152–176 i S–L, samo dres (bez hlačica). Dostava pouzećem po cijeloj Hrvatskoj.`
          : `Nogometni dres ${klub} ${igrac}. Dostupno za djecu (s hlačicama) i odrasle (${adultRange}). Ušiveno ime i broj. Dostava pouzećem po cijeloj Hrvatskoj.`;

    return [
      product.slug.slice(0, 50), // Google/Meta id max 50 znakova (dugi custom slugovi su bili odbijeni)
      title,
      description,
      "in stock",
      "new",
      `${price.toFixed(2)} EUR`,
      `${SITE_URL}/dres/${product.slug}/`,
      image,
      "Dresify",
      liga,
    ]
      .map((cell) => csvCell(String(cell)))
      .join(",");
  });

  const csv = [HEADER.join(","), ...rows].join("\n");

  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      // s-maxage: CDN drži feed 1 h, pa Merchant/Meta dohvati ne pokreću funkciju svaki put.
      // Kratki stale-while-revalidate: rijedak (dnevni) dohvat dobije SVJEŽ feed, ne jučerašnji.
      "Cache-Control": "public, max-age=3600, s-maxage=3600, stale-while-revalidate=300",
    },
  });
}
