// Scena "grafit" (zadana): goli tamni beton, veliki sprejani DRESIFY grafit na zidu, mokri
// reflektirajući pod. Bez letvica, kanelura, svjetiljki, snopova i lokvi svjetla.
//  - grafit: PNG (/naslovnica/graffiti/dresify-graffiti.png) ili, dok ga nema, proceduralni
//    nadomjestak nacrtan u canvas; decal na zidu (neosvijetljena boja, bez sjaja/bloom-a)
//  - ulaz: grafit se "isprejа" slijeva nadesno (meki rub s raspršenjem), IFY zadnji, pa
//    kapljice boje cure prema dolje — sve u shaderu (jedna maska, jeftino)
//  - pod: odraz s mokrim mrljama (oštriji, jači odraz u lokvama, mutniji na suhom)
import * as THREE from "three";

// webp (2048 px računalo / 1280 px mobitel, alfa bez gubitka, ~45 dB) umjesto 4 MB PNG-a
// (PNG ostaje kao izvor) → ulaz kreće brže
export const GRAFFITI_SRC = "/naslovnica/graffiti/dresify-graffiti-2048.webp";
export const GRAFFITI_SRC_SMALL = "/naslovnica/graffiti/dresify-graffiti-1280.webp";
const NEON = "#e8ff3c";

export type GraffitiArt = {
  canvas: HTMLCanvasElement;
  aspect: number; // širina / visina
  top: number; // uv (odozdo) vrha tijela slova
  base: number; // uv (odozdo) dna tijela slova (ispod su kapljice)
  ext: number; // uv (odozdo) najvišeg traga boje (krunica, prskanje)
  lumKey: boolean; // slika bez prozirnosti (tamna pozadina) → alfa iz svjetline
  neonX0: number; // uv (vodoravno) gdje počinje neonski dio (IFY)
  neonX1: number; // … i gdje završava
};

/* ------------------------------------------------------------------ */
/*  Učitavanje / analiza                                                */
/* ------------------------------------------------------------------ */
function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((res, rej) => {
    const im = new Image();
    im.decoding = "async";
    im.onload = () => res(im);
    im.onerror = rej;
    im.src = src;
  });
}

/** Grafit iz PNG-a (ako postoji) ili proceduralni nadomjestak. */
export async function loadGraffiti(font: string, maxW: number): Promise<GraffitiArt> {
  try {
    const im = await loadImage(maxW <= 1280 ? GRAFFITI_SRC_SMALL : GRAFFITI_SRC);
    if (!im.naturalWidth) throw new Error("empty");
    const s = Math.min(1, maxW / im.naturalWidth);
    const c = document.createElement("canvas");
    c.width = Math.round(im.naturalWidth * s);
    c.height = Math.round(im.naturalHeight * s);
    c.getContext("2d")!.drawImage(im, 0, 0, c.width, c.height);
    return analyse(c);
  } catch {
    return placeholder(font, Math.min(2048, maxW));
  }
}

// Profil pokrivenosti po recima → gdje je tijelo slova (gusto), a gdje samo kapljice (rijetko).
function analyse(c: HTMLCanvasElement): GraffitiArt {
  const w = 256;
  const h = Math.max(8, Math.round((256 * c.height) / c.width));
  const t = document.createElement("canvas");
  t.width = w;
  t.height = h;
  const g = t.getContext("2d", { willReadFrequently: true })!;
  g.drawImage(c, 0, 0, w, h);
  const d = g.getImageData(0, 0, w, h).data;
  // bez prozirnosti: kutovi neprozirni → alfa iz svjetline (tamna pozadina)
  const corner = [0, (w - 1) * 4, (h - 1) * w * 4, (h * w - 1) * 4].every((i) => d[i + 3] > 250);
  const cov = new Float32Array(h);
  for (let y = 0; y < h; y++) {
    let s = 0;
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4;
      const a = corner ? Math.min(1, Math.max(0, (Math.max(d[i], d[i + 1], d[i + 2]) / 255 - 0.08) / 0.27)) : d[i + 3] / 255;
      s += a;
    }
    cov[y] = s / w;
  }
  let mx = 0;
  for (const v of cov) mx = Math.max(mx, v);
  let y0 = 0;
  let y1 = h - 1;
  const thr = mx * 0.3;
  while (y0 < h - 1 && cov[y0] < thr) y0++;
  while (y1 > 0 && cov[y1] < thr) y1--;
  let ye = 0;
  while (ye < h - 1 && cov[ye] < mx * 0.02) ye++;
  // neonski dio (IFY): stupci s puno žuto-zelenih piksela u tijelu slova
  const neon = new Float32Array(w);
  for (let y = y0; y <= y1; y++) {
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4;
      const r = d[i], gg = d[i + 1], b = d[i + 2];
      if ((corner || d[i + 3] > 128) && gg > 120 && gg > b * 1.8 && r > b * 1.5) neon[x]++;
    }
  }
  let nm = 0;
  for (const v of neon) nm = Math.max(nm, v);
  let nx0 = 0;
  let nx1 = w - 1;
  while (nx0 < w - 1 && neon[nx0] < nm * 0.25) nx0++;
  while (nx1 > 0 && neon[nx1] < nm * 0.25) nx1--;
  const okNeon = nm > 0 && nx1 > nx0;
  return {
    canvas: c,
    aspect: c.width / c.height,
    top: 1 - y0 / h,
    base: 1 - (y1 + 1) / h,
    ext: 1 - ye / h,
    lumKey: corner,
    neonX0: okNeon ? nx0 / w : 0.6,
    neonX1: okNeon ? (nx1 + 1) / w : 0.92,
  };
}

// Nadomjestak: sprejani DRES (bijelo-sivo, izlizano) + IFY (neon) s kapljicama, krunica, prskanje.
function placeholder(font: string, W: number): GraffitiArt {
  const H = Math.round(W * 0.42);
  const c = document.createElement("canvas");
  c.width = W;
  c.height = H;
  const g = c.getContext("2d")!;
  let seed = 7;
  const rnd = () => {
    seed = (seed * 16807) % 2147483647;
    return seed / 2147483647;
  };
  const k = W / 2048;
  const PX = 520 * k;
  const baseY = H * 0.74;
  const word = "DRESIFY";
  g.font = `${PX}px ${font}`;
  g.textBaseline = "alphabetic";
  const widths = [...word].map((ch) => g.measureText(ch).width * 1.08);
  const total = widths.reduce((a, b) => a + b, 0);
  let x = (W - total) / 2 + 40 * k;
  const drawWord = (pass: "shadow" | "paint") => {
    let xx = x;
    [...word].forEach((ch, i) => {
      const neon = i >= 4;
      g.save();
      g.translate(xx + widths[i] / 2, baseY + (neon ? -18 : 6) * k * Math.sin(i * 1.7));
      g.rotate((rnd() - 0.5) * 0.08 - 0.04);
      g.transform(1, 0, -0.2, 1, 0, 0);
      g.scale(1.08, neon ? 1.12 : 1);
      if (pass === "shadow") {
        g.fillStyle = "rgba(0,0,0,0.85)";
        g.fillText(ch, -widths[i] / 2 + 10 * k, 12 * k);
      } else {
        g.fillStyle = neon ? NEON : "#dcdcd8";
        g.fillText(ch, -widths[i] / 2, 0);
      }
      g.restore();
      xx += widths[i] * (neon ? 0.98 : 0.94);
    });
  };
  seed = 7;
  drawWord("shadow");
  seed = 7;
  drawWord("paint");
  // izlizano: suhi potezi kista + rupice (samo bijeli dio — prije neona)
  g.save();
  g.globalCompositeOperation = "destination-out";
  for (let i = 0; i < 900; i++) {
    const px = x + rnd() * total * 0.6;
    const py = baseY - rnd() * PX * 0.8;
    g.globalAlpha = 0.3 + rnd() * 0.6;
    if (rnd() < 0.35) {
      g.lineWidth = (1 + rnd() * 3) * k;
      g.beginPath();
      g.moveTo(px, py);
      g.lineTo(px + (20 + rnd() * 90) * k, py - (rnd() * 14 - 7) * k);
      g.stroke();
    } else {
      g.beginPath();
      g.arc(px, py, (1 + rnd() * 4) * k, 0, Math.PI * 2);
      g.fill();
    }
  }
  g.restore();
  // kapljice ispod slova (iste boje kao slovo iznad)
  const drip = (dx: number, len: number, col: string, wdt: number) => {
    g.fillStyle = col;
    g.beginPath();
    g.moveTo(dx - wdt / 2, baseY - 4 * k);
    g.lineTo(dx + wdt / 2, baseY - 4 * k);
    g.lineTo(dx + wdt * 0.32, baseY + len);
    g.arc(dx, baseY + len, wdt * 0.42, 0, Math.PI);
    g.closePath();
    g.fill();
  };
  let xx = x;
  [...word].forEach((ch, i) => {
    const neon = i >= 4;
    const n = neon ? 3 : 1 + Math.floor(rnd() * 2);
    for (let j = 0; j < n; j++) {
      const dx = xx + widths[i] * (0.15 + rnd() * 0.65);
      drip(dx, (neon ? 60 + rnd() * 150 : 30 + rnd() * 70) * k, neon ? NEON : "#cfcfcb", (neon ? 9 + rnd() * 9 : 6 + rnd() * 6) * k);
    }
    xx += widths[i] * (neon ? 0.98 : 0.94);
  });
  // krunica (neon tag) gore lijevo
  g.save();
  g.translate(x - 30 * k, baseY - PX * 0.86);
  g.rotate(-0.16);
  g.strokeStyle = NEON;
  g.lineWidth = 11 * k;
  g.lineJoin = "round";
  g.lineCap = "round";
  g.beginPath();
  g.moveTo(0, 0);
  g.lineTo(-14 * k, -78 * k);
  g.lineTo(34 * k, -36 * k);
  g.lineTo(66 * k, -96 * k);
  g.lineTo(98 * k, -36 * k);
  g.lineTo(146 * k, -78 * k);
  g.lineTo(132 * k, 0);
  g.closePath();
  g.stroke();
  g.restore();
  // neon prskanje oko IFY i lijevo dolje
  g.fillStyle = NEON;
  for (let i = 0; i < 160; i++) {
    const zone = rnd() < 0.7;
    const cx = zone ? x + total * (0.55 + rnd() * 0.45) : x + rnd() * total * 0.25;
    const cy = zone ? baseY - PX * (rnd() * 1.1) : baseY + rnd() * 50 * k;
    g.globalAlpha = 0.5 + rnd() * 0.5;
    g.beginPath();
    g.arc(cx, cy, (0.8 + rnd() * rnd() * 7) * k, 0, Math.PI * 2);
    g.fill();
  }
  g.globalAlpha = 1;
  return analyse(c);
}

/* ------------------------------------------------------------------ */
/*  Materijali                                                          */
/* ------------------------------------------------------------------ */
/**
 * Grafit na zidu: boja s teksture (neosvijetljena, bez tone-mappinga), lagano "upijena" u
 * beton (zrno zida prolazi kroz boju). Maska ulaza:
 *  uT  = vrijeme od početka ulaza (s); 99 = gotovo
 *  sprej klizi slijeva nadesno (uStart … uStart + uDur), meki rub + raspršene točkice ispred;
 *  ispod uBase kapljice cure prema dolje svaka svojom brzinom nakon što sprej prođe.
 */
export function graffitiMaterial(map: THREE.Texture, noise: THREE.Texture, art: GraffitiArt) {
  return new THREE.ShaderMaterial({
    uniforms: {
      tMap: { value: map },
      tNoise: { value: noise },
      uT: { value: 99 },
      uStart: { value: 0.15 },
      uDur: { value: 1.3 },
      uBase: { value: art.base },
      uLum: { value: art.lumKey ? 1 : 0 },
      uBright: { value: 0.86 },
    },
    vertexShader: /* glsl */ `
      varying vec2 vUv; varying vec2 vP;
      void main() {
        vUv = uv;
        vec4 w = modelMatrix * vec4(position, 1.0);
        vP = w.xy;
        gl_Position = projectionMatrix * viewMatrix * w;
      }`,
    fragmentShader: /* glsl */ `
      uniform sampler2D tMap; uniform sampler2D tNoise;
      uniform float uT; uniform float uStart; uniform float uDur; uniform float uBase; uniform float uLum; uniform float uBright;
      varying vec2 vUv; varying vec2 vP;
      float alphaOf(vec4 c) { return uLum > 0.5 ? clamp((max(c.r, max(c.g, c.b)) - 0.03) / 0.2, 0.0, 1.0) : c.a; }
      void main() {
        vec4 c = texture2D(tMap, vUv);
        float a = alphaOf(c);
        vec3 col = uLum > 0.5 ? c.rgb / max(a, 0.05) : c.rgb;
        // --- maska spreja ---
        float wob = texture2D(tNoise, vUv * vec2(3.0, 1.2) + 0.17).g;
        float tx = uStart + (vUv.x + 0.035 * sin(vUv.y * 13.0 + vUv.x * 4.0) + (wob - 0.5) * 0.06) * uDur;
        float dt = uT - tx;
        float body = smoothstep(0.0, 0.11, dt);
        // kapljice: stupci s vlastitom brzinom, cure tek kad sprej prođe
        float colN = texture2D(tNoise, vec2(floor(vUv.x * 140.0) / 140.0 * 1.9, 0.43)).r;
        float sp = 2.2 + 3.6 * colN;
        float run = uBase * 1.06 * (1.0 - exp(-max(dt - 0.12, 0.0) * sp));
        float dripOk = vUv.y >= uBase ? 1.0 : smoothstep(0.0, 0.012, run - (uBase - vUv.y));
        float m = body * dripOk;
        // raspršenje: sitne točkice i magla boje tik ispred fronte (samo oko poteza)
        float near = smoothstep(-0.2, -0.015, dt) * (1.0 - body);
        vec4 blur = texture2D(tMap, vUv, 3.5);
        float mist = alphaOf(blur);
        float speck = step(0.8, texture2D(tNoise, vUv * vec2(4.2, 1.6)).r);
        float over = near * mist * (speck * 0.75 + 0.12);
        vec3 mistCol = uLum > 0.5 ? blur.rgb / max(mist, 0.05) : blur.rgb;
        // beton kroz boju
        float grain = texture2D(tNoise, vP * 1.3).r;
        float shade = 0.8 + 0.32 * grain;
        float alpha = a * m * (0.88 + 0.12 * grain);
        // bijeli/sivi sprej (DRES): svjetlosiv (~#cfcfcf) umjesto čisto bijelog, suhi kist
        // (vodoravne pruge) i beton prolazi kroz boju — "upijeno u zid", ne naljepnica.
        // Neon (IFY, zasićen) ostaje netaknut.
        float cmx = max(col.r, max(col.g, col.b));
        float sat = (cmx - min(col.r, min(col.g, col.b))) / max(cmx, 1e-3);
        float grey = 1.0 - smoothstep(0.14, 0.32, sat);
        float wallF = texture2D(tNoise, vP * 0.9).r;
        float wallB = texture2D(tNoise, vP * 0.13 + 0.21).g;
        float pit = smoothstep(0.8, 0.94, texture2D(tNoise, vP * 2.6 + 0.7).r);
        float brush = texture2D(tNoise, vUv * vec2(1.4, 26.0) + vec2(0.31, 0.07)).r;
        float brush2 = texture2D(tNoise, vUv * vec2(3.1, 61.0) + vec2(0.7, 0.4)).g;
        float dry = smoothstep(0.14, 0.46, brush * 0.6 + brush2 * 0.4);
        float soak = (0.8 + 0.2 * smoothstep(0.25, 0.75, wallF)) * (1.0 - 0.8 * pit);
        alpha *= mix(1.0, mix(0.45, 1.0, dry) * soak, grey);
        col *= mix(1.0, 0.9 * (0.93 + 0.14 * wallF), grey);
        vec3 paint = col * shade * uBright;
        float outA = alpha + over * (1.0 - alpha);
        vec3 outC = (paint * alpha + mistCol * shade * uBright * over * (1.0 - alpha)) / max(outA, 1e-4);
        if (outA < 0.004) discard;
        gl_FragColor = vec4(outC, outA);
        #include <colorspace_fragment>
      }`,
    transparent: true,
    depthWrite: false,
    toneMapped: false,
    fog: false,
  });
}

/** Goli tamni beton: gotovo crn, sitno zrno + mekane mrlje + rupice; bez svjetiljki i letvica. */
export function concreteWallMaterial(noise: THREE.Texture, floorY = 0) {
  return new THREE.ShaderMaterial({
    uniforms: { tNoise: { value: noise }, uLevel: { value: 3.4 }, uFloor: { value: floorY } },
    vertexShader: /* glsl */ `
      varying vec3 vW;
      void main() { vec4 w = modelMatrix * vec4(position, 1.0); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }`,
    fragmentShader: /* glsl */ `
      uniform sampler2D tNoise; uniform float uLevel; uniform float uFloor;
      varying vec3 vW;
      void main() {
        vec2 p = vW.xy;
        float f = texture2D(tNoise, p * 0.9).r;
        float f2 = texture2D(tNoise, p * 0.23 + 0.5).r;
        float blot = texture2D(tNoise, p * 0.13 + 0.21).g;
        float pit = smoothstep(0.82, 0.95, texture2D(tNoise, p * 2.6 + 0.7).r);
        vec3 alb = vec3(0.0135, 0.0134, 0.0132) * (0.4 + 1.15 * blot * blot) * (0.62 + 0.5 * f + 0.22 * f2) * (1.0 - 0.6 * pit);
        // mekano: malo svjetlije gore-sredina (prostorni ambijent), tamnije uz pod i bočno
        float lit = mix(0.8, 1.0, smoothstep(0.0, 1.4, p.y - uFloor)) * (1.0 - 0.45 * smoothstep(2.0, 6.0, abs(p.x)));
        // meka kontaktna sjena uz pod (spoj zid/pod bez tvrdog ruba)
        lit *= mix(0.72, 1.0, smoothstep(0.0, 0.32, p.y - uFloor));
        gl_FragColor = vec4(alb * lit * uLevel, 1.0);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`,
    fog: false,
  });
}

/**
 * Mokri beton (baza poda): vidljiva hrapava siva ploha (~#121212) s prugama izduženim prema
 * kameri, svjetlija uz zid (isti prostorni ambijent kao zid), tamnija prema kameri; meka
 * kontaktna sjena tik uz zid (bez tvrdog šava). Odraz (Reflector) se dodaje povrh.
 */
export function wetConcreteFloorMaterial(noise: THREE.Texture, wallZ: number) {
  return new THREE.ShaderMaterial({
    uniforms: { tNoise: { value: noise }, uWallZ: { value: wallZ } },
    vertexShader: /* glsl */ `
      varying vec3 vW;
      void main() { vec4 w = modelMatrix * vec4(position, 1.0); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }`,
    fragmentShader: /* glsl */ `
      uniform sampler2D tNoise; uniform float uWallZ;
      varying vec3 vW;
      void main() {
        vec2 p = vW.xz;
        float s1 = texture2D(tNoise, vec2(p.x * 1.9, p.y * 0.16) + 0.37).r;
        float s2 = texture2D(tNoise, vec2(p.x * 6.5, p.y * 0.45) + 0.11).g;
        float g = texture2D(tNoise, p * 1.6).r;
        float blot = texture2D(tNoise, p * 0.21 + 0.6).g;
        float pit = smoothstep(0.84, 0.95, texture2D(tNoise, p * 3.1 + 0.2).r);
        float base = 0.0056 * (0.62 + 0.42 * s1 + 0.22 * s2) * (0.82 + 0.36 * g) * (0.7 + 0.6 * blot) * (1.0 - 0.5 * pit);
        float dz = vW.z - uWallZ;
        // mekani sjaj u sredini poda (ispod dresova), tamnije prema kameri i bočno (kao zid)
        base *= mix(1.15, 0.6, smoothstep(1.4, 5.0, dz)) * (1.0 - 0.62 * smoothstep(1.6, 5.5, abs(p.x)));
        // kontaktna sjena uz zid: spoj počinje jednako taman kao dno zida, bez šava
        base *= mix(0.32, 1.0, smoothstep(0.0, 0.9, dz));
        // bez tone-mappinga: neutralni "toe" bi zgnječio tamnosivu bazu u crno
        gl_FragColor = vec4(vec3(base), 1.0);
        #include <colorspace_fragment>
      }`,
  });
}

/** Mekana radijalna mrlja (neonski odsjaj ispod IFY). */
export function neonGlowTexture() {
  const c = document.createElement("canvas");
  c.width = c.height = 128;
  const g = c.getContext("2d")!;
  const rg = g.createRadialGradient(64, 64, 0, 64, 64, 64);
  rg.addColorStop(0, "rgba(255,255,255,1)");
  rg.addColorStop(0.35, "rgba(255,255,255,0.55)");
  rg.addColorStop(0.7, "rgba(255,255,255,0.14)");
  rg.addColorStop(1, "rgba(255,255,255,0)");
  g.fillStyle = rg;
  g.fillRect(0, 0, 128, 128);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

/**
 * Mokri pod — odraz: dresovi (i dno zida) se zrcale ~40 %, razvučeni okomito (mokar beton
 * "povlači" odraz prema kameri), lomljeni prugama hrapavosti; slabi s udaljenošću od dresova.
 */
export const WET_FLOOR_SHADER = {
  name: "NdWetFloor",
  uniforms: {
    color: { value: null as THREE.Color | null },
    tDiffuse: { value: null as THREE.Texture | null },
    textureMatrix: { value: null as THREE.Matrix4 | null },
    tNoise: { value: null as THREE.Texture | null },
    strength: { value: 0.0 },
    camZ: { value: 4.0 },
  },
  vertexShader: /* glsl */ `
    uniform mat4 textureMatrix;
    varying vec4 vUv; varying vec3 vW;
    void main() {
      vUv = textureMatrix * vec4(position, 1.0);
      vW = (modelMatrix * vec4(position, 1.0)).xyz;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }`,
  fragmentShader: /* glsl */ `
    uniform vec3 color; uniform sampler2D tDiffuse; uniform sampler2D tNoise; uniform float strength; uniform float camZ;
    varying vec4 vUv; varying vec3 vW;
    void main() {
      vec2 xz = vW.xz;
      float wet = smoothstep(0.36, 0.64, texture2D(tNoise, xz * 0.16 + 0.31).g);
      float s1 = texture2D(tNoise, vec2(xz.x * 1.9, xz.y * 0.16) + 0.37).r;
      float s2 = texture2D(tNoise, vec2(xz.x * 6.5, xz.y * 0.45) + 0.11).g;
      vec2 uv = vUv.xy / vUv.w;
      // pruge hrapavosti lome odraz u okomite niti
      uv.x += (s2 - 0.5) * mix(0.006, 0.0025, wet);
      float len = mix(0.03, 0.012, wet);
      float bias = mix(1.4, 0.5, wet);
      vec3 c = vec3(0.0);
      float ws = 0.0;
      for (int i = 0; i < 9; i++) {
        float t = float(i) / 8.0;
        float w = 1.0 - t * 0.75;
        c += texture2D(tDiffuse, uv + vec2(0.0, (t - 0.25) * len), bias).rgb * w;
        ws += w;
      }
      c /= ws;
      // slabi s udaljenošću od dresova (šipka je na z = 0), iza zida ništa
      float fade = mix(1.0, 0.1, smoothstep(0.3, 2.8, vW.z));
      float far = smoothstep(-2.1, -2.03, vW.z);
      float k = mix(0.62, 1.0, wet) * (0.8 + 0.4 * s1);
      gl_FragColor = vec4(c * color * strength * fade * far * k, 1.0);
      #include <tonemapping_fragment>
      #include <colorspace_fragment>
    }`,
};
