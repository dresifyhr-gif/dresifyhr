"use client";

// Demo za v2 okvir: "Žongliraj" — tapkaj što brže 10 sekundi.
// Služi kao primjer kako igra koristi GameShell + useCanvas + useGameLoop.

import { Hand, Timer, Trophy } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

import { BRAND, brandFont, clamp, createParticles, createShake, damp, ease, loadImage, softShadow } from "./draw";
import { GameShell, HudStat, HudTimer, useCanvas, useGameLoop, usePointer, type GameResult, type GameState } from "./game-shell";
import { sfx } from "./sfx";

const DURATION = 10;

type Ring = { x: number; y: number; t: number };

export function DemoTapGame({ previewRewards = false }: { previewRewards?: boolean }) {
  const [state, setState] = useState<GameState>("start");
  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(DURATION);
  const [result, setResult] = useState<GameResult | null>(null);

  const { canvasRef, view } = useCanvas({
    onResize: () => {
      bgDirty.current = true;
    }
  });

  const bg = useRef<HTMLCanvasElement | null>(null);
  const bgDirty = useRef(true);
  const ball = useRef<HTMLImageElement | null>(null);
  const sim = useRef({ home: 0.2, size: 0.62, score: 0, time: DURATION, lift: 0, vy: 0, rot: 0, spin: 0, squash: 0, lastTick: 0, glow: 0 });
  const rings = useRef<Ring[]>([]);
  const fx = useRef(createParticles(240));
  const shake = useRef(createShake(7, 0.01));
  const stateRef = useRef(state);
  stateRef.current = state;

  useEffect(() => {
    loadImage("/mix/lopta-hrvatska.webp").then((img) => (ball.current = img)).catch(() => {});
  }, []);

  const finish = useCallback(() => {
    const s = sim.current.score;
    sfx.whistle(true);
    sfx.crowd(Math.min(1, s / 60), 2.4);
    setResult({
      score: s,
      title: "Vrijeme je isteklo",
      message: s >= 50 ? "Ovo je ozbiljan tempo." : s >= 30 ? "Dobar ritam." : "Svaki dodir se broji."
    });
    setState("result");
  }, []);

  const start = useCallback(() => {
    sim.current = { ...sim.current, score: 0, time: DURATION, lastTick: 0, glow: 0 };
    rings.current = [];
    fx.current.clear();
    shake.current.reset();
    setScore(0);
    setTimeLeft(DURATION);
    setResult(null);
    setState("playing");
    sfx.whistle();
  }, []);

  usePointer(canvasRef, {
    onDown: (p) => {
      if (stateRef.current !== "playing") return;
      const s = sim.current;
      const v = view.current;
      s.score += 1;
      s.vy = -Math.min(900, 420 + s.score * 4);
      s.spin += (p.x < v.w / 2 ? -1 : 1) * 7;
      s.squash = 1;
      s.glow = 1;
      setScore(s.score);
      rings.current.push({ x: p.x, y: p.y, t: 0 });
      if (rings.current.length > 12) rings.current.shift();
      const bx = v.w / 2;
      const by = v.h * s.home - s.lift;
      fx.current.burst(bx, by + v.w * 0.16, { count: 10, speed: [120, 380], angle: Math.PI / 2, spread: 2.2, gravity: 700, size: [1.5, 3.5], shape: "spark" });
      if (s.score % 10 === 0) {
        sfx.coin(Math.min(8, s.score / 10));
        fx.current.burst(bx, by, { count: 36, speed: [180, 560], size: [2, 5], life: [0.5, 1.1] });
        shake.current.add(0.35);
      } else {
        sfx.kick(0.7 + Math.random() * 0.3);
        shake.current.add(0.08);
      }
    }
  });

  const update = useCallback(
    (dt: number) => {
      const s = sim.current;
      if (s.time <= 0) return;
      s.time -= dt;
      const whole = Math.ceil(s.time);
      if (s.time <= 3 && whole !== s.lastTick && whole > 0) {
        s.lastTick = whole;
        sfx.tick(true);
      }
      if (s.time <= 0) {
        s.time = 0;
        finish();
      }
    },
    [finish]
  );

  // HUD vrijeme ~12 Hz (bez re-rendera svaki frejm)
  useEffect(() => {
    if (state !== "playing") return;
    const id = window.setInterval(() => setTimeLeft(sim.current.time), 80);
    return () => window.clearInterval(id);
  }, [state]);

  const render = useCallback(({ dt, time }: { dt: number; time: number }) => {
    const v = view.current;
    const ctx = v.ctx;
    if (!ctx || v.w < 2) return;
    const { w, h } = v;
    const s = sim.current;

    // Kozmetička fizika (radi i na startnom ekranu)
    s.vy += 2600 * dt;
    s.lift -= s.vy * dt;
    if (s.lift < 0) {
      s.lift = 0;
      s.vy = 0;
    }
    s.spin = damp(s.spin, 0, 2.4, dt);
    s.rot += s.spin * dt;
    s.squash = Math.max(0, s.squash - dt * 6);
    s.glow = Math.max(0, s.glow - dt * 2.5);
    fx.current.update(dt);
    shake.current.update(dt);
    for (let i = rings.current.length - 1; i >= 0; i--) {
      rings.current[i].t += dt;
      if (rings.current[i].t > 0.55) rings.current.splice(i, 1);
    }

    if (bgDirty.current || !bg.current) {
      bg.current = paintBackground(w, h, v.dpr);
      bgDirty.current = false;
    }

    ctx.save();
    shake.current.apply(ctx, w / 2, h / 2);
    ctx.drawImage(bg.current, -10, -10, w + 20, h + 20);

    // Lopta
    const playing = stateRef.current === "playing" || stateRef.current === "paused";
    s.home = damp(s.home, playing ? 0.46 : 0.2, 6, dt);
    s.size = damp(s.size, playing ? 1 : 0.62, 6, dt);
    const idle = playing ? 0 : Math.sin(time * 2.2) * 6;
    const r = clamp(w * 0.2, 60, 96) * s.size;
    const groundY = h * 0.64;
    const by = h * s.home - s.lift + idle;
    const heightK = clamp((groundY - by) / (h * 0.5), 0, 1);
    softShadow(ctx, w / 2, groundY + r * 0.35, r * (1.2 - heightK * 0.35), r * 0.22, 0.55 - heightK * 0.2);

    if (s.glow > 0) {
      const g = ctx.createRadialGradient(w / 2, by, r * 0.6, w / 2, by, r * 2.4);
      g.addColorStop(0, `rgba(${BRAND.accentRgb},${0.22 * s.glow})`);
      g.addColorStop(1, `rgba(${BRAND.accentRgb},0)`);
      ctx.fillStyle = g;
      ctx.fillRect(w / 2 - r * 2.5, by - r * 2.5, r * 5, r * 5);
    }

    const sq = ease.outCubic(s.squash) * 0.07;
    ctx.save();
    ctx.translate(w / 2, by);
    ctx.scale(1 + sq, 1 - sq);
    ctx.rotate(s.rot);
    if (ball.current) {
      ctx.drawImage(ball.current, -r, -r, r * 2, r * 2);
    } else {
      ctx.fillStyle = "#fff";
      ctx.beginPath();
      ctx.arc(0, 0, r, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();

    // Prstenovi dodira
    for (const ring of rings.current) {
      const t = ring.t / 0.55;
      ctx.strokeStyle = `rgba(${BRAND.accentRgb},${(1 - t) * 0.8})`;
      ctx.lineWidth = 2.5 * (1 - t) + 0.5;
      ctx.beginPath();
      ctx.arc(ring.x, ring.y, 8 + ease.outCubic(t) * 34, 0, Math.PI * 2);
      ctx.stroke();
    }

    fx.current.draw(ctx);

    // Veliki broj u pozadini tijekom igre
    if (stateRef.current === "playing") {
      ctx.font = brandFont("heading", Math.min(w * 0.5, 240));
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillStyle = "rgba(255,255,255,0.045)";
      ctx.fillText(String(s.score), w / 2, h * 0.82);
    }
    ctx.restore();
  }, [view]);

  useGameLoop({ update, render, running: state === "playing" });

  return (
    <GameShell
      gameId="arcade"
      title="Žongliraj"
      kicker="Demo"
      description="Tapkaj što brže možeš. Imaš deset sekundi."
      bestKey="dresify_v2_best_demo"
      rules={[
        { icon: Hand, text: "Tapni bilo gdje — svaki dodir je jedan udarac" },
        { icon: Timer, text: "10 sekundi, bez pauze" },
        { icon: Trophy, text: "Svakih 10 udaraca diže se ritam" }
      ]}
      state={state}
      onStart={start}
      onPause={() => setState("paused")}
      onResume={() => setState("playing")}
      result={result}
      scoreLabel="udaraca"
      previewRewards={previewRewards}
      hud={
        <>
          <HudStat label="Udarci" value={score} accent bump={score} />
          <HudTimer seconds={timeLeft} total={DURATION} />
        </>
      }
    >
      <canvas ref={canvasRef} className="h-full w-full" />
    </GameShell>
  );
}

/** Stadion u perspektivi — crta se jednom po veličini (offscreen). */
function paintBackground(w: number, h: number, dpr: number) {
  const c = document.createElement("canvas");
  const W = w + 20;
  const H = h + 20;
  c.width = Math.round(W * dpr);
  c.height = Math.round(H * dpr);
  const ctx = c.getContext("2d")!;
  ctx.scale(dpr, dpr);
  ctx.translate(10, 10);

  // Nebo / tribine
  let g = ctx.createLinearGradient(0, 0, 0, h);
  g.addColorStop(0, "#07090a");
  g.addColorStop(0.55, "#0d1210");
  g.addColorStop(1, "#050605");
  ctx.fillStyle = g;
  ctx.fillRect(-10, -10, W, H);

  // Reflektori
  for (const [x, a] of [[w * 0.12, 0.10], [w * 0.88, 0.10], [w * 0.5, 0.07]] as const) {
    const rg = ctx.createRadialGradient(x, -h * 0.05, 0, x, -h * 0.05, h * 0.75);
    rg.addColorStop(0, `rgba(235,255,210,${a})`);
    rg.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = rg;
    ctx.fillRect(-10, -10, W, H);
  }

  // Teren u perspektivi
  const horizon = h * 0.5;
  const vx = w / 2;
  const bottomHalf = w * 1.25;
  const topHalf = w * 0.42;
  const N = 14;
  for (let i = 0; i < N; i++) {
    const t0 = Math.pow(i / N, 1.7);
    const t1 = Math.pow((i + 1) / N, 1.7);
    const y0 = horizon + (h - horizon) * t0;
    const y1 = horizon + (h - horizon) * t1;
    const hw0 = topHalf + (bottomHalf - topHalf) * t0;
    const hw1 = topHalf + (bottomHalf - topHalf) * t1;
    ctx.fillStyle = i % 2 ? "#123a1f" : "#15442a";
    ctx.beginPath();
    ctx.moveTo(vx - hw0, y0);
    ctx.lineTo(vx + hw0, y0);
    ctx.lineTo(vx + hw1, y1 + 0.5);
    ctx.lineTo(vx - hw1, y1 + 0.5);
    ctx.closePath();
    ctx.fill();
  }
  // Linije
  ctx.strokeStyle = "rgba(255,255,255,0.32)";
  ctx.lineWidth = 1.5;
  const midT = Math.pow(0.42, 1.7);
  const midY = horizon + (h - horizon) * midT + h * 0.06;
  ctx.beginPath();
  ctx.moveTo(-10, midY);
  ctx.lineTo(w + 10, midY);
  ctx.stroke();
  ctx.save();
  ctx.translate(w / 2, midY);
  ctx.scale(1, 0.3);
  ctx.beginPath();
  ctx.arc(0, 0, w * 0.32, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();

  // Magla na horizontu + vinjeta
  g = ctx.createLinearGradient(0, horizon - h * 0.08, 0, horizon + h * 0.12);
  g.addColorStop(0, "rgba(7,9,10,1)");
  g.addColorStop(1, "rgba(7,9,10,0)");
  ctx.fillStyle = g;
  ctx.fillRect(-10, horizon - h * 0.08, W, h * 0.2);
  const vg = ctx.createRadialGradient(w / 2, h * 0.5, h * 0.2, w / 2, h * 0.5, h * 0.8);
  vg.addColorStop(0, "rgba(0,0,0,0)");
  vg.addColorStop(1, "rgba(0,0,0,0.7)");
  ctx.fillStyle = vg;
  ctx.fillRect(-10, -10, W, H);
  return c;
}
