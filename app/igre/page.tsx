import type { Metadata } from "next";

import { buildMetadata } from "@/lib/seo";
import { getSettings } from "@/lib/settings";

import { GamesHub } from "./games-hub";

// Hub mini igara. Igre su zasad samo za zabavu (components/game/v2/config.ts →
// GAME_REWARDS_ENABLED = false), pa ovdje NE spominjemo popuste ni nagrade.
// Motivacija: osobni rekord, dnevni kviz i dijeljenje rezultata.
export const metadata: Metadata = buildMetadata({
  title: "Mini igre — Penalty Karijera, 15 do pehara, Kviz dana i Žongliranje",
  description:
    "Kratke nogometne igre za mobitel: penali level po level, 15 pitanja do pehara, Kviz dana od 10 pitanja i žongliranje. Ruši svoje rekorde i podijeli rezultat.",
  path: "/igre"
});

export default async function IgrePage() {
  // Kolo sreće se pali u Postavkama (koloActive). Dok je ugašeno, /kolo vraća
  // 404, pa ga ovdje ni ne prikazujemo — nema mrtvog linka.
  const { koloActive } = await getSettings();
  return <GamesHub koloActive={koloActive} />;
}
