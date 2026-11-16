// "15 do pehara": izbor pitanja, džokeri i lokalna statistika.

import { shuffle, withAnswers, type KvizPitanje } from "../kviz/daily";
import { PITANJA, type Kategorija, type Tezina } from "../kviz/questions";
import { LJESTVICA, PEHAR_NAZIV, PEHAR_STATS_KEY, TRIBINA } from "./config";

// ── Statistika (localStorage) ────────────────────────────────────────────
export type PeharStats = {
  /** Odigrane utakmice. */
  igre: number;
  /** Osvojeni pehari (svih 15 točno). */
  pehari: number;
  /** Nedavno viđena pitanja (indeksi u banci), najnovija na kraju. */
  vidjeno: number[];
};

const EMPTY: PeharStats = { igre: 0, pehari: 0, vidjeno: [] };

export function readStats(): PeharStats {
  try {
    const raw = window.localStorage.getItem(PEHAR_STATS_KEY);
    if (!raw) return { ...EMPTY, vidjeno: [] };
    const s = JSON.parse(raw) as Partial<PeharStats>;
    return {
      igre: Number(s.igre) || 0,
      pehari: Number(s.pehari) || 0,
      vidjeno: Array.isArray(s.vidjeno)
        ? s.vidjeno.filter((n) => Number.isInteger(n))
        : [],
    };
  } catch {
    return { ...EMPTY, vidjeno: [] };
  }
}

function writeStats(s: PeharStats) {
  try {
    window.localStorage.setItem(PEHAR_STATS_KEY, JSON.stringify(s));
  } catch {}
}

/** Početak utakmice: zapamti pitanja (da se ne ponavljaju odmah) i broj igara. */
export function recordStart(indexes: number[]) {
  const s = readStats();
  const vidjeno = [...s.vidjeno.filter((i) => !indexes.includes(i)), ...indexes];
  // Pamti otprilike polovicu banke — dovoljno da se pitanja ne ponavljaju često.
  const keep = Math.floor(PITANJA.length * 0.5);
  writeStats({ ...s, igre: s.igre + 1, vidjeno: vidjeno.slice(-keep) });
}

export function recordWin() {
  const s = readStats();
  writeStats({ ...s, pehari: s.pehari + 1 });
}

// ── Izbor 15 pitanja ─────────────────────────────────────────────────────
/**
 * 3 pitanja po težini (1 → 5), redom s ljestvice. Prednost imaju pitanja koja
 * igrač nije nedavno vidio; unutar iste težine najviše jedno po kategoriji
 * (ako ima dovoljno izbora).
 */
export function pickRun(rnd: () => number = Math.random): KvizPitanje[] {
  const seen = new Set(readStats().vidjeno);
  const out: KvizPitanje[] = [];
  const usedCats = new Map<Tezina, Set<Kategorija>>();
  for (const step of LJESTVICA) {
    const t = step.tezina;
    const cats = usedCats.get(t) ?? new Set<Kategorija>();
    usedCats.set(t, cats);
    const taken = new Set(out.map((q) => q.index));
    const pool = PITANJA.map((p, i) => ({ p, i })).filter(
      (o) => o.p.tezina === t && !taken.has(o.i),
    );
    const rank = (o: { p: (typeof PITANJA)[number]; i: number }) =>
      (seen.has(o.i) ? 2 : 0) + (cats.has(o.p.kategorija) ? 1 : 0);
    const shuffled = shuffle(pool, rnd);
    const best = Math.min(...shuffled.map(rank));
    const pick = shuffled.find((o) => rank(o) === best) ?? shuffled[0];
    if (!pick) continue;
    cats.add(pick.p.kategorija);
    out.push(withAnswers(pick.p, pick.i, rnd));
  }
  return out;
}

// ── Džokeri ──────────────────────────────────────────────────────────────
/** 50:50 — indeksi dva netočna odgovora koja se uklanjaju. */
export function fiftyFifty(q: KvizPitanje, rnd: () => number = Math.random) {
  const wrong = q.odgovori.map((_, i) => i).filter((i) => i !== q.tocan);
  return shuffle(wrong, rnd).slice(0, 2);
}

/**
 * "Pitaj tribinu": postoci po odgovoru (zbroj 100). Na lakim pitanjima tribina
 * gotovo uvijek zna, na teškima je bliže pogađanju i ponekad zabrlja.
 * `removed` = odgovori uklonjeni s 50:50 (dobiju 0 %).
 */
export function crowdPoll(
  q: KvizPitanje,
  removed: number[] = [],
  rnd: () => number = Math.random,
): number[] {
  const cfg = TRIBINA[q.tezina];
  const live = q.odgovori.map((_, i) => i).filter((i) => !removed.includes(i));
  const wrong = live.filter((i) => i !== q.tocan);
  const w = new Array(q.odgovori.length).fill(0) as number[];

  // Kad je ostalo samo dvoje, tribina je sigurnija.
  const base = live.length <= 2 ? Math.min(0.88, cfg.tocno + 0.2) : cfg.tocno;
  const confused = wrong.length > 0 && rnd() < cfg.zabuna;
  let correctShare = base + (rnd() - 0.5) * 0.12;
  if (confused) correctShare = Math.max(0.16, base * (0.55 + rnd() * 0.25));
  correctShare = Math.max(0.12, Math.min(0.92, correctShare));
  w[q.tocan] = correctShare;

  // Ostatak na netočne; kod "zabune" jedan netočni dobije više od točnog.
  let rest = 1 - correctShare;
  const order = shuffle(wrong, rnd);
  if (confused && order.length) {
    const lead = Math.min(rest * 0.85, correctShare + 0.04 + rnd() * 0.1);
    w[order[0]] = lead;
    rest -= lead;
    order.shift();
  }
  const parts = order.map(() => 0.35 + rnd());
  const sum = parts.reduce((a, b) => a + b, 0) || 1;
  order.forEach((i, k) => (w[i] += (rest * parts[k]) / sum));
  if (!order.length && rest > 0) w[q.tocan] += rest;

  // Na cijele postotke, zbroj točno 100.
  const pct = w.map((x) => Math.floor(x * 100));
  let diff = 100 - pct.reduce((a, b) => a + b, 0);
  const byFrac = w
    .map((x, i) => ({ i, f: x * 100 - Math.floor(x * 100) }))
    .filter((o) => live.includes(o.i))
    .sort((a, b) => b.f - a.f);
  for (let k = 0; diff > 0 && byFrac.length; k++, diff--)
    pct[byFrac[k % byFrac.length].i]++;
  return pct;
}

/** Tekst poruke za "Nazovi frenda" (WhatsApp). */
export function friendMessage(
  q: KvizPitanje,
  removed: number[],
  stepN: number,
  url: string,
) {
  const letters = ["A", "B", "C", "D"];
  const opts = q.odgovori
    .map((o, i) => (removed.includes(i) ? null : `${letters[i]}) ${o}`))
    .filter(Boolean)
    .join("\n");
  return `Trebam pomoć! Na ${stepN}. sam pitanju u igri „${PEHAR_NAZIV}“:\n\n${q.pitanje}\n\n${opts}\n\nŠto kažeš? Probaj i ti: ${url}`;
}
