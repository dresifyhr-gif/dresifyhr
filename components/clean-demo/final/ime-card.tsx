"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef } from "react";

import { hangerImage } from "@/components/product/hanger-preload";
import { intentAllowed, observeCardForPrefetch, queueViewportPrefetch } from "@/components/site/hanger-prefetch";

import { IME_BASE, imePrice, type ImeCardData } from "./ime-const";
import { useImeText } from "./ime-i18n";
import { openProduct } from "./ime-transition";

/* ------------------------------------------------------------------ */
/*  Kartica u stilu reklame: ugljen, tanka kromirana šipka, dres na     */
/*  vješalici, golemo obrisano prezime iza, "YAMAL. BROJ 19." gore.     */
/*  Klik otvara stranicu dresa s prijelazom (ime-transition.ts).        */
/*  Lokalna kartica — ne dira components/site/hanger-card-art.tsx.      */
/* ------------------------------------------------------------------ */

const RAIL_Y = 16; // % visine kadra

/* Stranica dresa je 2D (ime-photo-stage, prave fotke) — 3D chunk se više ne predgrijava;
   ?scena=3d ga učita sam. Na namjeru samo slika (dijeli HTTP cache sa stranicom). */
function prefetchImeIntent(src: string) {
  if (!intentAllowed()) return;
  void hangerImage(src).catch(() => undefined);
}

/** muted: broj bijelo-sivo (naslovnica: jedini neon na ekranu je gumb "Pogledaj dres"). */
export function Overline({ surname, number, size = "card", muted = false }: { surname: string; number: string; size?: "card" | "stage"; muted?: boolean }) {
  const T = useImeText();
  return (
    <p className={`ime-display whitespace-nowrap leading-none ${size === "card" ? "text-[15px] lg:text-[17px]" : "text-[24px] lg:text-[34px]"}`}>
      <span className="text-white">{surname}.</span>
      {number ? <span className={muted ? "text-white/55" : "text-[#e8ff3c]"}> {T.number} {number}.</span> : null}
    </p>
  );
}

export function ImeCard({ c, priority = false, sizes = "(max-width: 1023px) 50vw, 25vw" }: { c: ImeCardData; priority?: boolean; sizes?: string }) {
  const router = useRouter();
  const T = useImeText();
  const rootRef = useRef<HTMLElement>(null);
  const intentDone = useRef(false);
  const onIntent = () => {
    if (intentDone.current) return;
    intentDone.current = true;
    prefetchImeIntent(c.img);
  };
  useEffect(() => {
    const el = rootRef.current;
    if (!el) return;
    return observeCardForPrefetch(el, () => queueViewportPrefetch(c.img, hangerImage));
  }, [c.img]);
  const href = `${IME_BASE}/dres/${c.slug}`;
  const letters = Math.max(3, c.surname.length);
  // obris preko ~1,25 širine kartice (rubovi izlaze iz kadra, kao na reklami)
  const nameSize = `${(125 / (letters * 0.43)).toFixed(2)}cqw`;
  // slika: vrh kuke na šipki, kuka u sredini kadra
  const h = 73; // % visine kadra
  const wPct = `calc(${h}cqh * ${c.aspect.toFixed(4)})`;

  return (
    <article
      ref={rootRef}
      className="ime-card group"
      data-ime-card={c.slug}
      onPointerEnter={(e) => {
        if (e.pointerType === "mouse") onIntent();
      }}
      onTouchStart={onIntent}
    >
      <Link
        href={href}
        prefetch
        onClick={(e) => {
          if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;
          e.preventDefault();
          openProduct(router, href, c.slug, e.currentTarget);
        }}
        className="block outline-none focus-visible:ring-1 focus-visible:ring-white/60"
      >
        <div
          className="relative aspect-[4/5] overflow-hidden bg-[#121212]"
          style={{
            containerType: "size",
            backgroundImage: "radial-gradient(ellipse 75% 60% at 50% 46%, #1d1d1d 0%, #141414 55%, #0f0f0f 100%)",
          }}
        >
          <div aria-hidden className="absolute inset-x-0 flex justify-center" style={{ top: "50%", transform: "translateY(-50%)" }}>
            <span data-vt="name" className="ime-outline block whitespace-nowrap leading-[0.8]" style={{ fontSize: nameSize }}>
              {c.surname}
            </span>
          </div>

          <div data-vt="over" className="absolute left-3.5 lg:left-4" style={{ bottom: `calc(${100 - RAIL_Y}% + 9px)` }}>
            <Overline surname={c.surname} number={c.number} />
          </div>

          <span
            aria-hidden
            data-vt="rail"
            className="ime-rail absolute inset-x-0 h-[3px] -translate-y-1/2"
            style={{
              top: `${RAIL_Y}%`,
              background: "linear-gradient(180deg,#f3f3f5 0 25%,#55555a 25% 50%,#d9d9dc 50% 75%,#121216 75% 100%)",
            }}
          />

          <div
            data-vt="jersey"
            className="absolute transition-transform duration-500 ease-[cubic-bezier(.22,1,.36,1)] group-hover:-rotate-[1.5deg]"
            style={{
              top: `calc(${RAIL_Y}% - 2px)`,
              height: `${h}%`,
              width: wPct,
              left: `calc(50% - ${wPct} * ${c.hookX.toFixed(4)})`,
              transformOrigin: `${(c.hookX * 100).toFixed(1)}% 0`,
            }}
          >
            <Image
              src={c.img}
              alt={`${c.club} ${c.title} ${T.onHanger}`}
              fill
              priority={priority}
              sizes={sizes}
              draggable={false}
              className="pointer-events-none object-contain drop-shadow-[0_16px_18px_rgba(0,0,0,0.55)]"
            />
          </div>
        </div>

        <div className="pt-3.5">
          <p className="truncate text-[12.5px] text-white/45">
            {c.club}
            {c.variant ? <span className="text-white/30"> · {c.variant}</span> : null}
            {c.kidsOnly && !c.soldOut ? <span className="text-white/70"> · {T.kidsOnly}</span> : null}
          </p>
          <div className="mt-1 flex items-baseline justify-between gap-3">
            <h3 className="ime-card-name e-display truncate pt-0.5 text-[22px] !leading-none text-white lg:text-[24px]">
              {c.title}
            </h3>
            <p className="shrink-0 text-[15px] tabular-nums text-[#e8ff3c]">{c.soldOut ? <span className="text-white/40">{T.soldOut}</span> : imePrice(c.price)}</p>
          </div>
        </div>
      </Link>
    </article>
  );
}
