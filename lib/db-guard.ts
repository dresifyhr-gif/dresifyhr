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

export async function dbQuery<T>(query: () => Promise<T>): Promise<T> {
  if (Date.now() < dbDownUntil) throw new Error("[db] baza je nedavno bila nedostupna — preskačem pokušaj");
  try {
    return await query();
  } catch (error) {
    dbDownUntil = Date.now() + BREAKER_MS;
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
