"use client";

import { useMemo, useState } from "react";

const eur = (n: number) => `${(n ?? 0).toFixed(2).replace(".", ",")} €`;
const fmt = (day: string) => `${day.slice(8)}.${day.slice(5, 7)}.`;

type Point = { day: string; total: number };
type RangeKey = "week" | "month" | "3m";

const RANGES: { key: RangeKey; label: string; days: number }[] = [
  { key: "week", label: "Tjedan", days: 7 },
  { key: "month", label: "Mjesec", days: 30 },
  { key: "3m", label: "3 mjeseca", days: 90 }
];

// Interaktivni graf prometa: dropdown raspona (uvijek po danu) + klik/tap na stupac
// pokaže iznos; najjači dan u rasponu je označen (🏆, lime).
export function RevenueChart({ data }: { data: Point[] }) {
  const [range, setRange] = useState<RangeKey>("month");
  const [selRaw, setSelRaw] = useState<number | null>(null);

  const bars = useMemo(() => {
    const days = RANGES.find((r) => r.key === range)!.days;
    return data.slice(-days);
  }, [data, range]);

  const lastIdx = bars.length - 1;
  const max = Math.max(0, ...bars.map((b) => b.total));
  // Najjači dan u rasponu (prvi s najvećim iznosom > 0).
  const maxIdx = max > 0 ? bars.findIndex((b) => b.total === max) : -1;
  // Default odabran = najjači dan (da očitanje odmah pokaže rekord).
  const sel = selRaw != null && selRaw >= 0 && selRaw <= lastIdx ? selRaw : maxIdx >= 0 ? maxIdx : lastIdx;
  const selBar = sel >= 0 ? bars[sel] : null;

  const gapClass = bars.length > 45 ? "gap-px" : bars.length > 14 ? "gap-0.5" : "gap-1";
  const step = Math.max(1, Math.ceil(bars.length / 7));

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div className="inline-flex gap-1 rounded-[10px] bg-[var(--a-surface-2)] p-1">
          {RANGES.map((r) => (
            <button
              key={r.key}
              type="button"
              onClick={() => {
                setRange(r.key);
                setSelRaw(null);
              }}
              className={`rounded-[8px] px-2.5 py-1 text-[12px] font-semibold transition ${range === r.key ? "bg-[var(--a-card)] text-[var(--a-text)] shadow-sm" : "text-[var(--a-text-2)] hover:text-[var(--a-text)]"}`}
            >
              {r.label}
            </button>
          ))}
        </div>
        {selBar && (
          <div className="text-right">
            <div className="text-[11px] text-[var(--a-text-3)]">{sel === maxIdx ? `🏆 najjači · ${fmt(selBar.day)}` : fmt(selBar.day)}</div>
            <div className="text-[18px] font-bold tabular-nums text-[var(--a-text)]">{eur(selBar.total)}</div>
          </div>
        )}
      </div>

      <div className={`flex h-40 items-stretch ${gapClass}`}>
        {bars.map((d, i) => {
          const active = i === sel;
          const isMax = i === maxIdx;
          const color = active ? "bg-[var(--a-good)]" : isMax ? "bg-[var(--a-accent)]" : "bg-[var(--a-text)] opacity-80";
          return (
            <button
              key={`${d.day}-${i}`}
              type="button"
              onClick={() => setSelRaw(i)}
              onMouseEnter={() => setSelRaw(i)}
              title={`${fmt(d.day)} ${eur(d.total)}${isMax ? " · najjači" : ""}`}
              className="flex min-w-0 flex-1 cursor-pointer flex-col items-center gap-1 border-0 bg-transparent p-0"
            >
              <span className="flex w-full flex-1 items-end">
                <span
                  className={`w-full rounded-t transition-colors ${color}`}
                  style={{ height: `${max > 0 ? Math.round((d.total / max) * 100) : 0}%`, minHeight: d.total > 0 ? 3 : 0 }}
                />
              </span>
              <span className={`h-3 whitespace-nowrap text-[9px] ${active || isMax ? "font-bold text-[var(--a-text)]" : "text-[var(--a-text-3)]"}`}>
                {isMax ? "🏆" : i % step === 0 ? fmt(d.day) : ""}
              </span>
            </button>
          );
        })}
      </div>
      <p className="mt-2 text-[11px] text-[var(--a-text-3)]">Klikni stupac za iznos tog dana · 🏆 = najjači dan u rasponu.</p>
    </div>
  );
}
