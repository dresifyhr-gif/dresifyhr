import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { WheelGame } from "@/components/game/wheel-game";
import { buildMetadata } from "@/lib/seo";
import { getSettings } from "@/lib/settings";

export const metadata: Metadata = buildMetadata({
  title: "DRESIFY kolo sreće — zavrti i osvoji nagradu",
  description:
    "Zavrti DRESIFY kolo sreće i osvoji popust, besplatnu dostavu ili gratis dres. Jedna vrtnja po broju mobitela, a svaka narudžba od 60 € donosi novu.",
  path: "/kolo"
});

export const dynamic = "force-dynamic";

export default async function KoloPage() {
  // Kolo se pali u Postavkama. Dok je ugašeno, stranica ne postoji — da Google
  // ne indeksira nešto što kupac ne može koristiti.
  const s = await getSettings();
  if (!s.koloActive) notFound();

  return (
    <section className="section-pad">
      <div className="page-shell max-w-2xl">
        <div className="mb-8 text-center">
          <span className="section-kicker">Kolo sreće</span>
          <h1 className="mt-2 font-heading text-[clamp(2.2rem,6vw,3.6rem)] uppercase leading-[0.95] tracking-[0.04em] text-white">
            Zavrti i osvoji
          </h1>
          <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-white/60">
            Jedna vrtnja po broju mobitela. Svaka narudžba od 60 € donosi novu vrtnju.
            Osvojena šifra vrijedi 48 sati.
          </p>
        </div>

        <WheelGame />

        <p className="mt-8 text-center text-sm text-white/50">
          <Link href="/igre/" className="underline underline-offset-4 hover:text-accent">
            ← Sve mini igre
          </Link>
        </p>
      </div>
    </section>
  );
}
