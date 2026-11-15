// Penalty Cup 2.0 — čista logika (bez Reacta i canvasa), da se može testirati u Nodeu.
//
// Svijet je u metrima: bijela točka je z = 0, gol je na z = 11, x = 0 je sredina
// gola, y = 0 je trava. Kamera stoji iza lopte, malo iznad nje.

export const GOAL_Z = 11;
export const HALF_W = 3.66;
export const GOAL_H = 2.44;
export const BALL_R = 0.11;
export const POST_R = 0.06;
export const KEEPER_Z = 10.7;
export const NET_BACK_Z = 13; // dno stražnje mreže
export const NET_TOP_Z = 12; // stražnji rub krova mreže
export const SHOTS = 5;
export const GRAVITY = 9.81;

const clamp = (v: number, a: number, b: number) => (v < a ? a : v > b ? b : v);
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const outCubic = (t: number) => 1 - Math.pow(1 - t, 3);
const inQuad = (t: number) => t * t;

export type Rng = () => number;
/** Normalna razdioba (Box–Muller). */
export function gauss(rnd: Rng) {
  const u = Math.max(1e-6, rnd());
  const v = rnd();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

// ── Kamera ────────────────────────────────────────────────────────────────
export type Cam = { y: number; z: number; f: number; cx: number; hy: number; w: number; h: number };

/**
 * Kamera iza bijele točke, malo iznad lopte. Gol zauzme ~86 % širine; ako ekran
 * nije dovoljno visok, kadar se suzi tako da vrh gola ostane ispod HUD-a, a
 * lopta iznad donjeg ruba (prostor za potez).
 */
export function makeCam(w: number, h: number): Cam {
  const y = 1.25;
  const z = -2.5;
  const a = (GOAL_H + POST_R - y) / (GOAL_Z - z);
  const b = (y - BALL_R) / (0 - z);
  const top = Math.min(96, h * 0.17);
  const bottom = h - Math.max(70, h * 0.135);
  const fw = ((w * 0.86) / (2 * HALF_W)) * (GOAL_Z - z);
  const f = Math.max(80, Math.min(fw, (bottom - top) / (a + b)));
  const hy = bottom - b * f;
  return { y, z, f, cx: w / 2, hy, w, h };
}

export function proj(c: Cam, X: number, Y: number, Z: number) {
  const s = c.f / Math.max(0.05, Z - c.z);
  return { x: c.cx + X * s, y: c.hy - (Y - c.y) * s, s };
}

// ── Udarac iz poteza prstom ──────────────────────────────────────────────
export type Sample = { x: number; y: number; t: number }; // t u ms

export type Shot = {
  /** Gdje lopta prijeđe liniju gola (x, y). */
  X: number;
  Y: number;
  /** Vrijeme leta do linije gola (s). */
  T: number;
  /** Bočni luk (m) — zavrnuta lopta. */
  C: number;
  /** Nadvišenje putanje (m). */
  loft: number;
  power: number;
  kmh: number;
};

export type SwipeInfo = { shot: Shot | null; reason?: "short" | "down" };

/**
 * Potez → udarac.
 *  - smjer i visina: lopta ide "kamo pokazuješ" — kraj poteza produžen brzinom
 *    (brži potez gura loptu dalje, pa prebrz i predug potez ode preko gola),
 *  - brzina poteza: snaga (kraći let = golman ima manje vremena),
 *  - savijenost poteza: luk lopte.
 */
export function shotFromSwipe(raw: Sample[], cam: Cam, rnd: Rng = Math.random): SwipeInfo {
  if (raw.length < 2) return { shot: null, reason: "short" };
  const end = raw[raw.length - 1];
  // Ako je igrač držao prst na mjestu pa tek onda potegnuo, potez počinje nakon zastoja.
  let si = 0;
  for (let i = raw.length - 2; i >= 0; i--) {
    const a = raw[i];
    const b = raw[i + 1];
    if (b.t - a.t > 220 && Math.hypot(b.x - a.x, b.y - a.y) < 10) {
      si = i + 1;
      break;
    }
  }
  // Preskoči početno mirovanje.
  while (si < raw.length - 2 && Math.hypot(raw[si + 1].x - raw[si].x, raw[si + 1].y - raw[si].y) < 2 && end.t - raw[si + 1].t > 30) si++;
  const s = raw[si];
  const dx = end.x - s.x;
  const dy = end.y - s.y;
  const len = Math.hypot(dx, dy);
  if (len < 28) return { shot: null, reason: "short" };
  if (dy > -16) return { shot: null, reason: "down" };

  const dur = Math.max(0.035, (end.t - s.t) / 1000);
  const speed = len / dur / cam.h; // visina ekrana u sekundi
  const power = clamp((speed - 0.75) / 3.1, 0, 1);

  // Savijenost: najveće bočno odstupanje od tetive.
  const nx = -dy / len;
  const ny = dx / len;
  let dev = 0;
  for (let i = si; i < raw.length; i++) {
    const d = (raw[i].x - s.x) * nx + (raw[i].y - s.y) * ny;
    if (Math.abs(d) > Math.abs(dev)) dev = d;
  }
  const bend = dev / len;
  const C = Math.abs(bend) < 0.05 ? 0 : clamp((bend - Math.sign(bend) * 0.05) * 7, -1.5, 1.5);

  // Visina: koliko daleko potez "dosegne" prema prečki (brži potez gura dalje).
  // Smjer: lopta ide po zraci poteza — kamo pokažeš na ekranu, tamo ide.
  const ball = proj(cam, 0, BALL_R, 0);
  const g = proj(cam, 0, 0, GOAL_Z);
  const top = proj(cam, 0, GOAL_H, GOAL_Z);
  const s11 = g.s;
  const reach = len * (1 + 0.36 * power);
  const Ln = reach / Math.max(40, ball.y - top.y);
  let Y = BALL_R + 2.3 * ((Ln - 0.25) / 0.85);
  if (Y < 0.22) Y = BALL_R;
  // Točka na zraci poteza na visini Y u ravnini gola.
  const sy = cam.hy - (Math.max(Y, BALL_R) - cam.y) * s11;
  const k = (sy - ball.y) / (dy / len);
  const px = ball.x + (dx / len) * Math.max(0, k);
  let X = ((px - cam.cx) / s11) * 0.9;
  // Snaga košta preciznosti.
  X += gauss(rnd) * (0.05 + 0.22 * power * power);
  Y += gauss(rnd) * (0.04 + 0.14 * power * power);
  X = clamp(X, -8, 8);
  Y = clamp(Y, BALL_R, 5);

  const T = lerp(1.0, 0.44, power);
  const loft = Y <= 0.2 ? 0 : (0.12 + 0.3 * (1 - power)) * Math.min(1, Y / 1.2);
  const kmh = Math.round((GOAL_Z / T) * 3.6 * 1.12);
  return { shot: { X, Y, T, C, loft, power, kmh } };
}

/** Položaj lopte u letu, u = 0..1 (1 = linija gola). */
export function ballAt(shot: Shot, u: number) {
  const b = 4 * u * (1 - u);
  return {
    x: shot.X * u + shot.C * b,
    y: Math.max(BALL_R, BALL_R + (shot.Y - BALL_R) * u + shot.loft * b),
    z: GOAL_Z * u
  };
}

/** Brzina (m/s) u trenutku u. */
export function ballVel(shot: Shot, u: number) {
  const du = 1 / shot.T;
  const db = 4 - 8 * u;
  return {
    vx: (shot.X + shot.C * db) * du,
    vy: (shot.Y - BALL_R + shot.loft * db) * du,
    vz: GOAL_Z * du
  };
}

// ── Golman ───────────────────────────────────────────────────────────────
export type Pose = {
  x: number; // kuk (m)
  y: number;
  tilt: number; // + = nagnut prema +x
  armL: number; // kut ruke od osi tijela prema van (0 = iznad glave, π/2 = vodoravno, π = dolje, < 0 = prema sredini)
  armR: number;
  spread: number; // raskorak (m)
  bend: number; // savijenost laktova (0 = ispružene ruke)
  planted: number; // 1 = stopala na travi, 0 = u zraku (prate tijelo)
};

export const IDLE_POSE: Pose = { x: 0, y: 0.84, tilt: 0, armL: 2.45, armR: 2.45, spread: 0.55, bend: 0.75, planted: 1 };

export type KeeperMode = "dive" | "block" | "jump";

export type KeeperPlan = {
  mode: KeeperMode;
  side: -1 | 0 | 1;
  from: Pose;
  to: Pose;
  react: number;
  dur: number;
  great: boolean;
};

export type Difficulty = { read: number; sigma: number; react: number; dur: number; shift: number; great: number; stay: number };

/** Težina po penalu: golman sve bolje čita, brže reagira i dalje skače. */
export const DIFFICULTY: Difficulty[] = [
  { read: 0.3, sigma: 0.78, react: 0.21, dur: 0.5, shift: 1.9, great: 0.1, stay: 0.2 },
  { read: 0.42, sigma: 0.64, react: 0.18, dur: 0.46, shift: 2.05, great: 0.18, stay: 0.18 },
  { read: 0.52, sigma: 0.54, react: 0.16, dur: 0.44, shift: 2.15, great: 0.24, stay: 0.16 },
  { read: 0.62, sigma: 0.45, react: 0.14, dur: 0.42, shift: 2.25, great: 0.3, stay: 0.14 },
  { read: 0.68, sigma: 0.4, react: 0.12, dur: 0.4, shift: 2.35, great: 0.35, stay: 0.12 }
];

const ARM = 0.66;
const TORSO = 0.55;

/** Ciljna poza da rukavice dođu do (gx, gy). */
export function poseFor(gx: number, gy: number, x0: number, maxShift: number): { mode: KeeperMode; side: -1 | 0 | 1; pose: Pose } {
  const d = gx - x0;
  if (Math.abs(d) < 0.6) {
    if (gy > 1.55) {
      const y = clamp(gy - 1.05, 0.9, 1.35);
      return { mode: "jump", side: 0, pose: { x: x0 + d * 0.7, y, tilt: d * 0.35, armL: 0.25, armR: 0.25, spread: 0.18, bend: 0.05, planted: 0 } };
    }
    const low = gy < 0.65;
    return {
      mode: "block",
      side: 0,
      pose: { x: x0 + d * 0.75, y: low ? 0.62 : 0.8, tilt: d * 0.25, armL: low ? 2.55 : 1.55, armR: low ? 2.55 : 1.55, spread: low ? 0.95 : 0.6, bend: low ? 0.1 : 0.2, planted: 1 }
    };
  }
  const side = (d > 0 ? 1 : -1) as 1 | -1;
  const y = clamp(0.3 + gy * 0.38, 0.3, 1.15);
  const L = TORSO + ARM + 0.08;
  const c = clamp((gy - y) / L, -0.25, 0.95);
  const tilt = Math.min(1.68, Math.acos(c));
  let x = gx - side * Math.sin(tilt) * L;
  x = clamp(x, x0 - maxShift, x0 + maxShift);
  // Ruke iznad glave, skupljene prema lopti (negativan kut = prema osi tijela).
  return { mode: "dive", side, pose: { x, y, tilt: side * tilt, armL: -0.2, armR: -0.2, spread: 0.32, bend: 0, planted: 0 } };
}

export function lerpPose(a: Pose, b: Pose, t: number): Pose {
  return {
    x: lerp(a.x, b.x, t),
    y: lerp(a.y, b.y, t),
    tilt: lerp(a.tilt, b.tilt, t),
    armL: lerp(a.armL, b.armL, t),
    armR: lerp(a.armR, b.armR, t),
    spread: lerp(a.spread, b.spread, t),
    bend: lerp(a.bend, b.bend, t),
    planted: lerp(a.planted, b.planted, t)
  };
}

/** Poza golmana t sekundi nakon udarca. */
export function keeperPoseAt(plan: KeeperPlan, t: number): Pose {
  const k = clamp((t - plan.react) / plan.dur, 0, 1);
  // Mali čučanj prije odraza.
  const pre = clamp(t / Math.max(0.01, plan.react), 0, 1);
  if (k <= 0) {
    const p = { ...plan.from };
    p.y -= 0.07 * Math.sin(pre * Math.PI * 0.5);
    return p;
  }
  let p = lerpPose(plan.from, plan.to, outCubic(k));
  if (plan.mode === "jump" || plan.mode === "dive") {
    // Luk skoka: kuk se digne više u sredini pokreta.
    p.y += Math.sin(k * Math.PI) * (plan.mode === "jump" ? 0.12 : 0.18);
  }
  const after = t - plan.react - plan.dur - (plan.mode === "dive" ? 0.08 : 0.18);
  if (after > 0) {
    const f = inQuad(clamp(after / 0.34, 0, 1));
    if (plan.mode === "dive") {
      const lie = plan.to.tilt > 0 ? 1.52 : -1.52;
      p = { ...p, y: lerp(p.y, 0.2, f), tilt: lerp(p.tilt, lie, f * 0.8), planted: 0 };
    } else if (plan.mode === "jump") {
      p = { ...p, y: lerp(p.y, IDLE_POSE.y, f), tilt: lerp(p.tilt, 0, f), armL: lerp(p.armL, 0.9, f), armR: lerp(p.armR, 0.9, f), planted: f };
    }
  }
  return p;
}

export type Joints = {
  hip: V; neck: V; head: V;
  shL: V; shR: V; elL: V; elR: V; hL: V; hR: V;
  knL: V; knR: V; ftL: V; ftR: V;
  u: V; r: V;
};
type V = { x: number; y: number };

const rot = (v: V, a: number): V => ({ x: v.x * Math.cos(a) - v.y * Math.sin(a), y: v.x * Math.sin(a) + v.y * Math.cos(a) });

/** Zglobovi u svjetskim koordinatama (x, y) u ravnini golmana. */
export function joints(p: Pose): Joints {
  const u = { x: Math.sin(p.tilt), y: Math.cos(p.tilt) };
  const r = { x: Math.cos(p.tilt), y: -Math.sin(p.tilt) };
  const hip = { x: p.x, y: p.y };
  const neck = { x: hip.x + u.x * TORSO, y: hip.y + u.y * TORSO };
  const head = { x: hip.x + u.x * (TORSO + 0.17), y: hip.y + u.y * (TORSO + 0.17) };
  const shR = { x: neck.x + r.x * 0.2 - u.x * 0.04, y: neck.y + r.y * 0.2 - u.y * 0.04 };
  const shL = { x: neck.x - r.x * 0.2 - u.x * 0.04, y: neck.y - r.y * 0.2 - u.y * 0.04 };
  // Ruke: kut od osi tijela, desna se otvara prema +r. Podlaktica se savija prema van/gore.
  const dR = rot(u, -p.armR);
  const dL = rot(u, p.armL);
  const fR = rot(u, -(p.armR - p.bend * 1.1));
  const fL = rot(u, p.armL - p.bend * 1.1);
  const UP = ARM * 0.48;
  const LO = ARM * 0.52;
  const elR = { x: shR.x + dR.x * UP, y: shR.y + dR.y * UP };
  const elL = { x: shL.x + dL.x * UP, y: shL.y + dL.y * UP };
  const hR = { x: elR.x + fR.x * LO, y: elR.y + fR.y * LO };
  const hL = { x: elL.x + fL.x * LO, y: elL.y + fL.y * LO };
  // Noge: stopala ili na travi ili prate tijelo; koljena preko jednostavnog IK-a.
  const hipR = { x: hip.x + r.x * 0.1, y: hip.y + r.y * 0.1 };
  const hipL = { x: hip.x - r.x * 0.1, y: hip.y - r.y * 0.1 };
  const LEG = 0.92;
  const airR = { x: hip.x - u.x * LEG + r.x * p.spread * 0.5, y: hip.y - u.y * LEG + r.y * p.spread * 0.5 };
  const airL = { x: hip.x - u.x * LEG - r.x * p.spread * 0.5, y: hip.y - u.y * LEG - r.y * p.spread * 0.5 };
  const groundR = { x: hip.x + p.spread * 0.5, y: 0.03 };
  const groundL = { x: hip.x - p.spread * 0.5, y: 0.03 };
  const ftR = { x: lerp(airR.x, groundR.x, p.planted), y: lerp(airR.y, groundR.y, p.planted) };
  const ftL = { x: lerp(airL.x, groundL.x, p.planted), y: lerp(airL.y, groundL.y, p.planted) };
  const knee = (h: V, f: V, out: number): V => {
    const mx = (h.x + f.x) / 2;
    const my = (h.y + f.y) / 2;
    const d = Math.hypot(f.x - h.x, f.y - h.y);
    const bendAmt = Math.sqrt(Math.max(0, (LEG / 2) ** 2 - (d / 2) ** 2));
    // Okomito na nogu, prema van.
    const px = -(f.y - h.y) / (d || 1);
    const py = (f.x - h.x) / (d || 1);
    const sgn = px * out >= 0 ? 1 : -1;
    return { x: mx + px * bendAmt * sgn, y: my + py * bendAmt * sgn };
  };
  const knR = knee(hipR, ftR, 1);
  const knL = knee(hipL, ftL, -1);
  return { hip, neck, head, shL, shR, elL, elR, hL, hR, knL, knR, ftL, ftR, u, r };
}

function segDist(px: number, py: number, a: V, b: V) {
  const vx = b.x - a.x;
  const vy = b.y - a.y;
  const l2 = vx * vx + vy * vy || 1e-9;
  const t = clamp(((px - a.x) * vx + (py - a.y) * vy) / l2, 0, 1);
  return Math.hypot(px - (a.x + vx * t), py - (a.y + vy * t));
}

/** Koliko je lopta (središte) daleko od tijela golmana (≤ 0 = dodir). Vraća i najbliži dio. */
export function keeperGap(p: Pose, bx: number, by: number): { gap: number; glove: number } {
  const j = joints(p);
  const parts: [number, number][] = [
    [segDist(bx, by, j.hip, j.neck), 0.17],
    [Math.hypot(bx - j.head.x, by - j.head.y), 0.12],
    [segDist(bx, by, j.shL, j.elL), 0.075],
    [segDist(bx, by, j.shR, j.elR), 0.075],
    [segDist(bx, by, j.elL, j.hL), 0.07],
    [segDist(bx, by, j.elR, j.hR), 0.07],
    [Math.hypot(bx - j.hL.x, by - j.hL.y), 0.12],
    [Math.hypot(bx - j.hR.x, by - j.hR.y), 0.12],
    [segDist(bx, by, j.hip, j.ftL), 0.09],
    [segDist(bx, by, j.hip, j.ftR), 0.09]
  ];
  let gap = Infinity;
  for (const [d, r] of parts) gap = Math.min(gap, d - r - BALL_R);
  const glove = Math.min(Math.hypot(bx - j.hL.x, by - j.hL.y), Math.hypot(bx - j.hR.x, by - j.hR.y)) - 0.12 - BALL_R;
  return { gap, glove };
}

// ── Ishod ────────────────────────────────────────────────────────────────
export type Outcome = "goal" | "save" | "post" | "bar" | "wide" | "over";

export type Resolution = {
  outcome: Outcome;
  /** Stativa/prečka pa unutra (računa se kao gol). */
  in: boolean;
  great: boolean;
  /** Oznaka ispod glavnog natpisa. */
  label: string;
  plan: KeeperPlan;
  /** u (0..1) kad lopta prođe ravninu golmana. */
  uKeeper: number;
};

export const isGoal = (r: Resolution) => r.outcome === "goal" || ((r.outcome === "post" || r.outcome === "bar") && r.in);

export function planKeeper(shot: Shot, idx: number, from: Pose, rnd: Rng = Math.random): KeeperPlan {
  const D = DIFFICULTY[clamp(idx, 0, DIFFICULTY.length - 1)];
  const uK = KEEPER_Z / GOAL_Z;
  const b = ballAt(shot, uK);
  let gx: number;
  let gy: number;
  const roll = rnd();
  // Spora lopta: golman stigne vidjeti kamo ide i ispraviti procjenu.
  const slow = clamp((shot.T - 0.55) / 0.45, 0, 1);
  const read = D.read + (1 - D.read) * slow * 0.75;
  const sigma = D.sigma * (1 - slow * 0.5);
  if (roll < read) {
    // Golman čita početni smjer — zavrnuta lopta ga zavara.
    const heading = (shot.X + shot.C * 0.9) * uK;
    gx = lerp(heading, b.x, slow) + gauss(rnd) * sigma;
    gy = clamp(b.y + gauss(rnd) * 0.32, 0.15, 2.35);
  } else if (roll < read + (1 - read) * D.stay) {
    gx = from.x + gauss(rnd) * 0.2;
    gy = 0.9 + rnd() * 0.5;
  } else {
    const side = rnd() < 0.5 ? -1 : 1;
    gx = side * (1.0 + rnd() * 1.65);
    gy = 0.25 + rnd() * 1.8;
  }
  const { mode, side, pose } = poseFor(gx, gy, from.x, D.shift);
  // Na sporu loptu ne skače prerano — tempira skok da stigne točno na vrijeme.
  const tK = shot.T * uK;
  const react = Math.max(D.react, tK - D.dur - 0.04);
  return { mode, side, from, to: pose, react, dur: D.dur, great: false };
}

export function resolveShot(shot: Shot, idx: number, from: Pose, rnd: Rng = Math.random): Resolution {
  const D = DIFFICULTY[clamp(idx, 0, DIFFICULTY.length - 1)];
  const uK = KEEPER_Z / GOAL_Z;
  const tK = shot.T * uK;
  const b = ballAt(shot, uK);
  let plan = planKeeper(shot, idx, from, rnd);
  let gap = keeperGap(keeperPoseAt(plan, tK), b.x, b.y);
  let saved = gap.gap <= 0;
  let great = false;
  const onFrame = Math.abs(b.x) < HALF_W + 0.05 && b.y < GOAL_H + 0.05;
  if (!saved && onFrame && plan.mode === "dive" && Math.sign(plan.side) === Math.sign(b.x) && gap.glove < 0.5 && rnd() < D.great) {
    // Sjajna obrana: golman se ispruži do kraja (dalje i brže od plana).
    const p2 = poseFor(b.x, b.y, from.x, D.shift + 0.45);
    const plan2: KeeperPlan = { ...plan, mode: p2.mode, side: p2.side, to: p2.pose, react: Math.max(0.06, D.react * 0.7), dur: Math.max(0.24, Math.min(D.dur, tK - D.react * 0.7 - 0.02)) };
    const g2 = keeperGap(keeperPoseAt(plan2, tK), b.x, b.y);
    if (g2.gap <= 0) {
      plan = { ...plan2, great: true };
      gap = g2;
      saved = true;
      great = true;
    }
  }
  const nearPost = Math.abs(Math.abs(shot.X) - HALF_W) < BALL_R + POST_R * 0.65;
  const nearBar = Math.abs(shot.Y - GOAL_H) < BALL_R + POST_R * 0.65 && Math.abs(shot.X) < HALF_W + POST_R;
  const curved = Math.abs(shot.C) > 0.45;
  if (saved) return { outcome: "save", in: false, great, label: great ? "Sjajna obrana" : "Golman je pročitao", plan, uKeeper: uK };
  if (nearPost && shot.Y < GOAL_H + BALL_R) {
    const inside = Math.abs(shot.X) < HALF_W && rnd() < 0.55;
    return { outcome: "post", in: inside, great: false, label: inside ? "Stativa pa gol" : "Stativa", plan, uKeeper: uK };
  }
  if (nearBar) {
    const inside = shot.Y < GOAL_H && rnd() < 0.45;
    return { outcome: "bar", in: inside, great: false, label: inside ? "Prečka pa gol" : "Prečka", plan, uKeeper: uK };
  }
  if (Math.abs(shot.X) >= HALF_W) return { outcome: "wide", in: false, great: false, label: "Pokraj gola", plan, uKeeper: uK };
  if (shot.Y >= GOAL_H) return { outcome: "over", in: false, great: false, label: "Preko gola", plan, uKeeper: uK };
  const topBins = shot.Y > 1.75 && Math.abs(shot.X) > 2.7;
  const label = topBins ? "U rašlje" : curved ? "Zavrnuto" : shot.Y < 0.35 && Math.abs(shot.X) > 2.6 ? "Uz samu travu" : shot.power > 0.82 ? "Projektil" : Math.abs(shot.X) < 0.7 ? "Kroz sredinu" : "Siguran udarac";
  return { outcome: "goal", in: true, great: false, label, plan, uKeeper: uK };
}

/** Dubina mreže (z) na visini y, unutar okvira. */
export function netZ(y: number) {
  return lerp(NET_BACK_Z, NET_TOP_Z, clamp(y / GOAL_H, 0, 1));
}
