"use client";

import Image from "next/image";
import { useState } from "react";

import { JerseyVisual } from "@/components/site/jersey-visual";
import { type Jersey } from "@/lib/data/jerseys";
import { getJerseyGallery } from "@/lib/data/jersey-media";
import { repairText } from "@/lib/utils";

type ProductGalleryProps = {
  product: Jersey;
};

export function ProductGallery({ product }: ProductGalleryProps) {
  const gallery = getJerseyGallery(product.slug);
  const [activeIndex, setActiveIndex] = useState(0);

  if (gallery.length === 0) {
    return <JerseyVisual product={product} mode="detail" />;
  }

  const activeImage = gallery[activeIndex] ?? gallery[0];

  return (
    <div className="space-y-4">
      <div className="relative aspect-[4/5] min-h-[420px] overflow-hidden rounded-[18px] border border-white/10 bg-[#fbfbfb]">
        {/* Subtle bottom shadow so jersey doesn't float */}
        <div className="absolute inset-x-[15%] bottom-[4%] h-10 rounded-full bg-black/10 blur-[24px]" />
        <Image
          src={activeImage.src}
          alt={`${repairText(product.klub)} ${repairText(product.igrac)} ${activeImage.altLabel}`}
          fill
          priority
          sizes="(max-width: 1024px) 100vw, 45vw"
          className="object-contain px-6 py-6"
        />

        <span className="pointer-events-none absolute bottom-4 right-4 select-none font-heading text-xl tracking-[0.18em] text-black/30">
          DRES<span className="text-accent/60">IFY</span>
        </span>

        {product.retro ? (
          <span className="absolute left-5 top-5 border border-accent bg-accent px-3 py-1 text-xs font-semibold uppercase tracking-[0.28em] text-black">
            Retro
          </span>
        ) : null}
      </div>

      {gallery.length > 1 ? (
        <div className="grid grid-cols-2 gap-3">
          {gallery.map((image, index) => {
            const isActive = index === activeIndex;

            return (
              <button
                key={image.src}
                type="button"
                onClick={() => setActiveIndex(index)}
                className={`relative aspect-[4/5] overflow-hidden border p-2 text-left transition duration-200 ease-out ${
                  isActive
                    ? "border-accent bg-[#fbfbfb]"
                    : "border-white/10 bg-[#fbfbfb] hover:border-accent/40"
                }`}
              >
                <div className="relative h-full w-full overflow-hidden rounded-[6px] bg-[#fbfbfb]">
                  <Image
                    src={image.src}
                    alt={`${repairText(product.klub)} ${repairText(product.igrac)} ${image.altLabel}`}
                    fill
                    sizes="180px"
                    className="object-contain p-3"
                  />
                </div>
                <span className="absolute bottom-3 left-3 border border-black/10 bg-white/90 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-black/70">
                  {image.altLabel}
                </span>
              </button>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}
