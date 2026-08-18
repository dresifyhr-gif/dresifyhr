import "server-only";

import { unstable_cache } from "next/cache";

// Broj Instagram pratitelja preko službenog Meta Instagram Graph API-ja (besplatno,
// veliki limiti — za razliku od Beholda koji je puknuo na overage). Treba u Vercel:
//  - IG_USER_ID    → ID Instagram business računa (npr. 1784xxxxxxxxxxx)
//  - IG_GRAPH_TOKEN→ long-lived token s dozvolom instagram_basic + pages_read_engagement
// Ako nije postavljeno ili padne → zadnja poznata vrijednost (FALLBACK).
const FALLBACK = 2505;
const API_VERSION = "v21.0";

const fetchFollowers = unstable_cache(
  async (): Promise<number> => {
    const igId = process.env.IG_USER_ID;
    const token = process.env.IG_GRAPH_TOKEN;
    if (!igId || !token) return FALLBACK;
    try {
      const url = `https://graph.facebook.com/${API_VERSION}/${igId}?fields=followers_count&access_token=${encodeURIComponent(token)}`;
      const res = await fetch(url, { cache: "no-store", signal: AbortSignal.timeout(6000) });
      if (!res.ok) return FALLBACK;
      const d = await res.json().catch(() => null);
      const n = Number(d?.followers_count);
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
