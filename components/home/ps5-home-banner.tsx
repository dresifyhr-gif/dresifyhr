import Link from "next/link";
import { Gift, ArrowRight } from "lucide-react";

import { Ps5HomeCounter } from "@/components/home/ps5-home-counter";

// Slim traka za PS5 nagradnu igru: live IG counter + link na /ps5.
// - "strip": puna širina iznad heroa (samo tablet/desktop).
// - "card": uokvirena kartica ispod glavnog gumba u heroju (mobitel), da prvi
//   ekran na mobitelu ne počinje s tri trake prije naslova.
const GOAL = 10000;

export function Ps5HomeBanner({ followers, variant = "strip" }: { followers: number; variant?: "strip" | "card" }) {
  const card = variant === "card";

  return (
    <Link
      href="/ps5"
      className={
        card
          ? "group block rounded-[12px] border border-white/10 bg-white/[0.02] transition hover:border-accent/40"
          : "group block border-y border-white/10 bg-white/[0.02] transition hover:bg-white/[0.04]"
      }
    >
      {/* Sve u jednom redu: naslov · staza napretka · gumb. */}
      <div className={`${card ? "px-3" : "page-shell"} flex items-center gap-2.5 py-2.5 sm:gap-5 sm:py-3`}>
        <div className="flex shrink-0 items-center gap-1.5 sm:gap-2.5">
          <Gift className="h-[18px] w-[18px] shrink-0 text-accent" strokeWidth={1.75} />
          <span className="whitespace-nowrap text-xs font-bold uppercase tracking-wide text-white sm:text-sm">
            Osvoji <span className="text-accent">PS5</span>
            {/* "+ FC 27" samo na desktopu — na mobitelu je red pretijesan */}
            <span className="hidden sm:inline"> + FC 27</span>
          </span>
        </div>

        <div className="min-w-0 flex-1">
          <Ps5HomeCounter current={followers} goal={GOAL} />
        </div>

        <span className="inline-flex shrink-0 items-center gap-1.5 rounded-[10px] bg-accent px-3 py-1.5 text-[11px] font-bold uppercase tracking-wide text-black transition group-hover:gap-2.5 sm:px-3.5 sm:py-2 sm:text-xs">
          Sudjeluj <ArrowRight className="h-3.5 w-3.5" />
        </span>
      </div>
    </Link>
  );
}
