import type { Metadata } from "next";

import { FlappyGame } from "@/components/game/flappy-game";
import { buildMetadata } from "@/lib/seo";

export const metadata: Metadata = buildMetadata({
  title: "DRESIFY Flappy Ball — skupi 10 i osvoji popust",
  description:
    "Odigraj DRESIFY Flappy Ball: provedi loptu kroz golove, skupi 10 bodova i osvoji promo kod za -10% na nogometne dresove.",
  path: "/flappy"
});

export default function FlappyPage() {
  return (
    <section className="section-pad">
      <div className="page-shell max-w-xl">
        <div className="mb-6 text-center">
          <span className="section-kicker">Flappy Ball</span>
          <h1 className="mt-2 font-heading text-[clamp(2.2rem,6vw,3.4rem)] uppercase leading-[0.95] tracking-[0.04em] text-white">
            Što dalje prođeš, veći popust
          </h1>
          <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-white/60">
            Provedi DRESIFY loptu kroz golove — igra je sve teža. 10 bodova = -10%, 15 = -15%, 20 = -20% na sve dresove.
          </p>
        </div>
        <FlappyGame />
      </div>
    </section>
  );
}
