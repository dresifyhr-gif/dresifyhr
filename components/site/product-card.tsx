"use client";

import { useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { ShoppingBag, X } from "lucide-react";

import { JerseyVisual } from "@/components/site/jersey-visual";
import { useCart } from "@/components/providers/cart-provider";
import { type Jersey, getJerseyStock, getStockTone, getJerseySizeOptions } from "@/lib/data/jerseys";
import { getJerseyGallery } from "@/lib/data/jersey-media";
import { formatPrice, repairText } from "@/lib/utils";

export function ProductCard({ product }: { product: Jersey }) {
  const stock = getJerseyStock(product.id);
  const sizeOptions = getJerseySizeOptions(product);
  const { addItem } = useCart();

  const defaultSegment = sizeOptions.hasAdults ? "adult" : "kid";
  const defaultSize = defaultSegment === "adult" ? (sizeOptions.adults[0] ?? "") : (sizeOptions.kids[0] ?? "");

  const [isOpen, setIsOpen] = useState(false);
  const [segment, setSegment] = useState<"adult" | "kid">(defaultSegment);
  const [selectedSize, setSelectedSize] = useState<string>(defaultSize);

  const currentSizes = segment === "adult" ? sizeOptions.adults : sizeOptions.kids;
  const segmentLabel = segment === "adult" ? "Dres" : "Dres i hlačice";

  const handleAddToCart = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!selectedSize) return;
    const gallery = getJerseyGallery(product.slug);
    addItem({
      slug: product.slug,
      klub: product.klub,
      igrac: product.igrac,
      size: selectedSize,
      segment,
      segmentLabel,
      imageSrc: gallery[0]?.src,
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
    setSelectedSize(seg === "adult" ? (sizeOptions.adults[0] ?? "") : (sizeOptions.kids[0] ?? ""));
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
        className="group relative flex h-full flex-col overflow-hidden rounded-[14px] border border-white/10 bg-[#111111] shadow-[inset_0_1px_0_rgba(255,255,255,0.02)] transition-all duration-200 ease-out hover:border-accent"
      >

        <div className="relative">
          <JerseyVisual product={product} />
          {product.retro && (
            <span className="absolute left-3 top-3 z-20 bg-white/10 backdrop-blur-sm border border-white/20 px-2 py-1 text-[9px] font-semibold uppercase tracking-[0.25em] text-white/80">
              RETRO
            </span>
          )}
        </div>

        <div className="flex flex-1 flex-col px-3.5 pb-3.5 pt-3 sm:px-4 sm:pb-4 sm:pt-3.5">
          {/* Name & league */}
          <div>
            <p className="hidden text-[11px] uppercase tracking-[0.26em] text-white/40 sm:block">
              {repairText(product.liga)}
            </p>
            <h3 className="text-[0.85rem] font-semibold uppercase leading-tight text-white sm:mt-2 sm:text-[1.1rem]">
              {repairText(product.klub)}
            </h3>
            <p className="mt-0.5 text-[11px] leading-4 text-white/50 sm:mt-1 sm:text-[13px] sm:leading-5">
              {repairText(product.igrac)}
            </p>
          </div>

          {/* Price & stock */}
          <div className="mt-2 flex items-center justify-between gap-2 border-t border-white/8 pt-2 sm:mt-3 sm:pt-3">
            <p className="font-heading text-[1.4rem] uppercase leading-none tracking-[0.03em] text-accent sm:text-[1.75rem]">
              {formatPrice(product.price)}
            </p>
            <p className={`hidden text-[12px] font-medium sm:block ${getStockTone(stock)}`}>Ostalo: {stock} kom</p>
            {/* Mobile cart button */}
            <button
              type="button"
              onClick={handleMobileToggle}
              className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-[6px] transition-all duration-200 md:hidden ${
                isOpen ? "bg-white/10 text-white" : "bg-accent text-black"
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
                              ? "border-accent bg-accent/10 text-accent"
                              : "border-white/10 text-white/40 hover:border-white/25 hover:text-white/60"
                          }`}
                        >
                          {seg === "adult" ? "Odrasli" : "Djeca"}
                        </button>
                      ))}
                    </div>
                  )}

                  {/* Size buttons */}
                  <div className="mb-2.5 flex flex-wrap gap-1.5">
                    {currentSizes.map((size) => (
                      <button
                        key={size}
                        type="button"
                        onClick={(e) => handleSizeClick(e, size)}
                        className={`min-w-[40px] rounded-[4px] border px-2 py-1.5 text-[11px] font-semibold uppercase tracking-[0.1em] transition-all duration-150 ${
                          selectedSize === size
                            ? "border-accent bg-accent text-black"
                            : "border-white/15 text-white/60 hover:border-accent/50 hover:text-white"
                        }`}
                      >
                        {size}
                      </button>
                    ))}
                  </div>

                  {/* Add to cart button */}
                  <button
                    type="button"
                    onClick={handleAddToCart}
                    disabled={!selectedSize}
                    className="flex w-full items-center justify-center gap-2 rounded-[4px] bg-accent py-2.5 font-heading text-[11px] uppercase tracking-[0.14em] text-black transition-all duration-150 hover:bg-[#f0ff71] disabled:cursor-not-allowed disabled:opacity-40"
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
