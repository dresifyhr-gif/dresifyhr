import { jerseys } from "@/lib/data/jerseys";
import { getJerseyGallery } from "@/lib/data/jersey-media";
import { JERSEY_PRICE_EUR, SITE_URL } from "@/lib/site";
import { repairText } from "@/lib/utils";

// Meta (Facebook/Instagram) catalog data feed — CSV.
// Connect in Commerce Manager: Data sources → Add items → Use a data feed →
// scheduled URL: https://dresifyshop.com/api/facebook-feed

export const dynamic = "force-static";

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

export function GET() {
  const rows = jerseys.map((product) => {
    const klub = repairText(product.klub);
    const igrac = repairText(product.igrac);
    const liga = repairText(product.liga);
    const price = product.price ?? JERSEY_PRICE_EUR;
    const image = getJerseyGallery(product.slug)[0]?.src ?? "";

    const isKomplet = product.liga === "Komplet";
    const title = isKomplet ? `${klub} ${igrac}` : `${klub} ${igrac} — nogometni dres`;
    const description = isKomplet
      ? `${klub} ${igrac}. Komplet uključuje dres, hlačice, loptu i kapu. Dostupno za djecu i odrasle. Dostava pouzećem po cijeloj Hrvatskoj.`
      : `Nogometni dres ${klub} ${igrac}. Dostupno za djecu (s hlačicama) i odrasle (S–XXL). Ušiveno ime i broj. Dostava pouzećem po cijeloj Hrvatskoj.`;

    return [
      product.slug,
      title,
      description,
      "in stock",
      "new",
      `${price.toFixed(2)} EUR`,
      `${SITE_URL}/dres/${product.slug}/`,
      image ? `${SITE_URL}${image}` : "",
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
      "Cache-Control": "public, max-age=3600",
    },
  });
}
