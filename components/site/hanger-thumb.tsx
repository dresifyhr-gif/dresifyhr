import Image from "next/image";

import { cn } from "@/lib/utils";

/* Tamna sličica proizvoda (vješalica) — bez bijele plohe, bez mix-blend.
   Zajednička za košaricu, prijedloge, pretragu, mix, bannere i sticky traku. */

export const THUMB_BG =
  "radial-gradient(120% 70% at 50% 0%, rgba(255,255,255,0.12), rgba(255,255,255,0) 60%), linear-gradient(180deg,#141414,#0a0a0a)";

export function HangerThumb({
  src,
  alt = "",
  className,
  sizes = "80px",
  priority = false,
  imgClassName
}: {
  src?: string | null;
  alt?: string;
  className?: string;
  sizes?: string;
  priority?: boolean;
  /** Zamjenjuje zadani unutarnji razmak slike (px-[8%] pb-[6%] pt-[4%]). */
  imgClassName?: string;
}) {
  return (
    <div
      className={cn(
        "relative shrink-0 overflow-hidden rounded-[12px] border border-white/[0.08] shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]",
        className
      )}
      style={{ background: THUMB_BG }}
    >
      {src ? (
        <Image
          src={src}
          alt={alt}
          fill
          sizes={sizes}
          priority={priority}
          className={cn("object-contain drop-shadow-[0_8px_10px_rgba(0,0,0,0.45)]", imgClassName ?? "px-[8%] pb-[6%] pt-[4%]")}
        />
      ) : (
        <div className="flex h-full items-center justify-center font-heading text-[11px] tracking-[0.18em] text-white/30">DRESIFY</div>
      )}
    </div>
  );
}
