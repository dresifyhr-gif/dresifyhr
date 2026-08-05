"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function AdSpendForm() {
  const router = useRouter();
  const [amount, setAmount] = useState("");
  const [paidBy, setPaidBy] = useState<"igor" | "ivica">("igor");
  const [loading, setLoading] = useState(false);
  const [resetting, setResetting] = useState(false);

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
    router.refresh();
  }

  async function reset() {
    if (resetting) return;
    if (!confirm("Resetirati oglase trenutnog razdoblja (od zadnjeg poravnanja) na 0 €?")) return;
    setResetting(true);
    await fetch("/api/admin/adspend/", { method: "DELETE" }).catch(() => {});
    setResetting(false);
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
      <button
        type="button"
        onClick={reset}
        disabled={resetting}
        className="text-[12px] font-medium text-red-500 underline decoration-dotted hover:text-red-600 disabled:opacity-50"
      >
        {resetting ? "Resetiram…" : "🗑 Resetiraj oglase (trenutno razdoblje) na 0 €"}
      </button>
    </div>
  );
}
