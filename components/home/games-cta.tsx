import Link from "next/link";
import { Gamepad2, ArrowRight } from "lucide-react";

export function GamesCta() {
  return (
    <section className="pt-20 lg:pt-28">
      <div className="page-shell">
        <Link
          href="/igre"
          className="group flex flex-row items-center gap-3.5 overflow-hidden rounded-[2px] border border-white/[0.18] bg-ink2 p-4 text-left sm:gap-6 sm:p-9"
        >
          <div className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-accent text-black sm:h-14 sm:w-14">
            <Gamepad2 className="h-5 w-5 sm:h-7 sm:w-7" />
          </div>

          <div className="min-w-0 flex-1">
            <span className="text-[10px] font-bold uppercase tracking-[0.16em] text-mute">
              Mini igre
            </span>
            <h2 className="mt-1.5 font-display text-[clamp(1.5rem,4vw,2.8rem)] uppercase leading-[0.95] text-fg sm:mt-2">
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
