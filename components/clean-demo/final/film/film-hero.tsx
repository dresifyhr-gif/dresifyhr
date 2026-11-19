"use client";

import { memo, startTransition, useCallback, useEffect, useLayoutEffect, useRef, useState, type CSSProperties, type MutableRefObject, type PointerEvent as RPointerEvent } from "react";

import { AMB_GREY, AMB_WHITE, HANGER_COLORS } from "@/lib/data/hanger-colors";
import { HANGER_HOOKS } from "@/lib/data/hanger-hooks";
import type { OrmarRailItem } from "@/lib/data/ormar-items";

import type { EStoreControl } from "../e-store-3d";
import { FILM, type FilmPlate } from "./film-data";
import { ZID } from "./film-zid";
import {
  FRAME_ASPECT,
  HOOK_FR,
  IMG_ASPECT_FALLBACK,
  falloff,
  focusScale,
  mod,
  samplePath,
  smooth,
  solveFrame,
  type Frame,
  type PathSample,
} from "./film-math";

/* ------------------------------------------------------------------ */
/*  FILM HERO (2.5D). Slojevi odozdo:                                   */
/*   1 ploča (Blender Cycles, AVIF/WebP) · 2 sjene iza zida             */
/*   3 dresovi iza zida (u sobama, kroz otvore) · 4 zid (occl maska)    */
/*   5 obrisano prezime · 6 sjene ispred zida · 7 odraz · 8 dresovi     */
/*   ispred zida · 9 uvodni film (jednom po sesiji).                    */
/*  Dres = prava fotografija na vješalici (bez deformacije, bez zamućenja*/
/*  i bez ikakvog zakreta): vrh kuke (izmjeren iz alfe, hanger-hooks)  */
/*  sjedi točno na gornjem rubu šipke (točka kuke s puta u plate.json). */
/*  Stalni bazen DOM čvorova (bez montiranja tijekom kretanja); kadar   */
/*  mijenja samo transform/opacity/filter na GPU slojevima.             */
/* ------------------------------------------------------------------ */

type Variant = "desktop" | "mobile";
type Layout = { v: Variant; P: FilmPlate; F: Frame; W: number; H: number };

const INTRO_KEY = "film-intro-seen";
/** prosječna alfa sjene dresa (.fh-sd gradijenti u film-css) → opacity = (1 − svjetlina) / SHADE_A */
const SHADE_A = 0.86;
const backOf = (it: OrmarRailItem | undefined) => (it && it.img.kind === "dres" ? it.img.back : it && it.img.kind === "trenirka" ? it.img.jakna : "");

/** ?zid=sada|tiho|bez — varijante DRESIFY natpisa na zidu (za usporedbu; zadano "sada" = bez promjene).
    tiho: natpis se upali u uvodu kao i sada, a čim korisnik krene listati (ili ~2.5 s nakon uvoda) polako
    se priguši u tihi tamni obris (bez limete) — pretapanje unaprijed izračunatih slojeva, samo opacity.
    bez: zid bez natpisa (Cycles render iste scene bez natpisa i njegova svjetla), bez uvodnog filma natpisa.
    Čita se iz window.location u efektu → statično/SSR iscrtavanje stranice ostaje isto. */
export type Zid = "sada" | "tiho" | "bez";
function zidParam(): Zid {
  try {
    const z = new URLSearchParams(window.location.search).get("zid");
    return z === "tiho" || z === "bez" ? z : "sada";
  } catch {
    return "sada";
  }
}
/** tiho: koliko nakon kraja uvoda se natpis sam priguši ako korisnik ne lista (bez uvoda — povratnik — dulje,
    da se ne doživi kao "nestalo struje" odmah po otvaranju) */
const ZID_DIM_MS = 2500;
const ZID_DIM_NOINTRO_MS = 5500;
/** zid=bez: gornji rub pojasa za prezime (udio visine nekadašnjeg natpisa), veličina verzala (0.34 = sada) uz
    gornju granicu ~1.2× prezimena iz "sada" (na računalu bi inače naraslo 2.2×), i na mobitelu pomak prezimena
    gore u prazni zid (udio visine natpisa) da ne sjedi na liniji nadvoja vrata */
const BEZ_TOP = 0.35;
const BEZ_CAP = 0.4;
const BEZ_MAX = 1.2;
const BEZ_UP_MOBILE = 0.28;

/** ?drift=1 polagano samo-kretanje šipke (zadano isključeno); ?drift=20 = 2 dresa/s (test) */
function driftSpeed() {
  try {
    const d = Number(new URLSearchParams(window.location.search).get("drift"));
    return d >= 2 ? d / 10 : d >= 1 ? 0.12 : 0;
  } catch {
    return 0;
  }
}
function prefersReduced() {
  try {
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  } catch {
    return false;
  }
}

/** širina teksta u Bebasu (po px veličine fonta) */
let measureCtx: CanvasRenderingContext2D | null = null;
function textWidthPerPx(text: string, family: string) {
  if (!measureCtx) measureCtx = document.createElement("canvas").getContext("2d");
  if (!measureCtx) return 0.42 * text.length;
  measureCtx.font = `400 100px ${family}`;
  return measureCtx.measureText(text).width / 100 + 0.012 * Math.max(0, text.length - 1);
}

/** Bebas: položaj središta verzala u retku (line-height .8) u em — za točno okomito centriranje prezimena */
let capMid: number | null = null;
function capCenterEm(family: string) {
  if (capMid !== null) return capMid;
  if (!measureCtx) measureCtx = document.createElement("canvas").getContext("2d");
  if (!measureCtx) return 0;
  measureCtx.font = `400 100px ${family}`;
  const m = measureCtx.measureText("H");
  const asc = m.fontBoundingBoxAscent / 100;
  const desc = m.fontBoundingBoxDescent / 100;
  const cap = m.actualBoundingBoxAscent / 100;
  if (!asc || !cap) return 0;
  // vrh retka → osnovna linija = pola razmaka (.8 − (asc+desc)) + asc; središte verzala = osnovna − cap/2
  capMid = (0.8 - (asc + desc)) / 2 + asc - cap / 2 - 0.4;
  return capMid;
}

/* ---------- ambijentalno svjetlo u boji dresa ---------- */
/* Svjetlo pada SAMO na zid i pod oko dresa u fokusu (sloj iznad ploče i zida, ispod dresova ispred
   zida; maska izreže otvore u sobe → dresovi iza zida i fotografije dresova ostaju netaknuti).
   Tri unaprijed obojena sloja (prsten po k mod 3); po kadru se mijenja SAMO njihova opacity
   (pretapanje trenutni ↔ sljedeći dres prema razlomku položaja), gradijent se upiše tek kad
   sloj dobije novi dres (na prijelazu cijelog broja, dok mu je opacity 0). Stapanje screen
   (svjetlo se DODAJE betonu kao pravi obojeni reflektor; overlay je na tamnom betonu gotovo
   nevidljiv) uz nisku jačinu — filmski grade, ne disko. */
const AMB = {
  /** jačina (alfa gradijenta) na zidu i podu — množi se još i statičnom maskom albeda betona (≈0.6–1 oko dresa) */
  wall: 0.3,
  floor: 0.3,
  /** hladno bijelo (bijeli dresovi): skoro puna jačina, inače se na betonu ne vidi; sivo (crni dresovi) tiše */
  white: 0.88,
  grey: 0.45,
  /** druga boja kompleta je naglasak, ne drugi reflektor: slabija i ublažena prema bijelom */
  second: 0.75,
  secondMix: 0.25,
  /** zasićena plava ili crvena kao naglasak se gotovo ne miješa s bijelim (inače na toplom betonu plava ispadne
      lila, a bordo roza — Barcelona) */
  secondMixVivid: 0.06,
};
/** zasićena plava (≈195°–255°) ili crvena/bordo (≈340°–15°)? — za manje ublažavanje drugog svjetla.
    Hladno bijelo / sivo nisu "plavi" iako im je b najveći. */
function isVivid(h: string) {
  if (h === AMB_WHITE || h === AMB_GREY) return false;
  const n = parseInt(h.slice(1), 16);
  const r = (n >> 16) & 255;
  const g = (n >> 8) & 255;
  const b = n & 255;
  const blue = b > r + 40 && b >= g;
  const red = r > g + 110 && r > b + 90;
  return blue || red;
}
const ambCache = new Map<string, string>();
function hexRgb(h: string, mix = 0) {
  const n = parseInt(h.slice(1), 16);
  const c = (v: number) => Math.round(v + (255 - v) * mix);
  return `${c((n >> 16) & 255)},${c((n >> 8) & 255)},${c(n & 255)}`;
}
/** gradijent svjetla (u % ploče) za dres: 1 boja ili 2 (lijevo glavna, desno naglasak) */
function ambBg(v: Variant, src: string) {
  const key = `${v}|${src}`;
  const hit = ambCache.get(key);
  if (hit !== undefined) return hit;
  const cs = HANGER_COLORS[src] ?? [AMB_WHITE];
  const g = (c: string) => (c === AMB_WHITE ? AMB.white : c === AMB_GREY ? AMB.grey : 1);
  const two = cs.length > 1;
  const c1 = cs[0];
  const c2 = cs[1] ?? cs[0];
  const k1 = g(c1);
  const k2 = g(c2) * (two ? AMB.second : 1);
  const m2 = two ? (isVivid(c2) ? AMB.secondMixVivid : AMB.secondMix) : 0;
  const blob = (c: string, mix: number, a: number, rx: number, ry: number, x: number, y: number) => {
    const q = hexRgb(c, mix);
    return `radial-gradient(${rx}% ${ry}% at ${x}% ${y}%,rgba(${q},${a.toFixed(3)}) 0%,rgba(${q},${(a * 0.5).toFixed(3)}) 35%,rgba(${q},${(a * 0.15).toFixed(3)}) 68%,rgba(${q},0) 100%)`;
  };
  const d = v === "desktop";
  const parts = d
    ? [
        // računalo: aureola uz sam dres u fokusu (kao stražnje svjetlo), vrh ispod linije prezimena + bazen na podu
        blob(c1, 0, AMB.wall * k1, 16, 31, 44, 58),
        blob(c2, m2, AMB.wall * k2, 16, 31, 56, 58),
        blob(c1, 0, AMB.floor * k1, 21, 11, 45, 91),
        blob(c2, m2, AMB.floor * k2, 21, 11, 55, 91),
      ]
    : [
        // mobitel: dres prekrije gotovo cijeli zid → svjetlo u pojasu prezimena / šipke i mekani bazen na
        // staklenom podu ispod ruba dresa (vidi se i u odrazu)
        blob(c1, 0, AMB.wall * 1.7 * k1, 46, 16, 28, 36),
        blob(c2, m2, AMB.wall * 1.7 * k2, 46, 16, 72, 36),
        blob(c1, 0, AMB.floor * k1, 40, 10, 36, 70),
        blob(c2, m2, AMB.floor * k2, 40, 10, 64, 70),
      ];
  const out = parts.join(",");
  ambCache.set(key, out);
  return out;
}
/** statična maska svjetla (scripts/film-amb-mask.mjs): albedo betona iz ploče × izrezani otvori u sobe i natpis */
const ambMask = (v: Variant) => `url(/film/amb-${v}.webp)`;
type AmbLayer = { el: HTMLElement | null; k: number; o: string };

/** točka kuke u okviru dresa (px okvira fw × fh; slika object-fit:contain, poravnata gore, centrirana) */
function anchorOf(sl: Slot, fw: number, fh: number) {
  const iw = Math.min(fw, fh * sl.ar);
  return { ax: (fw - iw) / 2 + sl.hx * iw, ay: sl.hy * (iw / sl.ar), iw };
}

type Slot = {
  k: number;
  src: string;
  loaded: boolean;
  el: HTMLDivElement | null;
  sharp: HTMLImageElement | null;
  /** vrh kuke (udio slike) i omjer slike — iz lib/data/hanger-hooks */
  hx: number;
  hy: number;
  ar: number;
  refl: HTMLDivElement | null;
  reflImg: HTMLImageElement | null;
  /** sjena dresa: neutralni crni sloj maskiran točno na siluetu (alfa × crno = množenje
   *  svjetline, bez magle i bez plavog tona) — dubina bez CSS filtera po kadru */
  shade: HTMLElement | null;
  /** meka kontaktna sjena ispod ruba dresa (samo računalo, uz odraz) */
  cs: HTMLElement | null;
  c: { t: string; o: string; z: string; rt: string; ro: string; rd: string; ha: string; hs: string; mk: string; ct: string; co: string };
};
const newSlot = (): Slot => ({
  k: Number.NaN,
  src: "",
  loaded: false,
  el: null,
  sharp: null,
  hx: 0.5,
  hy: HOOK_FR,
  ar: IMG_ASPECT_FALLBACK,
  refl: null,
  reflImg: null,
  shade: null,
  cs: null,
  c: { t: "", o: "", z: "", rt: "", ro: "", rd: "", ha: "", hs: "", mk: "", ct: "", co: "" },
});

export type FilmHeroProps = {
  list: OrmarRailItem[];
  sceneH: number;
  desk: boolean;
  startIndex: number;
  control: MutableRefObject<EStoreControl | null>;
  onActive: (i: number) => void;
  onOpenItem: (slug: string) => void;
  onFirstFrame: () => void;
  surnameOf: (i: number) => string;
  /** povratak sa stranice dresa: bez uvoda i bez ulaska dresova */
  skipIntro: boolean;
  /** gornji rub (ispod navigacije) i najniži dopušteni rub dresa (px od vrha scene) */
  top: number;
  hemLimit: number;
  /** mobitel: dodatni pojas sjajnog poda ispod dresova (px) — ne ulazi u izbor ploče (isti kadar kao prije) */
  floorPad?: number;
};

const POOL = { desktop: 13, mobile: 9 } as const; // 2K+3 (K = 5 / 3)

export const FilmHero = memo(function FilmHero({ list, sceneH, desk, startIndex, control, onActive, onOpenItem, onFirstFrame, surnameOf, skipIntro, top, hemLimit, floorPad = 0 }: FilmHeroProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const plateImg = useRef<HTMLImageElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const shRefs = useRef<(HTMLDivElement | null)[]>([]);
  const nameRefs = useRef<(HTMLSpanElement | null)[]>([null, null]);
  const slots = useRef<Slot[]>([]);
  const amb = useRef<AmbLayer[]>([0, 1, 2].map(() => ({ el: null, k: Number.NaN, o: "" })));
  const reflData = useRef<{ w: number; h: number; a: Uint8ClampedArray } | null>(null);
  const family = useRef("'Bebas Neue', 'Arial Narrow', sans-serif");

  const [layout, setLayout] = useState<Layout | null>(null);
  const [ready, setReady] = useState(false);
  const [intro, setIntro] = useState<"wait" | "load" | "play" | "fade" | "off">(skipIntro ? "off" : "wait");
  const [zid, setZid] = useState<Zid>("sada");
  const zidRef = useRef<Zid>("sada");
  zidRef.current = zid;

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
    iaOn: skipIntro,
    raf: 0,
    t: 0,
    reduced: false,
    drift: 0,
    moving: false,
    /** ulazna vožnja dresova nakon intro filma (svjetlo drži boju ciljanog dresa) */
    entry: false,
    wheelT: 0,
    name: "",
    nameSlot: 0,
    /** scena izvan ekrana: petlja stoji (nastavi se kad se vrati) */
    off: false,
    pending: false,
  });

  // mobitel (ne računalo): sjajni pod, odraz i kontaktna sjena u mobilnoj inačici
  const phoneRef = useRef(!desk);
  phoneRef.current = !desk;
  const layoutRef = useRef<Layout | null>(null);
  layoutRef.current = layout;
  const listRef = useRef(list);
  listRef.current = list;
  const cbs = useRef({ onActive, onOpenItem, surnameOf });
  cbs.current = { onActive, onOpenItem, surnameOf };

  /* ---------- kadar ---------- */
  useLayoutEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const fit = () => {
      const W = root.clientWidth || window.innerWidth;
      const H = root.clientHeight || sceneH;
      const v: Variant = W / Math.max(1, H - floorPad) >= 0.9 ? "desktop" : "mobile";
      const P = FILM[v];
      const F = solveFrame(P, W, H, top, hemLimit);
      setLayout((p) => (p && p.v === v && p.W === W && p.H === H && Math.abs(p.F.s - F.s) < 1e-4 ? p : { v, P, F, W, H }));
    };
    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(root);
    return () => ro.disconnect();
  }, [sceneH, top, hemLimit, desk, floorPad]);

  /* ---------- maska odraza (jačina odraza na mokrom podu) ---------- */
  useEffect(() => {
    if (!layout) return;
    reflData.current = null;
    const img = new Image();
    img.src = layout.P.files.refl;
    let off = false;
    img
      .decode()
      .then(() => {
        if (off) return;
        const c = document.createElement("canvas");
        c.width = img.naturalWidth;
        c.height = img.naturalHeight;
        const x = c.getContext("2d", { willReadFrequently: true });
        if (!x) return;
        x.drawImage(img, 0, 0);
        reflData.current = { w: c.width, h: c.height, a: x.getImageData(0, 0, c.width, c.height).data };
      })
      .catch(() => undefined);
    return () => {
      off = true;
    };
  }, [layout]);

  /* ---------- prezime iza dresa (dva sloja, pretapanje) ---------- */
  const nameGeo = useCallback((nm: string) => {
    const L = layoutRef.current;
    if (!L || !nm) return null;
    const { P, F } = L;
    /* Prezime je projekcija NA ZIDU: verzal ~pola visine DRESIFY slova (ali najviše ~42 % pojasa — na računalu je pojas uzak),
       okomito TOČNO na sredini između donjeg ruba natpisa i gornjeg ruba šipke, vodoravno na sredini
       zida između otvora; širina se prilagodi tako da ni dugo ime ne izađe iz zida (rubovi zida na
       visini imena iz P.portals, uz marginu; i ne šire od natpisa ni ekrana). */
    const [lx0, ly0, lx1, ly1] = P.logo;
    // zid=bez: natpisa nema → prezime se podigne u oslobođeni prostor (pojas počinje na ~trećini visine
    // nekadašnjeg natpisa) i bude malo veće; i dalje tiho (projekcija), ne novi logo
    const bez = zidRef.current === "bez";
    const logoH = (ly1 - ly0) * F.s;
    const top = F.dy + (bez ? ly0 + (ly1 - ly0) * BEZ_TOP : ly1) * F.s;
    const rail = F.dy + P.focus.hook[1] * F.s; // točka kuke u fokusu = gornji rub šipke
    const band = Math.max(8, rail - top);
    const cyCap = (top + rail) / 2 - (bez && L.v === "mobile" ? logoH * BEZ_UP_MOBILE : 0);
    const capSada = Math.min(logoH * 0.34, Math.max(8, rail - F.dy - ly1 * F.s) * 0.4); // Igor: prezime tiše i manje od DRESIFY
    const cap = bez ? Math.min(logoH * BEZ_CAP, band * 0.4, capSada * BEZ_MAX) : capSada;
    const yP = (cyCap - F.dy) / F.s;
    let wl = 0;
    let wr = P.size[0];
    for (const q of P.portals) {
      if (q.length < 4) continue;
      const [tl, tr, br, bl] = q;
      if (yP < Math.min(tl[1], tr[1]) || yP > Math.max(bl[1], br[1])) continue; // otvor nije na toj visini
      const isL = (tl[0] + tr[0]) / 2 < P.size[0] / 2;
      const a = isL ? tr : tl;
      const b = isL ? br : bl;
      const x = a[0] + (b[0] - a[0]) * ((yP - a[1]) / (b[1] - a[1] || 1));
      if (isL) wl = Math.max(wl, x);
      else wr = Math.min(wr, x);
    }
    let x0 = F.dx + wl * F.s;
    let x1 = F.dx + wr * F.s;
    const m = (x1 - x0) * 0.08;
    x0 = Math.max(x0 + m, 16);
    x1 = Math.min(x1 - m, L.W - 16);
    const cx = (x0 + x1) / 2;
    const maxW = Math.min(x1 - x0, (lx1 - lx0) * F.s);
    const per = textWidthPerPx(nm, family.current);
    const font = Math.max(10, Math.min(maxW / Math.max(0.3, per), cap / 0.7));
    const cy = cyCap - capCenterEm(family.current) * font;
    return { cx, cy, font };
  }, []);

  const showName = useCallback(
    (nm: string, force = false) => {
      const st = S.current;
      if (!force && nm === st.name) return;
      const swap = nm !== st.name;
      st.name = nm;
      const g = nameGeo(nm);
      const a = nameRefs.current[st.nameSlot];
      if (!swap) {
        if (a && g) Object.assign(a.style, { left: `${g.cx}px`, top: `${g.cy}px`, fontSize: `${g.font}px` });
        return;
      }
      a?.setAttribute("data-out", "");
      st.nameSlot = 1 - st.nameSlot;
      const b = nameRefs.current[st.nameSlot];
      if (!b) return;
      b.textContent = nm;
      if (g) Object.assign(b.style, { left: `${g.cx}px`, top: `${g.cy}px`, fontSize: `${g.font}px` });
      requestAnimationFrame(() => {
        if (S.current.name === nm) b.removeAttribute("data-out");
      });
    },
    [nameGeo]
  );

  useEffect(() => {
    const probe = document.createElement("span");
    probe.className = "ime-outline";
    probe.style.position = "absolute";
    probe.style.visibility = "hidden";
    document.body.appendChild(probe);
    const fam = getComputedStyle(probe).fontFamily;
    probe.remove();
    const done = () => {
      if (fam) family.current = fam;
      showName(S.current.name, true);
    };
    if (document.fonts?.ready) void document.fonts.ready.then(done);
    else done();
  }, [showName]);

  /* ---------- bazen dresova: dodjela stavki ---------- */
  const assign = useCallback((base: number) => {
    const L = layoutRef.current;
    const lst = listRef.current;
    const nn = lst.length;
    const pool = slots.current;
    const P = pool.length;
    if (!L || !nn || !P) return;
    const K = (P - 3) / 2;
    for (let k = base - K - 1; k <= base + K + 1; k++) {
      const sl = pool[mod(k, P)];
      if (sl.k === k) continue;
      sl.k = k;
      const src = backOf(lst[mod(k, nn)]);
      if (src === sl.src) continue;
      sl.src = src;
      sl.loaded = false;
      const hk = HANGER_HOOKS[src];
      // kompleti (dvije vješalice) i slike bez kuke: okvir ostaje centriran, visina iz vrha
      sl.hx = hk && hk.hook !== false && !hk.multi ? hk.hx : 0.5;
      sl.hy = hk ? hk.hy : HOOK_FR;
      sl.ar = hk ? hk.ar : IMG_ASPECT_FALLBACK;
      if (sl.sharp) {
        sl.sharp.fetchPriority = Math.abs(k - base) < 1 ? "high" : Math.abs(k - base) <= 2 ? "auto" : "low";
        sl.sharp.src = src;
        if (sl.sharp.complete && sl.sharp.naturalWidth) sl.loaded = true;
      }
      if (sl.reflImg) sl.reflImg.src = src;
      sl.c.mk = ""; // maska sjene (silueta) se postavi u apply
    }
  }, []);

  /* ---------- crtanje jednog kadra ---------- */
  const tmpA = useRef<PathSample>({ hx: 0, hy: 0, ppm: 0, ang: 0, wf: 1, behind: false, light: 0, yaw: 0 });

  const apply = useCallback((dt: number) => {
    const L = layoutRef.current;
    if (!L) return;
    const { P, F, W } = L;
    const st = S.current;
    const sp = P.spacing;
    const fw = F.fh * FRAME_ASPECT;
    const leftE = F.dx;
    const rightE = F.dx + F.plateW;
    const rd = reflData.current;

    for (const r of slots.current) {
      if (!r.el || Number.isNaN(r.k)) continue;
      const u = st.pos - r.k;
      const s = u * sp;
      const p = samplePath(P.path, s, tmpA.current);
      if (!p || !r.src) {
        if (r.c.o !== "0") r.el.style.opacity = r.c.o = "0";
        if (r.refl && r.c.rd !== "none") r.refl.style.display = r.c.rd = "none";
        continue;
      }
      const au = Math.abs(u);
      // veličina iz puta (perspektiva) × fokus: dres u fokusu lagano naraste, bočni se malo smanje
      // (skaliranje oko kuke → vrh kuke ostaje točno na šipki)
      const sc = (p.ppm / P.focus.ppm) * focusScale(au);
      const X = F.dx + p.hx * F.s;
      const Y = F.dy + p.hy * F.s;
      // dres uvijek visi ravno prema kameri (neizobličena, oštra fotografija proizvoda) i POTPUNO
      // MIRUJE (bez zakreta i njihanja); put šipke daje samo položaj kuke, veličinu i svjetlinu.
      // Vrh kuke slike (hanger-hooks) sjedi točno na točki kuke puta (gornji rub šipke).
      const { ax, ay } = anchorOf(r, fw, F.fh);
      // pad svjetla od reflektora u fokusu (množenje svjetline): 1 → ~0.57 → ~0.23 → tama
      const b = falloff(au, p.behind, p.light);
      // izvan ploče nema zida koji bi skrio dres → pretapanje na rubu ploče
      const edge = smooth(leftE - W * 0.04, leftE + F.plateW * 0.05, X) * (1 - smooth(rightE - F.plateW * 0.05, rightE + W * 0.04, X));
      const op = st.ia * edge;

      const t = `translate3d(${X.toFixed(2)}px,${Y.toFixed(2)}px,0) scale(${sc.toFixed(4)}) translate(${(-ax).toFixed(2)}px,${(-ay).toFixed(2)}px)`;
      if (t !== r.c.t) r.el.style.transform = r.c.t = t;
      // dubina: svjetlo s puta (plate.json) kao tamni hladni sloj preko dresa (= brightness(b),
      // ali samo promjena opacity, bez filtera po kadru); dalje od fokusa još malo tamnije,
      // vanjski rub (dalje od reflektora) tamniji od unutarnjeg (gradijent u CSS-u)
      if (r.shade) {
        const ha = Math.min(1, (1 - b) / SHADE_A);
        const hs = ha < 0.004 ? "0" : ha.toFixed(3);
        if (hs !== r.c.ha) r.shade.style.opacity = r.c.ha = hs;
        // vanjski rub = strana dalje od reflektora (po položaju na zaslonu; na mobitelu put ide obrnuto)
        const side = X < F.dx + P.focus.x * F.s ? "l" : "r";
        if (side !== r.c.hs) r.shade.dataset.side = r.c.hs = side;
        // maska = silueta slike → nema svijetlog ni tamnog ruba
        const mk = !r.src ? "none" : `url("${r.src}")`;
        if (mk !== r.c.mk) {
          r.c.mk = mk;
          r.shade.style.setProperty("-webkit-mask-image", mk);
          r.shade.style.setProperty("mask-image", mk);
        }
      }
      const o = op.toFixed(3);
      if (o !== r.c.o) r.el.style.opacity = r.c.o = o;
      const z = String(p.behind ? 10 + Math.max(0, 9 - Math.round(au * 2)) : 40 + Math.max(0, 19 - Math.round(au * 4)));
      if (z !== r.c.z) r.el.style.zIndex = r.c.z = z;

      // odraz na mokrom podu: samo ispred zida; os zrcaljenja = rub dresa ili linija poda (što je niže),
      // jačina iz maske odraza ploče (gdje je pod sjajan)
      if (r.refl) {
        const hemY = Y + (F.fh - ay) * sc;
        const floorS = F.dy + P.floorY * F.s;
        // mobitel: dres u fokusu visi tik iznad linije poda → os odraza između ruba i linije poda (bez praznog pojasa)
        const Ya = (phoneRef.current ? Math.max(hemY, (hemY + floorS) / 2) : Math.max(hemY, floorS)) + 2;
        let show = r.loaded && !p.behind && rd != null && Ya < F.dy + F.plateH - 4 && Ya < L.H;
        let ra = 0;
        if (show && rd) {
          const mx = Math.round((p.hx / P.size[0]) * rd.w);
          const py = (Ya + 24 - F.dy) / F.s;
          const my = Math.round((Math.min(P.size[1] - 1, py) / P.size[1]) * rd.h);
          ra = mx >= 0 && mx < rd.w && my >= 0 && my < rd.h ? rd.a[(my * rd.w + mx) * 4 + 3] / 255 : 0;
          show = ra > 0.02;
        }
        const disp = show ? "block" : "none";
        if (disp !== r.c.rd) r.refl.style.display = r.c.rd = disp;
        if (show) {
          const rtS = `translate3d(${X.toFixed(2)}px,${(2 * Ya - Y).toFixed(2)}px,0) scale(${sc.toFixed(4)},${(-sc).toFixed(4)}) translate(${(-ax).toFixed(2)}px,${(-ay).toFixed(2)}px)`;
          if (rtS !== r.c.rt) r.refl.style.transform = r.c.rt = rtS;
          // mobitel: odraz malo tamniji (diskretno staklo, ne ogledalo)
          const ro = Math.min(0.5, (phoneRef.current ? 0.4 : 0.46) * b * (0.35 + 0.65 * ra) * op).toFixed(3);
          if (ro !== r.c.ro) r.refl.style.opacity = r.c.ro = ro;
        }
        // kontaktna sjena: meka elipsa na osi odraza (dres "stoji" u prostoru, ne lebdi)
        if (r.cs) {
          const on = r.loaded && !p.behind && Ya < L.H;
          const ct = on ? `translate3d(${X.toFixed(2)}px,${Ya.toFixed(2)}px,0) scale(${sc.toFixed(4)})` : "";
          if (on && ct !== r.c.ct) r.cs.style.transform = r.c.ct = ct;
          const co = on ? (0.62 * op * (0.45 + 0.55 * b)).toFixed(3) : "0";
          if (co !== r.c.co) r.cs.style.opacity = r.c.co = co;
        }
      }
    }

    // ambijentalno svjetlo: trenutni (floor) i sljedeći dres, pretapanje po razlomku položaja
    {
      const lst = listRef.current;
      const nn = lst.length;
      // ulaz dresova: šipka juri preko 2–3 dresa → svjetlo odmah u boji ciljanog dresa i samo se pojača
      // (do dolaska na cilj; povlačenje ili novi cilj prekinu ulaz)
      if (st.entry && st.target === null) st.entry = false;
      const entering = st.entry;
      const k0 = entering ? (st.target as number) : Math.floor(st.pos);
      const w1 = entering ? 0 : smooth(0.15, 0.85, st.pos - k0);
      const ring = amb.current;
      for (let j = 0; j < 3; j++) {
        const ly = ring[j];
        if (!ly.el) continue;
        const k = j === mod(k0, 3) ? k0 : j === mod(k0 + 1, 3) ? k0 + 1 : Number.NaN;
        if (!Number.isNaN(k) && k !== ly.k && nn) {
          ly.k = k;
          ly.el.style.background = ambBg(L.v, backOf(lst[mod(k, nn)]));
        }
        const o = Number.isNaN(k) ? "0" : (st.ia * (k === k0 ? 1 - w1 : w1)).toFixed(3);
        if (o !== ly.o) ly.el.style.opacity = ly.o = o;
      }
    }

    // sjene: maska j pripada dresu koji je najbliže položaju j (svi su na istom razmaku)
    P.shadows.forEach((sh, j) => {
      const el = shRefs.current[j];
      if (!el) return;
      const d = st.pos - sh.s / sp;
      const fr = d - Math.round(d);
      const o = (st.ia * (1 - Math.abs(fr))).toFixed(3);
      if (el.dataset.o !== o) {
        el.dataset.o = o;
        el.style.opacity = o;
      }
    });
  }, []);

  /** cijeli/aktivni dres: dodjela bazena, prezime, javljanje EHomeu (prigušeno tijekom kretanja) */
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
      if (ai !== st.active) {
        st.active = ai;
        showName(cbs.current.surnameOf(ai) || "");
      }
      // natpis ispod scene (React u EHomeu): niski prioritet, ne dok šipka brzo klizi
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
    [assign, showName]
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
      const dt = Math.min(0.05, Math.max(0.001, (now - st.t) / 1000));
      st.t = now;
      if (st.drag) {
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
      } else if (st.drift && !st.reduced) {
        st.vel += (st.drift - st.vel) * Math.min(1, dt / 0.6);
        st.pos += st.vel * dt;
      }
      st.prevPos = st.pos;
      if (st.iaOn && st.ia < 1) st.ia = st.reduced ? 1 : Math.min(1, st.ia + dt / 0.55);

      const rest = !st.drag && st.target === null && !st.drift && Math.abs(st.vel) < 1e-3 && (!st.iaOn || st.ia >= 1);
      sync(rest);
      apply(dt);

      if (st.off && !st.drag) {
        // izašla iz ekrana: stani odmah, nastavi pri povratku
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

  useEffect(() => {
    const st = S.current;
    st.reduced = prefersReduced();
    st.drift = st.reduced ? 0 : driftSpeed();
    if (st.drift) kick();
    return () => {
      cancelAnimationFrame(st.raf);
      st.raf = 0;
    };
  }, [kick]);

  // izvan ekrana (skrol do kartica / kataloga): bez rAF petlje i bez uvodnog videa
  useEffect(() => {
    const root = rootRef.current;
    if (!root || typeof IntersectionObserver === "undefined") return;
    const io = new IntersectionObserver(
      ([e]) => {
        const st = S.current;
        const off = !e.isIntersecting;
        if (off === st.off) return;
        st.off = off;
        const v = videoRef.current;
        if (off) v?.pause();
        else {
          if (v && v.paused && !v.ended) void v.play().catch(() => undefined);
          if (st.pending) {
            st.pending = false;
            kick();
          }
        }
      },
      { threshold: 0 }
    );
    io.observe(root);
    return () => io.disconnect();
  }, [kick]);

  // kadar promijenjen (ili prvi): bazen, prezime i jedan kadar prije iscrtavanja
  useLayoutEffect(() => {
    if (!layout) return;
    const st = S.current;
    st.base = Number.NaN;
    for (const s of slots.current) s.k = Number.NaN;
    for (const a of amb.current) a.k = Number.NaN;
    sync(true);
    showName(st.name, true);
    apply(0);
  }, [layout, apply, sync, showName]);

  /* ---------- uvod ---------- */
  const decided = useRef(false);
  const introPlayed = useRef(false);
  useEffect(() => {
    if (intro !== "wait" || decided.current) return;
    decided.current = true; // jednom (StrictMode u razvoju pokreće efekt dvaput)
    let seen = false;
    const z = zidParam();
    // zid=bez: uvodni film pali natpis koji ovdje ne postoji → bez uvoda (i ne troši "viđeno" za ostale varijante)
    if (z === "bez") {
      S.current.iaOn = true;
      setIntro("off");
      return;
    }
    try {
      seen = sessionStorage.getItem(INTRO_KEY) === "1";
      sessionStorage.setItem(INTRO_KEY, "1");
    } catch {
      /* bez pohrane */
    }
    if (seen || prefersReduced()) {
      S.current.iaOn = true;
      setIntro("off");
    } else {
      introPlayed.current = true;
      setIntro("load");
    }
  }, [intro]);
  // povratak sa stranice dresa (bez uvoda): varijanta zida se ipak pročita
  useEffect(() => {
    const z = zidParam();
    if (z === "sada") return;
    setZid(z);
    // slike zakrpe počnu se učitavati odmah (ne tek kad se ZidFx montira)
    const v = phoneRef.current ? "mobile" : "desktop";
    for (const s of z === "tiho" ? [ZID[v].wall.src, ZID[v].dim.src] : [ZID[v].wall.src]) new Image().src = s;
  }, []);
  /** slike zakrpe učitane (bez njih se varijanta ne smije pokazati: "bez" čeka i data-ready, da natpis ne bljesne) */
  const [zidLd, setZidLd] = useState(false);
  const zidCount = useRef(0);
  const onZidImg = useCallback(() => {
    zidCount.current++;
    if (zidCount.current >= (zidRef.current === "tiho" ? 2 : 1)) setZidLd(true);
  }, []);
  useEffect(() => {
    if (zid !== "bez" || zidLd) return;
    const t = window.setTimeout(() => setZidLd(true), 4000); // sigurnosno: scena se ne smije zaglaviti
    return () => window.clearTimeout(t);
  }, [zid, zidLd]);
  // nova varijanta → prezime na novo mjesto
  useEffect(() => {
    if (zid !== "sada") showName(S.current.name, true);
  }, [zid, showName]);
  /** zid=tiho: natpis se priguši (jednom, ne vraća se) */
  const dimWall = useCallback(() => {
    if (zidRef.current === "tiho") rootRef.current?.setAttribute("data-zdim", "");
  }, []);
  useEffect(() => {
    if (zid !== "tiho" || intro !== "off" || !ready) return;
    const t = window.setTimeout(dimWall, introPlayed.current ? ZID_DIM_MS : ZID_DIM_NOINTRO_MS);
    return () => window.clearTimeout(t);
  }, [zid, intro, ready, dimWall]);
  // dresovi se pojave (petlja se pokrene i nakon StrictMode ponovnog montiranja)
  useEffect(() => {
    if (intro === "off" || intro === "fade") kick();
  }, [intro, kick]);

  const endIntro = useCallback(
    (entrance: boolean) => {
      const st = S.current;
      if (st.iaOn) return;
      st.iaOn = true;
      if (entrance && !st.reduced) {
        // dresovi izađu iz lijevog otvora i stanu na šipku (šipka krene udesno)
        const t = st.target ?? Math.round(st.pos);
        st.pos = t - 2.6;
        st.prevPos = st.pos;
        st.vel = 2.2;
        st.target = t;
        st.entry = true;
      }
      setIntro("fade");
      kick();
      window.setTimeout(() => setIntro("off"), 520);
    },
    [kick]
  );

  useEffect(() => {
    if (intro !== "load") return;
    const v = videoRef.current;
    const t = window.setTimeout(() => endIntro(false), 1800);
    if (v) {
      v.muted = true;
      const p = v.play();
      if (p) p.catch(() => endIntro(false));
    }
    return () => window.clearTimeout(t);
  }, [intro, endIntro]);
  useEffect(() => {
    if (intro !== "play") return;
    // sigurnosno: ako "ended" ne stigne
    const t = window.setTimeout(() => endIntro(true), 4500);
    return () => window.clearTimeout(t);
  }, [intro, endIntro]);

  /* ---------- ploča učitana ---------- */
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
  }, [layout, onPlate]);

  /* ---------- okvir dresa (prijelaz na stranicu dresa, dodir) ---------- */
  const rectOf = useCallback((sl: Slot): { left: number; top: number; width: number; height: number } | null => {
    const L = layoutRef.current;
    if (!L || Number.isNaN(sl.k)) return null;
    const { P, F } = L;
    const p = samplePath(P.path, (S.current.pos - sl.k) * P.spacing, tmpA.current);
    if (!p) return null;
    const sc = (p.ppm / P.focus.ppm) * focusScale(Math.abs(S.current.pos - sl.k));
    const X = F.dx + p.hx * F.s;
    const Y = F.dy + p.hy * F.s;
    const fw = F.fh * FRAME_ASPECT;
    const { ax, ay, iw } = anchorOf(sl, fw, F.fh);
    return { left: X + ((fw - iw) / 2 - ax) * sc, top: Y - ay * sc, width: iw * sc, height: (iw / sl.ar) * sc };
  }, []);

  /* ---------- upravljanje ---------- */
  const goTarget = useCallback(
    (t: number) => {
      const st = S.current;
      st.target = t;
      st.drift = 0;
      st.entry = false;
      dimWall();
      kick();
    },
    [kick, dimWall]
  );

  useEffect(() => {
    control.current = {
      goBy: (dir: number) => {
        const st = S.current;
        goTarget((st.target ?? Math.round(st.pos)) + dir);
      },
      goTo: (i: number) => {
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
        for (const sl of slots.current) if (!Number.isNaN(sl.k) && mod(sl.k, nn) === i && (!best || Math.abs(sl.k - st.pos) < Math.abs(best.k - st.pos))) best = sl;
        const r = best ? rectOf(best) : null;
        if (!r) return null;
        const rb = root.getBoundingClientRect();
        return new DOMRect(rb.left + r.left, rb.top + r.top, r.width, r.height);
      },
      nameBox: () => {
        const root = rootRef.current;
        const nm = S.current.name;
        const g = nameGeo(nm);
        if (!root || !g) return null;
        const rb = root.getBoundingClientRect();
        return { cx: rb.left + g.cx, cy: rb.top + g.cy, font: g.font, name: nm };
      },
      moving: () => S.current.moving || S.current.drag,
      railY: () => {
        const root = rootRef.current;
        const L = layoutRef.current;
        if (!root || !L) return null;
        return root.getBoundingClientRect().top + L.F.dy + L.P.railY * L.F.s;
      },
    };
    return () => {
      control.current = null;
    };
  }, [control, goTarget, nameGeo, rectOf]);

  /* povlačenje / dodir */
  const ptr = useRef<{ id: number; x: number; y: number; t: number; pos: number; dragging: boolean } | null>(null);
  const onDown = (e: RPointerEvent<HTMLDivElement>) => {
    if (intro === "load" || intro === "play") {
      endIntro(false);
      return;
    }
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
        if (Math.abs(dy) > 10) ptr.current = null; // okomito → skrol stranice
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
      st.drift = 0;
      rootRef.current?.setAttribute("data-drag", "");
      dimWall();
      kick();
      return;
    }
    S.current.pos = p.pos + (e.clientX - p.x) / L.F.pxPerItem;
  };
  const release = (e: RPointerEvent<HTMLDivElement>, cancel: boolean) => {
    const p = ptr.current;
    if (!p || p.id !== e.pointerId) return;
    ptr.current = null;
    const st = S.current;
    if (p.dragging) {
      st.drag = false;
      rootRef.current?.removeAttribute("data-drag");
      const proj = st.pos + st.vel * 0.3;
      goTarget(Math.round(Math.max(st.pos - 8, Math.min(st.pos + 8, proj))));
      return;
    }
    if (cancel || performance.now() - p.t > 450) return;
    // dodir: dres u fokusu → otvori; drugi dres → dovedi ga u fokus
    const root = rootRef.current;
    if (!root) return;
    const rb = root.getBoundingClientRect();
    const x = e.clientX - rb.left;
    const y = e.clientY - rb.top;
    let hit: Slot | null = null;
    for (const sl of slots.current) {
      const r = rectOf(sl);
      if (!r || x < r.left || x > r.left + r.width || y < r.top || y > r.top + r.height) continue;
      if (!hit || Math.abs(sl.k - st.pos) < Math.abs(hit.k - st.pos)) hit = sl;
    }
    if (!hit) return;
    const nn = listRef.current.length;
    if (Math.abs(hit.k - st.pos) < 0.5) {
      const it = listRef.current[mod(hit.k, nn)];
      if (it) cbs.current.onOpenItem(it.slug);
    } else goTarget(hit.k);
  };

  // kotačić / dodirna ploča: samo vodoravni pomak (okomiti ostaje skrol stranice)
  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const onWheel = (e: WheelEvent) => {
      const L = layoutRef.current;
      if (!L || Math.abs(e.deltaX) <= Math.abs(e.deltaY) * 1.2) return;
      e.preventDefault();
      const st = S.current;
      const unit = e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? 400 : 1;
      st.drift = 0;
      st.target = null;
      st.drag = true;
      st.pos -= (e.deltaX * unit) / L.F.pxPerItem;
      dimWall();
      kick();
      window.clearTimeout(st.wheelT);
      st.wheelT = window.setTimeout(() => {
        st.drag = false;
        goTarget(Math.round(st.pos + st.vel * 0.18));
      }, 110);
    };
    root.addEventListener("wheel", onWheel, { passive: false });
    return () => root.removeEventListener("wheel", onWheel);
  }, [kick, goTarget, dimWall]);

  /* ---------- prikaz ---------- */
  const L = layout;
  const pool = L ? POOL[L.v] : 0;
  if (slots.current.length !== pool) slots.current = Array.from({ length: pool }, newSlot);
  const box = L ? { left: L.F.dx, top: L.F.dy, width: L.F.plateW, height: L.F.plateH } : { left: 0, top: 0, width: "100%", height: "100%" };
  const plateSrc = L ? L.P.files.plate : null;
  const fh = L ? L.F.fh : 0;
  const fw = fh * FRAME_ASPECT;
  const introOn = intro === "load" || intro === "play" || intro === "fade";
  const fe = L ? featherOf(L) : null;
  const am = L ? ambMask(L.v) : "";

  return (
    <div
      ref={rootRef}
      className="fh"
      data-phone={desk ? undefined : ""}
      data-ready={ready && intro !== "wait" && intro !== "load" && (zid !== "bez" || zidLd) ? "" : undefined}
      data-zl={zidLd ? "" : undefined}
      data-iv={intro !== "off" ? intro : undefined}
      onPointerDown={onDown}
      onPointerMove={onMove}
      onPointerUp={(e) => release(e, false)}
      onPointerCancel={(e) => release(e, true)}
      onDragStart={(e) => e.preventDefault()}
    >
      {/* 1 ploča */}
      <div className="fh-l fh-plate" style={box}>
        {plateSrc ? (
          <picture key={plateSrc[0]}>
            <source type="image/avif" srcSet={plateSrc[0]} />
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img ref={plateImg} src={plateSrc[1]} alt="" draggable={false} fetchPriority="high" decoding="async" onLoad={onPlate} />
          </picture>
        ) : (
          <picture>
            <source media="(min-width:1024px)" type="image/avif" srcSet={FILM.desktop.files.plate[0]} />
            <source media="(min-width:1024px)" srcSet={FILM.desktop.files.plate[1]} />
            <source type="image/avif" srcSet={FILM.mobile.files.plate[0]} />
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={FILM.mobile.files.plate[1]} alt="" draggable={false} fetchPriority="high" style={{ objectFit: "cover" }} />
          </picture>
        )}
      </div>

      {L ? (
        <>
          {/* 1b otvori u druge sobe: dubina unutra + svjetlo iz sobe (statično, iscrta se jednom) */}
          <PortalFx L={L} part="in" style={box} />
          {/* 1c šipka u sobama (kromirani odsjaj kroz otvore; zid ga skriva izvan otvora) */}
          <RailFx L={L} part="back" style={box} />
          {/* 1d sjajni pod (mobitel): odsjaj reflektora, rub poda, odraz kroma šipke — statično */}
          {!desk ? <FloorFx L={L} style={box} /> : null}
          {/* 2/6 sjene (izrezane maske, pola rezolucije) */}
          {L.P.shadows.map((sh, j) => {
            const front = !samplePath(L.P.path, sh.s, { ...tmpA.current })?.behind;
            return (
              <div
                key={sh.src}
                ref={(el) => {
                  shRefs.current[j] = el;
                }}
                className="fh-l fh-sh"
                data-front={front ? "" : undefined}
                style={{ left: L.F.dx + sh.box[0] * L.F.s, top: L.F.dy + sh.box[1] * L.F.s, width: sh.box[2] * L.F.s, height: sh.box[3] * L.F.s }}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={sh.src} alt="" draggable={false} decoding="async" />
                {/* drugi prolaz iste maske: jača kontaktna sjena na zidu */}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img className="fh-sh2" src={sh.src} alt="" draggable={false} decoding="async" />
              </div>
            );
          })}

          {/* 4 zid ispred dresova koji su iza njega */}
          <div className="fh-l fh-occl" style={box}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={L.P.files.occl} alt="" draggable={false} decoding="async" />
          </div>
          {/* 4a' varijante natpisa (?zid=tiho|bez): zid bez natpisa (isti Cycles render bez natpisa i njegova svjetla,
              rubovi pretopljeni, otvori izrezani) + kod "tiho" tamni obris natpisa koji se ZBRAJA (plus-lighter) */}
          {zid !== "sada" ? <ZidFx L={L} zid={zid} onImg={onZidImg} /> : null}
          {/* 4b rub zida na otvorima (ispred dresova u sobama, iza dresova ispred zida) */}
          <PortalFx L={L} part="rim" style={box} />
          {/* 4b' ambijentalno svjetlo u boji dresa u fokusu (zid + pod, bez otvora u sobe) */}
          <div aria-hidden className="fh-l fh-amb" style={{ ...box, WebkitMaskImage: am, maskImage: am }}>
            {amb.current.map((a, j) => (
              <i
                key={j}
                ref={(el) => {
                  a.el = el;
                }}
              />
            ))}
          </div>
          {/* 4c kromirani odsjaj šipke ispred zida (ispod dresova) */}
          <RailFx L={L} part="front" style={box} />
          {fe?.map((f, i) => <div key={i} aria-hidden className="fh-l fh-feather" style={f} />)}

          {/* 5 prezime dresa u fokusu kao svjetlosna projekcija na zidu ispod DRESIFY natpisa (dva sloja za pretapanje; puni ih showName) */}
          {[0, 1].map((i) => (
            <span
              key={i}
              ref={(el) => {
                nameRefs.current[i] = el;
              }}
              aria-hidden
              data-out=""
              className="ime-outline fh-l fh-name"
              style={{ transform: "translate(-50%,-50%)" }}
            />
          ))}

          {/* 3/7/8 dresovi: stalni bazen (src postavlja assign) */}
          {slots.current.map((sl, j) => (
            <div key={`${L.v}${j}`} style={{ display: "contents" }}>
              <div
                ref={(el) => {
                  sl.el = el;
                }}
                aria-hidden
                className="fh-j"
                style={{ width: fw, height: fh }}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  ref={(el) => {
                    sl.sharp = el;
                  }}
                  className="fh-s"
                  alt=""
                  draggable={false}
                  decoding="async"
                  onLoad={(e) => {
                    if ((e.currentTarget.getAttribute("src") ?? "") === sl.src) {
                      sl.loaded = true;
                      if (!S.current.raf) apply(0);
                    }
                  }}
                />
                <i
                  ref={(el) => {
                    sl.shade = el;
                  }}
                  className="fh-sd"
                />
              </div>
              <i
                ref={(el) => {
                  sl.cs = el;
                }}
                aria-hidden
                className="fh-cs"
                style={{ width: fw * 1.1, height: fw * 0.16, marginLeft: -fw * 0.55, marginTop: -fw * 0.08 }}
              />
              <div
                ref={(el) => {
                  sl.refl = el;
                }}
                aria-hidden
                className="fh-r"
                style={{ width: fw, height: fh }}
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
          ))}

          {/* 9 uvodni film (posljednji kadar = ploča) */}
          {introOn ? (
            <div className="fh-l fh-intro" data-out={intro === "fade" ? "" : undefined} style={{ ...box, opacity: intro === "load" ? 0 : undefined }}>
              <video
                ref={videoRef}
                muted
                playsInline
                autoPlay
                preload="auto"
                disablePictureInPicture
                onPlaying={() => setIntro((s) => (s === "load" ? "play" : s))}
                onEnded={() => endIntro(true)}
                onError={() => endIntro(false)}
              >
                <source src={L.P.files.intro.webm} type='video/webm; codecs="vp9"' />
                <source src={L.P.files.intro.mp4} type="video/mp4" />
              </video>
            </div>
          ) : null}
        </>
      ) : null}
    </div>
  );
});

/** zid=tiho|bez: zakrpa zida bez natpisa (+ kod "tiho" tamni obris koji se zbraja). Statično; prijelaz = samo opacity (CSS). */
const ZID_MOBILE_SCALE = 0.88; // tiho na mobitelu: prigušeni natpis ~12 % manji
function ZidFx({ L, zid, onImg }: { L: Layout; zid: Zid; onImg: () => void }) {
  const { F, P } = L;
  const z = ZID[L.v];
  const at = (b: readonly number[]): CSSProperties => ({ left: F.dx + b[0] * F.s, top: F.dy + b[1] * F.s, width: b[2] * F.s, height: b[3] * F.s });
  const d = z.dim.box;
  const ox = (((P.logo[0] + P.logo[2]) / 2 - d[0]) / d[2]) * 100;
  const oy = (((P.logo[1] + P.logo[3]) / 2 - d[1]) / d[3]) * 100;
  return (
    <>
      <div aria-hidden className="fh-l fh-zid" data-k={zid} style={at(z.wall.box)}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={z.wall.src} alt="" draggable={false} decoding="async" onLoad={onImg} onError={onImg} />
      </div>
      {zid === "tiho" ? (
        <div
          aria-hidden
          className="fh-l fh-zid fh-zid-s"
          data-k="tiho"
          data-sc={L.v === "mobile" ? "" : undefined}
          style={{ ...at(d), transform: L.v === "mobile" ? `scale(${ZID_MOBILE_SCALE})` : undefined, transformOrigin: `${ox.toFixed(2)}% ${oy.toFixed(2)}%` }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={z.dim.src} alt="" draggable={false} decoding="async" onLoad={onImg} onError={onImg} />
        </div>
      ) : null}
    </>
  );
}

/** rubovi ploče kad je uža/niža od scene: meki prijelaz u pozadinu */
function featherOf(L: Layout) {
  const { F, W, H } = L;
  const bg = "#0b0b0a";
  const out: CSSProperties[] = [];
  const fx = Math.min(56, F.plateW * 0.08);
  if (F.dx > 0.5) {
    out.push({ left: F.dx - 1, top: 0, width: fx, height: H, background: `linear-gradient(90deg,${bg},rgba(11,11,10,0))` });
    out.push({ left: 0, top: 0, width: F.dx, height: H, background: bg });
  }
  if (F.dx + F.plateW < W - 0.5) {
    out.push({ left: F.dx + F.plateW - fx + 1, top: 0, width: fx, height: H, background: `linear-gradient(270deg,${bg},rgba(11,11,10,0))` });
    out.push({ left: F.dx + F.plateW, top: 0, width: W - F.dx - F.plateW, height: H, background: bg });
  }
  const bottom = F.dy + F.plateH;
  if (bottom < H - 0.5) {
    const fy = Math.min(90, F.plateH * 0.1);
    out.push({ left: 0, top: bottom - fy + 1, width: W, height: fy, background: `linear-gradient(0deg,${bg},rgba(11,11,10,0))` });
    out.push({ left: 0, top: bottom, width: W, height: H - bottom, background: bg });
  }
  return out;
}

/* ------------------------------------------------------------------ */
/*  Otvori (portali) u druge sobe — iz plate.json (frontQuad, px ploče).*/
/*  "in" (ispod dresova u sobama i zida): prigušeno osvijetljena dubina */
/*  hodnika — pod koji bježi prema nedogledu, slabo svjetlo stražnje    */
/*  sobe, tanki rub praga; sjena špalete uz rub zida.                  */
/*  "rim" (iznad zida): okvir vrata — oba brida otvora s tankim rubnim  */
/*  svjetlom (najjače pri vrhu), vidljiva debljina zida (špaleta) na    */
/*  vanjskoj strani, nadvoj kad je u kadru. Statični SVG, bez rada po   */
/*  kadru.                                                              */
/* ------------------------------------------------------------------ */
const PortalFx = memo(function PortalFx({ L, part, style }: { L: Layout; part: "in" | "rim"; style: CSSProperties }) {
  const { P, v } = L;
  const [pw, ph] = P.size;
  const mob = v === "mobile";
  const id = `fhp-${v}-${part}`;
  const floor = Math.min(ph, P.floorY);
  // nedogled hodnika: x kamere (fokus), y obzora ≈ pod − visina kamere (2.2 m) na ravnini zida
  const cross = P.path.find((q, i) => i > 0 && q[6] !== P.path[i - 1][6]);
  const ppmWall = cross ? cross[3] : P.focus.ppm * 0.78;
  const vp: [number, number] = [P.focus.x, P.floorY - 2.2 * ppmWall];
  const K = 0.62; // dubina hodnika (udio prema nedogledu)
  const toVp = (c: [number, number]): [number, number] => [vp[0] + (c[0] - vp[0]) * K, vp[1] + (c[1] - vp[1]) * K];
  const f = (n: number) => n.toFixed(1);
  return (
    <svg aria-hidden className={`fh-l fh-portal fh-portal-${part}`} style={style} viewBox={`0 0 ${pw} ${ph}`} preserveAspectRatio="none">
      <defs>
        {part === "rim" ? (
          <filter id={`${id}-g`} x="-50%" y="-10%" width="200%" height="120%">
            <feGaussianBlur stdDeviation={mob ? 7 : 9} />
          </filter>
        ) : null}
      </defs>
      {P.portals.map((q, i) => {
        if (q.length < 4) return null;
        const [tl, tr, br, bl] = q as [number, number][];
        const left = (tl[0] + tr[0]) / 2 < pw / 2;
        // unutarnji rub = rub prema sredini; vanjski = rub dalje od sredine (kamera vidi njegovu špaletu)
        const e0 = left ? tr : tl;
        const e1 = left ? br : bl;
        const o0 = left ? tl : tr;
        const o1 = left ? bl : br;
        const top = Math.max(0, Math.max(tl[1], tr[1]));
        const bot = Math.min(floor, Math.min(br[1], bl[1]));
        const h = Math.max(1, bot - top);
        const w = Math.abs(tr[0] - tl[0]);
        const pts = q.map((p) => `${f(p[0])},${f(p[1])}`).join(" ");
        const g = `${id}-${i}`;
        const lintel = tl[1] > 2; // nadvoj u kadru (mobitel); na računalu otvor ide iznad ruba ploče
        const at = (a: [number, number], b: [number, number], y: number) => a[0] + (b[0] - a[0]) * ((y - a[1]) / (b[1] - a[1] || 1));
        if (part === "in") {
          const ibl = toVp(bl);
          const ibr = toVp(br);
          const itl = toVp(tl);
          return (
            <g key={i}>
              <defs>
                <linearGradient id={`${g}-x`} gradientUnits="userSpaceOnUse" x1={e0[0]} y1={0} x2={o0[0]} y2={0}>
                  <stop offset="0" stopColor="#000" stopOpacity={mob ? 0.62 : 0.5} />
                  <stop offset="0.22" stopColor="#000" stopOpacity={mob ? 0.28 : 0.2} />
                  <stop offset="0.6" stopColor="#000" stopOpacity="0" />
                </linearGradient>
                <linearGradient id={`${g}-y`} gradientUnits="userSpaceOnUse" x1={0} y1={top} x2={0} y2={top + h * 0.3}>
                  <stop offset="0" stopColor="#000" stopOpacity={lintel ? 0.6 : 0} />
                  <stop offset="1" stopColor="#000" stopOpacity="0" />
                </linearGradient>
                {/* zrak iz susjedne sobe: slabo, hladno, jače prema podu (bez neona) */}
                <linearGradient id={`${g}-a`} gradientUnits="userSpaceOnUse" x1={0} y1={top} x2={0} y2={bot}>
                  <stop offset="0" stopColor="#8a97ad" stopOpacity={mob ? 0.035 : 0.03} />
                  <stop offset="0.55" stopColor="#8a97ad" stopOpacity={mob ? 0.06 : 0.05} />
                  <stop offset="1" stopColor="#8a97ad" stopOpacity={mob ? 0.04 : 0.035} />
                </linearGradient>
                <radialGradient id={`${g}-l`} gradientUnits="userSpaceOnUse" cx={(ibl[0] + ibr[0]) / 2} cy={(ibl[1] + itl[1]) / 2 + h * 0.12} r={Math.max(w * 0.9, h * 0.38)}>
                  <stop offset="0" stopColor="#c3cddb" stopOpacity={mob ? 0.16 : 0.13} />
                  <stop offset="0.5" stopColor="#8f9cb2" stopOpacity={mob ? 0.06 : 0.05} />
                  <stop offset="1" stopColor="#8f9cb2" stopOpacity="0" />
                </radialGradient>
                {/* pod je JEDAN (isti mokri pod iz Blendera ide kroz otvor u sobu): ovaj sloj ne smije iscrtati
                    zaseban pod ni rub praga → sve se prema pragu (dnu otvora) meko gasi na 0 */}
                <linearGradient id={`${g}-m`} gradientUnits="userSpaceOnUse" x1={0} y1={bot - h * 0.42} x2={0} y2={bot}>
                  <stop offset="0" stopColor="#fff" />
                  <stop offset="1" stopColor="#000" />
                </linearGradient>
                <mask id={`${g}-k`} maskUnits="userSpaceOnUse" x={0} y={0} width={pw} height={ph}>
                  <rect x={0} y={0} width={pw} height={ph} fill={`url(#${g}-m)`} />
                </mask>
                <clipPath id={`${g}-c`}>
                  <polygon points={pts} />
                </clipPath>
              </defs>
              <g clipPath={`url(#${g}-c)`} mask={`url(#${g}-k)`}>
                <polygon points={pts} fill={`url(#${g}-a)`} />
                <rect x={Math.min(tl[0], bl[0]) - w} y={top} width={w * 3} height={h} fill={`url(#${g}-l)`} />
                <polygon points={pts} fill={`url(#${g}-x)`} />
                <polygon points={pts} fill={`url(#${g}-y)`} />
              </g>
            </g>
          );
        }
        // okvir vrata: oba brida (unutarnji jači — kut uhvati reflektor), špaleta na vanjskoj strani
        // (debljina zida 0.2 m u perspektivi), prag; najjače pri vrhu, prema podu slabi
        const ex0 = at(e0, e1, top);
        const ex1 = at(e0, e1, bot);
        const ox0 = at(o0, o1, top);
        const ox1 = at(o0, o1, bot);
        const jw = Math.abs((ox0 + ox1) / 2 - P.focus.x) * 0.0417 * (left ? 1 : -1); // špaleta prema unutra
        const sw = mob ? 4 : 3.2;
        return (
          <g key={i}>
            <defs>
              <linearGradient id={`${g}-r`} gradientUnits="userSpaceOnUse" x1={0} y1={top} x2={0} y2={bot}>
                <stop offset="0" stopColor="#ffffff" stopOpacity={mob ? 0.42 : 0.34} />
                <stop offset="0.4" stopColor="#e9eef7" stopOpacity={mob ? 0.24 : 0.2} />
                <stop offset="1" stopColor="#e9eef7" stopOpacity="0.05" />
              </linearGradient>
              <linearGradient id={`${g}-o`} gradientUnits="userSpaceOnUse" x1={0} y1={top} x2={0} y2={bot}>
                <stop offset="0" stopColor="#e9eef7" stopOpacity={mob ? 0.26 : 0.2} />
                <stop offset="1" stopColor="#e9eef7" stopOpacity="0.03" />
              </linearGradient>
              <linearGradient id={`${g}-j`} gradientUnits="userSpaceOnUse" x1={ox0} y1={0} x2={ox0 + jw} y2={0}>
                <stop offset="0" stopColor="#c9d2de" stopOpacity={mob ? 0.1 : 0.085} />
                <stop offset="1" stopColor="#c9d2de" stopOpacity="0.012" />
              </linearGradient>
              <linearGradient id={`${g}-t`} gradientUnits="userSpaceOnUse" x1={e0[0]} y1={0} x2={o0[0]} y2={0}>
                <stop offset="0" stopColor="#ffffff" stopOpacity={mob ? 0.3 : 0.2} />
                <stop offset="1" stopColor="#ffffff" stopOpacity="0.08" />
              </linearGradient>
            </defs>
            {/* špaleta (unutarnja ploha zida u otvoru) */}
            <polygon points={`${f(ox0)},${f(top)} ${f(ox0 + jw)},${f(top)} ${f(ox1 + jw * 0.96)},${f(bot)} ${f(ox1)},${f(bot)}`} fill={`url(#${g}-j)`} />
            <line x1={ox0 + jw} y1={top} x2={ox1 + jw * 0.96} y2={bot} stroke={`url(#${g}-o)`} strokeWidth={sw * 0.45} opacity={0.6} />
            {/* bridovi okvira */}
            <line x1={ex0} y1={top} x2={ex1} y2={bot} stroke={`url(#${g}-r)`} strokeWidth={sw * 7} filter={`url(#${id}-g)`} opacity={0.4} />
            <line x1={ex0} y1={top} x2={ex1} y2={bot} stroke={`url(#${g}-r)`} strokeWidth={sw} />
            <line x1={ox0} y1={top} x2={ox1} y2={bot} stroke={`url(#${g}-o)`} strokeWidth={sw * 0.8} />
            {/* bez crte praga: pod prolazi kroz otvor bez ruba */}
            {lintel ? <line x1={ex0} y1={top} x2={ox0} y2={top} stroke={`url(#${g}-t)`} strokeWidth={sw * 0.9} /> : null}
          </g>
        );
      })}
    </svg>
  );
});

/* ------------------------------------------------------------------ */
/*  Sjajni (stakleni / mokri) pod — samo mobitel. Statični SVG u px     */
/*  ploče, iscrta se jednom: izduženi meki odsjaj reflektora ispod      */
/*  fokusa (kako ga vidi kamera na sjajnoj plohi), tanki sjaj na spoju  */
/*  zida i poda, te vrlo slab zrcaljeni trag kromiranog odsjaja šipke.  */
/*  Ispod sjena/odraza dresova; bez filtera, bez rada po kadru.         */
/* ------------------------------------------------------------------ */
const FloorFx = memo(function FloorFx({ L, style }: { L: Layout; style: CSSProperties }) {
  const { P } = L;
  const [pw, ph] = P.size;
  const fy = P.floorY;
  const cx = P.focus.x;
  const path = P.path;
  // dio šipke ispred zida (kao RailFx "front")
  let sL = path[0][0];
  let sR = path[path.length - 1][0];
  for (let i = 1; i < path.length; i++) {
    if (path[i - 1][6] === 1 && path[i][6] === 0 && path[i][0] < 0) sL = path[i][0];
    if (path[i - 1][6] === 0 && path[i][6] === 1 && path[i][0] > 0) sR = path[i - 1][0];
  }
  const K = 0.05; // sabijeni zrcalni trag šipke u sjajnom podu
  const pts = path.filter((q, i) => q[0] >= sL && q[0] <= sR && i % 2 === 0);
  const glint = pts.map((q) => `${q[1].toFixed(1)},${(fy + (fy - (q[2] + 0.0045 * q[3])) * K).toFixed(1)}`).join(" ");
  const x0 = pts.length ? pts[0][1] : 0;
  const x1 = pts.length ? pts[pts.length - 1][1] : pw;
  const id = "fhf";
  return (
    <svg aria-hidden className="fh-l fh-floor" style={style} viewBox={`0 0 ${pw} ${ph}`} preserveAspectRatio="none">
      <defs>
        {/* odsjaj reflektora: izdužen prema kameri, topao-neutralan */}
        <radialGradient id={`${id}-s`} gradientUnits="userSpaceOnUse" cx={cx} cy={fy + 150} r={300} gradientTransform={`translate(${cx} ${fy + 150}) scale(1 2.1) translate(${-cx} ${-(fy + 150)})`}>
          <stop offset="0" stopColor="#f2f0ea" stopOpacity="0.1" />
          <stop offset="0.35" stopColor="#e6e4de" stopOpacity="0.045" />
          <stop offset="1" stopColor="#e6e4de" stopOpacity="0" />
        </radialGradient>
        <radialGradient id={`${id}-c`} gradientUnits="userSpaceOnUse" cx={cx} cy={fy + 70} r={110} gradientTransform={`translate(${cx} ${fy + 70}) scale(1 2.6) translate(${-cx} ${-(fy + 70)})`}>
          <stop offset="0" stopColor="#ffffff" stopOpacity="0.07" />
          <stop offset="1" stopColor="#ffffff" stopOpacity="0" />
        </radialGradient>
        {/* sjaj na spoju zida i poda, najjači pod reflektorom */}
        <linearGradient id={`${id}-l`} gradientUnits="userSpaceOnUse" x1={0} y1={0} x2={pw} y2={0}>
          <stop offset="0" stopColor="#dfe4ec" stopOpacity="0" />
          <stop offset="0.3" stopColor="#dfe4ec" stopOpacity="0.07" />
          <stop offset="0.5" stopColor="#f3f5f8" stopOpacity="0.16" />
          <stop offset="0.7" stopColor="#dfe4ec" stopOpacity="0.07" />
          <stop offset="1" stopColor="#dfe4ec" stopOpacity="0" />
        </linearGradient>
        <linearGradient id={`${id}-g`} gradientUnits="userSpaceOnUse" x1={x0} y1={0} x2={x1} y2={0}>
          <stop offset="0" stopColor="#c9d2de" stopOpacity="0" />
          <stop offset="0.25" stopColor="#c9d2de" stopOpacity="0.07" />
          <stop offset="0.5" stopColor="#eef1f5" stopOpacity="0.14" />
          <stop offset="0.75" stopColor="#c9d2de" stopOpacity="0.07" />
          <stop offset="1" stopColor="#c9d2de" stopOpacity="0" />
        </linearGradient>
      </defs>
      <rect x={0} y={fy} width={pw} height={ph - fy} fill={`url(#${id}-s)`} />
      <rect x={0} y={fy} width={pw} height={ph - fy} fill={`url(#${id}-c)`} />
      {/* sjaj spoja zida i poda samo uz zid — na otvorima nema spoja (pod ide dalje u sobu, bez crte praga) */}
      <mask id={`${id}-pm`} maskUnits="userSpaceOnUse" x={0} y={fy - 4} width={pw} height={8}>
        <rect x={0} y={fy - 4} width={pw} height={8} fill="#fff" />
        {P.portals.map((q, i) => {
          if (q.length < 4) return null;
          const a = Math.min(q[0][0], q[3][0]);
          const b = Math.max(q[1][0], q[2][0]);
          return <rect key={i} x={a - 6} y={fy - 4} width={b - a + 12} height={8} fill="#000" />;
        })}
      </mask>
      <rect x={0} y={fy - 1.5} width={pw} height={3.5} fill={`url(#${id}-l)`} mask={`url(#${id}-pm)`} />
      {pts.length > 1 ? (
        <>
          <polyline points={glint} fill="none" stroke={`url(#${id}-g)`} strokeWidth={9} strokeOpacity={0.35} strokeLinecap="round" />
          <polyline points={glint} fill="none" stroke={`url(#${id}-g)`} strokeWidth={2.6} strokeLinecap="round" />
        </>
      ) : null}
    </svg>
  );
});

/* ------------------------------------------------------------------ */
/*  Šipka: tanki kromirani odsjaj duž gornjeg ruba (iz plate.json puta  */
/*  — točka kuke = gornji rub šipke). Najjači pod reflektorom, jasno    */
/*  vidljiv i na stranama, slabi tek kad šipka uđe u otvor. "front" =   */
/*  dio ispred zida (iznad zida, ispod dresova); "back" = nastavak u   */
/*  sobama (ispod zida → vidi se samo kroz otvore). Tamni krom, bez     */
/*  neona; jedan statični SVG po kadru.                                 */
/* ------------------------------------------------------------------ */
const RailFx = memo(function RailFx({ L, part, style }: { L: Layout; part: "front" | "back"; style: CSSProperties }) {
  const { P, F, v } = L;
  const path = P.path;
  const [pw, ph] = P.size;
  let sL = path[0][0];
  let sR = path[path.length - 1][0];
  for (let i = 1; i < path.length; i++) {
    if (path[i - 1][6] === 1 && path[i][6] === 0 && path[i][0] < 0) sL = path[i][0];
    if (path[i - 1][6] === 0 && path[i][6] === 1 && path[i][0] > 0) sR = path[i - 1][0];
  }
  const IN = 0.75; // koliko se odsjaj nastavi u sobu (m)
  const base = (light: number) => 0.4 + 0.56 * Math.pow(Math.max(0, light), 0.6);
  const alpha = (q: (typeof path)[number]) => {
    const s = q[0];
    const b = base(q[7]);
    if (part === "front") return b * (0.55 + 0.45 * smooth(sL, sL + 0.3, s) * (1 - smooth(sR - 0.3, sR, s)));
    return s < 0 ? 0.55 * b * smooth(sL - IN, sL, s) : 0.55 * b * (1 - smooth(sR, sR + IN, s));
  };
  const segs: [number, number][] = part === "front" ? [[sL, sR]] : [[sL - IN, sL + 0.03], [sR - 0.03, sR + IN]];
  const minPx = 1 / F.s;
  const layers = [
    { k: "h", dy: 0.007, w: 0.016, min: 3 * minPx, c: "#9eabbd", a: 0.13 },
    { k: "c", dy: 0.0045, w: 0.0034, min: 1.15 * minPx, c: "#f3f5f8", a: v === "mobile" ? 0.92 : 0.85 },
    { k: "b", dy: 0.028, w: 0.0022, min: 0.8 * minPx, c: "#8d97a6", a: 0.3 },
  ];
  const id = `fhr-${v}-${part}`;
  return (
    <svg aria-hidden className={`fh-l fh-rail fh-rail-${part}`} style={style} viewBox={`0 0 ${pw} ${ph}`} preserveAspectRatio="none">
      {segs.map(([a, b], si) => {
        const pts = path.filter((q) => q[0] >= a && q[0] <= b);
        if (pts.length < 2) return null;
        const x0 = pts[0][1];
        const x1 = pts[pts.length - 1][1];
        const span = x1 - x0 || 1;
        const stops = pts.filter((_, i) => i % 3 === 0 || i === pts.length - 1);
        return layers.map((ly) => {
          const gid = `${id}-${si}-${ly.k}`;
          const top: string[] = [];
          const bot: string[] = [];
          for (const q of pts) {
            const cos = Math.max(0.35, Math.cos((q[4] * Math.PI) / 180));
            const half = Math.max(ly.w * q[3], ly.min) / 2 / cos;
            const y = q[2] + ly.dy * q[3];
            top.push(`${q[1].toFixed(1)},${(y - half).toFixed(2)}`);
            bot.push(`${q[1].toFixed(1)},${(y + half).toFixed(2)}`);
          }
          return (
            <g key={gid}>
              <defs>
                <linearGradient id={gid} gradientUnits="userSpaceOnUse" x1={x0} y1={0} x2={x1} y2={0}>
                  {stops.map((q, i) => (
                    <stop key={i} offset={Math.max(0, Math.min(1, (q[1] - x0) / span)).toFixed(4)} stopColor={ly.c} stopOpacity={(alpha(q) * ly.a).toFixed(3)} />
                  ))}
                </linearGradient>
              </defs>
              <polygon points={`${top.join(" ")} ${bot.reverse().join(" ")}`} fill={`url(#${gid})`} />
            </g>
          );
        });
      })}
    </svg>
  );
});
