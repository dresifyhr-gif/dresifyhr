// Smjer G — "C Premium" sa stvarnim fotografijama na crnoj vješalici, na zaobljenoj šipki.
// Podaci, imena, geometrija vješalice, luk šipke i raspored (bez JSX-a).
import type { OrmarItem } from "@/lib/data/ormar";
import type { OrmarGroup, OrmarRailItem } from "@/lib/data/ormar-items";
import { repairText } from "@/lib/utils";

/* ---------- slike na vješalici ---------- */
// Stavke dolaze iz lib/data/ormar-items.ts (svi proizvodi iz manifesta lib/data/ormar-hanger.ts).
// Dres: leđa (+ prednja). Trenirka: jakna + hlače na dvije vješalice jedna do druge.

// Geometrija (izmjereno na slikama 900 px visine, ista na svima):
//  - vanjski vrh kuke je na ~2/900, žica je debela ~3 px → unutarnji vrh zavoja na ~5/900.
//    Gornji rub šipke leži točno na unutarnjem vrhu zavoja (šipka prolazi kroz kuku).
//  - slike su široke 382–725 px (hlače / jakne) → okvir omjera 0.82 je uvijek "po visini",
//    pa su vrh kuke i dno odjeće na istom mjestu kod svih slika.
export const HOOK_INNER = 5 / 900; // udio visine slike
export const IMG_ASPECT = 0.82; // širina / visina okvira slike dresa (i jakne)
export const IMG_PER_W = 1.4; // visina okvira slike = 1.4 × širina dresa u sredini (w)

// Trenirka = par vješalica: jakna lijevo (sprijeda), hlače desno; vješalice se malo preklapaju.
// Sve u udjelima visine slike h. Okvir para je širok PAIR_ASPECT·h.
export const PANTS_ASPECT = 0.46; // okvir slike hlača (slike su 382/900)
export const JACKET_HOOK = IMG_ASPECT / 2; // x kuke jakne u okviru para
export const PANTS_HOOK = JACKET_HOOK + 0.46; // x kuke hlača u okviru para
export const PAIR_ASPECT = PANTS_HOOK + PANTS_ASPECT / 2;
export const PAIR_WEIGHT = 1.42; // koliko "mjesta" na šipki zauzima par (dres = 1)

export const isPair = (it: OrmarRailItem) => it.img.kind === "trenirka";
export const itemAspect = (it: OrmarRailItem) => (isPair(it) ? PAIR_ASPECT : IMG_ASPECT);
export const itemWeight = (it: OrmarRailItem) => (isPair(it) ? PAIR_WEIGHT : 1);
export const hasFront = (it: OrmarRailItem) => (it.img.kind === "dres" ? Boolean(it.img.front) : Boolean(it.img.jaknaFront));
/** Dječje hlačice na vlastitoj vješalici (dječji dres dolazi s hlačicama). */
export const shortsOf = (it: OrmarRailItem) => (it.img.kind === "dres" ? it.img.shorts : undefined);

// "Yamal nr10 — rozo/plavi" → naslov "Yamal nr10", varijanta "rozo/plavi" (isto kao kartica proizvoda).
export function splitName(igrac: string) {
  const clean = repairText(igrac);
  const [title, ...rest] = clean.split(/\s+[—–]\s+/);
  return { title, variant: rest.join(" — ") };
}

// Naslov i podnaslov točno kao na kartici proizvoda (generički "Komplet" → ime kluba).
export function displayName(item: OrmarItem) {
  const product = item.product;
  const name = splitName(product.igrac);
  const club = repairText(product.klub);
  const generic = !name.title || /^komplet$/i.test(name.title.trim());
  const isKomplet = product.liga === "Komplet";
  const variant = isKomplet ? name.variant.replace(/\s*\([^)]*\)/g, "").trim() : name.variant;
  return { club, title: generic ? club : name.title, variant };
}

/* ---------- filtri ---------- */
export type FilterKey = "sve" | OrmarGroup;

export const FILTERS: { key: FilterKey; label: string }[] = [
  { key: "sve", label: "Sve" },
  { key: "hrvatska", label: "Hrvatska" },
  { key: "reprezentacije", label: "Reprezentacije" },
  { key: "klubovi", label: "Klubovi" },
  { key: "kompleti", label: "Kompleti" },
  { key: "dugi-rukav", label: "Dugi rukav" },
  { key: "trenirke", label: "Trenirke" },
];

export const matchesFilter = (item: OrmarRailItem, f: FilterKey) => f === "sve" || item.group === f;

/* ---------- raspored šipke ---------- */
export type Layout = {
  w: number; // širina dresa u sredini (px)
  maxA: number; // do koje udaljenosti se dres crta
  scaleStep: number;
  minScale: number;
  opacity: number[]; // po udaljenosti 0,1,2,3,4
  blur: number[]; // px prije skaliranja, po udaljenosti 0,1,2 (kao A: mute se samo dva najbliža)
  spread: [number, number]; // x(a) = w * (s0*a - s1*a²)
  // Luk šipke (gledano sprijeda i malo odozgo): elipsa x²/A² … rubovi idu natrag i gore.
  arcA: number; // poluos elipse (px) — veća od pola pozornice
  arcB: number; // koliko se luk digne na "dubini" 1 (px)
  rotK: number; // udio kuta tangente koji se primijeni na rotateY dresa
  rotMax: number; // najveći rotateY (°)
};

export function layoutFor(width: number): Layout {
  const half = width / 2;
  if (width >= 1024) {
    return { w: Math.min(300, Math.round(width * 0.21)), maxA: 4.6, scaleStep: 0.15, minScale: 0.45, opacity: [1, 0.5, 0.28, 0.14, 0.05], blur: [0, 3, 4], spread: [0.86, 0.065], arcA: half / 0.86, arcB: 120, rotK: 0.42, rotMax: 25 };
  }
  if (width >= 640) {
    return { w: 280, maxA: 3.6, scaleStep: 0.17, minScale: 0.45, opacity: [1, 0.48, 0.22, 0.09, 0.03], blur: [0, 3, 4], spread: [0.84, 0.07], arcA: half / 0.86, arcB: 96, rotK: 0.42, rotMax: 25 };
  }
  return { w: Math.round(Math.min(250, Math.max(196, width * 0.6))), maxA: 2.8, scaleStep: 0.2, minScale: 0.45, opacity: [1, 0.46, 0.16, 0.04, 0], blur: [0, 3.5, 4.5], spread: [0.8, 0.07], arcA: Math.max(half / 0.84, 210), arcB: 78, rotK: 0.4, rotMax: 22 };
}

export const lerpArr = (arr: number[], a: number) => {
  const i = Math.min(arr.length - 1, Math.floor(a));
  const j = Math.min(arr.length - 1, i + 1);
  const t = a - Math.floor(a);
  return arr[i] + (arr[j] - arr[i]) * t;
};

// Mali deterministički "hash" — svaki dres ima malo drukčiju duljinu njihala.
export const jitter = (i: number) => {
  const x = Math.sin(i * 12.9898 + 4.1) * 43758.5453;
  return x - Math.floor(x);
};

export const mod = (a: number, n: number) => ((a % n) + n) % n;

// Kružna udaljenost (s predznakom) indeksa i od položaja pos.
export function circDelta(i: number, pos: number, n: number) {
  let d = mod(i - pos, n);
  if (d > n / 2) d -= n;
  return d;
}

/* ---------- luk šipke ---------- */
// "Dubina" točke šipke na x (0 = sprijeda u sredini, raste prema rubovima).
export function arcDepth(x: number, L: Layout) {
  const r = Math.min(0.985, Math.abs(x) / L.arcA);
  return 1 - Math.sqrt(1 - r * r);
}
// Pomak šipke prema gore na x (px, pozitivno = gore).
export const arcRise = (x: number, L: Layout) => L.arcB * arcDepth(x, L);
// Kut tangente luka na x (°) — dres se okrene prema sredini.
export function arcRot(x: number, L: Layout) {
  const r = Math.min(1, Math.abs(x) / L.arcA);
  const deg = (Math.asin(r) * 180) / Math.PI;
  return Math.sign(x) * Math.min(L.rotMax, deg * L.rotK);
}

/* ---------- razmak po "težini" (par trenirke zauzima više mjesta) ---------- */
export type Track = { u: Float64Array; gap: Float64Array; total: number };

export function makeTrack(weights: number[]): Track {
  const n = weights.length;
  const u = new Float64Array(n);
  const gap = new Float64Array(n);
  let acc = 0;
  for (let i = 0; i < n; i++) {
    u[i] = acc;
    gap[i] = (weights[i] + weights[(i + 1) % n]) / 2;
    acc += gap[i];
  }
  return { u, gap, total: acc };
}

// Udaljenost stavke i od položaja pos u "mjestima" (dres = 1), s predznakom, kružno.
export function trackDelta(i: number, pos: number, T: Track) {
  const n = T.u.length;
  const p = mod(pos, n);
  const i0 = Math.floor(p);
  const up = T.u[i0] + (p - i0) * T.gap[i0];
  let d = mod(T.u[i] - up, T.total);
  if (d > T.total / 2) d -= T.total;
  return d;
}

// Položaj, veličina, nagib i prozirnost stavke na udaljenosti d (može biti necijeli broj).
export function placeAt(d: number, L: Layout) {
  const a = Math.abs(d);
  const [s0, s1] = L.spread;
  const ac = Math.min(a, 4);
  let x = L.w * (s0 * ac - s1 * ac * ac);
  if (a > 4) x += L.w * (s0 - 2 * s1 * 4) * (a - 4);
  x *= Math.sign(d);
  const sc = Math.max(L.minScale, 1 - L.scaleStep * a);
  return { a, x, y: -arcRise(x, L), rot: arcRot(x, L), sc, op: lerpArr(L.opacity, a), z: 100 - Math.round(a * 10) };
}

export const placeTransform = (p: { x: number; y: number; rot: number; sc: number }) =>
  `translate3d(${p.x.toFixed(2)}px,${p.y.toFixed(2)}px,0) perspective(1100px) rotateY(${p.rot.toFixed(2)}deg) scale(${p.sc.toFixed(4)})`;
