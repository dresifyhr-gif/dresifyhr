import { E_CSS } from "@/components/clean-demo/final/e-css";
import { F_CSS } from "@/components/clean-demo/final/f-css";

/* NOVI DIZAJN — CSS koji layout ubacuje jednom (zaglavlje, podnožje, ladica, kartice).
   Stranice dodaju samo svoje (naslovnica: scena/film/žive kartice; dres: IME_CSS).
   Običan CSS: bez CSS varijabli u Tailwind klasama boja, bez backdrop-blura. */

/* Stari CatalogBrowser (/dresovi, klub/igrač/kategorija, kompleti…): filteri SA STRANE ostaju
   (Igor: "lagani i uvijek na dohvat ruke"), samo tamni restil u jeziku novog dizajna —
   ravna #0a0a0a ploha, tanke crte, limeta samo za aktivno, bez zaobljenih "kartica". */
const CATALOG_CSS = `
.nv-main .panel{background:#0a0a0a;border-color:transparent;border-radius:0;box-shadow:none}
.nv-main .panel>div:first-child h1{font-family:var(--font-bebas),sans-serif;font-weight:400;letter-spacing:.01em}
.nv-main .panel aside{padding-right:20px;border-right:1px solid rgba(255,255,255,.08)}
.nv-main .panel aside p.text-2xl{font-family:var(--font-bebas),sans-serif;font-size:30px;letter-spacing:.01em}
.nv-main .panel aside label[class*="rounded-[8px]"]{border-radius:4px;background:transparent;border-color:rgba(255,255,255,.07);color:rgba(255,255,255,.78)}
.nv-main .panel aside label[class*="rounded-[8px]"]:hover{border-color:rgba(255,255,255,.2);background:transparent}
.nv-main .panel aside input[type="checkbox"]{border-radius:3px;background:#0a0a0a;border-color:rgba(255,255,255,.25)}
.nv-main input[type="checkbox"]{accent-color:#e8ff3c}
.nv-main .panel input[type="checkbox"]:checked{background-color:#e8ff3c;border-color:#e8ff3c;color:#e8ff3c}
/* mobilni filteri: ladica već ima naslov "Filteri / Odaberi" → bez ponovljenog zaglavlja panela;
   pozadina ladice bez backdrop-blura (pravilo brzine: nema blura na velikim plohama) */
@media (max-width:1023px){
.nv-main aside.fixed .flex-1.overflow-y-auto>div>div:first-child>div:first-child{display:none}
.nv-main aside.fixed .flex-1.overflow-y-auto>div>div:first-child{justify-content:flex-end;border-bottom:0;padding-bottom:0}
.nv-main aside.fixed .flex-1.overflow-y-auto>div>div:first-child:not(:has(button)){display:none}
.nv-main button.fixed.inset-0[class*="backdrop-blur"]{backdrop-filter:none;-webkit-backdrop-filter:none}
}
.nv-main .panel [class*="bg-[#111111]"]{background:#0e0e0e}
.nv-main .panel [class*="bg-black"]{background:#0a0a0a}
.nv-main .panel [class*="rounded-[8px]"]{border-radius:4px}
.nv-main .panel input[class*="h-[52px]"],.nv-main .panel select[class*="h-[52px]"]{border-color:rgba(255,255,255,.1)}
.nv-main .panel a[class*="rounded-full"],.nv-main .panel button[class*="rounded-full"]{border-radius:4px}
@media (min-width:1024px){.nv-main .panel aside{top:calc(var(--announcement-offset,0px) + 92px)!important}}
/* prijedlozi pretrage u katalogu: sličice su originalne fotografije (bijela podloga) → bez sličica */
.nv-main .panel a[href^="/dres/"]>div[class*="h-10"][class*="w-10"]{display:none}
`;

/* Sadržajne stranice (o-nama, dostava, blog, igre, ps5, zahvala…): bez pilula — "kicker" iznad
   naslova je tihi tekst, brojač kataloga ("8 kompleta") je običan tekst, ne limeta-gumb. */
const PAGES_CSS = `
.nv-main .section-kicker{border:0;background:none;padding:0;border-radius:0;color:rgba(255,255,255,.42);gap:0}
.nv-main .section-kicker>span{display:none}
.nv-main .panel>div:first-child>span[class*="bg-accent"]{background:none;padding:0;color:rgba(255,255,255,.5);font-weight:500;border-radius:0}
/* neon: kickeri iznad naslova lista i kontakta ("JAKNA + HLAČE", "KATALOG", "KONTAKT") = limeta 85 % + crtica od 22 px */
.nv-main p[class*="tracking-[0.35em]"],.nv-main p[class*="tracking-[0.3em]"]{color:rgba(232,255,60,.85)}
.nv-main p[class*="tracking-[0.35em]"]::before,.nv-main p[class*="tracking-[0.3em]"]::before{content:"";display:inline-block;width:22px;height:1px;background:#e8ff3c;vertical-align:middle;margin-right:12px;transform:translateY(-1px)}
/* neon: kontakt — ikone kanala limeta (bez krugova) */
.nv-main a.group svg[class*="text-white/45"]{color:rgba(232,255,60,.85)}
`;

/* Sadržajne stranice "ravno" (data-nv-flat na korijenu stranice, samo sa zastavicom): bez kutija oko
   kartica, bez pilula, bez krugova/kvadrata oko ikona → tanke crte i tipografija; limeta samo za radnje.
   Gađa postojeće klase (JSX bez zastavice ostaje identičan). Logika igara i tekstovi netaknuti. */
const FLAT_LINE = "background:none!important;border:0!important;border-top:1px solid rgba(255,255,255,.08)!important;border-radius:0!important;box-shadow:none!important;padding-left:0!important;padding-right:0!important";
const FLAT_BARE = "background:none!important;border:0!important;border-radius:0!important;box-shadow:none!important";
const FLAT_CSS = `
/* ---- /ps5 ---- */
[data-nv-flat="ps5"] [class*="rounded-full"][class*="border-accent"]{${FLAT_BARE};padding:0!important;width:auto!important;height:auto!important}
[data-nv-flat="ps5"] section:first-child span[class*="rounded-full"] svg{display:none}
[data-nv-flat="ps5"] [class*="rounded-full"][class*="bg-accent"][class*="text-black"]{${FLAT_BARE};color:#e8ff3c!important;width:auto!important;height:auto!important;font-family:var(--font-bebas),sans-serif;font-weight:400;font-size:30px;line-height:1}
[data-nv-flat="ps5"] [class*="rounded-full"][class*="bg-accent"][class*="text-black"][class*="h-6"]{font-size:22px;min-width:18px;justify-content:flex-start}
[data-nv-flat="ps5"] [class*="bg-[#111]"],[data-nv-flat="ps5"] [class*="bg-white/[0.03]"],[data-nv-flat="ps5"] [class*="bg-accent/[0.05]"],[data-nv-flat="ps5"] [class*="bg-accent/[0.06]"],[data-nv-flat="ps5"] [class*="rounded-[16px]"][class*="bg-accent/[0.08]"]{${FLAT_LINE}}
[data-nv-flat="ps5"] [class*="bg-[#111]"]>svg:not(:last-child){display:none}
[data-nv-flat="ps5"] a[class*="bg-[#111]"]:hover{border-top-color:rgba(232,255,60,.5)!important}
[data-nv-flat="ps5"] a[class*="bg-accent"],[data-nv-flat="ps5"] button[class*="bg-accent"]{border-radius:2px!important}
[data-nv-flat="ps5"] form [class*="rounded-[12px]"]{border-radius:2px!important;background:#0e0e0e!important}
[data-nv-flat="ps5"] a[href="/racun/"][class*="border"]{border:0!important;padding-left:8px!important;padding-right:8px!important;color:rgba(255,255,255,.75)!important;text-decoration:underline;text-underline-offset:5px;text-decoration-color:rgba(255,255,255,.3)}
[data-nv-flat="ps5"] a[href="/racun/"][class*="border"]:hover{color:#fff!important;background:none!important}

/* ---- /igre ---- */
[data-nv-flat="igre"] .ih-card{${FLAT_BARE};border-top:1px solid rgba(255,255,255,.1)!important;overflow:visible!important}
[data-nv-flat="igre"] .ih-card:hover,[data-nv-flat="igre"] .ih-card:focus-visible{border-top-color:rgba(232,255,60,.55)!important}
[data-nv-flat="igre"] .ih-card [class*="to-[#0f0f0f]"]{display:none}
[data-nv-flat="igre"] .ih-card>div:last-child{padding-left:0!important;padding-right:0!important}
[data-nv-flat="igre"] .ih-card span[class*="h-12"][class*="rounded-full"]{${FLAT_BARE};height:auto!important;padding:0!important;color:#e8ff3c!important;font-size:22px!important}
[data-nv-flat="igre"] .ih-card [class*="rounded-full"][class*="border"][class*="px-2"]{${FLAT_BARE};padding-left:0!important;padding-right:0!important}
[data-nv-flat="igre"] [class*="rounded-full"][class*="bg-accent/10"]{${FLAT_BARE};padding:0!important}
[data-nv-flat="igre"] [class*="bg-white/[0.02]"]{${FLAT_LINE}}
[data-nv-flat="igre"] [class*="bg-white/[0.02]"]>span[class*="rounded-[11px]"]{${FLAT_BARE};width:auto!important;height:auto!important;margin-top:2px}

/* ---- igre: /igra, /kviz, /pehar, /zongliranje (samo uvodni zaslon i tekst ispod; igra netaknuta) ---- */
[data-nv-flat="game"] .g2-stage li>span[class*="rounded-[11px]"]{${FLAT_BARE};width:auto!important;height:auto!important}
[data-nv-flat="game"] [role="tablist"][aria-label="Način igre"]{${FLAT_BARE};border-bottom:1px solid rgba(255,255,255,.14)!important;padding:0!important}
[data-nv-flat="game"] [role="tablist"][aria-label="Način igre"]>span[aria-hidden]{top:auto!important;bottom:-1px!important;left:0!important;width:50%!important;height:2px!important;border-radius:0!important}
[data-nv-flat="game"] [role="tablist"][aria-label="Način igre"] [role="tab"]{border-radius:0!important}
[data-nv-flat="game"] [role="tablist"][aria-label="Način igre"] [aria-selected="true"]{color:#fff!important}
[data-nv-flat="game"] .g2-stage button[class*="text-left"][class*="rounded-[14px]"]{${FLAT_BARE};border-bottom:1px solid rgba(255,255,255,.12)!important;padding-left:0!important;padding-right:0!important}
[data-nv-flat="game"] .g2-stage [class*="rounded-[16px]"][class*="bg-white/[0.035]"]{${FLAT_LINE};border-bottom:1px solid rgba(255,255,255,.08)!important}
[data-nv-flat="game"] .g2-stage [class*="rounded-full"][class*="tabular-nums"][class*="px-"]{${FLAT_BARE};padding-left:2px!important;padding-right:2px!important}
[data-nv-flat="game"] .g2-stage [class*="rounded-full"][class*="tabular-nums"][class*="bg-accent"]{color:#e8ff3c!important}
[data-nv-flat="game"] li[class*="rounded-full"]{${FLAT_BARE};padding:0!important}
[data-nv-flat="game"] ul:has(>li[class*="rounded-full"]){column-gap:20px!important;row-gap:6px!important}
[data-nv-flat="game"] li[class*="rounded-[12px]"]{${FLAT_LINE}}
[data-nv-flat="game"] button[class*="h-10"][class*="w-10"][class*="rounded-full"][class*="bg-black/45"]{${FLAT_BARE};color:rgba(255,255,255,.85)!important}
[data-nv-flat="game"] button[class*="h-10"][class*="w-10"][class*="rounded-full"][class*="bg-black/45"] svg{filter:drop-shadow(0 1px 3px rgba(0,0,0,.8))}
[data-nv-flat="game"] button>span[class*="rounded-full"][class*="bg-black/30"][class*="px-2.5"]{${FLAT_BARE};padding-left:0!important;padding-right:0!important}
[data-nv-flat="game"] button[class*="h-[58px]"][class*="bg-accent"]{border-radius:2px!important}
[data-nv-flat="game"] button[class*="h-[58px]"][class*="bg-accent"]:not(.g2-pulse){box-shadow:none!important}
[data-nv-flat="game"] button[class*="h-[50px]"][class*="rounded-[14px]"]{border-radius:2px!important}
[data-nv-flat] nav[aria-labelledby="ostale-igre-naslov"] a[class*="rounded-[14px]"]{${FLAT_LINE}}
[data-nv-flat] nav[aria-labelledby="ostale-igre-naslov"] a[class*="rounded-[14px]"]:hover{border-top-color:rgba(232,255,60,.55)!important}

/* ---- /o-nama, /dostava-i-povrat ---- */
[data-nv-flat="o-nama"] .panel{${FLAT_BARE}}
[data-nv-flat="o-nama"] .panel.flex,[data-nv-flat="dostava"] .panel{${FLAT_LINE}}
[data-nv-flat="o-nama"] .panel [class*="h-11"][class*="w-11"],[data-nv-flat="dostava"] .panel [class*="h-11"][class*="w-11"]{${FLAT_BARE};width:auto!important;height:auto!important;justify-content:flex-start}
[data-nv-flat="o-nama"] section:last-child>div>svg:first-child{display:none}
[data-nv-flat="o-nama"] .button-secondary{border:0!important;color:rgba(255,255,255,.75)!important;text-decoration:underline;text-underline-offset:6px;text-decoration-color:rgba(255,255,255,.3);text-decoration-thickness:1px}
[data-nv-flat="o-nama"] .button-secondary:hover{color:#fff!important}

/* ---- /blog i članci ---- */
[data-nv-flat="blog"] a[class*="bg-[#111111]"][class*="p-6"]{${FLAT_LINE}}
[data-nv-flat="blog"] a[class*="bg-[#111111]"][class*="p-6"]:hover{border-top-color:rgba(232,255,60,.55)!important}
[data-nv-flat="blog"] a[class*="bg-[#111111]"]>div[class*="bg-accent"][class*="h-1"]{display:none}
[data-nv-flat="blog"] article[class*="bg-[#111111]"]{${FLAT_BARE};padding:0!important}
[data-nv-flat="blog"] article div[class*="border-white/10"][class*="bg-[#0a0a0a]"]{${FLAT_LINE}}
[data-nv-flat="blog"] article a[class*="py-3"][class*="bg-[#111111]"]{${FLAT_BARE};padding:0!important;color:rgba(255,255,255,.85)!important;text-decoration:underline;text-underline-offset:6px;text-decoration-color:rgba(232,255,60,.45);text-decoration-thickness:1px}
[data-nv-flat="blog"] article a[class*="py-3"][class*="bg-[#111111]"]:hover{color:#e8ff3c!important}
[data-nv-flat="blog"] article div:has(>a[class*="py-3"][class*="bg-[#111111]"]){column-gap:22px!important;row-gap:10px!important}
`;

/* Obavijest o kolačićima: F_CSS je diže iznad donje trake na svim stranicama s .f-root (chrome);
   gdje donje trake nema (košarica, blagajna, zahvala, prijava) — na dno. Dres ima svoju traku (68 px). */
const COOKIE_CSS = `
@media (max-width:1023px){html:not(:has(.f-bnav)):not(:has([data-ime-pdp])) [data-cookie-notice]{bottom:0!important}}
`;

/** Zaglavlje, podnožje, ladica i katalog. */
export const NOVI_CHROME_CSS = E_CSS + F_CSS + CATALOG_CSS + PAGES_CSS + FLAT_CSS + COOKIE_CSS;
