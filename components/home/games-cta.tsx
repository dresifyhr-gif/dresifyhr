import Link from "next/link";
import { Gamepad2, ArrowRight } from "lucide-react";

export function GamesCta() {
  return (
    <section className="py-8 sm:section-pad">
      <div className="page-shell">
        <Link
          href="/igre"
          className="group flex flex-row items-center gap-3.5 overflow-hidden rounded-[16px] border border-accent/30 bg-[#0d0d0d] p-4 text-left sm:gap-6 sm:p-9"
        >
          <div className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-[12px] border border-accent/30 bg-accent/10 text-accent sm:h-14 sm:w-14">
            <Gamepad2 className="h-5 w-5 sm:h-7 sm:w-7" />
          </div>

          <div className="min-w-0 flex-1">
            <span className="inline-flex w-fit items-center rounded-full border border-accent/40 bg-accent/10 px-2.5 py-0.5 text-[9px] font-bold uppercase tracking-[0.22em] text-accent sm:px-3 sm:py-1 sm:text-[10px]">
              Mini igre
            </span>
            <h2 className="mt-2 font-heading text-[clamp(1.3rem,4vw,2.6rem)] uppercase leading-[0.98] tracking-[0.03em] text-white sm:mt-3">
              Odigraj i osvoji nagradu!
            </h2>
            {/* Kratko na mobilnoj, puni popis na desktopu */}
            <p className="mt-1.5 text-[13px] leading-5 text-white/60 sm:mt-2 sm:text-sm sm:leading-6">
              <span className="sm:hidden">Pobijedi i osvoji besplatnu dostavu, popust ili poklon.</span>
              <span className="hidden sm:inline">Penalty Cup ⚽, Flappy Ball, Football Kviz, Spojnica, Zmija, Uhvati dres i Super Dresify — pobijedi i osvoji besplatnu dostavu, popust ili poklon.</span>
            </p>
          </div>

          <span className="button-primary hidden shrink-0 items-center justify-center gap-2 px-7 sm:inline-flex">
            Igraj sad
            <ArrowRight className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-1" />
          </span>
          {/* Na mobilnoj strelica umjesto velikog gumba */}
          <ArrowRight className="h-5 w-5 shrink-0 text-accent sm:hidden" />
        </Link>
      </div>
    </section>
  );
}
