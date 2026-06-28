import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Goal, HelpCircle, Volleyball } from "lucide-react";

import { buildMetadata } from "@/lib/seo";

export const metadata: Metadata = buildMetadata({
  title: "DRESIFY mini igre — igraj i osvoji nagradu",
  description:
    "Igraj DRESIFY mini igre: Penalty Cup, Flappy Ball i Football Kviz. Pobijedi i osvoji popust ili poklon uz narudžbu.",
  path: "/igre"
});

const games = [
  {
    href: "/igra",
    title: "Penalty Cup",
    desc: "Zabij 4 od 5 penala protiv DRESIFY golmana. Osvoji −10% popust.",
    Icon: Goal
  },
  {
    href: "/flappy",
    title: "Flappy Ball",
    desc: "Provedi loptu kroz golove — što dalje prođeš, veći popust (do −20%).",
    Icon: Volleyball
  },
  {
    href: "/kviz",
    title: "Football Kviz",
    desc: "5 pitanja iz footballa. Odgovori 4/5 točno i osvoji nagradu po izboru.",
    Icon: HelpCircle
  }
];

export default function IgrePage() {
  return (
    <section className="section-pad">
      <div className="page-shell max-w-4xl">
        <div className="mb-8 text-center">
          <span className="section-kicker">Mini igre</span>
          <h1 className="mt-2 font-heading text-[clamp(2.2rem,6vw,3.6rem)] uppercase leading-[0.95] tracking-[0.04em] text-white">
            Igraj i osvoji popust
          </h1>
          <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-white/60">
            Pobijedi i osvoji popust ili poklon iznenađenja uz narudžbu. Tri igre — odaberi svoju.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {games.map((g) => (
            <Link
              key={g.href}
              href={g.href}
              className="group panel flex flex-col gap-3 p-6 transition hover:border-accent/50"
            >
              <div className="inline-flex h-12 w-12 items-center justify-center rounded-[10px] border border-white/10 bg-accent/10 text-accent">
                <g.Icon className="h-6 w-6" />
              </div>
              <h2 className="font-heading text-2xl uppercase tracking-[0.04em] text-white">{g.title}</h2>
              <p className="text-sm leading-6 text-white/60">{g.desc}</p>
              <span className="mt-1 inline-flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.16em] text-accent">
                Igraj
                <ArrowRight className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-1" />
              </span>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
