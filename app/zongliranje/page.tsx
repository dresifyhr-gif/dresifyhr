import type { Metadata } from "next";

import { OstaleIgre } from "@/components/game/v2/game-shell";
import { ZongliranjeGame } from "@/components/game/v2/zongliranje/zongliranje-game";
import { buildMetadata } from "@/lib/seo";

export const metadata: Metadata = buildMetadata({
  title: "Žongliranje loptom — online nogometna mini igra",
  description:
    "Koliko dugo možeš držati loptu u zraku? Žongliraj loptom svog kluba, niži savršene udarce po sredini za množitelj do x4 i obori svoj rekord. Igra radi na mobitelu, bez instalacije.",
  path: "/zongliranje",
  keywords: ["žongliranje", "žongliranje loptom", "nogometna igra", "online igra nogomet", "keepy uppy", "mini igra"]
});

export default function ZongliranjePage() {
  return (
    <>
      <ZongliranjeGame />

      <section className="page-shell max-w-2xl pb-10 pt-10 sm:pt-6">
        <span className="section-kicker">Mini igra</span>
        <h1 className="font-heading text-[clamp(2.1rem,6vw,3.2rem)] uppercase leading-[0.95] tracking-[0.03em] text-white">
          Žongliranje loptom — koliko dodira možeš?
        </h1>
        <div className="mt-4 space-y-3 text-[15px] leading-7 text-white/60">
          <p>
            Žongliranje je prva stvar koju svaki klinac nauči s loptom. Ovdje je dovoljan jedan prst: tapni loptu prije nego padne na
            travu i drži je u zraku što dulje.
          </p>
          <p>
            Mjesto dodira je važno. Tapneš li lijevo od središta, lopta ode udesno, i obrnuto. Pogodiš li točno po sredini (nišan na
            lopti), udarac je savršen, a niz savršenih udaraca diže množitelj do x4. Povremeno se iznad terena pojavi kapa: dotakni je
            loptom za dodatnih 5 bodova.
          </p>
          <p>
            Igra postaje teža polako: lopta s vremenom pada brže, nišan se sužava, a od 25. dodira puše vjetar. Smjer vjetra vidiš dolje
            desno.
          </p>
          <p>
            Ciljevi su 25, 50 i 100 dodira u jednoj igri. Odaberi loptu svog kluba, obori rekord i podijeli rezultat u story.
          </p>
        </div>
      </section>
      <OstaleIgre current="zongliranje" />
    </>
  );
}
