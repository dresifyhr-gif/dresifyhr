"use client";

import { useState } from "react";
import Link from "next/link";
import { ShoppingBag, X } from "lucide-react";

import { JerseyVisual } from "@/components/site/jersey-visual";
import { WishlistButton } from "@/components/site/wishlist-button";
import { useCart } from "@/components/providers/cart-provider";
import { type Jersey, getJerseySizeOptions } from "@/lib/data/jerseys";
import { getJerseyGallery } from "@/lib/data/jersey-media";
import { repairText } from "@/lib/utils";

// Kratko ime za veliki display redak: "Gvardiol nr4 — 2026" → "Gvardiol 4",
// a ostatak ("2026") ide u sitni podnaslov. Puni naziv ostaje u alt-u i title-u.
export function splitJerseyName(igrac: string) {
  const [head, ...rest] = repairText(igrac).split(/\s+[—–-]\s+/);
  const name = head.replace(/\bnr\.?\s*(\d+)/i, "$1").trim();
  return { name, sub: rest.join(" · ") };
}

function tagFor(product: Jersey, theme: "jersey" | "streetwear" | "trenirka") {
  if (theme === "streetwear" || product.category === "streetwear") return { label: "Streetwear", volt: false };
  if (theme === "trenirka" || product.category === "trenirka") return { label: "Trenirka", volt: false };
  const parts: string[] = [];
  if (product.badge === "novo") parts.push("Novo");
  if (product.badge === "bestseller") parts.push("Bestseller");
  if (product.retro) parts.push("Retro");
  if (product.category === "dugi-rukav") parts.push("Dugi rukav");
  if (!parts.length) return null;
  return { label: parts.join(" · "), volt: product.badge === "novo" };
}

export function ProductCard({ product, priority = false, theme = "jersey" }: { product: Jersey; priority?: boolean; theme?: "jersey" | "streetwear" | "trenirka" }) {
  const sizeOptions = getJerseySizeOptions(product);
  const { addItem } = useCart();

  const firstAvailable = (arr: string[], segmentOut: boolean) =>
    segmentOut ? "" : (arr.find((s) => !sizeOptions.soldOutSizes.includes(s)) ?? "");
  const availAdult = firstAvailable(sizeOptions.adults, sizeOptions.adultsOutOfStock);
  const availKid = firstAvailable(sizeOptions.kids, sizeOptions.kidsOutOfStock);
  const defaultSegment: "adult" | "kid" =
    sizeOptions.hasAdults && availAdult ? "adult" : availKid ? "kid" : sizeOptions.hasAdults ? "adult" : "kid";
  const defaultSize = defaultSegment === "adult" ? availAdult : availKid;
  // "Jedna veličina" (dio streetweara, kompleti bez veličina) — nema izbornika, dodaje se odmah.
  const hasSizePicker = sizeOptions.adults.length > 0 || sizeOptions.kids.length > 0;
  const allSoldOut = hasSizePicker && !availAdult && !availKid;

  const [isOpen, setIsOpen] = useState(false);
  const [segment, setSegment] = useState<"adult" | "kid">(defaultSegment);
  const [selectedSize, setSelectedSize] = useState<string>(defaultSize);

  const currentSizes = segment === "adult" ? sizeOptions.adults : sizeOptions.kids;
  const segmentLabel = segment === "adult" || product.category === "dugi-rukav" ? "Dres" : "Dres i hlačice";
  const href = `/dres/${product.slug}`;
  const klub = repairText(product.klub);
  const isTrenirka = theme === "trenirka" || product.category === "trenirka";
  const isKit = product.liga === "Komplet";
  const split = splitJerseyName(product.igrac);
  // Trenirke se zovu samo "Komplet"/igrač — naslov je klub, a podnaslov što dobiješ.
  const name = isTrenirka ? klub : split.name;
  const sub = isTrenirka ? `trenirka · jakna + hlače` : split.sub;
  const tag = tagFor(product, theme);
  const isJersey = theme === "jersey" && !isTrenirka && product.category !== "streetwear";
  const subRaw = sub || (isJersey ? repairText(product.liga) : "");
  const subLine = subRaw.toLowerCase() === name.toLowerCase() ? "" : subRaw;
  const eyebrow = isTrenirka ? "Trenirka" : klub;

  const handleAddToCart = () => {
    if (hasSizePicker && !selectedSize) return;
    const gallery = product.images ?? getJerseyGallery(product.slug);
    addItem({
      slug: product.slug,
      klub: product.klub,
      igrac: product.igrac,
      size: selectedSize,
      segment,
      segmentLabel,
      imageSrc: gallery[0]?.src,
      price: product.price,
      category: product.category,
    });
    setIsOpen(false);
  };

  const handleSegmentClick = (seg: "adult" | "kid") => {
    setSegment(seg);
    setSelectedSize(seg === "adult" ? availAdult : availKid);
  };

  return (
    <article
      className="group relative flex h-full flex-col"
      onMouseEnter={() => {
        if (hasSizePicker && window.matchMedia("(hover: hover)").matches) setIsOpen(true);
      }}
      onMouseLeave={() => {
        if (window.matchMedia("(hover: hover)").matches) setIsOpen(false);
      }}
    >
      <div className="relative">
        <Link href={href} tabIndex={-1} aria-hidden="true" className="block">
          <JerseyVisual product={product} priority={priority} />
        </Link>

        {tag ? (
          <span
            className={`pointer-events-none absolute ${isKit ? "right-2" : "left-2"} top-2 z-20 max-w-[calc(100%-3.25rem)] truncate border px-1.5 pb-1 pt-[5px] text-[9px] font-black uppercase leading-none tracking-[0.12em] ${
              tag.volt ? "border-accent bg-accent text-black" : "border-white/[0.18] bg-black text-fg"
            }`}
          >
            {tag.label}
          </span>
        ) : null}

        <WishlistButton
          slug={product.slug}
          klub={product.klub}
          igrac={product.igrac}
          className={`absolute ${isKit ? "left-2" : "right-2"} top-2 z-20 !h-8 !w-8 !border-black/10 !bg-black/80 [&>svg]:!h-[15px] [&>svg]:!w-[15px]`}
        />

        {/* Brzo dodavanje — prekriva dno slike (bez pomicanja mreže). */}
        {isOpen ? (
          <div className="absolute inset-x-0 bottom-0 z-30 max-h-full overflow-y-auto border-t border-white/10 bg-ink p-2.5">
            {sizeOptions.hasAdults && sizeOptions.hasKids ? (
              <div className="mb-2 grid grid-cols-2 gap-1">
                {(["adult", "kid"] as const).map((seg) => (
                  <button
                    key={seg}
                    type="button"
                    onClick={() => handleSegmentClick(seg)}
                    className={`rounded-[2px] border py-1.5 text-[10px] font-black uppercase tracking-[0.12em] transition-colors ${
                      segment === seg ? "border-fg bg-fg text-black" : "border-white/15 text-white/55 hover:text-white"
                    }`}
                  >
                    {seg === "adult" ? "Odrasli" : "Djeca"}
                  </button>
                ))}
              </div>
            ) : null}

            <div className="mb-2 flex flex-wrap gap-1">
              {currentSizes.map((size) => {
                const oos =
                  (segment === "adult" && sizeOptions.adultsOutOfStock) ||
                  (segment === "kid" && sizeOptions.kidsOutOfStock) ||
                  sizeOptions.soldOutSizes.includes(size);
                return (
                  <button
                    key={size}
                    type="button"
                    onClick={() => !oos && setSelectedSize(size)}
                    disabled={oos}
                    title={oos ? "Rasprodano" : undefined}
                    className={`min-w-[38px] rounded-[2px] border px-1.5 py-1.5 text-[11px] font-bold transition-colors ${
                      oos
                        ? "cursor-not-allowed border-white/5 text-[#555] line-through"
                        : selectedSize === size
                        ? "border-accent bg-accent text-black"
                        : "border-white/15 text-white/80 hover:border-white/40"
                    }`}
                  >
                    {size}
                  </button>
                );
              })}
            </div>

            <button
              type="button"
              onClick={handleAddToCart}
              disabled={hasSizePicker && !selectedSize}
              className="flex h-9 w-full items-center justify-center gap-2 rounded-[2px] bg-accent text-[11px] font-black uppercase tracking-[0.1em] text-black transition-colors hover:bg-[#f0ff71] disabled:cursor-not-allowed disabled:opacity-40"
            >
              <ShoppingBag className="h-3.5 w-3.5 shrink-0" />
              {selectedSize || !hasSizePicker ? `Dodaj — ${product.price ?? 20} €` : allSoldOut ? "Rasprodano" : "Odaberi veličinu"}
            </button>
          </div>
        ) : null}
      </div>

      <Link href={href} className="block px-0.5 pt-2.5" title={`${klub} ${repairText(product.igrac)}`}>
        <p className="truncate text-[10px] font-bold uppercase leading-none tracking-[0.14em] text-mute">{eyebrow}</p>
        <h3 className="mt-1 line-clamp-2 pt-[0.14em] font-display text-[21px] uppercase leading-none text-fg sm:text-[23px]">{name}</h3>
        {subLine ? (
          <p className="mt-1 truncate text-[11.5px] font-medium leading-[1.3] text-mute">{subLine}</p>
        ) : null}
      </Link>

      <div className="mt-auto flex items-center justify-between gap-2 px-0.5 pt-2">
        <span className="text-[15px] font-black leading-none text-fg">{`${product.price ?? 20} €`}</span>
        <button
          type="button"
          onClick={() => (hasSizePicker ? setIsOpen((v) => !v) : handleAddToCart())}
          aria-label={isOpen ? "Zatvori brzo dodavanje" : "Brzo dodaj u košaricu"}
          aria-expanded={isOpen}
          className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full border transition-colors ${hasSizePicker ? "[@media(hover:hover)]:hidden" : ""} ${
            isOpen ? "border-white/20 bg-white/10 text-white" : "border-accent bg-accent text-black"
          }`}
        >
          {isOpen ? <X className="h-3.5 w-3.5" /> : <ShoppingBag className="h-3.5 w-3.5" />}
        </button>
      </div>
    </article>
  );
}
