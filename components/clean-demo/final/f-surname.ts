import * as THREE from "three";

/* ------------------------------------------------------------------ */
/*  FINAL — golemo obrisano prezime IZA dresa u fokusu, u samoj sceni.  */
/*  Ploha s teksturom (samo obris, Bebas, limeta ~0,3) stoji tik ispred */
/*  zida — između zida i dresova, iza sjena dresova. Ne piše dubinu,    */
/*  pa je dubinska oštrina ista kao zida (samo dašak — čitljivo).        */
/*  Kutija teksture = kutija <span class="ime-outline leading-[0.8]">   */
/*  na stranici dresa (font-size = em, visina 0,8 em), pa se prijelaz    */
/*  (View Transition) iz scene u stranicu poklapa.                       */
/*  Promjena dresa: staro prezime se pretopi i lagano klizne van, novo   */
/*  uđe iz smjera vožnje.                                                */
/* ------------------------------------------------------------------ */

const LS = 0.012; // letter-spacing (em) = .ime-outline
const STROKE_CSS = 1.25; // px obrisa na ekranu (= .ime-outline)
// FINAL: bijelo-sivo i tiše (bez limete — jedan neon po ekranu)
const OPACITY = 0.17;

export type NameBox = { cx: number; cy: number; font: number; name: string };

type Layer = {
  mesh: THREE.Mesh;
  mat: THREE.ShaderMaterial;
  tex: THREE.CanvasTexture | null;
  name: string;
  op: number;
  target: number;
  x: number; // pomak (udio širine kadra)
  xTarget: number;
  /** em u px na ekranu + širina teksta u em (za kutiju) */
  em: number;
  wEm: number;
};

const FRAG = /* glsl */ `
  uniform sampler2D tMap; uniform vec3 uCol; uniform float uOp;
  varying vec2 vUv;
  void main() {
    float a = texture2D(tMap, vUv).a * uOp;
    if (a < 0.002) discard;
    gl_FragColor = vec4(uCol, a);
    #include <colorspace_fragment>
  }`;
const VERT = /* glsl */ `
  varying vec2 vUv;
  void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`;

function fontFamily() {
  try {
    const v = getComputedStyle(document.body).getPropertyValue("--font-bebas").trim();
    if (v) return `${v}, "Bebas Neue", sans-serif`;
  } catch {
    /* bez tijela */
  }
  return `"Bebas Neue", sans-serif`;
}

/** Širina natpisa u em (s razmakom slova kao .ime-outline). */
export function nameWidthEm(name: string, fam = fontFamily()) {
  const ctx = document.createElement("canvas").getContext("2d");
  if (!ctx) return name.length * 0.43;
  ctx.font = `400 100px ${fam}`;
  return ctx.measureText(name).width / 100 + LS * name.length;
}

export type SurnamePlacement = {
  /** središte kutije u svijetu (na zidu) */
  center: THREE.Vector3;
  /** px na ekranu po metru na ravnini zida */
  pxPerM: number;
  /** ciljana visina kutije (0,8 em) u px */
  boxPx: number;
  /** najveća širina natpisa u px */
  maxWPx: number;
  /** px širina kadra (za klizanje) */
  frameWPx: number;
  dpr: number;
  /** "center": center je središte kutije; "bottom": center je donji rub kutije (natpis iznad) */
  anchor?: "center" | "bottom";
};

export class SurnameLayer {
  private layers: Layer[] = [];
  private group = new THREE.Group();
  private fam = fontFamily();
  private ready: Promise<unknown>;
  private place: SurnamePlacement | null = null;
  private wanted: { name: string; dir: number } | null = null;
  private lastT = -1;
  private col = new THREE.Color("#e9e9e6");

  constructor(scene: THREE.Scene, z: number, private reduced: boolean) {
    this.group.position.z = z;
    this.group.renderOrder = -2;
    scene.add(this.group);
    this.ready = Promise.race([document.fonts.load(`400 200px ${this.fam}`, "ABCDEFGHIJKLMNOPRSŠTUVZŽĆČĐ"), new Promise((r) => setTimeout(r, 2500))]).catch(() => undefined);
  }

  /** Kutija trenutnog prezimena u px platna (za DOM kopiju u prijelazu). */
  box(cam: THREE.Camera, W: number, H: number): NameBox | null {
    const cur = this.layers.find((l) => l.target > 0.5);
    if (!cur || !this.place) return null;
    const p = cur.mesh.getWorldPosition(new THREE.Vector3()).project(cam);
    return { cx: ((p.x + 1) / 2) * W, cy: ((1 - p.y) / 2) * H, font: cur.em, name: cur.name };
  }

  current() {
    return this.layers.find((l) => l.target > 0.5)?.name ?? this.wanted?.name ?? "";
  }

  setPlacement(p: SurnamePlacement) {
    const same =
      this.place &&
      Math.abs(this.place.boxPx - p.boxPx) < 0.5 &&
      Math.abs(this.place.maxWPx - p.maxWPx) < 0.5 &&
      Math.abs(this.place.pxPerM - p.pxPerM) < 1e-3 &&
      this.place.anchor === p.anchor &&
      this.place.dpr === p.dpr;
    this.place = p;
    this.group.position.set(p.center.x, p.center.y, p.center.z);
    if (!same) {
      // nova veličina kadra → iscrtaj aktivne natpise ponovno (oštro)
      for (const l of this.layers) if (l.target > 0.5 || l.op > 0.02) void this.paint(l, l.name);
    }
    if (this.wanted) {
      const w = this.wanted;
      this.wanted = null;
      this.set(w.name, w.dir);
    }
  }

  set(name: string, dir: number) {
    if (!this.place) {
      this.wanted = { name, dir };
      return;
    }
    const cur = this.layers.find((l) => l.target > 0.5);
    if (cur && cur.name === name) return;
    const slide = this.reduced ? 0 : 0.045;
    for (const l of this.layers)
      if (l.target > 0) {
        l.target = 0;
        l.xTarget = -Math.sign(dir || 1) * slide * 0.6;
      }
    let l = this.layers.find((x) => x.target === 0 && x.op < 0.02);
    if (!l) {
      if (this.layers.length >= 3) {
        l = this.layers.reduce((a, b) => (a.op < b.op ? a : b));
      } else {
        const mat = new THREE.ShaderMaterial({
          uniforms: { tMap: { value: null }, uCol: { value: this.col }, uOp: { value: 0 } },
          vertexShader: VERT,
          fragmentShader: FRAG,
          transparent: true,
          depthWrite: false,
          depthTest: true,
          toneMapped: false,
        });
        const mesh = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), mat);
        mesh.renderOrder = -2; // nakon zida i logotipa, prije sjena dresova (-1) i odjeće
        mesh.layers.set(1); // samo glavna kamera (ne u odrazu poda)
        mesh.frustumCulled = false;
        mesh.visible = false;
        this.group.add(mesh);
        l = { mesh, mat, tex: null, name: "", op: 0, target: 0, x: 0, xTarget: 0, em: 0, wEm: 1 };
        this.layers.push(l);
      }
    }
    l.name = name;
    l.target = 1;
    l.op = 0;
    l.x = Math.sign(dir || 1) * slide;
    l.xTarget = 0;
    l.mesh.visible = false;
    l.tex?.dispose();
    l.tex = null;
    l.mat.uniforms.tMap.value = null;
    void this.paint(l, name);
  }

  private async paint(l: Layer, name: string) {
    await this.ready;
    const p = this.place;
    if (!p || l.name !== name) return;
    const wEm = nameWidthEm(name, this.fam);
    // em (px na ekranu): kutija 0,8 em = boxPx, ali natpis ne šire od maxWPx
    const em = Math.max(24, Math.min(p.boxPx / 0.8, p.maxWPx / wEm));
    const k = Math.min(p.dpr, 4096 / (wEm * em + 40));
    const F = em * k;
    const stroke = Math.max(1.4, STROKE_CSS * k);
    const padX = Math.ceil(stroke * 2 + 4);
    const padY = Math.ceil(F * 0.22 + stroke * 2);
    const cw = Math.ceil(wEm * F + padX * 2);
    const ch = Math.ceil(F * 0.8 + padY * 2);
    const cv = document.createElement("canvas");
    cv.width = cw;
    cv.height = ch;
    const ctx = cv.getContext("2d");
    if (!ctx) return;
    ctx.font = `400 ${F}px ${this.fam}`;
    const m = ctx.measureText(name);
    const fa = m.fontBoundingBoxAscent || F * 0.9;
    const fd = m.fontBoundingBoxDescent || F * 0.3;
    // CSS: line-height 0,8 → područje sadržaja (fa+fd) centrirano u retku visine 0,8 em
    const baseY = padY + (F * 0.8 - (fa + fd)) / 2 + fa;
    ctx.lineJoin = "round";
    ctx.strokeStyle = "#ffffff";
    ctx.lineWidth = stroke;
    const c2 = ctx as CanvasRenderingContext2D & { letterSpacing?: string };
    if ("letterSpacing" in c2) {
      c2.letterSpacing = `${LS * F}px`;
      ctx.strokeText(name, padX, baseY);
    } else {
      let x = padX;
      for (const chr of name) {
        ctx.strokeText(chr, x, baseY);
        x += ctx.measureText(chr).width + LS * F;
      }
    }
    if (l.name !== name) return;
    const tex = new THREE.CanvasTexture(cv);
    tex.colorSpace = THREE.NoColorSpace;
    tex.minFilter = THREE.LinearMipmapLinearFilter;
    tex.magFilter = THREE.LinearFilter;
    tex.generateMipmaps = true;
    tex.anisotropy = 8;
    const fresh = !l.tex;
    l.tex?.dispose();
    l.tex = tex;
    if (fresh && l.target > 0.5) l.op = 0;
    l.mat.uniforms.tMap.value = tex;
    l.em = em;
    l.wEm = wEm;
    // ploha = cijelo platno teksture; px → m na ravnini zida
    const toM = 1 / (k * p.pxPerM);
    l.mesh.scale.set(cw * toM, ch * toM, 1);
    l.mesh.position.y = p.anchor === "bottom" ? (0.4 * em) / p.pxPerM : 0;
    l.mesh.visible = true;
  }

  /** Svaki kadar. Vraća true dok traje pretapanje (traži novi kadar). */
  tick(now: number) {
    const dt = this.lastT < 0 ? 0.016 : Math.min(0.05, (now - this.lastT) / 1000);
    this.lastT = now;
    const p = this.place;
    let busy = false;
    for (const l of this.layers) {
      const kOp = 1 - Math.exp(-dt * (l.target > l.op ? 9 : 13));
      const kX = 1 - Math.exp(-dt * 8);
      if (this.reduced) {
        l.op = l.target;
        l.x = l.xTarget;
      } else {
        l.op += (l.target - l.op) * kOp;
        l.x += (l.xTarget - l.x) * kX;
      }
      if (Math.abs(l.target - l.op) < 0.003) l.op = l.target;
      if (Math.abs(l.xTarget - l.x) < 1e-4) l.x = l.xTarget;
      if (l.op !== l.target || l.x !== l.xTarget) busy = true;
      l.mat.uniforms.uOp.value = OPACITY * l.op * (l.tex ? 1 : 0);
      if (p) l.mesh.position.x = (l.x * p.frameWPx) / p.pxPerM;
      if (l.op < 0.002 && l.target === 0) l.mesh.visible = false;
      else if (l.tex) l.mesh.visible = true;
    }
    return busy;
  }

  dispose() {
    for (const l of this.layers) {
      l.tex?.dispose();
      l.mat.dispose();
      l.mesh.geometry.dispose();
    }
    this.group.removeFromParent();
    this.layers = [];
  }
}
