import type { HangerImages } from "@/lib/data/ormar-hanger";
import { HOOK_GEO, type HookGeo } from "./hanger-hooks";

/* ------------------------------------------------------------------ */
/*  Zajednički raspored pozornice "na vješalici" — isti brojevi crtaju  */
/*  2D verziju (SVG + slike) i 3D scenu (three.js), pa se pri zamjeni   */
/*  2D → 3D ništa ne pomakne. Jedinice pozornice: 1000 × 1250 (4/5).    */
/* ------------------------------------------------------------------ */

export const SW = 1000;
export const SH = 1250;
export const WIRE = 4 / 900; // debljina žice kuke (udio visine slike)
const FALLBACK: HookGeo = { t: 0.004, x: 0.53, a: 0.7 };
// Dječje hlačice (izrez 700 px, kuka na vrhu, sredina): visina u odnosu na dres.
const SHORTS_H = 0.6;
const SHORTS_GEO: HookGeo = { t: 7 / 700 - WIRE, x: 0.5, a: 503 / 700 };

export type Face = { key: string; src: string; label: string; geo: HookGeo };
/** Jedna vješalica: 1 lice (ne okreće se) ili 2 lica (prednja/leđa). */
export type Piece = { key: string; faces: Face[]; s: number; bar: boolean; kidOnly: boolean };

const g = (src: string) => HOOK_GEO[src] ?? FALLBACK;

export function hangerPieces(h: HangerImages): Piece[] {
  if (h.kind === "dres") {
    const faces: Face[] = [];
    if (h.front) faces.push({ key: "front", src: h.front, label: "Prednja strana", geo: g(h.front) });
    faces.push({ key: "back", src: h.back, label: "Leđa", geo: g(h.back) });
    const out: Piece[] = [{ key: "dres", faces, s: 1, bar: false, kidOnly: false }];
    if (h.shorts) {
      out.push({
        key: "shorts",
        faces: [{ key: "shorts", src: h.shorts, label: "Dječje hlačice", geo: SHORTS_GEO }],
        s: SHORTS_H,
        bar: false,
        kidOnly: true,
      });
    }
    return out;
  }
  const out: Piece[] = [];
  if (h.jakna) {
    const faces: Face[] = [{ key: "jakna", src: h.jakna, label: "Jakna", geo: g(h.jakna) }];
    if (h.jaknaFront) faces.push({ key: "jaknaFront", src: h.jaknaFront, label: "Jakna sprijeda", geo: g(h.jaknaFront) });
    out.push({ key: "jakna", faces, s: 1, bar: false, kidOnly: false });
  }
  if (h.hlace) {
    const geo = g(h.hlace);
    out.push({ key: "hlace", faces: [{ key: "hlace", src: h.hlace, label: "Hlače", geo }], s: 1, bar: !!geo.bar, kidOnly: false });
  }
  return out;
}

/** Ravna lista lica (za sličice / stare pozive). */
export function hangerFaces(h: HangerImages): Face[] {
  return hangerPieces(h)
    .filter((p) => !p.kidOnly)
    .flatMap((p) => p.faces);
}

/* ---------------- geometrija ---------------- */

export type FaceBox = { l: number; t: number; w: number; h: number };
export type PieceBox = {
  hx: number; // x kuke (osnovni prikaz)
  kx: number; // x kuke kad su prikazane dječje hlačice
  h: number; // visina slike
  faces: FaceBox[]; // položaji lica u osnovnom prikazu
};
export type Lay = {
  pieces: PieceBox[];
  rodTop: number;
  rodD: number;
  x0: number;
  x1: number;
  floorY: number;
  labelY: number;
  /** Prikaz s dječjim hlačicama: uniformno umanjenje oko (px, py) — kamera se odmakne. */
  kid: { k: number; px: number; py: number } | null;
};
export type LayOpts = { maxH: number; maxW: number; gap: number; rodD: number; footer: number; bias?: number };

const amax = (p: Piece) => Math.max(...p.faces.map((f) => f.geo.a));

export function computeLayout(pieces: Piece[], o: LayOpts): Lay {
  const base = pieces.filter((p) => !p.kidOnly);
  const solo = base.length === 1;
  const H = solo
    ? Math.min(o.maxH, o.maxW / amax(base[0]))
    : Math.min(o.maxH, (o.maxW - o.gap * (base.length - 1)) / base.reduce((s, p) => s + amax(p) * p.s, 0));
  const stem = H * 0.055;
  const offOf = (p: Piece, f: Face) => (p.bar ? -(o.rodD * 0.5 + stem) : (f.geo.t + WIRE) * H * p.s);
  let below = 0;
  for (const p of base) for (const f of p.faces) below = Math.max(below, H * p.s - offOf(p, f));
  const avail = SH - o.footer;
  // bias: koliki dio slobodnog prostora ide iznad šipke (duži nosači, kompozicija optički centrirana)
  const rodTop = Math.round(150 + Math.max(0, avail - 150 - (below + 14)) * (o.bias ?? 0.55));

  // vodoravni raspored (lijevo → desno, centrirano), širina mjesta = najšire lice
  const place = (list: Piece[]) => {
    const ws = list.map((p) => amax(p) * H * p.s);
    const total = ws.reduce((s, w) => s + w, 0) + o.gap * (list.length - 1);
    let l = SW / 2 - total / 2;
    const out = new Map<string, number>();
    list.forEach((p, i) => {
      const f = p.faces[0];
      const w0 = f.geo.a * H * p.s;
      out.set(p.key, solo && list === base ? SW / 2 : l + (ws[i] - w0) / 2 + f.geo.x * w0);
      l += ws[i] + o.gap;
    });
    return { out, total };
  };
  const b = place(base);
  const hasKid = pieces.some((p) => p.kidOnly);
  const k = hasKid ? place(pieces) : null;

  const boxes: PieceBox[] = pieces.map((p) => {
    const h = H * p.s;
    const hx = b.out.get(p.key) ?? k?.out.get(p.key) ?? SW / 2;
    const kx = k?.out.get(p.key) ?? hx;
    return {
      hx,
      kx,
      h,
      faces: p.faces.map((f) => {
        const w = f.geo.a * h;
        return { l: hx - f.geo.x * w, t: rodTop - offOf(p, f), w, h };
      }),
    };
  });

  const floorY = rodTop + below + 10;
  // šipka: simetrična oko sredine, dovoljno duga i za prikaz s hlačicama
  const reach = solo ? 330 : 250;
  const hxs = boxes.flatMap((bx) => [bx.hx, bx.kx]);
  const far = Math.max(...hxs.map((x) => Math.abs(x - SW / 2)));
  const R = hasKid ? Math.max(reach, far + 80) : far + reach;
  const x0 = Math.max(46, SW / 2 - R);
  const x1 = Math.min(SW - 46, SW / 2 + R);
  const kid = k ? { k: Math.min(1, (o.maxW + 80) / (k.total + 60)), px: SW / 2, py: (rodTop + floorY) / 2 } : null;
  return { pieces: boxes, rodTop, rodD: o.rodD, x0, x1, floorY, labelY: floorY + (o.footer < 150 ? 44 : 66), kid };
}

export const MOBILE_SOLO: LayOpts = { maxH: 800, maxW: 700, gap: 0, rodD: 20, footer: 230 };
export const MOBILE_PAIR: LayOpts = { maxH: 780, maxW: 920, gap: 24, rodD: 18, footer: 190 };
export const DESK_SOLO: LayOpts = { maxH: 820, maxW: 720, gap: 0, rodD: 15, footer: 150, bias: 0.7 };
export const DESK_PAIR: LayOpts = { maxH: 760, maxW: 960, gap: 20, rodD: 15, footer: 150, bias: 0.7 };

export function layoutsFor(pieces: Piece[]) {
  const solo = pieces.filter((p) => !p.kidOnly).length === 1;
  return {
    mobile: computeLayout(pieces, solo ? MOBILE_SOLO : MOBILE_PAIR),
    desktop: computeLayout(pieces, solo ? DESK_SOLO : DESK_PAIR),
  };
}
