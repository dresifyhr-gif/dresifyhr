import { jerseys, isNationalTeam } from "@/lib/data/jerseys";
import { getCatalogProducts, getStreetwearProducts, getTrenirkaProducts } from "@/lib/data/product-overrides";
import { getJerseyGallery } from "@/lib/data/jersey-media";
import { JERSEY_PRICE_EUR, SITE_NAME, SITE_URL } from "@/lib/site";
import { repairText } from "@/lib/utils";

// Google Merchant Center product feed (RSS 2.0 / Google Shopping XML).
// Add in Merchant Center: Products → Feeds → scheduled fetch:
// https://dresifyshop.com/api/google-feed
// Uključuje SVE proizvode (statični katalog + custom dresovi + streetwear iz
// admina) da katalog nije nepotpun — zato je dinamičan (čita bazu).

export const dynamic = "force-dynamic";

function xmlEscape(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

export async function GET() {
  // Trenirke imaju svoju stranicu (/trenirke) pa nisu u getCatalogProducts — dodaj ih
  // izričito, inače ih katalog (Meta / Google Shopping) nikad ne vidi.
  const [catalog, streetwear, trenirke] = await Promise.all([getCatalogProducts(jerseys), getStreetwearProducts(), getTrenirkaProducts()]);
  const allProducts = [...catalog, ...streetwear, ...trenirke];
  const items = allProducts
    .map((product) => {
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

      return `    <item>
      <g:id>${xmlEscape(product.slug.slice(0, 50))}</g:id>
      <g:title>${xmlEscape(title)}</g:title>
      <g:description>${xmlEscape(description)}</g:description>
      <g:link>${SITE_URL}/dres/${xmlEscape(product.slug)}/</g:link>
      <g:image_link>${xmlEscape(image)}</g:image_link>
      <g:availability>in_stock</g:availability>
      <g:condition>new</g:condition>
      <g:price>${price.toFixed(2)} EUR</g:price>
      <g:brand>${xmlEscape(SITE_NAME)}</g:brand>
      <g:identifier_exists>no</g:identifier_exists>
      <g:product_type>${xmlEscape(liga)}</g:product_type>
      <g:google_product_category>5424</g:google_product_category>
    </item>`;
    })
    .join("\n");

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:g="http://base.google.com/ns/1.0">
  <channel>
    <title>${xmlEscape(SITE_NAME)}</title>
    <link>${SITE_URL}</link>
    <description>Nogometni dresovi — ${xmlEscape(SITE_NAME)}</description>
${items}
  </channel>
</rss>`;

  return new Response(xml, {
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
      // s-maxage: CDN drži feed 1 h, pa Merchant/Meta dohvati ne pokreću funkciju svaki put.
      // Kratki stale-while-revalidate: rijedak (dnevni) dohvat dobije SVJEŽ feed, ne jučerašnji.
      "Cache-Control": "public, max-age=3600, s-maxage=3600, stale-while-revalidate=300"
    }
  });
}
