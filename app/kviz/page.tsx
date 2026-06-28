import type { Metadata } from "next";

import { QuizGame } from "@/components/game/quiz-game";
import { buildMetadata } from "@/lib/seo";

export const metadata: Metadata = buildMetadata({
  title: "Football Kviz — odgovori i osvoji nagradu",
  description:
    "Odgovori na 5 football pitanja i osvoji poklon iznenađenja ili 10% popust na nogometne dresove.",
  path: "/kviz"
});

export default function KvizPage() {
  return (
    <section className="section-pad">
      <div className="page-shell max-w-xl">
        <QuizGame />
      </div>
    </section>
  );
}
