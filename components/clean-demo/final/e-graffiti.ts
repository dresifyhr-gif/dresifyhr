import type { GraffitiArt } from "@/components/naslovnica/three/graffiti";

/* ------------------------------------------------------------------ */
/*  Smjer E — grafit NIJE slika: u pregledniku se "sprejom" boji preko  */
/*  vektorskih kostura slova (public/naslovnica/graffiti/v3 — samo       */
/*  obrisi, bez rastera). Slojevi kao pravi zidni komad:                 */
/*   1. magla spreja (overspray) samo oko vanjskog ruba                  */
/*   2. 3D blok (izvlačenje dolje-desno) + meka sjena na betonu          */
/*   3. tamni obrub (outline)                                            */
/*   4. puna, neprozirna ispuna — čista jezgra, blagi prijelaz tona,     */
/*      svjetliji rub gore-lijevo i sjena dolje-desno (volumen)          */
/*   5. kapljice, prskanje, krunica i dva slobodna poteza (slash)        */
/*  Sve je deterministično (isti vektori + isto sjeme → isti grafit).    */
/* ------------------------------------------------------------------ */

const SRC = "/naslovnica/graffiti/v3/dresify-piece-v3.svg";
const SVG_W = 4096;
const SVG_H = 2048;

type Shape = { d: string; fill: string };
export type GraffitiPaths = { crown: Shape[]; dres: Shape[]; ify: Shape[]; splatter: Shape[]; drips: Shape[] };

let cache: Promise<GraffitiPaths> | null = null;

/** Učita i raščlani vektorske slojeve (jednom po stranici). */
export function loadGraffitiPaths(): Promise<GraffitiPaths> {
  if (!cache) {
    cache = fetch(SRC)
      .then((r) => {
        if (!r.ok) throw new Error(`graffiti ${r.status}`);
        return r.text();
      })
      .then((txt) => {
        const doc = new DOMParser().parseFromString(txt, "image/svg+xml");
        const layer = (id: string): Shape[] =>
          Array.from(doc.querySelectorAll(`#layer-${id} path`)).map((p) => ({
            d: p.getAttribute("d") || "",
            fill: p.getAttribute("fill") || p.parentElement?.getAttribute("fill") || "#ffffff",
          }));
        const out = { crown: layer("crown"), dres: layer("dres"), ify: layer("ify"), splatter: layer("splatter"), drips: layer("drips") };
        if (!out.dres.length || !out.ify.length) throw new Error("graffiti: no letters");
        return out;
      });
    cache.catch(() => {
      cache = null;
    });
  }
  return cache;
}

function rng(seed: number) {
  let s = seed >>> 0 || 1;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

const WHITE_TOP = "#f6f6f2";
const WHITE_BOT = "#d7d7d1";
const NEON_TOP = "#eeff57";
const NEON_BOT = "#c3dd22";
const NEON = "#e4ff3a";

/** Naslikaj DRESIFY na platno širine W (visina W/2) → GraffitiArt (isti oblik kao enginov PNG). */
export function paintGraffiti(W: number, paths: GraffitiPaths, seed = 7): GraffitiArt {
  const H = Math.round(W / 2);
  const k = W / SVG_W; // svg jedinica → px
  const c = document.createElement("canvas");
  c.width = W;
  c.height = H;
  const g = c.getContext("2d")!;
  g.setTransform(k, 0, 0, k, 0, 0);

  const P = (s: Shape[]) => s.map((x) => new Path2D(x.d));
  const dres = P(paths.dres);
  const ify = P(paths.ify);
  const crown = P(paths.crown);
  const letters = [...dres, ...ify];
  const all = [...letters, ...crown];
  const fillAll = (ps: Path2D[], style: string | CanvasGradient) => {
    g.fillStyle = style;
    for (const p of ps) g.fill(p, "evenodd");
  };
  const strokeAll = (ps: Path2D[], style: string, w: number) => {
    g.strokeStyle = style;
    g.lineWidth = w;
    g.lineJoin = "round";
    g.lineCap = "round";
    for (const p of ps) g.stroke(p);
  };
  // okvir slova (svg jedinice) — za prijelaze tona
  const Y0 = 700;
  const Y1 = 1640;

  // 1) magla spreja: samo oko vanjskog ruba (zamućena ispuna, slaba), boja svakog dijela
  g.save();
  g.filter = `blur(${Math.max(3, 26 * k).toFixed(1)}px)`;
  g.globalAlpha = 0.26;
  fillAll(dres, "#e9e9e4");
  fillAll([...ify, ...crown], NEON);
  g.restore();

  // 2) meka sjena na betonu (svjetlo gore-lijevo) + 3D blok
  g.save();
  g.filter = `blur(${Math.max(2, 18 * k).toFixed(1)}px)`;
  g.globalAlpha = 0.7;
  g.translate(46, 58);
  fillAll(all, "#000");
  g.restore();
  const steps = 18;
  for (let i = steps; i >= 1; i--) {
    const t = i / steps;
    g.save();
    g.translate(2.3 * i, 2.9 * i);
    // blok: tamnosiv prema crnom na dnu (svjetlo odozgo)
    const v = Math.round(30 - 18 * t);
    fillAll(all, `rgb(${v},${v},${v + 1})`);
    g.restore();
  }

  // 3) tamni obrub (ispod ispune → s vanjske strane ostaje ~ pola debljine)
  strokeAll(all, "#060606", 34);

  // 4) ispuna: neprozirna, vertikalni prijelaz tona
  const gw = g.createLinearGradient(0, Y0, 0, Y1);
  gw.addColorStop(0, WHITE_TOP);
  gw.addColorStop(0.55, "#ebebe6");
  gw.addColorStop(1, WHITE_BOT);
  fillAll(dres, gw);
  const gn = g.createLinearGradient(0, Y0 - 220, 0, Y1);
  gn.addColorStop(0, NEON_TOP);
  gn.addColorStop(0.6, NEON);
  gn.addColorStop(1, NEON_BOT);
  fillAll([...ify, ...crown], gn);

  // volumen unutar slova: svjetliji rub gore-lijevo, sjena dolje-desno, sitno "zrno" spreja
  const bevel = (ps: Path2D[], light: string, dark: string) => {
    for (const p of ps) {
      g.save();
      g.clip(p, "evenodd");
      g.save();
      g.translate(14, 16);
      g.strokeStyle = light;
      g.lineWidth = 16;
      g.stroke(p);
      g.restore();
      g.save();
      g.translate(-12, -14);
      g.strokeStyle = dark;
      g.lineWidth = 22;
      g.filter = `blur(${Math.max(1, 6 * k).toFixed(1)}px)`;
      g.stroke(p);
      g.restore();
      g.restore();
    }
  };
  bevel(dres, "rgba(255,255,255,0.75)", "rgba(40,40,36,0.32)");
  bevel(ify, "rgba(250,255,200,0.7)", "rgba(60,80,0,0.35)");

  // mekane mrlje tona unutar ispune (sprej nikad nije savršeno ravan) — niske amplitude
  const r = rng(seed);
  for (const [ps, tints] of [
    [dres, ["rgba(255,255,255,0.10)", "rgba(150,150,140,0.10)"]],
    [ify, ["rgba(255,255,190,0.10)", "rgba(120,150,0,0.10)"]],
  ] as [Path2D[], string[]][]) {
    for (const p of ps) {
      g.save();
      g.clip(p, "evenodd");
      for (let i = 0; i < 26; i++) {
        const x = 600 + r() * 3200;
        const y = Y0 + r() * (Y1 - Y0);
        const rad = 60 + r() * 180;
        const gr = g.createRadialGradient(x, y, 0, x, y, rad);
        const col = tints[i % 2];
        gr.addColorStop(0, col);
        gr.addColorStop(1, col.replace(/[\d.]+\)$/, "0)"));
        g.fillStyle = gr;
        g.fillRect(x - rad, y - rad, rad * 2, rad * 2);
      }
      g.restore();
    }
  }

  // 5) slobodni potezi (slash): tanki neonski zamah iznad IFY i bijeli dvostruki ispod DRES
  const slash = (pts: [number, number][], w0: number, col: string, alpha: number) => {
    // sužen potez: poligon oko krivulje (debljina pada prema kraju)
    const N = 40;
    const at = (t: number): [number, number] => {
      const [a, b, cc] = pts;
      const u = 1 - t;
      return [u * u * a[0] + 2 * u * t * b[0] + t * t * cc[0], u * u * a[1] + 2 * u * t * b[1] + t * t * cc[1]];
    };
    const L: [number, number][] = [];
    const R: [number, number][] = [];
    for (let i = 0; i <= N; i++) {
      const t = i / N;
      const p = at(t);
      const q = at(Math.min(1, t + 1e-3));
      const o = at(Math.max(0, t - 1e-3));
      let nx = -(q[1] - o[1]);
      let ny = q[0] - o[0];
      const nl = Math.hypot(nx, ny) || 1;
      nx /= nl;
      ny /= nl;
      const w = w0 * Math.pow(Math.sin(Math.PI * Math.min(1, t * 1.15 + 0.04)), 0.6) * (1 - 0.65 * t);
      L.push([p[0] + nx * w, p[1] + ny * w]);
      R.push([p[0] - nx * w, p[1] - ny * w]);
    }
    g.save();
    g.globalAlpha = alpha;
    g.beginPath();
    g.moveTo(L[0][0], L[0][1]);
    for (const p of L) g.lineTo(p[0], p[1]);
    for (let i = R.length - 1; i >= 0; i--) g.lineTo(R[i][0], R[i][1]);
    g.closePath();
    g.fillStyle = "#050505";
    g.save();
    g.translate(10, 12);
    g.fill();
    g.restore();
    g.fillStyle = col;
    g.fill();
    g.restore();
  };
  slash([[3160, 700], [3480, 610], [3800, 560]], 11, NEON, 0.95);
  slash([[560, 1700], [1150, 1655], [1760, 1690]], 9, "#e6e6e1", 0.9);
  slash([[640, 1752], [1100, 1722], [1480, 1745]], 6, "#e6e6e1", 0.75);

  // 6) kapljice (iz donjih rubova, preko šipke) i prskanje — iz vektorskih slojeva
  for (const s of paths.drips) {
    const p = new Path2D(s.d);
    g.save();
    g.translate(5, 6);
    g.fillStyle = "rgba(0,0,0,0.55)";
    g.fill(p, "evenodd");
    g.restore();
    g.fillStyle = s.fill;
    g.fill(p, "evenodd");
  }
  g.save();
  g.globalAlpha = 0.9;
  for (const s of paths.splatter) {
    g.fillStyle = s.fill;
    g.fill(new Path2D(s.d), "evenodd");
  }
  g.restore();

  g.setTransform(1, 0, 0, 1, 0, 0);
  void SVG_H;
  return analyse(c);
}

// Profil pokrivenosti po recima (kao enginov analyse): tijelo slova, kapljice, neon.
function analyse(c: HTMLCanvasElement): GraffitiArt {
  const w = 256;
  const h = Math.max(8, Math.round((256 * c.height) / c.width));
  const t = document.createElement("canvas");
  t.width = w;
  t.height = h;
  const g = t.getContext("2d", { willReadFrequently: true })!;
  g.drawImage(c, 0, 0, w, h);
  const d = g.getImageData(0, 0, w, h).data;
  const cov = new Float32Array(h);
  for (let y = 0; y < h; y++) {
    let s = 0;
    for (let x = 0; x < w; x++) s += d[(y * w + x) * 4 + 3] / 255;
    cov[y] = s / w;
  }
  let mx = 0;
  for (const v of cov) mx = Math.max(mx, v);
  let y0 = 0;
  let y1 = h - 1;
  while (y0 < h - 1 && cov[y0] < mx * 0.3) y0++;
  while (y1 > 0 && cov[y1] < mx * 0.3) y1--;
  let ye = 0;
  while (ye < h - 1 && cov[ye] < mx * 0.02) ye++;
  const neon = new Float32Array(w);
  for (let y = y0; y <= y1; y++)
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4;
      if (d[i + 3] > 128 && d[i + 1] > 120 && d[i + 1] > d[i + 2] * 1.8 && d[i] > d[i + 2] * 1.5) neon[x]++;
    }
  let nm = 0;
  for (const v of neon) nm = Math.max(nm, v);
  let nx0 = 0;
  let nx1 = w - 1;
  while (nx0 < w - 1 && neon[nx0] < nm * 0.25) nx0++;
  while (nx1 > 0 && neon[nx1] < nm * 0.25) nx1--;
  const ok = nm > 0 && nx1 > nx0;
  return {
    canvas: c,
    aspect: c.width / c.height,
    top: 1 - y0 / h,
    base: 1 - (y1 + 1) / h,
    ext: 1 - ye / h,
    lumKey: false,
    neonX0: ok ? nx0 / w : 0.6,
    neonX1: ok ? (nx1 + 1) / w : 0.92,
  };
}
