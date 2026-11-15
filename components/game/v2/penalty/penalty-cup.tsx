"use client";

// Penalty Cup 2.0 — pet penala protiv DRESIFY golmana.
// Potez prstom: smjer = kamo pokažeš, brzina = snaga, luk = zavrnuta lopta.

import { Hand, Shield, Spline } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { BRAND, brandFont, clamp, createParticles, createShake, damp, ease, ensureBrandFonts, lerp, loadImage } from "../draw";
import { GameShell, HudStat, useCanvas, useGameLoop, usePointer, type GameResult, type GameState } from "../game-shell";
import { formatPrize, pickReward, rewardsEnabled, tiersFor } from "../rewards";
import { haptic, sfx } from "../sfx";
import { penaltySfx, unlockPenaltyAudio } from "./audio";
import { BOARD_Z, buildScene, drawBall, drawBallShadow, drawBoard, drawCrowd, drawFrame, drawGoalBack, drawKeeper, drawNet, type Ripple, type Scene } from "./scene";
import {
  BALL_R, GOAL_H, GOAL_Z, GRAVITY, HALF_W, IDLE_POSE, KEEPER_Z, NET_BACK_Z, SHOTS,
  ballAt, ballVel, isGoal, keeperPoseAt, lerpPose, netZ, proj, resolveShot, shotFromSwipe,
  type Outcome, type Pose, type Resolution, type Sample, type Shot
} from "./sim";

// ── Lopte ────────────────────────────────────────────────────────────────
export const PENALTY_BALLS = [
  { id: "hrvatska", name: "Hrvatska" },
  { id: "real-madrid", name: "Real Madrid" },
  { id: "barcelona", name: "Barcelona" },
  { id: "bayern", name: "Bayern" },
  { id: "milan", name: "Milan" },
  { id: "inter-miami", name: "Inter Miami" },
  { id: "portugal", name: "Portugal" },
  { id: "njemacka", name: "Njemačka" }
] as const;
const ballSrc = (id: string) => `/mix/lopta-${id}.webp`;
const BALL_KEY = "dresify_v2_penalty_ball";
const BEST_KEY = "dresify_v2_best_penalty";

type ShotLog = { outcome: Outcome; goal: boolean; kmh: number; label: string };
type Phase = "aim" | "flight" | "after" | "reset";

type BallState = {
  mode: "rest" | "flight" | "free";
  x: number; y: number; z: number;
  vx: number; vy: number; vz: number;
  rot: number; spin: number; alpha: number;
  trail: { x: number; y: number; z: number }[];
  trailClock: number;
  inGoal: boolean; netHit: boolean; glow: number;
};

type Banner = { main: string; sub: string; good: boolean; age: number };

const newBall = (): BallState => ({
  mode: "rest", x: 0, y: BALL_R, z: 0, vx: 0, vy: 0, vz: 0, rot: 0, spin: 0, alpha: 1,
  trail: [], trailClock: 0, inGoal: false, netHit: false, glow: 0
});

function shortLabel(o: Outcome, goal: boolean) {
  if (goal) return "Gol";
  if (o === "save") return "Obrana";
  if (o === "post") return "Stativa";
  if (o === "bar") return "Prečka";
  return "Promašaj";
}

export function PenaltyCup() {
  const [state, setState] = useState<GameState>("start");
  const [goals, setGoals] = useState(0);
  const [log, setLog] = useState<ShotLog[]>([]);
  const [current, setCurrent] = useState(0);
  const [result, setResult] = useState<GameResult | null>(null);
  const [club, setClub] = useState<string>("hrvatska");

  const stateRef = useRef(state);
  stateRef.current = state;

  const sceneRef = useRef<Scene | null>(null);
  const dirty = useRef(true);
  // Uski okvir (npr. mobitel položen na bok → 9:16 kartica): HUD bez brojača golova (točkice ga već pokazuju).
  const [narrow, setNarrow] = useState(false);
  const { canvasRef, view } = useCanvas({
    onResize: (v) => {
      dirty.current = true;
      setNarrow(v.w < 340);
    }
  });
  const ballImg = useRef<HTMLImageElement | null>(null);
  const fx = useRef(createParticles(320));
  const shake = useRef(createShake(9, 0.012));

  const g = useRef({
    phase: "aim" as Phase,
    shot: 0,
    goals: 0,
    log: [] as ShotLog[],
    phaseT: 0,
    ft: 0, // vrijeme od udarca (simulacija)
    cur: null as { shot: Shot; res: Resolution } | null,
    keeperResolved: false,
    lineResolved: false,
    ball: newBall(),
    pose: { ...IDLE_POSE } as Pose,
    idlePose: { ...IDLE_POSE } as Pose,
    resetFrom: { ...IDLE_POSE } as Pose,
    timeScale: 1,
    slow: 0,
    zoom: 1,
    punch: 0,
    ripples: [] as Ripple[],
    bulge: null as { x: number; y: number; d: number } | null,
    vib: { left: 0, right: 0, bar: 0, age: 9, side: 0 as -1 | 0 | 1, amp: 0 },
    banner: null as Banner | null,
    cheer: 0,
    goalFlash: 0,
    whiteFlash: 0,
    flashes: [] as { x: number; y: number; age: number; r: number }[],
    dragging: false,
    samples: [] as Sample[],
    fingerFade: 0,
    hint: true,
    hintT: 0,
    nudge: 0,
    ended: false
  });

  // Odabrana lopta (pamti se)
  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(BALL_KEY);
      if (saved && PENALTY_BALLS.some((b) => b.id === saved)) setClub(saved);
    } catch {}
    ensureBrandFonts().then(() => (dirty.current = true));
  }, []);
  useEffect(() => {
    let live = true;
    loadImage(ballSrc(club))
      .then((img) => {
        if (live) ballImg.current = img;
      })
      .catch(() => {});
    // Ostale lopte učitaj u pozadini (brzo prebacivanje).
    const id = window.setTimeout(() => PENALTY_BALLS.forEach((b) => loadImage(ballSrc(b.id)).catch(() => {})), 600);
    return () => {
      live = false;
      window.clearTimeout(id);
    };
  }, [club]);

  const pickClub = useCallback((id: string) => {
    setClub(id);
    sfx.tap();
    try {
      window.localStorage.setItem(BALL_KEY, id);
    } catch {}
  }, []);

  // ── Tijek igre ─────────────────────────────────────────────────────────
  const start = useCallback(() => {
    unlockPenaltyAudio();
    const s = g.current;
    s.phase = "aim";
    s.shot = 0;
    s.goals = 0;
    s.log = [];
    s.phaseT = 0;
    s.ft = 0;
    s.cur = null;
    s.ball = newBall();
    s.pose = { ...IDLE_POSE };
    s.timeScale = 1;
    s.slow = 0;
    s.zoom = 1;
    s.punch = 0;
    s.ripples = [];
    s.bulge = null;
    s.banner = null;
    s.cheer = 0;
    s.goalFlash = 0;
    s.dragging = false;
    s.samples = [];
    s.hintT = 0;
    s.nudge = 0;
    s.ended = false;
    fx.current.clear();
    shake.current.reset();
    setGoals(0);
    setLog([]);
    setCurrent(0);
    setResult(null);
    setState("playing");
    sfx.whistle();
  }, []);

  const finish = useCallback(() => {
    const s = g.current;
    if (s.ended) return;
    s.ended = true;
    const n = s.goals;
    const title = n === 5 ? "Savršena serija" : n === 4 ? "Odlična serija" : n === 3 ? "Dobra serija" : n >= 1 ? "Golman je bio bolji" : "Ovaj put nije išlo";
    sfx.whistle(true);
    if (n >= 4) sfx.crowd(0.9, 2.6);
    setResult({ score: n, display: `${n}/${SHOTS}`, title });
    setState("result");
  }, []);

  const kick = useCallback((shot: Shot) => {
    const s = g.current;
    const res = resolveShot(shot, s.shot, { ...s.idlePose });
    s.cur = { shot, res };
    s.phase = "flight";
    s.phaseT = 0;
    s.ft = 0;
    s.keeperResolved = false;
    s.lineResolved = false;
    s.hint = false;
    const b = s.ball;
    b.mode = "flight";
    b.trail = [];
    b.inGoal = false;
    b.netHit = false;
    b.spin = (shot.C !== 0 ? Math.sign(shot.C) : 1) * (10 + shot.power * 22 + Math.abs(shot.C) * 10);
    b.glow = shot.power > 0.78 ? 1 : 0;
    sfx.kick(0.75 + shot.power * 0.6);
    haptic(14);
    shake.current.add(0.1 + shot.power * 0.12);
    const v = view.current;
    const sc = sceneRef.current;
    if (sc && v.ctx) {
      const p = proj(sc.cam, 0, 0.02, 0);
      fx.current.burst(p.x, p.y, { count: 14, colors: ["#3f8f4f", "#6fbf6a", "#d9f5c8"], speed: [60, 220], angle: -Math.PI / 2, spread: 2.4, gravity: 600, size: [1.2, 2.6], life: [0.3, 0.6] });
    }
  }, [view]);

  // ── Unos ───────────────────────────────────────────────────────────────
  usePointer(canvasRef, {
    onDown: (p) => {
      unlockPenaltyAudio();
      const s = g.current;
      if (stateRef.current !== "playing" || s.phase !== "aim") return;
      s.dragging = true;
      s.samples = [{ x: p.x, y: p.y, t: p.event.timeStamp || performance.now() }];
      s.fingerFade = 1;
    },
    onMove: (p) => {
      const s = g.current;
      if (!s.dragging) return;
      s.samples.push({ x: p.x, y: p.y, t: p.event.timeStamp || performance.now() });
      if (s.samples.length > 160) s.samples.shift();
    },
    onUp: (p) => {
      // iOS pušta zvuk tek nakon geste koja završi (touchend/pointerup) — otključaj i ovdje.
      unlockPenaltyAudio();
      const s = g.current;
      if (!s.dragging) return;
      s.dragging = false;
      s.samples.push({ x: p.x, y: p.y, t: p.event.timeStamp || performance.now() });
      const sc = sceneRef.current;
      if (stateRef.current !== "playing" || s.phase !== "aim" || !sc) return;
      const info = shotFromSwipe(s.samples, sc.cam);
      if (info.shot) kick(info.shot);
      else {
        s.nudge = 1.6;
        sfx.tap();
      }
    }
  });

  // Pauza prekida potez.
  useEffect(() => {
    if (state !== "playing") g.current.dragging = false;
  }, [state]);

  // ── Simulacija (fiksni korak) ──────────────────────────────────────────
  const celebrate = useCallback((res: Resolution, shot: Shot) => {
    const s = g.current;
    const sc = sceneRef.current;
    s.slow = 0.4;
    s.punch = 1;
    s.cheer = 1;
    s.goalFlash = 2.4;
    s.whiteFlash = 0.5;
    shake.current.add(0.32);
    sfx.success();
    sfx.crowd(1, 3.4);
    haptic(28);
    if (sc) {
      const mouth = proj(sc.cam, clamp(shot.X, -HALF_W, HALF_W), clamp(shot.Y, 0.3, GOAL_H), GOAL_Z + 0.6);
      const conf = { colors: [BRAND.accent, "#ffffff", BRAND.accent, "#f6ffa0"], shape: "confetti" as const, gravity: 260, drag: 1.6, life: [1.1, 1.9] as [number, number], size: [2.2, 4.2] as [number, number] };
      fx.current.burst(mouth.x, mouth.y, { ...conf, count: 34, speed: [120, 380], angle: -Math.PI / 2, spread: Math.PI * 1.4 });
      // Topovi konfeta iz donjih kutova
      const big = { ...conf, gravity: 520, drag: 1.1, life: [1.4, 2.2] as [number, number], size: [2.6, 5] as [number, number] };
      fx.current.burst(-6, sc.h * 0.86, { ...big, count: 55, speed: [520, 900], angle: -Math.PI * 0.36, spread: 0.5 });
      fx.current.burst(sc.w + 6, sc.h * 0.86, { ...big, count: 55, speed: [520, 900], angle: -Math.PI * 0.64, spread: 0.5 });
    }
    void res;
  }, []);

  const logShot = useCallback((res: Resolution, shot: Shot) => {
    const s = g.current;
    const goal = isGoal(res);
    if (goal) s.goals += 1;
    const entry: ShotLog = { outcome: res.outcome, goal, kmh: shot.kmh, label: res.label };
    s.log = [...s.log, entry];
    setLog(s.log);
    setGoals(s.goals);
    s.banner = {
      main: goal ? "Gol" : res.outcome === "save" ? "Obrana" : "Promašaj",
      sub: `${res.label} · ${shot.kmh} km/h`,
      good: goal,
      age: 0
    };
    s.phase = "after";
    s.phaseT = 0;
  }, []);

  const update = useCallback(
    (step: number) => {
      const s = g.current;
      if (s.ended) return;
      // Usporena snimka nakon gola.
      if (s.slow > 0) {
        s.slow -= step;
        s.timeScale = 0.28;
      } else s.timeScale = damp(s.timeScale, 1, 9, step);
      const dt = step * s.timeScale;
      s.phaseT += step;
      const b = s.ball;

      if (s.phase === "aim") {
        s.hintT += step;
        s.nudge = Math.max(0, s.nudge - step);
      }

      if ((s.phase === "flight" || s.phase === "after") && s.cur) {
        const { shot, res } = s.cur;
        s.ft += dt;
        s.pose = keeperPoseAt(res.plan, s.ft);

        if (b.mode === "flight") {
          const u = s.ft / shot.T;
          const uk = res.uKeeper;
          if (!s.keeperResolved && u >= uk) {
            s.keeperResolved = true;
            if (res.outcome === "save") {
              const p = ballAt(shot, uk);
              const v = ballVel(shot, uk);
              b.mode = "free";
              b.x = p.x; b.y = p.y; b.z = p.z;
              if (res.great) {
                // Prstima preko prečke ili pored stative.
                const high = p.y > 1.6;
                b.vx = high ? v.vx * 0.3 : Math.sign(p.x || 1) * 7.5;
                b.vy = high ? 7.5 : 2.5;
                b.vz = high ? 2.5 : 1.5;
              } else {
                b.vx = Math.sign(p.x - s.pose.x || 1) * (1.5 + Math.random() * 3);
                b.vy = 1.6 + Math.random() * 2.6;
                b.vz = -(3.5 + v.vz * 0.18);
              }
              b.spin *= -0.6;
              b.glow = 0;
              penaltySfx.glove(res.great);
              sfx.crowd(0.45, 1.5);
              shake.current.add(res.great ? 0.32 : 0.22);
              haptic(20);
              const sc = sceneRef.current;
              if (sc) {
                const q = proj(sc.cam, p.x, p.y, p.z);
                fx.current.burst(q.x, q.y, { count: res.great ? 26 : 16, colors: ["#ffffff", "#e9eef3"], speed: [90, 300], size: [1.2, 2.6], gravity: 300, shape: "spark", life: [0.25, 0.55] });
              }
              logShot(res, shot);
            }
          }
          if (b.mode === "flight") {
            const uu = Math.min(1, u);
            const p = ballAt(shot, uu);
            b.x = p.x; b.y = p.y; b.z = p.z;
            if (u >= 1 && !s.lineResolved) {
              s.lineResolved = true;
              const v = ballVel(shot, 1);
              b.mode = "free";
              b.vx = v.vx; b.vy = v.vy; b.vz = v.vz;
              const o = res.outcome;
              const sc = sceneRef.current;
              if (o === "post" || o === "bar") {
                const sx = Math.sign(shot.X) || 1;
                if (o === "post") {
                  b.vx = -sx * (res.in ? 2.4 + Math.abs(v.vx) * 0.25 : 1.8 + Math.abs(v.vx) * 0.35);
                  b.vz = res.in ? v.vz * 0.5 : -v.vz * 0.28;
                  b.vy = v.vy * 0.4 + 0.8;
                  s.vib = { left: 0, right: 0, bar: 0, age: 0, side: sx as -1 | 1, amp: 1 };
                } else {
                  b.vy = res.in ? -3.5 : 3 + Math.abs(v.vy) * 0.3;
                  b.vz = res.in ? v.vz * 0.45 : -v.vz * 0.22;
                  b.vx = v.vx * 0.5;
                  s.vib = { left: 0, right: 0, bar: 0, age: 0, side: 0, amp: 1 };
                }
                penaltySfx.clank(0.7 + shot.power * 0.5);
                shake.current.add(0.28);
                haptic(24);
                if (sc) {
                  const q = proj(sc.cam, o === "post" ? sx * HALF_W : shot.X, o === "bar" ? GOAL_H : shot.Y, GOAL_Z);
                  fx.current.burst(q.x, q.y, { count: 18, colors: ["#ffffff", "#fff6c8"], speed: [120, 380], size: [1, 2.2], gravity: 400, shape: "spark", life: [0.2, 0.45] });
                }
                if (res.in) celebrate(res, shot);
                else sfx.crowd(0.5, 1.4);
              } else if (o === "goal") {
                celebrate(res, shot);
              } else {
                sfx.crowd(0.35, 1.3);
                sfx.whoosh();
              }
              logShot(res, shot);
            }
          }
          // Trag
          b.trailClock += step;
          if (b.trailClock > 1 / 90) {
            b.trailClock = 0;
            b.trail.push({ x: b.x, y: b.y, z: b.z });
            if (b.trail.length > 7) b.trail.shift();
          }
        }

        if (b.mode === "free") {
          // Fizika nakon odbijanja / u mreži.
          b.vy -= GRAVITY * dt;
          const drag = Math.exp(-0.25 * dt);
          b.vx *= drag; b.vy *= drag; b.vz *= drag;
          b.x += b.vx * dt; b.y += b.vy * dt; b.z += b.vz * dt;
          if (b.trail.length) {
            b.trailClock += step;
            if (b.trailClock > 1 / 60) {
              b.trailClock = 0;
              b.trail.shift();
            }
          }
          // Trava
          if (b.y < BALL_R) {
            b.y = BALL_R;
            if (b.vy < -1.2) {
              penaltySfx.bounce(Math.min(1, -b.vy / 7));
              b.vy = -b.vy * 0.48;
              b.vx *= 0.82;
              b.vz *= 0.82;
            } else {
              b.vy = 0;
              const f = Math.exp(-1.8 * dt);
              b.vx *= f;
              b.vz *= f;
            }
          }
          // Unutar gola: mreža zadržava loptu.
          if (b.z > GOAL_Z && Math.abs(b.x) < HALF_W && b.y < GOAL_H) b.inGoal = true;
          if (b.inGoal) {
            const back = netZ(b.y) - BALL_R;
            if (b.z > back) {
              if (!b.netHit) {
                b.netHit = true;
                s.ripples.push({ x: b.x, y: b.y, age: 0, amp: clamp(Math.abs(b.vz) * 0.045, 0.18, 0.62) });
                penaltySfx.net();
              }
              b.z = back;
              b.vz = -Math.abs(b.vz) * 0.1;
              b.vx *= 0.45;
              b.vy *= 0.55;
            }
            const side = HALF_W - BALL_R;
            if (Math.abs(b.x) > side) {
              b.x = Math.sign(b.x) * side;
              b.vx = -b.vx * 0.2;
            }
            if (b.y > GOAL_H - BALL_R) {
              b.y = GOAL_H - BALL_R;
              b.vy = -Math.abs(b.vy) * 0.2;
            }
            s.bulge = b.z > back - 0.05 ? { x: b.x, y: b.y, d: 0.14 } : s.bulge ? { ...s.bulge, d: s.bulge.d * Math.exp(-3 * dt) } : null;
          } else if (b.z > BOARD_Z - 0.2 && b.y < 0.95) {
            // LED reklame iza gola
            b.z = BOARD_Z - 0.2;
            b.vz = -Math.abs(b.vz) * 0.3;
            penaltySfx.bounce(0.6);
          }
          // Lopta koja ode u publiku polako nestane.
          if (b.z > BOARD_Z + 0.5 || b.y > 6 || Math.abs(b.x) > 14 || b.z < -1.2) b.alpha = Math.max(0, b.alpha - step * 3);
          b.spin *= Math.exp(-1.2 * dt);
          if (b.y <= BALL_R + 0.001) b.spin = damp(b.spin, (b.vx + b.vz * 0.3) * 4, 6, dt);
        }
        b.rot += b.spin * dt;
      }

      // Nakon ishoda: pričekaj pa sljedeći penal ili kraj.
      if (s.phase === "after" && s.phaseT > 1.75) {
        if (s.shot >= SHOTS - 1) {
          finish();
          return;
        }
        s.phase = "reset";
        s.phaseT = 0;
        s.resetFrom = { ...s.pose };
        s.shot += 1;
        setCurrent(s.shot);
      }
      if (s.phase === "reset") {
        const k = clamp(s.phaseT / 0.6, 0, 1);
        s.pose = lerpPose(s.resetFrom, s.idlePose, ease.inOutCubic(k));
        if (k > 0.35 && b.mode !== "rest") {
          s.ball = newBall();
          s.ball.alpha = 0;
          s.bulge = null;
        }
        if (s.ball.mode === "rest") s.ball.alpha = Math.min(1, s.ball.alpha + step * 4);
        if (k >= 1) {
          s.phase = "aim";
          s.phaseT = 0;
          s.cur = null;
          s.hintT = 0;
          sfx.whistle();
        }
      }
    },
    [celebrate, finish, logShot]
  );

  // ── Crtanje (svaki frejm) ──────────────────────────────────────────────
  const render = useCallback(
    ({ dt, time }: { dt: number; time: number }) => {
      const v = view.current;
      const ctx = v.ctx;
      if (!ctx || v.w < 2) return;
      const { w, h } = v;
      if (dirty.current || !sceneRef.current || sceneRef.current.w !== w || sceneRef.current.h !== h || sceneRef.current.dpr !== v.dpr) {
        sceneRef.current = buildScene(w, h, v.dpr);
        dirty.current = false;
      }
      const sc = sceneRef.current;
      const cam = sc.cam;
      const s = g.current;
      const cv = canvasRef.current;
      if (cv && cv.dataset.phase !== s.phase) cv.dataset.phase = s.phase;
      const live = stateRef.current === "playing";
      // Pauza zamrzne i kozmetiku (čestice, mreža, natpis), ne samo simulaciju.
      const frozen = stateRef.current === "paused";
      const ts = live ? s.timeScale : frozen ? 0 : 1;
      const fdt = dt * ts;
      const cdt = frozen ? 0 : dt;

      // Golman u stavu: njiše se i poskakuje.
      const sway = Math.sin(time * 1.55) * 0.26 + Math.sin(time * 3.7) * 0.06;
      const hop = Math.abs(Math.sin(time * 3.1)) * 0.035;
      s.idlePose = { ...IDLE_POSE, x: sway, y: IDLE_POSE.y + hop, armL: 2.45 + Math.sin(time * 2.3) * 0.08, armR: 2.45 + Math.sin(time * 2.3 + 1) * 0.08, spread: 0.52 + Math.sin(time * 3.1) * 0.04 };
      if (s.phase === "aim" || stateRef.current === "start") s.pose = s.idlePose;

      // Kozmetika
      fx.current.update(fdt);
      shake.current.update(cdt);
      s.cheer = Math.max(0, s.cheer - cdt * 0.38);
      s.goalFlash = Math.max(0, s.goalFlash - cdt);
      s.whiteFlash = Math.max(0, s.whiteFlash - cdt * 2.2);
      s.punch = Math.max(0, s.punch - cdt * 1.6);
      s.fingerFade = s.dragging ? 1 : Math.max(0, s.fingerFade - dt * 4);
      for (let i = s.ripples.length - 1; i >= 0; i--) {
        s.ripples[i].age += fdt;
        if (s.ripples[i].age > 2.2) s.ripples.splice(i, 1);
      }
      s.vib.age += fdt;
      const vk = s.vib.amp * Math.exp(-s.vib.age * 7) * Math.sin(s.vib.age * 70);
      const vib = { left: s.vib.side < 0 ? vk * 2 : 0, right: s.vib.side > 0 ? vk * 2 : 0, bar: s.vib.side === 0 ? vk * 1.6 : 0 };
      if (s.banner) s.banner.age += cdt;
      // Bljeskovi fotoaparata
      const rate = 0.6 + s.cheer * 26;
      if (Math.random() < rate * dt) s.flashes.push({ x: Math.random() * w, y: lerp(sc.standTop, sc.standBottom - 6, Math.random()), age: 0, r: 1 + Math.random() * 1.8 });
      for (let i = s.flashes.length - 1; i >= 0; i--) {
        s.flashes[i].age += dt;
        if (s.flashes[i].age > 0.16) s.flashes.splice(i, 1);
      }

      // Kamera: lagani zoom prema golu dok lopta leti + udarac na gol.
      const flying = s.phase === "flight" || s.phase === "after";
      s.zoom = damp(s.zoom, flying ? 1.045 : 1, flying ? 3 : 4, dt);
      const z = s.zoom + ease.outCubic(s.punch) * 0.035;
      const gc = proj(cam, 0, 1, GOAL_Z);

      ctx.save();
      shake.current.apply(ctx, w / 2, h / 2);
      ctx.translate(gc.x, gc.y);
      ctx.scale(z, z);
      ctx.translate(-gc.x, -gc.y);

      ctx.drawImage(sc.bg, 0, 0, w, h);
      drawCrowd(ctx, sc, time, s.cheer);
      for (const f of s.flashes) {
        ctx.globalAlpha = 1 - f.age / 0.16;
        ctx.fillStyle = "#ffffff";
        ctx.beginPath();
        ctx.arc(f.x, f.y, f.r, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
      drawBoard(ctx, sc, time, s.goalFlash);
      drawGoalBack(ctx, cam);

      const b = s.ball;
      const bd = { x: b.x, y: b.y, z: b.z, rot: b.rot, alpha: b.alpha, trail: b.trail, glow: b.glow };
      drawBallShadow(ctx, cam, bd);
      const img = ballImg.current;
      if (b.z >= NET_BACK_Z) drawBall(ctx, cam, bd, img);
      drawNet(ctx, cam, s.ripples, s.bulge);
      if (b.z >= GOAL_Z && b.z < NET_BACK_Z) drawBall(ctx, cam, bd, img);
      drawFrame(ctx, cam, vib);
      if (b.z >= KEEPER_Z && b.z < GOAL_Z) drawBall(ctx, cam, bd, img);
      drawKeeper(ctx, cam, s.pose);
      if (b.z < KEEPER_Z) drawBall(ctx, cam, bd, img);
      fx.current.draw(ctx);
      ctx.restore();

      ctx.drawImage(sc.vignette, 0, 0, w, h);

      // Bijeli bljesak na gol
      if (s.whiteFlash > 0) {
        ctx.fillStyle = `rgba(255,255,255,${s.whiteFlash * 0.22})`;
        ctx.fillRect(0, 0, w, h);
      }

      const ballP = proj(cam, 0, BALL_R, 0);

      // Trag prsta
      if (s.fingerFade > 0 && s.samples.length > 1 && live) {
        const pts = s.samples;
        const n = pts.length;
        ctx.lineCap = "round";
        ctx.lineJoin = "round";
        for (let pass = 0; pass < 2; pass++) {
          for (let i = 1; i < n; i++) {
            const k = i / (n - 1);
            ctx.strokeStyle = pass === 0 ? `rgba(${BRAND.accentRgb},${0.16 * k * s.fingerFade})` : `rgba(${BRAND.accentRgb},${0.85 * k * s.fingerFade})`;
            ctx.lineWidth = pass === 0 ? 4 + k * 14 : 1 + k * 4;
            ctx.beginPath();
            ctx.moveTo(pts[i - 1].x, pts[i - 1].y);
            ctx.lineTo(pts[i].x, pts[i].y);
            ctx.stroke();
          }
        }
      }

      // Uputa za prvi penal: "duh" prsta koji pokaže potez.
      if (live && s.phase === "aim" && s.hint && !s.dragging) {
        const cyc = (s.hintT % 2.1) / 2.1;
        const k = clamp((cyc - 0.15) / 0.5, 0, 1);
        const e = ease.inOutCubic(k);
        const target = proj(cam, 2.6, 1.9, GOAL_Z);
        const sx = ballP.x + 6;
        const sy = ballP.y + 28;
        const ex = lerp(sx, target.x, 0.62);
        const ey = lerp(sy, target.y, 0.62);
        const bend = Math.sin(e * Math.PI) * 18;
        const fxp = lerp(sx, ex, e) + bend;
        const fyp = lerp(sy, ey, e);
        const alpha = cyc < 0.1 ? cyc / 0.1 : cyc > 0.75 ? Math.max(0, 1 - (cyc - 0.75) / 0.15) : 1;
        ctx.strokeStyle = `rgba(${BRAND.accentRgb},${0.5 * alpha})`;
        ctx.lineWidth = 3;
        ctx.lineCap = "round";
        ctx.beginPath();
        for (let i = 0; i <= 16; i++) {
          const t = (i / 16) * e;
          const x = lerp(sx, ex, t) + Math.sin(t * Math.PI) * 18;
          const y = lerp(sy, ey, t);
          if (i === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.stroke();
        ctx.fillStyle = `rgba(255,255,255,${0.9 * alpha})`;
        ctx.beginPath();
        ctx.arc(fxp, fyp, 11, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = `rgba(255,255,255,${0.35 * alpha})`;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(fxp, fyp, 17 + Math.sin(time * 6) * 1.5, 0, Math.PI * 2);
        ctx.stroke();
      }
      if (live && s.phase === "aim" && (s.hint || s.nudge > 0) && !s.dragging) {
        const msg = s.nudge > 0 ? "Povuci prema gore, prema golu" : "Povuci prstom prema golu";
        const y = Math.min(h - 18, ballP.y + 30 + 34);
        ctx.font = brandFont("body", 14, 600);
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        const tw = ctx.measureText(msg).width + 28;
        ctx.fillStyle = "rgba(0,0,0,0.5)";
        ctx.beginPath();
        ctx.roundRect?.(w / 2 - tw / 2, y - 16, tw, 32, 16);
        ctx.fill();
        ctx.fillStyle = "rgba(255,255,255,0.88)";
        ctx.fillText(msg, w / 2, y + 0.5);
      }

      // Natpis ishoda
      const bn = s.banner;
      if (bn && bn.age < 1.9) {
        const a = bn.age;
        const inK = ease.outBack(clamp(a / 0.38, 0, 1));
        const out = clamp((a - 1.45) / 0.4, 0, 1);
        const alpha = clamp(a / 0.12, 0, 1) * (1 - out);
        const cy = lerp(proj(cam, 0, 0, GOAL_Z).y, ballP.y, 0.5) - 6;
        ctx.save();
        ctx.translate(w / 2, cy);
        ctx.scale(0.55 + 0.45 * inK + out * 0.08, 0.55 + 0.45 * inK + out * 0.08);
        ctx.globalAlpha = alpha;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        const main = bn.main.toUpperCase();
        let fs = bn.good ? Math.min(w * 0.34, 150) : Math.min(w * 0.2, 92);
        ctx.font = brandFont("heading", fs);
        const mw = ctx.measureText(main).width;
        if (mw > w * 0.86) {
          fs *= (w * 0.86) / mw;
          ctx.font = brandFont("heading", fs);
        }
        ctx.shadowColor = bn.good ? `rgba(${BRAND.accentRgb},0.55)` : "rgba(0,0,0,0.6)";
        ctx.shadowBlur = bn.good ? 34 : 18;
        ctx.fillStyle = bn.good ? BRAND.accent : "#ffffff";
        ctx.fillText(main, 0, 0);
        ctx.shadowBlur = 0;
        ctx.font = brandFont("body", 12.5, 700);
        const sub = bn.sub.toUpperCase();
        const sw = ctx.measureText(sub).width + 26;
        ctx.fillStyle = "rgba(0,0,0,0.55)";
        ctx.beginPath();
        ctx.roundRect?.(-sw / 2, fs * 0.42, sw, 26, 13);
        ctx.fill();
        ctx.fillStyle = bn.good ? "rgba(255,255,255,0.92)" : "rgba(255,255,255,0.75)";
        ctx.fillText(sub, 0, fs * 0.42 + 13.5);
        ctx.restore();
        ctx.globalAlpha = 1;
      }
    },
    [view, canvasRef]
  );

  useGameLoop({ update, render, running: state === "playing" });

  // ── UI ─────────────────────────────────────────────────────────────────
  const tiers = tiersFor("penalty");
  const rewardLine = useMemo(() => {
    if (!rewardsEnabled() || !tiers.length) return null;
    const t = [...tiers].sort((a, b) => a.min - b.min)[0];
    const prize = formatPrize(t.prizes[0]);
    return `Zabij ${t.min} od ${SHOTS} i osvoji ${prize.title.toLowerCase()}.`;
  }, [tiers]);

  const clubName = PENALTY_BALLS.find((b) => b.id === club)?.name ?? "";
  // Uz karticu nagrade (samo kad je prekidač upaljen) nema mjesta za niz penala — gumbi moraju ostati na ekranu.
  const rewardShown = state === "result" && !!result && !!pickReward(result.score, { gameId: "penalty" });

  return (
    <GameShell
      gameId="penalty"
      title="Penalty Cup"
      kicker="Mini igra"
      description={rewardLine ? `Pet penala protiv DRESIFY golmana. ${rewardLine}` : "Pet penala protiv DRESIFY golmana. Sa svakim je penalom sve bolji."}
      bestKey={BEST_KEY}
      rules={[
        { icon: Hand, text: "Povuci prstom prema golu — brži potez, jači udarac" },
        { icon: Spline, text: "Povuci u luku i lopta će zavrnuti" }
      ]}
      state={state}
      onStart={start}
      onPause={() => setState("paused")}
      onResume={() => setState("playing")}
      result={result}
      scoreLabel="golova"
      shareImage={ballSrc(club)}
      startExtra={<BallPicker club={club} name={clubName} onPick={pickClub} />}
      resultExtra={rewardShown ? undefined : <ShotSummary log={log} />}
      hud={
        <>
          {narrow ? null : <HudStat label="Golovi" value={goals} accent bump={goals} />}
          <ShotDots log={log} current={current} compact={narrow} />
        </>
      }
    >
      <canvas ref={canvasRef} className="h-full w-full" aria-label="Penalty Cup — povuci prstom prema golu" />
    </GameShell>
  );
}

// ── Dijelovi sučelja ─────────────────────────────────────────────────────
function ShotDots({ log, current, compact = false }: { log: ShotLog[]; current: number; compact?: boolean }) {
  return (
    <div className={`flex flex-col rounded-[12px] border border-white/10 bg-black/45 pb-2.5 pt-1.5 ${compact ? "px-2.5" : "px-3"}`}>
      <span className="text-[9.5px] font-semibold uppercase tracking-[0.22em] text-white/50">
        Penal <span className="tabular-nums text-white/80">{Math.min(current + 1, SHOTS)}</span>/{SHOTS}
      </span>
      <span className={`mt-[9px] flex items-center ${compact ? "gap-[5px]" : "gap-[7px]"}`}>
        {Array.from({ length: SHOTS }, (_, i) => {
          const l = log[i];
          const now = !l && i === current;
          return (
            <span
              key={i}
              className={`relative grid h-[11px] w-[11px] place-items-center rounded-full transition-colors duration-300 ${
                l ? (l.goal ? "bg-accent shadow-[0_0_10px_rgba(232,255,60,0.55)]" : "bg-[#ff5a5f]/90") : now ? "bg-transparent ring-[1.5px] ring-white/85" : "bg-white/15"
              }`}
            >
              {now ? <span className="h-[4px] w-[4px] animate-pulse rounded-full bg-white" /> : null}
              {l && !l.goal ? <span className="h-[1.5px] w-[6px] rounded-full bg-black/70" /> : null}
            </span>
          );
        })}
      </span>
    </div>
  );
}

function ShotSummary({ log }: { log: ShotLog[] }) {
  if (!log.length) return null;
  const top = log.reduce((m, l) => Math.max(m, l.kmh), 0);
  return (
    <div>
      <div className="grid grid-cols-5 gap-1.5">
        {log.map((l, i) => (
          <div
            key={i}
            className={`flex h-[30px] items-center justify-center rounded-full border ${l.goal ? "border-accent bg-accent text-black" : "border-white/10 bg-white/[0.04] text-white/55"}`}
          >
            <span className="text-[10.5px] font-bold uppercase tracking-[0.02em]">{shortLabel(l.outcome, l.goal)}</span>
          </div>
        ))}
      </div>
      <p className="mt-2 text-center text-[12px] text-white/45">
        Najjači udarac <b className="font-semibold tabular-nums text-white/75">{top} km/h</b>
      </p>
    </div>
  );
}

function BallPicker({ club, name, onPick }: { club: string; name: string; onPick: (id: string) => void }) {
  return (
    <div>
      <div className="mb-2.5 flex items-center justify-between text-[10.5px] font-semibold uppercase tracking-[0.24em]">
        <span className="text-white/45">Tvoja lopta</span>
        <span className="text-white/80">{name}</span>
      </div>
      <div className="grid grid-cols-8 gap-1.5">
        {PENALTY_BALLS.map((b) => {
          const on = b.id === club;
          return (
            <button
              key={b.id}
              type="button"
              aria-label={`Lopta ${b.name}`}
              aria-pressed={on}
              onClick={() => onPick(b.id)}
              className={`relative aspect-square rounded-full p-[3px] transition-all duration-200 ${on ? "bg-accent/15 ring-2 ring-accent" : "opacity-55 ring-1 ring-white/10 hover:opacity-90"}`}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={ballSrc(b.id)} alt="" draggable={false} className={`h-full w-full rounded-full object-contain transition-transform duration-200 ${on ? "scale-100" : "scale-90"}`} />
            </button>
          );
        })}
      </div>
    </div>
  );
}
