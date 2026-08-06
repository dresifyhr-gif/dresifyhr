"use client";

import { useEffect, useRef, useState } from "react";

// Animirani counter za naslovnu traku: broj broji do trenutnog, bar se puni, "live" točka pulsira.
export function Ps5HomeCounter({ current, goal }: { current: number; goal: number }) {
  const [value, setValue] = useState(0);
  const ref = useRef<HTMLDivElement>(null);
  const started = useRef(false);
  const pct = Math.min(Math.round((value / goal) * 100), 100);

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
      <div className="relative h-2 flex-1 overflow-hidden rounded-full bg-white/10">
        <div
          className="h-full rounded-full bg-accent"
          style={{ width: `${pct}%`, transition: "width 120ms linear", boxShadow: "0 0 10px rgba(232,255,60,0.6)" }}
        />
      </div>
      <span className="shrink-0 text-xs font-semibold text-white/75 tabular-nums">
        {value.toLocaleString("hr-HR")} / {goal.toLocaleString("hr-HR")}
      </span>
    </div>
  );
}
