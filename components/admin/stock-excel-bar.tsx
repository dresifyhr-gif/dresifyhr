"use client";

import { useRef, useState } from "react";

type Change = { slug: string; name: string; before: Record<string, number> | null; after: Record<string, number>; outOfStock: string };
type Result = { ok: boolean; applied?: boolean; changes?: Change[]; unknown?: string[]; errors?: string[]; unchanged?: number; skipped?: number; message?: string };

const fmt = (m: Record<string, number> | null) =>
  m ? Object.entries(m).map(([s, n]) => `${s}:${n}`).join(" ") : "nije upisano";

// Excel zalihe (Igor 28.11.): izvoz sa slikom dresa → upiši količine → uvoz (pregled pa potvrda).
export function StockExcelBar({ onApplied }: { onApplied?: () => void }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [res, setRes] = useState<Result | null>(null);

  const send = async (f: File, apply: boolean) => {
    setBusy(true);
    try {
      const fd = new FormData();
      fd.append("file", f);
      const r = await fetch(`/api/admin/stock/import/${apply ? "?apply=1" : ""}`, { method: "POST", body: fd });
      const data = r.status === 413
        ? ({ ok: false, message: "Excel je prevelik za upload — izbriši slike iz njega ili koristi svježi izvoz." } as Result)
        : ((await r.json().catch(() => ({ ok: false, message: "Greška servera" }))) as Result);
      setRes(data);
      if (apply && data.applied) onApplied?.();
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mb-4 rounded-[12px] border border-[var(--a-line)] bg-[var(--a-surface-2)] p-3 sm:p-4">
      <div className="flex flex-wrap items-center gap-2">
        <div className="mr-auto">
          <div className="text-sm font-bold text-[var(--a-text)]">📊 Zaliha u Excelu</div>
          <div className="text-[11px] text-[var(--a-text-3)]">Izvoz sa slikom svakog dresa → upiši komade po veličini → uvoz</div>
        </div>
        <a href="/api/admin/stock/export/" className="a-btn-sm px-3 py-1.5 text-[12px]">⬇ Izvoz zalihe</a>
        <button type="button" disabled={busy} onClick={() => inputRef.current?.click()} className="a-btn-sm px-3 py-1.5 text-[12px] disabled:opacity-40">
          ⬆ Uvoz zalihe
        </button>
        <input
          ref={inputRef}
          type="file"
          accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            e.target.value = "";
            if (!f) return;
            setFile(f);
            setRes(null);
            void send(f, false);
          }}
        />
      </div>

      {busy && <p className="mt-3 text-[12px] text-[var(--a-text-2)]">Čitam Excel…</p>}

      {res && !busy && (
        <div className="mt-3 text-[12px] text-[var(--a-text-2)]">
          {!res.ok ? (
            <p className="font-semibold text-[var(--a-bad)]">{res.message ?? "Uvoz nije uspio."}</p>
          ) : res.applied ? (
            <p className="font-semibold text-[var(--a-good)]">✓ Upisano: {res.changes?.length ?? 0} proizvoda. Dućan je osvježen.</p>
          ) : (
            <>
              <p>
                Promjena: <b className="text-[var(--a-text)]">{res.changes?.length ?? 0}</b> · bez promjene: {res.unchanged ?? 0}
              </p>
              {!!res.errors?.length && (
                <ul className="mt-2 list-disc pl-5 text-[var(--a-bad)]">{res.errors.map((e) => <li key={e}>{e}</li>)}</ul>
              )}
              {!!res.unknown?.length && (
                <p className="mt-2 text-[var(--a-bad)]">Nepoznata šifra ({res.unknown.length}): {res.unknown.slice(0, 5).join(", ")}{res.unknown.length > 5 ? "…" : ""}</p>
              )}
              {!!res.changes?.length && (
                <ul className="mt-2 max-h-64 space-y-1 overflow-auto rounded-[8px] bg-[var(--a-card)] p-2">
                  {res.changes.map((c) => (
                    <li key={c.slug}>
                      <b className="text-[var(--a-text)]">{c.name}</b>
                      {c.outOfStock === "all" ? <span className="ml-1 text-[var(--a-bad)]">· rasprodano</span> : null}
                      <div className="text-[11px] text-[var(--a-text-3)]">{fmt(c.before)} → <span className="text-[var(--a-text-2)]">{fmt(c.after)}</span></div>
                    </li>
                  ))}
                </ul>
              )}
              {!!res.changes?.length && !res.errors?.length && file && (
                <button type="button" onClick={() => void send(file, true)} className="mt-3 rounded-[10px] bg-[var(--a-good)] px-4 py-2 text-[13px] font-semibold text-white">
                  ✓ Potvrdi uvoz ({res.changes.length})
                </button>
              )}
              {!!res.errors?.length && <p className="mt-2 font-semibold">Ispravi greške u Excelu pa ga učitaj ponovno.</p>}
            </>
          )}
        </div>
      )}
    </div>
  );
}
