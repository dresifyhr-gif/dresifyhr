"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function SettlementButton() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function settle() {
    if (busy) return;
    if (typeof window !== "undefined" && !window.confirm("Označiti da ste Igor i Ivica poravnali račune? Podjela dalje broji profit od danas.")) return;
    setBusy(true);
    await fetch("/api/admin/settlement/", { method: "POST" }).catch(() => {});
    setBusy(false);
    router.refresh();
  }

  return (
    <button
      type="button"
      onClick={settle}
      disabled={busy}
      className="rounded-[12px] bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-slate-800 disabled:opacity-50"
    >
      {busy ? "…" : "✅ Poravnali smo"}
    </button>
  );
}
