"use client";

import Image from "next/image";
import { useState } from "react";

import { JerseyVisual } from "@/components/site/jersey-visual";
import { WishlistButton } from "@/components/site/wishlist-button";
import { type Jersey } from "@/lib/data/jerseys";
import { getJerseyGallery } from "@/lib/data/jersey-media";
import { repairText } from "@/lib/utils";
import { WATERMARK_SOFT } from "@/lib/watermark-css";

type ProductGalleryProps = {
  product: Jersey;
};

type Slide = { src: string; altLabel?: string; cutout?: boolean };

// Koncept A: velika slika na tamnoj pozornici + brojač "01 / 02 — oznaka",
// crtice napretka i 4 jednake sličice ispod. Prva je izrezani dres (pravi 3D
// snimak gdje postoji), a zatim originalne fotografije proizvoda.
export function ProductGallery({ product }: ProductGalleryProps) {
  const photos = product.images ?? getJerseyGallery(product.slug);
  const gallery: Slide[] = product.stage
    ? [{ src: product.stage.src, altLabel: product.stage.real ? "Stražnja strana" : "Dres", cutout: true }, ...photos]
    : photos;
  const [activeIndex, setActiveIndex] = useState(0);

  if (gallery.length === 0) {
    return <JerseyVisual product={product} mode="detail" />;
  }

  const activeImage = gallery[activeIndex] ?? gallery[0];
  const label = (img: { altLabel?: string }, i: number) => img.altLabel || `Slika ${i + 1}`;
  const tags = [
    product.badge === "novo" ? { t: "Novo", volt: true } : null,
    product.badge === "bestseller" ? { t: "Bestseller", volt: false } : null,
    product.liga === "Reprezentacija" && /2026/.test(`${product.slug} ${product.igrac}`) ? { t: "SP 2026", volt: false } : null,
    product.retro ? { t: "Retro", volt: false } : null,
    product.category === "dugi-rukav" ? { t: "Dugi rukav", volt: false } : null
  ].filter((x): x is { t: string; volt: boolean } => Boolean(x));

  return (
    <div className="-mx-4 sm:mx-0">
      <div className="stage relative aspect-square overflow-hidden sm:rounded-[2px]">
        <span aria-hidden className="pointer-events-none absolute inset-0 bg-[radial-gradient(70%_45%_at_50%_0%,rgba(255,255,255,.08),transparent_70%)]" />
        {activeImage.cutout ? (
          <Image
            src={activeImage.src}
            alt={`${repairText(product.klub)} ${repairText(product.igrac)} ${activeImage.altLabel ?? ""}`.trim()}
            fill
            priority
            sizes="(max-width: 1024px) 100vw, 50vw"
            className="object-contain px-[8%] pb-[6%] pt-[12%]"
          />
        ) : (
          <div className="absolute inset-x-4 inset-y-[14%] overflow-hidden rounded-sm bg-white shadow-[0_24px_40px_rgba(0,0,0,.55)] sm:inset-x-6">
            <Image
              src={activeImage.src}
              alt={`${repairText(product.klub)} ${repairText(product.igrac)} ${activeImage.altLabel ?? ""}`.trim()}
              fill
              priority={activeIndex === 0}
              sizes="(max-width: 1024px) 100vw, 50vw"
              className="object-contain p-2"
            />
            {/* Diskretni vodeni žig samo na studijskoj fotografiji (protiv krađe slika). */}
            <div
              className="pointer-events-none absolute inset-0 z-10 select-none"
              style={{ backgroundImage: WATERMARK_SOFT, backgroundRepeat: "repeat" }}
              aria-hidden
            />
          </div>
        )}

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
                <span className={`relative block aspect-square overflow-hidden ${image.cutout ? "stage" : "bg-white"}`}>
                  <Image
                    src={image.src}
                    alt={`${repairText(product.klub)} ${repairText(product.igrac)} ${image.altLabel ?? ""}`.trim()}
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
