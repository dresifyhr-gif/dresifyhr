"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import type { OldUnshippedRow } from "@/lib/admin-winback";

const eur = (n: number) => `${(n ?? 0).toFixed(2).replace(".", ",")} €`;

export function ApologyList({ rows }: { rows: OldUnshippedRow[] }) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);

  async function dismiss(id: string) {
    if (busy) return;
    setBusy(id);
    await fetch(`/api/admin/orders/${id}/apology/`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sent: true })
    }).catch(() => {});
    setBusy(null);
    router.refresh();
  }

  return (
    <>
      <p className="mb-3 -mt-2 text-xs text-slate-400">
        Prošlo je dosta od narudžbe, a nije poslana. Klikni „WhatsApp isprika” — poruka je već napisana, samo pošalji. Kad si javio, klikni ✕ da makneš s liste.
      </p>
      <ul className="space-y-2">
        {rows.map((o) => (
          <li key={o.id} className="flex items-center justify-between gap-2 rounded-lg border border-slate-100 px-2.5 py-2 text-sm">
            <span className="min-w-0 truncate text-slate-700">
              <span className="text-slate-400">{o.dateLabel}</span> · {o.name}{" "}
              <span className="text-slate-400">· {o.product} · {eur(o.total)}</span>
            </span>
            <span className="flex shrink-0 items-center gap-1.5">
              {o.wa ? (
                <a
                  href={o.wa}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="rounded-md bg-emerald-500 px-2.5 py-1 text-[11px] font-semibold text-white hover:bg-emerald-600"
                >
                  WhatsApp isprika
                </a>
              ) : (
                <span className="text-[11px] text-slate-300">nema broja</span>
              )}
              <button
                type="button"
                onClick={() => dismiss(o.id)}
                disabled={busy === o.id}
                title="Javio sam se — makni s liste"
                className="rounded-md border border-slate-200 px-2 py-1 text-[11px] font-medium text-slate-400 transition hover:border-slate-300 hover:text-slate-600 disabled:opacity-50"
              >
                {busy === o.id ? "…" : "✕"}
              </button>
            </span>
          </li>
        ))}
      </ul>
    </>
  );
}
