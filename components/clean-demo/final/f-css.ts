/** FINAL — jedan tok: naslovnica E (scena + katalog s karticama "ime") → stranica dresa "ime". */

export const F_BASE = ""; // prave rute (bilo /cisto-demo/final): `${F_BASE}/` = "/"
/** visina donje trake na mobitelu (bez safe-area) */
export const F_BNAV_H = 58;
/** sessionStorage: zadnji dres u fokusu na naslovnici (povratak sa stranice dresa) */
export const F_HERO_KEY = "final-hero-slug";
/** sessionStorage: kopija scene u trenutku otvaranja dresa (poster pri povratku) */
export const F_RET_KEY = "final-hero-ret";

// Obični CSS (bez CSS varijabli u Tailwind bojama).
export const F_CSS = `
.f-root{background:#0a0a0a}
.f-root .ime-root,.f-root.ime-root{background:#0a0a0a}
::view-transition{background:#0a0a0a}
/* naslovnica → dres: na sceni su leđa, na stranici prednja strana → kratko pretapanje lica u letu */
html.f-hero-vt::view-transition-old(ime-jersey){animation:f-vt-out .34s cubic-bezier(.22,1,.36,1) both;opacity:1}
html.f-hero-vt::view-transition-new(ime-jersey){animation:f-vt-in .42s cubic-bezier(.22,1,.36,1) both}
/* naslov i obrisano prezime: na naslovnici sivo, na stranici limeta → isto pretapanje */
html.f-hero-vt::view-transition-old(ime-over),html.f-hero-vt::view-transition-old(ime-name){animation:f-vt-out .3s ease both;opacity:1}
html.f-hero-vt::view-transition-new(ime-over),html.f-hero-vt::view-transition-new(ime-name){animation:f-vt-in .4s ease both}
@keyframes f-vt-out{from{opacity:1}to{opacity:0}}
@keyframes f-vt-in{from{opacity:0}to{opacity:1}}
/* kopija scene za prijelaz: vidljiva samo u trenutku snimke (i kao poster pri povratku dok
   se 3D ne iscrta — onda se pretopi) */
.f-proxy{visibility:hidden}
.f-proxy[data-on="true"]{visibility:visible;transition:opacity .25s ease}
.f-proxy[data-poster="true"] [data-vt]{transition:left .25s ease,top .25s ease,width .25s ease,height .25s ease,font-size .25s ease}
.f-proxy[data-fade="true"]{opacity:0}
.f-proxy .ime-outline{-webkit-text-stroke-color:rgba(233,233,230,.17)}
/* obavijest o kolačićima (globalna, iz layouta): na mobitelu jedan tihi redak iznad donje trake,
   neutralni gumb (bez druge limete) */
@media (max-width:1023px){
html:has(.f-root) [data-cookie-notice]{bottom:calc(${58}px + env(safe-area-inset-bottom))!important;padding:8px 12px 8px 16px!important;background:#111!important;border-color:rgba(255,255,255,.08)!important}
html:has([data-ime-pdp]) [data-cookie-notice]{bottom:calc(68px + env(safe-area-inset-bottom))!important}
html:has(.f-root) [data-cookie-notice]>div{flex-direction:row!important;align-items:center!important;gap:12px!important}
html:has(.f-root) [data-cookie-notice] p{font-size:0!important;line-height:1.3!important;flex:1;min-width:0}
html:has(.f-root) [data-cookie-notice] p::before{content:"Koristimo kolačiće.";font-size:12.5px;color:rgba(255,255,255,.65)}
html:has(.f-root) [data-cookie-notice] p a{font-size:12.5px;margin-left:6px;color:rgba(255,255,255,.85)!important}
}
html:has(.f-root) [data-cookie-notice] button{background:transparent!important;border:1px solid rgba(255,255,255,.22);color:#fff!important;font-weight:500!important;padding:6px 14px!important}
html:has(.f-root) [data-cookie-notice] a{color:rgba(255,255,255,.85)!important}
/* 2D zamjena dok se 3D ne učita: samo dresovi na šipki (bez okruglih strelica, brojača i natpisa) */
.f-2d [class*="w-[252px]"],.f-2d [class*="min-h-[188px]"],.f-2d p[class*="tracking-\[0.3em\]"]{display:none!important}
/* mobitel: zaglavlja naslovnice i dresa nisu ista (strelica natrag) → ne prelijevaju se, samo se zamijene */
@media (max-width:1023px){.f-root .ime-header{view-transition-name:none}}
/* donja traka (mobitel) */
.f-bnav a{-webkit-tap-highlight-color:transparent}
@media (max-width:1023px){.f-has-bnav{padding-bottom:calc(${58}px + env(safe-area-inset-bottom))}}
@media (prefers-reduced-motion:reduce){html.f-hero-vt::view-transition-old(*),html.f-hero-vt::view-transition-new(*){animation:none!important}}
`;
