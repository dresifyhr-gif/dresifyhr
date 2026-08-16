"use client";

import { useEffect, useRef, useState } from "react";

// Premium animirani prsten pratitelja: broj broji 0 → current, luk se puni s glow-om,
// svijetleća točka klizi po vrhu napretka, pulsirajući sjaj iza. Sve GPU-jeftino.
export function Ps5Counter({ current, goal = 10000 }: { current: number; goal?: number }) {
  const [value, setValue] = useState(0);
  const ref = useRef<HTMLDivElement>(null);
  const started = useRef(false);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    const io = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting && !started.current) {
          started.current = true;
          const dur = 1800;
          let t0 = 0;
          const step = (ts: number) => {
            if (!t0) t0 = ts;
            const p = Math.min((ts - t0) / dur, 1);
            setValue(Math.round(current * (1 - Math.pow(1 - p, 3))));
            if (p < 1) requestAnimationFrame(step);
          };
          requestAnimationFrame(step);
        }
      },
      { threshold: 0.4 }
    );
    io.observe(node);
    return () => io.disconnect();
  }, [current]);

  const pct = Math.min(value / goal, 1);
  const remaining = Math.max(goal - current, 0);
  const R = 82;
  const CIRC = 2 * Math.PI * R;
  // Kut vrha napretka (počinje na vrhu, ide u smjeru kazaljke) → svijetleća točka.
  const ang = (-90 + pct * 360) * (Math.PI / 180);
  const dotX = 98 + R * Math.cos(ang);
  const dotY = 98 + R * Math.sin(ang);

  return (
    <div ref={ref} className="relative flex flex-col items-center">
      {/* Pulsirajući sjaj iza prstena */}
      <div
        aria-hidden
        className="ps5-neon pointer-events-none absolute left-1/2 top-[98px] h-[240px] w-[240px] -translate-x-1/2 -translate-y-1/2 rounded-full"
        style={{ background: "radial-gradient(circle, rgba(232,255,60,0.5), transparent 65%)" }}
      />

      <div className="relative h-[220px] w-[220px]">
        <svg width="220" height="220" viewBox="0 0 196 196" className="h-full w-full">
          <defs>
            <linearGradient id="ps5arc" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#c9e800" />
              <stop offset="100%" stopColor="#e8ff3c" />
            </linearGradient>
          </defs>
          <circle cx="98" cy="98" r={R} fill="none" stroke="#1c1c1c" strokeWidth="10" transform="rotate(-90 98 98)" />
          <circle
            cx="98"
            cy="98"
            r={R}
            fill="none"
            stroke="url(#ps5arc)"
            strokeWidth="10"
            strokeLinecap="round"
            strokeDasharray={CIRC}
            strokeDashoffset={CIRC - CIRC * pct}
            transform="rotate(-90 98 98)"
            style={{ filter: "drop-shadow(0 0 6px rgba(232,255,60,0.85))", transition: "stroke-dashoffset 120ms linear" }}
          />
        </svg>
        {/* ⚽ Lopta na vrhu napretka — kotrlja se oko prstena do cilja (kao na naslovnoj) */}
        {pct > 0.02 && (
          <span
            aria-hidden
            className="pointer-events-none absolute"
            style={{
              left: `${(dotX * 220) / 196}px`,
              top: `${(dotY * 220) / 196}px`,
              transform: "translate(-50%, -50%)",
              fontSize: "22px",
              lineHeight: 1,
              filter: "drop-shadow(0 0 8px rgba(232,255,60,0.9))",
              animation: "ps5-ballspin 0.9s linear infinite",
              transition: "left 120ms linear, top 120ms linear"
            }}
          >
            ⚽
          </span>
        )}
        <style>{`@keyframes ps5-ballspin{from{transform:translate(-50%,-50%) rotate(0)}to{transform:translate(-50%,-50%) rotate(360deg)}}`}</style>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <div
            className="text-[40px] font-black leading-none tracking-tight text-white tabular-nums"
            style={{ textShadow: "0 0 22px rgba(232,255,60,0.35)" }}
          >
            {value.toLocaleString("hr-HR")}
          </div>
          <div className="mt-1.5 text-[10px] font-semibold uppercase tracking-[0.2em] text-accent">pratitelja</div>
          <div className="text-[10px] text-white/35">cilj {goal.toLocaleString("hr-HR")}</div>
        </div>
      </div>

      <div className="mt-4 rounded-full border border-accent/30 bg-accent/[0.08] px-4 py-1.5 text-sm font-bold text-accent">
        fali još {remaining.toLocaleString("hr-HR")} do PS5 izvlačenja
      </div>
    </div>
  );
}
