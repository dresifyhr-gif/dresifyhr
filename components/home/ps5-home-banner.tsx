import Link from "next/link";
import { Gift, ArrowRight } from "lucide-react";

import { getFollowerCount } from "@/lib/ig-stats";

// Slim horizontalna traka na naslovnoj (iznad heroa): live IG counter + link na /ps5.
// Namjerno niska (jedan red na desktopu) jer je naslovna već natrpana.
const GOAL = 10000;

export async function Ps5HomeBanner() {
  const followers = await getFollowerCount();
  const pct = Math.min(Math.round((followers / GOAL) * 100), 100);

  return (
    <Link
      href="/ps5"
      className="block border-b border-accent/20 bg-accent/[0.06] transition hover:bg-accent/[0.1]"
    >
      <div className="page-shell flex flex-col items-center gap-3 py-3 sm:flex-row sm:gap-5">
        <div className="flex items-center gap-2.5 shrink-0">
          <Gift className="h-5 w-5 text-accent" />
          <span className="text-sm font-bold uppercase tracking-wide text-white">
            Osvoji <span className="text-accent">PS5</span> + FC 27
          </span>
        </div>

        <div className="flex w-full flex-1 items-center gap-3">
          <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/10">
            <div className="h-full rounded-full bg-accent" style={{ width: `${pct}%` }} />
          </div>
          <span className="shrink-0 text-xs font-semibold text-white/70">
            {followers.toLocaleString("hr-HR")} / {GOAL.toLocaleString("hr-HR")}
          </span>
        </div>

        <span className="inline-flex shrink-0 items-center gap-1.5 rounded-[10px] bg-accent px-4 py-2 text-xs font-bold uppercase tracking-wide text-black">
          Sudjeluj <ArrowRight className="h-3.5 w-3.5" />
        </span>
      </div>
    </Link>
  );
}
