// Lagana simulacija tkanine za dres na vješalici (bez biblioteka).
//
// Grube čvorne točke (CLOTH_C × CLOTH_R) preko slike dresa; svaka nosi POMAK od mirnog
// oblika (x, y, z u metrima, prostor `swing` grupe). Shader garmentMaterial bilinearno
// interpolira pomake na gustu mrežu (48×64 / 24×32) → jedna uniforma, bez CPU geometrije.
//  - prikvačeno uz vješalicu/ramena (redovi iznad `pinV` ne miču se), ispod sve slobodnije
//  - svaki čvor: opruga prema mirnom obliku (porub mekši od ramena → porub kasni i smiruje
//    se zadnji), prigušenje, sprezanje sa susjedima (Laplace) → glatki valovi, ne "šum"
//  - pokretači: ubrzanje i brzina šipke (inercija + otpor zraka), lagano "disanje" u
//    mirovanju (mm), sitno lepršanje dok se šipka miče; rukavi su mekši (njišu se više)
//  - y nije dinamičan: porub koji se zanjiše se malo podigne (njihalo: Δy ≈ (x²+z²)/2L)
// Stabilno: polu-implicitni Euler s pod-koracima ≤ 8 ms, ograničeni pomaci.
export const CLOTH_C = 7;
export const CLOTH_R = 10;
export const CLOTH_N = CLOTH_C * CLOTH_R;

const smooth = (a: number, b: number, x: number) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

export type ClothDrive = {
  /** ubrzanje šipke duž lokalne x osi (m/s²) */
  ax: number;
  /** brzina šipke duž lokalne x osi (m/s) */
  vx: number;
  /** vrijeme (s) za disanje / lepršanje */
  t: number;
  /** 0..1 jačina disanja u mirovanju (0 = reduced motion) */
  idle: number;
};

export class ClothSim {
  /** pomaci čvorova (x, y, z) — dijeli se izravno s uniformom shadera */
  readonly off = new Float32Array(CLOTH_N * 3);
  private vel = new Float32Array(CLOTH_N * 3);
  private free = new Float32Array(CLOTH_N); // 0 = prikvačeno, 1 = slobodno
  private k = new Float32Array(CLOTH_N);
  private c = new Float32Array(CLOTH_N);
  private gain = new Float32Array(CLOTH_N);
  private len = new Float32Array(CLOTH_N); // duljina "njihala" od ramena (m)
  private phase: number;
  private w: number;
  private h: number;
  /** najveći pomak/brzina u zadnjem koraku (za spavanje petlje) */
  energy = 0;

  /**
   * w, h = mjere slike (m); pinV = udio visine slike (odozgo) do kojeg je tkanina
   * prikvačena (kuka + ramena vješalice); seed = faza disanja.
   */
  constructor(w: number, h: number, pinV: number, seed = 0) {
    this.w = w;
    this.h = h;
    this.phase = seed * 2.399;
    for (let j = 0; j < CLOTH_R; j++) {
      const v = j / (CLOTH_R - 1);
      const fr = smooth(pinV - 0.02, pinV + 0.3, v);
      for (let i = 0; i < CLOTH_C; i++) {
        const n = j * CLOTH_C + i;
        const edge = i === 0 || i === CLOTH_C - 1 ? 1 : 0;
        // rukavi: vanjski stupci odmah ispod ramena — mekši i "lakši"
        const sleeve = edge * smooth(pinV - 0.02, pinV + 0.08, v) * (1 - smooth(pinV + 0.3, pinV + 0.45, v));
        this.free[n] = fr;
        // porub mekši (kasni, smiruje se zadnji), gornji dio krući
        const k = 64 - 40 * fr - 14 * sleeve;
        this.k[n] = k;
        this.c[n] = 2 * Math.sqrt(k) * (0.24 - 0.07 * fr);
        this.gain[n] = fr * (1 + 0.7 * sleeve);
        this.len[n] = Math.max(0.12, (v - pinV) * h + 0.12);
      }
    }
  }

  reset() {
    this.off.fill(0);
    this.vel.fill(0);
    this.energy = 0;
  }

  /** Udarac (dodir/hover): x = −1..1 vodoravno mjesto udarca, s = jačina (m/s). */
  kick(x: number, s: number) {
    for (let n = 0; n < CLOTH_N; n++) {
      const i = n % CLOTH_C;
      const xi = (i / (CLOTH_C - 1)) * 2 - 1;
      const f = this.free[n] * Math.exp(-((xi - x) ** 2) * 1.5);
      this.vel[n * 3 + 2] -= s * f;
      this.vel[n * 3] += s * 0.4 * f * Math.sign(xi - x || 1);
    }
  }

  step(dt: number, d: ClothDrive) {
    const sub = Math.max(1, Math.ceil(dt / 0.008));
    const h = dt / sub;
    const ax = Math.max(-9, Math.min(9, d.ax));
    const vx = Math.max(-6, Math.min(6, d.vx));
    const C = CLOTH_C;
    const off = this.off;
    const vel = this.vel;
    const KN = 38; // sprezanje susjeda
    const mx = 0.1 * this.h; // najveći pomak x
    const mz = 0.05;
    const flutter = Math.min(1, Math.abs(vx) / 3);
    for (let s = 0; s < sub; s++) {
      const t = d.t + s * h;
      for (let n = 0; n < CLOTH_N; n++) {
        const fr = this.free[n];
        if (fr < 1e-3) continue;
        const i = n % C;
        const j = (n - i) / C;
        const o = n * 3;
        // Laplace (4 susjeda; prikvačeni susjedi drže 0)
        let lx = 0;
        let lz = 0;
        let deg = 0;
        if (i > 0) {
          lx += off[o - 3];
          lz += off[o - 1];
          deg++;
        }
        if (i < C - 1) {
          lx += off[o + 3];
          lz += off[o + 5];
          deg++;
        }
        if (j > 0) {
          lx += off[o - C * 3];
          lz += off[o - C * 3 + 2];
          deg++;
        }
        if (j < CLOTH_R - 1) {
          lx += off[o + C * 3];
          lz += off[o + C * 3 + 2];
          deg++;
        }
        lx -= deg * off[o];
        lz -= deg * off[o + 2];
        const g = this.gain[n];
        // inercija (ubrzanje šipke → porub zaostaje) + otpor zraka (suprotno brzini)
        let fx = (-ax * 0.16 - vx * 0.3) * g;
        // disanje: spori val odozdo prema gore (mm), lepršanje dok se miče
        const ph = this.phase + j * 0.55 + i * 0.35;
        let fz = d.idle * fr * (0.16 * Math.sin(t * 1.25 + ph) + 0.08 * Math.sin(t * 2.1 + ph * 1.7));
        fx += d.idle * fr * 0.05 * Math.sin(t * 0.9 + ph * 0.6);
        fz += flutter * g * 0.55 * Math.sin(t * 7.5 + j * 1.1 + i * 0.8);
        const k = this.k[n];
        const c = this.c[n];
        const ax2 = -k * off[o] - c * vel[o] + KN * lx + fx;
        const az2 = -k * off[o + 2] - c * vel[o + 2] + KN * lz + fz;
        vel[o] += ax2 * h;
        vel[o + 2] += az2 * h;
      }
      for (let n = 0; n < CLOTH_N; n++) {
        const fr = this.free[n];
        const o = n * 3;
        if (fr < 1e-3) {
          off[o] = off[o + 1] = off[o + 2] = 0;
          vel[o] = vel[o + 2] = 0;
          continue;
        }
        off[o] = Math.max(-mx, Math.min(mx, off[o] + vel[o] * h));
        off[o + 2] = Math.max(-mz, Math.min(mz, off[o + 2] + vel[o + 2] * h));
      }
    }
    let e = 0;
    for (let n = 0; n < CLOTH_N; n++) {
      const o = n * 3;
      const x = off[o];
      const z = off[o + 2];
      off[o + 1] = (x * x + z * z) / (2 * this.len[n]);
      e = Math.max(e, Math.abs(x), Math.abs(z), Math.abs(vel[o]) * 0.05, Math.abs(vel[o + 2]) * 0.05);
    }
    this.energy = e;
  }

  /** Jeftino (mobitel, dresovi izvan fokusa): samo zaostajanje poruba za brzinom šipke. */
  lag(vx: number) {
    const v = Math.max(-6, Math.min(6, vx));
    let e = 0;
    for (let n = 0; n < CLOTH_N; n++) {
      const o = n * 3;
      const x = -v * 0.012 * this.gain[n];
      this.off[o] += (x - this.off[o]) * 0.2;
      this.off[o + 1] = (this.off[o] * this.off[o]) / (2 * this.len[n]);
      this.off[o + 2] *= 0.85;
      this.vel[o] = this.vel[o + 2] = 0;
      e = Math.max(e, Math.abs(this.off[o]), Math.abs(this.off[o + 2]));
    }
    this.energy = e;
  }
}
