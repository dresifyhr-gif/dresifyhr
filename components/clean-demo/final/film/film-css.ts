/* Film hero — CSS (obični CSS, bez CSS varijabli u Tailwind bojama, bez backdrop-blur).
   .fh-sd = neutralna sjena dresa: čisto crno × alfa preko siluete = množenje svjetline (kontrast i boje
   ostaju, nema mliječne magle ni plavog tona); pri vrhu slabija → tanko svjetlo na ramenima, a vanjski
   rub (dalje od reflektora) tamniji od unutarnjeg. Prosječna alfa ~0.86 (SHADE_A u film-hero). */
export const FILM_CSS = `
.fh{position:absolute;inset:0;overflow:hidden;isolation:isolate;background:#0b0b0a;touch-action:pan-y;-webkit-user-select:none;user-select:none;cursor:grab}
.fh[data-drag]{cursor:grabbing}
.fh-l{position:absolute;pointer-events:none}
.fh-l>img,.fh-l>picture>img,.fh-l>video{display:block;width:100%;height:100%}
.fh-plate{z-index:1;opacity:0;transition:opacity .45s ease}
.fh[data-ready] .fh-plate{opacity:1}
.fh-sh{z-index:5;opacity:0}
.fh-sh[data-front]{z-index:30}
.fh-sh>.fh-sh2{position:absolute;inset:0;opacity:.45}
.fh-occl{z-index:20;opacity:0;transition:opacity .45s ease}
.fh[data-ready] .fh-occl{opacity:1}
.fh-feather{z-index:21}
/* ?zid=tiho|bez: zakrpa zida bez natpisa (iznad zida, ispod svjetla i prezimena); tiho = + tamni obris (zbraja se) koji
   se pretopi čim korisnik krene listati — samo opacity, sporo i mekano */
.fh-zid{z-index:20;opacity:0;transition:opacity .45s ease}
.fh-zid-s{mix-blend-mode:plus-lighter}
.fh[data-ready][data-zl] .fh-zid[data-k=bez]{opacity:1}
.fh[data-ready][data-zdim][data-zl] .fh-zid[data-k=tiho]{opacity:1}
@media (prefers-reduced-motion:no-preference){
.fh-zid[data-k=tiho]{transition:opacity 2.4s cubic-bezier(.45,0,.2,1)}
/* mobitel: manji tamni obris krene tek kad zakrpa skoro prekrije upaljeni natpis (inače dva obrisa različite veličine) */
.fh-zid-s[data-k=tiho][data-sc]{transition:opacity 1.8s cubic-bezier(.45,0,.2,1) 1.3s}
}
/* ambijentalno svjetlo (boja dresa u fokusu): iznad ploče/zida, ispod prezimena i dresova ispred zida.
   Skupina se stapa screen (obojeno svjetlo se dodaje betonu), maska = albedo betona × izrezi, a slojevi unutar nje zbrajaju (plus-lighter) → linearno
   pretapanje dvaju dresova. Po kadru samo opacity slojeva; bez filtera i bez backdrop-blura. */
.fh-amb{z-index:21;mix-blend-mode:screen;opacity:0;transition:opacity .45s ease;-webkit-mask-size:100% 100%;mask-size:100% 100%;-webkit-mask-repeat:no-repeat;mask-repeat:no-repeat}
.fh[data-ready] .fh-amb{opacity:1}
/* slojevi u pola rezolucije (gradijenti su potpuno mekani) i vlastiti kompozitni sloj SAMO dok se šipka miče →
   promjena opacity ne prerasterizira cijelu skupinu, a u mirovanju nema dodatne GPU memorije */
.fh-amb>i{position:absolute;left:0;top:0;width:50%;height:50%;transform:scale(2);transform-origin:0 0;display:block;opacity:0;mix-blend-mode:plus-lighter}
.fh[data-moving] .fh-amb>i{will-change:opacity}
.fh-name{z-index:22;left:0;top:0;white-space:nowrap;line-height:.8;opacity:.8;mix-blend-mode:screen;transition:opacity .45s ease;will-change:opacity}
.fh-name[data-out]{opacity:0}
.fh-name.ime-outline{color:rgba(232,255,60,.05);-webkit-text-stroke:1px rgba(232,255,60,.55);filter:drop-shadow(0 0 2px rgba(232,255,60,.32)) drop-shadow(0 0 8px rgba(232,255,60,.1))}
@keyframes fh-name-in{from{opacity:0}to{opacity:1}}
.fh-jl{position:absolute;inset:0;pointer-events:none;transition:opacity .5s ease}
.fh[data-intro] .fh-jl{opacity:0}
.fh-j{position:absolute;left:0;top:0;transform-origin:0 0;opacity:0;backface-visibility:hidden}
.fh-j>img{position:absolute;inset:0;width:100%;height:100%;object-fit:contain;object-position:50% 0}
.fh-r{position:absolute;left:0;top:0;transform-origin:0 0;display:none;z-index:32;-webkit-mask-image:linear-gradient(0deg,rgba(0,0,0,.8),rgba(0,0,0,0) 50%);mask-image:linear-gradient(0deg,rgba(0,0,0,.8),rgba(0,0,0,0) 50%)}
.fh[data-phone] .fh-r{-webkit-mask-image:linear-gradient(0deg,rgba(0,0,0,.72),rgba(0,0,0,.28) 18%,rgba(0,0,0,0) 40%);mask-image:linear-gradient(0deg,rgba(0,0,0,.72),rgba(0,0,0,.28) 18%,rgba(0,0,0,0) 40%)}
.fh-floor{z-index:29;opacity:0;transition:opacity .45s ease}
.fh[data-ready] .fh-floor{opacity:1}
.fh-r>img{display:block;width:100%;height:100%;object-fit:contain;object-position:50% 0}
.fh[data-moving] .fh-j{will-change:transform,opacity}
.fh-intro{z-index:60;transition:opacity .5s ease}
.fh-portal{overflow:hidden;opacity:0;transition:opacity .45s ease}
.fh[data-ready] .fh-portal{opacity:1}
.fh-portal-in{z-index:4}
.fh-portal-rim{z-index:21}
.fh-rail{overflow:hidden;opacity:0;transition:opacity .45s ease}
.fh[data-ready] .fh-rail{opacity:1}
.fh-rail-back{z-index:6}
.fh-rail-front{z-index:33}
.fh-sd{position:absolute;inset:0;display:block;opacity:0;pointer-events:none;background:linear-gradient(90deg,rgba(0,0,0,.6),rgba(0,0,0,0)),linear-gradient(180deg,rgba(0,0,0,.4) 7%,rgba(0,0,0,.65) 17%,rgba(0,0,0,.8) 30%);-webkit-mask-size:contain;mask-size:contain;-webkit-mask-position:50% 0;mask-position:50% 0;-webkit-mask-repeat:no-repeat;mask-repeat:no-repeat}
.fh-sd[data-side=r]{background:linear-gradient(270deg,rgba(0,0,0,.6),rgba(0,0,0,0)),linear-gradient(180deg,rgba(0,0,0,.4) 7%,rgba(0,0,0,.65) 17%,rgba(0,0,0,.8) 30%)}
.fh[data-moving] .fh-sd{will-change:opacity}
.fh-cs{position:absolute;left:0;top:0;display:block;opacity:0;z-index:31;pointer-events:none;border-radius:50%;background:radial-gradient(closest-side,rgba(0,0,0,.85),rgba(0,0,0,.45) 45%,rgba(0,0,0,0))}
.fh-intro[data-out]{opacity:0}
/* uvod (data-iv): prezime se ne vidi prije/tijekom filma ni dok dresovi ulaze (inače bljesne na crnom i
   preleti ZIDANE→CARLOS→JR); ploča i slojevi sobe skriveni dok film svira (bez duha ploče dok se film
   pretapa unutra), a na kraju se pojave odmah ispod zadnjeg kadra (isti kadar) pa film samo izblijedi. */
.fh[data-iv] .fh-name{opacity:0}
.fh[data-iv=play] .fh-occl,.fh[data-iv=play] .fh-plate,.fh[data-iv=play] .fh-portal,.fh[data-iv=play] .fh-rail,.fh[data-iv=play] .fh-floor,.fh[data-iv=play] .fh-amb{opacity:0}
.fh[data-iv=fade] .fh-occl,.fh[data-iv=fade] .fh-plate,.fh[data-iv=fade] .fh-portal,.fh[data-iv=fade] .fh-rail,.fh[data-iv=fade] .fh-floor{transition:none}
html:has(.fh) .f-proxy .ime-outline{-webkit-text-stroke-color:rgba(232,255,60,.30)}
@media (prefers-reduced-motion:reduce){.fh-occl,.fh-plate,.fh-name,.fh-jl,.fh-intro,.fh-portal,.fh-rail,.fh-floor,.fh-amb,.fh-zid{transition:none}}
`;
