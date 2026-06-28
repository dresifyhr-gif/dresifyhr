import type { Metadata } from "next";

import { MemoryGame } from "@/components/game/memory-game";
import { buildMetadata } from "@/lib/seo";

export const metadata: Metadata = buildMetadata({
  title: "Spojnica — spoji parove i osvoji nagradu",
  description:
    "Igraj DRESIFY Spojnicu: spoji svih 6 parova u ograničenom broju pokušaja i osvoji besplatnu dostavu na nogometne dresove.",
  path: "/spojnica"
});

export default function SpojnicaPage() {
  return (
    <section className="section-pad">
      <div className="page-shell max-w-xl">
        <MemoryGame />
      </div>
    </section>
  );
}
