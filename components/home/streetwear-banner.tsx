import Link from "next/link";
import { ArrowRight } from "lucide-react";

// Naslovni banner koji vodi na /streetwear — ključno za mobilnu vidljivost
// (većina kupaca ne otvara izbornik, gleda naslovnu). Bijelo-narančasti identitet.
export function StreetwearBanner() {
  return (
    <section className="bg-[#0a0a0a] px-4 pb-2 pt-6 sm:pb-4 sm:pt-8">
      <div className="page-shell">
        <Link
          href="/streetwear"
          className="group relative flex items-center justify-between gap-4 overflow-hidden rounded-2xl bg-gradient-to-r from-orange-500 to-orange-600 px-5 py-6 shadow-[0_10px_40px_-12px_rgba(249,115,22,0.6)] transition hover:from-orange-400 hover:to-orange-500 sm:px-8 sm:py-8"
        >
          {/* Suptilni uzorak u pozadini */}
          <span aria-hidden className="pointer-events-none absolute -right-8 -top-10 h-40 w-40 rounded-full bg-white/10 blur-2xl" />
          <span aria-hidden className="pointer-events-none absolute -bottom-12 left-1/3 h-40 w-40 rounded-full bg-black/10 blur-2xl" />

          <div className="relative">
            <p className="text-[11px] font-bold uppercase tracking-[0.28em] text-white/80">Novo u ponudi</p>
            <h2 className="mt-1 font-heading text-3xl uppercase leading-none text-white sm:text-5xl">
              STREET<span className="text-slate-900">WEAR</span>
            </h2>
            <p className="mt-2 max-w-md text-[13px] leading-5 text-white/90 sm:text-sm">
              Kompleti u uličnom stilu — majica + hlačice. Veličine XS–L, besplatna dostava, plaćanje pouzećem.
            </p>
          </div>

          <span className="relative flex shrink-0 items-center gap-2 rounded-full bg-slate-900 px-4 py-2.5 text-xs font-bold uppercase tracking-wide text-white transition group-hover:bg-black sm:px-5 sm:text-sm">
            Pogledaj
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
          </span>
        </Link>
      </div>
    </section>
  );
}
