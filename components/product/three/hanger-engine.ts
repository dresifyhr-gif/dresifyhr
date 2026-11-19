import * as THREE from "three";

import { SH, SW, type Lay, type Piece } from "../hanger-layout";
import { hangerImage } from "../hanger-preload";

/* ------------------------------------------------------------------ */
/*  3D pozornica "na vješalici" (stranica proizvoda).                   */
/*  Jedinice: 1 = 1000 jedinica pozornice (1000 × 1250), y gore, z prema */
/*  kameri. Kamera je postavljena tako da je ravnina z = 0 piksel-u-     */
/*  piksel ista kao 2D pozornica (isti raspored iz hanger-layout.ts).    */
/*  Odjeća: neosvijetljeni materijal (boje = fotografija), sRGB.         */
/*  Fizika: kut okreta (opruga), njihalo bočno/naprijed, zaostajanje     */
/*  tkanine (uvijanje prema dnu), klizanje po šipki, spuštanje hlačica. */
/* ------------------------------------------------------------------ */

const D = 3; // udaljenost kamere od ravnine šipke
const FOV = (2 * Math.atan(SH / 1000 / 2 / D) * 180) / Math.PI;
const X = (x: number) => (x - SW / 2) / 1000;
const Y = (y: number) => (SH - y) / 1000;
const WALL_Z = -0.42;

export type EngineCallbacks = { onSide: (s: 0 | 1) => void; onFirstFrame: () => void; onFail: () => void };

/* ---------- pomoćno: tekstura / okruženje ---------- */

function canvasTex(w: number, h: number, draw: (g: CanvasRenderingContext2D) => void) {
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  draw(c.getContext("2d")!);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

function radialTex(stops: [number, string][], size = 128) {
  return canvasTex(size, size, (g) => {
    const gr = g.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
    for (const [o, c] of stops) gr.addColorStop(o, c);
    g.fillStyle = gr;
    g.fillRect(0, 0, size, size);
  });
}

function linearTex(stops: [number, string][], h = 128) {
  return canvasTex(4, h, (g) => {
    const gr = g.createLinearGradient(0, 0, 0, h);
    for (const [o, c] of stops) gr.addColorStop(o, c);
    g.fillStyle = gr;
    g.fillRect(0, 0, 4, h);
  });
}

// Tamni studio za krom: stropna traka (oštar bijeli odsjaj duž cijevi), meki bočni paneli.
function makeEnv(renderer: THREE.WebGLRenderer) {
  const scene = new THREE.Scene();
  const room = new THREE.Mesh(new THREE.BoxGeometry(14, 7, 14), new THREE.MeshBasicMaterial({ color: new THREE.Color(0.01, 0.01, 0.012), side: THREE.BackSide }));
  room.position.y = 2.5;
  scene.add(room);
  const panel = (w: number, h: number, k: number, pos: [number, number, number], rot: [number, number, number], warm = false) => {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ color: new THREE.Color(k, k * (warm ? 0.9 : 1), k * (warm ? 0.78 : 1.02)), side: THREE.DoubleSide }));
    m.position.set(...pos);
    m.rotation.set(...rot);
    scene.add(m);
  };
  panel(10, 0.3, 16, [0, 5.9, 0.8], [Math.PI / 2, 0, 0]); // oštra stropna traka → bijela linija na vrhu cijevi
  panel(12, 5, 1.1, [0, 6.2, -1], [Math.PI / 2, 0, 0]); // meki strop
  panel(1.6, 4, 2.4, [-6.9, 2.6, 1], [0, Math.PI / 2, 0]);
  panel(1.4, 4, 1.5, [6.9, 2.6, -0.4], [0, -Math.PI / 2, 0], true);
  panel(12, 3.2, 0.9, [0, 1.0, 6.9], [0, Math.PI, 0]); // studio iza kamere → srebrno tijelo cijevi
  panel(8, 0.25, 3, [0, 1.4, 6.8], [0, Math.PI, 0]);
  panel(10, 0.16, 1.4, [0, 0.15, -3], [0, 0, 0], true);
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

/* ---------- mekani sjaj (analitički, bez teksture → bez rubova i trakica) ---------- */

function glowMat(color: THREE.Color, intensity: number, power = 2) {
  return new THREE.ShaderMaterial({
    uniforms: { color: { value: color }, intensity: { value: intensity }, power: { value: power } },
    vertexShader: /* glsl */ `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
    fragmentShader: /* glsl */ `
      uniform vec3 color; uniform float intensity; uniform float power; varying vec2 vUv;
      void main() {
        float d = length((vUv - 0.5) * 2.0);
        float a = pow(max(0.0, 1.0 - d), power);
        float n = fract(sin(dot(gl_FragCoord.xy, vec2(12.9898, 78.233))) * 43758.5453) - 0.5;
        gl_FragColor = vec4(color * (a * intensity + n / 255.0 * step(0.001, a)), 1.0);
        #include <colorspace_fragment>
      }`,
    transparent: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    toneMapped: false,
  });
}

/* ---------- materijal odjeće (neosvijetljen, točne boje) ---------- */

const GARMENT_VS = /* glsl */ `
  uniform float uTwist; uniform float uLagX; uniform float uLen;
  varying vec2 vUv; varying float vWY;
  void main() {
    vUv = uv;
    vec3 p = position;
    // tkanina zaostaje za vješalicom: uvijanje i bočni pomak rastu prema dnu
    float d = clamp(-p.y / uLen, 0.0, 1.2);
    float tw = uTwist * pow(d, 1.35);
    float c = cos(tw), s = sin(tw);
    p.xz = vec2(c * p.x + s * p.z, -s * p.x + c * p.z);
    p.x += uLagX * d * d;
    vec4 wp = modelMatrix * vec4(p, 1.0);
    vWY = wp.y;
    gl_Position = projectionMatrix * viewMatrix * wp;
  }`;

const GARMENT_FS = /* glsl */ `
  uniform sampler2D map; uniform float uDim; uniform float uOpacity;
  uniform float uReflect; uniform float uFloor; uniform float uBias;
  varying vec2 vUv; varying float vWY;
  void main() {
    vec4 c = texture2D(map, vUv, uBias);
    float a = c.a * uOpacity;
    if (uReflect > 0.0) {
      float depth = uFloor - vWY; // koliko je zrcalna točka ispod poda
      if (depth < 0.0) discard;
      a *= uReflect * (1.0 - smoothstep(0.0, 0.32, depth));
    }
    if (a < 0.004) discard;
    gl_FragColor = vec4(c.rgb * uDim, a);
    #include <colorspace_fragment>
  }`;

function garmentMaterial(map: THREE.Texture, len: number, reflect: number, floorY: number) {
  return new THREE.ShaderMaterial({
    uniforms: {
      map: { value: map },
      uTwist: { value: 0 },
      uLagX: { value: 0 },
      uLen: { value: len },
      uDim: { value: 1 },
      uOpacity: { value: 1 },
      uReflect: { value: reflect },
      uFloor: { value: floorY },
      uBias: { value: reflect > 0 ? 2.2 : 0 },
    },
    vertexShader: GARMENT_VS,
    fragmentShader: GARMENT_FS,
    transparent: true,
    depthWrite: reflect === 0,
    depthTest: reflect === 0,
    side: THREE.FrontSide,
    toneMapped: false,
  });
}

// Ploha s blagim volumenom: prsa/trbuh izbočeni prema kameri, rubovi i vješalica ravni.
// Ishodište = unutarnji vrh kuke. top = y vrha slike (lokalno), w/h širina/visina, hx = udio širine kuke.
function garmentGeometry(w: number, h: number, top: number, hx: number, bulge: number, flatTop: number) {
  const g = new THREE.PlaneGeometry(w, h, 18, 28);
  g.translate(w * (0.5 - hx), top - h / 2, 0);
  const pos = g.attributes.position as THREE.BufferAttribute;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const y = pos.getY(i);
    const u = (x - w * (0.5 - hx)) / (w / 2); // -1..1
    const v = (top - y) / h; // 0 vrh → 1 dno
    const across = Math.pow(Math.max(0, 1 - u * u), 0.75);
    const down = THREE.MathUtils.smoothstep(v, flatTop, flatTop + 0.16) * (1 - 0.45 * THREE.MathUtils.smoothstep(v, 0.55, 1));
    pos.setZ(i, bulge * across * down);
  }
  g.computeVertexNormals();
  return g;
}

/* ---------- opruga ---------- */

type Spring = { x: number; v: number; t: number; k: number; z: number };
const spring = (x: number, k: number, z: number): Spring => ({ x, v: 0, t: x, k, z });
function stepSpring(s: Spring, dt: number, extra = 0) {
  const c = 2 * s.z * Math.sqrt(s.k);
  const a = -s.k * (s.x - s.t) - c * s.v + extra;
  s.v += a * dt;
  s.x += s.v * dt;
  return a;
}

/* ---------- vješalica ---------- */

type Rig = {
  piece: Piece;
  idx: number;
  pivot: THREE.Group; // točka kuke na šipki (klizanje po x, spuštanje po y)
  swing: THREE.Group; // njihalo (x naprijed/natrag, z bočno)
  yaw: THREE.Group; // okret oko kuke
  mirror: { pivot: THREE.Group; swing: THREE.Group; yaw: THREE.Group };
  meshes: THREE.Mesh[];
  mats: THREE.ShaderMaterial[]; // glavni + zrcalni
  shadow: THREE.Mesh;
  pool: THREE.Mesh;
  len: number;
  w: number;
  // stanje fizike
  yawS: Spring;
  roll: Spring; // bočno njihanje (rotation.z)
  pitch: Spring; // naprijed/natrag (rotation.x)
  xs: Spring; // položaj na šipki
  ys: Spring; // spuštanje (hlačice)
  shown: boolean;
  loaded: boolean;
  hookMesh?: THREE.Mesh;
};

export class HangerEngine {
  private renderer: THREE.WebGLRenderer;
  private scene = new THREE.Scene();
  private camera = new THREE.PerspectiveCamera(FOV, 0.8, 0.05, 30);
  private env: THREE.Texture;
  private chrome: THREE.MeshPhysicalMaterial;
  private chromeDark: THREE.MeshPhysicalMaterial;
  private stat = new THREE.Group(); // šipka, zid, pod (ovisno o rasporedu)
  private mirrorRoot = new THREE.Group();
  private rigs: Rig[] = [];
  private tex = new Map<string, THREE.Texture>();
  private own: { dispose: () => void }[] = [];
  private buildOwn: { dispose: () => void }[] = [];
  private shadowTex: THREE.Texture;
  private washMat: THREE.ShaderMaterial;
  private lay: Lay;
  private pieces: Piece[];
  private flipIdx: number;
  private kid = false;
  private cam = { x: spring(0, 26, 1), y: spring(SH / 2000, 26, 1), z: spring(D, 26, 1) };
  private raf = 0;
  private running = false;
  private visible = true;
  private disposed = false;
  private first = false;
  private last = 0;
  private time = 0;
  private side: 0 | 1 = 0;
  private cb: EngineCallbacks;
  private dragging: { r0: number; idx: number } | null = null;
  private loadAbort = false;

  constructor(canvas: HTMLCanvasElement, pieces: Piece[], lay: Lay, flipIdx: number, side: 0 | 1, kid: boolean, cb: EngineCallbacks) {
    this.cb = cb;
    this.pieces = pieces;
    this.lay = lay;
    this.flipIdx = flipIdx;
    this.side = side;
    this.kid = kid;
    const r = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false, powerPreference: "high-performance", stencil: false });
    r.outputColorSpace = THREE.SRGBColorSpace;
    r.toneMapping = THREE.NeutralToneMapping;
    r.setClearColor(new THREE.Color("#0b0b0b"), 1);
    this.renderer = r;
    canvas.addEventListener("webglcontextlost", this.onLost, false);

    this.env = makeEnv(r);
    this.chrome = new THREE.MeshPhysicalMaterial({ color: 0xffffff, metalness: 1, roughness: 0.08, envMap: this.env, envMapIntensity: 1.25, clearcoat: 1, clearcoatRoughness: 0.04 });
    this.chromeDark = new THREE.MeshPhysicalMaterial({ color: 0x2a2b2f, metalness: 0.9, roughness: 0.32, envMap: this.env, envMapIntensity: 0.7 });
    this.shadowTex = radialTex([
      [0, "rgba(0,0,0,0.95)"],
      [0.42, "rgba(0,0,0,0.5)"],
      [1, "rgba(0,0,0,0)"],
    ]);
    this.washMat = glowMat(new THREE.Color(0, 0, 0), 1, 1.6);
    this.own.push(this.shadowTex, this.washMat, this.chrome, this.chromeDark, this.env);

    this.mirrorRoot.scale.y = -1;
    this.scene.add(this.stat, this.mirrorRoot);
    this.build();
    this.placeCamera(true);
    void this.loadAll();
  }

  /* ---------- gradnja ---------- */

  private clearGroup(g: THREE.Object3D) {
    g.traverse((o) => {
      const m = o as THREE.Mesh;
      if (m.isMesh) {
        m.geometry.dispose();
        const mat = m.material as THREE.Material;
        if (mat !== this.chrome && mat !== this.chromeDark && mat !== this.washMat) mat.dispose();
      }
    });
    g.clear();
  }

  private build() {
    const L = this.lay;
    this.clearGroup(this.stat);
    for (const rg of this.rigs) {
      this.scene.remove(rg.pivot);
      this.clearGroup(rg.pivot);
    }
    this.clearGroup(this.mirrorRoot);
    const old = this.rigs;
    this.rigs = [];
    for (const o of this.buildOwn) o.dispose();
    this.buildOwn = [];

    const floorY = Y(L.floorY);
    this.mirrorRoot.position.y = 2 * floorY;
    const basic = (opts: THREE.MeshBasicMaterialParameters) => new THREE.MeshBasicMaterial({ toneMapped: false, depthWrite: false, transparent: true, ...opts });

    // zid (okomiti gradijent kao 2D pozadina) i pod
    const wallTex = linearTex([
      [0, "#131313"],
      [0.6, "#0e0e0e"],
      [1, "#0c0c0c"],
    ]);
    const wall = new THREE.Mesh(new THREE.PlaneGeometry(8, 4.5), new THREE.MeshBasicMaterial({ map: wallTex, toneMapped: false }));
    wall.position.set(0, floorY + 2.25, WALL_Z);
    wall.renderOrder = 0;
    this.stat.add(wall);
    this.buildOwn.push(wallTex);

    const floorTex = linearTex([
      [0, "#0d0d0d"],
      [1, "#090909"],
    ]);
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(8, 5), new THREE.MeshBasicMaterial({ map: floorTex, toneMapped: false }));
    floor.rotation.x = -Math.PI / 2;
    floor.position.set(0, floorY, WALL_Z + 2.5);
    floor.renderOrder = 0;
    this.stat.add(floor);
    this.buildOwn.push(floorTex);

    // spoj zida i poda: mekani mrak (bez tvrdog ruba)
    const aoTex = linearTex([
      [0, "rgba(0,0,0,0)"],
      [1, "rgba(0,0,0,0.75)"],
    ]);
    this.buildOwn.push(aoTex);
    const ao = new THREE.Mesh(new THREE.PlaneGeometry(8, 0.12), basic({ map: aoTex }));
    ao.position.set(0, floorY + 0.06, WALL_Z + 0.001);
    ao.renderOrder = 1;
    this.stat.add(ao);

    // vrlo slaba boja kluba na zidu iza dresa
    const main = L.pieces[this.flipIdx >= 0 ? this.flipIdx : 0];
    const wash = new THREE.Mesh(new THREE.PlaneGeometry(1.5, 1.5), this.washMat);
    wash.position.set(X(main.hx), Y((L.rodTop + L.floorY) / 2), WALL_Z + 0.002);
    wash.scale.set(1.15, 1.25, 1);
    wash.renderOrder = 1;
    this.stat.add(wash);

    // reflektor: toplo svjetlo na zidu iznad šipke + konus + lokva svjetla na podu
    const scallop = new THREE.Mesh(
      new THREE.PlaneGeometry(1, 1),
      glowMat(new THREE.Color(1, 0.93, 0.82), 0.016, 1.4),
    );
    // kao 2D: topli sjaj iza odjeće (središte malo iznad sredine)
    const mf = main.faces[0];
    scallop.position.set(X(main.hx), Y(mf.t + mf.h * 0.42), WALL_Z + 0.003);
    scallop.scale.set((mf.w / 1000) * 2.1, (mf.h / 1000) * 1.6, 1);
    scallop.renderOrder = 1;
    this.stat.add(scallop);

    // rubovi: tamno gore (nosači izranjaju iz mraka)
    const topTex = linearTex([
      [0, "rgba(11,11,11,1)"],
      [1, "rgba(11,11,11,0)"],
    ]);
    this.buildOwn.push(topTex);
    const topH = Math.min(L.rodTop * 0.8, 150) / 1000;
    const top = new THREE.Mesh(new THREE.PlaneGeometry(6, topH), basic({ map: topTex }));
    top.position.set(0, Y(0) - topH / 2, 0.12);
    const topFill = new THREE.Mesh(new THREE.PlaneGeometry(6, 2), basic({ color: 0x0b0b0b, opacity: 1 }));
    topFill.position.set(0, Y(0) + 1, 0.12);
    top.renderOrder = topFill.renderOrder = 20;
    this.stat.add(top, topFill);

    // šipka
    const r = L.rodD / 2 / 1000;
    const len = (L.x1 - L.x0) / 1000;
    const cy = Y(L.rodTop + L.rodD / 2);
    const rod = new THREE.Mesh(new THREE.CylinderGeometry(r, r, len - r * 0.6, 40, 1, true), this.chrome);
    rod.rotation.z = Math.PI / 2;
    rod.position.set(X((L.x0 + L.x1) / 2), cy, 0);
    this.stat.add(rod);
    for (const sx of [-1, 1]) {
      const cap = new THREE.Mesh(new THREE.SphereGeometry(r, 24, 12), this.chrome);
      cap.scale.set(0.35, 1, 1);
      cap.position.set(X(sx < 0 ? L.x0 : L.x1) - sx * r * 0.3, cy, 0);
      this.stat.add(cap);
    }
    // stropni nosači i obujmice
    const rr = r * 0.32;
    for (const dx of [L.x0 + L.rodD * 2.2, L.x1 - L.rodD * 2.2]) {
      const h = 2.2;
      const drop = new THREE.Mesh(new THREE.CylinderGeometry(rr, rr, h, 20, 1, true), this.chrome);
      drop.position.set(X(dx), cy + h / 2, 0);
      this.stat.add(drop);
      const clamp = new THREE.Mesh(new THREE.CylinderGeometry(r * 1.32, r * 1.32, r * 1.3, 28), this.chromeDark);
      clamp.rotation.z = Math.PI / 2;
      clamp.position.set(X(dx), cy, 0);
      this.stat.add(clamp);
      const collar = new THREE.Mesh(new THREE.CylinderGeometry(rr * 1.6, rr * 1.6, r * 0.9, 20), this.chrome);
      collar.position.set(X(dx), cy + r * 1.25, 0);
      this.stat.add(collar);
    }
    // meka sjena šipke na zidu (svjetlo odozgo-sprijeda): rastegnuta radijalna mrlja → mekani krajevi
    const rs = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), basic({ map: this.shadowTex, opacity: 0.32 }));
    rs.position.set(X((L.x0 + L.x1) / 2), cy - r * 5, WALL_Z + 0.004);
    rs.scale.set(len * 1.05, r * 9, 1);
    rs.renderOrder = 1;
    this.stat.add(rs);

    // vješalice
    const zoff = r + 0.0035;
    this.pieces.forEach((p, i) => {
      const pb = L.pieces[i];
      const prev = old.find((o) => o.piece.key === p.key);
      const pivot = new THREE.Group();
      const swing = new THREE.Group();
      const yaw = new THREE.Group();
      pivot.add(swing);
      swing.add(yaw);
      const mp = new THREE.Group();
      const ms = new THREE.Group();
      const my = new THREE.Group();
      mp.add(ms);
      ms.add(my);
      this.mirrorRoot.add(mp);
      this.scene.add(pivot);
      pivot.position.set(X(pb.hx), Y(L.rodTop), zoff);

      const hW = pb.h / 1000;
      const rig: Rig = {
        piece: p,
        idx: i,
        pivot,
        swing,
        yaw,
        mirror: { pivot: mp, swing: ms, yaw: my },
        meshes: [],
        mats: [],
        shadow: new THREE.Mesh(new THREE.PlaneGeometry(1, 1), basic({ map: this.shadowTex, opacity: 0.75 })),
        pool: new THREE.Mesh(new THREE.PlaneGeometry(1, 1), glowMat(new THREE.Color(1, 0.94, 0.86), 0.02, 1.5)),
        len: hW,
        w: pb.faces[0].w / 1000,
        yawS: prev?.yawS ?? spring(i === this.flipIdx ? this.side * Math.PI : 0, 38, 0.42),
        roll: prev?.roll ?? spring(0, 0, 0.12),
        pitch: prev?.pitch ?? spring(0, 0, 0.14),
        xs: prev?.xs ?? spring(X(this.kid ? pb.kx : pb.hx), 26, 0.72),
        ys: prev?.ys ?? spring(p.kidOnly && !this.kid ? 1.1 : 0, 34, 0.62),
        shown: prev?.shown ?? (!p.kidOnly || this.kid),
        loaded: false,
      };
      // njihalo: ω0 = √(g/L), L ≈ pola visine odjeće (u metrima ~ jedinice × 1.1)
      const w0 = Math.sqrt(9.81 / Math.max(0.2, hW * 0.55 * 1.1));
      rig.roll.k = w0 * w0;
      rig.pitch.k = w0 * w0;
      rig.xs.t = X(this.kid ? pb.kx : pb.hx);
      rig.ys.t = p.kidOnly && !this.kid ? 1.1 : 0;

      rig.shadow.rotation.x = -Math.PI / 2;
      rig.pool.rotation.x = -Math.PI / 2;
      rig.shadow.position.y = floorY + 0.0015;
      rig.pool.position.y = floorY + 0.001;
      rig.shadow.renderOrder = 4;
      rig.pool.renderOrder = 3;
      this.stat.add(rig.shadow, rig.pool);

      // lica (prednja + leđa natrag-na-natrag → stvaran volumen pri okretu)
      p.faces.forEach((f, j) => {
        const fb = pb.faces[j];
        const w = fb.w / 1000;
        const h = fb.h / 1000;
        const topY = Y(fb.t) - Y(L.rodTop);
        const bulge = (p.bar ? 0.03 : 0.05) * h * (p.kidOnly ? 0.8 : 1);
        const flatTop = p.bar ? 0.06 : 0.19; // vješalica i ramena ostaju ravni
        const geo = garmentGeometry(w, h, topY, f.geo.x, bulge, flatTop);
        const tex = this.tex.get(f.src) ?? null;
        const mat = garmentMaterial(tex ?? new THREE.Texture(), hW, 0, floorY);
        const mmat = garmentMaterial(tex ?? new THREE.Texture(), hW, 0.17, floorY);
        const mesh = new THREE.Mesh(geo, mat);
        const mm = new THREE.Mesh(geo, mmat);
        mesh.renderOrder = 10;
        mm.renderOrder = 2;
        if (j === 1) {
          mesh.rotation.y = Math.PI;
          mm.rotation.y = Math.PI;
        }
        mesh.visible = mm.visible = !!tex;
        mesh.userData.src = f.src;
        mm.userData.src = f.src;
        yaw.add(mesh);
        my.add(mm);
        rig.meshes.push(mesh, mm);
        rig.mats.push(mat, mmat);
      });
      rig.loaded = p.faces.every((f) => this.tex.has(f.src));

      // dočrtana kuka za hlače s prečkom (kroz šipku natrag)
      if (p.bar) {
        const fb = pb.faces[0];
        const yTop = Y(fb.t) - Y(L.rodTop) - (fb.h / 1000) * 0.012;
        const yc = -r;
        const pts: THREE.Vector3[] = [new THREE.Vector3(0, yTop, 0), new THREE.Vector3(0, (yTop + yc) / 2, 0), new THREE.Vector3(0, yc, 0)];
        for (let a = 0.15; a <= Math.PI + 0.01; a += Math.PI / 10) pts.push(new THREE.Vector3(0, yc + zoff * Math.sin(a), -zoff + zoff * Math.cos(a)));
        pts.push(new THREE.Vector3(0, yc - zoff * 0.7, -2 * zoff - 0.002));
        const sw = Math.max(2.6, L.rodD * 0.22) / 1000 / 2;
        const hook = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts, false, "centripetal"), 48, sw, 10, false), this.chrome);
        yaw.add(hook);
        rig.hookMesh = hook;
      }

      this.rigs.push(rig);
    });

    this.updateWash();
  }

  /* ---------- učitavanje ---------- */

  private async loadTex(src: string) {
    const have = this.tex.get(src);
    if (have) return have;
    // ista (već dekodirana) slika koju je pozornica počela skidati pri prvom prikazu
    const img = await hangerImage(src, false);
    const t = new THREE.Texture(img);
    t.needsUpdate = true;
    t.colorSpace = THREE.SRGBColorSpace;
    t.anisotropy = Math.min(8, this.renderer.capabilities.getMaxAnisotropy());
    t.minFilter = THREE.LinearMipmapLinearFilter;
    t.generateMipmaps = true;
    this.tex.set(src, t);
    return t;
  }

  private applyTex() {
    for (const rg of this.rigs) {
      rg.meshes.forEach((m, i) => {
        const t = this.tex.get(m.userData.src as string);
        if (!t) return;
        rg.mats[i].uniforms.map.value = t;
        m.visible = true;
      });
      rg.loaded = rg.piece.faces.every((f) => this.tex.has(f.src));
    }
  }

  /** Shaderi se prevode dok se slike još skidaju (paralelno, bez blokiranja niti gdje
   *  preglednik podržava KHR_parallel_shader_compile). Skrivene plohe (odjeća bez teksture)
   *  privremeno su vidljive da i njihov program uđe u prevođenje — inače bi se prevodio
   *  tek u prvom kadru. */
  private precompile(): Promise<unknown> {
    const hidden: THREE.Object3D[] = [];
    this.scene.traverse((o) => {
      if (!o.visible) {
        hidden.push(o);
        o.visible = true;
      }
    });
    let p: Promise<unknown>;
    try {
      p = this.renderer.compileAsync(this.scene, this.camera);
    } catch {
      p = Promise.resolve();
    }
    for (const o of hidden) o.visible = false;
    return p.catch(() => undefined);
  }

  private async loadAll() {
    try {
      const base = this.pieces.filter((p) => !p.kidOnly).flatMap((p) => p.faces.map((f) => f.src));
      const compiled = this.precompile();
      await Promise.all(base.map((s) => this.loadTex(s)));
      if (this.disposed || this.loadAbort) return;
      this.applyTex();
      // upload + mipmape sada, ne usred prvog kadra
      for (const s of base) {
        const t = this.tex.get(s);
        if (t) this.renderer.initTexture(t);
      }
      this.computeWash(base[0]);
      await compiled;
      if (this.disposed || this.loadAbort) return;
      this.start();
      // dječje hlačice: tek nakon prvog kadra
      const extra = this.pieces.filter((p) => p.kidOnly).flatMap((p) => p.faces.map((f) => f.src));
      for (const s of extra) {
        await this.loadTex(s).catch(() => undefined);
        if (this.disposed) return;
        this.applyTex();
      }
    } catch (e) {
      console.warn("[hanger3d] load failed", e);
      if (!this.disposed) this.cb.onFail();
    }
  }

  private washColor = new THREE.Color(0, 0, 0);
  private computeWash(src: string) {
    const t = this.tex.get(src);
    const img = t?.image as HTMLImageElement | undefined;
    if (!img) return;
    try {
      const c = document.createElement("canvas");
      c.width = 32;
      c.height = 40;
      const g = c.getContext("2d", { willReadFrequently: true })!;
      g.drawImage(img, 0, 0, 32, 40);
      const d = g.getImageData(0, 0, 32, 40).data;
      let r = 0, gg = 0, b = 0, wsum = 0;
      for (let i = 0; i < d.length; i += 4) {
        const a = d[i + 3] / 255;
        if (a < 0.5) continue;
        const mx = Math.max(d[i], d[i + 1], d[i + 2]);
        const mn = Math.min(d[i], d[i + 1], d[i + 2]);
        const sat = mx ? (mx - mn) / mx : 0;
        const w = a * (0.08 + sat * sat) * (mx > 30 ? 1 : 0.2);
        r += d[i] * w;
        gg += d[i + 1] * w;
        b += d[i + 2] * w;
        wsum += w;
      }
      if (!wsum) return;
      const col = new THREE.Color().setRGB(r / wsum / 255, gg / wsum / 255, b / wsum / 255, THREE.SRGBColorSpace);
      const hsl = { h: 0, s: 0, l: 0 };
      col.getHSL(hsl);
      col.setHSL(hsl.h, Math.min(0.75, hsl.s), 0.5);
      this.washColor.copy(col);
      this.updateWash();
    } catch {
      /* CORS / tainted canvas → bez boje */
    }
  }
  private updateWash() {
    // jedva primjetno: ~5 % svjetline na zidu
    (this.washMat.uniforms.color.value as THREE.Color).copy(this.washColor).multiplyScalar(0.0065);
  }

  /* ---------- kamera ---------- */

  private placeCamera(snap = false) {
    const k = this.kid && this.lay.kid ? this.lay.kid : null;
    const cx = 0;
    const cy = SH / 2000;
    let tx = cx, ty = cy, tz = D;
    if (k) {
      const PX = X(k.px);
      const PY = Y(k.py);
      tx = PX + (cx - PX) / k.k;
      ty = PY + (cy - PY) / k.k;
      tz = D / k.k;
    }
    this.cam.x.t = tx;
    this.cam.y.t = ty;
    this.cam.z.t = tz;
    if (snap) {
      this.cam.x.x = tx;
      this.cam.y.x = ty;
      this.cam.z.x = tz;
    }
  }

  /* ---------- javno ---------- */

  setLayout(lay: Lay) {
    if (lay === this.lay) return;
    this.lay = lay;
    // položaji se mijenjaju skokom (promjena prijeloma) — bez animacije klizanja
    for (const rg of this.rigs) {
      const pb = lay.pieces[rg.idx];
      rg.xs.x = rg.xs.t = X(this.kid ? pb.kx : pb.hx);
      rg.xs.v = 0;
    }
    this.build();
    this.applyTex();
    this.placeCamera(true);
  }

  setKid(kid: boolean) {
    if (kid === this.kid) return;
    this.kid = kid;
    for (const rg of this.rigs) {
      const pb = this.lay.pieces[rg.idx];
      rg.xs.t = X(kid ? pb.kx : pb.hx);
      if (rg.piece.kidOnly) {
        rg.ys.t = kid ? 0 : 1.1;
        if (kid) {
          rg.shown = true;
          rg.xs.x = rg.xs.t;
          rg.roll.x = 0.06; // vješalica se objesi s blagim njihajem
        }
      }
    }
    this.placeCamera();
  }

  flip() {
    const rg = this.rigs[this.flipIdx];
    if (!rg) return;
    rg.yawS.t = Math.round(rg.yawS.t / Math.PI) * Math.PI + Math.PI;
    rg.yawS.k = 30;
    rg.yawS.z = 0.45;
  }

  /** Jednokratni "pogled": blagi zamah okreta (opruga ga vrati) — znak da se vješalica okreće. */
  peek() {
    const rg = this.rigs[this.flipIdx];
    if (!rg || this.dragging || Math.abs(rg.yawS.v) > 0.5) return;
    rg.yawS.v -= 5.5; // ≈ -30° vrh, prigušeno natrag
  }

  /** Bez animacije postavi lice (usklađivanje s 2D prije nego se 3D pokaže). */
  snapSide(s: 0 | 1) {
    const rg = this.rigs[this.flipIdx];
    if (!rg || this.dragging) return;
    const cur = Math.cos(rg.yawS.x) >= 0 ? 0 : 1;
    if (cur === s && Math.abs(rg.yawS.v) < 0.5) return;
    rg.yawS.x = rg.yawS.t = s * Math.PI;
    rg.yawS.v = 0;
    rg.roll.v = rg.pitch.v = 0;
    this.side = s;
  }

  show(s: 0 | 1) {
    const rg = this.rigs[this.flipIdx];
    if (!rg) return;
    const k = Math.round((rg.yawS.x - s * Math.PI) / (2 * Math.PI));
    rg.yawS.t = k * 2 * Math.PI + s * Math.PI;
    rg.yawS.k = 30;
    rg.yawS.z = 0.45;
  }

  /** Početak povlačenja; fx = vodoravni položaj prsta (0..1 širine). */
  dragStart(fx: number) {
    let idx = this.flipIdx;
    if (idx < 0) {
      // bez okreta: uvij najbližu vješalicu
      let best = Infinity;
      this.rigs.forEach((rg, i) => {
        if (rg.piece.kidOnly && !this.kid) return;
        const d = Math.abs(X(fx * SW) - rg.xs.x);
        if (d < best) {
          best = d;
          idx = i;
        }
      });
    }
    const rg = this.rigs[idx];
    if (!rg) return;
    this.dragging = { r0: rg.yawS.x, idx };
    rg.yawS.k = 170;
    rg.yawS.z = 0.85;
  }

  /** dxn = pomak prsta / širina pozornice. */
  dragMove(dxn: number) {
    const g = this.dragging;
    if (!g) return;
    const rg = this.rigs[g.idx];
    let t = g.r0 + dxn * ((220 * Math.PI) / 180);
    if (g.idx !== this.flipIdx) {
      const lim = 0.55; // gumeni otpor: jednostrana odjeća se ne okreće naopako
      t = g.r0 + lim * Math.tanh((t - g.r0) / lim);
    }
    rg.yawS.t = t;
  }

  /** vn = brzina prsta (širina pozornice / s). */
  dragEnd(vn: number) {
    const g = this.dragging;
    this.dragging = null;
    if (!g) return;
    const rg = this.rigs[g.idx];
    rg.yawS.k = 34;
    rg.yawS.z = 0.42;
    if (g.idx !== this.flipIdx) {
      rg.yawS.t = 0;
      return;
    }
    // najviše jedno lice po potezu; prag ~50° (povlačenje + zalet)
    const v = vn * ((220 * Math.PI) / 180);
    const base = Math.round(g.r0 / Math.PI) * Math.PI;
    const delta = rg.yawS.x + THREE.MathUtils.clamp(v * 0.18, -Math.PI, Math.PI) - base;
    rg.yawS.t = Math.abs(delta) > (50 * Math.PI) / 180 ? base + Math.sign(delta) * Math.PI : base;
    rg.yawS.v = THREE.MathUtils.clamp(rg.yawS.v, -16, 16);
  }

  resize(w: number, h: number, dpr: number) {
    this.renderer.setPixelRatio(dpr);
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    if (this.first) this.render();
  }

  setVisible(v: boolean) {
    this.visible = v;
    if (v) this.start();
  }

  /* ---------- petlja ---------- */

  private start() {
    if (this.running || this.disposed || !this.visible) return;
    if (!this.rigs.every((rg) => rg.loaded || rg.piece.kidOnly)) return;
    this.running = true;
    this.last = performance.now();
    this.raf = requestAnimationFrame(this.tick);
  }

  private tick = (now: number) => {
    if (this.disposed) return;
    if (!this.visible || document.hidden) {
      this.running = false;
      return;
    }
    const dt = Math.min(0.05, Math.max(0.001, (now - this.last) / 1000));
    this.last = now;
    this.step(dt);
    this.render();
    if (!this.first) {
      this.first = true;
      this.cb.onFirstFrame();
    }
    this.raf = requestAnimationFrame(this.tick);
  };

  private step(dt: number) {
    const n = Math.ceil(dt / (1 / 240));
    const h = dt / n;
    for (let s = 0; s < n; s++) {
      this.time += h;
      const T = this.time;
      for (const rg of this.rigs) {
        // mirno disanje vješalice (vrlo malo; zrak u prostoriji)
        const ph = rg.idx * 1.7;
        const idleYaw = 0.011 * Math.sin(T * 0.41 + ph) + 0.006 * Math.sin(T * 0.97 + 2 * ph);
        const t0 = rg.yawS.t;
        if (!this.dragging || this.dragging.idx !== rg.idx) rg.yawS.t = t0 + idleYaw;
        const aYaw = stepSpring(rg.yawS, h);
        rg.yawS.t = t0;
        const ax = stepSpring(rg.xs, h);
        stepSpring(rg.ys, h);
        // vješalica se ne može spustiti kroz šipku: mali odskok + njihaj
        if (rg.ys.x < 0) {
          if (rg.ys.v < -0.15) rg.roll.v += rg.ys.v * 0.35;
          rg.ys.x = 0;
          rg.ys.v = -rg.ys.v * 0.18;
        }
        // njihalo: pobuđuju ga ubrzanje po šipki, kutno ubrzanje okreta i mali "zrak"
        const L = Math.max(0.2, rg.len * 0.55);
        const airR = 0.0035 * Math.sin(T * 0.73 + ph) + 0.002 * Math.sin(T * 1.31 + ph * 2);
        const airP = 0.004 * Math.sin(T * 0.57 + ph * 1.3);
        stepSpring(rg.roll, h, -(ax / L) * 0.6 - aYaw * 0.02 + airR * rg.roll.k);
        stepSpring(rg.pitch, h, -aYaw * 0.012 + airP * rg.pitch.k);
        rg.roll.x = THREE.MathUtils.clamp(rg.roll.x, -0.25, 0.25);
        rg.pitch.x = THREE.MathUtils.clamp(rg.pitch.x, -0.2, 0.2);
        if (rg.piece.kidOnly && !this.kid && rg.ys.x > 1.0) rg.shown = false;
      }
      for (const k of [this.cam.x, this.cam.y, this.cam.z]) stepSpring(k, h);
    }
    this.sync();
  }

  private sync() {
    const L = this.lay;
    const floorY = Y(L.floorY);
    const rodY = Y(L.rodTop);
    let flipSide: 0 | 1 = this.side;
    for (const rg of this.rigs) {
      const vis = rg.shown && (rg.loaded || !rg.piece.kidOnly);
      rg.pivot.visible = vis;
      rg.mirror.pivot.visible = vis;
      rg.pivot.position.x = rg.xs.x;
      rg.pivot.position.y = rodY + rg.ys.x;
      rg.swing.rotation.set(rg.pitch.x, 0, rg.roll.x);
      rg.yaw.rotation.y = rg.yawS.x;
      rg.mirror.pivot.position.copy(rg.pivot.position);
      rg.mirror.swing.rotation.copy(rg.swing.rotation);
      rg.mirror.yaw.rotation.y = rg.yawS.x;
      // tkanina: zaostaje pri okretu i bočnom klizanju
      const twist = THREE.MathUtils.clamp(-rg.yawS.v * 0.05, -0.38, 0.38);
      const lagX = THREE.MathUtils.clamp(-rg.xs.v * 0.03 - rg.roll.v * 0.012, -0.03, 0.03);
      const sn = Math.sin(rg.yawS.x);
      const dim = 1 - 0.16 * sn * sn; // bokom prema svjetlu → malo tamnije (samo tijekom okreta)
      for (const m of rg.mats) {
        m.uniforms.uTwist.value = twist;
        m.uniforms.uLagX.value = lagX;
        m.uniforms.uDim.value = dim;
      }
      // sjena i lokva svjetla ispod (širina prati okret, mekša kad je odjeća više)
      const cosA = Math.abs(Math.cos(rg.yawS.x));
      const lift = Math.max(0, rg.ys.x);
      const sw = rg.w * (0.3 + 0.62 * cosA) * (1 + lift * 0.6);
      const sx = rg.xs.x + Math.sin(rg.roll.x) * rg.len * 0.9;
      rg.shadow.visible = rg.pool.visible = vis;
      rg.shadow.position.x = sx;
      rg.shadow.position.z = rg.pivot.position.z - 0.005;
      rg.shadow.scale.set(sw * 1.05, 0.085 + 0.06 * (1 - cosA), 1);
      (rg.shadow.material as THREE.MeshBasicMaterial).opacity = 0.72 * Math.max(0, 1 - lift * 1.4);
      rg.pool.position.x = rg.xs.x;
      rg.pool.position.z = rg.pivot.position.z + 0.02;
      rg.pool.scale.set(rg.w * 1.7, 0.42, 1);
      (rg.pool.material as THREE.ShaderMaterial).uniforms.intensity.value = rg.piece.kidOnly ? 0.008 : 0.02;
      if (rg.idx === this.flipIdx) flipSide = Math.cos(rg.yawS.x) >= 0 ? 0 : 1;
    }
    for (const m of this.rigs.flatMap((r) => r.mats)) m.uniforms.uFloor.value = floorY;
    if (flipSide !== this.side) {
      this.side = flipSide;
      this.cb.onSide(flipSide);
    }
    this.camera.position.set(this.cam.x.x, this.cam.y.x, this.cam.z.x);
    this.camera.lookAt(this.cam.x.x, this.cam.y.x, 0);
  }

  private render() {
    this.renderer.render(this.scene, this.camera);
  }

  private onLost = (e: Event) => {
    e.preventDefault();
    if (!this.disposed) this.cb.onFail();
  };

  dispose() {
    this.disposed = true;
    this.loadAbort = true;
    cancelAnimationFrame(this.raf);
    this.renderer.domElement.removeEventListener("webglcontextlost", this.onLost);
    for (const rg of this.rigs) this.clearGroup(rg.pivot);
    this.clearGroup(this.stat);
    this.clearGroup(this.mirrorRoot);
    for (const t of this.tex.values()) t.dispose();
    for (const o of this.own) o.dispose();
    for (const o of this.buildOwn) o.dispose();
    this.renderer.dispose();
  }
}

