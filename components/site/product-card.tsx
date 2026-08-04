"use client";

import { useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { ShoppingBag, X } from "lucide-react";

import { JerseyVisual } from "@/components/site/jersey-visual";
import { WishlistButton } from "@/components/site/wishlist-button";
import { Stars } from "@/components/site/stars";
import { useCart } from "@/components/providers/cart-provider";
import { type Jersey, getJerseyStock, getStockTone, getJerseySizeOptions } from "@/lib/data/jerseys";
import { getJerseyGallery } from "@/lib/data/jersey-media";
import { formatPrice, repairText } from "@/lib/utils";

export function ProductCard({ product, priority = false, theme = "jersey" }: { product: Jersey; priority?: boolean; theme?: "jersey" | "streetwear" }) {
  const sw = theme === "streetwear"; // streetwear = svijetla kartica, narančasti akcenti
  const stock = getJerseyStock(product);
  const sizeOptions = getJerseySizeOptions(product);
  const { addItem } = useCart();

  const firstAvailable = (arr: string[], segmentOut: boolean) =>
    segmentOut ? "" : (arr.find((s) => !sizeOptions.soldOutSizes.includes(s)) ?? "");
  const availAdult = firstAvailable(sizeOptions.adults, sizeOptions.adultsOutOfStock);
  const availKid = firstAvailable(sizeOptions.kids, sizeOptions.kidsOutOfStock);
  const defaultSegment: "adult" | "kid" =
    sizeOptions.hasAdults && availAdult ? "adult" : availKid ? "kid" : sizeOptions.hasAdults ? "adult" : "kid";
  const defaultSize = defaultSegment === "adult" ? availAdult : availKid;

  const [isOpen, setIsOpen] = useState(false);
  const [segment, setSegment] = useState<"adult" | "kid">(defaultSegment);
  const [selectedSize, setSelectedSize] = useState<string>(defaultSize);

  const currentSizes = segment === "adult" ? sizeOptions.adults : sizeOptions.kids;
  const segmentLabel = segment === "adult" ? "Dres" : "Dres i hlačice";

  const handleAddToCart = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!selectedSize) return;
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

  const handleSizeClick = (e: React.MouseEvent, size: string) => {
    e.preventDefault();
    e.stopPropagation();
    setSelectedSize(size);
  };

  const handleSegmentClick = (e: React.MouseEvent, seg: "adult" | "kid") => {
    e.preventDefault();
    e.stopPropagation();
    setSegment(seg);
    setSelectedSize(seg === "adult" ? availAdult : availKid);
  };

  const handleMobileToggle = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsOpen((v) => !v);
  };

  return (
    <motion.article
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      whileHover={{ y: -4 }}
      transition={{ duration: 0.2 }}
      className="h-full"
      onMouseEnter={() => setIsOpen(true)}
      onMouseLeave={() => setIsOpen(false)}
    >
      <Link
        href={`/dres/${product.slug}`}
        className={`group relative flex h-full flex-col overflow-hidden rounded-[14px] border transition-all duration-200 ease-out ${sw ? "border-slate-200 bg-white shadow-sm hover:border-orange-400" : "border-white/10 bg-[#111111] shadow-[inset_0_1px_0_rgba(255,255,255,0.02)] hover:border-accent"}`}
      >

        <div className="relative">
          <JerseyVisual product={product} priority={priority} />
          <WishlistButton slug={product.slug} klub={product.klub} igrac={product.igrac} className="absolute right-2.5 top-2.5 z-20" />
          {(product.badge || product.retro) && (
            <span className={`absolute left-2.5 top-2.5 z-20 px-2 py-0.5 text-[9px] font-bold uppercase tracking-[0.18em] ${
              product.badge === "bestseller"
                ? sw ? "bg-orange-500 text-white" : "bg-accent text-black"
                : product.badge === "novo"
                ? "bg-[#3b82f6] text-white"
                : "bg-black/50 backdrop-blur-sm border border-white/25 text-white/90"
            }`}>
              {product.badge === "bestseller" ? "★ Bestseller" : product.badge === "novo" ? "● Novo" : "Retro"}
            </span>
          )}
        </div>

        <div className="flex flex-1 flex-col px-3.5 pb-3.5 pt-3 sm:px-4 sm:pb-4 sm:pt-3.5">
          {/* Name & league */}
          <div>
            <p className={`hidden text-[11px] uppercase tracking-[0.26em] sm:block ${sw ? "text-orange-500/70" : "text-white/40"}`}>
              {sw ? "Streetwear" : repairText(product.liga)}
            </p>
            <h3 className={`text-[0.85rem] font-semibold uppercase leading-tight sm:mt-2 sm:text-[1.1rem] ${sw ? "text-slate-900" : "text-white"}`}>
              {repairText(product.klub)}
            </h3>
            <p className={`mt-0.5 text-[11px] leading-4 sm:mt-1 sm:text-[13px] sm:leading-5 ${sw ? "text-slate-500" : "text-white/50"}`}>
              {repairText(product.igrac)}
            </p>
            {product.rating && (
              <div className="mt-1">
                <Stars value={product.rating.value} count={product.rating.count} />
              </div>
            )}
          </div>

          {/* Price & stock */}
          <div className={`mt-2 flex items-center justify-between gap-2 border-t pt-2 sm:mt-3 sm:pt-3 ${sw ? "border-slate-200" : "border-white/8"}`}>
            <p className={`font-heading text-[1.4rem] uppercase leading-none tracking-[0.03em] sm:text-[1.75rem] ${sw ? "text-orange-500" : "text-accent"}`}>
              {formatPrice(product.price)}
            </p>
            <p className={`hidden text-[12px] font-medium sm:block ${sw ? "text-slate-400" : getStockTone(stock)}`}>Ostalo: {stock} kom</p>
            {/* Mobile cart button */}
            <button
              type="button"
              onClick={handleMobileToggle}
              className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-[6px] transition-all duration-200 md:hidden ${
                isOpen ? (sw ? "bg-slate-100 text-slate-600" : "bg-white/10 text-white") : (sw ? "bg-orange-500 text-white" : "bg-accent text-black")
              }`}
            >
              {isOpen ? <X className="h-4 w-4" /> : <ShoppingBag className="h-4 w-4" />}
            </button>
          </div>

          {/* Quick-add panel */}
          <AnimatePresence>
            {isOpen && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.2, ease: "easeOut" }}
                className="overflow-hidden"
                onClick={(e) => { e.preventDefault(); e.stopPropagation(); }}
              >
                <div className="pt-3">
                  {/* Segment toggle */}
                  {sizeOptions.hasAdults && sizeOptions.hasKids && (
                    <div className="mb-2 flex gap-1.5">
                      {(["adult", "kid"] as const).map((seg) => (
                        <button
                          key={seg}
                          type="button"
                          onClick={(e) => handleSegmentClick(e, seg)}
                          className={`flex-1 rounded-[4px] border py-1.5 text-[10px] font-semibold uppercase tracking-[0.2em] transition-all duration-150 ${
                            segment === seg
                              ? sw ? "border-orange-500 bg-orange-50 text-orange-600" : "border-accent bg-accent/10 text-accent"
                              : sw ? "border-slate-200 text-slate-400 hover:border-slate-300 hover:text-slate-600" : "border-white/10 text-white/40 hover:border-white/25 hover:text-white/60"
                          }`}
                        >
                          {seg === "adult" ? "Odrasli" : "Djeca"}
                        </button>
                      ))}
                    </div>
                  )}

                  {/* Size buttons */}
                  <div className="mb-2.5 flex flex-wrap gap-1.5">
                    {currentSizes.map((size) => {
                      const oos = (segment === "adult" && sizeOptions.adultsOutOfStock) || (segment === "kid" && sizeOptions.kidsOutOfStock) || sizeOptions.soldOutSizes.includes(size);
                      return (
                        <button
                          key={size}
                          type="button"
                          onClick={(e) => !oos && handleSizeClick(e, size)}
                          disabled={oos}
                          title={oos ? "Nema na stanju" : undefined}
                          className={`min-w-[40px] rounded-[4px] border px-2 py-1.5 text-[11px] font-semibold uppercase tracking-[0.1em] transition-all duration-150 ${
                            oos
                              ? sw ? "cursor-not-allowed border-slate-100 text-slate-300 line-through" : "cursor-not-allowed border-white/5 text-white/20"
                              : selectedSize === size
                              ? sw ? "border-orange-500 bg-orange-500 text-white" : "border-accent bg-accent text-black"
                              : sw ? "border-slate-200 text-slate-600 hover:border-orange-400 hover:text-slate-900" : "border-white/15 text-white/60 hover:border-accent/50 hover:text-white"
                          }`}
                        >
                          {size}
                        </button>
                      );
                    })}
                  </div>

                  {/* Add to cart button */}
                  <button
                    type="button"
                    onClick={handleAddToCart}
                    disabled={!selectedSize}
                    className={`flex w-full items-center justify-center gap-2 rounded-[4px] py-2.5 font-heading text-[11px] uppercase tracking-[0.14em] transition-all duration-150 disabled:cursor-not-allowed disabled:opacity-40 ${sw ? "bg-orange-500 text-white hover:bg-orange-600" : "bg-accent text-black hover:bg-[#f0ff71]"}`}
                  >
                    <ShoppingBag className="h-3.5 w-3.5 shrink-0" />
                    <span className="pl-[0.14em]">DODAJ U KOŠARICU</span>
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </Link>
    </motion.article>
  );
}
