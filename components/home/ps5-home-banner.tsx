import Link from "next/link";
import { Gift, ArrowRight } from "lucide-react";

import { getFollowerCount } from "@/lib/ig-stats";
import { Ps5HomeCounter } from "@/components/home/ps5-home-counter";

// Slim horizontalna traka na naslovnoj (iznad heroa): live IG counter + link na /ps5.
// Namjerno niska (jedan red na desktopu) jer je naslovna već natrpana.
const GOAL = 10000;

export async function Ps5HomeBanner() {
  const followers = await getFollowerCount();

  return (
    <Link
      href="/ps5"
      className="group block border-y border-white/10 bg-white/[0.02] transition hover:bg-white/[0.04]"
    >
      {/* Sve u jednom redu (i mobitel i desktop): naslov · Pac-Man staza · gumb. */}
      <div className="page-shell flex items-center gap-2.5 py-2.5 sm:gap-5 sm:py-3">
        <div className="flex shrink-0 items-center gap-1.5 sm:gap-2.5">
          <Gift className="h-5 w-5 shrink-0 text-accent" />
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
