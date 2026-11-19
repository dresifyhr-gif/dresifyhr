/** Korijen demoa D (dijele ga serverske i klijentske datoteke). */
export const D_BASE = "/cisto-demo/d";

/** Gdje kadar (d-frame) postavlja donji rub dresa u sredini: px iznad DNA platna.
 *  Ispod ruba je pojas mokrog poda s odrazom; info blok (DHome) se podvlači preko donjeg
 *  dijela poda. narrow = platno uže od 0,9 omjera. */
export const D_HEM_PX = { narrow: 150, wide: 196 };
/** Najviši trag boje grafita: px ispod gornjeg ruba platna (bez praznog pojasa iznad). */
export const D_GRAF_TOP_PX = 10;

// Stilovi Smjera D (bez CSS varijabli u Tailwind bojama — ovo je običan CSS).
// Naslovi: Barlow (rečenice), ne Bebas — Bebas ostaje samo u znaku i na zidu scene.
export const D_CSS = `
.d-root h1,.d-root h2,.d-root h3{font-family:var(--font-barlow),sans-serif}
.d-root{font-feature-settings:"tnum" 0}
.d-fade{animation:d-fade .32s cubic-bezier(.22,1,.36,1)}
@keyframes d-fade{from{opacity:0;transform:translateY(4px)}to{opacity:1;transform:none}}
@media (prefers-reduced-motion:reduce){.d-fade{animation:none}}
.d-stage>div:nth-child(-n+2){-webkit-mask-image:linear-gradient(180deg,#000 78%,transparent 99%);mask-image:linear-gradient(180deg,#000 78%,transparent 99%)}
@media (min-width:1024px){.d-stage>div:nth-child(-n+2){
-webkit-mask-image:linear-gradient(90deg,transparent,#000 14%,#000 86%,transparent),linear-gradient(180deg,transparent,#000 9%,#000 72%,transparent 97%);
-webkit-mask-composite:source-in;
mask-image:linear-gradient(90deg,transparent,#000 14%,#000 86%,transparent),linear-gradient(180deg,transparent,#000 9%,#000 72%,transparent 97%);
mask-composite:intersect}}
`;

/* ---------- tekst (isti na naslovnici, karticama i stranici dresa) ---------- */

/** Cijena kao u hrvatskom pravopisu: "20 €" (neprelomivi razmak). Jedini format u smjeru D. */
export function dPrice(price?: number | null) {
  return `${price ?? 20} €`;
}

/** "Baturina nr16" → "Baturina #16" (broj na dresu, ne kratica "nr"). */
export function dTitle(title: string) {
  return title.replace(/\s*\bnr\.?\s*(\d{1,2})\b/gi, " #$1").replace(/\s{2,}/g, " ").trim();
}

// Riječi koje u podacima dolaze bez dijakritika (unos iz admina).
const DIACRITICS: [RegExp, string][] = [
  [/\bdomaci\b/gi, "domaći"],
  [/\bgostujuci\b/gi, "gostujući"],
  [/\btreci\b/gi, "treći"],
  [/\bzuti\b/gi, "žuti"],
  [/\bcrno\/zuti\b/gi, "crno/žuti"],
  [/\bnarancasti\b/gi, "narančasti"],
  [/\bljubicasti\b/gi, "ljubičasti"],
];

/** Podnaslov varijante: dijakritici + veliko početno slovo ("Domaci 2026" → "Domaći 2026"). */
export function dVariant(variant: string) {
  let v = variant.trim();
  for (const [re, to] of DIACRITICS) v = v.replace(re, (m) => (m[0] === m[0].toUpperCase() ? to[0].toUpperCase() + to.slice(1) : to));
  return v ? v[0].toUpperCase() + v.slice(1) : v;
}
