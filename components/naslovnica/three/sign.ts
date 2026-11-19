// Zidni natpis DRESIFY (3D trgovina): "halo" slova na zidu od tamnih letvica.
// Slova se crtaju u canvas fontom stranice (Bebas Neue) → tekstura lica slova; sjaj na zidu
// iza svakog slova je zamućeni otisak tog slova, spakiran po kanalima (RGBA × 2 = 7 slova),
// pa se svako slovo pali zasebno (jedan draw call za sva slova, jedan za sav sjaj).
// Sve vanilla three.js, bez dodatnih biblioteka.
import * as THREE from "three";

export const SIGN_TEXT = "DRESIFY";
const NEON_FROM = 4; // "DRES" bijelo, "IFY" neon (kao logo u zaglavlju)
const FALLBACK = '"Bebas Neue", "Oswald", Impact, "Arial Narrow", sans-serif';
export const SLAT = 0.064; // razmak letvica na zidu (m)
export const FLUTE = 0.15; // razmak kanelura (zid 1) — široke, da ih mekano zamućenje ne izbriše
/** Stražnji zid: 0 = hrastove letvice na filcu, 1 = kanelirani crni kamen, 2 = tamni mikrocement. */
export type WallKind = 0 | 1 | 2;

export type SignArt = {
  faces: THREE.CanvasTexture;
  halo: [THREE.DataTexture, THREE.DataTexture];
  cuts: number[]; // granice slova (u, 0..1) na teksturi lica
  aspect: number; // širina / visina lica (canvas)
  padX: number; // rub sjaja lijevo/desno (udio širine lica)
  padY: number; // rub sjaja gore/dolje (udio visine lica)
  capFrac: number; // visina slova / visina lica (slova su okomito centrirana)
  texel: [number, number]; // 1/širina, 1/visina teksture lica
};

/** Font stranice (CSS popis obitelji iz var(--font-bebas)) — pričekaj da se učita (najviše ~2,5 s). */
export async function loadSignFont(family: string | undefined): Promise<string> {
  const fam = family && family.trim() ? `${family.trim()}, ${FALLBACK}` : FALLBACK;
  try {
    if (typeof document !== "undefined" && document.fonts?.load) {
      await Promise.race([document.fonts.load(`200px ${fam}`, SIGN_TEXT), new Promise((r) => setTimeout(r, 2500))]);
    }
  } catch {
    /* font nedostupan → rezervni */
  }
  return fam;
}

const isNeon = (i: number) => i >= NEON_FROM;

export function makeSignArt(font: string): SignArt {
  const PX = 240;
  const c = document.createElement("canvas");
  const g = c.getContext("2d")!;
  const setFont = (ctx: CanvasRenderingContext2D) => {
    ctx.font = `${PX}px ${font}`;
    ctx.textBaseline = "alphabetic";
  };
  setFont(g);
  const chars = [...SIGN_TEXT];
  const widths = chars.map((ch) => g.measureText(ch).width);
  const m = g.measureText("DRESIFY");
  const asc = m.actualBoundingBoxAscent || PX * 0.7;
  const desc = Math.max(0, m.actualBoundingBoxDescent || 0);
  const capH = asc + desc;
  const track = PX * 0.07; // malo širi razmak — veliki natpis na zidu diše
  const margin = Math.round(PX * 0.05);
  const W = Math.ceil(widths.reduce((a, b) => a + b, 0) + track * (chars.length - 1) + 2 * margin);
  const Hc = Math.ceil(capH + 2 * margin);
  c.width = W;
  c.height = Hc;
  setFont(g);
  const xs: [number, number][] = [];
  let x = margin;
  const base = margin + asc;
  chars.forEach((ch, i) => {
    const col = isNeon(i) ? "#e8ff3c" : "#f5f3ee";
    // lagano omekšan rub (slova su malo izvan fokusa — dresovi ostaju u prvom planu)
    g.shadowColor = col;
    g.shadowBlur = 5;
    g.fillStyle = col;
    g.fillText(ch, x, base);
    xs.push([x, x + widths[i]]);
    x += widths[i] + track;
  });
  const cuts: number[] = [];
  for (let i = 0; i < xs.length - 1; i++) cuts.push((xs[i][1] + xs[i + 1][0]) / 2 / W);

  const faces = new THREE.CanvasTexture(c);
  faces.colorSpace = THREE.SRGBColorSpace;
  faces.flipY = false;
  faces.generateMipmaps = true;
  faces.minFilter = THREE.LinearMipmapLinearFilter;
  faces.anisotropy = 2;

  /* ---------- sjaj na zidu: zamućeni otisak svakog slova u svom kanalu ---------- */
  const s = 0.25; // niska rezolucija (ionako mutno)
  const pad = capH * 0.95; // koliko se sjaj širi oko slova (px lica)
  const hw = Math.ceil((W + 2 * pad) * s);
  const hh = Math.ceil((Hc + 2 * pad) * s);
  const sc = document.createElement("canvas");
  sc.width = hw;
  sc.height = hh;
  const sg = sc.getContext("2d", { willReadFrequently: true })!;
  const A = new Uint8Array(hw * hh * 4);
  const B = new Uint8Array(hw * hh * 4);
  const OFF = 4000; // crta se izvan platna, ostaje samo sjena (zamućenje radi i u Safariju)
  chars.forEach((ch, i) => {
    sg.setTransform(1, 0, 0, 1, 0, 0);
    sg.globalCompositeOperation = "source-over";
    sg.shadowColor = "transparent";
    sg.fillStyle = "#000";
    sg.fillRect(0, 0, hw, hh);
    sg.globalCompositeOperation = "lighter";
    sg.setTransform(s, 0, 0, s, pad * s, pad * s);
    setFont(sg);
    sg.fillStyle = "#fff";
    sg.shadowOffsetX = OFF;
    sg.shadowOffsetY = 0;
    // dva sloja: uži jači + široki mekani (realan pad svjetla po zidu)
    // tri sloja: uski jaki rub (svjetlo iza slova), srednji i široki slabi (realan pad po zidu)
    for (const [blur, a] of [
      [capH * s * 0.1, 1.0],
      [capH * s * 0.3, 0.55],
      [capH * s * 0.85, 0.22],
    ] as const) {
      sg.shadowBlur = blur;
      sg.shadowColor = `rgba(255,255,255,${a})`;
      sg.fillText(ch, xs[i][0] - OFF / s, base);
    }
    const px = sg.getImageData(0, 0, hw, hh).data;
    const dst = i < 4 ? A : B;
    const ch4 = i % 4;
    for (let p = 0, q = 0; p < px.length; p += 4, q += 4) dst[q + ch4] = px[p];
  });
  // B: kanal A (neiskorišten) = 0
  const dataTex = (d: Uint8Array) => {
    const t = new THREE.DataTexture(d, hw, hh, THREE.RGBAFormat);
    t.colorSpace = THREE.NoColorSpace;
    t.minFilter = THREE.LinearFilter;
    t.magFilter = THREE.LinearFilter;
    t.generateMipmaps = false;
    t.flipY = false;
    t.needsUpdate = true;
    return t;
  };
  sc.width = sc.height = 1;
  return { faces, halo: [dataTex(A), dataTex(B)], cuts, aspect: W / Hc, padX: pad / W, padY: pad / Hc, capFrac: capH / Hc, texel: [1 / W, 1 / Hc] };
}

/** Ravnina s okrenutim v (teksture s flipY=false: redak 0 je vrh). */
export function flippedPlane(w: number, h: number) {
  const g = new THREE.PlaneGeometry(w, h);
  const uv = g.attributes.uv as THREE.BufferAttribute;
  for (let i = 0; i < uv.count; i++) uv.setY(i, 1 - uv.getY(i));
  return g;
}

/* ---------- materijali ---------- */
const WHITE = new THREE.Color(1.0, 0.99, 0.975);
const NEON = new THREE.Color().setStyle("#e8ff3c", THREE.SRGBColorSpace).multiplyScalar(0.8); // neon je okom jači

// Lica slova: ugašeno = tamni akril (jedva vidljiv obris), upaljeno = mekano svjetlo s
// blagim reljefom (svjetliji gornji-lijevi rub, tamniji donji-desni, svjetlo slabi prema dnu).
export function signFaceMaterial(map: THREE.Texture, cuts: number[], texel: [number, number]) {
  return new THREE.ShaderMaterial({
    uniforms: {
      map: { value: map },
      uOn: { value: new Array(SIGN_TEXT.length).fill(0) },
      uCut: { value: cuts.slice(0, SIGN_TEXT.length - 1) },
      uK: { value: 0.34 },
      uTexel: { value: new THREE.Vector2(texel[0], texel[1]) },
    },
    vertexShader: /* glsl */ `
      varying vec2 vUv;
      void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
    fragmentShader: /* glsl */ `
      uniform sampler2D map; uniform float uOn[${SIGN_TEXT.length}]; uniform float uCut[${SIGN_TEXT.length - 1}]; uniform float uK; uniform vec2 uTexel;
      varying vec2 vUv;
      void main() {
        vec4 t = texture2D(map, vUv, 0.9);
        vec2 o = uTexel * 6.0;
        float ul = texture2D(map, vUv - o, 1.5).a;
        float dr = texture2D(map, vUv + o, 1.5).a;
        float on = uOn[0];
        for (int i = 0; i < ${SIGN_TEXT.length - 1}; i++) { if (vUv.x > uCut[i]) on = uOn[i + 1]; }
        float relief = 0.84 + 0.55 * clamp(t.a - ul, 0.0, 1.0) - 0.4 * clamp(t.a - dr, 0.0, 1.0);
        float fall = mix(1.1, 0.82, vUv.y);
        vec3 lit = t.rgb * uK * on * relief * fall;
        vec3 off = vec3(0.028, 0.028, 0.03) * relief;
        gl_FragColor = vec4(mix(off, lit, smoothstep(0.0, 0.25, on)), t.a);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`,
    transparent: true,
    depthWrite: false,
  });
}

// Sjaj na zidu iza slova: zbroj kanala × boja slova × reljef letvica (procedurno, poravnato s teksturom zida).
export function signHaloMaterial(a: THREE.Texture, b: THREE.Texture, wall: WallKind = 0, noise: THREE.Texture | null = null) {
  return new THREE.ShaderMaterial({
    uniforms: {
      tA: { value: a },
      tB: { value: b },
      onA: { value: new THREE.Vector4() },
      onB: { value: new THREE.Vector3() },
      cW: { value: WHITE.clone() },
      cN: { value: NEON.clone() },
      uK: { value: wall === 0 ? 0.18 : 0.12 },
      uSlat: { value: SLAT },
      uFlute: { value: FLUTE },
      tNoise: { value: noise },
    },
    defines: { WALL: String(wall) },
    vertexShader: /* glsl */ `
      varying vec2 vUv; varying float vX; varying float vY;
      void main() { vUv = uv; vec4 w = modelMatrix * vec4(position, 1.0); vX = w.x; vY = w.y; gl_Position = projectionMatrix * viewMatrix * w; }`,
    fragmentShader: /* glsl */ `
      uniform sampler2D tA; uniform sampler2D tB; uniform vec4 onA; uniform vec3 onB; uniform vec3 cW; uniform vec3 cN; uniform float uK; uniform float uSlat; uniform float uFlute;
      uniform sampler2D tNoise;
      varying vec2 vUv; varying float vX; varying float vY;
      void main() {
        vec4 a = texture2D(tA, vUv);
        vec3 b = texture2D(tB, vUv).rgb;
        vec3 col = cW * dot(a, onA) + cN * dot(b, onB);
      #if WALL == 0
        // letvice: lice letvice puno svjetlo, utor (filc) gotovo crn, rub letvice lagano svjetliji
        float s = fract(vX / uSlat);
        float face = smoothstep(0.0, 0.06, s) * (1.0 - smoothstep(0.80, 0.86, s));
        float round = 0.82 + 0.3 * smoothstep(0.04, 0.2, s) * (1.0 - smoothstep(0.55, 0.84, s));
        col *= mix(0.12, 1.0, face) * round;
      #elif WALL == 1
        // kanelirani kamen: svjetlo slova (ispred zida) najjače pada na tjeme svake kanelure,
        // bokovi se okreću od njega, uski spoj između kanelura ostaje taman
        float fa = fract(vX / uFlute) * 2.0 - 1.0;
        float nz = sqrt(max(1.0 - fa * fa * 0.82, 0.0));
        float groove = smoothstep(0.985, 0.9, abs(fa));
        col *= (0.3 + 0.7 * nz * nz) * mix(0.25, 1.0, groove);
      #else
        // mikrocement: svjetlo prati blagu teksturu žbuke
        float n = texture2D(tNoise, vec2(vX, vY) * 0.42).r;
        col *= 0.78 + 0.44 * n;
      #endif
        gl_FragColor = vec4(col * uK, 1.0);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });
}

/** Tekstura zida: tamne hrastove letvice na crnom filcu (jedna pločica = 8 letvica, ponavlja se). */
export function slatTexture(): THREE.CanvasTexture {
  const n = 8;
  const cw = 64;
  const W = n * cw;
  const Hh = 256;
  const c = document.createElement("canvas");
  c.width = W;
  c.height = Hh;
  const g = c.getContext("2d")!;
  g.fillStyle = "#050505";
  g.fillRect(0, 0, W, Hh);
  let seed = 7;
  const rnd = () => {
    seed = (seed * 16807) % 2147483647;
    return seed / 2147483647;
  };
  for (let i = 0; i < n; i++) {
    const x0 = i * cw;
    const w = Math.round(cw * 0.83);
    const tone = 0.85 + rnd() * 0.3;
    const r = Math.round(30 * tone);
    const gg = Math.round(24 * tone);
    const b = Math.round(19 * tone);
    g.fillStyle = `rgb(${r},${gg},${b})`;
    g.fillRect(x0, 0, w, Hh);
    // godovi drva (tanke okomite linije, blago valovite)
    for (let k = 0; k < 7; k++) {
      const gx = x0 + 3 + rnd() * (w - 6);
      g.strokeStyle = `rgba(0,0,0,${0.12 + rnd() * 0.16})`;
      g.lineWidth = 0.6 + rnd() * 1.2;
      g.beginPath();
      g.moveTo(gx, 0);
      for (let y = 0; y <= Hh; y += 32) g.lineTo(gx + Math.sin(y * 0.03 + k) * 1.2, y);
      g.stroke();
    }
    // zaobljeni rubovi letvice
    const lg = g.createLinearGradient(x0, 0, x0 + w, 0);
    lg.addColorStop(0, "rgba(255,240,220,0.07)");
    lg.addColorStop(0.12, "rgba(0,0,0,0)");
    lg.addColorStop(0.85, "rgba(0,0,0,0)");
    lg.addColorStop(1, "rgba(0,0,0,0.35)");
    g.fillStyle = lg;
    g.fillRect(x0, 0, w, Hh);
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.flipY = false;
  t.wrapS = THREE.RepeatWrapping;
  t.wrapT = THREE.RepeatWrapping;
  t.anisotropy = 4;
  return t;
}

/** Gobo projekcija na podu: mali DRESIFY znak u mekom krugu svjetla. */
export function goboTexture(font: string): { tex: THREE.CanvasTexture; aspect: number } {
  const W = 512;
  const Hh = 256;
  const c = document.createElement("canvas");
  c.width = W;
  c.height = Hh;
  const g = c.getContext("2d")!;
  g.fillStyle = "#000";
  g.fillRect(0, 0, W, Hh);
  // meki eliptični krug svjetla projektora
  g.save();
  g.translate(W / 2, Hh / 2);
  g.scale(1, Hh / W);
  const rg = g.createRadialGradient(0, 0, 0, 0, 0, W * 0.48);
  rg.addColorStop(0, "rgba(255,246,232,0.42)");
  rg.addColorStop(0.55, "rgba(255,246,232,0.22)");
  rg.addColorStop(0.85, "rgba(255,246,232,0.04)");
  rg.addColorStop(1, "rgba(255,246,232,0)");
  g.fillStyle = rg;
  g.fillRect(-W / 2, -W / 2, W, W);
  g.restore();
  // znak (malo mutan — projektor nije savršeno izoštren na sjajnom podu)
  const PX = 104;
  g.font = `${PX}px ${font}`;
  g.textBaseline = "middle";
  const chars = [...SIGN_TEXT];
  const track = PX * 0.08;
  const ws = chars.map((ch) => g.measureText(ch).width);
  let x = W / 2 - (ws.reduce((a, b) => a + b, 0) + track * (chars.length - 1)) / 2;
  g.globalCompositeOperation = "lighter";
  chars.forEach((ch, i) => {
    const col = isNeon(i) ? "rgba(232,255,60,0.9)" : "rgba(255,248,236,0.95)";
    g.shadowColor = col;
    g.shadowBlur = 10;
    g.fillStyle = col;
    g.fillText(ch, x, Hh / 2 + PX * 0.04);
    x += ws[i] + track;
  });
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.flipY = false;
  return { tex: t, aspect: W / Hh };
}

/* ---------- paljenje slova ---------- */
// Realno paljenje LED slova: par kratkih treptaja različite jačine, pa stabilno.
// Svako slovo ima svoj uzorak (deterministički), jedno ("S") zastane malo dulje.
const PATTERNS: [number, number][][] = [
  [[0.04, 0.8], [0.05, 0.08], [0.035, 0.95], [0.06, 0.35]],
  [[0.03, 0.6], [0.07, 0.04], [0.05, 0.9]],
  [[0.05, 0.85], [0.04, 0.15], [0.03, 0.7], [0.04, 0.1]],
  [[0.03, 0.5], [0.09, 0.03], [0.03, 0.8], [0.12, 0.06], [0.04, 0.95], [0.05, 0.4]],
  [[0.04, 0.9], [0.05, 0.1]],
  [[0.03, 0.7], [0.06, 0.05], [0.04, 0.85], [0.03, 0.3]],
  [[0.05, 0.9], [0.04, 0.12], [0.06, 1.0], [0.05, 0.45]],
];
export function letterFlick(t: number, on: number, i: number) {
  let x = t - on;
  if (x < 0) return 0;
  const p = PATTERNS[i % PATTERNS.length];
  for (const [d, v] of p) {
    if (x < d) return v;
    x -= d;
  }
  return Math.min(1, 0.7 + x * 3);
}

/* ---------- stražnji zid (1: kanelirani kamen, 2: mikrocement) ---------- */
/** Bešavni šum (R: fini, G: krupni) za kamen/žbuku — podatkovna tekstura s mipmapama. */
export function wallNoiseTexture(size = 256): THREE.DataTexture {
  let seed = 11;
  const rnd = () => {
    seed = (seed * 16807) % 2147483647;
    return seed / 2147483647;
  };
  const octave = (cells: number) => {
    const g = new Float32Array(cells * cells);
    for (let i = 0; i < g.length; i++) g[i] = rnd();
    return (x: number, y: number) => {
      const fx = (x / size) * cells;
      const fy = (y / size) * cells;
      const x0 = Math.floor(fx);
      const y0 = Math.floor(fy);
      const tx = fx - x0;
      const ty = fy - y0;
      const sx = tx * tx * (3 - 2 * tx);
      const sy = ty * ty * (3 - 2 * ty);
      const at = (i: number, j: number) => g[(((j % cells) + cells) % cells) * cells + (((i % cells) + cells) % cells)];
      const a = at(x0, y0) + (at(x0 + 1, y0) - at(x0, y0)) * sx;
      const b = at(x0, y0 + 1) + (at(x0 + 1, y0 + 1) - at(x0, y0 + 1)) * sx;
      return a + (b - a) * sy;
    };
  };
  const fine = [octave(32), octave(64), octave(128)];
  const coarse = [octave(4), octave(8), octave(16)];
  const d = new Uint8Array(size * size * 4);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const f = fine[0](x, y) * 0.5 + fine[1](x, y) * 0.3 + fine[2](x, y) * 0.2;
      const c = coarse[0](x, y) * 0.5 + coarse[1](x, y) * 0.32 + coarse[2](x, y) * 0.18;
      const i = (y * size + x) * 4;
      d[i] = Math.round(Math.min(1, Math.max(0, (f - 0.5) * 1.8 + 0.5)) * 255);
      d[i + 1] = Math.round(Math.min(1, Math.max(0, (c - 0.5) * 1.9 + 0.5)) * 255);
      d[i + 2] = 0;
      d[i + 3] = 255;
    }
  }
  const t = new THREE.DataTexture(d, size, size, THREE.RGBAFormat);
  t.colorSpace = THREE.NoColorSpace;
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.generateMipmaps = true;
  t.minFilter = THREE.LinearMipmapLinearFilter;
  t.magFilter = THREE.LinearFilter;
  t.needsUpdate = true;
  return t;
}

/**
 * Stražnji zid s vlastitim (analitičkim) svjetlom — jeftino, računa se samo na pikselima zida:
 *  WALL 1 "kanelirani kamen": crni kamen s okomitim polukružnim kanelurama; skrivene stropne
 *         svjetiljke iznad kadra bacaju meke "scallop" klinove svjetla niz kanelure (svaka
 *         kanelura dobije odsjaj na strani prema svjetiljci) — kao u butiku.
 *  WALL 2 "mikrocement + linija svjetla": bešavna tamna žbuka; jedna tanka LED linija
 *         uvučena u zid nisko iza dresova, svjetlo klizi uz žbuku gore-dolje (otkrije
 *         teksturu) — svjetlosni "horizont" iza siluete.
 * Oba: mekana lokva svjetla iza dresa u fokusu (odvaja tamne siluete od zida).
 *
 * Svjetlo (neutralno bijelo ~5500 K, bez žutog tona):
 *  - "cove": skrivena kontinuirana linija iznad kadra klizi niz zid (ravnomjerno, bez
 *    nasumičnih mrlja), a prema bočnim rubovima kadra zid tone u crno (vinjeta u zidu);
 *  - LED linija šipke (ispred zida, pada prema dolje) ostavlja čist vodoravni pojas svjetla
 *    iza dresova — siluete se odvajaju od zida; pali se slijeva nadesno (uSweep);
 *  - lokva iza dresa u fokusu prati sredinu (uPoolX) + paralaksa uređaja (uPar).
 */
export function wallMaterial(kind: 1 | 2, noise: THREE.Texture) {
  return new THREE.ShaderMaterial({
    defines: { WALL: String(kind) },
    uniforms: {
      tNoise: { value: noise },
      uFlute: { value: FLUTE },
      uTop: { value: 3.2 }, // visina skrivenih svjetiljki / gornje linije (m)
      uLineY: { value: 0.3 }, // visina LED linije (zid 2) — u procjepu ispod dresova
      uWash: { value: 0 },
      uPool: { value: 0 },
      uPoolX: { value: 0 },
      uPoolY: { value: 1.3 },
      uWashC: { value: new THREE.Color(1.0, 0.985, 0.965) },
      uRail: { value: 0 }, // jačina pojasa s LED linije šipke
      uRailY: { value: 1.885 },
      uSweep: { value: 99 },
      uPar: { value: 0 },
    },
    vertexShader: /* glsl */ `
      varying vec3 vW;
      void main() { vec4 w = modelMatrix * vec4(position, 1.0); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }`,
    fragmentShader: /* glsl */ `
      uniform sampler2D tNoise; uniform float uFlute; uniform float uTop; uniform float uLineY; uniform float uWash; uniform float uPool;
      uniform float uPoolX; uniform float uPoolY; uniform vec3 uWashC;
      uniform float uRail; uniform float uRailY; uniform float uSweep; uniform float uPar;
      varying vec3 vW;
      // LED linija šipke: linijski izvor na visini uRailY, iznad šipke (z = -0.2·x² + 0.075),
      // svijetli prema dolje → na zidu pojas ispod visine šipke, mekano tone gore i dolje.
      vec3 railWash(vec3 n, vec2 p) {
        float dz = (-0.2 * p.x * p.x + 0.075) - vW.z;
        float dy = uRailY - p.y;
        vec3 L = normalize(vec3(0.0, dy, dz));
        float lobe = pow(max(L.y + 0.25, 0.0) / 1.25, 1.4);
        float att = 1.0 / (1.0 + (dy * dy + dz * dz) * 0.55);
        float lit = smoothstep(uSweep + 0.1, uSweep - 0.6, p.x);
        return vec3(max(dot(n, L), 0.0) * lobe * att * lit);
      }
      void main() {
        vec2 p = vW.xy;
        vec4 nz = texture2D(tNoise, p * 0.55);
        vec4 nc = texture2D(tNoise, p * 0.11 + 0.37);
        vec3 V = normalize(cameraPosition - vW);
        vec3 col = vec3(0.0);
        vec3 n;
        vec3 alb;
      #if WALL == 1
        float fa = fract(p.x / uFlute) * 2.0 - 1.0;
        n = normalize(vec3(fa * 0.92, (nz.r - 0.5) * 0.05, sqrt(max(1.0 - fa * fa * 0.85, 0.02))));
        float ao = mix(0.3, 1.0, smoothstep(0.99, 0.84, abs(fa)));
        alb = vec3(0.032, 0.032, 0.034) * (0.85 + 0.3 * nz.r) * (0.9 + 0.2 * nc.g);
        // skrivena kontinuirana linija iznad kadra: ravnomjerno klizi niz kanelure
        float dyT = max(uTop - p.y, 0.0);
        vec3 LT = normalize(vec3(0.0, dyT, 0.12));
        float attT = 1.0 / (1.0 + dyT * dyT * 0.8);
        float diffT = max(dot(n, LT), 0.0);
        float specT = pow(max(dot(n, normalize(LT + V)), 0.0), 48.0);
        vec3 lit = (diffT * 3.6 * alb + specT * 0.006) * attT;
        // pojas s LED linije šipke (svjetlo iza dresova) + odsjaj na tjemenu kanelura
        vec3 rw = railWash(n, p);
        lit += (rw * 3.2 * alb + rw * 0.003) * uRail;
        // skrivena linija u podu uz zid: mekani "uplight" niz kanelure od poda (svjetlosni
        // horizont iza dresova — popuni prazninu ispod njih i daje dubinu)
        float hB = max(p.y, 0.0);
        lit += alb * (0.3 + 0.7 * n.z) * (exp(-hB / 0.09) * 5.0 + exp(-hB / 0.35) * 0.8) * (1.0 - smoothstep(2.4, 4.8, abs(p.x)));
        col += lit * ao * uWashC * uWash;
        col += alb * uWashC * 0.18 * uWash * ao; // mrvica ambijenta da kamen ne bude rupa
      #else
        vec2 e = vec2(0.01, 0.0);
        float h0 = nz.r;
        float hx = texture2D(tNoise, (p + e.xy) * 0.55).r;
        float hy = texture2D(tNoise, (p + e.yx) * 0.55).r;
        n = normalize(vec3((h0 - hx) * 0.7, (h0 - hy) * 0.7, 1.0));
        alb = vec3(0.034, 0.034, 0.035) * (0.78 + 0.44 * nc.g) * (0.93 + 0.14 * nz.r);
        // gornji klizni sjaj (slab)
        float dyT = max(uTop - p.y, 0.0);
        vec3 LT = normalize(vec3(0.0, dyT, 0.2));
        col += alb * max(dot(n, LT), 0.0) * 4.0 / (1.0 + dyT * dyT * 2.2);
        // LED linija u zidu: svijetla jezgra + svjetlo koje klizi uz žbuku gore i dolje
        float dy = p.y - uLineY;
        float ady = abs(dy);
        vec3 LL = normalize(vec3(0.0, -dy, 0.05));
        float graze = max(dot(n, LL), 0.0);
        float spread = 1.0 / (1.0 + pow(ady / (dy > 0.0 ? 0.16 : 0.08), 2.0));
        float ends = 1.0 - smoothstep(4.2, 5.4, abs(p.x));
        col += alb * graze * spread * 9.0 * ends;
        col += alb * railWash(n, p) * 9.0 * uRail;
        float core = exp(-pow(ady / 0.005, 2.0)) * ends;
        // spoj s podom: zid tone u mrak (zid 2 nema zasebnu tamnu traku — linija mora ostati vidljiva)
        col *= mix(0.25, 1.0, smoothstep(0.0, 0.5, p.y)) ;
        col += vec3(1.0, 0.96, 0.9) * core * 0.75;
        col *= uWashC * uWash;
      #endif
        // mekana lokva iza dresa u fokusu (svjetlo sprijeda), lagano prati nagib uređaja
        vec2 q = (p - vec2(uPoolX + uPar * 0.18, uPoolY)) / vec2(1.25, 0.95);
        float pool = exp(-dot(q, q) * 1.8);
        col += alb * uWashC * pool * uPool * (0.2 + 0.8 * n.z * n.z) * 2.2;
        // zid tone u crno prema bočnim rubovima kadra (fokus na sredini, bez sivih rubova)
        col *= 1.0 - 0.85 * smoothstep(1.4, 4.4, abs(p.x - uPar * 0.25));
        gl_FragColor = vec4(col, 1.0);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`,
    fog: false,
  });
}
