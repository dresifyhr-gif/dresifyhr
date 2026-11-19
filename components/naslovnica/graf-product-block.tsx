"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import type { MouseEvent } from "react";

import type { OrmarRailItem } from "@/lib/data/ormar-items";
import { displayName } from "@/components/home/ormar/ormar-g-lib";

/* ------------------------------------------------------------------ */
/*  Scena "grafit": blok proizvoda dolje u sredini (kao na konceptu) —  */
/*  brojač 01 / 144, ime, cijena u neonu i neonski gumb "Pogledaj      */
/*  dres". Leži preko mokrog poda (dno platna). Strelice lijevo/desno   */
/*  na visini dresa samo na širem ekranu (na mobitelu se šipka vuče).   */
/* ------------------------------------------------------------------ */

export const isGraffitiScene = () => {
  if (typeof window === "undefined") return true;
  try {
    return new URLSearchParams(window.location.search).get("scena") !== "staro";
  } catch {
    return true;
  }
};

const pad = (n: number) => String(n).padStart(2, "0");

export function GrafProductBlock({
  item,
  index,
  total,
  href,
  onOpen,
  onPrev,
  onNext,
}: {
  item: OrmarRailItem | undefined;
  index: number;
  total: number;
  href: string;
  /** klik na gumb (npr. kartica s veličinama); bez njega gumb je obična poveznica */
  onOpen?: () => void;
  onPrev?: () => void;
  onNext?: () => void;
}) {
  const name = item ? displayName(item) : null;
  const suffix = item && (item.group === "trenirke" || item.group === "kompleti") ? "" : " dres";
  const click = onOpen
    ? (e: MouseEvent) => {
        e.preventDefault();
        onOpen();
      }
    : undefined;
  return (
    <>
      {(onPrev || onNext) && (
        <div className="pointer-events-none absolute inset-x-0 top-[44%] z-10 hidden -translate-y-1/2 justify-between px-6 sm:flex lg:px-10">
          <button
            type="button"
            onClick={onPrev}
            aria-label="Prethodni dres"
            className="pointer-events-auto inline-flex h-14 w-14 items-center justify-center rounded-full border border-white/10 bg-[#0d0d0d]/80 text-white/85 transition hover:border-white/30 hover:text-white active:scale-95"
          >
            <ChevronLeft strokeWidth={1.6} className="h-6 w-6" />
          </button>
          <button
            type="button"
            onClick={onNext}
            aria-label="Sljedeći dres"
            className="pointer-events-auto inline-flex h-14 w-14 items-center justify-center rounded-full border border-white/10 bg-[#0d0d0d]/80 text-white/85 transition hover:border-white/30 hover:text-white active:scale-95"
          >
            <ChevronRight strokeWidth={1.6} className="h-6 w-6" />
          </button>
        </div>
      )}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10 bg-[linear-gradient(0deg,rgba(8,8,8,0.72)_0%,rgba(8,8,8,0.35)_55%,rgba(8,8,8,0)_100%)] px-4 pb-[max(env(safe-area-inset-bottom),16px)] pt-10 sm:pb-7 sm:pt-14">
        {item && name ? (
          <div key={item.slug} className="mx-auto flex max-w-[640px] flex-col items-center" aria-live="polite">
            <p className="text-[11px] font-medium tabular-nums tracking-[0.24em] text-white/45 sm:text-[12px]">
              <span className="text-white">{pad(index + 1)}</span> / {pad(total)}
            </p>
            <div className="mt-2 flex w-full items-center justify-center gap-4 sm:mt-3 sm:gap-8">
              <div className="min-w-0 text-right">
                <p className="truncate text-[16px] font-semibold leading-tight tracking-[-0.01em] text-white sm:text-[24px]">
                  {name.title}
                  {suffix}
                </p>
                <p className="mt-0.5 font-heading text-[30px] leading-none tracking-[0.02em] text-[#e8ff3c] sm:text-[42px]">{item.price} €</p>
              </div>
              <a
                href={href}
                onClick={click}
                className="pointer-events-auto inline-flex h-12 shrink-0 items-center gap-2 rounded-[3px] bg-[#e8ff3c] pl-5 pr-4 text-[14px] font-semibold text-black shadow-[0_0_30px_rgba(232,255,60,0.22)] transition hover:bg-[#f0ff70] active:scale-[0.98] sm:h-14 sm:gap-3 sm:pl-9 sm:pr-7 sm:text-[15px]"
              >
                Pogledaj dres
                <ChevronRight strokeWidth={2.2} className="h-4 w-4" />
              </a>
            </div>
            <p className="mt-2.5 text-[11.5px] text-white/45 sm:mt-3 sm:text-[13px]">Plaćanje pouzećem · Dostava 2–5 dana</p>
          </div>
        ) : null}
      </div>
    </>
  );
}
