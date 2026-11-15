import Link from "next/link";
import { ArrowRight } from "lucide-react";

// Poziv na mini igre s naslovnice. Igre su zasad samo za zabavu (nagrade su
// ugašene u components/game/v2/config.ts), pa ovdje nema riječi o popustima.
export function GamesCta() {
  return (
    <section className="py-8 sm:section-pad">
      <div className="page-shell">
        <Link
          href="/igre/"
          className="group relative flex flex-row items-center gap-3.5 overflow-hidden rounded-[16px] border border-accent/30 bg-[#0d0d0d] p-4 text-left transition-colors hover:border-accent/60 sm:gap-6 sm:p-9"
        >
          {/* tihi sjaj iza lopte */}
          <span
            aria-hidden
            className="pointer-events-none absolute -left-10 top-1/2 h-40 w-40 -translate-y-1/2 rounded-full bg-[radial-gradient(closest-side,rgba(232,255,60,0.14),rgba(232,255,60,0))] sm:-left-6 sm:h-56 sm:w-56"
          />
          <span className="relative inline-flex h-12 w-12 shrink-0 items-center justify-center sm:h-16 sm:w-16">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/mix/lopta-hrvatska.webp"
              alt=""
              width={316}
              height={316}
              loading="lazy"
              decoding="async"
              className="h-full w-full object-contain drop-shadow-[0_6px_10px_rgba(0,0,0,0.6)] transition-transform duration-500 ease-out group-hover:-translate-y-1 group-hover:rotate-[-25deg]"
            />
          </span>

          <div className="relative min-w-0 flex-1">
            <span className="inline-flex w-fit items-center rounded-full border border-accent/40 bg-accent/10 px-2.5 py-0.5 text-[9px] font-bold uppercase tracking-[0.22em] text-accent sm:px-3 sm:py-1 sm:text-[10px]">
              Mini igre
            </span>
            <h2 className="mt-2 font-heading text-[clamp(1.3rem,4vw,2.6rem)] uppercase leading-[0.98] tracking-[0.03em] text-white sm:mt-3">
              Odigraj partiju, sruši rekord
            </h2>
            {/* Kratko na mobilnoj, puni popis na desktopu */}
            <p className="mt-1.5 text-[13px] leading-5 text-white/60 sm:mt-2 sm:text-sm sm:leading-6">
              <span className="sm:hidden">Penalty Cup, Kviz dana i Žongliranje.</span>
              <span className="hidden sm:inline">
                Penalty Cup, Kviz dana i Žongliranje — kratke nogometne igre za pauzu. Svaki dan novih 10 pitanja.
              </span>
            </p>
          </div>

          <span className="button-primary relative hidden shrink-0 items-center justify-center gap-2 px-7 sm:inline-flex">
            Igraj
            <ArrowRight className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-1" />
          </span>
          {/* Na mobilnoj strelica umjesto velikog gumba */}
          <ArrowRight className="relative h-5 w-5 shrink-0 text-accent sm:hidden" />
        </Link>
      </div>
    </section>
  );
}
