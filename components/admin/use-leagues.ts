"use client";

import { useEffect, useState } from "react";

// Lige se uređuju u Postavkama. Dok se ne učitaju (ili ako dohvat padne),
// koristi se zadana lista — forme proizvoda nikad ne ostaju prazne.
export const DEFAULT_LEAGUES = [
  "Reprezentacija", "La Liga", "Premier Liga", "Serie A", "Bundesliga",
  "Ligue 1", "Saudi Pro", "Brazil", "MLS", "Komplet", "Streetwear"
];

// Dijeljeni keš: stranica proizvoda renderira stotine redaka, a svi trebaju
// istu listu — zato jedan dohvat za sve instance, ne jedan po retku.
let cached: string[] | null = null;
let inFlight: Promise<string[]> | null = null;

function loadLeagues(): Promise<string[]> {
  if (cached) return Promise.resolve(cached);
  if (inFlight) return inFlight;
  inFlight = fetch("/api/admin/settings/")
    .then((r) => r.json())
    .then((d) => {
      const list = d?.settings?.leagues;
      cached = Array.isArray(list) && list.length ? list : DEFAULT_LEAGUES;
      return cached;
    })
    .catch(() => DEFAULT_LEAGUES)
    .finally(() => { inFlight = null; });
  return inFlight;
}

export function useLeagues(): string[] {
  const [leagues, setLeagues] = useState<string[]>(cached ?? DEFAULT_LEAGUES);

  useEffect(() => {
    let cancelled = false;
    loadLeagues().then((list) => { if (!cancelled) setLeagues(list); });
    return () => { cancelled = true; };
  }, []);

  return leagues;
}
