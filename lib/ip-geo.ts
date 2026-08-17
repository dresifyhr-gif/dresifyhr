import "server-only";

// IPinfo Lite obogaćivanje IP adrese → država + provajder (ISP/organizacija).
// Koristi se u adminu da se odmah vidi odakle je narudžba (otkrivanje botova/spama).
// Token ide u Vercel env (IPINFO_TOKEN). Bez tokena tiho vrati prazno.
// IPinfo Lite je "unlimited requests", a rezultate keširamo u memoriji po IP-u.

type Geo = { country: string; org: string; flag: string };

const cache = new Map<string, Geo | null>();

// Zastavica iz ISO country_code (npr. "US" → 🇺🇸) preko regional indicator znakova.
function flagFromCode(code?: string): string {
  if (!code || code.length !== 2) return "🌐";
  const A = 0x1f1e6;
  return String.fromCodePoint(A + (code.charCodeAt(0) - 65), A + (code.charCodeAt(1) - 65));
}

async function fetchOne(ip: string, token: string): Promise<Geo | null> {
  try {
    const res = await fetch(`https://api.ipinfo.io/lite/${encodeURIComponent(ip)}?token=${token}`, {
      cache: "no-store",
      signal: AbortSignal.timeout(4000)
    });
    if (!res.ok) return null;
    const d = (await res.json()) as { country?: string; country_code?: string; as_name?: string };
    return {
      country: d.country || "",
      org: d.as_name || "",
      flag: flagFromCode(d.country_code)
    };
  } catch {
    return null;
  }
}

// Obogati skup IP-ova odjednom (paralelno, s keširanjem). Vraća mapu ip → Geo.
export async function lookupIps(ips: (string | null | undefined)[]): Promise<Map<string, Geo>> {
  const out = new Map<string, Geo>();
  const token = process.env.IPINFO_TOKEN;
  if (!token) return out;

  const unique = [...new Set(ips.filter((v): v is string => !!v && v.trim() !== ""))];
  const missing = unique.filter((ip) => !cache.has(ip));

  await Promise.all(
    missing.map(async (ip) => {
      cache.set(ip, await fetchOne(ip, token));
    })
  );

  for (const ip of unique) {
    const g = cache.get(ip);
    if (g) out.set(ip, g);
  }
  return out;
}
