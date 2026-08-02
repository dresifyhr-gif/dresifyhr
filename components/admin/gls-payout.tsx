"use client";

import { useEffect, useMemo, useState } from "react";

const eur = (n: number) => `${(n ?? 0).toLocaleString("hr-HR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €`;

type Row = { id: string; date: string; deliveredAt: string; name: string; amount: number; shippedBy: string | null; tracking: string | null };

export function GlsPayout() {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [amount, setAmount] = useState("");
  const [sel, setSel] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const r = await fetch("/api/admin/gls-payout/").then((x) => x.json());
      if (r?.ok) setRows(r.orders as Row[]);
    } catch {}
    setLoading(false);
  }
  useEffect(() => { load(); }, []);

  const target = Number(String(amount).replace(",", ".")) || 0;

  // Auto-prijedlog: najstarije redom dok zbroj ne prijeđe upisani iznos.
  function autoSelect() {
    if (target <= 0) { setSel(new Set()); return; }
    const next = new Set<string>();
    let sum = 0;
    for (const r of rows) {
      if (sum + r.amount <= target + 0.001) { next.add(r.id); sum += r.amount; }
      else break;
    }
    setSel(next);
  }

  const toggle = (id: string) =>
    setSel((s) => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n; });

  const selectedRows = useMemo(() => rows.filter((r) => sel.has(r.id)), [rows, sel]);
  const selTotal = selectedRows.reduce((s, r) => s + r.amount, 0);
  const igorSum = selectedRows.filter((r) => r.shippedBy === "igor").reduce((s, r) => s + r.amount, 0);
  const ivicaSum = selectedRows.filter((r) => r.shippedBy === "ivica").reduce((s, r) => s + r.amount, 0);
  const noneSum = selectedRows.filter((r) => r.shippedBy !== "igor" && r.shippedBy !== "ivica").reduce((s, r) => s + r.amount, 0);
  const poolTotal = rows.reduce((s, r) => s + r.amount, 0);
  const diff = target > 0 ? selTotal - target : 0;

  async function markCollected() {
    if (!selectedRows.length) return;
    setBusy(true);
    try {
      const r = await fetch("/api/admin/orders/bulk/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "collect", ids: [...sel] })
      }).then((x) => x.json());
      if (r?.ok) { setSel(new Set()); setAmount(""); await load(); }
    } catch {}
    setBusy(false);
  }

  const badge = (by: string | null) =>
    by === "igor" ? <span className="rounded bg-[var(--a-info-bg)] px-1.5 py-0.5 text-[10px] font-bold text-[var(--a-info)]">Igor</span>
    : by === "ivica" ? <span className="rounded bg-[var(--a-warn-bg)] px-1.5 py-0.5 text-[10px] font-bold text-[var(--a-warn)]">Ivica</span>
    : <span className="rounded bg-[var(--a-surface-2)] px-1.5 py-0.5 text-[10px] font-bold text-[var(--a-text-3)]">?</span>;

  if (loading) return <div className="text-sm text-[var(--a-text-3)]">Učitavam…</div>;

  return (
    <div className="space-y-4">
      {/* Sažetak + unos iznosa */}
      <div className="a-card p-4">
        <div className="grid gap-4 sm:grid-cols-[1fr_auto] sm:items-end">
          <div>
            <div className="text-[11px] font-bold uppercase tracking-[0.12em] text-[var(--a-text-3)]">Iznos uplate s banke (€)</div>
            <div className="mt-1.5 flex flex-wrap items-center gap-2">
              <input
                value={amount}
                onChange={(e) => setAmount(e.target.value.replace(/[^0-9.,]/g, ""))}
                inputMode="decimal"
                placeholder="npr. 1240,00"
                className="a-input w-40 px-3 py-2 text-lg font-bold tabular-nums"
              />
              <button type="button" onClick={autoSelect} className="a-btn-sm px-3 py-2 text-[12px] font-semibold">
                ↧ Složi najstarije
              </button>
            </div>
            <p className="mt-1.5 text-[11px] text-[var(--a-text-3)]">
              Upiši koliko ti je GLS uplatio pa klikni — sam označi najstarije dostavljene do tog iznosa. Provjeri i po potrebi štrikni.
            </p>
          </div>
          <div className="text-right">
            <div className="text-[11px] font-semibold uppercase tracking-wide text-[var(--a-text-3)]">Dostupno za naplatu</div>
            <div className="text-[22px] font-extrabold tabular-nums text-[var(--a-text)]">{eur(poolTotal)}</div>
            <div className="text-[11px] text-[var(--a-text-3)]">{rows.length} dostavljenih GLS narudžbi</div>
          </div>
        </div>

        {/* Odabrano vs uplata + podjela */}
        <div className="mt-4 grid gap-2 rounded-[12px] border border-[var(--a-line)] bg-[var(--a-surface-2)] p-3 sm:grid-cols-3">
          <div>
            <div className="text-[11px] text-[var(--a-text-3)]">Označeno ({selectedRows.length})</div>
            <div className="text-[18px] font-bold tabular-nums text-[var(--a-text)]">{eur(selTotal)}</div>
            {target > 0 && (
              <div className={`text-[11px] font-semibold ${Math.abs(diff) < 0.01 ? "text-[var(--a-good)]" : "text-[var(--a-warn)]"}`}>
                {Math.abs(diff) < 0.01 ? "✓ poklapa se s uplatom" : `${diff > 0 ? "+" : ""}${eur(diff)} razlika`}
              </div>
            )}
          </div>
          <div>
            <div className="text-[11px] text-[var(--a-text-3)]">Od toga Igor poslao</div>
            <div className="text-[16px] font-bold tabular-nums text-[var(--a-info)]">{eur(igorSum)}</div>
          </div>
          <div>
            <div className="text-[11px] text-[var(--a-text-3)]">Od toga Ivica poslala</div>
            <div className="text-[16px] font-bold tabular-nums text-[var(--a-warn)]">{eur(ivicaSum)}{noneSum > 0 ? <span className="text-[11px] font-normal text-[var(--a-text-3)]"> · nepoznato {eur(noneSum)}</span> : null}</div>
          </div>
        </div>

        <button
          type="button"
          disabled={busy || !selectedRows.length}
          onClick={markCollected}
          className="a-btn a-btn-primary mt-3 w-full px-4 py-2.5 text-sm font-bold disabled:opacity-50"
        >
          {busy ? "Označavam…" : `✓ Označi ${selectedRows.length} narudžbi kao prikupljeno`}
        </button>
      </div>

      {/* Popis — najstarije dostavljeno prvo, s tekućim zbrojem */}
      {rows.length === 0 ? (
        <div className="a-card p-6 text-center text-sm text-[var(--a-text-3)]">Nema dostavljenih GLS narudžbi koje čekaju naplatu. 🎉</div>
      ) : (
        <div className="a-card divide-y divide-[var(--a-line)] overflow-hidden">
          {(() => {
            let running = 0;
            return rows.map((r) => {
              running += r.amount;
              const checked = sel.has(r.id);
              return (
                <label key={r.id} className={`flex cursor-pointer items-center gap-3 px-3 py-2.5 transition ${checked ? "bg-[var(--a-surface-2)]" : "hover:bg-[var(--a-surface-2)]"}`}>
                  <input type="checkbox" checked={checked} onChange={() => toggle(r.id)} className="h-4 w-4 shrink-0 cursor-pointer accent-[var(--a-text)]" />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 text-[13px] font-semibold text-[var(--a-text)]">
                      <span className="truncate">{r.name}</span>
                      {badge(r.shippedBy)}
                    </div>
                    <div className="text-[11px] text-[var(--a-text-3)]">
                      dostavljeno {r.deliveredAt || "?"}{r.tracking ? ` · ${r.tracking}` : ""}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-[14px] font-bold tabular-nums text-[var(--a-text)]">{eur(r.amount)}</div>
                    <div className="text-[10.5px] tabular-nums text-[var(--a-text-3)]">Σ {eur(running)}</div>
                  </div>
                </label>
              );
            });
          })()}
        </div>
      )}
    </div>
  );
}
