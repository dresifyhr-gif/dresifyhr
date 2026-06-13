"use client";

import Image from "next/image";
import Link from "next/link";

import { jerseys } from "@/lib/data/jerseys";
import { getJerseyGallery } from "@/lib/data/jersey-media";
import { formatPrice, getProductRating, repairText } from "@/lib/utils";

const FEATURED_SLUGS = [
  "milan-modric",
  "alnassr-ronaldo-zuti",
  "argentina-messi-retro",
  "bayern-kane-crveni",
  "dortmund-adeyemi",
  "atletico-griezmann",
  "real-bellingham",
  "portugal-ronaldo-crveni",
];

const featuredProducts = FEATURED_SLUGS
  .map((slug) => jerseys.find((j) => j.slug === slug))
  .filter(Boolean) as typeof jerseys;

export function FeaturedSection() {
  return (
    <section className="section-pad bg-[#111111]">
      <div className="page-shell">
        <div className="mb-6 flex items-center justify-between sm:mb-8">
          <h2 className="font-heading text-2xl uppercase tracking-[0.04em] text-white sm:text-3xl">
            Najprodavaniji dresovi 🔥
          </h2>
          <Link
            href="/dresovi"
            className="text-sm font-semibold uppercase tracking-[0.18em] text-accent hover:text-white transition-colors duration-150"
          >
            Pogledaj sve →
          </Link>
        </div>

        {/* Horizontal scroll */}
        <div className="-mx-3 sm:-mx-6 lg:mx-0">
          <div className="flex gap-3 overflow-x-auto px-3 pb-3 sm:gap-4 sm:px-6 lg:px-0 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {featuredProducts.map((product) => {
              const gallery = getJerseyGallery(product.slug);
              const image = gallery[0]?.src;
              const { rating, count } = getProductRating(product.id);
              const badge = product.badge ?? (product.retro ? "retro" : null);

              return (
                <Link
                  key={product.slug}
                  href={`/dres/${product.slug}`}
                  className="group relative flex w-[160px] shrink-0 flex-col overflow-hidden rounded-[10px] border border-white/10 bg-[#0a0a0a] hover:border-accent/50 transition-all duration-200 sm:w-[190px]"
                >
                  {/* Badge */}
                  {badge && (
                    <span className={`absolute left-2 top-2 z-10 px-2 py-0.5 text-[8px] font-bold uppercase tracking-[0.18em] ${
                      badge === "bestseller"
                        ? "bg-accent text-black"
                        : badge === "novo"
                        ? "bg-[#3b82f6] text-white"
                        : "bg-black/50 border border-white/25 text-white/90"
                    }`}>
                      {badge === "bestseller" ? "★ Bestseller" : badge === "novo" ? "● Novo" : "Retro"}
                    </span>
                  )}

                  {/* Image */}
                  <div className="relative aspect-square bg-[#fbfbfb]">
                    {image ? (
                      <Image
                        src={image}
                        alt={`${repairText(product.klub)} ${repairText(product.igrac)}`}
                        fill
                        sizes="190px"
                        className="object-contain object-center p-2 transition-transform duration-300 group-hover:scale-105"
                      />
                    ) : (
                      <div className="absolute inset-0 flex items-center justify-center">
                        <span className="font-heading text-2xl text-accent/60">
                          {repairText(product.klub).slice(0, 2).toUpperCase()}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Info */}
                  <div className="flex flex-col gap-1 p-2.5">
                    <p className="text-[11px] font-semibold uppercase leading-tight text-white">
                      {repairText(product.klub)}
                    </p>
                    <p className="text-[10px] leading-tight text-white/50">
                      {repairText(product.igrac)}
                    </p>
                    <div className="flex items-center gap-1">
                      <span className="text-accent text-[10px]">★★★★★</span>
                      <span className="text-[9px] text-white/35">{rating} ({count})</span>
                    </div>
                    <div className="mt-0.5 flex items-center justify-between">
                      <span className="font-heading text-lg leading-none text-accent">
                        {formatPrice(product.price)}
                      </span>
                      <span className="flex h-7 w-7 items-center justify-center rounded-[5px] bg-accent text-black text-xs font-bold">
                        🛒
                      </span>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
