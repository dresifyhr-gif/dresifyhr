import Image from "next/image";
import Link from "next/link";
import { ArrowRight } from "lucide-react";

// Naslovni banner koji vodi na /trenirke — ista uloga kao StreetwearBanner
// (mobilna vidljivost). U bojama branda: crna ploha, tanki rub, bordo crta
// i pola riječi u accentu (kao logo DRES|IFY).
// Mobilna: kompaktno. Desktop: opis + slike trenirki.
export function TrenirkaBanner({ images = [] }: { images?: string[] }) {
  const tiles = images.filter(Boolean).slice(0, 5);

  return (
    <section className="bg-[#0a0a0a] pb-2 pt-1.5 sm:pb-4 sm:pt-2">
      <div className="page-shell">
        <Link
          href="/trenirke"
          className="group relative flex items-center justify-between gap-4 overflow-hidden rounded-[14px] border border-white/10 bg-[#111111] py-3.5 pl-5 pr-3.5 transition hover:border-accent/50 sm:px-8 sm:py-6"
        >
          <span aria-hidden className="absolute inset-y-0 left-0 w-[3px] bg-[#8e1020]" />

          <div className="relative min-w-0">
            <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-white/45 sm:text-[11px]">Za trening i van</p>
            <h2 className="mt-0.5 font-heading text-[28px] uppercase leading-none text-white sm:mt-1 sm:text-5xl">
              TRENI<span className="text-accent">RKE</span>
            </h2>
            {/* Opis samo na širem ekranu — mobilna ostaje kratka */}
            <p className="mt-2 hidden max-w-md text-sm leading-6 text-white/60 sm:block">
              Jakna + hlače u klupskom dizajnu. Topla i udobna, plaćanje pouzećem, besplatna dostava od 60 € za registrirane.
            </p>
          </div>

          {/* Slike trenirki — preklapajuće pločice (samo na širem ekranu) */}
          {tiles.length > 0 && (
            <div className="relative ml-auto hidden shrink-0 items-center lg:flex">
              {tiles.map((src, i) => (
                <div
                  key={src}
                  className="relative h-20 w-20 overflow-hidden rounded-[10px] border border-white/10 bg-[#fbfbfb] transition-transform duration-200 group-hover:-translate-y-0.5 xl:h-24 xl:w-24"
                  style={{ marginLeft: i === 0 ? 0 : "-1rem", rotate: `${(i - (tiles.length - 1) / 2) * 3}deg`, zIndex: tiles.length - i }}
                >
                  <Image src={src} alt="Dresify trenirka komplet" fill sizes="96px" className="object-contain p-1.5" />
                </div>
              ))}
            </div>
          )}

          <span className="relative flex shrink-0 items-center gap-1.5 rounded-full border border-accent/60 px-4 py-2.5 text-xs font-bold uppercase tracking-wide text-accent transition group-hover:bg-accent group-hover:text-black sm:ml-4 sm:px-5 sm:text-sm">
            Pogledaj
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" strokeWidth={1.75} />
          </span>
        </Link>
      </div>
    </section>
  );
}
