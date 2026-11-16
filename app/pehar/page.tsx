import type { Metadata } from "next";

import { PEHAR_NAZIV, PEHAR_PUTANJA } from "@/components/game/v2/pehar/config";
import { PeharIgra } from "@/components/game/v2/pehar/pehar-igra";
import { buildMetadata } from "@/lib/seo";

export const metadata: Metadata = buildMetadata({
  title: `${PEHAR_NAZIV} — nogometni kviz do vrha`,
  description:
    "Petnaest nogometnih pitanja zaredom, od lakih do ekspertnih. Jedan krivi odgovor i ispadaš. Sigurne razine Kvart i Prva liga, tri džokera i put do naslova svjetskog prvaka.",
  path: PEHAR_PUTANJA,
  keywords: [
    "nogometni kviz",
    "kviz o nogometu",
    "nogometna pitanja",
    "teški nogometni kviz",
    "kviz znanja nogomet",
  ],
});

const RAZINE: [string, string][] = [
  ["1–3", "Lako"],
  ["4–6", "Srednje"],
  ["7–9", "Teško"],
  ["10–12", "Vrlo teško"],
  ["13–15", "Ekspert"],
];

export default function PeharPage() {
  return (
    <>
      <PeharIgra />
      <section className="section-pad">
        <div className="page-shell max-w-2xl">
          <h1 className="font-heading text-[clamp(2.2rem,8vw,3.2rem)] uppercase leading-[0.95] text-white">
            {PEHAR_NAZIV}: nogometni kviz
          </h1>
          <p className="mt-4 text-[15px] leading-relaxed text-white/65">
            Petnaest pitanja zaredom, svako teže od prethodnog. Prva su za
            zagrijavanje, zadnja tri su za prave poznavatelje: svjetska
            prvenstva od 1930. naovamo, finala Kupa prvaka, Zlatne lopte,
            pravila igre i povijest Vatrenih. Jedan krivi odgovor i utakmica je
            gotova.
          </p>
          <p className="mt-3 text-[15px] leading-relaxed text-white/65">
            Kad prođeš peto pitanje, Kvart je tvoj. Nakon desetog osiguraš Prvu
            ligu. Petnaesto pitanje nosi naslov svjetskog prvaka. Usput imaš tri
            džokera: 50:50 makne dva kriva odgovora, tribina glasa, a frendu
            pitanje možeš poslati na WhatsApp.
          </p>
          <ul className="mt-6 grid grid-cols-2 gap-2 sm:grid-cols-5">
            {RAZINE.map(([n, t]) => (
              <li
                key={n}
                className="rounded-[12px] border border-white/10 bg-white/[0.03] px-3 py-2"
              >
                <div className="font-heading text-[20px] leading-none text-white">
                  {n}
                </div>
                <div className="mt-1 text-[12.5px] text-white/55">{t}</div>
              </li>
            ))}
          </ul>
        </div>
      </section>
    </>
  );
}
