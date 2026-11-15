import type { Metadata } from "next";

import { GAME_REWARDS, GAME_REWARDS_ENABLED } from "@/components/game/v2/config";
import { PenaltyCup } from "@/components/game/v2/penalty/penalty-cup";
import { buildMetadata } from "@/lib/seo";

// Tekst se ravna po prekidaču nagrada (components/game/v2/config.ts):
// dok su nagrade ugašene, nigdje se ne spominju popust ni kodovi.
const tier = GAME_REWARDS.penalty?.tiers[0];
const prize = tier?.prizes[0];
const rewardOn = GAME_REWARDS_ENABLED && !!tier && !!prize;
const rewardText = rewardOn ? `Zabij ${tier!.min} od 5 i osvoji ${prize!.title.toLowerCase()}.` : "";

export const metadata: Metadata = buildMetadata({
  title: "Penalty Cup — mini igra s penalima",
  description: rewardOn
    ? `Odigraj DRESIFY Penalty Cup: pet penala protiv golmana koji je sve bolji. ${rewardText}`
    : "Odigraj DRESIFY Penalty Cup: pet penala protiv golmana koji je sa svakim udarcem sve bolji. Povuci prstom, zavrni loptu i obori svoj rekord.",
  path: "/igra",
  keywords: ["penali igra", "nogometna igra", "mini igra", "penalty igra online", "DRESIFY"]
});

export default function IgraPage() {
  return (
    <>
      <PenaltyCup />
      <section className="page-shell max-w-2xl pb-16 pt-10 md:pt-4">
        <span className="section-kicker">Penalty Cup</span>
        <h1 className="mt-2 font-heading text-[clamp(2.1rem,6vw,3.2rem)] uppercase leading-[0.95] tracking-[0.04em] text-white">
          Penali protiv DRESIFY golmana
        </h1>
        <p className="mt-4 text-[15px] leading-7 text-white/65">
          Pet penala, jedan golman i tvoj prst. Povuci prema golu: kamo pokažeš, tamo lopta ide. Brži potez daje jači udarac, ali
          prejak udarac lako ode preko prečke. Povuci u luku i lopta će zavrnuti oko golmana.
          {rewardOn ? ` ${rewardText}` : ""}
        </p>
        <p className="mt-3 text-[15px] leading-7 text-white/65">
          Golman je sa svakim penalom brži i bolje čita udarac, pa zadnja dva traže najbolje kutove. Prije igre odaberi loptu, a
          rezultat podijeli kao sliku za story.
        </p>
      </section>
    </>
  );
}
