"use client";

import Image from "next/image";
import Link from "next/link";

import { useCart } from "@/components/providers/cart-provider";
import { jerseys } from "@/lib/data/jerseys";
import { getJerseyGallery } from "@/lib/data/jersey-media";
import { JERSEY_PRICE_EUR } from "@/lib/site";
import { repairText } from "@/lib/utils";

// Cart cross-sell: suggests in-stock jerseys not already in the cart (bestsellers
// first) to lift average order value. Links to the product so the shopper picks a size.
export function CartUpsell({ onNavigate }: { onNavigate?: () => void }) {
  const { items } = useCart();
  const inCart = new Set(items.map((i) => i.slug));

  const suggestions = jerseys
    .filter((j) => j.liga !== "Komplet" && !j.outOfStock && !inCart.has(j.slug))
    .sort((a, b) => (b.badge === "bestseller" ? 1 : 0) - (a.badge === "bestseller" ? 1 : 0))
    .slice(0, 6);

  if (suggestions.length === 0) return null;

  return (
    <div className="border-t border-white/10 pt-3">
      <p className="mb-2 text-xs font-semibold uppercase tracking-[0.16em] text-white/50">Nadopuni narudžbu</p>
      <div className="flex gap-2 overflow-x-auto pb-1">
        {suggestions.map((s) => {
          const img = getJerseyGallery(s.slug)[0]?.src;
          return (
            <Link
              key={s.slug}
              href={`/dres/${s.slug}`}
              onClick={onNavigate}
              className="group w-24 shrink-0 rounded-lg border border-white/10 bg-[#0d0d0d] p-1.5 transition hover:border-accent/50"
            >
              <div className="relative aspect-square overflow-hidden rounded bg-[#111]">
                {img && <Image src={img} alt={`${s.klub} ${s.igrac}`} fill sizes="96px" className="object-cover" />}
              </div>
              <div className="mt-1 truncate text-[11px] font-medium text-white/80">{repairText(s.igrac)}</div>
              <div className="flex items-center justify-between">
                <span className="text-[10px] text-white/40">{repairText(s.klub)}</span>
                <span className="text-[11px] font-bold text-accent">{s.price ?? JERSEY_PRICE_EUR}€</span>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
