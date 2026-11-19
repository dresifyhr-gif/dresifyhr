import * as THREE from "three";

import { formatPrice } from "@/lib/utils";

/* ------------------------------------------------------------------ */
/*  Viseća etiketa s cijenom (swing tag) — samostalan modul             */
/* ------------------------------------------------------------------ */
// Prava kartonska etiketa (mat skoro-crni karton sa svjetlijim rubom, metalna ušica,
// tamna voštana vrpca) koja visi s vrata vješalice ili s rukava (mount "rukav": nit
// provučena kroz porub/manžetu, kraće i jače prigušeno njihanje, topli svijetli rub kartona;
// `relocate()` je seli s vrata na rukav i natrag), ispred tkanine (razmak + mekana
// kontaktna sjena). Njihalo: zamah od ubrzanja šipke (prigušena opruga, najviše ±25°),
// lagani zakret oko vrpce. Fokus: etiketa dresa u sredini se okrene prema kameri i
// naraste; sve ostale stoje jednako — zakrenute ~66° prema kameri i prigušene.
//
// Draw callovi po etiketi: tijelo (rub kartona) + lice + poleđina + ušica + 2 niti +
// sjena = 7 (+1 s neonskom crtom na ušici, +1 tamna točka ulaza niti na rukavu). Geometrije i materijali dijeljeni osim
// lica/poleđine/ruba (prigušenje); tekst je u jednom canvas atlasu (dijeljeni GPU izvor).
// Sve je neosvijetljeno (MeshBasic/Matcap, toneMapped:false) → ne ovisi o svjetlima
// scene i ne dira boje odjeće.

/* ---------------------------- dimenzije (m) ---------------------------- */
// Osnovna veličina; fokus je skalira 0.8× (izvan fokusa) → 1.5× (u sredini).
export const TAG_W = 0.066; // širina kartona
export const TAG_H = 0.09; // visina kartona
const TAG_T = 0.0022; // debljina kartona (vidi se kad se zakrene > 30°)
const BEVEL = 0.0004;
const HOLE_R = 0.0034; // rupa
const HOLE_TOP = 0.0092; // središte rupe ispod gornjeg ruba
const CORNER = 0.005; // radijus donjih kutova
const CHAMFER = 0.0095; // skošeni gornji kutovi (klasični oblik etikete)
const CORD_R = 0.00055;
const S_REST = 0.8; // mjerilo izvan fokusa
const S_FOCUS = 1.5; // mjerilo u fokusu
// najveći zamah po mjestu: TAG_MOUNTS[m].maxSwing (vrat ±25°, rukav ±17°)
const FLIP_TIME = 0.26; // s — rubni (ravni) kadar okreta traje < 2 sličice

/* ------------------------------- opcije ------------------------------- */
/** Gdje etiketa visi: s rukava (nit kroz porub/manžetu) ili s vrata kuke vješalice. */
export type TagMount = "rukav" | "vrat";

/** Rub kartona: "soft" = tamnosivi izrez (na crnoj vješalici), "light" = tanki topli svijetli rub (na tamnoj tkanini). */
export type TagEdge = "soft" | "light";

type MountSpec = {
  cord: number; // duljina niti (m)
  gap: number; // razmak točke vješanja od tkanine (m)
  omega: number; // rad/s njihala
  zeta: number; // prigušenje
  maxSwing: number; // rad
  accGain: number; // ubrzanje šipke → kutno ubrzanje
  threaded: boolean; // nit izlazi iz tkanine (dvije rupice + tamna točka) umjesto oko žice
  edge: TagEdge;
};
/** Zadane mjere i fizika po mjestu. */
export const TAG_MOUNTS: Record<TagMount, MountSpec> = {
  // vrat: nit oko žice kuke, karton ispred tijela vješalice
  vrat: { cord: 0.034, gap: 0.024, omega: 7.0, zeta: 0.24, maxSwing: 0.44, accGain: 0.42, threaded: false, edge: "soft" },
  // rukav: kratka nit provučena kroz tkaninu → kraće, brže, jače prigušeno njihanje
  rukav: { cord: 0.019, gap: 0.008, omega: 9.5, zeta: 0.36, maxSwing: 0.3, accGain: 0.3, threaded: true, edge: "light" },
};

export type PriceTagOptions = {
  /** Mjesto vješanja (zadane `cord` i `gap`). Zadano "vrat". */
  mount?: TagMount;
  /** Poleđina (okret dodirom): raspon veličina, npr. "S – XL". */
  sizes?: string;
  /** @deprecated stari format (više redaka); koristi se redak s crticom ili zadnji. */
  back?: string[];
  /** Duljina vrpce od točke vješanja do ušice (m). Zadano 0.034 (≈ 2 cm vidljive niti iznad kartona). */
  cord?: number;
  /** Razmak od točke vješanja do plohe tkanine (m), za kontaktnu sjenu. Zadano 0.024. */
  gap?: number;
  /** Jačina kontaktne sjene 0..1 (0 = karton visi u zraku, ispod nema tkanine). Zadano 1. */
  shadow?: number;
  /** Rub kartona (zadano prema mjestu: vrat "soft", rukav "light"). */
  edge?: TagEdge;
  /** Mjerilo cijele etikete (1 = TAG_W × TAG_H). */
  scale?: number;
  /** Materijal ušice (npr. kromirani materijal scene); zadano: matcap krom bez svjetla. */
  eyelet?: THREE.Material;
  /** Jedini neonski detalj: #e8ff3c tanka crta na rubu ušice. Zadano: isključeno. */
  accent?: boolean;
  /** Sjeme (smjer okreta/pada, faza mikro-njihanja). */
  seed?: number;
  /** Zakret etiketa izvan fokusa, mjereno od smjera kamere (rad). Zadano 1.15 (≈ 66°). */
  restTwist?: number;
  /** Mikro-njihanje u mirovanju. Zadano: uključeno. */
  idle?: boolean;
};

export type PriceTag = {
  /** Dodaj u roditelja (npr. `swing` grupu vješalice) na točku vješanja (vrat kuke). */
  group: THREE.Group;
  /** Tijelo kartona (za mjerenje okvira na ekranu: geometry.boundingBox + matrixWorld). */
  card: THREE.Mesh;
  /** Mreže za raycast (dodir → flip()). */
  hit: THREE.Object3D[];
  /**
   * Korak simulacije. railVelocity = brzina šipke u m/s duž lokalne osi x roditelja
   * (engine: velS); focus01 = 1 za dres u sredini, 0 jedan dres dalje. camera →
   * zakret se mjeri prema kameri (sve etikete izvan fokusa izgledaju jednako, fokusirana
   * gleda točno u kameru). Vraća true dok se vidljivo miče.
   */
  update(dt: number, railVelocity: number, focus01: number, camera?: THREE.Camera): boolean;
  /** Ulaz: etiketa padne s kuke i odskoči na vrpci (nakon `delay` s). */
  drop(delay?: number): void;
  /** Odmah prikaži na mjestu (bez ulaza), npr. kad je ulaz već viđen u ovoj sesiji. */
  show(): void;
  /** Okret na poleđinu (raspon veličina) i natrag. */
  flip(): void;
  /** Kratki udarac (npr. pri dodiru dresa). */
  nudge(strength?: number): void;
  /**
   * Promjena mjesta nakon stvaranja (npr. kad je točka na rukavu poznata tek nakon
   * učitavanja slike): duljina niti, razmak od tkanine, jačina sjene.
   */
  configure(p: TagConfig): void;
  /**
   * Preseli etiketu na novu točku (u prostoru istog roditelja): karton se brzo smanji
   * (0,14 s), pa padne na novo mjesto s kratkim odskokom. Ako je etiketa još skrivena
   * (ulaz nije počeo), premjesti odmah.
   */
  relocate(to: THREE.Vector3, p?: TagConfig): void;
  /** Trenutno mjesto (zadnje primijenjeno). */
  readonly mount: TagMount;
  dispose(): void;
};

export type TagConfig = { mount?: TagMount; cord?: number; gap?: number; shadow?: number; edge?: TagEdge };

/* ------------------------------- fontovi ------------------------------- */
const FALLBACK = `"Helvetica Neue", Helvetica, Arial, sans-serif`;
let DISPLAY = `"Bebas Neue", "Arial Narrow", ${FALLBACK}`;

/**
 * Pozovi jednom prije prvih etiketa (await) s CSS obitelji display fonta stranice:
 * `getComputedStyle(document.body).getPropertyValue("--font-bebas")`.
 * Bebas (uski, visoki brojevi) je odabran jer na istoj širini kartona daje ~40 % više
 * brojke od Barlowa — jedino tako je cijena čitljiva na mobitelu bez goleme etikete.
 * Drugi argument (stari potpis: sans, display) je podržan.
 */
export async function preparePriceTagFonts(a?: string, b?: string) {
  const display = b ?? a;
  if (display && display.trim()) DISPLAY = `${display.trim()}, "Bebas Neue", "Arial Narrow", ${FALLBACK}`;
  try {
    if (typeof document !== "undefined" && document.fonts?.load) {
      await Promise.race([
        document.fonts.load(`100px ${DISPLAY}`, "0123456789 € S–XL"),
        new Promise((r) => setTimeout(r, 2500)),
      ]);
    }
  } catch {
    /* rezervni font */
  }
}

/* -------------------------------- atlas -------------------------------- */
// Stranica 1024² s ćelijama (lice ili poleđina). Ćelija nosi cijeli otisak kartona.
const PAGE = 1024;
const CW = 236; // px
const CH = Math.round((CW * TAG_H) / TAG_W); // ≈ 322
const GUT = 6;
const COLS = Math.floor(PAGE / (CW + GUT * 2));
const ROWS = Math.floor(PAGE / (CH + GUT * 2));

type Page = { canvas: HTMLCanvasElement; ctx: CanvasRenderingContext2D; tex: THREE.CanvasTexture; used: number };
type Cell = { page: Page; col: number; row: number; refs: number };

const CARD_TOP = "#1b1b1a";
const CARD_BOT = "#141413";
const RIM = "#3c3b38"; // svjetliji rub izreza (odvaja karton od crne vješalice)
const RIM_LIGHT = "#d8ccb2"; // topli svjetli rub (karton na tamnoj tkanini: jakna, crni dres)
const rimOf = (e: TagEdge) => (e === "light" ? RIM_LIGHT : RIM);
const INK = "#f4f3ef";
const NEON = "#e8ff3c";

class TagKit {
  refs = 0;
  pages: Page[] = [];
  cells = new Map<string, Cell>();
  faceGeo: THREE.BufferGeometry;
  bodyGeo: THREE.BufferGeometry;
  ringGeo: THREE.BufferGeometry;
  accentGeo: THREE.BufferGeometry;
  cordGeo: THREE.BufferGeometry;
  hitGeo: THREE.BufferGeometry;
  shadowGeo: THREE.BufferGeometry;
  dotGeo: THREE.BufferGeometry;
  dotMat: THREE.MeshBasicMaterial;
  bodyMat: THREE.MeshBasicMaterial;
  cordMat: THREE.MeshBasicMaterial;
  ringMat: THREE.MeshMatcapMaterial;
  accentMat: THREE.MeshBasicMaterial;
  matcap: THREE.CanvasTexture;
  shadowTex: THREE.CanvasTexture;

  constructor() {
    const shape = cardShape();
    const face = new THREE.ShapeGeometry(shape, 10);
    remapUV(face);
    this.faceGeo = face;
    const body = new THREE.ExtrudeGeometry(shape, {
      depth: TAG_T - BEVEL * 2,
      bevelEnabled: true,
      bevelThickness: BEVEL,
      bevelSize: BEVEL * 0.6,
      bevelSegments: 1,
      curveSegments: 10,
    });
    body.translate(0, 0, -(TAG_T - BEVEL * 2) / 2);
    this.bodyGeo = body;
    // ušica: prsten kroz debljinu kartona (viri s obje strane)
    this.ringGeo = new THREE.TorusGeometry(HOLE_R + 0.001, 0.0011, 8, 28);
    this.accentGeo = new THREE.TorusGeometry(HOLE_R + 0.0019, 0.00018, 4, 32);
    // nit: jedinični valjak s vrhom u ishodištu (skalira se po y)
    const cord = new THREE.CylinderGeometry(CORD_R, CORD_R, 1, 5, 1, true);
    cord.translate(0, -0.5, 0);
    this.cordGeo = cord;
    // nevidljiva veća ploha za dodir (lakše pogoditi prstom)
    this.hitGeo = new THREE.PlaneGeometry(TAG_W * 1.6, TAG_H * 1.35).translate(0, -TAG_H / 2 + HOLE_TOP, 0);
    this.shadowGeo = new THREE.PlaneGeometry(1, 1);
    // ulaz niti u tkaninu: mala tamna elipsa (dvije rupice jedna do druge)
    this.dotGeo = new THREE.CircleGeometry(0.0015, 12).scale(1.9, 1, 1);
    this.dotMat = new THREE.MeshBasicMaterial({ color: 0x0b0a09, transparent: true, opacity: 0.8, depthWrite: false, toneMapped: false, fog: false });

    this.bodyMat = new THREE.MeshBasicMaterial({ color: new THREE.Color("#4a4844"), toneMapped: false, fog: false });
    this.cordMat = new THREE.MeshBasicMaterial({ color: new THREE.Color("#4a443d"), toneMapped: false, fog: false });
    this.matcap = chromeMatcap();
    this.ringMat = new THREE.MeshMatcapMaterial({ matcap: this.matcap, toneMapped: false, fog: false });
    this.accentMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(NEON), toneMapped: false, fog: false });
    this.shadowTex = shadowTexture();
  }

  private newPage(): Page {
    const canvas = document.createElement("canvas");
    canvas.width = canvas.height = PAGE;
    const ctx = canvas.getContext("2d")!;
    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.anisotropy = 4;
    tex.generateMipmaps = true;
    tex.minFilter = THREE.LinearMipmapLinearFilter;
    const p = { canvas, ctx, tex, used: 0 };
    this.pages.push(p);
    return p;
  }

  cell(key: string, draw: (g: CanvasRenderingContext2D, w: number, h: number) => void, rim = RIM): Cell {
    const hit = this.cells.get(key);
    if (hit) {
      hit.refs++;
      return hit;
    }
    let page = this.pages.find((p) => p.used < COLS * ROWS);
    if (!page) page = this.newPage();
    const idx = page.used++;
    const col = idx % COLS;
    const row = Math.floor(idx / COLS);
    const x0 = col * (CW + GUT * 2);
    const y0 = row * (CH + GUT * 2);
    const g = page.ctx;
    g.save();
    // rub boje i u žlijeb (bez svijetlih rubova pri mipmapama)
    g.fillStyle = rim;
    g.fillRect(x0, y0, CW + GUT * 2, CH + GUT * 2);
    g.translate(x0 + GUT, y0 + GUT);
    g.beginPath();
    g.rect(0, 0, CW, CH);
    g.clip();
    draw(g, CW, CH);
    g.restore();
    page.tex.needsUpdate = true;
    const c: Cell = { page, col, row, refs: 1 };
    this.cells.set(key, c);
    return c;
  }

  release(key: string) {
    const c = this.cells.get(key);
    if (c) c.refs--; // ćelije ostaju u atlasu (malo ih je: po jedna za svaku cijenu)
  }

  cellTexture(c: Cell): THREE.Texture {
    const t = c.page.tex.clone(); // isti izvor (jedan upload), vlastiti offset/repeat
    t.repeat.set(CW / PAGE, CH / PAGE);
    t.offset.set((c.col * (CW + GUT * 2) + GUT) / PAGE, 1 - (c.row * (CH + GUT * 2) + GUT + CH) / PAGE);
    t.needsUpdate = true;
    return t;
  }

  dispose() {
    for (const g of [this.faceGeo, this.bodyGeo, this.ringGeo, this.accentGeo, this.cordGeo, this.hitGeo, this.shadowGeo, this.dotGeo]) g.dispose();
    for (const m of [this.bodyMat, this.cordMat, this.ringMat, this.accentMat, this.dotMat]) m.dispose();
    this.matcap.dispose();
    this.shadowTex.dispose();
    for (const p of this.pages) p.tex.dispose();
    this.pages = [];
    this.cells.clear();
  }
}

let KIT: TagKit | null = null;
const kit = () => (KIT ??= new TagKit());

/* ------------------------------ geometrija ------------------------------ */
// Ishodište = središte rupe (ušice). Karton visi prema dolje (−y).
const TOP = HOLE_TOP;
const BOT = HOLE_TOP - TAG_H;

function outline(p: { moveTo(x: number, y: number): void; lineTo(x: number, y: number): void; quadraticCurveTo(a: number, b: number, x: number, y: number): void }, inset = 0) {
  const w = TAG_W / 2 - inset;
  const t = TOP - inset;
  const b = BOT + inset;
  const r = CORNER;
  const c = CHAMFER;
  p.moveTo(-w + r, b);
  p.lineTo(w - r, b);
  p.quadraticCurveTo(w, b, w, b + r);
  p.lineTo(w, t - c);
  p.lineTo(w - c, t);
  p.lineTo(-w + c, t);
  p.lineTo(-w, t - c);
  p.lineTo(-w, b + r);
  p.quadraticCurveTo(-w, b, -w + r, b);
}

function cardShape() {
  const s = new THREE.Shape();
  outline(s);
  const hole = new THREE.Path();
  hole.absarc(0, 0, HOLE_R, 0, Math.PI * 2, true);
  s.holes.push(hole);
  return s;
}

function remapUV(g: THREE.BufferGeometry) {
  const pos = g.attributes.position as THREE.BufferAttribute;
  const uv = g.attributes.uv as THREE.BufferAttribute;
  for (let i = 0; i < pos.count; i++) {
    uv.setXY(i, (pos.getX(i) + TAG_W / 2) / TAG_W, (pos.getY(i) - BOT) / TAG_H);
  }
  uv.needsUpdate = true;
}

function chromeMatcap() {
  const S = 64;
  const c = document.createElement("canvas");
  c.width = c.height = S;
  const g = c.getContext("2d")!;
  const gr = g.createLinearGradient(0, 0, 0, S);
  gr.addColorStop(0, "#ffffff");
  gr.addColorStop(0.35, "#d6d5d1");
  gr.addColorStop(0.5, "#6b6a66");
  gr.addColorStop(0.62, "#e2e1dc");
  gr.addColorStop(1, "#5b5a56");
  g.fillStyle = gr;
  g.fillRect(0, 0, S, S);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

function shadowTexture() {
  // mekani zaobljeni pravokutnik (zamućen), alfa kanal
  const S = 64;
  const c = document.createElement("canvas");
  c.width = c.height = S;
  const g = c.getContext("2d")!;
  g.filter = "blur(7px)";
  g.fillStyle = "#000";
  g.beginPath();
  g.roundRect?.(16, 14, S - 32, S - 28, 6);
  if (!g.roundRect) g.rect(16, 14, S - 32, S - 28);
  g.fill();
  const t = new THREE.CanvasTexture(c);
  return t;
}

/* ------------------------------- otisak -------------------------------- */
// kanvas koordinate: x 0..w lijevo→desno, y 0..h odozgo; kontura kartona u px
function canvasOutline(g: CanvasRenderingContext2D, w: number, h: number, insetPx: number) {
  const k = w / TAG_W;
  const map = (x: number, y: number): [number, number] => [(x + TAG_W / 2) * k, (TOP - y) * k];
  g.beginPath();
  outline(
    {
      moveTo: (x, y) => g.moveTo(...map(x, y)),
      lineTo: (x, y) => g.lineTo(...map(x, y)),
      quadraticCurveTo: (a, b, x, y) => {
        const [ax, ay] = map(a, b);
        const [px, py] = map(x, y);
        g.quadraticCurveTo(ax, ay, px, py);
      },
    },
    insetPx / k
  );
  g.closePath();
}

function paper(g: CanvasRenderingContext2D, w: number, h: number, seed: number, rim = RIM) {
  g.fillStyle = rim;
  g.fillRect(0, 0, w, h);
  // karton malo uvučen → ~3 px svjetlijeg ruba po konturi (izrezani rub)
  canvasOutline(g, w, h, 3.2);
  const gr = g.createLinearGradient(0, 0, 0, h);
  gr.addColorStop(0, CARD_TOP);
  gr.addColorStop(1, CARD_BOT);
  g.fillStyle = gr;
  g.fill();
  // zrno kartona (vrlo suptilno)
  let s = seed * 9301 + 49297;
  const rnd = () => ((s = (s * 9301 + 49297) % 233280) / 233280);
  g.save();
  g.clip();
  for (let i = 0; i < 900; i++) {
    g.fillStyle = rnd() > 0.5 ? "rgba(255,255,255,0.025)" : "rgba(0,0,0,0.14)";
    g.fillRect(rnd() * w, rnd() * h, 1.2, 1.2);
  }
  g.restore();
  // rub izreza rupe (isti svjetliji ton)
  const k = w / TAG_W;
  g.strokeStyle = rim;
  g.lineWidth = 3;
  g.beginPath();
  g.arc(w / 2, HOLE_TOP * k, HOLE_R * k + 1.5, 0, Math.PI * 2);
  g.stroke();
}

type Fit = { size: number; width: number; cap: number };
const track = (sz: number) => -sz * 0.01; // malo uže slaganje

/** Najveća veličina fonta za jedan redak unutar širine maxW i visine verzala maxCap. */
function fit(g: CanvasRenderingContext2D, text: string, maxW: number, maxCap: number): Fit {
  let size = 400;
  let width = 0;
  let cap = 0;
  for (; size > 20; size -= 2) {
    g.font = `${size}px ${DISPLAY}`;
    width = g.measureText(text).width + track(size) * ([...text].length - 1);
    cap = g.measureText("0").actualBoundingBoxAscent || size * 0.7;
    if (width <= maxW && cap <= maxCap) break;
  }
  return { size, width, cap };
}

/** Redak centriran po širini i po visini verzala oko cy (svi znakovi iste visine). */
function line(g: CanvasRenderingContext2D, w: number, text: string, f: Fit, cy: number) {
  g.textBaseline = "alphabetic";
  g.textAlign = "left";
  g.font = `${f.size}px ${DISPLAY}`;
  g.fillStyle = INK;
  let x = (w - f.width) / 2;
  for (const ch of [...text]) {
    g.fillText(ch, x, cy + f.cap / 2);
    x += g.measureText(ch).width + track(f.size);
  }
}

// "20€" (formatPrice) → "20 €": € iste visine kao brojke, uski razmak
const priceText = (price: number) => `${formatPrice(price).replace(/\s*€\s*$/, "")}\u2009€`;

function priceFit(g: CanvasRenderingContext2D, w: number, h: number, price: number) {
  const k = w / TAG_W;
  const holeBottom = (HOLE_TOP + HOLE_R) * k;
  const num = formatPrice(price).replace(/\s*€\s*$/, "");
  const text = priceText(price);
  g.font = `100px ${DISPLAY}`;
  const ratio = g.measureText(num).width / Math.max(1, g.measureText(text).width);
  // brojke ~52 % širine kartona ("20"), cijeli redak najviše 84 %
  const maxW = Math.min(w * 0.84, (w * 0.52) / Math.max(0.3, ratio));
  return { text, fit: fit(g, text, maxW, (h - holeBottom) * 0.62), cy: holeBottom + (h - holeBottom) * 0.5 };
}

function drawFront(price: number, rim = RIM) {
  return (g: CanvasRenderingContext2D, w: number, h: number) => {
    paper(g, w, h, price, rim);
    const p = priceFit(g, w, h, price);
    line(g, w, p.text, p.fit, p.cy);
  };
}

function drawBack(sizes: string, seed: number, rim = RIM) {
  return (g: CanvasRenderingContext2D, w: number, h: number) => {
    paper(g, w, h, seed + 7, rim);
    // isto mjerilo tipa kao cijena (visina verzala kao "20 €"), uže samo ako je duže
    const ref = priceFit(g, w, h, 20);
    line(g, w, sizes, fit(g, sizes, w * 0.86, ref.fit.cap), ref.cy);
  };
}

/* ------------------------------- pomoćno ------------------------------- */
const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v));
const smooth = (t: number) => {
  const x = clamp(t, 0, 1);
  return x * x * (3 - 2 * x);
};
const easeInOut = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
const _v = new THREE.Vector3();
const _q = new THREE.Quaternion();
const DOWN = new THREE.Vector3(0, -1, 0);

function sizesFrom(opts: PriceTagOptions): string | null {
  if (opts.sizes) return opts.sizes;
  const b = opts.back?.filter(Boolean);
  if (!b?.length) return null;
  return b.find((l) => /[–-]/.test(l) && !/djec/i.test(l)) ?? b[b.length - 1];
}

/* ------------------------------- tvornica ------------------------------ */
export function createPriceTag(price: number, opts: PriceTagOptions = {}): PriceTag {
  const K = kit();
  K.refs++;
  const seed = opts.seed ?? price;
  const sgn = Math.sin(seed * 12.9898 + 1.3) >= 0 ? 1 : -1;
  const ph0 = (Math.sin(seed * 78.233) * 0.5 + 0.5) * Math.PI * 2;
  let mount: TagMount = opts.mount ?? "vrat";
  let spec = TAG_MOUNTS[mount];
  let L = opts.cord ?? spec.cord;
  let gap = opts.gap ?? spec.gap;
  let edge: TagEdge = opts.edge ?? spec.edge;
  let shadowK = clamp(opts.shadow ?? 1, 0, 1);
  // isti smjer i kut za sve etikete (mjereno od kamere) → red izgleda namjerno
  const restTwist = opts.restTwist ?? 1.15;
  const idle = opts.idle !== false;

  const sizes = sizesFrom(opts) ?? formatPrice(price);
  // otisak po vrsti ruba (lijeno: druga varijanta tek kad zatreba)
  const skins = new Map<TagEdge, { front: THREE.Texture; back: THREE.Texture; keys: [string, string] }>();
  const skin = (e: TagEdge) => {
    let sk = skins.get(e);
    if (!sk) {
      const rim = rimOf(e);
      const fk = `f:${price}:${e}`;
      const bk = `b:${sizes}:${e}`;
      sk = {
        front: K.cellTexture(K.cell(fk, drawFront(price, rim), rim)),
        back: K.cellTexture(K.cell(bk, drawBack(sizes, seed, rim), rim)),
        keys: [fk, bk],
      };
      skins.set(e, sk);
    }
    return sk;
  };
  const frontMat = new THREE.MeshBasicMaterial({ map: skin(edge).front, toneMapped: false, fog: false });
  const backMat = new THREE.MeshBasicMaterial({ map: skin(edge).back, toneMapped: false, fog: false });
  // prigušenje izvan fokusa: isti skalar na lice, poleđinu i rub (bez pomaka tona)
  const bodyMat = K.bodyMat.clone();
  const BODY_SOFT = bodyMat.color.clone();
  const BODY_LIGHT = new THREE.Color("#b4a88f");
  const bodyBase = (edge === "light" ? BODY_LIGHT : BODY_SOFT).clone();
  const shadowMat = new THREE.MeshBasicMaterial({
    color: 0x000000,
    alphaMap: K.shadowTex,
    transparent: true,
    opacity: 0.4,
    depthWrite: false,
    toneMapped: false,
    fog: false,
  });

  /* hijerarhija:
     group (točka vješanja na vratu kuke)
       ├ shadow (na plohi tkanine, z = −gap)
       └ pend (njihalo: rotation.z = lijevo/desno, rotation.x = naprijed/natrag)
           ├ cordA, cordB (petlja oko žice → ušica)
           └ hang (y = −duljina vrpce; zakret oko vrpce + okret na poleđinu)
               └ card (mjerilo fokusa; ishodište = ušica)
                   ├ body, face, back, ring, [accent], hitPlane */
  const group = new THREE.Group();
  group.name = "price-tag";
  const shadow = new THREE.Mesh(K.shadowGeo, shadowMat);
  shadow.position.z = -gap + 0.0015;
  shadow.renderOrder = 11;
  group.add(shadow);
  // ulaz niti u tkaninu (samo kad je nit provučena kroz rukav)
  const dot = new THREE.Mesh(K.dotGeo, K.dotMat);
  dot.renderOrder = 11;
  group.add(dot);
  const pend = new THREE.Group();
  pend.rotation.order = "ZXY";
  group.add(pend);
  const cordA = new THREE.Mesh(K.cordGeo, K.cordMat);
  const cordB = new THREE.Mesh(K.cordGeo, K.cordMat);
  pend.add(cordA, cordB);
  const hang = new THREE.Group();
  pend.add(hang);
  const card = new THREE.Group();
  const s0 = opts.scale ?? 1;
  card.scale.setScalar(s0 * S_REST);
  hang.add(card);
  const body = new THREE.Mesh(K.bodyGeo, bodyMat);
  const face = new THREE.Mesh(K.faceGeo, frontMat);
  face.position.z = TAG_T / 2 + 0.00006;
  const back = new THREE.Mesh(K.faceGeo, backMat);
  back.rotation.y = Math.PI;
  back.position.z = -TAG_T / 2 - 0.00006;
  const ring = new THREE.Mesh(K.ringGeo, opts.eyelet ?? K.ringMat);
  const hitMat = new THREE.MeshBasicMaterial({ visible: false });
  const hitPlane = new THREE.Mesh(K.hitGeo, hitMat);
  card.add(body, face, back, ring, hitPlane);
  const meshes: THREE.Mesh[] = [body, face, back, ring, cordA, cordB];
  body.geometry.computeBoundingBox();
  if (opts.accent) {
    const a1 = new THREE.Mesh(K.accentGeo, K.accentMat);
    a1.position.z = TAG_T / 2 + 0.0002;
    card.add(a1);
    meshes.push(a1);
  }
  for (const m of meshes) m.renderOrder = 12;
  hitPlane.userData.priceTag = true;

  /* stanje */
  let th = 0, thV = 0; // lijevo/desno (oko z)
  let ph = 0, phV = 0; // naprijed/natrag (oko x)
  let tw = restTwist, twV = 0; // zakret oko vrpce
  let flSide = 0; // 0 lice, 1 poleđina (cilj)
  let flP = 1; // napredak okreta 0..1 (prema flSide)
  let flFrom = 0, flTo = 0, flAng = 0;
  let foc = 0; // izglađeni fokus
  let lastVel = 0, acc = 0;
  let t = ph0;
  // pad: y = udaljenost ušice ispod točke vješanja
  let y = L, yV = 0, dropDelay = -1, dropping = false;
  let dropFrom = -0.07;
  let lastDim = -1;
  let disposed = false;
  // preseljenje (relocate): smanji → premjesti → padni
  let move: { to: THREE.Vector3; p?: TagConfig } | null = null;
  let outP = 0;
  let fade = 1;

  // vrat: ω 7 rad/s (period ≈ 0,9 s), ζ 0,24 (smiri se u ~2–3 zamaha);
  // rukav: kraća nit kroz tkaninu → brže i jače prigušeno, manji zamah
  const DRAG_GAIN = 0.018; // stalni otklon dok se šipka vozi (otpor zraka)

  function placeCords(len: number) {
    const tip = new THREE.Vector3(0, -len + HOLE_R * 0.5, 0);
    // vrat: petlja oko žice (jedna nit ispred, druga iza); rukav: obje niti izlaze iz
    // tkanine kroz dvije rupice tik jedna do druge (z = −gap) i spajaju se u ušici
    const zIn = -gap + 0.0012;
    const tops = spec.threaded
      ? [new THREE.Vector3(0.0014, 0.0004, zIn), new THREE.Vector3(-0.0014, 0.0004, zIn)]
      : [new THREE.Vector3(0.0012, 0, 0.0016), new THREE.Vector3(-0.0012, 0, -0.0016)];
    dot.position.set(0, 0.0004, -gap + 0.0009);
    dot.visible = spec.threaded;
    for (const [m, top] of [
      [cordA, tops[0]],
      [cordB, tops[1]],
    ] as const) {
      const d = tip.clone().sub(top);
      const l = Math.max(1e-4, d.length());
      m.position.copy(top);
      m.quaternion.copy(_q.setFromUnitVectors(DOWN, d.divideScalar(l)));
      m.scale.set(1, l, 1);
      m.visible = len > 0.004;
    }
  }
  placeCords(L);
  hang.position.y = -L;

  function setDim(f: number) {
    // percepcijski 0.55 → 1 (sRGB) → linearno ^2.2
    const mul = Math.pow(0.55 + 0.45 * f, 2.2);
    if (Math.abs(mul - lastDim) < 0.004) return;
    lastDim = mul;
    frontMat.color.setScalar(mul);
    backMat.color.setScalar(mul);
    bodyMat.color.copy(bodyBase).multiplyScalar(mul);
  }
  setDim(0);

  function placeShadow(scale: number, hangLen: number) {
    // središte kartona u prostoru `group` (samo zamah lijevo/desno), malo dolje-desno
    const r = hangLen + (TAG_H / 2 - HOLE_TOP) * scale;
    shadow.position.x = Math.sin(th) * r + 0.003;
    shadow.position.y = -Math.cos(th) * r - 0.007;
    shadow.rotation.z = th;
    const ang = tw + flAng;
    const across = 0.3 + 0.7 * Math.abs(Math.cos(ang));
    shadow.scale.set(TAG_W * scale * across * 1.55, TAG_H * scale * 1.45, 1);
    // dalje od tkanine (zamah naprijed) → slabija sjena
    shadowMat.opacity = 0.45 * shadowK * clamp(1 + ph * 2.2, 0.35, 1) * (group.visible ? 1 : 0) * fade;
    dot.scale.setScalar(Math.max(0.001, fade));
  }

  function startDrop(from: number, kick: number) {
    group.visible = true;
    dropping = true;
    dropFrom = from;
    y = from;
    yV = 0;
    twV = sgn * 6 * kick;
    thV = sgn * 0.8 * kick;
  }

  const tag: PriceTag = {
    group,
    card: body,
    hit: [hitPlane],
    update(dtIn, railVelocity, focus01, camera) {
      if (disposed) return false;
      const dt = Math.min(0.05, Math.max(0, dtIn));
      if (dt <= 0) return false;
      t += dt;
      // ubrzanje šipke (izglađeno)
      const rawA = (railVelocity - lastVel) / dt;
      lastVel = railVelocity;
      acc += (clamp(rawA, -30, 30) - acc) * Math.min(1, dt * 20);

      // fokus (izglađen → mekani prijelazi)
      foc += (clamp(focus01, 0, 1) - foc) * Math.min(1, dt * 6);
      const f = smooth(foc);
      const sFoc = s0 * (S_REST + (S_FOCUS - S_REST) * f);

      /* ---------- pad (ulaz) ---------- */
      let moving = false;
      let dropScale = 1;
      fade = 1;
      if (move) {
        moving = true;
        outP = Math.min(1, outP + dt / 0.14);
        fade = 1 - smooth(outP);
        if (outP >= 1) {
          group.position.copy(move.to);
          const p = move.p;
          move = null;
          if (p) tag.configure(p);
          startDrop(-0.03, 0.5); // kratki pad na novo mjesto
          fade = 1;
        }
      }
      if (dropDelay >= 0) {
        dropDelay -= dt;
        group.visible = false;
        moving = true;
        if (dropDelay < 0) startDrop(-0.07, 1); // kreće iznad točke vješanja i padne na vrpcu
      }
      if (dropping) {
        moving = true;
        const sub = 4;
        const h = dt / sub;
        for (let i = 0; i < sub; i++) {
          if (y < L) yV += 4.2 * h; // pad (usporena gravitacija — čitljiv pokret)
          else yV += (-2400 * (y - L) - 34 * yV) * h; // vrpca se napne → odskok
          y += yV * h;
        }
        if (Math.abs(y - L) < 2e-4 && Math.abs(yV) < 0.01) {
          y = L;
          yV = 0;
          dropping = false;
        }
        hang.position.y = -y;
        placeCords(Math.min(y, L));
        dropScale = 0.85 + 0.15 * smooth((y - dropFrom) / (L - dropFrom));
      }

      /* ---------- njihalo (lijevo/desno), najviše ±25° ---------- */
      const w2 = spec.omega * spec.omega;
      const c = 2 * spec.zeta * spec.omega;
      const MAX_SWING = spec.maxSwing;
      const breeze = idle ? 0.01 * Math.sin(t * 0.9) + 0.006 * Math.sin(t * 2.1 + 1.7) : 0;
      const lean = clamp(-railVelocity * DRAG_GAIN, -0.12, 0.12);
      thV += (-w2 * (th - lean - breeze) - c * thV - acc * spec.accGain * Math.cos(th)) * dt;
      th += thV * dt;
      // meki graničnik: iznad ~20° jače prigušenje, tvrdo ±25°
      if (Math.abs(th) > MAX_SWING * 0.8 && th * thV > 0) thV *= Math.exp(-14 * dt);
      if (Math.abs(th) > MAX_SWING) {
        th = Math.sign(th) * MAX_SWING;
        thV *= -0.2;
      }
      // naprijed/natrag: miruje lagano naslonjena prema van (ne ulazi u tkaninu)
      const phRest = -0.05 + (idle ? 0.006 * Math.sin(t * 1.3 + 0.6) : 0);
      phV += (-w2 * 0.9 * (ph - phRest) - c * 1.2 * phV - Math.abs(acc) * 0.12) * dt;
      ph += phV * dt;
      if (ph > 0.02) {
        ph = 0.02;
        phV = -Math.abs(phV) * 0.3; // dodir s dresom
      }
      ph = Math.max(ph, -0.35);
      pend.rotation.set(ph, 0, th);

      /* ---------- zakret oko vrpce (mjeren od smjera kamere) ---------- */
      let toCam = 0;
      if (camera) {
        camera.getWorldPosition(_v);
        pend.worldToLocal(_v);
        toCam = Math.atan2(_v.x, _v.z);
      }
      const twTarget = toCam + restTwist * (1 - f);
      twV += (-30 * (tw - twTarget) - 3.4 * twV + thV * 0.7 * sgn) * dt;
      tw += twV * dt;

      /* ---------- okret (flip): kratki tween + mali "pop" na 90° ---------- */
      let pop = 0;
      if (flP < 1) {
        flP = Math.min(1, flP + dt / FLIP_TIME);
        flAng = flFrom + (flTo - flFrom) * easeInOut(flP);
        pop = Math.sin(flP * Math.PI) * 0.07;
        moving = true;
      } else flAng = flTo;
      hang.rotation.set(0, tw + flAng, 0);

      /* ---------- mjerilo, svjetlina, sjena ---------- */
      const sc = Math.max(1e-3, sFoc * dropScale * (1 + pop) * fade);
      card.scale.setScalar(sc);
      setDim(f);
      placeShadow(sc, dropping ? Math.max(0, Math.min(y, L)) : L);

      const busy =
        moving ||
        Math.abs(thV) > 0.02 ||
        Math.abs(twV) > 0.02 ||
        Math.abs(th - lean) > 0.03 ||
        Math.abs(tw - twTarget) > 0.01 ||
        Math.abs(foc - focus01) > 0.01;
      return busy;
    },
    drop(delay = 0) {
      dropDelay = Math.max(0, delay);
      group.visible = false;
      dropping = false;
      shadowMat.opacity = 0;
    },
    show() {
      dropDelay = -1;
      dropping = false;
      y = L;
      yV = 0;
      hang.position.y = -L;
      placeCords(L);
      group.visible = true;
    },
    flip() {
      flSide = flSide ? 0 : 1;
      flFrom = flAng;
      flTo = flSide ? Math.PI * sgn : 0;
      flP = 0;
      thV += 0.35 * sgn;
    },
    configure(p) {
      const m = p.mount ? TAG_MOUNTS[p.mount] : null;
      if (p.mount && m) {
        mount = p.mount;
        spec = m;
      }
      const cord = p.cord ?? m?.cord;
      const g = p.gap ?? m?.gap;
      if (cord != null) L = cord;
      if (g != null) {
        gap = g;
        shadow.position.z = -gap + 0.0015;
      }
      if (p.shadow != null) shadowK = clamp(p.shadow, 0, 1);
      const e = p.edge ?? m?.edge;
      if (e && e !== edge) {
        edge = e;
        const sk = skin(e);
        frontMat.map = sk.front;
        backMat.map = sk.back;
        frontMat.needsUpdate = backMat.needsUpdate = true;
        bodyBase.copy(e === "light" ? BODY_LIGHT : BODY_SOFT);
        lastDim = -1;
      }
      th = clamp(th, -spec.maxSwing, spec.maxSwing);
      if (!dropping) {
        y = L;
        hang.position.y = -L;
      }
      placeCords(dropping ? Math.max(0, Math.min(y, L)) : L);
    },
    relocate(to, p) {
      if (dropDelay >= 0 || !group.visible) {
        // još skrivena (čeka ulaz) → odmah na novo mjesto
        move = null;
        group.position.copy(to);
        if (p) tag.configure(p);
        return;
      }
      move = { to: to.clone(), p };
      outP = 0;
    },
    get mount() {
      return mount;
    },
    nudge(strength = 1) {
      thV += (Math.random() - 0.5) * 1.6 * strength;
      twV += sgn * 2 * strength;
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      group.removeFromParent();
      for (const sk of skins.values()) {
        sk.front.dispose();
        sk.back.dispose();
        K.release(sk.keys[0]);
        K.release(sk.keys[1]);
      }
      frontMat.dispose();
      backMat.dispose();
      bodyMat.dispose();
      hitMat.dispose();
      shadowMat.dispose();
      K.refs--;
      if (K.refs <= 0) {
        K.dispose();
        KIT = null;
      }
    },
  };
  return tag;
}

/**
 * Točka vješanja na vješalici s fotografije, u prostoru `swing` grupe dijela na šipki:
 * vrat kuke (ravni dio žice ispod zavoja, ~6,4 % visine slike od vrha), 2,4 cm ispred
 * plohe odjeće. Karton tada visi ispred tijela vješalice, gornji rub odmah ispod kuke,
 * donji rub tik do šava ovratnika (~20 % visine slike).
 * imageTopY = y gornjeg ruba slike u `swing` (engine: frameTop − def.top·H),
 * planeH = visina slike (m), clothZ = z plohe odjeće, neckX = x žice (zadano 0).
 */
export function tagAnchor(imageTopY: number, planeH: number, clothZ: number, out = new THREE.Vector3(), neckX = 0) {
  return out.set(neckX, imageTopY - planeH * 0.064, clothZ + 0.024);
}

/**
 * Točka vješanja na rukavu, u prostoru `swing` grupe dijela: (u, v) iz `sleeveAnchorFrom`
 * (normalizirano na sliku), malo ispred plohe tkanine. Ploha u engineu je savijena
 * (`bentPlane(pw, ph, sag)`: z = −sag·x², x = −1..1), pa se z prati po toj krivulji.
 * imageTopY = y gornjeg ruba slike, planeW/planeH = mjere slike (m), clothZ = z sredine
 * plohe, sag = savijanje plohe (engine 0.035, ravna ploha 0), gap = TAG_MOUNTS.rukav.gap.
 */
export function tagAnchorSleeve(
  imageTopY: number,
  planeW: number,
  planeH: number,
  clothZ: number,
  a: { u: number; v: number },
  out = new THREE.Vector3(),
  sag = 0,
  gap = TAG_MOUNTS.rukav.gap
) {
  const xn = clamp((a.u - 0.5) * 2, -1, 1);
  return out.set(xn * (planeW / 2), imageTopY - a.v * planeH, clothZ - sag * xn * xn + gap);
}
