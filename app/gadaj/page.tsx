import type { Metadata } from "next";

import { ShooterGame } from "@/components/game/shooter-game";
import { buildMetadata } from "@/lib/seo";

export const metadata: Metadata = buildMetadata({
  title: "DRESIFY Snajper — gađaj dresove i osvoji nagradu",
  description:
    "Odigraj DRESIFY Snajper: gađaj dresove koji klize na trakama, imaš 40 sekundi. Što više pogodaka, veća nagrada — besplatna dostava ili popust na nogometne dresove.",
  path: "/gadaj"
});

export default function GadajPage() {
  return (
    <section className="section-pad">
      <div className="page-shell max-w-xl">
        <div className="mb-6 text-center">
          <span className="section-kicker">Snajper</span>
          <h1 className="mt-2 font-heading text-[clamp(2.2rem,6vw,3.4rem)] uppercase leading-[0.95] tracking-[0.04em] text-white">
            Gađaj dresove i osvoji nagradu
          </h1>
          <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-white/60">
            Dresovi klize na trakama — tapni da pogodiš. Imaš 40 sekundi, a zlatni dres nosi 3 boda. Što više pogodiš, veća nagrada.
          </p>
        </div>
        <ShooterGame />
      </div>
    </section>
  );
}
