"use client";

import { AnimatePresence, motion } from "framer-motion";
import { Check, Copy, RotateCw, ShoppingBag } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";

import { PROMO_STORAGE_KEY } from "@/components/site/promo-capture";
import { BRAND, brandFont, clamp, createParticles, createShake, damp, ensureBrandFonts } from "@/components/game/v2/draw";
import { GameStage, MuteButton, PrimaryButton, useCanvas, useGameLoop } from "@/components/game/v2/game-shell";
import { haptic, sfx, unlockAudio } from "@/components/game/v2/sfx";

// Kolo sreće. Ishod bira SERVER (lib/kolo.ts) — ovdje samo animiramo kolo do
// polja koje nam server javi, pa preglednik ne može namjestiti dobitak.
//
// Crtanje: canvas. Disk s poljima, rub sa žaruljicama i glavčina su
// unaprijed nacrtani u zasebne (offscreen) canvase — svaki frejm se samo
// zarotira jedna slika, pa je glatko i na starijem iPhoneu.
//
// Fizika: kolo se odmah zavrti na dodir (mali zamah unatrag pa ubrzanje),
// a kad stigne odgovor servera, usporava krivuljom (ease-out na 4. potenciju)
// točno do dobivenog polja. Jezičac na vrhu je opruga: svaki klin na rubu ga
// odgurne, a kad klin prođe, jezičac se odbije natrag (klik).

type Segment = {
  id: string;
  /** Gornji (veći) i donji (manji) red natpisa na polju. */
  top: string;
  bottom: string;
  /** Koji red je naglašen (font-heading, veći). */
  big: "top" | "bottom";
  fill: [string, string];
  ink: string;
  sub: string;
};

// Redoslijed mora odgovarati PRIZES u lib/kolo.ts (isti indeksi).
const SEGMENTS: Segment[] = [
  { id: "none", top: "NEMA", bottom: "DOBITKA", big: "top", fill: ["#0c0c0c", "#191919"], ink: "rgba(255,255,255,0.78)", sub: "rgba(255,255,255,0.42)" },
  { id: "p5", top: "5%", bottom: "POPUSTA", big: "top", fill: ["#1b1b1e", "#323236"], ink: "#ffffff", sub: "rgba(255,255,255,0.55)" },
  { id: "respin", top: "+1", bottom: "VRTNJA", big: "top", fill: ["#10120a", "#262a12"], ink: BRAND.accent, sub: "rgba(232,255,60,0.6)" },
  { id: "p10", top: "10%", bottom: "POPUSTA", big: "top", fill: ["#1b1b1e", "#323236"], ink: "#ffffff", sub: "rgba(255,255,255,0.55)" },
  { id: "freeship", top: "0 €", bottom: "DOSTAVA", big: "top", fill: ["#26262a", "#45454b"], ink: "#ffffff", sub: "rgba(255,255,255,0.6)" },
  { id: "p20", top: "20%", bottom: "POPUSTA", big: "top", fill: ["#8d8d90", "#ececee"], ink: "#0a0a0a", sub: "rgba(10,10,10,0.6)" },
  { id: "dres", top: "GRATIS", bottom: "DRES", big: "bottom", fill: ["#9db400", "#efff6a"], ink: "#0a0a0a", sub: "rgba(10,10,10,0.7)" }
];

const N = SEGMENTS.length;
const SEG = 360 / N; // stupnjeva po polju
const BULBS = 24;
const DEG = Math.PI / 180;

// Brzina vrtnje i trajanje usporavanja.
const V_MAX = 900; // °/s
const ACCEL_S = 0.85;
const WIND_S = 0.2;
const WIND_DEG = 9;
const MIN_DECEL_S = 4.1; // usporavanje traje 4.1–6.1 s ovisno o polju

// Geometrija (udio polumjera vanjskog ruba R).
const FACE = 0.885;
const PEG_R = 0.858;
const BULB_R = 0.9425;
const HUB = 0.2;
const TIP_R = 0.815; // vrh jezičca
const PIVOT_R = 1.115; // os jezičca iznad kola

type Result = { prize: string; label: string; code: string | null; left: number };
type Phase = "idle" | "spinning" | "done";

type Wheel = {
  mode: "idle" | "wind" | "accel" | "cruise" | "decel" | "settle" | "stop";
  t: number;
  angle: number;
  vel: number;
  a0: number;
  D: number;
  T: number;
  /** Polje na kojem treba stati (null = greška, samo uspori). */
  target: number | null;
  /** Kut na kojem je kolo mirovalo prije vrtnje (greška = vrati se tamo). */
  rest: number;
  /** Početna brzina za "settle" (°/s). */
  v0: number;
  pending: { idx: number | null } | null;
  // Jezičac
  p: number;
  pv: number;
  contact: boolean;
  // Žaruljice
  chase: number;
  flashT: number;
  outcome: "none" | "win" | "respin" | null;
  /** Kad je kolo stalo (za pulsiranje dobitnog polja). */
  stopT: number;
};

function plural(n: number, one: string, few: string, many: string) {
  const m10 = n % 10;
  const m100 = n % 100;
  if (m10 === 1 && m100 !== 11) return one;
  if (m10 >= 2 && m10 <= 4 && (m100 < 12 || m100 > 14)) return few;
  return many;
}

function mod(a: number, n: number) {
  return ((a % n) + n) % n;
}

// ── Offscreen slojevi ──────────────────────────────────────────────────────
function makeCanvas(px: number) {
  const c = document.createElement("canvas");
  c.width = c.height = Math.max(2, Math.ceil(px));
  return c;
}

function setSpacing(ctx: CanvasRenderingContext2D, px: number) {
  const c = ctx as CanvasRenderingContext2D & { letterSpacing?: string };
  if ("letterSpacing" in c) c.letterSpacing = `${px}px`;
}

/** Rotirajući disk: polja, pregrade, klinovi, natpisi. */
function buildDisc(R: number, dpr: number) {
  const S = 2 * R * dpr;
  const cv = makeCanvas(S);
  const ctx = cv.getContext("2d")!;
  ctx.scale(cv.width / (2 * R), cv.width / (2 * R));
  ctx.translate(R, R);
  const F = R * FACE;
  const k = R / 165;

  for (let i = 0; i < N; i++) {
    const s = SEGMENTS[i];
    const a0 = (-90 + i * SEG - SEG / 2) * DEG;
    const a1 = (-90 + i * SEG + SEG / 2) * DEG;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.arc(0, 0, F, a0, a1);
    ctx.closePath();
    const g = ctx.createRadialGradient(0, 0, R * HUB, 0, 0, F);
    g.addColorStop(0, s.fill[0]);
    g.addColorStop(1, s.fill[1]);
    ctx.fillStyle = g;
    ctx.fill();

    // Svjetlo preko polja (lijevi rub malo svjetliji) — daje volumen.
    const lg = ctx.createLinearGradient(
      Math.cos(a0) * F * 0.6, Math.sin(a0) * F * 0.6,
      Math.cos(a1) * F * 0.6, Math.sin(a1) * F * 0.6
    );
    lg.addColorStop(0, "rgba(255,255,255,0.07)");
    lg.addColorStop(0.5, "rgba(255,255,255,0)");
    lg.addColorStop(1, "rgba(0,0,0,0.12)");
    ctx.fillStyle = lg;
    ctx.fill();
  }

  // Unutarnja sjena uz rub (dubina ispod metalnog prstena).
  const inner = ctx.createRadialGradient(0, 0, F * 0.78, 0, 0, F);
  inner.addColorStop(0, "rgba(0,0,0,0)");
  inner.addColorStop(1, "rgba(0,0,0,0.42)");
  ctx.beginPath();
  ctx.arc(0, 0, F, 0, Math.PI * 2);
  ctx.fillStyle = inner;
  ctx.fill();

  // Ukrasni prsten oko glavčine.
  ctx.beginPath();
  ctx.arc(0, 0, R * 0.33, 0, Math.PI * 2);
  ctx.strokeStyle = "rgba(255,255,255,0.06)";
  ctx.lineWidth = 1;
  ctx.stroke();

  // Pregrade (tamna + svijetla linija = urezani rub).
  for (let i = 0; i < N; i++) {
    const a = (-90 + i * SEG - SEG / 2) * DEG;
    const cx = Math.cos(a), cy = Math.sin(a);
    const nx = -cy, ny = cx;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(cx * R * HUB, cy * R * HUB);
    ctx.lineTo(cx * F, cy * F);
    ctx.strokeStyle = "rgba(0,0,0,0.55)";
    ctx.lineWidth = 2.2 * k;
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(cx * R * HUB + nx * 1.1 * k, cy * R * HUB + ny * 1.1 * k);
    ctx.lineTo(cx * F + nx * 1.1 * k, cy * F + ny * 1.1 * k);
    ctx.strokeStyle = "rgba(255,255,255,0.13)";
    ctx.lineWidth = 0.9 * k;
    ctx.stroke();
  }

  // Natpisi — uspravni kad je polje na vrhu.
  for (let i = 0; i < N; i++) {
    const s = SEGMENTS[i];
    ctx.save();
    ctx.rotate(i * SEG * DEG);
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    const bigPx = (s.top.length > 4 || s.bottom.length > 4 ? 30 : 40) * k;
    const smallPx = 10.5 * k;
    const drawBig = (text: string, y: number, px: number) => {
      ctx.font = brandFont("heading", px);
      setSpacing(ctx, 0.5 * k);
      ctx.fillStyle = s.ink;
      // Diskretna sjena da tekst "sjedi" na polju.
      ctx.shadowColor = s.ink === "#0a0a0a" ? "rgba(255,255,255,0.3)" : "rgba(0,0,0,0.5)";
      ctx.shadowOffsetY = 1 * k;
      ctx.fillText(text, 0, y);
      ctx.shadowColor = "transparent";
      ctx.shadowOffsetY = 0;
    };
    const drawSmall = (text: string, y: number) => {
      ctx.font = brandFont("body", smallPx, 800);
      setSpacing(ctx, 1.6 * k);
      ctx.fillStyle = s.sub;
      ctx.fillText(text, 0, y);
    };
    if (s.big === "top") {
      const yBig = -R * 0.665;
      drawBig(s.top, yBig, bigPx);
      drawSmall(s.bottom, yBig + bigPx * 0.5 + 12 * k);
    } else {
      const px = 44 * k;
      const ySmall = -R * 0.75;
      drawSmall(s.top, ySmall);
      drawBig(s.bottom, ySmall + 8 * k + px * 0.48, px);
    }
    ctx.restore();
  }
  setSpacing(ctx, 0);

  // Klinovi na granicama polja.
  for (let i = 0; i < N; i++) {
    const a = (-90 + i * SEG - SEG / 2) * DEG;
    const x = Math.cos(a) * R * PEG_R;
    const y = Math.sin(a) * R * PEG_R;
    const pr = R * 0.027;
    ctx.beginPath();
    ctx.arc(x + 0.8 * k, y + 1.6 * k, pr, 0, Math.PI * 2);
    ctx.fillStyle = "rgba(0,0,0,0.55)";
    ctx.fill();
    const pg = ctx.createRadialGradient(x - pr * 0.4, y - pr * 0.45, pr * 0.1, x, y, pr);
    pg.addColorStop(0, "#ffffff");
    pg.addColorStop(0.45, "#c9c9cc");
    pg.addColorStop(1, "#4a4a4f");
    ctx.beginPath();
    ctx.arc(x, y, pr, 0, Math.PI * 2);
    ctx.fillStyle = pg;
    ctx.fill();
  }
  return cv;
}

/** Rotacijski zamućen disk (prosjek više zakrenutih kopija) za veliku brzinu. */
function buildBlur(disc: HTMLCanvasElement, spreadDeg: number, copies = 14) {
  const cv = makeCanvas(disc.width);
  const ctx = cv.getContext("2d")!;
  const c = disc.width / 2;
  for (let j = 0; j < copies; j++) {
    ctx.save();
    ctx.globalAlpha = 1 / (j + 1); // tekući prosjek: svaka kopija jednako teži
    ctx.translate(c, c);
    ctx.rotate(((j / (copies - 1)) - 0.5) * spreadDeg * DEG);
    ctx.drawImage(disc, -c, -c);
    ctx.restore();
  }
  return cv;
}

/** Statični prednji sloj: sjaj preko diska, metalni rub, glavčina s logom. */
function buildFront(R: number, dpr: number) {
  const pad = 1.04;
  const S = 2 * R * pad * dpr;
  const cv = makeCanvas(S);
  const ctx = cv.getContext("2d")!;
  ctx.scale(cv.width / (2 * R * pad), cv.width / (2 * R * pad));
  ctx.translate(R * pad, R * pad);
  const F = R * FACE;
  const k = R / 165;

  // Sjaj (fiksno svjetlo gore lijevo — disk se vrti ispod njega).
  ctx.save();
  ctx.beginPath();
  ctx.arc(0, 0, F, 0, Math.PI * 2);
  ctx.clip();
  const gl = ctx.createRadialGradient(-F * 0.45, -F * 0.6, 0, -F * 0.45, -F * 0.6, F * 1.25);
  gl.addColorStop(0, "rgba(255,255,255,0.13)");
  gl.addColorStop(0.45, "rgba(255,255,255,0.03)");
  gl.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = gl;
  ctx.fillRect(-F, -F, F * 2, F * 2);
  const vg = ctx.createLinearGradient(0, -F, 0, F);
  vg.addColorStop(0.55, "rgba(0,0,0,0)");
  vg.addColorStop(1, "rgba(0,0,0,0.28)");
  ctx.fillStyle = vg;
  ctx.fillRect(-F, -F, F * 2, F * 2);
  ctx.restore();

  // Metalni prsten.
  ctx.beginPath();
  ctx.arc(0, 0, R, 0, Math.PI * 2);
  ctx.arc(0, 0, F, 0, Math.PI * 2, true);
  const rim = ctx.createLinearGradient(-R, -R, R, R);
  rim.addColorStop(0, "#6a6a70");
  rim.addColorStop(0.28, "#2c2c31");
  rim.addColorStop(0.5, "#45454b");
  rim.addColorStop(0.75, "#1a1a1d");
  rim.addColorStop(1, "#38383d");
  ctx.fillStyle = rim;
  ctx.fill();
  // Brušeni sjaj na prstenu.
  const rimHi = ctx.createLinearGradient(0, -R, 0, R);
  rimHi.addColorStop(0, "rgba(255,255,255,0.22)");
  rimHi.addColorStop(0.35, "rgba(255,255,255,0)");
  rimHi.addColorStop(0.8, "rgba(0,0,0,0)");
  rimHi.addColorStop(1, "rgba(0,0,0,0.35)");
  ctx.fillStyle = rimHi;
  ctx.fill();
  // Rubovi prstena: vanjski svijetli, unutarnji accent.
  ctx.beginPath();
  ctx.arc(0, 0, R - 0.6 * k, 0, Math.PI * 2);
  ctx.strokeStyle = "rgba(255,255,255,0.28)";
  ctx.lineWidth = 1.1 * k;
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(0, 0, F + 0.6 * k, 0, Math.PI * 2);
  ctx.strokeStyle = "rgba(0,0,0,0.8)";
  ctx.lineWidth = 2.4 * k;
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(0, 0, F + 1.9 * k, 0, Math.PI * 2);
  ctx.strokeStyle = "rgba(232,255,60,0.55)";
  ctx.lineWidth = 1 * k;
  ctx.stroke();

  // Ležišta žaruljica.
  for (let i = 0; i < BULBS; i++) {
    const a = (i / BULBS) * Math.PI * 2 - Math.PI / 2 + Math.PI / BULBS;
    const x = Math.cos(a) * R * BULB_R;
    const y = Math.sin(a) * R * BULB_R;
    ctx.beginPath();
    ctx.arc(x, y, R * 0.031, 0, Math.PI * 2);
    ctx.fillStyle = "rgba(0,0,0,0.55)";
    ctx.fill();
    ctx.beginPath();
    ctx.arc(x, y, R * 0.031, Math.PI * 0.15, Math.PI * 0.85);
    ctx.strokeStyle = "rgba(255,255,255,0.14)";
    ctx.lineWidth = 0.8 * k;
    ctx.stroke();
  }

  // Glavčina.
  const H = R * HUB;
  ctx.save();
  ctx.shadowColor = "rgba(0,0,0,0.6)";
  ctx.shadowBlur = 14 * k;
  ctx.shadowOffsetY = 4 * k;
  ctx.beginPath();
  ctx.arc(0, 0, H, 0, Math.PI * 2);
  const hb = ctx.createLinearGradient(-H, -H, H, H);
  hb.addColorStop(0, "#5c5c62");
  hb.addColorStop(0.5, "#202024");
  hb.addColorStop(1, "#3a3a40");
  ctx.fillStyle = hb;
  ctx.fill();
  ctx.restore();
  ctx.beginPath();
  ctx.arc(0, 0, H * 0.86, 0, Math.PI * 2);
  const hf = ctx.createRadialGradient(-H * 0.3, -H * 0.4, 0, 0, 0, H);
  hf.addColorStop(0, "#1f1f22");
  hf.addColorStop(1, "#0b0b0c");
  ctx.fillStyle = hf;
  ctx.fill();
  ctx.strokeStyle = "rgba(232,255,60,0.5)";
  ctx.lineWidth = 1 * k;
  ctx.stroke();
  // Logo DRES + IFY
  ctx.textBaseline = "middle";
  ctx.font = brandFont("heading", 17 * k);
  setSpacing(ctx, 0.6 * k);
  const w1 = ctx.measureText("DRES").width;
  const w2 = ctx.measureText("IFY").width;
  const x0 = -(w1 + w2) / 2;
  ctx.textAlign = "left";
  ctx.fillStyle = "#ffffff";
  ctx.fillText("DRES", x0, 1 * k);
  ctx.fillStyle = BRAND.accent;
  ctx.fillText("IFY", x0 + w1, 1 * k);
  setSpacing(ctx, 0);
  // Odsjaj na glavčini.
  ctx.beginPath();
  ctx.ellipse(-H * 0.18, -H * 0.5, H * 0.5, H * 0.2, -0.35, 0, Math.PI * 2);
  ctx.fillStyle = "rgba(255,255,255,0.06)";
  ctx.fill();

  return { cv, pad };
}

/** Žaruljica: ugašena i upaljena verzija + sjaj (crtaju se preko, s alfom). */
function buildBulbSprites(r: number, dpr: number) {
  const size = r * 2;
  const mk = (on: boolean) => {
    const cv = makeCanvas(size * dpr);
    const ctx = cv.getContext("2d")!;
    ctx.scale(dpr, dpr);
    const g = ctx.createRadialGradient(r * 0.75, r * 0.7, r * 0.05, r, r, r);
    if (on) {
      g.addColorStop(0, "#ffffff");
      g.addColorStop(0.45, "#fffbe3");
      g.addColorStop(1, "#e9d98f");
    } else {
      g.addColorStop(0, "#77746a");
      g.addColorStop(0.5, "#3a3933");
      g.addColorStop(1, "#1e1d1a");
    }
    ctx.beginPath();
    ctx.arc(r, r, r * 0.98, 0, Math.PI * 2);
    ctx.fillStyle = g;
    ctx.fill();
    return cv;
  };
  const glowR = r * 4.2;
  const glow = makeCanvas(glowR * 2 * dpr);
  const gctx = glow.getContext("2d")!;
  gctx.scale(dpr, dpr);
  const gg = gctx.createRadialGradient(glowR, glowR, 0, glowR, glowR, glowR);
  gg.addColorStop(0, "rgba(255,246,200,0.75)");
  gg.addColorStop(0.25, "rgba(255,240,170,0.28)");
  gg.addColorStop(1, "rgba(255,240,170,0)");
  gctx.fillStyle = gg;
  gctx.fillRect(0, 0, glowR * 2, glowR * 2);
  return { off: mk(false), on: mk(true), glow, r, glowR };
}

// ── Komponenta ─────────────────────────────────────────────────────────────
export function WheelGame() {
  const router = useRouter();
  const [phone, setPhone] = useState("");
  const [phase, setPhase] = useState<Phase>("idle");
  const [result, setResult] = useState<Result | null>(null);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);

  const { canvasRef, view } = useCanvas();
  const panelRef = useRef<HTMLDivElement | null>(null);
  const panelH = useRef(180);
  const layout = useRef({ cx: 0, cy: 0, R: 0, ready: false });
  const fontsReady = useRef(false);
  const caches = useRef<{
    R: number;
    dpr: number;
    fonts: boolean;
    disc: HTMLCanvasElement;
    blur: HTMLCanvasElement;
    front: { cv: HTMLCanvasElement; pad: number };
    bulb: ReturnType<typeof buildBulbSprites>;
  } | null>(null);
  const fx = useRef(createParticles(220));
  const shake = useRef(createShake(7, 0.008));
  const finish = useRef<(() => void) | null>(null);
  const stageRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  /** Zaštita od dvostrukog dodira (dva zahtjeva = dvije potrošene vrtnje). */
  const busy = useRef(false);
  const timers = useRef<number[]>([]);

  useEffect(() => () => timers.current.forEach((t) => window.clearTimeout(t)), []);

  const wheel = useRef<Wheel>({
    mode: "idle", t: 0, angle: 0, vel: 0, a0: 0, D: 0, T: 1, target: null, rest: 0, v0: 0, pending: null,
    p: 0, pv: 0, contact: false, chase: 0, flashT: 0, outcome: null, stopT: 0
  });

  useEffect(() => {
    let alive = true;
    ensureBrandFonts().then(() => {
      if (!alive) return;
      fontsReady.current = true;
      caches.current = null; // ponovno nacrtaj natpise pravim fontom
    });
    return () => {
      alive = false;
    };
  }, []);

  // Visina donjeg panela određuje koliko mjesta ostaje za kolo.
  useEffect(() => {
    const el = panelRef.current;
    if (!el) return;
    const read = () => {
      const h = el.getBoundingClientRect().height;
      // Dok se sadržaj panela mijenja (izlaz → ulaz), visina na trenutak padne
      // na ~0 — to ignoriramo da kolo ne "skoči".
      if (h > 60) panelH.current = h;
    };
    read();
    const ro = typeof ResizeObserver !== "undefined" ? new ResizeObserver(read) : null;
    ro?.observe(el);
    return () => ro?.disconnect();
  }, []);

  // ── Fizika ──
  const step = useCallback((dt: number) => {
    const w = wheel.current;
    w.t += dt;
    const prevAngle = w.angle;

    switch (w.mode) {
      case "wind": {
        const u = Math.min(1, w.t / WIND_S);
        w.angle = w.a0 - WIND_DEG * Math.sin((u * Math.PI) / 2);
        w.vel = 0;
        if (u >= 1) {
          w.mode = "accel";
          w.t = 0;
          w.a0 = w.angle;
        }
        break;
      }
      case "accel": {
        const acc = V_MAX / ACCEL_S;
        const t = Math.min(w.t, ACCEL_S);
        w.angle = w.a0 + 0.5 * acc * t * t + (w.t > ACCEL_S ? V_MAX * (w.t - ACCEL_S) : 0);
        w.vel = acc * t;
        if (w.t >= ACCEL_S) {
          w.mode = "cruise";
          w.t = 0;
        }
        // Greška stigla rano: odmah lagano zaustavi.
        if (w.pending && w.pending.idx === null && w.t > 0.05) startDecel(w);
        break;
      }
      case "cruise": {
        w.vel = V_MAX;
        w.angle += V_MAX * dt;
        if (w.pending) startDecel(w);
        break;
      }
      case "decel": {
        const u = Math.min(1, w.t / w.T);
        const inv = 1 - u;
        w.angle = w.a0 + w.D * (1 - inv * inv * inv * inv);
        w.vel = ((4 * w.D) / w.T) * inv * inv * inv;
        if (u >= 1) stopWheel(w);
        break;
      }
      case "settle": {
        // Hermiteova krivulja: kreće trenutnom brzinom, staje točno na w.a0 + w.D.
        const u = Math.min(1, w.t / w.T);
        const u2 = u * u;
        const u3 = u2 * u;
        w.angle = w.a0 + w.D * (3 * u2 - 2 * u3) + w.T * w.v0 * (u3 - 2 * u2 + u);
        w.vel = (w.D * (6 * u - 6 * u2) + w.T * w.v0 * (3 * u2 - 4 * u + 1)) / w.T;
        if (u >= 1) stopWheel(w);
        break;
      }
      case "stop":
        w.stopT += dt;
        break;
      default:
        break;
    }

    // ── Jezičac: klinovi ga guraju, opruga ga vraća ──
    // φ = kut najbližeg klina u odnosu na liniju jezičca (stupnjevi, + = prošao).
    const pegPhase = (ang: number) => {
      const rel = mod(ang + SEG / 2, SEG); // klin i je na i*SEG - SEG/2 u okviru kola
      return rel > SEG / 2 ? rel - SEG : rel;
    };
    const phi = pegPhase(w.angle);
    const C0 = 5.2; // počinje dodir (° prije linije)
    const C1 = 1.4; // klin isklizne (° nakon linije)
    const K = 3.1; // pretvorba okretanja kola u otklon jezičca
    const SPRING = 900;
    const DAMP = 16;
    w.pv += (-SPRING * w.p - DAMP * w.pv) * dt;
    w.p += w.pv * dt;
    const moving = w.angle - prevAngle > 1e-6;
    if (moving && phi > -C0 && phi < C1) {
      // Klin gura vrh jezičca (kinematski — jezičac ne može kroz klin).
      const forced = -K * (phi + C0) * DEG;
      if (w.p > forced) {
        w.p = forced;
        w.pv = Math.min(w.pv, 0);
      }
      w.contact = true;
    } else {
      w.contact = false;
    }
    // Koliko je klinova upravo isklizlo ispod jezičca (pri velikoj brzini
    // kolo u jednom koraku preskoči cijeli prozor dodira — zato brojimo).
    const released = Math.floor((w.angle + SEG / 2 - C1) / SEG) - Math.floor((prevAngle + SEG / 2 - C1) / SEG);
    if (released > 0) {
      sfx.wheelClick();
      if (w.vel < 260) haptic(5);
      // Preskočen dodir: daj jezičcu udarac da i dalje "trepće".
      const kick = -K * (C0 + C1) * DEG;
      if (w.p > kick * 0.6) {
        w.p = kick * 0.75;
        w.pv = Math.max(w.pv, 0);
      }
    }
    w.p = clamp(w.p, -0.55, 0.32);

    w.chase += dt * (5 + w.vel / 34);
    if (w.flashT > 0) w.flashT = Math.max(0, w.flashT - dt);

    fx.current.update(dt);
    shake.current.update(dt);
  }, []);

  function stopWheel(w: Wheel) {
    w.mode = "stop";
    w.vel = 0;
    w.stopT = 0;
    const done = finish.current;
    finish.current = null;
    done?.();
  }

  function startDecel(w: Wheel) {
    const p = w.pending!;
    w.pending = null;
    const v0 = Math.max(w.vel, 60);
    w.a0 = w.angle;
    w.t = 0;
    if (p.idx === null) {
      // Bez rezultata (greška, nema vrtnji): vrati se na polje na kojem je kolo
      // stajalo — da ne izgleda kao da je jezičac stao na nekom dobitku.
      let D = mod(w.rest - w.a0, 360);
      // Tek krenulo (greška stigla odmah): samo se lagano vrati, bez cijelog kruga.
      if (v0 > 150) while (D < v0 * 0.25) D += 360;
      else if (D > 180) D -= 360;
      w.D = D;
      w.v0 = v0;
      w.T = clamp((3 * D) / v0, 0.75, 2.2);
      w.target = null;
      w.mode = "settle";
      return;
    } else {
      // Sredina polja ± malo, da ne stane uvijek savršeno u sredinu.
      const jitter = (Math.random() - 0.5) * SEG * 0.5;
      const want = mod(-p.idx * SEG + jitter, 360);
      const minD = (v0 * MIN_DECEL_S) / 4;
      const D = minD + mod(want - mod(w.a0 + minD, 360), 360);
      w.D = D;
      w.T = (4 * D) / v0;
      w.target = p.idx;
    }
    w.mode = "decel";
  }

  // ── Crtanje ──
  const render = useCallback(
    ({ dt, time }: { dt: number; time: number }) => {
      const { ctx, w: W, h: Hh, dpr } = view.current;
      if (!ctx || W < 10) return;
      const wh = wheel.current;

      // Raspored: kolo u prostoru između gornje trake i panela.
      const top = 54;
      const bottom = panelH.current + 10;
      const avail = Math.max(120, Hh - top - bottom);
      const targetR = Math.max(70, Math.min((W - 30) / 2, avail / 2.24, 205));
      const targetCy = top + (avail - targetR * 2.24) / 2 + targetR * 1.2;
      const L = layout.current;
      if (!L.ready) {
        L.R = targetR;
        L.cy = targetCy;
        L.ready = true;
      } else {
        L.R = damp(L.R, targetR, 9, dt);
        L.cy = damp(L.cy, targetCy, 9, dt);
      }
      L.cx = W / 2;
      const { cx, cy } = L;
      const R = L.R;

      // Offscreen slojevi crtaju se za ciljnu veličinu (ne za svaki frejm animacije).
      // Slojeve ne crtamo za svaki frejm animacije veličine: novi tek kad se
      // kolo osjetno poveća/smanji, i još jednom (oštro) kad se smiri.
      const prev = caches.current;
      const fonts = fontsReady.current;
      const settled = Math.abs(L.R - targetR) < 0.5 && wh.vel === 0;
      if (
        !prev || prev.dpr !== dpr || prev.fonts !== fonts ||
        targetR > prev.R + 4 || targetR < prev.R - 24 ||
        (settled && Math.abs(prev.R - targetR) > 1)
      ) {
        const disc = buildDisc(targetR, dpr);
        caches.current = {
          R: targetR,
          dpr,
          fonts,
          disc,
          blur: buildBlur(disc, 16),
          front: buildFront(targetR, dpr),
          bulb: buildBulbSprites(targetR * 0.024, dpr)
        };
      }
      const cache = caches.current!;
      const scale = R / cache.R;

      ctx.save();
      shake.current.apply(ctx, W / 2, Hh / 2);

      // Pozadina
      ctx.fillStyle = BRAND.bg;
      ctx.fillRect(-20, -20, W + 40, Hh + 40);
      const winGlow = wh.outcome === "win" ? Math.min(1, wh.stopT * 2) : 0;
      const spinGlow = clamp(wh.vel / V_MAX, 0, 1);
      const glowA = 0.07 + spinGlow * 0.05 + winGlow * 0.1;
      const bg = ctx.createRadialGradient(cx, cy, R * 0.2, cx, cy, R * 1.9);
      bg.addColorStop(0, `rgba(232,255,60,${glowA})`);
      bg.addColorStop(0.5, `rgba(232,255,60,${glowA * 0.3})`);
      bg.addColorStop(1, "rgba(232,255,60,0)");
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, W, Hh);

      // Zrake iza kola (polagano se vrte).
      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(time * 0.06);
      const rays = 16;
      ctx.fillStyle = `rgba(255,255,255,${0.018 + winGlow * 0.03})`;
      for (let i = 0; i < rays; i++) {
        const a = (i / rays) * Math.PI * 2;
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.arc(0, 0, R * 2.6, a, a + (Math.PI / rays) * 0.55);
        ctx.closePath();
        ctx.fill();
      }
      ctx.restore();

      // Sjena ispod kola.
      const sh = ctx.createRadialGradient(cx, cy + R * 0.12, R * 0.7, cx, cy + R * 0.12, R * 1.18);
      sh.addColorStop(0, "rgba(0,0,0,0.75)");
      sh.addColorStop(1, "rgba(0,0,0,0)");
      ctx.fillStyle = sh;
      ctx.beginPath();
      ctx.arc(cx, cy + R * 0.12, R * 1.18, 0, Math.PI * 2);
      ctx.fill();

      // Disk (rotira). Pri velikoj brzini preko oštrog crtamo zamućenu verziju.
      const blurAmt = clamp((wh.vel - 220) / 520, 0, 1);
      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(wh.angle * DEG);
      if (blurAmt < 1) ctx.drawImage(cache.disc, -R, -R, R * 2, R * 2);
      if (blurAmt > 0) {
        ctx.globalAlpha = blurAmt;
        ctx.drawImage(cache.blur, -R, -R, R * 2, R * 2);
        ctx.globalAlpha = 1;
      }
      ctx.restore();

      // Dobitno polje: pulsirajući obrub.
      if (wh.mode === "stop" && wh.target !== null && wh.outcome !== "none") {
        const center = (-90 + wh.target * SEG + wh.angle) * DEG;
        const a0 = center - (SEG / 2) * DEG;
        const a1 = center + (SEG / 2) * DEG;
        const pulse = 0.55 + 0.45 * Math.sin(wh.stopT * 5);
        const appear = Math.min(1, wh.stopT * 3);
        ctx.save();
        ctx.translate(cx, cy);
        ctx.beginPath();
        ctx.moveTo(Math.cos(a0) * R * HUB, Math.sin(a0) * R * HUB);
        ctx.arc(0, 0, R * FACE - 1.5, a0, a1);
        ctx.lineTo(Math.cos(a1) * R * HUB, Math.sin(a1) * R * HUB);
        ctx.arc(0, 0, R * HUB, a1, a0, true);
        ctx.closePath();
        ctx.fillStyle = `rgba(255,255,255,${0.1 * pulse * appear})`;
        ctx.fill();
        ctx.lineJoin = "round";
        const onLime = SEGMENTS[wh.target].id === "dres";
        ctx.shadowColor = onLime ? "rgba(255,255,255,0.9)" : "rgba(232,255,60,0.9)";
        ctx.shadowBlur = 14 * (R / 165);
        ctx.strokeStyle = onLime
          ? `rgba(255,255,255,${(0.7 + 0.3 * pulse) * appear})`
          : `rgba(232,255,60,${(0.6 + 0.4 * pulse) * appear})`;
        ctx.lineWidth = 2.6 * (R / 165);
        ctx.stroke();
        ctx.restore();
      }

      // Rub + glavčina.
      const fr = cache.front;
      const FR = R * fr.pad;
      ctx.drawImage(fr.cv, cx - FR, cy - FR, FR * 2, FR * 2);

      // Žaruljice.
      const b = cache.bulb;
      const br = b.r * scale;
      const gr = b.glowR * scale;
      const lit = (i: number) => {
        if (wh.flashT > 0) return Math.sin(wh.flashT * 26) > 0 ? 1 : 0.15;
        if (wh.mode === "wind" || wh.mode === "accel" || wh.mode === "cruise" || wh.mode === "decel" || wh.mode === "settle") {
          let v = 0.12;
          for (let hIdx = 0; hIdx < 3; hIdx++) {
            const head = mod(wh.chase + (hIdx * BULBS) / 3, BULBS);
            const d = mod(head - i, BULBS);
            v = Math.max(v, Math.max(0, 1 - d / 3.2));
          }
          return v;
        }
        if (wh.outcome === "win") return 0.55 + 0.45 * Math.sin(time * 7 + i * 0.9);
        if (wh.outcome === "none") return 0.22 + 0.1 * Math.sin(time * 1.6 + i * 0.4);
        // Mirovanje: polako izmjenjuju parne i neparne.
        const s = 0.5 + 0.5 * Math.sin(time * 2.4 + (i % 2) * Math.PI);
        return 0.2 + 0.8 * s * s;
      };
      for (let i = 0; i < BULBS; i++) {
        const a = (i / BULBS) * Math.PI * 2 - Math.PI / 2 + Math.PI / BULBS;
        const x = cx + Math.cos(a) * R * BULB_R;
        const y = cy + Math.sin(a) * R * BULB_R;
        const v = lit(i);
        ctx.globalAlpha = 1;
        ctx.drawImage(b.off, x - br, y - br, br * 2, br * 2);
        if (v > 0.02) {
          ctx.globalAlpha = v;
          ctx.drawImage(b.on, x - br, y - br, br * 2, br * 2);
        }
      }
      ctx.globalCompositeOperation = "lighter";
      for (let i = 0; i < BULBS; i++) {
        const v = lit(i);
        if (v < 0.25) continue;
        const a = (i / BULBS) * Math.PI * 2 - Math.PI / 2 + Math.PI / BULBS;
        const x = cx + Math.cos(a) * R * BULB_R;
        const y = cy + Math.sin(a) * R * BULB_R;
        ctx.globalAlpha = (v - 0.2) * 0.75;
        ctx.drawImage(b.glow, x - gr, y - gr, gr * 2, gr * 2);
      }
      ctx.globalCompositeOperation = "source-over";
      ctx.globalAlpha = 1;

      // Jezičac.
      const k = R / 165;
      const px = cx;
      const py = cy - R * PIVOT_R;
      const Lp = R * (PIVOT_R - TIP_R);
      const bw = R * 0.095;
      ctx.save();
      ctx.translate(px, py);
      ctx.rotate(wh.p);
      const shape = () => {
        ctx.beginPath();
        ctx.moveTo(0, Lp);
        ctx.bezierCurveTo(-bw * 0.25, Lp * 0.78, -bw * 1.02, Lp * 0.32, -bw, 0);
        ctx.arc(0, 0, bw, Math.PI, 0);
        ctx.bezierCurveTo(bw * 1.02, Lp * 0.32, bw * 0.25, Lp * 0.78, 0, Lp);
        ctx.closePath();
      };
      ctx.save();
      ctx.shadowColor = "rgba(0,0,0,0.55)";
      ctx.shadowBlur = 10 * k;
      ctx.shadowOffsetX = 2 * k;
      ctx.shadowOffsetY = 5 * k;
      shape();
      const pg = ctx.createLinearGradient(-bw, 0, bw, 0);
      pg.addColorStop(0, "#f6ffa8");
      pg.addColorStop(0.42, BRAND.accent);
      pg.addColorStop(1, "#a9bf00");
      ctx.fillStyle = pg;
      ctx.fill();
      ctx.restore();
      shape();
      ctx.strokeStyle = "rgba(0,0,0,0.45)";
      ctx.lineWidth = 1 * k;
      ctx.stroke();
      // Odsjaj na jezičcu.
      ctx.beginPath();
      ctx.moveTo(-bw * 0.55, -bw * 0.45);
      ctx.quadraticCurveTo(-bw * 0.8, Lp * 0.25, -bw * 0.12, Lp * 0.7);
      ctx.strokeStyle = "rgba(255,255,255,0.55)";
      ctx.lineWidth = 1.4 * k;
      ctx.lineCap = "round";
      ctx.stroke();
      // Os (metalni vijak).
      const sr = bw * 0.46;
      const sg = ctx.createRadialGradient(-sr * 0.35, -sr * 0.4, sr * 0.1, 0, 0, sr);
      sg.addColorStop(0, "#ffffff");
      sg.addColorStop(0.5, "#9c9ca2");
      sg.addColorStop(1, "#2a2a2e");
      ctx.beginPath();
      ctx.arc(0, 0, sr, 0, Math.PI * 2);
      ctx.fillStyle = sg;
      ctx.fill();
      ctx.strokeStyle = "rgba(0,0,0,0.5)";
      ctx.lineWidth = 0.8 * k;
      ctx.stroke();
      ctx.restore();

      fx.current.draw(ctx);
      ctx.restore();
    },
    [view]
  );

  useGameLoop({ running: true, update: step, render });

  // ── Akcije ──
  /** Mobitel: ako je kolo djelomično izvan ekrana (npr. nakon tipkovnice), poravnaj ga ispod zaglavlja. */
  function alignStage() {
    const el = stageRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const vh = window.visualViewport?.height ?? window.innerHeight;
    const off = window.innerWidth >= 768 ? 92 : 60;
    if (r.top >= off - 2 && r.bottom <= vh + 2) return;
    window.scrollTo({ top: Math.max(0, r.top + window.scrollY - off), behavior: "smooth" });
  }

  async function doSpin(fromWheel = false) {
    if (phase === "spinning" || busy.current) return;
    unlockAudio();
    setError("");

    const tel = phone.trim();
    if (tel.replace(/\D/g, "").length < 9) {
      setError(tel ? "Provjeri broj mobitela." : "Upiši svoj broj mobitela.");
      sfx.tap();
      if (fromWheel) inputRef.current?.focus();
      return;
    }
    busy.current = true;
    (document.activeElement as HTMLElement | null)?.blur?.();
    // Pričekaj da se tipkovnica počne zatvarati, pa poravnaj kolo.
    timers.current.push(window.setTimeout(alignStage, 80));

    setResult(null);
    setCopied(false);
    setPhase("spinning");
    const w = wheel.current;
    w.angle = mod(w.angle, 360);
    w.rest = w.angle;
    w.a0 = w.angle;
    w.t = 0;
    w.mode = "wind";
    w.pending = null;
    w.target = null;
    w.outcome = null;
    w.flashT = 0;
    sfx.whoosh();

    // Bez odgovora 15 s (loša mreža): kolo ne smije vječno vrtjeti.
    const ctrl = typeof AbortController !== "undefined" ? new AbortController() : null;
    const abortT = window.setTimeout(() => ctrl?.abort(), 15000);
    const res = await fetch("/api/kolo/spin/", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ phone: tel }),
      signal: ctrl?.signal
    }).then((r) => r.json()).catch(() => null);
    window.clearTimeout(abortT);

    if (!res?.ok) {
      finish.current = () => {
        busy.current = false;
        setPhase("idle");
        setError(
          res?.reason === "no_spins" ? "Nemaš više vrtnji. Svaka narudžba od 60 € donosi novu."
            : res?.reason === "off" ? "Kolo trenutno ne radi."
            : res?.reason === "no_phone" ? "Provjeri broj mobitela."
            : "Nešto je pošlo po zlu. Pokušaj ponovno."
        );
      };
      w.pending = { idx: null };
      if (w.mode === "wind") {
        // Još nije krenulo — samo se vrati.
        w.mode = "accel";
        w.t = 0;
        w.a0 = w.angle;
      }
      return;
    }

    const idx = Math.max(0, SEGMENTS.findIndex((s) => s.id === res.prize));
    const r: Result = { prize: res.prize, label: res.label, code: res.code, left: res.left };
    finish.current = () => {
      const isWin = r.prize !== "none" && r.prize !== "respin";
      w.outcome = isWin ? "win" : r.prize === "respin" ? "respin" : "none";
      const { cx, cy, R } = layout.current;
      if (isWin) {
        w.flashT = 1.1;
        shake.current.add(0.28);
        sfx.fanfare();
        haptic(30);
        const tipY = cy - R * TIP_R;
        fx.current.burst(cx, tipY, { count: 60, shape: "confetti", colors: [BRAND.accent, "#ffffff", "#d7d7da"], speed: [180, 520], angle: -Math.PI / 2, spread: Math.PI * 1.1, gravity: 620, drag: 1.6, size: [3, 5.5], life: [1.1, 1.9] });
        fx.current.burst(cx - R * 0.9, cy - R * 0.3, { count: 26, shape: "confetti", colors: [BRAND.accent, "#ffffff"], speed: [160, 420], angle: -Math.PI * 0.62, spread: 0.9, gravity: 620, drag: 1.6, size: [3, 5], life: [1, 1.7] });
        fx.current.burst(cx + R * 0.9, cy - R * 0.3, { count: 26, shape: "confetti", colors: [BRAND.accent, "#ffffff"], speed: [160, 420], angle: -Math.PI * 0.38, spread: 0.9, gravity: 620, drag: 1.6, size: [3, 5], life: [1, 1.7] });
        fx.current.burst(cx, tipY + R * 0.1, { count: 20, shape: "spark", colors: [BRAND.accent, "#ffffff"], speed: [200, 480], gravity: 0, drag: 3.2, life: [0.35, 0.6] });
      } else if (r.prize === "respin") {
        w.flashT = 0.5;
        sfx.success();
        fx.current.burst(cx, cy - R * TIP_R, { count: 16, shape: "spark", colors: [BRAND.accent], speed: [160, 380], gravity: 0, drag: 3.2, life: [0.3, 0.55] });
      } else {
        sfx.fail();
      }
      // Kartica stiže tek kad se vidi gdje je jezičac stao (inače se kolo
      // odmah smanji i trenutak dobitka promakne).
      timers.current.push(
        window.setTimeout(() => {
          busy.current = false;
          setResult(r);
          setPhase("done");
        }, isWin ? 750 : 420)
      );
    };
    w.pending = { idx };
  }

  function applyCode() {
    if (!result?.code) return;
    try { window.localStorage.setItem(PROMO_STORAGE_KEY, result.code); } catch { /* privatni način rada */ }
    window.location.href = "/dresovi/";
  }

  async function copyCode() {
    if (!result?.code) return;
    try {
      await navigator.clipboard.writeText(result.code);
    } catch {
      const ta = document.createElement("textarea");
      ta.value = result.code;
      document.body.appendChild(ta);
      ta.select();
      try { document.execCommand("copy"); } catch { /* kupac može prepisati ručno */ }
      ta.remove();
    }
    setCopied(true);
    haptic(10);
    window.setTimeout(() => setCopied(false), 1800);
  }

  function again(clearPhone = false) {
    setResult(null);
    setPhase("idle");
    wheel.current.outcome = null;
    wheel.current.target = null;
    if (clearPhone) {
      setPhone("");
      inputRef.current?.focus();
    }
  }

  const won = phase === "done" && !!result && result.prize !== "none" && result.prize !== "respin";
  const spinning = phase === "spinning";
  const left = result?.left ?? 0;
  const outOfSpins = phase === "done" && !!result && result.prize === "none" && left <= 0;

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    void doSpin();
  };

  return (
    <GameStage stageRef={stageRef} state={spinning ? "playing" : won ? "result" : "start"} locked={spinning}>
      {/* Kolo nema povlačenja: dok se ne vrti, prst po kolu smije scrollati
          stranicu (ispod su upute). Dodir po kolu = "Zavrti". */}
      <canvas
        ref={canvasRef}
        aria-hidden
        onClick={() => {
          if (phase !== "spinning" && !outOfSpins && !won) void doSpin(true);
        }}
        style={{ touchAction: spinning ? "none" : "pan-y" }}
        className="absolute inset-0 h-full w-full"
      />

      {/* Gornja traka */}
      <div className="pointer-events-none absolute inset-x-0 top-0 z-20 flex items-center justify-between px-[max(14px,env(safe-area-inset-left))] pt-3">
        <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.3em] text-white/55">
          <span className="h-1.5 w-1.5 rounded-full bg-accent" />
          Kolo sreće
        </div>
        <div className="pointer-events-auto">
          <MuteButton />
        </div>
      </div>

      {/* Donji panel */}
      <div
        ref={panelRef}
        className="absolute inset-x-0 bottom-0 z-20 px-4 pb-[max(14px,env(safe-area-inset-bottom))] pt-3"
      >
        <div className="mx-auto w-full max-w-[400px]" aria-live="polite">
          <AnimatePresence mode="wait" initial={false}>
            {won && result ? (
              <motion.div
                key="win"
                initial={{ opacity: 0, y: 18, scale: 0.97 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 10 }}
                transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1], delay: 0.15 }}
                className="relative overflow-hidden rounded-[18px] border border-accent/35 bg-[#0d0f06] bg-[linear-gradient(160deg,rgba(232,255,60,0.14),rgba(232,255,60,0.03)_45%,rgba(255,255,255,0.02))] px-4 pb-4 pt-3.5"
              >
                <div className="flex items-center gap-2 text-[10.5px] font-semibold uppercase tracking-[0.28em] text-accent">
                  <span className="h-1.5 w-1.5 rounded-full bg-accent" />
                  Osvojeno
                </div>
                <div className="mt-2 font-heading text-[30px] uppercase leading-[0.95] text-white">{result.label}</div>
                <div className="mt-1 text-[13px] text-white/60">
                  Osobna šifra
                  <span className="text-white/35"> · vrijedi 48 sati</span>
                </div>

                {result.code ? (
                  <>
                    <div className="mt-3 flex h-[46px] items-stretch gap-2">
                      <div className="flex flex-1 select-all items-center justify-center rounded-[12px] border border-dashed border-white/25 bg-black/40 font-heading text-[23px] tracking-[0.14em] text-white">
                        {result.code}
                      </div>
                      <button
                        type="button"
                        onClick={copyCode}
                        className="flex w-[104px] items-center justify-center gap-1.5 rounded-[12px] border border-white/15 bg-white/[0.05] text-[13px] font-semibold text-white active:bg-white/10"
                      >
                        {copied ? <Check className="h-4 w-4 text-accent" /> : <Copy className="h-4 w-4" />}
                        {copied ? "Kopirano" : "Kopiraj"}
                      </button>
                    </div>
                    <div className="mt-2">
                      <PrimaryButton onClick={applyCode} icon={ShoppingBag} className="!h-[52px] !text-[22px]">
                        Iskoristi u dućanu
                      </PrimaryButton>
                    </div>
                  </>
                ) : null}

                {left > 0 ? (
                  <button
                    type="button"
                    onClick={() => again()}
                    className="mt-2.5 flex w-full items-center justify-center gap-1.5 text-[12.5px] font-semibold text-white/60 active:text-white"
                  >
                    <RotateCw className="h-3.5 w-3.5" />
                    Imaš još {left} {plural(left, "vrtnju", "vrtnje", "vrtnji")}
                  </button>
                ) : null}
              </motion.div>
            ) : (
              <motion.form
                key="spin"
                onSubmit={onSubmit}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 8 }}
                transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
              >
                <AnimatePresence initial={false}>
                  {phase === "done" && result ? (
                    <motion.div
                      key={result.prize}
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
                      className="overflow-hidden"
                    >
                      <div className="pb-3 text-center">
                        <div className={`font-heading text-[28px] uppercase leading-none tracking-[0.04em] ${result.prize === "respin" ? "text-accent" : "text-white"}`}>
                          {result.prize === "respin" ? "Još jedna vrtnja" : "Ovaj put ništa"}
                        </div>
                        <p className="mt-1.5 text-[13px] text-white/55">
                          {result.prize === "respin"
                            ? left > 0
                              ? `Imaš još ${left} ${plural(left, "vrtnju", "vrtnje", "vrtnji")}. Zavrti ponovno.`
                              : "Zavrti ponovno."
                            : left > 0
                              ? `Imaš još ${left} ${plural(left, "vrtnju", "vrtnje", "vrtnji")}.`
                              : "Svaka narudžba od 60 € donosi novu vrtnju."}
                        </p>
                      </div>
                    </motion.div>
                  ) : null}
                </AnimatePresence>

                {outOfSpins ? (
                  <>
                    <PrimaryButton onClick={() => router.push("/dresovi/")} icon={ShoppingBag}>
                      Pogledaj dresove
                    </PrimaryButton>
                    <button
                      type="button"
                      onClick={() => again(true)}
                      className="mt-1 flex h-[36px] w-full items-center justify-center text-[12.5px] font-semibold text-white/50 active:text-white"
                    >
                      Upiši drugi broj
                    </button>
                  </>
                ) : (
                  <>
                    <label htmlFor="kolo-tel" className="sr-only">Broj mobitela</label>
                    <input
                      ref={inputRef}
                      id="kolo-tel"
                      type="tel"
                      inputMode="tel"
                      autoComplete="tel"
                      enterKeyHint="go"
                      value={phone}
                      onChange={(e) => {
                        setPhone(e.target.value);
                        if (error) setError("");
                      }}
                      placeholder="Broj mobitela, npr. 091 234 5678"
                      disabled={spinning}
                      className={`h-[52px] w-full rounded-[14px] border bg-white/[0.06] px-4 text-center text-[16px] font-semibold tracking-[0.04em] text-white placeholder:font-normal placeholder:tracking-normal placeholder:text-white/35 focus:border-accent/70 focus:bg-white/[0.08] focus:outline-none disabled:opacity-40 ${error ? "border-red-400/60" : "border-white/12"}`}
                    />
                    <div className="mt-2">
                      {spinning ? (
                        <div className="flex h-[58px] w-full items-center justify-center gap-2.5 rounded-[16px] border border-accent/25 bg-accent/[0.08] font-heading text-[24px] uppercase leading-none tracking-[0.1em] text-accent">
                          <RotateCw className="h-[18px] w-[18px] animate-spin [animation-duration:1.4s]" strokeWidth={2.4} />
                          <span className="translate-y-[1px]">Sretno</span>
                        </div>
                      ) : (
                        <PrimaryButton onClick={() => void doSpin()} icon={RotateCw} pulse={!error && phase === "idle"}>
                          {phase === "done" ? "Zavrti opet" : "Zavrti kolo"}
                        </PrimaryButton>
                      )}
                    </div>
                    <p className={`mt-2 min-h-[18px] text-center text-[12px] leading-[18px] ${error ? "text-red-300" : "text-white/40"}`}>
                      {error || (phase === "idle" ? "Jedna vrtnja po broju. Svaka narudžba od 60 € donosi novu." : "")}
                    </p>
                  </>
                )}
                {/* Enter na tipkovnici */}
                <button type="submit" className="hidden" aria-hidden tabIndex={-1} />
              </motion.form>
            )}
          </AnimatePresence>
        </div>
      </div>
      {/* Za čitače zaslona */}
      <span className="sr-only">{won && result ? `Osvojeno: ${result.label}` : ""}</span>
    </GameStage>
  );
}

