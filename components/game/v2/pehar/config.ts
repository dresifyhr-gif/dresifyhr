// "15 do pehara" — postavke. Ime igre je SAMO ovdje (radni naslov), da se može
// lako preimenovati.

import type { Tezina } from "../kviz/questions";

/** Ime igre (naslov, metapodaci, slika za dijeljenje). */
export const PEHAR_NAZIV = "15 do pehara";
export const PEHAR_PUTANJA = "/pehar";
export const PEHAR_URL = "https://dresifyshop.com/pehar";

export const PEHAR_GAME_ID = "pehar";
/** Najdalje pitanje do kojeg je igrač stigao (1..15). */
export const PEHAR_BEST_KEY = "dresify_v2_best_pehar";
/** Statistika: broj osvojenih pehara, odigranih utakmica, nedavno viđena pitanja. */
export const PEHAR_STATS_KEY = "dresify_v2_pehar_stats";

export const PEHAR_BROJ = 15;

export type Stepenica = {
  /** Redni broj pitanja (1..15). */
  n: number;
  /** Ime razine na ljestvici. */
  ime: string;
  /** Sigurna stepenica: kad je jednom prijeđeš, ostaje tvoja. */
  sigurno?: boolean;
  tezina: Tezina;
};

/**
 * Ljestvica: od prvog dodira preko dvorišta i asfalta do cijelog kvarta, pa
 * klupski put do Prve lige i svjetskog prvaka. 3 pitanja po težini.
 */
export const LJESTVICA: Stepenica[] = [
  { n: 1, ime: "Prvi dodir", tezina: 1 },
  { n: 2, ime: "Dvorište", tezina: 1 },
  { n: 3, ime: "Školsko igralište", tezina: 1 },
  { n: 4, ime: "Turnir na asfaltu", tezina: 2 },
  { n: 5, ime: "Kvart", sigurno: true, tezina: 2 },
  { n: 6, ime: "Juniori", tezina: 2 },
  { n: 7, ime: "Županijska liga", tezina: 3 },
  { n: 8, ime: "Druga liga", tezina: 3 },
  { n: 9, ime: "Derbi", tezina: 3 },
  { n: 10, ime: "Prva liga", sigurno: true, tezina: 4 },
  { n: 11, ime: "Europa", tezina: 4 },
  { n: 12, ime: "Liga prvaka", tezina: 4 },
  { n: 13, ime: "Reprezentacija", tezina: 5 },
  { n: 14, ime: "Finale", tezina: 5 },
  { n: 15, ime: "Svjetski prvak", sigurno: true, tezina: 5 },
];

/**
 * Napetost prije otkrivanja (ms) — raste prema vrhu ljestvice.
 * Na lakim pitanjima kratko (ne smije dosaditi), na zadnjima puna pauza.
 */
export function suspenseMs(step: number) {
  const s = Math.max(1, Math.min(PEHAR_BROJ, step));
  return Math.round(900 + (s - 1) * 125);
}

/**
 * "Pitaj tribinu": udio glasova za točan odgovor po težini (prije šuma) i
 * vjerojatnost da tribina ipak najviše glasa za krivi odgovor.
 */
export const TRIBINA: Record<Tezina, { tocno: number; zabuna: number }> = {
  1: { tocno: 0.72, zabuna: 0 },
  2: { tocno: 0.58, zabuna: 0.04 },
  3: { tocno: 0.46, zabuna: 0.1 },
  4: { tocno: 0.38, zabuna: 0.18 },
  5: { tocno: 0.32, zabuna: 0.26 },
};

/** Sigurna razina za prikaz: zadnja sigurna stepenica koju je igrač PRIJEŠAO. */
export function sigurnaRazina(correct: number): Stepenica | null {
  let r: Stepenica | null = null;
  for (const s of LJESTVICA) if (s.sigurno && correct >= s.n) r = s;
  return r;
}
