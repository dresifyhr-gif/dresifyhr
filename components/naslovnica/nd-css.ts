// Stilovi demo naslovnice (/naslovnica-demo/) — "Floodlight" smjer.
// Staklo je LAŽIRANO (gradijenti + hairline + šum). Pravi backdrop-filter samo na
// zaslonu iza lista (.nd-scrim) i malim pločicama (.nd-pill).
const NOISE =
  "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='120' height='120'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.9' numOctaves='2' stitchTiles='stitch'/%3E%3CfeColorMatrix values='0 0 0 0 1 0 0 0 0 1 0 0 0 0 1 0 0 0 .035 0'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")";

export const ND_CSS = `
.nd-root { background: #0a0a0a; color: #fff; -webkit-tap-highlight-color: transparent; font-variant-numeric: tabular-nums; }
.nd-root :focus-visible { outline: none; box-shadow: 0 0 0 2px #0a0a0a, 0 0 0 4px rgba(232,255,60,.7); }

/* Rail: naslov dolazi iz heroa, pa se naslov sekcije Ormar ovdje ne ponavlja. */
.nd-rail > section { padding-top: 4px !important; padding-bottom: 0 !important; background: transparent !important; }
.nd-rail > section > div:first-child { display: none !important; }
.nd-rail > section > div:nth-child(2) { margin-top: 0 !important; }

/* 2D zidni natpis iza šipke (statično): tamne letvice + mutni halo DRESIFY. */
.nd-rail .og-sign { display: block; }
.nd-rail .og-sign-wall { background: repeating-linear-gradient(90deg, rgba(255,240,220,.045) 0 9px, rgba(0,0,0,.5) 9px 11px);
  -webkit-mask-image: radial-gradient(48% 90% at 50% 70%, #000 30%, transparent 75%); mask-image: radial-gradient(48% 90% at 50% 70%, #000 30%, transparent 75%); }
.nd-rail .og-sign-text { letter-spacing: .07em; color: rgba(242,240,235,.34); filter: blur(.7px);
  text-shadow: 0 0 6px rgba(255,250,240,.35), 0 0 22px rgba(255,250,240,.18), 0 0 54px rgba(255,250,240,.1); }
.nd-rail .og-sign-ify { color: rgba(232,255,60,.42); text-shadow: 0 0 6px rgba(232,255,60,.4), 0 0 22px rgba(232,255,60,.2), 0 0 54px rgba(232,255,60,.1); }

.nd-flood { background: radial-gradient(60% 55% at 50% 0%, rgba(232,255,60,.075), transparent 70%), radial-gradient(40% 40% at 50% 8%, rgba(255,255,255,.05), transparent 70%); }

/* Pod trgovine: tamna ploha + blagi odsjaj reflektora + linija horizonta. */
.nd-floor { background:
  radial-gradient(55% 90% at 50% 0%, rgba(255,255,255,.055), transparent 70%),
  linear-gradient(180deg, #121212 0%, #0b0b0b 55%, #0a0a0a 100%); }
.nd-floor::before { content: ""; position: absolute; left: 0; right: 0; top: 0; height: 1px; pointer-events: none;
  background: linear-gradient(90deg, transparent, rgba(255,255,255,.14) 30%, rgba(255,255,255,.14) 70%, transparent); }

/* Katalog: ugrađeni prekidač HomeCatalogTabs skriven — zamjenjuje ga .nd-seg. */
.nd-cat-inner #streetwear > div:first-child:has(> div > button[aria-pressed]) { display: none !important; }

/* Plohe */
.nd-l1 { position: relative; background: ${NOISE}, linear-gradient(180deg, rgba(255,255,255,.05), rgba(255,255,255,.015) 45%), #0d0d0d;
  border: 1px solid rgba(255,255,255,.08);
  box-shadow: inset 0 1px 0 rgba(255,255,255,.09), 0 24px 50px -24px rgba(0,0,0,.8); }
.nd-l2 { background: ${NOISE}, linear-gradient(180deg, rgba(255,255,255,.06), rgba(255,255,255,.02) 40%), #0c0c0c;
  box-shadow: inset 0 0 0 1px rgba(255,255,255,.05), 0 -24px 60px rgba(0,0,0,.6); }
.nd-rim::before { content: ""; position: absolute; top: 0; left: 8%; right: 8%; height: 1px; pointer-events: none; z-index: 2;
  background: linear-gradient(90deg, transparent, rgba(255,255,255,.28), transparent); }
.nd-pill { background: rgba(14,14,14,.72); border: 1px solid rgba(255,255,255,.10); box-shadow: inset 0 1px 0 rgba(255,255,255,.10);
  -webkit-backdrop-filter: blur(10px) saturate(140%); backdrop-filter: blur(10px) saturate(140%); }
@supports not ((backdrop-filter: blur(1px)) or (-webkit-backdrop-filter: blur(1px))) { .nd-pill { background: rgba(14,14,14,.94); } }

/* Pločice benta */
.nd-tile { position: relative; display: block; overflow: hidden; border-radius: 22px; isolation: isolate;
  background: ${NOISE}, linear-gradient(180deg, rgba(255,255,255,.055), rgba(255,255,255,.012) 55%), #0e0e0e;
  border: 1px solid rgba(255,255,255,.08);
  box-shadow: inset 0 1px 0 rgba(255,255,255,.10), 0 24px 50px -28px rgba(0,0,0,.9);
  transition: transform 160ms ease-out, border-color 200ms ease-out; }
.nd-tile:hover { border-color: rgba(255,255,255,.16); }
.nd-tile:active { transform: scale(.985); }
.nd-tile-img { transition: transform 500ms cubic-bezier(.2,.7,.2,1); }
.nd-tile:hover .nd-tile-img { transform: translateY(-4px) scale(1.03); }
.nd-arrow { display: inline-flex; align-items: center; justify-content: center; width: 32px; height: 32px; border-radius: 9999px; flex: none;
  color: rgba(255,255,255,.85); background: rgba(255,255,255,.07); border: 1px solid rgba(255,255,255,.10); box-shadow: inset 0 1px 0 rgba(255,255,255,.10);
  transition: transform 200ms ease-out, color 160ms; }
.nd-tile:hover .nd-arrow { transform: translateX(2px); color: #fff; }

/* Gumbi */
.nd-btn { position: relative; overflow: hidden; isolation: isolate; display: inline-flex; align-items: center; justify-content: center; gap: .6rem;
  min-height: 52px; padding: 0 28px; border-radius: 9999px; color: #0a0a0a;
  font-family: var(--font-bebas), sans-serif; text-transform: uppercase; font-size: 19px; letter-spacing: .08em; line-height: 1;
  background: linear-gradient(180deg, #f3ff7a, #e8ff3c 55%, #dcf32e);
  box-shadow: inset 0 1px 0 rgba(255,255,255,.55), inset 0 -1px 0 rgba(0,0,0,.14), 0 10px 30px -8px rgba(232,255,60,.55);
  transition: transform 120ms ease-out, opacity 160ms; }
.nd-btn:active { transform: scale(.97); }
.nd-btn[aria-disabled="true"] { opacity: .45; pointer-events: none; }
.nd-btn2 { display: inline-flex; align-items: center; justify-content: center; gap: .5rem; min-height: 40px; padding: 0 16px; border-radius: 9999px;
  color: rgba(255,255,255,.85); font-size: 12.5px; font-weight: 600; letter-spacing: .02em;
  background: linear-gradient(180deg, rgba(255,255,255,.07), rgba(255,255,255,.03)); border: 1px solid rgba(255,255,255,.11); box-shadow: inset 0 1px 0 rgba(255,255,255,.10);
  transition: transform 120ms ease-out, border-color 160ms, color 160ms; }
.nd-btn2:hover { border-color: rgba(255,255,255,.22); color: #fff; }
.nd-btn2:active { transform: scale(.96); }
.nd-icon { display: inline-flex; align-items: center; justify-content: center; width: 40px; height: 40px; border-radius: 9999px; color: rgba(255,255,255,.8);
  background: linear-gradient(180deg, rgba(255,255,255,.07), rgba(255,255,255,.03)); border: 1px solid rgba(255,255,255,.08);
  box-shadow: inset 0 1px 0 rgba(255,255,255,.10); transition: transform 120ms ease-out; }
.nd-icon:active { transform: scale(.95); }

/* Segmentirani prekidač (iOS) s neonskim kliznim palcem */
.nd-seg { position: relative; display: grid; grid-auto-flow: column; grid-auto-columns: 1fr; padding: 4px; border-radius: 9999px;
  background: ${NOISE}, linear-gradient(180deg, rgba(255,255,255,.06), rgba(255,255,255,.02)), #101010;
  border: 1px solid rgba(255,255,255,.08); box-shadow: inset 0 1px 0 rgba(255,255,255,.08), inset 0 -1px 0 rgba(0,0,0,.4), 0 18px 40px -20px rgba(0,0,0,.8); }
.nd-seg-thumb { position: absolute; top: 4px; bottom: 4px; left: 4px; border-radius: 9999px;
  background: linear-gradient(180deg, #f3ff7a, #e8ff3c 60%, #dcf32e);
  box-shadow: inset 0 1px 0 rgba(255,255,255,.5), 0 6px 18px -6px rgba(232,255,60,.6);
  transition: transform 380ms cubic-bezier(.3,1.25,.5,1); will-change: transform; }

/* Matirani zaslon iza lista — jedini pravi blur na velikoj plohi. */
.nd-scrim { position: fixed; inset: 0; background: rgba(10,10,10,.5);
  -webkit-backdrop-filter: blur(16px) saturate(140%); backdrop-filter: blur(16px) saturate(140%); }
@supports not ((backdrop-filter: blur(1px)) or (-webkit-backdrop-filter: blur(1px))) { .nd-scrim { background: rgba(10,10,10,.85); } }

/* Lopte */
.nd-ball { position: absolute; left: 0; top: 0; border-radius: 9999px; touch-action: none; cursor: pointer; pointer-events: auto;
  -webkit-user-select: none; user-select: none; will-change: transform; }
.nd-ball:focus-visible { outline: none; box-shadow: 0 0 0 2px #0a0a0a, 0 0 0 4px rgba(232,255,60,.7); }
.nd-ball-home { transition: transform 520ms cubic-bezier(.3,1.1,.4,1); }
/* veća dodirna površina od same lopte */
.nd-ball::before { content: ""; position: absolute; inset: -7px; border-radius: 9999px; }

/* Kape na stalku: vise o kukici (gornja sredina), dodir → zamah. */
.nd-cap { touch-action: manipulation; -webkit-user-select: none; user-select: none; border-radius: 12px; }
.nd-cap:focus-visible { outline: none; box-shadow: 0 0 0 2px rgba(232,255,60,.7); }
.nd-cap-in { transform-origin: 50% 0; filter: drop-shadow(0 8px 10px rgba(0,0,0,.55)); }
.nd-capswing { animation: ndcapswing 1100ms cubic-bezier(.3,.6,.3,1); }
@keyframes ndcapswing {
  0% { transform: rotate(0deg); }
  14% { transform: rotate(calc(-11deg * var(--k, 1))); }
  34% { transform: rotate(calc(7deg * var(--k, 1))); }
  54% { transform: rotate(calc(-4deg * var(--k, 1))); }
  74% { transform: rotate(calc(2deg * var(--k, 1))); }
  100% { transform: rotate(0deg); }
}
.nd-shadow { position: absolute; left: 0; top: 0; border-radius: 9999px; pointer-events: none;
  background: radial-gradient(closest-side, rgba(0,0,0,.75), rgba(0,0,0,0)); will-change: transform, opacity; }
.nd-pop { animation: ndpop 360ms cubic-bezier(.3,1.5,.5,1); }
@keyframes ndpop { 0% { transform: scale(1); } 40% { transform: scale(1.22); } 100% { transform: scale(1); } }

.nd-noscroll { scrollbar-width: none; }
.nd-noscroll::-webkit-scrollbar { display: none; }

@media (prefers-reduced-motion: reduce) {
  .nd-root *, .nd-root *::before, .nd-root *::after { transition-duration: 120ms !important; animation: none !important; }
}
`;
