import type { Metadata } from "next";

import { PenaltyKarijera } from "@/components/game/v2/penalty/penalty-cup";
import { buildMetadata } from "@/lib/seo";

// Nagrade su ugašene (components/game/v2/config.ts): ovdje se ne spominju
// popust, kodovi ni nagrade. Kovanice u igri vrijede samo u igri.

export const metadata: Metadata = buildMetadata({
  title: "Penalty Karijera — nogometna igra s penalima",
  description:
    "Odigraj DRESIFY Penalty Karijeru: svaki gol je level više. Zaobiđi živi zid, pogodi mete u kutovima, prevari braniča i vjetar, a svakih pet levela čeka te boss golman.",
  path: "/igra",
  keywords: ["penali igra", "nogometna igra", "mini igra", "penalty igra online", "penalty karijera", "DRESIFY"]
});

export default function IgraPage() {
  return (
    <>
      <PenaltyKarijera />
      <section className="page-shell max-w-2xl pb-16 pt-10 md:pt-4">
        <span className="section-kicker">Penalty Karijera</span>
        <h1 className="mt-2 font-heading text-[clamp(2.1rem,6vw,3.2rem)] uppercase leading-[0.95] tracking-[0.04em] text-white">
          Od prvog penala do bossa
        </h1>
        <p className="mt-4 text-[15px] leading-7 text-white/65">
          Povuci prstom prema golu: kamo pokažeš, tamo lopta ide. Brži potez daje jači udarac, a potez u luku zavrne loptu. Svaki gol
          vodi level više, a imaš tri života. Obrana, blok ili promašaj košta jedan.
        </p>
        <p className="mt-3 text-[15px] leading-7 text-white/65">
          Prva dva levela služe za zagrijavanje. Od trećeg se pred golom miče živi zid, zatim u kutovima kruže mete, a od desetog
          levela dolaze dva zida, branič i vjetar. Svaki peti level brani boss kojeg prolaze samo udarci u sam kut. Pobijeđen boss
          vraća jedan život.
        </p>
        <p className="mt-3 text-[15px] leading-7 text-white/65">
          Golovima skupljaš kovanice koje vrijede samo u igri. U svlačionici ih trošiš na snagu udarca, falš, dulji nišan i nove
          lopte. Za kratku pauzu tu je i brza partija od pet penala.
        </p>
      </section>
    </>
  );
}
