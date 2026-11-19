import * as THREE from "three";

import type { GraffitiArt } from "@/components/naslovnica/three/graffiti";

/* ------------------------------------------------------------------ */
/*  Smjer E — umjesto grafita NAŠ LOGO na zidu, ispisan kao prezimena   */
/*  na karticama / stranici dresa: Bebas Neue, samo tanki obris, bez    */
/*  ispune. DRES svijetlosivo (niska prozirnost), IFY limeta #e8ff3c.   */
/*                                                                      */
/*  Tekstura: samo maska obrisa (alfa), nacrtana jednom u velikoj       */
/*  rezoluciji (4096 px računalo / 2560 mobitel) → oštro i na DPR 2.    */
/*  Boja, svjetlo i ulaz su u shaderu:                                   */
/*   - ulaz "neonska linija": obris svakog slova se iscrta oko svog      */
/*     središta (kao stroke-dashoffset), slova slijeva nadesno, IFY      */
/*     zadnji, ~1,6 s; vrh linije kratko jače svijetli                   */
/*   - IFY ima meki neonski sjaj (mip-zamućenje iste maske)              */
/*   - dašak svjetla na logu iz lokve iza dresa u fokusu                 */
/*  uT dijeli s engineom (sekunde od ulaza; 99 = gotovo): jednom po      */
/*  sesiji, dodir preskače, smanjeni pokreti → odmah gotovo.             */
/* ------------------------------------------------------------------ */

const WORD = "DRESIFY";
const IFY_FROM = 4; // indeks prvog slova IFY
/** ukupno trajanje crtanja (s) */
export const LOGO_DRAW = 1.6;
const STAGGER = 0.17; // s između početaka slova
const LETTER_DUR = LOGO_DRAW - STAGGER * (WORD.length - 1); // ≈ 0,58 s po slovu

export type LogoArt = GraffitiArt & {
  /** po slovu: [x0, x1, cx, cy] u uv (cy odozdo) */
  letters: [number, number, number, number][];
  /** uv x gdje počinje IFY */
  ifyX: number;
};

function fontFamily() {
  try {
    const v = getComputedStyle(document.body).getPropertyValue("--font-bebas").trim();
    if (v) return `${v}, "Bebas Neue", sans-serif`;
  } catch {
    /* SSR / bez tijela */
  }
  return `"Bebas Neue", sans-serif`;
}

/** Mjere logotipa bez crtanja (za kadar prije nego je platno gotovo — bez skoka kamere). */
export function logoMetrics(): Pick<GraffitiArt, "aspect" | "base" | "top" | "ext"> {
  const fallback = { aspect: 4.2, base: 0.09, top: 0.91, ext: 0.91 };
  try {
    const ctx = document.createElement("canvas").getContext("2d");
    if (!ctx) return fallback;
    const REF = 1000;
    ctx.font = `400 ${REF}px ${fontFamily()}`;
    const track = 0.04 * REF;
    const w = Array.from(WORD).reduce((acc, ch) => acc + ctx.measureText(ch).width, 0) + track * (WORD.length - 1);
    const m = ctx.measureText(WORD);
    const asc = m.actualBoundingBoxAscent || REF * 0.7;
    const desc = Math.max(0, m.actualBoundingBoxDescent || 0);
    const pad = REF * 0.06;
    const H = asc + desc + pad * 2;
    return { aspect: (w + pad * 2) / H, base: 1 - (pad + asc) / H, top: 1 - pad / H, ext: 1 - pad / H };
  } catch {
    return fallback;
  }
}

/** Nacrta obris logotipa u platno (čeka da se Bebas učita, najviše ~2,5 s). */
export async function paintLogo(maxW: number, mobile: boolean): Promise<LogoArt> {
  const fam = fontFamily();
  try {
    await Promise.race([document.fonts.load(`400 200px ${fam}`, WORD), new Promise((r) => setTimeout(r, 2500))]);
  } catch {
    /* crta se zamjenskim fontom */
  }
  const probe = document.createElement("canvas").getContext("2d");
  if (!probe) throw new Error("logo: no 2d");
  const REF = 1000;
  probe.font = `400 ${REF}px ${fam}`;
  const track = 0.04 * REF; // isti razmak slova kao Wordmark u zaglavlju
  const adv = Array.from(WORD).map((ch) => probe.measureText(ch).width);
  const m = probe.measureText("DRESIFY");
  const asc = m.actualBoundingBoxAscent || REF * 0.7;
  const desc = Math.max(0, m.actualBoundingBoxDescent || 0);
  const pad = REF * 0.06;
  const wordW = adv.reduce((a, b) => a + b, 0) + track * (WORD.length - 1);
  const refW = wordW + pad * 2;
  const refH = asc + desc + pad * 2;
  const k = maxW / refW;
  const W = Math.round(refW * k);
  const H = Math.round(refH * k);
  const cv = document.createElement("canvas");
  cv.width = W;
  cv.height = H;
  const ctx = cv.getContext("2d");
  if (!ctx) throw new Error("logo: no 2d");
  const F = REF * k;
  ctx.font = `400 ${F}px ${fam}`;
  ctx.textBaseline = "alphabetic";
  ctx.lineJoin = "round";
  ctx.lineCap = "round";
  ctx.strokeStyle = "#ffffff";
  // tanki obris kao prezimena (1–1,25 px na ~200 px slova); mobitel malo deblji (manji natpis)
  ctx.lineWidth = Math.max(2, F * (mobile ? 0.011 : 0.0068));
  const baseY = (pad + asc) * k;
  let x = pad * k;
  const letters: [number, number, number, number][] = [];
  const capTopUv = 1 - (pad * k) / H;
  const baseUv = 1 - baseY / H;
  for (let i = 0; i < WORD.length; i++) {
    const ch = WORD[i];
    ctx.strokeText(ch, x, baseY);
    const w = adv[i] * k;
    letters.push([x / W, (x + w) / W, (x + w / 2) / W, (baseUv + capTopUv) / 2]);
    x += w + track * k;
  }
  const ifyX = letters[IFY_FROM][0] - (track * k * 0.5) / W;
  return {
    canvas: cv,
    aspect: W / H,
    top: capTopUv,
    base: baseUv,
    ext: capTopUv,
    lumKey: false,
    neonX0: letters[IFY_FROM][0],
    neonX1: letters[WORD.length - 1][1],
    letters,
    ifyX,
  };
}

const VERT = /* glsl */ `
  varying vec2 vUv; varying vec3 vP;
  void main() {
    vUv = uv;
    vec4 w = modelMatrix * vec4(position, 1.0);
    vP = w.xyz;
    gl_Position = projectionMatrix * viewMatrix * w;
  }`;

const FRAG = /* glsl */ `
  uniform sampler2D tMap;
  uniform float uT; uniform float uAspect; uniform float uIfyX; uniform float uBright;
  uniform vec4 uL[7];
  uniform vec3 uDres; uniform vec3 uIfy; uniform vec2 uOp;
  uniform float uPoolX;
  varying vec2 vUv; varying vec3 vP;
  const float STAG = ${STAGGER.toFixed(3)};
  const float DUR = ${LETTER_DUR.toFixed(3)};
  void main() {
    float a = texture2D(tMap, vUv).a;
    bool ify = vUv.x >= uIfyX;
    // IFY: meki neonski sjaj (ista maska, jako mip-zamućena)
    float glow = 0.0; // FINAL: bez neonskog sjaja oko IFY
    if (a < 0.002 && glow < 0.002) discard;
    // koje slovo: najbliže središte po x
    int li = 0; float best = 9.0;
    for (int i = 0; i < 7; i++) {
      float d = abs(vUv.x - uL[i].z);
      if (d < best) { best = d; li = i; }
    }
    vec4 L = uL[0];
    for (int i = 0; i < 7; i++) if (i == li) L = uL[i];
    // ulaz: obris se iscrta oko središta slova, kreće gore-lijevo, u smjeru kazaljke
    float vis = 1.0; float tip = 0.0;
    if (uT < 90.0) {
      float p = clamp((uT - float(li) * STAG) / DUR, 0.0, 1.0);
      p = 1.0 - pow(1.0 - p, 2.2); // brzi početak, meko pristajanje
      vec2 d = (vUv - L.zw) * vec2(uAspect, 1.0);
      float ang = atan(d.x, d.y); // 0 = gore, raste u smjeru kazaljke
      float u = fract(ang / 6.2831853 + 1.11); // u = 0 gore-lijevo (~40° prije vrha)
      vis = step(u, p) * step(0.001, p);
      tip = (1.0 - smoothstep(0.0, 0.06, p - u)) * vis * (1.0 - step(0.999, p));
      glow *= p;
    }
    vec3 col = ify ? uIfy : uDres;
    float op = (ify ? uOp.y : uOp.x);
    // dašak svjetla iz lokve iza dresa u fokusu; rubovi zida tamniji
    float wash = 0.82 + 0.28 * exp(-pow((vP.x - uPoolX) / 2.4, 2.0));
    wash *= 1.0 - 0.35 * smoothstep(2.0, 5.5, abs(vP.x));
    float line = a * vis * op * wash;
    vec3 c = col * line + col * tip * a * 1.6 + (ify ? uIfy * glow * 0.22 * wash : vec3(0.0));
    float al = clamp(line + tip * a * 0.8 + glow * (ify ? 0.22 : 0.0), 0.0, 1.0);
    gl_FragColor = vec4(c * uBright / max(al, 1e-4), al);
    #include <colorspace_fragment>
  }`;

/** Materijal logotipa. uT dijeli s engineom (ulaz). */
export function logoMaterial(tex: THREE.Texture, art: LogoArt, pool: THREE.IUniform<number>, bright = 1) {
  const L = art.letters.map(([x0, x1, cx, cy]) => new THREE.Vector4(x0, x1, cx, cy));
  return new THREE.ShaderMaterial({
    uniforms: {
      tMap: { value: tex },
      uT: { value: 99 },
      uAspect: { value: art.aspect },
      uIfyX: { value: art.ifyX },
      uBright: { value: bright },
      uL: { value: L },
      // boje kao Wordmark: DRES svijetlo siva, IFY limeta (linearno; izlaz se kodira u sRGB)
      uDres: { value: new THREE.Color("#e9e9e6") },
      // IFY je naša limeta #e8ff3c (kao Wordmark u zaglavlju) u svakom stanju: tijekom ulaza,
      // nakon njega i u odrazu (tamo samo slabija). DRES ostaje prigušeno sivi obris.
      uIfy: { value: new THREE.Color("#e8ff3c") },
      uOp: { value: new THREE.Vector2(0.32, 0.92) },
      uPoolX: pool,
    },
    vertexShader: VERT,
    fragmentShader: FRAG,
    transparent: true,
    depthWrite: false,
    toneMapped: false,
  });
}

/** Tekstura maske (oštra: mipmape + anizotropija). */
export function logoTexture(art: LogoArt, renderer?: THREE.WebGLRenderer) {
  const tex = new THREE.CanvasTexture(art.canvas);
  tex.colorSpace = THREE.NoColorSpace;
  tex.anisotropy = Math.min(8, renderer?.capabilities.getMaxAnisotropy() ?? 8);
  tex.minFilter = THREE.LinearMipmapLinearFilter;
  tex.magFilter = THREE.LinearFilter;
  tex.generateMipmaps = true;
  return tex;
}
