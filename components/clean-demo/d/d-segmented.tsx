"use client";

import { useLayoutEffect, useRef, useState } from "react";

/* iOS-stil: vodoravni niz čistog teksta, bez pilula i okvira. Aktivna stavka je bijela,
   ispod nje klizi tanka limeta crta (neon: odabrano = limeta crta). Hairline ispod cijelog niza. */
export function DSegmented<K extends string>({
  options,
  value,
  onChange,
  label = "Filtar",
}: {
  options: { key: K; label: string; count?: number }[];
  value: K;
  onChange: (k: K) => void;
  label?: string;
}) {
  const scRef = useRef<HTMLDivElement>(null);
  const btns = useRef(new Map<K, HTMLButtonElement>());
  const [bar, setBar] = useState<{ x: number; w: number } | null>(null);

  useLayoutEffect(() => {
    const place = () => {
      const b = btns.current.get(value);
      if (!b) return;
      setBar({ x: b.offsetLeft + 0, w: b.offsetWidth });
    };
    place();
    const sc = scRef.current;
    const b = btns.current.get(value);
    if (sc && b) {
      const target = b.offsetLeft + b.offsetWidth / 2 - sc.clientWidth / 2;
      sc.scrollTo({ left: Math.max(0, target), behavior: "smooth" });
    }
    window.addEventListener("resize", place);
    return () => window.removeEventListener("resize", place);
  }, [value, options.length]);

  return (
    <div className="relative border-b border-[#ffffff14]">
      <div
        ref={scRef}
        role="tablist"
        aria-label={label}
        className="relative flex overflow-x-auto px-3 [mask-image:linear-gradient(90deg,#000_calc(100%-40px),transparent)] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {options.map((o) => {
          const on = o.key === value;
          return (
            <button
              key={o.key}
              ref={(el) => {
                if (el) btns.current.set(o.key, el);
                else btns.current.delete(o.key);
              }}
              type="button"
              role="tab"
              aria-selected={on}
              onClick={() => onChange(o.key)}
              className={`relative h-11 shrink-0 whitespace-nowrap px-2.5 text-[14.5px] transition-colors duration-200 ${
                on ? "font-medium text-white" : "text-[#ffffff73] active:text-white"
              }`}
            >
              {o.label}
              {typeof o.count === "number" ? <span className={`ml-1 text-[11px] tabular-nums ${on ? "text-white/45" : "text-white/25"}`}>{o.count}</span> : null}
            </button>
          );
        })}
        <span aria-hidden className="w-2 shrink-0" />
        {bar ? (
          <span
            aria-hidden
            className="pointer-events-none absolute bottom-0 left-0 h-[2px] bg-[#e8ff3c] shadow-[0_0_8px_rgba(232,255,60,.6)] transition-[transform,width] duration-300 ease-[cubic-bezier(.32,.72,0,1)]"
            style={{ width: bar.w - 20, transform: `translateX(${bar.x + 10}px)` }}
          />
        ) : null}
      </div>
    </div>
  );
}
