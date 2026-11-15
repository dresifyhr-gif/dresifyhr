// Zajednički alati za canvas igre: fontovi brenda, easing, čestice, trešnja
// ekrana, učitavanje slika. Bez Reacta — koristi se iz render/update petlje.

export const BRAND = {
  bg: "#0a0a0a",
  accent: "#e8ff3c",
  accentRgb: "232,255,60",
  white: "#ffffff"
} as const;

// ── Fontovi ──────────────────────────────────────────────────────────────
// next/font daje hashirana imena obitelji (npr. "__Bebas_Neue_3f2a1c"); čitamo
// ih iz CSS varijabli da canvas crta istim fontom kao ostatak stranice.
let fontCache: { heading: string; body: string } | null = null;

function readFamilies() {
  if (fontCache) return fontCache;
  if (typeof document === "undefined") return { heading: "Impact, sans-serif", body: "system-ui, sans-serif" };
  const cs = getComputedStyle(document.body);
  const heading = cs.getPropertyValue("--font-bebas").trim() || "Impact, sans-serif";
  const body = cs.getPropertyValue("--font-barlow").trim() || "system-ui, sans-serif";
  fontCache = { heading, body };
  return fontCache;
}

/** CSS font string za ctx.font, npr. brandFont("heading", 48) ili brandFont("body", 14, 700). */
export function brandFont(kind: "heading" | "body", px: number, weight = kind === "heading" ? 400 : 600) {
  const f = readFamilies();
  return `${weight} ${Math.round(px)}px ${kind === "heading" ? f.heading : f.body}`;
}

/** Pričeka da se fontovi brenda učitaju (prije prvog crtanja teksta na canvas). */
export async function ensureBrandFonts() {
  if (typeof document === "undefined" || !document.fonts) return;
  try {
    await Promise.all([
      document.fonts.load(brandFont("heading", 64)),
      document.fonts.load(brandFont("body", 16, 600)),
      document.fonts.load(brandFont("body", 16, 800))
    ]);
  } catch {}
}

// ── Matematika i easing ─────────────────────────────────────────────────
export const clamp = (v: number, a: number, b: number) => (v < a ? a : v > b ? b : v);
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
export const rand = (a: number, b: number) => a + Math.random() * (b - a);
/** Glatko približavanje neovisno o FPS-u: x = damp(x, cilj, 12, dt). */
export const damp = (a: number, b: number, lambda: number, dt: number) => lerp(a, b, 1 - Math.exp(-lambda * dt));

export const ease = {
  outCubic: (t: number) => 1 - Math.pow(1 - t, 3),
  inOutCubic: (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2),
  outQuint: (t: number) => 1 - Math.pow(1 - t, 5),
  outExpo: (t: number) => (t === 1 ? 1 : 1 - Math.pow(2, -10 * t)),
  outBack: (t: number) => {
    const c1 = 1.70158, c3 = c1 + 1;
    return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
  },
  outElastic: (t: number) =>
    t === 0 || t === 1 ? t : Math.pow(2, -10 * t) * Math.sin((t * 10 - 0.75) * ((2 * Math.PI) / 3)) + 1
};

// ── Crtanje ─────────────────────────────────────────────────────────────
export function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  const rr = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + rr, y);
  ctx.arcTo(x + w, y, x + w, y + h, rr);
  ctx.arcTo(x + w, y + h, x, y + h, rr);
  ctx.arcTo(x, y + h, x, y, rr);
  ctx.arcTo(x, y, x + w, y, rr);
  ctx.closePath();
}

/** Mekana elipsa sjene ispod objekta. */
export function softShadow(ctx: CanvasRenderingContext2D, x: number, y: number, rx: number, ry: number, alpha = 0.45) {
  const g = ctx.createRadialGradient(x, y, 0, x, y, rx);
  g.addColorStop(0, `rgba(0,0,0,${alpha})`);
  g.addColorStop(1, "rgba(0,0,0,0)");
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(1, ry / rx);
  ctx.translate(-x, -y);
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(x, y, rx, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

// ── Slike ───────────────────────────────────────────────────────────────
const imgCache = new Map<string, Promise<HTMLImageElement>>();

export function loadImage(src: string): Promise<HTMLImageElement> {
  const hit = imgCache.get(src);
  if (hit) return hit;
  const p = new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image();
    img.decoding = "async";
    img.onload = () => resolve(img);
    img.onerror = () => {
      imgCache.delete(src);
      reject(new Error(`image ${src}`));
    };
    img.src = src;
  });
  imgCache.set(src, p);
  return p;
}

// ── Čestice ─────────────────────────────────────────────────────────────
type Particle = {
  x: number; y: number; vx: number; vy: number;
  life: number; max: number; size: number; color: string;
  gravity: number; drag: number; shape: "dot" | "spark" | "confetti"; rot: number; vr: number;
};

export type BurstOptions = {
  count?: number;
  colors?: string[];
  speed?: [number, number];
  size?: [number, number];
  life?: [number, number];
  gravity?: number;
  drag?: number;
  /** Smjer u radijanima i raspon (default: svi smjerovi). */
  angle?: number;
  spread?: number;
  shape?: Particle["shape"];
};

/**
 * Lagani sustav čestica s fiksnim maksimumom (bez alokacija u petlji preko limita).
 *   const fx = createParticles(); fx.burst(x, y, { colors: [BRAND.accent] });
 *   update: fx.update(dt);  render: fx.draw(ctx);
 */
export function createParticles(maxParticles = 260) {
  const list: Particle[] = [];
  return {
    get count() {
      return list.length;
    },
    burst(x: number, y: number, o: BurstOptions = {}) {
      const n = o.count ?? 18;
      const cols = o.colors ?? [BRAND.accent, "#ffffff"];
      for (let i = 0; i < n; i++) {
        if (list.length >= maxParticles) list.shift();
        const a = o.angle !== undefined ? o.angle + (Math.random() - 0.5) * (o.spread ?? Math.PI * 2) : Math.random() * Math.PI * 2;
        const sp = rand(...(o.speed ?? [80, 320]));
        list.push({
          x, y,
          vx: Math.cos(a) * sp,
          vy: Math.sin(a) * sp,
          life: 0,
          max: rand(...(o.life ?? [0.45, 0.9])),
          size: rand(...(o.size ?? [2, 4.5])),
          color: cols[(Math.random() * cols.length) | 0],
          gravity: o.gravity ?? 520,
          drag: o.drag ?? 2.2,
          shape: o.shape ?? "dot",
          rot: Math.random() * Math.PI,
          vr: rand(-10, 10)
        });
      }
    },
    update(dt: number) {
      for (let i = list.length - 1; i >= 0; i--) {
        const p = list[i];
        p.life += dt;
        if (p.life >= p.max) {
          list.splice(i, 1);
          continue;
        }
        const k = Math.exp(-p.drag * dt);
        p.vx *= k;
        p.vy = p.vy * k + p.gravity * dt;
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.rot += p.vr * dt;
      }
    },
    draw(ctx: CanvasRenderingContext2D) {
      for (const p of list) {
        const t = p.life / p.max;
        ctx.globalAlpha = 1 - t * t;
        ctx.fillStyle = p.color;
        if (p.shape === "spark") {
          ctx.strokeStyle = p.color;
          ctx.lineWidth = p.size * 0.6;
          ctx.lineCap = "round";
          ctx.beginPath();
          ctx.moveTo(p.x, p.y);
          ctx.lineTo(p.x - p.vx * 0.035, p.y - p.vy * 0.035);
          ctx.stroke();
        } else if (p.shape === "confetti") {
          ctx.save();
          ctx.translate(p.x, p.y);
          ctx.rotate(p.rot);
          ctx.fillRect(-p.size, -p.size * 0.45, p.size * 2, p.size * 0.9);
          ctx.restore();
        } else {
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size * (1 - t * 0.5), 0, Math.PI * 2);
          ctx.fill();
        }
      }
      ctx.globalAlpha = 1;
    },
    clear() {
      list.length = 0;
    }
  };
}

export type Particles = ReturnType<typeof createParticles>;

// ── Trešnja ekrana (trauma model, umjereno) ─────────────────────────────
/**
 *   const shake = createShake();  shake.add(0.4)  // 0..1
 *   update: shake.update(dt);  render: ctx.save(); shake.apply(ctx, w / 2, h / 2); ...; ctx.restore();
 */
export function createShake(maxOffset = 10, maxAngle = 0.012) {
  let trauma = 0;
  let t = 0;
  return {
    add(amount: number) {
      trauma = clamp(trauma + amount, 0, 1);
    },
    update(dt: number) {
      t += dt;
      trauma = Math.max(0, trauma - dt * 1.6);
    },
    /** cx/cy = središte rotacije (obično w/2, h/2). */
    apply(ctx: CanvasRenderingContext2D, cx = 0, cy = 0) {
      if (trauma <= 0) return;
      const s = trauma * trauma;
      const nx = Math.sin(t * 61.3) * 0.6 + Math.sin(t * 37.1) * 0.4;
      const ny = Math.sin(t * 53.7 + 1.3) * 0.6 + Math.sin(t * 29.9 + 0.7) * 0.4;
      const na = Math.sin(t * 47.9 + 2.1);
      ctx.translate(cx + nx * maxOffset * s, cy + ny * maxOffset * s);
      ctx.rotate(na * maxAngle * s);
      ctx.translate(-cx, -cy);
    },
    get value() {
      return trauma;
    },
    reset() {
      trauma = 0;
    }
  };
}
