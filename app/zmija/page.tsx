import type { Metadata } from "next";

import { SnakeGame } from "@/components/game/snake-game";
import { buildMetadata } from "@/lib/seo";

export const metadata: Metadata = buildMetadata({
  title: "Zmija — jedi lopte i osvoji nagradu",
  description:
    "Igraj DRESIFY Zmiju: vodi zmiju da pojede lopte i raste. Što više pojedeš, veća nagrada — besplatna dostava ili popust na nogometne dresove.",
  path: "/zmija"
});

export default function ZmijaPage() {
  return (
    <section className="section-pad">
      <div className="page-shell max-w-xl">
        <SnakeGame />
      </div>
    </section>
  );
}
