"use client";

import Image from "next/image";

import { type Jersey } from "@/lib/data/jerseys";
import { getJerseyGallery } from "@/lib/data/jersey-media";
import { getInitials, repairText } from "@/lib/utils";

type JerseyVisualProps = {
  product: Jersey;
  mode?: "card" | "detail";
  priority?: boolean;
};

const WHITE_BLUR = "data:image/gif;base64,R0lGODlhAQABAIAAAP7//wAAACH5BAAAAAAALAAAAAABAAEAAAICRAEAOw==";

// Tiled diagonal "DRESIFY" watermark — makes stolen screenshots useless.
export const WATERMARK =
  "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='260' height='170'%3E%3Ctext x='0' y='95' font-family='Arial,sans-serif' font-weight='700' font-size='26' fill='rgba(0,0,0,0.07)' transform='rotate(-28 130 85)'%3EDRESIFY%3C/text%3E%3C/svg%3E\")";

export function JerseyVisual({ product, mode = "card", priority = false }: JerseyVisualProps) {
  const gallery = product.images ?? getJerseyGallery(product.slug);
  const frontImage = gallery[0];
  const backImage = gallery[1];
  const hasRealImages = gallery.length > 0;
  const isCard = mode === "card";

  return (
    <div
      className={`relative overflow-hidden border-b border-white/10 ${
        mode === "detail"
          ? "aspect-[4/5] min-h-[420px]"
          : "aspect-[4/5] bg-[#fbfbfb]"
      }`}
    >
      {mode === "detail" ? (
        <>
          <div className="absolute inset-x-[15%] bottom-[6%] h-16 rounded-full bg-black/60 blur-[36px]" />
        </>
      ) : (
        <>
          <div className="absolute inset-0 bg-[#fbfbfb]" />
          {/* Subtle bottom shadow so jersey doesn't float */}
          <div className="absolute inset-x-[15%] bottom-[3%] h-6 rounded-full bg-black/10 blur-[14px]" />
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
                priority={priority}
                placeholder="blur"
                blurDataURL={WHITE_BLUR}
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
              {/* Tiled diagonal watermark over the jersey */}
              <div
                className="pointer-events-none absolute inset-0 z-10 select-none"
                style={{ backgroundImage: WATERMARK, backgroundRepeat: "repeat" }}
                aria-hidden
              />
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
        <span className="pointer-events-none absolute bottom-3 right-3 select-none font-heading text-[15px] tracking-[0.18em] text-black/30">
          DRES<span className="text-accent/60">IFY</span>
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
