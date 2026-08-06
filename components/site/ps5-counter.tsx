"use client";

import { useEffect, useRef, useState } from "react";

// Animirani brojač pratitelja + kružni progress do cilja (10.000). Broj dolazi sa
// servera (live Behold); ovdje se samo animira 0 → current kad uđe u ekran.
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
          const dur = 1600;
          let t0 = 0;
          const step = (ts: number) => {
            if (!t0) t0 = ts;
            const p = Math.min((ts - t0) / dur, 1);
            const e = 1 - Math.pow(1 - p, 3);
            setValue(Math.round(current * e));
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

  return (
    <div ref={ref} className="flex flex-col items-center">
      <div className="relative h-[196px] w-[196px]">
        <svg width="196" height="196" viewBox="0 0 196 196" className="-rotate-90">
          <circle cx="98" cy="98" r={R} fill="none" stroke="#1e1e1e" strokeWidth="12" />
          <circle
            cx="98"
            cy="98"
            r={R}
            fill="none"
            stroke="#e8ff3c"
            strokeWidth="12"
            strokeLinecap="round"
            strokeDasharray={CIRC}
            strokeDashoffset={CIRC - CIRC * pct}
            style={{ transition: "stroke-dashoffset 120ms linear" }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <div className="text-4xl font-bold leading-none text-white">{value.toLocaleString("hr-HR")}</div>
          <div className="mt-1 text-[11px] text-white/50">/ {goal.toLocaleString("hr-HR")} pratitelja</div>
        </div>
      </div>
      <div className="mt-3 text-sm font-semibold text-accent">
        fali još {remaining.toLocaleString("hr-HR")} pratitelja
      </div>
    </div>
  );
}
