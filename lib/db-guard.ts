import "server-only";

// Zaštita javne trgovine od ispada baze (npr. potrošena Neon kvota 15.10.2026.).
//
// dbQuery — koristi se UNUTAR unstable_cache funkcija. Nakon greške baze 60 s
// odmah baca grešku bez spajanja, pa ni Nextovo pozadinsko osvježavanje
// zastarjelog unosa (stale-while-revalidate) ne čeka timeout na svakom posjetu.
// Greška se nikad ne sprema u keš: Next nastavlja služiti zadnji dobar unos.
//
// withLastGood — koristi se IZVAN keša. Ako keš nema ništa (hladan start tijekom
// ispada), vraća zadnje dobre podatke iz memorije instance ili zamjenu.
const BREAKER_MS = 60_000;
let dbDownUntil = 0;

// Osigurač se pali SAMO kad baza stvarno nije dostupna (ne može se spojiti,
// potrošena kvota, timeout, zatvorena veza). Greška pojedinog upita (npr. loš
// unos) NE smije blokirati sve ostale upite na instanci.
function isDbUnavailable(error: unknown): boolean {
  const e = error as { name?: string; code?: string; message?: string } | null;
  const name = e?.name || "";
  const code = e?.code || "";
  if (name === "PrismaClientInitializationError" || name === "PrismaClientRustPanicError") return true;
  if (["P1001", "P1002", "P1008", "P1011", "P1017", "P2024"].includes(code)) return true;
  return /quota|exceeded|can't reach|cannot reach|ECONNREFUSED|ECONNRESET|ETIMEDOUT|timed out|connection (?:closed|refused|terminated)|terminating connection|too many connections/i.test(e?.message || "");
}

export async function dbQuery<T>(query: () => Promise<T>): Promise<T> {
  if (Date.now() < dbDownUntil) throw new Error("[db] baza je nedavno bila nedostupna — preskačem pokušaj");
  try {
    return await query();
  } catch (error) {
    if (isDbUnavailable(error)) dbDownUntil = Date.now() + BREAKER_MS;
    throw error;
  }
}

const lastGood = new Map<string, unknown>();

export async function withLastGood<T>(key: string, fallback: T, load: () => Promise<T>): Promise<T> {
  try {
    const value = await load();
    lastGood.set(key, value);
    return value;
  } catch (error) {
    console.error(`[db] ${key}: baza nedostupna — služim zadnje dobre podatke`, error);
    return (lastGood.get(key) as T | undefined) ?? fallback;
  }
}
