// Penalty Karijera — razine, prepreke (živi zid, branič), mete, vjetar,
// kovanice i nadogradnje. Čista logika (bez Reacta i canvasa), da se može
// simulirati u Nodeu (balans).
//
// Vrijeme prepreka i meta je "svjetsko" vrijeme razine (sekunde od početka
// razine), da se crtanje i ishod udarca uvijek slažu.

import {
  BALL_R, GOAL_H, GOAL_Z, HALF_W, KEEPER_Z, ballAt, keeperGap, keeperPoseAt, poseFor, resolveShot,
  type Difficulty, type KeeperPlan, type Pose, type Resolution, type Rng, type Shot
} from "./sim";

const clamp = (v: number, a: number, b: number) => (v < a ? a : v > b ? b : v);
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const smooth = (t: number) => t * t * (3 - 2 * t);

export const LIVES = 3;
export const BOSS_EVERY = 5;

// ── Prepreke ────────────────────────────────────────────────────────────
export type Obstacle = {
  kind: "wall" | "defender";
  z: number;
  /** Broj igrača (zid 2–3, branič 1). */
  n: number;
  /** Sredina i polovica hoda (m). */
  center: number;
  amp: number;
  /** Trajanje punog hoda lijevo-desno-lijevo (s). */
  period: number;
  phase: number;
  /** Visina skoka na udarac (m), 0 = ne skaču. */
  jump: number;
  /** Branič: koliko daleko iskorači prema lopti (m). */
  reach: number;
};

/** Razmak igrača u zidu (od ramena do ramena). */
export const WALL_GAP = 0.52;
/** Pola širine igrača (trup i noge) za sudar. */
export const BODY_HW = 0.24;
export const BODY_TOP = 1.56;
export const HEAD_Y = 1.69;
export const HEAD_R = 0.12;

export type ObstacleState = {
  /** Sredina skupine (m). */
  x: number;
  vx: number;
  /** Skok (m). */
  jy: number;
  /** Branič: iskorak -1..1 (predznak = smjer). */
  lunge: number;
};

/** Gdje je prepreka u trenutku t; `kick` = kad je lopta udarena (i kamo ide na visini prepreke). */
export function obstacleAt(o: Obstacle, t: number, kick: { t: number; ballX: number } | null = null): ObstacleState {
  const w = (Math.PI * 2) / o.period;
  const free = (tt: number) => ({ x: o.center + o.amp * Math.sin(w * tt + o.phase), vx: o.amp * w * Math.cos(w * tt + o.phase) });
  if (!kick || t <= kick.t) {
    const f = free(t);
    return { x: f.x, vx: f.vx, jy: 0, lunge: 0 };
  }
  // Na udarac stanu (kratko klizanje) — zid skoči, branič iskorači prema lopti.
  const tau = t - kick.t;
  const K = o.kind === "wall" ? 0.12 : 0.08;
  const f = free(kick.t);
  const e = Math.exp(-tau / K);
  let x = f.x + f.vx * K * (1 - e);
  const vx = f.vx * e;
  let jy = 0;
  let lunge = 0;
  if (o.jump > 0) jy = o.jump * Math.sin(Math.PI * clamp((tau - 0.1) / 0.55, 0, 1));
  if (o.kind === "defender" && o.reach > 0) {
    const stop = f.x + f.vx * K;
    const want = clamp(kick.ballX - stop, -o.reach, o.reach);
    const k = smooth(clamp((tau - 0.13) / 0.3, 0, 1));
    x += want * k * 0.55;
    lunge = (want / o.reach) * k;
  }
  return { x, vx, jy, lunge };
}

/** Položaji igrača u skupini (x), od lijevog prema desnom. */
export function memberXs(o: Obstacle, st: ObstacleState) {
  const out: number[] = [];
  for (let i = 0; i < o.n; i++) out.push(st.x + (i - (o.n - 1) / 2) * WALL_GAP);
  return out;
}

const segDist = (px: number, py: number, ax: number, ay: number, bx: number, by: number) => {
  const vx = bx - ax;
  const vy = by - ay;
  const l2 = vx * vx + vy * vy || 1e-9;
  const t = clamp(((px - ax) * vx + (py - ay) * vy) / l2, 0, 1);
  return Math.hypot(px - (ax + vx * t), py - (ay + vy * t));
};

/** Dodiruje li lopta (bx, by) igrača na px? */
export function hitsPlayer(o: Obstacle, px: number, st: ObstacleState, bx: number, by: number) {
  const top = (o.kind === "defender" ? BODY_TOP - 0.08 : BODY_TOP) + st.jy;
  if (Math.abs(bx - px) < BODY_HW + BALL_R * 0.8 && by > st.jy - BALL_R && by < top + BALL_R * 0.4) return true;
  if (Math.hypot(bx - px, by - (HEAD_Y + st.jy - (o.kind === "defender" ? 0.08 : 0))) < HEAD_R + BALL_R) return true;
  if (o.kind === "defender" && Math.abs(st.lunge) > 0.05) {
    // Ispružena noga prema lopti
    const dir = Math.sign(st.lunge);
    const fx = px + dir * (0.25 + 0.6 * Math.abs(st.lunge));
    if (segDist(bx, by, px + dir * 0.08, 0.8, fx, 0.1) < 0.09 + BALL_R) return true;
  }
  return false;
}

export type Block = { index: number; member: number; u: number; x: number; y: number; t: number };

/** Prva prepreka koju lopta pogodi (ili null). tKick = trenutak udarca (svjetsko vrijeme). */
export function checkObstacles(shot: Shot, obstacles: Obstacle[], tKick: number): Block | null {
  const order = obstacles.map((o, i) => ({ o, i })).sort((a, b) => a.o.z - b.o.z);
  for (const { o, i } of order) {
    const u = o.z / GOAL_Z;
    const b = ballAt(shot, u);
    const t = tKick + shot.T * u;
    const st = obstacleAt(o, t, { t: tKick, ballX: b.x });
    const xs = memberXs(o, st);
    for (let m = 0; m < xs.length; m++) {
      if (hitsPlayer(o, xs[m], st, b.x, b.y)) return { index: i, member: m, u, x: b.x, y: b.y, t };
    }
  }
  return null;
}

// ── Mete ────────────────────────────────────────────────────────────────
export type Ring = { cx: number; cy: number; r: number; ax: number; ay: number; period: number; phase: number };

export function ringAt(r: Ring, t: number) {
  const w = (Math.PI * 2) / r.period;
  return { x: r.cx + r.ax * Math.sin(w * t + r.phase), y: r.cy + r.ay * Math.sin(2 * w * t + r.phase * 1.3) };
}

/** Koje mete je lopta prošla na liniji gola (samo kad je gol). */
export function checkRings(shot: Shot, rings: Ring[], tKick: number): number[] {
  const t = tKick + shot.T;
  const hit: number[] = [];
  rings.forEach((r, i) => {
    const p = ringAt(r, t);
    if (Math.hypot(shot.X - p.x, shot.Y - p.y) < r.r) hit.push(i);
  });
  return hit;
}

// ── Razine ──────────────────────────────────────────────────────────────
export type LevelSpec = {
  level: number;
  /** 0 = običan golman, 1.. = redni broj bossa. */
  boss: number;
  diff: Difficulty;
  obstacles: Obstacle[];
  rings: Ring[];
  /** m/s, + = udesno. */
  wind: number;
  /** Kratki opis razine (prikaže se na početku). */
  tag: string;
};

/** Golman po razini (bez bossa): sve bolje čita, brži je i dalje skače. */
export function keeperDiff(level: number): Difficulty {
  // Prve dvije razine: golman uglavnom pogađa naslijepo — tu se uči potez.
  if (level <= 2) {
    const e = level - 1;
    return { read: 0.03 + 0.04 * e, sigma: 1.2, react: 0.32, dur: 0.6, shift: 1.15 + 0.1 * e, great: 0, stay: 0.02, curveRead: 0, slowRead: 0.1 + 0.1 * e, ySigma: 0.4 };
  }
  const k = clamp((level - 1) / 13, 0, 1);
  const k2 = clamp((level - 14) / 12, 0, 1);
  return {
    read: lerp(0.08, 0.62, k) + 0.1 * k2,
    sigma: lerp(1.05, 0.46, k) - 0.06 * k2,
    react: lerp(0.3, 0.13, k) - 0.015 * k2,
    dur: lerp(0.56, 0.41, k) - 0.02 * k2,
    shift: lerp(1.2, 2.3, k) + 0.1 * k2,
    great: lerp(0.02, 0.32, k) + 0.08 * k2,
    stay: lerp(0.06, 0.14, k),
    curveRead: lerp(0, 0.15, k) + 0.15 * k2,
    slowRead: lerp(0.2, 0.75, clamp((level - 1) / 6, 0, 1)),
    ySigma: lerp(0.38, 0.26, k)
  };
}

/** Boss: čita gotovo sve i stigne u kut — proći ga može samo (gotovo) savršen udarac. */
export function bossDiff(n: number): Difficulty {
  const k = clamp((n - 1) / 3, 0, 1);
  return {
    read: lerp(0.8, 0.93, k),
    sigma: lerp(0.36, 0.24, k),
    react: lerp(0.12, 0.09, k),
    dur: lerp(0.38, 0.34, k),
    shift: lerp(2.45, 2.65, k),
    great: lerp(0.45, 0.7, k),
    stay: 0,
    curveRead: lerp(0.5, 0.65, k),
    slowRead: 0.9,
    ySigma: lerp(0.16, 0.12, k)
  };
}

/**
 * Kvaliteta udarca protiv bossa (0..1): kut (blizu stative), visina (uz prečku
 * ili uz travu), brzina i zavrnutost. Boss ne griješi u čitanju — prolazi samo
 * ono što ne može dohvatiti.
 */
export function shotQuality(shot: Shot, D: Difficulty) {
  const uK = KEEPER_Z / GOAL_Z;
  const b = ballAt(shot, uK);
  const qx = clamp((Math.abs(b.x) - 1.7) / 1.45, 0, 1);
  const qy = Math.max(clamp((shot.Y - 1.3) / 0.85, 0, 1), clamp((0.62 - shot.Y) / 0.4, 0, 1));
  const qt = clamp((0.8 - shot.T) / 0.34, 0, 1);
  const qc = clamp(Math.abs(shot.C) / 1.2, 0, 1) * (1 - (D.curveRead ?? 0));
  return clamp(qx * (0.65 + 0.35 * qy) * (0.5 + 0.5 * qt) + 0.25 * qc * qx, 0, 1);
}

/** Šansa da udarac te kvalitete prođe bossa n. */
export function bossChance(q: number, n: number) {
  const th = n <= 1 ? 0.12 : 0.2 + 0.06 * Math.min(n, 5);
  return clamp((q - th) / 0.42, 0, 0.88);
}

/** Ishod protiv bossa: promašaji okvira kao i inače, a u okvir — kvaliteta odlučuje. */
export function resolveBoss(shot: Shot, D: Difficulty, n: number, from: Pose, rnd: Rng = Math.random): Resolution {
  const base = resolveShot(shot, D, from, rnd);
  if (base.outcome !== "goal" && base.outcome !== "save") return base;
  const uK = KEEPER_Z / GOAL_Z;
  const tK = shot.T * uK;
  const b = ballAt(shot, uK);
  const goal = rnd() < bossChance(shotQuality(shot, D), n);
  const plan = (gx: number, gy: number, extra: number): KeeperPlan => {
    const p = poseFor(gx, gy, from.x, D.shift + extra);
    const dur = Math.max(0.22, Math.min(D.dur, tK - 0.06));
    return { mode: p.mode, side: p.side, from, to: p.pose, react: Math.max(0.05, tK - dur - 0.02), dur, great: false };
  };
  if (!goal) {
    // Savršeno pročitano: stigne točno do lopte (ako treba, malo ispravi cilj — npr. lopta kroz noge).
    let pl = plan(b.x, b.y, 0.6);
    let gap = keeperGap(keeperPoseAt(pl, tK), b.x, b.y).gap;
    const tries: [number, number][] = [[0, 0.18], [0, -0.18], [0.25, 0], [-0.25, 0], [0.2, 0.3], [-0.2, 0.3], [0, 0.45]];
    for (const [ox, oy] of tries) {
      if (gap <= 0) break;
      const alt = plan(b.x + ox, Math.max(0.15, b.y + oy), 0.6);
      const g2 = keeperGap(keeperPoseAt(alt, tK), b.x, b.y).gap;
      if (g2 < gap) {
        pl = alt;
        gap = g2;
      }
    }
    if (gap <= 0) {
      const great = Math.abs(b.x) > 2.1 || b.y > 1.7;
      return { ...base, outcome: "save", in: false, great, label: great ? "Boss je dohvatio" : "Boss je pročitao", plan: { ...pl, great } };
    }
    // Fizički nedohvatljivo — ipak gol.
  }
  // Gol: boss poleti u pravi kut, ali ostane za prste kratak.
  const side = Math.sign(b.x - from.x) || 1;
  let short = 0.32 + rnd() * 0.18;
  let pl = plan(b.x - side * short, b.y - 0.08, 0.6);
  for (let i = 0; i < 6 && keeperGap(keeperPoseAt(pl, tK), b.x, b.y).gap <= 0.02; i++) {
    short += 0.18;
    pl = plan(b.x - side * short, b.y - 0.1, 0.6);
  }
  const label = shot.Y > 1.75 && Math.abs(shot.X) > 2.7 ? "U rašlje" : Math.abs(shot.C) > 0.45 ? "Zavrnuto" : "Savršen udarac";
  return { ...base, outcome: "goal", in: true, great: false, label, plan: pl };
}

const sgn = (rnd: Rng) => (rnd() < 0.5 ? -1 : 1);

function wall(rnd: Rng, o: { z?: number; n?: number; amp: number; period: number; jump?: number; center?: number }): Obstacle {
  return {
    kind: "wall",
    z: o.z ?? 7.2,
    n: o.n ?? 3,
    center: o.center ?? 0,
    amp: o.amp,
    period: o.period,
    phase: rnd() * Math.PI * 2,
    jump: o.jump ?? 0,
    reach: 0
  };
}

function defender(rnd: Rng, o: { amp: number; period: number; reach: number; z?: number }): Obstacle {
  return { kind: "defender", z: o.z ?? 5.6, n: 1, center: 0, amp: o.amp, period: o.period, phase: rnd() * Math.PI * 2, jump: 0, reach: o.reach };
}

function corners(rnd: Rng, o: { r: number; ax: number; ay: number; period: number }): Ring[] {
  const ph = rnd() * Math.PI * 2;
  return [-1, 1].map((s, i) => ({
    cx: s * (HALF_W - o.r - o.ax - 0.02),
    cy: GOAL_H - o.r - o.ay - 0.04,
    r: o.r,
    ax: o.ax,
    ay: o.ay,
    period: o.period * (i ? 1.13 : 1),
    phase: ph + i * 2.1
  }));
}

/** Specifikacija razine. `rnd` daje novi raspored kod svakog pokušaja. */
export function levelSpec(level: number, rnd: Rng = Math.random): LevelSpec {
  const boss = level % BOSS_EVERY === 0 ? level / BOSS_EVERY : 0;
  const spec: LevelSpec = { level, boss, diff: boss ? bossDiff(boss) : keeperDiff(level), obstacles: [], rings: [], wind: 0, tag: "" };
  const windOf = (a: number, b: number) => sgn(rnd) * (a + rnd() * (b - a));
  // Iza 15. razine sve je malo brže (do +35 %).
  const fast = 1 + clamp((level - 15) * 0.03, 0, 0.35);

  if (boss) {
    spec.tag = "Boss";
    if (level >= 10) spec.wind = windOf(1.2 + boss * 0.3, 2 + boss * 0.4);
    return spec;
  }
  switch (level) {
    case 1:
      spec.tag = "Zagrijavanje";
      return spec;
    case 2:
      spec.tag = "Golman se budi";
      return spec;
    case 3:
      spec.obstacles = [wall(rnd, { amp: 1.3, period: 5 })];
      spec.tag = "Živi zid";
      return spec;
    case 4:
      spec.obstacles = [wall(rnd, { amp: 1.9, period: 3.6 })];
      spec.tag = "Zid je brži";
      return spec;
    case 6:
      spec.rings = corners(rnd, { r: 0.5, ax: 0.28, ay: 0.12, period: 3.4 });
      spec.tag = "Mete u kutovima";
      return spec;
    case 7:
      spec.rings = corners(rnd, { r: 0.46, ax: 0.32, ay: 0.14, period: 2.8 });
      spec.tag = "Mete se miču";
      return spec;
    case 8:
      spec.rings = corners(rnd, { r: 0.46, ax: 0.3, ay: 0.14, period: 3 });
      spec.obstacles = [wall(rnd, { amp: 2, period: 3.4 })];
      spec.tag = "Zid i mete";
      return spec;
    case 9:
      spec.rings = corners(rnd, { r: 0.44, ax: 0.32, ay: 0.14, period: 2.7 });
      spec.obstacles = [wall(rnd, { amp: 2.1, period: 3, jump: 0.28 })];
      spec.tag = "Zid skače";
      return spec;
    case 11:
      spec.obstacles = twoWalls(rnd, 1);
      spec.tag = "Dva zida";
      return spec;
    case 12:
      spec.obstacles = [defender(rnd, { amp: 2.3, period: 2.6, reach: 0.9 })];
      spec.wind = windOf(1.5, 2.8);
      spec.tag = "Branič i vjetar";
      return spec;
    case 13:
      spec.obstacles = twoWalls(rnd, 1.05);
      spec.wind = windOf(1.5, 3);
      spec.rings = corners(rnd, { r: 0.44, ax: 0.3, ay: 0.14, period: 2.8 });
      spec.tag = "Dva zida i vjetar";
      return spec;
    case 14:
      spec.obstacles = [wall(rnd, { amp: 2, period: 3.1, jump: 0.28 }), defender(rnd, { amp: 2.2, period: 2.5, reach: 1 })];
      spec.wind = windOf(2, 3.2);
      spec.tag = "Zid, branič i vjetar";
      return spec;
  }
  // 16+: izmjenjuju se kombinacije, sve brže.
  const v = (level - 16) % 4;
  spec.wind = windOf(2.2, 3.6 + Math.min(1.5, (level - 16) * 0.1));
  if (v === 0) {
    spec.obstacles = twoWalls(rnd, fast);
    spec.tag = "Dva zida";
  } else if (v === 1) {
    spec.obstacles = [wall(rnd, { amp: 2.1, period: 3 / fast, jump: 0.3 }), defender(rnd, { amp: 2.3, period: 2.4 / fast, reach: 1.05 })];
    spec.rings = corners(rnd, { r: 0.42, ax: 0.32, ay: 0.14, period: 2.6 / fast });
    spec.tag = "Zid, branič i mete";
  } else if (v === 2) {
    spec.obstacles = [...twoWalls(rnd, fast), defender(rnd, { amp: 1.6, period: 2.2 / fast, reach: 0.8, z: 3.6 })];
    spec.tag = "Puna obrana";
  } else {
    spec.obstacles = [defender(rnd, { amp: 2.4, period: 2.2 / fast, reach: 1.1 }), defender(rnd, { amp: 2.4, period: 2.9 / fast, reach: 1, z: 8 })];
    spec.rings = corners(rnd, { r: 0.42, ax: 0.32, ay: 0.14, period: 2.5 / fast });
    spec.tag = "Dva braniča";
  }
  return spec;
}

function twoWalls(rnd: Rng, fast: number): Obstacle[] {
  const a = wall(rnd, { z: 7.4, n: 3, amp: 2, period: 3.4 / fast, jump: 0.26 });
  const b = wall(rnd, { z: 4.6, n: 2, amp: 1.5, period: 2.9 / fast });
  b.phase = a.phase + Math.PI; // u protufazi
  return [a, b];
}

// ── Kovanice (samo u igri) ──────────────────────────────────────────────
export type CoinPart = { label: string; amount: number };

export function careerCoins(o: { level: number; topBins: boolean; rings: number; boss: number; curve: boolean; streak: number }): CoinPart[] {
  const parts: CoinPart[] = [{ label: "Gol", amount: Math.min(50, 8 + 2 * o.level) }];
  if (o.topBins) parts.push({ label: "Rašlje", amount: 12 });
  if (o.rings) parts.push({ label: o.rings > 1 ? `Mete ×${o.rings}` : "Meta", amount: 20 * o.rings });
  if (o.curve) parts.push({ label: "Falš", amount: 5 });
  if (o.boss) parts.push({ label: "Boss", amount: 50 + 25 * o.boss });
  if (o.streak >= 3) parts.push({ label: `Niz ${o.streak}`, amount: Math.min(25, 5 * (o.streak - 2)) });
  return parts;
}

export function quickCoins(o: { topBins: boolean }): CoinPart[] {
  const parts: CoinPart[] = [{ label: "Gol", amount: 5 }];
  if (o.topBins) parts.push({ label: "Rašlje", amount: 5 });
  return parts;
}

// ── Nadogradnje ─────────────────────────────────────────────────────────
export type UpgradeId = "power" | "curve" | "aim";
export const UPGRADES: { id: UpgradeId; name: string; desc: string; prices: number[] }[] = [
  { id: "power", name: "Snaga udarca", desc: "Lopta brže leti, golman ima manje vremena", prices: [60, 150, 300, 500, 800] },
  { id: "curve", name: "Falš", desc: "Jači luk oko zida i golmana", prices: [60, 150, 300, 500, 800] },
  { id: "aim", name: "Nišan", desc: "Dulja crta putanje dok povlačiš", prices: [120, 320, 640] }
];

export const BALLS = [
  { id: "hrvatska", name: "Hrvatska", price: 0 },
  { id: "real-madrid", name: "Real Madrid", price: 150 },
  { id: "barcelona", name: "Barcelona", price: 150 },
  { id: "milan", name: "Milan", price: 220 },
  { id: "bayern", name: "Bayern", price: 220 },
  { id: "portugal", name: "Portugal", price: 300 },
  { id: "inter-miami", name: "Inter Miami", price: 300 },
  { id: "njemacka", name: "Njemačka", price: 400 }
] as const;

/** Duljina nišana (dio putanje 0..1) po razini nadogradnje. */
export const AIM_GUIDE = [0.2, 0.4, 0.62, 0.86];

export type Progress = {
  v: 1;
  coins: number;
  up: Record<UpgradeId, number>;
  balls: string[];
  ball: string;
  /** Ukupno zarađeno (statistika). */
  earned: number;
};

export const PROGRESS_KEY = "dresify_v2_penalty_karijera";

export const freshProgress = (): Progress => ({ v: 1, coins: 0, up: { power: 0, curve: 0, aim: 0 }, balls: ["hrvatska"], ball: "hrvatska", earned: 0 });

export function loadProgress(): Progress {
  const p = freshProgress();
  try {
    const raw = window.localStorage.getItem(PROGRESS_KEY);
    if (!raw) return p;
    const d = JSON.parse(raw) as Partial<Progress>;
    const num = (v: unknown, max: number) => (typeof v === "number" && Number.isFinite(v) ? clamp(Math.floor(v), 0, max) : 0);
    p.coins = num(d.coins, 1e7);
    p.earned = num(d.earned, 1e8);
    if (d.up) for (const u of UPGRADES) p.up[u.id] = num(d.up[u.id], u.prices.length);
    if (Array.isArray(d.balls)) p.balls = Array.from(new Set(["hrvatska", ...d.balls.filter((b) => BALLS.some((x) => x.id === b))]));
    if (typeof d.ball === "string" && p.balls.includes(d.ball)) p.ball = d.ball;
  } catch {}
  return p;
}

export function saveProgress(p: Progress) {
  try {
    window.localStorage.setItem(PROGRESS_KEY, JSON.stringify(p));
  } catch {}
}

export const nextPrice = (p: Progress, id: UpgradeId) => {
  const u = UPGRADES.find((x) => x.id === id)!;
  return p.up[id] < u.prices.length ? u.prices[p.up[id]] : null;
};

/** Ima li išta za kupiti (točkica na gumbu "Svlačionica"). */
export function canAffordSomething(p: Progress) {
  for (const u of UPGRADES) {
    const pr = nextPrice(p, u.id);
    if (pr !== null && pr <= p.coins) return true;
  }
  return BALLS.some((b) => !p.balls.includes(b.id) && b.price <= p.coins);
}

/** Naslov rezultata po dosegnutoj razini. */
export function careerTitle(level: number) {
  if (level >= 20) return "Legenda";
  if (level >= 15) return "Svjetska klasa";
  if (level >= 10) return "Prvotimac";
  if (level >= 6) return "Ozbiljan igrač";
  if (level >= 3) return "Dobar početak";
  return "Tek zagrijavanje";
}

export type CareerShot = { res: Resolution; block: Block | null; rings: number[] };

/** Cijeli ishod udarca na razini: prepreke → golman (ili boss) → mete. */
export function resolveCareer(shot: Shot, spec: LevelSpec, from: Pose, tKick: number, rnd: Rng = Math.random): CareerShot {
  const block = spec.obstacles.length ? checkObstacles(shot, spec.obstacles, tKick) : null;
  const res = spec.boss ? resolveBoss(shot, spec.diff, spec.boss, from, rnd) : resolveShot(shot, spec.diff, from, rnd);
  if (block) {
    const o = spec.obstacles[block.index];
    return { res: { ...res, outcome: "block", in: false, great: false, label: o.kind === "defender" ? "Branič je blokirao" : "Lopta u zidu" }, block, rings: [] };
  }
  const goal = res.outcome === "goal" || ((res.outcome === "post" || res.outcome === "bar") && res.in);
  return { res, block: null, rings: goal && spec.rings.length ? checkRings(shot, spec.rings, tKick) : [] };
}
