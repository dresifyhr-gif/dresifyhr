/* IZDVOJENO — kartice-kadrovi (Blender renderi) iz iste mračne garderobe kao naslovnica.
   Obični CSS: bez CSS varijabli u Tailwind bojama, bez backdrop-blura, animira se samo transform/opacity.
   Naslovi uvijek Bebas Neue (specifični selektori jer .ime-root h1–h3 inače prebacuje na Barlow). */

export const ZIVE_LIME = "#e8ff3c";

export const ZIVE_CSS = `
.zv{background:#0a0a0a;color:#e9e9e6;font-family:var(--font-barlow),system-ui,sans-serif}
.zv-wrap{max-width:1240px;margin:0 auto;padding:0 16px}
@media(min-width:1024px){.zv-wrap{padding:0 40px}}
.zv-head{display:flex;align-items:flex-end;justify-content:space-between;gap:16px;padding:28px 0 12px}
.zv .zv-head .zv-h2{font-family:var(--font-bebas),sans-serif;font-weight:400;font-size:32px;line-height:.9;letter-spacing:.01em;margin:0;color:#f2f2ee;text-transform:none}
.zv-head p{margin:0;font-size:13px;color:rgba(233,233,230,.5)}
/* neon: crtica limete ispod naslova */
.zv .zv-head .zv-h2::after{content:"";display:block;width:32px;height:1px;margin-top:8px;background:#e8ff3c}

/* --- mreža (Igor 18.11.): samo 4 male kartice 4:5 — mobitel 2x2, desktop jedan red od 4 --- */
.zv-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px}
.zv-c{position:relative;min-width:0;aspect-ratio:4/5}
@media(min-width:768px){.zv-grid{grid-template-columns:repeat(4,minmax(0,1fr));gap:12px}}

/* --- kartica: kadar do ruba, bez okvira i sivih ploha --- */
.zv-card{position:absolute;inset:0;display:block;overflow:hidden;border-radius:4px;background:#050505;color:inherit;text-decoration:none;-webkit-tap-highlight-color:transparent;isolation:isolate;transform:translateZ(0)}
.zv-card:focus-visible{outline:1px solid #e8ff3c;outline-offset:2px}
/* neon: na hover/fokus nit limete se razvuče po donjem rubu kartice */
.zv-card::after{content:"";position:absolute;left:0;right:0;bottom:0;z-index:3;height:1px;background:#e8ff3c;transform:scaleX(0);transform-origin:left;transition:transform .35s cubic-bezier(.22,1,.36,1);pointer-events:none}
.zv-card:hover::after,.zv-card:focus-visible::after{transform:scaleX(1)}
.zv-media,.zv-media img{position:absolute;inset:0;width:100%;height:100%;display:block}
.zv-media img{object-fit:cover;object-position:50% 50%;user-select:none;-webkit-user-drag:none;transform-origin:50% 42%;transition:transform 7s cubic-bezier(.16,.6,.2,1)}
.zv-card[data-in="1"] .zv-media img{transform:scale(1.03)}

/* reflektor se upali: tamni sloj (jači uz rubove) nestane jednom kad kartica uđe u ekran */
.zv-lamp{position:absolute;inset:0;pointer-events:none;opacity:0;background:radial-gradient(ellipse 72% 62% at 46% 36%,rgba(0,0,0,.62) 0%,rgba(0,0,0,.9) 70%,rgba(0,0,0,.95) 100%);transition:opacity 1.8s cubic-bezier(.4,0,.2,1) .1s}
.zv-card[data-in="0"] .zv-lamp{opacity:1;transition:none}
.zv-shade{position:absolute;inset:0;pointer-events:none;background:linear-gradient(to top,rgba(5,5,5,.94) 0%,rgba(5,5,5,.66) 22%,rgba(5,5,5,0) 50%)}

/* --- natpis --- */
.zv-cap{position:absolute;left:0;right:0;bottom:0;z-index:2;display:flex;flex-direction:column;align-items:flex-start;padding:16px 16px 15px}
.zv-over{font-size:10.5px;font-weight:600;letter-spacing:.18em;text-transform:uppercase;color:rgba(233,233,230,.62);line-height:1.2}
.zv .zv-cap .zv-title{font-family:var(--font-bebas),sans-serif;font-weight:400;font-size:34px;line-height:.92;letter-spacing:.012em;margin:7px 0 0;color:#f4f4f0;text-transform:none}
.zv-sub{margin:7px 0 0;max-width:34ch;font-size:13.5px;line-height:1.35;color:rgba(233,233,230,.66)}
.zv-meta{display:flex;align-items:center;gap:10px;margin-top:10px;font-size:12.5px;color:rgba(233,233,230,.6);max-width:100%}
.zv-meta span{min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.zv-meta b{font-family:var(--font-bebas),sans-serif;font-weight:400;font-size:21px;line-height:1;color:#f4f4f0;letter-spacing:.03em;white-space:nowrap}
.zv-arrow{flex:none;width:18px;height:18px;color:#e8ff3c;transition:transform .3s cubic-bezier(.2,.8,.2,1)}
@media(hover:hover){.zv-card:hover .zv-arrow{transform:translateX(4px)}}
/* male kartice: proizvod je glavni (gornjih ~70 %), natpis kratak — samo naslov + cijena/strelica */
.zv-shade{background:linear-gradient(to top,rgba(5,5,5,.92) 0%,rgba(5,5,5,.55) 16%,rgba(5,5,5,0) 32%)}
.zv-cap{padding:10px 11px 10px}
.zv-over,.zv-sub,.zv-meta span{display:none}
.zv .zv-cap .zv-title{font-size:24px;margin:0}
.zv-meta{margin-top:4px}
.zv-meta b{font-size:18px}
.zv-arrow{width:16px;height:16px}
@media(min-width:768px){
 .zv-cap{padding:14px 16px 14px}
 .zv .zv-cap .zv-title{font-size:30px}
 .zv-meta b{font-size:20px}
}

/* --- VIDEO: reklama kao ekran u mraku + odsjaj na mokrom podu --- */
.zv-card--video{background:#040404}
.zv-screen{position:absolute;left:0;right:0;top:0;aspect-ratio:1/1;overflow:hidden;background:#0b0c05}
.zv-video,.zv-poster{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;display:block}
.zv-video{opacity:0;transition:opacity .35s ease}
.zv-video[data-on="1"]{opacity:1}
.zv-card--video{container-type:size}
.zv-refl{position:absolute;left:0;right:0;bottom:0;width:100%;height:calc(100% - 100cqw);object-fit:cover;object-position:50% 0;display:block;pointer-events:none}
.zv-shade--video{background:linear-gradient(to top,rgba(4,4,4,.85) 0%,rgba(4,4,4,0) 26%)}
.zv .zv-card--video .zv-title{font-size:28px}
@media(max-width:767px){.zv-card--video .zv-meta{display:none}}
/* desktop: ekran zauzme gotovo cijelu karticu, ispod je samo traka odsjaja -> natpis bez velikog naslova */
@media(min-width:768px){.zv .zv-card--video .zv-title{display:none}.zv-card--video .zv-cap{padding:0 22px 14px}.zv-card--video .zv-meta{margin-top:6px}}

@media (prefers-reduced-motion:reduce){
 .zv *{transition:none!important;animation:none!important}
 .zv-card .zv-media img{transform:none!important}
 .zv-card .zv-lamp{opacity:0!important}
}
`;
