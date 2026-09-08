"use client";

import { useState } from "react";

const eur = (n: number) => `${(n ?? 0).toFixed(2).replace(".", ",")} €`;
const fmt = (day: string) => `${day.slice(8)}.${day.slice(5, 7)}.`;

// Interaktivni graf prometa: klik/tap na stupac pokaže datum + iznos (radi na mobitelu
// gdje nema hovera). Stupci se skupljaju (min-w-0) pa uvijek stanu u okvir; datumi rijetki.
export function RevenueChart({ data }: { data: { day: string; total: number }[] }) {
  const max = Math.max(1, ...data.map((d) => d.total));
  const lastIdx = data.length - 1;
  const [sel, setSel] = useState<number | null>(lastIdx >= 0 ? lastIdx : null);
  const selDay = sel != null ? data[sel] : null;
  // ~7 datuma max da se ne gužvaju na mobitelu
  const step = Math.max(1, Math.ceil(data.length / 7));

  return (
    <div>
      {/* Očitanje: odabrani dan (default zadnji) */}
      <div className="mb-3 flex items-baseline justify-between gap-2">
        <span className="text-[13px] font-medium text-[var(--a-text-2)]">{selDay ? `📅 ${fmt(selDay.day)}` : "—"}</span>
        <span className="text-[19px] font-bold tabular-nums text-[var(--a-text)]">{selDay ? eur(selDay.total) : "—"}</span>
      </div>

      <div className="flex h-40 items-stretch gap-1">
        {data.map((d, i) => {
          const active = i === sel;
          return (
            <button
              key={d.day}
              type="button"
              onClick={() => setSel(i)}
              onMouseEnter={() => setSel(i)}
              title={`${fmt(d.day)} ${eur(d.total)}`}
              className="flex min-w-0 flex-1 cursor-pointer flex-col items-center gap-1.5 border-0 bg-transparent p-0"
            >
              <span className="flex w-full flex-1 items-end">
                <span
                  className={`w-full rounded-t transition-colors ${active ? "bg-[var(--a-good)]" : "bg-[var(--a-text)] opacity-80"}`}
                  style={{ height: `${max > 0 ? Math.round((d.total / max) * 100) : 0}%`, minHeight: d.total > 0 ? 4 : 0 }}
                />
              </span>
              <span
                className={`h-3 overflow-visible whitespace-nowrap text-[9px] ${active ? "font-bold text-[var(--a-text)]" : "text-[var(--a-text-3)]"}`}
              >
                {i % step === 0 ? fmt(d.day) : ""}
              </span>
            </button>
          );
        })}
      </div>
      <p className="mt-2 text-[11px] text-[var(--a-text-3)]">Klikni stupac za iznos tog dana.</p>
    </div>
  );
}
