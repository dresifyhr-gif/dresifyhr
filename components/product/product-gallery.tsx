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
      <div className="relative aspect-[4/5] min-h-[420px] overflow-hidden rounded-[18px] border border-white/10 bg-[#0d0d0d]">
        {/* Spotlight glow */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_60%_55%_at_50%_20%,rgba(255,255,255,0.09)_0%,rgba(255,255,255,0.02)_50%,transparent_100%)]" />
        {/* Diagonal light sweep */}
        <div className="absolute inset-0 bg-[linear-gradient(135deg,rgba(255,255,255,0.03)_0%,transparent_55%)]" />
        {/* Bottom fade */}
        <div className="absolute inset-0 bg-[linear-gradient(180deg,transparent_35%,rgba(0,0,0,0.72)_100%)]" />
        {/* Corner vignette */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_50%,transparent_55%,rgba(0,0,0,0.45)_100%)]" />
        {/* Shadow blob */}
        <div className="absolute inset-x-[15%] bottom-[6%] h-16 rounded-full bg-black/60 blur-[36px]" />
        <div style={{ mixBlendMode: "screen" }} className="absolute inset-0">
          <Image
            src={activeImage.src}
            alt={`${repairText(product.klub)} ${repairText(product.igrac)} ${activeImage.altLabel}`}
            fill
            priority
            sizes="(max-width: 1024px) 100vw, 45vw"
            className="object-contain px-8 py-8"
          />
        </div>

        <span className="pointer-events-none absolute bottom-5 right-5 select-none font-heading text-xl tracking-[0.18em] text-white/45">
          DRES<span className="text-accent/70">IFY</span>
        </span>

        {product.retro ? (
          <span className="absolute left-5 top-5 border border-accent bg-accent px-3 py-1 text-xs font-semibold uppercase tracking-[0.28em] text-black">
            Retro
          </span>
        ) : null}
      </div>

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
                  ? "border-accent bg-[#111111]"
                  : "border-white/10 bg-[#111111] hover:border-accent/40"
              }`}
            >
              <div className="relative h-full w-full overflow-hidden rounded-[6px] bg-[#0d0d0d]">
                <div style={{ mixBlendMode: "screen" }} className="absolute inset-0">
                  <Image
                    src={image.src}
                    alt={`${repairText(product.klub)} ${repairText(product.igrac)} ${image.altLabel}`}
                    fill
                    sizes="180px"
                    className="object-contain p-4"
                  />
                </div>
              </div>
              <span className="absolute bottom-3 left-3 border border-white/10 bg-[#0a0a0a] px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.24em] text-white/70">
                {image.altLabel}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
