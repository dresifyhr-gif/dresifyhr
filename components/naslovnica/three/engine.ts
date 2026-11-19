// 3D "noćna trgovina" (vanilla three.js): kromirana zaobljena šipka s dresovima (svaki
// komad je njihalo oko kuke), stalak s loptama (prave sfere + jednostavna 3D fizika:
// gravitacija, odskok, kotrljanje, zidovi, sudari) i stalak s kapama. Reflektori s
// lažnim volumetrijskim snopom, LED traka ispod šipke, lakirani pod s mekim odrazom.
// Petlja crta SAMO dok je platno vidljivo i dok se nešto miče (inače spava).
import * as THREE from "three";
import { Reflector } from "three/examples/jsm/objects/Reflector.js";

import {
  FLOOR_REFLECT_SHADER,
  ballMaterial,
  bentPlane,
  coneMaterial,
  glowMaterial,
  imageSize,
  ledFallMaterial,
  ledLineMaterial,
  maskFabric,
  loadTexture,
  garmentMaterial,
  gridPlane,
  type GarmentUniforms,
  floorSpillTexture,
  makeEnvironment,
  poolTexture,
  radialTexture,
  scallopTexture,
  tubeAlong,
} from "./parts";
import { DepthOfField } from "./dof";
import { CLOTH_C, CLOTH_R, ClothSim } from "./cloth";
import { createPriceTag, preparePriceTagFonts, tagAnchor, type PriceTag } from "./price-tag";
import { WET_FLOOR_SHADER, concreteWallMaterial, graffitiMaterial, loadGraffiti, neonGlowTexture, wetConcreteFloorMaterial, type GraffitiArt } from "./graffiti";
import { SLAT, type WallKind, flippedPlane, letterFlick, loadSignFont, makeSignArt, signFaceMaterial, signHaloMaterial, slatTexture, wallMaterial, wallNoiseTexture } from "./sign";

/* ------------------------------------------------------------------ */
/*  Tipovi                                                             */
/* ------------------------------------------------------------------ */
export type EnginePiece = {
  src: string;
  dx: number; // pomak kuke od sredine stavke (u visinama okvira H)
  top: number; // vrh slike ispod vrha okvira (udio H)
  height: number; // visina slike (udio H)
  drawHook: boolean; // hlače bez kuke → 3D kuka
  barY: number; // gdje je šipka-vješalica hlača (udio H) — kraj docrtane kuke
};
export type EngineItem = {
  slug: string;
  weight: number;
  aspect: number;
  pieces: EnginePiece[];
  /** Cijena (€) → viseća etiketa na glavnom komadu (dres / jakna). Bez cijene nema etikete. */
  price?: number;
  /** Poleđina etikete (okret dodirom): raspon veličina, npr. "S – XL". */
  sizes?: string;
  /** Smije li etiketa na rukav (?etiketa=rukav): ne za komplete i mystery. */
  sleeve?: boolean;
};

export type EngineEvents = {
  onActive: (i: number) => void;
  onOpen: (i: number) => void;
  onJuggle: (count: number) => void;
  onStreakEnd: (count: number) => void;
  onMix: (kind: "lopta" | "kapa", club: string) => void;
  onAnyFree: (any: boolean) => void;
  onDrag: () => void;
  onFirstFrame: () => void;
};

export type EngineOptions = {
  balls: string[]; // klubovi (lopte na stalku, slijeva)
  caps: string[]; // klubovi (kape, red po red)
  ballSrc: (club: string) => string;
  capSrc: (club: string) => string;
  mobile: boolean;
  dprCap: number;
  /** CSS popis obitelji fonta za natpis (var(--font-bebas)); prazno → rezervni font. */
  signFont?: string;
  /** Vlastiti izvor natpisa za scenu "grafit" (zadano: PNG grafita). Smjer FINAL ga ionako
   *  zamijeni logotipom ili sakrije → daje praznu kopiju bez skidanja slike. */
  grafArt?: (font: string, maxW: number) => Promise<GraffitiArt>;
  /** Ravna fotografija dresa (bez dubinskog reljefa i simulacije tkanine; njihanje vješalice
   *  ostaje). Zadano: false (reljef + tkanina). */
  flat?: boolean;
  /** Dubinska oštrina (post-process). Zadano: true. false → bez DOF prolaza, MSAA na platnu. */
  dof?: boolean;
  /** Odraz poda u stvarnom vremenu (drugi prolaz scene). Zadano: true. */
  reflect?: boolean;
};

/* ------------------------------------------------------------------ */
/*  Konstante scene (metri)                                            */
/* ------------------------------------------------------------------ */
const RAIL_Y = 1.8;
const RAIL_R = 0.017;
// z = -K·x² (luk prema gledatelju); šipka od -U do U (x). Scena "grafit": skoro ravna šipka
// od zida do zida (krajevi izvan kadra) — postavlja se u konstruktoru prije gradnje.
let CURVE_K = 0.2;
let RAIL_U = 3.6;
// Scena "grafit": šipka je ravna uz zid, a u sredini se blago izboči prema kameri (kao
// zakrivljena izložbena šipka). Dres u sredini zato visi stvarno bliže → veći po perspektivi
// i jedini u ravnini oštrine; susjedi su dublje (mekši po fizici objektiva). Svi i dalje
// vise NA šipki.
let BOW = 0; // m prema kameri u sredini
let BOW_W = 1; // širina izbočine (m)
const H = 1.12; // visina okvira slike (dres + vješalica)
const HOOK_INNER = 5 / 900;
const CLOTH_Z = RAIL_R + 0.006; // odjeća ispred šipke
const SP = 0.74; // razmak stavki (m) po jedinici "težine"
// Scena "grafit": jedan junak u sredini (veći, ~1,4× susjeda), susjedi stupnjevito manji —
// kao na konceptu. Mjerilo se mijenja glatko s pomakom d (u jedinicama težine), a položaj na
// šipki je integral mjerila (veći dres zauzme više šipke → nema preklapanja). Svaka stavka i
// dalje visi NA šipki (mjerilo oko kuke).
const HERO_A = 0.46; // dodatak mjerila u sredini
const HERO_W = 0.6; // širina "brijega" (d)
const SIDE_B = 0.15; // koliko se daleki dresovi smanje
const SIDE_C = 1.7;
const SP_G = 0.8;
const heroScale = (d: number) => 1 + HERO_A / (1 + (d / HERO_W) ** 2) - (SIDE_B * d * d) / (d * d + SIDE_C * SIDE_C);
const heroPos = (d: number) => d + HERO_A * HERO_W * Math.atan(d / HERO_W) - SIDE_B * (d - SIDE_C * Math.atan(d / SIDE_C));
let ROT_K = 0.85; // udio kuta tangente za okret dresa
const G = 11.5; // malo jača gravitacija → živahnije žongliranje
const BALL_R0 = 0.11;
const BEST_KEY = "dresify:zongliranje-rekord";
const WALL_Z = -2.1; // zid s letvicama i natpisom iza šipke
// Ulazni niz "svjetla se pale" (~1,8 s): LED linija šipke se upali slijeva nadesno, zatim
// natpis, pa reflektori "padnu" kao stadionski (kratki bljesak snopa pa mirno), na kraju
// odsjaj klizne po kromu. Jednom po sesiji; dodir/kotačić preskače; reduced-motion → odmah.
const INTRO_END = 1.9; // s
const INTRO_KEY = "dresify:3d-svjetla";
// Scena "grafit" (zadana; ?scena=staro → stara scena sa svjetlima): ulaz je sprejanje grafita
// (~1,45 s slijeva nadesno) + kapljice koje cure nakon toga.
const GRAF_INTRO_END = 2.8; // s (sprej + kapljice; dresovi/kamera i dalje INTRO_END)
const GRAF_INTRO_KEY = "dresify:3d-grafit";
// vodoravni pomak grafita (udio širine slike): slova u sredini kadra, ne cijela slika
const GRAF_DX = -0.025;
// Neutralno bijelo svjetlo (~5500 K): bez žutog/jantarnog tona, nigdje.
const LIGHT = new THREE.Color(1.0, 0.985, 0.965);
const LIGHT_COOL = new THREE.Color(0.95, 0.97, 1.0);
// Zadani stražnji zid (?zid=0 letvice, ?zid=1 kanelirani kamen, ?zid=2 mikrocement).
const DEFAULT_WALL: WallKind = 1;

const ease3 = (t: number) => 1 - Math.pow(1 - Math.min(1, Math.max(0, t)), 3);
const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v));
const lerpArr = (arr: number[], a: number) => {
  const i = Math.min(arr.length - 1, Math.floor(a));
  const j = Math.min(arr.length - 1, i + 1);
  const t = a - Math.floor(a);
  return arr[i] + (arr[j] - arr[i]) * t;
};
const jitter = (i: number) => {
  const x = Math.sin(i * 12.9898 + 4.1) * 43758.5453;
  return x - Math.floor(x);
};
// Stadionski reflektor: naglo upali s malim "prebačajem" pa se smiri na 1.
const slam = (t: number, on: number) => {
  const x = t - on;
  if (x < 0) return 0;
  if (x < 0.05) return (x / 0.05) * 1.3;
  return 1 + 0.3 * Math.exp(-(x - 0.05) / 0.11);
};
// Bljesak vidljivog snopa pri paljenju: 0 → 1 → nestane.
const beamFlash = (t: number, on: number) => {
  const x = t - on;
  if (x < 0) return 0;
  return Math.min(1, x / 0.04) * Math.exp(-x / 0.22);
};
// Fronta LED paljenja (x na šipki): od lijevog do desnog kraja, ease-in-out.
const sweepAt = (t: number) => {
  const k = Math.min(1, Math.max(0, (t - 0.1) / 0.62));
  const e = k * k * (3 - 2 * k);
  return -RAIL_U - 0.4 + e * (2 * RAIL_U + 1.2);
};

/* ---------- luk šipke ---------- */
const bowAt = (u: number) => Math.exp(-((u / BOW_W) ** 2));
const zOf = (u: number) => -CURVE_K * u * u + BOW * bowAt(u);
const dzOf = (u: number) => -2 * CURVE_K * u - ((2 * u) / (BOW_W * BOW_W)) * BOW * bowAt(u);
// duljina luka (od u = 0, s predznakom): tablica + linearna interpolacija
const ARC_STEP = 0.005;
let arcTab = new Float64Array(2);
let arcU0 = 0;
function buildArc() {
  const n = Math.ceil((2 * RAIL_U + 2) / ARC_STEP) + 1;
  arcU0 = -RAIL_U - 1;
  arcTab = new Float64Array(n);
  for (let i = 1; i < n; i++) {
    const um = arcU0 + (i - 0.5) * ARC_STEP;
    arcTab[i] = arcTab[i - 1] + Math.sqrt(1 + dzOf(um) ** 2) * ARC_STEP;
  }
  const s0 = arcAbs(0);
  for (let i = 0; i < n; i++) arcTab[i] -= s0;
}
function arcAbs(u: number) {
  const f = (u - arcU0) / ARC_STEP;
  const i = Math.max(0, Math.min(arcTab.length - 2, Math.floor(f)));
  return arcTab[i] + (arcTab[i + 1] - arcTab[i]) * (f - i);
}
function uOf(s: number) {
  let lo = 0;
  let hi = arcTab.length - 1;
  if (s <= arcTab[0]) return arcU0 + (s - arcTab[0]);
  if (s >= arcTab[hi]) return arcU0 + hi * ARC_STEP + (s - arcTab[hi]);
  while (hi - lo > 1) {
    const mid = (lo + hi) >> 1;
    if (arcTab[mid] < s) lo = mid;
    else hi = mid;
  }
  return arcU0 + (lo + (s - arcTab[lo]) / Math.max(1e-9, arcTab[hi] - arcTab[lo])) * ARC_STEP;
}
const faceAngle = (u: number) => Math.atan(dzOf(u)) * ROT_K;

/* ------------------------------------------------------------------ */
/*  Pomoćne geometrije                                                 */
/* ------------------------------------------------------------------ */
// Cilindar između dvije točke (noge, prečke).
// Okomiti alfa gradijent (dno neprozirno → vrh prozirno) za spoj zida i poda.
function linearAlphaTexture() {
  const c = document.createElement("canvas");
  c.width = 4;
  c.height = 128;
  const g = c.getContext("2d")!;
  const lg = g.createLinearGradient(0, 0, 0, 128);
  lg.addColorStop(0, "rgba(255,255,255,0)");
  lg.addColorStop(0.55, "rgba(255,255,255,0.55)");
  lg.addColorStop(1, "rgba(255,255,255,1)");
  g.fillStyle = lg;
  g.fillRect(0, 0, 4, 128);
  const t = new THREE.CanvasTexture(c);
  t.flipY = false; // redak 0 = vrh … ravnina: v=0 dolje → okreni
  t.repeat.set(1, -1);
  t.offset.set(0, 1);
  return t;
}

// Dubinska mapa odjeće (public/ormar/depth/<mapa>/<ime>.webp) za sliku s vješalice.
function depthSrcOf(src: string): string | null {
  const m = /^(.*\/ormar\/)(hanger|hanger-front|hlacice)\/([^/?#]+\.webp)(?:[?#].*)?$/.exec(src);
  return m ? `${m[1]}depth/${m[2]}/${m[3]}` : null;
}

function rod(a: THREE.Vector3, b: THREE.Vector3, r: number, mat: THREE.Material, seg = 12) {
  const len = a.distanceTo(b);
  const m = new THREE.Mesh(new THREE.CylinderGeometry(r, r, len, seg, 1), mat);
  m.position.copy(a).add(b).multiplyScalar(0.5);
  m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), b.clone().sub(a).normalize());
  return m;
}

type Piece = {
  def: EnginePiece;
  root: THREE.Group; // na šipki, okrenut prema luku
  swing: THREE.Group; // njihalo (theta u ravnini, phi naprijed/natrag)
  mesh: THREE.Mesh | null;
  hook: THREE.Mesh | null;
  mat: THREE.MeshBasicMaterial | null;
  // volumen + tkanina: uniforme materijala, simulacija, razina detalja mreže
  gu: GarmentUniforms | null;
  cloth: ClothSim | null;
  depthSrc: string | null;
  lod: 0 | 1;
  halfW: number;
  planeH: number;
  theta: number;
  omega: number;
  phi: number;
  phiV: number;
  k: number;
  lastA: number;
  loadId: number;
  // viseća etiketa s cijenom (samo glavni komad = zadnji: dres ili jakna, ne hlače)
  tag: PriceTag | null;
  neck: THREE.Vector3 | null; // točka vješanja na vratu kuke (prostor `swing`)
  sleeve: { pos: THREE.Vector3; shadow: number } | null | undefined; // undefined = još nije izračunato
  onSleeve: boolean;
};
type ItemView = { index: number; pieces: Piece[] };

type Ball = {
  club: string;
  slot: number;
  state: "rack" | "free" | "home" | "off";
  p: THREE.Vector3;
  v: THREE.Vector3;
  w: THREE.Vector3;
  mesh: THREE.Mesh;
  shadow: THREE.Mesh;
  grounded: boolean;
  lastEvt: number;
  home0: THREE.Vector3;
  homeT: number;
};

type Cap = {
  club: string;
  root: THREE.Group;
  swing: THREE.Group;
  mesh: THREE.Mesh | null;
  theta: number;
  omega: number;
  phi: number;
  phiV: number;
  hookWorld: THREE.Vector3;
};

/* ------------------------------------------------------------------ */
/*  Engine                                                             */
/* ------------------------------------------------------------------ */
export class StoreEngine {
  private canvas: HTMLCanvasElement;
  private ev: EngineEvents;
  private opt: EngineOptions;
  private renderer: THREE.WebGLRenderer;
  private scene = new THREE.Scene();
  private camera = new THREE.PerspectiveCamera(34, 1, 0.1, 40);
  private env: THREE.Texture;
  private chrome: THREE.MeshPhysicalMaterial;
  private chromeDark: THREE.MeshPhysicalMaterial;
  private reflector: Reflector;
  private shadowTex: THREE.Texture;
  private reflectPass: THREE.Object3D["onBeforeRender"];
  private noop: THREE.Object3D["onBeforeRender"] = () => {};

  // svjetla
  private hemi: THREE.HemisphereLight;
  private fill: THREE.DirectionalLight;
  private key: THREE.SpotLight;
  private rackSpot: THREE.SpotLight;
  private capSpot: THREE.SpotLight;
  private backSpot: THREE.SpotLight;
  private keyCone: THREE.Mesh;
  private rackCone: THREE.Mesh;
  private capCone: THREE.Mesh;
  private ledTube!: THREE.Mesh;
  private ledGlow!: THREE.Mesh;
  private scallops: THREE.Mesh[] = [];
  private keyPool: THREE.Mesh;
  private floorSpill: THREE.Mesh | null = null;
  private spark!: THREE.Mesh; // "glava" paljenja LED linije (svijetla crtica koja projuri šipkom)
  private standPools: THREE.Mesh[] = [];

  // zid s natpisom + gobo
  private signGroup = new THREE.Group();
  private signFace: THREE.Mesh | null = null;
  private signHalo: THREE.Mesh | null = null;
  private ownTex: THREE.Texture[] = [];
  private wallKind: WallKind = DEFAULT_WALL;
  private wallNoise: THREE.Texture | null = null;
  private wallMat: THREE.ShaderMaterial | null = null;
  private wallTop = 3.2;
  // scena "grafit"
  private graf = true;
  private graffiti: THREE.Mesh | null = null;
  private grafArt: GraffitiArt | null = null;
  private ledParts: THREE.Object3D[] = [];
  private neonWall: THREE.Mesh | null = null;
  private floorY = 0;
  private neonFloor: THREE.Mesh | null = null;
  private grafReady = -1; // performance.now() kad je grafit spreman (ulaz kreće od tad)
  private grafDone = false;
  debugGrafT = -1;
  // dubinska oštrina (null → izravno crtanje, stari "mip" fokus)
  private dof: DepthOfField | null = null;
  private focusP = new THREE.Vector3(0, RAIL_Y - 0.5, 0);

  // šipka
  private items: EngineItem[] = [];
  private track = { u: new Float64Array(0), gap: new Float64Array(0), total: 1 };
  private views = new Map<number, ItemView>();
  private pieceState = new Map<string, { theta: number; omega: number; phi: number; phiV: number }>();
  private pos = 0;
  private vel = 0;
  private target = 0;
  private mode: "rest" | "drag" | "spring" | "glide" = "rest";
  private lastVelS = 0;
  private active = -1;
  private maxA = 5;
  private taken: string | null = null;
  private texCache = new Map<string, { tex: THREE.Texture | null; p: Promise<THREE.Texture> | null; used: number; refs: number }>();
  private texLimit: number;
  private abort = new AbortController();
  private railGroup = new THREE.Group();

  // pod
  private rack = new THREE.Group();
  private rackSlots: THREE.Vector3[] = []; // lokalno (jedinice r)
  private rackW = 1;
  private rackBarY = 4.4;
  private ballR = BALL_R0;
  private laneZ = 0.8; // dubina "trake" po kojoj se žonglira
  private narrow = false;
  private balls: Ball[] = [];
  private stand = new THREE.Group();
  private caps: Cap[] = [];
  private standBox = { x0: 0, x1: 0, top: 0, z0: 0, z1: 0 };
  private rackBox = { x0: 0, x1: 0, top: 0, z0: 0, z1: 0 };
  private contact: THREE.Mesh[] = [];
  private streak = 0;
  private best = 0;
  private lastTap: { id: string; t: number } | null = null;
  private tapTimer: ReturnType<typeof setTimeout> | null = null;

  // kamera
  private camBase = new THREE.Vector3(0, 1.6, 6);
  private look = new THREE.Vector3(0, 1.2, 0);
  private par = { x: 0, y: 0, tx: 0, ty: 0 };
  private pxPerM = 200;
  private tanH = 0.5;
  private zFront = 1.6;
  private yTop = 2.3;
  private W = 1;
  private Hpx = 1;

  // petlja
  private raf: number | null = null;
  private last = 0;
  private visible = false;
  private forced = 0;
  private t0 = -1; // početak ulaznog niza
  private introDone = false;
  private firstFrame = false;
  private disposed = false;
  private stats = { frames: 0, cpu: [] as number[] };

  // unos
  private ray = new THREE.Raycaster();
  private ndc = new THREE.Vector2();
  private drag = { id: -1, x0: 0, y0: 0, pos0: 0, on: false, lx: 0, lt: 0, v: 0, decided: false };
  private wheelTimer: ReturnType<typeof setTimeout> | null = null;
  private hoverAt = 0;

  // viseće etikete s cijenom (?etiketa=rukav → etiketa dresa u sredini na rukavu, ?etiketa=0 → bez)
  private tagMode: "vrat" | "rukav" | "off" = "vrat";
  private tagFont = false; // font (Bebas) spreman → etikete se smiju crtati
  private tagPhase: "wait" | "done" = "wait"; // ulaz etiketa (pad) — nakon spreja grafita
  private tagAt = 0;

  // odjeća: sjenčanje (?tkanina=0 → ravna fotografija), manje pokreta, vožnja kamere
  private shadeOn = 1;
  private reduced = false;
  private zoom = 0; // 0 = u pokretu, 1 = šipka miruje → kamera se primakne dresu u sredini
  private clothT = 0;
  private idleSkip = 0;

  constructor(canvas: HTMLCanvasElement, events: EngineEvents, opts: EngineOptions) {
    this.canvas = canvas;
    this.ev = events;
    this.opt = opts;
    // dres + njegova dubinska mapa (256 px) → dvostruko unosa
    this.texLimit = opts.mobile ? 34 : 54;
    let useDof = true;
    let dofDebug = false;
    try {
      const q = new URLSearchParams(window.location.search);
      const z = q.get("zid");
      if (z === "0" || z === "1" || z === "2") this.wallKind = Number(z) as WallKind;
      if (q.get("scena") === "staro") this.graf = false;
      if (q.get("dof") === "0") useDof = false;
      if (opts.dof === false) useDof = false;
      const et = q.get("etiketa");
      if (et === "0" || et === "ne") this.tagMode = "off";
      else if (et === "rukav") this.tagMode = "rukav";
      dofDebug = q.get("dof") === "coc";
    } catch {
      /* bez URL-a */
    }
    // grafit: potpuno ravna kromirana šipka od zida do zida (krajevi daleko izvan kadra)
    CURVE_K = this.graf ? 0 : 0.2;
    RAIL_U = this.graf ? 9 : 3.6;
    BOW = this.graf ? (opts.mobile ? 0.42 : 0.55) : 0;
    BOW_W = opts.mobile ? 0.85 : 1.0;
    ROT_K = this.graf ? 0.5 : 0.85;
    buildArc();
    try {
      const q = new URLSearchParams(window.location.search);
      if (q.get("tkanina") === "0") this.shadeOn = 0;
      if (q.get("luk") === "0") {
        BOW = 0;
        buildArc();
      }
    } catch {
      /* bez URL-a */
    }
    this.reduced = typeof window.matchMedia === "function" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    // grafit: na sceni su samo dresovi i grafit (bez stalaka s loptama i kapama)
    if (this.graf) this.opt = opts = { ...opts, balls: [], caps: [] };
    // s DOF-om se scena crta u MSAA cilj → platnu antialias ne treba (ušteda memorije)
    const r = new THREE.WebGLRenderer({ canvas, antialias: !useDof, alpha: false, powerPreference: "high-performance", stencil: true });
    r.outputColorSpace = THREE.SRGBColorSpace;
    r.toneMapping = THREE.NeutralToneMapping;
    r.toneMappingExposure = 1.0;
    r.setClearColor(new THREE.Color("#0a0a0a"), 1);
    this.renderer = r;
    if (useDof) {
      try {
        this.dof = new DepthOfField(r, { mobile: opts.mobile, debug: dofDebug });
      } catch (err) {
        console.warn("[3d] dof off", err);
        this.dof = null;
      }
    }
    try {
      const v = Number(window.localStorage.getItem(BEST_KEY) || 0);
      if (Number.isFinite(v) && v > 0) this.best = v;
    } catch {
      /* privatni prozor */
    }

    if (this.graf) {
      if (this.dof) {
        // zid s grafitom: samo dašak mekoće (grafit oštar kao na konceptu), dresovi sa strane
        // i dalje mutni (bočni dio CoC-a)
        this.dof.wall.z = WALL_Z;
        this.dof.wall.max = opts.mobile ? 0.0009 : 0.0011;
        // Junak (u sredini, na izbočini šipke) potpuno oštar; susjedi ~0,4-0,5 m dublje i
        // ~1 m bočno → jasno mekani, ali prepoznatljivi (broj i boja se čitaju).
        this.dof.k.back = opts.mobile ? 0.016 : 0.018;
        this.dof.k.front = 0.006;
        this.dof.k.lat = opts.mobile ? 0.0055 : 0.0062;
        this.dof.k.max = opts.mobile ? 0.0105 : 0.0125;
        this.dof.k.dead = 0.09;
        this.dof.k.latDead = 0.46;
      }
    }
    this.env = makeEnvironment(r);
    this.chrome = new THREE.MeshPhysicalMaterial({
      color: 0xffffff,
      metalness: 1,
      roughness: 0.07,
      envMap: this.env,
      envMapIntensity: 1.35,
      clearcoat: 1,
      clearcoatRoughness: 0.03,
    });
    this.chromeDark = new THREE.MeshPhysicalMaterial({ color: 0x2a2b2f, metalness: 0.9, roughness: 0.35, envMap: this.env, envMapIntensity: 0.6 });
    this.shadowTex = radialTexture([
      [0, "rgba(0,0,0,0.9)"],
      [0.45, "rgba(0,0,0,0.5)"],
      [1, "rgba(0,0,0,0)"],
    ]);

    // grafit: bez magle (kamera je dalje, krom šipke ne smije potamnjeti); pod/zid imaju vlastiti pad
    if (!this.graf) this.scene.fog = new THREE.Fog(new THREE.Color("#0a0a0a"), 5.2, 10);

    /* ---------- prostor ---------- */
    // šum (mokre mrlje, pruge, zrno) — dijele ga pod, odraz i zid
    const floorNoise = this.graf ? wallNoiseTexture() : null;
    if (floorNoise) this.ownTex.push(floorNoise);
    const floor = new THREE.Mesh(
      new THREE.PlaneGeometry(40, 40),
      // polirani crni pod: tamna baza, odsjaji dolaze iz odraza (Reflector) i lokvi reflektora
      this.graf
        ? // mokri beton: vidljiva hrapava siva baza s prugama (svjetlije uz zid), odraz povrh
          wetConcreteFloorMaterial(floorNoise!, WALL_Z)
        : new THREE.MeshStandardMaterial({ color: new THREE.Color("#060607"), roughness: 0.38, metalness: 0.2, envMap: this.env, envMapIntensity: 0.07 })
    );
    floor.rotation.x = -Math.PI / 2;
    // grafit: pod tik ispod ruba junaka (kao na konceptu) — odraz kreće odmah ispod dresa
    if (this.graf) this.floorY = RAIL_Y + RAIL_R - heroScale(0) * H - 0.03;
    floor.position.y = this.floorY;
    this.scene.add(floor);

    this.reflector = new Reflector(new THREE.PlaneGeometry(16, 9), {
      textureWidth: 256,
      textureHeight: 256,
      multisample: 0,
      clipBias: 0.002,
      color: 0xffffff,
      shader: this.graf ? WET_FLOOR_SHADER : FLOOR_REFLECT_SHADER,
    });
    const rt = this.reflector.getRenderTarget();
    rt.texture.generateMipmaps = true;
    rt.texture.minFilter = THREE.LinearMipmapLinearFilter;
    const rm = this.reflector.material as THREE.ShaderMaterial;
    rm.transparent = true;
    rm.blending = THREE.AdditiveBlending;
    rm.depthWrite = false;
    // šum (mokre mrlje, valovi) — isti kao zid; postavlja se nakon kloniranja uniformi
    if (floorNoise) rm.uniforms.tNoise.value = floorNoise;
    this.reflectPass = this.reflector.onBeforeRender;
    this.reflector.rotation.x = -Math.PI / 2;
    this.reflector.position.set(0, this.floorY + 0.0015, -0.5);
    this.reflector.renderOrder = -1;
    this.scene.add(this.reflector);
    if (opts.reflect === false) this.reflector.visible = false;

    const wall = new THREE.Mesh(
      new THREE.PlaneGeometry(30, 9),
      new THREE.MeshStandardMaterial({ color: new THREE.Color("#0e0e0f"), roughness: 0.95, metalness: 0 })
    );
    wall.position.set(0, 4.5, -3.4);
    this.scene.add(wall);
    // Zid iza šipke. 0: tamne drvene letvice na crnom filcu; 1: kanelirani crni kamen;
    // 2: tamni mikrocement. 1/2 imaju vlastito (analitičko) svjetlo: skrivena LED linija
    // iznad kadra klizi niz zid + mekana lokva iza dresa u fokusu. Bez magle.
    const SW = SLAT * 8 * 22; // širina = cijeli broj pločica → rubovi letvica na x = k·SLAT
    let backWall: THREE.Mesh;
    if (this.graf) {
      // goli tamni beton (šum dijeli s podom)
      this.wallNoise = floorNoise;
      backWall = new THREE.Mesh(new THREE.PlaneGeometry(26, 6), concreteWallMaterial(floorNoise!, this.floorY));
    } else if (this.wallKind === 0) {
      const slat = slatTexture();
      slat.repeat.set(22, 6);
      backWall = new THREE.Mesh(
        new THREE.PlaneGeometry(SW, 6),
        new THREE.MeshStandardMaterial({ map: slat, color: new THREE.Color(0.3, 0.3, 0.3), roughness: 0.82, metalness: 0, fog: false })
      );
      this.ownTex.push(slat);
    } else {
      const noise = wallNoiseTexture();
      this.wallNoise = noise;
      this.ownTex.push(noise);
      this.wallMat = wallMaterial(this.wallKind, noise);
      backWall = new THREE.Mesh(new THREE.PlaneGeometry(SW, 6), this.wallMat);
    }
    backWall.position.set(0, 3, WALL_Z);
    this.scene.add(backWall);
    // spoj zida i poda: mekani mrak pri dnu (pod je u magli → bez tvrdog ruba)
    const baseTex = linearAlphaTexture();
    this.ownTex.push(baseTex);
    const wallBase = new THREE.Mesh(
      new THREE.PlaneGeometry(SW, 1.6),
      new THREE.MeshBasicMaterial({ color: 0x0a0a0a, map: baseTex, transparent: true, depthWrite: false, fog: false })
    );
    wallBase.position.set(0, 0.8, WALL_Z + 0.03);
    wallBase.renderOrder = 1;
    // zid 1/2 imaju vlastito svjetlo uz pod (linija/uplight) → bez tamne trake preko njega
    wallBase.visible = this.wallKind === 0 && !this.graf;
    this.scene.add(wallBase);
    if (this.wallKind !== 0 && !this.graf) {
      // svjetlo s linije uz dno zida razlije se po poliranom podu prema šipki (popuni
      // prazninu ispod dresova mekim "horizontom", bez sive plohe)
      const spill = floorSpillTexture();
      this.ownTex.push(spill);
      const fs = new THREE.Mesh(new THREE.PlaneGeometry(SW * 0.62, 1.8), glowMaterial(spill, LIGHT.clone(), 0));
      fs.rotation.set(-Math.PI / 2, 0, Math.PI);
      // redak 0 teksture (uz zid) → stražnji rub plohe (rotacija oko z okrene v)
      fs.position.set(0, 0.0025, WALL_Z + 0.9);
      (fs.material as THREE.MeshBasicMaterial).fog = false;
      fs.renderOrder = 1;
      this.floorSpill = fs;
      this.scene.add(fs);
    }
    if (this.wallKind === 0 && !this.graf) {
      const sc = scallopTexture();
      this.ownTex.push(sc);
      for (const x of [-3.9, -2.45, 2.45, 3.9]) {
        const m = new THREE.Mesh(new THREE.PlaneGeometry(1.5, 3.1), glowMaterial(sc, LIGHT.clone(), 0));
        (m.material as THREE.MeshBasicMaterial).fog = false;
        m.position.set(x, 3.55 - 1.55, WALL_Z + 0.01);
        m.userData.base = 0.075;
        this.scallops.push(m);
        this.scene.add(m);
        // mala svjetiljka na stropu iznad svakog scallopa
        const can = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.06, 0.08, 16), this.chromeDark);
        can.position.set(x, 3.59, WALL_Z + 0.08);
        this.scene.add(can);
      }
    }
    this.scene.add(this.signGroup);
    // Natpis: čeka font stranice (slova se crtaju u canvas), zatim se ugrađuje.
    loadSignFont(opts.signFont).then((font) => {
      if (this.disposed) return;
      if (this.graf) this.buildGraffiti(font);
      else this.buildSign(font);
    });

    /* ---------- svjetla ---------- */
    // Galerijsko svjetlo: hladno-neutralni ambijent odozgo, mekani frontalni fill (stalci i
    // krom se čitaju), precizni reflektori s užim penumbra rubom (čiste lokve, ne mrlje).
    this.hemi = new THREE.HemisphereLight(new THREE.Color("#b9c2cf"), new THREE.Color("#0b0b0c"), 0);
    this.scene.add(this.hemi);
    this.fill = new THREE.DirectionalLight(LIGHT_COOL.clone(), 0);
    this.fill.position.set(-1.5, 2.5, 6);
    this.scene.add(this.fill);

    this.key = new THREE.SpotLight(LIGHT.clone(), 0, 0, 0.34, 0.5, 1.6);
    this.key.position.set(0, 4.6, 2.3);
    this.key.target.position.set(0, 1.35, 0);
    this.scene.add(this.key, this.key.target);
    this.rackSpot = new THREE.SpotLight(LIGHT.clone(), 0, 0, 0.4, 0.45, 1.6);
    this.capSpot = new THREE.SpotLight(LIGHT.clone(), 0, 0, 0.4, 0.45, 1.6);
    this.scene.add(this.rackSpot, this.rackSpot.target, this.capSpot, this.capSpot.target);
    this.backSpot = new THREE.SpotLight(LIGHT.clone(), 0, 0, 0.42, 1, 1.6);
    this.backSpot.position.set(0, 4.2, -1.9);
    this.backSpot.target.position.set(0, 0, -0.9);
    this.scene.add(this.backSpot, this.backSpot.target);

    this.keyCone = new THREE.Mesh(new THREE.ConeGeometry(1, 1, 40, 1, true), coneMaterial(LIGHT.clone()));
    this.rackCone = new THREE.Mesh(new THREE.ConeGeometry(1, 1, 32, 1, true), coneMaterial(LIGHT.clone()));
    this.capCone = new THREE.Mesh(new THREE.ConeGeometry(1, 1, 32, 1, true), coneMaterial(LIGHT.clone()));
    for (const c of [this.keyCone, this.rackCone, this.capCone]) {
      // nakon odjeće (renderOrder ≤ 10) + stencil maska: snop ne prelazi preko tkanine
      c.renderOrder = 12;
      maskFabric(c.material as THREE.Material);
      this.scene.add(c);
    }
    // galerijska lokva svjetla na poliranom podu ispod dresa u sredini (oštar eliptični rub)
    this.keyPool = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), glowMaterial(poolTexture(), LIGHT.clone(), 0));
    this.keyPool.rotation.x = -Math.PI / 2;
    this.keyPool.position.y = 0.003;
    this.scene.add(this.keyPool);
    // mekane lokve svjetla ispod stalaka (reflektori stalaka "slete" na pod)
    const poolTex = (this.keyPool.material as THREE.MeshBasicMaterial).map!;
    this.ownTex.push(poolTex);
    for (let i = 0; i < 2; i++) {
      const m = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), glowMaterial(poolTex, LIGHT.clone(), 0));
      m.rotation.x = -Math.PI / 2;
      m.position.y = 0.002;
      this.standPools.push(m);
      this.scene.add(m);
    }

    if (this.graf) {
      // bez vidljivih svjetala: nema snopova, lokvi ni rasvjetnih tijela
      for (const o of [this.keyCone, this.rackCone, this.capCone, this.keyPool, ...this.standPools]) o.visible = false;
    }
    this.buildRail();
    if (this.graf) for (const o of this.ledParts) o.visible = false;
    if (!this.graf) {
      this.buildRack();
      this.buildStand();
    } else {
      // jedino dodatno "svjetlo": jedva vidljiv neonski odsjaj IFY na zidu ispod slova i na podu
      const glow = neonGlowTexture();
      this.ownTex.push(glow);
      const mk = () => {
        const m = new THREE.Mesh(
          new THREE.PlaneGeometry(1, 1),
          new THREE.MeshBasicMaterial({ map: glow, color: new THREE.Color("#e8ff3c"), transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false, fog: false })
        );
        m.renderOrder = -3;
        m.layers.set(1);
        this.scene.add(m);
        return m;
      };
      this.neonWall = mk();
      this.neonFloor = mk();
      this.neonFloor.rotation.x = -Math.PI / 2;
      this.neonWall.visible = this.neonFloor.visible = false;
    }
    this.scene.add(this.railGroup, this.rack, this.stand);

    // Odraz poda crta samo "pravu" geometriju (sloj 0); snopovi, sjaj, sjene, zid i pod su
    // na sloju 1 — vidi ih samo glavna kamera (jeftiniji odraz).
    (this.reflector as unknown as { getReflectionCamera: (c: THREE.Camera) => THREE.Camera }).getReflectionCamera(this.camera).layers.enable(2);
    this.camera.layers.enable(1);
    const fx: THREE.Object3D[] = [floor, wall, backWall, wallBase, this.keyCone, this.rackCone, this.capCone, this.keyPool, ...this.standPools, this.ledGlow, ...this.scallops];
    if (this.floorSpill) fx.push(this.floorSpill);
    for (const o of fx) o.layers.set(1);
    if (this.graf && this.wallNoise) {
      // mokri pod odražava i goli beton (meki prijelaz zid → pod, kao na konceptu); kopija
      // zida vidljiva samo kameri odraza
      const wm = concreteWallMaterial(this.wallNoise, this.floorY);
      wm.uniforms.uLevel.value *= 0.75; // pod ostaje tamniji od zida
      const wr = new THREE.Mesh(backWall.geometry, wm);
      wr.layers.set(2);
      backWall.add(wr);
    }
    for (const b of this.balls) b.shadow.layers.set(1);
    this.rack.traverse((o) => {
      if ((o as THREE.Mesh).isMesh && (o as THREE.Mesh).material instanceof THREE.MeshBasicMaterial) o.layers.set(1);
    });
    this.stand.traverse((o) => {
      const m = o as THREE.Mesh;
      if (m.isMesh && (m.material instanceof THREE.MeshBasicMaterial || (m.material as THREE.Material).transparent)) o.layers.set(1);
    });

    this.bind();
    // etikete s cijenom: tek kad je font (Bebas) spreman
    if (this.tagMode !== "off") {
      preparePriceTagFonts(opts.signFont)
        .catch(() => {})
        .then(() => {
          if (this.disposed) return;
          this.tagFont = true;
          this.forced = Math.max(this.forced, 2);
          this.wake();
        });
    }
  }

  /* ================================================================== */
  /*  Gradnja                                                            */
  /* ================================================================== */
  // Zidni natpis (halo slova). (Gobo znak na podu je uklonjen — čišći pod.)
  private buildSign(font: string) {
    const art = makeSignArt(font);
    this.ownTex.push(art.faces, ...art.halo);
    const w = 1; // jedinična širina lica; grupa se skalira u resize()
    const h = w / art.aspect;
    // lica slova odmaknuta od zida (distanceri) → sjaj se vidi oko slova
    const face = new THREE.Mesh(flippedPlane(w, h), signFaceMaterial(art.faces, art.cuts, art.texel));
    face.position.z = 0.045;
    face.renderOrder = 0;
    face.layers.set(1);
    // odraz u podu: ista slova, slabija (zaseban sloj koji vidi samo kamera odraza)
    const fm = face.material as THREE.ShaderMaterial;
    const rm = signFaceMaterial(art.faces, art.cuts, art.texel);
    rm.uniforms.uOn = fm.uniforms.uOn;
    rm.uniforms.uK.value = 0.1;
    const faceRefl = new THREE.Mesh(face.geometry, rm);
    faceRefl.position.z = face.position.z;
    faceRefl.layers.set(2);
    this.signGroup.add(faceRefl);
    const halo = new THREE.Mesh(flippedPlane(w * (1 + 2 * art.padX), h * (1 + 2 * art.padY)), signHaloMaterial(art.halo[0], art.halo[1], this.wallKind, this.wallNoise));
    halo.position.z = 0.004;
    // sjaj (aditivni) uvijek prije lica: inače se letvice iz sjaja iscrtaju preko lica slova
    halo.renderOrder = -1;
    halo.layers.set(1); // sjaj nije u odrazu poda (lica jesu)
    this.signGroup.add(halo, face);
    this.signFace = face;
    this.signHalo = halo;
    this.signGroup.userData.aspect = art.aspect;
    this.signCap = art.capFrac;

    this.placeSign();
    this.forced = Math.max(this.forced, 2);
    this.wake();
  }

  // Grafit na zidu (scena "grafit"): PNG ili nadomjestak → decal ispred betona. Na sloju 0 →
  // vidi ga i odraz poda (neon u lokvama).
  private buildGraffiti(font: string) {
    (this.opt.grafArt ?? loadGraffiti)(font, this.opt.mobile ? 1280 : 2048).then((art) => {
      if (this.disposed) return;
      const tex = new THREE.CanvasTexture(art.canvas);
      tex.colorSpace = THREE.SRGBColorSpace;
      tex.anisotropy = 4;
      tex.minFilter = THREE.LinearMipmapLinearFilter;
      tex.generateMipmaps = true;
      this.ownTex.push(tex);
      const mesh = new THREE.Mesh(new THREE.PlaneGeometry(1, 1 / art.aspect), graffitiMaterial(tex, this.wallNoise!, art));
      mesh.renderOrder = -2;
      mesh.layers.set(1);
      // odraz u mokrom podu: ista maska (dijeli uT), slabija boja; vidi ga samo kamera odraza
      const rmat = graffitiMaterial(tex, this.wallNoise!, art);
      const mu = (mesh.material as THREE.ShaderMaterial).uniforms;
      rmat.uniforms.uT = mu.uT;
      rmat.uniforms.uBright.value = 0.4;
      const refl = new THREE.Mesh(mesh.geometry, rmat);
      refl.layers.set(2);
      mesh.add(refl);
      this.graffiti = mesh;
      this.grafArt = art;
      this.grafReady = performance.now();
      this.scene.add(mesh);
      this.placeGraffiti();
      this.forced = Math.max(this.forced, 2);
      this.wake();
    });
  }

  // Kao na konceptu: vrh slova pri vrhu kadra, šipka prelazi preko donjeg dijela slova,
  // kapljice cure iza vješalica. Uski ekran: širina odlučuje (cijeli natpis stane).
  private placeGraffiti() {
    const m = this.graffiti;
    const art = this.grafArt;
    if (!m || !art) return;
    const cam = this.camera;
    cam.position.copy(this.camBase);
    cam.lookAt(this.look);
    cam.updateMatrixWorld();
    const narrow = this.narrow;
    const railNdc = new THREE.Vector3(0, RAIL_Y, zOf(0)).project(cam).y;
    // kao na konceptu: šipka prelazi tik preko dna slova (kuke vise ispred njih), kapljice cure
    // niže iza dresova; najviši trag boje (krunica, prskanje) ostaje u kadru
    const yBase = this.unprojectY(railNdc - (narrow ? 0.02 : 0.035), WALL_Z);
    const yLim = this.unprojectY(narrow ? 0.93 : 0.92, WALL_Z);
    const halfW = (cam.position.z - WALL_Z) * this.tanH;
    const maxW = halfW * 2 * (narrow ? 0.96 : 0.62);
    // uvijek cijeli iznad šipke (čisto): kad je zida malo, natpis je manji, a ne prekriven
    const Ht = Math.min(maxW / art.aspect, (yLim - yBase) / Math.max(0.2, art.ext - art.base));
    const cy = yBase - art.base * Ht + Ht / 2;
    const Wt = Ht * art.aspect;
    m.scale.setScalar(Wt);
    m.position.set(Wt * GRAF_DX, cy, WALL_Z + 0.004);
    // neonski odsjaj ispod IFY: na zidu od dna slova do poda, na podu uz zid
    const nw = this.neonWall;
    const nf = this.neonFloor;
    if (nw && nf) {
      const x0 = m.position.x + (art.neonX0 - 0.5) * Wt;
      const x1 = m.position.x + (art.neonX1 - 0.5) * Wt;
      const nx = (x0 + x1) / 2;
      const span = Math.max(0.4, x1 - x0);
      const yb = cy + (art.base - 0.5) * Ht; // dno tijela slova
      const hb = yb - this.floorY;
      nw.scale.set(span * 1.5, hb * 1.5, 1);
      nw.position.set(nx, this.floorY + hb * 0.45, WALL_Z + 0.006);
      nf.scale.set(span * 1.7, 1.5, 1);
      nf.position.set(nx, this.floorY + 0.0035, WALL_Z + 0.5);
      nw.visible = nf.visible = true;
    }
  }

  // Natpis i gobo prema kadru: slova stoje u traci iznad dresova — vrh pri vrhu kadra,
  // šipka prelazi preko donje trećine slova, kuke vješalica vise ispred njih.
  private signCap = 0.9;
  private placeSign() {
    // grafit prati kadar (i kad smjer demo-a sam namjesti kameru pa pozove placeSign)
    this.placeGraffiti();
    const narrow = this.narrow;
    const cam = this.camera;
    cam.position.copy(this.camBase);
    cam.lookAt(this.look);
    cam.updateMatrixWorld();
    const v = new THREE.Vector3();
    const railNdc = v.set(0, RAIL_Y, 0).project(cam).y;
    const topNdc = Math.min(0.93, railNdc + (1 - railNdc) * 0.72);
    const botNdc = railNdc - (narrow ? 0.05 : 0.08);
    const y1 = this.unprojectY(topNdc, WALL_Z);
    // linija svjetla zida tik iznad gornjeg ruba kadra (izvor se ne vidi, samo njegov sjaj)
    this.wallTop = this.unprojectY(1, WALL_Z) + (narrow ? 0.1 : 0.16);
    const y0 = this.unprojectY(botNdc, WALL_Z);
    const aspect = this.signGroup.userData.aspect as number | undefined;
    if (aspect) {
      let cap = y1 - y0;
      // širina natpisa najviše ~50 % (uski ekran 74 %) vidljive širine zida
      const halfW = (cam.position.z - WALL_Z) * this.tanH;
      const maxW = halfW * 2 * (narrow ? 0.74 : 0.5);
      let width = (cap * aspect) / this.signCap;
      if (width > maxW) {
        width = maxW;
        cap = (width * this.signCap) / aspect;
      }
      this.signGroup.scale.setScalar(width);
      this.signGroup.position.set(0, y1 - cap / 2, WALL_Z);
    }
  }

  private buildRail() {
    const pts: THREE.Vector3[] = [];
    // gušće točke u izbočini (glatki luk kroma), rjeđe uz zid
    for (let u = -RAIL_U; u <= RAIL_U + 1e-6; u += Math.abs(u) < 2.6 ? 0.04 : 0.2) pts.push(new THREE.Vector3(u, RAIL_Y, zOf(u)));
    const tube = new THREE.Mesh(tubeAlong(pts, RAIL_R, BOW > 0 ? 420 : 160, 20), this.chrome);
    this.railGroup.add(tube);
    // završni čepovi + prstenovi
    for (const s of [-1, 1]) {
      const u = s * RAIL_U;
      const p = new THREE.Vector3(u, RAIL_Y, zOf(u));
      const dir = new THREE.Vector3(1, 0, dzOf(u)).normalize().multiplyScalar(s);
      const cap = new THREE.Mesh(new THREE.SphereGeometry(RAIL_R * 1.35, 20, 14), this.chrome);
      cap.position.copy(p).addScaledVector(dir, RAIL_R * 0.6);
      this.railGroup.add(cap);
      const collar = new THREE.Mesh(new THREE.CylinderGeometry(RAIL_R * 1.5, RAIL_R * 1.5, 0.03, 20), this.chrome);
      collar.position.copy(p).addScaledVector(dir, -0.05);
      collar.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir);
      this.railGroup.add(collar);
    }
    // stropni nosači (scena "grafit": šipka je učvršćena u bočne zidove → bez nosača)
    for (const u of this.graf ? [] : [-2.25, -0.95, 0.95, 2.25]) {
      const p = new THREE.Vector3(u, RAIL_Y, zOf(u));
      this.railGroup.add(rod(p.clone().add(new THREE.Vector3(0, RAIL_R, 0)), p.clone().add(new THREE.Vector3(0, 2.6, 0)), 0.0055, this.chrome, 10));
      const clamp = new THREE.Mesh(new THREE.SphereGeometry(RAIL_R * 1.55, 18, 12), this.chrome);
      clamp.position.copy(p);
      clamp.scale.set(1, 1.15, 1);
      this.railGroup.add(clamp);
    }
    // LED svjetlosna letva iznad i malo ispred šipke (kuke slobodno sjede na šipki):
    // tamni aluminijski profil + svijetla linija s donje strane, visi na tankim sajlama.
    const LY = 0.085;
    const LZ = 0.075;
    const ledPts = pts.map((p) => p.clone().add(new THREE.Vector3(0, LY, LZ)));
    // mat crni eloksirani profil (ne smije izgledati kao druga kromirana šipka)
    const anod = new THREE.MeshStandardMaterial({ color: 0x0b0b0c, metalness: 0.4, roughness: 0.7, envMap: this.env, envMapIntensity: 0.16 });
    const channel = new THREE.Mesh(tubeAlong(ledPts, 0.0075, 160, 10), anod);
    channel.scale.set(1, 1, 1);
    this.railGroup.add(channel);
    this.ledParts.push(channel);
    // dioda na prednjem-donjem rubu profila: vidi se odozgo i sprijeda kao tanka bijela crta
    const ledLine = ledPts.map((p) => p.clone().add(new THREE.Vector3(0, -0.0042, 0.0058)));
    // dioda: precizna bijela linija (pali se slijeva nadesno u ulaznom nizu); vidi je i odraz poda
    this.ledTube = new THREE.Mesh(tubeAlong(ledLine, 0.0042, 160, 6), ledLineMaterial());
    this.railGroup.add(this.ledTube);
    this.ledParts.push(this.ledTube);
    for (const u of [-2.25, -0.95, 0.95, 2.25]) {
      const p = new THREE.Vector3(u, RAIL_Y + LY, zOf(u) + LZ);
      const wire = rod(p, p.clone().add(new THREE.Vector3(0, 2.4, 0)), 0.0016, this.chrome, 6);
      this.railGroup.add(wire);
      this.ledParts.push(wire);
    }
    for (const s of [-1, 1]) {
      const u = s * RAIL_U;
      const cap = new THREE.Mesh(new THREE.SphereGeometry(0.0095, 14, 10), this.chromeDark);
      cap.position.set(u, RAIL_Y + LY, zOf(u) + LZ);
      this.railGroup.add(cap);
      this.ledParts.push(cap);
    }
    // Uski sjaj tik ispod diode (svjetlo "izlazi" iz profila i pada na šipku). Nekadašnji
    // široki sivi pojas preko dresova je uklonjen: LED sada osvjetljava zid iza dresova (pojas
    // u shaderu zida), umjesto sive plohe ispred njih.
    this.ledGlow = new THREE.Mesh(this.ribbon(RAIL_Y + LY - 0.004, 0.06, LZ + 0.012), ledFallMaterial());
    (this.ledGlow.material as THREE.ShaderMaterial).uniforms.span.value = 3.4;
    // LED sjaj ne ide preko tkanine (boje dresa ostaju čiste)
    maskFabric(this.ledGlow.material as THREE.Material);
    this.ledGlow.renderOrder = 21;
    this.railGroup.add(this.ledGlow);
    this.ledParts.push(this.ledGlow);
    // Glava paljenja: kratka svijetla crtica na fronti (vidi je i odraz poda — projuri i po podu).
    const sparkTex = radialTexture([[0, "rgba(255,255,255,1)"], [0.18, "rgba(255,255,255,0.55)"], [0.5, "rgba(255,255,255,0.12)"], [1, "rgba(255,255,255,0)"]]);
    this.ownTex.push(sparkTex);
    this.spark = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), glowMaterial(sparkTex, LIGHT.clone().multiplyScalar(2.4), 0));
    this.spark.scale.set(0.95, 0.16, 1);
    this.spark.visible = false;
    this.spark.renderOrder = 22;
    maskFabric(this.spark.material as THREE.Material);
    this.railGroup.add(this.spark);
    this.ledParts.push(this.spark);
  }

  // Traka uz luk šipke (od y0 prema dolje, visina h), malo ispred šipke.
  private ribbon(y0: number, h: number, dz: number) {
    const N = 120;
    const posArr: number[] = [];
    const uv: number[] = [];
    const idx: number[] = [];
    for (let i = 0; i <= N; i++) {
      const u = -RAIL_U + (2 * RAIL_U * i) / N;
      const z = zOf(u) + dz;
      posArr.push(u, y0, z, u, y0 - h, z);
      uv.push(i / N, 0, i / N, 1);
      if (i < N) {
        const a = i * 2;
        idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2);
      }
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.Float32BufferAttribute(posArr, 3));
    g.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2));
    g.setIndex(idx);
    return g;
  }

  // Stalak za lopte u jedinicama r (grupa se skalira na pravi polumjer lopte).
  private buildRack() {
    const n = this.opt.balls.length;
    const g = 0.34;
    const W = n * 2 + (n + 1) * g;
    this.rackW = W;
    const barY = this.rackBarY;
    const bz = 0.62;
    const t = 0.085;
    const x0 = -W / 2;
    const m = this.chrome;
    for (const z of [-bz, bz]) this.rack.add(rod(new THREE.Vector3(x0 - 0.1, barY, z), new THREE.Vector3(-x0 + 0.1, barY, z), t, m, 14));
    this.rackSlots = [];
    for (let i = 0; i < n; i++) {
      const x = x0 + g + 1 + i * (2 + g);
      const ring = new THREE.Mesh(new THREE.TorusGeometry(0.66, t * 0.75, 10, 36), m);
      ring.rotation.x = Math.PI / 2;
      ring.position.set(x, barY + 0.04, 0);
      this.rack.add(ring);
      this.rackSlots.push(new THREE.Vector3(x, barY + 0.04 + Math.sqrt(1 - 0.66 * 0.66), 0));
    }
    const footZ = 1.55;
    for (const x of [x0 - 0.05, -x0 + 0.05]) {
      for (const s of [-1, 1]) {
        const top = new THREE.Vector3(x, barY, s * bz);
        const foot = new THREE.Vector3(x, 0.1, s * footZ);
        this.rack.add(rod(top, foot, t, m, 12));
        const disc = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.24, 0.09, 20), m);
        disc.position.set(x, 0.045, s * footZ);
        this.rack.add(disc);
      }
      // spoj nogu i prečki
      for (const s of [-1, 1]) {
        const c = new THREE.Mesh(new THREE.SphereGeometry(t * 1.6, 14, 10), m);
        c.position.set(x, barY, s * bz);
        this.rack.add(c);
      }
      // poprečna ukruta na nozi
      const yy = 1.5;
      const zz = bz + (footZ - bz) * ((barY - yy) / (barY - 0.1));
      this.rack.add(rod(new THREE.Vector3(x, yy, -zz), new THREE.Vector3(x, yy, zz), t * 0.8, m, 10));
    }
    // donja uzdužna prečka (straga)
    const yy = 1.5;
    const zz = bz + (footZ - bz) * ((barY - yy) / (barY - 0.1));
    this.rack.add(rod(new THREE.Vector3(x0, yy, -zz), new THREE.Vector3(-x0, yy, -zz), t * 0.8, m, 10));
    // kontaktna sjena
    const sh = new THREE.Mesh(new THREE.PlaneGeometry(W + 2.6, 4.4), new THREE.MeshBasicMaterial({ map: this.shadowTex, transparent: true, depthWrite: false, opacity: 0.85 }));
    sh.rotation.x = -Math.PI / 2;
    sh.position.y = 0.02;
    this.rack.add(sh);

    // lopte
    for (let i = 0; i < n; i++) {
      const club = this.opt.balls[i];
      const mesh = new THREE.Mesh(new THREE.SphereGeometry(1, 40, 28), new THREE.MeshPhysicalMaterial({ color: 0xf2f2f2, roughness: 0.5 }));
      mesh.userData.ball = i;
      const shadow = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ map: this.shadowTex, transparent: true, depthWrite: false, opacity: 0 }));
      shadow.rotation.x = -Math.PI / 2;
      this.scene.add(mesh, shadow);
      this.balls.push({
        club,
        slot: i,
        state: "rack",
        p: new THREE.Vector3(),
        v: new THREE.Vector3(),
        w: new THREE.Vector3(),
        mesh,
        shadow,
        grounded: false,
        lastEvt: 0,
        home0: new THREE.Vector3(),
        homeT: 0,
      });
      this.useTexture(this.opt.ballSrc(club), this.opt.mobile ? 384 : 512).then((tex) => {
        if (this.disposed) return;
        (mesh.material as THREE.Material).dispose();
        mesh.material = ballMaterial(tex, this.env);
        this.forced = Math.max(this.forced, 2);
        this.wake();
      }).catch(() => {});
    }
  }

  // Stalak za kape (metri, kape širine cw).
  private buildStand() {
    const caps = this.opt.caps;
    const cols = this.opt.mobile ? 3 : 4;
    const rows = Math.ceil(caps.length / cols);
    const cw = 0.205;
    const ch = cw * (294 / 339);
    const pitch = cw * 1.12;
    const rowPitch = ch + 0.055;
    const pad = cw * 0.16;
    const W = cols * pitch - (pitch - cw) + 2 * pad;
    const lowHook = 0.15 + ch;
    const hooks: number[] = [];
    for (let r = 0; r < rows; r++) hooks.push(lowHook + (rows - 1 - r) * rowPitch);
    const postH = hooks[0] + 0.07;
    const m = this.chrome;
    const x0 = -W / 2;
    const pr = 0.0095;
    for (const x of [x0, -x0]) {
      this.stand.add(rod(new THREE.Vector3(x, 0.02, 0), new THREE.Vector3(x, postH, 0), pr, m, 14));
      const fin = new THREE.Mesh(new THREE.SphereGeometry(pr * 1.7, 16, 12), m);
      fin.position.set(x, postH + pr, 0);
      this.stand.add(fin);
      // nožica (uzdužno, naprijed-natrag)
      this.stand.add(rod(new THREE.Vector3(x, 0.014, -0.16), new THREE.Vector3(x, 0.014, 0.17), 0.012, m, 12));
      for (const z of [-0.16, 0.17]) {
        const f = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.02, 0.012, 14), m);
        f.position.set(x, 0.006, z);
        this.stand.add(f);
      }
    }
    // stražnja ploča (tamno staklo)
    const panelH = hooks[0] - (hooks[rows - 1] - ch) + 0.08;
    const panel = new THREE.Mesh(
      new THREE.PlaneGeometry(W - 0.03, panelH),
      new THREE.MeshPhysicalMaterial({ color: 0x1c1d22, roughness: 0.1, metalness: 0.1, envMap: this.env, envMapIntensity: 1.1, transparent: true, opacity: 0.38, depthWrite: false })
    );
    panel.position.set(0, hooks[0] + 0.04 - panelH / 2, -0.035);
    this.stand.add(panel);
    this.stand.add(rod(new THREE.Vector3(x0, 0.08, -0.02), new THREE.Vector3(-x0, 0.08, -0.02), 0.006, m, 10));

    const hookGeo = tubeAlong(
      [new THREE.Vector3(0, 0, -0.005), new THREE.Vector3(0, -0.004, 0.02), new THREE.Vector3(0, -0.005, 0.042), new THREE.Vector3(0, 0.002, 0.055), new THREE.Vector3(0, 0.012, 0.058)],
      0.0028,
      20,
      8
    );
    for (let r = 0; r < rows; r++) {
      const y = hooks[r];
      this.stand.add(rod(new THREE.Vector3(x0, y + 0.012, 0), new THREE.Vector3(-x0, y + 0.012, 0), 0.0075, m, 12));
      for (let c = 0; c < cols; c++) {
        const i = r * cols + c;
        if (i >= caps.length) break;
        const x = x0 + pad + c * pitch + cw / 2;
        const hook = new THREE.Mesh(hookGeo, m);
        hook.position.set(x, y + 0.006, 0);
        this.stand.add(hook);
        const root = new THREE.Group();
        root.position.set(x, y + 0.004, 0.05);
        const swing = new THREE.Group();
        root.add(swing);
        this.stand.add(root);
        const cap: Cap = { club: caps[i], root, swing, mesh: null, theta: 0, omega: 0, phi: 0, phiV: 0, hookWorld: new THREE.Vector3() };
        this.caps.push(cap);
        this.useTexture(this.opt.capSrc(caps[i]), this.opt.mobile ? 288 : 352).then((tex) => {
          if (this.disposed) return;
          const { w, h } = imageSize(tex);
          const cH = cw * (h / w);
          const mat = new THREE.MeshStandardMaterial({ map: tex, transparent: true, alphaTest: 0.05, roughness: 0.75, side: THREE.DoubleSide, emissiveMap: tex, emissive: new THREE.Color(0.08, 0.08, 0.08) });
          const mesh = new THREE.Mesh(bentPlane(cw, cH, 0.03, 8), mat);
          // gumb kape (vrh) je na kuki: ~0.6 širine, ~0.025 visine slike
          mesh.position.set((0.5 - 0.6) * cw, -(0.5 - 0.025) * cH, 0.012);
          mesh.userData.cap = this.caps.indexOf(cap);
          swing.add(mesh);
          cap.mesh = mesh;
          this.forced = Math.max(this.forced, 2);
          this.wake();
        }).catch(() => {});
      }
    }
    const sh = new THREE.Mesh(new THREE.PlaneGeometry(W * 1.5, 0.75), new THREE.MeshBasicMaterial({ map: this.shadowTex, transparent: true, depthWrite: false, opacity: 0.8 }));
    sh.rotation.x = -Math.PI / 2;
    sh.position.y = 0.003;
    this.stand.add(sh);
    this.stand.userData = { W, top: postH + 0.02 };
  }

  /* ================================================================== */
  /*  Teksture (LRU)                                                     */
  /* ================================================================== */
  private useTexture(src: string, maxSize = 0): Promise<THREE.Texture> {
    let e = this.texCache.get(src);
    if (!e) {
      e = { tex: null, p: null, used: performance.now(), refs: 0 };
      const entry = e;
      entry.p = loadTexture(src, this.renderer, this.abort.signal, maxSize).then((t) => {
        entry.tex = t;
        return t;
      });
      this.texCache.set(src, entry);
    }
    e.used = performance.now();
    e.refs++;
    return e.p!;
  }
  private releaseTexture(src: string) {
    const e = this.texCache.get(src);
    if (e) e.refs = Math.max(0, e.refs - 1);
    if (this.texCache.size <= this.texLimit) return;
    const free = [...this.texCache.entries()].filter(([, v]) => v.refs === 0 && v.tex).sort((a, b) => a[1].used - b[1].used);
    for (const [k, v] of free) {
      if (this.texCache.size <= this.texLimit) break;
      this.dropTexture(v.tex!);
      this.texCache.delete(k);
    }
  }
  // GPU kopija + dekodirana slika (ImageBitmap ~2-3 MB po dresu) + alfa-maska za dodir
  private dropTexture(tex: THREE.Texture) {
    tex.dispose();
    this.alphaCanvas.delete(tex);
    const im = tex.image as { close?: () => void } | null;
    if (im && typeof im.close === "function") im.close();
  }
  private prefetch(src: string) {
    if (this.texCache.has(src)) return;
    this.useTexture(src).then(() => this.releaseTexture(src)).catch(() => {});
  }

  /* ================================================================== */
  /*  Stavke na šipki                                                     */
  /* ================================================================== */
  setItems(items: EngineItem[], index = 0) {
    for (const v of this.views.values()) this.dropView(v);
    this.views.clear();
    this.items = items;
    const n = items.length;
    const u = new Float64Array(n);
    const gap = new Float64Array(n);
    let acc = 0;
    for (let i = 0; i < n; i++) {
      u[i] = acc;
      gap[i] = (items[i].weight + items[(i + 1) % n].weight) / 2;
      acc += gap[i];
    }
    this.track = { u, gap, total: Math.max(acc, 1) };
    const start = n ? u[Math.min(index, n - 1)] : 0;
    // novi popis klizne s desna (filtri) — ali ne prije ulaznog niza
    this.pos = this.introDone ? start - 1.4 : start;
    this.target = start;
    this.vel = 0;
    this.mode = this.introDone ? "spring" : "rest";
    this.active = -1;
    this.forced = 2;
    this.wake();
  }

  private wrapD(d: number) {
    const T = this.track.total;
    d = ((d % T) + T) % T;
    if (d > T / 2) d -= T;
    return d;
  }
  private deltaOf(i: number) {
    return this.wrapD(this.track.u[i] - this.pos);
  }
  /** Položaj na šipki (m od sredine) za pomak d. */
  private sAt(d: number) {
    return this.graf ? heroPos(d) * SP_G : d * SP;
  }
  /** Mjerilo stavke za pomak d (grafit: junak u sredini veći). */
  private scAt(d: number) {
    return this.graf ? heroScale(d) : 1;
  }
  /** Metara šipke po jedinici pomaka za povlačenje (grafit: prosjek oko sredine). */
  private unitM() {
    return this.graf ? SP_G * 1.22 : SP;
  }

  goTo(i: number, instant = false) {
    if (!this.items.length) return;
    const d = this.deltaOf(i);
    this.target = this.pos + d;
    if (instant) {
      this.pos = this.target;
      this.vel = 0;
      this.mode = "rest";
      this.forced = 2;
    } else this.mode = "spring";
    this.wake();
  }
  goBy(dir: number) {
    const n = this.items.length;
    if (!n) return;
    const cur = this.nearest(this.mode === "spring" ? this.target : this.pos);
    this.goTo((cur + dir + n) % n);
  }
  private nearest(p: number) {
    let best = 0;
    let bd = Infinity;
    for (let i = 0; i < this.items.length; i++) {
      const d = Math.abs(this.wrapD(this.track.u[i] - p));
      if (d < bd) {
        bd = d;
        best = i;
      }
    }
    return best;
  }

  setTaken(slug: string | null) {
    this.taken = slug;
    this.forced = Math.max(this.forced, 2);
    this.wake();
  }

  private makeView(i: number): ItemView {
    const it = this.items[i];
    const np = it.pieces.length;
    const pieces: Piece[] = it.pieces.map((def, k) => {
      const root = new THREE.Group();
      const swing = new THREE.Group();
      swing.rotation.order = "ZXY";
      root.add(swing);
      this.railGroup.add(root);
      const key = `${it.slug}:${k}`;
      const st = this.pieceState.get(key) ?? { theta: 0, omega: 0, phi: 0, phiV: 0 };
      const pc: Piece = {
        def,
        root,
        swing,
        mesh: null,
        hook: null,
        mat: null,
        gu: null,
        cloth: null,
        depthSrc: depthSrcOf(def.src),
        lod: 0,
        tag: null,
        neck: null,
        sleeve: undefined,
        onSleeve: false,
        halfW: 0.3,
        planeH: def.height * H,
        theta: st.theta,
        omega: st.omega,
        phi: st.phi,
        phiV: st.phiV,
        k: 46 * (0.8 + 0.4 * jitter(i * 3 + k)),
        lastA: -1,
        loadId: 0,
      };
      const id = ++pc.loadId;
      if (this.opt.flat) pc.depthSrc = null;
      const dsrc = pc.depthSrc;
      // dubinska mapa je neobavezna (bez nje: ravna ploha kao prije)
      const depthP = dsrc
        ? this.useTexture(dsrc).then(
            (t) => t,
            () => null
          )
        : Promise.resolve(null);
      Promise.all([this.useTexture(def.src), depthP])
        .then(([tex, depth]) => {
          if (this.disposed || pc.loadId !== id || !this.views.has(i)) {
            this.releaseTexture(def.src);
            if (dsrc) this.releaseTexture(dsrc);
            return;
          }
          if (depth && depth.colorSpace !== THREE.NoColorSpace) {
            // podaci, ne boja: bez sRGB dekodiranja
            depth.colorSpace = THREE.NoColorSpace;
            depth.anisotropy = 1;
            depth.needsUpdate = true;
          }
          const { w, h } = imageSize(tex);
          const ph = def.height * H;
          const pw = ph * (w / h);
          pc.halfW = pw / 2;
          // prikvačeno do ramena vješalice (hlače: do šipke-vješalice)
          const pinV = def.drawHook ? clamp((def.barY - def.top) / def.height + 0.06, 0.04, 0.4) : 0.2;
          const cloth = new ClothSim(pw, ph, pinV, i * 3 + k);
          const mat = garmentMaterial(tex, depth, cloth.off, CLOTH_C, CLOTH_R);
          const gu = mat.userData.g as GarmentUniforms;
          gu.uSize.value.set(pw, ph);
          gu.uAmp.value = depth ? 0.062 * (ph / H) : 0;
          gu.uSag.value = depth ? 0.018 : 0.035;
          gu.uShade.value = this.shadeOn;
          if (def.drawHook) gu.uDepthTop.value = clamp((def.barY - def.top) / def.height + 0.015, 0, 0.5);
          if (this.opt.flat) {
            // ravna fotografija: bez reljefa, progiba i sjenčanja nabora; mreža 1×1
            gu.uAmp.value = 0;
            gu.uSag.value = 0;
            gu.uShade.value = 0;
          }
          const mesh = new THREE.Mesh(this.opt.flat ? gridPlane(1, 1) : gridPlane(24, 32), mat);
          mesh.scale.set(pw, ph, 1);
          // pomaci (dubina, tkanina) su u shaderu → okvir geometrije ne vrijedi
          mesh.frustumCulled = false;
          const frameTop = RAIL_R + HOOK_INNER * H;
          // ploha malo ispred cijevi: kuka s fotografije se vidi PREKO šipke (visi na njoj);
          // komplet: slojevi dovoljno razmaknuti da volumen donjeg ne probije gornji
          mesh.position.set(0, frameTop - def.top * H - ph / 2, CLOTH_Z - (np - 1 - k) * (depth ? 0.03 : 0.012));
          mesh.userData.item = i;
          mesh.renderOrder = 2;
          swing.add(mesh);
          pc.mesh = mesh;
          pc.mat = mat;
          pc.gu = gu;
          pc.cloth = this.opt.flat ? null : cloth;
          pc.lod = 0;
          pc.lastA = -1;
          if (k === np - 1) this.ensureTag(pc, i);
          this.forced = Math.max(this.forced, 2);
          this.wake();
        })
        .catch(() => {});
      if (def.drawHook) {
        // kromirana kuka iznad šipke-vješalice hlača (oblik kao na fotografijama)
        const r2 = RAIL_R + 0.0045;
        const barY = RAIL_R + HOOK_INNER * H - def.barY * H;
        const hook = new THREE.Mesh(
          tubeAlong(
            [
              new THREE.Vector3(-r2 * 0.95, -0.006, 0),
              new THREE.Vector3(-r2 * 0.75, r2 * 0.7, 0),
              new THREE.Vector3(0, r2 * 1.02, 0),
              new THREE.Vector3(r2 * 0.75, r2 * 0.7, 0),
              new THREE.Vector3(r2, -0.004, 0),
              new THREE.Vector3(r2 * 0.6, -0.03, CLOTH_Z * 0.6),
              new THREE.Vector3(0, -0.05, CLOTH_Z),
              new THREE.Vector3(0, barY, CLOTH_Z),
            ],
            0.0028,
            40,
            8
          ),
          this.chrome
        );
        swing.add(hook);
        pc.hook = hook;
      }
      return pc;
    });
    const v = { index: i, pieces };
    this.views.set(i, v);
    return v;
  }

  // Viseća etiketa s cijenom na vratu vješalice (glavni komad: dres / jakna).
  private ensureTag(pc: Piece, i: number) {
    if (pc.tag || !pc.mesh || !pc.gu || this.tagMode === "off" || !this.tagFont) return;
    const it = this.items[i];
    if (!it || it.price == null) return;
    const def = pc.def;
    const ph = def.height * H;
    const frameTop = RAIL_R + HOOK_INNER * H;
    const tag = createPriceTag(it.price, { mount: "vrat", sizes: it.sizes, eyelet: this.chrome, seed: i + 1 });
    // ispred volumena prsa/ovratnika (dubina gura tkaninu prema kameri)
    pc.neck = tagAnchor(frameTop - def.top * H, ph, CLOTH_Z + pc.gu.uAmp.value * 0.55);
    tag.group.position.copy(pc.neck);
    pc.swing.add(tag.group);
    pc.tag = tag;
    if (this.tagPhase === "done") tag.show();
  }

  private dropView(v: ItemView) {
    const it = this.items[v.index];
    v.pieces.forEach((pc, k) => {
      if (it) this.pieceState.set(`${it.slug}:${k}`, { theta: pc.theta, omega: pc.omega, phi: pc.phi, phiV: pc.phiV });
      pc.loadId++;
      if (pc.mesh) {
        // mreža je dijeljena (gridPlane) → ne briše se
        if (!pc.mesh.geometry.userData.shared) pc.mesh.geometry.dispose();
        pc.mat?.dispose();
        this.releaseTexture(pc.def.src);
        if (pc.depthSrc) this.releaseTexture(pc.depthSrc);
      }
      if (pc.tag) {
        pc.tag.dispose();
        pc.tag = null;
      }
      if (pc.hook) pc.hook.geometry.dispose();
      this.railGroup.remove(pc.root);
    });
  }

  /* ================================================================== */
  /*  Raspored kamere / poda                                              */
  /* ================================================================== */
  resize(w: number, h: number) {
    if (w < 2 || h < 2) return;
    this.W = w;
    this.Hpx = h;
    const dpr = Math.min(window.devicePixelRatio || 1, this.opt.dprCap);
    this.renderer.setPixelRatio(dpr);
    this.renderer.setSize(w, h, false);
    if (this.dof) {
      const db = this.renderer.getDrawingBufferSize(new THREE.Vector2());
      this.dof.setSize(db.x, db.y);
    }
    const rt = this.reflector.getRenderTarget();
    // grafit: odraz dresova je vidljiv (mokri pod) → oštrija tekstura odraza
    const rs = this.graf ? (this.opt.mobile ? 0.42 : 0.5) : this.opt.mobile ? 0.3 : 0.34;
    if (this.opt.reflect === false) rt.setSize(1, 1);
    else rt.setSize(Math.max(64, Math.round(w * dpr * rs)), Math.max(64, Math.round(h * dpr * rs)));

    const aspect = w / h;
    const narrow = aspect < 0.9;
    if (this.graf) {
      this.frameGraf(w, aspect, narrow);
      return;
    }
    // gdje je šipka u kadru (NDC y): stara scena pri vrhu; grafit treba zid iznad šipke
    const railTop = this.graf ? (narrow ? 0.62 : 0.5) : 0.86;
    this.maxA = narrow ? 3.3 : aspect < 1.3 ? 4.2 : this.graf ? 6.4 : 5.4;
    const cam = this.camera;
    cam.fov = narrow ? 36 : 30;
    cam.aspect = aspect;
    // Prednji rub poda (gdje stoje stalci).
    const floorZ = narrow ? 0.85 : 0.72;
    const camY = narrow ? 2.15 : 2.3;
    this.look.set(0, narrow ? 0.98 : 1.0, 0);
    // Udaljenost: šipka (gore) i pod ispred stalaka (dolje) moraju stati; na uskom ekranu
    // dres u sredini zauzima ~55 % širine.
    let D = 2.5;
    const botLim = narrow ? -0.84 : -0.93;
    const v = new THREE.Vector3();
    for (; D < 14; D += 0.04) {
      cam.position.set(0, camY, D);
      cam.lookAt(this.look);
      cam.updateMatrixWorld();
      cam.updateProjectionMatrix();
      const top = v.set(0, RAIL_Y + 0.17, 0).project(cam).y;
      const bot = v.set(0, -0.02, floorZ + 0.32).project(cam).y;
      const jw = v.set(0.41, RAIL_Y - 0.5, 0).project(cam).x;
      // raspon šipka→pod mora stati (okomiti pomak kamere slijedi niže)
      if (top - bot < railTop - botLim && jw < (narrow ? 0.74 : 0.26)) break;
    }
    // Višak visine (uski ekran: odlučuje širina) → pomakni kameru okomito da šipka bude gore.
    const ndcTop = (dy: number) => {
      cam.position.set(0, camY + dy, D);
      cam.lookAt(this.look.x, this.look.y + dy, this.look.z);
      cam.updateMatrixWorld();
      return v.set(0, RAIL_Y + 0.17, 0).project(cam).y;
    };
    let lo = -1.5;
    let hi = 1.5;
    for (let k = 0; k < 30; k++) {
      const mid = (lo + hi) / 2;
      if (ndcTop(mid) > railTop) lo = mid;
      else hi = mid;
    }
    let dy = (lo + hi) / 2;
    ndcTop(dy);
    if (v.set(0, -0.02, floorZ + 0.32).project(cam).y < botLim) dy = 0;
    this.camBase.set(0, camY + dy, D);
    this.look.y += dy;
    cam.position.copy(this.camBase);
    cam.lookAt(this.look);
    cam.updateMatrixWorld();
    cam.updateProjectionMatrix();
    (this.reflector.material as THREE.ShaderMaterial).uniforms.camZ.value = D;
    this.tanH = Math.tan(THREE.MathUtils.degToRad(cam.fov / 2)) * aspect;
    // px po metru na šipki
    const a = v.set(0, 1.5, 0).project(cam).x;
    const b = v.set(1, 1.5, 0).project(cam).x;
    this.pxPerM = ((b - a) / 2) * w;
    // najviša vidljiva točka (strop za lopte) na z=0.6
    this.yTop = this.unprojectY(0.92, 0.6);
    // prednji rub vidljivog poda
    this.zFront = this.floorZAtNdc(-0.97);

    // Stalci: lijevo lopte, desno kape. Ako ispod ima viška (uski ekran), pomakni ih
    // naprijed dok prednji rub poda ne dođe do dna kadra.
    let zLo = floorZ;
    let zHi = floorZ + 1.4;
    for (let k = 0; k < 24; k++) {
      const mid = (zLo + zHi) / 2;
      if (v.set(0, -0.02, mid + 0.32).project(cam).y > botLim) zLo = mid;
      else zHi = mid;
    }
    const zr = zLo;
    this.narrow = narrow;
    // uski ekran: stalci zauzmu cijelu širinu → žonglira se na podu IZA njih (prazan pod ispod dresova)
    this.laneZ = narrow ? 0.3 : zr + 0.1;
    const halfAt = (z: number) => (cam.position.z - z) * this.tanH;
    const half = halfAt(zr) - 0.05;
    const standW = (this.stand.userData.W as number) ?? 0.9;
    const rackWm = this.rackW * BALL_R0;
    let s = 1;
    if (narrow) s = Math.min(1, (half * 2 * 0.95) / (rackWm + standW + 0.08));
    else s = Math.min(1, (half * 2 * 0.62) / (rackWm + standW + 0.6));
    this.ballR = BALL_R0 * s;
    this.rack.scale.setScalar(this.ballR);
    this.stand.scale.setScalar(s);
    const rackHalf = (rackWm * s) / 2;
    const standHalf = (standW * s) / 2;
    let rx: number;
    let sx: number;
    if (narrow) {
      rx = -half + rackHalf + 0.02;
      sx = half - standHalf - 0.02;
    } else {
      rx = -Math.min(half * 0.7, 1.75) + rackHalf * 0.4;
      sx = Math.min(half * 0.7, 1.75) - standHalf * 0.4;
    }
    this.rack.position.set(rx, 0, zr);
    this.stand.position.set(sx, 0, zr - 0.05);
    this.rack.updateMatrixWorld(true);
    this.stand.updateMatrixWorld(true);
    const rb = this.ballR;
    this.rackBox = { x0: rx - rackHalf - rb * 0.1, x1: rx + rackHalf + rb * 0.1, top: (this.rackBarY + 0.1) * rb, z0: zr - 0.75 * rb, z1: zr + 0.75 * rb };
    this.standBox = { x0: sx - standHalf, x1: sx + standHalf, top: (this.stand.userData.top as number) * s, z0: zr - 0.05 - 0.05 * s, z1: zr - 0.05 + 0.1 * s };
    for (const c of this.caps) c.root.getWorldPosition(c.hookWorld);

    // reflektori na stalke
    this.rackSpot.position.set(rx + 0.3, 3.4, zr + 1.3);
    this.rackSpot.target.position.set(rx, 0.25 * s, zr);
    this.capSpot.position.set(sx - 0.3, 3.4, zr + 1.3);
    this.capSpot.target.position.set(sx, 0.35 * s, zr);
    this.rackSpot.target.updateMatrixWorld();
    this.capSpot.target.updateMatrixWorld();
    this.placeCone(this.rackCone, this.rackSpot, 0.5);
    this.placeCone(this.capCone, this.capSpot, 0.5);
    const [rp, cp] = this.standPools;
    rp.position.set(rx, 0.002, zr + 0.06);
    rp.scale.set(rackWm * s * 1.9, 0.9 + 0.4 * s, 1);
    cp.position.set(sx, 0.002, zr + 0.02);
    cp.scale.set(standW * s * 1.9, 0.8 + 0.4 * s, 1);

    for (const b of this.balls) {
      b.state = b.slot < this.rackSlots.length ? "rack" : "off";
      this.placeOnRack(b);
    }
    this.placeSign();
    this.forced = Math.max(this.forced, 2);
    this.wake();
  }

  // Kadar scene "grafit" (kao koncept): kamera gleda vodoravno (šipka savršeno ravna, bez
  // nagiba), junak u sredini zauzima ~40-50 % visine kadra, šipka je u gornjem dijelu (iznad
  // nje grafit), ispod dresova odmah mokri pod. Uski ekran: dres u sredini ~3/4 širine, sjedi
  // oko okomite sredine, ispod njega traka poda za naziv, cijenu i gumb.
  private frameGraf(w: number, aspect: number, narrow: boolean) {
    const cam = this.camera;
    cam.fov = narrow ? 36 : 30;
    cam.aspect = aspect;
    cam.updateProjectionMatrix();
    const tanV = Math.tan(THREE.MathUtils.degToRad(cam.fov / 2));
    const sc0 = heroScale(0);
    // visina okvira junaka (vješalica + dres) kao udio visine kadra; junak visi na izbočini
    // šipke (BOW bliže kameri) → udaljenost se mjeri do njega
    const f = narrow ? 0.52 : 0.5;
    let D = (sc0 * H) / (2 * f * tanV);
    // ne preširoko: dres (≈0,8 m × mjerilo) najviše ovoliki udio širine
    const heroW = sc0 * 0.8;
    D = Math.max(D, heroW / (2 * (narrow ? 0.84 : 0.4) * tanV * aspect)) + BOW;
    const railNdc = narrow ? 0.5 : 0.4;
    // Kamera u visini šipke, blago nagnuta prema dolje: šipka leži na horizontu → na ekranu
    // je savršeno ravna crta (kao na konceptu) iako se u sredini izboči prema kameri.
    const camY = RAIL_Y + RAIL_R * 0.5;
    const pitch = Math.atan(railNdc * tanV);
    this.camBase.set(0, camY, D);
    this.look.set(0, camY - D * Math.tan(pitch), 0);
    cam.position.copy(this.camBase);
    cam.lookAt(this.look);
    cam.updateMatrixWorld();
    (this.reflector.material as THREE.ShaderMaterial).uniforms.camZ.value = D;
    this.tanH = tanV * aspect;
    const v = new THREE.Vector3();
    const a = v.set(0, 1.5, 0).project(cam).x;
    const b = v.set(1, 1.5, 0).project(cam).x;
    this.pxPerM = ((b - a) / 2) * w;
    // koliko stavki sa svake strane je u kadru
    const half = D * this.tanH;
    let dm = 0.5;
    while (dm < 12 && heroPos(dm) * SP_G - 0.45 * heroScale(dm) < half) dm += 0.1;
    this.maxA = dm + 0.2;
    this.narrow = narrow;
    this.yTop = this.unprojectY(0.92, 0.6);
    this.zFront = this.floorZAtNdc(-0.97);
    this.laneZ = 0.6;
    this.placeSign();
    this.forced = Math.max(this.forced, 2);
    this.wake();
  }

  private unprojectY(ndcY: number, z: number) {
    const v = new THREE.Vector3(0, ndcY, 0.5).unproject(this.camera);
    const o = this.camera.position;
    const t = (z - o.z) / (v.z - o.z);
    return o.y + (v.y - o.y) * t;
  }
  private floorZAtNdc(ndcY: number) {
    const v = new THREE.Vector3(0, ndcY, 0.5).unproject(this.camera);
    const o = this.camera.position;
    const t = (0 - o.y) / (v.y - o.y);
    return o.z + (v.z - o.z) * t;
  }

  // Volumetrijski konus od reflektora prema podu.
  private placeCone(cone: THREE.Mesh, spot: THREE.SpotLight, widen = 0.62) {
    const from = spot.position;
    const to = spot.target.position;
    const dir = to.clone().sub(from).normalize();
    const len = dir.y < -0.01 ? -from.y / dir.y : 4;
    const radius = Math.tan(spot.angle * widen) * len;
    cone.scale.set(radius, len, radius);
    cone.position.copy(from).addScaledVector(dir, len / 2);
    cone.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.clone().negate());
  }

  /* ================================================================== */
  /*  Lopte                                                               */
  /* ================================================================== */
  private placeOnRack(b: Ball) {
    if (b.slot >= this.rackSlots.length) {
      b.state = "off";
      b.mesh.visible = false;
      return;
    }
    const s = this.rackSlots[b.slot].clone().multiplyScalar(this.ballR).add(this.rack.position);
    b.p.copy(s);
    b.v.set(0, 0, 0);
    b.w.set(0, 0, 0);
    b.state = "rack";
    b.grounded = false;
    b.mesh.visible = true;
    b.mesh.position.copy(b.p);
    b.mesh.scale.setScalar(this.ballR);
    // prednja strana (motiv) prema kameri
    b.mesh.lookAt(this.camBase);
    b.shadow.visible = false;
  }

  private release(i: number) {
    const b = this.balls[i];
    if (b.state !== "rack") return;
    b.state = "free";
    b.grounded = false;
    const r = this.ballR;
    // skok preko susjednih lopti prema sredini poda
    const up = r * 3.4;
    b.v.y = Math.sqrt(2 * G * up);
    const tAir = b.v.y / G + Math.sqrt((2 * (up + b.p.y - r)) / G);
    if (this.narrow) {
      // natrag preko stalka na slobodni pod, malo prema sredini
      b.v.x = (-b.p.x * 0.45 + (Math.random() - 0.5) * 0.2) / tAir;
      b.v.z = (this.laneZ - b.p.z) / tAir;
    } else {
      const dir = this.rack.position.x < 0 ? 1 : -1;
      const edge = dir > 0 ? this.rackBox.x1 : this.rackBox.x0;
      const dist = Math.abs(edge - b.p.x) + r * (1.8 + Math.random() * 1.8);
      b.v.x = (dir * dist) / tAir;
      b.v.z = (this.laneZ - b.p.z) / tAir + (Math.random() - 0.5) * 0.1;
    }
    b.w.set(-b.v.z / r, 0, (-b.v.x / r) * 0.5);
    this.ev.onAnyFree(true);
    this.wake();
  }

  private kick(i: number, offX: number) {
    const b = this.balls[i];
    if (b.state !== "free") return;
    const r = this.ballR;
    if (b.grounded || b.p.y <= r + 0.01) this.streak = 0;
    this.streak += 1;
    this.ev.onJuggle(this.streak);
    const big = this.streak % 5 === 0;
    const ceiling = Math.min(this.yTop - r * 1.5, RAIL_Y + 0.1);
    if (big) {
      // veliki udarac: u dresove (zaljulja šipku)
      const aimY = RAIL_Y - H * 0.5;
      const hgt = Math.max(0.3, aimY - b.p.y);
      b.v.y = Math.sqrt(2 * G * hgt);
      const tUp = b.v.y / G;
      b.v.z = (0.02 - b.p.z) / tUp;
      b.v.x = (-b.p.x * 0.4) / tUp + (Math.random() - 0.5) * 0.3;
    } else {
      const hgt = clamp(0.55 + Math.random() * 0.55, 0.3, Math.max(0.3, ceiling - b.p.y - 0.15));
      b.v.y = Math.sqrt(2 * G * hgt);
      b.v.x = -offX * 1.5 + (Math.random() - 0.5) * 0.5;
      // natrag u "traku" ispred stalaka
      b.v.z = (this.laneZ - b.p.z) * 1.4 + (Math.random() - 0.5) * 0.25;
    }
    b.grounded = false;
    b.w.x += (Math.random() - 0.5) * 18;
    b.w.y += (Math.random() - 0.5) * 10;
    b.w.z += -b.v.x / r;
    this.wake();
  }

  private endStreak() {
    if (this.streak > this.best) {
      this.best = this.streak;
      try {
        window.localStorage.setItem(BEST_KEY, String(this.streak));
      } catch {
        /* ignore */
      }
    }
    if (this.streak > 0) this.ev.onStreakEnd(this.streak);
    this.streak = 0;
  }

  home() {
    for (const b of this.balls) {
      if (b.state === "free") {
        b.state = "home";
        b.home0.copy(b.p);
        b.homeT = 0;
      }
    }
    this.endStreak();
    this.ev.onAnyFree(false);
    this.wake();
  }

  private swingCapsNear(x: number, force: number) {
    for (const c of this.caps) {
      const d = Math.abs(c.hookWorld.x - x);
      if (d < 0.3) c.omega += (Math.random() < 0.5 ? -1 : 1) * force * 3.2 * (1 - d / 0.4);
    }
  }

  private stepBalls(dt: number, now: number) {
    const r = this.ballR;
    const list = this.balls;
    const tmp = new THREE.Vector3();
    const dq = new THREE.Quaternion();
    for (const b of list) {
      if (b.state === "home") {
        b.homeT += dt / 0.55;
        const t = ease3(b.homeT);
        const s = this.rackSlots[b.slot].clone().multiplyScalar(r).add(this.rack.position);
        b.p.lerpVectors(b.home0, s, t);
        b.p.y += Math.sin(Math.PI * Math.min(1, b.homeT)) * 0.25;
        b.mesh.position.copy(b.p);
        b.shadow.visible = false;
        if (b.homeT >= 1) this.placeOnRack(b);
        continue;
      }
      if (b.state !== "free") continue;
      b.v.y -= G * dt;
      b.v.x *= 1 - 0.1 * dt;
      b.v.z *= 1 - 0.6 * dt;
      b.p.addScaledVector(b.v, dt);

      // zidovi (rubovi vidljivog prostora na dubini lopte), prednji/stražnji rub
      const half = (this.camera.position.z - b.p.z) * this.tanH - r * 1.1;
      if (b.p.x < -half) {
        b.p.x = -half;
        b.v.x = Math.abs(b.v.x) * 0.7;
      } else if (b.p.x > half) {
        b.p.x = half;
        b.v.x = -Math.abs(b.v.x) * 0.7;
      }
      const zMax = Math.min(this.zFront - r * 1.4, this.narrow ? this.laneZ + 0.35 : this.rack.position.z + 0.55);
      if (b.p.z > zMax) {
        // mekani zid (lopta tek skinuta sa stalka može biti ispred trake)
        if (b.v.z > 0) b.v.z = -Math.abs(b.v.z) * 0.5;
        if (b.p.z > this.zFront - r * 1.4) b.p.z = this.zFront - r * 1.4;
      } else if (b.p.z < -0.3) {
        b.p.z = -0.3;
        b.v.z = Math.abs(b.v.z) * 0.5;
      }
      if (b.p.y > this.yTop - r) {
        b.p.y = this.yTop - r;
        b.v.y = -Math.abs(b.v.y) * 0.3;
      }
      // pod
      if (b.p.y <= r) {
        b.p.y = r;
        if (b.v.y < 0) {
          const impact = -b.v.y;
          if (impact > 1.6 && this.streak > 0) this.endStreak();
          b.v.y = impact * 0.58;
          b.v.x *= 0.92;
          b.v.z *= 0.92;
          if (b.v.y < 0.45) {
            b.v.y = 0;
            b.grounded = true;
          }
        }
      } else if (b.p.y > r + 0.003) b.grounded = false;
      if (b.grounded) {
        const f = Math.exp(-1.5 * dt);
        b.v.x *= f;
        b.v.z *= f;
        if (Math.hypot(b.v.x, b.v.z) < 0.015) b.v.x = b.v.z = 0;
        // kotrljanje bez klizanja: ω = n × v / r
        b.w.set(b.v.z / r, b.w.y * Math.exp(-4 * dt), -b.v.x / r);
      } else b.w.multiplyScalar(Math.exp(-0.25 * dt));

      // stalak s loptama (kutija) + kolijevke
      const rb = this.rackBox;
      if (this.boxCollide(b, rb.x0, rb.x1, 0, rb.top, rb.z0, rb.z1, 0.45)) {
        // mirno na vrhu stalka iznad prazne kolijevke → sjedne u nju
        if (b.p.y > rb.top && Math.hypot(b.v.x, b.v.y) < 0.9) {
          for (let j = 0; j < this.rackSlots.length; j++) {
            const sx = this.rack.position.x + this.rackSlots[j].x * r;
            if (Math.abs(sx - b.p.x) > r * 0.8) continue;
            if (list.some((o) => o.state === "rack" && o.slot === j)) break;
            const owner = list.find((o) => o.slot === j);
            if (owner && owner !== b) owner.slot = b.slot;
            b.slot = j;
            b.state = "home";
            b.home0.copy(b.p);
            b.homeT = 0.4;
            break;
          }
        }
      }
      // stalak s kapama
      const sb = this.standBox;
      const vBefore = b.v.length();
      if (this.boxCollide(b, sb.x0, sb.x1, 0, sb.top, sb.z0, sb.z1, 0.4) && now - b.lastEvt > 160 && vBefore > 0.8) {
        b.lastEvt = now;
        this.swingCapsNear(b.p.x, Math.min(1, vBefore / 4));
      }
      // lopte na stalku su prepreka
      for (const o of list) {
        if (o === b || o.state !== "rack") continue;
        this.sphereVsStatic(b, o.p, 2 * r);
      }
      // šipka (cijev)
      const ry = RAIL_Y;
      const rz = zOf(clamp(b.p.x, -RAIL_U, RAIL_U));
      const dy = b.p.y - ry;
      const dz = b.p.z - rz;
      const dd = Math.hypot(dy, dz);
      if (dd < r + RAIL_R && Math.abs(b.p.x) < RAIL_U) {
        const ny = dy / (dd || 1);
        const nz = dz / (dd || 1);
        b.p.y = ry + ny * (r + RAIL_R);
        b.p.z = rz + nz * (r + RAIL_R);
        const vn = b.v.y * ny + b.v.z * nz;
        if (vn < 0) {
          b.v.y -= 1.6 * vn * ny;
          b.v.z -= 1.6 * vn * nz;
        }
        this.hitRail(b.p.x, Math.min(1, Math.abs(vn) / 3));
      }
      // dresovi
      if (b.p.y > RAIL_Y - H - r && b.p.z < 0.3) this.ballVsCloth(b);

      // rotacija
      const wl = b.w.length();
      if (wl > 1e-4) {
        dq.setFromAxisAngle(tmp.copy(b.w).divideScalar(wl), wl * dt);
        b.mesh.quaternion.premultiply(dq);
      }
    }
    // sudari slobodnih lopti
    for (let i = 0; i < list.length; i++) {
      const A = list[i];
      if (A.state !== "free") continue;
      for (let j = i + 1; j < list.length; j++) {
        const B = list[j];
        if (B.state !== "free") continue;
        tmp.subVectors(B.p, A.p);
        const d = tmp.length();
        const min = 2 * r;
        if (d > 0 && d < min) {
          tmp.divideScalar(d);
          const push = (min - d) / 2;
          A.p.addScaledVector(tmp, -push);
          B.p.addScaledVector(tmp, push);
          const rel = (B.v.x - A.v.x) * tmp.x + (B.v.y - A.v.y) * tmp.y + (B.v.z - A.v.z) * tmp.z;
          if (rel < 0) {
            const imp = -(1 + 0.8) * rel * 0.5;
            A.v.addScaledVector(tmp, -imp);
            B.v.addScaledVector(tmp, imp);
            A.grounded = B.grounded = false;
          }
        }
      }
    }
    for (const b of list) {
      if (b.state !== "free") continue;
      b.mesh.position.copy(b.p);
      const h = Math.max(0, b.p.y - r);
      const s = 1 - Math.min(0.65, h / 1.4);
      b.shadow.visible = true;
      b.shadow.position.set(b.p.x, 0.004, b.p.z);
      b.shadow.scale.setScalar(r * 2.8 * (1 + h * 0.5));
      (b.shadow.material as THREE.MeshBasicMaterial).opacity = 0.8 * s;
    }
  }

  // Kutija (AABB) kao prepreka: vraća true ako je bio sudar.
  private boxCollide(b: Ball, x0: number, x1: number, y0: number, y1: number, z0: number, z1: number, rest: number) {
    const r = this.ballR;
    const cx = clamp(b.p.x, x0, x1);
    const cy = clamp(b.p.y, y0, y1);
    const cz = clamp(b.p.z, z0, z1);
    let dx = b.p.x - cx;
    let dy = b.p.y - cy;
    let dz = b.p.z - cz;
    let d = Math.hypot(dx, dy, dz);
    if (d >= r) return false;
    if (d === 0) {
      // središte u kutiji → izbaci prema gore ili na bližu stranu
      const up = y1 - b.p.y;
      const left = b.p.x - x0;
      const right = x1 - b.p.x;
      const m = Math.min(up, left, right);
      if (m === up) {
        dx = 0;
        dy = 1;
        dz = 0;
        b.p.y = y1 + r;
      } else if (m === left) {
        dx = -1;
        dy = 0;
        dz = 0;
        b.p.x = x0 - r;
      } else {
        dx = 1;
        dy = 0;
        dz = 0;
        b.p.x = x1 + r;
      }
      d = 1;
    } else {
      b.p.x += (dx / d) * (r - d);
      b.p.y += (dy / d) * (r - d);
      b.p.z += (dz / d) * (r - d);
    }
    const nx = dx / d;
    const ny = dy / d;
    const nz = dz / d;
    const vn = b.v.x * nx + b.v.y * ny + b.v.z * nz;
    if (vn < 0) {
      b.v.x -= (1 + rest) * vn * nx;
      b.v.y -= (1 + rest) * vn * ny;
      b.v.z -= (1 + rest) * vn * nz;
    }
    if (ny > 0.9 && Math.abs(b.v.y) < 0.5) {
      b.v.y = 0;
      b.grounded = true;
      // trenje na vrhu stalka
      b.v.x *= 0.985;
      b.v.z *= 0.985;
      if (Math.hypot(b.v.x, b.v.z) < 0.02) b.v.x = b.v.z = 0;
    }
    return true;
  }

  private sphereVsStatic(b: Ball, c: THREE.Vector3, min: number) {
    const dx = b.p.x - c.x;
    const dy = b.p.y - c.y;
    const dz = b.p.z - c.z;
    const d = Math.hypot(dx, dy, dz);
    if (d <= 0 || d >= min) return;
    const nx = dx / d;
    const ny = dy / d;
    const nz = dz / d;
    b.p.set(c.x + nx * min, c.y + ny * min, c.z + nz * min);
    const vn = b.v.x * nx + b.v.y * ny + b.v.z * nz;
    if (vn < 0) {
      b.v.x -= 1.6 * vn * nx;
      b.v.y -= 1.6 * vn * ny;
      b.v.z -= 1.6 * vn * nz;
    }
  }

  // Lopta udari u odjeću: odbije se, a komad se zanjiše (naprijed-natrag + u ravnini).
  private ballVsCloth(b: Ball) {
    const r = this.ballR;
    const loc = new THREE.Vector3();
    for (const v of this.views.values()) {
      for (const pc of v.pieces) {
        if (!pc.mesh || !pc.root.visible) continue;
        loc.copy(b.p);
        pc.root.worldToLocal(loc);
        const top = RAIL_R + HOOK_INNER * H - pc.def.top * H;
        if (loc.y > top - 0.08 || loc.y < top - pc.planeH - r) continue;
        if (Math.abs(loc.x) > pc.halfW * 0.88 + r * 0.3) continue;
        if (Math.abs(loc.z) > r + 0.03) continue;
        const side = loc.z >= 0 ? 1 : -1;
        const n = new THREE.Vector3(0, 0, side).applyQuaternion(pc.root.quaternion);
        const pen = r + 0.03 - Math.abs(loc.z);
        b.p.addScaledVector(n, pen);
        const vn = b.v.dot(n);
        if (vn < 0) {
          b.v.addScaledVector(n, -1.35 * vn);
          const f = Math.min(1.4, -vn / 2.5);
          pc.phiV += -side * f * 3.2;
          pc.omega += (loc.x > 0 ? -1 : 1) * f * 1.6 + (Math.random() - 0.5) * 0.6;
          this.nudgeNeighbours(v.index, f * 0.5);
          this.wake();
        }
        return;
      }
    }
  }

  private nudgeNeighbours(i: number, f: number) {
    for (const v of this.views.values()) {
      if (v.index === i) continue;
      const d = Math.abs(this.wrapD(this.track.u[v.index] - this.track.u[i]));
      if (d > 1.6) continue;
      for (const pc of v.pieces) pc.omega += (Math.random() - 0.5) * f * 2 * (1.6 - d);
    }
  }

  private hitRail(x: number, f: number) {
    for (const v of this.views.values()) {
      for (const pc of v.pieces) {
        const d = Math.abs(pc.root.position.x - x);
        if (d < 0.8) pc.omega += (Math.random() - 0.5) * 2.4 * f * (1 - d / 0.8);
      }
    }
  }

  /* ================================================================== */
  /*  Korak simulacije                                                    */
  /* ================================================================== */
  private why = "";
  private step(dt: number, now: number): boolean {
    let busy = false;
    this.why = "";
    const n = this.items.length;

    /* ---------- ulazni niz ---------- */
    let intro = 1;
    if (this.t0 >= 0 && !this.introDone) {
      const t = (now - this.t0) / 1000;
      intro = t;
      if (t > INTRO_END) {
        this.introDone = true;
        this.active = -1; // javi trenutni aktivni
      } else busy = true;
    }
    const t = this.introDone ? 99 : this.t0 < 0 ? 0 : intro;
    // Redoslijed (~1,8 s): mrak → LED linija šipke se upali slijeva nadesno (pojas svjetla
    // na zidu iza dresova ide s njom) → natpis → reflektori stalaka i dresa "padnu" jedan za
    // drugim (kratki bljesak snopa) → odsjaj klizne po kromu. Dresovi su cijelo vrijeme u
    // boji fotografije (neosvijetljeni) — svjetlo oblikuje samo prostor oko njih.
    const sweep = this.introDone ? 99 : sweepAt(t);
    const L = {
      led: t > 0.1 ? 1 : 0,
      head: this.introDone ? 0 : clamp((t - 0.1) / 0.1, 0, 1) * (1 - clamp((t - 0.72) / 0.12, 0, 1)),
      rack: slam(t, 0.95),
      cap: slam(t, 1.08),
      key: slam(t, 1.22),
      back: ease3((t - 0.3) / 0.7),
      amb: ease3((t - 0.45) / 1.0),
      sheen: this.introDone ? 0 : 1 - ease3((t - 1.2) / 0.65),
    };
    if (this.graf) {
      // bez vidljivih svjetala i bez "paljenja": samo nevidljivi meki ambijent + fill
      L.led = L.head = L.rack = L.cap = L.key = L.back = L.sheen = 0;
      L.amb = 1;
    }
    /* ---------- grafit (ulaz: sprej slijeva nadesno, pa kapljice) ---------- */
    if (this.graffiti) {
      let tg = 99;
      if (!this.grafDone) {
        if (this.t0 < 0) tg = 0;
        else {
          tg = (now - Math.max(this.t0, this.grafReady)) / 1000;
          if (tg > GRAF_INTRO_END) {
            this.grafDone = true;
            tg = 99;
          } else busy = true;
        }
      }
      // (razvoj/QA: zamrznuti trenutak ulaza)
      if (this.debugGrafT >= 0) tg = this.debugGrafT;
      (this.graffiti.material as THREE.ShaderMaterial).uniforms.uT.value = tg;
      // neonski odsjaj se pojavi tek kad je IFY isprejan
      const nk = clamp((tg - 1.25) / 0.6, 0, 1);
      if (this.neonWall) (this.neonWall.material as THREE.MeshBasicMaterial).opacity = 0.075 * nk;
      if (this.neonFloor) (this.neonFloor.material as THREE.MeshBasicMaterial).opacity = 0.06 * nk;
    }

    /* ---------- šipka ---------- */
    const prevPos = this.pos;
    if (this.mode === "spring") {
      const k = 70;
      const c = 2 * Math.sqrt(k) * 0.95;
      const a = k * (this.target - this.pos) - c * this.vel;
      this.vel += a * dt;
      this.pos += this.vel * dt;
      if (Math.abs(this.target - this.pos) < 4e-4 && Math.abs(this.vel) < 2e-3) {
        this.pos = this.target;
        this.vel = 0;
        this.mode = "rest";
      }
      busy = true;
    } else if (this.mode === "glide") {
      this.vel *= Math.exp(-4.2 * dt);
      this.pos += this.vel * dt;
      if (Math.abs(this.vel) < 1.6) {
        this.target = this.pos + this.wrapD(this.track.u[this.nearest(this.pos + this.vel * 0.18)] - this.pos);
        this.mode = "spring";
      }
      busy = true;
    } else if (this.mode === "drag") busy = true;
    const velS = dt > 0 ? ((this.pos - prevPos) * this.unitM()) / dt : 0;
    const accS = dt > 0 ? (velS - this.lastVelS) / dt : 0;
    this.lastVelS = velS;

    // okolina kroma se lagano okreće sa šipkom i nagibom (pokretni odsjaji); na kraju
    // ulaznog niza odsjaj stropne linije jednom klizne po kromu ("sheen")
    this.chrome.envMapRotation.y = this.pos * 0.06 + this.par.x * 0.4 - L.sheen * 1.3;

    if (n) {
      // prozor vidljivih stavki
      const need = new Set<number>();
      for (let i = 0; i < n; i++) if (Math.abs(this.deltaOf(i)) <= this.maxA + 0.6) need.add(i);
      for (const [i, v] of this.views) if (!need.has(i)) {
        this.dropView(v);
        this.views.delete(i);
      }
      for (const i of need) if (!this.views.has(i)) this.makeView(i);
      // unaprijed učitaj sljedeće
      if (!busy || this.mode === "rest") {
        for (let i = 0; i < n; i++) {
          const a = Math.abs(this.deltaOf(i));
          if (a > this.maxA + 0.6 && a <= this.maxA + 2.6) for (const pc of this.items[i].pieces) this.prefetch(pc.src);
        }
      }

      let best = -1;
      let bestD = Infinity;
      for (const v of this.views.values()) {
        const a = Math.abs(this.deltaOf(v.index));
        if (a < bestD) {
          bestD = a;
          best = v.index;
        }
      }
      // tkanina: simulacija za sve vidljive (mobitel: junak + 2 susjeda; ostali samo zaostaju)
      this.clothT += dt;
      const idle = this.reduced || !this.introDone ? 0 : 1;
      const simA = this.opt.mobile ? 1.5 : this.maxA + 0.6;
      // etikete padnu nakon spreja grafita (ili odmah ako je ulaz viđen / preskočen)
      if (this.tagPhase === "wait" && this.tagFont && (this.graf ? this.grafDone : this.introDone)) {
        this.tagPhase = "done";
        this.tagAt = this.clothT;
        let order = 0;
        const vs = [...this.views.values()].sort((x, y) => Math.abs(this.deltaOf(x.index)) - Math.abs(this.deltaOf(y.index)));
        for (const v of vs)
          for (const pc of v.pieces)
            if (pc.tag) {
              if (this.reduced) pc.tag.show();
              else pc.tag.drop(0.08 + 0.07 * order++);
            }
      }
      for (const v of this.views.values()) {
        const it = this.items[v.index];
        const d = this.deltaOf(v.index);
        const a = Math.abs(d);
        const show = a <= this.maxA && it.slug !== this.taken;
        const sc = this.scAt(d);
        for (const pc of v.pieces) {
          pc.root.visible = show;
          const s = this.sAt(d) + pc.def.dx * H * sc;
          const u = uOf(s);
          // mjerilo oko kuke: unutarnji luk kuke ostaje na vrhu šipke; junak 1-2 cm ispred
          // susjeda (bez z-borbe gdje mu se rukav preklopi sa susjedom)
          pc.root.position.set(u, RAIL_Y - (sc - 1) * RAIL_R, zOf(u) + (this.graf ? 0.016 * clamp((sc - 1) / HERO_A, 0, 1) : 0));
          pc.root.scale.setScalar(sc);
          pc.root.rotation.y = faceAngle(u);
          // njihalo: opruga + inercija šipke (ubrzanje duž tangente)
          const kk = pc.k;
          pc.omega += (-kk * pc.theta - 2.3 * pc.omega - clamp(accS, -9, 9) * 0.45) * dt;
          pc.theta += pc.omega * dt;
          pc.phiV += (-kk * 0.85 * pc.phi - 2.0 * pc.phiV) * dt;
          pc.phi += pc.phiV * dt;
          pc.theta = clamp(pc.theta, -0.6, 0.6);
          pc.phi = clamp(pc.phi, -0.7, 0.7);
          pc.swing.rotation.set(pc.phi, 0, pc.theta);
          if (Math.abs(pc.theta) > 1.5e-3 || Math.abs(pc.omega) > 1e-2 || Math.abs(pc.phi) > 1.5e-3 || Math.abs(pc.phiV) > 1e-2) {
            busy = true;
            this.why += "swing ";
          }
          else {
            pc.theta = pc.omega = pc.phi = pc.phiV = 0;
          }
          if (pc.cloth && pc.gu && pc.mesh && show) {
            // razina detalja: gusta mreža samo za dres u sredini
            const lod = v.index === best ? 1 : 0;
            if (lod !== pc.lod) {
              pc.lod = lod;
              pc.mesh.geometry = lod ? gridPlane(48, 64) : gridPlane(24, 32);
              pc.gu.uVLod.value = lod ? 0 : 1;
            }
            if (this.reduced) {
              if (pc.cloth.energy > 0) pc.cloth.reset();
            } else {
              // šipka u lokalnom x dresa (dres je zakrenut po luku)
              const cr = Math.cos(pc.root.rotation.y);
              if (a <= simA) pc.cloth.step(dt, { ax: accS * cr, vx: velS * cr, t: this.clothT, idle });
              else pc.cloth.lag(velS * cr);
              if (pc.cloth.energy > 3e-4) {
                busy = true;
                if (idle === 0 || Math.abs(velS) > 0.01) this.why += "cloth ";
              }
            }
          }
          if (show && !pc.tag && pc.mesh && this.tagFont && pc === v.pieces[v.pieces.length - 1]) this.ensureTag(pc, v.index);
          if (pc.tag) {
            pc.tag.group.visible = show;
            if (show && pc.tag.update(dt, velS, clamp(1 - a, 0, 1), this.camera)) {
              busy = true;
              this.why += "tag ";
            }
          }
          // fokus: sredina oštra i svijetla, susjedi mutniji i tamniji
          if (pc.mat && Math.abs(a - pc.lastA) > 0.004) {
            pc.lastA = a;
            // neutralno prigušenje (isti skalar na R/G/B → bez pomaka tona); vrijednosti su
            // percepcijske (sRGB), materijal radi linearno → ^2.2
            // (grafit: junak se ističe veličinom → susjedi samo blago prigušeni)
            const mul = lerpArr(this.graf ? [1, 0.8, 0.64, 0.5, 0.4, 0.32, 0.26] : [1, 0.7, 0.5, 0.36, 0.26, 0.19, 0.13], a);
            pc.mat.color.setScalar(Math.pow(mul, 2.2));
            // s DOF-om zamućenje radi objektiv (dubina) → bez mip-biasa
            (pc.mat.userData.uBias as { value: number }).value = this.dof ? 0 : lerpArr([0, 1.15, 1.95, 2.6, 3.1, 3.4], a);
            pc.mesh!.renderOrder = 10 - Math.round(a * 2);
          }
        }
      }
      if (best >= 0 && best !== this.active && (this.introDone || this.t0 < 0)) {
        this.active = best;
        this.ev.onActive(best);
      }
      // reflektor prati dres u sredini
      const ad = best >= 0 ? this.deltaOf(best) : 0;
      const au = uOf(this.sAt(ad));
      const tx = this.key.target.position.x;
      const nx = tx + (au - tx) * Math.min(1, dt * 7);
      if (Math.abs(nx - tx) > 1e-4) {
        busy = true;
        this.why += "spot ";
      }
      this.key.target.position.set(nx, 1.35, zOf(nx));
      this.key.position.set(nx * 0.85, 4.6, 2.3);
      this.key.target.updateMatrixWorld();
      this.placeCone(this.keyCone, this.key, 0.6);
      this.keyPool.position.set(nx, 0.003, zOf(nx) + 0.45);
      // fokus objektiva i lokva svjetla na zidu prate dres u sredini (glatko, kao "rack focus")
      this.focusP.set(nx, RAIL_Y - H * 0.45 * this.scAt(ad), zOf(nx) + CLOTH_Z);
      this.dof?.setFocus(this.focusP);
      if (this.wallMat) this.wallMat.uniforms.uPoolX.value = nx * 0.85;
    }

    /* ---------- kape ---------- */
    for (const c of this.caps) {
      c.omega += (-38 * c.theta - 1.4 * c.omega) * dt;
      c.theta += c.omega * dt;
      c.phiV += (-34 * c.phi - 1.4 * c.phiV) * dt;
      c.phi += c.phiV * dt;
      c.swing.rotation.set(c.phi, 0, c.theta);
      if (Math.abs(c.theta) > 1.5e-3 || Math.abs(c.omega) > 1e-2 || Math.abs(c.phi) > 1.5e-3 || Math.abs(c.phiV) > 1e-2) busy = true;
      else c.theta = c.omega = c.phi = c.phiV = 0;
    }

    /* ---------- lopte ---------- */
    const sub = 3;
    for (let k = 0; k < sub; k++) this.stepBalls(dt / sub, now);
    for (const b of this.balls) {
      if (b.state === "home") busy = true;
      if (b.state === "free" && !(b.grounded && b.v.lengthSq() < 1e-6)) {
        busy = true;
        this.why += "ball ";
      }
    }

    /* ---------- kamera (paralaksa mišem) ---------- */
    const p = this.par;
    const pk = 1 - Math.exp(-dt * 4);
    p.x += (p.tx - p.x) * pk;
    p.y += (p.ty - p.y) * pk;
    if (Math.abs(p.tx - p.x) > 1e-4 || Math.abs(p.ty - p.y) > 1e-4) {
      busy = true;
      this.why += "par ";
    }
    const ci = this.introDone || this.t0 < 0 ? 1 : ease3((t - 0.05) / 1.8);
    const cam = this.camera;
    // Vožnja kamere (grafit): kad šipka stane, kamera se polako primakne dresu u sredini
    // (~6 %); čim se šipka pomakne, mekano se odmakne. Manje pokreta → bez vožnje.
    if (this.graf && !this.reduced) {
      const zt = this.introDone && this.mode === "rest" && this.drag.id < 0 ? 1 : 0;
      this.zoom += (zt - this.zoom) * (1 - Math.exp(-dt * (zt ? 1.5 : 5.5)));
      if (Math.abs(zt - this.zoom) > 1e-3) {
        busy = true;
        this.why += "zoom ";
      } else this.zoom = zt;
    } else this.zoom = 0;
    const zk = this.zoom * (this.opt.mobile ? 0.05 : 0.065) * ease3(ci * 1.0);
    // vodoravno (visina kamere = visina šipke → šipka ostaje ravna i kad se kamera primakne)
    const zx = (this.look.x - this.camBase.x) * zk;
    const zy = this.graf ? 0 : (this.look.y - this.camBase.y) * zk;
    const zz = (this.look.z - this.camBase.z) * zk;
    cam.position.set(this.camBase.x + zx + p.x * 0.14, this.camBase.y + zy + p.y * 0.07 + (1 - ci) * 0.28, this.camBase.z + zz + (1 - ci) * 0.55);
    cam.lookAt(this.look.x + zx + p.x * 0.04, this.look.y + (1 - ci) * 0.08, this.look.z + zz);

    /* ---------- svjetla ---------- */
    this.hemi.intensity = (this.graf ? 0.55 : 0.4) * L.amb;
    this.fill.intensity = (this.graf ? 1.0 : 0.8) * L.amb;
    this.key.intensity = 70 * L.key;
    this.rackSpot.intensity = 30 * L.rack;
    this.capSpot.intensity = 30 * L.cap;
    this.backSpot.intensity = 6 * L.back;
    // vidljivi snopovi: samo dašak "haze" u mirovanju, kratko bljesnu pri paljenju
    (this.keyCone.material as THREE.ShaderMaterial).uniforms.intensity.value = 0.07 * Math.min(1, L.key) + 0.4 * beamFlash(t, 1.22);
    (this.rackCone.material as THREE.ShaderMaterial).uniforms.intensity.value = 0.025 * Math.min(1, L.rack) + 0.45 * beamFlash(t, 0.95);
    (this.capCone.material as THREE.ShaderMaterial).uniforms.intensity.value = 0.025 * Math.min(1, L.cap) + 0.45 * beamFlash(t, 1.08);
    // galerijske lokve na poliranom podu
    (this.keyPool.material as THREE.MeshBasicMaterial).opacity = (this.opt.mobile ? 0.09 : 0.07) * L.key;
    this.keyPool.scale.set(this.narrow ? 1.4 : 1.5, this.narrow ? 1.1 : 0.9, 1);
    (this.standPools[0].material as THREE.MeshBasicMaterial).opacity = 0.09 * L.rack;
    (this.standPools[1].material as THREE.MeshBasicMaterial).opacity = 0.09 * L.cap;
    const lu = (this.ledTube.material as THREE.ShaderMaterial).uniforms;
    lu.intensity.value = 2.2 * L.led;
    lu.sweep.value = sweep;
    lu.head.value = L.head;
    this.spark.visible = !this.graf && L.head > 0.01;
    if (this.spark.visible) {
      const sx = clamp(sweep, -RAIL_U, RAIL_U);
      this.spark.position.set(sx, RAIL_Y + 0.08, zOf(sx) + 0.1);
      this.spark.rotation.y = Math.atan(dzOf(sx));
      (this.spark.material as THREE.MeshBasicMaterial).opacity = 0.9 * L.head;
    }
    const gu = (this.ledGlow.material as THREE.ShaderMaterial).uniforms;
    gu.intensity.value = 0.32 * L.led;
    gu.sweep.value = sweep;
    for (const s of this.scallops) (s.material as THREE.MeshBasicMaterial).opacity = (s.userData.base as number) * 0.6 * L.back;
    if (this.wallMat) {
      const wu = this.wallMat.uniforms;
      wu.uWash.value = 0.75 * L.back + 0.25 * Math.min(1, L.key);
      wu.uPool.value = Math.min(1, L.key);
      wu.uTop.value = this.wallTop;
      wu.uRail.value = L.led;
      wu.uSweep.value = sweep;
      wu.uPar.value = this.par.x;
    }
    if (this.floorSpill) (this.floorSpill.material as THREE.MeshBasicMaterial).opacity = (this.wallKind === 2 ? 0.08 : 0.15) * L.back;
    // polirani pod: odraz LED linije, dresova i kroma
    (this.reflector.material as THREE.ShaderMaterial).uniforms.strength.value = this.graf ? 0.42 : 0.48 * Math.max(L.amb, L.led * 0.6);

    /* ---------- natpis ---------- */
    if (this.signFace && this.signHalo) {
      const on = (this.signFace.material as THREE.ShaderMaterial).uniforms.uOn.value as number[];
      for (let i = 0; i < on.length; i++) on[i] = letterFlick(t, 0.6 + i * 0.045, i);
      const hu = (this.signHalo.material as THREE.ShaderMaterial).uniforms;
      (hu.onA.value as THREE.Vector4).set(on[0], on[1], on[2], on[3]);
      (hu.onB.value as THREE.Vector3).set(on[4], on[5], on[6]);
    }

    // mirno (samo disanje tkanine) → na mobitelu 30 sl/s
    // (etikete u mirovanju samo mikro-njihanje → smiju na 30 sl/s, ali ne dok padaju)
    this.calm = this.mode === "rest" && this.clothT - this.tagAt > 2.5 && !/swing|cloth|ball|par|spot|zoom/.test(this.why);
    return busy;
  }

  /* ================================================================== */
  /*  Petlja                                                              */
  /* ================================================================== */
  private inFrame = false;
  private wakeReq = false;
  private calm = false;
  private frame = (ts: number) => {
    this.raf = null;
    if (this.disposed) return;
    if (this.calm && this.opt.mobile && this.firstFrame && this.forced <= 0 && !this.wakeReq && (++this.idleSkip & 1) === 1) {
      if (this.visible) this.raf = requestAnimationFrame(this.frame);
      return;
    }
    this.inFrame = true;
    this.wakeReq = false;
    const dt = Math.min(0.033, Math.max(0.001, (ts - this.last) / 1000 || 0.016));
    this.last = ts;
    const c0 = performance.now();
    const busy = this.step(dt, ts);
    // Na mobitelu se zamućeni odraz poda osvježava svaki drugi kadar (nije primjetno, a
    // prepolovi cijenu drugog prolaza); tekstura iz prošlog kadra ostaje na podu.
    const skipReflect = this.opt.mobile && this.firstFrame && (this.stats.frames & 1) === 1;
    this.reflector.onBeforeRender = skipReflect ? this.noop : this.reflectPass;
    if (this.dof) this.dof.render(this.scene, this.camera);
    else this.renderer.render(this.scene, this.camera);
    const cpu = performance.now() - c0;
    const st = this.stats;
    st.frames++;
    st.cpu.push(cpu);
    if (st.cpu.length > 240) st.cpu.shift();
    if (!this.firstFrame) {
      this.firstFrame = true;
      this.ev.onFirstFrame();
    }
    if (this.forced > 0) this.forced--;
    this.inFrame = false;
    // jedna jedina petlja: buđenje tijekom kadra samo traži sljedeći kadar
    if (this.visible && (busy || this.forced > 0 || this.wakeReq)) this.raf = requestAnimationFrame(this.frame);
    else if (!this.visible) this.raf = null;
  };

  wake() {
    if (this.inFrame) {
      this.wakeReq = true;
      return;
    }
    if (this.raf != null || this.disposed || (!this.visible && this.firstFrame)) return;
    this.last = performance.now();
    this.raf = requestAnimationFrame(this.frame);
  }

  setVisible(v: boolean) {
    this.visible = v;
    if (v) {
      if (this.introPending) {
        this.introPending = false;
        this.beginIntro();
      }
      this.forced = Math.max(this.forced, 1);
      this.wake();
    } else if (this.raf != null && this.firstFrame) {
      cancelAnimationFrame(this.raf);
      this.raf = null;
    }
  }

  // Ulazni niz (svjetla se pale jedno po jedno, dresovi uklize, kamera se smiri).
  private introPending = false;
  startIntro() {
    if (this.t0 >= 0 || this.introPending) return;
    // ulazni niz kreće tek kad je scena stvarno na ekranu
    if (!this.visible) {
      this.introPending = true;
      return;
    }
    this.beginIntro();
  }
  private beginIntro() {
    this.t0 = performance.now();
    let seen = false;
    try {
      const key = this.graf ? GRAF_INTRO_KEY : INTRO_KEY;
      seen = window.sessionStorage.getItem(key) === "1";
      window.sessionStorage.setItem(key, "1");
    } catch {
      /* privatni prozor → niz se svaki put odvrti */
    }
    const reduce = typeof window.matchMedia === "function" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (seen || reduce) {
      // već viđeno u ovoj sesiji / manje pokreta → svjetla odmah upaljena, bez klizanja
      this.introDone = true;
      this.grafDone = true;
      this.active = -1;
      this.forced = Math.max(this.forced, 2);
      this.wake();
      return;
    }
    this.pos = this.target - 1.5;
    this.vel = 0;
    this.mode = "spring";
    this.wake();
  }
  // Dodir/kotačić tijekom ulaznog niza → skoči na kraj (sve upaljeno).
  private skipIntro() {
    if (this.t0 >= 0 && !this.grafDone) {
      // dodir → grafit odmah gotov
      this.grafDone = true;
      this.wake();
    }
    if (this.introDone || this.t0 < 0) return;
    this.t0 = performance.now() - INTRO_END * 1000 - 1;
    this.wake();
  }

  // Nagib uređaja (žiroskop) → ista paralaksa kao miš na računalu (odsjaji kroma, lokva
  // svjetla na zidu, kamera). Samo gdje ne treba dozvola (Android); na iOS-u bi
  // DeviceOrientationEvent.requestPermission otvorio sistemski upit → ne tražimo ga.
  private tilt0: { b: number; g: number } | null = null;
  private onOrient = (e: DeviceOrientationEvent) => {
    if (e.beta == null || e.gamma == null) return;
    if (!this.tilt0) this.tilt0 = { b: e.beta, g: e.gamma };
    const z = this.tilt0;
    // polagano centriranje: držanje mobitela pod drugim kutom ne ostavlja trajni pomak
    z.b += (e.beta - z.b) * 0.02;
    z.g += (e.gamma - z.g) * 0.02;
    const tx = clamp((e.gamma - z.g) / 18, -1, 1);
    const ty = clamp((e.beta - z.b) / 24, -1, 1) * 0.6;
    if (Math.abs(tx - this.par.tx) < 0.03 && Math.abs(ty - this.par.ty) < 0.03) return;
    this.par.tx = tx;
    this.par.ty = ty;
    this.wake();
  };

  /** Okvir stavke na ekranu (isti omjer kao okvir slike u kartici) — za let kartice. */
  itemRect(i: number): DOMRect | null {
    if (!this.items[i]) return null;
    const d = this.deltaOf(i);
    if (Math.abs(d) > this.maxA) return null;
    const u = uOf(this.sAt(d));
    const sc = this.scAt(d);
    const cam = this.camera;
    cam.updateMatrixWorld();
    const yTop = RAIL_Y - (sc - 1) * RAIL_R + (RAIL_R + HOOK_INNER * H) * sc;
    const top = new THREE.Vector3(u, yTop, zOf(u)).project(cam);
    const bot = new THREE.Vector3(u, yTop - H * sc, zOf(u)).project(cam);
    const cr = this.canvas.getBoundingClientRect();
    const y0 = cr.top + ((1 - top.y) / 2) * cr.height;
    const y1 = cr.top + ((1 - bot.y) / 2) * cr.height;
    const cx = cr.left + ((top.x + 1) / 2) * cr.width;
    const h = y1 - y0;
    const w = h * this.items[i].aspect;
    return new DOMRect(cx - w / 2, y0 - HOOK_INNER * h, w, h);
  }

  getStats() {
    const c = [...this.stats.cpu].sort((a, b) => a - b);
    const q = (p: number) => (c.length ? c[Math.min(c.length - 1, Math.floor(c.length * p))] : 0);
    return { frames: this.stats.frames, cpuMedian: q(0.5), cpuP95: q(0.95), sleeping: this.raf == null, why: this.why, mode: this.mode };
  }

  /* ================================================================== */
  /*  Unos                                                                */
  /* ================================================================== */
  private pick(clientX: number, clientY: number) {
    const cr = this.canvas.getBoundingClientRect();
    this.ndc.set(((clientX - cr.left) / cr.width) * 2 - 1, -((clientY - cr.top) / cr.height) * 2 + 1);
    this.camera.updateMatrixWorld();
    this.ray.setFromCamera(this.ndc, this.camera);
    // lopte (veća dodirna površina od same lopte)
    let ball = -1;
    let bestT = Infinity;
    const sph = new THREE.Sphere();
    const hit = new THREE.Vector3();
    this.balls.forEach((b, i) => {
      if (!b.mesh.visible || b.state === "off") return;
      sph.set(b.mesh.position, this.ballR * 1.45);
      if (this.ray.ray.intersectSphere(sph, hit)) {
        const t = hit.distanceTo(this.ray.ray.origin);
        if (t < bestT) {
          bestT = t;
          ball = i;
        }
      }
    });
    if (ball >= 0) {
      const b = this.balls[ball];
      const sp = b.mesh.position.clone().project(this.camera);
      const pxR = this.ballR * this.pxPerM * 1.2;
      const offX = clamp(((clientX - (cr.left + ((sp.x + 1) / 2) * cr.width)) / Math.max(8, pxR)), -1, 1);
      return { kind: "ball" as const, index: ball, offX };
    }
    const caps = this.caps.map((c) => c.mesh).filter(Boolean) as THREE.Mesh[];
    const ch = this.ray.intersectObjects(caps, false);
    if (ch.length) return { kind: "cap" as const, index: ch[0].object.userData.cap as number };
    const meshes: THREE.Mesh[] = [];
    for (const v of this.views.values()) for (const pc of v.pieces) if (pc.mesh && pc.root.visible) meshes.push(pc.mesh);
    const hits = this.ray.intersectObjects(meshes, false);
    for (const h of hits) {
      // samo neprozirni dio slike
      const m = h.object as THREE.Mesh;
      const mat = m.material as THREE.MeshStandardMaterial;
      if (h.uv && mat.map && !this.opaqueAt(mat.map, h.uv)) continue;
      return { kind: "item" as const, index: m.userData.item as number };
    }
    return null;
  }

  private pickTag(clientX: number, clientY: number): PriceTag | null {
    const cr = this.canvas.getBoundingClientRect();
    this.ndc.set(((clientX - cr.left) / cr.width) * 2 - 1, -((clientY - cr.top) / cr.height) * 2 + 1);
    this.camera.updateMatrixWorld();
    this.ray.setFromCamera(this.ndc, this.camera);
    const objs: THREE.Object3D[] = [];
    const own = new Map<THREE.Object3D, PriceTag>();
    for (const v of this.views.values())
      for (const pc of v.pieces)
        if (pc.tag && pc.root.visible && pc.tag.group.visible)
          for (const o of pc.tag.hit) {
            objs.push(o);
            own.set(o, pc.tag);
          }
    if (!objs.length) return null;
    const h = this.ray.intersectObjects(objs, false)[0];
    return h ? own.get(h.object) ?? null : null;
  }

  private alphaCanvas = new Map<THREE.Texture, { data: Uint8ClampedArray; w: number; h: number } | null>();
  private opaqueAt(tex: THREE.Texture, uv: THREE.Vector2) {
    let a = this.alphaCanvas.get(tex);
    if (a === undefined) {
      try {
        const im = tex.image as CanvasImageSource & { width: number; height: number };
        const w = 64;
        const h = Math.round((64 * im.height) / im.width);
        const c = document.createElement("canvas");
        c.width = w;
        c.height = h;
        const g = c.getContext("2d", { willReadFrequently: true })!;
        g.drawImage(im, 0, 0, w, h);
        a = { data: g.getImageData(0, 0, w, h).data, w, h };
      } catch {
        a = null;
      }
      this.alphaCanvas.set(tex, a);
    }
    if (!a) return true;
    const x = clamp(Math.floor(uv.x * a.w), 0, a.w - 1);
    const y = clamp(Math.floor(uv.y * a.h), 0, a.h - 1);
    // malo tolerancije: pogledaj i susjedne piksele
    for (const [ox, oy] of [[0, 0], [2, 0], [-2, 0], [0, 2], [0, -2]]) {
      const xx = clamp(x + ox, 0, a.w - 1);
      const yy = clamp(y + oy, 0, a.h - 1);
      if (a.data[(yy * a.w + xx) * 4 + 3] > 40) return true;
    }
    return false;
  }

  private onTouchStart = (e: TouchEvent) => {
    this.skipIntro();
    // dodir koji počne na lopti/kapi ne pomiče stranicu
    const t = e.touches[0];
    if (!t || e.touches.length > 1) return;
    const p = this.pick(t.clientX, t.clientY);
    if (p && (p.kind === "ball" || p.kind === "cap")) e.preventDefault();
  };

  private onPointerDown = (e: PointerEvent) => {
    this.skipIntro();
    if (e.pointerType === "mouse" && e.button !== 0) return;
    const p = this.pick(e.clientX, e.clientY);
    if (p?.kind === "ball") {
      e.preventDefault();
      const b = this.balls[p.index];
      const id = `b${p.index}`;
      const now = performance.now();
      if (b.state === "rack") {
        if (this.lastTap && this.lastTap.id === id && now - this.lastTap.t < 320) {
          this.lastTap = null;
          if (this.tapTimer) clearTimeout(this.tapTimer);
          this.tapTimer = null;
          this.ev.onMix("lopta", b.club);
          return;
        }
        this.lastTap = { id, t: now };
        if (this.tapTimer) clearTimeout(this.tapTimer);
        this.tapTimer = setTimeout(() => {
          this.tapTimer = null;
          this.release(p.index);
        }, 260);
        return;
      }
      this.kick(p.index, p.offX);
      return;
    }
    if (p?.kind === "cap") {
      e.preventDefault();
      const c = this.caps[p.index];
      const id = `c${p.index}`;
      const now = performance.now();
      if (this.lastTap && this.lastTap.id === id && now - this.lastTap.t < 360) {
        this.lastTap = null;
        this.ev.onMix("kapa", c.club);
        return;
      }
      this.lastTap = { id, t: now };
      c.omega += (Math.random() < 0.5 ? -1 : 1) * 2.6;
      c.phiV += 1.4;
      this.wake();
      return;
    }
    // šipka: povlačenje vodoravno (okomito pomiče stranicu — touch-action: pan-y)
    this.drag = { id: e.pointerId, x0: e.clientX, y0: e.clientY, pos0: this.pos, on: false, lx: e.clientX, lt: performance.now(), v: 0, decided: false };
  };

  private onPointerMove = (e: PointerEvent) => {
    const d = this.drag;
    if (e.pointerType === "mouse" && d.id !== e.pointerId) {
      // paralaksa + kursor + lagani "dodir" dresa mišem
      const cr = this.canvas.getBoundingClientRect();
      this.par.tx = clamp(((e.clientX - cr.left) / cr.width) * 2 - 1, -1, 1);
      this.par.ty = clamp(((e.clientY - cr.top) / cr.height) * 2 - 1, -1, 1);
      const now = performance.now();
      if (now - this.hoverAt > 70) {
        this.hoverAt = now;
        const p = this.pick(e.clientX, e.clientY);
        this.canvas.style.cursor = p && (p.kind !== "item" || p.index === this.active) ? "pointer" : "grab";
        if (p?.kind === "item") {
          const v = this.views.get(p.index);
          if (v)
            for (const pc of v.pieces) {
              if (Math.abs(pc.omega) < 0.25) pc.omega += (Math.random() < 0.5 ? -1 : 1) * 0.35;
              // dašak "dodira" tkanine na mjestu kursora
              if (pc.cloth && pc.mesh && !this.reduced) {
                const lp = pc.mesh.worldToLocal(new THREE.Vector3().copy(this.ray.ray.origin).addScaledVector(this.ray.ray.direction, this.camera.position.distanceTo(pc.mesh.getWorldPosition(new THREE.Vector3()))));
                pc.cloth.kick(clamp(lp.x * 2, -1, 1), 0.18);
              }
            }
        }
      }
      this.wake();
      return;
    }
    if (d.id !== e.pointerId) return;
    const dx = e.clientX - d.x0;
    const dy = e.clientY - d.y0;
    if (!d.decided) {
      if (Math.abs(dx) < 6 && Math.abs(dy) < 6) return;
      d.decided = true;
      if (Math.abs(dx) <= Math.abs(dy)) {
        d.id = -1; // okomito → stranica se pomiče
        return;
      }
      d.on = true;
      d.x0 = e.clientX;
      d.pos0 = this.pos;
      try {
        this.canvas.setPointerCapture(e.pointerId);
      } catch {
        /* ignore */
      }
      this.mode = "drag";
      this.vel = 0;
      this.ev.onDrag();
    }
    if (!d.on) return;
    const unit = this.pxPerM * this.unitM();
    this.pos = d.pos0 - (e.clientX - d.x0) / unit;
    const now = performance.now();
    const dtm = Math.max(1, now - d.lt);
    const inst = (-(e.clientX - d.lx) / unit / dtm) * 1000;
    d.v = d.v * 0.4 + inst * 0.6;
    d.lx = e.clientX;
    d.lt = now;
    this.wake();
  };

  private onPointerUp = (e: PointerEvent) => {
    const d = this.drag;
    if (d.id !== e.pointerId) return;
    d.id = -1;
    if (d.on) {
      d.on = false;
      const v = performance.now() - d.lt > 90 ? 0 : clamp(d.v, -14, 14);
      if (Math.abs(v) > 1.6) {
        this.vel = v;
        this.mode = "glide";
      } else {
        this.target = this.pos + this.wrapD(this.track.u[this.nearest(this.pos + v * 0.2)] - this.pos);
        this.vel = v;
        this.mode = "spring";
      }
      this.wake();
      return;
    }
    if (e.type === "pointercancel" || d.decided) return;
    // dodir etikete → okret na poleđinu
    const tg = this.pickTag(e.clientX, e.clientY);
    if (tg) {
      tg.flip();
      this.wake();
      return;
    }
    // dodir: sredina → skini s vješalice; susjed → dovedi u sredinu
    const p = this.pick(e.clientX, e.clientY);
    if (p?.kind !== "item") return;
    if (p.index === this.active && Math.abs(this.deltaOf(p.index)) < 0.3) this.ev.onOpen(p.index);
    else this.goTo(p.index);
  };

  private onPointerLeave = (e: PointerEvent) => {
    if (e.pointerType !== "mouse") return;
    this.par.tx = 0;
    this.par.ty = 0;
    this.wake();
  };

  private onWheel = (e: WheelEvent) => {
    this.skipIntro();
    if (Math.abs(e.deltaX) <= Math.abs(e.deltaY) || Math.abs(e.deltaX) < 1) return;
    e.preventDefault();
    this.mode = "drag";
    this.pos += e.deltaX / (this.pxPerM * this.unitM());
    this.ev.onDrag();
    if (this.wheelTimer) clearTimeout(this.wheelTimer);
    this.wheelTimer = setTimeout(() => {
      this.target = this.pos + this.wrapD(this.track.u[this.nearest(this.pos)] - this.pos);
      this.mode = "spring";
      this.wake();
    }, 140);
    this.wake();
  };

  private bind() {
    const c = this.canvas;
    c.addEventListener("pointerdown", this.onPointerDown);
    c.addEventListener("pointermove", this.onPointerMove);
    c.addEventListener("pointerup", this.onPointerUp);
    c.addEventListener("pointercancel", this.onPointerUp);
    c.addEventListener("pointerleave", this.onPointerLeave);
    c.addEventListener("touchstart", this.onTouchStart, { passive: false });
    c.addEventListener("wheel", this.onWheel, { passive: false });
    c.addEventListener("contextmenu", this.onContextMenu);
    if (this.useTilt()) window.addEventListener("deviceorientation", this.onOrient);
  }
  private useTilt() {
    if (!this.opt.mobile || typeof window === "undefined" || !("DeviceOrientationEvent" in window)) return false;
    if (typeof window.matchMedia === "function" && window.matchMedia("(prefers-reduced-motion: reduce)").matches) return false;
    const D = window.DeviceOrientationEvent as unknown as { requestPermission?: unknown };
    return typeof D.requestPermission !== "function";
  }
  private onContextMenu = (e: MouseEvent) => {
    if (this.pick(e.clientX, e.clientY)?.kind === "ball") e.preventDefault();
  };

  bestScore() {
    return this.best;
  }

  /** Scena "grafit" (zadana): kadar i svjetlo vodi engine — smjerovi demo-a ih ne smiju krpati. */
  get graffitiScene() {
    return this.graf;
  }

  dispose() {
    this.disposed = true;
    this.abort.abort();
    if (this.raf != null) cancelAnimationFrame(this.raf);
    if (this.tapTimer) clearTimeout(this.tapTimer);
    if (this.wheelTimer) clearTimeout(this.wheelTimer);
    const c = this.canvas;
    c.removeEventListener("pointerdown", this.onPointerDown);
    c.removeEventListener("pointermove", this.onPointerMove);
    c.removeEventListener("pointerup", this.onPointerUp);
    c.removeEventListener("pointercancel", this.onPointerUp);
    c.removeEventListener("pointerleave", this.onPointerLeave);
    c.removeEventListener("touchstart", this.onTouchStart);
    c.removeEventListener("wheel", this.onWheel);
    c.removeEventListener("contextmenu", this.onContextMenu);
    window.removeEventListener("deviceorientation", this.onOrient);
    this.scene.traverse((o) => {
      const m = o as THREE.Mesh;
      if (m.isMesh) {
        m.geometry?.dispose();
        const mat = m.material as THREE.Material | THREE.Material[];
        if (Array.isArray(mat)) mat.forEach((x) => x.dispose());
        else mat?.dispose();
      }
    });
    for (const e of this.texCache.values()) if (e.tex) this.dropTexture(e.tex);
    this.texCache.clear();
    this.alphaCanvas.clear();
    this.env.dispose();
    this.shadowTex.dispose();
    for (const t of this.ownTex) t.dispose();
    this.ownTex = [];
    this.reflector.dispose();
    this.dof?.dispose();
    this.dof = null;
    this.renderer.dispose();
    // Kontekst se inače oslobodi tek s GC-om (preglednici dopuštaju ~16 živih WebGL konteksta).
    // Ako je platno nakon ovog takta maknuto iz DOM-a (odlazak sa stranice), odmah ga otpusti;
    // ako je još u DOM-u (StrictMode ponovno montiranje istog platna), kontekst se koristi dalje.
    const r = this.renderer;
    setTimeout(() => {
      if (!c.isConnected) r.forceContextLoss();
    }, 0);
  }
}
