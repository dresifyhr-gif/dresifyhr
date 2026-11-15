// Pomoćne funkcije za nagrade iz igara. Sve poštuju GAME_REWARDS_ENABLED:
// dok je prekidač ugašen, pickReward vraća null i claimPrize ništa ne sprema.

import { GIFT_STORAGE_KEY, findPromoCode } from "@/lib/promo";
import { PROMO_STORAGE_KEY } from "@/components/site/promo-capture";

import { GAME_REWARDS, GAME_REWARDS_ENABLED, type RewardPrize, type RewardTier } from "./config";

export { GAME_REWARDS_ENABLED };
export type { RewardPrize, RewardTier };

export function rewardsEnabled() {
  return GAME_REWARDS_ENABLED;
}

/** Pragovi za igru: izravno proslijeđeni imaju prednost, inače iz config.ts. */
export function tiersFor(gameId?: string, override?: RewardTier[] | null): RewardTier[] {
  if (override) return override;
  if (!gameId) return [];
  return GAME_REWARDS[gameId]?.tiers ?? [];
}

/**
 * Najviša dosegnuta razina za rezultat, ili null.
 * Vraća null UVIJEK kad su nagrade ugašene (osim `force` — samo za pregled dizajna).
 */
export function pickReward(
  score: number,
  opts: { gameId?: string; tiers?: RewardTier[] | null; force?: boolean } = {}
): RewardTier | null {
  if (!GAME_REWARDS_ENABLED && !opts.force) return null;
  const tiers = tiersFor(opts.gameId, opts.tiers);
  let best: RewardTier | null = null;
  for (const t of tiers) {
    if (score >= t.min && (!best || t.min > best.min)) best = t;
  }
  return best;
}

/** Sljedeća razina iznad trenutnog rezultata (za "još 3 do ..."), ili null. */
export function nextReward(
  score: number,
  opts: { gameId?: string; tiers?: RewardTier[] | null; force?: boolean } = {}
): { tier: RewardTier; missing: number } | null {
  if (!GAME_REWARDS_ENABLED && !opts.force) return null;
  const above = tiersFor(opts.gameId, opts.tiers)
    .filter((t) => t.min > score)
    .sort((a, b) => a.min - b.min)[0];
  return above ? { tier: above, missing: above.min - score } : null;
}

/**
 * Spremi nagradu da je blagajna sama primijeni. Vraća true ako je spremljeno.
 * Kad su nagrade ugašene NIŠTA ne sprema (i u pregledu dizajna).
 */
export function claimPrize(prize: RewardPrize): boolean {
  if (!GAME_REWARDS_ENABLED) return false;
  try {
    if (prize.kind === "code") window.localStorage.setItem(PROMO_STORAGE_KEY, prize.code);
    else window.localStorage.setItem(GIFT_STORAGE_KEY, "1");
    return true;
  } catch {
    return false;
  }
}

/** Tekst za karticu. Ako kod postoji u lib/promo.ts, uvjet (min. iznos) se čita odande. */
export function formatPrize(prize: RewardPrize): { title: string; detail: string; code: string | null } {
  if (prize.kind === "gift") return { title: prize.title, detail: prize.detail, code: null };
  const promo = findPromoCode(prize.code);
  const detail = promo && promo.minSubtotal > 0 ? `na narudžbe od ${promo.minSubtotal} €` : prize.detail;
  return { title: prize.title, detail, code: prize.code };
}
