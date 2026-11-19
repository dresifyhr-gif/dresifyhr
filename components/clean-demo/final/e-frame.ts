import * as THREE from "three";

import type { StoreEngine } from "@/components/naslovnica/three/engine";
import { graffitiMaterial, neonGlowTexture, type GraffitiArt } from "@/components/naslovnica/three/graffiti";
import type { GarmentUniforms } from "@/components/naslovnica/three/parts";

import { loadGraffitiPaths, paintGraffiti, type GraffitiPaths } from "./e-graffiti";
import { logoMaterial, logoMetrics, logoTexture, paintLogo, type LogoArt } from "./e-logo";
import { SurnameLayer, type NameBox } from "./f-surname";

/* ------------------------------------------------------------------ */
/*  Smjer E — kadar, fokus i "materijal" scene nad zajedničkim          */
/*  StoreEngineom. Sve se postavlja izvana, samo na ovoj instanci       */
/*  (zaštićeno try/catch — ako se engine promijeni, ostaje njegov       */
/*  izvorni izgled).                                                    */
/*                                                                      */
/*  1. Dres u fokusu ≈1,75× susjeda; rub mu je na ~70 % visine kadra    */
/*     (iznad natpisa), odraz se gasi prije skale.                      */
/*  2. Dubinska oštrina kao pravi objektiv: mekoća raste s udaljenošću  */
/*     od dresa u fokusu (najbliži susjedi tek malo mekani), boje ostaju  */
/*     pune (bez desaturacije, bez sive koprene) — susjedi su samo malo   */
/*     tamniji jer su izvan lokve svjetla; junak potpuno oštar.           */
/*  3. Zid je blizu šipke (zidni nosači) → svaki dres baca meku sjenu    */
/*     na beton (oštrija uz vješalicu, mekša prema rubu).                */
/*  4. Beton u velikom mjerilu: oplatne ploče, rupe od vezica, curenje   */
/*     vode, prljavština pri dnu, svjetlosni snop iza junaka.            */
/*  5. Mokri pod: sjajna tamna ploha, mutni odraz koji se gasi, neonski  */
/*     odsjaj ispod IFY, meka kontaktna sjena uz zid (bez tvrde trake).  */
/*  6. Na zidu NAŠ LOGO (e-logo: obris kao prezimena, DRES siv, IFY       */
/*     limeta, ulaz "neonska linija"). Grafit samo za usporedbu:          */
/*     ?grafit=kod (vektorski sprej), ?grafit=meta (stara slika).         */
/*  7. Pokret: zakret i nagib prema smjeru vožnje, rub kasni, jedan      */
/*     prigušeni prebačaj kad šipka stane (~0,8 s).                     */
/*  8. Krom šipka s linijom odsjaja i dva zidna nosača.                  */
/* ------------------------------------------------------------------ */

type GrafArt = Pick<GraffitiArt, "aspect" | "base" | "ext" | "top">;
type DofK = { back: number; front: number; lat: number; max: number; dead: number; latDead: number };
type Dof = { k: DofK; wall: { z: number; max: number } };
type Piece = {
  mesh: THREE.Mesh | null;
  mat: THREE.MeshBasicMaterial | null;
  gu?: GarmentUniforms | null;
  root?: THREE.Group;
  swing?: THREE.Group;
  theta: number;
  omega: number;
  phi: number;
  lastA: number;
  cloth?: unknown;
};
type View = { index: number; pieces: Piece[] };

type Internals = {
  scene?: THREE.Scene;
  camera?: THREE.PerspectiveCamera;
  camBase?: THREE.Vector3;
  look?: THREE.Vector3;
  W?: number;
  Hpx?: number;
  tanH?: number;
  pxPerM?: number;
  yTop?: number;
  zFront?: number;
  forced?: number;
  pos?: number;
  dof?: Dof | null;
  reflector?: THREE.Mesh;
  graffiti?: THREE.Mesh | null;
  grafArt?: GraffitiArt | null;
  grafReady?: number;
  wallNoise?: THREE.Texture | null;
  views?: Map<number, View>;
  focusP?: THREE.Vector3;
  rack?: THREE.Object3D;
  stand?: THREE.Object3D;
  standPools?: THREE.Object3D[];
  rackCone?: THREE.Object3D;
  capCone?: THREE.Object3D;
  rackSpot?: THREE.SpotLight;
  capSpot?: THREE.SpotLight;
  neonWall?: THREE.Object3D | null;
  neonFloor?: THREE.Object3D | null;
  railGroup?: THREE.Group;
  chrome?: THREE.Material;
  resize?: (w: number, h: number) => void;
  placeGraffiti?: () => void;
  sAt?: (d: number) => number;
  scAt?: (d: number) => number;
  deltaOf?: (i: number) => number;
  unprojectY?: (ndcY: number, z: number) => number;
  floorZAtNdc?: (ndcY: number) => number;
  wake?: () => void;
  /** mjere natpisa za kadar (logo: poznate unaprijed → kamera ne skače kad se nacrta) */
  eArtHint?: GrafArt;
  /** koliki dio slova šipka smije prijeći (logo manje od grafita) */
  eCross?: { narrow: number; wide: number };
  /** udio širine kadra za natpis (cilj / najmanje) */
  eW?: { w: { narrow: number; wide: number }; min: { narrow: number; wide: number } };
};

export type EFrameOpts = {
  /** rub junaka: px iznad dna platna (uski ekran) / udio visine platna od dna (široki) */
  hem: { narrowPx: number; wideFrac: number };
  /** px ispod vrha platna za najviši trag grafita */
  grafTopPx: { narrow: number; wide: number };
  mobile: boolean;
  reduced: boolean;
  /** FINAL: "logo" = obris DRESIFY na zidu; "none" = čisti beton (bez logotipa i grafita) */
  wall?: "logo" | "none";
  /** FINAL: golemo obrisano prezime iza dresa u fokusu (u sceni, ispred zida) */
  surname?: boolean;
  /** ravna fotografija dresa (engine flat): bez rubnog svjetla na tkanini — točno fotografija */
  flat?: boolean;
  /** bez DOF prolaza: dalji susjedi dobiju blagu mip-mekoću (unaprijed zamućena tekstura) */
  noDof?: boolean;
};

export type EFrameApi = {
  off: () => void;
  /** prezime dresa u fokusu (dir = smjer vožnje, ±1) */
  setName: (name: string, dir: number) => void;
  /** kutija prezimena u px platna (za DOM kopiju u prijelazu) */
  nameBox: () => NameBox | null;
  /** y šipke u px platna */
  railY: () => number | null;
};

// prezime: tik ispred zida (= WALL_Z + 0,006) — iza sjena dresova
const NAME_Z = -0.46 + 0.006;

const RAIL_Y = 1.8; // = engine
const RAIL_R = 0.017; // = engine
const ENGINE_WALL_Z = -2.1; // = engine
// E: zid odmah iza šipke (šipka je na zidnim nosačima) → dresovi bacaju sjenu na beton
const WALL_Z = -0.46;
const SP_G = 0.8; // = engine (razmak po jedinici pomaka)
// Krivulja junaka (E): veći u sredini i uži "brijeg" nego u engineu (1,46×) → ~1,75× susjeda.
const HERO = { A: 0.86, W: 0.44, B: 0.16, C: 1.7 };
const S0 = 1 + HERO.A; // mjerilo junaka u mirovanju
const HEM_DROP = 1.08; // rub dresa ispod šipke po jedinici mjerila (izmjereno)
const HALF_W = 0.41 / 1.46; // pola širine dresa (m) po jedinici mjerila
const hemY = (s: number) => RAIL_Y - HEM_DROP * s;
const FLOOR_Y = hemY(S0) - 0.05;

// Grafit: udio širine kadra (cilj / najmanje) i koliko donjeg dijela slova šipka smije prijeći.
const GRAF_W = { narrow: 0.84, wide: 0.66 };
const GRAF_W_MIN = { narrow: 0.76, wide: 0.56 };
const CROSS = { narrow: 0.26, wide: 0.5 };
// Logo (obris): veći i čitljiv, šipka prelazi samo dno slova (kuke vise ispred obrisa)
// Uski ekran (iPhone): logo malo uži, a šipka prelazi donju trećinu slova (kuke vise ispred
// obrisa) → dres u fokusu bitno veći, logo i dalje čitljiv iznad šipke.
const LOGO_W = { narrow: 0.8, wide: 0.72 };
const LOGO_W_MIN = { narrow: 0.72, wide: 0.6 };
const LOGO_CROSS = { narrow: 0.34, wide: 0.16 };
// razmak između dna slova i šipke (NDC)
const GAP = { narrow: 0.0, wide: 0.0 };
// pola širine JUNAKA (NDC x): najviše / najmanje
const JW_MAX = { narrow: 0.39, wide: 0.24 };
const JW_MIN = { narrow: 0.32, wide: 0.19 };

type Plan = { f: number; railNdc: number; topNdc: number; narrow: boolean; halfWRail: number };
const plans = new WeakMap<object, Plan>();

/* ---------------- 1. mjerilo i položaj (junak + dolly) ---------------- */

function heroCurves(e: Internals, amt: { v: number }) {
  const scale = (d: number) => {
    const A = HERO.A * amt.v;
    return 1 + A / (1 + (d / HERO.W) ** 2) - (HERO.B * d * d) / (d * d + HERO.C * HERO.C);
  };
  const pos = (d: number) => {
    const A = HERO.A * amt.v;
    return d + A * HERO.W * Math.atan(d / HERO.W) - HERO.B * (d - HERO.C * Math.atan(d / HERO.C));
  };
  e.scAt = scale;
  e.sAt = (d: number) => pos(d) * SP_G;
  return () => {
    delete e.scAt;
    delete e.sAt;
  };
}

/* ---------------- kadar ---------------- */

function frame(e: Internals, o: EFrameOpts) {
  const cam = e.camera;
  const base = e.camBase;
  const look = e.look;
  const W = e.W ?? 0;
  const Hh = e.Hpx ?? 0;
  if (!cam || !base || !look || W < 2 || Hh < 2) return;
  const narrow = W / Hh < 0.9;
  const key = narrow ? "narrow" : "wide";
  const art: GrafArt = e.eArtHint ?? e.grafArt ?? { aspect: 2, base: 0.22, ext: 0.78, top: 0.62 };

  const hemPx = narrow ? o.hem.narrowPx : o.hem.wideFrac * Hh;
  const hemT = -1 + (2 * hemPx) / Hh;
  const topNdc = 1 - (2 * o.grafTopPx[key]) / Hh;

  const dir = new THREE.Vector3().subVectors(look, base);
  if (dir.z >= -1e-3) return;
  const dirN = dir.clone().multiplyScalar(1 / -dir.z);
  const v = new THREE.Vector3();
  const place = (D: number, y: number) => {
    cam.position.set(0, y, D);
    cam.lookAt(dirN.x * D, y + dirN.y * D, 0);
    cam.updateMatrixWorld();
  };
  const solveY = (D: number) => {
    let lo = -2;
    let hi = 6;
    for (let k = 0; k < 28; k++) {
      const mid = (lo + hi) / 2;
      place(D, mid);
      if (v.set(0, hemY(S0), 0).project(cam).y > hemT) lo = mid;
      else hi = mid;
    }
    const y = (lo + hi) / 2;
    place(D, y);
    return y;
  };
  const railAt = () => v.set(0, RAIL_Y, 0).project(cam).y;
  const jwAt = () => v.set(HALF_W * S0, RAIL_Y - 0.5, 0).project(cam).x;

  // visina grafita iznad šipke (NDC) — grafit je na zidu (dalje od kamere nego šipka)
  const cross = (e.eCross ?? CROSS)[key];
  const gw = e.eW ?? { w: GRAF_W, min: GRAF_W_MIN };
  const above = Math.max(0.2, art.ext - art.base - cross * (art.top - art.base));
  const wallK = (D: number) => D / (D - WALL_Z); // mjerilo zida prema ravnini šipke (z = 0)
  const grafH = (f: number) => (2 * above * f * (W / Hh)) / art.aspect;
  const solveD = (railMax: number) => {
    let lo = 1.2;
    let hi = 20;
    for (let k = 0; k < 26; k++) {
      const mid = (lo + hi) / 2;
      solveY(mid);
      if (railAt() <= railMax && jwAt() <= JW_MAX[key]) hi = mid;
      else lo = mid;
    }
    return hi;
  };

  let f = gw.w[key];
  let D = 6;
  for (; f > gw.min[key] + 1e-3; f -= 0.02) {
    D = solveD(topNdc - grafH(f) - GAP[key]);
    solveY(D);
    if (jwAt() >= JW_MIN[key]) break;
  }
  let y = solveY(D);
  const railMax = topNdc - grafH(f) - GAP[key];
  if (railAt() < railMax - 0.004) {
    let lo = y - 3;
    let hi = y;
    for (let k = 0; k < 28; k++) {
      const mid = (lo + hi) / 2;
      place(D, mid);
      if (railAt() > railMax) lo = mid;
      else hi = mid;
    }
    y = hi;
    place(D, y);
  }
  void wallK;

  base.set(0, y, D);
  look.set(dirN.x * D, y + dirN.y * D, 0);
  cam.position.copy(base);
  cam.lookAt(look);
  cam.updateMatrixWorld();
  cam.updateProjectionMatrix();
  const tanH = Math.tan(THREE.MathUtils.degToRad(cam.fov / 2)) * cam.aspect;
  plans.set(e, { f, railNdc: railAt(), topNdc, narrow, halfWRail: D * tanH });

  e.tanH = tanH;
  const a = v.set(0, 1.5, 0).project(cam).x;
  const b = v.set(1, 1.5, 0).project(cam).x;
  e.pxPerM = ((b - a) / 2) * W;
  if (typeof e.unprojectY === "function") e.yTop = e.unprojectY.call(e, 0.92, 0.6);
  if (typeof e.floorZAtNdc === "function") e.zFront = e.floorZAtNdc.call(e, -0.97);
  e.placeGraffiti?.call(e);
  e.forced = Math.max(e.forced ?? 0, 2);
  e.wake?.call(e);
}

function placeGraffiti(e: Internals) {
  const m = e.graffiti;
  const art = e.grafArt;
  const cam = e.camera;
  const plan = plans.get(e);
  if (!m || !art || !cam || !e.camBase || !e.look || !plan || typeof e.unprojectY !== "function" || !e.tanH) return false;
  cam.position.copy(e.camBase);
  cam.lookAt(e.look);
  cam.updateMatrixWorld();
  const key = plan.narrow ? "narrow" : "wide";
  const un = (ndc: number) => e.unprojectY!.call(e, ndc, WALL_Z);
  const yRail = un(plan.railNdc + GAP[key]);
  const yLim = un(plan.topNdc);
  const halfW = (cam.position.z - WALL_Z) * e.tanH;
  const cross = (e.eCross ?? CROSS)[key];
  const above = Math.max(0.2, art.ext - art.base - cross * (art.top - art.base));
  const Ht = Math.min((halfW * 2 * plan.f) / art.aspect, (yLim - yRail) / above);
  const yBase = yRail - cross * (art.top - art.base) * Ht;
  const cy = yBase - art.base * Ht + Ht / 2;
  m.scale.setScalar(Ht * art.aspect);
  m.position.set(0, cy, WALL_Z + 0.004);
  return true;
}

/* ---------------- scena: rekviziti, zid, pod, odraz ---------------- */

function hideProps(e: Internals) {
  if (e.rack) e.rack.visible = false;
  if (e.stand) e.stand.visible = false;
  for (const p of e.standPools ?? []) p.visible = false;
  if (e.rackCone) e.rackCone.visible = false;
  if (e.capCone) e.capCone.visible = false;
  if (e.rackSpot) e.rackSpot.intensity = 0;
  if (e.capSpot) e.capSpot.intensity = 0;
  if (e.neonWall) e.neonWall.visible = false;
  if (e.neonFloor) e.neonFloor.visible = false;
}

/** Pod podigni do ruba junaka, zid primakni šipki. Vraća poništavanje. */
function placeRoom(e: Internals) {
  const scene = e.scene;
  const refl = e.reflector;
  if (!scene || !refl) return { off: () => {}, floor: null as THREE.Mesh | null, wall: null as THREE.Mesh | null };
  const moved: [THREE.Object3D, THREE.Vector3][] = [];
  const keep = (ob: THREE.Object3D) => moved.push([ob, ob.position.clone()]);
  let floor: THREE.Mesh | null = null;
  let wall: THREE.Mesh | null = null;
  keep(refl);
  refl.position.y = FLOOR_Y + 0.0015;
  refl.updateMatrixWorld();
  for (const ob of scene.children) {
    const m = ob as THREE.Mesh;
    const g = m.geometry as THREE.PlaneGeometry | undefined;
    if (!m.isMesh || m === refl || !g?.parameters) continue;
    if (g.parameters.width === 40 && Math.abs(m.rotation.x + Math.PI / 2) < 1e-3) {
      keep(m);
      m.position.y = FLOOR_Y;
      floor = m;
    } else if (g.parameters.width === 26 && g.parameters.height === 6) {
      keep(m);
      m.position.y += FLOOR_Y;
      m.position.z = WALL_Z;
      wall = m;
    } else if (g.parameters.height === 1.6) {
      keep(m);
      m.position.y += FLOOR_Y;
      m.position.z = WALL_Z + 0.03;
    }
    m.updateMatrixWorld();
  }
  return {
    off: () => {
      for (const [ob, p] of moved) ob.position.copy(p);
    },
    floor,
    wall,
  };
}

function sharpReflection(e: Internals, w: number, h: number) {
  const rt = (e.reflector as unknown as { getRenderTarget?: () => THREE.WebGLRenderTarget } | undefined)?.getRenderTarget?.();
  if (!rt || e.reflector?.visible === false) return;
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const rs = w < 640 ? 0.42 : 0.5;
  rt.setSize(Math.max(64, Math.round(w * dpr * rs)), Math.max(64, Math.round(h * dpr * rs)));
}

/** Mokri pod (odraz): jači, mutniji, gasi se brzo ispod dresova; zid je sad bliže. */
function wetFloor(e: Internals, o: EFrameOpts) {
  const mat = e.reflector?.material as THREE.ShaderMaterial | undefined;
  const u = mat?.uniforms;
  if (!mat || !u?.strength) return () => {};
  const prevFrag = mat.fragmentShader;
  u.uWallZ = { value: WALL_Z };
  u.uFade = { value: new THREE.Vector2(0.45, o.mobile ? 1.15 : 1.25) };
  mat.fragmentShader = prevFrag
    .replace("uniform float camZ;", "uniform float camZ; uniform float uWallZ; uniform vec2 uFade;")
    .replace("float len = mix(0.03, 0.012, wet);", "float len = mix(0.05, 0.026, wet);")
    .replace("float bias = mix(1.4, 0.5, wet);", "float bias = mix(2.2, 1.3, wet);")
    .replace("float fade = mix(1.0, 0.1, smoothstep(0.3, 2.8, vW.z));", "float fade = 1.0 - smoothstep(uFade.x, uFade.y, vW.z);")
    .replace("float far = smoothstep(-2.1, -2.03, vW.z);", "float far = smoothstep(uWallZ, uWallZ + 0.05, vW.z);")
    // mirniji pod: manje okomitih niti u odrazu i manje pruga u jačini odraza
    .replace("uv.x += (s2 - 0.5) * mix(0.006, 0.0025, wet);", "uv.x += (s2 - 0.5) * mix(0.0022, 0.001, wet);")
    .replace("float k = mix(0.62, 1.0, wet) * (0.8 + 0.4 * s1);", "float k = mix(0.78, 1.0, wet) * (0.93 + 0.14 * s1);");
  mat.needsUpdate = true;
  const desc = Object.getOwnPropertyDescriptor(u.strength, "value");
  Object.defineProperty(u.strength, "value", { configurable: true, enumerable: true, get: () => 1.05, set: () => {} });
  return () => {
    if (desc) Object.defineProperty(u.strength, "value", desc);
    mat.fragmentShader = prevFrag;
    mat.needsUpdate = true;
  };
}

const FLOOR_FRAG = /* glsl */ `
uniform sampler2D tNoise; uniform float uWallZ; uniform float uPoolX; uniform vec2 uNeon;
varying vec3 vW;
void main() {
  vec2 p = vW.xz;
  float s1 = texture2D(tNoise, vec2(p.x * 1.9, p.y * 0.16) + 0.37).r;
  float s2 = texture2D(tNoise, vec2(p.x * 6.5, p.y * 0.45) + 0.11).g;
  float g = texture2D(tNoise, p * 1.6).r;
  float blot = texture2D(tNoise, p * 0.21 + 0.6).g;
  float base = 0.0062 * (0.86 + 0.14 * s1 + 0.04 * s2) * (0.92 + 0.12 * g) * (0.8 + 0.4 * blot);
  float dz = vW.z - uWallZ;
  // mokri sjaj: odsjaj zida i snopa u betonu — izduženo prema kameri (pruge), najjače iza junaka
#ifdef E_DARK
  float streak = 0.95 + 0.1 * s1;
#else
  float streak = 0.86 + 0.28 * s1 + 0.03 * s2;
#endif
  float sheen = exp(-pow((p.x - uPoolX) / 1.5, 2.0)) * exp(-pow((dz - 0.5) / 1.1, 2.0));
  float pool = exp(-pow((p.x - uPoolX) / 0.75, 2.0)) * exp(-pow((dz - 0.95) / 0.6, 2.0));
#ifdef E_DARK
  base *= 0.8 + 1.4 * sheen * streak;
#else
  base *= 1.0 + 2.2 * sheen * streak;
#endif
  base *= mix(1.0, 0.5, smoothstep(1.0, 4.2, dz)) * (1.0 - 0.6 * smoothstep(1.6, 5.0, abs(p.x)));
  // kontaktna sjena uz zid: uska i meka (bez trake)
  base *= mix(0.5, 1.0, smoothstep(0.0, 0.18, dz));
  vec3 col = vec3(base) + vec3(0.0105, 0.0102, 0.0098) * pool * streak;
  // neonski odsjaj ispod IFY (mekan, razliven)
  float nb = exp(-pow((p.x - uNeon.x) / 1.1, 2.0)) * exp(-pow((dz - 0.25) / 0.9, 2.0));
  col += vec3(0.0085, 0.011, 0.0) * nb * uNeon.y * streak;
  gl_FragColor = vec4(col, 1.0);
  #include <colorspace_fragment>
}`;

export function floorMaterial(noise: THREE.Texture, pool: THREE.IUniform<number>, neon: THREE.IUniform<THREE.Vector2>, wallZ = WALL_Z, dark = false) {
  return new THREE.ShaderMaterial({
    defines: dark ? { E_DARK: "" } : {},
    uniforms: { tNoise: { value: noise }, uWallZ: { value: wallZ }, uPoolX: pool, uNeon: neon },
    vertexShader: /* glsl */ `
      varying vec3 vW;
      void main() { vec4 w = modelMatrix * vec4(position, 1.0); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }`,
    fragmentShader: FLOOR_FRAG,
  });
}

/* ---------------- 2. dubinska oštrina i fokus ---------------- */

function depthOfField(e: Internals, mobile: boolean) {
  const d = e.dof;
  if (!d?.k || !d.wall) return;
  // bočno: mekoća raste s udaljenošću od junaka (prvi susjed ~1–5 px, dalji do max);
  // iza (zid) samo dašak (logo čitljiv); ispred ništa
  // Samo blaga mekoća (~1–1,5 px) i to praktički samo na prvim susjedima: dalji dresovi se ne
  // mute jače (sitne kockice bi se stopile u ružičastu mrlju, bijeli dugi rukavi u "duha") —
  // udaljenost pokazuju tama i mjerilo (DIM niže, krivulja junaka).
  d.k.lat = mobile ? 0.0034 : 0.0036;
  d.k.max = mobile ? 0.0016 : 0.0017;
  d.k.back = mobile ? 0.0012 : 0.0016;
  d.k.front = 0;
  // zona oštrine pokriva CIJELOG junaka (rukave) — inače se rub rukava i kockice mute
  d.k.latDead = HALF_W * S0 * 1.1;
  d.wall.z = WALL_Z;
  d.wall.max = mobile ? 0.0008 : 0.001;
  // Mutno se zbraja u prikaznom (sRGB) prostoru, ne linearnom: u linearnom bijelo "pojede"
  // boju (crveno-bijele kockice postanu ružičasto-bijele, tamni brojevi sivi) → izgleda kao
  // mliječna koprena. Ovako mutni dres zadrži puni ton, samo je mekan.
  for (const key of ["pre", "comp"]) {
    const m = (d as unknown as Record<string, THREE.ShaderMaterial | undefined>)[key];
    if (m?.defines && "LINEAR" in m.defines) {
      delete m.defines.LINEAR;
      m.needsUpdate = true;
    }
  }
}

// pad svjetla po udaljenosti od sredine (|d|): susjedi su izvan lokve svjetla → malo tamniji,
// ali boje ostaju pune (zasićenost 1 — bez sivo-bijele koprene)
const DIM = [1, 0.84, 0.7, 0.6, 0.53, 0.49, 0.46];
const SAT = [1, 1, 1, 1, 1, 1, 1];
// bez DOF-a: mip-bias po udaljenosti (prvi susjed tek dašak, dalji mekši) — besplatno na GPU-u
const SOFT = [0, 0.35, 0.95, 1.4, 1.75, 2.0, 2.2];
const lerpArr = (arr: number[], a: number) => {
  const i = Math.min(arr.length - 1, Math.floor(a));
  const j = Math.min(arr.length - 1, i + 1);
  const t = a - Math.floor(a);
  return arr[i] + (arr[j] - arr[i]) * t;
};

/* ---------------- 3. sjena dresa na zidu ---------------- */

const SHADOW_PAD = 1.3;
export function shadowMaterial(map: THREE.Texture, flipY = false) {
  return new THREE.ShaderMaterial({
    uniforms: { tMap: { value: map }, uOp: { value: 0.3 }, uSoft: { value: 1 }, uFlip: { value: flipY ? 1 : 0 } },
    vertexShader: /* glsl */ `
      varying vec2 vUv;
      void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
    fragmentShader: /* glsl */ `
      uniform sampler2D tMap; uniform float uOp; uniform float uSoft; uniform float uFlip;
      varying vec2 vUv;
      void main() {
        vec2 uv = (vUv - 0.5) * ${SHADOW_PAD.toFixed(2)} + 0.5;
        float down = clamp(1.0 - uv.y, 0.0, 1.0);
        if (uFlip < 0.5) uv.y = 1.0 - uv.y; // tekstura bez flipY: vrh slike na v = 0
        // oštrije uz vješalicu, mekše prema rubu dresa
        float bias = mix(1.6, 4.6, down) * uSoft;
        float a = texture2D(tMap, clamp(uv, 0.0, 1.0), bias).a;
        // poluprozirni ostaci pozadine na fotografiji (npr. hlačice) ne bacaju pravokutnu sjenu
        a = smoothstep(0.16, 0.62, a);
        float inside = step(0.0, uv.x) * step(uv.x, 1.0) * step(0.0, uv.y) * step(uv.y, 1.0);
        // rub plohe: mip-zamućenje ne smije odrezati sjenu ravnom crtom
        vec2 eg = min(vUv, 1.0 - vUv);
        a *= inside * mix(1.0, 0.72, down) * smoothstep(0.0, 0.07, eg.x) * smoothstep(0.0, 0.07, eg.y);
        if (a < 0.003) discard;
        gl_FragColor = vec4(0.0, 0.0, 0.0, a * uOp);
      }`,
    transparent: true,
    depthWrite: false,
    toneMapped: false,
  });
}

type Shadow = { group: THREE.Group; mesh: THREE.Mesh; mat: THREE.ShaderMaterial; map: THREE.Texture };

function ensureShadow(pc: Piece & { eShadow?: Shadow }): Shadow | null {
  const map = pc.mat?.map;
  if (!pc.mesh || !pc.root || !map) return null;
  if (pc.eShadow && pc.eShadow.map === map && pc.eShadow.group.parent === pc.root) return pc.eShadow;
  if (pc.eShadow) {
    pc.eShadow.group.removeFromParent();
    pc.eShadow.mat.dispose();
  }
  const mat = shadowMaterial(map);
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), mat);
  mesh.renderOrder = -1; // nakon zida i grafita, prije odjeće
  mesh.layers.set(1); // samo glavna kamera (ne u odrazu poda)
  mesh.frustumCulled = false;
  const group = new THREE.Group();
  group.add(mesh);
  pc.root.add(group);
  const s: Shadow = { group, mesh, mat, map };
  pc.eShadow = s;
  return s;
}

/* ---------------- 4. zid ---------------- */

const WALL_FRAG = /* glsl */ `
uniform sampler2D tNoise; uniform float uLevel; uniform float uFloor; uniform float uPoolX; uniform float uRailY; uniform float uSpot;
varying vec3 vW;
float hash(vec2 q) { return fract(sin(dot(q, vec2(127.1, 311.7))) * 43758.5453); }
void main() {
  vec2 p = vW.xy;
  float y = p.y - uFloor;
  // --- sitno zrno (upola manje nego prije: ne "puzi" preko slova) ---
  float f = texture2D(tNoise, p * 0.9).r;
  float f2 = texture2D(tNoise, p * 0.23 + 0.5).r;
  float big = texture2D(tNoise, p * 0.05 + 0.73).r;
  float blot = texture2D(tNoise, p * 0.11 + 0.21).g;
  float pit = smoothstep(0.86, 0.96, texture2D(tNoise, p * 2.6 + 0.7).r);
  vec3 alb = vec3(0.0215, 0.0211, 0.0205);
  alb *= (0.62 + 0.76 * blot * blot) * (0.9 + 0.12 * f + 0.1 * f2) * (1.0 - 0.22 * pit);
  alb *= 0.8 + 0.4 * big;
  // --- oplatne ploče 2,4 × 1,2 m: ton po ploči, šavovi, rupe od vezica ---
  vec2 PS = vec2(2.4, 1.2);
  vec2 q = (p - vec2(0.37, uFloor + 0.05)) / PS;
  vec2 cell = floor(q);
  vec2 fq = fract(q);
#ifdef E_DARK
  // tamni smjer: ploče se jedva naslućuju (bez vidljive mreže)
  alb *= 0.985 + 0.03 * hash(cell);
#else
  alb *= 0.95 + 0.1 * hash(cell);
#endif
  vec2 dEdge = min(fq, 1.0 - fq) * PS; // m do šava
  float seamV = 1.0 - smoothstep(0.0035, 0.009, dEdge.x);
  float seamH = 1.0 - smoothstep(0.0025, 0.007, dEdge.y);
  float lip = smoothstep(0.009, 0.02, dEdge.x) * (1.0 - smoothstep(0.02, 0.05, dEdge.x));
#ifdef E_DARK
  alb *= (1.0 - 0.035 * seamV) * (1.0 - 0.015 * seamH);
#else
  alb *= (1.0 - 0.2 * seamV) * (1.0 - 0.1 * seamH) * (1.0 + 0.03 * lip);
#endif
  vec2 tie = fract(q * vec2(3.0, 2.0)) - 0.5;
  float tr = length(tie * PS / vec2(3.0, 2.0));
  float hole = 1.0 - smoothstep(0.009, 0.014, tr);
  float ring = smoothstep(0.012, 0.016, tr) * (1.0 - smoothstep(0.016, 0.03, tr));
#ifdef E_DARK
  alb *= 1.0 - 0.04 * hole;
#else
  alb *= (1.0 - 0.18 * hole) * (1.0 + 0.02 * ring);
#endif
  // --- curenje vode: tri široka okomita traga s vrha zida, nazubljenog ruba ---
  float wob = texture2D(tNoise, vec2(p.x * 0.6, p.y * 0.18) + 0.13).r - 0.5;
  float st = 0.0;
  st += exp(-pow((p.x + 2.15 + wob * 0.22) / 0.32, 2.0)) * smoothstep(0.4, 2.6, y);
  st += 0.8 * exp(-pow((p.x - 1.05 + wob * 0.18) / 0.22, 2.0)) * smoothstep(1.2, 3.0, y);
  st += 0.9 * exp(-pow((p.x - 3.1 + wob * 0.25) / 0.38, 2.0)) * smoothstep(0.2, 2.2, y);
  float fine = texture2D(tNoise, vec2(p.x * 3.2, p.y * 0.12) + 0.41).g;
#ifdef E_DARK
  alb *= 1.0 - 0.22 * clamp(st, 0.0, 1.0) * (0.55 + 0.45 * fine);
#else
  alb *= 1.0 - 0.42 * clamp(st, 0.0, 1.0) * (0.55 + 0.45 * fine);
#endif
  // --- prljavština pri dnu (prskanje s poda, vlaga) ---
  float grime = (1.0 - smoothstep(0.0, 0.6 + 0.25 * f2, y)) * (0.75 + 0.25 * blot);
  alb *= 1.0 - 0.38 * grime;
  // --- reljef pod svjetlom odozgo ---
  float e = 0.012;
  float h0 = texture2D(tNoise, p * 0.9).r * 0.5 + texture2D(tNoise, p * 2.3 + 0.4).g * 0.2;
  float hx = texture2D(tNoise, (p + vec2(e, 0.0)) * 0.9).r * 0.5 + texture2D(tNoise, (p + vec2(e, 0.0)) * 2.3 + 0.4).g * 0.2;
  float hy = texture2D(tNoise, (p + vec2(0.0, e)) * 0.9).r * 0.5 + texture2D(tNoise, (p + vec2(0.0, e)) * 2.3 + 0.4).g * 0.2;
  vec3 n = normalize(vec3(-(hx - h0) / e * 0.006, -(hy - h0) / e * 0.006, 1.0));
  float relief = clamp(0.8 + 0.3 * dot(n, normalize(vec3(0.0, 0.85, 0.5))), 0.6, 1.15);
  // --- svjetlo: niskofrekventni pad + snop odozgo iza junaka ---
  float wash = smoothstep(-0.2, 1.8, y) * (1.0 - 0.3 * smoothstep(2.4, 4.2, y));
  float side = 1.0 - 0.7 * smoothstep(1.4, 5.0, abs(p.x));
#ifdef E_DARK
  // skoro crni beton: svjetlo samo kao meka lokva iza dresa u fokusu + tamna vinjeta
  float dxp = abs(p.x - uPoolX);
  float poolE = exp(-pow(dxp / 1.25, 2.0)) * exp(-pow((p.y - uRailY + 0.45) / 1.35, 2.0));
  float litD = (0.6 + 0.12 * wash) * (1.0 - 0.5 * smoothstep(1.0, 4.5, abs(p.x))) + uSpot * 0.78 * poolE;
  litD *= mix(0.6, 1.0, smoothstep(0.0, 0.3, y));
  // neutralno sivo (bez toplog tona)
  gl_FragColor = vec4(alb * vec3(0.975, 1.0, 1.04) * litD * mix(1.0, relief, 0.6) * uLevel, 1.0);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
  return;
#endif
  float lit = (0.42 + 0.55 * wash) * side;
  // snop: izvor iznad kadra, širi se prema dolje (trapez), meki rub + volumetrijski halo
  float apex = uRailY + 1.7;
  float dy = max(apex - p.y, 0.0);
  float halfW = 0.18 + 0.36 * dy;
  float dx = abs(p.x - uPoolX);
  float cone = (1.0 - smoothstep(halfW * 0.7, halfW * 1.15, dx)) * smoothstep(0.0, 0.9, dy) * (1.0 - smoothstep(uRailY - uFloor + 0.1, uRailY - uFloor + 1.6, uRailY + 1.0 - p.y + 0.0 * y));
  float halo = exp(-pow(dx / (halfW * 1.6), 2.0)) * exp(-pow((p.y - uRailY + 0.2) / 1.5, 2.0));
  lit += uSpot * (0.75 * cone + 0.55 * halo);
  lit *= mix(0.62, 1.0, smoothstep(0.0, 0.14, y));
  gl_FragColor = vec4(alb * lit * relief * uLevel, 1.0);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}`;

export function wallMaterial(noise: THREE.Texture, level: number, pool: THREE.IUniform<number>, floorY = FLOOR_Y, railY = RAIL_Y, dark = false) {
  return new THREE.ShaderMaterial({
    defines: dark ? { E_DARK: "" } : {},
    uniforms: { tNoise: { value: noise }, uLevel: { value: level }, uFloor: { value: floorY }, uPoolX: pool, uRailY: { value: railY }, uSpot: { value: 1 } },
    vertexShader: /* glsl */ `
      varying vec3 vW;
      void main() { vec4 w = modelMatrix * vec4(position, 1.0); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }`,
    fragmentShader: WALL_FRAG,
    fog: false,
  });
}

/** Grafit osvijetljen kao zid (snop iza junaka, tamni rubovi), boja čista (bez kredastog zrna). */
function litGraffiti(mat: THREE.ShaderMaterial, pool: THREE.IUniform<number>) {
  mat.uniforms.uPoolX = pool;
  mat.uniforms.uFloorE = { value: FLOOR_Y };
  mat.uniforms.uRailE = { value: RAIL_Y };
  mat.fragmentShader = mat.fragmentShader
    .replace("uniform float uBright;", "uniform float uBright; uniform float uPoolX; uniform float uFloorE; uniform float uRailE;")
    .replace(
      "vec3 paint = col * shade * uBright;",
      `float eY = vP.y - uFloorE;
        float eDx = abs(vP.x - uPoolX);
        float eHalf = 0.18 + 0.36 * max(uRailE + 1.7 - vP.y, 0.0);
        float eLit = (0.8 + 0.25 * smoothstep(0.4, 2.2, eY)) * (1.0 - 0.5 * smoothstep(1.4, 5.0, abs(vP.x))) + 0.22 * exp(-pow(eDx / (eHalf * 1.4), 2.0));
        vec3 paint = col * shade * uBright * eLit;`
    )
    .replace("mix(0.45, 1.0, dry) * soak", "1.0")
    .replace("float shade = 0.8 + 0.32 * grain;", "float shade = 1.0;")
    .replace("col *= mix(1.0, 0.9 * (0.93 + 0.14 * wallF), grey);", "")
    .replace("float alpha = a * m * (0.88 + 0.12 * grain);", "float alpha = a * m;");
  mat.needsUpdate = true;
}

function swapGraffiti(e: Internals, art: GraffitiArt, pool: THREE.IUniform<number>) {
  const m = e.graffiti;
  const noise = e.wallNoise;
  if (!m || !noise) return false;
  const oldMat = m.material as THREE.ShaderMaterial;
  const tex = new THREE.CanvasTexture(art.canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  tex.minFilter = THREE.LinearMipmapLinearFilter;
  tex.generateMipmaps = true;
  const main = graffitiMaterial(tex, noise, art);
  main.uniforms.uT = oldMat.uniforms.uT; // ulaz (sprej slijeva nadesno) ide dalje kao u engineu
  main.uniforms.uBright.value = 0.92;
  litGraffiti(main, pool);
  const geo = new THREE.PlaneGeometry(1, 1 / art.aspect);
  const oldGeo = m.geometry;
  m.geometry = geo;
  m.material = main;
  for (const ch of m.children) {
    const r = ch as THREE.Mesh;
    if (!r.isMesh) continue;
    const rm = graffitiMaterial(tex, noise, art);
    rm.uniforms.uT = main.uniforms.uT;
    rm.uniforms.uBright.value = 0.45;
    (r.material as THREE.Material).dispose();
    r.material = rm;
    r.geometry = geo;
  }
  oldMat.dispose();
  oldGeo.dispose();
  e.grafArt = art;
  // sprej kreće ispočetka s novim grafitom
  e.grafReady = performance.now();
  m.visible = true;
  return true;
}

function swapLogo(e: Internals, art: LogoArt, pool: THREE.IUniform<number>, renderer: THREE.WebGLRenderer | undefined) {
  const m = e.graffiti;
  if (!m) return false;
  const oldMat = m.material as THREE.ShaderMaterial;
  const tex = logoTexture(art, renderer);
  const main = logoMaterial(tex, art, pool, 1);
  // ulaz (crtanje obrisa) ide na isti sat kao enginov sprej: uT, jednom po sesiji, dodir preskače
  if (oldMat.uniforms?.uT) main.uniforms.uT = oldMat.uniforms.uT;
  const geo = new THREE.PlaneGeometry(1, 1 / art.aspect);
  const oldGeo = m.geometry;
  m.geometry = geo;
  m.material = main;
  for (const ch of m.children) {
    const r = ch as THREE.Mesh;
    if (!r.isMesh) continue;
    // odraz u mokrom podu: isti obris, slabiji
    const rm = logoMaterial(tex, art, pool, 0.32);
    rm.uniforms.uT = main.uniforms.uT;
    (r.material as THREE.Material).dispose();
    r.material = rm;
    r.geometry = geo;
  }
  oldMat.dispose();
  oldGeo.dispose();
  e.grafArt = art;
  e.grafReady = performance.now();
  m.visible = true;
  return true;
}

/* ---------------- 8. šipka: studijski krom + zidni nosači ---------------- */

const CHROME_VERT = /* glsl */ `
varying vec3 vN; varying vec3 vWp;
void main() {
  vec4 w = modelMatrix * vec4(position, 1.0);
  vWp = w.xyz;
  vN = normalize(mat3(modelMatrix) * normal);
  gl_Position = projectionMatrix * viewMatrix * w;
}`;
const CHROME_FRAG = /* glsl */ `
varying vec3 vN; varying vec3 vWp;
void main() {
  vec3 V = normalize(cameraPosition - vWp);
  vec3 N = normalize(vN);
  vec3 R = reflect(-V, N);
  // studijsko okruženje: softbox gore, tamni zid, slab pod; oštra linija odsjaja (ravna "nit" svjetla)
  float sky = smoothstep(0.25, 0.85, R.y);
  float line = exp(-pow((R.y - 0.42) / 0.05, 2.0));
  float floorR = smoothstep(-0.1, -0.6, R.y) * 0.06;
  float fres = pow(1.0 - max(dot(N, V), 0.0), 3.0);
  float body = 0.16 + 0.1 * smoothstep(-0.6, 0.2, R.y);
  vec3 c = vec3(body) * vec3(0.98, 0.99, 1.02) + vec3(0.55, 0.56, 0.58) * sky + vec3(1.7, 1.68, 1.6) * line + vec3(floorR) + 0.1 * fres;
  gl_FragColor = vec4(c, 1.0);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}`;

export function studioChrome() {
  return new THREE.ShaderMaterial({ vertexShader: CHROME_VERT, fragmentShader: CHROME_FRAG });
}

function railLook(e: Internals) {
  const g = e.railGroup;
  if (!g) return { off: () => {}, brackets: null as THREE.Group | null };
  const mat = studioChrome();
  const swapped: [THREE.Mesh, THREE.Material | THREE.Material[]][] = [];
  for (const ch of g.children) {
    const m = ch as THREE.Mesh;
    if (!m.isMesh || m.material !== e.chrome) continue;
    swapped.push([m, m.material]);
    m.material = mat;
  }
  // zidni nosači: prirubnica na zidu + krak do šipke + obujmica (položaj postavlja kadar)
  const brackets = new THREE.Group();
  const dark = new THREE.MeshStandardMaterial({ color: 0x18181a, metalness: 0.6, roughness: 0.45 });
  for (const s of [-1, 1]) {
    const b = new THREE.Group();
    const L = -WALL_Z;
    const arm = new THREE.Mesh(new THREE.CylinderGeometry(0.0085, 0.0085, L, 16), mat);
    arm.rotation.x = Math.PI / 2;
    arm.position.z = -L / 2;
    const flange = new THREE.Mesh(new THREE.CylinderGeometry(0.034, 0.034, 0.012, 28), mat);
    flange.rotation.x = Math.PI / 2;
    flange.position.z = -L + 0.006;
    const plate = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.004, 28), dark);
    plate.rotation.x = Math.PI / 2;
    plate.position.z = -L + 0.002;
    const collar = new THREE.Mesh(new THREE.CylinderGeometry(RAIL_R * 1.55, RAIL_R * 1.55, 0.034, 20), mat);
    collar.rotation.z = Math.PI / 2;
    b.add(arm, flange, plate, collar);
    b.userData.side = s;
    brackets.add(b);
  }
  brackets.visible = false;
  g.add(brackets);
  return {
    off: () => {
      for (const [m, prev] of swapped) m.material = prev;
      brackets.removeFromParent();
      mat.dispose();
      dark.dispose();
    },
    brackets,
  };
}

function placeBrackets(e: Internals, brackets: THREE.Group | null) {
  const plan = plans.get(e);
  if (!brackets || !plan) return;
  // blizu rubova kadra (između dresova se vide), na ravnom dijelu šipke (z ≈ 0)
  const u = Math.max(1.9, plan.halfWRail * (plan.narrow ? 0.98 : 0.86));
  for (const b of brackets.children) {
    b.position.set(u * (b.userData.side as number), RAIL_Y, 0);
  }
  brackets.visible = true;
}

/* ---------------- FINAL: prezime iza dresa ---------------- */

function placeSurname(e: Internals, layer: SurnameLayer, mobile: boolean, bare: boolean) {
  const cam = e.camera;
  const W = e.W ?? 0;
  const H = e.Hpx ?? 0;
  if (!cam || !e.camBase || !e.look || W < 2 || H < 2) return;
  cam.position.copy(e.camBase);
  cam.lookAt(e.look);
  cam.updateMatrixWorld();
  const narrow = W / H < 0.9;
  const v = new THREE.Vector3();
  const railN = v.set(0, RAIL_Y, 0).project(cam).y;
  const hemN = v.set(0, hemY(S0), 0).project(cam).y;
  const cxN = v.set(0, RAIL_Y - 0.5, 0).project(cam).x;
  // sredina tijela dresa (malo ispod polovice: kuka i ramena su gore)
  // s logotipom: malo niže i manje (razmak ispod obrisa DRESIFY); čisti zid: veće, kao stranica dresa
  // uski ekran bez logotipa: dres pokriva skoro cijelu širinu → prezime stoji NA ZIDU IZNAD
  // šipke (dno slova tik ispod šipke, iza kuka), inače bi bilo skriveno iza dresa
  const above = narrow && bare;
  const midN = above ? railN - (2 * 14) / H : railN + (hemN - railN) * (bare ? 0.5 : 0.56);
  const jerseyPx = ((railN - hemN) / 2) * H;
  const ray = new THREE.Raycaster();
  ray.setFromCamera(new THREE.Vector2(cxN, midN), cam);
  const pt = new THREE.Vector3();
  if (!ray.ray.intersectPlane(new THREE.Plane(new THREE.Vector3(0, 0, 1), -NAME_Z), pt)) return;
  const a = pt.clone().project(cam);
  const b = pt.clone().add(new THREE.Vector3(1, 0, 0)).project(cam);
  const pxPerM = (Math.abs(b.x - a.x) / 2) * W;
  layer.setPlacement({
    center: pt,
    pxPerM,
    // kutija 0,8 em ≈ 0,8 visine dresa (kao stranica dresa); široki natpis se smanji da stane
    boxPx: above ? Math.min(jerseyPx * 0.5, ((1 - railN) / 2) * H - 56 - 26) : jerseyPx * (bare ? 0.9 : 0.74),
    anchor: above ? "bottom" : "center",
    maxWPx: W * (narrow ? 1.04 : 0.94),
    frameWPx: W,
    dpr: Math.min(window.devicePixelRatio || 1, mobile ? 2 : 2),
  });
}

/* ---------------- sastavljanje ---------------- */

export function applyEFrame(engine: StoreEngine, o: EFrameOpts): EFrameApi {
  const e = engine as unknown as Internals;
  const origResize = e.resize;
  const noop: EFrameApi = { off: () => {}, setName: () => {}, nameBox: () => null, railY: () => null };
  if (typeof origResize !== "function") return noop;
  const bare = o.wall === "none";
  let surname: SurnameLayer | null = null;
  try {
    if (o.surname && e.scene) surname = new SurnameLayer(e.scene, NAME_Z, o.reduced);
  } catch (err) {
    console.warn("[e-frame] surname", err);
  }
  const offs: (() => void)[] = [];
  const amt = { v: 1 };
  const poolX: THREE.IUniform<number> = { value: 0 };
  const neonU: THREE.IUniform<THREE.Vector2> = { value: new THREE.Vector2(0.9, 0) };
  let brackets: THREE.Group | null = null;

  try {
    offs.push(heroCurves(e, amt));
  } catch (err) {
    console.warn("[e-frame] hero", err);
  }

  const resize = function (this: Internals, w: number, h: number) {
    origResize.call(e, w, h);
    try {
      sharpReflection(e, w, h);
      hideProps(e);
      frame(e, o);
      placeBrackets(e, brackets);
    } catch (err) {
      console.warn("[e-frame] skipped", err);
    }
  };
  e.resize = resize;

  const q = (() => {
    try {
      return new URLSearchParams(window.location.search);
    } catch {
      return new URLSearchParams();
    }
  })();
  // Zadano: logo (obris). Usporedba: ?grafit=kod → vektorski sprej, ?grafit=meta (ili =slika) → stara slika.
  const gq = q.get("grafit");
  const keepPng = gq === "meta" || gq === "slika";
  const sprayed = gq === "kod";
  const useLogo = !bare && !keepPng && !sprayed;
  let art: GraffitiArt | null = null;
  let paths: GraffitiPaths | null = null;
  let logo: LogoArt | null = null;
  let logoSet = false;
  if (bare) {
    // čisti beton: nema natpisa iznad šipke → kadar ostavi samo uski pojas ispod navigacije
    e.eCross = { narrow: 0, wide: 0 };
    // zamišljeni niski natpis: šipka sjedne na ~22 % visine (logo: ~29 %), dres malo veći
    e.eW = { w: { narrow: 0.6, wide: 0.6 }, min: { narrow: 0.5, wide: 0.5 } };
    e.eArtHint = { aspect: o.mobile ? 3.2 : 7.4, base: 0, top: 1, ext: 1 };
  }
  if (useLogo) {
    e.eCross = LOGO_CROSS;
    e.eW = { w: LOGO_W, min: LOGO_W_MIN };
    e.eArtHint = logoMetrics();
    paintLogo(o.mobile ? 2560 : 4096, o.mobile)
      .then((l) => {
        logo = l;
        e.eArtHint = l;
        e.placeGraffiti?.call(e);
        e.forced = Math.max(e.forced ?? 0, 2);
        e.wake?.call(e);
      })
      .catch((err) => console.warn("[e-frame] logo", err));
  }
  if (sprayed)
    loadGraffitiPaths()
      .then((p) => {
        paths = p;
        e.placeGraffiti?.call(e);
        e.forced = Math.max(e.forced ?? 0, 2);
        e.wake?.call(e);
      })
      .catch((err) => console.warn("[e-frame] graffiti paths", err));
  const origPlace = e.placeGraffiti;
  let artSeen: GraffitiArt | null = null;
  const place = function (this: Internals) {
    try {
      if (bare && e.graffiti) e.graffiti.visible = false;
      if (useLogo && e.graffiti && e.grafArt && !logoSet) {
        if (!logo) {
          // dok se logo ne nacrta: bez stare slike grafita (ne bljesne)
          e.graffiti.visible = false;
        } else {
          logoSet = swapLogo(e, logo, poolX, (e as { renderer?: THREE.WebGLRenderer }).renderer);
        }
      }
      if (sprayed && e.graffiti && e.grafArt && e.grafArt !== art) {
        if (!paths) {
          // dok se vektori ne učitaju: bez starog PNG-a (ne bljesne slika)
          e.graffiti.visible = false;
        } else {
          art = art ?? paintGraffiti(o.mobile ? 1536 : 2560, paths);
          swapGraffiti(e, art, poolX);
        }
      }
      if (e.grafArt && artSeen !== e.grafArt) {
        artSeen = e.grafArt;
        frame(e, o);
        placeBrackets(e, brackets);
        return;
      }
      if (!placeGraffiti(e)) origPlace?.call(e);
      if (bare && e.graffiti) e.graffiti.visible = false;
      if (surname) placeSurname(e, surname, o.mobile, bare);
      // neonski odsjaj na podu: ispod sredine IFY
      if (e.graffiti && e.grafArt) {
        const s = e.graffiti.scale.x;
        neonU.value.x = e.graffiti.position.x + ((e.grafArt.neonX0 + e.grafArt.neonX1) / 2 - 0.5) * s;
      }
    } catch (err) {
      console.warn("[e-frame] graffiti", err);
      origPlace?.call(e);
    }
  };
  if (typeof origPlace === "function") e.placeGraffiti = place;

  let room: ReturnType<typeof placeRoom> | null = null;
  try {
    hideProps(e);
    depthOfField(e, o.mobile);
    room = placeRoom(e);
    offs.push(room.off);
    offs.push(wetFloor(e, o));
  } catch (err) {
    console.warn("[e-frame] mood", err);
  }

  // Zid: beton u velikom mjerilu umjesto zajedničkog; pod: mokri sjaj + neon
  let wallMat: THREE.ShaderMaterial | null = null;
  try {
    const noise = e.wallNoise;
    const wall = room?.wall;
    if (wall && noise) {
      const prevMat = wall.material as THREE.ShaderMaterial;
      wallMat = wallMaterial(noise, (prevMat.uniforms?.uLevel?.value ?? 3.4) * 1.3, poolX, FLOOR_Y, RAIL_Y, true);
      // uski ekran: kadar je skoro cijeli u lokvi svjetla → slabija lokva (zid ostaje skoro crn)
      if (o.mobile) {
        wallMat.uniforms.uSpot.value = 0.55;
        wallMat.uniforms.uLevel.value *= 0.78;
      }
      wall.material = wallMat;
      // kopija zida u odrazu poda (sloj 2): tamnija, ista šara
      const reflWall = wall.children.find((c) => (c as THREE.Mesh).isMesh) as THREE.Mesh | undefined;
      const rwPrev = reflWall?.material;
      const rw = wallMaterial(noise, (prevMat.uniforms?.uLevel?.value ?? 3.4) * 1.0, poolX, FLOOR_Y, RAIL_Y, true);
      if (reflWall) reflWall.material = rw;
      offs.push(() => {
        wall.material = prevMat;
        if (reflWall && rwPrev) reflWall.material = rwPrev;
        wallMat?.dispose();
        rw.dispose();
      });
    }
    const floor = room?.floor;
    if (floor && noise) {
      const prev = floor.material;
      const fm = floorMaterial(noise, poolX, neonU, WALL_Z, true);
      floor.material = fm;
      offs.push(() => {
        floor.material = prev;
        fm.dispose();
      });
    }
  } catch (err) {
    console.warn("[e-frame] wall", err);
  }

  // neonski odsjaj na zidu ispod IFY (jedva vidljiv, aditivan)
  let neonWall: THREE.Mesh | null = null;
  try {
    if (e.scene) {
      const tex = neonGlowTexture();
      neonWall = new THREE.Mesh(
        new THREE.PlaneGeometry(1, 1),
        new THREE.MeshBasicMaterial({ map: tex, color: new THREE.Color("#e8ff3c"), transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false })
      );
      neonWall.renderOrder = -3;
      neonWall.layers.set(1);
      e.scene.add(neonWall);
      const nw = neonWall;
      offs.push(() => {
        nw.removeFromParent();
        (nw.material as THREE.Material).dispose();
        tex.dispose();
      });
    }
  } catch (err) {
    console.warn("[e-frame] neon", err);
  }

  try {
    const r = railLook(e);
    brackets = r.brackets;
    offs.push(r.off);
  } catch (err) {
    console.warn("[e-frame] rail", err);
  }

  // Svaki kadar (prije crtanja): dolly, prigušenje susjeda, sjene, pokret, snop, neon.
  const scene = e.scene;
  const shadowsOn = q.get("sjena") !== "0";
  const idle = !o.mobile && !o.reduced;
  let lastT = -1;
  let lastPos = 0;
  let speed = 0;
  let vel = 0; // potpisana brzina šipke (stavke/s), zaglađena
  // opruga pokreta (zakret/nagib): jedan prigušeni prebačaj kad šipka stane
  const sw = { x: 0, v: 0 };
  const W0 = 9;
  const Z0 = 0.55;
  const prevHook = scene?.onBeforeRender;
  const allShadows = new Set<Shadow>();
  const seen = new Set<Shadow>(); // jedan skup za sve kadrove (bez alokacije po kadru)
  if (scene) {
    scene.onBeforeRender = function (...args) {
      prevHook?.apply(this, args);
      const now = performance.now();
      if (lastT > 0 && now - lastT < 4) return; // odraz poda crta scenu drugi put u istom kadru
      const dt = lastT < 0 ? 0.016 : Math.min(0.05, (now - lastT) / 1000);
      lastT = now;
      try {
        const p = e.pos ?? 0;
        const sv = (p - lastPos) / Math.max(dt, 1e-3);
        lastPos = p;
        speed += (Math.abs(sv) - speed) * (1 - Math.exp(-dt * 12));
        vel += (sv - vel) * (1 - Math.exp(-dt * 14));
        // dolly: brzo listanje → junak se smanji prema susjedima; mirno → naraste
        const tgt = o.reduced ? 1 : 1 - 0.5 * Math.min(1, Math.max(0, (speed - 0.25) / 2.2));
        const k = 1 - Math.exp(-dt * (tgt < amt.v ? 10 : 4.5));
        amt.v += (tgt - amt.v) * k;
        let busy = Math.abs(tgt - amt.v) > 0.002;
        if (e.focusP) poolX.value = e.focusP.x * 0.92;

        // pokret: cilj = nagib prema smjeru vožnje (rub kasni); opruga ζ≈0,55 → jedan prebačaj
        const target = o.reduced ? 0 : Math.max(-1, Math.min(1, vel / 4.5));
        const acc = -W0 * W0 * (sw.x - target) - 2 * Z0 * W0 * sw.v;
        sw.v += acc * dt;
        sw.x += sw.v * dt;
        if (Math.abs(sw.x) > 1e-4 || Math.abs(sw.v) > 1e-3) busy = true;
        else sw.x = sw.v = 0;
        const roll = 0.075 * sw.x; // ≈ 4,3° najviše → rub ~5 % visine
        const yaw = -0.07 * sw.x; // ≈ 4° zakret prema smjeru

        seen.clear();
        for (const view of e.views?.values() ?? []) {
          const a = Math.abs(e.deltaOf?.call(e, view.index) ?? 0);
          for (const pc0 of view.pieces) {
            const pc = pc0 as Piece & { eShadow?: Shadow; eRz?: number; eAdd?: [number, number] };
            if (!pc.mat) continue;
            pc.mat.color?.setScalar(Math.pow(lerpArr(DIM, a), 2.2));
            const gu = pc.gu ?? (pc.mat.userData.g as GarmentUniforms | undefined);
            if (gu?.uSat) gu.uSat.value = lerpArr(SAT, a);
            if (gu?.uRim) gu.uRim.value = o.flat ? 0 : Math.max(0, 1 - a * 1.6) * 0.55;
            if (o.noDof) {
              const ub = pc.mat.userData.uBias as { value: number } | undefined;
              if (ub) ub.value = lerpArr(SOFT, a);
            }
            // zakret/nagib (dodaje se enginovu njihalu; engine ga svaki kadar postavi iznova)
            const swg = pc.swing;
            if (swg) {
              const add = pc.eAdd ?? [0, 0];
              const baseZ = pc.eRz !== undefined && Math.abs(swg.rotation.z - pc.eRz) < 1e-9 ? swg.rotation.z - add[0] : swg.rotation.z;
              const baseY = pc.eRz !== undefined && Math.abs(swg.rotation.z - pc.eRz) < 1e-9 ? swg.rotation.y - add[1] : swg.rotation.y;
              const w = 1 - Math.min(0.5, a * 0.2); // susjedi isto, malo manje (dalje od oka)
              const az = roll * w;
              const ay = yaw * w;
              swg.rotation.z = baseZ + az;
              swg.rotation.y = baseY + ay;
              pc.eRz = swg.rotation.z;
              pc.eAdd = [az, ay];
            }
            // sjena na zidu
            if (shadowsOn && pc.mesh && pc.root && pc.root.visible) {
              const sh = ensureShadow(pc);
              if (sh) {
                seen.add(sh);
                allShadows.add(sh);
                const sc = pc.root.scale.x || 1;
                const dist = Math.max(0.05, pc.root.position.z - WALL_Z); // m do zida
                const pw = pc.mesh.scale.x;
                const ph = pc.mesh.scale.y;
                const grow = 1 + 0.06 * dist;
                sh.mesh.scale.set(pw * SHADOW_PAD * grow, ph * SHADOW_PAD * grow, 1);
                sh.mesh.position.set(pc.mesh.position.x + (0.07 * dist) / sc, pc.mesh.position.y * grow - (0.11 * dist) / sc, -(dist - 0.01) / sc);
                sh.group.rotation.z = swg ? swg.rotation.z * 0.9 : 0;
                sh.mat.uniforms.uOp.value = (0.34 - 0.06 * Math.min(1, a)) * (pc.root.visible ? 1 : 0);
                sh.mat.uniforms.uSoft.value = 0.8 + 0.35 * dist;
              }
            }
          }
        }
        for (const s of allShadows)
          if (!seen.has(s) && !s.group.parent?.parent) {
            s.group.removeFromParent();
            s.mat.dispose();
            allShadows.delete(s);
          }

        // neon: odsjaj se pojavi tek kad je grafit isprejan
        const uT = (e.graffiti?.material as THREE.ShaderMaterial | undefined)?.uniforms?.uT?.value ?? 99;
        // FINAL: bez limeta odsjaja na zidu i podu ("jedan neon po ekranu" = gumb Pogledaj dres)
        const nk = 0 * Math.max(0, Math.min(1, (uT - 1.25) / 0.6)) * (e.graffiti?.visible ? 1 : 0);
        neonU.value.y = nk;
        if (neonWall && e.graffiti) {
          const s = e.graffiti.scale.x;
          (neonWall.material as THREE.MeshBasicMaterial).opacity = 0.055 * nk;
          neonWall.scale.set(s * 0.42, s * 0.2, 1);
          neonWall.position.set(neonU.value.x, e.graffiti.position.y - s * 0.12, WALL_Z + 0.006);
        }
        if (bare && e.graffiti) e.graffiti.visible = false;
        if (surname?.tick(now)) busy = true;
        if (busy || idle) e.forced = Math.max(e.forced ?? 0, 2);
      } catch (err) {
        console.warn("[e-frame] tick", err);
      }
    };
  }

  const off = () => {
    surname?.dispose();
    if (scene) scene.onBeforeRender = prevHook ?? (() => {});
    if (e.resize === resize) delete e.resize;
    if (e.placeGraffiti === place) delete e.placeGraffiti;
    for (const s of allShadows) {
      s.group.removeFromParent();
      s.mat.dispose();
    }
    for (const f of offs) f();
  };
  return {
    off,
    setName: (name, dir) => {
      surname?.set(name, dir);
      e.forced = Math.max(e.forced ?? 0, 2);
      e.wake?.call(e);
    },
    nameBox: () => {
      const cam = e.camera;
      if (!surname || !cam || !e.camBase || !e.look) return null;
      cam.position.copy(e.camBase);
      cam.lookAt(e.look);
      cam.updateMatrixWorld();
      return surname.box(cam, e.W ?? 0, e.Hpx ?? 0);
    },
    railY: () => {
      const plan = plans.get(e);
      const H = e.Hpx ?? 0;
      return plan && H ? ((1 - plan.railNdc) / 2) * H : null;
    },
  };
}

void ENGINE_WALL_Z;
