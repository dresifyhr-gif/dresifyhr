import "server-only";

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

export async function decrementSizeStock(items: OrderedItem[] | undefined | null): Promise<void> {
  if (!process.env.DATABASE_URL || !items?.length) return;

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
          s[size] = Math.max(0, s[size] - qty);
          await prisma.customProduct.update({ where: { slug }, data: { sizeStock: JSON.stringify(s) } });
        }
        continue;
      }

      // Statični dres — smanji SAMO ako već postoji override sa sizeStock-om.
      const ov = await prisma.productOverride.findUnique({ where: { slug }, select: { sizeStock: true } });
      if (ov?.sizeStock) {
        const s = parseStock(ov.sizeStock);
        if (typeof s[size] === "number") {
          s[size] = Math.max(0, s[size] - qty);
          await prisma.productOverride.update({ where: { slug }, data: { sizeStock: JSON.stringify(s) } });
        }
      }
    } catch (e) {
      console.error("[stock] decrement failed", slug, size, e);
    }
  }
}
