import type { Metadata } from "next";

import { OstaleIgre } from "@/components/game/v2/game-shell";
import { KvizDana } from "@/components/game/v2/kviz/kviz-dana";
import { buildMetadata } from "@/lib/seo";

export const metadata: Metadata = buildMetadata({
  title: "Kviz dana — nogometni kviz",
  description:
    "Deset nogometnih pitanja, isti kviz za sve i novi svaki dan. Svjetska i europska prvenstva, Liga prvaka, HNL, Vatreni i dresovi. Igraj, gradi niz i podijeli rezultat.",
  path: "/kviz",
  keywords: [
    "nogometni kviz",
    "kviz dana",
    "kviz o nogometu",
    "nogometna pitanja",
    "Vatreni kviz",
  ],
});

const TEME = [
  "Svjetska prvenstva",
  "Europska prvenstva",
  "Liga prvaka",
  "HNL",
  "Hrvatska reprezentacija",
  "Klubovi i stadioni",
  "Legende i igrači",
  "Rekordi",
  "Dresovi i boje",
  "Pravila igre",
];

export default function KvizPage() {
  return (
    <>
      <KvizDana />
      <section className="pb-10 pt-10 sm:pt-14 lg:pt-20">
        <div className="page-shell max-w-2xl">
          <h1 className="font-heading text-[clamp(2.2rem,8vw,3.2rem)] uppercase leading-[0.95] text-white">
            Nogometni kviz dana
          </h1>
          <p className="mt-4 text-[15px] leading-relaxed text-white/65">
            Svaki dan u ponoć stiže novih deset pitanja, ista za sve igrače. Na
            svako pitanje imaš 12 sekundi. Prvi pokušaj dana je službeni i gradi
            tvoj niz uzastopnih dana, a nakon toga možeš vježbati na nasumičnim
            pitanjima koliko god želiš.
          </p>
          <p className="mt-3 text-[15px] leading-relaxed text-white/65">
            Pitanja pokrivaju povijest nogometa: od prvog Svjetskog prvenstva
            1930. do bronce Vatrenih u Kataru, od Hajdukovih početaka u Pragu do
            finala Lige prvaka. Podijeli rezultat na story i izazovi prijatelje
            da riješe isti kviz.
          </p>
          <ul className="mt-6 flex flex-wrap gap-2">
            {TEME.map((t) => (
              <li
                key={t}
                className="rounded-full border border-white/10 bg-white/[0.03] px-3 py-1.5 text-[13px] text-white/70"
              >
                {t}
              </li>
            ))}
          </ul>
        </div>
      </section>
      <OstaleIgre current="kviz" />
    </>
  );
}
