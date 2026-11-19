/** DEMO FINAL — košarica, ladica i blagajna. Obični CSS (bez CSS varijabli u Tailwind bojama). */

export const CART_BASE = ""; // prave rute
export const CART_PAGE = "/kosarica/";
export const CHECKOUT_PAGE = "/checkout/"; // živa ruta blagajne (ne /blagajna)
/** "Dresovi" u traci, donjoj navigaciji i praznoj košarici: pravi katalog sa starim filterima. */
export const CATALOG_PAGE = "/dresovi/";

export const CART_CSS = `
.c-root{font-family:var(--font-barlow),sans-serif;background:#0a0a0a;color:#fff}
.c-display,.c-root .c-display{font-family:var(--font-bebas),sans-serif;font-weight:400;letter-spacing:.01em;line-height:.88}
.c-price,.c-root .c-price{font-family:var(--font-bebas),sans-serif;font-weight:400;letter-spacing:.02em;line-height:1;font-variant-numeric:tabular-nums}
/* jedini neonski gumb */
.c-cta{display:flex;align-items:center;justify-content:center;gap:10px;width:100%;height:56px;border-radius:6px;background:#e8ff3c;color:#0a0a0a;
  font-family:var(--font-bebas),sans-serif;font-size:23px;letter-spacing:.06em;line-height:1;padding:3px 18px 0;
  box-shadow:0 14px 36px -12px rgba(232,255,60,.65),inset 0 1px 0 rgba(255,255,255,.55);
  transition:transform .18s cubic-bezier(.22,1,.36,1),box-shadow .25s ease,background-color .2s ease;-webkit-tap-highlight-color:transparent}
.c-cta:hover{background:#efff6a;box-shadow:0 16px 40px -12px rgba(232,255,60,.75),inset 0 1px 0 rgba(255,255,255,.6)}
.c-cta:active{transform:scale(.985)}
.c-cta:disabled{opacity:.6;cursor:default}
.c-cta:focus-visible{outline:2px solid #fff;outline-offset:3px}
/* polja: 16 px (iPhone ne zumira), 52 px visine, crveni rub tek nakon dodira (:user-invalid) */
.c-field{display:block;width:100%;height:52px;border-radius:6px;background:#111;border:1px solid rgba(255,255,255,.12);color:#fff;font-size:16px;line-height:1.2;
  padding:0 14px;caret-color:#e8ff3c;transition:border-color .2s ease,box-shadow .2s ease;-webkit-appearance:none;appearance:none}
.c-field::placeholder{color:rgba(255,255,255,.28)}
.c-field:hover{border-color:rgba(255,255,255,.2)}
.c-field:focus{outline:none;border-color:rgba(232,255,60,.65);box-shadow:0 0 0 3px rgba(232,255,60,.14)}
.c-field:user-invalid{border-color:rgba(255,107,107,.7);box-shadow:0 0 0 3px rgba(255,107,107,.12)}
.c-field:-webkit-autofill{-webkit-text-fill-color:#fff;-webkit-box-shadow:0 0 0 1000px #151515 inset;caret-color:#e8ff3c}
.c-label{display:block;margin-bottom:8px;font-size:12px;font-weight:600;letter-spacing:.14em;text-transform:uppercase;color:rgba(255,255,255,.55)}
/* naslov u 2 retka: line-clamp reže kvačice (Ö, Ć, Š) iznad verzala → mjesto gore */
.c-clamp,.c-root .c-clamp{display:-webkit-box;-webkit-box-orient:vertical;-webkit-line-clamp:2;overflow:hidden;line-height:1;padding-top:.14em}
/* globalna obavijest o kolačićima: bez druge limete, mirni neutralni gumb */
html:has(.c-root) [data-cookie-notice]{background:#111!important;border-color:rgba(255,255,255,.08)!important}
html:has(.c-root) [data-cookie-notice] button{background:transparent!important;border:1px solid rgba(255,255,255,.22);color:#fff!important;font-weight:500!important}
html:has(.c-root) [data-cookie-notice] a{color:rgba(255,255,255,.85)!important}
/* mobitel: obavijest u jednom tihom retku (kao naslovnica demoa) */
@media (max-width:1023px){
html:has(.c-root) [data-cookie-notice]{padding:8px 12px 8px 16px!important}
html:has(.c-root) [data-cookie-notice]>div{flex-direction:row!important;align-items:center!important;gap:12px!important}
html:has(.c-root) [data-cookie-notice] p{font-size:0!important;line-height:1.3!important;flex:1;min-width:0}
html:has(.c-root) [data-cookie-notice] p::before{content:"Koristimo kolačiće.";font-size:12.5px;color:rgba(255,255,255,.65)}
html:has(.c-root) [data-cookie-notice] p a{font-size:12.5px;margin-left:6px}
html:has(.c-root) [data-cookie-notice] button{padding:6px 14px!important}
}
/* mobitel /kosarica: obavijest sjedne iznad donje trake s gumbom */
@media (max-width:1023px){html:has([data-c-bar]) [data-cookie-notice]{bottom:calc(82px + env(safe-area-inset-bottom))!important}}
.c-hair{border-color:rgba(255,255,255,.08)}
/* ladica: desno na računalu, donji list na mobitelu */
.c-scrim{animation:c-fade .28s ease both}
.c-panel{animation:c-up .42s cubic-bezier(.22,1,.36,1) both}
@media (min-width:1024px){.c-panel{animation-name:c-left}}
.c-scrim[data-closing="true"]{animation:c-fade-out .22s ease both}
.c-panel[data-closing="true"]{animation:c-down .26s cubic-bezier(.4,0,1,1) both}
@media (min-width:1024px){.c-panel[data-closing="true"]{animation-name:c-right}}
@keyframes c-fade{from{opacity:0}to{opacity:1}}
@keyframes c-fade-out{from{opacity:1}to{opacity:0}}
@keyframes c-up{from{transform:translateY(100%)}to{transform:none}}
@keyframes c-down{from{transform:none}to{transform:translateY(100%)}}
@keyframes c-left{from{transform:translateX(100%)}to{transform:none}}
@keyframes c-right{from{transform:none}to{transform:translateX(100%)}}
.c-in{animation:c-in .5s cubic-bezier(.16,1,.3,1) both}
@keyframes c-in{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:none}}
.c-scroll{overscroll-behavior:contain;-webkit-overflow-scrolling:touch;scrollbar-width:thin;scrollbar-color:rgba(255,255,255,.15) transparent}
@media (prefers-reduced-motion:reduce){.c-scrim,.c-panel,.c-in,.c-cta{animation:none!important;transition:none!important}}
`;
