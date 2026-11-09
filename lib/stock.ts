import "server-only";

import { bustCache } from "@/lib/cache-tags";
import { prisma } from "@/lib/prisma";

// Auto-smanjivanje zalihe po veličini nakon narudžbe — SAMO za veličine koje
// imaju upisan broj (poznata zaliha). Veličine bez broja = nepoznato → NE dira.
// Ako proizvod nema override/custom zapis sa sizeStock-om, ne stvara ga (Gazda
// tada ne zna količinu, pa se ostavlja "lažni broj" kao dosad). Best-effort.
function parseStock(raw: string | null): Record<string, number> {
  if (!raw) return {};
  try {
    const o = JSON.parse(raw);
    return o && typeof o === "object" ? (o as Record<string, number>) : {};
  } catch {
    return {};
  }
}

type OrderedItem = { slug?: string | null; size?: string | null; quantity?: number | null };

// Zajednička logika: sign -1 = skini (narudžba), sign +1 = vrati (otkaz/povrat).
// Dira SAMO veličine koje već imaju upisan broj — ista pravila kao kod skidanja,
// pa se nikad ne "izmisli" zaliha za veličinu koja se ne prati.
async function adjustSizeStock(items: OrderedItem[] | undefined | null, sign: 1 | -1): Promise<void> {
  if (!process.env.DATABASE_URL || !items?.length) return;

  let changed = false;
  for (const it of items) {
    const slug = (it.slug || "").trim();
    const size = (it.size || "").trim();
    const qty = Math.max(1, it.quantity || 1);
    if (!slug || !size) continue;

    try {
      // Custom proizvod (npr. streetwear, mystery) — ima svoj zapis.
      const custom = await prisma.customProduct.findUnique({ where: { slug }, select: { sizeStock: true } });
      if (custom) {
        const s = parseStock(custom.sizeStock);
        if (typeof s[size] === "number") {
          s[size] = Math.max(0, s[size] + sign * qty);
          await prisma.customProduct.update({ where: { slug }, data: { sizeStock: JSON.stringify(s) } });
          changed = true;
        }
        continue;
      }

      // Statični dres — mijenja SAMO ako već postoji override sa sizeStock-om.
      const ov = await prisma.productOverride.findUnique({ where: { slug }, select: { sizeStock: true } });
      if (ov?.sizeStock) {
        const s = parseStock(ov.sizeStock);
        if (typeof s[size] === "number") {
          s[size] = Math.max(0, s[size] + sign * qty);
          await prisma.productOverride.update({ where: { slug }, data: { sizeStock: JSON.stringify(s) } });
          changed = true;
        }
      }
    } catch (e) {
      console.error(`[stock] ${sign < 0 ? "decrement" : "increment"} failed`, slug, size, e);
    }
  }
  // Trgovina drži zalihe u kešu do 1 h — bez ovoga bi rasprodana veličina još
  // izgledala dostupnom (i provjera na blagajni bi je propustila).
  if (changed) bustCache("products");
}

export async function decrementSizeStock(items: OrderedItem[] | undefined | null): Promise<void> {
  return adjustSizeStock(items, -1);
}

// Vraćanje zalihe kad je narudžba otkazana / vraćena (paket se vratio).
export async function incrementSizeStock(items: OrderedItem[] | undefined | null): Promise<void> {
  return adjustSizeStock(items, 1);
}

// Za admin rute: učita stavke narudžbe iz baze i vrati (+1) ili ponovno skine (-1)
// zalihu. Zvati SAMO nakon stvarnog prijelaza statusa (updateMany count === 1), da
// dvoklik ne promijeni zalihu dvaput. Best-effort — nikad ne baca, ne ruši akciju.
// Ručne admin narudžbe nemaju slug → automatski se preskaču (nisu ni skidale zalihu).
export async function adjustOrderStock(orderId: string, sign: 1 | -1): Promise<void> {
  try {
    const items = await prisma.orderItem.findMany({
      where: { orderId },
      select: { slug: true, size: true, quantity: true }
    });
    await adjustSizeStock(items, sign);
  } catch (e) {
    console.error("[stock] adjustOrderStock failed", orderId, sign, e);
  }
}
