"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

type Entry = { id: string; amount: number; paidBy: string | null; date: string };
const eur = (n: number) => `${(n ?? 0).toFixed(2).replace(".", ",")} €`;

export function AdSpendForm() {
  const router = useRouter();
  const [amount, setAmount] = useState("");
  const [paidBy, setPaidBy] = useState<"igor" | "ivica">("igor");
  const [loading, setLoading] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [entries, setEntries] = useState<Entry[]>([]);

  const load = useCallback(async () => {
    const d = await fetch("/api/admin/adspend/").then((r) => r.json()).catch(() => null);
    if (d?.ok) setEntries(d.entries);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const n = Number(amount.replace(",", "."));
    if (!n || n <= 0 || loading) return;
    setLoading(true);
    await fetch("/api/admin/adspend/", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ amount: n, paidBy })
    });
    setAmount("");
    setLoading(false);
    await load();
    router.refresh();
  }

  // Prebaci platioca postojećeg unosa (ako si slučajno krivo kliknuo).
  async function setEntryPayer(id: string, who: "igor" | "ivica") {
    setEntries((cur) => cur.map((e) => (e.id === id ? { ...e, paidBy: who } : e)));
    await fetch("/api/admin/adspend/", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, paidBy: who })
    });
    router.refresh();
  }

  async function removeEntry(id: string) {
    if (!confirm("Obrisati ovaj unos oglasa?")) return;
    setEntries((cur) => cur.filter((e) => e.id !== id));
    await fetch(`/api/admin/adspend/?id=${encodeURIComponent(id)}`, { method: "DELETE" }).catch(() => {});
    router.refresh();
  }

  async function reset() {
    if (resetting) return;
    if (!confirm("Resetirati SVE oglase trenutnog razdoblja (od zadnjeg poravnanja) na 0 €?")) return;
    setResetting(true);
    await fetch("/api/admin/adspend/", { method: "DELETE" }).catch(() => {});
    setResetting(false);
    await load();
    router.refresh();
  }

  return (
    <div className="space-y-2">
      <div className="flex gap-1.5">
        {(["igor", "ivica"] as const).map((who) => (
          <button
            key={who}
            type="button"
            onClick={() => setPaidBy(who)}
            className={`flex-1 rounded-[10px] px-3 py-1.5 text-[13px] font-semibold capitalize transition ${
              paidBy === who
                ? "bg-slate-900 text-white"
                : "border border-[var(--a-line)] bg-[var(--a-surface-2)] text-[var(--a-text-2)] hover:text-[var(--a-text)]"
            }`}
          >
            {who} platio
          </button>
        ))}
      </div>
      <form onSubmit={submit} className="flex gap-2">
        <input
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          inputMode="decimal"
          placeholder="Dodaj potrošnju (€)"
          className="flex-1 rounded-[12px] border border-[var(--a-line)] bg-[var(--a-surface-2)] px-3 py-2 text-sm text-[var(--a-text)] outline-none focus:border-slate-400 focus:bg-[var(--a-card)]"
        />
        <button
          type="submit"
          disabled={loading || !amount}
          className="rounded-[12px] bg-slate-900 px-3 py-2 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:opacity-50"
        >
          {loading ? "…" : "Dodaj"}
        </button>
      </form>

      {/* Uneseni oglasi ovog razdoblja — ispravi platioca ili obriši ako je slučajno */}
      {entries.length > 0 && (
        <div className="space-y-1.5 pt-1">
          <div className="text-[11px] font-semibold uppercase tracking-wide text-[var(--a-text-3)]">Uneseno ovo razdoblje</div>
          {entries.map((e) => (
            <div key={e.id} className="flex items-center gap-2 rounded-[10px] border border-[var(--a-line)] bg-[var(--a-surface-2)] px-2.5 py-1.5">
              <span className="w-16 shrink-0 text-sm font-bold text-[var(--a-text)]">{eur(e.amount)}</span>
              <div className="flex flex-1 gap-1">
                {(["igor", "ivica"] as const).map((who) => (
                  <button
                    key={who}
                    type="button"
                    onClick={() => setEntryPayer(e.id, who)}
                    className={`flex-1 rounded-[8px] px-2 py-1 text-[12px] font-semibold capitalize transition ${
                      (e.paidBy ?? "igor") === who
                        ? "bg-accent/70 text-[var(--a-text)]"
                        : "text-[var(--a-text-3)] hover:text-[var(--a-text)]"
                    }`}
                  >
                    {who}
                  </button>
                ))}
              </div>
              <button
                type="button"
                onClick={() => removeEntry(e.id)}
                aria-label="Obriši unos"
                className="shrink-0 rounded-[8px] px-2 py-1 text-[13px] text-red-500 hover:bg-red-500/10"
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      )}

      <button
        type="button"
        onClick={reset}
        disabled={resetting}
        className="text-[12px] font-medium text-red-500 underline decoration-dotted hover:text-red-600 disabled:opacity-50"
      >
        {resetting ? "Resetiram…" : "🗑 Resetiraj SVE oglase (trenutno razdoblje) na 0 €"}
      </button>
    </div>
  );
}
