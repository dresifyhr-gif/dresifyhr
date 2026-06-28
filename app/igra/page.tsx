import type { Metadata } from "next";

import { PenaltyGame } from "@/components/game/penalty-game";
import { buildMetadata } from "@/lib/seo";

export const metadata: Metadata = buildMetadata({
  title: "DRESIFY Penalty — zabij i osvoji besplatnu dostavu",
  description:
    "Odigraj DRESIFY Penalty Cup: zabij 4 od 5 penala i osvoji besplatnu dostavu na svoju narudžbu. Brza igra, dostava po cijeloj Hrvatskoj.",
  path: "/igra"
});

export default function IgraPage() {
  return (
    <section className="section-pad">
      <div className="page-shell max-w-xl">
        <div className="mb-6 text-center">
          <span className="section-kicker">Penalty Cup</span>
          <h1 className="mt-2 font-heading text-[clamp(2.2rem,6vw,3.4rem)] uppercase leading-[0.95] tracking-[0.04em] text-white">
            Zabij i osvoji besplatnu dostavu
          </h1>
          <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-white/60">
            Zabij 4 od 5 penala protiv DRESIFY golmana i osvoji besplatnu dostavu na svoju narudžbu.
          </p>
        </div>
        <PenaltyGame />
      </div>
    </section>
  );
}
