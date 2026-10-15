import "server-only";

import { unstable_cache } from "next/cache";
import { getSettings } from "@/lib/settings";
import { getIgTokenStrict } from "@/lib/ig-token";
import { withLastGood } from "@/lib/db-guard";

// Broj Instagram pratitelja preko službenog Meta Instagram Graph API-ja (besplatno,
// veliki limiti — za razliku od Beholda koji je puknuo na overage). Treba u Vercel:
//  - IG_USER_ID    → ID Instagram business računa (npr. 1784xxxxxxxxxxx)
//  - IG_GRAPH_TOKEN→ long-lived token s dozvolom instagram_basic + pages_read_engagement
// Ako nije postavljeno ili padne → zadnja poznata vrijednost (FALLBACK).
const FALLBACK = 2505;
const API_VERSION = "v21.0";

// Keš 6 h (prije 10 min — svako osvježavanje čita token iz baze i budi Neon).
// Neuspjeh (baza ili Instagram) BACA grešku umjesto da vrati FALLBACK, da se
// lažni broj ne spremi preko zadnjeg pravog (Next tada služi zadnji dobar unos).
// FALLBACK se vraća samo kad Instagram stvarno nije spojen.
// Nakon neuspjeha (Instagram ILI čitanje tokena iz baze) 30 min se ne pokušava ponovno: bez toga bi
// pokvaren token na SVAKI posjet naslovnice zvao bazu i Instagram (Next pokreće
// pozadinsko osvježavanje zastarjelog unosa na svaki zahtjev, bez spajanja).
const GRAPH_COOLDOWN_MS = 30 * 60_000;
let graphFailedUntil = 0;

const fetchFollowersCached = unstable_cache(
  async (): Promise<number> => {
    if (Date.now() < graphFailedUntil) throw new Error("[ig-stats] Instagram/baza nedavno nisu odgovorili — preskačem");
    try {
      // Prvo token spojen u adminu ("Poveži Instagram"); fallback na stare env varijable.
      const conn = await getIgTokenStrict();
      const igId = conn?.igBusinessId || process.env.IG_USER_ID;
      const token = conn?.token || process.env.IG_GRAPH_TOKEN;
      if (!igId || !token) return FALLBACK;
      const url = `https://graph.facebook.com/${API_VERSION}/${igId}?fields=followers_count&access_token=${encodeURIComponent(token)}`;
      const res = await fetch(url, { cache: "no-store", signal: AbortSignal.timeout(6000) });
      if (!res.ok) throw new Error(`[ig-stats] Graph API ${res.status}`);
      const d = await res.json().catch(() => null);
      const n = Number(d?.followers_count);
      if (!Number.isFinite(n) || n <= 0) throw new Error("[ig-stats] neispravan followers_count");
      return n;
    } catch (error) {
      graphFailedUntil = Date.now() + GRAPH_COOLDOWN_MS;
      throw error;
    }
  },
  ["ig-followers-v2"],
  { revalidate: 21600, tags: ["ig-stats"] }
);

export async function getFollowerCount(): Promise<number> {
  // Ručno upisan broj u Postavkama ima prednost (Gazda sam ažurira). Ako nije
  // postavljen (0), pokušaj Instagram Graph API, pa zadnji dobar broj ili fallback.
  const { igFollowers } = await getSettings();
  if (igFollowers && igFollowers > 0) return igFollowers;
  return withLastGood("ig-followers", FALLBACK, fetchFollowersCached);
}
