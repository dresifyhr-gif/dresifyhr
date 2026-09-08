"use client";

import { useMemo, useState } from "react";

const eur = (n: number) => `${(n ?? 0).toFixed(2).replace(".", ",")} €`;
const fmt = (day: string) => `${day.slice(8)}.${day.slice(5, 7)}.`;

type Point = { day: string; total: number };
type Bar = Point & { weekly: boolean };
type RangeKey = "week" | "month" | "3m";

const RANGES: { key: RangeKey; label: string }[] = [
  { key: "week", label: "Tjedan" },
  { key: "month", label: "Mjesec" },
  { key: "3m", label: "3 mjeseca" }
];

// Tjedan = zadnjih 7 dana; Mjesec = zadnjih 30 dana; 3 mjeseca = 12 tjednih koševa.
function bucketize(data: Point[], range: RangeKey): Bar[] {
  if (range === "week") return data.slice(-7).map((d) => ({ ...d, weekly: false }));
  if (range === "month") return data.slice(-30).map((d) => ({ ...d, weekly: false }));
  const last = data.slice(-84);
  const weeks: Bar[] = [];
  for (let i = 0; i < last.length; i += 7) {
    const chunk = last.slice(i, i + 7);
    if (!chunk.length) continue;
    weeks.push({ day: chunk[0].day, total: chunk.reduce((s, d) => s + d.total, 0), weekly: true });
  }
  return weeks;
}

// Interaktivni graf prometa: dropdown raspona + klik/tap na stupac pokaže iznos.
export function RevenueChart({ data }: { data: Point[] }) {
  const [range, setRange] = useState<RangeKey>("month");
  const [selRaw, setSelRaw] = useState<number | null>(null);

  const bars = useMemo(() => bucketize(data, range), [data, range]);
  const lastIdx = bars.length - 1;
  const sel = selRaw != null && selRaw <= lastIdx ? selRaw : lastIdx;
  const selBar = sel >= 0 ? bars[sel] : null;
  const max = Math.max(1, ...bars.map((b) => b.total));
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
            <div className="text-[11px] text-[var(--a-text-3)]">{selBar.weekly ? `tjedan od ${fmt(selBar.day)}` : fmt(selBar.day)}</div>
            <div className="text-[18px] font-bold tabular-nums text-[var(--a-text)]">{eur(selBar.total)}</div>
          </div>
        )}
      </div>

      <div className="flex h-40 items-stretch gap-1">
        {bars.map((d, i) => {
          const active = i === sel;
          return (
            <button
              key={`${d.day}-${i}`}
              type="button"
              onClick={() => setSelRaw(i)}
              onMouseEnter={() => setSelRaw(i)}
              title={`${fmt(d.day)} ${eur(d.total)}`}
              className="flex min-w-0 flex-1 cursor-pointer flex-col items-center gap-1.5 border-0 bg-transparent p-0"
            >
              <span className="flex w-full flex-1 items-end">
                <span
                  className={`w-full rounded-t transition-colors ${active ? "bg-[var(--a-good)]" : "bg-[var(--a-text)] opacity-80"}`}
                  style={{ height: `${max > 0 ? Math.round((d.total / max) * 100) : 0}%`, minHeight: d.total > 0 ? 4 : 0 }}
                />
              </span>
              <span className={`h-3 whitespace-nowrap text-[9px] ${active ? "font-bold text-[var(--a-text)]" : "text-[var(--a-text-3)]"}`}>
                {i % step === 0 ? fmt(d.day) : ""}
              </span>
            </button>
          );
        })}
      </div>
      <p className="mt-2 text-[11px] text-[var(--a-text-3)]">Klikni stupac za iznos {range === "3m" ? "tog tjedna" : "tog dana"}.</p>
    </div>
  );
}
