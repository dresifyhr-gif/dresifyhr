// PAZI PROZOR! — three.js scena. three se učitava s CDN-a u trenutku izvođenja
// (bez npm ovisnosti), pa su tipovi labavi (any).
//
// Budžet za iPhone: DPR ≤ 2, bez sjena u stvarnom vremenu (pečene + "blob"),
// statični rekviziti spojeni u JEDAN mesh s pečenim bojama vrhova (MeshBasic),
// ~40 draw callova ukupno.

import {
  BACKPACK, BALL_R, BALL_START, BASE_H, BENCH, CAR, COURT, DUMPSTER, FLOOR_H, GOAL_HALF, GOAL_Z, LAMP, WINDOW,
  type V3
} from "./physics";
import {
  paintBall, paintBlob, paintDot, paintFacade, paintGlow, paintGrandmaWindow, paintGround, paintJersey, paintSky,
  rng, type Kit
} from "./textures";

type T = any;

const THREE_URL = "https://cdn.jsdelivr.net/npm/three@0.170.0/build/three.module.js";
let threeP: Promise<T> | null = null;
export function loadThree(): Promise<T> {
  if (!threeP) {
    const url = THREE_URL;
    threeP = import(/* webpackIgnore: true */ url).catch((e: unknown) => {
      threeP = null;
      throw e;
    });
  }
  return threeP;
}

const clamp = (v: number, a: number, b: number) => (v < a ? a : v > b ? b : v);
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const damp = (a: number, b: number, l: number, dt: number) => lerp(a, b, 1 - Math.exp(-l * dt));

// ── Pečeno osvjetljenje za statične rekvizite ──────────────────────────
const SKY = [0.36, 0.38, 0.62];
const GND = [0.2, 0.15, 0.17];
const BOUNCE = { dir: [0.92, 0.3, -0.25], col: [1.0, 0.55, 0.32], k: 0.55 };

class Baker {
  pos: number[] = [];
  col: number[] = [];
  constructor(private T: T) {}
  /** geo se troši (toNonIndexed + transformacija). color = hex ili funkcija po trokutu. */
  add(geo: any, m: any, color: number | ((n: number[], c: number[]) => number), opts: { ao?: number; emissive?: boolean; lit?: number } = {}) {
    const T = this.T;
    let g = geo.index ? geo.toNonIndexed() : geo;
    if (g !== geo) geo.dispose();
    g.applyMatrix4(m);
    g.computeVertexNormals();
    const p = g.attributes.position.array as Float32Array;
    const n = g.attributes.normal.array as Float32Array;
    const c = new T.Color();
    const ao = opts.ao ?? 1;
    const lit = opts.lit ?? 1;
    for (let i = 0; i < p.length; i += 9) {
      const nx = n[i];
      const ny = n[i + 1];
      const nz = n[i + 2];
      const cx = (p[i] + p[i + 3] + p[i + 6]) / 3;
      const cy = (p[i + 1] + p[i + 4] + p[i + 7]) / 3;
      const cz = (p[i + 2] + p[i + 5] + p[i + 8]) / 3;
      c.setHex(typeof color === "number" ? color : color([nx, ny, nz], [cx, cy, cz]));
      let r = c.r;
      let gg = c.g;
      let b = c.b;
      if (!opts.emissive) {
        const h = ny * 0.5 + 0.5;
        const d = Math.max(0, nx * BOUNCE.dir[0] + ny * BOUNCE.dir[1] + nz * BOUNCE.dir[2]) * BOUNCE.k * lit;
        const lr = lerp(GND[0], SKY[0], h) + d * BOUNCE.col[0];
        const lg = lerp(GND[1], SKY[1], h) + d * BOUNCE.col[1];
        const lb = lerp(GND[2], SKY[2], h) + d * BOUNCE.col[2];
        for (let k = 0; k < 3; k++) {
          const vy = p[i + k * 3 + 1];
          const occl = lerp(1, clamp(0.45 + vy * 0.9, 0.45, 1), ao);
          this.col.push(r * lr * 2.1 * occl, gg * lg * 2.1 * occl, b * lb * 2.1 * occl);
        }
      } else {
        for (let k = 0; k < 3; k++) this.col.push(r, gg, b);
      }
      void cx;
      void cy;
      void cz;
    }
    for (let i = 0; i < p.length; i++) this.pos.push(p[i]);
    g.dispose();
  }
  build(material: any) {
    const T = this.T;
    const g = new T.BufferGeometry();
    g.setAttribute("position", new T.Float32BufferAttribute(this.pos, 3));
    g.setAttribute("color", new T.Float32BufferAttribute(this.col, 3));
    g.computeBoundingSphere();
    const mesh = new T.Mesh(g, material);
    mesh.matrixAutoUpdate = false;
    return mesh;
  }
}

// ── Čestice (jedan draw call) ──────────────────────────────────────────
type P = { x: number; y: number; z: number; vx: number; vy: number; vz: number; life: number; max: number; size: number; r: number; g: number; b: number; a: number; drag: number; grav: number; grow: number };

const PARTICLE_VS = `
attribute float size;
attribute vec4 rgba;
varying vec4 vC;
uniform float uScale;
void main() {
  vC = rgba;
  vec4 mv = modelViewMatrix * vec4(position, 1.0);
  gl_PointSize = size * uScale / max(0.1, -mv.z);
  gl_Position = projectionMatrix * mv;
}`;
const PARTICLE_FS = `
uniform sampler2D map;
varying vec4 vC;
void main() {
  vec4 t = texture2D(map, gl_PointCoord);
  gl_FragColor = vec4(vC.rgb, vC.a * t.a);
}`;

class Particles {
  pts: P[] = [];
  geo: any;
  mesh: any;
  pos: Float32Array;
  col: Float32Array;
  size: Float32Array;
  constructor(T: T, private max: number, map: any, additive: boolean) {
    this.pos = new Float32Array(max * 3);
    this.col = new Float32Array(max * 4);
    this.size = new Float32Array(max);
    this.geo = new T.BufferGeometry();
    this.geo.setAttribute("position", new T.BufferAttribute(this.pos, 3).setUsage(T.DynamicDrawUsage));
    this.geo.setAttribute("rgba", new T.BufferAttribute(this.col, 4).setUsage(T.DynamicDrawUsage));
    this.geo.setAttribute("size", new T.BufferAttribute(this.size, 1).setUsage(T.DynamicDrawUsage));
    this.geo.setDrawRange(0, 0);
    const mat = new T.ShaderMaterial({
      uniforms: { map: { value: map }, uScale: { value: 400 } },
      vertexShader: PARTICLE_VS,
      fragmentShader: PARTICLE_FS,
      transparent: true,
      depthWrite: false,
      blending: additive ? T.AdditiveBlending : T.NormalBlending
    });
    this.mesh = new T.Points(this.geo, mat);
    this.mesh.frustumCulled = false;
    this.mesh.renderOrder = 5;
  }
  emit(p: Partial<P> & { x: number; y: number; z: number }) {
    if (this.pts.length >= this.max) this.pts.shift();
    this.pts.push({ vx: 0, vy: 0, vz: 0, life: 0, max: 1, size: 0.2, r: 1, g: 1, b: 1, a: 1, drag: 1, grav: 0, grow: 0, ...p });
  }
  update(dt: number) {
    const list = this.pts;
    let w = 0;
    for (let i = 0; i < list.length; i++) {
      const p = list[i];
      p.life += dt;
      if (p.life >= p.max) continue;
      p.vy -= p.grav * dt;
      const d = Math.exp(-p.drag * dt);
      p.vx *= d;
      p.vy *= d;
      p.vz *= d;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.z += p.vz * dt;
      if (p.grav > 0 && p.y < 0.02) {
        p.y = 0.02;
        p.vy *= -0.3;
        p.vx *= 0.6;
        p.vz *= 0.6;
      }
      list[w++] = p;
    }
    list.length = w;
    for (let i = 0; i < w; i++) {
      const p = list[i];
      const k = p.life / p.max;
      this.pos[i * 3] = p.x;
      this.pos[i * 3 + 1] = p.y;
      this.pos[i * 3 + 2] = p.z;
      this.col[i * 4] = p.r;
      this.col[i * 4 + 1] = p.g;
      this.col[i * 4 + 2] = p.b;
      this.col[i * 4 + 3] = p.a * (k < 0.15 ? k / 0.15 : 1 - (k - 0.15) / 0.85);
      this.size[i] = p.size * (1 + p.grow * k);
    }
    this.geo.setDrawRange(0, w);
    if (w) {
      this.geo.attributes.position.needsUpdate = true;
      this.geo.attributes.rgba.needsUpdate = true;
      this.geo.attributes.size.needsUpdate = true;
    }
  }
  clear() {
    this.pts.length = 0;
    this.geo.setDrawRange(0, 0);
  }
}

// ── Komadići (staklo, konfete) — InstancedMesh ─────────────────────────
type Bit = { x: number; y: number; z: number; vx: number; vy: number; vz: number; rx: number; ry: number; rz: number; wx: number; wy: number; wz: number; life: number; max: number; s: number; rest: boolean };

class Bits {
  list: Bit[] = [];
  mesh: any;
  private m: any;
  private q: any;
  private e: any;
  private v: any;
  private sc: any;
  constructor(private T: T, geo: any, mat: any, private max: number, private flutter: number) {
    this.mesh = new T.InstancedMesh(geo, mat, max);
    this.mesh.instanceMatrix.setUsage(T.DynamicDrawUsage);
    this.mesh.count = 0;
    this.mesh.frustumCulled = false;
    this.m = new T.Matrix4();
    this.q = new T.Quaternion();
    this.e = new T.Euler();
    this.v = new T.Vector3();
    this.sc = new T.Vector3();
  }
  add(b: Partial<Bit> & { x: number; y: number; z: number }, color?: any) {
    if (this.list.length >= this.max) return;
    const i = this.list.length;
    this.list.push({ vx: 0, vy: 0, vz: 0, rx: Math.random() * 6, ry: Math.random() * 6, rz: Math.random() * 6, wx: 0, wy: 0, wz: 0, life: 0, max: 2, s: 1, rest: false, ...b });
    if (color && this.mesh.setColorAt) {
      this.mesh.setColorAt(i, color);
      if (this.mesh.instanceColor) this.mesh.instanceColor.needsUpdate = true;
    }
  }
  update(dt: number) {
    const L = this.list;
    for (let i = 0; i < L.length; i++) {
      const b = L[i];
      b.life += dt;
      if (!b.rest) {
        b.vy -= 9.8 * dt * (this.flutter ? 0.32 : 1);
        if (this.flutter) {
          const d = Math.exp(-this.flutter * dt);
          b.vx *= d;
          b.vz *= d;
          if (b.vy < -1.6) b.vy = -1.6;
          b.vx += Math.sin(b.life * 5 + i) * 0.9 * dt;
        }
        b.x += b.vx * dt;
        b.y += b.vy * dt;
        b.z += b.vz * dt;
        b.rx += b.wx * dt;
        b.ry += b.wy * dt;
        b.rz += b.wz * dt;
        if (b.y < 0.015) {
          b.y = 0.015;
          if (Math.abs(b.vy) < 1.2) {
            b.rest = true;
            b.rx = Math.PI / 2;
            b.rz = 0;
          }
          b.vy = -b.vy * 0.25;
          b.vx *= 0.5;
          b.vz *= 0.5;
        }
      }
      const fade = b.life > b.max - 0.4 ? Math.max(0, (b.max - b.life) / 0.4) : 1;
      this.e.set(b.rx, b.ry, b.rz);
      this.q.setFromEuler(this.e);
      this.sc.setScalar(b.s * fade);
      this.v.set(b.x, b.y, b.z);
      this.m.compose(this.v, this.q, this.sc);
      this.mesh.setMatrixAt(i, this.m);
    }
    // ukloni istekle (zamijeni sa zadnjim)
    for (let i = L.length - 1; i >= 0; i--) {
      if (L[i].life >= L[i].max) {
        const last = L.length - 1;
        if (i !== last) {
          L[i] = L[last];
          if (this.mesh.instanceColor) {
            const c = new this.T.Color();
            this.mesh.getColorAt(last, c);
            this.mesh.setColorAt(i, c);
            this.mesh.instanceColor.needsUpdate = true;
          }
        }
        L.pop();
      }
    }
    this.mesh.count = L.length;
    this.mesh.instanceMatrix.needsUpdate = true;
  }
  clear() {
    this.list.length = 0;
    this.mesh.count = 0;
  }
}

// ── Dijete ─────────────────────────────────────────────────────────────
type Kid = {
  root: any;
  body: any;
  legL: any;
  legR: any;
  armL: any;
  armR: any;
  head: any;
  jersey: any;
  shorts: any;
  socks: any;
  jerseyTex: any;
};

function boxUVBack(T: T, w: number, h: number, d: number) {
  // BoxGeometry s UV-ovima: +z (leđa) → desna polovica teksture (broj), ostalo lijeva
  const g = new T.BoxGeometry(w, h, d);
  const uv = g.attributes.uv;
  for (let face = 0; face < 6; face++) {
    for (let k = 0; k < 4; k++) {
      const i = face * 4 + k;
      const u = uv.getX(i);
      uv.setX(i, face === 4 ? 0.5 + u * 0.5 : u * 0.5);
    }
  }
  return g;
}

function buildKid(T: T, kit: Kit): Kid {
  const skin = new T.MeshLambertMaterial({ color: 0xe2a77f });
  const shoe = new T.MeshLambertMaterial({ color: 0xf0eeea });
  const hair = new T.MeshLambertMaterial({ color: 0x3a2318 });
  const jerseyTex = new T.CanvasTexture(paintJersey(kit));
  jerseyTex.colorSpace = T.SRGBColorSpace;
  const jersey = new T.MeshLambertMaterial({ map: jerseyTex });
  const shorts = new T.MeshLambertMaterial({ color: new T.Color(kit.shorts) });
  const socks = new T.MeshLambertMaterial({ color: new T.Color(kit.socks) });

  const root = new T.Group();
  const body = new T.Group();
  root.add(body);
  const add = (parent: any, geo: any, mat: any, x: number, y: number, z: number) => {
    const m = new T.Mesh(geo, mat);
    m.position.set(x, y, z);
    parent.add(m);
    return m;
  };
  // trup + hlačice
  add(body, boxUVBack(T, 0.38, 0.44, 0.22), jersey, 0, 1.0, 0);
  add(body, new T.BoxGeometry(0.37, 0.22, 0.23), shorts, 0, 0.7, 0);
  // glava
  const head = new T.Group();
  head.position.set(0, 1.25, 0);
  body.add(head);
  add(head, new T.BoxGeometry(0.1, 0.08, 0.1), skin, 0, 0.02, 0);
  add(head, new T.IcosahedronGeometry(0.135, 1), skin, 0, 0.16, 0);
  const hairM = add(head, new T.IcosahedronGeometry(0.142, 1), hair, 0, 0.2, 0.018);
  hairM.scale.set(1, 0.72, 1);
  // ruke (pivot u ramenu)
  const arm = (side: number) => {
    const g = new T.Group();
    g.position.set(side * 0.235, 1.18, 0);
    body.add(g);
    add(g, boxUVBack(T, 0.11, 0.16, 0.11), jersey, 0, -0.06, 0);
    add(g, new T.BoxGeometry(0.085, 0.3, 0.085), skin, 0, -0.29, 0);
    g.rotation.z = side * 0.12;
    return g;
  };
  const armL = arm(-1);
  const armR = arm(1);
  // noge (pivot u kuku)
  const leg = (side: number) => {
    const g = new T.Group();
    g.position.set(side * 0.095, 0.66, 0);
    root.add(g);
    add(g, new T.BoxGeometry(0.115, 0.22, 0.115), skin, 0, -0.14, 0);
    add(g, new T.BoxGeometry(0.12, 0.26, 0.12), socks, 0, -0.38, 0);
    add(g, new T.BoxGeometry(0.125, 0.085, 0.24), shoe, 0, -0.62, -0.045);
    return g;
  };
  const legL = leg(-1);
  const legR = leg(1);
  root.traverse((o: any) => {
    if (o.isMesh) o.frustumCulled = false;
  });
  return { root, body, legL, legR, armL, armR, head, jersey, shorts, socks, jerseyTex };
}

// ── Kamera ─────────────────────────────────────────────────────────────
export type CamShot = { pos: V3; look: V3; fov: number; lambda: number };

// ── Motor ──────────────────────────────────────────────────────────────
export class Engine {
  T: T;
  renderer: any;
  scene: any;
  camera: any;
  w = 1;
  h = 1;
  dpr = 1;
  maxDpr = 2;

  ball: any;
  ballShadow: any;
  kid: Kid;
  kidShadow: any;
  traj: any;
  trajPos: Float32Array;
  trajCol: Float32Array;
  trajSize: Float32Array;
  dust: Particles;
  glow: Particles;
  shards: Bits;
  confetti: Bits;
  windowMesh: any;
  windowTex: any[] = [];
  lampLight: any;
  lampSprite: any;
  ring: any;
  ringT = 9;

  // kamera
  camPos: any;
  camLook: any;
  camFov = 55;
  target: CamShot = { pos: { x: 0, y: 4, z: 14 }, look: { x: 0, y: 0.5, z: -6 }, fov: 55, lambda: 4 };
  shakeAmt = 0;
  fovKick = 0;
  roll = 0;
  private tmpV: any;
  private tmpQ: any;
  private up: any;

  // dijete
  kidAim = { yaw: 0, power: 0 };
  kickT = -1;
  celebrateT = -1;
  sadT = -1;
  idleT = 0;

  constructor(T: T, canvas: HTMLCanvasElement, kit: Kit) {
    this.T = T;
    const renderer = new T.WebGLRenderer({ canvas, antialias: true, powerPreference: "high-performance", alpha: false, stencil: false });
    renderer.setClearColor(0x15121e, 1);
    renderer.outputColorSpace = T.SRGBColorSpace;
    this.renderer = renderer;
    const scene = new T.Scene();
    scene.fog = new T.Fog(0x2a2238, 34, 95);
    this.scene = scene;
    this.camera = new T.PerspectiveCamera(55, 1, 0.1, 400);
    this.camPos = new T.Vector3(0, 4, 14);
    this.camLook = new T.Vector3(0, 0.5, -6);
    this.tmpV = new T.Vector3();
    this.tmpQ = new T.Quaternion();
    this.up = new T.Vector3(0, 1, 0);

    const aniso = Math.min(4, renderer.capabilities.getMaxAnisotropy?.() ?? 1);
    const tex = (c: HTMLCanvasElement, opts: { aniso?: boolean; mip?: boolean } = {}) => {
      const t = new T.CanvasTexture(c);
      t.colorSpace = T.SRGBColorSpace;
      if (opts.aniso) t.anisotropy = aniso;
      if (opts.mip === false) {
        t.generateMipmaps = false;
        t.minFilter = T.LinearFilter;
      }
      return t;
    };

    // nebo
    const sky = new T.Mesh(
      new T.SphereGeometry(160, 24, 12),
      new T.MeshBasicMaterial({ map: tex(paintSky(), { mip: false }), side: T.BackSide, fog: false, depthWrite: false })
    );
    sky.renderOrder = -10;
    sky.matrixAutoUpdate = false;
    sky.updateMatrix();
    scene.add(sky);

    // tlo
    const gx0 = COURT.left;
    const gx1 = COURT.right;
    const gz0 = COURT.back;
    const gz1 = COURT.front + 7;
    const groundTex = tex(
      paintGround({ x0: gx0, x1: gx1, z0: gz0, z1: gz1, car: CAR, dumpster: DUMPSTER, lamp: LAMP, goalZ: GOAL_Z, goalHalf: GOAL_HALF, bench: BENCH }),
      { aniso: true }
    );
    const ground = new T.Mesh(new T.PlaneGeometry(gx1 - gx0, gz1 - gz0), new T.MeshBasicMaterial({ map: groundTex }));
    ground.rotation.x = -Math.PI / 2;
    ground.position.set((gx0 + gx1) / 2, 0, (gz0 + gz1) / 2);
    ground.matrixAutoUpdate = false;
    ground.updateMatrix();
    scene.add(ground);

    // fasade
    const LEN = gz1 - gz0;
    const facade = (spec: Parameters<typeof paintFacade>[0], place: (m: any) => void) => {
      const m = new T.Mesh(new T.PlaneGeometry(spec.w, spec.h), new T.MeshBasicMaterial({ map: tex(paintFacade(spec), { aniso: true }) }));
      place(m);
      m.matrixAutoUpdate = false;
      m.updateMatrix();
      scene.add(m);
      return m;
    };
    const hL = BASE_H + FLOOR_H * 5 + 0.7;
    const hR = BASE_H + FLOOR_H * 6 + 0.7;
    const hB = BASE_H + FLOOR_H * 7 + 0.7;
    // lijeva: u raste prema -z (gledano iz dvorišta), lijevi rub = z1
    facade(
      { w: LEN, h: hL, floors: 5, bay: 2.7, offset: 1.6, seed: 21, light: "cool", panels: ["#8a5a3c", "#4f6a8a", "#7a7a6a"], lit: 0.35, ground: "doors" },
      (m) => {
        m.rotation.y = Math.PI / 2;
        m.position.set(COURT.left, hL / 2, (gz0 + gz1) / 2);
      }
    );
    // desna: u raste prema +z, lijevi rub = z0 (stražnji kut)
    const rightBayOffset = (() => {
      // poravnaj os prozora s bakinim prozorom
      const u = WINDOW.z - gz0;
      return u - Math.floor(u / 2.7) * 2.7;
    })();
    facade(
      {
        w: LEN, h: hR, floors: 6, bay: 2.7, offset: rightBayOffset, seed: 33, light: "warm", panels: ["#b0603e", "#c9a04a", "#6a8a9a"], lit: 0.4,
        skip: { u: WINDOW.z - gz0, row: 2 }, ground: "shop", shadow: [8.4, 3.6]
      },
      (m) => {
        m.rotation.y = -Math.PI / 2;
        m.position.set(COURT.right, hR / 2, (gz0 + gz1) / 2);
      }
    );
    facade(
      { w: 26, h: hB, floors: 7, bay: 2.6, offset: 1.0, seed: 47, light: "back", panels: ["#7a4a5a", "#4a6a6a", "#8a7a5a"], lit: 0.45, ground: "garages" },
      (m) => {
        m.position.set(0, hB / 2, COURT.back);
      }
    );

    // bakin prozor
    this.windowTex = [0, 1, 2].map((k) => tex(paintGrandmaWindow(k as 0 | 1 | 2)));
    this.windowMesh = new T.Mesh(new T.PlaneGeometry(WINDOW.w, WINDOW.h), new T.MeshBasicMaterial({ map: this.windowTex[0] }));
    this.windowMesh.rotation.y = -Math.PI / 2;
    this.windowMesh.position.set(COURT.right - 0.03, WINDOW.y, WINDOW.z);
    scene.add(this.windowMesh);

    // statični rekviziti — jedan mesh
    const bake = new Baker(T);
    const M = new T.Matrix4();
    const Q = new T.Quaternion();
    const E = new T.Euler();
    const S = new T.Vector3(1, 1, 1);
    const P = new T.Vector3();
    const place = (x: number, y: number, z: number, yaw = 0, rx = 0, rz = 0) => {
      E.set(rx, yaw, rz);
      Q.setFromEuler(E);
      P.set(x, y, z);
      return M.clone().compose(P, Q, S);
    };
    const child = (parent: any, x: number, y: number, z: number, yaw = 0, rx = 0, rz = 0) => parent.clone().multiply(place(x, y, z, yaw, rx, rz));

    // auto (Zastava "stojadin" stil): lokalno x = dužina, z = širina
    const carM = place(CAR.x, 0, CAR.z, CAR.yaw);
    const carCol = 0xb3473a;
    bake.add(new T.BoxGeometry(CAR.len, 0.58, CAR.wid), child(carM, 0, 0.62, 0), carCol);
    // blago zaobljenje: niži poklopac motora i prtljažnika
    bake.add(new T.BoxGeometry(CAR.len - 0.2, 0.06, CAR.wid - 0.12), child(carM, 0, 0.94, 0), 0xa13f34);
    // kabina — krnja piramida
    const cab = new T.CylinderGeometry(0.72, 0.98, 0.46, 4, 1);
    cab.rotateY(Math.PI / 4);
    cab.scale(2.05 / 1.386, 1, 1.45 / 1.386);
    bake.add(cab, child(carM, -0.22, 1.2, 0), (n) => (Math.abs(n[1]) > 0.8 ? carCol : 0x2c3550));
    bake.add(new T.BoxGeometry(1.52, 0.05, 1.1), child(carM, -0.22, 1.445, 0), carCol);
    // branici, svjetla
    bake.add(new T.BoxGeometry(0.1, 0.13, CAR.wid + 0.04), child(carM, CAR.len / 2 + 0.03, 0.46, 0), 0xb9b8c0);
    bake.add(new T.BoxGeometry(0.1, 0.13, CAR.wid + 0.04), child(carM, -CAR.len / 2 - 0.03, 0.46, 0), 0xb9b8c0);
    for (const sz of [-0.55, 0.55]) {
      bake.add(new T.BoxGeometry(0.04, 0.16, 0.26), child(carM, CAR.len / 2 + 0.005, 0.72, sz), 0xfff2c4, { emissive: true });
      bake.add(new T.BoxGeometry(0.04, 0.14, 0.2), child(carM, -CAR.len / 2 - 0.005, 0.72, sz), 0x9a1f22, { emissive: true });
    }
    // registracija
    bake.add(new T.BoxGeometry(0.03, 0.11, 0.42), child(carM, -CAR.len / 2 - 0.04, 0.6, 0), 0xe8e8e8, { emissive: true });
    // kotači
    for (const wx of [-1.12, 1.12])
      for (const wz of [-0.74, 0.74]) {
        const wheel = new T.CylinderGeometry(0.3, 0.3, 0.2, 10);
        wheel.rotateX(Math.PI / 2);
        bake.add(wheel, child(carM, wx, 0.3, wz), 0x18171c, { ao: 0 });
        const hub = new T.CylinderGeometry(0.15, 0.15, 0.22, 8);
        hub.rotateX(Math.PI / 2);
        bake.add(hub, child(carM, wx, 0.3, wz), 0x8d8c94, { ao: 0 });
      }
    // tamni prag ispod karoserije
    bake.add(new T.BoxGeometry(CAR.len - 0.3, 0.12, CAR.wid - 0.1), child(carM, 0, 0.28, 0), 0x121016, { ao: 0 });

    // kontejner
    const dM = place(DUMPSTER.x, 0, DUMPSTER.z, DUMPSTER.yaw);
    bake.add(new T.BoxGeometry(DUMPSTER.w, DUMPSTER.h - 0.22, DUMPSTER.d), child(dM, 0, 0.18 + (DUMPSTER.h - 0.22) / 2, 0), 0x2f6043);
    bake.add(new T.BoxGeometry(DUMPSTER.w + 0.08, 0.08, DUMPSTER.d + 0.08), child(dM, 0.03, DUMPSTER.h + 0.02, 0, 0, 0, -0.08), 0x244a35);
    bake.add(new T.BoxGeometry(DUMPSTER.w + 0.02, 0.07, DUMPSTER.d * 0.9), child(dM, 0, 0.75, 0), 0xd9d6c8, { emissive: false });
    for (const sx of [-0.45, 0.45]) for (const sz of [-0.8, 0.8]) bake.add(new T.BoxGeometry(0.12, 0.18, 0.12), child(dM, sx, 0.09, sz), 0x111014, { ao: 0 });

    // lampa
    bake.add(new T.CylinderGeometry(0.06, 0.09, 5.2, 6), place(LAMP.x, 2.6, LAMP.z), 0x2a2a30);
    bake.add(new T.BoxGeometry(1.3, 0.06, 0.06), place(LAMP.x - 0.62, 5.12, LAMP.z), 0x2a2a30);
    bake.add(new T.BoxGeometry(0.42, 0.1, 0.26), place(LAMP.x - 1.2, 5.06, LAMP.z), 0x2a2a30);
    bake.add(new T.BoxGeometry(0.34, 0.03, 0.2), place(LAMP.x - 1.2, 5.0, LAMP.z), 0xfff1c6, { emissive: true });

    // klupa
    const bM = place(BENCH.x, 0, BENCH.z);
    for (const sz of [-0.85, 0.85]) bake.add(new T.BoxGeometry(BENCH.w, 0.42, 0.08), child(bM, 0, 0.21, sz), 0x2c2a30);
    for (const sx of [-0.18, 0, 0.18]) bake.add(new T.BoxGeometry(0.14, 0.05, BENCH.d), child(bM, sx, 0.45, 0), 0x8a5a36);
    bake.add(new T.BoxGeometry(0.06, 0.34, BENCH.d), child(bM, 0.3, 0.72, 0, 0, 0, -0.15), 0x8a5a36);

    // ruksaci (stative)
    const pack = (x: number, yaw: number, col: number, pocket: number) => {
      const m = place(x, 0, GOAL_Z, yaw);
      bake.add(new T.BoxGeometry(BACKPACK.w, BACKPACK.h - 0.06, BACKPACK.d), child(m, 0, (BACKPACK.h - 0.06) / 2, 0), col);
      bake.add(new T.BoxGeometry(BACKPACK.w - 0.06, 0.1, BACKPACK.d - 0.04), child(m, 0, BACKPACK.h - 0.04, 0, 0, 0.2), col);
      bake.add(new T.BoxGeometry(BACKPACK.w * 0.7, BACKPACK.h * 0.4, 0.08), child(m, 0, 0.16, BACKPACK.d / 2 + 0.03), pocket);
      bake.add(new T.BoxGeometry(0.12, 0.04, 0.03), child(m, 0, BACKPACK.h + 0.03, 0), 0x18181c);
    };
    pack(-GOAL_HALF - BACKPACK.w / 2, 0.12, 0x2b3d6e, 0xe8ff3c);
    pack(GOAL_HALF + BACKPACK.w / 2, -0.1, 0xa8322c, 0x1b1b20);

    // krovni vijenci zgrada
    bake.add(new T.BoxGeometry(0.5, 0.5, LEN + 1), place(COURT.left - 0.05, hL + 0.05, (gz0 + gz1) / 2), 0x3a3446, { ao: 0 });
    bake.add(new T.BoxGeometry(0.5, 0.5, LEN + 1), place(COURT.right + 0.05, hR + 0.05, (gz0 + gz1) / 2), 0x5a4446, { ao: 0, lit: 1.6 });
    bake.add(new T.BoxGeometry(27, 0.5, 0.5), place(0, hB + 0.05, COURT.back - 0.05), 0x3a3446, { ao: 0 });
    // antene na krovu
    const r = rng(5);
    for (let i = 0; i < 7; i++) {
      const side = i % 3;
      const x = side === 0 ? COURT.left - 1.5 : side === 1 ? COURT.right + 1.5 : -8 + r() * 16;
      const z = side === 2 ? COURT.back - 1.5 : gz0 + 4 + r() * 20;
      const y = side === 0 ? hL : side === 1 ? hR : hB;
      bake.add(new T.BoxGeometry(0.04, 1.6, 0.04), place(x, y + 0.8, z), 0x1a1820, { ao: 0 });
      bake.add(new T.BoxGeometry(0.9, 0.03, 0.03), place(x, y + 1.4, z, r() * 3), 0x1a1820, { ao: 0 });
    }
    // rubnjak uz zidove
    bake.add(new T.BoxGeometry(0.3, 0.12, LEN), place(COURT.left + 0.15, 0.06, (gz0 + gz1) / 2), 0x5a5664, { ao: 0.5 });
    bake.add(new T.BoxGeometry(0.3, 0.12, LEN), place(COURT.right - 0.15, 0.06, (gz0 + gz1) / 2), 0x6a5a5c, { ao: 0.5 });

    // konopac s rubljem visoko između balkona (izvan dosega lopte)
    const lineY = BASE_H + FLOOR_H * 4 + 0.6;
    const clothes = [0xd9d4cc, 0x6a8ac0, 0xc9584a, 0xe8d27a, 0xd9d4cc, 0x8a6aa0];
    bake.add(new T.BoxGeometry(16, 0.015, 0.015), place(0, lineY + 0.3, 4.5), 0x222024, { ao: 0 });
    for (let i = 0; i < 6; i++) {
      const x = -5 + i * 1.9 + r() * 0.4;
      bake.add(new T.BoxGeometry(0.5 + r() * 0.3, 0.55 + r() * 0.35, 0.02), place(x, lineY, 4.5, 0, 0, (r() - 0.5) * 0.1), clothes[i], { ao: 0 });
    }

    const props = bake.build(new T.MeshBasicMaterial({ vertexColors: true }));
    scene.add(props);

    // svjetla za dinamične objekte
    scene.add(new T.HemisphereLight(0x8a86c8, 0x3a2a2a, 1.5));
    const warm = new T.DirectionalLight(0xffa066, 1.35);
    warm.position.set(8, 6, -3);
    scene.add(warm);
    const rim = new T.DirectionalLight(0x9fb0ff, 0.45);
    rim.position.set(-4, 5, 8);
    scene.add(rim);
    this.lampLight = new T.PointLight(0xffb060, 9, 12, 1.6);
    this.lampLight.position.set(LAMP.x - 1.2, 4.7, LAMP.z);
    scene.add(this.lampLight);
    this.lampSprite = new T.Sprite(
      new T.SpriteMaterial({ map: tex(paintGlow(), { mip: false }), blending: T.AdditiveBlending, depthWrite: false, transparent: true, opacity: 0.85 })
    );
    this.lampSprite.scale.set(2.6, 2.6, 1);
    this.lampSprite.position.set(LAMP.x - 1.2, 4.95, LAMP.z);
    scene.add(this.lampSprite);
    // topli sjaj bakinog prozora
    const winGlow = new T.Sprite(
      new T.SpriteMaterial({ map: this.lampSprite.material.map, blending: T.AdditiveBlending, depthWrite: false, transparent: true, opacity: 0.35 })
    );
    winGlow.scale.set(3.2, 3.2, 1);
    winGlow.position.set(COURT.right - 0.25, WINDOW.y, WINDOW.z);
    scene.add(winGlow);

    // lopta
    const ballTex = tex(paintBall());
    this.ball = new T.Mesh(new T.SphereGeometry(BALL_R, 22, 14), new T.MeshLambertMaterial({ map: ballTex }));
    this.ball.position.set(BALL_START.x, BALL_START.y, BALL_START.z);
    scene.add(this.ball);
    const blobTex = tex(paintBlob(), { mip: false });
    const blobMat = new T.MeshBasicMaterial({ map: blobTex, transparent: true, depthWrite: false, opacity: 0.75 });
    this.ballShadow = new T.Mesh(new T.PlaneGeometry(1, 1), blobMat);
    this.ballShadow.rotation.x = -Math.PI / 2;
    this.ballShadow.renderOrder = 1;
    scene.add(this.ballShadow);

    // dijete
    this.kid = buildKid(T, kit);
    scene.add(this.kid.root);
    this.kidShadow = new T.Mesh(new T.PlaneGeometry(1, 1), blobMat);
    this.kidShadow.rotation.x = -Math.PI / 2;
    this.kidShadow.scale.set(0.75, 0.6, 1);
    this.kidShadow.renderOrder = 1;
    scene.add(this.kidShadow);

    // putanja (točkice)
    const dotTex = tex(paintDot(), { mip: false });
    const N = 40;
    this.trajPos = new Float32Array(N * 3);
    this.trajCol = new Float32Array(N * 4);
    this.trajSize = new Float32Array(N);
    const tg = new T.BufferGeometry();
    tg.setAttribute("position", new T.BufferAttribute(this.trajPos, 3).setUsage(T.DynamicDrawUsage));
    tg.setAttribute("rgba", new T.BufferAttribute(this.trajCol, 4).setUsage(T.DynamicDrawUsage));
    tg.setAttribute("size", new T.BufferAttribute(this.trajSize, 1).setUsage(T.DynamicDrawUsage));
    tg.setDrawRange(0, 0);
    this.traj = new T.Points(
      tg,
      new T.ShaderMaterial({
        uniforms: { map: { value: dotTex }, uScale: { value: 400 } },
        vertexShader: PARTICLE_VS,
        fragmentShader: PARTICLE_FS,
        transparent: true,
        depthWrite: false,
        depthTest: false
      })
    );
    this.traj.frustumCulled = false;
    this.traj.renderOrder = 8;
    scene.add(this.traj);

    // prsten na mjestu udarca
    this.ring = new T.Mesh(
      new T.RingGeometry(0.8, 1, 40),
      new T.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0, depthWrite: false, side: T.DoubleSide })
    );
    this.ring.renderOrder = 6;
    scene.add(this.ring);

    // čestice
    this.dust = new Particles(T, 220, dotTex, false);
    scene.add(this.dust.mesh);
    this.glow = new Particles(T, 160, dotTex, true);
    scene.add(this.glow.mesh);
    const tri = new T.BufferGeometry();
    tri.setAttribute("position", new T.Float32BufferAttribute([0, 0.07, 0, -0.05, -0.04, 0, 0.06, -0.05, 0], 3));
    tri.computeVertexNormals();
    this.shards = new Bits(
      T,
      tri,
      new T.MeshBasicMaterial({ color: 0xcfe6ff, transparent: true, opacity: 0.85, side: T.DoubleSide, depthWrite: false }),
      48,
      0
    );
    scene.add(this.shards.mesh);
    const conf = new T.PlaneGeometry(0.05, 0.085);
    this.confetti = new Bits(T, conf, new T.MeshBasicMaterial({ color: 0xffffff, side: T.DoubleSide }), 110, 1.4);
    scene.add(this.confetti.mesh);
  }

  setSize(w: number, h: number, dpr: number) {
    this.w = Math.max(1, w);
    this.h = Math.max(1, h);
    this.dpr = Math.min(this.maxDpr, dpr);
    this.renderer.setPixelRatio(this.dpr);
    this.renderer.setSize(this.w, this.h, false);
    this.camera.aspect = this.w / this.h;
    this.camera.updateProjectionMatrix();
  }

  /** Smanji DPR ako je frejm prespor (zove se iz petlje). */
  degrade() {
    if (this.maxDpr <= 1.25) return false;
    this.maxDpr = Math.max(1.25, this.maxDpr - 0.375);
    this.setSize(this.w, this.h, window.devicePixelRatio || 1);
    return true;
  }

  get portrait() {
    return this.h > this.w * 1.05;
  }

  setKit(kit: Kit) {
    const T = this.T;
    const old = this.kid.jerseyTex;
    const t = new T.CanvasTexture(paintJersey(kit));
    t.colorSpace = T.SRGBColorSpace;
    this.kid.jersey.map = t;
    this.kid.jersey.needsUpdate = true;
    this.kid.jerseyTex = t;
    old.dispose();
    this.kid.shorts.color.set(kit.shorts);
    this.kid.socks.color.set(kit.socks);
  }

  setWindowMood(m: 0 | 1 | 2) {
    this.windowMesh.material.map = this.windowTex[m];
    this.windowMesh.material.needsUpdate = true;
  }

  // ── lopta ──
  private lastBall = { x: BALL_START.x, y: BALL_START.y, z: BALL_START.z };
  setBall(p: V3, spin: number, dt: number, visible = true, scale = 1) {
    const b = this.ball;
    const dx = p.x - this.lastBall.x;
    const dz = p.z - this.lastBall.z;
    const dist = Math.hypot(dx, dz);
    if (dist > 1e-5 && dist < 2) {
      // kotrljanje: os = up × smjer
      this.tmpV.set(-dz, 0, dx).normalize();
      this.tmpQ.setFromAxisAngle(this.tmpV, dist / BALL_R);
      b.quaternion.premultiply(this.tmpQ);
    }
    if (spin && dt) {
      this.tmpQ.setFromAxisAngle(this.up, spin * dt * 0.25);
      b.quaternion.premultiply(this.tmpQ);
    }
    this.lastBall = { x: p.x, y: p.y, z: p.z };
    b.position.set(p.x, p.y, p.z);
    b.visible = visible;
    b.scale.setScalar(scale);
    const hgt = Math.max(0, p.y - BALL_R);
    const s = BALL_R * 2.6 * (1 + hgt * 0.35);
    this.ballShadow.visible = visible;
    this.ballShadow.position.set(p.x + hgt * 0.12, 0.012, p.z + hgt * 0.06);
    this.ballShadow.scale.set(s, s, 1);
    this.ballShadow.material.opacity = 0.7 / (1 + hgt * 0.8);
  }
  resetBallRotation() {
    this.lastBall = { ...BALL_START };
  }

  // ── putanja ──
  setTrajectory(pts: V3[], n: number, alpha: number, danger: number) {
    const T = this.T;
    void T;
    const ac = [0.91, 1.0, 0.24];
    const dc = [1.0, 0.35, 0.3];
    for (let i = 0; i < n; i++) {
      const p = pts[i];
      this.trajPos[i * 3] = p.x;
      this.trajPos[i * 3 + 1] = p.y;
      this.trajPos[i * 3 + 2] = p.z;
      const k = i / Math.max(1, n - 1);
      const c = danger > 0 && k > 0.5 ? dc : ac;
      this.trajCol[i * 4] = c[0];
      this.trajCol[i * 4 + 1] = c[1];
      this.trajCol[i * 4 + 2] = c[2];
      this.trajCol[i * 4 + 3] = alpha * (1 - k * 0.75);
      this.trajSize[i] = 0.16 * (1 - k * 0.45);
    }
    const g = this.traj.geometry;
    g.setDrawRange(0, n);
    g.attributes.position.needsUpdate = true;
    g.attributes.rgba.needsUpdate = true;
    g.attributes.size.needsUpdate = true;
  }
  hideTrajectory() {
    this.traj.geometry.setDrawRange(0, 0);
  }

  // ── efekti ──
  dustPuff(p: V3, n: V3, strength: number) {
    const k = clamp(strength / 12, 0.2, 1);
    const count = Math.round(5 + k * 10);
    for (let i = 0; i < count; i++) {
      const a = Math.random() * Math.PI * 2;
      const sp = 0.4 + Math.random() * 1.6 * k;
      this.dust.emit({
        x: p.x + n.x * 0.05, y: p.y + n.y * 0.05, z: p.z + n.z * 0.05,
        vx: n.x * sp + Math.cos(a) * sp * 0.7, vy: n.y * sp + Math.abs(Math.sin(a)) * sp * 0.5 + 0.2, vz: n.z * sp + Math.sin(a) * sp * 0.7,
        max: 0.5 + Math.random() * 0.5, size: 0.14 + Math.random() * 0.18 * k, grow: 1.4, drag: 3.2,
        r: 0.6, g: 0.55, b: 0.6, a: 0.22
      });
    }
  }
  sparks(p: V3, n: V3, color: [number, number, number], count: number, speed = 4) {
    for (let i = 0; i < count; i++) {
      const sp = speed * (0.4 + Math.random());
      this.glow.emit({
        x: p.x, y: p.y, z: p.z,
        vx: n.x * sp + (Math.random() - 0.5) * sp, vy: n.y * sp + Math.random() * sp * 0.7, vz: n.z * sp + (Math.random() - 0.5) * sp,
        max: 0.35 + Math.random() * 0.35, size: 0.07 + Math.random() * 0.06, drag: 2.5, grav: 6,
        r: color[0], g: color[1], b: color[2], a: 1
      });
    }
  }
  trail(p: V3, k: number) {
    this.glow.emit({ x: p.x, y: p.y, z: p.z, max: 0.16, size: 0.13 + k * 0.07, r: 0.9, g: 0.95, b: 1, a: 0.07 + k * 0.12, drag: 0 });
  }
  impactRing(p: V3, n: V3, size = 1) {
    this.ring.position.set(p.x + n.x * 0.03, Math.max(0.03, p.y + n.y * 0.03), p.z + n.z * 0.03);
    this.tmpV.set(p.x + n.x, p.y + n.y, p.z + n.z);
    this.ring.lookAt(this.tmpV);
    this.ringT = 0;
    this.ring.userData.size = size;
  }
  glass() {
    const T = this.T;
    void T;
    this.shards.clear();
    for (let i = 0; i < 46; i++) {
      this.shards.add({
        x: COURT.right - 0.05,
        y: WINDOW.y + (Math.random() - 0.5) * WINDOW.h * 0.8,
        z: WINDOW.z + (Math.random() - 0.5) * WINDOW.w * 0.8,
        vx: -(1.2 + Math.random() * 3.2), vy: Math.random() * 2.5, vz: (Math.random() - 0.5) * 3,
        wx: (Math.random() - 0.5) * 18, wy: (Math.random() - 0.5) * 18, wz: (Math.random() - 0.5) * 18,
        max: 3 + Math.random() * 1.5, s: 0.6 + Math.random() * 1.4
      });
    }
    for (let i = 0; i < 26; i++) {
      this.glow.emit({
        x: COURT.right - 0.1, y: WINDOW.y + (Math.random() - 0.5), z: WINDOW.z + (Math.random() - 0.5),
        vx: -(1 + Math.random() * 3), vy: Math.random() * 2, vz: (Math.random() - 0.5) * 3,
        max: 0.6 + Math.random() * 0.6, size: 0.06 + Math.random() * 0.05, drag: 1.5, grav: 7, r: 0.85, g: 0.95, b: 1, a: 1
      });
    }
  }
  /** Konfete iz oba ruksaka prema sredini gola (tekst u sredini ostaje čitljiv). */
  confettiBurst(p: V3, far = 0) {
    const T = this.T;
    const cols = [0xe8ff3c, 0xffffff, 0xe8ff3c, 0xffc94a, 0xffffff];
    const c = new T.Color();
    for (let i = 0; i < 96; i++) {
      c.setHex(cols[i % cols.length]);
      // far = strana ruksaka koji kamera vidi; bliži je u uspravnom kadru često izvan slike
      const side = far && i % 4 !== 0 ? far : i % 2 ? 1 : -1;
      const sp = 1.6 + Math.random() * 2.6;
      this.confetti.add(
        {
          x: side * (GOAL_HALF + 0.2) + (Math.random() - 0.5) * 0.2, y: 0.55, z: p.z + (Math.random() - 0.5) * 0.3,
          vx: -side * sp * (0.25 + Math.random() * 0.35), vy: 4 + Math.random() * 4, vz: (Math.random() - 0.3) * 1.6,
          wx: (Math.random() - 0.5) * 14, wy: (Math.random() - 0.5) * 14, wz: (Math.random() - 0.5) * 14,
          max: 3.2 + Math.random() * 1.2, s: 0.8 + Math.random() * 0.6
        },
        c
      );
    }
  }
  clearFx() {
    this.dust.clear();
    this.glow.clear();
    this.confetti.clear();
  }

  // ── dijete ──
  placeKid(yaw: number, power: number) {
    this.kidAim.yaw = yaw;
    this.kidAim.power = power;
  }
  kick() {
    this.kickT = 0;
  }
  celebrate() {
    this.celebrateT = 0;
    this.sadT = -1;
  }
  sad() {
    this.sadT = 0;
    this.celebrateT = -1;
  }
  resetKid() {
    this.kickT = -1;
    this.celebrateT = -1;
    this.sadT = -1;
    this.kidAim.power = 0;
  }

  private animateKid(dt: number) {
    const k = this.kid;
    this.idleT += dt;
    const yaw = this.kidAim.yaw;
    const pw = this.kidAim.power;
    // dijete stoji lijevo-iza lopte (desnonožac), okrenuto u smjeru udarca
    const c = Math.cos(yaw);
    const s = Math.sin(yaw);
    const ox = -0.34;
    const oz = 0.42;
    const tx = BALL_START.x + ox * c - oz * s;
    const tz = BALL_START.z + oz * c + ox * s;
    k.root.position.x = damp(k.root.position.x, tx, 14, dt);
    k.root.position.z = damp(k.root.position.z, tz, 14, dt);
    const ry = -yaw;
    k.root.rotation.y = damp(k.root.rotation.y, ry, 14, dt);

    let legR = -pw * 1.05;
    let legL = pw * 0.15;
    let lean = -pw * 0.12;
    let armL = 0.12 + pw * 0.9;
    let armR = 0.12 + pw * 0.3;
    let armSwingL = 0;
    let armSwingR = 0;
    let bob = Math.sin(this.idleT * 2.4) * 0.008;
    let headTilt = 0;

    if (this.kickT >= 0) {
      this.kickT += dt;
      const t = this.kickT;
      if (t < 0.09) {
        const e = t / 0.09;
        legR = lerp(-1.1, 1.35, e * e);
        lean = lerp(-0.12, 0.18, e);
      } else if (t < 0.5) {
        const e = (t - 0.09) / 0.41;
        legR = lerp(1.35, 0, 1 - Math.pow(1 - e, 3));
        lean = lerp(0.18, 0, e);
      } else {
        this.kickT = -1;
      }
      armL = 1.0;
      armR = 0.3;
      armSwingR = -0.6;
    }
    if (this.celebrateT >= 0) {
      this.celebrateT += dt;
      const t = this.celebrateT;
      const up = Math.min(1, t / 0.18);
      armL = lerp(armL, 2.75, up);
      armR = lerp(armR, 2.75, up);
      bob = Math.abs(Math.sin(t * 9)) * 0.14 * Math.max(0, 1 - t / 1.8);
      legL = Math.sin(t * 9) * 0.2;
      legR = -Math.sin(t * 9) * 0.2;
      if (t > 2.2) this.celebrateT = -1;
    }
    if (this.sadT >= 0) {
      this.sadT += dt;
      headTilt = Math.min(1, this.sadT / 0.3) * 0.45;
      armL = 0.05;
      armR = 0.05;
      lean = 0.08;
      if (this.sadT > 2.5) this.sadT = -1;
    }
    k.legR.rotation.x = damp(k.legR.rotation.x, legR, this.kickT >= 0 ? 60 : 12, dt);
    k.legL.rotation.x = damp(k.legL.rotation.x, legL, 12, dt);
    k.body.rotation.x = damp(k.body.rotation.x, lean, 10, dt);
    k.armL.rotation.z = damp(k.armL.rotation.z, -armL, 10, dt);
    k.armR.rotation.z = damp(k.armR.rotation.z, armR, 10, dt);
    k.armL.rotation.x = damp(k.armL.rotation.x, armSwingL, 10, dt);
    k.armR.rotation.x = damp(k.armR.rotation.x, armSwingR, 10, dt);
    k.head.rotation.x = damp(k.head.rotation.x, headTilt, 8, dt);
    k.root.position.y = bob;
    this.kidShadow.position.set(k.root.position.x + 0.05, 0.011, k.root.position.z + 0.02);
  }

  // ── kamera ──
  shake(a: number) {
    this.shakeAmt = Math.min(0.5, this.shakeAmt + a);
  }
  setCam(shot: CamShot, snap = false) {
    this.target = shot;
    if (snap) {
      this.camPos.set(shot.pos.x, shot.pos.y, shot.pos.z);
      this.camLook.set(shot.look.x, shot.look.y, shot.look.z);
      this.camFov = shot.fov;
    }
  }

  /** Iscrtaj frejm. dt = stvarno vrijeme (s), simDt = vrijeme igre (usporeno). */
  render(dt: number, simDt: number) {
    const T = this.T;
    void T;
    this.animateKid(simDt);
    this.dust.update(simDt);
    this.glow.update(simDt);
    this.shards.update(simDt);
    this.confetti.update(simDt);

    // prsten
    if (this.ringT < 0.5) {
      this.ringT += dt;
      const k = this.ringT / 0.5;
      const sz = (this.ring.userData.size ?? 1) * (0.15 + 0.6 * (1 - Math.pow(1 - k, 3)));
      this.ring.scale.set(sz, sz, sz);
      this.ring.material.opacity = 0.6 * (1 - k);
      this.ring.visible = true;
    } else this.ring.visible = false;

    // lampa treperi jedva primjetno
    const fl = 1 + Math.sin(this.idleT * 13) * 0.015 + Math.sin(this.idleT * 7.3) * 0.02;
    this.lampLight.intensity = 9 * fl;
    this.lampSprite.material.opacity = 0.8 * fl;

    // kamera
    const t = this.target;
    const l = t.lambda;
    this.camPos.x = damp(this.camPos.x, t.pos.x, l, dt);
    this.camPos.y = damp(this.camPos.y, t.pos.y, l, dt);
    this.camPos.z = damp(this.camPos.z, t.pos.z, l, dt);
    this.camLook.x = damp(this.camLook.x, t.look.x, l * 1.4, dt);
    this.camLook.y = damp(this.camLook.y, t.look.y, l * 1.4, dt);
    this.camLook.z = damp(this.camLook.z, t.look.z, l * 1.4, dt);
    this.camFov = damp(this.camFov, t.fov, 6, dt);
    this.fovKick = damp(this.fovKick, 0, 7, dt);
    this.shakeAmt = Math.max(0, this.shakeAmt - dt * 1.4);
    const sh = this.shakeAmt * this.shakeAmt;
    const time = this.idleT;
    const cam = this.camera;
    cam.position.set(
      this.camPos.x + (Math.sin(time * 47) + Math.sin(time * 31)) * sh * 0.25,
      this.camPos.y + (Math.sin(time * 53) + Math.sin(time * 23)) * sh * 0.25,
      this.camPos.z
    );
    cam.lookAt(this.camLook);
    if (this.roll) cam.rotateZ(this.roll);
    const fov = this.camFov + this.fovKick;
    if (Math.abs(cam.fov - fov) > 0.01) {
      cam.fov = fov;
      cam.updateProjectionMatrix();
    }
    // veličina točkica (px) ovisi o visini platna i FOV-u
    const scale = (this.h * this.dpr * 0.5) / Math.tan((cam.fov * Math.PI) / 360);
    this.dust.mesh.material.uniforms.uScale.value = scale;
    this.glow.mesh.material.uniforms.uScale.value = scale;
    this.traj.material.uniforms.uScale.value = scale;

    this.renderer.render(this.scene, cam);
  }

  dispose() {
    const r = this.renderer;
    this.scene.traverse((o: any) => {
      if (o.geometry) o.geometry.dispose();
      const m = o.material;
      if (m) {
        const list = Array.isArray(m) ? m : [m];
        for (const mm of list) {
          for (const k of Object.keys(mm)) {
            const v = mm[k];
            if (v && v.isTexture) v.dispose();
          }
          if (mm.uniforms?.map?.value?.dispose) mm.uniforms.map.value.dispose();
          mm.dispose();
        }
      }
    });
    this.windowTex.forEach((t) => t.dispose());
    r.dispose();
    r.forceContextLoss?.();
  }
}
