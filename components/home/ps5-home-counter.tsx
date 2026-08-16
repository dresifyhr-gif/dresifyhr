"use client";

import { useEffect, useRef, useState } from "react";

// Pac-Man progress bar za PS5 nagradnu igru: Pac-Man "jede" točkice kako raste
// broj pratitelja. Točkice ispred su na fiksnoj mreži, a mask ih sakrije iza
// Pac-Mana (pojedene). Lagano (CSS mask + clip-path), bez teških biblioteka.
const ACCENT = "#e8ff3c";
// Pac-Man usta: zatvorena (0/100%) ↔ otvorena (50%) — chomp animacija.
const MOUTH_OPEN = "polygon(100% 22%, 46% 50%, 100% 78%, 100% 100%, 0 100%, 0 0, 100% 0)";
const MOUTH_SHUT = "polygon(100% 47%, 52% 50%, 100% 53%, 100% 100%, 0 100%, 0 0, 100% 0)";

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

  const eatMask = `linear-gradient(to right, transparent ${pct}%, #000 ${pct}%)`;

  return (
    <div ref={ref} className="flex w-full flex-1 items-center gap-3">
      <div className="relative h-5 flex-1">
        {/* Točkice (fiksna mreža); mask sakriva pojedene iza Pac-Mana */}
        <div
          className="absolute inset-0 rounded-full"
          style={{
            backgroundImage: `radial-gradient(circle at center, ${ACCENT} 1.9px, transparent 2.3px)`,
            backgroundSize: "13px 100%",
            backgroundPosition: "center",
            backgroundRepeat: "repeat-x",
            opacity: 0.55,
            maskImage: eatMask,
            WebkitMaskImage: eatMask
          }}
        />
        {/* Trag napretka (pojedeni dio) — tanka linija iza Pac-Mana */}
        <div
          className="absolute top-1/2 left-0 h-[3px] -translate-y-1/2 rounded-full"
          style={{ width: `${pct}%`, background: `${ACCENT}44`, transition: "width 120ms linear" }}
        />
        {/* Pac-Man */}
        <div
          className="absolute top-1/2"
          style={{ left: `${pct}%`, transform: "translate(-50%, -50%)", transition: "left 120ms linear" }}
        >
          <span
            className="block h-[18px] w-[18px]"
            style={{
              background: ACCENT,
              borderRadius: "50%",
              clipPath: MOUTH_OPEN,
              animation: "ps5-chomp 0.42s steps(1, end) infinite",
              filter: "drop-shadow(0 0 5px rgba(232,255,60,0.6))"
            }}
          />
        </div>
      </div>

      <span className="shrink-0 text-xs font-semibold tabular-nums text-white/75">
        {Math.round(value).toLocaleString("hr-HR")} / {goal.toLocaleString("hr-HR")}
      </span>

      <style>{`@keyframes ps5-chomp{0%{clip-path:${MOUTH_OPEN}}50%{clip-path:${MOUTH_SHUT}}100%{clip-path:${MOUTH_OPEN}}}`}</style>
    </div>
  );
}
