// Penalty Cup 2.0 — crtanje scene na canvasu (bez Reacta).
// Statični dijelovi (nebo, tribine, publika, teren) crtaju se jednom po veličini
// u offscreen canvase; svaki frejm se crtaju samo mreža, okvir gola, golman,
// lopta, LED reklame i efekti.

import { BRAND, brandFont, clamp, softShadow } from "../draw";
import { BALL_R, GOAL_H, GOAL_Z, HALF_W, KEEPER_Z, NET_BACK_Z, NET_TOP_Z, POST_R, joints, makeCam, proj, type Cam, type Pose } from "./sim";

export type Scene = {
  cam: Cam;
  w: number;
  h: number;
  dpr: number;
  bg: HTMLCanvasElement;
  crowdA: HTMLCanvasElement;
  crowdB: HTMLCanvasElement;
  vignette: HTMLCanvasElement;
  board: { c: HTMLCanvasElement; sw: number };
  boardGoal: { c: HTMLCanvasElement; sw: number };
  /** Gornji i donji rub tribina na ekranu (za bljeskove fotoaparata). */
  standTop: number;
  standBottom: number;
};

export const BOARD_Z = 19;
const BOARD_H = 0.9;
const STAND_Z = 22;

function offscreen(w: number, h: number, dpr: number) {
  const c = document.createElement("canvas");
  c.width = Math.max(1, Math.round(w * dpr));
  c.height = Math.max(1, Math.round(h * dpr));
  const ctx = c.getContext("2d")!;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  return { c, ctx };
}

// Determinističan "random" da se scena ne mijenja kod svake promjene veličine.
function seeded(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

/** Red tribine: z i visina prednjeg ruba. */
function standRow(i: number) {
  return { z: STAND_Z + i * 0.85, y: 1.25 + i * 0.52 };
}

/** Lagani luk tribina (zdjela stadiona). */
function bowl(sc: { w: number }, x: number, k = 1) {
  const d = (x - sc.w / 2) / (sc.w / 2);
  return -d * d * 10 * k;
}

export function buildScene(w: number, h: number, dpr: number): Scene {
  const cam = makeCam(w, h);
  const rnd = seeded(7);
  const { c: bg, ctx } = offscreen(w, h, dpr);

  // ── Nebo ──
  let g = ctx.createLinearGradient(0, 0, 0, cam.hy);
  g.addColorStop(0, "#04060a");
  g.addColorStop(0.7, "#080c13");
  g.addColorStop(1, "#0d1219");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);

  // ── Tribine (konstrukcija) ──
  const rows = 30;
  const top = proj(cam, 0, standRow(rows).y, standRow(rows).z).y;
  const bottom = proj(cam, 0, BOARD_H, BOARD_Z).y;
  for (let i = rows - 1; i >= 0; i--) {
    const r0 = standRow(i);
    const r1 = standRow(i + 1);
    const y0 = proj(cam, 0, r0.y, r0.z).y;
    const y1 = proj(cam, 0, r1.y, r1.z).y;
    const shade = 0.55 + 0.45 * (1 - i / rows);
    ctx.fillStyle = `rgb(${Math.round(14 * shade)},${Math.round(18 * shade)},${Math.round(26 * shade)})`;
    ctx.beginPath();
    ctx.moveTo(0, y0 + bowl({ w }, 0));
    for (let x = 0; x <= w; x += 12) ctx.lineTo(x, y1 + bowl({ w }, x));
    ctx.lineTo(w, y0 + bowl({ w }, w));
    for (let x = w; x >= 0; x -= 12) ctx.lineTo(x, y0 + bowl({ w }, x));
    ctx.fill();
    // Rub reda (beton/ograda)
    ctx.strokeStyle = `rgba(150,170,200,${0.05 + 0.05 * (1 - i / rows)})`;
    ctx.lineWidth = 0.8;
    ctx.beginPath();
    for (let x = 0; x <= w; x += 12) (x === 0 ? ctx.moveTo : ctx.lineTo).call(ctx, x, y0 + bowl({ w }, x));
    ctx.stroke();
  }
  // Prolazi između sektora (okomite stepenice)
  ctx.strokeStyle = "rgba(0,0,0,0.35)";
  ctx.lineWidth = 3;
  for (const xs of [-24, -12, 0, 12, 24]) {
    ctx.beginPath();
    const a = proj(cam, xs, standRow(0).y, standRow(0).z);
    const b = proj(cam, xs * 1.6, standRow(rows).y, standRow(rows).z);
    ctx.moveTo(a.x, a.y + bowl({ w }, a.x));
    ctx.lineTo(b.x, b.y + bowl({ w }, b.x));
    ctx.stroke();
  }

  // Krov i reflektori
  const roofY = top + bowl({ w }, w / 2) - 4;
  g = ctx.createLinearGradient(0, roofY - 60, 0, roofY + 6);
  g.addColorStop(0, "rgba(2,3,5,1)");
  g.addColorStop(1, "rgba(10,13,18,1)");
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(w, 0);
  for (let x = w; x >= 0; x -= 12) ctx.lineTo(x, roofY + bowl({ w }, x, 1.4));
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = "rgba(160,180,210,0.12)";
  ctx.lineWidth = 1;
  ctx.beginPath();
  for (let x = 0; x <= w; x += 12) (x === 0 ? ctx.moveTo : ctx.lineTo).call(ctx, x, roofY + bowl({ w }, x, 1.4));
  ctx.stroke();

  // ── Teren ──
  const gl = proj(cam, 0, 0, BOARD_Z);
  const stripeZ: number[] = [];
  for (let z = -2.5; z < BOARD_Z + 2.2; z += 2.2) stripeZ.push(z);
  for (let i = stripeZ.length - 2; i >= 0; i--) {
    const a = proj(cam, 0, 0, Math.max(stripeZ[i], cam.z + 0.3));
    const b = proj(cam, 0, 0, Math.min(stripeZ[i + 1], BOARD_Z));
    ctx.fillStyle = i % 2 ? "#154729" : "#1a5631";
    ctx.fillRect(0, b.y, w, a.y - b.y + 1);
  }
  ctx.fillStyle = "#154729";
  ctx.fillRect(0, proj(cam, 0, 0, stripeZ[0]).y, w, h);
  // Košnja u kockice: uzdužne pruge koje se stječu prema horizontu.
  ctx.save();
  ctx.beginPath();
  ctx.rect(0, gl.y, w, h - gl.y);
  ctx.clip();
  for (let k = -14; k < 14; k += 2) {
    const x0 = k * 2.75;
    const x1 = x0 + 2.75;
    const a = proj(cam, x0, 0, BOARD_Z);
    const b = proj(cam, x1, 0, BOARD_Z);
    const c = proj(cam, x1, 0, cam.z + 0.35);
    const d = proj(cam, x0, 0, cam.z + 0.35);
    ctx.fillStyle = "rgba(0,0,0,0.075)";
    ctx.beginPath();
    ctx.moveTo(a.x, a.y);
    ctx.lineTo(b.x, b.y);
    ctx.lineTo(c.x, c.y);
    ctx.lineTo(d.x, d.y);
    ctx.closePath();
    ctx.fill();
  }
  ctx.restore();
  // Travke (tekstura)
  for (let i = 0; i < 2600; i++) {
    const y = gl.y + Math.pow(rnd(), 1.6) * (h - gl.y);
    const x = rnd() * w;
    const k = (y - gl.y) / (h - gl.y);
    ctx.strokeStyle = rnd() < 0.5 ? `rgba(0,0,0,${0.07 + k * 0.08})` : `rgba(160,230,150,${0.03 + k * 0.05})`;
    ctx.lineWidth = 0.6 + k * 0.9;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + (rnd() - 0.5) * 2, y - (1 + k * 5));
    ctx.stroke();
  }
  // Svjetlo reflektora na travi
  const goalLine = proj(cam, 0, 0, GOAL_Z);
  let rg = ctx.createRadialGradient(w / 2, goalLine.y + 20, 10, w / 2, goalLine.y + 40, Math.max(w, h) * 0.75);
  rg.addColorStop(0, "rgba(220,255,200,0.16)");
  rg.addColorStop(0.5, "rgba(220,255,200,0.05)");
  rg.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = rg;
  ctx.fillRect(0, gl.y, w, h - gl.y);
  // Tamnije prema dolje (bliže kameri)
  g = ctx.createLinearGradient(0, gl.y, 0, h);
  g.addColorStop(0, "rgba(0,0,0,0.25)");
  g.addColorStop(0.25, "rgba(0,0,0,0)");
  g.addColorStop(1, "rgba(0,0,0,0.38)");
  ctx.fillStyle = g;
  ctx.fillRect(0, gl.y, w, h - gl.y);

  // Sjena gola (dva reflektora → dvije meke sjene)
  ctx.save();
  for (const dir of [-1, 1]) {
    ctx.fillStyle = "rgba(0,0,0,0.13)";
    ctx.beginPath();
    const a = proj(cam, -HALF_W, 0, GOAL_Z);
    const b = proj(cam, HALF_W, 0, GOAL_Z);
    const c = proj(cam, HALF_W + dir * 1.4, 0, GOAL_Z - 2.6);
    const d = proj(cam, -HALF_W + dir * 1.4, 0, GOAL_Z - 2.6);
    ctx.moveTo(a.x, a.y);
    ctx.lineTo(b.x, b.y);
    ctx.lineTo(c.x, c.y);
    ctx.lineTo(d.x, d.y);
    ctx.closePath();
    ctx.globalAlpha = 0.35;
    ctx.fill();
    ctx.globalAlpha = 1;
    // Sjene stativa
    ctx.strokeStyle = "rgba(0,0,0,0.22)";
    ctx.lineWidth = 2;
    for (const px of [-HALF_W, HALF_W]) {
      const p0 = proj(cam, px, 0, GOAL_Z);
      const p1 = proj(cam, px + dir * 1.4, 0, GOAL_Z - 2.6);
      ctx.beginPath();
      ctx.moveTo(p0.x, p0.y);
      ctx.lineTo(p1.x, p1.y);
      ctx.stroke();
    }
  }
  ctx.restore();

  // Linije
  const line = (z: number, x0: number, x1: number, a = 0.62) => {
    const p0 = proj(cam, x0, 0, z);
    const p1 = proj(cam, x1, 0, z);
    const th = Math.max(1, 0.12 * p0.s * 0.35);
    ctx.fillStyle = `rgba(240,245,240,${a})`;
    ctx.fillRect(p0.x, p0.y - th / 2, p1.x - p0.x, th);
  };
  line(GOAL_Z, -30, 30, 0.7);
  line(GOAL_Z - 5.5, -9.16, 9.16, 0.55);
  // Bočne linije peterca (u perspektivi)
  ctx.strokeStyle = "rgba(240,245,240,0.5)";
  ctx.lineWidth = 1.2;
  for (const sx of [-9.16, 9.16]) {
    const a = proj(cam, sx, 0, GOAL_Z);
    const b = proj(cam, sx, 0, GOAL_Z - 5.5);
    ctx.beginPath();
    ctx.moveTo(a.x, a.y);
    ctx.lineTo(b.x, b.y);
    ctx.stroke();
  }
  // Bijela točka
  const spot = proj(cam, 0, 0, 0);
  ctx.fillStyle = "rgba(245,248,245,0.42)";
  ctx.beginPath();
  ctx.ellipse(spot.x, spot.y, 0.07 * spot.s, 0.07 * spot.s * 0.3, 0, 0, Math.PI * 2);
  ctx.fill();

  // ── Svjetla (bloom) ──
  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  const lightsY = roofY + bowl({ w }, w / 2, 1.4) + 4;
  const banks = [0.1, 0.36, 0.64, 0.9];
  for (const fx of banks) {
    const x = w * fx;
    const y = lightsY + bowl({ w }, x, 1.4) + 2;
    rg = ctx.createRadialGradient(x, y, 0, x, y, Math.min(w, h) * 0.55);
    rg.addColorStop(0, "rgba(255,250,225,0.3)");
    rg.addColorStop(0.3, "rgba(255,250,225,0.08)");
    rg.addColorStop(1, "rgba(255,250,225,0)");
    ctx.fillStyle = rg;
    ctx.fillRect(0, 0, w, h);
    // Snop svjetla prema terenu
    const cone = ctx.createLinearGradient(0, y, 0, y + h * 0.5);
    cone.addColorStop(0, "rgba(255,250,230,0.06)");
    cone.addColorStop(1, "rgba(255,250,230,0)");
    ctx.fillStyle = cone;
    ctx.beginPath();
    ctx.moveTo(x - 10, y);
    ctx.lineTo(x + 10, y);
    ctx.lineTo(x + w * 0.22 * (fx < 0.5 ? 1 : -1) + w * 0.2, y + h * 0.5);
    ctx.lineTo(x + w * 0.22 * (fx < 0.5 ? 1 : -1) - w * 0.2, y + h * 0.5);
    ctx.closePath();
    ctx.fill();
  }
  // Izmaglica iznad terena
  rg = ctx.createRadialGradient(w / 2, cam.hy, 0, w / 2, cam.hy, w * 0.9);
  rg.addColorStop(0, "rgba(200,220,255,0.07)");
  rg.addColorStop(1, "rgba(200,220,255,0)");
  ctx.fillStyle = rg;
  ctx.fillRect(0, 0, w, h);
  ctx.restore();
  // Panele reflektora (iznad blooma, oštri)
  for (const fx of banks) {
    const x = w * fx;
    const y = lightsY + bowl({ w }, x, 1.4) + 2;
    const pw = Math.max(18, w * 0.075);
    for (let i = 0; i < 4; i++) {
      const lx = x - pw / 2 + (i + 0.5) * (pw / 4);
      const lg = ctx.createRadialGradient(lx, y, 0, lx, y, 4);
      lg.addColorStop(0, "rgba(255,255,245,1)");
      lg.addColorStop(0.5, "rgba(255,250,220,0.85)");
      lg.addColorStop(1, "rgba(255,250,220,0)");
      ctx.fillStyle = lg;
      ctx.beginPath();
      ctx.arc(lx, y, 4, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // ── Publika (dva sloja da mogu skakati u protufazi) ──
  const crowdA = offscreen(w, h, dpr);
  const crowdB = offscreen(w, h, dpr);
  const palette = ["#1b2230", "#222a39", "#2a3242", "#30333a", "#3a3f48", "#1d2733"];
  const accents = ["rgba(232,255,60,0.75)", "rgba(240,240,240,0.55)", "rgba(220,60,70,0.5)", "rgba(70,120,220,0.5)"];
  for (let i = rows - 1; i >= 0; i--) {
    const r = standRow(i);
    const p = proj(cam, 0, r.y, r.z);
    const s = p.s;
    const target = i % 2 ? crowdB.ctx : crowdA.ctx;
    const spacing = 0.52 * s;
    const headR = Math.max(1.2, 0.13 * s);
    const fade = 0.55 + 0.45 * (1 - i / rows);
    for (let x = -spacing * 0.5 + (i % 2) * spacing * 0.5; x < w + spacing; x += spacing * (0.82 + rnd() * 0.4)) {
      if (rnd() < 0.06) continue; // prazno sjedalo
      const yy = p.y + bowl({ w }, x) - headR * 0.6 + (rnd() - 0.5) * headR * 0.5;
      const col = palette[(rnd() * palette.length) | 0];
      target.globalAlpha = fade;
      // Ramena
      target.fillStyle = rnd() < 0.12 ? accents[(rnd() * accents.length) | 0] : col;
      target.beginPath();
      target.ellipse(x, yy + headR * 1.7, headR * 1.45, headR * 1.1, 0, Math.PI, 0);
      target.fill();
      // Glava
      target.fillStyle = rnd() < 0.5 ? "#2b2622" : "#3a302a";
      target.beginPath();
      target.arc(x, yy, headR, 0, Math.PI * 2);
      target.fill();
      // Rub svjetla odozgo
      target.strokeStyle = "rgba(255,245,220,0.12)";
      target.lineWidth = Math.max(0.5, headR * 0.35);
      target.beginPath();
      target.arc(x, yy, headR * 0.85, Math.PI * 1.15, Math.PI * 1.85);
      target.stroke();
      // Podignute ruke / šal
      if (rnd() < 0.035) {
        target.strokeStyle = col;
        target.lineWidth = Math.max(0.8, headR * 0.55);
        target.lineCap = "round";
        target.beginPath();
        target.moveTo(x - headR * 1.1, yy + headR * 0.9);
        target.lineTo(x - headR * 1.4, yy - headR * 1.3);
        target.moveTo(x + headR * 1.1, yy + headR * 0.9);
        target.lineTo(x + headR * 1.4, yy - headR * 1.3);
        target.stroke();
      }
    }
    target.globalAlpha = 1;
  }
  // Gornji redovi tamniji (dubina)
  for (const t of [crowdA.ctx, crowdB.ctx]) {
    t.globalCompositeOperation = "source-atop";
    g = t.createLinearGradient(0, top, 0, bottom);
    g.addColorStop(0, "rgba(4,6,10,0.65)");
    g.addColorStop(0.6, "rgba(4,6,10,0.1)");
    g.addColorStop(1, "rgba(4,6,10,0)");
    t.fillStyle = g;
    t.fillRect(0, 0, w, h);
    // Svjetlo reflektora na publici
    rg = t.createRadialGradient(w / 2, top, 0, w / 2, top, w);
    rg.addColorStop(0, "rgba(255,245,215,0.12)");
    rg.addColorStop(1, "rgba(255,245,215,0)");
    t.fillStyle = rg;
    t.fillRect(0, 0, w, h);
    t.globalCompositeOperation = "source-over";
  }

  // ── Vinjeta ──
  const vig = offscreen(w, h, dpr);
  rg = vig.ctx.createRadialGradient(w / 2, h * 0.5, Math.min(w, h) * 0.35, w / 2, h * 0.5, Math.max(w, h) * 0.78);
  rg.addColorStop(0, "rgba(0,0,0,0)");
  rg.addColorStop(1, "rgba(0,0,0,0.55)");
  vig.ctx.fillStyle = rg;
  vig.ctx.fillRect(0, 0, w, h);

  // ── LED reklame ──
  const bTop = proj(cam, 0, BOARD_H, BOARD_Z).y;
  const bBot = proj(cam, 0, 0, BOARD_Z).y;
  const bh = Math.max(8, bBot - bTop);
  const board = paintBoardStrip(w, bh, dpr, false);
  const boardGoal = paintBoardStrip(w, bh, dpr, true);

  return { cam, w, h, dpr, bg, crowdA: crowdA.c, crowdB: crowdB.c, vignette: vig.c, board, boardGoal, standTop: top, standBottom: bottom };
}

function paintBoardStrip(w: number, bh: number, dpr: number, goal: boolean) {
  const fs = bh * 0.72;
  const items = goal ? ["GOL"] : ["DRES|IFY", "PENALTY KARIJERA", "DRES|IFY", "DRESIFYSHOP.COM"];
  const gap = fs * 1.4;
  // Široki canvas; traka se reže točno na kraju cijelog kruga pa se ponavlja bez šava.
  const cap = Math.ceil(w * 3.2);
  const { c, ctx } = offscreen(cap, bh, dpr);
  ctx.fillStyle = goal ? BRAND.accent : "#06080b";
  ctx.fillRect(0, 0, cap, bh);
  ctx.textBaseline = "middle";
  ctx.font = brandFont("heading", fs);
  let x = 0;
  let end = 0;
  while (end < w * 1.2 && x < cap * 0.7) {
    for (const it of items) {
      if (it.includes("|")) {
        const [a, b2] = it.split("|");
        ctx.fillStyle = goal ? "#0a0a0a" : "#ffffff";
        ctx.fillText(a, x, bh / 2 + 1);
        const aw = ctx.measureText(a).width;
        ctx.fillStyle = goal ? "#0a0a0a" : BRAND.accent;
        ctx.fillText(b2, x + aw, bh / 2 + 1);
        x += aw + ctx.measureText(b2).width;
      } else {
        ctx.fillStyle = goal ? "#0a0a0a" : "rgba(255,255,255,0.78)";
        ctx.fillText(it, x, bh / 2 + 1);
        x += ctx.measureText(it).width;
      }
      x += gap;
      ctx.fillStyle = goal ? "rgba(0,0,0,0.5)" : `rgba(${BRAND.accentRgb},0.6)`;
      ctx.fillRect(x - gap / 2 - fs * 0.06, bh * 0.35, Math.max(1.5, fs * 0.12), bh * 0.3);
    }
    end = x;
  }
  // LED raster
  ctx.fillStyle = goal ? "rgba(0,0,0,0.12)" : "rgba(0,0,0,0.35)";
  for (let y = 0; y < bh; y += 2) ctx.fillRect(0, y, cap, 0.6);
  return { c, sw: end };
}

/** LED reklame iza gola (pomiču se; na gol bljesnu u limeti). */
export function drawBoard(ctx: CanvasRenderingContext2D, sc: Scene, time: number, goalFlash: number) {
  const { cam } = sc;
  const a = proj(cam, -40, BOARD_H, BOARD_Z);
  const b = proj(cam, 40, 0, BOARD_Z);
  const top = a.y;
  const bh = b.y - a.y;
  const strip = goalFlash > 0 && Math.floor(time * 7) % 2 === 0 ? sc.boardGoal : sc.board;
  const sw = strip.sw;
  const off = -((time * 26) % sw);
  ctx.globalAlpha = 0.9;
  const srcH = strip.c.height;
  for (let x = off; x < sc.w; x += sw) ctx.drawImage(strip.c, 0, 0, sw * sc.dpr, srcH, x, top, sw, bh);
  ctx.globalAlpha = 1;
  // Odsjaj na travi ispod reklama
  const g = ctx.createLinearGradient(0, top + bh, 0, top + bh + bh * 0.9);
  g.addColorStop(0, goalFlash > 0 ? `rgba(${BRAND.accentRgb},0.22)` : "rgba(255,255,255,0.05)");
  g.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = g;
  ctx.fillRect(0, top + bh, sc.w, bh * 0.9);
  ctx.fillStyle = "rgba(0,0,0,0.55)";
  ctx.fillRect(0, top - 1, sc.w, 1.5);
}

/** Publika: na gol skače (dva sloja u protufazi). */
export function drawCrowd(ctx: CanvasRenderingContext2D, sc: Scene, time: number, cheer: number) {
  const amp = cheer * 3.2;
  const a = amp > 0.01 ? -Math.abs(Math.sin(time * 11)) * amp : 0;
  const b = amp > 0.01 ? -Math.abs(Math.sin(time * 11 + 1.6)) * amp : 0;
  ctx.drawImage(sc.crowdA, 0, a, sc.w, sc.h);
  ctx.drawImage(sc.crowdB, 0, b, sc.w, sc.h);
}

// ── Mreža ──────────────────────────────────────────────────────────────────
export type Ripple = { x: number; y: number; age: number; amp: number };

function netDisp(ripples: Ripple[], x: number, y: number, bulge: { x: number; y: number; d: number } | null) {
  let d = 0;
  for (const r of ripples) {
    const dist = Math.hypot(x - r.x, (y - r.y) * 1.2);
    const t = r.age;
    const wave = Math.cos(15 * t - dist * 5.5) * Math.exp(-3.4 * t) * Math.exp(-dist * dist * 0.55);
    d += r.amp * wave;
  }
  if (bulge) {
    const dist2 = (x - bulge.x) ** 2 + (y - bulge.y) ** 2;
    d += bulge.d * Math.exp(-dist2 * 2.2);
  }
  return d;
}

/** Stražnja + krovna mreža i bočne mreže, s valom kad lopta udari. */
export function drawNet(ctx: CanvasRenderingContext2D, cam: Cam, ripples: Ripple[], bulge: { x: number; y: number; d: number } | null) {
  const NU = 26;
  const NV = 13;
  const pts: { x: number; y: number }[] = new Array((NU + 1) * (NV + 1));
  // Profil: v 0..0.72 = stražnja kosina (dno → gornji stražnji rub), 0.72..1 = krov prema prečki.
  const profile = (v: number) => {
    if (v <= 0.72) {
      const k = v / 0.72;
      return { y: GOAL_H * k, z: NET_BACK_Z + (NET_TOP_Z - NET_BACK_Z) * k, ny: 0.35, nz: 1 };
    }
    const k = (v - 0.72) / 0.28;
    return { y: GOAL_H, z: NET_TOP_Z + (GOAL_Z - NET_TOP_Z) * k, ny: 1, nz: 0.2 };
  };
  for (let j = 0; j <= NV; j++) {
    const pr = profile(j / NV);
    for (let i = 0; i <= NU; i++) {
      const x = -HALF_W + (2 * HALF_W * i) / NU;
      // Rubovi su pričvršćeni (okvir), sredina se slobodno giba.
      const pin = Math.sin((Math.PI * i) / NU) * Math.min(1, Math.sin((Math.PI * Math.min(j, NV - 0.3)) / NV) * 1.6 + 0.15);
      const d = netDisp(ripples, x, pr.y, bulge) * pin;
      const p = proj(cam, x, pr.y + d * pr.ny * 0.25, pr.z + d * pr.nz);
      pts[j * (NU + 1) + i] = { x: p.x, y: p.y };
    }
  }
  // Tamna unutrašnjost gola (dubina)
  ctx.fillStyle = "rgba(2,4,8,0.38)";
  ctx.beginPath();
  for (let i = 0; i <= NU; i++) {
    const p = pts[i];
    if (i === 0) ctx.moveTo(p.x, p.y);
    else ctx.lineTo(p.x, p.y);
  }
  for (let j = 0; j <= NV; j++) ctx.lineTo(pts[j * (NU + 1) + NU].x, pts[j * (NU + 1) + NU].y);
  for (let i = NU; i >= 0; i--) ctx.lineTo(pts[NV * (NU + 1) + i].x, pts[NV * (NU + 1) + i].y);
  for (let j = NV; j >= 0; j--) ctx.lineTo(pts[j * (NU + 1)].x, pts[j * (NU + 1)].y);
  ctx.fill();

  // Bočne mreže
  for (const sx of [-HALF_W, HALF_W]) {
    ctx.fillStyle = "rgba(220,230,240,0.035)";
    ctx.beginPath();
    const a = proj(cam, sx, 0, GOAL_Z);
    const b = proj(cam, sx, GOAL_H, GOAL_Z);
    const c = proj(cam, sx, GOAL_H, NET_TOP_Z);
    const d = proj(cam, sx, 0, NET_BACK_Z);
    ctx.moveTo(a.x, a.y);
    ctx.lineTo(b.x, b.y);
    ctx.lineTo(c.x, c.y);
    ctx.lineTo(d.x, d.y);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = "rgba(225,232,240,0.26)";
    ctx.lineWidth = 0.7;
    ctx.beginPath();
    for (let k = 1; k < 6; k++) {
      const y = (GOAL_H * k) / 6;
      const p0 = proj(cam, sx, y, GOAL_Z);
      const p1 = proj(cam, sx, y, NET_BACK_Z + (NET_TOP_Z - NET_BACK_Z) * (y / GOAL_H));
      ctx.moveTo(p0.x, p0.y);
      ctx.lineTo(p1.x, p1.y);
    }
    for (let k = 1; k < 5; k++) {
      const f = k / 5;
      const p0 = proj(cam, sx, 0, GOAL_Z + (NET_BACK_Z - GOAL_Z) * f);
      const p1 = proj(cam, sx, GOAL_H, GOAL_Z + (NET_TOP_Z - GOAL_Z) * f);
      ctx.moveTo(p0.x, p0.y);
      ctx.lineTo(p1.x, p1.y);
    }
    ctx.stroke();
  }

  // Mreža (linije)
  ctx.strokeStyle = "rgba(232,238,245,0.36)";
  ctx.lineWidth = 0.75;
  ctx.beginPath();
  for (let i = 0; i <= NU; i++) {
    for (let j = 0; j <= NV; j++) {
      const p = pts[j * (NU + 1) + i];
      if (j === 0) ctx.moveTo(p.x, p.y);
      else ctx.lineTo(p.x, p.y);
    }
  }
  for (let j = 0; j <= NV; j++) {
    for (let i = 0; i <= NU; i++) {
      const p = pts[j * (NU + 1) + i];
      if (i === 0) ctx.moveTo(p.x, p.y);
      else ctx.lineTo(p.x, p.y);
    }
  }
  ctx.stroke();
}

/** Stražnji nosači gola (iza mreže) — tanke cijevi. */
export function drawGoalBack(ctx: CanvasRenderingContext2D, cam: Cam) {
  ctx.strokeStyle = "rgba(150,160,172,0.55)";
  ctx.lineWidth = 1.6;
  ctx.lineCap = "round";
  ctx.beginPath();
  for (const sx of [-HALF_W, HALF_W]) {
    const a = proj(cam, sx, GOAL_H, GOAL_Z);
    const b = proj(cam, sx, GOAL_H, NET_TOP_Z);
    const c = proj(cam, sx, 0, NET_BACK_Z);
    ctx.moveTo(a.x, a.y);
    ctx.lineTo(b.x, b.y);
    ctx.lineTo(c.x, c.y);
  }
  const l = proj(cam, -HALF_W, 0, NET_BACK_Z);
  const r = proj(cam, HALF_W, 0, NET_BACK_Z);
  ctx.moveTo(l.x, l.y);
  ctx.lineTo(r.x, r.y);
  ctx.stroke();
}

/** Prednji okvir: stative i prečka, s blagim treperenjem nakon udarca. */
export function drawFrame(ctx: CanvasRenderingContext2D, cam: Cam, vib: { left: number; right: number; bar: number }) {
  const s = proj(cam, 0, 0, GOAL_Z).s;
  const pw = Math.max(3, POST_R * 2 * s);
  const top = proj(cam, 0, GOAL_H + POST_R, GOAL_Z).y;
  const bot = proj(cam, 0, 0, GOAL_Z).y;
  const lx = proj(cam, -HALF_W, 0, GOAL_Z).x + vib.left;
  const rx = proj(cam, HALF_W, 0, GOAL_Z).x + vib.right;
  // Sjena iza okvira (dubina)
  ctx.fillStyle = "rgba(0,0,0,0.35)";
  ctx.fillRect(lx - pw / 2 + 1.5, top + 1.5 + vib.bar, rx - lx + pw, pw);
  const vert = (x: number) => {
    const g = ctx.createLinearGradient(x - pw / 2, 0, x + pw / 2, 0);
    g.addColorStop(0, "#8d96a1");
    g.addColorStop(0.35, "#ffffff");
    g.addColorStop(0.7, "#d9dee4");
    g.addColorStop(1, "#7a838e");
    ctx.fillStyle = g;
    ctx.fillRect(x - pw / 2, top + vib.bar * 0.5, pw, bot - top - vib.bar * 0.5);
  };
  vert(lx);
  vert(rx);
  const g = ctx.createLinearGradient(0, top + vib.bar, 0, top + pw + vib.bar);
  g.addColorStop(0, "#ffffff");
  g.addColorStop(0.55, "#e2e6eb");
  g.addColorStop(1, "#8a939e");
  ctx.fillStyle = g;
  ctx.fillRect(lx - pw / 2, top + vib.bar, rx - lx + pw, pw);
  // Spoj stative i trave
  ctx.fillStyle = "rgba(0,0,0,0.3)";
  ctx.beginPath();
  ctx.ellipse(lx, bot, pw * 1.2, pw * 0.35, 0, 0, Math.PI * 2);
  ctx.ellipse(rx, bot, pw * 1.2, pw * 0.35, 0, 0, Math.PI * 2);
  ctx.fill();
}

// ── Golman ─────────────────────────────────────────────────────────────────
export type Kit = {
  shirt: string;
  shirtDark: string;
  shirtHi: string;
  trim: string;
  /** Broj i natpis na dresu. */
  print: string;
  shorts: string;
  skin: string;
  skinDark: string;
  hair: string;
  glove: string;
  gloveDark: string;
  gloveTrim: string;
  sock: string;
  boot: string;
};

const DEFAULT_KIT: Kit = {
  shirt: "#e8ff3c",
  shirtDark: "#a9bb1f",
  shirtHi: "#f6ffa0",
  trim: "#0b0b0b",
  print: "#0b0b0b",
  shorts: "#101010",
  skin: "#c58a66",
  skinDark: "#8e5c40",
  hair: "#1f1612",
  glove: "#ffffff",
  gloveDark: "#9aa1a8",
  gloveTrim: BRAND.accent,
  sock: "#0f0f0f",
  boot: "#f2f2f2"
};

/** Boss: crni dres s limetom, limete rukavice. */
export const BOSS_KIT: Kit = {
  shirt: "#1d1f22",
  shirtDark: "#060707",
  shirtHi: "#3a3d42",
  trim: BRAND.accent,
  print: BRAND.accent,
  shorts: "#060606",
  skin: "#b07a58",
  skinDark: "#734a32",
  hair: "#0c0907",
  glove: "#f3ff9a",
  gloveDark: "#9fb21a",
  gloveTrim: "#0a0a0a",
  sock: "#0a0a0a",
  boot: "#0f0f0f"
};

/** Limeta sjaj oko bossa: tlo, tijelo i obris (jedan zamućen oblik). */
export function drawBossAura(ctx: CanvasRenderingContext2D, cam: Cam, pose: Pose, time: number, k = 1) {
  if (k <= 0.01) return;
  const s = cam.f / (KEEPER_Z - cam.z);
  const X = (x: number) => cam.cx + x * s;
  const Y = (y: number) => cam.hy - (y - cam.y) * s;
  const j = joints(pose);
  const pulse = 0.5 + 0.5 * Math.sin(time * 2.6);
  ctx.save();
  ctx.globalAlpha = k;
  // Sjaj na travi ispod nogu
  const gx = X(pose.x);
  const gy = Y(0);
  ctx.save();
  ctx.translate(gx, gy);
  ctx.scale(1, 0.2);
  let g = ctx.createRadialGradient(0, 0, 0, 0, 0, 1.1 * s);
  g.addColorStop(0, `rgba(${BRAND.accentRgb},${0.26 + pulse * 0.08})`);
  g.addColorStop(1, `rgba(${BRAND.accentRgb},0)`);
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(0, 0, 1.1 * s, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
  // Sjaj iza tijela
  const cx = X((j.neck.x + j.hip.x) / 2);
  const cy = Y((j.neck.y + j.hip.y) / 2);
  const r = 1.15 * s;
  g = ctx.createRadialGradient(cx, cy, r * 0.05, cx, cy, r);
  g.addColorStop(0, `rgba(${BRAND.accentRgb},${0.2 + pulse * 0.06})`);
  g.addColorStop(0.5, `rgba(${BRAND.accentRgb},0.06)`);
  g.addColorStop(1, `rgba(${BRAND.accentRgb},0)`);
  ctx.fillStyle = g;
  ctx.fillRect(cx - r, cy - r, r * 2, r * 2);
  // Obris: trup i glava, zamućeni (golman se crta preko)
  ctx.shadowColor = `rgba(${BRAND.accentRgb},${0.55 + pulse * 0.2})`;
  ctx.shadowBlur = Math.max(8, 0.32 * s);
  ctx.fillStyle = "#0b0b0b";
  ctx.beginPath();
  ctx.moveTo(X(j.hip.x - j.r.x * 0.2), Y(j.hip.y - j.r.y * 0.2));
  ctx.lineTo(X(j.hip.x + j.r.x * 0.2), Y(j.hip.y + j.r.y * 0.2));
  ctx.lineTo(X(j.shR.x + j.r.x * 0.06), Y(j.shR.y + j.r.y * 0.06));
  ctx.lineTo(X(j.shL.x - j.r.x * 0.06), Y(j.shL.y - j.r.y * 0.06));
  ctx.closePath();
  ctx.fill();
  ctx.beginPath();
  ctx.arc(X(j.head.x), Y(j.head.y), 0.12 * s, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

export function drawKeeper(ctx: CanvasRenderingContext2D, cam: Cam, pose: Pose, KIT: Kit = DEFAULT_KIT) {
  const s = cam.f / (KEEPER_Z - cam.z);
  const X = (x: number) => cam.cx + x * s;
  const Y = (y: number) => cam.hy - (y - cam.y) * s;
  const j = joints(pose);
  const P = (v: { x: number; y: number }) => [X(v.x), Y(v.y)] as const;

  // Sjena na travi
  const lowest = Math.min(j.ftL.y, j.ftR.y, j.hip.y);
  const air = clamp(lowest / 0.8, 0, 1);
  const g0 = proj(cam, pose.x, 0, KEEPER_Z);
  const spread = Math.abs(Math.sin(pose.tilt));
  softShadow(ctx, g0.x + Math.sin(pose.tilt) * 0.35 * s, g0.y, (0.45 + spread * 0.75) * s, 0.12 * s, 0.5 * (1 - air * 0.6));

  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  const limb = (a: { x: number; y: number }, b: { x: number; y: number }, wM: number, col: string, hi: string) => {
    const [ax, ay] = P(a);
    const [bx, by] = P(b);
    const w = Math.max(1.5, wM * s);
    ctx.strokeStyle = col;
    ctx.lineWidth = w;
    ctx.beginPath();
    ctx.moveTo(ax, ay);
    ctx.lineTo(bx, by);
    ctx.stroke();
    ctx.strokeStyle = hi;
    ctx.lineWidth = w * 0.42;
    ctx.beginPath();
    ctx.moveTo(ax - w * 0.18, ay - w * 0.15);
    ctx.lineTo(bx - w * 0.18, by - w * 0.15);
    ctx.stroke();
  };
  const mid = (a: { x: number; y: number }, b: { x: number; y: number }, t: number) => ({ x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t });

  // Noge: bedro (hlačice) → koljeno → potkoljenica (čarapa) → kopačka
  const hipR = { x: j.hip.x + j.r.x * 0.1, y: j.hip.y + j.r.y * 0.1 };
  const hipL = { x: j.hip.x - j.r.x * 0.1, y: j.hip.y - j.r.y * 0.1 };
  for (const [h, k, f] of [[hipL, j.knL, j.ftL], [hipR, j.knR, j.ftR]] as const) {
    limb(h, k, 0.15, KIT.skinDark, KIT.skin);
    limb(mid(k, f, 0.12), f, 0.115, KIT.sock, "#2a2a2a");
    limb(mid(k, f, 0.12), mid(k, f, 0.3), 0.12, KIT === DEFAULT_KIT ? KIT.shirt : BRAND.accent, KIT.shirtHi);
    const [fx, fy] = P(f);
    ctx.fillStyle = KIT.boot;
    ctx.beginPath();
    ctx.ellipse(fx, fy, 0.085 * s, 0.05 * s, Math.atan2(f.y - k.y, f.x - k.x) * -1 + Math.PI / 2, 0, Math.PI * 2);
    ctx.fill();
  }
  // Hlačice
  const sh0 = mid(hipL, j.knL, 0.42);
  const sh1 = mid(hipR, j.knR, 0.42);
  ctx.fillStyle = KIT.shorts;
  ctx.beginPath();
  const w0 = { x: j.hip.x - j.r.x * 0.2 + j.u.x * 0.06, y: j.hip.y - j.r.y * 0.2 + j.u.y * 0.06 };
  const w1 = { x: j.hip.x + j.r.x * 0.2 + j.u.x * 0.06, y: j.hip.y + j.r.y * 0.2 + j.u.y * 0.06 };
  ctx.moveTo(...P(w0));
  ctx.lineTo(...P(w1));
  ctx.lineTo(...P({ x: sh1.x + j.r.x * 0.09, y: sh1.y + j.r.y * 0.09 }));
  ctx.lineTo(...P({ x: sh1.x - j.r.x * 0.08, y: sh1.y - j.r.y * 0.08 }));
  ctx.lineTo(...P(mid(j.hip, { x: j.hip.x - j.u.x * 0.3, y: j.hip.y - j.u.y * 0.3 }, 0.5)));
  ctx.lineTo(...P({ x: sh0.x + j.r.x * 0.08, y: sh0.y + j.r.y * 0.08 }));
  ctx.lineTo(...P({ x: sh0.x - j.r.x * 0.09, y: sh0.y - j.r.y * 0.09 }));
  ctx.closePath();
  ctx.fill();
  ctx.lineWidth = Math.max(1, 0.05 * s);
  ctx.strokeStyle = KIT.shorts;
  ctx.stroke();

  // Trup (dres)
  const t0 = { x: j.hip.x - j.r.x * 0.18 + j.u.x * 0.04, y: j.hip.y - j.r.y * 0.18 + j.u.y * 0.04 };
  const t1 = { x: j.hip.x + j.r.x * 0.18 + j.u.x * 0.04, y: j.hip.y + j.r.y * 0.18 + j.u.y * 0.04 };
  const t2 = { x: j.shR.x + j.r.x * 0.05, y: j.shR.y + j.r.y * 0.05 };
  const t3 = { x: j.shL.x - j.r.x * 0.05, y: j.shL.y - j.r.y * 0.05 };
  const [cx, cy] = P(mid(j.hip, j.neck, 0.55));
  const grad = ctx.createLinearGradient(cx - 0.3 * s, cy - 0.3 * s, cx + 0.3 * s, cy + 0.3 * s);
  grad.addColorStop(0, KIT === DEFAULT_KIT ? "#f4ff8a" : KIT.shirtHi);
  grad.addColorStop(0.45, KIT.shirt);
  grad.addColorStop(1, KIT.shirtDark);
  ctx.fillStyle = grad;
  ctx.strokeStyle = grad;
  ctx.lineWidth = Math.max(1.5, 0.1 * s);
  ctx.beginPath();
  ctx.moveTo(...P(t0));
  ctx.lineTo(...P(t1));
  ctx.lineTo(...P(t2));
  ctx.lineTo(...P(t3));
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  // Crni bočni paneli + ovratnik
  ctx.strokeStyle = KIT.trim;
  ctx.lineWidth = Math.max(1, 0.045 * s);
  ctx.beginPath();
  ctx.moveTo(...P(mid(t0, t3, 0.1)));
  ctx.lineTo(...P(mid(t0, t3, 0.85)));
  ctx.moveTo(...P(mid(t1, t2, 0.1)));
  ctx.lineTo(...P(mid(t1, t2, 0.85)));
  ctx.stroke();
  ctx.lineWidth = Math.max(1, 0.05 * s);
  ctx.beginPath();
  const n0 = { x: j.neck.x - j.r.x * 0.07, y: j.neck.y - j.r.y * 0.07 };
  const n1 = { x: j.neck.x + j.r.x * 0.07, y: j.neck.y + j.r.y * 0.07 };
  const n2 = { x: j.neck.x - j.u.x * 0.08, y: j.neck.y - j.u.y * 0.08 };
  ctx.moveTo(...P(n0));
  ctx.lineTo(...P(n2));
  ctx.lineTo(...P(n1));
  ctx.stroke();
  // Natpis i broj
  ctx.save();
  const [chx, chy] = P(mid(j.hip, j.neck, 0.62));
  ctx.translate(chx, chy);
  ctx.rotate(pose.tilt);
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillStyle = KIT.print;
  ctx.font = brandFont("heading", Math.max(5, 0.2 * s));
  ctx.fillText("1", 0, 0.07 * s);
  ctx.font = brandFont("heading", Math.max(3.5, 0.075 * s));
  ctx.fillText("DRESIFY", 0, -0.11 * s);
  ctx.restore();

  // Ruke: rukav (dres) → podlaktica (crni rukav) → rukavica
  for (const [shd, el, hd] of [[j.shL, j.elL, j.hL], [j.shR, j.elR, j.hR]] as const) {
    limb(shd, el, 0.12, KIT.shirtDark, KIT.shirt === DEFAULT_KIT.shirt ? KIT.shirt : KIT.shirtHi);
    limb(el, hd, 0.1, KIT === DEFAULT_KIT ? KIT.trim : "#151515", "#2c2c2c");
    limb(mid(el, hd, 0.6), mid(el, hd, 0.72), 0.105, KIT === DEFAULT_KIT ? KIT.shirt : BRAND.accent, KIT.shirtHi);
  }
  // Glava
  const [hx, hy] = P(j.head);
  const hr = 0.115 * s;
  ctx.fillStyle = KIT.skinDark;
  ctx.beginPath();
  ctx.arc(...P(mid(j.neck, j.head, 0.35)), 0.06 * s, 0, Math.PI * 2);
  ctx.fill();
  const hg = ctx.createRadialGradient(hx - hr * 0.35, hy - hr * 0.35, hr * 0.1, hx, hy, hr);
  hg.addColorStop(0, "#e2a985");
  hg.addColorStop(1, KIT.skinDark);
  ctx.fillStyle = hg;
  ctx.beginPath();
  ctx.arc(hx, hy, hr, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = KIT.hair;
  ctx.beginPath();
  ctx.arc(hx, hy, hr * 1.04, Math.PI + pose.tilt - 0.25, Math.PI * 2 + pose.tilt + 0.25);
  ctx.fill();
  // Rukavice
  for (const hd of [j.hL, j.hR]) {
    const [gx, gy] = P(hd);
    const gr = Math.max(2.2, 0.105 * s);
    const gg = ctx.createRadialGradient(gx - gr * 0.3, gy - gr * 0.3, gr * 0.1, gx, gy, gr);
    gg.addColorStop(0, KIT.glove);
    gg.addColorStop(1, KIT.gloveDark);
    ctx.fillStyle = gg;
    ctx.beginPath();
    ctx.arc(gx, gy, gr, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = KIT.gloveTrim;
    ctx.lineWidth = Math.max(0.8, gr * 0.3);
    ctx.beginPath();
    ctx.arc(gx, gy, gr * 0.78, Math.PI * 0.2, Math.PI * 0.8);
    ctx.stroke();
  }
}

// ── Lopta ──────────────────────────────────────────────────────────────────
export type BallDraw = { x: number; y: number; z: number; rot: number; alpha: number; trail: { x: number; y: number; z: number }[]; glow: number };

/** Lopta se u daljini crta malo veća nego što bi bila — da se vidi na mobitelu. */
const ballScale = (z: number) => 1 + 0.75 * clamp(z / GOAL_Z, 0, 1.4);

export function drawBallShadow(ctx: CanvasRenderingContext2D, cam: Cam, b: BallDraw) {
  if (b.alpha <= 0) return;
  const g = proj(cam, b.x, 0, b.z);
  const r = BALL_R * g.s * ballScale(b.z);
  const hgt = Math.max(0, b.y - BALL_R);
  const k = 1 / (1 + hgt * 1.6);
  softShadow(ctx, g.x + hgt * 0.15 * g.s, g.y, r * (1.25 + hgt * 0.6), r * 0.42, 0.55 * k * b.alpha);
}

export function drawBall(ctx: CanvasRenderingContext2D, cam: Cam, b: BallDraw, img: HTMLImageElement | null) {
  if (b.alpha <= 0) return;
  const p = proj(cam, b.x, b.y, b.z);
  const r = Math.max(1.5, BALL_R * p.s * ballScale(b.z));
  // Trag: suženi "rep" (motion blur) od starijih točaka prema lopti; limeta za jake udarce.
  const n = b.trail.length;
  if (n > 0) {
    ctx.lineCap = "round";
    const col = b.glow > 0.5 ? BRAND.accentRgb : "255,255,255";
    let prev = proj(cam, b.trail[0].x, b.trail[0].y, b.trail[0].z);
    for (let i = 1; i <= n; i++) {
      const q = i < n ? proj(cam, b.trail[i].x, b.trail[i].y, b.trail[i].z) : p;
      const k = i / n;
      const rr = i < n ? BALL_R * q.s * ballScale(b.trail[i].z) : r;
      ctx.strokeStyle = `rgba(${col},${b.alpha * k * k * (b.glow > 0.5 ? 0.42 : 0.26)})`;
      ctx.lineWidth = Math.max(1, rr * 2 * (0.25 + 0.6 * k));
      ctx.beginPath();
      ctx.moveTo(prev.x, prev.y);
      ctx.lineTo(q.x, q.y);
      ctx.stroke();
      prev = q;
    }
  }
  ctx.globalAlpha = b.alpha;
  if (b.glow > 0) {
    const gg = ctx.createRadialGradient(p.x, p.y, r * 0.6, p.x, p.y, r * 2.6);
    gg.addColorStop(0, `rgba(${BRAND.accentRgb},${0.3 * b.glow})`);
    gg.addColorStop(1, `rgba(${BRAND.accentRgb},0)`);
    ctx.fillStyle = gg;
    ctx.beginPath();
    ctx.arc(p.x, p.y, r * 2.6, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.save();
  ctx.translate(p.x, p.y);
  ctx.beginPath();
  ctx.arc(0, 0, r, 0, Math.PI * 2);
  ctx.clip();
  ctx.rotate(b.rot);
  if (img) {
    ctx.drawImage(img, -r * 1.04, -r * 1.04, r * 2.08, r * 2.08);
  } else {
    ctx.fillStyle = "#f2f2f2";
    ctx.fillRect(-r, -r, r * 2, r * 2);
  }
  ctx.rotate(-b.rot);
  // Sfera: sjena prema dolje-desno + odsjaj gore-lijevo
  let g = ctx.createRadialGradient(-r * 0.3, -r * 0.35, r * 0.15, 0, 0, r * 1.05);
  g.addColorStop(0, "rgba(255,255,255,0.0)");
  g.addColorStop(0.62, "rgba(0,0,0,0.05)");
  g.addColorStop(1, "rgba(0,0,0,0.55)");
  ctx.fillStyle = g;
  ctx.fillRect(-r, -r, r * 2, r * 2);
  g = ctx.createRadialGradient(-r * 0.38, -r * 0.42, 0, -r * 0.38, -r * 0.42, r * 0.7);
  g.addColorStop(0, "rgba(255,255,255,0.45)");
  g.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = g;
  ctx.fillRect(-r, -r, r * 2, r * 2);
  ctx.restore();
  ctx.globalAlpha = 1;
}

// ── Igrači u zidu i branič (generički DRESIFY dres: crno + limeta) ─────────
export type PlayerDraw = {
  x: number;
  z: number;
  /** Skok (m). */
  jy: number;
  /** Nagib tijela (rad), + = prema +x. */
  lean: number;
  /** Faza koraka (rad) i koliko hoda (0..1). */
  step: number;
  moving: number;
  /** Trzaj nakon udarca loptom (0..1). */
  flinch: number;
  kind: "wall" | "defender";
  /** Branič: iskorak -1..1. */
  lunge: number;
  /** Varijacija (boja kože, kosa). */
  look: number;
  alpha: number;
  time: number;
};

const SKINS: [string, string, string][] = [
  ["#c58a66", "#8e5c40", "#e2a985"],
  ["#e1b292", "#a8785a", "#f2cdb1"],
  ["#8a5a3c", "#5a3823", "#a8714d"],
  ["#d29b74", "#9a6646", "#ebbb98"]
];
const HAIRS = ["#1f1612", "#3b2a1c", "#0e0b09", "#6b4a2e", "#151515"];

/** Igrač okrenut prema lopti. Crta se u metrima (y prema gore), pa skalira. */
export function drawPlayer(ctx: CanvasRenderingContext2D, cam: Cam, p: PlayerDraw) {
  if (p.alpha <= 0.01) return;
  const s = cam.f / Math.max(0.3, p.z - cam.z);
  const g0 = proj(cam, p.x, 0, p.z);
  const air = clamp(p.jy / 0.35, 0, 1);

  // Sjene: meka ispod stopala + dvije duge prema kameri (reflektori iza gola).
  ctx.save();
  ctx.globalAlpha = p.alpha;
  for (const dir of [-1, 1]) {
    const a = proj(cam, p.x - 0.16, 0, p.z);
    const b = proj(cam, p.x + 0.16, 0, p.z);
    const c = proj(cam, p.x + 0.12 + dir * 0.55, 0, p.z - 1.5);
    const d = proj(cam, p.x - 0.12 + dir * 0.55, 0, p.z - 1.5);
    ctx.fillStyle = `rgba(0,0,0,${0.09 * (1 - air * 0.6)})`;
    ctx.beginPath();
    ctx.moveTo(a.x, a.y);
    ctx.lineTo(b.x, b.y);
    ctx.lineTo(c.x, c.y);
    ctx.lineTo(d.x, d.y);
    ctx.closePath();
    ctx.fill();
  }
  ctx.restore();
  softShadow(ctx, g0.x, g0.y, (p.kind === "defender" ? 0.42 : 0.32) * s * (1 - air * 0.3), 0.075 * s, 0.5 * p.alpha * (1 - air * 0.55));

  const [skin, skinDark, skinHi] = SKINS[p.look % SKINS.length];
  const hair = HAIRS[(p.look * 3 + 1) % HAIRS.length];
  const A = BRAND.accent;
  const def = p.kind === "defender";
  const crouch = def ? 0.07 : 0;
  const HIP = 0.9 - crouch;
  const SH = 1.44 - crouch;
  const breathe = Math.sin(p.time * 2.2 + p.look) * 0.008;

  ctx.save();
  ctx.globalAlpha = p.alpha;
  ctx.translate(g0.x, g0.y - p.jy * s);
  ctx.scale(s, -s);
  ctx.rotate(-p.lean - p.lunge * 0.22);
  ctx.lineCap = "round";
  ctx.lineJoin = "round";

  const line = (x0: number, y0: number, x1: number, y1: number, w: number, col: string) => {
    ctx.strokeStyle = col;
    ctx.lineWidth = w;
    ctx.beginPath();
    ctx.moveTo(x0, y0);
    ctx.lineTo(x1, y1);
    ctx.stroke();
  };

  // ── Noge ──
  for (const side of [-1, 1] as const) {
    const ph = p.step + (side > 0 ? 0 : Math.PI);
    const lift = p.moving * Math.max(0, Math.sin(ph)) * 0.07 + air * 0.1;
    let fx = side * (def ? 0.2 : 0.12) + p.moving * Math.cos(ph) * 0.045;
    let fy = 0.03 + lift;
    // Branič: noga prema lopti se ispruži u stranu.
    if (def && Math.sign(p.lunge) === side) {
      fx += side * 0.55 * Math.abs(p.lunge);
      fy = 0.05 + 0.12 * Math.abs(p.lunge);
    }
    const hx = side * 0.095;
    const kx = (hx + fx) / 2 + side * (def ? 0.06 : 0.02);
    const ky = (HIP + fy) / 2 + 0.02 + air * 0.06;
    // Bedro (koža), potkoljenica (crna čarapa s tankim limeta rubom), kopačka.
    line(hx, HIP - 0.06, kx, ky, 0.145, skinDark);
    line(hx - side * 0.02, HIP - 0.06, kx - side * 0.02, ky, 0.05, skin);
    const sx0 = kx + (fx - kx) * 0.06;
    const sy0 = ky + (fy - ky) * 0.06;
    line(sx0, sy0, fx, fy + 0.04, 0.112, "#0d0d0d");
    ctx.lineCap = "butt";
    line(sx0, sy0 + 0.004, sx0 + (fx - sx0) * 0.08, sy0 + (fy - sy0) * 0.08, 0.114, A);
    ctx.lineCap = "round";
    // Kopačka: tamna s bijelim potplatom
    ctx.fillStyle = "#16171a";
    ctx.beginPath();
    ctx.ellipse(fx + side * 0.02, fy + 0.012, 0.074, 0.036, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#e9e9e9";
    ctx.fillRect(fx + side * 0.02 - 0.07, fy - 0.022, 0.14, 0.014);
  }

  // ── Hlačice ──
  ctx.fillStyle = "#0b0b0b";
  ctx.beginPath();
  ctx.moveTo(-0.17, HIP + 0.08);
  ctx.lineTo(0.17, HIP + 0.08);
  ctx.lineTo(0.215, HIP - 0.24);
  ctx.lineTo(0.025, HIP - 0.22);
  ctx.lineTo(0, HIP - 0.12);
  ctx.lineTo(-0.025, HIP - 0.22);
  ctx.lineTo(-0.215, HIP - 0.24);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = A;
  ctx.lineWidth = 0.022;
  ctx.beginPath();
  ctx.moveTo(-0.185, HIP + 0.04);
  ctx.lineTo(-0.208, HIP - 0.22);
  ctx.moveTo(0.185, HIP + 0.04);
  ctx.lineTo(0.208, HIP - 0.22);
  ctx.stroke();

  // ── Trup ──
  const sh = SH + breathe - p.flinch * 0.03;
  const grad = ctx.createLinearGradient(-0.26, sh, 0.22, HIP);
  grad.addColorStop(0, "#34373c");
  grad.addColorStop(0.4, "#16181b");
  grad.addColorStop(1, "#050505");
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.moveTo(-0.165, HIP + 0.04);
  ctx.lineTo(0.165, HIP + 0.04);
  ctx.lineTo(0.2, sh - 0.12);
  ctx.quadraticCurveTo(0.235, sh - 0.01, 0.17, sh + 0.02);
  ctx.lineTo(-0.17, sh + 0.02);
  ctx.quadraticCurveTo(-0.235, sh - 0.01, -0.2, sh - 0.12);
  ctx.closePath();
  ctx.fill();
  // Bočni paneli i ovratnik (limeta)
  ctx.strokeStyle = A;
  ctx.lineWidth = 0.022;
  ctx.beginPath();
  ctx.moveTo(-0.19, sh - 0.1);
  ctx.lineTo(-0.155, HIP + 0.06);
  ctx.moveTo(0.19, sh - 0.1);
  ctx.lineTo(0.155, HIP + 0.06);
  ctx.stroke();
  ctx.lineWidth = 0.028;
  ctx.beginPath();
  ctx.moveTo(-0.065, sh + 0.015);
  ctx.lineTo(0, sh - 0.075);
  ctx.lineTo(0.065, sh + 0.015);
  ctx.stroke();
  // Mali znak na prsima
  ctx.fillStyle = A;
  ctx.fillRect(0.06, sh - 0.17, 0.05, 0.05);

  // ── Ruke ──
  const shY = sh - 0.03;
  const arm = (side: -1 | 1) => {
    const sx = side * 0.205;
    let ex: number, ey: number, hx: number, hy: number;
    if (def) {
      const open = 1 - Math.abs(p.lunge) * 0.3;
      ex = side * (0.36 + 0.06 * open);
      ey = shY - 0.2;
      hx = side * (0.5 + 0.08 * open);
      hy = shY - 0.36 + Math.sin(p.time * 3 + side) * 0.015;
    } else {
      // Zid: ruke prekrižene ispred tijela.
      ex = side * 0.215;
      ey = shY - 0.3;
      hx = -side * 0.035;
      hy = HIP + 0.01 + p.flinch * 0.06;
    }
    line(sx, shY, ex, ey, 0.095, skinDark);
    line(sx, shY, sx + (ex - sx) * 0.58, shY + (ey - shY) * 0.58, 0.122, "#17191c");
    ctx.lineCap = "butt";
    line(sx + (ex - sx) * 0.52, shY + (ey - shY) * 0.52, sx + (ex - sx) * 0.6, shY + (ey - shY) * 0.6, 0.124, A);
    ctx.lineCap = "round";
    line(ex, ey, hx, hy, 0.085, skinDark);
    line(ex - 0.01, ey + 0.01, hx - 0.01, hy + 0.01, 0.035, skin);
    ctx.fillStyle = skin;
    ctx.beginPath();
    ctx.arc(hx, hy, 0.048, 0, Math.PI * 2);
    ctx.fill();
  };
  arm(-1);
  arm(1);

  // ── Vrat i glava ──
  const hy = sh + 0.205 - p.flinch * 0.02;
  const hx = p.flinch * 0.03;
  line(0, sh - 0.01, hx * 0.5, sh + 0.08, 0.085, skinDark);
  const hg = ctx.createRadialGradient(hx - 0.04, hy + 0.04, 0.01, hx, hy, 0.12);
  hg.addColorStop(0, skinHi);
  hg.addColorStop(1, skinDark);
  ctx.fillStyle = hg;
  ctx.beginPath();
  ctx.arc(hx, hy, 0.112, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = hair;
  ctx.beginPath();
  ctx.arc(hx, hy + 0.005, 0.117, 0.12, Math.PI - 0.12);
  ctx.fill();
  // Rub svjetla na ramenima (reflektori)
  ctx.strokeStyle = "rgba(255,255,255,0.14)";
  ctx.lineWidth = 0.02;
  ctx.beginPath();
  ctx.moveTo(-0.2, sh - 0.1);
  ctx.quadraticCurveTo(-0.22, sh, -0.16, sh + 0.02);
  ctx.stroke();
  ctx.restore();
}

// ── Mete ──────────────────────────────────────────────────────────────────
/** Meta (prsten) u ravnini gola. `hit` 0..1 = bljesak nakon pogotka. */
export function drawRing(ctx: CanvasRenderingContext2D, cam: Cam, x: number, y: number, r: number, time: number, alpha: number, hit = 0) {
  if (alpha <= 0.01) return;
  const p = proj(cam, x, y, GOAL_Z - 0.04);
  const R = r * p.s;
  const pulse = 0.5 + 0.5 * Math.sin(time * 3.2 + x);
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.fillStyle = `rgba(${BRAND.accentRgb},${0.05 + pulse * 0.03 + hit * 0.25})`;
  ctx.beginPath();
  ctx.arc(p.x, p.y, R * 0.94, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = `rgba(${BRAND.accentRgb},${0.08 + pulse * 0.05})`;
  ctx.lineWidth = R * 0.34;
  ctx.beginPath();
  ctx.arc(p.x, p.y, R, 0, Math.PI * 2);
  ctx.stroke();
  ctx.strokeStyle = `rgba(${BRAND.accentRgb},0.22)`;
  ctx.lineWidth = R * 0.15;
  ctx.stroke();
  ctx.strokeStyle = hit > 0 ? "#ffffff" : BRAND.accent;
  ctx.lineWidth = Math.max(1.6, R * 0.06);
  ctx.stroke();
  // Četiri kratka luka koji kruže
  ctx.strokeStyle = "rgba(255,255,255,0.55)";
  ctx.lineWidth = Math.max(1, R * 0.035);
  const rot = time * 1.4;
  for (let i = 0; i < 4; i++) {
    const a = rot + (i * Math.PI) / 2;
    ctx.beginPath();
    ctx.arc(p.x, p.y, R * 1.2, a, a + 0.42);
    ctx.stroke();
  }
  ctx.restore();
}

// ── Vjetar ────────────────────────────────────────────────────────────────
/** Mala oznaka vjetra iznad gola: strelica + jačina. */
export function drawWind(ctx: CanvasRenderingContext2D, cx: number, cy: number, wind: number, time: number, alpha: number) {
  if (alpha <= 0.01 || !wind) return;
  const dir = Math.sign(wind);
  const mag = Math.abs(wind);
  const label = `${mag.toFixed(1).replace(".", ",")} m/s`;
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.font = brandFont("body", 11, 700);
  const tw = ctx.measureText(label).width;
  const aw = 22 + mag * 7;
  const w = 16 + 46 + aw + 10 + tw + 14;
  const h = 26;
  const x = cx - w / 2;
  const y = cy - h / 2;
  ctx.fillStyle = "rgba(0,0,0,0.55)";
  ctx.beginPath();
  ctx.roundRect?.(x, y, w, h, 13);
  ctx.fill();
  ctx.strokeStyle = "rgba(255,255,255,0.1)";
  ctx.lineWidth = 1;
  ctx.stroke();
  ctx.textBaseline = "middle";
  ctx.textAlign = "left";
  ctx.font = brandFont("body", 9, 700);
  ctx.fillStyle = "rgba(255,255,255,0.5)";
  ctx.fillText("VJETAR", x + 14, cy + 0.5);
  // Strelica s "chevronima" koji teku u smjeru vjetra
  const ax0 = x + 16 + 46;
  const ax1 = ax0 + aw;
  const l = dir > 0 ? ax0 : ax1;
  const r = dir > 0 ? ax1 : ax0;
  ctx.strokeStyle = `rgba(${BRAND.accentRgb},0.35)`;
  ctx.lineWidth = 2;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(l, cy);
  ctx.lineTo(r, cy);
  ctx.stroke();
  ctx.strokeStyle = BRAND.accent;
  ctx.beginPath();
  ctx.moveTo(r - dir * 6, cy - 5);
  ctx.lineTo(r, cy);
  ctx.lineTo(r - dir * 6, cy + 5);
  ctx.stroke();
  const n = 2;
  for (let i = 0; i < n; i++) {
    const t = (time * (0.6 + mag * 0.12) + i / n) % 1;
    const px = l + (r - l) * t;
    ctx.globalAlpha = alpha * Math.sin(t * Math.PI) * 0.9;
    ctx.beginPath();
    ctx.moveTo(px - dir * 3, cy - 3);
    ctx.lineTo(px, cy);
    ctx.lineTo(px - dir * 3, cy + 3);
    ctx.stroke();
  }
  ctx.globalAlpha = alpha;
  ctx.font = brandFont("body", 11, 700);
  ctx.fillStyle = "rgba(255,255,255,0.88)";
  ctx.fillText(label, ax1 + 10, cy + 0.5);
  ctx.restore();
}
