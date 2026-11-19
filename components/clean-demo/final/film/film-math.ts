/* ------------------------------------------------------------------ */
/*  Film hero — geometrija i fizika (bez Reacta).                       */
/*  Ploča (Blender Cycles) se kadrira u kutiju scene; dres visi na      */
/*  točki kuke s puta šipke (plate.json → film-data). Njihalo na kuki:  */
/*  ljuljanje u ravnini dresa (tangencijalno ubrzanje), otklon od       */
/*  centripetalnog ubrzanja u zavoju i lagano uvijanje.                 */
/* ------------------------------------------------------------------ */

import type { FilmPlate, FilmPt } from "./film-data";

/** visina slike na vješalici u metrima (kuka → rub dresa; dres 0.86 m + vješalica) */
export const IMG_M = 0.98;
/** unutarnji vrh kuke u udjelu visine slike (sve slike 900 px, kuka na 5/900) */
export const HOOK_FR = 5 / 900;
/** okvir slike dresa: širina / visina */
export const FRAME_ASPECT = 0.82;
/** prirodni omjer slika na vješalici (633×900) kad slika još nije učitana */
export const IMG_ASPECT_FALLBACK = 0.703;
/** dres u fokusu lagano naraste, bočni se malo smanje (množi se s veličinom iz puta) */
export const FOCUS_GROW = 0.075;
export const SIDE_SHRINK = 0.05;
/** koliki dio rasta dresa u fokusu smije prijeći granicu ruba (hemLimit): pola → dres u fokusu stvarno
 *  naraste ~3,6 % (rub ~16 px niže na računalu), a ne samo da se bočni smanje */
export const GROW_OVER = 0.5;
/** faktor veličine po udaljenosti od fokusa (u dresovima): glatko, bez stepenica i bez loma u fokusu
 *  (derivacija 0 u au=0) — 1.075 u fokusu → 0.95 od prvog susjeda dalje */
export function focusScale(au: number) {
  const t = Math.max(0, Math.min(1, au));
  const g = 1 - t * t * (3 - 2 * t);
  return 1 - SIDE_SHRINK + (FOCUS_GROW + SIDE_SHRINK) * g;
}
/** visina šipke iznad poda (m) — za odraz */
const RAIL_Z = 1.5;

export type Frame = {
  /** plate → zaslon: x = dx + px·s */
  s: number;
  dx: number;
  dy: number;
  /** okvir slike dresa u fokusu (px zaslona) */
  fh: number;
  /** faktor veličine dresa (≤1 kad mora stati iznad natpisa) */
  js: number;
  /** px zaslona po dresu na šipki (u fokusu) — za povlačenje */
  pxPerItem: number;
  plateW: number;
  plateH: number;
};

/** Kadar: logo tik ispod navigacije, dres u fokusu što veći, a rub dresa iznad natpisa.
 *  Ploča najviše "cover", najmanje 0.84 × cover (rubovi se tada pretope u pozadinu). */
export function solveFrame(P: FilmPlate, W: number, H: number, top: number, hemLimit: number): Frame {
  const [pw, ph] = P.size;
  const cover = Math.max(W / pw, H / ph);
  const hook = P.focus.hook[1];
  const logoTop = P.logo[1];
  const j1 = IMG_M * P.focus.ppm; // visina dresa u px ploče (×s)
  const span = hook - logoTop;
  const sStar = (hemLimit - top) / (span + j1);
  const s = Math.max(cover * 0.84, Math.min(cover, sStar));
  const dx = W / 2 - P.focus.x * s;
  const dy = top - logoTop * s;
  const room = hemLimit - (hook * s + dy);
  // povećani dres u fokusu (× focusScale(0)) smije prijeći granicu tek za dio rasta (GROW_OVER) → osnovna veličina se po potrebi smanji
  const js = Math.max(0.62, Math.min(1, room / (j1 * s * (1 + FOCUS_GROW * (1 - GROW_OVER)))));
  const fh = j1 * s * js;
  return { s, dx, dy, fh, js, pxPerItem: P.spacing * P.focus.ppm * s, plateW: pw * s, plateH: ph * s };
}

export type PathSample = { hx: number; hy: number; ppm: number; ang: number; wf: number; behind: boolean; light: number; yaw: number };

/** linearna interpolacija puta po luku s (m); null izvan puta */
export function samplePath(path: FilmPt[], s: number, out: PathSample): PathSample | null {
  const n = path.length;
  if (s < path[0][0] || s > path[n - 1][0]) return null;
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
  out.ang = l(4);
  out.wf = l(5);
  out.behind = (t < 0.5 ? a[6] : b[6]) === 1;
  out.light = l(7);
  out.yaw = l(8);
  return out;
}

/** zakrivljenost puta (rad/m) — promjena smjera šipke u svijetu (yaw iz Blendera) */
export function curvature(path: FilmPt[], s: number, tmp: PathSample, tmp2: PathSample) {
  const a = samplePath(path, s - 0.04, tmp);
  const b = samplePath(path, s + 0.04, tmp2);
  if (!a || !b) return 0;
  return ((b.yaw - a.yaw) * Math.PI) / 180 / 0.08;
}

/** svjetlina dresa iz osvjetljenja ploče (0..1) — percepcijski, susjedi malo tamniji */
export const brightness = (light: number) => {
  if (light > 0.985) return 1;
  const l = Math.max(0, light);
  // u sobama iza zida (gotovo bez svjetla) dresovi su gotovo siluete
  return 0.06 + 0.94 * Math.pow(l, 0.22) * (0.55 + 0.45 * smooth(0.002, 0.03, l));
};

export const smooth = (a: number, b: number, x: number) => {
  const t = Math.max(0, Math.min(1, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

export const mod = (a: number, n: number) => ((a % n) + n) % n;

/* ---------- njihalo na kuki ---------- */

export type Swing = { th: number; om: number; ps: number; pv: number; tw: number; tv: number };
export const newSwing = (): Swing => ({ th: 0, om: 0, ps: 0, pv: 0, tw: 0, tv: 0 });

const G = 9.81;
const L = 0.42; // m, kuka → težište dresa
const C = 1.15; // prigušenje (1/s)

/** jedan korak (polu-implicitni Euler, podkoraci ≤ 8 ms).
 *  at = tangencijalno ubrzanje šipke (m/s²), ac = centripetalno (m/s²). */
export function stepSwing(w: Swing, at: number, ac: number, dt: number) {
  const steps = Math.max(1, Math.ceil(dt / 0.008));
  const h = dt / steps;
  for (let k = 0; k < steps; k++) {
    // u ravnini dresa: inercija vuče dno unatrag
    w.om += ((at * Math.cos(w.th) - G * Math.sin(w.th)) / L - C * w.om) * h;
    w.th += w.om * h;
    // izvan ravnine (zavoj): dno ide prema van
    w.pv += ((ac - G * Math.sin(w.ps)) / L - C * 1.3 * w.pv) * h;
    w.ps += w.pv * h;
    // uvijanje oko kuke (torzijska opruga)
    w.tv += (-26 * w.tw - 2.4 * w.tv + 0.35 * at) * h;
    w.tw += w.tv * h;
  }
  w.th = Math.max(-0.38, Math.min(0.38, w.th));
  w.ps = Math.max(-0.3, Math.min(0.3, w.ps));
  w.tw = Math.max(-0.25, Math.min(0.25, w.tw));
}

export const swingRest = (w: Swing) =>
  Math.abs(w.th) < 6e-4 && Math.abs(w.om) < 6e-3 && Math.abs(w.ps) < 6e-4 && Math.abs(w.pv) < 6e-3 && Math.abs(w.tw) < 6e-4 && Math.abs(w.tv) < 6e-3;

/** y vrha odraza (px ploče) za dres na točki puta — odraz mokrog poda */
export function reflTop(p: PathSample, js: number) {
  const floor = p.hy + RAIL_Z * p.ppm;
  return floor + (RAIL_Z - IMG_M * js) * p.ppm;
}
export const reflFloor = (p: PathSample) => p.hy + RAIL_Z * p.ppm;

/* ---------- pad svjetla od fokusa (množenje svjetline dresa) ---------- */

/** čvorovi: udaljenost od fokusa (u dresovima) → udio svjetline (sRGB množitelj) */
const FALL: [number, number][] = [
  [0, 1],
  [1, 0.5],
  [2, 0.2],
  [3, 0.13],
];

/** svjetlina dresa na udaljenosti au od fokusa: fokus 100 %, prvi susjedi ~50 % (unutarnji rub ~57 %, vanjski ~43 %), stražnji ~20 %
 *  (jedva izranjaju iz tame). U sobama iza zida, gdje ploča gotovo nema svjetla, još malo tamnije. */
export function falloff(au: number, behind: boolean, light: number) {
  let b = FALL[FALL.length - 1][1];
  for (let i = 1; i < FALL.length; i++) {
    const [x1, y1] = FALL[i];
    if (au <= x1) {
      const [x0, y0] = FALL[i - 1];
      const t = (au - x0) / (x1 - x0);
      b = y0 + (y1 - y0) * (t * t * (3 - 2 * t));
      break;
    }
  }
  if (behind) b *= 0.82 + 0.18 * smooth(0.002, 0.03, light);
  return b;
}
