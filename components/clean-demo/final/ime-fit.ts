import { HANGER_FIT, type HangerFit } from "@/lib/data/hanger-fit";

/* ------------------------------------------------------------------ */
/*  Kako svaka slika vješalice sjeda na šipku (stranica dresa).         */
/*  Koordinate: x od točke kuke, y od GORNJEG RUBA ŠIPKE, jedinica =    */
/*  visina vješalice (s · --u). Vrh kuke (ty, hx iz lib/data/hanger-fit) */
/*  je točno na (0, 0) — za svaku sliku zasebno, pa prednja i leđa      */
/*  (različito izrezane) vise na istoj točki i nakon okreta.            */
/*   - "hook": slika ima žičanu kuku → vrh kuke na šipku.               */
/*   - "dome": kuka je odrezana (vrh slike je tijelo vješalice) → kuka  */
/*     se posudi s drugog lica (ili ogledne slike) i tijelo se smjesti  */
/*     ispod nje, u istom mjerilu (izrez ≈ 10 % visine).                */
/*   - "bar": ravna prečka (hlače) → prečka ispod šipke, kuka se crta.  */
/* ------------------------------------------------------------------ */

export type Rect = { l: number; t: number; w: number; h: number };
export type FaceFit = {
  kind: HangerFit["k"];
  img: Rect;
  /** posuđena kuka (samo "dome"): slika + koliko je gornjeg dijela vidljivo (udio visine) */
  donor?: { src: string; r: Rect; keep: number };
};

/** Ogledna kuka za slike bez kuke kad ni drugo lice nema kuku. */
export const DONOR_HOOK = "/ormar/hanger/palestina-palestina.webp";
const DEF: HangerFit = { k: "hook", ty: 0.002, hx: 0.5, f: 0.11, fx: 0.5, ar: 0.7 };
/** Spust prečke ispod šipke (udio visine) — kao prije za hlače trenirke. */
export const BAR_DROP = 0.055;

export const fitOf = (src: string): HangerFit => HANGER_FIT[src] ?? DEF;

export function faceFit(src: string, pairSrc?: string): FaceFit {
  const g = fitOf(src);
  if (g.k === "bar") return { kind: "bar", img: { l: -g.hx * g.ar, t: 0, w: g.ar, h: 1 } };
  if (g.k === "hook") return { kind: "hook", img: { l: -g.hx * g.ar, t: -g.ty, w: g.ar, h: 1 } };
  const pair = pairSrc ? HANGER_FIT[pairSrc] : undefined;
  const dsrc = pair?.k === "hook" ? pairSrc! : DONOR_HOOK;
  const d = fitOf(dsrc);
  const dr: Rect = { l: -d.hx * d.ar, t: -d.ty, w: d.ar, h: 1 };
  // vrh tijela vješalice kod posuđene kuke → tamo ide vrh tijela ove slike
  const nx = dr.l + d.fx * d.ar;
  const ny = dr.t + d.f;
  const k = Math.min(0.97, Math.max(0.8, 1 - (d.f - g.f)));
  const w = g.ar * k;
  return {
    kind: "dome",
    img: { l: nx - g.fx * w, t: ny - g.f * k, w, h: k },
    donor: { src: dsrc, r: dr, keep: d.f + 0.002 },
  };
}

/** Okvir vješalice (iz prvog lica): sadrži sliku i kuku; vrh = vrh kuke. */
export function frameOf(f: FaceFit): Rect {
  if (!f.donor) return f.img;
  const t = f.donor.r.t;
  return { l: f.img.l, t, w: f.img.w, h: f.img.t + f.img.h - t };
}

const p4 = (n: number) => `${(n * 100).toFixed(4)}%`;
/** Pravokutnik r u postotcima okvira B; mirror = zrcaljeno oko točke kuke (x = 0). */
export function pct(r: Rect, B: Rect, mirror = false, refl = false) {
  const l = mirror ? -(r.l + r.w) : r.l;
  // odraz: okvir odraza počinje na dnu okvira, sadržaj je zrcaljen oko vlastite sredine
  const top = refl ? B.t + B.h - r.t - r.h : r.t - B.t;
  return { left: p4((l - B.l) / B.w), top: p4(top / B.h), width: p4(r.w / B.w), height: p4(r.h / B.h) };
}
