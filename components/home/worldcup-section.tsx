"use client";

import Image from "next/image";
import Link from "next/link";

import { jerseys } from "@/lib/data/jerseys";
import { getJerseyGallery } from "@/lib/data/jersey-media";
import { FLAGSHIP_SLUG } from "@/lib/data/jerseys";
import { formatPrice, repairText } from "@/lib/utils";

// National-team jerseys, flagship (Hrvatska Modrić) pinned first — World Cup push.
const nationalTeams = jerseys
  .filter((j) => j.liga === "Reprezentacija")
  .sort((a, b) => (a.slug === FLAGSHIP_SLUG ? -1 : b.slug === FLAGSHIP_SLUG ? 1 : 0));

export function WorldCupSection() {
  if (nationalTeams.length === 0) return null;

  return (
    <section className="section-pad bg-[#0a0a0a]">
      <div className="page-shell">
        <div className="mb-6 flex items-center justify-between sm:mb-8">
          <div>
            <span className="inline-flex w-fit items-center rounded-full border border-accent/40 bg-accent/10 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.22em] text-accent">
              🏆 SP 2026
            </span>
            <h2 className="mt-3 font-heading text-2xl uppercase tracking-[0.04em] text-white sm:text-3xl">
              Navijaj u svom dresu
            </h2>
          </div>
          <Link
            href="/dresovi/kategorija/reprezentativni-dresovi"
            className="shrink-0 text-sm font-semibold uppercase tracking-[0.18em] text-accent transition-colors duration-150 hover:text-white"
          >
            Sve reprezentacije →
          </Link>
        </div>

        <div className="-mx-3 sm:-mx-6 lg:mx-0">
          <div className="flex gap-3 overflow-x-auto px-3 pb-3 sm:gap-4 sm:px-6 lg:px-0 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {nationalTeams.map((product) => {
              const image = getJerseyGallery(product.slug)[0]?.src;

              return (
                <Link
                  key={product.slug}
                  href={`/dres/${product.slug}`}
                  className="group relative flex w-[160px] shrink-0 flex-col overflow-hidden rounded-[10px] border border-white/10 bg-[#0a0a0a] transition-all duration-200 hover:border-accent/50 sm:w-[190px]"
                >
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

                  <div className="flex flex-col gap-1 p-2.5">
                    <p className="text-[11px] font-semibold uppercase leading-tight text-white">
                      {repairText(product.klub)}
                    </p>
                    <p className="text-[10px] leading-tight text-white/50">{repairText(product.igrac)}</p>
                    <div className="mt-0.5 flex items-center justify-between">
                      <span className="font-heading text-lg leading-none text-accent">
                        {formatPrice(product.price)}
                      </span>
                      <span className="flex h-7 w-7 items-center justify-center rounded-[5px] bg-accent text-xs font-bold text-black">
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
