import { repairText } from "@/lib/utils";

/* ------------------------------------------------------------------ */
/*  Riječ za veliki obrubljeni natpis iza dresa (kartica "ime").       */
/*                                                                    */
/*  Pravila po kategoriji:                                            */
/*  - dres s igračem  → prezime igrača ("Yamal nr19" → YAMAL,          */
/*    "D.Doué" → DOUÉ, "Neymar Jr." → NEYMAR, "Arda Güler" → GÜLER,     */
/*    "Ronaldo R9" → RONALDO). Broj (nr19) se pamti za naslov.         */
/*  - dres bez igrača ("Posebno izdanje", "Prazan", "Away", "Jesus      */
/*    edition", ime = klub) i trenirke "Komplet" → kratko ime kluba/    */
/*    reprezentacije (PSG, BAYERN, ŠPANJOLSKA ...).                    */
/*  - streetwear i Dresify mystery → ništa (ime kolekcije poput        */
/*    "COTTON WREATH" iza odjeće izgleda kao greška, ne kao dres).      */
/* ------------------------------------------------------------------ */

export type CardNameInput = { igrac: string; klub: string; liga?: string; category?: string };
/** alt = zamjenska riječ (klub/reprezentacija) kad susjedna kartica već ima isto prezime. */
export type CardName = { word: string; number?: string; source: "igrac" | "klub"; alt?: string };

// Ne-igrači u polju igrac (prva riječ).
const NOT_PLAYER = /^(komplet|posebno|prazan|away|home|mystery|jesus|set|trenirka|retro|specijal|edition|izdanje)\b/i;
// Nadimci/sufiksi koji nisu prezime.
const SUFFIX = /^(jr\.?|junior|r9|cr7)$/i;

const CLUB_SHORT: Record<string, string> = {
  "paris saint-germain": "PSG",
  psg: "PSG",
  "fc barcelona": "BARCELONA",
  barcelona: "BARCELONA",
  "bayern münchen": "BAYERN",
  "borussia dortmund": "DORTMUND",
  "manchester united": "UNITED",
  "manchester city": "CITY",
  "atletico madrid": "ATLETICO",
  "real madrid": "REAL MADRID",
  "inter miami": "MIAMI",
  "boca juniors": "BOCA",
  "ac milan": "MILAN",
  "al-nassr": "AL NASSR",
  "al hilal": "AL HILAL",
};

const up = (s: string) => s.toLocaleUpperCase("hr");

export function clubWord(klub: string): string | undefined {
  const k = repairText(klub).trim();
  if (!k || /^dresify$/i.test(k)) return undefined;
  const mapped = CLUB_SHORT[k.toLocaleLowerCase("hr")];
  if (mapped) return mapped;
  const stripped = k.replace(/^(FC|AC|CF|SC|AS|SL)\s+/i, "").replace(/\s+(FC|CF)$/i, "").trim();
  // predugačka imena → zadnja riječ (natpis mora stati u jedan red)
  if (stripped.length > 12 && stripped.includes(" ")) return up(stripped.split(/\s+/).pop()!);
  return up(stripped);
}

export function cardName(p: CardNameInput): CardName | undefined {
  if (p.category === "streetwear") return undefined;
  if (/^dresify$/i.test(repairText(p.klub).trim())) return undefined;

  const head = repairText(p.igrac).split(/\s*[—–]\s*/)[0] ?? "";
  const number = head.match(/\bnr\s*(\d{1,2})\b/i)?.[1];
  const name = head.replace(/\bnr\s*\d+\b/gi, "").replace(/\s+/g, " ").trim();
  const tokens = name.split(" ").filter((t) => t && !SUFFIX.test(t));

  const club = clubWord(p.klub);
  const sameAsClub = club && up(name) === up(repairText(p.klub).trim());
  if (!tokens.length || NOT_PLAYER.test(name) || sameAsClub) {
    return club ? { word: club, source: "klub" } : undefined;
  }

  // prezime = zadnja riječ; inicijal s točkom otpada ("D.Doué" → "Doué", "B. Fernandes" → "Fernandes")
  let last = tokens[tokens.length - 1];
  if (last.includes(".")) last = last.slice(last.lastIndexOf(".") + 1) || last;
  const word = up(last);
  return { word, number, source: "igrac", alt: club && club !== word ? club : undefined };
}
