/* Prsten (oval) — mali dio podataka ploče koji treba ODMAH (SSR ploča = LCP slika, kadar u CSS-u, preload).
   Puni put prstena (lib/data/oval-plate.ts, ~100 kB, automatski generiran) učitava se tek u pregledniku (zaseban chunk).
   Vrijednosti MORAJU biti iste kao u oval-plate.ts — oval-hero ih u razvoju usporedi kad stigne puni modul (console.warn).
   plateSmall: ista ploča (final-v3/graded-m.png) smanjena na 860 px (mobiteli DPR ≤ 2; AVIF q60 / WebP q75). */
export type OvalMeta = {
  size: [number, number];
  focus: { x: number; hook: [number, number]; ppm: number };
  nameBox: [number, number, number, number];
  /** opseg prstena (m) — razmak dresova = opseg / broj */
  perimeter: number;
  plate: [avif: string, webp: string];
  plateCables: [avif: string, webp: string];
  plateSmall: { w: number; avif: string; webp: string } | null;
};

export const OVAL_META: { desktop: OvalMeta; mobile: OvalMeta } = {
  desktop: {
    size: [2560, 1440],
    focus: { x: 1280, hook: [1280, 482.4], ppm: 643.17 },
    nameBox: [932.5, 244.8, 1627.5, 446.4],
    perimeter: 10.7892,
    plate: ["/film/oval/oval-plate-desktop.avif", "/film/oval/oval-plate-desktop.webp"],
    plateCables: ["/film/oval/oval-plate-desktop-cables.avif", "/film/oval/oval-plate-desktop-cables.webp"],
    plateSmall: null,
  },
  mobile: {
    size: [1290, 2796],
    focus: { x: 645, hook: [645, 712.98], ppm: 1235.14 },
    nameBox: [341.3, 251.6, 948.7, 643.1],
    perimeter: 6.3466,
    plate: ["/film/oval/oval-plate-mobile.avif", "/film/oval/oval-plate-mobile.webp"],
    plateCables: ["/film/oval/oval-plate-mobile-cables.avif", "/film/oval/oval-plate-mobile-cables.webp"],
    plateSmall: { w: 860, avif: "/film/oval/oval-plate-mobile-860.avif", webp: "/film/oval/oval-plate-mobile-860.webp" },
  },
};

/** Izbor ploče (isti u <picture>/preloadu, u CSS kadru i u JS-u): računalo ili široki/položeni prozor → ploča "desktop". */
export const OVAL_DESK_MQ = "(min-width: 1024px), (min-aspect-ratio: 5/8)";
/** komplement OVAL_DESK_MQ (za preload mobilne ploče) */
export const OVAL_MOB_MQ = "(max-width: 1023.98px) and (max-aspect-ratio: 1249/2000)";
