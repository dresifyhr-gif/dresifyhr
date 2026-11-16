// "Kviz dana": datum po Zagrebu, izbor pitanja (isti za sve) i lokalno pamćenje
// službenog rezultata + dnevnog niza.

import { KVIZ_BROJ_PITANJA, KVIZ_STORAGE_KEY } from "./config";
import { PITANJA, type Kategorija, type Pitanje, type Tezina } from "./questions";

// ── Datum (Europe/Zagreb) ────────────────────────────────────────────────
const TZ = "Europe/Zagreb";
let dtf: Intl.DateTimeFormat | null = null;

function zagrebParts(d = new Date()) {
  if (!dtf) {
    dtf = new Intl.DateTimeFormat("en-GB", {
      timeZone: TZ,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hourCycle: "h23",
    });
  }
  const parts: Record<string, number> = {};
  for (const p of dtf.formatToParts(d))
    if (p.type !== "literal") parts[p.type] = Number(p.value);
  return {
    y: parts.year,
    m: parts.month,
    d: parts.day,
    h: parts.hour % 24,
    min: parts.minute,
    s: parts.second,
  };
}

/** Današnji datum u Zagrebu, "YYYY-MM-DD". */
export function zagrebDay(d = new Date()): string {
  const p = zagrebParts(d);
  return `${p.y}-${String(p.m).padStart(2, "0")}-${String(p.d).padStart(2, "0")}`;
}

function dayNumber(day: string) {
  const [y, m, d] = day.split("-").map(Number);
  return Math.floor(Date.UTC(y, m - 1, d) / 86400000);
}

function shiftDay(day: string, delta: number) {
  const n = dayNumber(day) + delta;
  const dt = new Date(n * 86400000);
  return `${dt.getUTCFullYear()}-${String(dt.getUTCMonth() + 1).padStart(2, "0")}-${String(dt.getUTCDate()).padStart(2, "0")}`;
}

/** Milisekunde do ponoći po Zagrebu (novi kviz). */
export function msToNextQuiz(now = new Date()): number {
  const p = zagrebParts(now);
  // Zagreb "zidni sat" kao da je UTC → razlika prema stvarnom vremenu = pomak zone.
  const wallAsUtc = Date.UTC(p.y, p.m - 1, p.d, p.h, p.min, p.s);
  const offset = wallAsUtc - Math.floor(now.getTime() / 1000) * 1000;
  const nextMidnightWall = Date.UTC(p.y, p.m - 1, p.d + 1, 0, 0, 0);
  return Math.max(0, nextMidnightWall - offset - now.getTime());
}

export function formatCountdown(ms: number) {
  const t = Math.max(0, Math.ceil(ms / 1000));
  const h = Math.floor(t / 3600);
  const m = Math.floor((t % 3600) / 60);
  const s = t % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

const MJESECI = [
  "siječnja",
  "veljače",
  "ožujka",
  "travnja",
  "svibnja",
  "lipnja",
  "srpnja",
  "kolovoza",
  "rujna",
  "listopada",
  "studenoga",
  "prosinca",
];

/** "15. studenoga" */
export function formatDayLong(day: string) {
  const [, m, d] = day.split("-").map(Number);
  return `${d}. ${MJESECI[m - 1]}`;
}

const DANI = ["N", "P", "U", "S", "Č", "P", "S"];

/** Prvo slovo dana u tjednu ("P" za ponedjeljak...). */
export function dayLetter(day: string) {
  const [y, m, d] = day.split("-").map(Number);
  return DANI[new Date(Date.UTC(y, m - 1, d)).getUTCDay()];
}

/** "15. 11." */
export function formatDayShort(day: string) {
  const [, m, d] = day.split("-").map(Number);
  return `${d}. ${m}.`;
}

// ── Nasumičnost sa sjemenom ──────────────────────────────────────────────
function hashStr(s: string) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

export function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function shuffle<T>(arr: T[], rnd: () => number): T[] {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// ── Izbor pitanja ────────────────────────────────────────────────────────
export type KvizPitanje = Pitanje & {
  /** Redni broj u banci (stabilan dok se banka samo nadopunjuje na kraju kategorije). */
  index: number;
  /** Ponuđeni odgovori u redoslijedu prikaza. */
  odgovori: string[];
  /** Indeks točnog odgovora u `odgovori`. */
  tocan: number;
};

const NUMERIC = /^[\d.,:×–\s]+(m|cm|metara|minuta)?\.?$/;

/** Ponuđeni odgovori izmiješani (brojevi i godine uzlazno). */
export function withAnswers(
  p: Pitanje,
  index: number,
  rnd: () => number,
): KvizPitanje {
  let odgovori = shuffle([p.tocno, ...p.netocno], rnd);
  // Godine, rezultati i brojevi izgledaju urednije poredani uzlazno.
  if (odgovori.every((o) => NUMERIC.test(o.trim()))) {
    const num = (s: string) =>
      parseFloat(
        s
          .replace(",", ".")
          .replace(/[^\d.]/g, " ")
          .trim()
          .split(" ")[0] || "0",
      );
    odgovori = odgovori
      .slice()
      .sort((a, b) => num(a) - num(b) || a.localeCompare(b));
  }
  return { ...p, index, odgovori, tocan: odgovori.indexOf(p.tocno) };
}

/**
 * Koliko pitanja svake težine ima jedan kviz (zbroj = broj pitanja). Fiksna
 * mješavina da nijedan dan ne ispadne pretežak ili prelagan: 3 laka, 3 srednja,
 * 2 teška, 1 vrlo težak i 1 ekspertni za kraj.
 */
function kvote(count: number): Record<Tezina, number> {
  const base: Record<Tezina, number> = { 1: 3, 2: 3, 3: 2, 4: 1, 5: 1 };
  if (count === 10) return base;
  const out: Record<Tezina, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  const order: Tezina[] = [1, 2, 3, 4, 5];
  let left = count;
  for (const t of order) {
    out[t] = Math.floor((base[t] * count) / 10);
    left -= out[t];
  }
  for (let k = 0; left > 0; k = (k + 1) % 5, left--) out[order[k]]++;
  return out;
}

/** Indeksi pitanja jedne težine, izmiješani tako da se kategorije izmjenjuju. */
function interleaved(tezina: Tezina, rnd: () => number): number[] {
  const byCat = new Map<Kategorija, number[]>();
  PITANJA.forEach((p, i) => {
    if (p.tezina !== tezina) return;
    const list = byCat.get(p.kategorija) ?? [];
    list.push(i);
    byCat.set(p.kategorija, list);
  });
  const pools = shuffle(
    Array.from(byCat.values()).map((l) => shuffle(l, rnd)),
    rnd,
  );
  const total = pools.reduce((a, l) => a + l.length, 0);
  // Raspodjela proporcionalna veličini kategorije (veće kategorije češće).
  const order: number[] = [];
  const pos = pools.map(() => 0);
  while (order.length < total) {
    let best = -1;
    let bestScore = Infinity;
    for (let k = 0; k < pools.length; k++) {
      if (pos[k] >= pools[k].length) continue;
      const score = (pos[k] + 1) / pools[k].length + rnd() * 0.02;
      if (score < bestScore) {
        bestScore = score;
        best = k;
      }
    }
    if (best < 0) break;
    order.push(pools[best][pos[best]++]);
  }
  return order;
}

const TEZINE_RED: Tezina[] = [1, 2, 3, 4, 5];

/**
 * Raspored "dan → 10 pitanja": za svaku težinu banka se jednom izmiješa (kategorije
 * se izmjenjuju) i podijeli na dnevne blokove po kvoti; svaki ciklus blokova ima
 * vlastito miješanje. Unutar ciklusa nema ponavljanja.
 */
function dailyIndexes(day: string, count: number): number[] {
  const q = kvote(count);
  const sizes = TEZINE_RED.map(
    (t) => PITANJA.filter((p) => p.tezina === t).length,
  );
  const perCycle = Math.max(
    1,
    Math.min(
      ...TEZINE_RED.map((t, k) =>
        q[t] > 0 ? Math.floor(sizes[k] / q[t]) : Infinity,
      ),
    ),
  );
  const dn = dayNumber(day);
  const cycle = Math.floor(dn / perCycle);
  const slot = dn - cycle * perCycle;
  const rnd = mulberry32(hashStr(`dresify-kviz-ciklus-${cycle}`));
  const out: number[] = [];
  for (const t of TEZINE_RED) {
    const list = interleaved(t, rnd);
    out.push(...list.slice(slot * q[t], slot * q[t] + q[t]));
  }
  return out;
}

/** Današnjih 10 pitanja — isti za sve (sjeme = datum po Zagrebu). */
export function dailyQuestions(
  day: string,
  count = KVIZ_BROJ_PITANJA,
): KvizPitanje[] {
  const idx = dailyIndexes(day, count);
  const rnd = mulberry32(hashStr(`dresify-kviz-dan-${day}`));
  // Od lakših prema težima (unutar iste težine nasumično) — kviz se zahuktava.
  const ordered = byDifficulty(shuffle(idx, rnd));
  return ordered.map((i) => withAnswers(PITANJA[i], i, rnd));
}

/** Vježba: nasumična pitanja (bez današnjih), ista mješavina težina, najviše 2 iz iste kategorije. */
export function practiceQuestions(
  excludeDay: string,
  count = KVIZ_BROJ_PITANJA,
): KvizPitanje[] {
  const rnd = Math.random;
  const q = kvote(count);
  const exclude = new Set(dailyIndexes(excludeDay, count));
  const perCat = new Map<Kategorija, number>();
  const pick: number[] = [];
  for (const t of TEZINE_RED) {
    const pool = shuffle(
      PITANJA.map((_, i) => i).filter(
        (i) => PITANJA[i].tezina === t && !exclude.has(i),
      ),
      rnd,
    );
    let got = 0;
    for (const i of pool) {
      if (got >= q[t]) break;
      const k = PITANJA[i].kategorija;
      const n = perCat.get(k) ?? 0;
      if (n >= 2) continue;
      perCat.set(k, n + 1);
      pick.push(i);
      got++;
    }
  }
  return byDifficulty(pick).map((i) => withAnswers(PITANJA[i], i, rnd));
}

/** Stabilno poredaj indekse pitanja po težini (1 → 5). */
function byDifficulty(idx: number[]) {
  return idx
    .map((i, k) => ({ i, k }))
    .sort((a, b) => PITANJA[a.i].tezina - PITANJA[b.i].tezina || a.k - b.k)
    .map((o) => o.i);
}

// ── Pamćenje (localStorage) ──────────────────────────────────────────────
/** Ishod jednog pitanja: 1 točno, 0 netočno, -1 isteklo vrijeme. */
export type Ishod = 1 | 0 | -1;

export type DailyRecord = {
  day: string;
  /** Odgovori službenog pokušaja (može biti nepotpuno ako je igra prekinuta). */
  answers: Ishod[];
  score: number;
  done: boolean;
};

export type KvizStore = {
  /** Zadnji dan kad je odigran službeni kviz. */
  last: string | null;
  /** Uzastopni dani do `last`. */
  streak: number;
  /** Najdulji niz ikad. */
  bestStreak: number;
  /** Službeni rezultat zadnjeg odigranog dana. */
  today: DailyRecord | null;
  /** Kratka povijest: dan → rezultat (zadnjih 60 dana). */
  history: Record<string, number>;
};

const EMPTY: KvizStore = {
  last: null,
  streak: 0,
  bestStreak: 0,
  today: null,
  history: {},
};

export function readStore(): KvizStore {
  try {
    const raw = window.localStorage.getItem(KVIZ_STORAGE_KEY);
    if (!raw) return { ...EMPTY };
    const s = JSON.parse(raw) as Partial<KvizStore>;
    return {
      last: typeof s.last === "string" ? s.last : null,
      streak: Number(s.streak) || 0,
      bestStreak: Number(s.bestStreak) || 0,
      today:
        s.today && typeof s.today.day === "string"
          ? (s.today as DailyRecord)
          : null,
      history: s.history && typeof s.history === "object" ? s.history : {},
    };
  } catch {
    return { ...EMPTY };
  }
}

function writeStore(s: KvizStore) {
  try {
    const keys = Object.keys(s.history).sort();
    if (keys.length > 60)
      for (const k of keys.slice(0, keys.length - 60)) delete s.history[k];
    window.localStorage.setItem(KVIZ_STORAGE_KEY, JSON.stringify(s));
  } catch {}
}

/** Stanje za prikaz: je li danas odigrano, živi niz, službeni rezultat. */
export type DailyStatus = {
  day: string;
  playedToday: boolean;
  /** Niz koji se prikazuje (0 ako je pukao). */
  streak: number;
  bestStreak: number;
  todayRecord: DailyRecord | null;
  /** Zadnjih 7 dana (najstariji prvi, zadnji = danas): službeni rezultat ili null. */
  week: { day: string; score: number | null }[];
};

export function dailyStatus(day = zagrebDay()): DailyStatus {
  const s = readStore();
  const yesterday = shiftDay(day, -1);
  const alive = s.last === day || s.last === yesterday;
  const todayRecord = s.today && s.today.day === day ? s.today : null;
  return {
    day,
    playedToday: s.last === day,
    streak: alive ? s.streak : 0,
    bestStreak: Math.max(s.bestStreak, alive ? s.streak : 0),
    todayRecord: todayRecord ? { ...todayRecord, done: true } : null,
    week: Array.from({ length: 7 }, (_, k) => {
      const d = shiftDay(day, k - 6);
      const v = s.history[d];
      return { day: d, score: typeof v === "number" ? v : null };
    }),
  };
}

/** Početak službenog pokušaja: odmah se broji (osvježavanje stranice ne daje novi pokušaj). */
export function beginOfficial(day: string): number {
  const s = readStore();
  if (s.last === day) return s.streak;
  const streak = s.last === shiftDay(day, -1) ? s.streak + 1 : 1;
  const next: KvizStore = {
    ...s,
    last: day,
    streak,
    bestStreak: Math.max(s.bestStreak, streak),
    today: { day, answers: [], score: 0, done: false },
    history: { ...s.history, [day]: 0 },
  };
  writeStore(next);
  return streak;
}

/** Spremi napredak službenog pokušaja nakon svakog odgovora. */
export function saveOfficial(day: string, answers: Ishod[], done: boolean) {
  const s = readStore();
  if (s.last !== day) return;
  const score = answers.filter((a) => a === 1).length;
  writeStore({
    ...s,
    today: { day, answers: answers.slice(), score, done },
    history: { ...s.history, [day]: score },
  });
}
