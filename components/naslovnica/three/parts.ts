// Gradivni dijelovi 3D trgovine: okruženje za krom, gradijentne teksture, shaderi
// (volumetrijski snop, LED sjaj, zamućeni odraz poda), učitavanje tekstura.
// Sve vanilla three.js — bez dodatnih biblioteka.
import * as THREE from "three";

/* ---------- okruženje (PMREM) ---------- */
// Tamna galerija: crna soba s dugim, uskim, neutralno bijelim (~5500 K) stropnim linijama
// i jednim mekim bočnim panelom — krom dobije čiste, oštre bijele crte (kao u Apple/Nike
// trgovini), bez toplih/žutih odsjaja i bez sive sobe.
export function makeEnvironment(renderer: THREE.WebGLRenderer): THREE.Texture {
  const scene = new THREE.Scene();
  const room = new THREE.Mesh(
    new THREE.BoxGeometry(14, 7, 14),
    new THREE.MeshBasicMaterial({ color: new THREE.Color(0.008, 0.008, 0.009), side: THREE.BackSide })
  );
  room.position.y = 2.5;
  scene.add(room);
  const panel = (w: number, h: number, c: THREE.Color, pos: [number, number, number], rot: [number, number, number]) => {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ color: c, side: THREE.DoubleSide }));
    m.position.set(...pos);
    m.rotation.set(...rot);
    scene.add(m);
  };
  const white = (k: number) => new THREE.Color(k * 0.985, k, k * 1.02);
  // stropne linije (dugi, uski, vrlo svijetli izvori → oštra bijela crta duž kroma)
  panel(10, 0.16, white(18), [0, 5.9, -1.2], [Math.PI / 2, 0, 0]);
  panel(10, 0.08, white(10), [0, 5.9, 1.4], [Math.PI / 2, 0, 0]);
  // jedan meki bočni panel (studijski softbox) — tamna druga strana daje kontrast
  panel(1.4, 3.6, white(1.8), [-6.9, 2.6, 0.8], [0, Math.PI / 2, 0]);
  // prednji izvor iza kamere: uska vodoravna linija (horizont u kromu)
  panel(7, 0.22, white(2.6), [0, 2.3, 6.9], [0, Math.PI, 0]);
  // LED linija šipke odozdo (hladno bijela, ne jantar)
  panel(10, 0.1, white(2.4), [0, 0.2, -2.5], [0, 0, 0]);
  const pmrem = new THREE.PMREMGenerator(renderer);
  const tex = pmrem.fromScene(scene, 0.02).texture;
  pmrem.dispose();
  scene.traverse((o) => {
    const m = o as THREE.Mesh;
    if (m.isMesh) {
      m.geometry.dispose();
      (m.material as THREE.Material).dispose();
    }
  });
  return tex;
}

/* ---------- gradijentne teksture (canvas) ---------- */
export function radialTexture(stops: [number, string][], size = 128): THREE.CanvasTexture {
  const c = document.createElement("canvas");
  c.width = c.height = size;
  const g = c.getContext("2d")!;
  const gr = g.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  for (const [o, col] of stops) gr.addColorStop(o, col);
  g.fillStyle = gr;
  g.fillRect(0, 0, size, size);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.flipY = false; // simetrično; bez FLIP_Y stanja (WebKit upozorenje za 3D teksture)
  return t;
}

// Mekani "scallop" reflektora na zidu (svjetlo odozgo, konus prema dolje).
export function scallopTexture(size = 256): THREE.CanvasTexture {
  const c = document.createElement("canvas");
  c.width = size;
  c.height = size * 2;
  const g = c.getContext("2d")!;
  const W = size;
  const H = size * 2;
  const img = g.createImageData(W, H);
  for (let y = 0; y < H; y++) {
    const v = 1 - y / H; // flipY=false → redak 0 je dno plohe; v: 0 gore
    for (let x = 0; x < W; x++) {
      const u = (x / W) * 2 - 1;
      const spread = 0.12 + v * 0.75; // konus se širi prema dolje
      const across = Math.max(0, 1 - (u / spread) ** 2);
      const core = Math.exp(-((v - 0.06) ** 2) / 0.004) * Math.max(0, 1 - (u / 0.2) ** 2);
      const down = Math.pow(1 - v, 1.6) * Math.min(1, v * 14);
      const a = Math.min(1, across ** 1.6 * down * 0.85 + core * 0.9);
      const i = (y * W + x) * 4;
      img.data[i] = 255;
      img.data[i + 1] = 236;
      img.data[i + 2] = 210;
      img.data[i + 3] = Math.round(a * 255);
    }
  }
  g.putImageData(img, 0, 0);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.flipY = false;
  return t;
}

/* ---------- shaderi ---------- */
// Volumetrijski snop: otvoreni konus, aditivno, jači uz izvor, mekani rubovi (fresnel).
export function coneMaterial(color: THREE.Color) {
  return new THREE.ShaderMaterial({
    uniforms: { color: { value: color }, intensity: { value: 0 } },
    vertexShader: /* glsl */ `
      varying vec3 vN; varying vec3 vV; varying float vY;
      void main() {
        vec4 wp = modelMatrix * vec4(position, 1.0);
        vN = normalize(mat3(modelMatrix) * normal);
        vV = normalize(cameraPosition - wp.xyz);
        vY = uv.y;
        gl_Position = projectionMatrix * viewMatrix * wp;
      }`,
    fragmentShader: /* glsl */ `
      uniform vec3 color; uniform float intensity;
      varying vec3 vN; varying vec3 vV; varying float vY;
      void main() {
        float f = abs(dot(normalize(vN), normalize(vV)));
        // mekši rubovi snopa (bez tvrde siluete konusa), jači uz izvor, nestaje prije poda
        float edge = pow(f, 3.4);
        float along = pow(vY, 1.9) * smoothstep(0.0, 0.35, vY);
        gl_FragColor = vec4(color * edge * along * intensity, 1.0);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    side: THREE.DoubleSide,
  });
}

// Aditivna ploha s teksturom i jačinom (LED sjaj, scallop na zidu, sjaj kugle).
export function glowMaterial(map: THREE.Texture, color: THREE.Color, opacity: number) {
  return new THREE.MeshBasicMaterial({
    map,
    color,
    transparent: true,
    opacity,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    toneMapped: false,
  });
}

// LED svjetlo koje pada sa šipke na ramena: traka uz luk, okomiti gradijent, rubovi tonu.
export function ledFallMaterial() {
  return new THREE.ShaderMaterial({
    uniforms: { color: { value: new THREE.Color(1.0, 0.985, 0.96) }, intensity: { value: 0 }, span: { value: 2.6 }, top: { value: 0 }, sweep: { value: 99 } },
    vertexShader: /* glsl */ `
      varying vec2 vUv; varying float vX;
      void main() { vUv = uv; vX = position.x; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
    fragmentShader: /* glsl */ `
      uniform vec3 color; uniform float intensity; uniform float span; uniform float top; uniform float sweep;
      varying vec2 vUv; varying float vX;
      void main() {
        // paljenje slijeva nadesno: lijevo od fronte upaljeno
        float lit = smoothstep(sweep + 0.05, sweep - 0.35, vX);
        // svjetlo počinje ispod šipke (ne puni prostor između LED-a i šipke), pa tone prema dolje
        float down = (top > 0.0 ? smoothstep(top * 0.5, top * 1.6, vUv.y) : 1.0) * pow(1.0 - vUv.y, 2.4);
        float across = 1.0 - smoothstep(span * 0.35, span, abs(vX));
        gl_FragColor = vec4(color * down * across * intensity * lit, 1.0);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    side: THREE.DoubleSide,
  });
}

// Sama LED linija (dioda u profilu): precizna bijela crta, bez tone-mappinga (čista bijela,
// ne siva). "sweep" = x fronte paljenja; na fronti kratka jača "glava" (dioda se upravo pali).
export function ledLineMaterial() {
  return new THREE.ShaderMaterial({
    uniforms: { color: { value: new THREE.Color(1.0, 0.99, 0.97) }, intensity: { value: 0 }, sweep: { value: 99 }, head: { value: 0 } },
    vertexShader: /* glsl */ `
      varying float vX;
      void main() { vX = position.x; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
    fragmentShader: /* glsl */ `
      uniform vec3 color; uniform float intensity; uniform float sweep; uniform float head;
      varying float vX;
      void main() {
        float lit = smoothstep(sweep + 0.02, sweep - 0.12, vX);
        float h = exp(-pow((vX - sweep) / 0.16, 2.0)) * head;
        vec3 c = color * intensity * (lit + h * 1.4);
        gl_FragColor = vec4(c, 1.0);
        #include <colorspace_fragment>
      }`,
    toneMapped: false,
  });
}

// Galerijska lokva svjetla na podu: oštar (ali ne tvrd) eliptični rub, ravan plato i
// blago jača sredina — kao precizan reflektor u galeriji, ne mutna mrlja.
export function poolTexture(size = 256): THREE.CanvasTexture {
  const c = document.createElement("canvas");
  c.width = c.height = size;
  const g = c.getContext("2d")!;
  const img = g.createImageData(size, size);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const dx = (x + 0.5) / size * 2 - 1;
      const dy = (y + 0.5) / size * 2 - 1;
      const r = Math.sqrt(dx * dx + dy * dy);
      const edge = 1 - Math.min(1, Math.max(0, (r - 0.8) / 0.18));
      const e = edge * edge * (3 - 2 * edge);
      const a = e * (0.62 + 0.38 * Math.max(0, 1 - r * r));
      const i = (y * size + x) * 4;
      img.data[i] = img.data[i + 1] = img.data[i + 2] = 255;
      img.data[i + 3] = Math.round(a * 255);
    }
  }
  g.putImageData(img, 0, 0);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.flipY = false;
  return t;
}

// Svjetlo s linije uz dno zida koje se razlije po poliranom podu (od zida prema kameri tone,
// prema krajevima zida nestaje). Redak 0 = uz zid.
export function floorSpillTexture(w = 256, h = 64): THREE.CanvasTexture {
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  const g = c.getContext("2d")!;
  const img = g.createImageData(w, h);
  for (let y = 0; y < h; y++) {
    const v = y / (h - 1);
    const along = Math.exp(-v * 4.0) * 0.7 + Math.exp(-v * 1.3) * 0.3;
    for (let x = 0; x < w; x++) {
      const u = Math.abs((x + 0.5) / w * 2 - 1);
      const ends = 1 - Math.min(1, Math.max(0, (u - 0.45) / 0.55));
      const a = along * ends * ends * (3 - 2 * ends);
      const i = (y * w + x) * 4;
      img.data[i] = img.data[i + 1] = img.data[i + 2] = 255;
      img.data[i + 3] = Math.round(a * 255);
    }
  }
  g.putImageData(img, 0, 0);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.flipY = false;
  return t;
}

// Odraz poda: tekstura zrcalne kamere (niska rezolucija, mipmape) → zamućena s 9 uzoraka
// i biasom mipa, okomito izdužena (lakirani pod), slabi prema kameri i prema dubini.
export const FLOOR_REFLECT_SHADER = {
  name: "NdFloorReflect",
  uniforms: {
    color: { value: null as THREE.Color | null },
    tDiffuse: { value: null as THREE.Texture | null },
    textureMatrix: { value: null as THREE.Matrix4 | null },
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
    uniform vec3 color; uniform sampler2D tDiffuse; uniform float strength; uniform float camZ;
    varying vec4 vUv; varying vec3 vW;
    vec3 tap(vec2 uv) { return texture2D(tDiffuse, uv, 2.2).rgb; }
    void main() {
      vec2 uv = vUv.xy / vUv.w;
      // disk od 12 uzoraka (okomito izduženo, kao lakirani pod) + mip bias → meko zamućenje
      vec2 rad = vec2(0.006, 0.014);
      vec3 c = tap(uv) * 0.16;
      float wsum = 0.16;
      for (int i = 0; i < 12; i++) {
        float a = float(i) * 2.39996;
        float r = sqrt((float(i) + 0.5) / 12.0);
        vec2 o = vec2(cos(a), sin(a)) * r * rad;
        float w = 1.0 - r * 0.6;
        c += tap(uv + o) * w;
        wsum += w;
      }
      c /= wsum;
      // blizu kamere pod gleda "odozgo" (slab odraz), prema dubini jači (Fresnel), pa nestaje u magli
      float near = 1.0 - 0.85 * smoothstep(camZ - 4.4, camZ - 3.0, vW.z);
      float far = 1.0 - smoothstep(-2.2, -3.6, vW.z);
      float fres = mix(1.0, 0.6, smoothstep(-1.0, camZ - 2.0, vW.z));
      gl_FragColor = vec4(c * color * strength * near * far * fres, 1.0);
      #include <tonemapping_fragment>
      #include <colorspace_fragment>
    }`,
};

/* ---------- učitavanje slika → tekstura ---------- */
// fetch + createImageBitmap (dekodiranje izvan glavne niti) → tekstura s flipY=false
// (geometrija ima okrenut v). Rezervno: <img>.
export async function loadTexture(src: string, renderer: THREE.WebGLRenderer, signal?: AbortSignal, maxSize = 0): Promise<THREE.Texture> {
  let image: ImageBitmap | HTMLImageElement;
  try {
    const res = await fetch(src, { signal });
    if (!res.ok) throw new Error(String(res.status));
    const blob = await res.blob();
    try {
      image = await createImageBitmap(blob, { premultiplyAlpha: "none", colorSpaceConversion: "none" });
    } catch {
      image = await createImageBitmap(blob);
    }
  } catch (err) {
    if (signal?.aborted) throw err;
    image = await new Promise<HTMLImageElement>((resolve, reject) => {
      const im = new Image();
      im.decoding = "async";
      im.onload = () => resolve(im);
      im.onerror = reject;
      im.src = src;
    });
  }
  // HD slike (lopte/kape 700 px) na ekranu su male → smanji jednom (manje GPU memorije, oštre mipmape)
  if (maxSize > 0 && Math.max(image.width, image.height) > maxSize) {
    const k = maxSize / Math.max(image.width, image.height);
    const c = document.createElement("canvas");
    c.width = Math.max(1, Math.round(image.width * k));
    c.height = Math.max(1, Math.round(image.height * k));
    const g = c.getContext("2d")!;
    g.imageSmoothingEnabled = true;
    g.imageSmoothingQuality = "high";
    g.drawImage(image, 0, 0, c.width, c.height);
    if ("close" in image && typeof image.close === "function") image.close();
    image = c as unknown as HTMLImageElement;
  }
  const tex = new THREE.Texture(image as unknown as HTMLImageElement);
  tex.flipY = false;
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.generateMipmaps = true;
  tex.minFilter = THREE.LinearMipmapLinearFilter;
  tex.magFilter = THREE.LinearFilter;
  tex.anisotropy = Math.min(4, renderer.capabilities.getMaxAnisotropy());
  tex.needsUpdate = true;
  return tex;
}

export const imageSize = (t: THREE.Texture) => {
  const im = t.image as { width: number; height: number } | undefined;
  return im ? { w: im.width, h: im.height } : { w: 1, h: 1 };
};

// Ravnina s blagim zakrivljenjem (tkanina / kapa ima volumen) i okrenutim v (flipY=false).
export function bentPlane(w: number, h: number, sag: number, segX = 10): THREE.BufferGeometry {
  const g = new THREE.PlaneGeometry(w, h, segX, 1);
  const pos = g.attributes.position as THREE.BufferAttribute;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i) / (w / 2);
    pos.setZ(i, -sag * x * x);
  }
  const uv = g.attributes.uv as THREE.BufferAttribute;
  for (let i = 0; i < uv.count; i++) uv.setY(i, 1 - uv.getY(i));
  g.computeVertexNormals();
  return g;
}

// Kromirana cijev duž točaka (CatmullRom).
export function tubeAlong(points: THREE.Vector3[], radius: number, segs = 48, radial = 12, closed = false) {
  return new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points, closed, "centripetal"), segs, radius, radial, closed);
}

// Mapiranje fotografije lopte na sferu: ortografska projekcija (slika JE lopta gledana
// sprijeda — HD izrez, okvir = rub lopte) na prednju polusferu, a ista slika (neprezrcaljena)
// na stražnju. Šav na "ekvatoru" je rub fotografije → izgleda kao šav lopte. Fotografija već
// ima studijsko sjenčanje ruba → rub se malo posvijetli da ne bude dvostruko taman.
export function ballMaterial(map: THREE.Texture, env: THREE.Texture) {
  const m = new THREE.MeshPhysicalMaterial({
    map,
    roughness: 0.46,
    metalness: 0,
    clearcoat: 0.55,
    clearcoatRoughness: 0.18,
    envMap: env,
    envMapIntensity: 0.8,
  });
  m.onBeforeCompile = (sh) => {
    sh.vertexShader = sh.vertexShader
      .replace("#include <common>", "#include <common>\nvarying vec3 vObjP;")
      .replace("#include <begin_vertex>", "#include <begin_vertex>\nvObjP = position;");
    sh.fragmentShader = sh.fragmentShader
      .replace("#include <common>", "#include <common>\nvarying vec3 vObjP;")
      .replace(
        "#include <map_fragment>",
        /* glsl */ `
        #ifdef USE_MAP
          vec3 bn = normalize(vObjP);
          float side = bn.z >= 0.0 ? 1.0 : -1.0;
          vec2 buv = vec2(0.5 + bn.x * 0.49 * side, 0.5 - bn.y * 0.49);
          vec4 sampledDiffuseColor = texture2D(map, buv);
          float rim = smoothstep(0.55, 0.98, length(bn.xy));
          sampledDiffuseColor.rgb *= 1.0 + rim * 0.35;
          diffuseColor.rgb *= sampledDiffuseColor.rgb;
        #endif`
      );
  };
  return m;
}

// Materijal odjeće: fotografija s alfom, NEOSVIJETLJENA i bez tone-mappinga/magle → boje
// na ekranu = boje fotografije (sRGB tekstura → linearno → sRGB izlaz, identitet). Fotografija
// već nosi studijsko sjenčanje tkanine, pa scena (topli reflektori, LED, magla) ne smije
// prati ni tonirati dres. Jedino sjenčanje: vrlo blago neutralno potamnjenje vanjskih rubova
// (zakrivljenje ploha), množenjem — nikad dodavanjem.
// "Fokus" = mip bias (meko zamućenje susjeda bez post-processinga) + neutralno prigušenje
// (color = skalar). Piše stencil 1 → aditivni snopovi/LED sjaj (maskFabric) ne idu preko tkanine.
export const FABRIC_STENCIL = 1;
export function clothMaterial(map: THREE.Texture) {
  const m = new THREE.MeshBasicMaterial({
    map,
    transparent: true,
    alphaTest: 0.04,
    side: THREE.DoubleSide,
    toneMapped: false,
    fog: false,
    stencilWrite: true,
    stencilRef: FABRIC_STENCIL,
    stencilFunc: THREE.AlwaysStencilFunc,
    stencilZPass: THREE.ReplaceStencilOp,
  });
  const uBias = { value: 0 };
  m.userData.uBias = uBias;
  m.onBeforeCompile = (sh) => {
    sh.uniforms.uBias = uBias;
    sh.fragmentShader = sh.fragmentShader
      .replace("#include <common>", "#include <common>\nuniform float uBias;")
      .replace(
        "#include <map_fragment>",
        /* glsl */ `
        #ifdef USE_MAP
          vec4 sampledDiffuseColor = texture2D(map, vMapUv, uBias);
          diffuseColor *= sampledDiffuseColor;
          // blago neutralno zatamnjenje samo uz vanjske rubove (rukavi se "okreću" od svjetla)
          float ex = abs(vMapUv.x * 2.0 - 1.0);
          diffuseColor.rgb *= 1.0 - 0.05 * smoothstep(0.62, 1.0, ex);
        #endif`
      );
  };
  return m;
}

// Aditivni efekt (snop, LED sjaj) se ne crta preko tkanine: stencil test ≠ FABRIC_STENCIL.
// Efekt mora imati renderOrder veći od odjeće (crta se nakon nje).
export function maskFabric(mat: THREE.Material) {
  mat.stencilWrite = true;
  mat.stencilRef = FABRIC_STENCIL;
  mat.stencilFunc = THREE.NotEqualStencilFunc;
  mat.stencilFail = THREE.KeepStencilOp;
  mat.stencilZFail = THREE.KeepStencilOp;
  mat.stencilZPass = THREE.KeepStencilOp;
  mat.stencilWriteMask = 0;
  return mat;
}

/* ---------- odjeća s volumenom (dubinska mapa + tkanina) ---------- */
// Dijeljena gusta mreža 1×1 (v okrenut kao bentPlane). Mreža se skalira na mjere slike
// (mesh.scale = (w, h, 1)); dubina, savijanje i pomaci tkanine idu u shaderu.
const gridCache = new Map<string, THREE.BufferGeometry>();
export function gridPlane(segX: number, segY: number): THREE.BufferGeometry {
  const key = `${segX}x${segY}`;
  let g = gridCache.get(key);
  if (!g) {
    g = new THREE.PlaneGeometry(1, 1, segX, segY);
    const uv = g.attributes.uv as THREE.BufferAttribute;
    for (let i = 0; i < uv.count; i++) uv.setY(i, 1 - uv.getY(i));
    g.userData.shared = true;
    gridCache.set(key, g);
  }
  return g;
}

/** Ravna 1×1 "dubina" (sve 0) za odjeću bez dubinske mape. */
let flatDepth: THREE.DataTexture | null = null;
function flatDepthTexture() {
  if (!flatDepth) {
    flatDepth = new THREE.DataTexture(new Uint8Array([0, 0, 0, 255]), 1, 1);
    flatDepth.needsUpdate = true;
  }
  return flatDepth;
}

export type GarmentUniforms = {
  uBias: { value: number };
  uDepth: { value: THREE.Texture };
  uHasDepth: { value: number };
  uAmp: { value: number };
  uSag: { value: number };
  uSize: { value: THREE.Vector2 };
  uTexel: { value: THREE.Vector2 };
  uCloth: { value: Float32Array };
  uShade: { value: number };
  uVLod: { value: number };
  uDepthTop: { value: number };
  /** 1 = puna zasićenost (zadano); <1 → prema sivoj (prigušeni susjedi, smjer E) */
  uSat: { value: number };
  /** 0 = bez (zadano); >0 → tanki topli rub svjetla uz gornju siluetu (ramena) */
  uRim: { value: number };
  uMapTexel: { value: THREE.Vector2 };
};

// Materijal odjeće s volumenom. Boja = fotografija, NEOSVIJETLJENA, bez tone-mappinga
// (kao clothMaterial) — osvijetljeni dijelovi ostaju točno boje proizvoda. Geometrija:
// mreža pomaknuta dubinskom mapom (prsa, rukavi, ovratnik su pravi volumen → paralaksa,
// DOF i odraz vide oblik) + pomaci simulacije tkanine (cloth.ts). Sjenčanje SAMO
// potamnjuje, nikad ne posvjetljuje: nabori i strane okrenute od mekanog prednjeg svjetla,
// udubine (pazuh, ovratnik, ispod vješalice) i tanki rub uz siluetu (tkanina se savija
// prema natrag → nije kartonski izrez).
export function garmentMaterial(map: THREE.Texture, depth: THREE.Texture | null, cloth: Float32Array, cols: number, rows: number) {
  const m = new THREE.MeshBasicMaterial({
    map,
    transparent: true,
    alphaTest: 0.04,
    side: THREE.DoubleSide,
    toneMapped: false,
    fog: false,
    stencilWrite: true,
    stencilRef: FABRIC_STENCIL,
    stencilFunc: THREE.AlwaysStencilFunc,
    stencilZPass: THREE.ReplaceStencilOp,
  });
  const dw = (depth?.image as { width?: number } | undefined)?.width || 256;
  const dh = (depth?.image as { height?: number } | undefined)?.height || 256;
  const u: GarmentUniforms = {
    uBias: { value: 0 },
    uDepth: { value: depth ?? flatDepthTexture() },
    uHasDepth: { value: depth ? 1 : 0 },
    uAmp: { value: 0.06 },
    uSag: { value: 0.02 },
    uSize: { value: new THREE.Vector2(1, 1) },
    uTexel: { value: new THREE.Vector2(1 / dw, 1 / dh) },
    uCloth: { value: cloth },
    uShade: { value: 1 },
    uVLod: { value: 0 },
    uDepthTop: { value: 0 },
    uSat: { value: 1 },
    uRim: { value: 0 },
    uMapTexel: {
      value: new THREE.Vector2(1 / ((map.image as { width?: number } | undefined)?.width || 640), 1 / ((map.image as { height?: number } | undefined)?.height || 900)),
    },
  };
  m.userData.uBias = u.uBias;
  m.userData.g = u;
  m.onBeforeCompile = (sh) => {
    Object.assign(sh.uniforms, u);
    const decl = /* glsl */ `
      #define CC ${cols}
      #define CR ${rows}
      uniform sampler2D uDepth;
      uniform float uHasDepth;
      uniform float uAmp;
      uniform vec2 uSize;
      uniform float uShade;
      uniform float uDepthTop;
      varying vec2 vClothS;
      varying float vFold;`;
    sh.vertexShader = sh.vertexShader
      .replace("#include <common>", `#include <common>\n${decl}\nuniform float uSag;\nuniform float uVLod;\nuniform vec3 uCloth[CC * CR];`)
      .replace(
        "#include <begin_vertex>",
        /* glsl */ `
        #include <begin_vertex>
        // (hlače: iznad šipke-vješalice nema tkanine → bez ostataka vješalice u dubini)
        float gd = uHasDepth > 0.5 ? textureLod(uDepth, uv, uVLod).r * smoothstep(uDepthTop, uDepthTop + 0.03, uv.y) : 0.0;
        vec2 gp = uv * vec2(float(CC - 1), float(CR - 1));
        vec2 gfl = min(floor(gp), vec2(float(CC - 2), float(CR - 2)));
        vec2 gf = gp - gfl;
        int i00 = int(gfl.y) * CC + int(gfl.x);
        vec3 o00 = uCloth[i00];
        vec3 o10 = uCloth[i00 + 1];
        vec3 o01 = uCloth[i00 + CC];
        vec3 o11 = uCloth[i00 + CC + 1];
        vec3 goff = mix(mix(o00, o10, gf.x), mix(o01, o11, gf.x), gf.y);
        float gxn = position.x * 2.0;
        transformed.z += gd * uAmp - uSag * gxn * gxn + goff.z;
        transformed.xy += goff.xy / uSize;
        float gcw = uSize.x / float(CC - 1);
        float gch = uSize.y / float(CR - 1);
        // nagib tkanine (m/m) za sjenčanje; y mjeren prema dolje (kao v)
        vClothS = vec2(mix(o10.z - o00.z, o11.z - o01.z, gf.y) / gcw, mix(o01.z - o00.z, o11.z - o10.z, gf.x) / gch);
        // vodoravno sabijanje → okomiti nabor
        vFold = clamp(-mix(o10.x - o00.x, o11.x - o01.x, gf.y) / gcw * 3.0, 0.0, 1.0);`
      );
    sh.fragmentShader = sh.fragmentShader
      .replace("#include <common>", `#include <common>\n${decl}\nuniform float uBias;\nuniform vec2 uTexel;\nuniform float uSat;\nuniform float uRim;\nuniform vec2 uMapTexel;`)
      .replace(
        "#include <map_fragment>",
        /* glsl */ `
        #ifdef USE_MAP
          vec4 sampledDiffuseColor = texture2D(map, vMapUv, uBias);
          diffuseColor *= sampledDiffuseColor;
          float gk = 1.0;
          if (uHasDepth > 0.5) {
            vec2 e = uTexel * 1.5;
            float dTop = smoothstep(uDepthTop, uDepthTop + 0.03, vMapUv.y);
            float dC = texture2D(uDepth, vMapUv).r * dTop;
            float dL = texture2D(uDepth, vMapUv - vec2(e.x, 0.0)).r;
            float dR = texture2D(uDepth, vMapUv + vec2(e.x, 0.0)).r;
            float dU = texture2D(uDepth, vMapUv - vec2(0.0, e.y)).r;
            float dD = texture2D(uDepth, vMapUv + vec2(0.0, e.y)).r;
            float sx = (dR - dL) * uAmp / (2.0 * e.x * uSize.x) + vClothS.x;
            float sy = (dD - dU) * uAmp / (2.0 * e.y * uSize.y) + vClothS.y;
            vec3 n = normalize(vec3(-sx, sy, 1.0));
            // meko prednje svjetlo odozgo-lijevo; samo potamnjenje (ravna ploha = 1)
            vec3 L = normalize(vec3(-0.38, 0.62, 0.78));
            float r = dot(n, L) / L.z;
            float away = clamp(1.0 - r, 0.0, 1.0);
            // udubine: dubina ispod svoje okoline (pazuh, ovratnik, ispod vješalice)
            float dB = textureLod(uDepth, vMapUv, 3.0).r;
            float cav = clamp((dB - dC) * 3.0, 0.0, 1.0);
            // rub uz siluetu: tkanina se savija prema natrag
            float rim = 1.0 - smoothstep(0.015, 0.2, dC);
            gk = (1.0 - 0.7 * away) * (1.0 - 0.42 * cav) * (1.0 - 0.3 * rim) * (1.0 - 0.16 * vFold);
            gk = mix(1.0, gk, dTop);
          } else {
            float ex = abs(vMapUv.x * 2.0 - 1.0);
            gk = 1.0 - 0.05 * smoothstep(0.62, 1.0, ex);
          }
          diffuseColor.rgb *= mix(1.0, gk, uShade);
          if (uRim > 0.0) {
            // svjetlo odozgo: rub gdje iznad piksela više nema tkanine (ramena, rukavi)
            float aUp = texture2D(map, vMapUv - vec2(0.0, uMapTexel.y * 7.0), 1.0).a;
            float aSide = min(texture2D(map, vMapUv - vec2(uMapTexel.x * 6.0, 0.0), 1.0).a, texture2D(map, vMapUv + vec2(uMapTexel.x * 6.0, 0.0), 1.0).a);
            float rim = clamp(sampledDiffuseColor.a - aUp, 0.0, 1.0) + 0.45 * clamp(sampledDiffuseColor.a - aSide, 0.0, 1.0) * (1.0 - smoothstep(0.25, 0.6, vMapUv.y));
            rim *= smoothstep(0.08, 0.2, vMapUv.y) * (1.0 - smoothstep(0.42, 0.62, vMapUv.y));
            diffuseColor.rgb += vec3(1.0, 0.95, 0.86) * rim * uRim * (0.35 + 0.65 * (1.0 - dot(diffuseColor.rgb, vec3(0.3333))));
          }
          if (uSat < 1.0) diffuseColor.rgb = mix(vec3(dot(diffuseColor.rgb, vec3(0.2126, 0.7152, 0.0722))), diffuseColor.rgb, uSat);
        #endif`
      );
  };
  return m;
}
