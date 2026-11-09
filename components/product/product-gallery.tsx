"use client";

import Image from "next/image";
import { useState } from "react";

import { JerseyVisual } from "@/components/site/jersey-visual";
import { WishlistButton } from "@/components/site/wishlist-button";
import { type Jersey } from "@/lib/data/jerseys";
import { getJerseyGallery } from "@/lib/data/jersey-media";
import { repairText } from "@/lib/utils";
import { WATERMARK } from "@/lib/watermark-css";

type ProductGalleryProps = {
  product: Jersey;
};

// Koncept A: velika fotografija (bijela "kartica") + brojač "01 / 04 — oznaka",
// crtice napretka i 4 jednake sličice ispod.
export function ProductGallery({ product }: ProductGalleryProps) {
  const gallery = product.images ?? getJerseyGallery(product.slug);
  const [activeIndex, setActiveIndex] = useState(0);

  if (gallery.length === 0) {
    return <JerseyVisual product={product} mode="detail" />;
  }

  const activeImage = gallery[activeIndex] ?? gallery[0];
  const label = (img: { altLabel?: string }, i: number) => img.altLabel || `Slika ${i + 1}`;
  const tags = [
    product.badge === "novo" ? { t: "Novo", volt: true } : null,
    product.badge === "bestseller" ? { t: "Bestseller", volt: false } : null,
    product.retro ? { t: "Retro", volt: false } : null,
    product.category === "dugi-rukav" ? { t: "Dugi rukav", volt: false } : null
  ].filter((x): x is { t: string; volt: boolean } => Boolean(x));

  return (
    <div className="-mx-4 sm:mx-0">
      <div className="relative aspect-square overflow-hidden bg-white sm:rounded-[2px]">
        <Image
          src={activeImage.src}
          alt={`${repairText(product.klub)} ${repairText(product.igrac)} ${activeImage.altLabel ?? ""}`.trim()}
          fill
          priority
          sizes="(max-width: 1024px) 100vw, 50vw"
          className="object-contain p-4 sm:p-6"
        />
        <div
          className="pointer-events-none absolute inset-0 z-10 select-none"
          style={{ backgroundImage: WATERMARK, backgroundRepeat: "repeat" }}
          aria-hidden
        />

        {tags.length ? (
          <div className="absolute left-4 top-4 z-20 flex gap-1.5">
            {tags.map((tag) => (
              <span
                key={tag.t}
                className={`border px-1.5 pb-1 pt-[5px] text-[9px] font-black uppercase leading-none tracking-[0.12em] ${
                  tag.volt ? "border-accent bg-accent text-black" : "border-black bg-black text-fg"
                }`}
              >
                {tag.t}
              </span>
            ))}
          </div>
        ) : null}

        <WishlistButton
          slug={product.slug}
          klub={product.klub}
          igrac={product.igrac}
          className="absolute right-4 top-4 z-20 !h-10 !w-10 !border-black/10 !bg-black/85"
        />
      </div>

      {/* Brojač + crtice (samo kad ima više slika) */}
      {gallery.length > 1 ? (
      <div className="flex items-center justify-between px-4 pt-3 sm:px-0">
        <p className="text-[10.5px] font-bold uppercase leading-none tracking-[0.14em] text-mute">
          <b className="text-fg">{String(activeIndex + 1).padStart(2, "0")}</b> / {String(gallery.length).padStart(2, "0")} —{" "}
          {label(activeImage, activeIndex)}
        </p>
        {gallery.length > 1 ? (
          <div className="flex gap-1">
            {gallery.map((img, i) => (
              <i key={img.src} className={`block h-[2px] w-5 ${i === activeIndex ? "bg-accent" : "bg-white/20"}`} />
            ))}
          </div>
        ) : null}
      </div>
      ) : null}

      {gallery.length > 1 ? (
        <div className="grid grid-cols-4 gap-1.5 px-4 pt-3 sm:px-0">
          {gallery.slice(0, 8).map((image, index) => {
            const isActive = index === activeIndex;
            return (
              <button
                key={image.src}
                type="button"
                onClick={() => setActiveIndex(index)}
                aria-label={label(image, index)}
                aria-pressed={isActive}
                className={`min-w-0 border bg-ink2 p-1 text-left transition-colors ${
                  isActive ? "border-accent" : "border-white/10 hover:border-white/40"
                }`}
              >
                <span className="relative block aspect-square overflow-hidden bg-white">
                  <Image
                    src={image.src}
                    alt=""
                    fill
                    sizes="96px"
                    className="object-contain p-1"
                  />
                </span>
                <span className="mt-1 block truncate text-center text-[9px] font-black uppercase leading-[1.4] tracking-[0.1em] text-fg">
                  {label(image, index)}
                </span>
              </button>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}
