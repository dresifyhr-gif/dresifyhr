// Nagrade iz mini igara — JEDAN prekidač.
//
// Vlasnik je odlučio: igre su zasad samo za zabavu. Dok je prekidač `false`:
//   - nema kartice s nagradom, nema kodova, ništa se ne sprema u localStorage,
//   - nigdje se ne spominje popust / nagrada / kod / besplatna dostava.
// Kad se jednom odluči IMA LI i KOJE nagrade: postavi `true` i po potrebi
// uredi pragove ispod. Kodovi MORAJU postojati u lib/promo.ts (ili u bazi) —
// ovdje se nikad ne izmišljaju novi kodovi.

export const GAME_REWARDS_ENABLED = false;

/** Što igrač dobije kad dosegne prag. */
export type RewardPrize =
  /** Promo kod koji se sprema u localStorage (PROMO_STORAGE_KEY) i blagajna ga sama primijeni. */
  | { kind: "code"; code: string; title: string; detail: string }
  /** "Poklon iznenađenja" uz narudžbu (GIFT_STORAGE_KEY iz lib/promo.ts). */
  | { kind: "gift"; title: string; detail: string };

export type RewardTier = {
  /** Minimalni rezultat (uključivo). Za igre gdje je manje bolje koristi `max`. */
  min: number;
  /** Jedna nagrada ili više njih na izbor (npr. kviz: kod ILI poklon). */
  prizes: RewardPrize[];
};

export type GameRewardConfig = {
  /** Pragovi, bilo kojim redom — uzima se najviši dosegnuti. */
  tiers: RewardTier[];
};

const GOL10: RewardPrize = { kind: "code", code: "GOL10", title: "10% popusta", detail: "na narudžbe od 20 €" };
const GOL15: RewardPrize = { kind: "code", code: "GOL15", title: "−15% + besplatna dostava", detail: "na narudžbe od 80 €" };
const GOL20: RewardPrize = { kind: "code", code: "GOL20", title: "−20% + besplatna dostava", detail: "na narudžbe od 100 €" };
const GIFT: RewardPrize = { kind: "gift", title: "Poklon iznenađenja", detail: "stiže uz tvoju narudžbu" };

/** Tri razine kao u starim arkadnim igrama: prag za GOL10 / GOL15 / GOL20. */
export function arcadeTiers(t10: number, t15: number, t20: number): RewardTier[] {
  return [
    { min: t10, prizes: [GOL10] },
    { min: t15, prizes: [GOL15] },
    { min: t20, prizes: [GOL20] }
  ];
}

/**
 * Zadane postavke prepisane iz starih igara (components/game/*.tsx):
 *   penalty  — 4/5 golova → GOL10                         (penalty-game.tsx: goals >= 4)
 *   quiz     — 9/10 točnih → GOL10 ILI poklon iznenađenja (quiz-game.tsx: NEEDED = 9;
 *              stari kviz sprema GOL10, KVIZ10 postoji u lib/promo.ts ali ga nitko ne koristi)
 *   memory   — sve spojeno u ≤ 8 pokušaja → GOL10           (memory-game.tsx; rezultat = 1 za pobjedu)
 *   flappy 20/35/50, snake 12/25/40, catch 40/70/100, runner 15/30/50, shooter 25/40/60
 *              → GOL10 / GOL15 / GOL20
 * Nove igre: dodaj ključ ovdje ili proslijedi `rewardTiers` izravno u <GameShell>.
 */
export const GAME_REWARDS: Record<string, GameRewardConfig> = {
  penalty: { tiers: [{ min: 4, prizes: [GOL10] }] },
  quiz: { tiers: [{ min: 9, prizes: [GOL10, GIFT] }] },
  memory: { tiers: [{ min: 1, prizes: [GOL10] }] },
  flappy: { tiers: arcadeTiers(20, 35, 50) },
  snake: { tiers: arcadeTiers(12, 25, 40) },
  catch: { tiers: arcadeTiers(40, 70, 100) },
  runner: { tiers: arcadeTiers(15, 30, 50) },
  shooter: { tiers: arcadeTiers(25, 40, 60) },
  /** Žongliranje (bodovi = dodiri × množitelj + kape): 50 / 100 / 175. */
  zongliranje: { tiers: arcadeTiers(50, 100, 175) },
  /** Opća arkadna ljestvica za nove igre bez vlastite (isto kao Flappy). */
  arcade: { tiers: arcadeTiers(20, 35, 50) }
};
