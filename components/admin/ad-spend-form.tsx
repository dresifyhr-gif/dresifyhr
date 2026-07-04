"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function AdSpendForm() {
  const router = useRouter();
  const [amount, setAmount] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const n = Number(amount.replace(",", "."));
    if (!n || n <= 0 || loading) return;
    setLoading(true);
    await fetch("/api/admin/adspend/", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ amount: n })
    });
    setAmount("");
    setLoading(false);
    router.refresh();
  }

  return (
    <form onSubmit={submit} className="flex gap-2">
      <input
        value={amount}
        onChange={(e) => setAmount(e.target.value)}
        inputMode="decimal"
        placeholder="Dodaj potrošnju (€)"
        className="flex-1 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-900 outline-none focus:border-slate-400 focus:bg-white"
      />
      <button
        type="submit"
        disabled={loading || !amount}
        className="rounded-lg bg-slate-900 px-3 py-2 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:opacity-50"
      >
        {loading ? "…" : "Dodaj"}
      </button>
    </form>
  );
}
