"use client";

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type MutableRefObject, type ReactNode } from "react";

import type { HangerImages } from "@/lib/data/ormar-hanger";
import { hangerPieces, type Piece } from "@/components/product/hanger-layout";
import { useKidSegment } from "@/components/product/hanger-segment";

import { BAR_DROP, faceFit, frameOf, pct } from "./ime-fit";
import { useImeText, type ImeText } from "./ime-i18n";

/* ------------------------------------------------------------------ */
/*  Stranica dresa — 2D pozornica s pravim fotografijama (bez WebGL).   */
/*  Fotografija na vješalici se NE deformira: samo se njiše oko kuke    */
/*  (prigušena opruga), a Prednja/Leđa je okret "karte" oko okomite osi */
/*  kroz kuku (perspektiva + rotateY, zamjena slike na 90°, sjena).     */
/*  Povlačenje lijevo/desno okreće. "Djeca" spušta hlačice na vlastitoj */
/*  vješalici pokraj dresa. Etiketa s cijenom je HTML karton na niti.   */
/*  Raspored je čisti CSS (calc + jedinica --u = visina vješalice), pa  */
/*  je server HTML već na mjestu (bez skoka pri hidrataciji).           */
/*  Stara 3D pozornica: ?scena=3d (ime-stage.tsx).                      */
/* ------------------------------------------------------------------ */

export type PhotoTag = { price: number; sizes?: string };

/* "Složi svoj mix": lopta/kapa ulaze u scenu (lopta na pod, kapa na kuku šipke). */
export type StageMixKind = "lopta" | "kapa";
export type StageMix = { lopta?: string; kapa?: string };
/** Odakle je dodatak odabran (pločica u biraču) — za let u scenu. */
export type MixFlyFrom = { kind: StageMixKind; rect: DOMRect; t: number } | null;
// stvarne mjere HD slika (700 px široke) → okvir je na mjestu i prije nego se slika učita (let mjeri cilj odmah)
const MIX_H: Record<StageMixKind, Record<string, number>> = {
  lopta: { barcelona: 700, bayern: 694, hrvatska: 677, "inter-miami": 681, milan: 682, njemacka: 683, portugal: 692, "real-madrid": 694 },
  kapa: { barcelona: 546, bayern: 544, hrvatska: 614, "inter-miami": 603, milan: 532, njemacka: 557, portugal: 623, "real-madrid": 631 },
};
const mixRatio = (kind: StageMixKind, key: string) => `700 / ${MIX_H[kind][key] ?? (kind === "lopta" ? 690 : 580)}`;
export const stageMixImage = (kind: StageMixKind, key: string) => `/naslovnica/${kind === "lopta" ? "lopte-hd" : "kape-hd"}/${key}.webp`;

type Props = {
  images: HangerImages;
  slug: string;
  alt: (label: string) => string;
  surname: string;
  tag: PhotoTag | null;
  overline?: ReactNode;
  mix?: StageMix;
  flyFrom?: MutableRefObject<MixFlyFrom>;
};

type LiveItem = { kind: StageMixKind; key: string; id: number; out: boolean };

/* ---------------- raspored u jedinicama visine vješalice (u) ---------------- */

const GAP = 0.06; // razmak između vješalica (u)
const GAP_KID = 0.035; // dres i dječje hlačice bliže (veće na mobitelu)

/** Geometrija svake vješalice: lica (vlastiti vrh kuke → šipka) i okvir iz prvog lica (vidi ime-fit.ts). */
function fitPieces(pieces: Piece[]) {
  return pieces.map((p) => {
    const faces = p.faces.map((f, j) => faceFit(f.src, p.faces[j === 0 ? 1 : 0]?.src));
    const B = frameOf(faces[0]);
    // mjesto u redu: najšire lice
    const wmax = Math.max(B.w, ...faces.map((f) => f.img.w));
    return { faces, B, wmax, bar: faces[0].kind === "bar" };
  });
}
type Fit = ReturnType<typeof fitPieces>[number];

/** Vodoravni položaj kuke svake vješalice (u, od sredine) i ukupna širina reda (u). */
function place(list: Piece[], fits: Map<string, Fit>, centerSolo: boolean, gap = GAP) {
  const ws = list.map((p) => fits.get(p.key)!.wmax * p.s);
  const total = ws.reduce((s, w) => s + w, 0) + gap * (list.length - 1);
  let l = -total / 2;
  const out = new Map<string, number>();
  list.forEach((p, i) => {
    const B = fits.get(p.key)!.B;
    const w0 = B.w * p.s;
    out.set(p.key, centerSolo && list.length === 1 ? 0 : l + (ws[i] - w0) / 2 - B.l * p.s);
    l += ws[i] + gap;
  });
  return { out, total };
}

/* Prečka (hlače): nacrtana kuka. Luk (središte žice 7,875 px iznad dna svg-a, pola žice 0,95 px)
   leži unutarnjim rubom točno na gornjem rubu šipke; nosač ide od prečke do dna kuke. */
const BAR_STEM = `calc(${(BAR_DROP * 100).toFixed(1)}% + 2 * var(--rt) - 6.925px)`;

function photoLayout(pieces: Piece[], flipIdx: number) {
  const fl = fitPieces(pieces);
  const fits = new Map(pieces.map((p, i) => [p.key, fl[i]]));
  const base = pieces.filter((p) => !p.kidOnly);
  const a = place(base, fits, true);
  const hasKid = pieces.some((p) => p.kidOnly);
  const k = hasKid ? place(pieces, fits, false, GAP_KID) : a;
  const f4 = (n: number) => n.toFixed(4);
  const boxes = pieces.map((p, i) => {
    const { faces, B, bar } = fl[i];
    const w = B.w * p.s; // širina okvira (u)
    // vrh kuke točno na gornjem rubu šipke (--rt = pola debljine šipke); prečka visi malo ispod
    const top = (U: string) =>
      bar ? `calc(var(--top) + var(--rt) + ${f4(BAR_DROP * p.s)} * ${U})` : `calc(var(--top) - var(--rt) + ${f4(B.t * p.s)} * ${U})`;
    const box = (cx: number, U: string) => ({
      left: `calc(50% + ${f4(cx + B.l * p.s)} * ${U})`,
      top: top(U),
      width: `calc(${f4(w)} * ${U})`,
      height: `calc(${f4(B.h * p.s)} * ${U})`,
    });
    const cxA = a.out.get(p.key) ?? k.out.get(p.key) ?? 0;
    const cxK = k.out.get(p.key) ?? cxA;
    // pod (donji rub okvira) — za dodatke iz mixa
    const floor = (U: string) => `calc(${top(U)} + ${f4(B.h * p.s)} * ${U})`;
    // lica: vlastiti položaj (zrcaljeno lice leđa: zrcaljeno oko kuke, okret ga vrati)
    const mir = (j: number) => i === flipIdx && j === 1;
    const fc = faces.map((f, j) => ({
      kind: f.kind,
      img: pct(f.img, B, mir(j)),
      refl: pct(f.img, B, mir(j), true),
      // neizrcaljeno (za let s kartice)
      flat: pct(f.img, B),
      donor: f.donor
        ? { src: f.donor.src, img: pct(f.donor.r, B, mir(j)), refl: pct(f.donor.r, B, mir(j), true), keep: f.donor.keep }
        : null,
    }));
    return { a: box(cxA, "var(--u)"), k: box(cxK, "var(--uk)"), hook: -B.l / B.w, faces: fc, fa: floor("var(--u)"), fk: floor("var(--uk)"), s: p.s, bar };
  });
  return { boxes, wa: Math.max(0.5, a.total), wk: Math.max(0.5, k.total) };
}

function faceWord(T: ImeText, f: { key: string; label: string }, i: number, n: number) {
  const label = f.label;
  if (/prednj|sprijeda/i.test(label)) return T.front;
  if (/leđ/i.test(label)) return T.back;
  return n === 2 ? (i === 0 ? T.back : T.front) : faceLabel(T, f);
}

/** naziv strane na jeziku stranice (hanger-layout daje hrvatske oznake po ključu) */
const faceLabel = (T: ImeText, f: { key: string; label: string }) => T.face[f.key] ?? f.label;

/**
 * Prezime golemim obrisom: u Bebas Neue naglasak (È, Ć, Š, Ž, Ñ, Ö…) stoji ~0,047em iznad
 * verzala, što na ~360px izgleda kao odvojena crtica. Slovo ostaje jedan (NFC) glif, ali
 * se nacrta dvaput: donja kopija bez naglaska, gornja samo naglasak spušten bliže slovu.
 * Uz line-height .8 (uspon .9 / pad .3) vrh kutije = vrh verzala, pa rez na -0,023em pada u razmak.
 */
const ABOVE_MARK = /[\u0300-\u0309\u030B\u030C]/;
function nameGlyphs(name: string): ReactNode {
  const chars = [...name.normalize("NFC")];
  if (!chars.some((c) => ABOVE_MARK.test(c.normalize("NFD")))) return chars.join("");
  return chars.map((c, i) =>
    ABOVE_MARK.test(c.normalize("NFD")) ? (
      <span key={i} className="pz-acc">
        <span>{c}</span>
        <span>{c}</span>
      </span>
    ) : (
      c
    ),
  );
}

/* ---------------- stil ---------------- */

const CSS = `
.pz{position:relative;--top:46px;--rt:2px;--ease:cubic-bezier(.32,.72,0,1);
 --u:min(calc(73svh - 64px),calc(84vw / var(--wa)));--uk:min(calc(73svh - 64px),calc(95vw / var(--wk)));
 --uu:var(--u);height:calc(var(--top) + var(--uu) + 18px);transition:height .9s var(--ease);container-type:size}
.pz.pz-kid{--uu:var(--uk)}
@media (min-width:1024px){
 .pz{--top:84px;--rt:2.5px;height:100%;transition:none;
  --u:min(66cqh,calc(62cqw / var(--wa)));--uk:min(60cqh,calc(66cqw / var(--wk)))}
}
.pz-p{position:absolute;left:var(--l);top:var(--t);width:var(--w);height:var(--h);
 transition:left .9s var(--ease),top .9s var(--ease),width .9s var(--ease),height .9s var(--ease),opacity .5s ease,transform .9s var(--ease)}
.pz-kid .pz-p{left:var(--lk);top:var(--tk);width:var(--wk);height:var(--hk)}
.pz-p.pz-ko{opacity:0;transform:translateY(-14%);pointer-events:none}
.pz-kid .pz-p.pz-ko{opacity:1;transform:none;transition:left .9s var(--ease),top .9s var(--ease),width .9s var(--ease),height .9s var(--ease),opacity .45s ease .25s,transform 1.05s cubic-bezier(.34,1.32,.5,1) .2s}
.pz-sw,.pz-fl{position:absolute;inset:0;will-change:transform}
.pz-face{position:absolute;inset:0}
.pz-img{position:absolute;top:0;height:100%;max-width:none;transform-origin:50% 50%;user-select:none;-webkit-user-drag:none;pointer-events:none}
.pz-shade{position:absolute;top:0;height:100%;opacity:0;transform-origin:50% 50%;pointer-events:none;
 background:linear-gradient(90deg,rgba(0,0,0,.92),rgba(0,0,0,.35) 60%,rgba(0,0,0,.6));
 -webkit-mask-size:100% 100%;mask-size:100% 100%;-webkit-mask-repeat:no-repeat;mask-repeat:no-repeat}
.pz-refl{position:absolute;left:0;top:100%;width:100%;height:100%;pointer-events:none;opacity:.17;
 -webkit-mask-image:linear-gradient(180deg,rgba(0,0,0,.9) 0,rgba(0,0,0,.2) 6%,transparent 13%);mask-image:linear-gradient(180deg,rgba(0,0,0,.9) 0,rgba(0,0,0,.2) 6%,transparent 13%)}
.pz-refl .pz-img{transform:scaleY(-1)}
.pz-shadow{position:absolute;left:4%;width:92%;top:calc(100% - 2.2%);height:4.4%;pointer-events:none;
 background:radial-gradient(ellipse 50% 50% at 50% 50%,rgba(0,0,0,.9),rgba(0,0,0,.42) 45%,rgba(0,0,0,0) 72%)}
.pz-glow{position:absolute;left:-25%;width:150%;top:calc(100% - 10%);height:20%;pointer-events:none;
 background:radial-gradient(ellipse 50% 50% at 50% 50%,rgba(255,236,208,.075),rgba(255,236,208,.025) 55%,rgba(255,236,208,0) 100%)}
.pz-rail{position:absolute;left:0;width:100vw;top:var(--top);height:4px;transform:translateY(-50%);pointer-events:none;
 background:linear-gradient(180deg,#f3f3f5 0 17%,#46464a 17% 33%,#eeeef0 33% 50%,#1d1d22 50% 67%,#0a0a10 67% 100%)}
@media (min-width:1024px){.pz-rail{height:5px}}
.pz-name{position:absolute;inset-inline:0;display:flex;justify-content:center;top:calc(var(--top) + var(--uu) * .5);transform:translateY(-50%);transition:top .9s var(--ease)}
@media (min-width:1024px){.pz-namewrap{-webkit-mask-image:linear-gradient(90deg,#000 0,#000 72%,transparent 99%);mask-image:linear-gradient(90deg,#000 0,#000 72%,transparent 99%)}}
.pz-acc{position:relative;display:inline-block}
.pz-acc>span{display:inline-block;clip-path:inset(-.023em -.5em -.5em -.5em)}
.pz-acc>span+span{position:absolute;left:0;top:0;clip-path:inset(-.5em -.5em calc(100% + .023em) -.5em);transform:translateY(.035em)}
.pz-over{position:absolute;left:20px;bottom:calc(100% - var(--top) + 12px)}
@media (min-width:1024px){.pz-over{left:40px;bottom:calc(100% - var(--top) + 18px)}}
.pz-hookbar{position:absolute;bottom:100%;width:2.5px;margin-left:-1.25px;background:linear-gradient(90deg,#6d7177,#d9dce0 45%,#8a8e94);border-radius:2px}
/* etiketa */
.pz-tag{position:absolute;width:13%;aspect-ratio:2/3.3;transform-origin:50% 0;will-change:transform;cursor:pointer;touch-action:manipulation;perspective:320px;container-type:inline-size;filter:drop-shadow(0 3px 4px rgba(0,0,0,.55))}
.pz-tag-cord{position:absolute;left:50%;bottom:100%;width:1px;height:42%;margin-left:-.5px;background:linear-gradient(180deg,rgba(90,84,76,.2),#6b645a)}
.pz-tag-card{position:absolute;inset:0;transition:transform .44s cubic-bezier(.45,0,.25,1)}
.pz-tag.pz-tag-b .pz-tag-card{transform:rotateY(180deg)}
.pz-tag-f{position:absolute;inset:0;
 clip-path:polygon(22% 0,78% 0,100% 15%,100% 100%,0 100%,0 15%);background:#cfc3a8;transition:opacity 0s linear .2s}
/* lice/poleđina: zamjena na 90° (bez oslanjanja na backface-visibility — WebKit je ignorira uz clip-path) */
.pz-tag-f.pz-back,.pz-tag-b .pz-tag-f:not(.pz-back){opacity:0}
.pz-tag-b .pz-tag-f.pz-back{opacity:1}
.pz-tag-f>div{position:absolute;inset:1px;clip-path:polygon(22% 0,78% 0,100% 15%,100% 100%,0 100%,0 15%);background:linear-gradient(180deg,#1d1d1c,#131312);
 display:flex;flex-direction:column;align-items:center;justify-content:center;color:#f4f3ef;font-family:var(--font-bebas),"Bebas Neue","Arial Narrow",sans-serif;line-height:.9}
.pz-tag-f.pz-back{transform:rotateY(180deg)}
.pz-tag-hole{position:absolute;left:50%;top:10%;width:16%;aspect-ratio:1;margin-left:-8%;border-radius:50%;background:#050505;box-shadow:0 0 0 1.5px #a9a59c}
.pz-ctl{position:absolute;right:20px;top:calc(var(--top) - 50px)}
/* dolazak s kartice: etiketa, odsjaj i sjena ulaze tek kad dres sleti (nisu dio dijeljenih elemenata) */
.pz-tag,.pz-refl,.pz-shadow,.pz-glow{transition:opacity .45s ease}
html.ime-vt .pz-tag,html.ime-vt .pz-refl,html.ime-vt .pz-shadow,html.ime-vt .pz-glow{opacity:0!important;transition:none}
@media (min-width:1024px){.pz-ctl{right:auto;left:0;right:0;top:calc(var(--top) + var(--uu) + 44px);display:flex;justify-content:center;transition:top .9s var(--ease)}}
/* ---- mix: lopta na podu, kapa na kuki šipke (raspored u u-jedinicama, kao vješalice) ---- */
.pz{--fl:var(--fa);--ww:var(--wa);
 --bd:calc(.19 * var(--ms) * var(--uu));--cw:calc(.22 * var(--ms) * var(--uu));--rod:0px}
.pz.pz-kid{--fl:var(--fk);--ww:var(--wk)}
.pz-x{position:absolute;pointer-events:none;transition:left .9s var(--ease),top .9s var(--ease),bottom .9s var(--ease),width .9s var(--ease)}
.pz-x-out{opacity:0;transition:opacity .3s ease,transform .38s cubic-bezier(.4,0,1,1)}
.pz-xb.pz-x-out{transform:translateY(10%) scale(.88)}
.pz-xc.pz-x-out{transform:translateY(-8%) scale(.9)}
.pz-xw{position:relative;width:100%;height:100%}
.pz-wait{opacity:0}
.pz-xi{display:block;width:100%;height:100%;max-width:none;user-select:none;-webkit-user-drag:none}
.pz-xbody{position:relative;transform-origin:50% 100%;will-change:transform}
.pz-xsh{position:absolute;left:6%;width:88%;top:calc(100% - 7%);height:14%;transform-origin:50% 50%;
 background:radial-gradient(ellipse 50% 50% at 50% 50%,rgba(0,0,0,.92),rgba(0,0,0,.45) 45%,rgba(0,0,0,0) 72%)}
.pz-xr{position:absolute;left:0;top:100%;width:100%;opacity:.16;transform-origin:50% 0;
 -webkit-mask-image:linear-gradient(180deg,rgba(0,0,0,.95) 0,rgba(0,0,0,.25) 18%,transparent 42%);mask-image:linear-gradient(180deg,rgba(0,0,0,.95) 0,rgba(0,0,0,.25) 18%,transparent 42%)}
.pz-xr .pz-xi{transform:scaleY(-1)}
/* lopta: mobitel = donji desni kut (preko ruba dresa ako treba), računalo = desno od reda */
.pz-xb{width:var(--bd);top:calc(var(--fl) - var(--bd) + .004 * var(--uu));
 left:min(calc(50% + var(--ww) * var(--uu) / 2 - var(--bd) * .55),calc(100% - var(--bd) - 12px))}
/* kapa: mobitel = na podu, donji lijevi kut */
.pz-xc{width:var(--cw);bottom:calc(100% - var(--fl) - .004 * var(--uu));
 left:max(12px,calc(50% - var(--ww) * var(--uu) / 2 - var(--cw) * .4))}
.pz-xc .pz-xw{height:auto}
/* Igor 19.11.: Djeca (dres + hlačice) — kapa klizne ispod hlačica, lijevo do lopte (ondje je prazno) */
.pz-kid .pz-xc{left:calc(min(calc(50% + var(--ww) * var(--uu) / 2 - var(--bd) * .55),calc(100% - var(--bd) - 12px)) - var(--cw) + var(--bd) * .06)}
.pz-xsw{position:relative;transform-origin:60% 0;will-change:transform}
.pz-xrod,.pz-xhook{display:none}
@media (min-width:1024px){
 .pz{--bd:calc(.235 * var(--ms) * var(--uu));--cw:calc(.27 * var(--ms) * var(--uu));--rod:calc(.17 * var(--ms) * var(--uu))}
 .pz-xb{left:min(calc(50% + (var(--ww) / 2 + .035) * var(--uu)),calc(100% - var(--bd) - 16px))}
 /* Igor 17.11.: kapa na podu, zrcalno lopti (lijevo od reda) */
 .pz-xc{left:max(16px,calc(50% - (var(--ww) / 2 + .035) * var(--uu) - var(--cw)))}
 .pz-xc .pz-xsw{transform:none!important}
}
.pz-fly{position:fixed;left:0;top:0;z-index:29;pointer-events:none;will-change:transform;transform-origin:50% 50%}
.pz-fly img{display:block;width:100%;height:100%;max-width:none}
@media (prefers-reduced-motion:reduce){.pz-x,.pz-x-out{transition:none!important}}
@media (prefers-reduced-motion:reduce){.pz,.pz-p,.pz-kid .pz-p.pz-ko,.pz-name,.pz-ctl,.pz-tag-card{transition:none!important}}
`;

/* ---------------- fizika ---------------- */

type Sim = {
  th: number[]; // njihanje (°) po vješalici
  tv: number[];
  ta: number[]; // kutno ubrzanje (za etiketu)
  phi: number; // okret glavne vješalice (°)
  pv: number;
  target: number;
  ps: number; // etiketa (°)
  psv: number;
  cth: number; // kapa na kuki (°)
  ctv: number;
  drag: boolean;
};

/* Igor 17.11.: dres na stranici visi MIRNO; samo kratko, prigušeno smirivanje (~1 s, malen kut)
   kod dolaska, okreta Prednja/Leđa i dodira — nikakvo stalno njihanje. */
const SW_W = 2 * Math.PI * 0.9;
const SW_Z = 0.36;
const TG_W = 9;
const TG_Z = 0.42;
const FL_K = 120;
const FL_C = 17;
const CP_W = 2 * Math.PI * 1.05; // kapa: kraće njihalo
const CP_Z = 0.3;

const easeIO = (t: number) => (t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2);
const UP = "cubic-bezier(.2,.65,.4,1)";
const DOWN = "cubic-bezier(.6,0,.85,.45)";
/** Doskok lopte (samo transform): tijelo, odraz (zrcalno) i sjena. */
function bounceFrames(dir: 1 | -1) {
  const y = (v: number) => `translateY(${(v * dir).toFixed(1)}%)`;
  return [
    { transform: `${y(0)} scale(1.07,.9)`, easing: UP },
    { transform: `${y(-17)} scale(.98,1.02)`, offset: 0.27, easing: DOWN },
    { transform: `${y(0)} scale(1.04,.95)`, offset: 0.5, easing: UP },
    { transform: `${y(-5)} scale(1,1)`, offset: 0.68, easing: DOWN },
    { transform: `${y(0)} scale(1.01,.99)`, offset: 0.84, easing: "ease-out" },
    { transform: "none" },
  ];
}
const SHADOW_FRAMES = [
  { transform: "scale(1.06)", opacity: 1, easing: UP },
  { transform: "scale(.72)", opacity: 0.55, offset: 0.27, easing: DOWN },
  { transform: "scale(1.03)", opacity: 1, offset: 0.5, easing: UP },
  { transform: "scale(.9)", opacity: 0.85, offset: 0.68, easing: DOWN },
  { transform: "none", opacity: 1 },
];

export function ImePhotoStage({ images, slug, alt, surname, tag, overline, mix, flyFrom }: Props) {
  const T = useImeText();
  const pieces = useMemo(() => hangerPieces(images), [images]);
  const flipIdx = pieces.findIndex((p) => p.faces.length === 2 && !p.kidOnly);
  const lay = useMemo(() => photoLayout(pieces, flipIdx), [pieces, flipIdx]);
  const mainIdx = Math.max(0, flipIdx);
  const hasKid = pieces.some((p) => p.kidOnly);
  const kidSel = useKidSegment(slug);
  const kid = hasKid && kidSel;
  const fp = flipIdx >= 0 ? pieces[flipIdx] : null;

  const [side, setSide] = useState<0 | 1>(0);
  const [tagBack, setTagBack] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const swRefs = useRef<(HTMLDivElement | null)[]>([]);
  const flRef = useRef<HTMLDivElement | null>(null);
  const reflRefs = useRef<(HTMLDivElement | null)[]>([]);
  const shRefs = useRef<(HTMLDivElement | null)[]>([]);
  const shadeRefs = useRef<(HTMLDivElement | null)[]>([]);
  const faceRefs = useRef<(HTMLDivElement | null)[]>([]);
  const reflFaceRefs = useRef<(HTMLDivElement | null)[]>([]);
  const tagRef = useRef<HTMLDivElement>(null);
  const heights = useRef<number[]>([]);
  const sideRef = useRef<0 | 1>(0);
  const reduced = useRef(false);
  const sim = useRef<Sim>({ th: pieces.map(() => 0), tv: pieces.map(() => 0), ta: pieces.map(() => 0), phi: 0, pv: 0, target: 0, ps: 0, psv: 0, cth: 0, ctv: 0, drag: false });
  const capSwRef = useRef<HTMLDivElement | null>(null);
  const raf = useRef(0);
  const lastT = useRef(0);
  const quiet = useRef(0);
  const dragEnd = useRef(-1e9);

  /* ---- crtanje jednog stanja (samo transform/opacity) ---- */
  const paint = useCallback(() => {
    const s = sim.current;
    const rad = (s.phi * Math.PI) / 180;
    const c = Math.cos(rad);
    const sn = Math.abs(Math.sin(rad));
    pieces.forEach((_, i) => {
      const th = s.th[i];
      const sw = swRefs.current[i];
      if (sw) sw.style.transform = `rotate(${th.toFixed(3)}deg)`;
      const H = heights.current[i] || 0;
      const dx = Math.sin((th * Math.PI) / 180) * H;
      const isFlip = i === flipIdx;
      const refl = reflRefs.current[i];
      if (refl) refl.style.transform = `translateX(${dx.toFixed(2)}px)${isFlip ? ` perspective(1400px) rotateY(${s.phi.toFixed(2)}deg)` : ""}`;
      const sh = shRefs.current[i];
      if (sh) sh.style.transform = `translateX(${(dx * 0.92).toFixed(2)}px) scaleX(${(isFlip ? 0.32 + 0.68 * Math.abs(c) : 1).toFixed(3)})`;
    });
    if (flRef.current) flRef.current.style.transform = `perspective(1400px) rotateY(${s.phi.toFixed(2)}deg)`;
    shadeRefs.current.forEach((el) => el && (el.style.opacity = (0.62 * sn).toFixed(3)));
    const sd: 0 | 1 = c >= 0 ? 0 : 1;
    if (sd !== sideRef.current) {
      sideRef.current = sd;
      faceRefs.current.forEach((el, j) => el && (el.style.opacity = j === sd ? "1" : "0"));
      reflFaceRefs.current.forEach((el, j) => el && (el.style.opacity = j === sd ? "1" : "0"));
      if (tagRef.current) tagRef.current.style.visibility = sd === 0 ? "" : "hidden";
      setSide(sd);
    }
    if (tagRef.current) tagRef.current.style.transform = `rotate(${(s.ps - s.th[mainIdx]).toFixed(2)}deg)`;
    if (capSwRef.current) capSwRef.current.style.transform = `rotate(${s.cth.toFixed(3)}deg)`;
  }, [pieces, flipIdx, mainIdx]);

  const step = useCallback(
    (now: number) => {
      const s = sim.current;
      const dtAll = Math.min(0.05, Math.max(0.001, (now - (lastT.current || now - 16)) / 1000));
      lastT.current = now;
      const n = Math.max(1, Math.ceil(dtAll / 0.008));
      const dt = dtAll / n;
      for (let k = 0; k < n; k++) {
        for (let i = 0; i < s.th.length; i++) {
          const a = -SW_W * SW_W * s.th[i] - 2 * SW_Z * SW_W * s.tv[i];
          s.ta[i] = a;
          s.tv[i] += a * dt;
          s.th[i] += s.tv[i] * dt;
        }
        if (!s.drag) {
          const a = -FL_K * (s.phi - s.target) - FL_C * s.pv;
          s.pv += a * dt;
          s.phi += s.pv * dt;
        }
        const ac = -CP_W * CP_W * s.cth - 2 * CP_Z * CP_W * s.ctv;
        s.ctv += ac * dt;
        s.cth += s.ctv * dt;
        // etiketa: vlastito njihalo + tromost kad se vješalica zanjiše
        const at = -TG_W * TG_W * s.ps - 2 * TG_Z * TG_W * s.psv - 0.5 * s.ta[mainIdx];
        s.psv += at * dt;
        s.ps = Math.max(-8, Math.min(8, s.ps + s.psv * dt));
      }
      paint();
      const energy =
        s.th.reduce((m, v, i) => m + Math.abs(v) + Math.abs(s.tv[i]) * 0.1, 0) + Math.abs(s.ps) + Math.abs(s.psv) * 0.1 + Math.abs(s.phi - s.target) + Math.abs(s.pv) * 0.05 + Math.abs(s.cth) + Math.abs(s.ctv) * 0.1;
      if (energy < 0.05 && !s.drag) {
        quiet.current++;
        if (quiet.current > 3) {
          s.th.fill(0);
          s.tv.fill(0);
          s.ps = 0;
          s.psv = 0;
          s.cth = 0;
          s.ctv = 0;
          s.phi = s.target;
          s.pv = 0;
          paint();
          raf.current = 0;
          lastT.current = 0;
          return;
        }
      } else quiet.current = 0;
      raf.current = requestAnimationFrame(step);
    },
    [paint, mainIdx],
  );

  const wake = useCallback(() => {
    if (!raf.current) {
      lastT.current = 0;
      raf.current = requestAnimationFrame(step);
    }
  }, [step]);

  /** Zanjiši vješalicu(e): v u °/s. */
  const kick = useCallback(
    (v: number, only?: number) => {
      if (reduced.current) return;
      const s = sim.current;
      s.tv = s.tv.map((x, i) => (only == null || only === i ? x + v * (i === mainIdx || only != null ? 1 : 0.7) : x));
      if (only == null) s.ctv += v * 0.6;
      wake();
    },
    [wake, mainIdx],
  );

  const goTo = useCallback(
    (target: number, velocity = 0) => {
      const s = sim.current;
      s.target = target;
      if (reduced.current) {
        s.phi = target;
        s.pv = 0;
        paint();
        return;
      }
      s.pv = velocity;
      wake();
    },
    [paint, wake],
  );

  const show = (sd: 0 | 1) => {
    const s = sim.current;
    const k = Math.round((s.phi - sd * 180) / 360);
    const t = k * 360 + sd * 180;
    if (t !== s.target) {
      goTo(t);
      kick(t > s.phi ? -11 : 11, flipIdx);
    }
  };

  /* ---- mjere (za odsjaj/sjenu pri njihanju) ---- */
  useEffect(() => {
    reduced.current = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const root = rootRef.current;
    if (!root) return;
    const measure = () => {
      heights.current = swRefs.current.map((el) => el?.offsetHeight ?? 0);
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(root);
    return () => {
      ro.disconnect();
      cancelAnimationFrame(raf.current);
      raf.current = 0;
    };
  }, []);

  // nakon dolaska (i prijelaza s kartice): kratko smirivanje na kuki
  useEffect(() => {
    let t = 0;
    const go = () => {
      if (document.documentElement.classList.contains("ime-vt")) {
        t = window.setTimeout(go, 120);
        return;
      }
      kick(14);
    };
    t = window.setTimeout(go, 380);
    return () => window.clearTimeout(t);
  }, [kick]);

  // Djeca: hlačice se spuste i smire, dres se lagano zanjiše
  const firstKid = useRef(true);
  useEffect(() => {
    if (firstKid.current) {
      firstKid.current = false;
      return;
    }
    const t = window.setTimeout(() => {
      heights.current = swRefs.current.map((el) => el?.offsetHeight ?? 0);
      kick(kid ? 10 : -8);
      if (kid) {
        const ki = pieces.findIndex((p) => p.kidOnly);
        if (ki >= 0) kick(-22, ki);
      }
    }, kid ? 620 : 300);
    return () => window.clearTimeout(t);
  }, [kid, kick, pieces]);

  /* ---- mix: lopta/kapa u sceni ---- */
  const [live, setLive] = useState<LiveItem[]>([]);
  const seq = useRef(0);
  const shownRef = useRef<StageMix>({});
  const wrapRefs = useRef(new Map<number, HTMLDivElement>());
  const started = useRef(new Set<number>());
  const cleanups = useRef(new Set<() => void>());
  const wantL = mix?.lopta;
  const wantK = mix?.kapa;

  useEffect(() => {
    const want: StageMix = { lopta: wantL, kapa: wantK };
    const changed = (["lopta", "kapa"] as const).filter((k) => want[k] !== shownRef.current[k]);
    if (!changed.length) return;
    shownRef.current = want;
    setLive((list) => {
      let next = list.map((it) => (changed.includes(it.kind) && !it.out ? { ...it, out: true } : it));
      for (const k of changed) {
        const key = want[k];
        if (key) next = [...next, { kind: k, key, id: ++seq.current, out: false }];
      }
      return next;
    });
    const t = window.setTimeout(() => setLive((list) => list.filter((it) => !it.out)), reduced.current ? 0 : 420);
    return () => window.clearTimeout(t);
  }, [wantL, wantK]);

  useEffect(() => {
    const set = cleanups.current;
    return () => set.forEach((f) => f());
  }, []);

  /** Doskok (ili "puls" kad scena uđe u vidno polje): lopta odskoči, kapa se zanjiše. */
  const land = useCallback(
    (w: HTMLDivElement, kind: StageMixKind) => {
      if (reduced.current) return;
      if (kind === "lopta") {
        const o = { duration: 720, fill: "none" as const };
        w.querySelector<HTMLElement>(".pz-xbody")?.animate(bounceFrames(1), o);
        w.querySelector<HTMLElement>(".pz-xr")?.animate(bounceFrames(-1), o);
        w.querySelector<HTMLElement>(".pz-xsh")?.animate(SHADOW_FRAMES, o);
        return;
      }
      if (window.matchMedia("(min-width: 1024px)").matches) {
        sim.current.ctv += 52;
        wake();
      } else {
        w.querySelector<HTMLElement>(".pz-xbody")?.animate(
          [
            { transform: "translateY(-9%) rotate(-4deg)", easing: DOWN },
            { transform: "translateY(0) scale(1.03,.96)", offset: 0.4, easing: UP },
            { transform: "translateY(-2.5%)", offset: 0.68, easing: DOWN },
            { transform: "none" },
          ],
          { duration: 560 },
        );
      }
    },
    [wake],
  );

  /** Let iz pločice u scenu: fiksni sloj prati živi položaj cilja (skrol tijekom leta ne smeta), pa predaja. */
  const fly = useCallback((w: HTMLDivElement, img: HTMLImageElement, kind: StageMixKind, from: DOMRect, onLand: () => void) => {
    const r0 = img.getBoundingClientRect();
    const ov = document.createElement("div");
    ov.className = "pz-fly";
    ov.setAttribute("aria-hidden", "true");
    ov.style.width = `${r0.width}px`;
    ov.style.height = `${r0.height}px`;
    const im = document.createElement("img");
    im.src = img.currentSrc || img.src;
    im.alt = "";
    im.decoding = "sync";
    ov.appendChild(im);
    const x0 = from.left + from.width / 2;
    const y0 = from.top + from.height / 2;
    const s0 = Math.min(from.width / r0.width, from.height / r0.height, 1.4);
    const x2s = r0.left + r0.width / 2;
    const y2s = r0.top + r0.height / 2;
    const dist = Math.hypot(x2s - x0, y2s - y0);
    const D = Math.max(560, Math.min(920, 430 + dist * 0.42));
    const lift = Math.max(50, Math.min(150, dist * 0.16));
    const place = (x: number, y: number, sc: number, rot: number) => {
      ov.style.transform = `translate3d(${(x - r0.width / 2).toFixed(1)}px,${(y - r0.height / 2).toFixed(1)}px,0) rotate(${rot.toFixed(1)}deg) scale(${sc.toFixed(4)})`;
    };
    place(x0, y0, s0, 0);
    document.body.appendChild(ov);
    let id = 0;
    let t0 = 0;
    const done = () => {
      cancelAnimationFrame(id);
      ov.remove();
      cleanups.current.delete(done);
    };
    const tick = (now: number) => {
      if (!t0) t0 = now;
      const t = Math.min(1, (now - t0) / D);
      const e = easeIO(t);
      const r = img.getBoundingClientRect();
      const x2 = r.left + r.width / 2;
      const y2 = r.top + r.height / 2;
      const cx = x0 + (x2 - x0) * 0.6;
      const cy = Math.min(y0, y2) - lift;
      const u = 1 - e;
      const x = u * u * x0 + 2 * u * e * cx + e * e * x2;
      const y = u * u * y0 + 2 * u * e * cy + e * e * y2;
      const rot = kind === "lopta" ? -380 * u : -14 * Math.sin(Math.PI * e);
      place(x, y, s0 + (1 - s0) * e, rot);
      if (t < 1) id = requestAnimationFrame(tick);
      else {
        w.classList.remove("pz-wait");
        onLand();
        done();
      }
    };
    id = requestAnimationFrame(tick);
    cleanups.current.add(done);
  }, []);

  useLayoutEffect(() => {
    for (const it of live) {
      if (it.out || started.current.has(it.id)) continue;
      started.current.add(it.id);
      const w = wrapRefs.current.get(it.id);
      if (!w || reduced.current) continue;
      const f = flyFrom?.current;
      const fresh = !!f && f.kind === it.kind && performance.now() - f.t < 1500;
      if (fresh && flyFrom) flyFrom.current = null;
      const img = w.querySelector<HTMLImageElement>(".pz-xbody .pz-xi");
      const r = img?.getBoundingClientRect();
      const cy = r ? r.top + r.height / 2 : -1;
      const inView = !!r && r.height > 0 && cy > 64 && cy < window.innerHeight - 72;
      if (fresh && f && img && inView) {
        w.classList.add("pz-wait");
        fly(w, img, it.kind, f.rect, () => land(w, it.kind));
      } else {
        // scena nije na ekranu: dodatak je već na mjestu, a kad scena uđe u kadar — kratki doskok/zamah
        const io = new IntersectionObserver(
          (en) => {
            if (en.some((x) => x.isIntersecting)) {
              io.disconnect();
              cleanups.current.delete(stop);
              window.setTimeout(() => land(w, it.kind), 120);
            }
          },
          { threshold: 0.6 },
        );
        const stop = () => io.disconnect();
        cleanups.current.add(stop);
        io.observe(w);
      }
    }
  }, [live, fly, land, flyFrom]);

  /* ---- povlačenje = okret ---- */
  const drag = useRef<{ id: number; x: number; y: number; r0: number; on: boolean; lx: number; lt: number; v: number } | null>(null);
  const onDown = (e: React.PointerEvent) => {
    if (flipIdx < 0 || (e.pointerType === "mouse" && e.button !== 0)) return;
    drag.current = { id: e.pointerId, x: e.clientX, y: e.clientY, r0: sim.current.phi, on: false, lx: e.clientX, lt: e.timeStamp, v: 0 };
  };
  const onMove = (e: React.PointerEvent) => {
    const g = drag.current;
    if (!g || g.id !== e.pointerId) return;
    const dx = e.clientX - g.x;
    const dy = e.clientY - g.y;
    if (!g.on) {
      if (Math.abs(dy) > 10 && Math.abs(dy) > Math.abs(dx)) {
        drag.current = null;
        return;
      }
      if (Math.abs(dx) < 6) return;
      g.on = true;
      sim.current.drag = true;
      sim.current.pv = 0;
      try {
        (e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId);
      } catch {
        /* WebKit: neaktivni pokazivač */
      }
      wake();
    }
    const w = rootRef.current?.clientWidth || 360;
    sim.current.phi = g.r0 + (dx / Math.min(w, 520)) * 200;
    const dt = Math.max(1, e.timeStamp - g.lt);
    g.v = g.v * 0.6 + ((((e.clientX - g.lx) / Math.min(w, 520)) * 200 * 1000) / dt) * 0.4;
    g.lx = e.clientX;
    g.lt = e.timeStamp;
  };
  const onUp = (e: React.PointerEvent) => {
    const g = drag.current;
    drag.current = null;
    if (!g || g.id !== e.pointerId) return;
    if (!g.on) return;
    dragEnd.current = e.timeStamp;
    sim.current.drag = false;
    const base = Math.round(g.r0 / 180) * 180;
    const delta = sim.current.phi + Math.max(-180, Math.min(180, g.v * 0.18)) - base;
    const target = Math.abs(delta) > 45 ? base + Math.sign(delta) * 180 : base;
    goTo(target, Math.max(-900, Math.min(900, g.v)));
    kick(-Math.sign(g.v || delta) * 10, flipIdx);
  };

  // dodir dresa (ili etikete): kratko smirivanje; bez njihanja na prelazak mišem
  const tap = (e: React.MouseEvent) => {
    const el = e.target as HTMLElement;
    if (sim.current.drag || e.timeStamp - dragEnd.current < 250 || !el.closest?.(".pz-sw")) return;
    kick(el.closest(".pz-tag") ? 8 : 12);
  };

  const letters = Math.max(3, surname.length);
  const nameSize = `min(${(108 / (letters * 0.43)).toFixed(2)}cqw, 64vh)`;
  const mb = lay.boxes[mainIdx];
  const rootVars = { "--wa": lay.wa.toFixed(4), "--wk": lay.wk.toFixed(4), "--fa": mb?.fa, "--fk": mb?.fk, "--ms": (mb?.s ?? 1).toFixed(4) } as React.CSSProperties;

  return (
    <div
      ref={rootRef}
      className={`pz select-none touch-pan-y ${kid ? "pz-kid" : ""}`}
      style={rootVars}
      onPointerDown={onDown}
      onPointerMove={onMove}
      onPointerUp={onUp}
      onPointerCancel={onUp}
      onClick={tap}
      role="group"
      aria-roledescription={T.stageRole}
      aria-label={pieces.filter((p) => !p.kidOnly || kid).map((p) => faceLabel(T, p.faces[0])).join(T.and) + ` ${T.onHanger}`}
    >
      <style dangerouslySetInnerHTML={{ __html: CSS }} />

      {/* prezime: obris, iza svega */}
      <div aria-hidden className="pz-namewrap pointer-events-none absolute inset-0 overflow-hidden">
        <div className="pz-name">
          <span data-vt-to="name" className="ime-outline block whitespace-nowrap leading-[0.8]" style={{ fontSize: nameSize }}>
            {nameGlyphs(surname)}
          </span>
        </div>
      </div>

      {/* šipka: preko cijele širine stranice (na računalu i iza stupca s kupnjom) */}
      <div aria-hidden data-vt-to="rail" className="pz-rail" />

      {pieces.map((p, i) => {
        const b = lay.boxes[i];
        const vars = {
          "--l": b.a.left, "--t": b.a.top, "--w": b.a.width, "--h": b.a.height,
          "--lk": b.k.left, "--tk": b.k.top, "--wk": b.k.width, "--hk": b.k.height,
        } as React.CSSProperties;
        const isFlip = i === flipIdx;
        const isMain = i === mainIdx;
        const eager = isMain || !p.kidOnly || kid;
        const faceImgs = (refl: boolean) =>
          p.faces.map((f, j) => {
            const fb = b.faces[j];
            const mirror = isFlip && j === 1;
            const r = refl ? fb.refl : fb.img;
            const tf = `${mirror ? "scaleX(-1)" : ""}${refl ? " scaleY(-1)" : ""}`.trim() || undefined;
            const dn = fb.donor;
            return (
              <div
                key={f.key}
                ref={(el) => {
                  if (!isFlip) return;
                  (refl ? reflFaceRefs : faceRefs).current[j] = el;
                }}
                className="pz-face"
                data-vt-to={!refl && isMain && j === 0 ? "jersey" : undefined}
                style={{ opacity: j === 0 ? 1 : 0 }}
              >
                {dn ? (
                  /* slika bez kuke: posuđena kuka (gornji dio druge slike), iza tijela vješalice */
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img
                    src={dn.src}
                    alt=""
                    aria-hidden
                    draggable={false}
                    decoding="async"
                    loading={eager ? "eager" : "lazy"}
                    className="pz-img pz-donor"
                    style={{
                      ...(refl ? dn.refl : dn.img),
                      transform: tf,
                      clipPath: `inset(0 0 ${((1 - dn.keep) * 100).toFixed(3)}% 0)`,
                    }}
                  />
                ) : null}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={f.src}
                  alt={refl || j > 0 ? "" : alt(faceLabel(T, f))}
                  aria-hidden={refl || j > 0 || undefined}
                  draggable={false}
                  // glavna slika (LCP): sync → iscrta se u istom kadru u kojem je stigla, ne kadar-dva kasnije
                  decoding={isMain && j === 0 && !refl ? "sync" : "async"}
                  loading={eager ? "eager" : "lazy"}
                  // i odraz (isti URL, prvi u DOM-u): React iz PRVE <img> u ljusci podiže <link rel=preload> — bez
                  // fetchPriority na odrazu preload glavne slike (LCP) bio je Low
                  fetchPriority={isMain && j === 0 ? "high" : undefined}
                  className="pz-img"
                  data-fit={refl ? undefined : `${fb.flat.left} ${fb.flat.top} ${fb.flat.width} ${fb.flat.height}`}
                  style={{ ...r, transform: tf }}
                />
                {!refl && isFlip ? (
                  <div
                    ref={(el) => {
                      shadeRefs.current[j] = el;
                    }}
                    aria-hidden
                    className="pz-shade"
                    style={{
                      ...r,
                      WebkitMaskImage: `url(${f.src})`,
                      maskImage: `url(${f.src})`,
                      transform: mirror ? "scaleX(-1)" : undefined,
                    }}
                  />
                ) : null}
              </div>
            );
          });
        const origin = `${(b.hook * 100).toFixed(2)}% 0`;
        return (
          <div key={p.key} aria-hidden={(p.kidOnly && !kid) || undefined} className={`pz-p ${p.kidOnly ? "pz-ko" : ""}`} style={vars}>
            <div className="pz-glow" aria-hidden />
            <div ref={(el) => void (shRefs.current[i] = el)} className="pz-shadow" aria-hidden />
            <div ref={(el) => void (reflRefs.current[i] = el)} className="pz-refl" aria-hidden style={{ transformOrigin: `${(b.hook * 100).toFixed(2)}% 0` }}>
              {faceImgs(true)}
            </div>
            <div ref={(el) => void (swRefs.current[i] = el)} className="pz-sw" style={{ transformOrigin: origin }}>
              {b.bar ? (
                <>
                  <span aria-hidden className="pz-hookbar" style={{ left: `${(b.hook * 100).toFixed(2)}%`, height: BAR_STEM }} />
                  <svg aria-hidden data-hook="bar" viewBox="0 0 20 16" className="pointer-events-none absolute" style={{ left: `calc(${(b.hook * 100).toFixed(2)}% - 9.56px)`, bottom: `calc(100% + ${BAR_STEM.slice(5)}`, width: 11.25, height: 9, overflow: "visible" }}>
                    <path d="M17 16 L17 8 A6 6 0 0 0 5 8 q0 4 -3 6" fill="none" stroke="#c9ccd1" strokeWidth="1.9" vectorEffect="non-scaling-stroke" strokeLinecap="round" />
                  </svg>
                </>
              ) : null}
              <div ref={isFlip ? (el) => void (flRef.current = el) : undefined} className="pz-fl" style={{ transformOrigin: origin }}>
                {faceImgs(false)}
                {isMain && tag ? (
                  <div
                    ref={tagRef}
                    role="button"
                    tabIndex={0}
                    aria-label={tagBack ? T.tagSizesAria(tag.sizes ?? "") : T.tagPriceAria(tag.price)}
                    className={`pz-tag ${tagBack ? "pz-tag-b" : ""}`}
                    style={{ left: `${(b.hook * 100 - 6.5).toFixed(2)}%`, top: "12.5%" }}
                    onPointerDown={(e) => e.stopPropagation()}
                    onClick={() => {
                      if (!tag.sizes) return;
                      setTagBack((v) => !v);
                      sim.current.psv += reduced.current ? 0 : 60;
                      wake();
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        if (tag.sizes) setTagBack((v) => !v);
                      }
                    }}
                  >
                    <span aria-hidden className="pz-tag-cord" />
                    <div className="pz-tag-card">
                      <div className="pz-tag-f">
                        <div>
                          <span style={{ fontSize: "34cqw" }} className="tabular-nums">{tag.price}&nbsp;€</span>
                        </div>
                        <span className="pz-tag-hole" />
                      </div>
                      {tag.sizes ? (
                        <div className="pz-tag-f pz-back">
                          <div>
                            <span style={{ fontSize: "14cqw", opacity: 0.6 }}>{T.tagSizes}</span>
                            <span style={{ fontSize: "22cqw", marginTop: "6%", textAlign: "center" }}>{tag.sizes}</span>
                          </div>
                          <span className="pz-tag-hole" />
                        </div>
                      ) : null}
                    </div>
                  </div>
                ) : null}
              </div>
            </div>
          </div>
        );
      })}

      {live.map((it) => {
        const src = stageMixImage(it.kind, it.key);
        const ar = { aspectRatio: mixRatio(it.kind, it.key) };
        const ref = (el: HTMLDivElement | null) => {
          if (el) wrapRefs.current.set(it.id, el);
          else wrapRefs.current.delete(it.id);
        };
        const floorBits = (
          <>
            <div className="pz-xsh" aria-hidden />
            <div className="pz-xr" aria-hidden style={ar}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={src} alt="" draggable={false} decoding="async" className="pz-xi" />
            </div>
          </>
        );
        const body = (
          <div className="pz-xbody" style={ar}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={src} alt="" draggable={false} decoding="async" className="pz-xi" />
          </div>
        );
        return it.kind === "lopta" ? (
          <div key={it.id} aria-hidden className={`pz-x pz-xb ${it.out ? "pz-x-out" : ""}`}>
            <div ref={ref} className="pz-xw">
              {floorBits}
              {body}
            </div>
          </div>
        ) : (
          <div key={it.id} aria-hidden className={`pz-x pz-xc ${it.out ? "pz-x-out" : ""}`}>
            <div ref={ref} className="pz-xw">
              {floorBits}
              <div ref={it.out ? undefined : (el) => void (capSwRef.current = el)} className="pz-xsw">
                <svg className="pz-xhook" viewBox="0 0 12 12" aria-hidden>
                  <path d="M1 10 V5 A4 4 0 0 1 9 5 q0 3 -2.5 4.5" fill="none" stroke="#c9ccd1" strokeWidth="1.7" vectorEffect="non-scaling-stroke" strokeLinecap="round" />
                </svg>
                <span className="pz-xrod" aria-hidden />
                {body}
              </div>
            </div>
          </div>
        );
      })}

      {overline ? (
        <div data-vt-to="over" className="pz-over pointer-events-none">
          {overline}
        </div>
      ) : null}

      {fp ? (
        <div className="pz-ctl pointer-events-none">
          <div className="pointer-events-auto flex items-center gap-5 lg:gap-7" role="group" aria-label={T.sideGroup} onPointerDown={(e) => e.stopPropagation()}>
            {fp.faces.map((fc, i) => {
              const on = side === i;
              return (
                <button
                  key={fc.key}
                  type="button"
                  onClick={() => show(i as 0 | 1)}
                  aria-pressed={on}
                  className={`relative h-10 text-[13px] tracking-[0.02em] transition-colors duration-200 ${on ? "text-white" : "text-white/45 hover:text-white/80"}`}
                >
                  {faceWord(T, fc, i, fp.faces.length)}
                  <span aria-hidden className={`absolute inset-x-0 bottom-1.5 h-px origin-center bg-[#e8ff3c] transition-transform duration-300 ${on ? "scale-x-100" : "scale-x-0"}`} />
                </button>
              );
            })}
          </div>
          <span aria-live="polite" className="sr-only">
            {fp.faces[side] ? faceLabel(T, fp.faces[side]) : null}
          </span>
        </div>
      ) : null}
    </div>
  );
}
