// Slika rezultata za Instagram story (1080×1920) + dijeljenje.
//
//   const file = await prepareShareCard({ game: "Penalty Cup", score: 4, scoreLabel: "golova od 5" });
//   await shareFile(file);          // iz onClick-a; iOS traži svježu gestu
//
// Savjet (iOS Safari): sliku pripremi UNAPRIJED (npr. kad se pojavi ekran s
// rezultatom), pa u onClick odmah zovi shareFile — inače Safari može odbiti
// navigator.share jer je gesta "istekla" dok se slika crtala.

import { BRAND, brandFont, ensureBrandFonts, loadImage, roundRect } from "./draw";

export type ShareCardOptions = {
  /** Ime igre, npr. "Penalty Cup". */
  game: string;
  /** Glavni broj/tekst, npr. 4, 128 ili "9/10". */
  score: number | string;
  /** Mali natpis ispod broja, npr. "golova", "bodova", "točnih odgovora". */
  scoreLabel?: string;
  /** Prikaži oznaku "Novi rekord". */
  record?: boolean;
  /** Rečenica pri dnu. Default: "Možeš li bolje?" */
  tagline?: string;
  /** Slika u sredini (prozirni PNG/WebP). null = bez slike. Default: lopta Hrvatska. */
  image?: string | null;
};

export type ShareResult = "shared" | "downloaded" | "cancelled" | "failed";

const W = 1080;
const H = 1920;

function spacedText(ctx: CanvasRenderingContext2D, text: string, cx: number, y: number, spacing: number) {
  const chars = Array.from(text);
  const widths = chars.map((ch) => ctx.measureText(ch).width);
  const total = widths.reduce((a, b) => a + b, 0) + spacing * (chars.length - 1);
  let x = cx - total / 2;
  const prevAlign = ctx.textAlign;
  ctx.textAlign = "left";
  chars.forEach((ch, i) => {
    ctx.fillText(ch, x, y);
    x += widths[i] + spacing;
  });
  ctx.textAlign = prevAlign;
  return total;
}

function slug(s: string) {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

export async function renderShareCard(opts: ShareCardOptions): Promise<Blob> {
  await ensureBrandFonts();
  const imgSrc = opts.image === undefined ? "/mix/lopta-hrvatska.webp" : opts.image;
  const img = imgSrc ? await loadImage(imgSrc).catch(() => null) : null;

  const c = document.createElement("canvas");
  c.width = W;
  c.height = H;
  const ctx = c.getContext("2d");
  if (!ctx) throw new Error("no 2d context");

  // Pozadina
  ctx.fillStyle = BRAND.bg;
  ctx.fillRect(0, 0, W, H);

  let g = ctx.createRadialGradient(W / 2, 760, 40, W / 2, 760, 900);
  g.addColorStop(0, `rgba(${BRAND.accentRgb},0.16)`);
  g.addColorStop(0.45, `rgba(${BRAND.accentRgb},0.05)`);
  g.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);

  // Diskretne dijagonalne pruge
  ctx.save();
  ctx.globalAlpha = 0.035;
  ctx.strokeStyle = "#fff";
  ctx.lineWidth = 2;
  for (let x = -H; x < W; x += 36) {
    ctx.beginPath();
    ctx.moveTo(x, H);
    ctx.lineTo(x + H, 0);
    ctx.stroke();
  }
  ctx.restore();

  // Vinjeta
  g = ctx.createRadialGradient(W / 2, H / 2, H * 0.3, W / 2, H / 2, H * 0.75);
  g.addColorStop(0, "rgba(0,0,0,0)");
  g.addColorStop(1, "rgba(0,0,0,0.65)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);

  ctx.textBaseline = "alphabetic";
  ctx.textAlign = "center";

  // Logo DRES + IFY
  ctx.font = brandFont("heading", 116);
  const wDres = ctx.measureText("DRES").width;
  const wIfy = ctx.measureText("IFY").width;
  const lx = W / 2 - (wDres + wIfy) / 2;
  ctx.textAlign = "left";
  ctx.fillStyle = "#fff";
  ctx.fillText("DRES", lx, 236);
  ctx.fillStyle = BRAND.accent;
  ctx.fillText("IFY", lx + wDres, 236);
  ctx.textAlign = "center";

  // Linija
  ctx.fillStyle = BRAND.accent;
  ctx.fillRect(W / 2 - 40, 290, 80, 5);

  // Ime igre
  ctx.font = brandFont("body", 40, 700);
  ctx.fillStyle = "rgba(255,255,255,0.72)";
  spacedText(ctx, opts.game.toUpperCase(), W / 2, 470, 12);

  // Rezultat — prilagodi veličinu širini
  const scoreText = String(opts.score);
  let size = 470;
  ctx.font = brandFont("heading", size);
  while (ctx.measureText(scoreText).width > 900 && size > 160) {
    size -= 20;
    ctx.font = brandFont("heading", size);
  }
  const scoreY = 540 + size * 0.86;
  ctx.save();
  ctx.shadowColor = `rgba(${BRAND.accentRgb},0.45)`;
  ctx.shadowBlur = 90;
  ctx.fillStyle = BRAND.accent;
  ctx.fillText(scoreText, W / 2, scoreY);
  ctx.restore();
  ctx.fillStyle = BRAND.accent;
  ctx.fillText(scoreText, W / 2, scoreY);

  let y = scoreY + 92;
  if (opts.scoreLabel) {
    ctx.font = brandFont("body", 44, 800);
    ctx.fillStyle = "#fff";
    spacedText(ctx, opts.scoreLabel.toUpperCase(), W / 2, y, 10);
    y += 40;
  }

  if (opts.record) {
    y += 34;
    ctx.font = brandFont("body", 34, 800);
    const label = "NOVI REKORD";
    const tw = ctx.measureText(label).width + 8 * (label.length - 1);
    const pw = tw + 80;
    const ph = 76;
    const px = W / 2 - pw / 2;
    ctx.strokeStyle = BRAND.accent;
    ctx.lineWidth = 3;
    roundRect(ctx, px, y, pw, ph, ph / 2);
    ctx.fillStyle = `rgba(${BRAND.accentRgb},0.12)`;
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = BRAND.accent;
    spacedText(ctx, label, W / 2, y + ph / 2 + 12, 8);
    y += ph;
  }

  // Slika (lopta) s mekom sjenom
  if (img) {
    const box = 340;
    const cy = Math.min(1440, Math.max(y + 60 + box / 2, 1390));
    const ratio = img.naturalWidth / img.naturalHeight || 1;
    const iw = ratio >= 1 ? box : box * ratio;
    const ih = ratio >= 1 ? box / ratio : box;
    const sg = ctx.createRadialGradient(W / 2, cy + ih / 2 + 10, 0, W / 2, cy + ih / 2 + 10, iw * 0.55);
    sg.addColorStop(0, "rgba(0,0,0,0.75)");
    sg.addColorStop(1, "rgba(0,0,0,0)");
    ctx.save();
    ctx.translate(W / 2, cy + ih / 2 + 10);
    ctx.scale(1, 0.18);
    ctx.fillStyle = sg;
    ctx.beginPath();
    ctx.arc(0, 0, iw * 0.55, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    const glow = ctx.createRadialGradient(W / 2, cy, 0, W / 2, cy, box * 0.8);
    glow.addColorStop(0, `rgba(${BRAND.accentRgb},0.12)`);
    glow.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = glow;
    ctx.fillRect(W / 2 - box, cy - box, box * 2, box * 2);
    ctx.save();
    ctx.translate(W / 2, cy);
    ctx.rotate(-0.18);
    ctx.drawImage(img, -iw / 2, -ih / 2, iw, ih);
    ctx.restore();
  }

  // Dno
  ctx.font = brandFont("heading", 92);
  ctx.fillStyle = "#fff";
  ctx.fillText(opts.tagline ?? "Možeš li bolje?", W / 2, 1738);
  ctx.font = brandFont("body", 38, 700);
  ctx.fillStyle = BRAND.accent;
  spacedText(ctx, "DRESIFYSHOP.COM", W / 2, 1812, 6);

  return await new Promise<Blob>((resolve, reject) =>
    c.toBlob((b) => (b ? resolve(b) : reject(new Error("toBlob"))), "image/png")
  );
}

export async function prepareShareCard(opts: ShareCardOptions): Promise<File> {
  const blob = await renderShareCard(opts);
  return new File([blob], `dresify-${slug(opts.game) || "igra"}.png`, { type: "image/png" });
}

function download(file: File) {
  const url = URL.createObjectURL(file);
  const a = document.createElement("a");
  a.href = url;
  a.download = file.name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
}

/** Podijeli gotovu sliku (Web Share s datotekom), inače je preuzmi kao PNG. */
export async function shareFile(file: File, title = "DRESIFY"): Promise<ShareResult> {
  const nav = typeof navigator !== "undefined" ? navigator : null;
  try {
    if (nav?.canShare && nav.canShare({ files: [file] })) {
      await nav.share({ files: [file], title });
      return "shared";
    }
  } catch (err) {
    const name = (err as { name?: string })?.name;
    if (name === "AbortError") return "cancelled";
    // NotAllowedError (gesta istekla) i slično → preuzmi.
  }
  try {
    download(file);
    return "downloaded";
  } catch {
    return "failed";
  }
}

/** Sve u jednom (nacrtaj + podijeli). Na iOS-u radije prepareShareCard unaprijed + shareFile. */
export async function shareScoreCard(opts: ShareCardOptions): Promise<ShareResult> {
  try {
    const file = await prepareShareCard(opts);
    return await shareFile(file, `DRESIFY · ${opts.game}`);
  } catch {
    return "failed";
  }
}

export type ShareLinkResult = "shared" | "whatsapp" | "cancelled" | "failed";

/**
 * Podijeli LINK na igru (tekst + URL s UTM oznakama). Odvojeno od shareFile namjerno:
 * mnoge aplikacije odbace text/url kad je priložena datoteka, pa slika (za IG story)
 * i link (WhatsApp/Viber/Messenger — primatelj ima što kliknuti) idu kao dvije akcije.
 * Bez Web Share API-ja otvara WhatsApp s pripremljenom porukom.
 * @param path npr. "/kviz/" (s kosom crtom na kraju — trailingSlash: true)
 */
export async function shareLink(text: string, path: string, title = "DRESIFY"): Promise<ShareLinkResult> {
  const clean = path.startsWith("/") ? path : `/${path}`;
  const url = `https://dresifyshop.com${clean}?utm_source=share&utm_medium=game`;
  const nav = typeof navigator !== "undefined" ? navigator : null;
  try {
    if (nav?.share) {
      await nav.share({ title, text, url });
      return "shared";
    }
  } catch (err) {
    const name = (err as { name?: string })?.name;
    if (name === "AbortError") return "cancelled";
    // Ostale greške (npr. NotAllowedError) → WhatsApp kao rezerva.
  }
  try {
    const wa = `https://wa.me/?text=${encodeURIComponent(`${text} ${url}`)}`;
    const win = window.open(wa, "_blank", "noopener,noreferrer");
    if (!win) window.location.href = wa;
    return "whatsapp";
  } catch {
    return "failed";
  }
}
