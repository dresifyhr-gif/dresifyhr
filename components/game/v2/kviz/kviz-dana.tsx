"use client";

// KVIZ DANA — 10 pitanja, isti za sve (sjeme = datum po Zagrebu).
// Prvi pokušaj dana je službeni (gradi dnevni niz), kasniji su vježba s
// nasumičnim pitanjima. 12 sekundi po pitanju.

import { AnimatePresence, motion, useAnimationControls } from "framer-motion";
import { Check, Clock3, Flame, Smartphone, X } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { BRAND, clamp, createParticles, damp, loadImage, rand } from "../draw";
import {
  GameShell,
  HudStat,
  useCanvas,
  useFastTap,
  useGameLoop,
  type GameResult,
  type GameState,
} from "../game-shell";
import { pickReward } from "../rewards";
import { haptic, sfx } from "../sfx";
import {
  KVIZ_BEST_KEY,
  KVIZ_BEST_PRACTICE_KEY,
  KVIZ_BROJ_PITANJA,
  KVIZ_GAME_ID,
  KVIZ_REWARD_TIERS,
  KVIZ_SEKUNDI,
} from "./config";
import {
  beginOfficial,
  dailyQuestions,
  dailyStatus,
  formatCountdown,
  formatDayLong,
  formatDayShort,
  msToNextQuiz,
  practiceQuestions,
  saveOfficial,
  zagrebDay,
  type DailyStatus,
  type Ishod,
  type KvizPitanje,
} from "./daily";

type Mode = "official" | "practice";
type Phase = "ask" | "reveal";

const RED = "#ff5a5f";
const AMBER = "#ffb020";
const EASE = [0.22, 1, 0.36, 1] as const;
const LETTERS = ["A", "B", "C", "D"];

function resultMessage(score: number) {
  if (score >= 10) return "Savršen rezultat. Svih deset.";
  if (score === 9) return "Samo jedno pitanje do savršenstva.";
  if (score >= 7) return "Odlično poznaješ nogomet.";
  if (score >= 5) return "Solidno. Sutra još bolje.";
  if (score >= 3) return "Bilo je teških pitanja.";
  return "Danas nije bio tvoj dan.";
}

// ── Odbrojavanje do novog kviza ──────────────────────────────────────────
function useCountdown(active: boolean) {
  const [ms, setMs] = useState<number | null>(null);
  useEffect(() => {
    if (!active) return;
    const tick = () => setMs(msToNextQuiz());
    tick();
    const id = window.setInterval(tick, 1000);
    return () => window.clearInterval(id);
  }, [active]);
  return ms;
}

// ── Mobitel položen vodoravno (premalo visine za pitanje + 4 odgovora) ──
const LANDSCAPE_MQ =
  "(orientation: landscape) and (max-height: 500px) and (pointer: coarse)";
function useLandscapePhone() {
  const [on, setOn] = useState(false);
  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return;
    const mq = window.matchMedia(LANDSCAPE_MQ);
    const sync = () => setOn(mq.matches);
    sync();
    mq.addEventListener?.("change", sync);
    window.addEventListener("resize", sync);
    return () => {
      mq.removeEventListener?.("change", sync);
      window.removeEventListener("resize", sync);
    };
  }, []);
  return on;
}

// ── Prsten s vremenom ────────────────────────────────────────────────────
const RING_R = 44;
const RING_C = 2 * Math.PI * RING_R;

// ── Gumb odgovora ────────────────────────────────────────────────────────
function AnswerButton({
  index,
  text,
  state,
  onPick,
  compact,
  tiny,
}: {
  index: number;
  text: string;
  state: "idle" | "correct" | "wrong" | "dim" | "missed";
  onPick: (i: number, el: HTMLElement) => void;
  compact: boolean;
  tiny: boolean;
}) {
  const ref = useRef<HTMLButtonElement>(null);
  const fast = useFastTap(() => {
    if (ref.current) onPick(index, ref.current);
  });
  const base =
    "relative flex w-full items-center gap-3 overflow-hidden rounded-[15px] border px-3.5 text-left transition-[background-color,border-color,color,opacity,box-shadow] duration-200";
  const look =
    state === "correct"
      ? "border-accent bg-accent text-black shadow-[0_8px_28px_rgba(232,255,60,0.28)]"
      : state === "missed"
        ? "border-accent/80 bg-accent/[0.10] text-white"
        : state === "wrong"
          ? "border-[#ff5a5f]/80 bg-[#ff5a5f]/[0.16] text-white"
          : state === "dim"
            ? "border-white/[0.06] bg-white/[0.02] text-white/35"
            : "border-white/[0.11] bg-white/[0.045] text-white/95 active:bg-white/[0.09]";
  const badge =
    state === "correct"
      ? "bg-black/15 text-black"
      : state === "missed"
        ? "bg-accent text-black"
        : state === "wrong"
          ? "bg-[#ff5a5f] text-white"
          : state === "dim"
            ? "bg-white/[0.04] text-white/30"
            : "bg-white/[0.07] text-white/70";
  return (
    <motion.button
      ref={ref}
      type="button"
      data-answer={index}
      data-answer-state={state}
      {...fast}
      initial={{ opacity: 0, y: 10 }}
      animate={
        state === "wrong"
          ? {
              opacity: 1,
              y: 0,
              x: [0, -7, 7, -5, 5, -2, 0],
              transition: { x: { duration: 0.4 } },
            }
          : state === "correct"
            ? {
                opacity: 1,
                y: 0,
                scale: [1, 1.035, 1],
                transition: { scale: { duration: 0.36, ease: EASE } },
              }
            : { opacity: 1, y: 0 }
      }
      transition={{ duration: 0.36, ease: EASE, delay: 0.06 + index * 0.045 }}
      whileTap={state === "idle" ? { scale: 0.975 } : undefined}
      className={`${base} ${look} ${tiny ? "min-h-[42px] py-1.5" : compact ? "min-h-[48px] py-2" : "min-h-[54px] py-2.5"}`}
    >
      <span
        className={`grid h-7 w-7 shrink-0 place-items-center rounded-[9px] font-heading text-[17px] leading-none transition-colors ${badge}`}
      >
        {state === "correct" || state === "missed" ? (
          <Check className="h-4 w-4" strokeWidth={3} />
        ) : state === "wrong" ? (
          <X className="h-4 w-4" strokeWidth={3} />
        ) : (
          <span className="translate-y-[1px]">{LETTERS[index]}</span>
        )}
      </span>
      <span
        className={`min-w-0 flex-1 font-semibold leading-[1.2] ${tiny ? "text-[14px]" : compact ? "text-[15px]" : "text-[15.5px]"}`}
      >
        {text}
      </span>
    </motion.button>
  );
}

// ── Startni dodatak: današnji kviz ───────────────────────────────────────
function StreakPill({ streak }: { streak: number }) {
  if (streak <= 0) return null;
  return (
    <span className="flex items-center gap-1 rounded-full border border-accent/30 bg-accent/[0.08] px-2.5 py-1 text-[11.5px] font-semibold text-accent">
      <Flame className="h-[13px] w-[13px]" strokeWidth={2.4} />
      Niz {streak} {streak === 1 ? "dan" : "dana"}
    </span>
  );
}

function StartPanel({
  status,
  countdown,
}: {
  status: DailyStatus | null;
  countdown: number | null;
}) {
  const day = status?.day ?? zagrebDay();
  const played = !!status?.playedToday;
  const streak = status?.streak ?? 0;
  if (played) {
    const score = status?.todayRecord?.score ?? 0;
    return (
      <div className="rounded-[16px] border border-white/10 bg-white/[0.035] px-4 pb-3 pt-3">
        <div className="flex items-center justify-between gap-2">
          <span className="text-[10.5px] font-semibold uppercase tracking-[0.24em] text-white/45">
            Tvoj rezultat danas
          </span>
          <StreakPill streak={streak} />
        </div>
        <div className="mt-1.5 flex items-end justify-between gap-3">
          <div className="font-heading text-[46px] leading-[0.85] tabular-nums text-accent">
            {score}
            <span className="text-white/35">/{KVIZ_BROJ_PITANJA}</span>
          </div>
          <div className="text-right">
            <div className="text-[10.5px] font-semibold uppercase tracking-[0.2em] text-white/45">
              Novi kviz za
            </div>
            <div className="font-heading text-[26px] leading-none tabular-nums text-white">
              {countdown === null ? "--:--:--" : formatCountdown(countdown)}
            </div>
          </div>
        </div>
        <p className="mt-2.5 border-t border-white/[0.07] pt-2 text-[12.5px] leading-snug text-white/55">
          Sad igraš vježbu s nasumičnim pitanjima. Ne računa se u rezultat dana.
        </p>
      </div>
    );
  }
  const stats: [string, string][] = [
    [String(KVIZ_BROJ_PITANJA), "pitanja"],
    [`${KVIZ_SEKUNDI} s`, "po pitanju"],
    ["1", "službeni pokušaj"],
  ];
  return (
    <div className="rounded-[16px] border border-white/10 bg-white/[0.035] px-4 pb-3 pt-3">
      <div className="flex items-center justify-between gap-2">
        <span className="text-[10.5px] font-semibold uppercase tracking-[0.24em] text-white/45">
          Danas · {formatDayLong(day)}
        </span>
        <StreakPill streak={streak} />
      </div>
      <div className="mt-2.5 grid grid-cols-3 divide-x divide-white/[0.08]">
        {stats.map(([v, l]) => (
          <div key={l} className="px-1 text-center first:pl-0 last:pr-0">
            <div className="font-heading text-[28px] leading-none tabular-nums text-white">
              {v}
            </div>
            <div className="mt-1 text-[11px] leading-tight text-white/50">
              {l}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Dodatak na rezultatu (samo kad ima mjesta — visoki ekrani/desktop) ────
function ResultPanel({
  mode,
  status,
  answers,
  countdown,
}: {
  mode: Mode;
  status: DailyStatus | null;
  answers: Ishod[];
  countdown: number | null;
}) {
  const official = status?.todayRecord;
  const streak = status?.streak ?? 1;
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, ease: EASE, delay: 0.1 }}
      className="rounded-[16px] border border-white/10 bg-white/[0.035] px-3.5 pb-3 pt-3"
    >
      <ResultDots answers={answers} />
      <div className="mt-3 flex items-center justify-between gap-3">
        {mode === "official" ? (
          <div className="flex items-center gap-2.5">
            <span className="grid h-9 w-9 place-items-center rounded-[11px] bg-accent/[0.12]">
              <Flame
                className="h-[18px] w-[18px] text-accent"
                strokeWidth={2.2}
              />
            </span>
            <div>
              <div className="text-[10.5px] font-semibold uppercase tracking-[0.2em] text-white/45">
                Niz
              </div>
              <div className="font-heading text-[22px] leading-none text-white">
                {streak} {streak === 1 ? "dan" : "dana"}
              </div>
            </div>
          </div>
        ) : (
          <p className="text-[12.5px] leading-snug text-white/55">
            Vježba se ne računa.
            {official ? (
              <>
                {" "}
                Službeno danas:{" "}
                <b className="font-semibold text-white/85">
                  {official.score}/{KVIZ_BROJ_PITANJA}
                </b>
              </>
            ) : null}
          </p>
        )}
        <div className="shrink-0 text-right">
          <div className="text-[10.5px] font-semibold uppercase tracking-[0.2em] text-white/45">
            Novi kviz za
          </div>
          <div className="font-heading text-[22px] leading-none tabular-nums text-white">
            {countdown === null ? "--:--:--" : formatCountdown(countdown)}
          </div>
        </div>
      </div>
    </motion.div>
  );
}

function ResultDots({
  answers,
  total = KVIZ_BROJ_PITANJA,
}: {
  answers: Ishod[];
  total?: number;
}) {
  return (
    <div className="flex gap-1">
      {Array.from({ length: total }).map((_, i) => {
        const a = answers[i];
        return (
          <motion.span
            key={i}
            initial={{ scaleX: 0 }}
            animate={{ scaleX: 1 }}
            transition={{ duration: 0.3, ease: EASE, delay: 0.25 + i * 0.05 }}
            className={`h-[5px] flex-1 origin-left rounded-full ${a === 1 ? "bg-accent" : a === 0 ? "bg-[#ff5a5f]/80" : "bg-white/20"}`}
          />
        );
      })}
    </div>
  );
}

// ── Pregled odgovora (ispod igre, nakon kraja) ──────────────────────────
function AnswersReview({
  mode,
  answers,
  questions,
  picks,
}: {
  mode: Mode;
  answers: Ishod[];
  questions: KvizPitanje[];
  picks: (number | null)[];
}) {
  return (
    <section className="mx-auto w-full max-w-[480px] px-4 pb-2 pt-6 md:pt-0">
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="font-heading text-[26px] uppercase leading-none text-white">
          {mode === "official" ? "Današnji odgovori" : "Odgovori iz vježbe"}
        </h2>
        <span className="text-[12.5px] tabular-nums text-white/45">
          {answers.filter((a) => a === 1).length}/{questions.length} točnih
        </span>
      </div>
      <ol className="mt-3 overflow-hidden rounded-[16px] border border-white/10 bg-white/[0.03]">
        {questions.map((q, i) => {
          const a = answers[i];
          const p = picks[i];
          return (
            <li
              key={i}
              className="flex gap-3 border-t border-white/[0.06] px-3.5 py-3 first:border-t-0"
            >
              <span
                className={`mt-[1px] grid h-5 w-5 shrink-0 place-items-center rounded-full ${a === 1 ? "bg-accent text-black" : a === 0 ? "bg-[#ff5a5f] text-white" : "bg-white/15 text-white/70"}`}
              >
                {a === 1 ? (
                  <Check className="h-3 w-3" strokeWidth={3} />
                ) : a === 0 ? (
                  <X className="h-3 w-3" strokeWidth={3} />
                ) : (
                  <Clock3 className="h-3 w-3" strokeWidth={2.6} />
                )}
              </span>
              <div className="min-w-0 text-[13.5px] leading-snug">
                <div className="text-[10.5px] font-semibold uppercase tracking-[0.18em] text-white/35">
                  {q.kategorija}
                </div>
                <div className="mt-0.5 text-white/85">{q.pitanje}</div>
                <div className="mt-1 font-semibold text-accent">{q.tocno}</div>
                {a === 0 && p !== null && p !== undefined ? (
                  <div className="text-white/40 line-through decoration-white/30">
                    {q.odgovori[p]}
                  </div>
                ) : null}
                {a === -1 ? (
                  <div className="text-white/40">Isteklo vrijeme</div>
                ) : null}
              </div>
            </li>
          );
        })}
      </ol>
    </section>
  );
}

// ── Pozadina (canvas) ────────────────────────────────────────────────────
function paintBackground(w: number, h: number, dpr: number) {
  const c = document.createElement("canvas");
  c.width = Math.max(1, Math.round(w * dpr));
  c.height = Math.max(1, Math.round(h * dpr));
  const ctx = c.getContext("2d")!;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

  let g = ctx.createLinearGradient(0, 0, 0, h);
  g.addColorStop(0, "#10120c");
  g.addColorStop(0.45, "#0b0b0b");
  g.addColorStop(1, "#060606");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);

  g = ctx.createRadialGradient(w / 2, -h * 0.08, 0, w / 2, -h * 0.08, h * 0.8);
  g.addColorStop(0, `rgba(${BRAND.accentRgb},0.11)`);
  g.addColorStop(0.5, `rgba(${BRAND.accentRgb},0.03)`);
  g.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);

  // Teren u perspektivi (vrlo diskretno) — donja polovica.
  const horizon = h * 0.5;
  const vx = w / 2;
  const vy = h * 0.08;
  const bottom = h + 4;
  const xAt = (x0: number, y: number) =>
    vx + (x0 - vx) * ((y - vy) / (bottom - vy));
  ctx.save();
  ctx.beginPath();
  ctx.rect(0, horizon, w, h - horizon);
  ctx.clip();
  // pruge košnje
  const half = w * 1.6;
  const stripes = 9;
  for (let i = 0; i < stripes; i++) {
    if (i % 2) continue;
    const x0 = vx - half + (2 * half * i) / stripes;
    const x1 = vx - half + (2 * half * (i + 1)) / stripes;
    ctx.beginPath();
    ctx.moveTo(xAt(x0, horizon), horizon);
    ctx.lineTo(xAt(x1, horizon), horizon);
    ctx.lineTo(x1, bottom);
    ctx.lineTo(x0, bottom);
    ctx.closePath();
    ctx.fillStyle = "rgba(255,255,255,0.012)";
    ctx.fill();
  }
  ctx.strokeStyle = "rgba(255,255,255,0.05)";
  ctx.lineWidth = 1;
  // poprečne linije
  for (let i = 1; i <= 6; i++) {
    const t = i / 6;
    const y = horizon + (bottom - horizon) * t * t;
    ctx.globalAlpha = 0.35 + t * 0.65;
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(w, y);
    ctx.stroke();
  }
  // središnji krug u perspektivi
  const cy = horizon + (bottom - horizon) * 0.42;
  const scale = (cy - vy) / (bottom - vy);
  ctx.globalAlpha = 0.9;
  ctx.beginPath();
  ctx.ellipse(
    vx,
    cy,
    w * 0.36 * scale * 1.6,
    w * 0.36 * scale * 0.42,
    0,
    0,
    Math.PI * 2,
  );
  ctx.stroke();
  ctx.restore();

  // fade terena prema gore
  g = ctx.createLinearGradient(0, horizon, 0, horizon + h * 0.22);
  g.addColorStop(0, "rgba(11,11,11,1)");
  g.addColorStop(1, "rgba(11,11,11,0)");
  ctx.fillStyle = g;
  ctx.fillRect(0, horizon - 1, w, h * 0.22 + 1);

  // vinjeta
  g = ctx.createRadialGradient(
    w / 2,
    h * 0.45,
    Math.min(w, h) * 0.3,
    w / 2,
    h * 0.45,
    Math.max(w, h) * 0.8,
  );
  g.addColorStop(0, "rgba(0,0,0,0)");
  g.addColorStop(1, "rgba(0,0,0,0.55)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);
  return c;
}

type Mote = {
  x: number;
  y: number;
  r: number;
  a: number;
  s: number;
  p: number;
};

// ── Igra ─────────────────────────────────────────────────────────────────
export function KvizDana() {
  const [state, setState] = useState<GameState>("start");
  const [mode, setMode] = useState<Mode>("official");
  const [status, setStatus] = useState<DailyStatus | null>(null);
  const [questions, setQuestions] = useState<KvizPitanje[]>([]);
  const [qi, setQi] = useState(0);
  const [phase, setPhase] = useState<Phase>("ask");
  const [picked, setPicked] = useState<number | null>(null);
  const [answers, setAnswers] = useState<Ishod[]>([]);
  const [picks, setPicks] = useState<(number | null)[]>([]);
  const [streak, setStreak] = useState(0);
  const [result, setResult] = useState<GameResult | null>(null);
  const [compact, setCompact] = useState(false);
  /** Vrlo nizak okvir (mali mobitel, vodoravno) — još zbijeniji raspored. */
  const [tiny, setTiny] = useState(false);
  const [low, setLow] = useState(false);

  const day = status?.day ?? null;
  const landscape = useLandscapePhone();
  const countdown = useCountdown(state === "start" || state === "result");

  // Stanje igre u refovima (petlja i handleri).
  const g = useRef({
    deadline: 0,
    remainingOnPause: 0,
    lastWhole: 0,
    phase: "ask" as Phase,
    revealAt: 0,
    /** Odgovori prije ovog trenutka se ignoriraju (iOS "ghost click" nakon dodira "Igraj"/"dalje"). */
    acceptAt: 0,
    nextTimer: 0 as number,
    qi: 0,
    answers: [] as Ishod[],
    picks: [] as (number | null)[],
    streak: 0,
    mode: "official" as Mode,
    day: "",
    total: KVIZ_BROJ_PITANJA,
  });
  const stateRef = useRef(state);
  stateRef.current = state;

  // DOM refovi za glatki prsten (bez re-rendera svaki frejm).
  const ringRef = useRef<SVGCircleElement>(null);
  const ringWrapRef = useRef<HTMLDivElement>(null);
  const secRef = useRef<HTMLSpanElement>(null);
  const uiRef = useRef<HTMLDivElement>(null);
  const shakeCtl = useAnimationControls();

  // Canvas: pozadina (ispod) + čestice (iznad UI-ja).
  const bgDirty = useRef(true);
  const bgCache = useRef<HTMLCanvasElement | null>(null);
  const back = useCanvas({ onResize: () => (bgDirty.current = true) });
  const front = useCanvas({ opaque: false });
  const fx = useRef(createParticles(220));
  const fxDirty = useRef(false);
  const flash = useRef<{ v: number; color: string }>({
    v: 0,
    color: BRAND.accentRgb,
  });
  const ball = useRef<HTMLImageElement | null>(null);
  const deco = useRef({ alpha: 1, rot: 0, measured: -1, titleTop: 0 });
  const motes = useRef<Mote[]>([]);

  useEffect(() => {
    setStatus(dailyStatus());
    loadImage("/mix/lopta-hrvatska.webp")
      .then((img) => (ball.current = img))
      .catch(() => {});
  }, []);

  // Zbijeni raspored na niskim ekranima.
  useEffect(() => {
    const el = uiRef.current;
    if (!el) return;
    const fit = () => {
      setCompact(el.clientHeight < 600);
      setTiny(el.clientHeight < 520);
    };
    fit();
    const ro =
      typeof ResizeObserver !== "undefined" ? new ResizeObserver(fit) : null;
    ro?.observe(el);
    return () => ro?.disconnect();
  }, []);

  // Ponoć po Zagrebu dok je stranica otvorena → osvježi status (novi kviz).
  useEffect(() => {
    if (countdown === null || state !== "start") return;
    // Samo kad se dan stvarno promijenio (inače bi se status vrtio u petlji).
    if (status && status.day !== zagrebDay()) setStatus(dailyStatus());
  }, [countdown, state, status]);

  const clearNext = () => {
    if (g.current.nextTimer) window.clearTimeout(g.current.nextTimer);
    g.current.nextTimer = 0;
  };
  useEffect(() => clearNext, []);

  const showQuestion = useCallback((i: number) => {
    const s = g.current;
    s.qi = i;
    s.phase = "ask";
    s.lastWhole = KVIZ_SEKUNDI + 1;
    s.acceptAt = performance.now() + 420;
    // Mali predah dok odgovori ulete, pa tek onda kreće sat.
    s.deadline = performance.now() + 380 + KVIZ_SEKUNDI * 1000;
    setQi(i);
    setPhase("ask");
    setPicked(null);
    setLow(false);
  }, []);

  const finish = useCallback(() => {
    const s = g.current;
    const score = s.answers.filter((a) => a === 1).length;
    if (s.mode === "official") {
      saveOfficial(s.day, s.answers, true);
      setStatus(dailyStatus(s.day));
    }
    sfx.whistle(true);
    if (score >= 8) sfx.crowd(score >= 10 ? 1 : 0.7, 2.6);
    setResult({
      score,
      display: `${score}/${s.total}`,
      title: s.mode === "official" ? "Službeni rezultat" : "Vježba",
      message: resultMessage(score),
    });
    setState("result");
  }, []);

  const advance = useCallback(() => {
    clearNext();
    const s = g.current;
    if (s.phase !== "reveal") return;
    if (s.qi + 1 >= s.total) finish();
    else {
      sfx.whoosh();
      showQuestion(s.qi + 1);
    }
  }, [finish, showQuestion]);

  const reveal = useCallback(
    (choice: number | null, el: HTMLElement | null) => {
      const s = g.current;
      if (s.phase !== "ask" || stateRef.current !== "playing") return;
      if (choice !== null && performance.now() < s.acceptAt) return;
      const q = questions[s.qi];
      if (!q) return;
      s.phase = "reveal";
      s.revealAt = performance.now();
      const outcome: Ishod = choice === null ? -1 : choice === q.tocan ? 1 : 0;
      s.answers = [...s.answers, outcome];
      s.picks = [...s.picks, choice];
      setAnswers(s.answers);
      setPicks(s.picks);
      setPicked(choice);
      setPhase("reveal");
      if (s.mode === "official") saveOfficial(s.day, s.answers, false);

      // Ishod: zvuk, čestice, bljesak, trešnja.
      const stage = uiRef.current?.getBoundingClientRect();
      const target =
        el ??
        (uiRef.current?.querySelector(
          `[data-answer="${q.tocan}"]`,
        ) as HTMLElement | null);
      const r = target?.getBoundingClientRect();
      const px = stage && r ? r.left - stage.left + r.width * 0.5 : 0;
      const py = stage && r ? r.top - stage.top + r.height * 0.5 : 0;
      if (outcome === 1) {
        s.streak += 1;
        setStreak(s.streak);
        sfx.success();
        window.setTimeout(() => sfx.coin(Math.min(8, s.streak - 1)), 70);
        haptic(14);
        flash.current = { v: 1, color: BRAND.accentRgb };
        if (r) {
          fx.current.burst(px, py, {
            count: 26,
            colors: [BRAND.accent, "#ffffff", BRAND.accent],
            speed: [140, 460],
            gravity: 380,
            drag: 2.6,
            life: [0.45, 0.9],
            size: [1.6, 3.6],
            shape: "spark",
          });
          fx.current.burst(px, py, {
            count: 12,
            colors: [BRAND.accent, "#f5ffb0"],
            speed: [60, 220],
            gravity: 240,
            drag: 2,
            life: [0.5, 1],
            size: [2, 4],
          });
          if (s.streak >= 3)
            fx.current.burst(px, py, {
              count: 18,
              colors: [BRAND.accent, "#ffffff"],
              speed: [240, 620],
              gravity: 520,
              drag: 1.8,
              life: [0.6, 1.1],
              size: [2.5, 5],
              shape: "confetti",
              angle: -Math.PI / 2,
              spread: 1.8,
            });
          fxDirty.current = true;
        }
      } else {
        s.streak = 0;
        setStreak(0);
        sfx.fail();
        haptic(outcome === -1 ? 20 : 34);
        flash.current = { v: 1, color: "255,90,95" };
        shakeCtl.start({
          x: [0, -6, 6, -4, 4, -1, 0],
          transition: { duration: 0.38, ease: "easeOut" },
        });
      }
      s.nextTimer = window.setTimeout(advance, outcome === 1 ? 1150 : 1800);
    },
    [questions, advance, shakeCtl],
  );

  const onPick = useCallback(
    (i: number, el: HTMLElement) => reveal(i, el),
    [reveal],
  );

  // Dodir bilo gdje tijekom prikaza odgovora → odmah dalje.
  const onSkipTap = useCallback(() => {
    const s = g.current;
    if (s.phase === "reveal" && performance.now() - s.revealAt > 450) advance();
  }, [advance]);

  const start = useCallback(() => {
    clearNext();
    const today = zagrebDay();
    const st = dailyStatus(today);
    const official = !st.playedToday;
    const qs = official ? dailyQuestions(today) : practiceQuestions(today);
    if (official) beginOfficial(today);
    setStatus(dailyStatus(today));
    const s = g.current;
    s.mode = official ? "official" : "practice";
    s.day = today;
    s.answers = [];
    s.picks = [];
    s.streak = 0;
    s.total = qs.length;
    s.phase = "ask";
    fx.current.clear();
    fxDirty.current = true;
    setMode(s.mode);
    setQuestions(qs);
    setAnswers([]);
    setPicks([]);
    setStreak(0);
    setResult(null);
    showQuestion(0);
    setState("playing");
    sfx.whistle();
  }, [showQuestion]);

  const pause = useCallback(() => {
    const s = g.current;
    s.remainingOnPause = Math.max(0, s.deadline - performance.now());
    if (s.phase === "reveal") clearNext();
    setState("paused");
  }, []);

  const resume = useCallback(() => {
    const s = g.current;
    s.deadline = performance.now() + s.remainingOnPause;
    if (s.phase === "reveal") s.nextTimer = window.setTimeout(advance, 500);
    setState("playing");
  }, [advance]);

  // Vježba se sama pauzira kad se mobitel položi (službeni sat namjerno teče, kao i kod skrivene kartice).
  useEffect(() => {
    if (landscape && state === "playing" && mode === "practice") pause();
  }, [landscape, state, mode, pause]);

  // ── Petlja ─────────────────────────────────────────────────────────────
  useGameLoop({
    running: state === "playing",
    update: () => {
      const s = g.current;
      if (s.phase !== "ask") return;
      const left = s.deadline - performance.now();
      const whole = Math.ceil(left / 1000);
      if (whole !== s.lastWhole) {
        s.lastWhole = whole;
        if (whole <= 3 && whole > 0) {
          sfx.tick(whole === 1);
          setLow(true);
        }
      }
      if (left <= 0) reveal(null, null);
    },
    render: ({ dt, time }) => {
      const s = g.current;
      const st = stateRef.current;

      // Prsten s vremenom (DOM, svaki frejm).
      if (ringRef.current && secRef.current) {
        let frac = 1;
        if (st === "playing" || st === "paused") {
          const left =
            st === "paused"
              ? s.remainingOnPause
              : s.deadline - performance.now();
          frac =
            s.phase === "reveal"
              ? 1
              : clamp(left / (KVIZ_SEKUNDI * 1000), 0, 1);
          if (s.phase === "ask") {
            const sec = String(clamp(Math.ceil(left / 1000), 0, KVIZ_SEKUNDI));
            if (secRef.current.textContent !== sec)
              secRef.current.textContent = sec;
          }
        }
        ringRef.current.style.strokeDashoffset = String(RING_C * (1 - frac));
        const col =
          s.phase === "reveal"
            ? s.answers[s.qi] === 1
              ? BRAND.accent
              : RED
            : frac > 5 / KVIZ_SEKUNDI
              ? BRAND.accent
              : frac > 3 / KVIZ_SEKUNDI
                ? AMBER
                : RED;
        if (ringRef.current.dataset.col !== col) {
          ringRef.current.dataset.col = col;
          ringRef.current.style.stroke = col;
          if (ringWrapRef.current)
            ringWrapRef.current.style.setProperty("--ring", col);
        }
      }

      // Pozadina.
      const v = back.view.current;
      const ctx = v.ctx;
      if (ctx && v.w > 2) {
        const { w, h } = v;
        if (bgDirty.current || !bgCache.current) {
          bgCache.current = paintBackground(w, h, v.dpr);
          bgDirty.current = false;
          motes.current = Array.from({ length: 26 }, () => ({
            x: rand(0, w),
            y: rand(0, h),
            r: rand(0.6, 1.8),
            a: rand(0.05, 0.22),
            s: rand(6, 18),
            p: rand(0, 6.28),
          }));
        }
        ctx.drawImage(bgCache.current, 0, 0, w, h);

        flash.current.v = damp(flash.current.v, 0, 3.4, dt);
        if (flash.current.v > 0.01) {
          const fg = ctx.createRadialGradient(
            w / 2,
            h * 0.3,
            0,
            w / 2,
            h * 0.3,
            Math.max(w, h) * 0.7,
          );
          fg.addColorStop(
            0,
            `rgba(${flash.current.color},${0.2 * flash.current.v})`,
          );
          fg.addColorStop(1, "rgba(0,0,0,0)");
          ctx.fillStyle = fg;
          ctx.fillRect(0, 0, w, h);
        }

        // Prašina u zraku.
        ctx.fillStyle = "#fff";
        for (const m of motes.current) {
          m.y -= m.s * dt;
          if (m.y < -4) {
            m.y = h + 4;
            m.x = rand(0, w);
          }
          ctx.globalAlpha = m.a * (0.6 + 0.4 * Math.sin(time * 1.3 + m.p));
          ctx.beginPath();
          ctx.arc(
            m.x + Math.sin(time * 0.6 + m.p) * 6,
            m.y,
            m.r,
            0,
            Math.PI * 2,
          );
          ctx.fill();
        }
        ctx.globalAlpha = 1;

        // Lopta i orbita s 10 točaka (samo startni ekran).
        const d = deco.current;
        d.alpha = damp(d.alpha, st === "start" ? 1 : 0, 7, dt);
        d.rot += dt * 0.35;
        if (d.alpha > 0.01) {
          // Lopta stoji u slobodnom prostoru iznad naslova (desno), da ne prekrije tekst.
          if (time - d.measured > 0.4) {
            d.measured = time;
            const t = document.querySelector<HTMLElement>(
              '.g2-stage [data-overlay="start"] h2',
            );
            const cv = back.canvasRef.current;
            if (t && cv)
              d.titleTop =
                t.getBoundingClientRect().top - cv.getBoundingClientRect().top;
          }
          const top = 56;
          const free = (d.titleTop > 0 ? d.titleTop : h * 0.4) - top;
          const size = clamp(free * 0.92, 92, 172);
          const bx = w - Math.max(size * 0.62, w * 0.24) - 8;
          const by =
            top + Math.max(free, size) * 0.5 + Math.sin(time * 1.4) * 4;
          ctx.save();
          ctx.globalAlpha = d.alpha;
          const glow = ctx.createRadialGradient(bx, by, 0, bx, by, size * 1.2);
          glow.addColorStop(0, `rgba(${BRAND.accentRgb},0.16)`);
          glow.addColorStop(1, "rgba(0,0,0,0)");
          ctx.fillStyle = glow;
          ctx.fillRect(
            bx - size * 1.3,
            by - size * 1.3,
            size * 2.6,
            size * 2.6,
          );

          const rx = size * 0.9;
          const ry = size * 0.24;
          const tilt = -0.32;
          const dots = KVIZ_BROJ_PITANJA;
          const drawDots = (front: boolean) => {
            for (let i = 0; i < dots; i++) {
              const a = d.rot + (i / dots) * Math.PI * 2;
              const z = Math.sin(a);
              if (front !== z > 0) continue;
              const ox = Math.cos(a) * rx;
              const oy = z * ry;
              const x = bx + ox * Math.cos(tilt) - oy * Math.sin(tilt);
              const y = by + ox * Math.sin(tilt) + oy * Math.cos(tilt);
              const k = 0.55 + 0.45 * (z + 1) * 0.5;
              ctx.globalAlpha = d.alpha * (front ? 0.95 : 0.35);
              ctx.fillStyle = i === 0 ? BRAND.accent : "#ffffff";
              ctx.beginPath();
              ctx.arc(x, y, (i === 0 ? 4.2 : 2.6) * k, 0, Math.PI * 2);
              ctx.fill();
            }
          };
          // orbita (linija)
          ctx.globalAlpha = d.alpha * 0.16;
          ctx.strokeStyle = "#ffffff";
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.ellipse(bx, by, rx, ry, tilt, 0, Math.PI * 2);
          ctx.stroke();
          drawDots(false);
          // sjena
          ctx.globalAlpha = d.alpha * 0.5;
          const sh = ctx.createRadialGradient(
            bx,
            by + size * 0.62,
            0,
            bx,
            by + size * 0.62,
            size * 0.5,
          );
          sh.addColorStop(0, "rgba(0,0,0,0.7)");
          sh.addColorStop(1, "rgba(0,0,0,0)");
          ctx.fillStyle = sh;
          ctx.save();
          ctx.translate(bx, by + size * 0.62);
          ctx.scale(1, 0.22);
          ctx.beginPath();
          ctx.arc(0, 0, size * 0.5, 0, Math.PI * 2);
          ctx.restore();
          ctx.fill();
          if (ball.current) {
            const img = ball.current;
            const ratio = img.naturalWidth / img.naturalHeight || 1;
            const iw = ratio >= 1 ? size : size * ratio;
            const ih = ratio >= 1 ? size / ratio : size;
            ctx.globalAlpha = d.alpha;
            ctx.save();
            ctx.translate(bx, by);
            ctx.rotate(Math.sin(time * 0.5) * 0.12 - 0.12);
            ctx.drawImage(img, -iw / 2, -ih / 2, iw, ih);
            ctx.restore();
          }
          drawDots(true);
          ctx.restore();
        }
      }

      // Čestice iznad odgovora.
      const fv = front.view.current;
      const fctx = fv.ctx;
      if (fctx && fv.w > 2) {
        fx.current.update(dt);
        if (fx.current.count > 0 || fxDirty.current) {
          fctx.clearRect(0, 0, fv.w, fv.h);
          fx.current.draw(fctx);
          fxDirty.current = fx.current.count > 0;
        }
      }
    },
  });

  // ── Prikaz ─────────────────────────────────────────────────────────────
  const q = questions[qi];
  const playedToday = !!status?.playedToday;
  const qLen = q ? q.pitanje.length : 0;
  const qSize = tiny
    ? qLen > 70
      ? "text-[15px]"
      : "text-[16.5px]"
    : compact
    ? qLen > 100
      ? "text-[16.5px]"
      : qLen > 70
        ? "text-[18px]"
        : "text-[19.5px]"
    : qLen > 100
      ? "text-[18.5px]"
      : qLen > 70
        ? "text-[20px]"
        : "text-[22px]";

  const answerState = (
    i: number,
  ): "idle" | "correct" | "wrong" | "dim" | "missed" => {
    if (!q || phase === "ask") return "idle";
    if (i === q.tocan) return picked === i ? "correct" : "missed";
    if (i === picked) return "wrong";
    return "dim";
  };

  const lastOutcome = phase === "reveal" ? answers[qi] : undefined;
  const ringSize = tiny ? 50 : compact ? 64 : 84;

  // Niski ekran: niz i odbrojavanje stanu u jedan redak ispod rezultata (bez dodatne kartice).
  const liveLine =
    mode === "official"
      ? `Niz ${status?.streak ?? 1} ${(status?.streak ?? 1) === 1 ? "dan" : "dana"} · novi kviz za ${countdown === null ? "--:--:--" : formatCountdown(countdown)}`
      : `Ne računa se${status?.todayRecord ? ` · službeno danas ${status.todayRecord.score}/${KVIZ_BROJ_PITANJA}` : ""}`;
  const shellResult = useMemo(
    () =>
      result
        ? { ...result, message: compact ? liveLine : result.message }
        : null,
    [result, compact, liveLine],
  );

  // Kad je nagrada uključena i osvojena, shell prikazuje karticu nagrade u zbijenom
  // rasporedu → bez dodatne kartice, da sve stane na ekran mobitela.
  const rewardShown =
    state === "result" &&
    mode === "official" &&
    !!result &&
    !!pickReward(result.score, { tiers: KVIZ_REWARD_TIERS });

  const hud = useMemo(
    () => (
      <>
        <HudStat
          label="Pitanje"
          value={`${Math.min(qi + 1, questions.length || KVIZ_BROJ_PITANJA)}/${questions.length || KVIZ_BROJ_PITANJA}`}
        />
        <HudStat
          label="Točno"
          value={answers.filter((a) => a === 1).length}
          accent
          bump={answers.filter((a) => a === 1).length}
        />
      </>
    ),
    [qi, questions.length, answers],
  );

  return (
    <>
      <GameShell
        gameId={KVIZ_GAME_ID}
        title="Kviz dana"
        kicker="Nogometni kviz"
        description={
          playedToday
            ? "Današnji kviz je odigran. Novi stiže u ponoć."
            : "Deset pitanja, isti kviz za sve. Prvi pokušaj dana je službeni."
        }
        bestKey={
          state !== "start" && mode === "practice"
            ? KVIZ_BEST_PRACTICE_KEY
            : KVIZ_BEST_KEY
        }
        state={state}
        onStart={start}
        onPause={mode === "practice" ? pause : undefined}
        onResume={resume}
        result={shellResult}
        hud={hud}
        scoreLabel={
          mode === "official" && day
            ? `točnih · ${formatDayShort(day)}`
            : "točnih"
        }
        rewardTiers={mode === "official" ? KVIZ_REWARD_TIERS : []}
        startExtra={
          <div className={status ? "" : "invisible"}>
            <StartPanel status={status} countdown={countdown} />
          </div>
        }
        resultExtra={
          compact || rewardShown ? undefined : (
            <ResultPanel
              mode={mode}
              status={status}
              answers={answers}
              countdown={countdown}
            />
          )
        }
        ctaLabel={playedToday ? "Vježbaj" : "Igraj"}
      >
        <canvas
          ref={back.canvasRef}
          aria-hidden
          className="absolute inset-0 h-full w-full"
        />

        <motion.div
          ref={uiRef}
          animate={shakeCtl}
          onPointerDown={onSkipTap}
          className={`absolute inset-0 flex flex-col px-4 pb-[max(14px,env(safe-area-inset-bottom))] ${tiny ? "pt-[64px]" : compact ? "pt-[68px]" : "pt-[76px]"} transition-opacity duration-300 ${state === "playing" || state === "paused" ? "opacity-100" : "pointer-events-none opacity-0"}`}
        >
          {/* napredak po pitanjima */}
          <div className="flex gap-1">
            {Array.from({ length: questions.length || KVIZ_BROJ_PITANJA }).map(
              (_, i) => {
                const a = answers[i];
                const cls =
                  a === 1
                    ? "bg-accent"
                    : a === 0
                      ? "bg-[#ff5a5f]/85"
                      : a === -1
                        ? "bg-white/30"
                        : i === qi
                          ? "bg-white/55"
                          : "bg-white/[0.1]";
                return (
                  <span
                    key={i}
                    className={`h-[3px] flex-1 rounded-full transition-colors duration-300 ${cls}`}
                  />
                );
              },
            )}
          </div>

          <AnimatePresence mode="wait" initial={false}>
            {q ? (
              <motion.div
                key={`${mode}-${qi}-${questions[0]?.index ?? 0}`}
                initial={{ opacity: 0, x: 26 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{
                  opacity: 0,
                  x: -26,
                  transition: { duration: 0.18, ease: "easeIn" },
                }}
                transition={{ duration: 0.38, ease: EASE }}
                className="flex min-h-0 flex-1 flex-col"
              >
                <div
                  className={`flex min-h-0 flex-1 flex-col items-center text-center ${tiny ? "gap-1.5 py-1.5" : compact ? "gap-2.5 py-2" : "gap-3.5 py-3"}`}
                >
                  {/* prsten */}
                  <div
                    ref={ringWrapRef}
                    className={`relative mt-auto shrink-0 ${low && phase === "ask" ? "kv-ring-low" : ""}`}
                    style={{
                      width: ringSize,
                      height: ringSize,
                      ["--ring" as string]: BRAND.accent,
                    }}
                  >
                    <svg
                      viewBox="0 0 100 100"
                      className="absolute inset-0 h-full w-full -rotate-90"
                    >
                      <circle
                        cx="50"
                        cy="50"
                        r={RING_R}
                        fill="rgba(0,0,0,0.35)"
                        stroke="rgba(255,255,255,0.09)"
                        strokeWidth="6"
                      />
                      <circle
                        ref={ringRef}
                        cx="50"
                        cy="50"
                        r={RING_R}
                        fill="none"
                        stroke={BRAND.accent}
                        strokeWidth="6"
                        strokeLinecap="round"
                        strokeDasharray={RING_C}
                        strokeDashoffset={0}
                        style={{
                          filter: "drop-shadow(0 0 6px var(--ring))",
                          transition:
                            phase === "reveal"
                              ? "stroke-dashoffset .35s cubic-bezier(.22,1,.36,1), stroke .2s"
                              : "none",
                        }}
                      />
                    </svg>
                    <div className="absolute inset-0 grid place-items-center">
                      <AnimatePresence mode="wait" initial={false}>
                        {phase === "reveal" ? (
                          <motion.span
                            key="icon"
                            initial={{ scale: 0.3, opacity: 0, rotate: -20 }}
                            animate={{ scale: 1, opacity: 1, rotate: 0 }}
                            transition={{
                              type: "spring",
                              stiffness: 520,
                              damping: 17,
                            }}
                            className={`grid place-items-center rounded-full ${lastOutcome === 1 ? "text-accent" : "text-[#ff5a5f]"}`}
                          >
                            {lastOutcome === 1 ? (
                              <Check
                                style={{
                                  width: ringSize * 0.42,
                                  height: ringSize * 0.42,
                                }}
                                strokeWidth={3}
                              />
                            ) : (
                              <X
                                style={{
                                  width: ringSize * 0.42,
                                  height: ringSize * 0.42,
                                }}
                                strokeWidth={3}
                              />
                            )}
                          </motion.span>
                        ) : (
                          <motion.span
                            key="sec"
                            ref={secRef}
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0, transition: { duration: 0.1 } }}
                            className={`translate-y-[2px] font-heading leading-none tabular-nums text-white ${tiny ? "text-[24px]" : compact ? "text-[30px]" : "text-[38px]"}`}
                          >
                            {KVIZ_SEKUNDI}
                          </motion.span>
                        )}
                      </AnimatePresence>
                    </div>
                  </div>

                  {/* kategorija / ishod + niz */}
                  <div className="flex h-6 items-center justify-center gap-2">
                    {mode === "practice" ? (
                      <span className="rounded-full border border-white/15 px-2 py-[3px] text-[10px] font-semibold uppercase tracking-[0.2em] text-white/60">
                        Vježba
                      </span>
                    ) : null}
                    <AnimatePresence mode="wait" initial={false}>
                      {phase === "reveal" ? (
                        <motion.span
                          key="out"
                          initial={{ opacity: 0, y: 6 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0 }}
                          transition={{ duration: 0.25, ease: EASE }}
                          className={`text-[11.5px] font-bold uppercase tracking-[0.26em] ${lastOutcome === 1 ? "text-accent" : lastOutcome === 0 ? "text-[#ff7a7e]" : "text-white/70"}`}
                        >
                          {lastOutcome === 1
                            ? "Točno"
                            : lastOutcome === 0
                              ? "Netočno"
                              : "Isteklo vrijeme"}
                        </motion.span>
                      ) : (
                        <motion.span
                          key="cat"
                          initial={{ opacity: 0, y: 6 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0 }}
                          transition={{ duration: 0.25, ease: EASE }}
                          className="text-[11px] font-semibold uppercase tracking-[0.26em] text-white/50"
                        >
                          {q.kategorija}
                        </motion.span>
                      )}
                    </AnimatePresence>
                    <AnimatePresence>
                      {streak >= 2 ? (
                        <motion.span
                          key={`st-${streak}`}
                          initial={{ scale: 0.5, opacity: 0 }}
                          animate={{ scale: 1, opacity: 1 }}
                          exit={{ scale: 0.6, opacity: 0 }}
                          transition={{
                            type: "spring",
                            stiffness: 520,
                            damping: 18,
                          }}
                          className="flex items-center gap-1 rounded-full bg-accent px-2 py-[3px] text-[11px] font-bold text-black"
                        >
                          <Flame className="h-3 w-3" strokeWidth={2.6} />
                          {streak} zaredom
                        </motion.span>
                      ) : null}
                    </AnimatePresence>
                  </div>

                  <p
                    role="heading"
                    aria-level={2}
                    className={`mb-auto max-w-[440px] text-balance font-semibold leading-[1.28] text-white ${qSize}`}
                  >
                    {q.pitanje}
                  </p>
                </div>

                <div
                  className={`grid shrink-0 ${tiny ? "gap-1.5" : compact ? "gap-[7px]" : "gap-2"}`}
                >
                  {q.odgovori.map((o, i) => (
                    <AnswerButton
                      key={i}
                      index={i}
                      text={o}
                      state={answerState(i)}
                      onPick={onPick}
                      compact={compact}
                      tiny={tiny}
                    />
                  ))}
                </div>
              </motion.div>
            ) : null}
          </AnimatePresence>
        </motion.div>

        {landscape && (state === "playing" || state === "paused") ? (
          <div className="absolute inset-0 z-[45] flex flex-col items-center bg-black/90 px-6 pt-[72px] text-center">
            <Smartphone
              className="h-9 w-9 text-accent"
              strokeWidth={1.8}
              style={{ animation: "kvRotate 1.6s ease-in-out infinite" }}
            />
            <div className="mt-3 font-heading text-[26px] uppercase leading-none text-white">
              Okreni mobitel uspravno
            </div>
            <p className="mt-1.5 text-[13px] text-white/55">
              Kviz se igra u uspravnom položaju.
            </p>
          </div>
        ) : null}

        <canvas
          ref={front.canvasRef}
          aria-hidden
          className="pointer-events-none absolute inset-0 h-full w-full"
        />

        <style>{`
        @keyframes kvRingLow{0%,100%{transform:scale(1)}50%{transform:scale(1.06)}}
        .kv-ring-low{animation:kvRingLow .5s ease-in-out infinite}
        @keyframes kvRotate{0%,25%{transform:rotate(90deg)}60%,100%{transform:rotate(0deg)}}
      `}</style>
      </GameShell>
      {state === "result" && questions.length ? (
        <AnswersReview
          mode={mode}
          answers={answers}
          questions={questions}
          picks={picks}
        />
      ) : null}
    </>
  );
}

export default KvizDana;
