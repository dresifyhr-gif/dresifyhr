import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { WheelGame } from "@/components/game/wheel-game";
import { buildMetadata } from "@/lib/seo";
import { getSettings } from "@/lib/settings";

export const metadata: Metadata = buildMetadata({
  title: "DRESIFY kolo sreće: zavrti i osvoji nagradu",
  description:
    "Zavrti DRESIFY kolo sreće i osvoji popust, besplatnu dostavu ili gratis dres. Jedna vrtnja po broju mobitela, a svaka narudžba od 60 € donosi novu.",
  path: "/kolo"
});

export const dynamic = "force-dynamic";

const STEPS = [
  { n: "01", title: "Upiši broj", text: "Vrtnje se vežu uz broj mobitela, pa nagrada ostaje tvoja." },
  { n: "02", title: "Zavrti", text: "Prva vrtnja je besplatna. Svaka narudžba od 60 € donosi još jednu." },
  { n: "03", title: "Iskoristi", text: "Osvojena šifra vrijedi 48 sati. Jednim dodirom je preneseš u košaricu." }
];

export default async function KoloPage() {
  // Kolo se pali u Postavkama. Dok je ugašeno, stranica ne postoji — da Google
  // ne indeksira nešto što kupac ne može koristiti.
  const s = await getSettings();
  if (!s.koloActive) notFound();

  return (
    <>
      <WheelGame />

      <section className="px-4 pb-16 pt-10 md:pt-4">
        <div className="mx-auto max-w-2xl">
          <div className="text-center">
            <span className="section-kicker">Kolo sreće</span>
            <h1 className="mt-2 font-heading text-[clamp(2.2rem,6vw,3.4rem)] uppercase leading-[0.95] tracking-[0.04em] text-white">
              Zavrti i osvoji
            </h1>
            <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-white/60">
              Na kolu su 5 %, 10 % i 20 % popusta, besplatna dostava, dodatna vrtnja i gratis dres.
            </p>
          </div>

          <ol className="mt-8 grid gap-3 sm:grid-cols-3">
            {STEPS.map((step) => (
              <li key={step.n} className="rounded-[16px] border border-white/10 bg-white/[0.03] p-4">
                <span className="font-heading text-[15px] tracking-[0.12em] text-accent">{step.n}</span>
                <p className="mt-1 font-heading text-[22px] uppercase leading-none tracking-[0.04em] text-white">{step.title}</p>
                <p className="mt-2 text-[13px] leading-5 text-white/55">{step.text}</p>
              </li>
            ))}
          </ol>

          <p className="mt-8 text-center text-sm text-white/50">
            <Link href="/igre/" className="underline underline-offset-4 hover:text-accent">
              Sve mini igre
            </Link>
          </p>
        </div>
      </section>
    </>
  );
}
