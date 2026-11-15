"use client";

// ŽONGLIRANJE — drži loptu u zraku što dulje.
//
// Pravila:
//   - Tapni loptu da je udariš prema gore. Mjesto dodira u odnosu na središte
//     određuje smjer: dodir lijevo od središta šalje loptu udesno i obrnuto.
//   - Dodir blizu središta je "savršen" — niz savršenih diže množitelj
//     (3 → x2, 6 → x3, 10 → x4). Svaki drugi udarac vraća niz na nulu.
//   - Lopta se može udariti tek kad uspori (blizu vrha ili u padu) — nema "spama".
//   - Povremeno se pojavi kapa: dotakni je loptom za +5 bodova.
//   - Gravitacija raste s brojem dodira; od 25. dodira puše vjetar.
//   - Lopta padne na travu → kraj igre.
//   Rezultat = bodovi (dodiri x množitelj + kape). Ciljevi: 25 / 50 / 100 dodira.

import { Crosshair, Hand } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

import { BRAND, brandFont, clamp, createParticles, createShake, damp, ease, ensureBrandFonts, lerp, loadImage, rand, roundRect, softShadow } from "../draw";
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
import { paintBallShade, paintGlow, paintScene, SCENE_BLEED } from "./scene";

// ── Fizika (svjetske jedinice; 1 jedinica ≈ 1 px na 400 px širokom ekranu) ──
const R = 50; // polumjer lopte
const RISE = 300; // koliko se lopta digne nakon udarca
const G0 = 1480;
const G_MAX_EXTRA = 760;
const HIT_RADIUS = 1.55; // × R — velikodušno za prst
const PERFECT = 0.24; // |pomak| / R
const MIN_VY_TO_KICK = -380; // dok lopta brzo leti gore, ne može se udariti
const WIND_FROM = 25;
const CAP_FROM = 8;
const CAP_POINTS = 5;
const GROUND_PAD = 58;

type Phase = "ready" | "air" | "down";
type FloatText = { x: number; y: number; vy: number; text: string; color: string; size: number; t: number; max: number; heading: boolean };
type Ring = { x: number; y: number; t: number; max: number; color: string; r0: number; r1: number };
type Cap = { x: number; y: number; t: number; life: number; got: number };
type Streak = { x: number; y: number; len: number; sp: number };
type Mote = { x: number; y: number; vx: number; vy: number; a: number; ph: number };

function multFor(streak: number) {
  return streak >= 10 ? 4 : streak >= 6 ? 3 : streak >= 3 ? 2 : 1;
}

function nextMultAt(streak: number) {
  return streak >= 10 ? null : streak >= 6 ? 10 : streak >= 3 ? 6 : 3;
}

function freshSim() {
  return {
    phase: "ready" as Phase,
    x: 0, y: 0, px: 0, py: 0, vx: 0, vy: 0,
    rot: 0, spin: 0.6,
    squash: 0, glow: 0, hover: 0,
    kicks: 0, points: 0, streak: 0, mult: 1, maxMult: 1, perfects: 0, caps: 0, maxStreak: 0,
    wind: 0, windTarget: 0, windTimer: 0,
    cap: null as Cap | null,
    capCooldown: 5,
    downT: 0, bounces: 0,
    finished: false,
    scoreBump: 0,
    multBump: 0,
    reached: [] as number[],
    recordShown: false
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

  const sceneRef = useRef<HTMLCanvasElement | null>(null);
  const shadeRef = useRef<HTMLCanvasElement | null>(null);
  const glowRef = useRef<HTMLCanvasElement | null>(null);
  const dirty = useRef(true);
  const scale = useRef(1);

  const sim = useRef(freshSim());
  const lastWorld = useRef<{ W: number; ground: number } | null>(null);

  const { canvasRef, view } = useCanvas({
    onResize: (v) => {
      dirty.current = true;
      // Promjena veličine (rotacija, prozor): lopta i kapa ostaju na istom relativnom
      // mjestu u novom svijetu, a promjena širine usred igre pauzira igru — da lopta
      // ne padne dok igrač okreće mobitel.
      const sc = Math.min(v.w / 400, v.h / 640) || 1;
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
      if (s.cap) {
        s.cap.x = clamp(s.cap.x * kx, 70, Math.max(70, W - 70));
        s.cap.y *= ky;
      }
      trail.current.length = 0;
      if (stateRef.current === "playing" && s.phase === "air" && Math.abs(kx - 1) > 0.02) setState("paused");
    }
  });

  const ballImg = useRef<HTMLImageElement | null>(null);
  const capImg = useRef<HTMLImageElement | null>(null);
  const fx = useRef(createParticles(320));
  const shake = useRef(createShake(9, 0.012));
  const texts = useRef<FloatText[]>([]);
  const rings = useRef<Ring[]>([]);
  const banner = useRef<{ value: number; t: number } | null>(null);
  const streaks = useRef<Streak[]>([]);
  const motes = useRef<Mote[]>([]);
  const trail = useRef<{ x: number; y: number }[]>([]);
  const unlockedRef = useRef<number[]>([]);
  const swap = useRef(0);
  const bestRef = useRef<number | null>(null);

  // Samo u razvoju: stanje simulacije za automatske testove (Playwright).
  useEffect(() => {
    if (process.env.NODE_ENV === "production") return;
    const w = window as unknown as { __zong?: () => unknown };
    w.__zong = () => ({ ...sim.current, scale: scale.current });
    return () => {
      delete w.__zong;
    };
  }, []);

  // ── Učitavanje ─────────────────────────────────────────────────────────
  useEffect(() => {
    void ensureBrandFonts();
    try {
      const saved = window.localStorage.getItem(BALL_KEY);
      if (isClubId(saved)) setClub(saved);
      const b = window.localStorage.getItem(BEST_KEY);
      if (b !== null && Number.isFinite(Number(b))) setBest(Number(b));
    } catch {}
    const ms = readMilestones();
    unlockedRef.current = ms;
    setUnlocked(ms);
    // zagrij ostale lopte u pozadini (male datoteke)
    const id = window.setTimeout(() => CLUBS.forEach((c) => void loadImage(ballSrc(c.id)).catch(() => {})), 1200);
    return () => window.clearTimeout(id);
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
    const s = Math.min(v.w / 400, v.h / 640) || 1;
    scale.current = s;
    return { s, W: v.w / s, H: v.h / s, ground: v.h / s - GROUND_PAD };
  };

  const addText = (x: number, y: number, text: string, color: string, size: number, heading = true, max = 0.9) => {
    texts.current.push({ x, y, vy: -70, text, color, size, t: 0, max, heading });
    if (texts.current.length > 10) texts.current.shift();
  };

  const addRing = (x: number, y: number, color: string, r0: number, r1: number, max = 0.45) => {
    rings.current.push({ x, y, t: 0, max, color, r0, r1 });
    if (rings.current.length > 14) rings.current.shift();
  };

  // ── Start / kraj ───────────────────────────────────────────────────────
  const start = useCallback(() => {
    const prev = sim.current;
    const next = freshSim();
    // lopta kreće s mjesta gdje je bila (glatki prijelaz u lebdenje)
    next.x = prev.x;
    next.y = prev.y;
    next.rot = prev.rot;
    sim.current = next;
    fx.current.clear();
    shake.current.reset();
    texts.current = [];
    rings.current = [];
    banner.current = null;
    trail.current = [];
    try {
      const b = window.localStorage.getItem(BEST_KEY);
      const n = b !== null && Number.isFinite(Number(b)) ? Number(b) : null;
      bestRef.current = n;
      setBest(n);
    } catch {}
    setPoints(0);
    setResult(null);
    setRun({ reached: [], fresh: [] });
    setState("playing");
    sfx.whistle();
  }, []);

  const finish = useCallback(() => {
    const s = sim.current;
    if (s.finished) return;
    s.finished = true;
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
        ? "Lopta mora u zrak — tapni je prije nego padne."
        : `${s.kicks} ${plural(s.kicks, "dodir", "dodira", "dodira")} · ${s.perfects} ${plural(s.perfects, "savršen", "savršena", "savršenih")}${s.caps ? ` · ${s.caps} ${plural(s.caps, "kapa", "kape", "kapa")}` : ""}`;
    setResult({
      score: s.points,
      title: s.kicks >= 100 ? "Majstorski" : s.kicks >= 50 ? "Ozbiljna kontrola" : s.kicks >= 25 ? "Lijep niz" : "Lopta je pala",
      message: msg
    });
    setState("result");
  }, []);

  // ── Udarac ─────────────────────────────────────────────────────────────
  usePointer(canvasRef, {
    onDown: (p) => {
      if (stateRef.current !== "playing") return;
      const s = sim.current;
      if (s.phase === "down") return;
      const { s: sc, W } = world();
      const tx = p.x / sc;
      const ty = p.y / sc;
      const dx = tx - s.x;
      const dy = ty - s.y;
      const dist = Math.hypot(dx, dy);
      if (dist > R * HIT_RADIUS) {
        addRing(tx, ty, "rgba(255,255,255,0.35)", 6, 22, 0.35);
        return;
      }
      if (s.phase === "air" && s.vy < MIN_VY_TO_KICK) {
        addRing(tx, ty, "rgba(255,255,255,0.3)", 8, 26, 0.3);
        return;
      }

      const off = clamp(-dx / R, -1.25, 1.25); // + = dodir lijevo → lopta ide desno
      const abs = Math.abs(off);
      const perfect = abs < PERFECT;
      const G = G0 + Math.min(G_MAX_EXTRA, s.kicks * 11);
      const rise = RISE * (perfect ? 1.04 : 1 - 0.16 * Math.min(1, abs));

      s.phase = "air";
      s.vy = -Math.sqrt(2 * G * rise);
      s.vx = s.vx * (perfect ? 0.15 : 0.25) + off * 470;
      s.spin = off * 9 + s.vx / R * 0.4;
      s.squash = 1;
      s.kicks += 1;

      const prevMult = s.mult;
      if (perfect) {
        s.streak += 1;
        s.perfects += 1;
      } else s.streak = 0;
      s.maxStreak = Math.max(s.maxStreak, s.streak);
      s.mult = multFor(s.streak);
      s.maxMult = Math.max(s.maxMult, s.mult);
      s.points += s.mult;
      s.scoreBump = 1;

      // točka kontakta: donji dio lopte prema dodiru
      const cxp = s.x + clamp(dx, -R * 0.8, R * 0.8);
      const cyp = s.y + R * 0.72;
      fx.current.burst(cxp, cyp, {
        count: perfect ? 16 : 10,
        speed: [140, 420],
        angle: Math.PI / 2 - off * 0.6,
        spread: 1.5,
        gravity: 900,
        size: [1.4, 3.2],
        shape: "spark",
        colors: perfect ? [BRAND.accent, "#ffffff", BRAND.accent] : ["#ffffff", "rgba(255,255,255,0.7)"]
      });
      addRing(cxp, cyp, perfect ? `rgba(${BRAND.accentRgb},0.9)` : "rgba(255,255,255,0.65)", 10, perfect ? 58 : 40, perfect ? 0.5 : 0.38);
      sfx.kick(0.75 + Math.min(0.5, s.kicks / 80) + (perfect ? 0.15 : 0));
      haptic(perfect ? 14 : 8);

      if (perfect) {
        s.glow = 1;
        sfx.coin(Math.min(10, (s.mult - 1) * 3 + Math.min(2, s.streak % 3)));
        addText(s.x, s.y + R + 26, "Savršeno", BRAND.accent, 26);
        shake.current.add(0.06 + s.mult * 0.03);
      } else {
        shake.current.add(0.05);
      }
      if (s.mult > prevMult) {
        s.multBump = 1;
        sfx.success();
        shake.current.add(0.18);
        fx.current.burst(W / 2, 250, { count: 26, speed: [160, 460], size: [2, 4.5], life: [0.5, 1], colors: [BRAND.accent, "#ffffff"] });
      } else if (prevMult > 1 && s.mult === 1) {
        addText(s.x, s.y + R + 26, "Niz prekinut", "rgba(255,255,255,0.6)", 14, false, 0.8);
      }

      // ciljevi
      if ((MILESTONES as readonly number[]).includes(s.kicks)) {
        s.reached.push(s.kicks);
        banner.current = { value: s.kicks, t: 0 };
        sfx.fanfare();
        sfx.crowd(0.55 + s.kicks / 200, 2.4);
        shake.current.add(0.3);
        fx.current.burst(W * 0.2, 0, { count: 40, angle: Math.PI / 2 - 0.5, spread: 1.2, speed: [280, 720], gravity: 900, drag: 1.5, life: [1.1, 2], size: [3, 6], shape: "confetti", colors: [BRAND.accent, "#ffffff", "#c9e01f"] });
        fx.current.burst(W * 0.8, 0, { count: 40, angle: Math.PI / 2 + 0.5, spread: 1.2, speed: [280, 720], gravity: 900, drag: 1.5, life: [1.1, 2], size: [3, 6], shape: "confetti", colors: [BRAND.accent, "#ffffff", "#c9e01f"] });
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
    (dt: number) => {
      const s = sim.current;
      if (s.finished || s.phase === "ready") return;
      const { W, H, ground } = world();
      s.px = s.x;
      s.py = s.y;

      const G = G0 + Math.min(G_MAX_EXTRA, s.kicks * 11);

      // vjetar
      if (s.kicks >= WIND_FROM && s.phase === "air") {
        s.windTimer -= dt;
        if (s.windTimer <= 0) {
          const strength = 55 + Math.min(95, (s.kicks - WIND_FROM) * 1.6);
          const dir = s.windTarget === 0 ? (Math.random() < 0.5 ? -1 : 1) : -Math.sign(s.windTarget) * (Math.random() < 0.75 ? 1 : -1);
          s.windTarget = dir * strength * rand(0.6, 1);
          s.windTimer = rand(5.5, 8.5);
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
          if (Math.abs(s.vx) > 80) sfx.kick(0.4);
        }
      } else if (s.x > W - R) {
        s.x = W - R;
        if (s.vx > 0) {
          s.vx = -s.vx * 0.72;
          s.spin *= -0.6;
          if (Math.abs(s.vx) > 80) sfx.kick(0.4);
        }
      }

      s.spin = damp(s.spin, s.vx / R * 0.6, 0.8, dt);
      s.rot += s.spin * dt;

      // trava
      if (s.y + R >= ground) {
        s.y = ground - R;
        if (s.phase === "air") {
          s.phase = "down";
          s.downT = 0;
          s.wind = 0;
          s.windTarget = 0;
          sfx.fail();
          haptic(40);
          shake.current.add(0.42);
          fx.current.burst(s.x, ground, { count: 22, angle: -Math.PI / 2, spread: 2.4, speed: [90, 300], gravity: 900, size: [1.5, 3.4], life: [0.4, 0.9], colors: ["#3f8f4f", "#2c6b3a", "#a6d987"] });
          addRing(s.x, ground, "rgba(255,255,255,0.4)", 20, 90, 0.5);
        }
        if (s.vy > 120) {
          s.vy = -s.vy * 0.42;
          s.vx *= 0.7;
          if (s.bounces++ < 3) sfx.kick(0.3);
        } else s.vy = 0;
        s.vx *= Math.exp(-2.4 * dt);
      }

      // kapa
      if (s.phase === "air" && s.kicks >= CAP_FROM) {
        if (!s.cap) {
          s.capCooldown -= dt;
          if (s.capCooldown <= 0) {
            s.cap = { x: rand(70, W - 70), y: rand(H * 0.2, H * 0.44), t: 0, life: 7, got: 0 };
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
              sfx.coin(7);
              setTimeout(() => sfx.coin(12), 70);
              shake.current.add(0.16);
              fx.current.burst(c.x, cyb, { count: 30, speed: [120, 420], size: [2, 4.5], life: [0.5, 1], colors: [BRAND.accent, "#ffffff"] });
              addRing(c.x, cyb, `rgba(${BRAND.accentRgb},0.9)`, 20, 80, 0.5);
              addText(c.x, cyb - 34, `+${CAP_POINTS}`, BRAND.accent, 40, true, 1);
            }
          }
        }
      }

      if (s.phase === "down") {
        s.downT += dt;
        if (s.downT > 1.1) finish();
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
      const st = stateRef.current;

      if (dirty.current || !sceneRef.current) {
        sceneRef.current = paintScene(w, h, dpr);
        shadeRef.current = paintBallShade(R * sc, dpr);
        glowRef.current = paintGlow(R * 2.6 * sc, dpr, BRAND.accentRgb, 0.55);
        dirty.current = false;
        streaks.current = Array.from({ length: 16 }, () => ({ x: Math.random() * W, y: rand(H * 0.1, H * 0.8), len: rand(40, 120), sp: rand(0.7, 1.3) }));
        motes.current = Array.from({ length: 26 }, () => ({ x: Math.random() * W, y: Math.random() * H * 0.8, vx: rand(-6, 6), vy: rand(-14, -4), a: rand(0.15, 0.5), ph: Math.random() * 6 }));
      }

      // kozmetika
      fx.current.update(dt);
      shake.current.update(dt);
      s.squash = Math.max(0, s.squash - dt * 5.5);
      s.glow = Math.max(0, s.glow - dt * 2.2);
      s.scoreBump = Math.max(0, s.scoreBump - dt * 4);
      s.multBump = Math.max(0, s.multBump - dt * 2.5);
      swap.current = Math.max(0, swap.current - dt * 3.5);
      for (let i = texts.current.length - 1; i >= 0; i--) {
        const t = texts.current[i];
        t.t += dt;
        t.y += t.vy * dt;
        t.vy *= Math.exp(-3 * dt);
        if (t.t > t.max) texts.current.splice(i, 1);
      }
      for (let i = rings.current.length - 1; i >= 0; i--) {
        rings.current[i].t += dt;
        if (rings.current[i].t > rings.current[i].max) rings.current.splice(i, 1);
      }
      if (banner.current) {
        banner.current.t += dt;
        if (banner.current.t > 1.9) banner.current = null;
      }

      // lebdenje: startni ekran (gore, manja) i "spremno" (sredina)
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
        s.hover = damp(s.hover, 1, 7, dt);
        s.rot += 0.55 * dt;
      } else {
        s.hover = damp(s.hover, 1, 9, dt);
      }

      const bob = ready ? Math.sin(time * 2.4) * 6 : 0;
      const bx = ready ? s.x : lerp(s.px, s.x, alpha);
      const by = (ready ? s.y : lerp(s.py, s.y, alpha)) + bob;
      const br = R * s.hover * (1 + swap.current * 0.12);

      // ── pozadina ──
      ctx.save();
      shake.current.apply(ctx, w / 2, h / 2);
      ctx.drawImage(sceneRef.current!, -SCENE_BLEED, -SCENE_BLEED, w + SCENE_BLEED * 2, h + SCENE_BLEED * 2);

      ctx.save();
      ctx.scale(sc, sc);

      // čestice prašine u svjetlu
      for (const m of motes.current) {
        m.x += (m.vx + s.wind * 0.25) * dt;
        m.y += m.vy * dt;
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
      const windK = Math.min(1, Math.abs(s.wind) / 150);
      if (windK > 0.02) {
        ctx.strokeStyle = `rgba(255,255,255,${0.16 * windK})`;
        ctx.lineWidth = 1.2;
        ctx.lineCap = "round";
        ctx.beginPath();
        for (const k of streaks.current) {
          k.x += s.wind * 2.2 * k.sp * dt;
          if (k.x > W + k.len) k.x = -k.len;
          if (k.x < -k.len) k.x = W + k.len;
          const dir = Math.sign(s.wind);
          ctx.moveTo(k.x, k.y);
          ctx.lineTo(k.x - dir * k.len * windK, k.y);
        }
        ctx.stroke();
      }

      // ── veliki broj dodira (iza lopte); bodovi i rekord su u HUD-u ──
      const live = st === "playing" || st === "paused";
      if (live && s.phase !== "ready") {
        const sy = H * 0.25;
        const pop = 1 + ease.outCubic(s.scoreBump) * 0.16;
        ctx.save();
        ctx.translate(W / 2, sy);
        ctx.scale(pop, pop);
        ctx.font = brandFont("heading", 156);
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillStyle = "rgba(0,0,0,0.28)";
        ctx.fillText(String(s.kicks), 0, 6);
        ctx.fillStyle = "rgba(255,255,255,0.93)";
        ctx.fillText(String(s.kicks), 0, 0);
        ctx.restore();

        // množitelj + napredak niza
        const my = sy + 86;
        const nextAt = nextMultAt(s.streak);
        const base = s.streak >= 10 ? 10 : s.streak >= 6 ? 6 : s.streak >= 3 ? 3 : 0;
        const need = nextAt === null ? 0 : nextAt - base;
        const have = nextAt === null ? 0 : s.streak - base;
        const pillW = s.mult > 1 ? 54 : 0;
        const dotsW = need ? need * 12 - 4 : 0;
        const gap = pillW && dotsW ? 10 : 0;
        let x0 = W / 2 - (pillW + gap + dotsW) / 2;
        if (pillW) {
          const mb = 1 + s.multBump * 0.25;
          ctx.save();
          ctx.translate(x0 + pillW / 2, my);
          ctx.scale(mb, mb);
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

      // natpis cilja (25 / 50 / 100)
      const b = banner.current;
      if (b && live) {
        const t = b.t;
        const inK = ease.outBack(clamp(t / 0.35, 0, 1));
        const out = t > 1.5 ? 1 - (t - 1.5) / 0.4 : 1;
        const cy = H * 0.455;
        ctx.globalAlpha = clamp(out, 0, 1);
        ctx.save();
        ctx.translate(W / 2, cy);
        ctx.scale(inK, inK);
        ctx.fillStyle = "rgba(10,10,10,0.78)";
        roundRect(ctx, -118, -44, 236, 88, 20);
        ctx.fill();
        ctx.strokeStyle = `rgba(${BRAND.accentRgb},0.55)`;
        ctx.lineWidth = 1.5;
        ctx.stroke();
        ctx.font = brandFont("body", 11, 700);
        ctx.fillStyle = BRAND.accent;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText("CILJ OSTVAREN", 0, -25);
        ctx.font = brandFont("heading", 48);
        ctx.fillStyle = "#ffffff";
        ctx.fillText(`${b.value} DODIRA`, 0, 9);
        ctx.restore();
        ctx.globalAlpha = 1;
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
        if (glowRef.current) {
          const gr = 60 * k;
          ctx.drawImage(glowRef.current, cap.x - gr, cyb - gr, gr * 2, gr * 2);
        }
        // tanki prsten odbrojavanja
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

      // ── sjena lopte na travi ──
      const heightK = clamp((ground - (by + br)) / (H * 0.7), 0, 1);
      if (st !== "start") {
        softShadow(ctx, bx, ground + 4, br * (1.15 - heightK * 0.55), br * 0.2 * (1.1 - heightK * 0.5), 0.55 - heightK * 0.35);
      }

      // trag pri velikoj brzini
      const speed = Math.hypot(s.vx, s.vy);
      if (!ready && st === "playing") {
        trail.current.push({ x: bx, y: by });
        if (trail.current.length > 6) trail.current.shift();
      } else trail.current.length = 0;
      if (speed > 700 && trail.current.length > 2) {
        const tk = clamp((speed - 700) / 700, 0, 1);
        for (let i = 0; i < trail.current.length - 1; i++) {
          const p = trail.current[i];
          const a = ((i + 1) / trail.current.length) * 0.12 * tk;
          ctx.fillStyle = `rgba(255,255,255,${a})`;
          ctx.beginPath();
          ctx.arc(p.x, p.y, br * (0.7 + 0.3 * (i / trail.current.length)), 0, Math.PI * 2);
          ctx.fill();
        }
      }

      // sjaj savršenog udarca
      if (s.glow > 0 && glowRef.current) {
        const gr = br * 2.6 * (0.9 + 0.1 * s.glow);
        ctx.globalAlpha = s.glow;
        ctx.drawImage(glowRef.current, bx - gr, by - gr, gr * 2, gr * 2);
        ctx.globalAlpha = 1;
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
        ctx.fillStyle = "rgba(255,255,255,0.95)";
        ctx.fillText("TAPNI LOPTU", W / 2, by + br + 50);
        ctx.font = brandFont("body", 14, 600);
        ctx.fillStyle = "rgba(255,255,255,0.55)";
        ctx.fillText("Po sredini za savršen udarac", W / 2, by + br + 76);
      }

      // ── lopta ── (na startnom ekranu je skrivena — izbornik pokazuje lopte)
      const sq = ease.outCubic(s.squash) * 0.09;
      if (st === "start") ctx.globalAlpha = 0;
      ctx.save();
      ctx.translate(bx, by);
      ctx.scale(1 + sq, 1 - sq);
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
      if (shadeRef.current) {
        const pr = br + 2;
        ctx.drawImage(shadeRef.current, -pr, -pr, pr * 2, pr * 2);
      }
      ctx.restore();
      ctx.globalAlpha = 1;

      // lopta iznad ekrana → strelica
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
        ctx.lineWidth = 3 * (1 - t) + 0.6;
        ctx.beginPath();
        ctx.arc(r.x, r.y, lerp(r.r0, r.r1, ease.outCubic(t)), 0, Math.PI * 2);
        ctx.stroke();
      }
      ctx.globalAlpha = 1;

      fx.current.draw(ctx);

      // leteći tekstovi
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      for (const t of texts.current) {
        const k = t.t / t.max;
        const inK = ease.outBack(clamp(t.t / 0.22, 0, 1));
        ctx.globalAlpha = k < 0.65 ? 1 : 1 - (k - 0.65) / 0.35;
        ctx.font = t.heading ? brandFont("heading", t.size * inK) : brandFont("body", t.size, 700);
        ctx.fillStyle = t.color;
        ctx.fillText(t.heading ? t.text.toUpperCase() : t.text, t.x, t.y);
      }
      ctx.globalAlpha = 1;

      // pokazivač vjetra
      if (live && windK > 0.05) {
        const wx = W - 22;
        const wy = 96;
        const dir = Math.sign(s.wind);
        ctx.globalAlpha = Math.min(1, windK * 2);
        ctx.fillStyle = "rgba(0,0,0,0.45)";
        roundRect(ctx, wx - 96, wy - 15, 96, 30, 15);
        ctx.fill();
        ctx.strokeStyle = "rgba(255,255,255,0.1)";
        ctx.lineWidth = 1;
        ctx.stroke();
        ctx.font = brandFont("body", 10, 700);
        ctx.textAlign = "left";
        ctx.fillStyle = "rgba(255,255,255,0.55)";
        ctx.fillText("VJETAR", wx - 84, wy + 0.5);
        const ax0 = wx - 34;
        const len = 10 + windK * 14;
        ctx.strokeStyle = BRAND.accent;
        ctx.lineWidth = 2.2;
        ctx.lineCap = "round";
        ctx.beginPath();
        ctx.moveTo(ax0 - (dir * len) / 2, wy);
        ctx.lineTo(ax0 + (dir * len) / 2, wy);
        ctx.moveTo(ax0 + (dir * len) / 2, wy);
        ctx.lineTo(ax0 + (dir * len) / 2 - dir * 6, wy - 5);
        ctx.moveTo(ax0 + (dir * len) / 2, wy);
        ctx.lineTo(ax0 + (dir * len) / 2 - dir * 6, wy + 5);
        ctx.stroke();
        ctx.globalAlpha = 1;
        ctx.textAlign = "center";
      }

      ctx.restore(); // scale
      ctx.restore(); // shake
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
        { icon: Hand, text: "Tapni loptu — strana dodira određuje smjer" },
        { icon: Crosshair, text: "Po sredini za niz i množitelj do x4" }
      ]}
      state={state}
      onStart={start}
      onPause={() => setState("paused")}
      onResume={() => setState("playing")}
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

// ── Startni ekran: izbor lopte + ciljevi ────────────────────────────────
function StartExtra({ club, onPick, unlocked }: { club: ClubId; onPick: (id: ClubId) => void; unlocked: number[] }) {
  const name = CLUBS.find((c) => c.id === club)?.name ?? "";
  return (
    <div>
      <div className="flex items-baseline justify-between">
        <span className="text-[10.5px] font-semibold uppercase tracking-[0.24em] text-white/45">Lopta</span>
        <span className="text-[12.5px] font-semibold text-white/80">{name}</span>
      </div>
      <div className="mt-2 flex justify-between gap-1" role="radiogroup" aria-label="Odaberi loptu">
        {CLUBS.map((c) => {
          const on = c.id === club;
          return (
            <button
              key={c.id}
              type="button"
              role="radio"
              aria-checked={on}
              aria-label={c.name}
              onClick={() => onPick(c.id)}
              className={`relative grid h-[38px] w-[38px] shrink-0 place-items-center rounded-full transition-transform duration-200 ${on ? "scale-110" : "opacity-60 active:scale-95"}`}
            >
              <span className={`absolute inset-[-3px] rounded-full border-2 transition-colors ${on ? "border-accent" : "border-transparent"}`} />
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={ballSrc(c.id)} alt="" width={38} height={38} draggable={false} className="h-full w-full select-none rounded-full" />
            </button>
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
      {MILESTONES.map((m) => {
        const now = reached.includes(m);
        const isNew = fresh.includes(m);
        const ever = unlocked.includes(m);
        return (
          <span
            key={m}
            className={`relative flex h-7 items-center gap-1 rounded-full px-3 text-[12.5px] font-semibold tabular-nums ${
              now ? "bg-accent text-black" : ever ? "border border-accent/40 text-accent/90" : "border border-white/12 text-white/40"
            }`}
          >
            {now || ever ? <CheckMark /> : null}
            {m}
            {isNew ? (
              <span className="absolute -right-1 -top-2 rounded-full bg-white px-1.5 py-[1px] text-[8.5px] font-bold uppercase tracking-[0.12em] text-black">Novo</span>
            ) : null}
          </span>
        );
      })}
    </div>
  );
}
