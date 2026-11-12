"use client";

import { useState, type ReactNode } from "react";

// Prekidač (segment) na Analitici: Prodaja / Google / Instagram. Sadržaj svakog
// taba je server-renderiran i proslijeđen kao prop — mi samo prebacujemo prikaz
// (sve ostaje montirano, pa nema ponovnog dohvaćanja pri kliku).
type TabId = "prodaja" | "google" | "instagram";

const TABS: { id: TabId; label: string }[] = [
  { id: "prodaja", label: "📊 Prodaja" },
  { id: "google", label: "🌍 Google" },
  { id: "instagram", label: "📷 Instagram" }
];

export function AnalyticsTabs({
  prodaja,
  google,
  instagram,
  initialTab = "prodaja"
}: {
  prodaja: ReactNode;
  google: ReactNode;
  instagram: ReactNode;
  initialTab?: TabId;
}) {
  const [tab, setTab] = useState<TabId>(initialTab);
  return (
    <>
      <div className="mb-5 inline-flex max-w-full flex-wrap gap-1 rounded-[12px] bg-[var(--a-surface-2)] p-1">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={`rounded-[10px] px-3.5 py-1.5 text-sm font-semibold transition ${
              tab === t.id ? "bg-[var(--a-card)] text-[var(--a-text)] shadow-sm" : "text-[var(--a-text-3)] hover:text-[var(--a-text)]"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>
      <div className={tab === "prodaja" ? "" : "hidden"}>{prodaja}</div>
      <div className={tab === "google" ? "" : "hidden"}>{google}</div>
      <div className={tab === "instagram" ? "" : "hidden"}>{instagram}</div>
    </>
  );
}
