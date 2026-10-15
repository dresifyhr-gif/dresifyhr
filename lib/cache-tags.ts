import "server-only";

import { revalidateTag } from "next/cache";

// Javna trgovina drži podatke iz baze u kešu (da Neon može spavati), pa svaka
// promjena mora sama javiti kešu da se osvježi.
//
// try/catch hvata samo SINKRONU grešku revalidateTag (npr. izvan konteksta
// zahtjeva), da nikad ne sruši spremanje proizvoda ni narudžbu. Samo brisanje
// keša Next 14.2 radi tek NAKON odgovora i neuspjeh tiho proguta — to se ovdje
// ne vidi. Zato TTL u keširanim fetcherima (1 h proizvodi i kodovi, 6 h ostalo)
// ostaje sigurnosna mreža: izgubljeni signal se najkasnije tada sam ispravi.
export type CacheTag = "products" | "orders" | "testimonials" | "settings" | "promo-codes" | "ig-stats";

export function bustCache(tag: CacheTag) {
  try {
    revalidateTag(tag);
  } catch (error) {
    console.error(`[cache] revalidateTag("${tag}") nije uspio`, error);
  }
}
