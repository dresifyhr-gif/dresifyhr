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
    <div>
      <p className="mb-2 text-[10.5px] font-bold uppercase tracking-[0.16em] text-mute">Nadopuni narudžbu</p>
      <div className="flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {suggestions.map((s) => {
          const img = getJerseyGallery(s.slug)[0]?.src;
          return (
            <Link
              key={s.slug}
              href={`/dres/${s.slug}`}
              onClick={onNavigate}
              className="group w-24 shrink-0 transition-opacity hover:opacity-90"
            >
              <div className="relative aspect-square overflow-hidden rounded-[2px] bg-white">
                {img && <Image src={img} alt={`${s.klub} ${s.igrac}`} fill sizes="96px" className="object-contain p-1" />}
              </div>
              <div className="mt-1.5 truncate text-[11px] font-bold text-fg">{repairText(s.igrac)}</div>
              <div className="flex items-center justify-between">
                <span className="truncate text-[10px] text-mute">{repairText(s.klub)}</span>
                <span className="shrink-0 text-[11px] font-black text-fg">{s.price ?? JERSEY_PRICE_EUR} €</span>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
