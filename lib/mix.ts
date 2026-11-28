// "Složi svoj mix" — dres + lopta i/ili kapa po izboru kluba, + figura igrača (Igor 28.11.).
// Svaki dodatak +10 € (dres 20 → 30/40 €, dugi rukav 30 → 40/50 €).
// Isti modul koriste i klijent (izbor, košarica) i server (provjera cijene),
// pa su cijena i popis klubova na JEDNOM mjestu.

export const MIX_ADDON_PRICE_EUR = 10;
export const MIX_PATH = "/slozi-mix";

export type MixKind = "lopta" | "kapa" | "figura";
export type MixAddons = { lopta?: string; kapa?: string; figura?: string };
export const MIX_KINDS = ["lopta", "kapa", "figura"] as const;

export const MIX_CLUBS = [
  { key: "barcelona", label: "Barcelona" },
  { key: "real-madrid", label: "Real Madrid" },
  { key: "hrvatska", label: "Hrvatska" },
  { key: "bayern", label: "Bayern" },
  { key: "milan", label: "AC Milan" },
  { key: "portugal", label: "Portugal" },
  { key: "inter-miami", label: "Inter Miami" },
  { key: "njemacka", label: "Njemačka" }
] as const;

// Figure igrača u kutiji (+10 €, isto kao lopta/kapa). Label ide u narudžbu i obračun.
export const MIX_FIGURES = [
  { key: "mbappe-real", label: "Mbappé (Real Madrid)" },
  { key: "modric-milan", label: "Modrić (AC Milan)" },
  { key: "yamal-barca", label: "Yamal (Barcelona)" },
  { key: "yamal-barca-crni", label: "Yamal (Barcelona, crni)" },
  { key: "doue-psg", label: "Doué (PSG)" },
  { key: "messi-argentina", label: "Messi (Argentina)" },
  { key: "mbappe-francuska", label: "Mbappé (Francuska)" },
  { key: "yamal-spanjolska", label: "Yamal (Španjolska)" },
  { key: "pehar-sp-2026", label: "Pehar SP 2026" }
] as const;

export const mixImage = (kind: MixKind, key: string) => `/mix/${kind}-${key}.webp`;

// Ponuda po vrsti: lopta/kapa = klubovi, figura = figure.
export const mixOptions = (kind: MixKind): readonly { key: string; label: string }[] => (kind === "figura" ? MIX_FIGURES : MIX_CLUBS);
export const mixLabel = (kind: MixKind, key?: string) => mixOptions(kind).find((c) => c.key === key)?.label;
const clubLabel = (key?: string) => MIX_CLUBS.find((c) => c.key === key)?.label;

// Samo poznati klubovi; sve ostalo se odbacuje (zaštita od podvale).
export function cleanAddons(raw: unknown): MixAddons {
  const src = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  const out: MixAddons = {};
  for (const kind of MIX_KINDS) {
    const v = typeof src[kind] === "string" ? (src[kind] as string) : "";
    if (mixLabel(kind, v)) out[kind] = v;
  }
  return out;
}

export const addonCount = (a?: MixAddons) => (a?.lopta ? 1 : 0) + (a?.kapa ? 1 : 0) + (a?.figura ? 1 : 0);

// Tekst dodataka, npr. " + lopta Barcelona + kapa Real Madrid" (prazno ako nema).
// Ovaj zapis ide u igrac stavke narudžbe — admin, mailovi i Sheets ga vide bez
// promjene baze, a obračun nabave ga prepoznaje (vidi mixAddonsInText).
export function addonsText(a?: MixAddons) {
  let s = "";
  if (a?.lopta) s += ` + lopta ${clubLabel(a.lopta)}`;
  if (a?.kapa) s += ` + kapa ${clubLabel(a.kapa)}`;
  if (a?.figura) s += ` + figura ${mixLabel("figura", a.figura)}`;
  return s;
}

// Točan zapis dodatka ("+ lopta Barcelona") — vezan uz NAZIV KLUBA, da se ne
// poklopi s nazivima kompleta "(dres + hlačice + lopta + kapa)".
const esc = (t: string) => t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const LABELS = MIX_CLUBS.map((c) => esc(c.label)).join("|");
const FIG_LABELS = MIX_FIGURES.map((c) => esc(c.label)).join("|");
const ADDON_RE = {
  lopta: new RegExp(`\\+ lopta (?:${LABELS})`, "i"),
  kapa: new RegExp(`\\+ kapa (?:${LABELS})`, "i"),
  figura: new RegExp(`\\+ figura (?:${FIG_LABELS})`, "i")
};
const ADDON_STRIP_RE = new RegExp(`\\s*\\+ (?:(?:lopta|kapa) (?:${LABELS})|figura (?:${FIG_LABELS}))`, "gi");

// Svi točni zapisi za upit u bazi (Prisma contains), npr. "+ lopta Barcelona".
export const mixAddonPhrases = (kind: MixKind) => mixOptions(kind).map((c) => `+ ${kind} ${c.label}`);

// Za obračun nabave iz spremljenih stavki (igrac tekst).
export function mixAddonsInText(text?: string | null) {
  const t = text || "";
  return { lopta: ADDON_RE.lopta.test(t) ? 1 : 0, kapa: ADDON_RE.kapa.test(t) ? 1 : 0, figura: ADDON_RE.figura.test(t) ? 1 : 0 };
}

// Ukloni zapis dodataka koji je došao od klijenta (server ga dodaje sam, samo naplaćen).
// Ponavlja dok se tekst ne prestane mijenjati — inače "+ figura + figura X X" ostavi valjan zapis.
export const stripAddonText = (text: string) => {
  let prev: string;
  let t = text;
  do { prev = t; t = t.replace(ADDON_STRIP_RE, ""); } while (t !== prev);
  return t;
};

// Mix ide uz obične dresove, dugi rukav i trenirke — ne uz komplete (već imaju
// loptu i kapu), streetwear ni mystery.
export function isMixEligible(p: { slug: string; liga?: string; category?: string }) {
  if (p.liga === "Komplet") return false;
  if (p.category === "streetwear") return false;
  if (/mystery/i.test(p.slug)) return false;
  return true;
}
