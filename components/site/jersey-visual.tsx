"use client";

import Image from "next/image";

import { type Jersey } from "@/lib/data/jerseys";
import { getJerseyGallery } from "@/lib/data/jersey-media";
import { getInitials, repairText } from "@/lib/utils";
import { WATERMARK } from "@/lib/watermark-css";

export { WATERMARK };

type JerseyVisualProps = {
  product: Jersey;
  mode?: "card" | "detail";
  priority?: boolean;
};

const WHITE_BLUR = "data:image/gif;base64,R0lGODlhAQABAIAAAP7//wAAACH5BAAAAAAALAAAAAABAAEAAAICRAEAOw==";

// Koncept A: fotografija proizvoda je uvijek "bijela kartica" (studijske slike su
// na bijeloj pozadini), a oko nje je tamna pozornica stranice.
export function JerseyVisual({ product, mode = "card", priority = false }: JerseyVisualProps) {
  const gallery = product.images ?? getJerseyGallery(product.slug);
  const frontImage = gallery[0];
  const backImage = gallery[1];
  const hasRealImages = gallery.length > 0;
  const isCard = mode === "card";

  return (
    <div
      className={`relative overflow-hidden rounded-[2px] ${
        hasRealImages ? "bg-white" : "stage"
      } ${mode === "detail" ? "aspect-square min-h-[340px]" : "aspect-square"}`}
    >
      {hasRealImages ? (
        <div className={`absolute inset-0 ${isCard ? "p-1.5" : "p-6"}`}>
          <div className="relative h-full w-full">
            <Image
              src={frontImage.src}
              alt={`${repairText(product.klub)} ${repairText(product.igrac)} ${frontImage.altLabel ?? ""}`.trim()}
              fill
              priority={priority}
              placeholder="blur"
              blurDataURL={WHITE_BLUR}
              sizes={mode === "detail" ? "(max-width: 1024px) 100vw, 45vw" : "(max-width: 768px) 50vw, (max-width: 1280px) 33vw, 25vw"}
              className={`object-contain object-center transition duration-300 ${
                isCard && backImage
                  ? "md:group-hover:scale-[1.03] md:group-hover:opacity-0"
                  : isCard
                  ? "group-hover:scale-[1.04]"
                  : ""
              }`}
            />
            {isCard && backImage ? (
              <Image
                src={backImage.src}
                alt={`${repairText(product.klub)} ${repairText(product.igrac)} ${backImage.altLabel ?? ""}`.trim()}
                fill
                sizes="(max-width: 1280px) 33vw, 25vw"
                className="hidden object-contain object-center opacity-0 transition duration-300 md:block md:group-hover:scale-[1.03] md:group-hover:opacity-100"
              />
            ) : null}
            <div
              className="pointer-events-none absolute inset-0 z-10 select-none"
              style={{ backgroundImage: WATERMARK, backgroundRepeat: "repeat" }}
              aria-hidden
            />
          </div>
        </div>
      ) : (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 p-4">
          <span className="font-display text-5xl leading-none text-accent">{getInitials(repairText(product.klub))}</span>
          <div className="text-center">
            <p className="text-[9px] font-bold uppercase tracking-[0.3em] text-white/35">Fotografija uskoro</p>
            <p className="mt-1 text-xs font-semibold uppercase tracking-[0.14em] text-white/55">{repairText(product.klub)}</p>
          </div>
        </div>
      )}

      {product.retro && mode === "detail" ? (
        <span className="absolute left-3 top-3 bg-accent px-2 py-1 text-[9px] font-black uppercase tracking-[0.12em] text-black">
          Retro
        </span>
      ) : null}
    </div>
  );
}
