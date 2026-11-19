// Demo "ime": konstante, tipovi i stilovi koje dijele server i klijent (bez velikih podataka).

export const IME_BASE = ""; // prave rute: /dres/…

export type ImeCardData = {
  slug: string;
  club: string;
  title: string;
  variant: string;
  surname: string;
  number: string;
  price: number;
  img: string;
  /** omjer širina/visina slike na vješalici (kuka na vrhu) */
  aspect: number;
  /** vodoravni položaj kuke (udio širine slike) */
  hookX: number;
  soldOut: boolean;
  /** odrasli rasprodani, ima dječjih */
  kidsOnly?: boolean;
};

/** "20 €" (neprelomivi razmak). */
export const imePrice = (n: number) => `${n} €`;

/* ---------- stilovi (običan CSS — bez CSS varijabli u Tailwind bojama) ---------- */

export const IME_CSS = `
.ime-root{background:#0d0d0d;color:#fff}
.ime-root h1,.ime-root h2,.ime-root h3{font-family:var(--font-bebas),"Bebas Neue","Arial Narrow",sans-serif;font-weight:400;letter-spacing:.012em;line-height:.95}
.ime-root h1 .ime-h1-k{font-family:var(--font-barlow),sans-serif;letter-spacing:0;line-height:1.4}
.ime-display{font-family:var(--font-bebas),"Bebas Neue","Arial Narrow",sans-serif;letter-spacing:.01em;font-weight:400}
.ime-outline{font-family:var(--font-bebas),"Bebas Neue","Arial Narrow",sans-serif;color:transparent;-webkit-text-stroke:1.25px rgba(232,255,60,.30);letter-spacing:.012em;font-weight:400}
.ime-card .ime-outline{-webkit-text-stroke:1px rgba(232,255,60,.30)}
/* neon (kartica): na hover/fokus šipka zasvijetli limetom, prezime-obris pojača, ime dobije podcrtu — fotka ostaje netaknuta */
.ime-card-name{background:linear-gradient(#e8ff3c,#e8ff3c) 0 100%/0 1px no-repeat;padding-bottom:3px;transition:background-size .35s cubic-bezier(.22,1,.36,1)}
.ime-card a:hover .ime-card-name,.ime-card a:focus-visible .ime-card-name{background-size:100% 1px}
.ime-card a:hover .ime-rail,.ime-card a:focus-visible .ime-rail{background:linear-gradient(90deg,rgba(232,255,60,0),#e8ff3c 20%,#e8ff3c 80%,rgba(232,255,60,0))!important;box-shadow:0 0 6px rgba(232,255,60,.5)}
.ime-card a:hover .ime-outline,.ime-card a:focus-visible .ime-outline{-webkit-text-stroke-color:rgba(232,255,60,.55)}
.ime-noscroll{scrollbar-width:none}.ime-noscroll::-webkit-scrollbar{display:none}
.ime-header{view-transition-name:ime-header}
@keyframes ime-in{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:none}}
.ime-in{animation:ime-in .5s cubic-bezier(.22,1,.36,1) both}
@media (prefers-reduced-motion:reduce){.ime-in{animation:none}}

/* ---------------- prijelaz kartica <-> stranica (View Transitions API) ---------------- */
::view-transition{background:#0d0d0d}
::view-transition-group(*){animation-duration:.66s;animation-timing-function:cubic-bezier(.22,1,.36,1)}
/* stranica ispod: stara se gasi brzo, nova kreće odmah (preklop, bez pada u crno između) */
::view-transition-image-pair(root){isolation:auto}
::view-transition-old(root),::view-transition-new(root){mix-blend-mode:normal}
::view-transition-old(root){animation:ime-vt-out .16s linear both}
::view-transition-new(root){animation:ime-vt-in .3s cubic-bezier(.22,1,.36,1) both}
@keyframes ime-vt-out{to{opacity:0}}
@keyframes ime-vt-in{from{opacity:0}}
::view-transition-old(ime-rail),::view-transition-new(ime-rail){width:100%;height:100%;object-fit:fill}
/* naprijed: isti sadržaj na obje strane → putuje samo oštra nova slika (bez dvostrukog pretapanja) */
::view-transition-new(ime-jersey),::view-transition-new(ime-name),::view-transition-new(ime-over),::view-transition-new(ime-rail){animation:none;mix-blend-mode:normal}
::view-transition-old(ime-jersey),::view-transition-old(ime-name),::view-transition-old(ime-over),::view-transition-old(ime-rail){animation:none;opacity:0}
/* za vrijeme prijelaza: šipka pozornice (SVG/3D) skrivena — vidi se samo jedna šipka, ona koja putuje */
html.ime-vt .ime-rod{opacity:0}
.ime-rod{transition:opacity .25s ease}
/* odlazak (natrag): kopija vrha stranice prikazuje 2D lice (platno se ne kopira) */
.ime-ghost .ime-2d{opacity:1!important;visibility:visible!important}
.ime-ghost .ime-rod{opacity:0!important}
/* dolazak: stupac za kupnju ulazi kaskadno nakon što dres sleti */
@keyframes ime-up{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:none}}
html.ime-arrive [data-stg]{animation:ime-up .5s cubic-bezier(.22,1,.36,1) both;animation-delay:calc(.34s + var(--i,0) * 60ms)}
@media (prefers-reduced-motion:reduce){::view-transition-group(*),::view-transition-old(*),::view-transition-new(*){animation:none!important}html.ime-arrive [data-stg]{animation:none}}
`;
