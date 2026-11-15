// Lopte i kape koje igrač može odabrati (prozirne slike iz /public/mix).

export type ClubId = "hrvatska" | "real-madrid" | "barcelona" | "bayern" | "milan" | "portugal" | "njemacka" | "inter-miami";

export const CLUBS: { id: ClubId; name: string }[] = [
  { id: "hrvatska", name: "Hrvatska" },
  { id: "real-madrid", name: "Real Madrid" },
  { id: "barcelona", name: "Barcelona" },
  { id: "bayern", name: "Bayern" },
  { id: "milan", name: "Milan" },
  { id: "portugal", name: "Portugal" },
  { id: "njemacka", name: "Njemačka" },
  { id: "inter-miami", name: "Inter Miami" }
];

export const ballSrc = (id: ClubId) => `/mix/lopta-${id}.webp`;
export const capSrc = (id: ClubId) => `/mix/kapa-${id}.webp`;

export function isClubId(v: unknown): v is ClubId {
  return typeof v === "string" && CLUBS.some((c) => c.id === v);
}

/** Ciljevi (broj dodira u jednoj igri) — prikazuju se kao postignuća. */
export const MILESTONES = [25, 50, 100] as const;

export const BEST_KEY = "dresify_v2_best_zongliranje";
export const BALL_KEY = "dresify_zong_lopta";
export const MILESTONES_KEY = "dresify_zong_ciljevi";

export function readMilestones(): number[] {
  try {
    const raw = JSON.parse(window.localStorage.getItem(MILESTONES_KEY) || "[]");
    return Array.isArray(raw) ? raw.filter((n) => typeof n === "number") : [];
  } catch {
    return [];
  }
}

export function saveMilestones(list: number[]) {
  try {
    window.localStorage.setItem(MILESTONES_KEY, JSON.stringify(Array.from(new Set(list)).sort((a, b) => a - b)));
  } catch {}
}

/** 1 dodir, 2 dodira, 5 dodira, 21 dodir … */
export function plural(n: number, one: string, few: string, many: string) {
  const m10 = n % 10;
  const m100 = n % 100;
  if (m10 === 1 && m100 !== 11) return one;
  if (m10 >= 2 && m10 <= 4 && (m100 < 12 || m100 > 14)) return few;
  return many;
}
