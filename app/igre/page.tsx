import type { Metadata } from "next";

import { buildMetadata } from "@/lib/seo";
import { getSettings } from "@/lib/settings";

import { GamesHub } from "./games-hub";
import { NOVI_DIZAJN } from "@/lib/novi-dizajn";

// Hub mini igara. Igre su zasad samo za zabavu (components/game/v2/config.ts →
// GAME_REWARDS_ENABLED = false), pa ovdje NE spominjemo popuste ni nagrade.
// Motivacija: osobni rekord, dnevni kviz i dijeljenje rezultata.
export const metadata: Metadata = buildMetadata({
  title: "Nogometne mini igre — penali, kviz, žongliranje",
  description:
    "Kratke nogometne igre za mobitel: penali level po level, 15 pitanja do pehara, Kviz dana od 10 pitanja i žongliranje. Ruši svoje rekorde i podijeli rezultat.",
  path: "/igre"
});

export default async function IgrePage() {
  // Kolo sreće se pali u Postavkama (koloActive). Dok je ugašeno, /kolo vraća
  // 404, pa ga ovdje ni ne prikazujemo — nema mrtvog linka.
  const { koloActive } = await getSettings();
  const hub = <GamesHub koloActive={koloActive} />;
  // NOVI DIZAJN: isti hub, ravni prikaz (components/novi/css.ts, data-nv-flat)
  return NOVI_DIZAJN ? <div data-nv-flat="igre">{hub}</div> : hub;
}
