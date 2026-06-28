import type { Metadata } from "next";

import { CatchGame } from "@/components/game/catch-game";
import { buildMetadata } from "@/lib/seo";

export const metadata: Metadata = buildMetadata({
  title: "Uhvati dres — skupi dresove i osvoji nagradu",
  description:
    "Igraj DRESIFY Uhvati dres: pomiči kutiju i hvataj dresove koji padaju sve brže. Prođi razine i osvoji besplatnu dostavu ili popust na nogometne dresove.",
  path: "/uhvati"
});

export default function UhvatiPage() {
  return (
    <section className="section-pad">
      <div className="page-shell max-w-xl">
        <CatchGame />
      </div>
    </section>
  );
}
