"use client";

import { memo, startTransition, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type CSSProperties, type PointerEvent as RPointerEvent } from "react";

import { AMB_GREY, AMB_WHITE, HANGER_COLORS } from "@/lib/data/hanger-colors";
import { HANGER_HOOKS } from "@/lib/data/hanger-hooks";
import { OVAL_DESK_MQ, OVAL_META, OVAL_MOB_MQ, type OvalMeta } from "@/lib/data/oval-meta";
import type { OvalPlate } from "@/lib/data/oval-plate";
import type { OrmarRailItem } from "@/lib/data/ormar-items";

import type { EStoreControl } from "../e-store-3d";
import type { FilmHeroProps } from "./film-hero";
import { mod, smooth } from "./film-math";

/* ------------------------------------------------------------------ */
/*  OVAL HERO — ZADANA scena naslovnice (?scena=film = stari film).     */
/*  Brzina: ploča (= LCP slika) je u SSR HTML-u odmah vidljiva, kadar   */
/*  joj računa CSS (container jedinice, iste formule kao solveFrame) dok*/
/*  JS ne preuzme; puni put prstena (oval-plate, ~100 kB) je zaseban    */
/*  chunk; dresovi se učitavaju lijeno (fokus ±2 prvo, ostalo poslije   */
/*  load + idle) i svaki se pretopi kad je dekodiran.                   */
/*  Auto-okret: 3 s nakon spremnosti, pauza ~2.5 s na dresu u fokusu,   */
/*  glatki pomak 0.9 s; staje na svaku interakciju, nastavlja nakon 8 s;*/
/*  pauza kad je kartica skrivena ili scena izvan ekrana; bez njega uz  */
/*  prefers-reduced-motion. Sve po vremenu (dt), radi i na 120/144 Hz.  */
/*  Ploča (Blender Cycles, v3): ZATVOREN ovalni kromirani prsten koji   */
/*  lebdi (bez šipki ovjesa; ?nosaci=1 = tanke sajle). Dresovi kruže    */
/*  po cijelom prstenu kao vrtuljak: prednji luk = velike RAVNE 2D      */
/*  fotografije leđa (ime + broj), stražnji luk = isti dresovi viđeni   */
/*  straga kroz prsten → prednja fotografija (hanger-front), manji      */
/*  (perspektiva puta), tamniji, iza prednjih dresova i prednje cijevi. */
/*  Na bočnim krajevima fotografija se suzi (okret) i tamo zamijeni     */
/*  stranu. Vrh kuke točno na cijevi; fokus veći i jedini pun svjetla.  */
/*  Dresovi mirni (bez njihanja), bez zamućenja; po kadru samo          */
/*  transform/opacity. Uvod = jednostavno pretapanje. Bez prezimena.    */
/* ------------------------------------------------------------------ */

type Variant = "desktop" | "mobile";
type Frame = { s: number; dx: number; dy: number; plateW: number; plateH: number; pxPerItem: number };
type Layout = { v: Variant; M: OvalMeta; F: Frame; W: number; H: number };
type OvalData = { desktop: OvalPlate; mobile: OvalPlate };

/** broj dresova na cijelom prstenu (paran: stražnja točka, gdje jedan dres izlazi a sljedeći ulazi, pada iza dresa u fokusu).
    Razmak = opseg / broj → prsten je jednoliko popunjen (računalo ≈ 0.60 m, mobitel ≈ 0.53 m). */
const RING_N = { desktop: 18, mobile: 12 } as const;
const spacingOf = (v: Variant, P: { perimeter: number }) => P.perimeter / RING_N[v];
/** bazen DOM čvorova = cijeli prsten + 1 (na stražnjoj točki se dva pretapaju) */
const POOL = { desktop: RING_N.desktop + 1, mobile: RING_N.mobile + 1 } as const;
/** metara po px slike na vješalici (900 px = 0.86 m) */
const M_PX = 0.86 / 900;
/** dres u fokusu veći, susjedi manji (glatko po udaljenosti na šipki u m) */
const FOCUS_GROW = { desktop: 0.07, mobile: 0.05 } as const;
const SIDE_SHRINK = { desktop: 0.07, mobile: 0.08 } as const;
const focusScale = (v: Variant, dm: number) => {
  const t = Math.max(0, Math.min(1, dm / 0.6));
  const g = 1 - t * t * (3 - 2 * t);
  return 1 - SIDE_SHRINK[v] + (FOCUS_GROW[v] + SIDE_SHRINK[v]) * g;
};
/** pad svjetla od fokusa po udaljenosti na šipki (m): fokus pod reflektorom, prema krajevima luka tama */
const FALL: [number, number][] = [
  [0, 1],
  [0.25, 0.86],
  [0.6, 0.42],
  [1.2, 0.25],
  [1.8, 0.15],
  [2.4, 0.09],
];
function falloff(d: number) {
  for (let i = 1; i < FALL.length; i++) {
    const [x1, y1] = FALL[i];
    if (d <= x1) {
      const [x0, y0] = FALL[i - 1];
      const t = (d - x0) / (x1 - x0);
      return y0 + (y1 - y0) * t * t * (3 - 2 * t);
    }
  }
  return FALL[FALL.length - 1][1];
}
/** bočni krajevi (facing → 0): fotografija se suzi po širini (okret oko kuke) i malo pretopi; na facing = 0 zamijeni stranu */
const TURN_MIN = 0.16;
const TURN_FADE: [number, number] = [0.02, 0.2];
/** stražnji luk: svjetlina (osvjetljenje stropnim pločama, mjereno na putu) × ovo — jasno tamniji od susjeda sprijeda */
const BACK_B = { desktop: 0.3, mobile: 0.26 } as const;
/** bijeli/svijetli dresovi izvan fokusa (Mbappé, Neymar...) dodatno prigušeni */
const WHITE_DIM = 0.72;
/** os odraza: udio od ruba dresa do stvarnog poda (0 = odmah ispod ruba) */
const REFL_AXIS = { desktop: 0.12, mobile: 0.1 } as const;
/** mobitel: susjedi su djelomično preko ruba ekrana i preklapaju fokus → jače zatamnjenje */
const SIDE_DIM = { desktop: 1, mobile: 0.78 } as const;
/** neon: odsjaj limete na vrhu cijevi iznad dresa u fokusu — pola duljine luka (m po prstenu), debljina crte (px) */
const GLINT = { desktop: { half: 0.44, w: 2 }, mobile: { half: 0.3, w: 1.5 } } as const;
type Glint = { left: number; top: number; w: number; h: number; d: string; x0: number; x1: number; hx: number; hy: number };
/** luk odsjaja iz puta prstena (px kadra): vrh cijevi oko prednje točke s = 0 */
function glintOf(P: OvalPlate, F: Frame, v: Variant): Glint {
  const g = GLINT[v];
  const t: Path1 = { hx: 0, hy: 0, ppm: 0, facing: 1, depth: 0, light: 1 };
  const pts: [number, number][] = [];
  const N = 32;
  for (let i = 0; i <= N; i++) {
    samplePath(P, -g.half + (2 * g.half * i) / N, t);
    pts.push([F.dx + t.hx * F.s, F.dy + t.hy * F.s]);
  }
  samplePath(P, 0, t);
  const pad = 16;
  const xs = pts.map((p) => p[0]);
  const ys = pts.map((p) => p[1]);
  const left = Math.min(...xs) - pad;
  const top = Math.min(...ys) - pad;
  const d = pts.map((p, i) => `${i ? "L" : "M"}${(p[0] - left).toFixed(1)} ${(p[1] - top).toFixed(1)}`).join("");
  return { left, top, w: Math.max(...xs) - left + pad, h: Math.max(...ys) - top + pad, d, x0: Math.min(...xs) - left, x1: Math.max(...xs) - left, hx: t.hx, hy: t.hy };
}

type Path1 = { hx: number; hy: number; ppm: number; facing: number; depth: number; light: number };
/** s je periodičan (zatvoren prsten): svedi na [-opseg/2, opseg/2) i stisni na raspon puta */
function samplePath(P: OvalPlate, s0: number, out: Path1): Path1 {
  const path = P.path;
  const n = path.length;
  const L = P.perimeter;
  const s = Math.max(path[0][0], Math.min(path[n - 1][0], mod(s0 + L / 2, L) - L / 2));
  let lo = 0;
  let hi = n - 1;
  while (hi - lo > 1) {
    const m = (lo + hi) >> 1;
    if (path[m][0] <= s) lo = m;
    else hi = m;
  }
  const a = path[lo];
  const b = path[hi];
  const t = b[0] > a[0] ? (s - a[0]) / (b[0] - a[0]) : 0;
  const l = (i: number) => a[i] + (b[i] - a[i]) * t;
  out.hx = l(1);
  out.hy = l(2);
  out.ppm = l(3);
  out.facing = l(5);
  out.depth = l(6);
  out.light = l(8);
  return out;
}

/** kadar: ploča "cover", rub dresa u fokusu iznad hemLimit (po potrebi ploča niže/manja, najmanje 0.84 × cover) */
function solveFrame(P: OvalMeta, v: Variant, W: number, H: number, top: number, hemLimit: number): Frame {
  const [pw, ph] = P.size;
  const cover = Math.max(W / pw, H / ph);
  const hem = P.focus.hook[1] + (0.86 + 0.02) * P.focus.ppm * (1 + FOCUS_GROW[v]);
  let s = cover;
  // mobitel: uvijek "cover" (prsten od ruba do ruba, bez tamnih pojaseva); računalo: po potrebi do 0.84 × cover
  const sFit = (hemLimit - top) / Math.max(1, hem - P.nameBox[1] * 0.85);
  if (v === "desktop" && sFit < s) s = Math.max(cover * 0.84, sFit);
  let dy = (H - ph * s) / 2;
  if (hem * s + dy > hemLimit) dy = hemLimit - hem * s;
  if (v === "desktop") dy = Math.min(dy, top - P.nameBox[1] * s * 0.6);
  else dy = Math.min(dy, 0);
  dy = Math.max(dy, Math.min(0, H - ph * s));
  const dx = W / 2 - P.focus.x * s;
  return { s, dx, dy, plateW: pw * s, plateH: ph * s, pxPerItem: spacingOf(v, P) * P.focus.ppm * s };
}

/* ---------- puni put prstena: zaseban chunk, kreće čim se modul izvrši u pregledniku ---------- */
let ovalData: OvalData | null = null;
let ovalP: Promise<OvalData> | null = null;
function loadOval() {
  if (!ovalP)
    ovalP = import("@/lib/data/oval-plate").then(
      (m) => (ovalData = m.OVAL),
      (err) => {
        ovalP = null;
        throw err;
      }
    );
  return ovalP;
}
if (typeof window !== "undefined") void loadOval().catch(() => undefined);

/** izbor ploče = isti media query kao <picture> i CSS kadar (bez skoka slike nakon hidracije) */
function deskVariant() {
  try {
    return window.matchMedia(OVAL_DESK_MQ).matches;
  } catch {
    return true;
  }
}

/** Kadar ploče u CSS-u (prije JS-a): iste formule kao solveFrame, W/H = container jedinice scene.
    top / hemPad = isto što EHome šalje kao top / sceneH - hemLimit (računalo ≥ 1024 px, inače mobitel). */
export type OvalSsrFrame = { top: [desk: number, phone: number]; hemPad: [desk: number, phone: number] };
const n4 = (x: number) => +x.toFixed(4);
function frameCss(fr: OvalSsrFrame) {
  const D = OVAL_META.desktop;
  const M = OVAL_META.mobile;
  const hemD = D.focus.hook[1] + 0.88 * D.focus.ppm * (1 + FOCUS_GROW.desktop);
  const hemM = M.focus.hook[1] + 0.88 * M.focus.ppm * (1 + FOCUS_GROW.mobile);
  const fitK = Math.max(1, hemD - D.nameBox[1] * 0.85);
  const mob = [
    `--s:max(calc(var(--W)/${M.size[0]}),calc(var(--H)/${M.size[1]}))`,
    `--d0:calc((var(--H) - var(--s)*${M.size[1]})/2)`,
    `--d1:min(var(--d0),calc(var(--hl) - var(--s)*${n4(hemM)}),0px)`,
    `left:calc(var(--W)/2 - var(--s)*${M.focus.x})`,
    `top:max(var(--d1),min(0px,calc(var(--H) - var(--s)*${M.size[1]})))`,
    `width:calc(var(--s)*${M.size[0]})`,
    `height:calc(var(--s)*${M.size[1]})`,
  ].join(";");
  const desk = [
    `--c:max(calc(var(--W)/${D.size[0]}),calc(var(--H)/${D.size[1]}))`,
    `--s:max(calc(var(--c)*.84),min(var(--c),calc((var(--hl) - var(--top))/${n4(fitK)})))`,
    `--d0:calc((var(--H) - var(--s)*${D.size[1]})/2)`,
    `--d1:min(var(--d0),calc(var(--hl) - var(--s)*${n4(hemD)}),calc(var(--top) - var(--s)*${n4(D.nameBox[1] * 0.6)}))`,
    `left:calc(var(--W)/2 - var(--s)*${D.focus.x})`,
    `top:max(var(--d1),min(0px,calc(var(--H) - var(--s)*${D.size[1]})))`,
    `width:calc(var(--s)*${D.size[0]})`,
    `height:calc(var(--s)*${D.size[1]})`,
  ].join(";");
  return (
    `.ov{container-type:size}` +
    `.ov-f{--W:100cqw;--H:100cqh;--top:${fr.top[1]}px;--hl:calc(var(--H) - ${fr.hemPad[1]}px);${mob}}` +
    `@media (min-width:1024px){.ov-f{--top:${fr.top[0]}px;--hl:calc(var(--H) - ${fr.hemPad[0]}px)}}` +
    `@media ${OVAL_DESK_MQ}{.ov-f{${desk}}}`
  );
}

/* ---------- slike ---------- */
const backOf = (it: OrmarRailItem | undefined) => (it && it.img.kind === "dres" ? it.img.back : it && it.img.kind === "trenirka" ? it.img.jakna : "");
/** prednja strana (stražnji luk); bez nje → leđa */
const frontOf = (it: OrmarRailItem | undefined) =>
  (it && it.img.kind === "dres" ? it.img.front : it && it.img.kind === "trenirka" ? it.img.jaknaFront : "") || backOf(it);
/** bijeli / vrlo svijetli dres (hladno bijelo ambijentalno svjetlo) */
const isWhite = (src: string) => HANGER_COLORS[src]?.[0] === AMB_WHITE;
/** predučitavanje (slike koje tek dolaze na prsten) */
const preloaded = new Set<string>();
function preload(src: string) {
  if (!src || preloaded.has(src)) return;
  preloaded.add(src);
  const im = new Image();
  im.decoding = "async";
  im.src = src;
}
/** geometrija slike: [src, w, h, kukaX, kukaY] u px slike */
type Pic = [string, number, number, number, number];
const picCache = new Map<string, Pic>();
function flatOf(src: string): Pic {
  let p = picCache.get(src);
  if (p) return p;
  const hk = HANGER_HOOKS[src];
  const ar = hk ? hk.ar : 0.703;
  const w = 900 * ar;
  p = [src, w, 900, (hk && hk.hook !== false && !hk.multi ? hk.hx : 0.5) * w, (hk ? hk.hy : 5 / 900) * 900];
  picCache.set(src, p);
  return p;
}

/* ---------- ambijentalno svjetlo u boji dresa (zid kroz amb masku, pod ispod dresova; screen, nikad na dres) ---------- */
const AMB = { wall: 0.6, floor: 0.3, white: 0.8, grey: 0.45, second: 0.75, secondMix: 0.22 };
const ambCache = new Map<string, string>();
function hexRgb(h: string, mix = 0) {
  const n = parseInt(h.slice(1), 16);
  const c = (x: number) => Math.round(x + (255 - x) * mix);
  return `${c((n >> 16) & 255)},${c((n >> 8) & 255)},${c(n & 255)}`;
}
function ambBg(v: Variant, P: OvalPlate, part: "wall" | "floor", src: string) {
  const key = `${v}|${part}|${src}`;
  const hit = ambCache.get(key);
  if (hit !== undefined) return hit;
  const cs = HANGER_COLORS[src] ?? [AMB_WHITE];
  const g = (c: string) => (c === AMB_WHITE ? AMB.white : c === AMB_GREY ? AMB.grey : 1);
  const two = cs.length > 1;
  const c1 = cs[0];
  const c2 = cs[1] ?? cs[0];
  const blob = (c: string, mix: number, a: number, rx: number, ry: number, x: number, y: number) => {
    const q = hexRgb(c, mix);
    return `radial-gradient(${rx}% ${ry}% at ${x}% ${y}%,rgba(${q},${a.toFixed(3)}) 0%,rgba(${q},${(a * 0.5).toFixed(3)}) 35%,rgba(${q},${(a * 0.15).toFixed(3)}) 68%,rgba(${q},0) 100%)`;
  };
  const d = v === "desktop";
  const k1 = g(c1);
  const k2 = g(c2) * (two ? AMB.second : 1);
  const m2 = two ? AMB.secondMix : 0;
  const fx = (P.focus.x / P.size[0]) * 100;
  // zid: aureola iza dresa u fokusu (sloj = cijela ploča, sredina zidne plohe ispod šipke); pod: bazen ispod dresa (sloj = pojas poda)
  const wy = (((P.wallTopY + P.floorY) / 2) / P.size[1]) * 100;
  const parts =
    part === "wall"
      ? d
        ? [blob(c1, 0, AMB.wall * k1, 15, 26, fx - 4, wy), blob(c2, m2, AMB.wall * k2, 15, 26, fx + 4, wy)]
        : [blob(c1, 0, AMB.wall * 1.4 * k1, 40, 16, fx - 14, wy), blob(c2, m2, AMB.wall * 1.4 * k2, 40, 16, fx + 14, wy)]
      : d
        ? [blob(c1, 0, AMB.floor * k1, 18, 46, fx - 4, 18), blob(c2, m2, AMB.floor * k2, 18, 46, fx + 4, 18)]
        : [blob(c1, 0, AMB.floor * k1, 46, 34, fx - 12, 16), blob(c2, m2, AMB.floor * k2, 46, 34, fx + 12, 16)];
  const out = parts.join(",");
  ambCache.set(key, out);
  return out;
}
type AmbLayer = { el: HTMLElement | null; fl: HTMLElement | null; k: number; o: string };

/* ---------- dres u bazenu ---------- */
/** jedna strana dresa: 0 = leđa (prednji luk), 1 = prednja strana (stražnji luk) */
/** src = dodijeljena slika; set = slika stvarno postavljena na <img> (lijeno); ok = dekodirana; fa = pretapanje pri prvom prikazu */
type Face = { pic: HTMLDivElement | null; img: HTMLImageElement | null; sd: HTMLElement | null; src: string; set: string; ok: boolean; fa: number; on: boolean; ha: string };
const newFace = (): Face => ({ pic: null, img: null, sd: null, src: "", set: "", ok: false, fa: 0, on: false, ha: "" });
type Slot = {
  k: number;
  el: HTMLDivElement | null;
  faces: [Face, Face];
  white: boolean;
  refl: HTMLDivElement | null;
  reflBox: HTMLDivElement | null;
  reflImg: HTMLImageElement | null;
  reflSrc: string;
  cs: HTMLElement | null;
  /** zadnji okvir na ekranu (za dodir i prijelaz na stranicu dresa) */
  box: { left: number; top: number; width: number; height: number } | null;
  /** dubina točke kuke (m od kamere), za poredak */
  dep: number;
  /** na stražnjoj strani (vidimo prednju fotografiju) */
  rear: boolean;
  c: { t: string; o: string; z: string; rt: string; ro: string; rd: string; rz: string; ct: string; co: string };
};
const newSlot = (): Slot => ({
  k: Number.NaN,
  el: null,
  faces: [newFace(), newFace()],
  white: false,
  refl: null,
  reflBox: null,
  reflImg: null,
  reflSrc: "",
  cs: null,
  box: null,
  dep: Number.NaN,
  rear: false,
  c: { t: "", o: "", z: "", rt: "", ro: "", rd: "", rz: "", ct: "", co: "" },
});

const picStyle = (p: Pic) => ({ width: `${p[1]}px`, height: `${p[2]}px`, transform: `translate(${(-p[3]).toFixed(1)}px,${(-p[4]).toFixed(1)}px)` });

/** dodijeli fotografiju strani (samo zapis; na <img> ide tek u loadFace, kad je strana potrebna) */
function setFacePic(f: Face, src: string) {
  if (src === f.src) return;
  f.src = src;
  // ista slika je već na elementu (npr. novi kadar nakon promjene veličine) → bez ponovnog pretapanja
  if (src && f.set === src) return;
  f.ok = false;
  f.fa = 0;
  if (f.set) {
    f.set = "";
    f.img?.removeAttribute("src");
  }
}
/** Stražnji luk (prednja fotografija) je malen i taman → umanjena slika iz Next optimizatora (w=384, AVIF/WebP po
    Accept; isti URL kao kartice kataloga → dijeljeni cache). ~4× manje bajtova dok se prsten okreće. Geometrija kuke
    i dalje po izvornom putu (HANGER_HOOKS), omjer slike je isti. */
// `/_next/image/` (s kosom crtom): trailingSlash:true bi inače svaki zahtjev 308-preusmjerio (+1 krug po slici)
const rearUrl = (src: string) => (src.startsWith("/") ? `/_next/image/?url=${encodeURIComponent(src)}&w=384&q=75` : src);
/** postavi sliku na <img> (pomak kuke kao transform, maska sjene = silueta); ok tek nakon dekodiranja */
function loadFace(f: Face, onReady: () => void, rear = false) {
  if (!f.src || f.set === f.src || !f.img || !f.pic) return;
  const src = f.src;
  const url = rear ? rearUrl(src) : src;
  f.set = src;
  f.ok = false;
  f.img.src = url;
  Object.assign(f.pic.style, picStyle(flatOf(src)));
  if (f.sd) {
    const mk = `url("${url}")`;
    f.sd.style.setProperty("-webkit-mask-image", mk);
    f.sd.style.setProperty("mask-image", mk);
  }
  const done = () => {
    if (f.set !== src) return;
    f.ok = true;
    onReady();
  };
  if (f.img.decode) f.img.decode().then(done, done);
  else f.img.addEventListener("load", done, { once: true });
}
function setSlotPics(sl: Slot, back: string, front: string) {
  sl.box = null;
  sl.white = isWhite(back);
  setFacePic(sl.faces[0], back);
  setFacePic(sl.faces[1], front);
}
/** odraz = strana koja je trenutno vidljiva (mijenja se samo pri okretu na bočnom kraju) */
function setReflPic(sl: Slot, src: string) {
  if (src === sl.reflSrc || !sl.reflImg || !sl.reflBox) return;
  sl.reflSrc = src;
  if (!src) {
    sl.reflImg.removeAttribute("src");
    return;
  }
  sl.reflImg.src = src;
  Object.assign(sl.reflBox.style, picStyle(flatOf(src)));
}

function prefersReduced() {
  try {
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  } catch {
    return false;
  }
}

// .ov clip-path: LCP: Chrome ne broji sliku koja prekriva CIJELI viewport (smatra je pozadinom) — na računalu ploča to radi, pa je LCP
// bila sjena dresa u fokusu tek nakon JS-a prstena (~3-4 s). 1 px s lijeva odrezan → ploča (prvi kadar, u SSR-u) je LCP kao na mobitelu.
export const OVAL_CSS = `
.ov{position:absolute;inset:0;overflow:hidden;isolation:isolate;background:#0b0b0a;touch-action:pan-y;-webkit-user-select:none;user-select:none;cursor:grab;clip-path:inset(0 0 0 1px)}
.ov[data-drag]{cursor:grabbing}
.ov-l{position:absolute;pointer-events:none}
.ov-l>img,.ov-l>picture>img{display:block;width:100%;height:100%}
.ov-plate{z-index:1}
.ov-amb{z-index:3;mix-blend-mode:screen;opacity:0;transition:opacity .9s ease .35s;-webkit-mask-size:100% 100%;mask-size:100% 100%;-webkit-mask-repeat:no-repeat;mask-repeat:no-repeat}
.ov[data-ready] .ov-amb{opacity:1}
.ov-amb>i{position:absolute;left:0;top:0;width:50%;height:50%;transform:scale(2);transform-origin:0 0;display:block;opacity:0;mix-blend-mode:plus-lighter}
.ov[data-moving] .ov-amb>i{will-change:opacity}
.ov-occl{z-index:600}
.ov-occlb{z-index:500}
.ov-j{position:absolute;left:0;top:0;width:0;height:0;transform-origin:0 0;opacity:0;backface-visibility:hidden}
.ov-j>div{position:absolute;left:0;top:0;transform-origin:0 0;opacity:0}
.ov-j img{display:block;width:100%;height:100%}
.ov-sd{position:absolute;inset:0;display:block;opacity:0;background:#000;-webkit-mask-size:100% 100%;mask-size:100% 100%;-webkit-mask-repeat:no-repeat;mask-repeat:no-repeat}
.ov[data-moving] .ov-j{will-change:transform,opacity}
.ov-r{position:absolute;left:0;top:0;width:0;height:0;transform-origin:0 0;display:none;z-index:8}
.ov-r>div{position:absolute;left:0;top:0;-webkit-mask-image:linear-gradient(0deg,rgba(0,0,0,.85),rgba(0,0,0,0) 46%);mask-image:linear-gradient(0deg,rgba(0,0,0,.85),rgba(0,0,0,0) 46%)}
.ov[data-phone] .ov-r>div{-webkit-mask-image:linear-gradient(0deg,rgba(0,0,0,.8),rgba(0,0,0,.3) 20%,rgba(0,0,0,0) 44%);mask-image:linear-gradient(0deg,rgba(0,0,0,.8),rgba(0,0,0,.3) 20%,rgba(0,0,0,0) 44%)}
.ov-r img{display:block;width:100%;height:100%}
.ov-gl{position:absolute;z-index:650;pointer-events:none;opacity:0;overflow:visible;filter:drop-shadow(0 0 4px rgba(232,255,60,.9)) drop-shadow(0 0 12px rgba(232,255,60,.45))}
.ov-gl[data-v="mobile"]{filter:drop-shadow(0 0 3px rgba(232,255,60,.75))}
.ov[data-moving] .ov-gl{will-change:transform,opacity}
.ov-cs{position:absolute;left:0;top:0;display:block;opacity:0;z-index:7;pointer-events:none;border-radius:50%;background:radial-gradient(closest-side,rgba(0,0,0,.8),rgba(0,0,0,.4) 45%,rgba(0,0,0,0))}
@media (prefers-reduced-motion:reduce){.ov-amb{transition:none}}
`;

/* ---------- auto-okret ---------- */
const AUTO = {
  /** Igor 18.11.: automatsko okretanje ISKLJUČENO (true = uključi) */
  on: false,
  /** prvi korak nakon spremnosti scene (ms) */
  first: 3000,
  /** pauza dresa u fokusu (ms) */
  dwell: 2500,
  /** trajanje pomaka za jedan dres (s), ease-in-out */
  move: 0.9,
  /** nastavak nakon zadnje interakcije (ms) */
  idle: 8000,
};
const easeInOut = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
/** pretapanje dresa pri prvom prikazu (s, nakon dekodiranja slike) */
const FADE_IN = 0.45;
/** dresovi učitani odmah: fokus ± ovoliko (ostali nakon load + idle) */
const NEAR = 2.5;

const DEFAULT_SSR_FRAME: OvalSsrFrame = { top: [76, 60], hemPad: [175, 70] };
export type OvalHeroProps = FilmHeroProps & { ssrFrame?: OvalSsrFrame };

export const OvalHero = memo(function OvalHero({ list, sceneH, desk, startIndex, control, onActive, onOpenItem, onFirstFrame, skipIntro, top, hemLimit, floorPad = 0, ssrFrame = DEFAULT_SSR_FRAME }: OvalHeroProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const plateImg = useRef<HTMLImageElement>(null);
  const slots = useRef<Slot[]>([]);
  const amb = useRef<AmbLayer[]>([0, 1, 2].map(() => ({ el: null, fl: null, k: Number.NaN, o: "" })));
  const reflData = useRef<{ w: number; h: number; a: Uint8ClampedArray } | null>(null);
  /** neon odsjaj na prstenu: element + geometrija luka (kadar) + zadnje zapisane vrijednosti */
  const glintEl = useRef<SVGSVGElement>(null);
  const glintRef = useRef<Glint | null>(null);
  const glintC = useRef({ t: "", o: "" });

  const [layout, setLayout] = useState<Layout | null>(null);
  const [ready, setReady] = useState(false);
  /** puni put prstena (zaseban chunk); na SSR-u i u prvom iscrtavanju klijenta svejedno nema kadra → bez neslaganja hidracije */
  const [data, setData] = useState<OvalData | null>(() => ovalData);
  /** ?nosaci=1: ploča s tankim čeličnim sajlama (inače prsten lebdi) — čita se nakon hidracije (SSR ne zna upit) */
  const [cables, setCables] = useState(false);
  useEffect(() => {
    try {
      if (new URLSearchParams(window.location.search).get("nosaci") === "1") setCables(true);
    } catch {
      /* bez URL-a */
    }
    // chunk je mogao stići između prvog iscrtavanja i ovog efekta (iz cachea, za vrijeme hidracije) → preuzmi ga odmah,
    // inače bi stanje ostalo null i dresovi se nikad ne bi pojavili
    if (ovalData) {
      setData(ovalData);
      return;
    }
    let off = false;
    loadOval()
      .then((d) => !off && setData(d))
      .catch((err) => console.warn("[oval] chunk failed", err));
    return () => {
      off = true;
    };
  }, []);
  useEffect(() => {
    if (!data || process.env.NODE_ENV === "production") return;
    for (const v of ["desktop", "mobile"] as const) {
      const a = OVAL_META[v];
      const b = data[v];
      if (a.size.join() !== b.size.join() || a.focus.hook.join() !== b.focus.hook.join() || a.focus.ppm !== b.focus.ppm || a.focus.x !== b.focus.x || a.nameBox.join() !== b.nameBox.join() || a.perimeter !== b.perimeter || a.plate.join() !== b.files.plate.join())
        console.warn(`[oval] lib/data/oval-meta.ts (${v}) se ne slaže s oval-plate.ts — prepiši vrijednosti`);
    }
  }, [data]);

  const S = useRef({
    pos: startIndex,
    prevPos: startIndex,
    vel: 0,
    target: null as number | null,
    drag: false,
    base: Number.NaN,
    active: -1,
    sent: -1,
    sendT: 0,
    ia: skipIntro ? 1 : 0,
    iaOn: false,
    raf: 0,
    t: 0,
    /** dt zadnjeg kadra (s); 0 izvan petlje */
    dt: 0,
    reduced: false,
    moving: false,
    wheelT: 0,
    off: false,
    pending: false,
    /** neki dres se upravo pretapa (petlja ne smije stati) */
    fading: false,
    /** učitavanje dresova: 0 ništa, 1 fokus ± NEAR, 2 svi */
    load: 0,
    promoting: false,
    /** auto-okret: aktivni pomak (t0 = NaN dok ga prvi kadar ne postavi) */
    tw: null as null | { from: number; to: number; t0: number },
    autoT: 0,
    /** zadnji pomak je bio auto-okret (bez interakcije od tada) */
    autoMoved: false,
    hidden: false,
    /** auto-okret dopušten (nakon što su dresovi u fokusu prikazani) */
    autoOn: false,
    lastInteract: Number.NEGATIVE_INFINITY,
    loadT: 0,
  });
  const skipRef = useRef(skipIntro);
  const promoteRef = useRef<() => void>(() => undefined);
  const plateRef = useRef<OvalPlate | null>(null);
  const kickRef = useRef<() => void>(() => undefined);
  const autoRef = useRef<(ms: number) => void>(() => undefined);

  const phoneRef = useRef(!desk);
  phoneRef.current = !desk;
  const topRef = useRef(top);
  topRef.current = top;
  const layoutRef = useRef<Layout | null>(null);
  layoutRef.current = layout;
  const listRef = useRef(list);
  listRef.current = list;
  const cbs = useRef({ onActive, onOpenItem });
  cbs.current = { onActive, onOpenItem };

  /* ---------- kadar ---------- */
  useLayoutEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const fit = () => {
      const W = root.clientWidth || window.innerWidth;
      const H = root.clientHeight || sceneH;
      // ploča po istom media queryju kao <picture> i CSS kadar (SSR) → nakon hidracije ista slika, isti kadar
      const v: Variant = deskVariant() ? "desktop" : "mobile";
      const M = OVAL_META[v];
      const F = solveFrame(M, v, W, H, top, hemLimit);
      setLayout((p) => (p && p.v === v && p.W === W && p.H === H && Math.abs(p.F.s - F.s) < 1e-4 ? p : { v, M, F, W, H }));
    };
    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(root);
    return () => ro.disconnect();
  }, [sceneH, top, hemLimit, desk, floorPad]);

  const P = layout && data ? data[layout.v] : null;
  plateRef.current = P;

  /* ---------- maska odraza (jačina zrcaljenja poliranog kamena) ---------- */
  useEffect(() => {
    if (!P) return;
    reflData.current = null;
    const img = new Image();
    img.src = P.files.refl;
    let off = false;
    // maska je glatka (jačina zrcaljenja poda) → očitava se umanjena na ≤ 320 px i tek kad je preglednik besposlen
    // (puna rezolucija = dugi zadatak readbacka ~0.1–0.3 s na sporom mobitelu, TBT)
    const read = () => {
      if (off) return;
      const k = Math.min(1, 320 / Math.max(1, img.naturalWidth));
      const c = document.createElement("canvas");
      c.width = Math.max(1, Math.round(img.naturalWidth * k));
      c.height = Math.max(1, Math.round(img.naturalHeight * k));
      const x = c.getContext("2d", { willReadFrequently: true });
      if (!x) return;
      x.drawImage(img, 0, 0, c.width, c.height);
      reflData.current = { w: c.width, h: c.height, a: x.getImageData(0, 0, c.width, c.height).data };
      if (!S.current.raf) apply();
    };
    img
      .decode()
      .then(() => {
        const w = window as Window & { requestIdleCallback?: (cb: () => void, o?: { timeout: number }) => number };
        if (w.requestIdleCallback) w.requestIdleCallback(read, { timeout: 1200 });
        else read();
      })
      .catch(() => undefined);
    return () => {
      off = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [P]);

  /* ---------- bazen: dodjela stavki ---------- */
  const assign = useCallback((base: number) => {
    const lst = listRef.current;
    const nn = lst.length;
    const pool = slots.current;
    const N = pool.length;
    if (!nn || !N) return;
    const K = (N - 1) / 2;
    for (let k = base - K; k <= base + K; k++) {
      const sl = pool[mod(k, N)];
      if (sl.k === k) continue;
      sl.k = k;
      const it = lst[mod(k, nn)];
      setSlotPics(sl, backOf(it), frontOf(it));
    }
    // sljedeći koji ulaze na stražnju točku (s obje strane) — tek kad su učitani svi na prstenu
    if (S.current.load < 2) return;
    // ulaze na stražnjoj točki → vidi se prednja (umanjena) fotografija; leđa se učitaju tek kad dres dođe do bočnog kraja
    for (let d = 1; d <= 2; d++)
      for (const k of [base - K - d, base + K + d]) preload(rearUrl(frontOf(lst[mod(k, nn)])));
  }, []);

  /* ---------- crtanje kadra ---------- */
  const tmp = useRef<Path1>({ hx: 0, hy: 0, ppm: 0, facing: 1, depth: 0, light: 1 });
  const order = useRef<Slot[]>([]);

  const onFaceReady = useCallback(() => kickRef.current(), []);
  const apply = useCallback(() => {
    const L = layoutRef.current;
    const P = plateRef.current;
    if (!L || !P) return;
    const { F, v } = L;
    const st = S.current;
    const sp = spacingOf(v, P);
    const half = RING_N[v] / 2;
    const rd = reflData.current;
    st.fading = false;
    let nearPending = 0;

    for (const r of slots.current) {
      if (!r.el || Number.isNaN(r.k)) continue;
      const u = st.pos - r.k;
      const au = Math.abs(u);
      const f0 = r.faces[0];
      if (au > half + 0.5 || !f0.src) {
        if (r.c.o !== "0") r.el.style.opacity = r.c.o = "0";
        if (r.refl && r.c.rd !== "none") r.refl.style.display = r.c.rd = "none";
        if (r.cs && r.c.co !== "0") r.cs.style.opacity = r.c.co = "0";
        r.box = null;
        r.dep = Number.NaN;
        continue;
      }
      const s = u * sp;
      const p = samplePath(P, s, tmp.current);
      const dm = Math.abs(s);
      const rear = p.facing < 0;
      // strana: leđa sprijeda, prednja fotografija straga (okret na bočnom kraju, facing = 0)
      if (rear !== r.rear || f0.on === r.faces[1].on) {
        r.rear = rear;
        const fi = rear && r.faces[1].src ? 1 : 0;
        for (let j = 0; j < 2; j++) {
          const f = r.faces[j];
          const on = j === fi;
          if (on !== f.on) {
            f.on = on;
            if (f.pic) f.pic.style.opacity = on ? "1" : "0";
          }
        }
      }
      const face = r.faces[1].on ? r.faces[1] : f0;
      // lijeno učitavanje: prvo fokus ± NEAR (leđa), zatim sve (prednja strana tek kad se dres približi stražnjem luku)
      const near = au <= NEAR;
      if (st.load >= 2 || (st.load >= 1 && near)) {
        if (p.facing > -0.35) loadFace(f0, onFaceReady);
        if (p.facing < 0.35) loadFace(r.faces[1], onFaceReady, true);
      }
      if (near && st.load === 1 && !face.ok) nearPending++;
      // ravna fotografija, kuka na cijevi; veličina = perspektiva puta × fokus; na bočnim krajevima suženje po širini (okret)
      const sc = p.ppm * F.s * M_PX * focusScale(v, dm);
      const af = Math.abs(p.facing);
      const sx = sc * (TURN_MIN + (1 - TURN_MIN) * Math.sqrt(af));
      const X = F.dx + p.hx * F.s;
      const Y = F.dy + p.hy * F.s;
      const t = `translate3d(${X.toFixed(2)}px,${Y.toFixed(2)}px,0) scale(${sx.toFixed(4)},${sc.toFixed(4)})`;
      if (t !== r.c.t) r.el.style.transform = r.c.t = t;

      // svjetlina: sprijeda pad od fokusa × osvjetljenje puta; straga stropne ploče (mjereno) × BACK_B; bijeli dresovi izvan fokusa prigušeni
      const fo = falloff(dm);
      let b = Math.min(1, fo * (0.6 + 0.4 * Math.sqrt(Math.max(0, Math.min(1, p.light)))) * (1 - ((1 - SIDE_DIM[v]) * (1 - fo)) / 0.4));
      if (p.facing < 0.2) b = Math.max(b, BACK_B[v] * (0.7 + 0.3 * Math.min(1, p.light / 0.5)) * smooth(0.2, -0.5, p.facing));
      if (r.white) b *= 1 - (1 - WHITE_DIM) * smooth(0.05, 0.5, dm);
      // nikad točno 0 (0.001 crne, nevidljivo): s 0 Chrome sjenu dresa u fokusu broji kao novi, velik LCP element tek kad
      // dres napusti fokus — auto-okret nakon 3 s → LCP 3.7–4.1 s na računalu (A/B izmjereno); s 0.001 najkasnije ~1.7 s
      const ha = Math.max(0.001, 1 - b).toFixed(3);
      if (ha !== face.ha) {
        face.ha = ha;
        if (face.sd) face.sd.style.opacity = ha;
      }

      // prvi prikaz dekodirane slike: kratko pretapanje (na bočnom kraju, gdje je dres ionako skriven, odmah)
      if (face.ok && face.fa < 1) {
        face.fa = skipRef.current || af < TURN_FADE[1] ? 1 : Math.min(1, face.fa + st.dt / FADE_IN);
        if (face.fa < 1) st.fading = true;
      }
      // okret na bočnom kraju + pretapanje na stražnjoj točki (izlazi jedan, ulazi sljedeći — iza dresa u fokusu)
      const op = (face.ok ? face.fa : 0) * smooth(TURN_FADE[0], TURN_FADE[1], af) * smooth(half + 0.5, half - 0.5, au);
      const o = op.toFixed(3);
      if (o !== r.c.o) r.el.style.opacity = r.c.o = o;
      r.dep = p.depth;

      // okvir za dodir
      const pa = flatOf(face.src);
      r.box = op > 0.05 ? { left: X - pa[3] * sx, top: Y - pa[4] * sc, width: pa[1] * sx, height: pa[2] * sc } : null;

      // odraz na poliranom kamenu (ista slika zrcaljena preko linije ispod dresa) + kontaktna sjena
      if (r.refl) {
        const hemP = p.hy + 0.88 * p.ppm * focusScale(v, dm);
        const floorY = hemP + (p.hy + P.railZ * p.ppm - hemP) * REFL_AXIS[v];
        const Ya = F.dy + floorY * F.s;
        let show = Ya < F.dy + F.plateH - 4 && Ya < L.H && op > 0.01 && face.ok;
        let ra = 0;
        if (show && rd) {
          const mx = Math.round((p.hx / P.size[0]) * rd.w);
          const my = Math.round((Math.min(P.size[1] - 1, floorY + 0.12 * p.ppm) / P.size[1]) * rd.h);
          ra = mx >= 0 && mx < rd.w && my >= 0 && my < rd.h ? rd.a[(my * rd.w + mx) * 4 + 3] / 255 : 0;
          show = ra > 0.02;
        } else show = false;
        const disp = show ? "block" : "none";
        if (disp !== r.c.rd) r.refl.style.display = r.c.rd = disp;
        if (show) {
          setReflPic(r, face === r.faces[1] ? rearUrl(face.src) : face.src);
          const rz = rear ? "8" : "9";
          if (rz !== r.c.rz) r.refl.style.zIndex = r.c.rz = rz;
          const rt = `translate3d(${X.toFixed(2)}px,${(2 * Ya - Y).toFixed(2)}px,0) scale(${sx.toFixed(4)},${(-sc).toFixed(4)})`;
          if (rt !== r.c.rt) r.refl.style.transform = r.c.rt = rt;
          const ro = Math.min(0.5, (phoneRef.current ? 0.5 : 0.42) * b * (0.3 + 0.7 * ra) * op).toFixed(3);
          if (ro !== r.c.ro) r.refl.style.opacity = r.c.ro = ro;
        }
        if (r.cs) {
          const on = Ya < L.H;
          if (on) {
            const ww = 0.62 * p.ppm * F.s * (sx / sc);
            const ct = `translate3d(${(X - ww / 2).toFixed(2)}px,${(Ya - ww * 0.07).toFixed(2)}px,0) scale(${(ww / 100).toFixed(4)},${((0.62 * p.ppm * F.s) / 100).toFixed(4)})`;
            if (ct !== r.c.ct) r.cs.style.transform = r.c.ct = ct;
          }
          const co = on ? (0.5 * op * (0.4 + 0.6 * b)).toFixed(3) : "0";
          if (co !== r.c.co) r.cs.style.opacity = r.c.co = co;
        }
      }
    }

    if (st.load === 1 && nearPending === 0) promoteRef.current();

    // poredak po dubini (dalji prvi; z se piše samo kad se rang promijeni). Slojevi: stražnji luk (100+) → stražnja polovica
    // prstena (occlBack, 500) → prednja polovica (occl, 600) → prednji luk (700+, kuka preko cijevi)
    {
      const vis = order.current;
      vis.length = 0;
      for (const r of slots.current) if (r.el && r.c.o !== "0" && !Number.isNaN(r.dep)) vis.push(r);
      vis.sort((a, b) => b.dep - a.dep);
      for (let i = 0; i < vis.length; i++) {
        const r = vis[i];
        const z = String((r.rear ? 100 : 700) + i);
        if (z !== r.c.z && r.el) r.el.style.zIndex = r.c.z = z;
      }
    }

    // ambijentalno svjetlo: trenutni i sljedeći dres, pretapanje po razlomku položaja (samo opacity)
    {
      const lst = listRef.current;
      const nn = lst.length;
      const k0 = Math.floor(st.pos);
      const w1 = smooth(0.15, 0.85, st.pos - k0);
      const ring = amb.current;
      for (let j = 0; j < 3; j++) {
        const ly = ring[j];
        if (!ly.el) continue;
        const k = j === mod(k0, 3) ? k0 : j === mod(k0 + 1, 3) ? k0 + 1 : Number.NaN;
        if (!Number.isNaN(k) && k !== ly.k && nn) {
          ly.k = k;
          const src = backOf(lst[mod(k, nn)]);
          ly.el.style.background = ambBg(v, P, "wall", src);
          if (ly.fl) ly.fl.style.background = ambBg(v, P, "floor", src);
        }
        const o = Number.isNaN(k) ? "0" : (st.ia * (k === k0 ? 1 - w1 : w1)).toFixed(3);
        if (o !== ly.o) {
          ly.o = o;
          ly.el.style.opacity = o;
          if (ly.fl) ly.fl.style.opacity = o;
        }
      }
    }

    // neon odsjaj: prati kuku dresa najbližeg fokusu po prstenu (samo transform/opacity); tijekom prijelaza se stiša,
    // pa na pola puta (kad fokus preuzme sljedeći dres) preskoči na njegovu kuku bez vidljivog skoka
    {
      const g = glintRef.current;
      const el = glintEl.current;
      if (g && el) {
        const u0 = st.pos - Math.round(st.pos);
        const q = samplePath(P, u0 * sp, tmp.current);
        const t = `translate3d(${((q.hx - g.hx) * F.s).toFixed(2)}px,${((q.hy - g.hy) * F.s).toFixed(2)}px,0)`;
        const c = glintC.current;
        if (t !== c.t) el.style.transform = c.t = t;
        const o = (st.ia * (1 - 0.85 * smooth(0.08, 0.45, Math.abs(u0)))).toFixed(3);
        if (o !== c.o) el.style.opacity = c.o = o;
      }
    }
  }, [onFaceReady]);

  /** aktivni dres: bazen, prezime, javljanje EHomeu */
  const sync = useCallback(
    (settled: boolean) => {
      const st = S.current;
      const nn = listRef.current.length;
      const b = Math.round(st.pos);
      if (b !== st.base) {
        st.base = b;
        assign(b);
      }
      const ai = nn ? mod(b, nn) : 0;
      if (ai !== st.active) st.active = ai;
      if (st.sent !== st.active) {
        const now = performance.now();
        if (settled || (now - st.sendT > 220 && Math.abs(st.vel) < 1.6)) {
          st.sent = st.active;
          st.sendT = now;
          const a = st.active;
          startTransition(() => cbs.current.onActive(a));
        }
      }
    },
    [assign]
  );

  /* ---------- petlja ---------- */
  const kick = useCallback(() => {
    const st = S.current;
    if (st.raf) return;
    if (st.off) {
      st.pending = true;
      return;
    }
    st.t = performance.now();
    if (!st.moving) {
      st.moving = true;
      rootRef.current?.setAttribute("data-moving", "");
    }
    const tick = (now: number) => {
      // sve po stvarnom vremenu (dt) → isto ponašanje na 60 / 120 / 144 Hz
      const dt = Math.min(0.05, Math.max(0.001, (now - st.t) / 1000));
      st.t = now;
      st.dt = dt;
      if (st.tw && !st.drag) {
        // auto-okret: jedan dres, ease-in-out po vremenu
        const tw = st.tw;
        if (Number.isNaN(tw.t0)) tw.t0 = now;
        const k = Math.min(1, (now - tw.t0) / 1000 / (st.reduced ? 0.001 : AUTO.move));
        const np = tw.from + (tw.to - tw.from) * easeInOut(k);
        st.vel = (np - st.pos) / dt;
        st.pos = np;
        if (k >= 1) {
          st.pos = tw.to;
          st.vel = 0;
          st.tw = null;
          autoRef.current(AUTO.dwell);
        }
      } else if (st.drag) {
        const mv = (st.pos - st.prevPos) / dt;
        st.vel += (mv - st.vel) * Math.min(1, dt / 0.03);
      } else if (st.target !== null) {
        if (st.reduced) {
          st.pos = st.target;
          st.vel = 0;
        } else {
          const a = 46 * (st.target - st.pos) - 12.4 * st.vel;
          st.vel += a * dt;
          st.pos += st.vel * dt;
        }
        if (Math.abs(st.target - st.pos) < 8e-4 && Math.abs(st.vel) < 4e-3) {
          st.pos = st.target;
          st.vel = 0;
          st.target = null;
        }
      }
      st.prevPos = st.pos;
      // uvod: dresovi i svjetlo se pretope nakon ploče
      if (st.iaOn && st.ia < 1) st.ia = st.reduced ? 1 : Math.min(1, st.ia + dt / 1.1);

      const railStill = !st.drag && st.target === null && !st.tw && Math.abs(st.vel) < 1e-3;
      // brojač / cijena / gumb se tijekom auto-okreta promijene čim dres prijeđe sredinu
      sync(railStill || st.tw !== null);
      apply();
      st.dt = 0;
      const rest = railStill && !st.fading && (!st.iaOn || st.ia >= 1);

      if (st.off && !st.drag) {
        st.raf = 0;
        st.pending = true;
        st.moving = false;
        rootRef.current?.removeAttribute("data-moving");
        return;
      }
      if (rest) {
        st.raf = 0;
        st.moving = false;
        rootRef.current?.removeAttribute("data-moving");
        sync(true);
        return;
      }
      st.raf = requestAnimationFrame(tick);
    };
    st.raf = requestAnimationFrame(tick);
  }, [apply, sync]);
  kickRef.current = kick;

  /* ---------- auto-okret ---------- */
  const autoSchedule = useCallback(
    (ms: number) => {
      const st = S.current;
      window.clearTimeout(st.autoT);
      st.autoT = 0;
      if (!AUTO.on || st.reduced || !st.autoOn || st.off || st.hidden || listRef.current.length < 2) return;
      // nikad prije AUTO.idle od zadnje interakcije (i nakon povratka scene na ekran / vidljive kartice)
      ms = Math.max(ms, AUTO.idle - (performance.now() - st.lastInteract));
      st.autoT = window.setTimeout(() => {
        st.autoT = 0;
        if (st.off || st.hidden) return;
        if (st.drag || st.target !== null || st.tw) {
          autoRef.current(AUTO.dwell);
          return;
        }
        st.tw = { from: st.pos, to: Math.round(st.pos) + 1, t0: Number.NaN };
        st.autoMoved = true;
        kick();
      }, ms);
    },
    [kick]
  );
  autoRef.current = autoSchedule;

  /** zaustavi auto-okret (pomak u tijeku glatko sjedne na najbliži dres u smjeru kretanja) */
  const haltTween = useCallback(() => {
    const st = S.current;
    if (!st.tw) return;
    st.tw = null;
    st.target = Math.round(st.pos + st.vel * 0.12);
    kick();
  }, [kick]);

  /** svaka interakcija: auto-okret odmah staje, nastavlja tek nakon AUTO.idle bez interakcije */
  const interact = useCallback(() => {
    const st = S.current;
    st.lastInteract = performance.now();
    st.autoMoved = false;
    haltTween();
    autoSchedule(AUTO.idle);
  }, [haltTween, autoSchedule]);
  const interactRef = useRef(interact);
  interactRef.current = interact;

  /** dresovi izvan fokusa ± NEAR: tek nakon load događaja + besposlenosti (fokus je već dekodiran) */
  const promote = useCallback(() => {
    const st = S.current;
    if (st.load >= 2 || st.promoting) return;
    st.promoting = true;
    if (!st.autoOn) {
      st.autoOn = true;
      autoSchedule(Math.max(AUTO.first, AUTO.idle - (performance.now() - st.lastInteract)));
    }
    const go = () => {
      st.load = 2;
      if (!Number.isNaN(st.base)) assign(st.base);
      kick();
    };
    const idle = () => {
      const w = window as Window & { requestIdleCallback?: (cb: () => void, o?: { timeout: number }) => number };
      if (w.requestIdleCallback) w.requestIdleCallback(go, { timeout: 1500 });
      else window.setTimeout(go, 200);
    };
    if (document.readyState === "complete") idle();
    else window.addEventListener("load", idle, { once: true });
  }, [assign, kick, autoSchedule]);
  promoteRef.current = promote;

  useEffect(() => {
    const st = S.current;
    st.reduced = prefersReduced();
    return () => {
      cancelAnimationFrame(st.raf);
      st.raf = 0;
      window.clearTimeout(st.autoT);
      window.clearTimeout(st.loadT);
      st.autoT = 0;
    };
  }, []);

  /* interakcija bilo gdje u sekciji heroja (scena, strelice, skala, natpis, gumb) i tipkovnica; skrivena kartica = pauza */
  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const sec: HTMLElement = root.closest("section") ?? root;
    const on = () => interactRef.current();
    let last = 0;
    const onMove = (e: PointerEvent) => {
      if (e.pointerType !== "mouse") return;
      const t = performance.now();
      if (t - last < 250) return;
      last = t;
      on();
    };
    const onVis = () => {
      const st = S.current;
      st.hidden = document.visibilityState === "hidden";
      if (st.hidden) {
        window.clearTimeout(st.autoT);
        st.autoT = 0;
        haltTween();
      } else autoRef.current(AUTO.dwell);
    };
    const cap = { capture: true, passive: true } as const;
    sec.addEventListener("pointerdown", on, cap);
    sec.addEventListener("touchstart", on, cap);
    sec.addEventListener("wheel", on, cap);
    sec.addEventListener("focusin", on);
    sec.addEventListener("pointermove", onMove, { passive: true });
    window.addEventListener("keydown", on);
    document.addEventListener("visibilitychange", onVis);
    return () => {
      sec.removeEventListener("pointerdown", on, cap);
      sec.removeEventListener("touchstart", on, cap);
      sec.removeEventListener("wheel", on, cap);
      sec.removeEventListener("focusin", on);
      sec.removeEventListener("pointermove", onMove);
      window.removeEventListener("keydown", on);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, [haltTween]);

  useEffect(() => {
    const root = rootRef.current;
    if (!root || typeof IntersectionObserver === "undefined") return;
    const io = new IntersectionObserver(
      ([e]) => {
        const st = S.current;
        const off = !e.isIntersecting;
        if (off === st.off) return;
        if (off) {
          // izvan ekrana: auto-okret stoji (pomak u tijeku sjedne kad se scena vrati)
          window.clearTimeout(st.autoT);
          st.autoT = 0;
          if (st.tw) {
            st.tw = null;
            st.target = Math.round(st.pos + 0.5);
          }
        }
        st.off = off;
        if (!off && st.pending) {
          st.pending = false;
          kick();
        }
        if (!off) autoRef.current(AUTO.dwell);
      },
      { threshold: 0 }
    );
    io.observe(root);
    return () => io.disconnect();
  }, [kick]);

  useLayoutEffect(() => {
    if (!layout || !P) return;
    const st = S.current;
    st.base = Number.NaN;
    for (const s of slots.current) {
      s.k = Number.NaN;
      s.faces[0].src = s.faces[1].src = "";
      s.faces[0].on = s.faces[1].on = false;
      s.faces[0].ha = s.faces[1].ha = "";
      s.reflSrc = "";
    }
    for (const a of amb.current) a.k = Number.NaN;
    glintC.current = { t: "", o: "" };
    sync(true);
    apply();
  }, [layout, P, apply, sync]);

  /* ---------- ploča (SSR, odmah vidljiva) učitana → scena spremna; dresovi se pretope kad stigne put prstena ---------- */
  const onPlate = useCallback(() => {
    const img = plateImg.current;
    const done = () => {
      setReady(true);
      onFirstFrame();
    };
    if (img?.decode) img.decode().then(done, done);
    else done();
  }, [onFirstFrame]);
  useEffect(() => {
    if (plateImg.current?.complete && plateImg.current.naturalWidth) onPlate();
  }, [onPlate]);
  useEffect(() => {
    const st = S.current;
    if (!ready || !P || st.iaOn) return;
    st.iaOn = true;
    st.load = 1;
    kick();
    // ako se fokus ne dekodira (spora mreža), ostali ipak krenu
    st.loadT = window.setTimeout(() => promoteRef.current(), 4000);
  }, [ready, P, kick]);

  /* ---------- upravljanje ---------- */
  const goTarget = useCallback(
    (t: number) => {
      const st = S.current;
      st.target = t;
      kick();
    },
    [kick]
  );

  useEffect(() => {
    control.current = {
      goBy: (dir: number) => {
        interactRef.current();
        const st = S.current;
        goTarget((st.target ?? Math.round(st.pos)) + dir);
      },
      goTo: (i: number) => {
        interactRef.current();
        const st = S.current;
        const nn = listRef.current.length;
        if (!nn) return;
        const cur = st.target ?? Math.round(st.pos);
        let d = mod(i - mod(cur, nn), nn);
        if (d > nn / 2) d -= nn;
        goTarget(cur + d);
      },
      rect: (i: number) => {
        const root = rootRef.current;
        const st = S.current;
        const nn = listRef.current.length;
        if (!root || !nn) return null;
        let best: Slot | null = null;
        for (const sl of slots.current) if (sl.box && !Number.isNaN(sl.k) && mod(sl.k, nn) === i && (!best || Math.abs(sl.k - st.pos) < Math.abs(best.k - st.pos))) best = sl;
        if (!best?.box) return null;
        const rb = root.getBoundingClientRect();
        return new DOMRect(rb.left + best.box.left, rb.top + best.box.top, best.box.width, best.box.height);
      },
      // u ovoj varijanti nema prezimena na zidu
      nameBox: () => null,
      moving: () => S.current.moving || S.current.drag,
      autoplay: () => S.current.autoMoved,
      interact: () => interactRef.current(),
      railY: () => {
        const root = rootRef.current;
        const L = layoutRef.current;
        if (!root || !L) return null;
        return root.getBoundingClientRect().top + L.F.dy + L.M.focus.hook[1] * L.F.s;
      },
    } satisfies EStoreControl;
    return () => {
      control.current = null;
    };
  }, [control, goTarget]);

  /* povlačenje / dodir */
  const ptr = useRef<{ id: number; x: number; y: number; t: number; pos: number; dragging: boolean } | null>(null);
  const onDown = (e: RPointerEvent<HTMLDivElement>) => {
    interactRef.current();
    if (e.button !== 0 && e.pointerType === "mouse") return;
    ptr.current = { id: e.pointerId, x: e.clientX, y: e.clientY, t: performance.now(), pos: S.current.pos, dragging: false };
  };
  const onMove = (e: RPointerEvent<HTMLDivElement>) => {
    const p = ptr.current;
    const L = layoutRef.current;
    if (!p || p.id !== e.pointerId || !L) return;
    const dx = e.clientX - p.x;
    const dy = e.clientY - p.y;
    if (!p.dragging) {
      if (Math.abs(dx) < 7 || Math.abs(dx) < Math.abs(dy) * 1.1) {
        if (Math.abs(dy) > 10) ptr.current = null;
        return;
      }
      p.dragging = true;
      p.x = e.clientX;
      p.pos = S.current.pos;
      try {
        e.currentTarget.setPointerCapture(e.pointerId);
      } catch {
        /* sintetski događaj */
      }
      const st = S.current;
      st.drag = true;
      st.target = null;
      rootRef.current?.setAttribute("data-drag", "");
      kick();
      return;
    }
    S.current.pos = p.pos + (e.clientX - p.x) / L.F.pxPerItem;
  };
  const release = (e: RPointerEvent<HTMLDivElement>, cancel: boolean) => {
    const p = ptr.current;
    if (!p || p.id !== e.pointerId) return;
    ptr.current = null;
    // 8 s mirovanja se broji od kraja povlačenja
    interactRef.current();
    const st = S.current;
    if (p.dragging) {
      st.drag = false;
      rootRef.current?.removeAttribute("data-drag");
      const proj = st.pos + st.vel * 0.3;
      goTarget(Math.round(Math.max(st.pos - 10, Math.min(st.pos + 10, proj))));
      return;
    }
    if (cancel || performance.now() - p.t > 450) return;
    const root = rootRef.current;
    if (!root) return;
    const rb = root.getBoundingClientRect();
    const x = e.clientX - rb.left;
    const y = e.clientY - rb.top;
    let hit: Slot | null = null;
    for (const sl of slots.current) {
      const r = sl.box;
      if (!r || x < r.left || x > r.left + r.width || y < r.top || y > r.top + r.height) continue;
      // najviši sloj (prednji luk iznad stražnjeg, bliži iznad daljeg)
      if (!hit || Number(sl.c.z) > Number(hit.c.z)) hit = sl;
    }
    if (!hit) return;
    const nn = listRef.current.length;
    if (Math.abs(hit.k - st.pos) < 0.5) {
      const it = listRef.current[mod(hit.k, nn)];
      if (it) cbs.current.onOpenItem(it.slug);
    } else goTarget(hit.k);
  };

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const onWheel = (e: WheelEvent) => {
      const L = layoutRef.current;
      if (!L || Math.abs(e.deltaX) <= Math.abs(e.deltaY) * 1.2) return;
      e.preventDefault();
      const st = S.current;
      const unit = e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? 400 : 1;
      st.target = null;
      st.drag = true;
      st.pos -= (e.deltaX * unit) / L.F.pxPerItem;
      kick();
      window.clearTimeout(st.wheelT);
      st.wheelT = window.setTimeout(() => {
        st.drag = false;
        goTarget(Math.round(st.pos + st.vel * 0.18));
      }, 110);
    };
    root.addEventListener("wheel", onWheel, { passive: false });
    return () => root.removeEventListener("wheel", onWheel);
  }, [kick, goTarget]);

  /* ---------- prikaz ---------- */
  const L = layout;
  const pool = L && P ? POOL[L.v] : 0;
  if (slots.current.length !== pool) slots.current = Array.from({ length: pool }, newSlot);
  // kadar ploče: JS (px) kad je izmjeren; prije toga (SSR, prije hidracije) CSS .ov-f (iste formule) → bez skoka
  const box: CSSProperties | undefined = L ? { left: L.F.dx, top: L.F.dy, width: L.F.plateW, height: L.F.plateH } : undefined;
  const am = P ? `url(${P.files.amb})` : "";
  const D = OVAL_META.desktop;
  const Mo = OVAL_META.mobile;
  const dPlate = cables ? D.plateCables : D.plate;
  const mPlate = cables ? Mo.plateCables : Mo.plate;
  const ms = !cables ? Mo.plateSmall : null;
  const mAvif = ms ? `${ms.avif} ${ms.w}w, ${mPlate[0]} ${Mo.size[0]}w` : mPlate[0];
  const mWebp = ms ? `${ms.webp} ${ms.w}w, ${mPlate[1]} ${Mo.size[0]}w` : mPlate[1];
  const floorBox: CSSProperties | null = L && P ? { left: L.F.dx, top: L.F.dy + P.floorY * L.F.s, width: L.F.plateW, height: (P.size[1] - P.floorY) * L.F.s } : null;
  const css = useMemo(() => OVAL_CSS + frameCss(ssrFrame), [ssrFrame]);
  const glint = useMemo(() => (L && P ? glintOf(P, L.F, L.v) : null), [L, P]);
  glintRef.current = glint;

  return (
    <div
      ref={rootRef}
      className="ov"
      data-phone={desk ? undefined : ""}
      data-ready={ready ? "" : undefined}
      onPointerDown={onDown}
      onPointerMove={onMove}
      onPointerUp={(e) => release(e, false)}
      onPointerCancel={(e) => release(e, true)}
      onDragStart={(e) => e.preventDefault()}
    >
      <style dangerouslySetInnerHTML={{ __html: css }} />
      {/* LCP: ploča odmah u <head> (React podiže <link>), po istom media queryju kao <picture> — preuzima se samo jedna */}
      {!cables ? (
        <>
          <link rel="preload" as="image" type="image/avif" href={D.plate[0]} media={OVAL_DESK_MQ} fetchPriority="high" />
          <link rel="preload" as="image" type="image/avif" href={ms ? ms.avif : Mo.plate[0]} imageSrcSet={mAvif} imageSizes="100vw" media={OVAL_MOB_MQ} fetchPriority="high" />
        </>
      ) : null}
      {/* 1 ploča — u SSR HTML-u, vidljiva od prvog iscrtavanja (bez čekanja JS-a i bez uvoda); decoding=sync: ako je
          slika stigla prije prvog iscrtavanja, ulazi u isti kadar (LCP = FCP), umjesto kadar kasnije */}
      <div className="ov-l ov-plate ov-f" style={box}>
        <picture key={cables ? "c" : "p"}>
          <source media={OVAL_DESK_MQ} type="image/avif" srcSet={dPlate[0]} />
          <source media={OVAL_DESK_MQ} type="image/webp" srcSet={dPlate[1]} />
          <source type="image/avif" srcSet={mAvif} sizes="100vw" />
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img ref={plateImg} src={ms ? ms.webp : mPlate[1]} srcSet={mWebp} sizes="100vw" alt="" draggable={false} fetchPriority="high" decoding="sync" onLoad={onPlate} />
        </picture>
      </div>

      {L && P ? (
        <>
          {/* 2 ambijentalno svjetlo: zid (amb maska = zid × svjetlina zida iz ploče) i pod (pojas ispod linije poda) — ispod svih dresova */}
          <div aria-hidden className="ov-l ov-amb" style={{ ...box, WebkitMaskImage: am, maskImage: am }}>
            {amb.current.map((a, j) => (
              <i
                key={j}
                ref={(el) => {
                  a.el = el;
                }}
              />
            ))}
          </div>
          {floorBox ? (
            <div aria-hidden className="ov-l ov-amb" style={floorBox}>
              {amb.current.map((a, j) => (
                <i
                  key={j}
                  ref={(el) => {
                    a.fl = el;
                  }}
                />
              ))}
            </div>
          ) : null}

          {/* 3 stražnja polovica prstena: preko kuka dresova stražnjeg luka (kuka viđena straga) */}
          <div className="ov-l ov-occl ov-occlb" style={box}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={P.files.occlBack} alt="" draggable={false} decoding="async" />
          </div>
          {/* 4 prednja polovica prstena: preko stražnjeg luka, ispod dresova prednjeg luka (kuka preko cijevi) */}
          <div className="ov-l ov-occl" style={box}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={P.files.occl} alt="" draggable={false} decoding="async" />
          </div>

          {/* 4b neon: odsjaj limete na vrhu cijevi iznad dresa u fokusu (iznad prstena, ispod kuka prednjeg luka) */}
          {glint ? (
            <svg
              ref={glintEl}
              aria-hidden
              className="ov-gl"
              data-v={L.v}
              width={glint.w}
              height={glint.h}
              viewBox={`0 0 ${glint.w.toFixed(1)} ${glint.h.toFixed(1)}`}
              style={{ left: glint.left, top: glint.top }}
            >
              <defs>
                <linearGradient id={`ov-gl-${L.v}`} gradientUnits="userSpaceOnUse" x1={glint.x0} y1="0" x2={glint.x1} y2="0">
                  <stop offset="0" stopColor="#e8ff3c" stopOpacity="0" />
                  <stop offset=".35" stopColor="#e8ff3c" stopOpacity={L.v === "desktop" ? 1 : 0.95} />
                  <stop offset=".65" stopColor="#e8ff3c" stopOpacity={L.v === "desktop" ? 1 : 0.95} />
                  <stop offset="1" stopColor="#e8ff3c" stopOpacity="0" />
                </linearGradient>
              </defs>
              <path d={glint.d} fill="none" stroke={`url(#ov-gl-${L.v})`} strokeWidth={GLINT[L.v].w} strokeLinecap="round" />
            </svg>
          ) : null}

          {/* 5 dresovi (stalni bazen; slike postavlja assign) + odrazi + kontaktne sjene */}
          {slots.current.map((sl, j) => (
            <div key={`${L.v}${j}`} style={{ display: "contents" }}>
              <div
                ref={(el) => {
                  sl.el = el;
                }}
                aria-hidden
                className="ov-j"
              >
                {sl.faces.map((f, fi) => (
                  <div
                    key={fi}
                    ref={(el) => {
                      f.pic = el;
                    }}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      ref={(el) => {
                        f.img = el;
                      }}
                      alt=""
                      draggable={false}
                      decoding="async"
                    />
                    <i
                      ref={(el) => {
                        f.sd = el;
                      }}
                      className="ov-sd"
                    />
                  </div>
                ))}
              </div>
              <i
                ref={(el) => {
                  sl.cs = el;
                }}
                aria-hidden
                className="ov-cs"
                style={{ width: 100, height: 14 }}
              />
              <div
                ref={(el) => {
                  sl.refl = el;
                }}
                aria-hidden
                className="ov-r"
              >
                <div
                  ref={(el) => {
                    sl.reflBox = el;
                  }}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    ref={(el) => {
                      sl.reflImg = el;
                    }}
                    alt=""
                    draggable={false}
                    decoding="async"
                  />
                </div>
              </div>
            </div>
          ))}
        </>
      ) : null}
    </div>
  );
});
