"use client";

import { useEffect, useRef } from "react";

// Premium pozadina naslovne za božićnu temu: spora "aurora" svjetla (smaragd, zlato,
// bordo, tek naznaka neona), zvjezdice koje trepere, svjetlosni snop, fino zrno i
// iscrtani DRESIFY. Canvas se crta samo dok je hero vidljiv; uz "smanji pokrete"
// ostaje jedan mirni kadar.
const BLOBS = [
  { c: "18,120,78", a: 0.3, r: 0.55, x: 0.1, y: 0.85, sx: 0.06, sy: 0.05, sp: 0.07 },
  { c: "227,184,92", a: 0.15, r: 0.45, x: 0.85, y: 0.2, sx: 0.05, sy: 0.06, sp: 0.09 },
  { c: "160,18,36", a: 0.16, r: 0.45, x: 0.95, y: 0.9, sx: 0.05, sy: 0.05, sp: 0.08 },
  { c: "232,255,60", a: 0.05, r: 0.35, x: 0.3, y: 0.3, sx: 0.08, sy: 0.06, sp: 0.1 }
];

export function ChristmasHeroFx() {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const c = ref.current;
    if (!c) return;
    const g = c.getContext("2d");
    if (!g) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const small = window.innerWidth < 700;
    // Mobitel: manja rezolucija i ~30 fps — izgleda isto, troši puno manje.
    const DPR = small ? 1 : Math.min(window.devicePixelRatio || 1, 1.5);
    let last = 0;
    let W = 0, H = 0, raf = 0, visible = true;
    let stars: { x: number; y: number; r: number; p: number; s: number; gold: boolean }[] = [];

    const resize = () => {
      const r = c.getBoundingClientRect();
      W = r.width; H = r.height;
      c.width = Math.round(W * DPR); c.height = Math.round(H * DPR);
      let sd = 21;
      const R = () => { sd = (sd * 16807) % 2147483647; return sd / 2147483647; };
      stars = Array.from({ length: W < 700 ? 26 : 55 }, () => ({ x: R() * W, y: R() * H * 0.9, r: 0.5 + R() * 1.1, p: R() * 6.28, s: 0.6 + R() * 1.2, gold: R() < 0.45 }));
    };

    const draw = (t: number) => {
      g.setTransform(DPR, 0, 0, DPR, 0, 0);
      g.globalCompositeOperation = "source-over";
      g.fillStyle = "#050505"; g.fillRect(0, 0, W, H);
      g.globalCompositeOperation = "screen";
      const M = Math.max(W, H);
      for (const b of BLOBS) {
        const cx = (b.x + Math.sin(t * b.sp * 6.28) * b.sx) * W, cy = (b.y + Math.cos(t * b.sp * 5.1) * b.sy) * H, r = b.r * M;
        const gd = g.createRadialGradient(cx, cy, 0, cx, cy, r);
        gd.addColorStop(0, `rgba(${b.c},${b.a})`); gd.addColorStop(0.45, `rgba(${b.c},${b.a * 0.35})`); gd.addColorStop(1, `rgba(${b.c},0)`);
        g.fillStyle = gd; g.fillRect(0, 0, W, H);
      }
      const x0 = (((t * 0.06) % 1.4) - 0.2) * W * 1.6 - W * 0.3;
      const ln = g.createLinearGradient(x0, 0, x0 + W * 0.35, H);
      ln.addColorStop(0, "rgba(255,240,200,0)"); ln.addColorStop(0.5, "rgba(255,240,200,.045)"); ln.addColorStop(1, "rgba(255,240,200,0)");
      g.fillStyle = ln; g.fillRect(0, 0, W, H);
      g.globalCompositeOperation = "lighter";
      for (const s of stars) {
        const k = Math.pow(0.5 + 0.5 * Math.sin(t * s.s + s.p), 3);
        g.globalAlpha = 0.15 + 0.75 * k; g.fillStyle = s.gold ? "#FFE3A1" : "#ffffff";
        g.beginPath(); g.arc(s.x, s.y, s.r * (1 + k * 0.6), 0, 6.283); g.fill();
        if (k > 0.8) { g.globalAlpha = (k - 0.8) * 2.2; g.fillRect(s.x - 5 * k, s.y - 0.3, 10 * k, 0.6); g.fillRect(s.x - 0.3, s.y - 5 * k, 0.6, 10 * k); }
      }
      g.globalAlpha = 1;
      g.globalCompositeOperation = "source-over";
      const vg = g.createRadialGradient(W / 2, H * 0.45, M * 0.25, W / 2, H * 0.45, M * 0.8);
      vg.addColorStop(0, "rgba(0,0,0,0)"); vg.addColorStop(1, "rgba(0,0,0,.55)");
      g.fillStyle = vg; g.fillRect(0, 0, W, H);
    };

    const start = performance.now();
    const loop = (now: number) => {
      if (!small || now - last > 32) { draw((now - start) / 1000); last = now; }
      raf = visible ? requestAnimationFrame(loop) : 0;
    };
    resize();
    if (reduce) draw(8); else raf = requestAnimationFrame(loop);
    const ro = new ResizeObserver(() => { resize(); if (reduce) draw(8); });
    ro.observe(c);
    const io = new IntersectionObserver(([e]) => {
      const was = visible; visible = e.isIntersecting;
      if (!reduce && visible && !was && !raf) raf = requestAnimationFrame(loop);
    });
    io.observe(c);
    return () => { cancelAnimationFrame(raf); ro.disconnect(); io.disconnect(); };
  }, []);

  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
      <canvas ref={ref} className="absolute inset-0 h-full w-full" />
      {/* fino zrno */}
      <div className="absolute inset-0 opacity-[0.06] mix-blend-overlay" style={{ backgroundImage: "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='160' height='160'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='.9' numOctaves='2' stitchTiles='stitch'/></filter><rect width='100%' height='100%' filter='url(%23n)'/></svg>\")" }} />
      {/* iscrtani DRESIFY */}
      <div className="xmas-ghost absolute left-0 top-[34%] whitespace-nowrap font-heading uppercase leading-[0.8] text-[62vw] lg:top-1/2 lg:text-[30vw]">
        <span>DRESIFY</span><span>DRESIFY</span><span>DRESIFY</span><span>DRESIFY</span>
      </div>
    </div>
  );
}
