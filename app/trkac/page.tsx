import type { Metadata } from "next";

import { RunnerGame } from "@/components/game/runner-game";
import { buildMetadata } from "@/lib/seo";

export const metadata: Metadata = buildMetadata({
  title: "Super Dresify — trči, skači i osvoji nagradu",
  description:
    "Igraj Super Dresify: nogometaš trči i skače, skuplja dresove i preskače prepreke. Skupi dovoljno dresova i osvoji besplatnu dostavu ili popust na nogometne dresove.",
  path: "/trkac"
});

export default function TrkacPage() {
  return (
    <section className="section-pad">
      <div className="page-shell max-w-xl">
        <RunnerGame />
      </div>
    </section>
  );
}
