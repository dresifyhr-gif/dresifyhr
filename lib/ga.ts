import "server-only";

import { unstable_cache } from "next/cache";

// Google Analytics (GA4) statistika u adminu — bez servisnog računa i ključeva.
// Isti Apps Script webhook koji već nosi narudžbe (GOOGLE_SHEETS_WEBHOOK_URL)
// dobije `doGet?action=ga` granu koja pod Gazdinim Google računom (vlasnik GA
// property-a) čita GA4 Data API i vraća JSON. Snippet za Apps Script je u
// docs/ga-apps-script.md.

export type GaStats = {
  ok: boolean;
  visitors: number; // posjetitelji zadnjih 7 dana
  visitorsPrev: number; // prethodnih 7 dana (za trend)
  realtime: number; // aktivni sad (zadnjih 30 min)
  countries: { name: string; users: number }[];
  pages: { title: string; views: number }[];
  sources: { channel: string; sessions: number }[];
};

const EMPTY: GaStats = { ok: false, visitors: 0, visitorsPrev: 0, realtime: 0, countries: [], pages: [], sources: [] };

function num(v: unknown): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

function list<T>(v: unknown, map: (row: Record<string, unknown>) => T): T[] {
  if (!Array.isArray(v)) return [];
  return v.map((r) => map((r ?? {}) as Record<string, unknown>));
}

// Keširano 10 min: GA kvota je ograničena, a brojke se ne mijenjaju iz sekunde u
// sekundu. "Uživo" je zato do 10 min unatrag — dovoljno za pregled u adminu.
const fetchGaRaw = unstable_cache(
  async (): Promise<GaStats> => {
    const url = process.env.GOOGLE_SHEETS_WEBHOOK_URL;
    if (!url || process.env.GA_STATS_ENABLED !== "1") return EMPTY;
    try {
      const sep = url.includes("?") ? "&" : "?";
      // Timeout 6s — bez ovoga spor/zaglavljen webhook obješava cijelu Analitiku (RSC nikad ne vrati).
      // no-store: rate-limit radi unstable_cache (600s); sam fetch mora biti svjež, da se ne
      // zakešira prazan/stari odgovor u Next Data Cache i "zaglavi" GA na prazno.
      const res = await fetch(`${url}${sep}action=ga`, { method: "GET", cache: "no-store", signal: AbortSignal.timeout(6000) });
      if (!res.ok) return EMPTY;
      const d = await res.json().catch(() => null);
      if (!d || d.ok === false) return EMPTY;
      return {
        ok: true,
        visitors: num(d.visitors),
        visitorsPrev: num(d.visitorsPrev),
        realtime: num(d.realtime),
        countries: list(d.countries, (r) => ({ name: String(r.name ?? ""), users: num(r.users) })).filter((r) => r.name),
        pages: list(d.pages, (r) => ({ title: String(r.title ?? ""), views: num(r.views) })).filter((r) => r.title),
        sources: list(d.sources, (r) => ({ channel: String(r.channel ?? ""), sessions: num(r.sessions) })).filter((r) => r.channel)
      };
    } catch (error) {
      console.error("[ga] Failed to fetch GA stats from webhook", error);
      return EMPTY;
    }
  },
  ["ga-stats"],
  { revalidate: 600, tags: ["ga-stats"] }
);

export async function getGaStats(): Promise<GaStats> {
  return fetchGaRaw();
}
