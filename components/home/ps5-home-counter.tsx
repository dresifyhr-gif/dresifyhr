"use client";

import { useEffect, useRef, useState } from "react";

// Progress bar za PS5 nagradnu igru: nogometna lopta se "kotrlja" prema cilju,
// iza nje svijetli trag napretka + kratki motion-trail (brzina). Lagano (emoji
// lopta + CSS), bez teških biblioteka.
const ACCENT = "#e8ff3c";

export function Ps5HomeCounter({ current, goal }: { current: number; goal: number }) {
  const [value, setValue] = useState(0);
  const ref = useRef<HTMLDivElement>(null);
  const started = useRef(false);
  const pct = Math.min((value / goal) * 100, 100);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    const run = () => {
      if (started.current) return;
      started.current = true;
      const dur = 1400;
      let t0 = 0;
      const step = (ts: number) => {
        if (!t0) t0 = ts;
        const p = Math.min((ts - t0) / dur, 1);
        setValue(Math.round(current * (1 - Math.pow(1 - p, 3))));
        if (p < 1) requestAnimationFrame(step);
      };
      requestAnimationFrame(step);
    };
    const io = new IntersectionObserver((e) => e[0]?.isIntersecting && run(), { threshold: 0.3 });
    io.observe(node);
    return () => io.disconnect();
  }, [current]);

  return (
    <div ref={ref} className="flex w-full flex-1 items-center gap-3">
      <div className="relative h-5 flex-1">
        {/* Osnovna staza */}
        <div className="absolute inset-x-0 top-1/2 h-[3px] -translate-y-1/2 rounded-full bg-white/10" />
        {/* Trag napretka (prijeđeni put) — svijetli */}
        <div
          className="absolute top-1/2 left-0 h-[3px] -translate-y-1/2 rounded-full"
          style={{ width: `${pct}%`, background: ACCENT, boxShadow: "0 0 10px rgba(232,255,60,0.6)", transition: "width 120ms linear" }}
        />
        {/* Motion trail iza lopte (osjećaj brzine) */}
        <div
          className="absolute top-1/2 h-[7px] -translate-y-1/2 rounded-full"
          style={{
            left: `calc(${pct}% - 24px)`,
            width: "24px",
            background: `linear-gradient(to right, transparent, ${ACCENT}cc)`,
            opacity: 0.6,
            transition: "left 120ms linear"
          }}
        />
        {/* Lopta */}
        <div
          className="absolute top-1/2"
          style={{ left: `${pct}%`, transform: "translate(-50%, -50%)", transition: "left 120ms linear" }}
        >
          <span
            className="block leading-none"
            style={{ fontSize: "17px", animation: "ps5-roll 0.9s linear infinite", filter: "drop-shadow(0 0 4px rgba(232,255,60,0.5))" }}
          >
            ⚽
          </span>
        </div>
      </div>

      <span className="shrink-0 text-xs font-semibold tabular-nums text-white/75">
        <span className="sm:hidden">{Math.round(value).toLocaleString("hr-HR")}</span>
        <span className="hidden sm:inline">
          {Math.round(value).toLocaleString("hr-HR")} / {goal.toLocaleString("hr-HR")}
        </span>
      </span>

      <style>{`@keyframes ps5-roll{from{transform:rotate(0)}to{transform:rotate(360deg)}}`}</style>
    </div>
  );
}
