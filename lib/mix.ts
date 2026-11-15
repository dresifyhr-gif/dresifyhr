// "Složi svoj mix" — dres + lopta i/ili kapa po izboru kluba.
// Svaki dodatak +10 € (dres 20 → 30/40 €, dugi rukav 30 → 40/50 €).
// Isti modul koriste i klijent (izbor, košarica) i server (provjera cijene),
// pa su cijena i popis klubova na JEDNOM mjestu.

export const MIX_ADDON_PRICE_EUR = 10;
export const MIX_PATH = "/slozi-mix";

export type MixKind = "lopta" | "kapa";
export type MixAddons = { lopta?: string; kapa?: string };

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

export const mixImage = (kind: MixKind, key: string) => `/mix/${kind}-${key}.webp`;

const clubLabel = (key?: string) => MIX_CLUBS.find((c) => c.key === key)?.label;

// Samo poznati klubovi; sve ostalo se odbacuje (zaštita od podvale).
export function cleanAddons(raw: unknown): MixAddons {
  const src = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  const out: MixAddons = {};
  for (const kind of ["lopta", "kapa"] as const) {
    const v = typeof src[kind] === "string" ? (src[kind] as string) : "";
    if (clubLabel(v)) out[kind] = v;
  }
  return out;
}

export const addonCount = (a?: MixAddons) => (a?.lopta ? 1 : 0) + (a?.kapa ? 1 : 0);

// Tekst dodataka, npr. " + lopta Barcelona + kapa Real Madrid" (prazno ako nema).
// Ovaj zapis ide u igrac stavke narudžbe — admin, mailovi i Sheets ga vide bez
// promjene baze, a obračun nabave ga prepoznaje (vidi mixAddonsInText).
export function addonsText(a?: MixAddons) {
  let s = "";
  if (a?.lopta) s += ` + lopta ${clubLabel(a.lopta)}`;
  if (a?.kapa) s += ` + kapa ${clubLabel(a.kapa)}`;
  return s;
}

// Za obračun nabave iz spremljenih stavki (igrac tekst).
export function mixAddonsInText(text?: string | null) {
  const t = text || "";
  return { lopta: /\+ lopta /i.test(t) ? 1 : 0, kapa: /\+ kapa /i.test(t) ? 1 : 0 };
}

// Mix ide samo uz obične dresove i dugi rukav — ne uz komplete (već imaju
// loptu i kapu), trenirke, streetwear ni mystery.
export function isMixEligible(p: { slug: string; liga?: string; category?: string }) {
  if (p.liga === "Komplet") return false;
  if (p.category === "trenirka" || p.category === "streetwear") return false;
  if (/mystery/i.test(p.slug)) return false;
  return true;
}
