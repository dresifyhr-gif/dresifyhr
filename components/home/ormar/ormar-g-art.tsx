"use client";

import Image from "next/image";

import type { OrmarRailItem } from "@/lib/data/ormar-items";
import { HOOK_INNER, IMG_ASPECT, JACKET_HOOK, PAIR_ASPECT, PANTS_ASPECT, PANTS_HOOK, displayName } from "./ormar-g-lib";

// Odjeća na vješalici u okviru visine h (širina = h × omjer stavke). Isti raspored na šipki i
// u kartici, pa let sa šipke nema izobličenja. Trenirka = dvije vješalice (jakna + hlače),
// svaka je svoj komad (svoje njihalo na šipki).
// inner = okvir slike unutar komada (hlače bez kuke su malo manje i spuštene ispod docrtane kuke);
// hook = docrtaj kuku iznad šipke-vješalice hlača.
type Piece = {
  key: "dres" | "jakna" | "hlace";
  src: string;
  left: number;
  width: number;
  alt: string;
  inner?: { top: number; left: number; width: number; height: number };
  hook?: boolean;
};

// Hlače s kukom (mjereno na 900 px): šipka-vješalica počinje na ~75/900, kuka iznad nje.
// Hlače bez kuke imaju šipku na samom vrhu (2/900) i iste su visine slike → smanji ih na
// isti omjer (šipka → dno 823/895) i spusti tako da šipka dođe na 75/900.
const PANTS_BAR = 75 / 900;
const PANTS_FIT = 823 / 895;

export function pieces(item: OrmarRailItem, h: number, face: "back" | "front" = "back"): Piece[] {
  const { club, title } = displayName(item);
  if (item.img.kind === "trenirka") {
    const jw = IMG_ASPECT * h;
    const pw = PANTS_ASPECT * h;
    return [
      // Hlače prve (iza), jakna preko njih.
      {
        key: "hlace",
        src: item.img.hlace,
        left: PANTS_HOOK * h - pw / 2,
        width: pw,
        alt: `${club} ${title} — hlače trenirke na vješalici`,
        ...(item.img.hlaceHook
          ? {}
          : { hook: true, inner: { top: (PANTS_BAR - 0.002) * h, left: (pw * (1 - PANTS_FIT)) / 2, width: pw * PANTS_FIT, height: h * PANTS_FIT } }),
      },
      { key: "jakna", src: item.img.jakna, left: JACKET_HOOK * h - jw / 2, width: jw, alt: `${club} ${title} — jakna trenirke na vješalici` },
    ];
  }
  const src = face === "front" && item.img.front ? item.img.front : item.img.back;
  return [{ key: "dres", src, left: 0, width: IMG_ASPECT * h, alt: `${club} ${title} — ${face === "front" ? "prednja strana" : "leđa"} dresa na vješalici` }];
}

// "sizes" slika na šipki (stage ih ponovno koristi → ista datoteka iz predmemorije).
export const RAIL_SIZES = {
  dres: "(min-width: 1024px) 345px, (min-width: 640px) 322px, 69vw",
  jakna: "(min-width: 1024px) 345px, (min-width: 640px) 322px, 69vw",
  hlace: "(min-width: 1024px) 195px, (min-width: 640px) 180px, 39vw",
} as const;

export const pairWidth = (h: number) => PAIR_ASPECT * h;
export const hookY = (h: number) => HOOK_INNER * h;

// Kromirana kuka iznad šipke-vješalice hlača (oblik kao kuka na fotografijama jakni/dresova):
// vrh kuke je na unutarnjem vrhu zavoja = gornji rub šipke ormara (HOOK_INNER), dolje ulazi u
// sredinu šipke-vješalice. Koordinate u 1/900 visine slike, ishodište = sredina komada.
export function PantsHook({ h, width, filter }: { h: number; width: number; filter?: string }) {
  const u = h / 900;
  const wu = width / u;
  const d = "M-7 6.5C-5 2.8 3 1.8 8 4.2C15 8 19 18 17 28C15 38 6 44 1.2 52L1.2 75";
  return (
    <svg
      aria-hidden
      className="pointer-events-none absolute left-0 top-0 overflow-visible"
      width={width}
      height={80 * u}
      viewBox={`${-wu / 2} 0 ${wu} 80`}
      style={filter !== undefined ? { filter, transition: "filter 450ms ease-out" } : undefined}
    >
      <path d={d} fill="none" stroke="#1b1c1f" strokeOpacity="0.85" strokeWidth={Math.max(4.2, 1.6 / u)} strokeLinecap="round" />
      <path d={d} fill="none" stroke="#a9adb3" strokeWidth={Math.max(3, 1.1 / u)} strokeLinecap="round" />
      <path d={d} fill="none" stroke="#f4f5f7" strokeOpacity="0.85" strokeWidth={Math.max(1, 0.45 / u)} strokeLinecap="round" />
      {/* spoj kuke i šipke-vješalice */}
      <rect x={-4.5} y={68} width={11} height={8} rx={2} fill="#2a2b2f" />
      <rect x={-4.5} y={68} width={11} height={1.6} rx={0.8} fill="#8b8f95" />
    </svg>
  );
}

// Komad odjeće: slika (u svom okviru) + docrtana kuka ako treba.
export function PieceArt({ pc, h, filter, children }: { pc: Piece; h: number; filter?: string; children: React.ReactNode }) {
  if (!pc.inner) return <>{children}</>;
  const { top, left, width, height } = pc.inner;
  return (
    <>
      {pc.hook && <PantsHook h={h} width={pc.width} filter={filter} />}
      <div className="absolute" style={{ top, left, width, height }}>
        {children}
      </div>
    </>
  );
}

export function PieceImage({
  src,
  alt,
  sizes,
  eager,
  filter,
  priority,
}: {
  src: string;
  alt: string;
  sizes: string;
  eager?: boolean;
  filter?: string;
  priority?: boolean;
}) {
  return (
    <Image
      src={src}
      alt={alt}
      fill
      quality={90}
      sizes={sizes}
      priority={priority}
      loading={priority ? undefined : eager ? "eager" : "lazy"}
      draggable={false}
      className="pointer-events-none select-none object-contain object-top"
      style={filter !== undefined ? { filter, transition: "filter 450ms ease-out" } : undefined}
    />
  );
}
