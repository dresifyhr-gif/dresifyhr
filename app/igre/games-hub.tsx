"use client";

import Link from "next/link";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { ArrowRight, Check, Flame, Gift, Play, Share2, Trophy, Smartphone } from "lucide-react";

import { GAME_REWARDS_ENABLED, formatPrize, tiersFor } from "@/components/game/v2/rewards";

// ── Hub mini igara (/igre) ───────────────────────────────────────────────
// Četiri kartice: Penalty Cup, Kviz dana, Žongliranje i (kad je upaljeno)
// Kolo sreće. Ilustracije su čisti SVG/CSS + slike lopti iz /public/mix.
// Animacije su samo transform/opacity i gase se uz prefers-reduced-motion.
//
// NAGRADE SU UGAŠENE: na tri igre nema riječi o popustima. Kolo sreće je
// zasebna stvar za kupce (lib/kolo.ts): vrtnje se zarađuju narudžbama.

// Rekordi: v2 igre spremaju broj pod `dresify_v2_best_<igra>` (useBestScore).
// Čitamo i stare ključeve da igrači ne izgube rekord iz prijašnjih verzija.
const BEST_KEYS = {
  penalty: ["dresify_v2_best_penalty", "dresify_penalty_best"],
  quiz: ["dresify_v2_best_quiz", "dresify_v2_best_kviz"],
  juggle: ["dresify_v2_best_zongliranje", "dresify_v2_best_juggle", "dresify_v2_best_zongliraj"]
} as const;
const STREAK_KEYS = ["dresify_v2_streak_quiz", "dresify_v2_streak_kviz", "dresify_v2_kviz_streak", "dresify_quiz_streak"];

function readBest(keys: readonly string[]): number | null {
  let best: number | null = null;
  for (const k of keys) {
    try {
      const raw = window.localStorage.getItem(k);
      if (raw === null || raw === "") continue;
      const n = Number(raw);
      if (Number.isFinite(n) && n > 0 && (best === null || n > best)) best = n;
    } catch {
      /* privatni način rada */
    }
  }
  return best;
}

function dayStr(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/** Isti format kao useDailyStreak: { last: "YYYY-MM-DD", streak }. */
function readStreak(): { streak: number; playedToday: boolean } {
  const today = dayStr(new Date());
  const y = new Date();
  y.setDate(y.getDate() - 1);
  const yesterday = dayStr(y);
  let out = { streak: 0, playedToday: false };
  for (const k of STREAK_KEYS) {
    try {
      const raw = JSON.parse(window.localStorage.getItem(k) || "null") as { last?: string; streak?: number } | null;
      if (!raw?.last || typeof raw.streak !== "number") continue;
      const alive = raw.last === today || raw.last === yesterday;
      const s = { streak: alive ? raw.streak : 0, playedToday: raw.last === today };
      if (s.streak > out.streak || (s.playedToday && !out.playedToday)) out = s;
    } catch {
      /* neispravan zapis — preskoči */
    }
  }
  return out;
}

/** 1 gol, 2 gola, 5 golova, 21 gol … */
function plural(n: number, one: string, few: string, many: string) {
  const m10 = n % 10;
  const m100 = n % 100;
  if (m10 === 1 && m100 !== 11) return one;
  if (m10 >= 2 && m10 <= 4 && (m100 < 12 || m100 > 14)) return few;
  return many;
}

/**
 * Kratki opis nagrade za karticu — SAMO kad je GAME_REWARDS_ENABLED (config.ts).
 * Pragovi i kodovi dolaze iz GAME_REWARDS; ovdje se ništa ne izmišlja.
 */
function rewardHint(gameId: string, unit: (n: number) => string): string | null {
  if (!GAME_REWARDS_ENABLED) return null;
  const tiers = [...tiersFor(gameId)].sort((a, b) => a.min - b.min);
  if (!tiers.length) return null;
  const titles = (i: number) =>
    tiers[i].prizes
      .map((p, j) => {
        const t = formatPrize(p).title;
        return j === 0 ? t : t.charAt(0).toLowerCase() + t.slice(1);
      })
      .join(" ili ");
  const first = `Od ${unit(tiers[0].min)}: ${titles(0)}`;
  return tiers.length > 1 ? `${first}, do ${titles(tiers.length - 1)}` : first;
}

const unitGoals = (n: number) => `${n} ${plural(n, "gola", "gola", "golova")}`;
const unitQuiz = (n: number) => `${n}/10 točnih`;
const unitPoints = (n: number) => `${n} ${plural(n, "boda", "boda", "bodova")}`;

type Stats = {
  penalty: number | null;
  quiz: number | null;
  juggle: number | null;
  streak: number;
  playedToday: boolean;
};

function useStats(): Stats | null {
  const [stats, setStats] = useState<Stats | null>(null);
  useEffect(() => {
    const load = () => {
      const st = readStreak();
      setStats({
        penalty: readBest(BEST_KEYS.penalty),
        quiz: readBest(BEST_KEYS.quiz),
        juggle: readBest(BEST_KEYS.juggle),
        streak: st.streak,
        playedToday: st.playedToday
      });
    };
    load();
    // Povratak na karticu (npr. iz igre preko "natrag") osvježi rekorde.
    const onShow = () => {
      if (document.visibilityState === "visible") load();
    };
    window.addEventListener("pageshow", load);
    document.addEventListener("visibilitychange", onShow);
    return () => {
      window.removeEventListener("pageshow", load);
      document.removeEventListener("visibilitychange", onShow);
    };
  }, []);
  return stats;
}

// ── Kartica ────────────────────────────────────────────────────────────────
function GameCard({
  href,
  index,
  tag,
  title,
  pitch,
  art,
  meta,
  cta = "Igraj",
  tone = "default",
  reward = null
}: {
  href: string;
  index: string;
  tag: ReactNode;
  title: string;
  pitch: string;
  art: ReactNode;
  meta: ReactNode;
  cta?: string;
  tone?: "default" | "customer";
  /** Opis nagrade — prikazuje se samo kad su nagrade upaljene (rewardHint). */
  reward?: string | null;
}) {
  return (
    <Link
      href={href}
      className="ih-card group relative flex flex-col overflow-hidden rounded-[22px] border border-white/[0.08] bg-[#0f0f0f] outline-none transition-[border-color,transform] duration-300 ease-out hover:border-accent/40 focus-visible:border-accent active:scale-[0.985]"
    >
      <div className="relative h-[178px] overflow-hidden sm:h-[208px]" aria-hidden>
        {art}
        {/* prijelaz ilustracije u tijelo kartice */}
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-10 bg-gradient-to-b from-transparent to-[#0f0f0f]" />
        <span className="absolute left-4 top-3.5 font-heading text-[15px] tracking-[0.18em] text-white/35">{index}</span>
      </div>

      <div className="relative flex flex-1 flex-col px-5 pb-5 pt-1 sm:px-6 sm:pb-6">
        <div
          className={`flex items-center gap-2 text-[10.5px] font-semibold uppercase tracking-[0.26em] ${
            tone === "customer" ? "text-white/55" : "text-accent"
          }`}
        >
          <span className={`h-[2px] w-4 rounded-full ${tone === "customer" ? "bg-white/40" : "bg-accent"}`} />
          {tag}
        </div>
        <h2 className="mt-2 font-heading text-[2.6rem] uppercase leading-[0.88] tracking-[0.01em] text-white sm:text-[2.9rem]">
          {title}
        </h2>
        <p className="mt-2 max-w-[34ch] text-[14.5px] leading-snug text-white/60">{pitch}</p>
        {reward ? (
          <p className="mt-3 flex items-start gap-2 text-[12.5px] font-semibold leading-snug text-accent/90">
            <Gift className="mt-[1px] h-3.5 w-3.5 shrink-0" />
            {reward}
          </p>
        ) : null}

        <div className="mt-auto flex items-end justify-between gap-3 pt-5">
          <div className="min-h-[36px] min-w-0 flex-1">{meta}</div>
          <span
            className={`inline-flex h-12 shrink-0 items-center gap-2 rounded-full pl-5 pr-4 font-heading text-[20px] uppercase tracking-[0.12em] transition-transform duration-300 ease-out group-hover:translate-x-0.5 ${
              tone === "customer"
                ? "border border-white/20 text-white group-hover:border-accent group-hover:text-accent"
                : "bg-accent text-black shadow-[0_8px_24px_-10px_rgba(232,255,60,0.55)]"
            }`}
          >
            {cta}
            {tone === "customer" ? <ArrowRight className="h-[18px] w-[18px]" strokeWidth={2.4} /> : <Play className="h-4 w-4 fill-current" strokeWidth={0} />}
          </span>
        </div>
      </div>
    </Link>
  );
}

function BestChip({ value, empty = "Još bez rekorda" }: { value: ReactNode | null | undefined; empty?: string }) {
  // undefined = još nismo pročitali localStorage (SSR / prije hidracije): ne
  // pokazuj "Još bez rekorda" igraču koji ima rekord — samo rezerviraj mjesto.
  if (value === undefined) return <span className="block h-[36px]" aria-hidden />;
  if (value === null) {
    return <span className="text-[12.5px] leading-tight text-white/35">{empty}</span>;
  }
  return (
    <span className="flex flex-col">
      <span className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.22em] text-white/40">
        <Trophy className="h-3 w-3 text-accent/80" />
        Tvoj rekord
      </span>
      <span className="mt-0.5 font-heading text-[22px] leading-none tracking-[0.03em] text-white tabular-nums">{value}</span>
    </span>
  );
}

// ── Ilustracije ──────────────────────────────────────────────────────────────
function PenaltyArt() {
  // Gol iz perspektive igrača na bijeloj točki: travnate pruge, mreža,
  // lopta pred rašljama s limetastim tragom.
  const grass = Array.from({ length: 7 }, (_, i) => i);
  return (
    <div className="absolute inset-0 bg-[radial-gradient(120%_90%_at_50%_0%,#18200c_0%,#0d0f0a_55%,#0b0b0b_100%)]">
      <svg viewBox="0 0 400 210" preserveAspectRatio="xMidYMid slice" className="absolute inset-0 h-full w-full">
        <defs>
          <linearGradient id="ih-post" x1="0" x2="1">
            <stop offset="0" stopColor="#ffffff" />
            <stop offset="1" stopColor="#c9c9c9" />
          </linearGradient>
          <linearGradient id="ih-trail" x1="0" y1="1" x2="1" y2="0">
            <stop offset="0" stopColor="#e8ff3c" stopOpacity="0" />
            <stop offset="1" stopColor="#e8ff3c" stopOpacity="0.85" />
          </linearGradient>
          <radialGradient id="ih-glow" cx="0.5" cy="0.5" r="0.5">
            <stop offset="0" stopColor="#e8ff3c" stopOpacity="0.35" />
            <stop offset="1" stopColor="#e8ff3c" stopOpacity="0" />
          </radialGradient>
          <pattern id="ih-net" width="9" height="9" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
            <path d="M0 0H9M0 0V9" stroke="#ffffff" strokeOpacity="0.13" strokeWidth="0.8" fill="none" />
          </pattern>
        </defs>

        {/* travnjak u perspektivi */}
        {grass.map((i) => {
          const y0 = 132 + i * 11;
          const y1 = y0 + 11;
          const spread = (y: number) => 120 + (y - 132) * 4.2;
          return (
            <path
              key={i}
              d={`M${200 - spread(y0)} ${y0} L${200 + spread(y0)} ${y0} L${200 + spread(y1)} ${y1} L${200 - spread(y1)} ${y1}Z`}
              fill={i % 2 ? "#121a0c" : "#0f150a"}
            />
          );
        })}
        {/* linije šesnaesterca */}
        <path d="M200 132 L-40 210 M200 132 L440 210" stroke="none" />
        <path d="M58 156 L342 156" stroke="#ffffff" strokeOpacity="0.16" strokeWidth="1.2" />
        <path d="M58 156 L18 210 M342 156 L382 210" stroke="#ffffff" strokeOpacity="0.12" strokeWidth="1.2" />
        <ellipse cx="200" cy="196" rx="7" ry="2.4" fill="#ffffff" fillOpacity="0.5" />

        {/* mreža i dubina gola */}
        <path d="M104 42 L118 56 L282 56 L296 42Z" fill="#ffffff" fillOpacity="0.035" />
        <rect x="104" y="42" width="192" height="90" fill="url(#ih-net)" />
        <path d="M104 132 L118 122 L282 122 L296 132" stroke="#ffffff" strokeOpacity="0.18" strokeWidth="1" fill="none" />
        <path d="M118 56 L118 122 M282 56 L282 122 M118 56 L282 56" stroke="#ffffff" strokeOpacity="0.2" strokeWidth="1" fill="none" />
        {/* gol-linija */}
        <path d="M60 132 L340 132" stroke="#ffffff" strokeOpacity="0.35" strokeWidth="1.4" />
        {/* stative i prečka */}
        <path d="M104 133 V40 H296 V133" stroke="url(#ih-post)" strokeWidth="5" strokeLinejoin="round" fill="none" />
        <path d="M104 133 V40 H296 V133" stroke="#000000" strokeOpacity="0.25" strokeWidth="1" transform="translate(1.6 1.6)" fill="none" />

        {/* trag lopte */}
        <path className="ih-trail" d="M200 194 C 226 150, 246 104, 266 70" stroke="url(#ih-trail)" strokeWidth="5" strokeLinecap="round" fill="none" />
        <path d="M200 194 C 226 150, 246 104, 266 70" stroke="#e8ff3c" strokeOpacity="0.25" strokeWidth="14" strokeLinecap="round" fill="none" className="ih-trail" />
        <circle cx="271" cy="64" r="34" fill="url(#ih-glow)" />
        {/* udar u mrežu */}
        <path d="M290 50 l9 -6 M292 62 l10 1 M285 41 l3 -9" stroke="#e8ff3c" strokeOpacity="0.7" strokeWidth="2" strokeLinecap="round" className="ih-spark" />
        <ellipse cx="270" cy="128" rx="14" ry="3" fill="#000000" fillOpacity="0.35" />
      </svg>
      {/* lopta kao prava slika (bolje od crtane) */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/mix/lopta-hrvatska.webp"
        alt=""
        width={316}
        height={316}
        decoding="async"
        className="ih-penalty-ball absolute h-[24%] w-auto drop-shadow-[0_6px_10px_rgba(0,0,0,0.55)]"
        style={{ left: "calc(50% + 46px)", top: "19%" }}
      />
    </div>
  );
}

function QuizArt({ playedToday }: { playedToday: boolean }) {
  const answers = [
    { t: "9", ok: false },
    { t: "10", ok: false },
    { t: "11", ok: true },
    { t: "12", ok: false }
  ];
  return (
    <div className="absolute inset-0 overflow-hidden bg-[radial-gradient(90%_100%_at_85%_10%,#1d2109_0%,#0f100c_50%,#0b0b0b_100%)]">
      <span className="pointer-events-none absolute -right-3 -top-12 select-none font-heading text-[230px] leading-none text-white/[0.04] sm:text-[270px]">
        ?
      </span>
      <div className="ih-quiz absolute left-1/2 top-[14px] w-[min(296px,80%)] -translate-x-1/2 sm:top-[22px]">
        <div className="rounded-[16px] border border-white/10 bg-[#161616] px-3.5 pb-3 pt-3 shadow-[0_18px_40px_-18px_rgba(0,0,0,0.9)]">
          <div className="flex items-center justify-between">
            <span className="text-[9.5px] font-semibold uppercase tracking-[0.24em] text-white/45">Pitanje 4 / 10</span>
            <span className="rounded-full border border-accent/30 px-2 py-[1px] text-[9px] font-semibold uppercase tracking-[0.2em] text-accent">
              {playedToday ? "Odigrano" : "Danas"}
            </span>
          </div>
          <div className="mt-2 flex gap-[3px]">
            {Array.from({ length: 10 }, (_, i) => (
              <span key={i} className={`h-[3px] flex-1 rounded-full ${i < 3 ? "bg-accent" : i === 3 ? "bg-white/55" : "bg-white/10"}`} />
            ))}
          </div>
          <p className="mt-2.5 text-[13px] font-semibold leading-snug text-white/90">Koliko igrača jedna momčad ima na terenu?</p>
          <div className="mt-2.5 grid grid-cols-2 gap-1.5">
            {answers.map((a) => (
              <span
                key={a.t}
                className={`flex h-[28px] items-center justify-between rounded-[9px] px-2.5 text-[12.5px] font-semibold ${
                  a.ok ? "ih-correct bg-accent text-black" : "border border-white/[0.08] bg-white/[0.03] text-white/60"
                }`}
              >
                {a.t}
                {a.ok ? <Check className="h-3.5 w-3.5" strokeWidth={3} /> : null}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function JuggleArt() {
  return (
    <div className="absolute inset-0 overflow-hidden bg-[radial-gradient(80%_110%_at_50%_100%,#1a1f0b_0%,#0e0f0b_45%,#0b0b0b_100%)]">
      <span className="pointer-events-none absolute -right-1 top-1 select-none font-heading text-[150px] leading-none tracking-[-0.02em] text-white/[0.045] sm:text-[180px]">
        48
      </span>
      <svg viewBox="0 0 400 210" preserveAspectRatio="xMidYMid slice" className="absolute inset-0 h-full w-full">
        {/* tlo */}
        <ellipse cx="200" cy="160" rx="150" ry="14" fill="#ffffff" fillOpacity="0.025" />
        <path d="M40 160 H360" stroke="#ffffff" strokeOpacity="0.06" strokeWidth="1" />
        {/* tragovi prijašnjih dodira */}
        <path d="M150 150 C 160 40, 240 40, 250 150" stroke="#ffffff" strokeOpacity="0.1" strokeWidth="1.6" strokeDasharray="2 7" strokeLinecap="round" fill="none" />
      </svg>
      {/* val pri dodiru (kad je lopta dolje) */}
      <span className="ih-ring absolute left-1/2 top-[76%] h-[18px] w-[90px] rounded-[50%] border-2 border-accent/70" />
      {/* sjena lopte na tlu: skuplja se kad je lopta gore */}
      <span className="ih-shadow absolute left-1/2 top-[73%] h-[10px] w-[64px] rounded-[50%] bg-black/80" />
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/mix/lopta-real-madrid.webp"
        alt=""
        width={316}
        height={316}
        decoding="async"
        className="ih-ball absolute left-1/2 top-[8%] h-[40%] w-auto drop-shadow-[0_10px_14px_rgba(0,0,0,0.6)]"
      />
      <span className="ih-plus absolute left-[calc(50%+50px)] top-[10%] font-heading text-[26px] tracking-[0.04em] text-accent">+1</span>
    </div>
  );
}

function WheelArt() {
  const n = 7;
  const seg = 360 / n;
  const r = 150;
  const cx = 200;
  const cy = 196;
  const pt = (deg: number, rad = r) => {
    const a = ((deg - 90) * Math.PI) / 180;
    return [cx + rad * Math.cos(a), cy + rad * Math.sin(a)];
  };
  const slices = Array.from({ length: n }, (_, i) => {
    const a0 = i * seg - seg / 2;
    const a1 = a0 + seg;
    const [x0, y0] = pt(a0);
    const [x1, y1] = pt(a1);
    const fill = i === 0 ? "#e8ff3c" : i % 2 ? "#323235" : "#1c1c1e";
    return <path key={i} d={`M${cx} ${cy} L${x0.toFixed(2)} ${y0.toFixed(2)} A${r} ${r} 0 0 1 ${x1.toFixed(2)} ${y1.toFixed(2)}Z`} fill={fill} />;
  });
  const pegs = Array.from({ length: n * 2 }, (_, i) => {
    const [x, y] = pt(i * (seg / 2) - seg / 2, r - 7);
    return <circle key={i} cx={x} cy={y} r="2.6" fill="#ffffff" fillOpacity={i % 2 ? 0.35 : 0.7} />;
  });
  return (
    <div className="absolute inset-0 overflow-hidden bg-[radial-gradient(90%_100%_at_50%_100%,#17170f_0%,#0e0e0c_50%,#0b0b0b_100%)]">
      <svg viewBox="0 0 400 210" preserveAspectRatio="xMidYMid slice" className="absolute inset-0 h-full w-full">
        <defs>
          <radialGradient id="ih-wheel-shade" cx="0.5" cy="0.5" r="0.5">
            <stop offset="0.55" stopColor="#000000" stopOpacity="0" />
            <stop offset="1" stopColor="#000000" stopOpacity="0.45" />
          </radialGradient>
          <radialGradient id="ih-wheel-glow" cx="0.5" cy="0.5" r="0.5">
            <stop offset="0" stopColor="#e8ff3c" stopOpacity="0.16" />
            <stop offset="1" stopColor="#e8ff3c" stopOpacity="0" />
          </radialGradient>
        </defs>
        <circle cx={cx} cy={cy} r={r + 40} fill="url(#ih-wheel-glow)" />
        <g className="ih-wheel" style={{ transformOrigin: `${cx}px ${cy}px` }}>
          {slices}
          {/* razdjelnici */}
          {Array.from({ length: n }, (_, i) => {
            const [x, y] = pt(i * seg - seg / 2);
            return <path key={i} d={`M${cx} ${cy} L${x.toFixed(2)} ${y.toFixed(2)}`} stroke="#0b0b0b" strokeOpacity="0.8" strokeWidth="1.5" />;
          })}
          {pegs}
        </g>
        <circle cx={cx} cy={cy} r={r} fill="url(#ih-wheel-shade)" />
        <circle cx={cx} cy={cy} r={r} stroke="#e8ff3c" strokeWidth="4" fill="none" />
        <circle cx={cx} cy={cy} r={r + 6} stroke="#ffffff" strokeOpacity="0.06" strokeWidth="1" fill="none" />
        {/* glavčina */}
        <circle cx={cx} cy={cy} r="26" fill="#0b0b0b" stroke="#e8ff3c" strokeWidth="2.5" />
        {/* kazaljka */}
        <path d={`M${cx - 11} ${cy - r - 14} L${cx + 11} ${cy - r - 14} L${cx} ${cy - r + 10}Z`} fill="#e8ff3c" stroke="#0b0b0b" strokeWidth="2" strokeLinejoin="round" />
      </svg>
    </div>
  );
}

// ── Hub ─────────────────────────────────────────────────────────────────────
export function GamesHub({ koloActive }: { koloActive: boolean }) {
  const stats = useStats();

  const ready = stats !== null;
  const penaltyBest = stats?.penalty ?? null;
  const quizBest = stats?.quiz ?? null;
  const juggleBest = stats?.juggle ?? null;
  const streak = stats?.streak ?? 0;
  const playedToday = stats?.playedToday ?? false;
  const fmt = (v: number | null, f: (n: number) => string) => (!ready ? undefined : v === null ? null : f(v));

  // Animacije ilustracija pauziraju dok kartica nije na ekranu (baterija; kolo
  // je SVG pa ga Safari iscrtava na CPU-u).
  const gridRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const root = gridRef.current;
    if (!root || typeof IntersectionObserver === "undefined") return;
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) (e.target as HTMLElement).toggleAttribute("data-off", !e.isIntersecting);
      },
      { rootMargin: "80px 0px" }
    );
    root.querySelectorAll(".ih-card").forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, [koloActive]);
  const cardCount = koloActive ? 4 : 3;

  return (
    <section className="relative overflow-hidden pb-14 pt-6 sm:pb-20 sm:pt-14">
      {/* dangerouslySetInnerHTML: React bi u SSR-u escapao navodnike (content:"") → hydration mismatch */}
      <style dangerouslySetInnerHTML={{ __html: HUB_CSS }} />
      {/* tihi limetasti sjaj iza naslova */}
      <div aria-hidden className="pointer-events-none absolute left-1/2 top-[-160px] h-[360px] w-[620px] -translate-x-1/2 rounded-full bg-[radial-gradient(closest-side,rgba(232,255,60,0.10),rgba(232,255,60,0))]" />

      <div className="page-shell relative max-w-5xl">
        <header className="px-1 sm:text-center">
          <div className="flex items-center gap-2 text-[10.5px] font-semibold uppercase tracking-[0.3em] text-accent sm:justify-center">
            <span className="h-[2px] w-5 rounded-full bg-accent" />
            Mini igre
          </div>
          <h1 className="mt-3 font-heading text-[clamp(2.9rem,13.5vw,5.6rem)] uppercase leading-[0.86] tracking-[0.005em] text-white">
            Igraj.
            <br className="sm:hidden" /> <span className="text-accent">Ruši rekorde.</span>
          </h1>
          <p className="mt-3 max-w-[36ch] text-[14.5px] leading-snug text-white/60 sm:mx-auto sm:mt-4 sm:text-[15px]">
            Kratke nogometne igre za pauzu. Svaki rekord ostaje spremljen na tvom mobitelu.
          </p>
        </header>

        <div
          ref={gridRef}
          className={`mt-6 grid gap-4 sm:mt-12 sm:gap-5 ${
            // 4 kartice → 2x2; 3 kartice → jedan stupac do lg, pa 3 u redu (bez "siročeta")
            cardCount === 4 ? "sm:grid-cols-2" : "mx-auto max-w-xl lg:max-w-none lg:grid-cols-3"
          }`}
        >
          <GameCard
            href="/igra/"
            index="01"
            tag="Klasik"
            title="Penalty Cup"
            pitch="Pet penala, jedan golman. Pogodi kut i zabij što više možeš."
            art={<PenaltyArt />}
            meta={
              <BestChip value={fmt(penaltyBest, (n) => `${n} ${plural(n, "gol", "gola", "golova")}`)} />
            }
            reward={rewardHint("penalty", unitGoals)}
          />
          <GameCard
            href="/kviz/"
            index="02"
            tag={
              <>
                Novo svaki dan
                {streak > 0 ? (
                  <span className="ml-1 inline-flex items-center gap-1 rounded-full bg-accent/10 px-2 py-[2px] tracking-[0.16em]">
                    <Flame className="h-3 w-3" />
                    {streak} {plural(streak, "dan", "dana", "dana")}
                  </span>
                ) : null}
              </>
            }
            title="Kviz dana"
            pitch={playedToday ? "Današnji kviz je riješen. Novih 10 pitanja stiže sutra." : "Svaki dan novih 10 pitanja. Koliko znaš o nogometu?"}
            art={<QuizArt playedToday={playedToday} />}
            cta={playedToday ? "Otvori" : "Igraj"}
            meta={<BestChip value={fmt(quizBest, (n) => `${Math.min(n, 10)}/10`)} />}
            reward={rewardHint("quiz", unitQuiz)}
          />
          <GameCard
            href="/zongliranje/"
            index="03"
            tag="Vještina"
            title="Žongliranje"
            pitch="Koliko dugo možeš držati loptu u zraku?"
            art={<JuggleArt />}
            meta={
              // Žongliranje sprema BODOVE (dodiri x množitelj + kape), ne broj dodira.
              <BestChip value={fmt(juggleBest, (n) => `${n} ${plural(n, "bod", "boda", "bodova")}`)} />
            }
            reward={rewardHint("zongliranje", unitPoints)}
          />
          {koloActive ? (
            <GameCard
              href="/kolo/"
              index="04"
              tag="Za kupce"
              tone="customer"
              title="Kolo sreće"
              pitch="Prvu vrtnju dobiješ uz broj mobitela, a svaka narudžba od 60 € donosi novu."
              art={<WheelArt />}
              cta="Zavrti"
              meta={<span className="text-[12.5px] leading-tight text-white/40">Vrtnje se vežu uz tvoj broj mobitela</span>}
            />
          ) : null}
        </div>

        {/* kako rade rekordi — kratko, korisno i za SEO */}
        <div className="mt-10 grid gap-3 sm:mt-14 sm:grid-cols-3">
          {[
            { Icon: Trophy, t: "Osobni rekord", d: "Svaka igra pamti tvoj najbolji rezultat. Pobijedi samog sebe." },
            { Icon: Flame, t: "Niz dana", d: "Riješi kviz svaki dan zaredom i gradi svoj niz." },
            { Icon: Share2, t: "Podijeli rezultat", d: "Nakon partije spremi rezultat kao sliku za story." }
          ].map(({ Icon, t, d }) => (
            <div key={t} className="flex items-start gap-3.5 rounded-[16px] border border-white/[0.06] bg-white/[0.02] p-4">
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-[11px] border border-white/10 bg-white/[0.04]">
                <Icon className="h-[17px] w-[17px] text-accent" strokeWidth={2} />
              </span>
              <span>
                <span className="block text-[14px] font-semibold text-white/90">{t}</span>
                <span className="mt-0.5 block text-[13px] leading-snug text-white/50">{d}</span>
              </span>
            </div>
          ))}
        </div>

        <p className="mt-6 flex items-center gap-2 px-1 text-[12px] leading-snug text-white/35 sm:justify-center">
          <Smartphone className="h-3.5 w-3.5 shrink-0" />
          Igre su napravljene za mobitel, ali rade i na računalu.
        </p>
      </div>
    </section>
  );
}

// Animacije: samo transform/opacity (GPU), bez blur-a na velikim plohama.
const HUB_CSS = `
.ih-ball{animation:ih-bounce 1.4s infinite;transform:translate(-50%,0)}
@keyframes ih-bounce{0%{transform:translate(-50%,80%) scale(1.05,.95) rotate(0);animation-timing-function:cubic-bezier(.2,.7,.4,1)}6%{transform:translate(-50%,72%) scale(.97,1.03) rotate(-2deg);animation-timing-function:cubic-bezier(.2,.7,.4,1)}50%{transform:translate(-50%,0) scale(1) rotate(-22deg);animation-timing-function:cubic-bezier(.6,0,.8,.3)}100%{transform:translate(-50%,80%) scale(1.05,.95) rotate(0)}}
.ih-shadow{animation:ih-shadow 1.4s infinite;transform:translate(-50%,0)}
@keyframes ih-shadow{0%,100%{transform:translate(-50%,0) scale(1);opacity:.9;animation-timing-function:cubic-bezier(.2,.7,.4,1)}50%{transform:translate(-50%,0) scale(.5);opacity:.3;animation-timing-function:cubic-bezier(.6,0,.8,.3)}}
.ih-ring{animation:ih-ring 1.4s ease-out infinite;transform:translate(-50%,-50%) scale(.3);opacity:0}
@keyframes ih-ring{0%{transform:translate(-50%,-50%) scale(.35);opacity:.9}28%{transform:translate(-50%,-50%) scale(1.25);opacity:0}100%{opacity:0}}
.ih-plus{animation:ih-plus 1.4s ease-out infinite;opacity:0}
@keyframes ih-plus{0%,4%{opacity:0;transform:translateY(40px)}14%{opacity:1}40%{opacity:0;transform:translateY(0)}100%{opacity:0}}
.ih-penalty-ball{animation:ih-float 3.2s ease-in-out infinite}
@keyframes ih-float{0%,100%{transform:translateY(0) rotate(0)}50%{transform:translateY(-4px) rotate(-14deg)}}
.ih-spark{animation:ih-spark 3.2s ease-in-out infinite}
@keyframes ih-spark{0%,100%{opacity:.25}50%{opacity:1}}
.ih-wheel{animation:ih-spin 38s linear infinite}
.ih-card:hover .ih-wheel{animation-duration:6s}
@keyframes ih-spin{to{transform:rotate(360deg)}}
.ih-quiz{transition:transform .5s cubic-bezier(.2,.8,.2,1)}
.ih-card:hover .ih-quiz{transform:translate(-50%,-4px)}
.ih-correct{position:relative}
.ih-correct::after{content:"";position:absolute;inset:-4px;border-radius:12px;border:2px solid rgba(232,255,60,.4);opacity:0;animation:ih-pop 2.8s ease-out infinite}
@keyframes ih-pop{0%,66%{opacity:0;transform:scale(.94)}78%{opacity:1;transform:scale(1)}100%{opacity:0;transform:scale(1.06)}}
.ih-card[data-off] *,.ih-card[data-off] *::after{animation-play-state:paused!important}
@media (prefers-reduced-motion: reduce){.ih-ring{animation:none;opacity:0}.ih-ball,.ih-shadow,.ih-plus,.ih-penalty-ball,.ih-spark,.ih-wheel,.ih-correct::after{animation:none}.ih-plus{opacity:1;transform:none}.ih-ball{transform:translate(-50%,0)}}
`;
