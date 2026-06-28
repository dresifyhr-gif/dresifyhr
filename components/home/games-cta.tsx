import Link from "next/link";
import { Gamepad2, ArrowRight } from "lucide-react";

export function GamesCta() {
  return (
    <section className="section-pad">
      <div className="page-shell">
        <Link
          href="/igre"
          className="group flex flex-col items-center gap-5 overflow-hidden rounded-[16px] border border-accent/30 bg-[#0d0d0d] p-7 text-center sm:flex-row sm:gap-6 sm:p-9 sm:text-left"
        >
          <div className="inline-flex h-14 w-14 shrink-0 items-center justify-center rounded-[12px] border border-accent/30 bg-accent/10 text-accent">
            <Gamepad2 className="h-7 w-7" />
          </div>

          <div className="flex-1">
            <span className="inline-flex w-fit items-center rounded-full border border-accent/40 bg-accent/10 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.22em] text-accent">
              Mini igre
            </span>
            <h2 className="mt-3 font-heading text-[clamp(1.7rem,4vw,2.6rem)] uppercase leading-[0.98] tracking-[0.03em] text-white">
              Odigraj i osvoji nagradu!
            </h2>
            <p className="mt-2 text-sm leading-6 text-white/60">
              Penalty Cup ⚽, Flappy Ball, Football Kviz, Spojnica, Zmija i Uhvati dres — pobijedi i osvoji besplatnu dostavu, popust ili poklon.
            </p>
          </div>

          <span className="button-primary mt-1 inline-flex shrink-0 items-center justify-center gap-2 px-7 sm:mt-0">
            Igraj sad
            <ArrowRight className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-1" />
          </span>
        </Link>
      </div>
    </section>
  );
}
