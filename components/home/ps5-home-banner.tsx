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
      <div className="page-shell flex flex-col items-center gap-3 py-3 sm:flex-row sm:gap-5">
        <div className="flex shrink-0 items-center gap-2.5">
          <span className="relative flex h-2.5 w-2.5">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-accent opacity-60" />
            <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-accent" />
          </span>
          <Gift className="h-5 w-5 text-accent" />
          <span className="text-sm font-bold uppercase tracking-wide text-white">
            Osvoji <span className="text-accent">PS5</span> + FC 27
          </span>
        </div>

        <Ps5HomeCounter current={followers} goal={GOAL} />

        <span className="inline-flex shrink-0 items-center gap-1.5 rounded-[10px] bg-accent px-4 py-2 text-xs font-bold uppercase tracking-wide text-black transition group-hover:gap-2.5">
          Sudjeluj <ArrowRight className="h-3.5 w-3.5" />
        </span>
      </div>
    </Link>
  );
}
