import Image from "next/image";
import Link from "next/link";
import { ArrowRight } from "lucide-react";

import { getJerseyBySlug } from "@/lib/data/jerseys";
import { getJerseyGallery } from "@/lib/data/jersey-media";
import { DEAL_OF_MONTH } from "@/lib/site";
import { formatPrice, repairText } from "@/lib/utils";

export function DealBanner() {
  const product = getJerseyBySlug(DEAL_OF_MONTH.slug);
  if (!product) return null;

  const image = getJerseyGallery(product.slug)[0]?.src ?? "";

  return (
    <section className="section-pad">
      <div className="page-shell">
        <Link
          href={`/dres/${product.slug}`}
          className="group grid overflow-hidden rounded-[16px] border border-accent/30 bg-[#0d0d0d] md:grid-cols-[1fr_1.1fr]"
        >
          <div className="relative aspect-[4/3] bg-[#fbfbfb] md:aspect-auto md:min-h-[320px]">
            {image ? (
              <Image
                src={image}
                alt={`${repairText(product.klub)} ${repairText(product.igrac)}`}
                fill
                sizes="(max-width: 768px) 100vw, 50vw"
                className="object-contain p-6 transition-transform duration-300 ease-out group-hover:scale-[1.03]"
              />
            ) : (
              <div className="flex h-full items-center justify-center text-sm uppercase tracking-[0.2em] text-black/30">
                {repairText(product.klub)}
              </div>
            )}
          </div>

          <div className="flex flex-col justify-center gap-4 p-8 sm:p-10">
            <span className="inline-flex w-fit items-center rounded-full border border-accent/40 bg-accent/10 px-4 py-1.5 text-[11px] font-bold uppercase tracking-[0.24em] text-accent">
              {DEAL_OF_MONTH.kicker}
            </span>
            <h2 className="font-heading text-[clamp(2rem,4vw,3.2rem)] uppercase leading-[0.95] tracking-[0.03em] text-white">
              {DEAL_OF_MONTH.title}
            </h2>
            <p className="max-w-md text-sm leading-7 text-white/60 sm:text-base">{DEAL_OF_MONTH.subtitle}</p>
            <div className="mt-1 flex items-center gap-4">
              <span className="font-heading text-3xl text-accent">{formatPrice(product.price)}</span>
              <span className="inline-flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.16em] text-white transition group-hover:text-accent">
                {DEAL_OF_MONTH.cta}
                <ArrowRight className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-1" />
              </span>
            </div>
          </div>
        </Link>
      </div>
    </section>
  );
}
