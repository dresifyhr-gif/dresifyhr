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
  sizes?: string;
};

const CARD_SIZES = "(max-width: 768px) 50vw, (max-width: 1280px) 25vw, 20vw";

// Koncept A: svaki proizvod stoji na istoj tamnoj pozornici (#1A1A1A→#0F0F0F).
//  - Ima izrez (product.stage): dres sam, ~86 % pločice 4:5, sjena je već u slici.
//  - Nema izreza (npr. tek dodan u adminu): originalna fotografija kao umetnuta
//    kartica sa sjenom — nikad više bijela pločica preko cijele kartice.
// Bez "use client": nema stanja, pa radi i u server i u klijent komponentama.
export function JerseyVisual({ product, mode = "card", priority = false, sizes = CARD_SIZES }: JerseyVisualProps) {
  const gallery = product.images ?? getJerseyGallery(product.slug);
  const frontImage = gallery[0];
  const stage = product.stage;
  const isCard = mode === "card";
  const alt = `${repairText(product.klub)} ${repairText(product.igrac)} — dres`;

  return (
    <div className={`stage relative overflow-hidden rounded-[2px] ${isCard ? "aspect-[4/5]" : "aspect-square min-h-[340px]"}`}>
      {/* Mekani reflektor odozgo (koncept: "faint top spotlight") */}
      <span aria-hidden className="pointer-events-none absolute inset-0 bg-[radial-gradient(70%_45%_at_50%_0%,rgba(255,255,255,.07),transparent_70%)]" />
      {stage ? (
        <Image
          src={stage.src}
          alt={alt}
          fill
          priority={priority}
          sizes={sizes}
          className={`object-contain object-center px-[4%] py-[6%] transition-transform duration-300 ease-out ${isCard ? "group-hover:-translate-y-1 group-hover:scale-[1.03]" : ""}`}
        />
      ) : frontImage ? (
        <div className={`absolute overflow-hidden rounded-sm bg-white shadow-[0_16px_28px_rgba(0,0,0,.55)] ${isCard ? "inset-x-3 top-[18%] bottom-[18%]" : "inset-6"}`}>
          <Image
            src={frontImage.src}
            alt={alt}
            fill
            priority={priority}
            sizes={sizes}
            className="object-contain object-center p-1 transition-transform duration-300 group-hover:scale-[1.03]"
          />
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
