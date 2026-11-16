import type { Metadata } from "next";

import { PaziProzorGame } from "@/components/game/pazi-prozor/pazi-prozor-game";

// Interni prototip — nije povezan nigdje na stranici i ne indeksira se.
export const metadata: Metadata = {
  title: "Pazi prozor! — prototip",
  robots: { index: false, follow: false, nocache: true, googleBot: { index: false, follow: false } }
};

export default function PaziProzorProbaPage() {
  return (
    <>
      <PaziProzorGame />
      <section className="page-shell max-w-2xl pb-16 pt-8">
        <span className="section-kicker">Prototip</span>
        <h1 className="mt-2 font-heading text-[clamp(2rem,6vw,3rem)] uppercase leading-[0.95] tracking-[0.03em] text-white">Pazi prozor!</h1>
        <p className="mt-3 text-[15px] leading-7 text-white/60">
          Jedna razina za probu: dvorište između zgrada, stari auto i dva ruksaka umjesto gola. Povuci unatrag i pusti, odbij loptu
          od zida i zabij. Bakin prozor na trećem katu ne diraj.
        </p>
      </section>
    </>
  );
}
