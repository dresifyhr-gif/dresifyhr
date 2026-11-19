/** Korijen demoa E (konačni smjer: UI2 + dubinska oštrina, veći dres u fokusu, proceduralni zid). */
export const E_BASE = ""; // prave rute: naslovnica "/"
export const E_NAV_H = 68;
export const E_NAV_H_M = 56;

/** Stavka mega-izbornika (prava kolekcija iz lib/data/seo-collections). */
export type ELink = { label: string; href: string };
export type EMega = { categories: ELink[]; clubs: ELink[]; players: ELink[] };

/** Kadar scene (e-frame): gdje sjedne donji rub dresa u fokusu — uski ekran px iznad dna platna,
 *  široki udio visine od dna (rub na ~70 % visine, iznad natpisa) — i px ispod vrha platna gdje
 *  počinje najviši trag grafita (navigacija je prozirna preko scene). */
export const E_HEM = { narrowPx: 98, wideFrac: 0.345 };
/** mobitel bez odraza poda: rub dresa px iznad dna platna (samo traka poda + meka sjena) */
export const E_HEM_LITE_PX = 40;
export const E_GRAF_TOP_PX = { narrow: E_NAV_H_M + 14, wide: E_NAV_H + 14 };

// Obični CSS (bez CSS varijabli u Tailwind bojama).
export const E_CSS = `
.e-root{font-family:var(--font-barlow),sans-serif}
.e-display,.d-root .e-display,.ime-root .e-display{font-family:var(--font-bebas),sans-serif;font-weight:400;letter-spacing:.005em;line-height:.84}
/* golemo prezime: mjesto iznad verzala za kvačice (Š, Ć, Ž) — truncate inače reže dijakritike */
.e-name{padding-top:.16em;margin-top:-.16em}
.e-nav .fl-icon-btn{background:none;border:0;box-shadow:none;border-radius:0;width:40px;height:40px;color:rgba(255,255,255,.82)}
.e-nav .fl-icon-btn:hover{color:#e8ff3c;background:none}
.e-nav a[aria-label]:hover{color:#e8ff3c}
.e-link{position:relative}
.e-link::after{content:"";position:absolute;left:0;right:0;bottom:-7px;height:1px;background:#e8ff3c;transform:scaleX(0);transform-origin:left;transition:transform .28s cubic-bezier(.22,1,.36,1)}
.e-link:hover::after,.e-link[data-open="true"]::after,.e-link[aria-current="page"]::after{transform:scaleX(1)}
.e-in{animation:e-in .55s cubic-bezier(.16,1,.3,1) both}
.e-in-2{animation:e-in .55s .06s cubic-bezier(.16,1,.3,1) both}
.e-in-3{animation:e-in .55s .12s cubic-bezier(.16,1,.3,1) both}
@keyframes e-in{from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:none}}
.e-mega{animation:e-mega .22s cubic-bezier(.22,1,.36,1) both}
@keyframes e-mega{from{opacity:0;transform:translateY(-6px)}to{opacity:1;transform:none}}
.e-sheet{animation:e-sheet .3s cubic-bezier(.22,1,.36,1) both}
@keyframes e-sheet{from{opacity:0}to{opacity:1}}
.e-sheet li{animation:e-in .42s cubic-bezier(.16,1,.3,1) both}
/* katalog: naslov "Katalog" nosi razdjelnik poglavlja (02) — DCatalogov vlastiti h2 se skriva */
.e-cat>div>h2:first-of-type{display:none}
.e-cat>div>h2:first-of-type+div{margin-top:0}
/* stranica dresa: prekidač Prednja/Leđa bez kapsule — tekst + tanka crta ispod aktivnog */
.e-stage [role="group"][aria-label^="Strana dresa"]{border:0;background:none;box-shadow:none;border-radius:0;gap:18px}
.e-stage [role="group"][aria-label^="Strana dresa"] button{border-radius:0;background:none!important;padding-left:2px;padding-right:2px;position:relative}
.e-stage [role="group"][aria-label^="Strana dresa"] button[aria-pressed="true"],.e-stage [role="group"][aria-label^="Strana dresa"] button[aria-checked="true"]{color:#fff}
.e-stage [role="group"][aria-label^="Strana dresa"] button.bg-white{color:#fff;font-weight:500}
.e-stage [role="group"][aria-label^="Strana dresa"] button.bg-white::after{content:"";position:absolute;left:2px;right:2px;bottom:4px;height:1px;background:#e8ff3c}
/* natpis tijekom listanja: ne gasi se — prezime samo kratko pretopi (bez praznog pojasa) */
.e-swap{animation:e-swap .26s cubic-bezier(.22,1,.36,1) both}
@keyframes e-swap{from{opacity:.25;transform:translateY(5px)}to{opacity:1;transform:none}}
/* katalog bez kutija: kartica nema sivu plohu ni pozornicu, samo dres na svojoj šipki */
.e-cat .hc-stage,.e-cat .hc-stage.hc-ime{background:none!important}
.e-cat [class*="bg-[#0e0e0e]"]{background:transparent!important}
@media (prefers-reduced-motion:reduce){.e-in,.e-in-2,.e-in-3,.e-swap,.e-mega,.e-sheet,.e-sheet li{animation:none}}
`;

/** "Baturina nr16" → { name: "Baturina", num: "16" } */
export function eSplit(title: string) {
  const t = title.replace(/\s*\bnr\.?\s*(\d{1,2})\b/gi, " #$1").replace(/\s{2,}/g, " ").trim();
  const m = t.match(/^(.*?)\s*#(\d{1,2})$/);
  return m ? { name: m[1], num: m[2] } : { name: t, num: null as string | null };
}

const DIACRITICS: [RegExp, string][] = [
  [/\bdomaci\b/gi, "domaći"],
  [/\bgostujuci\b/gi, "gostujući"],
  [/\btreci\b/gi, "treći"],
  [/\bzuti\b/gi, "žuti"],
  [/\bnarancasti\b/gi, "narančasti"],
  [/\bljubicasti\b/gi, "ljubičasti"],
];

export function eVariant(v: string) {
  let s = v.trim();
  for (const [re, to] of DIACRITICS) s = s.replace(re, (m) => (m[0] === m[0].toUpperCase() ? to[0].toUpperCase() + to.slice(1) : to));
  return s ? s[0].toUpperCase() + s.slice(1) : s;
}

// Prezimena koja u podacima dolaze bez dijakritika (na dresu su s njima).
const NAMES: Record<string, string> = {
  stanisic: "Stanišić", perisic: "Perišić", vuskovic: "Vušković", modric: "Modrić", kovacic: "Kovačić",
  livakovic: "Livaković", sucic: "Sučić", kramaric: "Kramarić", brozovic: "Brozović", mbappe: "Mbappé",
  baturina: "Baturina", pasalic: "Pašalić", majer: "Majer", vlasic: "Vlašić", juranovic: "Juranović",
  sosa: "Sosa", erlic: "Erlić", mandzukic: "Mandžukić", rakitic: "Rakitić", suker: "Šuker",
};
export function eName(name: string) {
  return name.replace(/[A-Za-z]+/g, (w) => NAMES[w.toLowerCase()] ?? w);
}

export const ePrice = (p?: number | null) => `${p ?? 20} €`;
