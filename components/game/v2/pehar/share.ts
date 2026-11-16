// Slika za story (1080×1920) za "15 do pehara": dokle je igrač stigao,
// sigurna razina i ljestvica s osvijetljenim stepenicama.

import { BRAND, brandFont, ensureBrandFonts, roundRect } from "../draw";
import { LJESTVICA, PEHAR_BROJ, PEHAR_NAZIV } from "./config";

const W = 1080;
const H = 1920;

export type PeharShare = {
  /** Pitanje do kojeg je igrač stigao (1..15). */
  reached: number;
  /** Točnih odgovora (0..15). */
  correct: number;
  /** Ime sigurne razine ("Kvart", "Prva liga") ili null. */
  safe: string | null;
  won: boolean;
};

/** Rečenica za sliku i tekst dijeljenja. */
export function peharLine(s: PeharShare) {
  if (s.won) return "Pehar je moj.";
  if (s.safe === "Prva liga") return "Prva liga je moja.";
  if (s.safe) return `${s.safe} je moj.`;
  return "Kvart me čeka.";
}

/** Mali pehar (čaša, ručke, stalak, postolje) — središte (cx), vrh (top), visina (h). */
function drawTrophy(ctx: CanvasRenderingContext2D, cx: number, top: number, h: number, color: string) {
  const w = h * 0.62;
  ctx.save();
  ctx.fillStyle = color;
  ctx.strokeStyle = color;
  ctx.lineCap = "round";
  // čaša
  ctx.beginPath();
  ctx.moveTo(cx - w / 2, top);
  ctx.lineTo(cx + w / 2, top);
  ctx.bezierCurveTo(cx + w / 2, top + h * 0.42, cx + w * 0.22, top + h * 0.56, cx, top + h * 0.58);
  ctx.bezierCurveTo(cx - w * 0.22, top + h * 0.56, cx - w / 2, top + h * 0.42, cx - w / 2, top);
  ctx.fill();
  // ručke
  ctx.lineWidth = h * 0.07;
  for (const side of [-1, 1]) {
    ctx.beginPath();
    ctx.moveTo(cx + side * w * 0.46, top + h * 0.08);
    ctx.bezierCurveTo(cx + side * w * 0.86, top + h * 0.06, cx + side * w * 0.84, top + h * 0.36, cx + side * w * 0.36, top + h * 0.42);
    ctx.stroke();
  }
  // stalak i postolje
  ctx.fillRect(cx - h * 0.05, top + h * 0.56, h * 0.1, h * 0.2);
  roundRect(ctx, cx - w * 0.36, top + h * 0.76, w * 0.72, h * 0.1, h * 0.03);
  ctx.fill();
  roundRect(ctx, cx - w * 0.46, top + h * 0.88, w * 0.92, h * 0.12, h * 0.03);
  ctx.fill();
  ctx.restore();
}

function spaced(ctx: CanvasRenderingContext2D, text: string, cx: number, y: number, sp: number) {
  const ch = Array.from(text);
  const ws = ch.map((c) => ctx.measureText(c).width);
  const total = ws.reduce((a, b) => a + b, 0) + sp * (ch.length - 1);
  let x = cx - total / 2;
  const prev = ctx.textAlign;
  ctx.textAlign = "left";
  ch.forEach((c, i) => {
    ctx.fillText(c, x, y);
    x += ws[i] + sp;
  });
  ctx.textAlign = prev;
}

function fitFont(ctx: CanvasRenderingContext2D, text: string, kind: "heading" | "body", start: number, max: number, weight?: number) {
  let size = start;
  ctx.font = brandFont(kind, size, weight);
  while (ctx.measureText(text).width > max && size > 20) {
    size -= 2;
    ctx.font = brandFont(kind, size, weight);
  }
  return size;
}

export async function renderPeharCard(s: PeharShare): Promise<Blob> {
  await ensureBrandFonts();
  const c = document.createElement("canvas");
  c.width = W;
  c.height = H;
  const ctx = c.getContext("2d");
  if (!ctx) throw new Error("no 2d context");

  ctx.fillStyle = BRAND.bg;
  ctx.fillRect(0, 0, W, H);

  // Reflektori iz gornjih kutova.
  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  for (const side of [-1, 1]) {
    const x0 = W / 2 + side * 620;
    const g = ctx.createRadialGradient(x0, -120, 0, x0, -120, 1500);
    g.addColorStop(0, "rgba(255,255,240,0.16)");
    g.addColorStop(0.5, "rgba(255,255,240,0.03)");
    g.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(x0, -120);
    ctx.lineTo(W / 2 - side * 120, H);
    ctx.lineTo(W / 2 + side * 260, H);
    ctx.closePath();
    ctx.fill();
  }
  ctx.restore();
  let g = ctx.createRadialGradient(W / 2, 880, 40, W / 2, 880, 820);
  g.addColorStop(0, `rgba(${BRAND.accentRgb},0.16)`);
  g.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);
  g = ctx.createRadialGradient(W / 2, H / 2, H * 0.3, W / 2, H / 2, H * 0.78);
  g.addColorStop(0, "rgba(0,0,0,0)");
  g.addColorStop(1, "rgba(0,0,0,0.7)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);

  ctx.textAlign = "center";
  ctx.textBaseline = "alphabetic";

  // Logo
  ctx.font = brandFont("heading", 104);
  const wD = ctx.measureText("DRES").width;
  const wI = ctx.measureText("IFY").width;
  const lx = W / 2 - (wD + wI) / 2;
  ctx.textAlign = "left";
  ctx.fillStyle = "#fff";
  ctx.fillText("DRES", lx, 200);
  ctx.fillStyle = BRAND.accent;
  ctx.fillText("IFY", lx + wD, 200);
  ctx.textAlign = "center";
  ctx.fillRect(W / 2 - 36, 246, 72, 5);

  ctx.font = brandFont("body", 40, 800);
  ctx.fillStyle = "rgba(255,255,255,0.75)";
  spaced(ctx, PEHAR_NAZIV.toUpperCase(), W / 2, 380, 12);

  // Glavni broj
  const big = s.won ? "15/15" : `${s.reached}.`;
  let size = 520;
  ctx.font = brandFont("heading", size);
  while (ctx.measureText(big).width > 820 && size > 200) {
    size -= 20;
    ctx.font = brandFont("heading", size);
  }
  const y0 = 430 + size * 0.86;
  ctx.save();
  ctx.shadowColor = `rgba(${BRAND.accentRgb},0.5)`;
  ctx.shadowBlur = 100;
  ctx.fillStyle = BRAND.accent;
  ctx.fillText(big, W / 2, y0);
  ctx.restore();
  ctx.fillStyle = BRAND.accent;
  ctx.fillText(big, W / 2, y0);

  const level = LJESTVICA[Math.min(PEHAR_BROJ, Math.max(1, s.reached)) - 1].ime.toUpperCase();
  ctx.font = brandFont("body", 40, 800);
  ctx.fillStyle = "#fff";
  const caption = s.won ? "SVJETSKI PRVAK" : `PITANJE · ${level}`;
  let cs = 40;
  while (ctx.measureText(caption).width + caption.length * 10 > 960 && cs > 26) {
    cs -= 2;
    ctx.font = brandFont("body", cs, 800);
  }
  spaced(ctx, caption, W / 2, y0 + 90, 10);

  // Rečenica
  const line = peharLine(s);
  fitFont(ctx, line, "heading", 112, 940);
  ctx.fillStyle = "#fff";
  ctx.fillText(line, W / 2, y0 + 230);

  // Ljestvica (vodoravno, 15 stepenica, sigurne označene)
  const top = y0 + 330;
  const rungW = 52;
  const gap = 10;
  const total = PEHAR_BROJ * rungW + (PEHAR_BROJ - 1) * gap;
  const x0 = W / 2 - total / 2;
  LJESTVICA.forEach((st, i) => {
    const h = 60 + i * 16;
    const x = x0 + i * (rungW + gap);
    const y = top + (300 - h);
    const passed = st.n <= s.correct;
    const failedHere = !s.won && st.n === s.reached;
    roundRect(ctx, x, y, rungW, h, 10);
    if (passed) {
      ctx.fillStyle = BRAND.accent;
      ctx.fill();
    } else if (failedHere) {
      ctx.fillStyle = "rgba(255,90,95,0.85)";
      ctx.fill();
    } else {
      ctx.fillStyle = "rgba(255,255,255,0.08)";
      ctx.fill();
    }
    if (st.sigurno) {
      ctx.lineWidth = 4;
      ctx.strokeStyle = passed ? "#ffffff" : `rgba(${BRAND.accentRgb},0.7)`;
      ctx.stroke();
    }
    if (i === PEHAR_BROJ - 1) {
      if (s.won) {
        ctx.save();
        ctx.shadowColor = `rgba(${BRAND.accentRgb},0.7)`;
        ctx.shadowBlur = 40;
        drawTrophy(ctx, x + rungW / 2, y - 78, 62, BRAND.accent);
        ctx.restore();
      } else drawTrophy(ctx, x + rungW / 2, y - 78, 62, "rgba(255,255,255,0.32)");
    }
  });
  ctx.font = brandFont("body", 30, 700);
  ctx.fillStyle = "rgba(255,255,255,0.5)";
  ctx.textAlign = "left";
  ctx.fillText("1", x0 + 14, top + 350);
  ctx.textAlign = "right";
  ctx.fillText("15", x0 + total - 6, top + 350);
  ctx.textAlign = "center";

  // Dno
  ctx.font = brandFont("heading", 96);
  ctx.fillStyle = "#fff";
  ctx.fillText(s.won ? "Možeš li i ti?" : "Možeš li dalje?", W / 2, 1738);
  ctx.font = brandFont("body", 38, 700);
  ctx.fillStyle = BRAND.accent;
  spaced(ctx, "DRESIFYSHOP.COM/PEHAR", W / 2, 1812, 6);

  return await new Promise<Blob>((resolve, reject) =>
    c.toBlob((b) => (b ? resolve(b) : reject(new Error("toBlob"))), "image/png"),
  );
}

export async function preparePeharCard(s: PeharShare): Promise<File> {
  const blob = await renderPeharCard(s);
  const slug = PEHAR_NAZIV.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  return new File([blob], `dresify-${slug}-${s.won ? "pehar" : s.reached}.png`, { type: "image/png" });
}
