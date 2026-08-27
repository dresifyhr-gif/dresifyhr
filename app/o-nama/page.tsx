import type { Metadata } from "next";
import Link from "next/link";
import { Heart, Package, Shirt, Truck, Zap, Shield } from "lucide-react";

import { buildMetadata } from "@/lib/seo";

export const metadata: Metadata = buildMetadata({
  title: "O nama — Dresify | Nogometni dresovi iz Hrvatske",
  description:
    "Dresify je hrvatska online trgovina nogometnih dresova. Više od 500 zadovoljnih kupaca, fiksna cijena 20€, dostava pouzećem po cijeloj Hrvatskoj.",
  path: "/o-nama"
});

const stats = [
  { value: "500+", label: "zadovoljnih kupaca" },
  { value: "100+", label: "dresova u katalogu" },
  { value: "20€", label: "fiksna cijena" },
  { value: "2–5 dana", label: "dostava po HR" }
];

const values = [
  {
    Icon: Shirt,
    title: "Dresovi koje stvarno nosiš",
    desc: "Nije sve u skupim originalima. Mi nudimo dresove koji izgledaju odlično, po cijeni koja ima smisla."
  },
  {
    Icon: Truck,
    title: "Dostava po cijeloj Hrvatskoj",
    desc: "Šaljemo brzom poštom na svaku adresu u Hrvatskoj. Pakiranje je uredno, dostava brza."
  },
  {
    Icon: Zap,
    title: "Narudžba za 2 minute",
    desc: "Bez registracije, bez komplikacija. Odabereš dres, veličinu, pošalješ upit — gotovo."
  },
  {
    Icon: Shield,
    title: "Jednostavna zamjena",
    desc: "Nije ti odgovarala veličina? Bez problema — javi nam se i dogovorimo zamjenu za drugu."
  }
];

export default function ONamaPage() {
  return (
    <main>
      {/* Hero */}
      <section className="section-pad">
        <div className="page-shell max-w-3xl text-center">
          <span className="section-kicker">O nama</span>
          <h1 className="mt-4 font-heading text-[clamp(2.4rem,7vw,4.5rem)] uppercase leading-[0.95] tracking-[0.04em] text-white">
            Dresovi za{" "}
            <span className="text-accent">prave navijače</span>
          </h1>
          <p className="section-copy mx-auto mt-6">
            Dresify je nastao iz jednostavne ideje — da svaki navijač može imati dres svog idola,
            bez da troši cijelu plaću. Fiksna cijena, brza dostava, bez komplikacija.
          </p>
        </div>
      </section>

      {/* Stats */}
      <section className="border-y border-white/8 py-10 sm:py-12">
        <div className="page-shell">
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4 sm:gap-6">
            {stats.map((s) => (
              <div key={s.label} className="panel p-5 text-center sm:p-7">
                <div className="font-heading text-[2.2rem] uppercase leading-none text-accent sm:text-[2.8rem]">
                  {s.value}
                </div>
                <div className="mt-2 text-[11px] uppercase tracking-[0.24em] text-white/45">
                  {s.label}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Story */}
      <section className="section-pad">
        <div className="page-shell max-w-3xl">
          <div className="space-y-5 text-base leading-8 text-white/65 sm:text-lg sm:leading-9">
            <p>
              Dresify je nastao iz jednostavne ideje:{" "}
              <span className="font-semibold text-white">
                jedan dres, jedna cijena, brza dostava
              </span>
              . Bez skrivenih troškova, bez čekanja tjednima, bez razočaranja kad paket stigne.
            </p>
            <p>
              Danas imamo više od 100 modela u katalogu — od aktualnih zvijezda poput Yamala
              i Mbappéa do retro klasika koje nosi svaka generacija. Svaki dres šaljemo s pažnjom,
              uredno upakiran, na svaku adresu u Hrvatskoj.
            </p>
            <p className="flex items-center gap-2 text-white/45 text-sm sm:text-base">
              <Heart className="h-4 w-4 shrink-0 text-accent" />
              Izrađeno s ljubavlju prema nogometu, iz Hrvatske.
            </p>
          </div>
        </div>
      </section>

      {/* Values */}
      <section className="section-pad border-t border-white/8">
        <div className="page-shell">
          <div className="mb-10 text-center sm:mb-12">
            <span className="section-kicker">Zašto Dresify</span>
            <h2 className="mt-4 font-heading text-[clamp(1.8rem,4vw,3rem)] uppercase leading-[0.95] tracking-[0.04em] text-white">
              Što nas razlikuje
            </h2>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {values.map(({ Icon, title, desc }) => (
              <div key={title} className="panel flex flex-col gap-4 p-6">
                <div className="inline-flex h-11 w-11 items-center justify-center rounded-[10px] border border-accent/30 bg-accent/10 text-accent">
                  <Icon className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-heading text-lg uppercase leading-tight tracking-[0.04em] text-white">
                    {title}
                  </h3>
                  <p className="mt-2 text-sm leading-6 text-white/55">{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="section-pad border-t border-white/8">
        <div className="page-shell max-w-xl text-center">
          <Package className="mx-auto mb-5 h-10 w-10 text-accent" />
          <h2 className="font-heading text-[clamp(1.8rem,4vw,3rem)] uppercase leading-[0.95] tracking-[0.04em] text-white">
            Spreman za novi dres?
          </h2>
          <p className="section-copy mx-auto mt-4">
            Pogledaj katalog i pronađi dres koji tražiš.
          </p>
          <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
            <Link href="/dresovi" className="button-primary">
              Pogledaj dresove
            </Link>
            <Link href="/kontakt" className="button-secondary">
              Kontaktiraj nas
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
