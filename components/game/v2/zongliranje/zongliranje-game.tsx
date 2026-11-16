"use client";

// ŽONGLIRANJE — drži loptu u zraku što dulje.
//
// Pravila:
//   - Tapni loptu da je udariš prema gore. Mjesto dodira u odnosu na središte
//     određuje smjer: dodir lijevo od središta šalje loptu udesno i obrnuto.
//   - Dodir po sredini (unutar nišana na lopti) je "Savršeno!" — niz savršenih
//     diže množitelj (3 → x2, 6 → x3, 10 → x4). Svaki drugi udarac vraća niz na nulu.
//   - Lopta se može udariti tek kad uspori (nišan zasvijetli) — nema "spama".
//   - Povremeno se pojavi kapa: dotakni je loptom za +5 bodova.
//   - Težina raste polako: gravitacija (od 10. dodira), uži nišan (od 20.),
//     vjetar (od 25.).
//   - Lopta padne na travu → kraj igre (uz 0,1 s milosti "za dlaku").
//   Rezultat = bodovi (dodiri x množitelj + kape). Ciljevi: 25 / 50 / 100 dodira.
//
// Pravednost na iPhoneu:
//   - pogodak se provjerava i prema položaju lopte do ~85 ms unatrag (kašnjenje
//     zaslona i prsta), uzima se najbliži;
//   - zona pogotka je ~1,5 x polumjer lopte; savršeno ovisi samo o vodoravnom pomaku;
//   - lopta nikad ne leti pod gumbe u HUD-u (vrh leta je ograničen);
//   - 0,1 s nakon što lopta dotakne travu još se može spasiti.

import { AnimatePresence, motion } from "framer-motion";
import { Crosshair, Hand } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

import { BRAND, brandFont, clamp, createParticles, damp, ease, ensureBrandFonts, lerp, loadImage, rand, roundRect, softShadow } from "../draw";
import { GameShell, HudStat, useCanvas, useGameLoop, usePointer, type GameResult, type GameState } from "../game-shell";
import { pickReward } from "../rewards";
import { haptic, sfx } from "../sfx";
import {
  BALL_KEY,
  BEST_KEY,
  CLUBS,
  MILESTONES,
  ballSrc,
  capSrc,
  isClubId,
  plural,
  readMilestones,
  saveMilestones,
  type ClubId
} from "./clubs";
import { music } from "./music";
import {
  paintBallFlash,
  paintBallShade,
  paintFlare,
  paintFog,
  paintGlow,
  paintGrassFront,
  paintScene,
  sceneAnchors,
  SCENE_BLEED,
  type SceneAnchors
} from "./scene";

// ── Fizika (svjetske jedinice; svijet je najmanje 400 x 640) ─────────────
const R = 50; // polumjer lopte
const RISE = 300; // koliko se lopta digne nakon udarca
const G0 = 1480;
const G_EXTRA = 780; // + gravitacija do 100. dodira
const HIT_R0 = 1.6; // × R — zona dodira na početku…
const HIT_R1 = 1.45; // …i nakon 120 dodira (i dalje velikodušno za prst)
const PERF0 = 0.27; // |pomak| / R za savršeno na početku…
const PERF1 = 0.18; // …i nakon 100 dodira
const SIDE = 380; // bočna brzina za dodir na samom rubu
const MIN_VY_TO_KICK = -380; // dok lopta brzo leti gore, ne može se udariti
const KICK_GAP = 0.24; // s — najmanji razmak između dva udarca (nema "rafala" pri vrhu)
const HIGH_BAND = 110; // lopta visoko gore (blizu vrha leta) se ne može udariti — nema "farmanja" pri vrhu
const WIND_FROM = 25;
const CAP_FROM = 8;
const CAP_POINTS = 5;
const GROUND_PAD = 58;
const GRACE = 0.1; // s — "za dlaku": lopta je dotaknula travu, još se može spasiti
const REWIND_STEPS = 10; // × 1/120 s ≈ 85 ms kompenzacije kašnjenja
const HUD_SAFE_PX = 64; // vrh leta ostaje ispod gumba pauze/zvuka
/** Najviši dopušteni položaj središta lopte (svijet) — ispod HUD-a. */
const topSafeAt = (sc: number) => HUD_SAFE_PX / sc + R * 0.8;

type Phase = "ready" | "air" | "down";
type FloatText = { x: number; y: number; vy: number; text: string; color: string; size: number; t: number; max: number; heading: boolean; rot: number };
type Ring = { x: number; y: number; t: number; max: number; color: string; r0: number; r1: number; w: number };
type Cap = { x: number; y: number; t: number; life: number; got: number };
type Streak = { x: number; y: number; len: number; sp: number };
type Mote = { x: number; y: number; vx: number; vy: number; a: number; ph: number };
type Flash = { x: number; y: number; t: number; max: number; s: number };

/** Mjerilo svijeta: najmanje 400 x 640 (uspravno); položeno 560 visine da lopta ne bude sitna. */
const worldScale = (w: number, h: number) => Math.min(w / 400, h / (w > h * 1.2 ? 560 : 640)) || 1;

const smooth = (k: number, from: number, to: number) => {
  const t = clamp((k - from) / (to - from), 0, 1);
  return t * t * (3 - 2 * t);
};
// Nakon 100. dodira težina i dalje raste, ali vrlo polako (inače dobar igrač žonglira beskonačno).
const gravityAt = (k: number) => G0 + G_EXTRA * smooth(k, 10, 100) + 320 * smooth(k, 100, 260);
const perfectAt = (k: number) => lerp(PERF0, PERF1, smooth(k, 20, 100));
const hitAt = (k: number) => lerp(HIT_R0, HIT_R1, smooth(k, 30, 120));
const windAt = (k: number) => (k < WIND_FROM ? 0 : lerp(45, 125, smooth(k, WIND_FROM, 110)) + 35 * smooth(k, 110, 260));

function multFor(streak: number) {
  return streak >= 10 ? 4 : streak >= 6 ? 3 : streak >= 3 ? 2 : 1;
}

function nextMultAt(streak: number) {
  return streak >= 10 ? null : streak >= 6 ? 10 : streak >= 3 ? 6 : 3;
}

/** 25, 50, 100 (ciljevi), zatim svakih 50. */
function milestoneTitle(k: number): string | null {
  if (k === 25) return "Lijep niz";
  if (k === 50) return "Ozbiljna kontrola";
  if (k === 100) return "Majstorski";
  if (k > 100 && k % 50 === 0) return k >= 200 ? "Legendarno" : "Nevjerojatno";
  return null;
}

function freshSim() {
  return {
    phase: "ready" as Phase,
    x: 0, y: 0, px: 0, py: 0, vx: 0, vy: 0,
    rot: 0, spin: 0.6,
    hover: 0,
    kicks: 0, points: 0, streak: 0, mult: 1, maxMult: 1, perfects: 0, caps: 0, maxStreak: 0, saves: 0,
    wind: 0, windTarget: 0, windTimer: 2.2, // prvi nalet tek ~2 s nakon 25. dodira (ne preko slavlja)
    cap: null as Cap | null,
    capCooldown: 5,
    grace: 0,
    downT: 0, bounces: 0, failed: false,
    hitstop: 0, ts: 1, tsHold: 0,
    sinceKick: 9,
    hist: [] as { x: number; y: number }[],
    finished: false,
    reached: [] as number[],
    recordShown: false,
    hinted: 0
  };
}

function freshLook() {
  return {
    sq: 0, sqV: 0, sqAng: -Math.PI / 2, // opruga gnječenja lopte
    flash: 0, // bijeli bljesak lopte
    glow: 0, // sjaj savršenog
    scoreBump: 0, multBump: 0, counterFlash: 0,
    swoosh: null as { x: number; y: number; dir: number; t: number; perfect: boolean } | null,
    banner: null as { value: number; title: string; t: number } | null,
    flare: 0, whiteFlash: 0, crowdBoost: 0,
    windPulse: 0, windDir: 0
  };
}

/** previewRewards — samo za pregled dizajna kartice nagrade (ništa ne sprema). */
export function ZongliranjeGame({ previewRewards = false }: { previewRewards?: boolean } = {}) {
  const [state, setState] = useState<GameState>("start");
  const [points, setPoints] = useState(0);
  const [best, setBest] = useState<number | null>(null);
  const [result, setResult] = useState<GameResult | null>(null);
  const [club, setClub] = useState<ClubId>("hrvatska");
  const [unlocked, setUnlocked] = useState<number[]>([]);
  const [run, setRun] = useState<{ reached: number[]; fresh: number[] }>({ reached: [], fresh: [] });

  const stateRef = useRef(state);
  stateRef.current = state;

  // Spriteovi (crtaju se jednom po veličini)
  const sprites = useRef<{
    scene: HTMLCanvasElement;
    shade: HTMLCanvasElement;
    glow: HTMLCanvasElement;
    ballFlash: HTMLCanvasElement;
    fog: HTMLCanvasElement;
    grass: HTMLCanvasElement;
    flare: HTMLCanvasElement;
    spark: HTMLCanvasElement;
    dark: HTMLCanvasElement;
    anchors: SceneAnchors;
  } | null>(null);
  const dirty = useRef(true);
  const scale = useRef(1);

  const sim = useRef(freshSim());
  const look = useRef(freshLook());
  // Kamera: zum (opruga), središte zuma u svijetu, trešnja i paralaksa pozadine.
  const cam = useRef({ z: 1, zv: 0, fx: 200, fy: 320, trauma: 0, t: 0, sx: 0, sy: 0, bgx: 0, bgy: 0, fgx: 0 });
  const lastWorld = useRef<{ W: number; ground: number } | null>(null);

  const pauseGame = useCallback(() => {
    music.stopAll();
    setState("paused");
  }, []);

  const { canvasRef, view } = useCanvas({
    onResize: (v) => {
      dirty.current = true;
      // Promjena veličine (rotacija, prozor): lopta i kapa ostaju na istom relativnom
      // mjestu u novom svijetu, a promjena širine usred igre pauzira igru — da lopta
      // ne padne dok igrač okreće mobitel.
      const sc = worldScale(v.w, v.h);
      const W = v.w / sc;
      const ground = v.h / sc - GROUND_PAD;
      const prev = lastWorld.current;
      lastWorld.current = { W, ground };
      const s = sim.current;
      if (!prev || s.phase === "ready") return;
      const kx = W / prev.W;
      const ky = ground / prev.ground;
      if (Math.abs(kx - 1) < 0.002 && Math.abs(ky - 1) < 0.002) return;
      s.x *= kx;
      s.px *= kx;
      s.y = Math.min(s.y * ky, ground - R);
      s.py = Math.min(s.py * ky, ground - R);
      s.hist.length = 0;
      if (s.cap) {
        s.cap.x = clamp(s.cap.x * kx, 70, Math.max(70, W - 70));
        s.cap.y *= ky;
      }
      trail.current.length = 0;
      if (stateRef.current === "playing" && s.phase === "air" && Math.abs(kx - 1) > 0.02) pauseGame();
    }
  });

  const ballImg = useRef<HTMLImageElement | null>(null);
  const capImg = useRef<HTMLImageElement | null>(null);
  const fx = useRef(createParticles(320));
  const texts = useRef<FloatText[]>([]);
  const rings = useRef<Ring[]>([]);
  const streaks = useRef<Streak[]>([]);
  const motes = useRef<Mote[]>([]);
  const flashes = useRef<Flash[]>([]);
  const flashAcc = useRef(0);
  const trail = useRef<{ x: number; y: number }[]>([]);
  const unlockedRef = useRef<number[]>([]);
  const swap = useRef(0);
  // Rezultat: lopta se digne u prazan prostor iznad natpisa (mjeri se, ne pogađa).
  const hero = useRef<{ y: number | null; size: number; at: number; k: number }>({ y: null, size: 1, at: 0, k: 0 });

  /** Središte slobodnog prostora iznad rezultata (svijet) ili null ako ga nema. */
  const measureHero = (sc: number): { y: number; size: number } | null => {
    const cv = canvasRef.current;
    const stage = cv?.closest(".g2-stage") as HTMLElement | null;
    if (!cv || !stage || stage.dataset.land) return null;
    const overlay = stage.querySelector('[data-overlay="result"]');
    const head = overlay?.lastElementChild?.firstElementChild;
    if (!overlay || !head) return null;
    const o = overlay.getBoundingClientRect();
    const top = o.top + 58; // ispod gumba zvuka
    const bottom = head.getBoundingClientRect().top - 14;
    const free = bottom - top;
    if (free < R * sc * 1.6) return null; // lopta bi pala preko natpisa
    return { y: ((top + bottom) / 2 - cv.getBoundingClientRect().top) / sc, size: Math.min(1, free / (R * sc * 2.3)) };
  };
  const bestRef = useRef<number | null>(null);

  // Samo u razvoju: stanje simulacije za automatske testove (Playwright).
  useEffect(() => {
    if (process.env.NODE_ENV === "production") return;
    const w = window as unknown as { __zong?: () => unknown };
    w.__zong = () => ({ ...sim.current, hist: undefined, scale: scale.current, groundY: lastWorld.current?.ground, cam: { ...cam.current } });
    return () => {
      delete w.__zong;
    };
  }, []);

  // ── Učitavanje ─────────────────────────────────────────────────────────
  useEffect(() => {
    let alive = true;
    void ensureBrandFonts().then(() => {
      if (alive) dirty.current = true;
    });
    try {
      const saved = window.localStorage.getItem(BALL_KEY);
      if (isClubId(saved)) setClub(saved);
      const b = window.localStorage.getItem(BEST_KEY);
      if (b !== null && Number.isFinite(Number(b)) && Number(b) > 0) setBest(Number(b));
    } catch {}
    const ms = readMilestones();
    unlockedRef.current = ms;
    setUnlocked(ms);
    // zagrij ostale lopte u pozadini (male datoteke)
    const id = window.setTimeout(() => CLUBS.forEach((c) => void loadImage(ballSrc(c.id)).catch(() => {})), 1200);
    return () => {
      alive = false;
      window.clearTimeout(id);
      music.sleep();
    };
  }, []);

  useEffect(() => {
    let alive = true;
    loadImage(ballSrc(club))
      .then((img) => {
        if (alive) ballImg.current = img;
      })
      .catch(() => {});
    loadImage(capSrc(club))
      .then((img) => {
        if (alive) capImg.current = img;
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [club]);

  const pickClub = useCallback((id: ClubId) => {
    setClub(id);
    swap.current = 1;
    sfx.tap();
    try {
      window.localStorage.setItem(BALL_KEY, id);
    } catch {}
  }, []);

  // ── Svijet ─────────────────────────────────────────────────────────────
  const world = () => {
    const v = view.current;
    const s = worldScale(v.w, v.h);
    scale.current = s;
    return { s, W: v.w / s, H: v.h / s, ground: v.h / s - GROUND_PAD };
  };

  const addText = (x: number, y: number, text: string, color: string, size: number, heading = true, max = 0.9, rot = 0) => {
    texts.current.push({ x, y, vy: -80, text, color, size, t: 0, max, heading, rot });
    if (texts.current.length > 10) texts.current.shift();
  };

  const addRing = (x: number, y: number, color: string, r0: number, r1: number, max = 0.45, w = 3) => {
    rings.current.push({ x, y, t: 0, max, color, r0, r1, w });
    if (rings.current.length > 14) rings.current.shift();
  };

  const punch = (amount: number, x: number, y: number) => {
    const c = cam.current;
    if (Math.abs(c.z - 1) < 0.01) {
      c.fx = x;
      c.fy = y;
    }
    c.zv += amount * 26;
  };

  const shakeAdd = (a: number) => {
    cam.current.trauma = clamp(cam.current.trauma + a, 0, 1);
  };

  // ── Start / kraj ───────────────────────────────────────────────────────
  const start = useCallback(() => {
    music.unlock();
    const prev = sim.current;
    const next = freshSim();
    // lopta kreće s mjesta gdje je bila (glatki prijelaz u lebdenje)
    next.x = prev.x;
    next.y = prev.y;
    next.rot = prev.rot;
    sim.current = next;
    look.current = freshLook();
    fx.current.clear();
    cam.current.trauma = 0;
    cam.current.z = 1;
    cam.current.zv = 0;
    texts.current = [];
    rings.current = [];
    trail.current = [];
    try {
      const b = window.localStorage.getItem(BEST_KEY);
      const n = b !== null && Number.isFinite(Number(b)) && Number(b) > 0 ? Number(b) : null;
      bestRef.current = n;
      setBest(n);
    } catch {}
    setPoints(0);
    setResult(null);
    setRun({ reached: [], fresh: [] });
    setState("playing");
    sfx.whistle();
    music.stopAll();
    music.bedStart();
  }, []);

  const resume = useCallback(() => {
    music.unlock();
    music.bedStart();
    music.bedLevel(Math.min(1, sim.current.streak / 12));
    // Pauza je skrila loptu: nakon "Nastavi" kratko usporenje da se igrač snađe
    // (inače lopta pauzirana tik iznad trave padne prije nego je prst stigne).
    const s = sim.current;
    if (s.phase !== "ready" && !s.failed && !s.finished) {
      s.ts = 0.18;
      s.tsHold = 0.45;
    }
    setState("playing");
  }, []);

  const finish = useCallback(() => {
    const s = sim.current;
    if (s.finished) return;
    s.finished = true;
    music.stopAll();
    const fresh = s.reached.filter((m) => !unlockedRef.current.includes(m));
    if (fresh.length) {
      const all = [...unlockedRef.current, ...fresh];
      unlockedRef.current = all;
      saveMilestones(all);
      setUnlocked(all);
    }
    setRun({ reached: s.reached, fresh });
    sfx.whistle(true);
    if (s.kicks >= 25) sfx.crowd(Math.min(1, s.kicks / 80), 2.6);
    const msg =
      s.kicks === 0
        ? "Lopta mora u zrak. Tapni je prije nego padne."
        : `${s.kicks} ${plural(s.kicks, "dodir", "dodira", "dodira")} · ${s.perfects} ${plural(s.perfects, "savršen", "savršena", "savršenih")}${s.maxStreak >= 3 ? ` · niz ${s.maxStreak}` : ""}${s.caps ? ` · ${s.caps} ${plural(s.caps, "kapa", "kape", "kapa")}` : ""}`;
    setResult({
      score: s.points,
      title: s.kicks >= 100 ? "Majstorski" : s.kicks >= 50 ? "Ozbiljna kontrola" : s.kicks >= 25 ? "Lijep niz" : s.kicks >= 10 ? "Dobar početak" : "Lopta je pala",
      message: msg
    });
    setState("result");
  }, []);

  // ── Udarac ─────────────────────────────────────────────────────────────
  usePointer(canvasRef, {
    onDown: (p) => {
      if (stateRef.current !== "playing") return;
      music.unlock();
      const s = sim.current;
      const L = look.current;
      const rescuing = s.phase === "down" && s.grace > 0 && !s.failed;
      if (s.phase === "down" && !rescuing) return;
      const { s: sc, W } = world();
      // dodir → svijet (kroz kameru: trešnja + zum)
      const c = cam.current;
      const fxp = c.fx * sc;
      const fyp = c.fy * sc;
      const tx = ((p.x - c.sx - fxp) / c.z + fxp) / sc;
      const ty = ((p.y - c.sy - fyp) / c.z + fyp) / sc;
      // NaN bi zarazio cijelu simulaciju (lopta nestane, igra zapne)
      if (!Number.isFinite(tx) || !Number.isFinite(ty)) return;

      // najbliži položaj lopte u zadnjih ~85 ms (kašnjenje zaslona/prsta)
      let bx = s.x;
      let by = s.y;
      let bd = Math.hypot(tx - s.x, ty - s.y);
      for (let i = Math.max(0, s.hist.length - REWIND_STEPS); i < s.hist.length; i++) {
        const q = s.hist[i];
        const d = Math.hypot(tx - q.x, ty - q.y);
        if (d < bd) {
          bd = d;
          bx = q.x;
          by = q.y;
        }
      }
      if (bd > R * hitAt(s.kicks)) {
        addRing(tx, ty, "rgba(255,255,255,0.35)", 6, 22, 0.35, 2);
        return;
      }
      const topSafe = topSafeAt(sc);
      if (s.phase === "air" && (s.vy < MIN_VY_TO_KICK || s.sinceKick < KICK_GAP || s.y < topSafe + HIGH_BAND)) {
        addRing(tx, ty, "rgba(255,255,255,0.3)", 8, 26, 0.3, 2);
        return;
      }

      const dx = tx - bx;
      const off = clamp(-dx / R, -1.25, 1.25); // + = dodir lijevo → lopta ide desno
      const abs = Math.abs(off);
      const perfect = abs < perfectAt(s.kicks);
      const G = gravityAt(s.kicks);
      let rise = RISE * (perfect ? 1.04 : 1 - 0.14 * Math.min(1, abs));
      // vrh leta nikad iznad topSafe (lopta ne smije pod gumbe ni izvan ekrana);
      // udarac je moguć tek ispod topSafe + HIGH_BAND, pa je let uvijek barem toliki
      if (s.y - rise < topSafe) rise = Math.max(40, s.y - topSafe);

      s.phase = "air";
      s.sinceKick = 0;
      s.grace = 0;
      s.downT = 0;
      s.bounces = 0;
      s.vy = -Math.sqrt(2 * G * rise);
      const curve = Math.sign(off) * Math.pow(abs, 1.25);
      s.vx = s.vx * (perfect ? 0.1 : 0.22) + curve * SIDE;
      s.spin = off * 11 + (s.vx / R) * 0.3;
      s.kicks += 1;
      s.hist.length = 0;
      if (rescuing) s.saves += 1;

      const prevMult = s.mult;
      const prevStreak = s.streak;
      if (perfect) {
        s.streak += 1;
        s.perfects += 1;
      } else s.streak = 0;
      s.maxStreak = Math.max(s.maxStreak, s.streak);
      s.mult = multFor(s.streak);
      s.maxMult = Math.max(s.maxMult, s.mult);
      s.points += s.mult;
      L.scoreBump = 1;

      // ── izgled udarca ── (na stvarnom položaju lopte; kompenzacija kašnjenja
      // vrijedi samo za pogodak, inače efekti "zaostaju" iza lopte)
      const ax = s.x;
      const ay = s.y;
      // natpisi idu sa strane lopte — ispod nje je palac, iznad nje lopta leti
      const side = ax < W / 2 ? 1 : -1;
      const sideX = clamp(ax + side * (R + 66), 74, W - 74);
      const cxp = ax + clamp(dx, -R * 0.8, R * 0.8);
      const cyp = ay + R * 0.72;
      L.sq = perfect ? -0.2 : -0.15;
      L.sqV = 0;
      L.sqAng = Math.atan2(ay - cyp, ax - cxp);
      L.flash = 1;
      L.swoosh = { x: ax, y: ay, dir: off === 0 ? 0 : Math.sign(off), t: 0, perfect };
      fx.current.burst(cxp, cyp, {
        count: perfect ? 16 : 9,
        speed: [140, 440],
        angle: Math.PI / 2 - off * 0.6,
        spread: 1.5,
        gravity: 900,
        size: [1.4, 3.2],
        shape: "spark",
        colors: perfect ? [BRAND.accent, "#ffffff", BRAND.accent] : ["#ffffff", "rgba(255,255,255,0.7)"]
      });
      addRing(cxp, cyp, perfect ? `rgba(${BRAND.accentRgb},0.9)` : "rgba(255,255,255,0.6)", 10, perfect ? 58 : 40, perfect ? 0.5 : 0.36);
      haptic(perfect ? 14 : 8);
      music.kick({ perfect, streak: s.streak, mult: s.mult, kicks: s.kicks, power: 0.8 + Math.min(0.4, s.kicks / 90) + (perfect ? 0.1 : 0) });
      music.bedLevel(Math.min(1, s.streak / 12 + s.kicks / 300));

      if (perfect) {
        s.hitstop = 0.045;
        L.glow = 1;
        addRing(ax, ay, `rgba(${BRAND.accentRgb},0.95)`, R * perfectAt(s.kicks), R * 1.5, 0.42, 2.5);
        addText(sideX, ay + 8, "Savršeno!", BRAND.accent, 27, true, 0.8, side * -0.05);
        shakeAdd(0.06 + s.mult * 0.025);
        punch(0.012, ax, ay);
      } else {
        shakeAdd(0.05);
        if (s.perfects === 0 && s.kicks <= 6 && s.hinted < 2 && abs > 0.45) {
          s.hinted += 1;
          addText(sideX, ay + 8, "Bliže sredini", "rgba(255,255,255,0.8)", 15, false, 1.1);
        }
      }
      if (rescuing) {
        addText(sideX, ay - 34, "Za dlaku", "#ffffff", 30, true, 1.1, side * -0.04);
        music.save();
        shakeAdd(0.12);
      }
      if (s.mult > prevMult) {
        s.hitstop = 0.075;
        L.multBump = 1;
        music.multUp(s.mult);
        shakeAdd(0.16);
        punch(0.03, ax, ay);
        if (s.mult === 4) L.flare = Math.max(L.flare, 0.6);
        L.crowdBoost = Math.max(L.crowdBoost, 0.6);
        fx.current.burst(W / 2, 250, { count: 22, speed: [160, 440], size: [2, 4.5], life: [0.5, 1], colors: [BRAND.accent, "#ffffff"] });
      } else if (prevStreak >= 3 && s.streak === 0) {
        addText(sideX, ay + 8, "Niz prekinut", "rgba(255,255,255,0.65)", 14, false, 0.85);
        music.streakBreak();
      }

      // ciljevi i veliki trenuci
      const title = milestoneTitle(s.kicks);
      if (title) {
        const lvl = s.kicks >= 100 ? 2 : s.kicks >= 50 ? 1 : 0;
        if ((MILESTONES as readonly number[]).includes(s.kicks)) s.reached.push(s.kicks);
        L.banner = { value: s.kicks, title, t: 0 };
        L.counterFlash = 1;
        L.flare = 1;
        L.whiteFlash = 0.22 + lvl * 0.06;
        L.crowdBoost = 1;
        s.hitstop = 0.11;
        s.ts = 0.4;
        s.tsHold = 0.12;
        punch(0.055 + lvl * 0.015, ax, ay);
        shakeAdd(0.28 + lvl * 0.06);
        music.milestone(lvl);
        sfx.crowd(0.55 + lvl * 0.2, 2.6);
        haptic(30);
        const n = 28 + lvl * 14;
        const conf = { angle: 0, spread: 1.2, speed: [300, 760] as [number, number], gravity: 900, drag: 1.5, life: [1.1, 2.1] as [number, number], size: [3, 6] as [number, number], shape: "confetti" as const, colors: [BRAND.accent, "#ffffff", "#c9e01f"] };
        fx.current.burst(W * 0.08, 0, { ...conf, count: n, angle: Math.PI / 2 - 0.55 });
        fx.current.burst(W * 0.92, 0, { ...conf, count: n, angle: Math.PI / 2 + 0.55 });
      }
      // novi rekord usred igre (jednom)
      const prevBest = bestRef.current;
      if (!s.recordShown && prevBest !== null && prevBest > 0 && s.points > prevBest) {
        s.recordShown = true;
        addText(W / 2, 330, "Novi rekord", BRAND.accent, 34, true, 1.4);
        sfx.success();
      }
      setPoints(s.points);
    }
  });

  // ── Simulacija (fiksni korak) ──────────────────────────────────────────
  const update = useCallback(
    (step: number) => {
      const s = sim.current;
      if (s.finished || s.phase === "ready") return;
      if (s.hitstop > 0) {
        // zamrznuti kadar udarca (hitstop)
        s.hitstop -= step;
        s.px = s.x;
        s.py = s.y;
        return;
      }
      if (s.tsHold > 0) s.tsHold -= step;
      else s.ts = damp(s.ts, 1, 4.5, step);
      const dt = step * s.ts;
      const { W, H, ground } = world();
      s.px = s.x;
      s.py = s.y;
      s.sinceKick += dt;

      const G = gravityAt(s.kicks);

      // vjetar: mijenja se rijetko i glatko, najavljen strelicom
      if (s.kicks >= WIND_FROM && s.phase === "air") {
        s.windTimer -= dt;
        if (s.windTimer <= 0) {
          const strength = windAt(s.kicks);
          const dir = s.windTarget === 0 ? (Math.random() < 0.5 ? -1 : 1) : -Math.sign(s.windTarget) * (Math.random() < 0.75 ? 1 : -1);
          s.windTarget = dir * strength * rand(0.65, 1);
          s.windTimer = rand(5.5, 8.5);
          look.current.windPulse = 1;
          sfx.whoosh();
        }
      }
      s.wind = damp(s.wind, s.phase === "air" ? s.windTarget : 0, 0.9, dt);

      s.vy += G * dt;
      s.vx += s.wind * dt;
      s.vx *= Math.exp(-0.22 * dt);
      s.x += s.vx * dt;
      s.y += s.vy * dt;

      // bočni zidovi
      if (s.x < R) {
        s.x = R;
        if (s.vx < 0) {
          s.vx = -s.vx * 0.72;
          s.spin *= -0.6;
          if (Math.abs(s.vx) > 80) sfx.kick(0.35);
        }
      } else if (s.x > W - R) {
        s.x = W - R;
        if (s.vx > 0) {
          s.vx = -s.vx * 0.72;
          s.spin *= -0.6;
          if (Math.abs(s.vx) > 80) sfx.kick(0.35);
        }
      }

      s.spin = damp(s.spin, (s.vx / R) * 0.6, 0.8, dt);
      s.rot += s.spin * dt;

      // trava
      if (s.y + R >= ground) {
        s.y = ground - R;
        if (s.phase === "air") {
          // dodir trave: još GRACE sekundi se može spasiti
          s.phase = "down";
          s.downT = 0;
          s.grace = GRACE;
          const L = look.current;
          L.sq = -Math.min(0.22, s.vy / 6000);
          L.sqV = 0;
          L.sqAng = -Math.PI / 2;
        }
        if (s.vy > 120) {
          s.vy = -s.vy * 0.42;
          s.vx *= 0.7;
          if (s.bounces++ < 3 && s.failed) sfx.kick(0.3);
        } else s.vy = 0;
        s.vx *= Math.exp(-2.4 * dt);
      }

      if (s.phase === "air") {
        s.hist.push({ x: s.x, y: s.y });
        if (s.hist.length > REWIND_STEPS + 2) s.hist.shift();
      } else if (s.phase === "down" && !s.failed) {
        s.hist.push({ x: s.x, y: s.y });
        if (s.hist.length > REWIND_STEPS + 2) s.hist.shift();
      }

      // kraj milosti → pad
      if (s.phase === "down" && !s.failed) {
        s.grace -= step;
        if (s.grace <= 0) {
          s.failed = true;
          s.wind = 0;
          s.windTarget = 0;
          s.ts = 0.5;
          s.tsHold = 0.22;
          music.stopAll();
          sfx.fail();
          music.groan(s.kicks);
          haptic(40);
          shakeAdd(0.42);
          punch(0.03, s.x, ground);
          fx.current.burst(s.x, ground, { count: 22, angle: -Math.PI / 2, spread: 2.4, speed: [90, 300], gravity: 900, size: [1.5, 3.4], life: [0.4, 0.9], colors: ["#3f8f4f", "#2c6b3a", "#a6d987"] });
          addRing(s.x, ground, "rgba(255,255,255,0.4)", 20, 90, 0.5);
        }
      }

      // kapa
      if (s.phase === "air" && s.kicks >= CAP_FROM) {
        if (!s.cap) {
          s.capCooldown -= dt;
          if (s.capCooldown <= 0) {
            s.cap = { x: rand(70, W - 70), y: rand(Math.max(H * 0.2, HUD_SAFE_PX / scale.current + 50), H * 0.44), t: 0, life: 7, got: 0 };
          }
        } else {
          const c = s.cap;
          c.t += dt;
          if (c.got > 0) {
            c.got += dt;
            if (c.got > 0.45) {
              s.cap = null;
              s.capCooldown = rand(6, 10);
            }
          } else if (c.t > c.life) {
            s.cap = null;
            s.capCooldown = rand(4, 7);
          } else {
            const cyb = c.y + Math.sin(c.t * 2.2) * 7;
            if (Math.hypot(s.x - c.x, s.y - cyb) < R + 26) {
              c.got = 0.0001;
              s.caps += 1;
              s.points += CAP_POINTS;
              setPoints(s.points);
              music.cap();
              shakeAdd(0.16);
              fx.current.burst(c.x, cyb, { count: 30, speed: [120, 420], size: [2, 4.5], life: [0.5, 1], colors: [BRAND.accent, "#ffffff"] });
              addRing(c.x, cyb, `rgba(${BRAND.accentRgb},0.9)`, 20, 80, 0.5);
              addText(c.x, cyb - 34, `+${CAP_POINTS}`, BRAND.accent, 40, true, 1);
            }
          }
        }
      }

      if (s.phase === "down") {
        s.downT += dt;
        if (s.failed && s.downT > 1.25) finish();
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [finish]
  );

  // ── Crtanje ────────────────────────────────────────────────────────────
  const render = useCallback(
    ({ alpha, dt, time }: { alpha: number; dt: number; time: number }) => {
      const v = view.current;
      const ctx = v.ctx;
      if (!ctx || v.w < 2) return;
      const { w, h, dpr } = v;
      const { s: sc, W, H, ground } = world();
      const s = sim.current;
      const L = look.current;
      const c = cam.current;
      const st = stateRef.current;
      const live = st === "playing" || st === "paused";
      const B = SCENE_BLEED;

      if (dirty.current || !sprites.current) {
        sprites.current = {
          scene: paintScene(w, h, dpr),
          shade: paintBallShade(R * sc, dpr),
          glow: paintGlow(R * 2.6 * sc, dpr, BRAND.accentRgb, 0.55),
          ballFlash: paintBallFlash(R * sc, dpr),
          fog: paintFog(w, h, dpr),
          grass: paintGrassFront(w + B * 2, 46 * sc, dpr),
          flare: paintFlare(Math.max(60, w * 0.22), dpr),
          spark: paintGlow(10, dpr, "255,255,250", 0.95),
          dark: paintGlow(64, dpr, "0,0,0", 0.62),
          anchors: sceneAnchors(w, h)
        };
        dirty.current = false;
        streaks.current = Array.from({ length: 16 }, () => ({ x: Math.random() * W, y: rand(H * 0.1, H * 0.8), len: rand(40, 120), sp: rand(0.7, 1.3) }));
        motes.current = Array.from({ length: 26 }, () => ({ x: Math.random() * W, y: Math.random() * H * 0.8, vx: rand(-6, 6), vy: rand(-14, -4), a: rand(0.15, 0.5), ph: Math.random() * 6 }));
      }
      const S = sprites.current;

      // ── kozmetika (vrijeme crtanja) ──
      const paused = st === "paused";
      const cdt = paused ? 0 : dt;
      fx.current.update(cdt);
      // opruga gnječenja lopte
      L.sqV += (-340 * L.sq - 16 * L.sqV) * cdt;
      L.sq += L.sqV * cdt;
      L.flash = Math.max(0, L.flash - cdt * 7);
      L.glow = Math.max(0, L.glow - cdt * 2.2);
      L.scoreBump = Math.max(0, L.scoreBump - cdt * 4);
      L.multBump = Math.max(0, L.multBump - cdt * 2.5);
      L.counterFlash = Math.max(0, L.counterFlash - cdt * 0.9);
      L.flare = Math.max(0, L.flare - cdt * 0.85);
      L.whiteFlash = Math.max(0, L.whiteFlash - cdt * 1.4);
      L.crowdBoost = Math.max(0, L.crowdBoost - cdt * 0.45);
      L.windPulse = Math.max(0, L.windPulse - cdt * 1.2);
      if (L.swoosh) {
        L.swoosh.t += cdt;
        if (L.swoosh.t > 0.22) L.swoosh = null;
      }
      swap.current = Math.max(0, swap.current - cdt * 3.5);
      for (let i = texts.current.length - 1; i >= 0; i--) {
        const t = texts.current[i];
        t.t += cdt;
        t.y += t.vy * cdt;
        t.vy *= Math.exp(-3 * cdt);
        if (t.t > t.max) texts.current.splice(i, 1);
      }
      for (let i = rings.current.length - 1; i >= 0; i--) {
        rings.current[i].t += cdt;
        if (rings.current[i].t > rings.current[i].max) rings.current.splice(i, 1);
      }
      if (L.banner) {
        L.banner.t += cdt;
        if (L.banner.t > 2.1) L.banner = null;
      }

      // kamera: opruga zuma + trešnja (samo pomak, bez rotacije)
      c.zv += (-260 * (c.z - 1) - 15 * c.zv) * cdt;
      c.z += c.zv * cdt;
      c.z = clamp(c.z, 0.97, 1.12);
      c.t += cdt;
      c.trauma = Math.max(0, c.trauma - cdt * 1.7);
      const tr = c.trauma * c.trauma;
      c.sx = (Math.sin(c.t * 61.3) * 0.6 + Math.sin(c.t * 37.1) * 0.4) * 8 * tr;
      c.sy = (Math.sin(c.t * 53.7 + 1.3) * 0.6 + Math.sin(c.t * 29.9 + 0.7) * 0.4) * 8 * tr;

      // lebdenje: startni ekran i "spremno" (sredina)
      const ready = s.phase === "ready";
      if (ready) {
        const onStart = st === "start";
        const tx = W / 2;
        const ty = onStart ? ground + R * 0.2 : H * 0.47;
        if (s.x === 0 && s.y === 0) {
          s.x = tx;
          s.y = ty;
        }
        s.x = damp(s.x, tx, 7, dt);
        s.y = damp(s.y, ty, 7, dt);
        s.px = s.x;
        s.py = s.y;
        s.hover = Math.min(1, s.hover + dt / 0.5);
        s.rot += 0.55 * dt;
      } else {
        s.hover = Math.min(1, s.hover + dt / 0.3);
      }

      // rezultat: lopta lagano isplovi u prazan prostor iznad brojke i polako se vrti
      const H0 = hero.current;
      if (st === "result") {
        const now = performance.now();
        if (now - H0.at > 450) {
          H0.at = now;
          const m = measureHero(sc);
          H0.y = m ? m.y : null;
          if (m) H0.size = m.size;
        }
      } else {
        H0.y = null;
        H0.at = 0;
      }
      H0.k = damp(H0.k, H0.y !== null ? 1 : 0, 3, dt);
      if (H0.y !== null && s.phase !== "ready") {
        s.x = damp(s.x, W / 2, 3.2, dt);
        s.y = damp(s.y, H0.y + Math.sin(time * 1.6) * 5, 3.2, dt);
        s.px = s.x;
        s.py = s.y;
        s.rot += 0.35 * dt;
      }
      const bob = ready ? Math.sin(time * 2.4) * 6 : 0;
      const bx = ready ? s.x : lerp(s.px, s.x, alpha);
      const by = (ready ? s.y : lerp(s.py, s.y, alpha)) + bob;
      const br = R * ease.outBack(s.hover) * (1 + swap.current * 0.12) * lerp(1, H0.size, H0.k);

      // paralaksa: kamera lagano prati loptu (pozadina daleko, trava blizu)
      const heightK = clamp((ground - (by + br)) / (H * 0.7), 0, 1);
      const followX = st === "start" ? 0 : (bx - W / 2) / (W / 2);
      const idle = st === "start";
      c.bgx = damp(c.bgx, idle ? Math.sin(time * 0.23) * 9 : -followX * 10, 3, dt);
      c.bgy = damp(c.bgy, idle ? Math.sin(time * 0.17 + 1) * 4 : heightK * 9, 2.5, dt);
      c.fgx = damp(c.fgx, -followX * 16, 3, dt);

      // ── POZADINA (zum manji nego u prvom planu = dubina) ──
      const fxp = c.fx * sc;
      const fyp = c.fy * sc;
      const zb = 1 + (c.z - 1) * 0.5;
      ctx.save();
      ctx.translate(c.sx * 0.7 + fxp, c.sy * 0.7 + fyp);
      ctx.scale(zb, zb);
      ctx.translate(-fxp + c.bgx, -fyp + c.bgy);
      ctx.drawImage(S.scene, -B, -B, w + B * 2, h + B * 2);

      // izmaglica koja polako putuje
      const A = S.anchors;
      const fogY = A.horizon - h * 0.2;
      const fogH = h * 0.34;
      const fogOff = -((time * 7) % w);
      ctx.globalAlpha = 0.9;
      ctx.drawImage(S.fog, fogOff - B, fogY, w * 2, fogH);
      ctx.globalAlpha = 1;

      // bljeskovi fotoaparata na tribini (više kad niz raste)
      ctx.globalCompositeOperation = "lighter";
      if ((live && !paused) || st === "start") {
        const rate = st === "start" ? 0.9 : 0.5 + Math.min(4, s.streak * 0.3) + L.crowdBoost * 14;
        flashAcc.current += rate * dt;
        while (flashAcc.current >= 1) {
          flashAcc.current -= 1;
          if (flashes.current.length < 24)
            flashes.current.push({ x: rand(-B, w + B), y: rand(A.standTop, A.standBottom), t: 0, max: rand(0.08, 0.16), s: rand(4, 9) });
        }
      }
      for (let i = flashes.current.length - 1; i >= 0; i--) {
        const f = flashes.current[i];
        f.t += dt;
        if (f.t > f.max) {
          flashes.current.splice(i, 1);
          continue;
        }
        const k = 1 - f.t / f.max;
        ctx.globalAlpha = k;
        ctx.drawImage(S.spark, f.x - f.s, f.y - f.s, f.s * 2, f.s * 2);
      }
      // odbljesak reflektora (veliki trenuci + lagano "disanje")
      const flareK = L.flare * 0.95 + 0.07 + Math.sin(time * 0.9) * 0.03;
      if (flareK > 0.02) {
        const fw = S.flare.width / dpr;
        const fh = S.flare.height / dpr;
        for (const t of A.towers) {
          ctx.globalAlpha = clamp(flareK, 0, 1);
          ctx.drawImage(S.flare, t.x - fw / 2, t.y - fh / 2, fw, fh);
        }
      }
      ctx.globalAlpha = 1;
      ctx.globalCompositeOperation = "source-over";
      ctx.restore();

      // ── PRVI PLAN (svijet) ──
      ctx.save();
      ctx.translate(c.sx + fxp, c.sy + fyp);
      ctx.scale(c.z, c.z);
      ctx.translate(-fxp, -fyp);
      ctx.scale(sc, sc);

      // čestice prašine u svjetlu
      for (const m of motes.current) {
        m.x += (m.vx + s.wind * 0.25) * cdt;
        m.y += m.vy * cdt;
        if (m.y < -10) {
          m.y = H * 0.8;
          m.x = Math.random() * W;
        }
        if (m.x < -10) m.x = W + 10;
        if (m.x > W + 10) m.x = -10;
        const a = m.a * (0.5 + 0.5 * Math.sin(time * 1.3 + m.ph));
        ctx.fillStyle = `rgba(255,252,235,${a * 0.5})`;
        ctx.fillRect(m.x, m.y, 1.6, 1.6);
      }

      // vjetar
      const windK = Math.min(1, Math.abs(s.wind) / 120);
      if (windK > 0.02) {
        ctx.strokeStyle = `rgba(255,255,255,${0.16 * windK})`;
        ctx.lineWidth = 1.2;
        ctx.lineCap = "round";
        ctx.beginPath();
        const dir = Math.sign(s.wind);
        for (const k of streaks.current) {
          k.x += s.wind * 2.2 * k.sp * cdt;
          if (k.x > W + k.len) k.x = -k.len;
          if (k.x < -k.len) k.x = W + k.len;
          ctx.moveTo(k.x, k.y);
          ctx.lineTo(k.x - dir * k.len * windK, k.y);
        }
        ctx.stroke();
      }

      // ── veliki broj dodira (iza lopte); bodovi i rekord su u HUD-u ──
      if (live && s.phase !== "ready") {
        const sy = H * 0.25;
        const cf = L.counterFlash;
        const pop = 1 + ease.outCubic(L.scoreBump) * 0.14 + ease.outCubic(cf) * 0.22;
        // brojač se skloni (prozirniji) kad lopta leti preko njega
        const occl = clamp(1 - (Math.hypot(bx - W / 2, by - sy) - 70) / 110, 0, 1);
        ctx.save();
        ctx.globalAlpha = 1 - occl * 0.6;
        ctx.translate(W / 2, sy);
        ctx.scale(pop, pop);
        ctx.font = brandFont("heading", 156);
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillStyle = "rgba(0,0,0,0.3)";
        ctx.fillText(String(s.kicks), 0, 6);
        if (cf > 0) {
          const a0 = ctx.globalAlpha;
          ctx.globalAlpha = cf * a0;
          const gr = 150;
          ctx.drawImage(S.glow, -gr / sc, -gr / sc, (gr * 2) / sc, (gr * 2) / sc);
          ctx.globalAlpha = a0;
        }
        ctx.fillStyle = cf > 0.02 ? mixAccent(cf) : "rgba(255,255,255,0.93)";
        ctx.fillText(String(s.kicks), 0, 0);
        ctx.restore();

        const my = sy + 86;
        if (!L.banner) {
          // množitelj + napredak niza
          const nextAt = nextMultAt(s.streak);
          const base = s.streak >= 10 ? 10 : s.streak >= 6 ? 6 : s.streak >= 3 ? 3 : 0;
          const need = nextAt === null ? 0 : nextAt - base;
          const have = nextAt === null ? 0 : s.streak - base;
          const pillW = s.mult > 1 ? 54 : 0;
          const dotsW = need ? need * 12 - 4 : 0;
          const gap = pillW && dotsW ? 10 : 0;
          let x0 = W / 2 - (pillW + gap + dotsW) / 2;
          if (pillW) {
            const mb = 1 + ease.outCubic(L.multBump) * 0.28;
            ctx.save();
            ctx.translate(x0 + pillW / 2, my);
            ctx.scale(mb, mb);
            if (s.mult === 4) {
              ctx.globalAlpha = 0.35 + 0.25 * Math.sin(time * 5);
              ctx.drawImage(S.glow, -50 / sc, -50 / sc, 100 / sc, 100 / sc);
              ctx.globalAlpha = 1;
            }
            ctx.fillStyle = BRAND.accent;
            roundRect(ctx, -pillW / 2, -14, pillW, 28, 14);
            ctx.fill();
            ctx.fillStyle = "#0a0a0a";
            ctx.font = brandFont("heading", 24);
            ctx.textAlign = "center";
            ctx.textBaseline = "middle";
            ctx.fillText(`x${s.mult}`, 0, 1.5);
            ctx.restore();
            x0 += pillW + gap;
          }
          for (let i = 0; i < need; i++) {
            const on = i < have;
            ctx.fillStyle = on ? BRAND.accent : "rgba(255,255,255,0.22)";
            ctx.beginPath();
            ctx.arc(x0 + i * 12 + 4, my, on ? 4 : 3.2, 0, Math.PI * 2);
            ctx.fill();
          }
        }
      }

      // ── kapa ──
      const cap = s.cap;
      if (cap && live) {
        const appear = ease.outBack(clamp(cap.t / 0.45, 0, 1));
        const leaving = cap.got > 0 ? 1 - clamp(cap.got / 0.35, 0, 1) : 1;
        const blink = cap.got === 0 && cap.life - cap.t < 1.6 ? (Math.sin(cap.t * 22) > 0 ? 1 : 0.35) : 1;
        const cyb = cap.y + Math.sin(cap.t * 2.2) * 7;
        const k = appear * (cap.got > 0 ? 1 + (1 - leaving) * 0.6 : 1);
        ctx.globalAlpha = leaving * blink;
        const gr = 60 * k;
        ctx.drawImage(S.glow, cap.x - gr, cyb - gr, gr * 2, gr * 2);
        if (cap.got === 0) {
          ctx.strokeStyle = `rgba(${BRAND.accentRgb},0.75)`;
          ctx.lineWidth = 2.5;
          ctx.lineCap = "round";
          ctx.beginPath();
          ctx.arc(cap.x, cyb, 40 * k, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * (1 - cap.t / cap.life));
          ctx.stroke();
        }
        if (capImg.current) {
          const iw = 58 * k;
          const ih = iw * (capImg.current.height / capImg.current.width);
          ctx.save();
          ctx.translate(cap.x, cyb);
          ctx.rotate(Math.sin(cap.t * 1.6) * 0.12);
          ctx.drawImage(capImg.current, -iw / 2, -ih / 2, iw, ih);
          ctx.restore();
        }
        ctx.globalAlpha = 1;
      }

      // ── sjena lopte na travi (kontaktna + mekana) ──
      if (st !== "start") {
        softShadow(ctx, bx, ground + 4, br * (1.25 - heightK * 0.55), br * 0.24 * (1.1 - heightK * 0.5), 0.42 - heightK * 0.26);
        if (heightK < 0.25) softShadow(ctx, bx, ground + 2, br * 0.7, br * 0.1, 0.45 * (1 - heightK / 0.25));
      }

      // trag: mekana traka iza lopte pri brzini
      const speed = Math.hypot(s.vx, s.vy);
      if (!ready && st === "playing") {
        if (s.hitstop <= 0) {
          trail.current.push({ x: bx, y: by });
          if (trail.current.length > 9) trail.current.shift();
        }
      } else trail.current.length = 0;
      if (speed > 520 && trail.current.length > 3) {
        const tk = clamp((speed - 520) / 700, 0, 1);
        const n = trail.current.length;
        const hot = s.mult >= 2;
        for (let i = 1; i < n; i++) {
          const a = trail.current[i - 1];
          const b2 = trail.current[i];
          const k0 = (i - 1) / n;
          const k1 = i / n;
          const r0 = br * 0.85 * k0;
          const r1 = br * 0.85 * k1;
          const ang = Math.atan2(b2.y - a.y, b2.x - a.x) + Math.PI / 2;
          const cx0 = Math.cos(ang);
          const cy0 = Math.sin(ang);
          ctx.fillStyle = hot ? `rgba(${BRAND.accentRgb},${0.16 * k1 * tk})` : `rgba(255,255,255,${0.11 * k1 * tk})`;
          ctx.beginPath();
          ctx.moveTo(a.x + cx0 * r0, a.y + cy0 * r0);
          ctx.lineTo(b2.x + cx0 * r1, b2.y + cy0 * r1);
          ctx.lineTo(b2.x - cx0 * r1, b2.y - cy0 * r1);
          ctx.lineTo(a.x - cx0 * r0, a.y - cy0 * r0);
          ctx.closePath();
          ctx.fill();
        }
      }

      // reflektor na lopti na ekranu rezultata
      if (H0.k > 0.01) {
        const gr = br * 2.9;
        ctx.globalAlpha = 0.55 * H0.k;
        ctx.drawImage(S.glow, bx - gr, by - gr, gr * 2, gr * 2);
        ctx.globalAlpha = 1;
      }
      // sjaj savršenog udarca
      if (L.glow > 0) {
        const gr = br * 2.6 * (0.9 + 0.1 * L.glow);
        ctx.globalAlpha = L.glow;
        ctx.drawImage(S.glow, bx - gr, by - gr, gr * 2, gr * 2);
        ctx.globalAlpha = 1;
      }

      // "noga": luk zamaha ispod lopte u smjeru udarca
      const sw = L.swoosh;
      if (sw && live) {
        const k = sw.t / 0.22;
        const e = ease.outCubic(k);
        const rr = R * (1.12 + e * 0.35);
        const mid = Math.PI / 2 - sw.dir * 0.35;
        const span = 0.55 + e * 0.5;
        ctx.save();
        ctx.lineCap = "round";
        ctx.strokeStyle = sw.perfect ? `rgba(${BRAND.accentRgb},${0.85 * (1 - k)})` : `rgba(255,255,255,${0.6 * (1 - k)})`;
        ctx.lineWidth = 7 * (1 - k) + 1;
        ctx.beginPath();
        ctx.arc(sw.x, sw.y, rr, mid - span, mid + span);
        ctx.stroke();
        ctx.lineWidth = 2 * (1 - k) + 0.5;
        ctx.strokeStyle = `rgba(255,255,255,${0.5 * (1 - k)})`;
        ctx.beginPath();
        ctx.arc(sw.x, sw.y, rr + 9, mid - span * 0.7, mid + span * 0.7);
        ctx.stroke();
        ctx.restore();
      }

      // hint "tapni loptu"
      if (ready && st === "playing") {
        const pulse = (time * 1.1) % 1;
        ctx.strokeStyle = `rgba(${BRAND.accentRgb},${0.75 * (1 - pulse)})`;
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.arc(bx, by, br * (1.08 + pulse * 0.5), 0, Math.PI * 2);
        ctx.stroke();
        ctx.font = brandFont("heading", 30);
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        const hintIn = ease.outCubic(clamp((s.hover - 0.3) / 0.7, 0, 1));
        ctx.globalAlpha = hintIn;
        ctx.fillStyle = "rgba(0,0,0,0.4)";
        ctx.fillText("TAPNI LOPTU", W / 2, by + br + 52);
        ctx.fillStyle = "rgba(255,255,255,0.96)";
        ctx.fillText("TAPNI LOPTU", W / 2, by + br + 50);
        ctx.font = brandFont("body", 14, 600);
        ctx.fillStyle = "rgba(0,0,0,0.35)";
        ctx.fillText("Po sredini za savršen udarac", W / 2, by + br + 77.5);
        ctx.fillStyle = "rgba(255,255,255,0.7)";
        ctx.fillText("Po sredini za savršen udarac", W / 2, by + br + 76);
        ctx.globalAlpha = 1;
      }

      // ── lopta ── (na startnom ekranu je skrivena — izbornik pokazuje lopte)
      if (st !== "start") {
        // gnječenje (opruga) duž normale udarca + rastezanje u smjeru leta
        const sq = clamp(L.sq, -0.25, 0.2);
        const stretch = ready ? 0 : clamp((speed - 600) / 12000, 0, 0.06);
        const vAng = Math.atan2(s.vy, s.vx);
        const impact = s.hitstop > 0 ? 0.04 : 0;
        ctx.save();
        ctx.translate(bx, by);
        if (stretch > 0.001) {
          ctx.rotate(vAng);
          ctx.scale(1 + stretch, 1 - stretch * 0.7);
          ctx.rotate(-vAng);
        }
        if (Math.abs(sq) > 0.002) {
          ctx.rotate(L.sqAng);
          ctx.scale(1 + sq, 1 - sq * 0.6);
          ctx.rotate(-L.sqAng);
        }
        if (impact) ctx.scale(1 + impact, 1 + impact);
        ctx.save();
        ctx.rotate(s.rot);
        if (ballImg.current) ctx.drawImage(ballImg.current, -br, -br, br * 2, br * 2);
        else {
          ctx.fillStyle = "#f2f2f2";
          ctx.beginPath();
          ctx.arc(0, 0, br, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.restore();
        const pr = br + 2;
        ctx.drawImage(S.shade, -pr, -pr, pr * 2, pr * 2);
        if (L.flash > 0) {
          ctx.globalCompositeOperation = "lighter";
          ctx.globalAlpha = L.flash * 0.55;
          ctx.drawImage(S.ballFlash, -br, -br, br * 2, br * 2);
          ctx.globalAlpha = 1;
          ctx.globalCompositeOperation = "source-over";
        }
        ctx.restore();

        // nišan: sredina lopte = savršeno; svijetli kad se lopta smije udariti
        if (st === "playing" && !s.failed) {
          const kickable =
            s.phase === "ready" ||
            (s.phase === "air" && s.vy >= MIN_VY_TO_KICK && s.sinceKick >= KICK_GAP && s.y >= topSafeAt(sc) + HIGH_BAND) ||
            (s.phase === "down" && s.grace > 0);
          const pr2 = Math.max(6, R * perfectAt(s.kicks));
          const hot = s.mult >= 2;
          const a = kickable ? 0.95 : 0.28;
          ctx.save();
          ctx.translate(bx, by);
          ctx.lineWidth = 3.5;
          ctx.strokeStyle = `rgba(0,0,0,${0.35 * a})`;
          ctx.beginPath();
          ctx.arc(0, 0, pr2, 0, Math.PI * 2);
          ctx.stroke();
          ctx.lineWidth = hot ? 2.2 : 1.6;
          ctx.strokeStyle = `rgba(${BRAND.accentRgb},${a})`;
          ctx.beginPath();
          ctx.arc(0, 0, pr2, 0, Math.PI * 2);
          ctx.stroke();
          ctx.fillStyle = `rgba(${BRAND.accentRgb},${a})`;
          ctx.beginPath();
          ctx.arc(0, 0, 2.2, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
        }
      }

      // lopta iznad ekrana → strelica (ne bi se smjelo dogoditi, ali za svaki slučaj)
      if (by + br < 0 && live) {
        const ax = clamp(bx, 24, W - 24);
        ctx.fillStyle = BRAND.accent;
        ctx.beginPath();
        ctx.moveTo(ax, 70);
        ctx.lineTo(ax - 10, 86);
        ctx.lineTo(ax + 10, 86);
        ctx.closePath();
        ctx.fill();
      }

      // prstenovi
      for (const r of rings.current) {
        const t = r.t / r.max;
        ctx.strokeStyle = r.color;
        ctx.globalAlpha = 1 - t;
        ctx.lineWidth = r.w * (1 - t) + 0.6;
        ctx.beginPath();
        ctx.arc(r.x, r.y, lerp(r.r0, r.r1, ease.outCubic(t)), 0, Math.PI * 2);
        ctx.stroke();
      }
      ctx.globalAlpha = 1;

      fx.current.draw(ctx);

      // natpis cilja — ispred lopte (lopta ga više ne prekriva), s mekom tamnom podlogom
      const b = L.banner;
      if (b && live) {
        const my = H * 0.25 + 86;
        const t = b.t;
        const inK = ease.outCubic(clamp(t / 0.35, 0, 1));
        const out = t > 1.7 ? clamp(1 - (t - 1.7) / 0.4, 0, 1) : 1;
        ctx.save();
        ctx.translate(W / 2, my + (1 - inK) * 14);
        ctx.globalAlpha = out * inK * 0.9;
        ctx.drawImage(S.dark, -150, -58, 300, 128);
        ctx.globalAlpha = out;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.font = brandFont("body", 11, 700);
        ctx.fillStyle = BRAND.accent;
        const kicker = (MILESTONES as readonly number[]).includes(b.value) ? `CILJ · ${b.value} DODIRA` : `${b.value} DODIRA`;
        ctx.globalAlpha = out * inK;
        ctx.fillText(spaced(kicker), 0, -16);
        // naslov: lagani "udarac" mjerila pri ulasku
        const ts = 1 + (1 - ease.outBack(clamp(t / 0.32, 0, 1))) * 0.35;
        ctx.save();
        ctx.translate(0, 12);
        ctx.scale(ts, ts);
        ctx.font = brandFont("heading", 36);
        ctx.fillStyle = "rgba(0,0,0,0.55)";
        ctx.fillText(b.title.toUpperCase(), 0, 2.5);
        ctx.fillStyle = "#ffffff";
        ctx.fillText(b.title.toUpperCase(), 0, 0);
        ctx.restore();
        const lw = 150 * ease.outQuint(clamp((t - 0.08) / 0.5, 0, 1));
        ctx.fillStyle = BRAND.accent;
        ctx.fillRect(-lw / 2, 34, lw, 3);
        ctx.restore();
      }

      // leteći tekstovi
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      for (const t of texts.current) {
        const k = t.t / t.max;
        const inK = ease.outBack(clamp(t.t / 0.22, 0, 1));
        ctx.globalAlpha = k < 0.65 ? 1 : 1 - (k - 0.65) / 0.35;
        ctx.save();
        ctx.translate(t.x, t.y);
        if (t.rot) ctx.rotate(t.rot);
        if (t.heading) {
          ctx.font = brandFont("heading", t.size * inK);
          ctx.fillStyle = "rgba(0,0,0,0.35)";
          ctx.fillText(t.text.toUpperCase(), 0, 2);
        } else ctx.font = brandFont("body", t.size, 700);
        ctx.fillStyle = t.color;
        ctx.fillText(t.heading ? t.text.toUpperCase() : t.text, 0, 0);
        ctx.restore();
      }
      ctx.globalAlpha = 1;
      ctx.restore(); // prvi plan

      // ── trava u prvom planu (najbliže kameri — najveća paralaksa) ──
      const gh = S.grass.height / dpr;
      ctx.drawImage(S.grass, -B + c.fgx + c.sx * 1.2, h - gh + 4 + c.sy * 1.2, w + B * 2, gh);

      // ── zaslonski slojevi ──
      if (L.whiteFlash > 0) {
        ctx.globalCompositeOperation = "lighter";
        ctx.fillStyle = `rgba(255,255,240,${L.whiteFlash * 0.5})`;
        ctx.fillRect(0, 0, w, h);
        ctx.globalCompositeOperation = "source-over";
      }
      if (s.failed && live) {
        const k = clamp(s.downT / 0.9, 0, 1);
        ctx.fillStyle = `rgba(0,0,0,${0.32 * ease.outCubic(k)})`;
        ctx.fillRect(0, 0, w, h);
      }

      // pokazivač vjetra (ispod gumba u HUD-u)
      if (live && (windK > 0.05 || L.windPulse > 0)) {
        const k = Math.max(windK, L.windPulse);
        // dolje desno, iznad trave — gore je brojač, a gumbi HUD-a su iznad
        const wx = w - 12;
        const wy = h - Math.max(30, 34 * sc);
        const dir = Math.sign(s.windTarget || s.wind) || 1;
        const pop = 1 + ease.outCubic(L.windPulse) * 0.12;
        ctx.save();
        ctx.translate(wx - 48, wy);
        ctx.scale(pop, pop);
        ctx.globalAlpha = Math.min(1, k * 2);
        ctx.fillStyle = "rgba(0,0,0,0.5)";
        roundRect(ctx, -48, -14, 96, 28, 14);
        ctx.fill();
        ctx.strokeStyle = L.windPulse > 0 ? `rgba(${BRAND.accentRgb},${0.6 * L.windPulse})` : "rgba(255,255,255,0.1)";
        ctx.lineWidth = 1;
        ctx.stroke();
        ctx.font = brandFont("body", 10, 700);
        ctx.textAlign = "left";
        ctx.textBaseline = "middle";
        ctx.fillStyle = "rgba(255,255,255,0.6)";
        ctx.fillText(spaced("VJETAR"), -36, 0.5);
        const ax0 = 22;
        const len = 10 + Math.min(1, Math.abs(s.windTarget) / 120) * 14;
        ctx.strokeStyle = BRAND.accent;
        ctx.lineWidth = 2.2;
        ctx.lineCap = "round";
        ctx.beginPath();
        ctx.moveTo(ax0 - (dir * len) / 2, 0);
        ctx.lineTo(ax0 + (dir * len) / 2, 0);
        ctx.moveTo(ax0 + (dir * len) / 2, 0);
        ctx.lineTo(ax0 + (dir * len) / 2 - dir * 6, -5);
        ctx.moveTo(ax0 + (dir * len) / 2, 0);
        ctx.lineTo(ax0 + (dir * len) / 2 - dir * 6, 5);
        ctx.stroke();
        ctx.restore();
        ctx.textAlign = "center";
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  useGameLoop({ update, render, running: state === "playing" });

  const scoreLabel = result ? plural(result.score, "bod", "boda", "bodova") : "bodova";
  // S karticom nagrade (kad se nagrade upale) nema mjesta za ciljeve na rezultatu.
  const hasReward = !!result && !!pickReward(result.score, { gameId: "zongliranje", force: previewRewards });

  return (
    <GameShell
      gameId="zongliranje"
      title="Žongliranje"
      kicker="Mini igra"
      description="Drži loptu u zraku što dulje. Koliko dodira možeš?"
      bestKey={BEST_KEY}
      rules={[
        { icon: Hand, text: "Tapni loptu prije nego padne" },
        { icon: Crosshair, text: "Pogodi sredinu: niz savršenih do x4" }
      ]}
      state={state}
      onStart={start}
      onPause={pauseGame}
      onResume={resume}
      result={result}
      scoreLabel={scoreLabel}
      shareImage={ballSrc(club)}
      startExtra={<StartExtra club={club} onPick={pickClub} unlocked={unlocked} />}
      resultExtra={hasReward ? undefined : <Milestones unlocked={unlocked} reached={run.reached} fresh={run.fresh} />}
      previewRewards={previewRewards}
      hud={
        <>
          <HudStat label="Bodovi" value={points} accent bump={points} />
          {best !== null ? <HudStat label="Rekord" value={Math.max(best, points)} /> : null}
        </>
      }
    >
      <canvas ref={canvasRef} className="h-full w-full" aria-label="Žongliranje — igra" />
    </GameShell>
  );
}

/** Bijela → accent (0..1) za bljesak brojača. */
function mixAccent(k: number) {
  const r = Math.round(lerp(255, 232, k));
  const g = Math.round(lerp(255, 255, k));
  const b = Math.round(lerp(255, 60, k));
  return `rgb(${r},${g},${b})`;
}

/** Razmak među slovima za sitne natpise na canvasu (Safari nema letterSpacing). */
function spaced(t: string) {
  return t.split("").join(" ");
}

// ── Startni ekran: izbor lopte + ciljevi ────────────────────────────────
function StartExtra({ club, onPick, unlocked }: { club: ClubId; onPick: (id: ClubId) => void; unlocked: number[] }) {
  const name = CLUBS.find((c) => c.id === club)?.name ?? "";
  return (
    <div>
      <div className="flex items-baseline justify-between">
        <span className="text-[10.5px] font-semibold uppercase tracking-[0.24em] text-white/45">Lopta</span>
        <span className="relative h-[18px] overflow-hidden text-right">
          <AnimatePresence mode="popLayout" initial={false}>
            <motion.span
              key={name}
              initial={{ y: 12, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: -12, opacity: 0 }}
              transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
              className="block text-[12.5px] font-semibold leading-[18px] text-white/85"
            >
              {name}
            </motion.span>
          </AnimatePresence>
        </span>
      </div>
      <div className="mt-2 grid grid-cols-8 gap-[5px] px-[3px]" role="radiogroup" aria-label="Odaberi loptu">
        {CLUBS.map((c) => {
          const on = c.id === club;
          return (
            <motion.button
              key={c.id}
              type="button"
              role="radio"
              aria-checked={on}
              aria-label={c.name}
              onClick={() => onPick(c.id)}
              initial={false}
              animate={{ scale: on ? 1.1 : 1, opacity: on ? 1 : 0.55 }}
              whileTap={{ scale: on ? 1.02 : 0.88 }}
              transition={{ type: "spring", stiffness: 520, damping: 26, mass: 0.6 }}
              className="relative mx-auto grid aspect-square w-full max-w-[38px] place-items-center rounded-full"
            >
              {on ? (
                <motion.span
                  layoutId="zong-ball-ring"
                  transition={{ type: "spring", stiffness: 480, damping: 34 }}
                  className="absolute inset-[-3px] rounded-full border-2 border-accent shadow-[0_0_14px_rgba(232,255,60,0.35)]"
                />
              ) : null}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <motion.img
                src={ballSrc(c.id)}
                alt=""
                width={38}
                height={38}
                draggable={false}
                initial={false}
                animate={{ rotate: on ? 360 : 0 }}
                transition={on ? { type: "spring", stiffness: 140, damping: 18 } : { duration: 0 }}
                className="h-full w-full select-none rounded-full"
              />
            </motion.button>
          );
        })}
      </div>
      <div className="mt-3.5 flex items-center gap-2">
        <span className="text-[10.5px] font-semibold uppercase tracking-[0.24em] text-white/45">Ciljevi</span>
        <span className="h-px flex-1 bg-white/10" />
        {MILESTONES.map((m) => {
          const done = unlocked.includes(m);
          return (
            <span
              key={m}
              className={`flex h-6 items-center gap-1 rounded-full px-2.5 text-[11.5px] font-semibold tabular-nums ${done ? "bg-accent text-black" : "border border-white/12 text-white/55"}`}
            >
              {done ? <CheckMark /> : null}
              {m}
            </span>
          );
        })}
      </div>
    </div>
  );
}

function CheckMark() {
  return (
    <svg viewBox="0 0 12 12" className="h-[10px] w-[10px]" aria-hidden>
      <path d="M2.2 6.4l2.4 2.3 5.2-5.4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

// ── Rezultat: ciljevi u ovoj igri ───────────────────────────────────────
function Milestones({ unlocked, reached, fresh }: { unlocked: number[]; reached: number[]; fresh: number[] }) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-[10.5px] font-semibold uppercase tracking-[0.24em] text-white/45">Ciljevi</span>
      <span className="h-px flex-1 bg-white/10" />
      {MILESTONES.map((m, i) => {
        const now = reached.includes(m);
        const isNew = fresh.includes(m);
        const ever = unlocked.includes(m);
        return (
          <motion.span
            key={m}
            initial={now ? { scale: 0.6, opacity: 0 } : { opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={now ? { type: "spring", stiffness: 420, damping: 18, delay: 0.35 + i * 0.12 } : { duration: 0.3, delay: 0.25 }}
            className={`relative flex h-7 items-center gap-1 rounded-full px-3 text-[12.5px] font-semibold tabular-nums ${
              now
                ? "bg-accent text-black shadow-[0_0_18px_rgba(232,255,60,0.28)]"
                : ever
                  ? "border border-accent/40 text-accent/90"
                  : "border border-white/12 text-white/40"
            }`}
          >
            {now || ever ? <CheckMark /> : null}
            {m}
            {isNew ? (
              <motion.span
                initial={{ scale: 0, rotate: -12 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ type: "spring", stiffness: 500, damping: 14, delay: 0.75 + i * 0.12 }}
                className="absolute -right-1 -top-2 rounded-full bg-white px-1.5 py-[1px] text-[8.5px] font-bold uppercase tracking-[0.12em] text-black"
              >
                Novo
              </motion.span>
            ) : null}
          </motion.span>
        );
      })}
    </div>
  );
}
