"use client";

import Image from "next/image";

import { type Jersey } from "@/lib/data/jerseys";
import { getJerseyGallery } from "@/lib/data/jersey-media";
import { getInitials, repairText } from "@/lib/utils";

type JerseyVisualProps = {
  product: Jersey;
  mode?: "card" | "detail";
};

export function JerseyVisual({ product, mode = "card" }: JerseyVisualProps) {
  const gallery = getJerseyGallery(product.slug);
  const frontImage = gallery[0];
  const backImage = gallery[1];
  const hasRealImages = gallery.length > 0;
  const isCard = mode === "card";

  return (
    <div
      className={`relative overflow-hidden border-b border-white/10 ${
        mode === "detail"
          ? "aspect-[4/5] min-h-[420px]"
          : "aspect-[4/5] bg-[#111111]"
      }`}
    >
      {mode === "detail" ? (
        <>
          <div className="absolute inset-x-[15%] bottom-[6%] h-16 rounded-full bg-black/60 blur-[36px]" />
        </>
      ) : (
        <>
          <div className="absolute inset-0 bg-[#0d0d0d]" />
          {/* Spotlight glow from top-centre */}
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_60%_55%_at_50%_20%,rgba(255,255,255,0.09)_0%,rgba(255,255,255,0.02)_50%,transparent_100%)]" />
          {/* Subtle diagonal light sweep */}
          <div className="absolute inset-0 bg-[linear-gradient(135deg,rgba(255,255,255,0.03)_0%,transparent_55%)]" />
          {/* Bottom fade to black */}
          <div className="absolute inset-0 bg-[linear-gradient(180deg,transparent_35%,rgba(0,0,0,0.72)_100%)]" />
          {/* Corner vignette */}
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_50%,transparent_55%,rgba(0,0,0,0.45)_100%)]" />
          {/* Jersey shadow blob */}
          <div className="absolute inset-x-[18%] bottom-[4%] h-8 rounded-full bg-black/70 blur-[22px]" />
        </>
      )}

      {hasRealImages ? (
        <div className="absolute inset-0">
          <div
            className={`absolute inset-0 flex items-center justify-center ${
              isCard ? "px-2 py-2" : "px-6 py-6"
            }`}
          >
            <div
              className={`relative h-full w-full ${
                isCard ? "max-h-[96%] max-w-[96%]" : "max-h-[88%] max-w-[88%]"
              }`}
            >
              <Image
                src={frontImage.src}
                alt={`${repairText(product.klub)} ${repairText(product.igrac)} ${frontImage.altLabel}`}
                fill
                sizes={
                  mode === "detail" ? "(max-width: 1024px) 100vw, 45vw" : "(max-width: 768px) 50vw, 25vw"
                }
                className={`object-contain object-center transition duration-300 ${
                  isCard && backImage
                    ? "md:group-hover:opacity-0 md:group-hover:scale-[1.03]"
                    : isCard
                    ? "group-hover:scale-[1.03]"
                    : ""
                }`}
              />
              {mode === "card" && backImage ? (
                <Image
                  src={backImage.src}
                  alt={`${repairText(product.klub)} ${repairText(product.igrac)} ${backImage.altLabel}`}
                  fill
                  sizes="(max-width: 768px) 50vw, 25vw"
                  className="hidden object-contain object-center opacity-0 transition duration-300 md:block md:group-hover:opacity-100 md:group-hover:scale-[1.03]"
                />
              ) : null}
            </div>
          </div>
        </div>
      ) : null}

      {!hasRealImages ? (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 p-4">
          <div className="flex h-16 w-16 items-center justify-center rounded-[14px] border border-white/10 bg-black/60">
            <span className="font-heading text-3xl leading-none text-accent">
              {getInitials(repairText(product.klub))}
            </span>
          </div>
          <div className="text-center">
            <p className="text-[9px] font-semibold uppercase tracking-[0.35em] text-white/30">
              FOTOGRAFIJA USKORO
            </p>
            <p className="mt-1 text-xs uppercase tracking-[0.18em] text-white/50">
              {repairText(product.klub)}
            </p>
          </div>
        </div>
      ) : null}

      {hasRealImages ? (
        <span className="pointer-events-none absolute bottom-3 right-3 select-none font-heading text-[15px] tracking-[0.18em] text-white/45">
          DRES<span className="text-accent/70">IFY</span>
        </span>
      ) : null}

      {product.retro && mode === "detail" ? (
        <span className="absolute left-3 top-3 rounded-[4px] bg-accent px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.22em] text-black">
          RETRO
        </span>
      ) : null}
    </div>
  );
}
