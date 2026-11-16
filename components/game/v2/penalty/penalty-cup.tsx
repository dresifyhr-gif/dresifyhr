"use client";

// Penalty Karijera — razina po razina protiv sve boljeg golmana: živi zid,
// mete u kutovima, branič, vjetar i boss svakih 5 razina. Tri života.
// "Brza partija" je klasičnih pet penala (Penalty Cup).
// Potez prstom: smjer = kamo pokažeš, brzina = snaga, luk = zavrnuta lopta.

import { motion } from "framer-motion";
import { Hand, Heart, Spline } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";

import { BRAND, brandFont, clamp, createParticles, createShake, damp, ease, ensureBrandFonts, lerp, loadImage } from "../draw";
import { GameShell, HudStat, useCanvas, useFastTap, useGameLoop, usePointer, useStageLayout, type GameResult, type GameState } from "../game-shell";
import { formatPrize, pickReward, rewardsEnabled, tiersFor } from "../rewards";
import { haptic, sfx } from "../sfx";
import { penaltySfx, unlockPenaltyAudio } from "./audio";
import {
  AIM_GUIDE, BALLS, LIVES, canAffordSomething, careerCoins, careerTitle, freshProgress, levelSpec, loadProgress, memberXs,
  nextPrice, obstacleAt, quickCoins, resolveCareer, ringAt, saveProgress,
  type Block, type CoinPart, type LevelSpec, type Progress, type UpgradeId
} from "./career";
import {
  BOARD_Z, BOSS_KIT, buildScene, drawBall, drawBallShadow, drawBoard, drawBossAura, drawCrowd, drawFrame, drawGoalBack, drawKeeper,
  drawNet, drawPlayer, drawRing, drawWind, type Ripple, type Scene
} from "./scene";
import { CoinGlyph, Shop, ballSrc, type ShopContext } from "./shop";
import {
  BALL_R, GOAL_H, GOAL_Z, GRAVITY, HALF_W, IDLE_POSE, KEEPER_Z, NET_BACK_Z, SHOTS,
  applyWind, ballAt, ballVel, finalizeShot, intentFromSwipe, isGoal, keeperPoseAt, lerpPose, netZ, proj, resolveShot,
  type Intent, type Outcome, type Pose, type Resolution, type Sample, type Shot
} from "./sim";

type Mode = "career" | "quick";
const MODE_KEY = "dresify_v2_penalty_mode";
const BEST_QUICK = "dresify_v2_best_penalty";
const BEST_CAREER = "dresify_v2_best_penalty_karijera";

type ShotLog = { outcome: Outcome; goal: boolean; kmh: number; label: string };
type Phase = "intro" | "aim" | "flight" | "after" | "reset" | "shop";

type BallState = {
  mode: "rest" | "flight" | "free";
  x: number; y: number; z: number;
  vx: number; vy: number; vz: number;
  rot: number; spin: number; alpha: number;
  trail: { x: number; y: number; z: number }[];
  trailClock: number;
  inGoal: boolean; netHit: boolean; glow: number;
};

type Banner = { main: string; sub: string; good: boolean; age: number; boss?: boolean };
type Intro = { main: string; sub: string; boss: boolean; age: number; dur: number };
type Pop = { x: number; y: number; text: string; sub: string; age: number };
type ObFx = { flinch: number[]; dist: number; lastX: number };
type Streak = { x: number; y: number; len: number; age: number; life: number; v: number };
/** Kovanica koja leti od gola do brojača u HUD-u. */
type CoinFly = { sx: number; sy: number; cx: number; cy: number; age: number; delay: number; dur: number; value: number; i: number; last: boolean };

const newBall = (): BallState => ({
  mode: "rest", x: 0, y: BALL_R, z: 0, vx: 0, vy: 0, vz: 0, rot: 0, spin: 0, alpha: 1,
  trail: [], trailClock: 0, inGoal: false, netHit: false, glow: 0
});

const plural = (n: number, one: string, few: string, many: string) => {
  const t = n % 100;
  const d = n % 10;
  if (d === 1 && t !== 11) return one;
  if (d >= 2 && d <= 4 && (t < 12 || t > 14)) return few;
  return many;
};

function shortLabel(o: Outcome, goal: boolean) {
  if (goal) return "Gol";
  if (o === "save") return "Obrana";
  if (o === "post") return "Stativa";
  if (o === "bar") return "Prečka";
  return "Promašaj";
}

/** Savjet za razinu (prikaže se dok igrač ne povuče prstom). */
function tipFor(spec: LevelSpec | null, level: number) {
  if (!spec) return null;
  if (spec.boss) return "Boss brani sve osim savršenih kutova";
  if (level === 3) return "Zid se miče: pucaj kroz prolaz ili zavrni loptu";
  if (level === 6) return "Pogodi metu za dodatne kovanice";
  if (level === 11) return "Dva zida: čekaj da se otvori prolaz";
  if (level === 12) return "Vjetar nosi loptu, a branič iskorači prema njoj";
  return null;
}

const coinTotal = (parts: CoinPart[]) => parts.reduce((a, b) => a + b.amount, 0);
const isFrame = (o: Outcome) => o === "post" || o === "bar";
/** Glavna riječ natpisa kad lopta ne uđe: stativa i prečka zaslužuju svoju riječ. */
function missWord(o: Outcome) {
  if (o === "save") return "Obrana";
  if (o === "block") return "Blok";
  if (o === "post") return "Stativa";
  if (o === "bar") return "Prečka";
  return "Promašaj";
}
const isDev = process.env.NODE_ENV !== "production";

export function PenaltyKarijera() {
  const [state, setState] = useState<GameState>("start");
  const [mode, setModeState] = useState<Mode>("career");
  const [result, setResult] = useState<GameResult | null>(null);
  // Brza partija
  const [goals, setGoals] = useState(0);
  const [log, setLog] = useState<ShotLog[]>([]);
  const [current, setCurrent] = useState(0);
  // Karijera
  const [hudLevel, setHudLevel] = useState(1);
  const [hudBoss, setHudBoss] = useState(false);
  const [lives, setLives] = useState(LIVES);
  const [runStats, setRunStats] = useState({ goals: 0, coins: 0, bosses: 0 });
  const [progress, setProgressState] = useState<Progress>(freshProgress);
  const progRef = useRef(progress);
  const [shop, setShopState] = useState<ShopContext | null>(null);
  // Zatvaranje svlačionice: kratko izblijedi pa se makne (bez AnimatePresence,
  // čiji exit zna zapeti nakon okretanja mobitela i ostaviti nevidljiv sloj preko igre).
  const [shopClosing, setShopClosing] = useState(false);
  const closeTimer = useRef(0);
  const setShop = useCallback((ctx: ShopContext | null) => {
    window.clearTimeout(closeTimer.current);
    setShopClosing(false);
    setShopState(ctx);
  }, []);
  useEffect(() => () => window.clearTimeout(closeTimer.current), []);
  const [stageEl, setStageEl] = useState<HTMLElement | null>(null);

  const stateRef = useRef(state);
  stateRef.current = state;
  const modeRef = useRef(mode);
  modeRef.current = mode;

  const setProgress = useCallback((fn: (p: Progress) => Progress) => {
    const next = fn(progRef.current);
    progRef.current = next;
    setProgressState(next);
    saveProgress(next);
  }, []);

  const sceneRef = useRef<Scene | null>(null);
  const dirty = useRef(true);
  const [narrow, setNarrow] = useState(false);
  const [short, setShort] = useState(false);
  const { canvasRef, view } = useCanvas({
    onResize: (v) => {
      dirty.current = true;
      setNarrow(v.w < 380);
      setShort(v.h < 470);
    }
  });
  const ballImg = useRef<HTMLImageElement | null>(null);
  const fx = useRef(createParticles(360));
  const shake = useRef(createShake(9, 0.012));

  const g = useRef({
    mode: "career" as Mode,
    phase: "aim" as Phase,
    shot: 0,
    goals: 0,
    log: [] as ShotLog[],
    phaseT: 0,
    ft: 0,
    cur: null as { shot: Shot; res: Resolution; block: Block | null; rings: number[]; kickT: number } | null,
    keeperResolved: false,
    lineResolved: false,
    blockResolved: false,
    lastGoal: false,
    ball: newBall(),
    pose: { ...IDLE_POSE } as Pose,
    idlePose: { ...IDLE_POSE } as Pose,
    resetFrom: { ...IDLE_POSE } as Pose,
    timeScale: 1,
    slow: 0,
    hitstop: 0,
    zoom: 1,
    bossZoom: 0,
    punch: 0,
    ripples: [] as Ripple[],
    bulge: null as { x: number; y: number; d: number } | null,
    vib: { left: 0, right: 0, bar: 0, age: 9, side: 0 as -1 | 0 | 1, amp: 0 },
    banner: null as Banner | null,
    intro: null as Intro | null,
    pops: [] as Pop[],
    cheer: 0,
    goalFlash: 0,
    whiteFlash: 0,
    flashes: [] as { x: number; y: number; age: number; r: number }[],
    streaks: [] as Streak[],
    dragging: false,
    pointerId: -1,
    dragged: false,
    samples: [] as Sample[],
    fingerFade: 0,
    hint: true,
    hintT: 0,
    nudge: 0,
    ended: false,
    // Karijera
    level: 1,
    lives: LIVES,
    streak: 0,
    spec: null as LevelSpec | null,
    nextSpec: null as LevelSpec | null,
    levelT: 0,
    obFx: [] as ObFx[],
    obAlpha: 0,
    ringHit: [] as number[],
    runCoins: 0,
    bosses: 0,
    lifeBack: false,
    // Kamera startnog ekrana / rezultata (1 = kino kadar, 0 = igra).
    cine: 1,
    coinFly: [] as CoinFly[],
    shock: null as { x: number; y: number; age: number; boss: boolean } | null
  });
  // Kovanice u HUD-u rastu tek kad do brojača doleti kovanica s gola.
  const [coinsShown, setCoinsShown] = useState(0);

  // Napredak (kovanice, nadogradnje, lopte) i način igre iz localStorage.
  useEffect(() => {
    const p = loadProgress();
    progRef.current = p;
    setProgressState(p);
    try {
      const m = window.localStorage.getItem(MODE_KEY);
      if (m === "quick" || m === "career") setModeState(m);
    } catch {}
    ensureBrandFonts().then(() => (dirty.current = true));
  }, []);

  useEffect(() => {
    const el = canvasRef.current?.closest(".g2-stage") as HTMLElement | null;
    setStageEl(el);
  }, [canvasRef]);

  const club = progress.ball;
  useEffect(() => {
    let live = true;
    loadImage(ballSrc(club))
      .then((img) => {
        if (live) ballImg.current = img;
      })
      .catch(() => {});
    const id = window.setTimeout(() => BALLS.forEach((b) => loadImage(ballSrc(b.id)).catch(() => {})), 900);
    return () => {
      live = false;
      window.clearTimeout(id);
    };
  }, [club]);

  const setMode = useCallback((m: Mode) => {
    setModeState(m);
    sfx.tap();
    try {
      window.localStorage.setItem(MODE_KEY, m);
    } catch {}
  }, []);

  // ── Razine ─────────────────────────────────────────────────────────────
  const beginLevel = useCallback((spec: LevelSpec, retry: boolean) => {
    const s = g.current;
    s.spec = spec;
    s.levelT = 0;
    s.obFx = spec.obstacles.map(() => ({ flinch: [0, 0, 0], dist: 0, lastX: 0 }));
    s.ringHit = spec.rings.map(() => -1);
    s.dragged = false;
    s.phase = "intro";
    s.phaseT = 0;
    s.intro = {
      main: spec.boss ? "Boss" : `Level ${spec.level}`,
      sub: spec.boss ? `Level ${spec.level} · samo savršen udarac` : retry ? "Još jednom" : spec.tag,
      boss: !!spec.boss,
      age: 0,
      dur: retry ? 0.95 : spec.boss ? 1.75 : 1.3
    };
    s.bossZoom = spec.boss && !retry ? 1 : 0;
    setHudLevel(spec.level);
    setHudBoss(!!spec.boss);
    if (spec.boss && !retry) {
      penaltySfx.boss();
      haptic(30);
    } else if (!retry) penaltySfx.level();
  }, []);

  // ── Tijek igre ─────────────────────────────────────────────────────────
  const start = useCallback(() => {
    unlockPenaltyAudio();
    const s = g.current;
    s.mode = modeRef.current;
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
    s.hitstop = 0;
    s.zoom = 1;
    s.punch = 0;
    s.ripples = [];
    s.bulge = null;
    s.banner = null;
    s.intro = null;
    s.pops = [];
    s.cheer = 0;
    s.goalFlash = 0;
    s.dragging = false;
    s.samples = [];
    s.hintT = 0;
    s.nudge = 0;
    s.ended = false;
    s.level = 1;
    s.lives = LIVES;
    s.streak = 0;
    s.runCoins = 0;
    s.bosses = 0;
    s.spec = null;
    s.nextSpec = null;
    s.obFx = [];
    s.obAlpha = 0;
    s.ringHit = [];
    s.coinFly = [];
    s.shock = null;
    s.streaks = [];
    setCoinsShown(progRef.current.coins);
    fx.current.clear();
    shake.current.reset();
    setGoals(0);
    setLog([]);
    setCurrent(0);
    setLives(LIVES);
    setRunStats({ goals: 0, coins: 0, bosses: 0 });
    setResult(null);
    setShop(null);
    setState("playing");
    if (s.mode === "career") beginLevel(levelSpec(1), false);
    else sfx.whistle();
  }, [beginLevel, setShop]);

  const finish = useCallback(() => {
    const s = g.current;
    if (s.ended) return;
    s.ended = true;
    sfx.whistle(true);
    if (s.mode === "career") {
      const L = s.level;
      if (L >= 10) sfx.crowd(0.8, 2.4);
      setRunStats({ goals: s.goals, coins: s.runCoins, bosses: s.bosses });
      setResult({
        score: L,
        title: careerTitle(L),
        message: `${s.goals} ${plural(s.goals, "gol", "gola", "golova")} · +${s.runCoins} ${plural(s.runCoins, "kovanica", "kovanice", "kovanica")}`
      });
    } else {
      const n = s.goals;
      const title = n === 5 ? "Savršena serija" : n === 4 ? "Odlična serija" : n === 3 ? "Dobra serija" : n >= 1 ? "Golman je bio bolji" : "Ovaj put nije išlo";
      if (n >= 4) sfx.crowd(0.9, 2.6);
      setRunStats({ goals: n, coins: s.runCoins, bosses: 0 });
      setResult({ score: n, display: `${n}/${SHOTS}`, title });
    }
    setState("result");
  }, []);

  const kick = useCallback(
    (intent: Intent) => {
      const s = g.current;
      const up = progRef.current.up;
      let shot = finalizeShot(intent, up);
      const from = { ...s.idlePose };
      if (s.mode === "career" && s.spec) {
        shot = applyWind(shot, s.spec.wind);
        const cr = resolveCareer(shot, s.spec, from, s.levelT);
        s.cur = { shot, res: cr.res, block: cr.block, rings: cr.rings, kickT: s.levelT };
      } else {
        s.cur = { shot, res: resolveShot(shot, s.shot, from), block: null, rings: [], kickT: s.levelT };
      }
      s.phase = "flight";
      s.phaseT = 0;
      s.ft = 0;
      s.keeperResolved = false;
      s.lineResolved = false;
      s.blockResolved = false;
      s.hint = false;
      const b = s.ball;
      b.mode = "flight";
      b.trail = [];
      b.inGoal = false;
      b.netHit = false;
      b.spin = (shot.C !== 0 ? Math.sign(shot.C) : 1) * (10 + shot.power * 22 + Math.abs(shot.C) * 10);
      b.glow = shot.power > 0.78 || up.power >= 4 ? 1 : 0;
      sfx.kick(0.75 + shot.power * 0.6);
      penaltySfx.strike(0.6 + shot.power * 0.6);
      // Stadion je utihnuo prije udarca; dok lopta leti, žamor naraste.
      penaltySfx.ambience(0.85, 0.25);
      haptic(14);
      shake.current.add(0.1 + shot.power * 0.12);
      const sc = sceneRef.current;
      if (sc) {
        const p = proj(sc.cam, 0, 0.02, 0);
        fx.current.burst(p.x, p.y, { count: 14, colors: ["#3f8f4f", "#6fbf6a", "#d9f5c8"], speed: [60, 220], angle: -Math.PI / 2, spread: 2.4, gravity: 600, size: [1.2, 2.6], life: [0.3, 0.6] });
      }
    },
    []
  );

  // ── Unos ───────────────────────────────────────────────────────────────
  usePointer(canvasRef, {
    onDown: (p) => {
      unlockPenaltyAudio();
      const s = g.current;
      if (stateRef.current !== "playing" || s.phase !== "aim") return;
      // Drugi prst dok prvi vuče ne preuzima potez.
      if (s.dragging && s.pointerId !== p.id) return;
      s.pointerId = p.id;
      s.dragging = true;
      s.dragged = true;
      s.samples = [{ x: p.x, y: p.y, t: p.event.timeStamp || performance.now() }];
      s.fingerFade = 1;
      penaltySfx.ambience(0.25, 0.3);
    },
    onMove: (p) => {
      const s = g.current;
      if (!s.dragging || p.id !== s.pointerId) return;
      s.samples.push({ x: p.x, y: p.y, t: p.event.timeStamp || performance.now() });
      if (s.samples.length > 160) s.samples.shift();
    },
    onUp: (p) => {
      unlockPenaltyAudio();
      const s = g.current;
      if (!s.dragging || p.id !== s.pointerId) return;
      s.dragging = false;
      // Sustav je prekinuo dodir (npr. gesta s ruba ekrana, poziv): bez udarca.
      if (p.event.type === "pointercancel") {
        s.samples = [];
        penaltySfx.ambience(0.55, 0.6);
        return;
      }
      s.samples.push({ x: p.x, y: p.y, t: p.event.timeStamp || performance.now() });
      const sc = sceneRef.current;
      if (stateRef.current !== "playing" || s.phase !== "aim" || !sc) return;
      const info = intentFromSwipe(s.samples, sc.cam);
      if (info.intent) kick(info.intent);
      else {
        s.nudge = 1.6;
        sfx.tap();
        penaltySfx.ambience(0.55, 0.6);
      }
    }
  });

  useEffect(() => {
    if (state !== "playing") g.current.dragging = false;
  }, [state]);

  useEffect(() => {
    if (!g.current.coinFly.length) setCoinsShown(progress.coins);
  }, [progress.coins]);

  // Žamor stadiona samo dok traje igra; pauza, rezultat i start su tihi.
  useEffect(() => {
    penaltySfx.ambience(state === "playing" ? 0.55 : 0, state === "playing" ? 0.6 : 0.25);
  }, [state]);
  useEffect(() => () => penaltySfx.ambience(0, 0.1), []);

  // ── Ishodi ─────────────────────────────────────────────────────────────
  const popCoins = useCallback((parts: CoinPart[], at: { x: number; y: number }) => {
    const s = g.current;
    const total = coinTotal(parts);
    s.runCoins += total;
    s.pops.push({ x: at.x, y: at.y, text: `+${total}`, sub: parts.map((p) => `${p.label} ${p.amount}`).join(" · "), age: 0 });
    // Karijera: kovanice odlete do brojača u HUD-u (spremaju se odmah, prikaz stiže s njima).
    const cv = canvasRef.current;
    const chip = s.mode === "career" && cv ? (cv.closest(".g2-stage")?.querySelector("[data-pk-coins]") as HTMLElement | null) : null;
    if (chip && cv && total > 0) {
      const cr = cv.getBoundingClientRect();
      const hr = chip.getBoundingClientRect();
      const tx = hr.left - cr.left + 18;
      const ty = hr.top - cr.top + hr.height / 2;
      const n = clamp(3 + Math.floor(total / 9), 3, 9);
      const sx = (view.current.w || cr.width) / 2;
      const sy = at.y - 40;
      let left = total;
      for (let i = 0; i < n; i++) {
        const value = i === n - 1 ? left : Math.floor(total / n);
        left -= value;
        s.coinFly.push({
          sx: sx + (Math.random() - 0.5) * 40,
          sy: sy + (Math.random() - 0.5) * 14,
          cx: lerp(sx, tx, 0.25) + (Math.random() - 0.5) * 120,
          cy: Math.min(sy, ty) - 30 - Math.random() * 50,
          age: 0,
          delay: 0.55 + i * 0.055,
          dur: 0.52 + Math.random() * 0.12,
          value,
          i,
          last: i === n - 1
        });
      }
    } else {
      window.setTimeout(() => sfx.coin(), 260);
    }
    setProgress((p) => ({ ...p, coins: p.coins + total, earned: p.earned + total }));
  }, [setProgress, canvasRef, view]);

  const celebrate = useCallback((shot: Shot, boss: boolean) => {
    const s = g.current;
    const sc = sceneRef.current;
    s.slow = boss ? 0.55 : 0.4;
    s.punch = 1;
    s.cheer = 1;
    s.goalFlash = 2.4;
    s.whiteFlash = boss ? 0.8 : 0.5;
    shake.current.add(boss ? 0.4 : 0.32);
    penaltySfx.goal(boss);
    penaltySfx.ambience(0.95, 0.08);
    sfx.crowd(1, boss ? 4 : 3.4);
    haptic(boss ? 40 : 28);
    if (sc) {
      const mouth = proj(sc.cam, clamp(shot.X, -HALF_W, HALF_W), clamp(shot.Y, 0.3, GOAL_H), GOAL_Z + 0.6);
      s.shock = { x: mouth.x, y: mouth.y, age: 0, boss };
      const conf = { colors: [BRAND.accent, "#ffffff", BRAND.accent, "#f6ffa0"], shape: "confetti" as const, gravity: 260, drag: 1.6, life: [1.1, 1.9] as [number, number], size: [2.2, 4.2] as [number, number] };
      fx.current.burst(mouth.x, mouth.y, { ...conf, count: 34, speed: [120, 380], angle: -Math.PI / 2, spread: Math.PI * 1.4 });
      const big = { ...conf, gravity: 520, drag: 1.1, life: [1.4, 2.2] as [number, number], size: [2.6, 5] as [number, number] };
      fx.current.burst(-6, sc.h * 0.86, { ...big, count: boss ? 80 : 55, speed: [520, 900], angle: -Math.PI * 0.36, spread: 0.5 });
      fx.current.burst(sc.w + 6, sc.h * 0.86, { ...big, count: boss ? 80 : 55, speed: [520, 900], angle: -Math.PI * 0.64, spread: 0.5 });
    }
  }, []);

  const logShot = useCallback(
    (res: Resolution, shot: Shot) => {
      const s = g.current;
      const goal = isGoal(res);
      s.lastGoal = goal;
      s.phase = "after";
      s.phaseT = 0;
      const sc = sceneRef.current;
      const topBins = goal && shot.Y > 1.75 && Math.abs(shot.X) > 2.7;
      const mouth = sc ? proj(sc.cam, clamp(shot.X * 0.6, -2.2, 2.2), GOAL_H * 0.55, GOAL_Z) : { x: 0, y: 0 };

      if (s.mode === "quick") {
        if (goal) s.goals += 1;
        s.log = [...s.log, { outcome: res.outcome, goal, kmh: shot.kmh, label: res.label }];
        setLog(s.log);
        setGoals(s.goals);
        if (goal) popCoins(quickCoins({ topBins }), mouth);
        s.banner = { main: goal ? "Gol" : missWord(res.outcome), sub: goal || !isFrame(res.outcome) ? `${res.label} · ${shot.kmh} km/h` : `${shot.kmh} km/h`, good: goal, age: 0 };
        if (!goal) penaltySfx.groan(res.outcome === "post" || res.outcome === "bar" ? 1.1 : 0.8);
        return;
      }

      const spec = s.spec!;
      if (goal) {
        s.goals += 1;
        s.streak += 1;
        const rings = s.cur?.rings.length ?? 0;
        s.lifeBack = false;
        if (spec.boss) {
          s.bosses += 1;
          if (s.lives < LIVES) {
            s.lives += 1;
            s.lifeBack = true;
            setLives(s.lives);
          }
        }
        popCoins(careerCoins({ level: spec.level, topBins, rings, boss: spec.boss, curve: Math.abs(shot.C) > 0.6, streak: s.streak }), mouth);
        s.banner = {
          main: spec.boss ? "Boss pao" : "Gol",
          sub: spec.boss && s.lifeBack ? `${res.label} · +1 život` : `${res.label} · ${shot.kmh} km/h`,
          good: true,
          age: 0,
          boss: !!spec.boss
        };
      } else {
        s.streak = 0;
        s.lives -= 1;
        setLives(s.lives);
        penaltySfx.life();
        haptic(20);
        const main = missWord(res.outcome);
        const left = s.lives > 0 ? `Još ${s.lives} ${plural(s.lives, "život", "života", "života")}` : "Kraj karijere";
        s.banner = { main, sub: isFrame(res.outcome) ? left : `${res.label} · ${left}`, good: false, age: 0 };
        penaltySfx.groan(isFrame(res.outcome) ? 1.1 : s.lives > 0 ? 0.8 : 1);
      }
    },
    [popCoins]
  );

  const afterShot = useCallback(() => {
    const s = g.current;
    if (s.mode === "quick") {
      if (s.shot >= SHOTS - 1) {
        finish();
        return;
      }
      s.shot += 1;
      setCurrent(s.shot);
      s.nextSpec = null;
    } else {
      if (s.lives <= 0) {
        finish();
        return;
      }
      const wasBoss = !!s.spec?.boss;
      if (s.lastGoal) {
        s.level += 1;
        s.nextSpec = levelSpec(s.level);
        if (wasBoss) {
          // Svlačionica između razina (nakon bossa).
          s.phase = "shop";
          s.phaseT = 0;
          s.resetFrom = { ...s.pose };
          setShop("boss");
          penaltySfx.ambience(0.15, 0.5);
          return;
        }
      } else s.nextSpec = levelSpec(s.level);
    }
    s.phase = "reset";
    s.phaseT = 0;
    s.resetFrom = { ...s.pose };
  }, [finish, setShop]);

  // ── Simulacija (fiksni korak) ──────────────────────────────────────────
  const update = useCallback(
    (step: number) => {
      const s = g.current;
      if (s.ended) return;
      if (s.hitstop > 0) {
        s.hitstop -= step;
        s.timeScale = 0.05;
      } else if (s.slow > 0) {
        s.slow -= step;
        s.timeScale = 0.28;
      } else s.timeScale = damp(s.timeScale, 1, 9, step);
      const dt = step * s.timeScale;
      s.phaseT += step;
      if (s.phase !== "shop") s.levelT += dt;
      const b = s.ball;

      if (s.phase === "intro" && s.intro) {
        s.intro.age += step;
        s.obAlpha = Math.min(1, s.obAlpha + step * 3);
        if (s.intro.age >= s.intro.dur) {
          s.phase = "aim";
          s.phaseT = 0;
          s.hintT = 0;
          sfx.whistle();
        }
      }
      if (s.phase === "aim") {
        s.hintT += step;
        s.nudge = Math.max(0, s.nudge - step);
        s.obAlpha = Math.min(1, s.obAlpha + step * 3);
      }

      if ((s.phase === "flight" || s.phase === "after") && s.cur) {
        const { shot, res, block } = s.cur;
        s.ft += dt;
        s.pose = keeperPoseAt(res.plan, s.ft);

        if (b.mode === "flight") {
          const u = s.ft / shot.T;
          // Lopta u zid / braniča
          if (block && !s.blockResolved && u >= block.u) {
            s.blockResolved = true;
            const p = ballAt(shot, block.u);
            const v = ballVel(shot, block.u);
            const o = s.spec?.obstacles[block.index];
            const st = o ? obstacleAt(o, s.levelT, { t: s.cur.kickT, ballX: p.x }) : null;
            const mx = o && st ? memberXs(o, st)[block.member] : p.x;
            b.mode = "free";
            b.x = p.x; b.y = p.y; b.z = p.z;
            b.vz = -(2.2 + v.vz * 0.16);
            b.vy = 1.4 + Math.random() * 2.4 + (p.y > 1.4 ? 1.5 : 0);
            b.vx = clamp((p.x - mx) * 9, -4, 4) + (Math.random() - 0.5) * 1.5;
            b.spin *= -0.5;
            b.glow = 0;
            const f = s.obFx[block.index];
            if (f) f.flinch[block.member] = 1;
            penaltySfx.body(0.6 + shot.power * 0.5);
            sfx.crowd(0.4, 1.3);
            shake.current.add(0.26);
            s.hitstop = 0.07;
            haptic(22);
            const sc = sceneRef.current;
            if (sc) {
              const q = proj(sc.cam, p.x, p.y, p.z);
              fx.current.burst(q.x, q.y, { count: 14, colors: ["#ffffff", "#d9dde2"], speed: [80, 260], size: [1.2, 2.4], gravity: 300, shape: "spark", life: [0.2, 0.45] });
            }
            logShot(res, shot);
          }
          if (b.mode === "flight" && !s.keeperResolved && u >= res.uKeeper) {
            s.keeperResolved = true;
            if (res.outcome === "save") {
              const uk = res.uKeeper;
              const p = ballAt(shot, uk);
              const v = ballVel(shot, uk);
              b.mode = "free";
              b.x = p.x; b.y = p.y; b.z = p.z;
              if (res.great) {
                const high = p.y > 1.6;
                b.vx = high ? v.vx * 0.3 : Math.sign(p.x || 1) * 7.5;
                b.vy = high ? 7.5 : 2.5;
                b.vz = high ? 2.5 : 1.5;
                s.hitstop = 0.06;
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
              const boss = !!s.spec?.boss && s.mode === "career";
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
                if (res.in) celebrate(shot, boss);
                else sfx.crowd(0.5, 1.4);
              } else if (o === "goal") {
                celebrate(shot, boss);
              } else {
                sfx.crowd(0.35, 1.3);
                sfx.whoosh();
              }
              // Mete
              if (s.cur.rings.length && s.spec && sc) {
                for (const i of s.cur.rings) {
                  s.ringHit[i] = 0;
                  const r = s.spec.rings[i];
                  const rp = ringAt(r, s.levelT);
                  const q = proj(sc.cam, rp.x, rp.y, GOAL_Z);
                  fx.current.burst(q.x, q.y, { count: 30, colors: [BRAND.accent, "#ffffff", "#f6ffa0"], speed: [140, 420], size: [1.4, 3], gravity: 160, shape: "spark", life: [0.35, 0.8] });
                }
                penaltySfx.ring();
                s.hitstop = 0.09;
              }
              logShot(res, shot);
            }
          }
          b.trailClock += step;
          if (b.trailClock > 1 / 90) {
            b.trailClock = 0;
            b.trail.push({ x: b.x, y: b.y, z: b.z });
            if (b.trail.length > 7) b.trail.shift();
          }
        }

        if (b.mode === "free") {
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
            b.z = BOARD_Z - 0.2;
            b.vz = -Math.abs(b.vz) * 0.3;
            penaltySfx.bounce(0.6);
          }
          if (b.z > BOARD_Z + 0.5 || b.y > 6 || Math.abs(b.x) > 14 || b.z < -1.2) b.alpha = Math.max(0, b.alpha - step * 3);
          b.spin *= Math.exp(-1.2 * dt);
          if (b.y <= BALL_R + 0.001) b.spin = damp(b.spin, (b.vx + b.vz * 0.3) * 4, 6, dt);
        }
        b.rot += b.spin * dt;
      }

      // Nakon ishoda: pričekaj pa sljedeći penal / razina ili kraj.
      if (s.phase === "after" && s.phaseT > (s.banner?.boss ? 2.3 : 1.75)) afterShot();
      if (s.phase === "reset") {
        const k = clamp(s.phaseT / 0.6, 0, 1);
        s.pose = lerpPose(s.resetFrom, s.idlePose, ease.inOutCubic(k));
        if (s.nextSpec) s.obAlpha = Math.max(0, s.obAlpha - step * 4);
        if (k > 0.35 && b.mode !== "rest") {
          s.ball = newBall();
          s.ball.alpha = 0;
          s.bulge = null;
        }
        if (s.ball.mode === "rest") s.ball.alpha = Math.min(1, s.ball.alpha + step * 4);
        if (k >= 1) {
          s.cur = null;
          if (s.mode === "career" && s.nextSpec) {
            const retry = s.nextSpec.level === s.spec?.level;
            const spec = s.nextSpec;
            s.nextSpec = null;
            beginLevel(spec, retry);
          } else {
            s.phase = "aim";
            s.phaseT = 0;
            s.hintT = 0;
            sfx.whistle();
          }
          penaltySfx.ambience(0.55, 0.8);
        }
      }
    },
    [afterShot, beginLevel, celebrate, logShot]
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
      if (cv) {
        if (cv.dataset.phase !== s.phase) cv.dataset.phase = s.phase;
        const lv = String(s.level);
        if (cv.dataset.level !== lv) cv.dataset.level = lv;
      }
      const live = stateRef.current === "playing";
      const frozen = stateRef.current === "paused";
      const ts = live ? s.timeScale : frozen ? 0 : 1;
      const fdt = dt * ts;
      const cdt = frozen ? 0 : dt;
      const career = s.mode === "career" && stateRef.current !== "start";
      const spec = career ? s.spec : null;
      const boss = !!spec?.boss;

      const sway = Math.sin(time * 1.55) * 0.26 + Math.sin(time * 3.7) * 0.06;
      const hop = Math.abs(Math.sin(time * 3.1)) * 0.035;
      s.idlePose = { ...IDLE_POSE, x: sway, y: IDLE_POSE.y + hop, armL: 2.45 + Math.sin(time * 2.3) * 0.08, armR: 2.45 + Math.sin(time * 2.3 + 1) * 0.08, spread: 0.52 + Math.sin(time * 3.1) * 0.04 };
      if (s.phase === "aim" || s.phase === "intro" || stateRef.current === "start") s.pose = s.idlePose;

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
      for (let i = s.pops.length - 1; i >= 0; i--) {
        s.pops[i].age += cdt;
        if (s.pops[i].age > 1.6) s.pops.splice(i, 1);
      }
      for (let i = 0; i < s.ringHit.length; i++) if (s.ringHit[i] >= 0) s.ringHit[i] += fdt;
      const rate = 0.6 + s.cheer * 26;
      if (Math.random() < rate * dt) s.flashes.push({ x: Math.random() * w, y: lerp(sc.standTop, sc.standBottom - 6, Math.random()), age: 0, r: 1 + Math.random() * 1.8 });
      for (let i = s.flashes.length - 1; i >= 0; i--) {
        s.flashes[i].age += dt;
        if (s.flashes[i].age > 0.16) s.flashes.splice(i, 1);
      }

      // Kamera: zoom prema golu dok lopta leti, udarac na gol, boss izlazi.
      const flying = s.phase === "flight" || s.phase === "after";
      s.zoom = damp(s.zoom, flying ? 1.045 : 1, flying ? 3 : 4, dt);
      const introK = s.intro && s.phase === "intro" ? s.intro.age / s.intro.dur : 1;
      s.bossZoom = s.phase === "intro" && boss ? Math.max(0, 1 - Math.max(0, introK - 0.55) / 0.45) * (s.bossZoom > 0 ? 1 : 0) : damp(s.bossZoom, 0, 6, dt);
      // Kino kadar na startu i rezultatu: kamera bliže golu i polako "diše"; na "Igraj" se smiri u kadar igre.
      const still = stateRef.current === "start" || stateRef.current === "result";
      s.cine = damp(s.cine, still ? 1 : 0, still ? 1.4 : 2.6, dt);
      if (stateRef.current === "result") {
        s.obAlpha = Math.max(0, s.obAlpha - dt * 2.5);
        if (s.coinFly.length) {
          s.coinFly.length = 0;
          setCoinsShown(progRef.current.coins);
        }
      }
      const cineK = ease.inOutCubic(clamp(s.cine, 0, 1));
      const z = s.zoom + ease.outCubic(s.punch) * 0.035 + ease.inOutCubic(s.bossZoom) * 0.14 + cineK * (0.035 + Math.sin(time * 0.42) * 0.008);
      const gc = proj(cam, s.bossZoom > 0.01 ? s.pose.x * 0.5 : 0, 1, GOAL_Z);

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

      // Mete u kutovima
      if (spec && spec.rings.length) {
        spec.rings.forEach((r, i) => {
          const hit = s.ringHit[i] ?? -1;
          const p = ringAt(r, s.levelT);
          if (hit < 0) drawRing(ctx, cam, p.x, p.y, r.r, time, s.obAlpha);
          else if (hit < 0.5) {
            const k = hit / 0.5;
            drawRing(ctx, cam, p.x, p.y, r.r * (1 + ease.outCubic(k) * 0.7), time, s.obAlpha * (1 - k), 1 - k);
          }
        });
      }

      if (b.z >= KEEPER_Z && b.z < GOAL_Z) drawBall(ctx, cam, bd, img);
      if (boss) drawBossAura(ctx, cam, s.pose, time, s.obAlpha);
      drawKeeper(ctx, cam, s.pose, boss ? BOSS_KIT : undefined);

      // Prepreke (od dalje prema bliže), lopta između njih po dubini.
      const drawables: { z: number; draw: () => void }[] = [];
      if (spec && spec.obstacles.length && s.obAlpha > 0.01) {
        spec.obstacles.forEach((o, i) => {
          const kickInfo = s.cur ? { t: s.cur.kickT, ballX: ballAt(s.cur.shot, o.z / GOAL_Z).x } : null;
          const st = obstacleAt(o, s.levelT, kickInfo);
          const f = s.obFx[i];
          if (!f) return;
          if (f.lastX === 0 && f.dist === 0) f.lastX = st.x;
          f.dist += Math.abs(st.x - f.lastX);
          f.lastX = st.x;
          for (let m = 0; m < f.flinch.length; m++) f.flinch[m] = Math.max(0, f.flinch[m] - cdt * 2.5);
          const xs = memberXs(o, st);
          const moving = clamp(Math.abs(st.vx) / 1.4, 0, 1);
          const lean = clamp(st.vx * 0.035, -0.12, 0.12);
          drawables.push({
            z: o.z,
            draw: () => {
              // Od rubova prema sredini (sredina preko susjeda).
              const order = xs.map((x, m) => ({ x, m })).sort((a, c) => Math.abs(c.x - st.x) - Math.abs(a.x - st.x));
              for (const { x, m } of order) {
                drawPlayer(ctx, cam, {
                  x, z: o.z, jy: st.jy, lean, step: (f.dist / 0.32) * Math.PI + m * 1.3, moving, flinch: ease.outCubic(f.flinch[m] ?? 0),
                  kind: o.kind, lunge: st.lunge, look: i * 3 + m + (spec.level % 3), alpha: s.obAlpha, time
                });
              }
            }
          });
        });
      }
      if (b.z < KEEPER_Z) drawables.push({ z: b.z + 0.001, draw: () => drawBall(ctx, cam, bd, img) });
      drawables.sort((a, c) => c.z - a.z);
      for (const d of drawables) d.draw();
      // Udarni val iz mreže na gol: tanki prsten limete koji se širi i nestane.
      const sh = s.shock;
      if (sh) {
        sh.age += fdt;
        const life = sh.boss ? 0.8 : 0.62;
        if (sh.age > life) s.shock = null;
        else {
          const k = sh.age / life;
          const e = ease.outCubic(k);
          ctx.strokeStyle = `rgba(${BRAND.accentRgb},${0.55 * (1 - k)})`;
          ctx.lineWidth = 1 + 5 * (1 - e);
          ctx.beginPath();
          ctx.ellipse(sh.x, sh.y, 12 + e * w * (sh.boss ? 0.62 : 0.48), (12 + e * w * (sh.boss ? 0.62 : 0.48)) * 0.42, 0, 0, Math.PI * 2);
          ctx.stroke();
        }
      }
      fx.current.draw(ctx);
      ctx.restore();

      ctx.drawImage(sc.vignette, 0, 0, w, h);
      // Startni ekran i rezultat: scena se povuče u pozadinu, tekst preko nje se čita.
      if (cineK > 0.004) {
        ctx.fillStyle = `rgba(6,7,6,${0.44 * cineK})`;
        ctx.fillRect(0, 0, w, h);
      }
      if (s.whiteFlash > 0) {
        ctx.fillStyle = `rgba(255,255,255,${s.whiteFlash * 0.22})`;
        ctx.fillRect(0, 0, w, h);
      }

      const ballP = proj(cam, 0, BALL_R, 0);
      const crossbarY = proj(cam, 0, GOAL_H, GOAL_Z).y;

      // Vjetar: oznaka iznad gola i tanke crte koje teku preko terena.
      if (spec && spec.wind && stateRef.current !== "result") {
        const mag = Math.abs(spec.wind);
        if (!frozen && Math.random() < mag * 2.2 * dt) {
          const y = lerp(crossbarY + 10, ballP.y - 40, Math.random());
          s.streaks.push({ x: spec.wind > 0 ? -60 : w + 60, y, len: 30 + Math.random() * 60, age: 0, life: 1.4 + Math.random(), v: (120 + mag * 60) * Math.sign(spec.wind) });
        }
        ctx.lineCap = "round";
        for (let i = s.streaks.length - 1; i >= 0; i--) {
          const st = s.streaks[i];
          st.age += cdt;
          st.x += st.v * cdt;
          if (st.age > st.life) {
            s.streaks.splice(i, 1);
            continue;
          }
          const a = Math.sin((st.age / st.life) * Math.PI) * 0.09 * s.obAlpha;
          ctx.strokeStyle = `rgba(255,255,255,${a})`;
          ctx.lineWidth = 1.2;
          ctx.beginPath();
          ctx.moveTo(st.x, st.y);
          ctx.lineTo(st.x - Math.sign(st.v) * st.len, st.y);
          ctx.stroke();
        }
        // Položeno: gol je nizak, pa oznaka ide u donji desni kut (ne preko gola).
        if (w > h * 1.3) drawWind(ctx, w - 120, h - 30, spec.wind, time, s.obAlpha);
        else drawWind(ctx, w / 2, Math.max(80, crossbarY - 20), spec.wind, time, s.obAlpha);
      } else if (s.streaks.length) s.streaks.length = 0;

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

      // Nišan: putanja lopte dok povlačiš (duljina ovisi o nadogradnji).
      if (live && s.dragging && s.phase === "aim" && s.samples.length > 2) {
        const info = intentFromSwipe(s.samples, cam);
        if (info.intent) {
          const up = progRef.current.up;
          let pv = finalizeShot(info.intent, up, Math.random, false);
          if (spec) pv = applyWind(pv, spec.wind);
          const len = AIM_GUIDE[clamp(up.aim, 0, AIM_GUIDE.length - 1)];
          ctx.save();
          shake.current.apply(ctx, w / 2, h / 2);
          for (let u = 0.05; u <= len + 1e-6; u += 0.04) {
            const p = ballAt(pv, u);
            const q = proj(cam, p.x, p.y, p.z);
            const k = u / len;
            const r = clamp(0.024 * q.s, 1.6, 5.5);
            ctx.fillStyle = `rgba(${BRAND.accentRgb},${0.85 * (1 - k * 0.75)})`;
            ctx.beginPath();
            ctx.arc(q.x, q.y, r, 0, Math.PI * 2);
            ctx.fill();
          }
          if (up.aim >= 3) {
            const q = proj(cam, pv.X, Math.max(BALL_R, pv.Y), GOAL_Z);
            const R = 9;
            ctx.strokeStyle = `rgba(${BRAND.accentRgb},0.9)`;
            ctx.lineWidth = 1.6;
            ctx.beginPath();
            ctx.arc(q.x, q.y, R, 0, Math.PI * 2);
            ctx.moveTo(q.x - R - 5, q.y);
            ctx.lineTo(q.x - R + 3, q.y);
            ctx.moveTo(q.x + R - 3, q.y);
            ctx.lineTo(q.x + R + 5, q.y);
            ctx.moveTo(q.x, q.y - R - 5);
            ctx.lineTo(q.x, q.y - R + 3);
            ctx.moveTo(q.x, q.y + R - 3);
            ctx.lineTo(q.x, q.y + R + 5);
            ctx.stroke();
          }
          ctx.restore();
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
        const fxp = lerp(sx, ex, e) + Math.sin(e * Math.PI) * 18;
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
      const tip = career && !s.dragged ? tipFor(spec, s.level) : null;
      if (live && s.phase === "aim" && (s.hint || s.nudge > 0 || tip) && !s.dragging) {
        const msg = s.nudge > 0 ? "Povuci prema gore, prema golu" : s.hint ? "Povuci prstom prema golu" : tip!;
        const y = Math.min(h - 18, ballP.y + 64);
        const fs = w < 360 ? 12.5 : 13.5;
        ctx.font = brandFont("body", fs, 600);
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        const tw = Math.min(w - 24, ctx.measureText(msg).width + 28);
        const a = clamp(s.hintT / 0.3, 0, 1);
        ctx.globalAlpha = a;
        ctx.fillStyle = "rgba(0,0,0,0.55)";
        ctx.beginPath();
        ctx.roundRect?.(w / 2 - tw / 2, y - 16, tw, 32, 16);
        ctx.fill();
        ctx.fillStyle = s.hint || s.nudge > 0 ? "rgba(255,255,255,0.88)" : "rgba(255,255,255,0.82)";
        ctx.fillText(msg, w / 2, y + 0.5, tw - 20);
        ctx.globalAlpha = 1;
      }

      // Uvod u razinu
      const it = s.intro;
      if (it && s.phase === "intro" && live) {
        const a = it.age;
        const inK = ease.outBack(clamp(a / 0.42, 0, 1));
        const out = clamp((a - (it.dur - 0.3)) / 0.3, 0, 1);
        const alpha = clamp(a / 0.15, 0, 1) * (1 - out);
        const cy = lerp(crossbarY, ballP.y, 0.5);
        ctx.save();
        if (it.boss) {
          ctx.globalAlpha = alpha * 0.55;
          const vg = ctx.createRadialGradient(w / 2, cy, Math.min(w, h) * 0.15, w / 2, cy, Math.max(w, h) * 0.7);
          vg.addColorStop(0, "rgba(0,0,0,0)");
          vg.addColorStop(1, "rgba(0,0,0,0.85)");
          ctx.fillStyle = vg;
          ctx.fillRect(0, 0, w, h);
        }
        ctx.globalAlpha = alpha;
        ctx.translate(w / 2, cy);
        const sc2 = 0.7 + 0.3 * inK + out * 0.06;
        ctx.scale(sc2, sc2);
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        let fs = it.boss ? Math.min(w * 0.36, 170, h * 0.26) : Math.min(w * 0.2, 96, h * 0.18);
        ctx.font = brandFont("heading", fs);
        const main = it.main.toUpperCase();
        const mw = ctx.measureText(main).width;
        if (mw > w * 0.86) {
          fs *= (w * 0.86) / mw;
          ctx.font = brandFont("heading", fs);
        }
        ctx.shadowColor = it.boss ? `rgba(${BRAND.accentRgb},0.6)` : "rgba(0,0,0,0.6)";
        ctx.shadowBlur = it.boss ? 40 : 18;
        ctx.fillStyle = it.boss ? BRAND.accent : "#ffffff";
        ctx.fillText(main, 0, 0);
        ctx.shadowBlur = 0;
        const lw = Math.min(w * 0.5, 180) * ease.outCubic(clamp((a - 0.1) / 0.5, 0, 1));
        ctx.fillStyle = BRAND.accent;
        ctx.fillRect(-lw / 2, fs * 0.42, lw, 2);
        ctx.font = brandFont("body", 12.5, 700);
        ctx.fillStyle = it.boss ? "rgba(255,255,255,0.85)" : `rgba(${BRAND.accentRgb},0.95)`;
        ctx.fillText(it.sub.toUpperCase(), 0, fs * 0.42 + 20);
        ctx.restore();
      }

      // Natpis ishoda
      const bn = s.banner;
      if (bn && bn.age < (bn.boss ? 2.3 : 1.9)) {
        const a = bn.age;
        const hold = bn.boss ? 1.85 : 1.45;
        const inK = ease.outBack(clamp(a / 0.38, 0, 1));
        const out = clamp((a - hold) / 0.4, 0, 1);
        const alpha = clamp(a / 0.12, 0, 1) * (1 - out);
        const cy = lerp(proj(cam, 0, 0, GOAL_Z).y, ballP.y, 0.5) - 6;
        // Promašaj se kratko strese (kao "ne"), gol samo iskoči.
        const jolt = bn.good ? 0 : Math.sin(a * 46) * Math.exp(-a * 7.5) * 9;
        ctx.save();
        ctx.translate(w / 2 + jolt, cy);
        ctx.scale(0.55 + 0.45 * inK + out * 0.08, 0.55 + 0.45 * inK + out * 0.08);
        ctx.globalAlpha = alpha;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        const main = bn.main.toUpperCase();
        let fs = bn.good ? Math.min(w * 0.34, 150, h * 0.24) : Math.min(w * 0.2, 92, h * 0.17);
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
        const sw = Math.min(w - 20, ctx.measureText(sub).width + 26);
        ctx.fillStyle = "rgba(0,0,0,0.55)";
        ctx.beginPath();
        ctx.roundRect?.(-sw / 2, fs * 0.42, sw, 26, 13);
        ctx.fill();
        ctx.fillStyle = bn.good ? "rgba(255,255,255,0.92)" : "rgba(255,255,255,0.75)";
        ctx.fillText(sub, 0, fs * 0.42 + 13.5, sw - 16);
        ctx.restore();
        ctx.globalAlpha = 1;
      }

      // Kovanice iznad gola
      for (const p of s.pops) {
        const a = p.age;
        if (a < 0.22) continue;
        const k = clamp((a - 0.22) / 1.3, 0, 1);
        const alpha = clamp((a - 0.22) / 0.12, 0, 1) * (1 - clamp((k - 0.7) / 0.3, 0, 1));
        const y = p.y - 26 - ease.outCubic(k) * 34;
        ctx.save();
        ctx.globalAlpha = alpha;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        const pop = 1 + 0.25 * (1 - ease.outBack(clamp((a - 0.22) / 0.3, 0, 1)));
        ctx.translate(w / 2, y);
        ctx.scale(pop, pop);
        ctx.font = brandFont("heading", 34);
        const tw = ctx.measureText(p.text).width;
        // Kovanica
        const cx = -tw / 2 - 14;
        ctx.fillStyle = BRAND.accent;
        ctx.beginPath();
        ctx.arc(cx, -1, 10, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = "rgba(0,0,0,0.6)";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(cx, -1, 5, 0, Math.PI * 2);
        ctx.stroke();
        ctx.shadowColor = `rgba(${BRAND.accentRgb},0.5)`;
        ctx.shadowBlur = 16;
        ctx.fillStyle = BRAND.accent;
        ctx.fillText(p.text, 6, 0);
        ctx.shadowBlur = 0;
        ctx.font = brandFont("body", 11, 700);
        ctx.fillStyle = "rgba(255,255,255,0.75)";
        ctx.fillText(p.sub.toUpperCase(), 0, 24, w - 24);
        ctx.restore();
      }

      // Kovanice lete do brojača (luk, ubrzaju pri kraju, mali trag).
      if (s.coinFly.length) {
        // Cilj se čita jednom po frejmu (HUD se može pomaknuti, npr. okretanje mobitela).
        let tx = -1;
        let ty = -1;
        const cvEl = canvasRef.current;
        const chip = cvEl?.closest(".g2-stage")?.querySelector("[data-pk-coins]") as HTMLElement | null;
        if (chip && cvEl) {
          const cr = cvEl.getBoundingClientRect();
          const hr = chip.getBoundingClientRect();
          tx = hr.left - cr.left + 18;
          ty = hr.top - cr.top + hr.height / 2;
        }
        for (let i = s.coinFly.length - 1; i >= 0; i--) {
          const c = s.coinFly[i];
          c.age += cdt;
          const t = (c.age - c.delay) / c.dur;
          if (t < 0) continue;
          if (t >= 1) {
            s.coinFly.splice(i, 1);
            const done = !s.coinFly.length;
            setCoinsShown((v) => (done ? progRef.current.coins : Math.min(progRef.current.coins, v + c.value)));
            penaltySfx.tally(c.i, c.last);
            continue;
          }
          const e = t * t * (2.2 - 1.2 * t);
          const u = 1 - e;
          const ex = tx < 0 ? c.sx : tx;
          const ey = ty < 0 ? c.sy - 80 : ty;
          const x = u * u * c.sx + 2 * u * e * c.cx + e * e * ex;
          const y = u * u * c.sy + 2 * u * e * c.cy + e * e * ey;
          const r = 6.5 * (1 - 0.35 * e) * (t < 0.12 ? ease.outBack(t / 0.12) : 1);
          ctx.globalAlpha = t < 0.08 ? t / 0.08 : 1;
          ctx.fillStyle = `rgba(${BRAND.accentRgb},0.18)`;
          ctx.beginPath();
          ctx.arc(x, y, r * 2, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = BRAND.accent;
          ctx.beginPath();
          ctx.arc(x, y, r, 0, Math.PI * 2);
          ctx.fill();
          ctx.strokeStyle = "rgba(0,0,0,0.55)";
          ctx.lineWidth = 1.4;
          ctx.beginPath();
          ctx.arc(x, y, r * 0.5, 0, Math.PI * 2);
          ctx.stroke();
          ctx.globalAlpha = 1;
        }
      }
    },
    [view, canvasRef]
  );

  useGameLoop({ update, render, running: state === "playing" });

  // ── Svlačionica ────────────────────────────────────────────────────────
  const onUpgrade = useCallback(
    (id: UpgradeId) => {
      const p = progRef.current;
      const price = nextPrice(p, id);
      if (price === null || price > p.coins) return false;
      setProgress((q) => ({ ...q, coins: q.coins - price, up: { ...q.up, [id]: q.up[id] + 1 } }));
      return true;
    },
    [setProgress]
  );
  const onBall = useCallback(
    (id: string): "picked" | "bought" | "poor" => {
      const p = progRef.current;
      if (p.balls.includes(id)) {
        setProgress((q) => ({ ...q, ball: id }));
        return "picked";
      }
      const b = BALLS.find((x) => x.id === id);
      if (!b || b.price > p.coins) return "poor";
      setProgress((q) => ({ ...q, coins: q.coins - b.price, balls: [...q.balls, id], ball: id }));
      return "bought";
    },
    [setProgress]
  );
  const closeShop = useCallback(() => {
    const ctx = shop;
    if (!ctx || shopClosing) return;
    setShopClosing(true);
    window.clearTimeout(closeTimer.current);
    closeTimer.current = window.setTimeout(() => {
      setShopClosing(false);
      setShopState(null);
    }, 200);
    if (ctx === "boss") {
      const s = g.current;
      // Dvostruki dodir na "Nastavi" (ili dodir tijekom izlazne animacije) ne smije ponovno pokrenuti prijelaz.
      if (s.phase !== "shop") return;
      s.phase = "reset";
      s.phaseT = 0;
      s.resetFrom = { ...s.pose };
      if (stateRef.current === "paused") setState("playing");
    }
  }, [shop, shopClosing]);

  // ── Razvoj: prečaci za testiranje (samo u dev načinu) ─────────────────
  useEffect(() => {
    if (!isDev) return;
    const w = window as unknown as { __pk?: unknown };
    w.__pk = {
      level: (n: number) => {
        const s = g.current;
        if (s.mode !== "career" || stateRef.current !== "playing") return false;
        s.level = n;
        s.cur = null;
        s.ball = newBall();
        s.banner = null;
        beginLevel(levelSpec(n), false);
        return true;
      },
      shoot: (X: number, Y: number, C = 0, power = 0.8) => {
        const s = g.current;
        if (s.phase !== "aim") return false;
        kick({ X, Y, C, power });
        return true;
      },
      coins: (n: number) => setProgress((p) => ({ ...p, coins: n })),
      lives: (n: number) => {
        g.current.lives = n;
        setLives(n);
      },
      info: () => ({ phase: g.current.phase, level: g.current.level, lives: g.current.lives, spec: g.current.spec, ft: g.current.ft, ts: g.current.timeScale, levelT: g.current.levelT, pose: g.current.pose, cur: g.current.cur })
    };
    return () => {
      delete w.__pk;
    };
  }, [beginLevel, kick, setProgress]);

  // ── UI ─────────────────────────────────────────────────────────────────
  const tiers = tiersFor("penalty");
  const rewardLine = useMemo(() => {
    if (!rewardsEnabled() || !tiers.length) return null;
    const t = [...tiers].sort((a, b) => a.min - b.min)[0];
    const prize = formatPrize(t.prizes[0]);
    return `Zabij ${t.min} od ${SHOTS} i osvoji ${prize.title.toLowerCase()}.`;
  }, [tiers]);

  const career = mode === "career";
  const rewardShown = !career && state === "result" && !!result && !!pickReward(result.score, { gameId: "penalty" });
  const affordable = canAffordSomething(progress);
  const openShop = useCallback((ctx: ShopContext) => {
    sfx.tap();
    setShop(ctx);
  }, [setShop]);

  const shopNode =
    stageEl && shop
      ? createPortal(
          <Shop progress={progress} context={shop} closing={shopClosing} nextLevel={g.current.level} lifeBack={g.current.lifeBack} onUpgrade={onUpgrade} onBall={onBall} onClose={closeShop} />,
          stageEl
        )
      : null;

  return (
    <GameShell
      gameId={career ? "penalty-karijera" : "penalty"}
      title={career ? "Penalty Karijera" : "Penalty Cup"}
      kicker={career ? "Mini igra · Karijera" : "Mini igra · Brza partija"}
      description={
        career
          ? "Svaki gol je level više. Golman je sve bolji, a čekaju te zid, mete, vjetar i boss."
          : rewardLine
            ? `Pet penala protiv DRESIFY golmana. ${rewardLine}`
            : "Pet penala protiv DRESIFY golmana. Sa svakim je penalom sve bolji."
      }
      bestKey={career ? BEST_CAREER : BEST_QUICK}
      rules={
        career
          ? [
              { icon: Hand, text: "Povuci prema golu, brže je jače" },
              { icon: Spline, text: "Povuci u luku i zavrni loptu oko zida" },
              { icon: Heart, text: "Tri života, promašaj košta jedan" }
            ]
          : [
              { icon: Hand, text: "Povuci prema golu, brže je jače" },
              { icon: Spline, text: "Povuci u luku i lopta će zavrnuti" }
            ]
      }
      state={state}
      onStart={start}
      onPause={() => {
        if (g.current.phase !== "shop") setState("paused");
      }}
      onResume={() => setState("playing")}
      result={result}
      scoreLabel={career ? "level" : "golova"}
      shareImage={ballSrc(club)}
      startExtra={<StartExtra mode={mode} onMode={setMode} progress={progress} affordable={affordable} compact={short} onShop={() => openShop("start")} />}
      resultExtra={
        career ? (
          <ShopButton progress={progress} affordable={affordable} onTap={() => openShop("result")} compact />
        ) : rewardShown ? undefined : (
          <ShotSummary log={log} coins={runStats.coins} />
        )
      }
      hud={
        career ? (
          <CareerHud level={hudLevel} boss={hudBoss} lives={lives} coins={coinsShown} narrow={narrow} />
        ) : (
          <>
            {narrow ? null : <HudStat label="Golovi" value={goals} accent bump={goals} />}
            <ShotDots log={log} current={current} compact={narrow} />
          </>
        )
      }
    >
      <canvas ref={canvasRef} className="h-full w-full" aria-label="Penalty Karijera: povuci prstom prema golu" />
      {shopNode}
    </GameShell>
  );
}

/** Staro ime (stranica /igra). */
export const PenaltyCup = PenaltyKarijera;

// ── Dijelovi sučelja ─────────────────────────────────────────────────────
function HudChip({ label, children, narrow, ...rest }: { label?: string; children: React.ReactNode; narrow?: boolean; "data-pk-coins"?: boolean }) {
  return (
    <div {...rest} className={`flex flex-col rounded-[12px] border border-white/10 bg-black/45 pb-1.5 pt-1.5 ${narrow ? "px-2" : "px-3"} ${label ? "" : "justify-center"}`}>
      {label ? <span className={`font-semibold uppercase text-white/50 ${narrow ? "text-[9px] tracking-[0.16em]" : "text-[9.5px] tracking-[0.22em]"}`}>{label}</span> : null}
      {children}
    </div>
  );
}

/** Kovanice u HUD-u: velike brojke skraćeno (12k), da HUD nikad ne uđe pod gumbe. */
function hudCoins(n: number, narrow: boolean) {
  const lim = narrow ? 10000 : 100000;
  if (n < lim) return String(n);
  return `${Math.floor(n / 1000)}k`;
}

function CareerHud({ level, boss, lives, coins, narrow }: { level: number; boss: boolean; lives: number; coins: number; narrow: boolean }) {
  const shown = hudCoins(coins, narrow);
  const long = shown.length >= 4;
  return (
    <div className={`flex items-start ${narrow ? "gap-1.5" : "gap-2.5"}`}>
      <HudChip label={boss ? "Boss" : "Level"} narrow={narrow}>
        <motion.span
          key={level}
          initial={{ scale: 1.45, color: "#ffffff" }}
          animate={{ scale: 1, color: BRAND.accent }}
          transition={{ type: "spring", stiffness: 480, damping: 18 }}
          className="origin-left font-heading text-[28px] leading-[0.95] tabular-nums"
        >
          {level}
        </motion.span>
      </HudChip>
      <HudChip label="Životi" narrow={narrow}>
        <span className={`flex h-[26.6px] items-center ${narrow ? "gap-[3px]" : "gap-[5px]"}`}>
          {Array.from({ length: LIVES }, (_, i) => {
            const on = i < lives;
            return (
              <motion.span
                key={`${i}-${on ? 1 : 0}`}
                initial={on ? { scale: 0.4 } : { scale: 1.6 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", stiffness: 520, damping: 16 }}
                className="grid place-items-center"
              >
                <Heart
                  className={`${narrow ? "h-[13px] w-[13px]" : "h-[16px] w-[16px]"} ${on ? "text-accent drop-shadow-[0_0_6px_rgba(232,255,60,0.5)]" : "text-white/20"}`}
                  fill={on ? "currentColor" : "none"}
                  strokeWidth={2}
                />
              </motion.span>
            );
          })}
        </span>
      </HudChip>
      <HudChip label={narrow ? undefined : "Kovanice"} narrow={narrow} data-pk-coins>
        <span className={`flex items-center ${narrow ? "h-[40px] gap-1" : "h-[26.6px] gap-1.5"}`} aria-label={`${coins} kovanica`}>
          <CoinGlyph size={narrow ? 12 : 15} />
          <motion.span
            key={coins}
            initial={{ scale: 1.3 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", stiffness: 520, damping: 18 }}
            className={`origin-left font-heading leading-none tabular-nums text-white ${narrow ? (long ? "text-[18px]" : "text-[21px]") : long ? "text-[22px]" : "text-[24px]"}`}
          >
            {shown}
          </motion.span>
        </span>
      </HudChip>
    </div>
  );
}

// Klizna oznaka bez layoutId: dijeljeni layout animacije u sloju koji izlazi
// (start ekran, svlačionica) znale su zaustaviti izlaznu animaciju.
function ModeSwitch({ mode, onMode }: { mode: Mode; onMode: (m: Mode) => void }) {
  return (
    <div className="relative grid grid-cols-2 rounded-[13px] border border-white/10 bg-white/[0.04] p-1" role="tablist" aria-label="Način igre">
      <motion.span
        aria-hidden
        initial={false}
        animate={{ x: mode === "career" ? "0%" : "100%" }}
        transition={{ type: "spring", stiffness: 500, damping: 38 }}
        className="pointer-events-none absolute bottom-1 left-1 top-1 w-[calc(50%-4px)] rounded-[10px] bg-accent"
      />
      {(
        [
          ["career", "Karijera"],
          ["quick", "Brza partija"]
        ] as const
      ).map(([id, label]) => (
        <ModeTab key={id} on={mode === id} onTap={() => mode !== id && onMode(id)}>
          {label}
        </ModeTab>
      ))}
    </div>
  );
}

function ModeTab({ on, onTap, children }: { on: boolean; onTap: () => void; children: React.ReactNode }) {
  const fast = useFastTap(onTap);
  return (
    <button type="button" role="tab" aria-selected={on} {...fast} className={`relative h-9 rounded-[10px] text-[13px] font-semibold transition-[color,transform] duration-200 active:scale-[0.96] ${on ? "text-black" : "text-white/60 active:text-white/85"}`}>
      <span className="relative">{children}</span>
    </button>
  );
}

function ShopButton({ progress, affordable, onTap, compact = false }: { progress: Progress; affordable: boolean; onTap: () => void; compact?: boolean }) {
  const fast = useFastTap(onTap);
  const upTotal = progress.up.power + progress.up.curve + progress.up.aim;
  return (
    <motion.button
      type="button"
      whileTap={{ scale: 0.97 }}
      {...fast}
      className={`flex w-full items-center gap-3 rounded-[14px] border border-white/10 bg-white/[0.04] px-3 text-left transition-colors active:bg-white/[0.08] ${compact ? "h-[46px]" : "h-[54px]"}`}
    >
      <span className={`relative shrink-0 ${compact ? "h-7 w-7" : "h-9 w-9"}`}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={ballSrc(progress.ball)} alt="" draggable={false} className="h-full w-full rounded-full object-contain" />
        {affordable ? <span className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full bg-accent ring-2 ring-[#111]" /> : null}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-[14px] font-semibold leading-tight text-white">Svlačionica</span>
        {compact ? null : (
          <span className="block truncate text-[11.5px] leading-tight text-white/45">
            {affordable ? "Imaš dovoljno za nadogradnju" : upTotal ? `Nadogradnje ${upTotal}/13 · lopte` : "Nadogradnje i lopte"}
          </span>
        )}
      </span>
      <span className="flex shrink-0 items-center gap-1.5 rounded-full border border-white/10 bg-black/30 px-2.5 py-1">
        <CoinGlyph size={13} />
        <span className="font-heading text-[18px] leading-none tabular-nums text-white">{progress.coins}</span>
      </span>
    </motion.button>
  );
}

function StartExtra({ mode, onMode, progress, affordable, compact, onShop }: { mode: Mode; onMode: (m: Mode) => void; progress: Progress; affordable: boolean; compact: boolean; onShop: () => void }) {
  const land = useStageLayout().land === "fit";
  if (compact && !land) {
    // Nizak ekran (npr. iPhone SE): način igre i svlačionica u jednom retku.
    return (
      <div className="flex items-stretch gap-2">
        <div className="min-w-0 flex-1">
          <ModeSwitch mode={mode} onMode={onMode} />
        </div>
        <ShopChip progress={progress} affordable={affordable} onTap={onShop} />
      </div>
    );
  }
  return (
    <div className="space-y-2">
      <ModeSwitch mode={mode} onMode={onMode} />
      <ShopButton progress={progress} affordable={affordable} onTap={onShop} compact={compact || land} />
    </div>
  );
}

function ShopChip({ progress, affordable, onTap }: { progress: Progress; affordable: boolean; onTap: () => void }) {
  const fast = useFastTap(onTap);
  return (
    <motion.button
      type="button"
      whileTap={{ scale: 0.95 }}
      {...fast}
      aria-label={`Svlačionica, ${progress.coins} kovanica`}
      className="relative flex shrink-0 items-center gap-2 rounded-[13px] border border-white/10 bg-white/[0.04] pl-1.5 pr-3 active:bg-white/[0.08]"
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={ballSrc(progress.ball)} alt="" draggable={false} className="h-7 w-7 rounded-full object-contain" />
      <CoinGlyph size={12} />
      <span className="font-heading text-[18px] leading-none tabular-nums text-white">{progress.coins}</span>
      {affordable ? <span className="absolute -right-1 -top-1 h-2.5 w-2.5 rounded-full bg-accent ring-2 ring-[#0a0a0a]" /> : null}
    </motion.button>
  );
}

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

function ShotSummary({ log, coins }: { log: ShotLog[]; coins: number }) {
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
      <p className="mt-2 flex items-center justify-center gap-1.5 text-center text-[12px] text-white/45">
        Najjači udarac <b className="font-semibold tabular-nums text-white/75">{top} km/h</b>
        {coins > 0 ? (
          <>
            <span className="text-white/25">·</span>
            <CoinGlyph size={11} />
            <b className="font-semibold tabular-nums text-white/75">+{coins}</b>
          </>
        ) : null}
      </p>
    </div>
  );
}

