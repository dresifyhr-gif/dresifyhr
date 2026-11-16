// PAZI PROZOR! — razina i fizika lopte (bez three.js i bez importa, pa se
// može vrtjeti i u Nodeu za balans: `node physics-balance.mjs`).
//
// Koordinate: metri, y gore, igrač puca prema -z.
// Lopta = kugla; prepreke = kutije (s rotacijom oko y). Nema fizičke biblioteke.

export type V3 = { x: number; y: number; z: number };

export type Kind = "wall" | "car" | "dumpster" | "pole" | "bench" | "backpack";

export type Box = {
  id: string;
  kind: Kind;
  /** središte */
  cx: number;
  cy: number;
  cz: number;
  /** pola dimenzija u lokalnom prostoru kutije */
  hx: number;
  hy: number;
  hz: number;
  /** rotacija oko y (rad) */
  yaw: number;
  /** odskočnost (0..1) */
  e: number;
  /** trenje uz površinu pri udarcu (0..1) */
  mu: number;
  /** računa li se udarac u ovu prepreku kao odbijanje (Bankica, Bilijar...) */
  counts: boolean;
};

// ── Razina 1: dvorište između zgrada ────────────────────────────────────
export const BALL_R = 0.15;
export const GRAVITY = 12.5;

export const BALL_START: V3 = { x: 0, y: BALL_R, z: 7 };

export const COURT = {
  left: -8,
  right: 8,
  back: -17,
  /** iza igrača — lopta koja ode ovamo je promašaj */
  front: 15
};

/** Gol: dva ruksaka. Unutarnji rubovi su na ±GOAL_HALF. */
export const GOAL_Z = -13.4;
export const GOAL_HALF = 1.35;
/** Zamišljena prečka (dječje pravilo: "do glave"). */
export const GOAL_TOP = 1.9;
export const BACKPACK = { w: 0.42, h: 0.5, d: 0.3 };

/** Bakin prozor: desna zgrada, treći red prozora (prizemlje, 1., 2. kat). */
export const FLOOR_H = 2.3;
export const BASE_H = 0.4;
export const WINDOW = { x: 8, z: -5.6, y: BASE_H + FLOOR_H * 2 + 1.2, w: 1.75, h: 1.45 };

export const CAR = { x: 0.35, z: -8.4, yaw: 0.1, len: 3.6, wid: 1.6 };
export const DUMPSTER = { x: -6.9, z: -2.4, yaw: -0.08, w: 1.25, d: 2.1, h: 1.32 };
export const LAMP = { x: 6.6, z: 1.6 };
export const BENCH = { x: 7.25, z: -11.2, w: 0.6, d: 2.2, h: 0.48 };

function box(id: string, kind: Kind, cx: number, cy: number, cz: number, hx: number, hy: number, hz: number, yaw = 0, e = 0.7, mu = 0.12, counts = true): Box {
  return { id, kind, cx, cy, cz, hx, hy, hz, yaw, e, mu, counts };
}

export function buildColliders(): Box[] {
  const W = 30;
  const H = 40;
  const list: Box[] = [
    // zgrade (debele kutije da lopta ne može "tunelirati")
    box("left", "wall", COURT.left - 5, H / 2, 0, 5, H / 2, W, 0, 0.72, 0.1),
    box("right", "wall", COURT.right + 5, H / 2, 0, 5, H / 2, W, 0, 0.72, 0.1),
    box("back", "wall", 0, H / 2, COURT.back - 5, 20, H / 2, 5, 0, 0.72, 0.1),
    // stari auto: donji dio (karoserija + kotači) i kabina
    box("car", "car", CAR.x, 0.52, CAR.z, CAR.len / 2, 0.52, CAR.wid / 2, CAR.yaw, 0.5, 0.18),
    box("car-top", "car", CAR.x - Math.cos(CAR.yaw) * 0.22, 1.25, CAR.z + Math.sin(CAR.yaw) * 0.22, 0.98, 0.24, 0.66, CAR.yaw, 0.45, 0.2),
    // kontejner
    box("dumpster", "dumpster", DUMPSTER.x, DUMPSTER.h / 2, DUMPSTER.z, DUMPSTER.w / 2, DUMPSTER.h / 2, DUMPSTER.d / 2, DUMPSTER.yaw, 0.62, 0.1),
    // stup javne rasvjete (tanka kutija)
    box("lamp", "pole", LAMP.x, 2.5, LAMP.z, 0.07, 2.5, 0.07, 0, 0.6, 0.05),
    // klupa uz desni zid
    box("bench", "bench", BENCH.x, BENCH.h / 2, BENCH.z, BENCH.w / 2, BENCH.h / 2, BENCH.d / 2, 0, 0.45, 0.2),
    // ruksaci = stative
    box("bp-l", "backpack", -GOAL_HALF - BACKPACK.w / 2, BACKPACK.h / 2, GOAL_Z, BACKPACK.w / 2, BACKPACK.h / 2, BACKPACK.d / 2, 0.12, 0.25, 0.4, false),
    box("bp-r", "backpack", GOAL_HALF + BACKPACK.w / 2, BACKPACK.h / 2, GOAL_Z, BACKPACK.w / 2, BACKPACK.h / 2, BACKPACK.d / 2, -0.1, 0.25, 0.4, false)
  ];
  return list;
}

// ── Stilovi i bodovi ────────────────────────────────────────────────────
export type Style = { id: string; name: string; points: number };

export const STYLES = {
  direct: { id: "direct", name: "Pravac", points: 100 },
  curl: { id: "curl", name: "Zavrnuta", points: 150 },
  bank: { id: "bank", name: "Bankica", points: 250 },
  billiard: { id: "billiard", name: "Bilijar", points: 500 },
  master: { id: "master", name: "Majstor s kvarta", points: 1000 }
} satisfies Record<string, Style>;

/** Koliko jako mora lopta zakriviti putanju da bi se "Pravac" računao kao "Zavrnuta". */
export const CURL_STYLE_MIN = 2.6;

export function styleFor(bounces: number, curl: number): Style {
  if (bounces >= 3) return STYLES.master;
  if (bounces === 2) return STYLES.billiard;
  if (bounces === 1) return STYLES.bank;
  return Math.abs(curl) >= CURL_STYLE_MIN ? STYLES.curl : STYLES.direct;
}

// ── Udarac iz poteza prstom ─────────────────────────────────────────────
export type ShotInput = {
  /** smjer u ravnini (rad), 0 = ravno naprijed (-z), + = desno */
  yaw: number;
  /** 0..1 */
  power: number;
  /** -1..1, + = lopta skreće udesno */
  curve: number;
};

export const SHOT = {
  minSpeed: 8,
  maxSpeed: 25,
  /** kut dizanja (stupnjevi) pri najmanjoj i najvećoj snazi */
  minLoft: 2.5,
  maxLoft: 35,
  loftExp: 3.2,
  /** sidespin (rad/s) za curve = ±1 */
  maxSpin: 34,
  /** Magnus koeficijent */
  magnus: 0.0135,
  maxYaw: 1.25
};

export function shotVelocity(s: ShotInput): { v: V3; spin: number } {
  const p = Math.max(0, Math.min(1, s.power));
  const speed = SHOT.minSpeed + (SHOT.maxSpeed - SHOT.minSpeed) * p;
  const loft = ((SHOT.minLoft + (SHOT.maxLoft - SHOT.minLoft) * Math.pow(p, SHOT.loftExp)) * Math.PI) / 180;
  const yaw = Math.max(-SHOT.maxYaw, Math.min(SHOT.maxYaw, s.yaw));
  const h = Math.cos(loft) * speed;
  // + yaw = desno (+x), naprijed = -z
  const v = { x: Math.sin(yaw) * h, y: Math.sin(loft) * speed, z: -Math.cos(yaw) * h };
  // curve > 0 → skreće udesno. Za kretanje prema -z, ω_y < 0 daje ax > 0.
  const spin = -Math.max(-1, Math.min(1, s.curve)) * SHOT.maxSpin;
  return { v, spin };
}

// ── Simulacija ──────────────────────────────────────────────────────────
export type SimEvent =
  | { type: "hit"; kind: Kind; id: string; impact: number; counts: boolean; pos: V3; n: V3; bounce: number }
  | { type: "ground"; impact: number; pos: V3 }
  | { type: "goal"; pos: V3; style: Style; bounces: number }
  | { type: "over"; pos: V3 }
  | { type: "window"; pos: V3 }
  | { type: "stop"; reason: "rest" | "out" | "time" };

export type Ball = {
  p: V3;
  v: V3;
  /** sidespin oko y (rad/s) */
  spin: number;
  /** vizualna rotacija (os, kut) — računa se iz brzine */
  t: number;
  bounces: number;
  /** ukupna bočna promjena brzine zbog Magnusa (m/s) — za "Zavrnuta" */
  curl: number;
  done: boolean;
  goal: boolean;
  lastHitId: string;
  lastHitT: number;
  restT: number;
  onGround: boolean;
};

export function newBall(): Ball {
  return {
    p: { ...BALL_START },
    v: { x: 0, y: 0, z: 0 },
    spin: 0,
    t: 0,
    bounces: 0,
    curl: 0,
    done: false,
    goal: false,
    lastHitId: "",
    lastHitT: -1,
    restT: 0,
    onGround: true
  };
}

export function launch(b: Ball, s: ShotInput) {
  const { v, spin } = shotVelocity(s);
  b.v = v;
  b.spin = spin;
  b.t = 0;
  b.bounces = 0;
  b.curl = 0;
  b.done = false;
  b.goal = false;
  b.lastHitId = "";
  b.lastHitT = -1;
  b.restT = 0;
  b.onGround = false;
}

const SUB = 4;
const DRAG = 0.011; // kvadratni otpor zraka
const GROUND_E = 0.52;
const ROLL_DECEL = 0.9; // m/s² kotrljanje po asfaltu
const ROLL_DAMP = 0.24;
const MAX_T = 7.5;

/** Jedan korak simulacije (dt u sekundama). Događaje dodaje u `out`. */
export function stepBall(b: Ball, boxes: Box[], dt: number, out: SimEvent[]) {
  if (b.done) return;
  const h = dt / SUB;
  for (let i = 0; i < SUB && !b.done; i++) sub(b, boxes, h, out);
  b.t += dt;
  if (!b.done && b.t > MAX_T) {
    b.done = true;
    out.push({ type: "stop", reason: "time" });
  }
}

function sub(b: Ball, boxes: Box[], h: number, out: SimEvent[]) {
  const v = b.v;
  const p = b.p;
  const prevZ = p.z;
  const prevX = p.x;
  const prevY = p.y;

  // gravitacija
  v.y -= GRAVITY * h;
  // Magnus (sidespin oko y): a = k · (ω × v) = k·(ω·vz, 0, −ω·vx)
  if (!b.onGround || Math.abs(b.spin) > 0.5) {
    const k = SHOT.magnus * b.spin * (b.onGround ? 0.25 : 1);
    const ax = k * v.z;
    const az = -k * v.x;
    v.x += ax * h;
    v.z += az * h;
    if (!b.onGround) b.curl += Math.hypot(ax, az) * h; // ukupna bočna promjena brzine (m/s)
  }
  // otpor zraka
  const sp = Math.hypot(v.x, v.y, v.z);
  if (sp > 0) {
    const d = Math.max(0, 1 - DRAG * sp * h);
    v.x *= d;
    v.y *= d;
    v.z *= d;
  }
  b.spin *= Math.exp(-0.45 * h);

  p.x += v.x * h;
  p.y += v.y * h;
  p.z += v.z * h;

  // tlo
  if (p.y <= BALL_R) {
    p.y = BALL_R;
    if (v.y < 0) {
      const imp = -v.y;
      if (imp > 1.1) {
        v.y = imp * GROUND_E;
        v.x *= 0.9;
        v.z *= 0.9;
        b.spin *= 0.6;
        b.onGround = false;
        out.push({ type: "ground", impact: imp, pos: { ...p } });
      } else {
        v.y = 0;
        b.onGround = true;
      }
    }
  } else if (p.y > BALL_R + 0.02) {
    b.onGround = false;
  }
  if (b.onGround) {
    const hs = Math.hypot(v.x, v.z);
    if (hs > 0) {
      const ns = Math.max(0, hs - ROLL_DECEL * h - hs * ROLL_DAMP * h);
      v.x *= ns / hs;
      v.z *= ns / hs;
    }
    b.spin *= Math.exp(-3 * h);
  }

  // prepreke
  for (const bx of boxes) collide(b, bx, out);

  // gol / preko
  if (!b.goal && prevZ > GOAL_Z && p.z <= GOAL_Z) {
    const k = (prevZ - GOAL_Z) / Math.max(1e-6, prevZ - p.z);
    const gx = prevX + (p.x - prevX) * k;
    const gy = prevY + (p.y - prevY) * k;
    if (Math.abs(gx) < GOAL_HALF - BALL_R * 0.3) {
      const at = { x: gx, y: gy, z: GOAL_Z };
      if (gy < GOAL_TOP) {
        b.goal = true;
        out.push({ type: "goal", pos: at, style: styleFor(b.bounces, b.curl), bounces: b.bounces });
      } else {
        out.push({ type: "over", pos: at });
      }
    }
  }

  // kraj: lopta stoji, izašla je, ili je otišla preko zgrada
  const hs = Math.hypot(v.x, v.z);
  if (b.onGround && hs < 0.35) b.restT += h;
  else b.restT = 0;
  if (b.restT > 0.25) {
    b.done = true;
    out.push({ type: "stop", reason: "rest" });
  } else if (p.z > COURT.front || p.y > 40 || p.z < COURT.back - 3) {
    b.done = true;
    out.push({ type: "stop", reason: "out" });
  }
}

function collide(b: Ball, bx: Box, out: SimEvent[]) {
  const p = b.p;
  const v = b.v;
  const c = Math.cos(bx.yaw);
  const s = Math.sin(bx.yaw);
  // u lokalni prostor kutije (rotacija oko y za −yaw)
  const dx = p.x - bx.cx;
  const dy = p.y - bx.cy;
  const dz = p.z - bx.cz;
  const lx = c * dx - s * dz;
  const lz = s * dx + c * dz;
  const ly = dy;
  const qx = Math.max(-bx.hx, Math.min(bx.hx, lx));
  const qy = Math.max(-bx.hy, Math.min(bx.hy, ly));
  const qz = Math.max(-bx.hz, Math.min(bx.hz, lz));
  let nx = lx - qx;
  let ny = ly - qy;
  let nz = lz - qz;
  let d2 = nx * nx + ny * ny + nz * nz;
  if (d2 > BALL_R * BALL_R) return;
  let pen: number;
  if (d2 > 1e-10) {
    const d = Math.sqrt(d2);
    nx /= d;
    ny /= d;
    nz /= d;
    pen = BALL_R - d;
  } else {
    // središte unutar kutije → izbaci po najmanjem prodoru
    const px = bx.hx - Math.abs(lx);
    const py = bx.hy - Math.abs(ly);
    const pz = bx.hz - Math.abs(lz);
    nx = ny = nz = 0;
    if (px < py && px < pz) {
      nx = Math.sign(lx) || 1;
      pen = px + BALL_R;
    } else if (py < pz) {
      ny = Math.sign(ly) || 1;
      pen = py + BALL_R;
    } else {
      nz = Math.sign(lz) || 1;
      pen = pz + BALL_R;
    }
    d2 = 0;
  }
  // normala natrag u svijet (rotacija za +yaw)
  const wx = c * nx + s * nz;
  const wz = -s * nx + c * nz;
  const wy = ny;
  p.x += wx * pen;
  p.y += wy * pen;
  p.z += wz * pen;
  const vn = v.x * wx + v.y * wy + v.z * wz;
  if (vn >= 0) return;
  const imp = -vn;
  // tangencijalni dio
  const tx = v.x - vn * wx;
  const ty = v.y - vn * wy;
  const tz = v.z - vn * wz;
  const e = imp < 0.6 ? 0 : bx.e;
  const keep = 1 - bx.mu;
  v.x = tx * keep - vn * e * wx;
  v.y = ty * keep - vn * e * wy;
  v.z = tz * keep - vn * e * wz;
  b.spin *= 0.35;
  if (wy > 0.7) b.onGround = false;

  // bakin prozor
  if (bx.id === "right") {
    if (Math.abs(p.z - WINDOW.z) < WINDOW.w / 2 + BALL_R * 0.4 && Math.abs(p.y - WINDOW.y) < WINDOW.h / 2 + BALL_R * 0.4) {
      b.done = true;
      out.push({ type: "window", pos: { x: COURT.right - 0.02, y: p.y, z: p.z } });
      return;
    }
  }

  const fresh = b.lastHitId !== bx.id || b.t - b.lastHitT > 0.18;
  b.lastHitId = bx.id;
  b.lastHitT = b.t;
  if (imp < 1.2 || !fresh) return;
  const counts = bx.counts && !b.goal && imp > 2.2;
  if (counts) b.bounces++;
  out.push({ type: "hit", kind: bx.kind, id: bx.id, impact: imp, counts, pos: { ...p }, n: { x: wx, y: wy, z: wz }, bounce: b.bounces });
}

/** Predviđanje putanje za nišanjenje: točke svakih `every` s, najviše `seconds` s,
 *  do malo iza prvog odbijanja. Vraća broj točaka i pogađa li putanja bakin prozor. */
export function predict(s: ShotInput, boxes: Box[], seconds: number, every: number, outPts: V3[]): { n: number; window: boolean } {
  const b = newBall();
  launch(b, s);
  const ev: SimEvent[] = [];
  const dt = 1 / 120;
  let n = 0;
  let acc = every;
  let after = -1;
  let win = false;
  const push = () => {
    if (n < outPts.length) {
      const o = outPts[n];
      o.x = b.p.x;
      o.y = b.p.y;
      o.z = b.p.z;
      n++;
    }
  };
  for (let t = 0; t < seconds && !b.done; t += dt) {
    stepBall(b, boxes, dt, ev);
    for (const e of ev) {
      if (e.type === "hit" && e.counts && after < 0) after = 0.12;
      if (e.type === "window") win = true;
    }
    ev.length = 0;
    acc += dt;
    if (acc >= every) {
      acc = 0;
      push();
    }
    if (after >= 0) {
      after -= dt;
      if (after < 0) break;
    }
  }
  if (win) push();
  return { n, window: win };
}
