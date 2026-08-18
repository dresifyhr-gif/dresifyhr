import "server-only";

import { unstable_cache } from "next/cache";

// Broj Instagram pratitelja dolazi iz istog Behold feeda koji već koristimo za widget
// (components/home/instagram-section.tsx). Behold JSON vraća polje `followersCount`.
const BEHOLD_FEED = "https://feeds.behold.so/Mr4iBO03Jb1m1NL5S20x";
const FALLBACK = 2505; // zadnja poznata vrijednost ako Behold ne odgovori (Behold pauziran zbog overage 18.8.)

const fetchFollowers = unstable_cache(
  async (): Promise<number> => {
    try {
      const res = await fetch(BEHOLD_FEED, { cache: "no-store", signal: AbortSignal.timeout(6000) });
      if (!res.ok) return FALLBACK;
      const d = await res.json().catch(() => null);
      const n = Number(d?.followersCount);
      return Number.isFinite(n) && n > 0 ? n : FALLBACK;
    } catch {
      return FALLBACK;
    }
  },
  ["ig-followers"],
  { revalidate: 600, tags: ["ig-stats"] } // osvježi najviše svakih 10 min
);

export async function getFollowerCount(): Promise<number> {
  return fetchFollowers();
}
