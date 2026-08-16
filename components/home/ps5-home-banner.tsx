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
      className="group block border-y border-accent/25 bg-gradient-to-r from-accent/[0.04] via-accent/[0.12] to-accent/[0.04] transition hover:via-accent/[0.18]"
    >
      {/* Mobitel: 2 kompaktna reda (naslov+gumb, pa progress ispod) da se naslovna
          brže vidi. Desktop (sm+): jedan slim red kao prije. */}
      <div className="page-shell py-2.5 sm:py-3">
        <div className="flex items-center gap-3 sm:gap-5">
          <div className="flex shrink-0 items-center gap-2 sm:gap-2.5">
            <span className="relative flex h-2.5 w-2.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-accent opacity-60" />
              <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-accent" />
            </span>
            <Gift className="h-5 w-5 text-accent" />
            <span className="text-sm font-bold uppercase tracking-wide text-white">
              Osvoji <span className="text-accent">PS5</span> + FC 27
            </span>
          </div>

          {/* Progress inline samo na desktopu */}
          <div className="hidden flex-1 sm:block">
            <Ps5HomeCounter current={followers} goal={GOAL} />
          </div>

          <span className="ml-auto inline-flex shrink-0 items-center gap-1.5 rounded-[10px] bg-accent px-4 py-2 text-xs font-bold uppercase tracking-wide text-black transition group-hover:gap-2.5 sm:ml-0">
            Sudjeluj <ArrowRight className="h-3.5 w-3.5" />
          </span>
        </div>

        {/* Progress ispod, samo na mobitelu */}
        <div className="mt-2 sm:hidden">
          <Ps5HomeCounter current={followers} goal={GOAL} />
        </div>
      </div>
    </Link>
  );
}
