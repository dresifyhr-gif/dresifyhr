"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { useCart } from "@/components/providers/cart-provider";
import { useLanguage } from "@/contexts/language-context";
import { SHIPPING_PRICE_EUR } from "@/lib/site";
import { repairText } from "@/lib/utils";
import { splitJerseyName } from "@/components/site/product-card";
import type { Jersey } from "@/lib/data/jerseys";

type Props = {
  product: Jersey;
  selectedSize: string;
  segment: "adult" | "kid";
  segmentLabel: string;
  imageSrc?: string;
  mainButtonRef: React.RefObject<HTMLButtonElement>;
  /** Kad veličina nije odabrana — odvedi kupca do izbornika veličina. */
  onNeedSize?: () => void;
};

// Ljepljiva traka na mobitelu: pojavi se TEK kad glavni gumb ode iznad vrha ekrana
// (IntersectionObserver), ne dok je kupac još iznad njega. Puna pozadina, bez blura.
export function StickyAddToCart({ product, selectedSize, segment, segmentLabel, imageSrc, mainButtonRef, onNeedSize }: Props) {
  const { addItem } = useCart();
  const { t, locale } = useLanguage();
  const [visible, setVisible] = useState(false);
  const price = product.price ?? 20;
  const { name } = splitJerseyName(product.igrac);

  useEffect(() => {
    const el = mainButtonRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => setVisible(!entry.isIntersecting && entry.boundingClientRect.top < 0),
      { threshold: 0 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [mainButtonRef]);

  const handleAdd = () => {
    if (!selectedSize) {
      onNeedSize?.();
      return;
    }
    addItem({ slug: product.slug, klub: repairText(product.klub), igrac: repairText(product.igrac), size: selectedSize, segment, segmentLabel, imageSrc, price: product.price, category: product.category });
  };

  return (
    <div
      aria-hidden={!visible}
      className={`fixed inset-x-0 bottom-0 z-40 border-t border-white/10 bg-ink px-4 py-2.5 transition-transform duration-200 ease-out md:hidden ${
        visible ? "translate-y-0" : "pointer-events-none translate-y-full"
      }`}
    >
      <div className="flex items-center gap-3">
        {imageSrc ? (
          <span className="relative h-11 w-11 shrink-0 overflow-hidden rounded-[2px] bg-white">
            <Image src={imageSrc} alt="" fill sizes="44px" className="object-contain p-0.5" />
          </span>
        ) : null}
        <div className="min-w-0 flex-1">
          <p className="truncate pt-[0.12em] font-display text-[19px] uppercase leading-none text-fg">{name}</p>
          <p className="mt-1 truncate text-[11px] font-medium text-mute">
            {selectedSize ? `Vel. ${selectedSize}` : t.stickyCart.selectSize} · +{SHIPPING_PRICE_EUR} € {locale === "en" ? "delivery" : "dostava"}
          </p>
        </div>
        <button
          type="button"
          onClick={handleAdd}
          tabIndex={visible ? 0 : -1}
          className="h-12 shrink-0 rounded-[2px] bg-accent px-4 text-[13px] font-black uppercase tracking-[0.1em] text-black transition-colors hover:bg-[#f0ff71]"
        >
          {selectedSize ? `${t.stickyCart.add} — ${price} €` : t.stickyCart.selectSize}
        </button>
      </div>
    </div>
  );
}
