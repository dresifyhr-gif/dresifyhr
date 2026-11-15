// Postavke "Kviza dana".

import { GAME_REWARDS, type RewardTier } from "../config";

export const KVIZ_GAME_ID = "quiz";
export const KVIZ_BROJ_PITANJA = 10;
/** Sekunde po pitanju. */
export const KVIZ_SEKUNDI = 12;

/** Službeni rezultat dana + niz + povijest. Format { last, streak, ... } čita i /igre hub. */
export const KVIZ_STORAGE_KEY = "dresify_v2_streak_kviz";
/** Najbolji službeni rezultat (samo prvi pokušaj dana). */
export const KVIZ_BEST_KEY = "dresify_v2_best_kviz";
/** Najbolji rezultat vježbe (kasniji pokušaji, nasumična pitanja). */
export const KVIZ_BEST_PRACTICE_KEY = "dresify_v2_best_kviz_vjezba";

/**
 * Nagrada (vrijedi SAMO dok je GAME_REWARDS_ENABLED u ../config.ts uključen —
 * sada je ugašen, pa se ništa ne prikazuje ni ne sprema).
 *
 * Pravilo prepisano iz starog kviza (components/game/quiz-game.tsx):
 *   NEEDED = 9 od 10 točnih → igrač bira: promo kod (stari kviz je spremao GOL10
 *   u PROMO_STORAGE_KEY) ILI poklon iznenađenja (GIFT_STORAGE_KEY = "1").
 * Definicija je u GAME_REWARDS.quiz; ako vlasnik želi kod KVIZ10 (postoji u
 * lib/promo.ts), zamijeni GOL10 tamo.
 *
 * Nagrada se nudi samo za SLUŽBENI (prvi) pokušaj dana — vježba je nikad ne daje.
 */
export const KVIZ_REWARD_TIERS: RewardTier[] =
  GAME_REWARDS[KVIZ_GAME_ID]?.tiers ?? [];
