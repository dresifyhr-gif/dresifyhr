"use client";

// 15 DO PEHARA — 15 pitanja zaredom, od lakih do ekspertnih (3 po težini).
// Jedan krivi odgovor = kraj. Sigurne stepenice nakon 5. ("Kvart") i 10.
// ("Prva liga"); 15. = "Svjetski prvak". Tri džokera po utakmici.
// Nema sata: napetost dolazi iz zaključavanja odgovora i pauze prije otkrivanja.

import { AnimatePresence, motion, useAnimationControls } from "framer-motion";
import {
  ArrowRight,
  Check,
  Layers,
  Lock,
  MessageCircle,
  RotateCcw,
  Share,
  ShieldCheck,
  Trophy,
  Users,
  X,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";

import { BRAND, createParticles, damp, rand } from "../draw";
import {
  GameStage,
  MuteButton,
  PrimaryButton,
  SecondaryButton,
  StartScreen,
  useBestScore,
  useCanvas,
  useFastTap,
  useGameLoop,
  type GameState,
} from "../game-shell";
import type { KvizPitanje } from "../kviz/daily";
import { TEZINE } from "../kviz/questions";
import { haptic, sfx, unlockAudio } from "../sfx";
import { shareFile, type ShareResult } from "../share-card";
import {
  LJESTVICA,
  PEHAR_BEST_KEY,
  PEHAR_BROJ,
  PEHAR_NAZIV,
  PEHAR_URL,
  sigurnaRazina,
  suspenseMs,
} from "./config";
import {
  crowdPoll,
  fiftyFifty,
  friendMessage,
  pickRun,
  readStats,
  recordStart,
  recordWin,
} from "./logic";
import { peharLine, preparePeharCard } from "./share";
import { zvuk } from "./zvuk";

const EASE = [0.22, 1, 0.36, 1] as const;
const RED = "#ff5a5f";
const LETTERS = ["A", "B", "C", "D"];

/** ladder = ljestvica između pitanja, ask = biranje, locked = napetost, reveal = otkriveno. */
type Phase = "ladder" | "ask" | "locked" | "reveal";
type Joker = "fifty" | "crowd" | "friend";

type RunResult = {
  correct: number;
  reached: number;
  won: boolean;
  safe: string | null;
  failed: KvizPitanje | null;
  picked: number | null;
};

type AnswerLook =
  | "idle"
  | "selected"
  | "locked"
  | "correct"
  | "wrong"
  | "missed"
  | "dim"
  | "removed";

// ── Mjerenje visine (zbijeni raspored na malim ekranima) ─────────────────
function useSize(ref: React.RefObject<HTMLElement>) {
  const [size, setSize] = useState({ w: 390, h: 700 });
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const fit = () => setSize({ w: el.clientWidth || 390, h: el.clientHeight || 700 });
    fit();
    if (typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(fit);
    ro.observe(el);
    return () => ro.disconnect();
  }, [ref]);
  return size;
}

// ── Gumb odgovora ────────────────────────────────────────────────────────
function AnswerButton({
  index,
  text,
  look,
  poll,
  pollTop,
  onPick,
  size,
}: {
  index: number;
  text: string;
  look: AnswerLook;
  poll: number | null;
  pollTop: boolean;
  onPick: (i: number) => void;
  size: 0 | 1 | 2;
}) {
  const fast = useFastTap(() => onPick(index));
  const removed = look === "removed";
  const h =
    size === 2 ? "min-h-[42px] py-1.5" : size === 1 ? "min-h-[48px] py-2" : "min-h-[54px] py-2.5";
  const tone =
    look === "correct"
      ? "border-accent bg-accent text-black shadow-[0_0_0_1px_rgba(232,255,60,0.6),0_10px_36px_rgba(232,255,60,0.35)]"
      : look === "wrong"
        ? "border-[#ff5a5f] bg-[#ff5a5f] text-white shadow-[0_10px_30px_rgba(255,90,95,0.3)]"
        : look === "locked"
          ? "border-white bg-white text-black ph-breathe"
          : look === "selected"
            ? "border-accent/90 bg-accent/[0.12] text-white shadow-[0_0_0_1px_rgba(232,255,60,0.35)]"
            : look === "missed"
              ? "border-accent bg-accent/[0.14] text-white ph-blink"
              : look === "dim"
                ? "border-white/[0.06] bg-white/[0.02] text-white/30"
                : removed
                  ? "border-dashed border-white/[0.08] bg-transparent text-transparent"
                  : "border-white/[0.11] bg-white/[0.045] text-white/95 active:bg-white/[0.09]";
  const badge =
    look === "correct"
      ? "bg-black/15 text-black"
      : look === "wrong"
        ? "bg-black/20 text-white"
        : look === "locked"
          ? "bg-black text-white"
          : look === "selected" || look === "missed"
            ? "bg-accent text-black"
            : look === "dim"
              ? "bg-white/[0.04] text-white/25"
              : "bg-white/[0.07] text-white/70";
  return (
    <motion.button
      type="button"
      data-answer={index}
      data-look={look}
      disabled={removed}
      {...(removed ? {} : fast)}
      initial={{ opacity: 0, y: 14 }}
      animate={
        look === "wrong"
          ? { opacity: 1, y: 0, x: [0, -8, 8, -5, 5, -2, 0], scale: 1, transition: { x: { duration: 0.42 } } }
          : look === "correct"
            ? { opacity: 1, y: 0, x: 0, scale: [1, 1.04, 1], transition: { scale: { duration: 0.42, ease: EASE } } }
            : removed
              ? { opacity: 0.6, y: 0, x: 0, scale: 0.97 }
              : { opacity: 1, y: 0, x: 0, scale: 1 }
      }
      transition={{ duration: 0.42, ease: EASE, delay: 0.32 + index * 0.06 }}
      whileTap={look === "idle" || look === "selected" ? { scale: 0.975 } : undefined}
      className={`relative flex w-full items-center gap-3 overflow-hidden rounded-[15px] border px-3.5 text-left transition-[background-color,border-color,color,box-shadow,opacity] duration-300 ${h} ${tone} ${look === "dim" ? "opacity-60" : ""}`}
    >
      {poll !== null && !removed ? (
        <motion.span
          aria-hidden
          initial={{ scaleX: 0 }}
          animate={{ scaleX: poll / 100 }}
          transition={{ duration: 1.1, ease: EASE, delay: 0.15 + index * 0.08 }}
          className={`absolute inset-y-0 left-0 w-full origin-left ${pollTop ? "bg-accent/[0.16]" : "bg-white/[0.07]"} ${look === "correct" || look === "locked" || look === "wrong" ? "opacity-0" : ""}`}
        />
      ) : null}
      <span
        className={`relative grid h-7 w-7 shrink-0 place-items-center rounded-[9px] font-heading text-[17px] leading-none transition-colors duration-300 ${removed ? "opacity-0" : ""} ${badge}`}
      >
        {look === "correct" || look === "missed" ? (
          <Check className="h-4 w-4" strokeWidth={3} />
        ) : look === "wrong" ? (
          <X className="h-4 w-4" strokeWidth={3} />
        ) : (
          <span className="translate-y-[1px]">{LETTERS[index]}</span>
        )}
      </span>
      <span
        className={`relative min-w-0 flex-1 font-semibold leading-[1.2] ${size === 2 ? "text-[14px]" : size === 1 ? "text-[15px]" : "text-[15.5px]"}`}
      >
        {removed ? "" : text}
      </span>
      {poll !== null && !removed ? (
        <motion.span
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.9 + index * 0.08 }}
          className={`relative shrink-0 font-heading text-[19px] leading-none tabular-nums ${look === "correct" || look === "locked" ? "text-black/70" : pollTop ? "text-accent" : "text-white/60"}`}
        >
          {poll}%
        </motion.span>
      ) : null}
    </motion.button>
  );
}

// ── Džoker ───────────────────────────────────────────────────────────────
function JokerButton({
  icon: Icon,
  label,
  used,
  disabled,
  onUse,
  href,
  compact,
}: {
  icon: LucideIcon;
  label: string;
  used: boolean;
  disabled: boolean;
  onUse: () => void;
  href?: string;
  compact: boolean;
}) {
  const fast = useFastTap(() => {
    if (!used && !disabled) onUse();
  });
  const cls = `group relative flex flex-1 items-center justify-center gap-1.5 overflow-hidden rounded-[12px] border font-semibold transition-[opacity,border-color,background-color] duration-300 ${compact ? "h-9 text-[12px]" : "h-10 text-[12.5px]"} ${
    used
      ? "border-white/[0.06] bg-transparent text-white/25"
      : disabled
        ? "border-white/[0.08] bg-white/[0.03] text-white/40"
        : "border-white/[0.14] bg-white/[0.05] text-white/90 active:bg-white/[0.1]"
  }`;
  const inner = (
    <>
      <Icon className={`h-[15px] w-[15px] shrink-0 ${used ? "" : "text-accent"}`} strokeWidth={2.2} />
      <span className="truncate">{label}</span>
      {used ? (
        <span aria-hidden className="absolute left-2 right-2 top-1/2 h-px -rotate-[8deg] bg-white/25" />
      ) : null}
    </>
  );
  if (href && !used && !disabled)
    return (
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        onClick={onUse}
        aria-label={label}
        className={cls}
      >
        {inner}
      </a>
    );
  return (
    <button type="button" {...fast} disabled={used || disabled} aria-label={label} className={cls}>
      {inner}
    </button>
  );
}

// ── Mala ljestvica uz pitanje ────────────────────────────────────────────
function MiniLadder({ step, phase, outcome }: { step: number; phase: Phase; outcome: 0 | 1 | null }) {
  return (
    <div className="flex h-full w-[30px] shrink-0 flex-col-reverse justify-between py-1" aria-hidden>
      {LJESTVICA.map((s, i) => {
        const cur = i === step;
        const passed = i < step;
        const w = 10 + i * 1.2;
        const color = cur
          ? phase === "reveal" && outcome === 0
            ? "bg-[#ff5a5f]"
            : "bg-accent shadow-[0_0_10px_rgba(232,255,60,0.7)]"
          : passed
            ? "bg-white/60"
            : s.sigurno
              ? "bg-white/25"
              : "bg-white/[0.1]";
        return (
          <div key={s.n} className="relative flex items-center justify-end">
            {cur ? (
              <motion.span
                layoutId="ph-mini-cur"
                className="absolute right-[28px] font-heading text-[13px] leading-none text-accent"
              >
                {s.n}
              </motion.span>
            ) : null}
            <span className={`block h-[3px] rounded-full transition-colors duration-500 ${color}`} style={{ width: w }} />
            {s.sigurno ? (
              <span className={`absolute -right-[1px] h-[7px] w-[2px] rounded-full ${passed ? "bg-accent" : "bg-white/30"}`} />
            ) : null}
          </div>
        );
      })}
    </div>
  );
}

// ── Velika ljestvica (između pitanja) ────────────────────────────────────
function LadderOverlay({
  step,
  fromStep,
  rowH,
  show,
  onSkip,
}: {
  step: number;
  fromStep: number;
  rowH: number;
  show: boolean;
  onSkip: () => void;
}) {
  const [at, setAt] = useState(fromStep);
  const st = LJESTVICA[step];
  const passedSafe = step > 0 && LJESTVICA[step - 1].sigurno ? LJESTVICA[step - 1] : null;
  useEffect(() => {
    const id = window.setTimeout(() => {
      setAt(step);
      zvuk.step(step);
      if (passedSafe) window.setTimeout(() => zvuk.checkpoint(), 120);
    }, fromStep === step ? 120 : 360);
    return () => window.clearTimeout(id);
  }, [step, fromStep, passedSafe]);
  const fast = useFastTap(onSkip);
  const big = rowH >= 25;
  return (
    <motion.div
      data-overlay-ladder={show ? "1" : "0"}
      {...fast}
      initial={{ opacity: 0 }}
      animate={{ opacity: show ? 1 : 0, transitionEnd: { visibility: show ? "visible" : "hidden" } }}
      transition={{ duration: show ? 0.3 : 0.25 }}
      style={{ visibility: "visible" }}
      className={`absolute inset-0 z-[25] flex flex-col items-center justify-center bg-black/[0.86] px-6 ${show ? "" : "pointer-events-none"}`}
    >
      <motion.div
        initial={{ y: 12, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.5, ease: EASE, delay: 0.05 }}
        className="mb-3 text-center"
      >
        <div className="text-[10.5px] font-semibold uppercase tracking-[0.3em] text-white/45">
          {TEZINE[st.tezina]}
        </div>
        <div className={`font-heading uppercase leading-[0.9] text-white ${big ? "text-[44px]" : "text-[34px]"}`}>
          {st.n}. pitanje
        </div>
        <AnimatePresence>
          {passedSafe ? (
            <motion.div
              initial={{ scale: 0.6, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: "spring", stiffness: 420, damping: 18, delay: 0.5 }}
              className="mx-auto mt-2 flex w-fit items-center gap-1.5 rounded-full bg-accent px-3 py-1 text-[11px] font-bold uppercase tracking-[0.18em] text-black"
            >
              <ShieldCheck className="h-[13px] w-[13px]" strokeWidth={2.6} />
              {passedSafe.ime} je tvoj
            </motion.div>
          ) : null}
        </AnimatePresence>
      </motion.div>
      <div className="w-full max-w-[300px]">
        {[...LJESTVICA].reverse().map((s) => {
          const i = s.n - 1;
          const cur = i === at;
          const passed = i < at;
          return (
            <div
              key={s.n}
              className="relative flex items-center gap-3 px-3"
              style={{ height: rowH }}
            >
              {cur ? (
                <motion.div
                  layoutId="ph-ladder-cur"
                  transition={{ type: "spring", stiffness: 260, damping: 26 }}
                  className="absolute inset-0 rounded-[9px] bg-accent shadow-[0_0_28px_rgba(232,255,60,0.45)]"
                />
              ) : null}
              <span
                className={`relative w-6 text-right font-heading leading-none tabular-nums ${big ? "text-[17px]" : "text-[15px]"} ${cur ? "text-black" : passed ? "text-accent/80" : s.sigurno ? "text-white/80" : "text-white/35"}`}
              >
                {s.n}
              </span>
              <span
                className={`relative flex-1 truncate font-semibold ${big ? "text-[13.5px]" : "text-[12px]"} ${cur ? "text-black" : passed ? "text-white/55" : s.sigurno ? "text-white" : "text-white/40"} ${s.sigurno ? "uppercase tracking-[0.12em]" : ""}`}
              >
                {s.ime}
              </span>
              {s.sigurno ? (
                <ShieldCheck
                  className={`relative h-[14px] w-[14px] ${cur ? "text-black" : passed ? "text-accent" : "text-white/45"}`}
                  strokeWidth={2.2}
                />
              ) : passed ? (
                <Check className="relative h-[13px] w-[13px] text-accent/70" strokeWidth={3} />
              ) : null}
            </div>
          );
        })}
      </div>
    </motion.div>
  );
}

// ── Rezultat ─────────────────────────────────────────────────────────────
const BROJ = ["", "jedno", "dva", "tri", "četiri", "pet"];
/** "Još dva točna i Kvart je tvoj" — sljedeći cilj nakon poraza, prirodnim brojevima. */
function lossLine(correct: number, safe: string | null) {
  const next = LJESTVICA.find((s) => s.sigurno && s.n > correct);
  if (!next) return "Pao si na zadnjoj stepenici.";
  const left = next.n - correct;
  const n = BROJ[left] ?? String(left);
  const goal = next.n === PEHAR_BROJ ? "pehara" : next.ime === "Kvart" ? "Kvarta" : "Prve lige";
  const falilo =
    left === 1
      ? `Do ${goal} je falilo još jedno pitanje.`
      : left < 5
        ? `Do ${goal} su falila još ${n} pitanja.`
        : `Do ${goal} je falilo još ${n} pitanja.`;
  if (safe) return `${safe} ti ostaje. ${falilo}`;
  if (correct === 0) return "Prvo pitanje zna prevariti. Revanš je odmah.";
  return falilo;
}

function ResultView({
  res,
  best,
  first,
  record,
  tie,
  onRestart,
}: {
  res: RunResult;
  best: number | null;
  first: boolean;
  record: boolean;
  tie: boolean;
  onRestart: () => void;
}) {
  const outerRef = useRef<HTMLDivElement>(null);
  const innerRef = useRef<HTMLDivElement>(null);
  const [d, setD] = useState(0);
  // Brojač: veliki broj raste zajedno sa stepenicama koje se pune (tihi tonovi).
  const [shown, setShown] = useState(1);
  const tallyEnd = 250 + Math.max(0, res.reached - 1) * 45;
  useEffect(() => {
    const ids: number[] = [];
    const top = res.won ? PEHAR_BROJ : res.reached;
    for (let k = 1; k <= top; k++)
      ids.push(
        window.setTimeout(() => {
          setShown(k);
          zvuk.tally(k - 1);
        }, 250 + (k - 1) * 45),
      );
    return () => ids.forEach((id) => window.clearTimeout(id));
  }, [res.reached, res.won]);
  useLayoutEffect(() => {
    const o = outerRef.current;
    const i = innerRef.current;
    if (!o || !i) return;
    const check = () => {
      if (o.clientHeight < 240) return;
      const cs = getComputedStyle(o);
      const avail = o.clientHeight - (parseFloat(cs.paddingTop) || 0) - (parseFloat(cs.paddingBottom) || 0);
      if (i.offsetHeight > avail + 1) setD(Math.min(4, d + 1));
    };
    check();
    if (typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(check);
    ro.observe(o);
    ro.observe(i);
    return () => ro.disconnect();
  }, [d]);

  const [shareState, setShareState] = useState<ShareResult | "busy" | null>(null);
  const fileRef = useRef<File | null>(null);
  const fileP = useRef<Promise<File> | null>(null);
  const shareData = useMemo(
    () => ({ reached: res.reached, correct: res.correct, safe: res.safe, won: res.won }),
    [res],
  );
  useEffect(() => {
    const p = preparePeharCard(shareData);
    fileP.current = p;
    p.then((f) => {
      if (fileP.current === p) fileRef.current = f;
    }).catch(() => {});
  }, [shareData]);
  const share = async () => {
    unlockAudio();
    setShareState("busy");
    let r: ShareResult;
    try {
      const f = fileRef.current ?? (await (fileP.current ?? preparePeharCard(shareData)));
      r = await shareFile(f, `DRESIFY · ${PEHAR_NAZIV}`);
    } catch {
      r = "failed";
    }
    setShareState(r);
    window.setTimeout(() => setShareState(null), 2200);
  };
  const shareLabel =
    shareState === "downloaded"
      ? "Spremljeno"
      : shareState === "shared"
        ? "Podijeljeno"
        : shareState === "failed"
          ? "Nije uspjelo"
          : "Podijeli";

  const line = res.won ? "Svih 15 točno. Pehar ide doma." : lossLine(res.correct, res.safe);
  const fellAt = LJESTVICA[Math.min(PEHAR_BROJ, Math.max(1, res.reached)) - 1];

  const recordEl =
    record ? (
      <span className="g2-shine flex items-center gap-1.5 rounded-full bg-accent px-3 py-1 text-[11px] font-bold uppercase tracking-[0.18em] text-black">
        <Trophy className="h-[12px] w-[12px]" strokeWidth={2.5} /> Najdalje do sad
      </span>
    ) : first ? (
      <span className="flex items-center gap-1.5 rounded-full border border-accent/35 bg-accent/[0.08] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-accent">
        <Trophy className="h-[12px] w-[12px]" strokeWidth={2.2} /> Tvoj prvi rekord
      </span>
    ) : best !== null ? (
      <span className="flex items-center gap-1.5 text-[12.5px] text-white/50">
        <Trophy className="h-[12px] w-[12px] text-accent/70" />
        {tie ? "Izjednačen rekord:" : "Rekord:"}{" "}
        <b className="font-semibold text-white/85">{best}. pitanje</b>
      </span>
    ) : null;

  const failed = res.failed;
  return (
    <motion.div
      ref={outerRef}
      data-overlay="result"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, transition: { duration: 0.2 } }}
      transition={{ duration: 0.4 }}
      className={`absolute inset-0 z-30 flex flex-col overflow-y-auto overscroll-contain bg-gradient-to-b from-black/60 via-black/[0.86] to-black/95 pb-3 ${d >= 1 ? "pt-12" : "pt-14"}`}
    >
      <div className="absolute right-[max(14px,env(safe-area-inset-right))] top-3 z-[3]">
        <MuteButton />
      </div>
      <div
        ref={innerRef}
        className="relative z-[2] mx-auto mt-auto w-full max-w-[400px] px-5"
      >
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: EASE }}
          className="text-center"
        >
          <div className="text-[10.5px] font-semibold uppercase tracking-[0.3em] text-white/45">
            {res.won ? "Pehar je tvoj" : "Kraj utakmice"}
          </div>
          {res.won ? (
            <motion.div
              initial={{ scale: 0.4, opacity: 0, rotate: -12 }}
              animate={{ scale: 1, opacity: 1, rotate: 0 }}
              transition={{ type: "spring", stiffness: 220, damping: 14, delay: 0.1 }}
              className={`mx-auto grid place-items-center rounded-full bg-accent/[0.1] ${d >= 1 ? "mt-2 h-[84px] w-[84px]" : "mt-3 h-[112px] w-[112px]"}`}
            >
              <Trophy className={`text-accent ${d >= 1 ? "h-11 w-11" : "h-14 w-14"}`} strokeWidth={1.6} />
            </motion.div>
          ) : (
            <motion.div
              initial={{ scale: 0.6, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: "spring", stiffness: 260, damping: 20, delay: 0.05 }}
              className={`font-heading leading-[0.82] tabular-nums text-accent [text-shadow:0_0_48px_rgba(232,255,60,0.35)] ${d >= 2 ? "mt-1 text-[clamp(3.6rem,17vw,4.6rem)]" : d === 1 ? "mt-1.5 text-[clamp(4.2rem,21vw,6rem)]" : "mt-2 text-[clamp(5rem,26vw,7.5rem)]"}`}
            >
              {shown}.
            </motion.div>
          )}
          <div className={`${d >= 1 ? "mt-1" : "mt-1.5"} text-[12px] font-semibold uppercase tracking-[0.28em] text-white/70`}>
            {res.won ? "Svjetski prvak" : `pitanje · ${fellAt.ime}`}
          </div>
          {d >= 2 && failed ? null : (
            <p className={`${d >= 1 ? "mt-1.5" : "mt-2"} text-[14px] leading-snug text-white/65`}>{line}</p>
          )}
          <div className={`items-center justify-center ${d === 3 && failed ? "hidden" : "flex"} ${d >= 2 ? "mt-1 h-7" : d >= 1 ? "mt-1.5 h-7" : "mt-2.5 h-8"}`}>
            <motion.div initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: tallyEnd / 1000 + 0.2, type: "spring", stiffness: 380, damping: 20 }}>
              {recordEl}
            </motion.div>
          </div>
        </motion.div>

        {/* ljestvica: dokle si stigao */}
        <div className={`flex items-end justify-center gap-[3px] ${d >= 2 ? "mt-1.5 h-[22px]" : d >= 1 ? "mt-2 h-[30px]" : "mt-3 h-[38px]"}`} aria-hidden>
          {LJESTVICA.map((s, i) => {
            const passed = s.n <= res.correct;
            const fail = !res.won && s.n === res.reached;
            return (
              <motion.span
                key={s.n}
                initial={{ scaleY: 0 }}
                animate={{ scaleY: 1 }}
                transition={{ duration: 0.4, ease: EASE, delay: 0.25 + i * 0.045 }}
                className={`block w-full max-w-[18px] origin-bottom rounded-[3px] ${passed ? "bg-accent" : fail ? "bg-[#ff5a5f]" : "bg-white/[0.1]"} ${s.sigurno ? "ring-1 ring-white/50" : ""}`}
                style={{ height: `${34 + i * 4.7}%` }}
              />
            );
          })}
        </div>

        {failed && d < 4 ? (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, ease: EASE, delay: 0.3 }}
            className={`rounded-[14px] border border-white/10 bg-white/[0.035] px-3.5 text-[13px] leading-snug ${d >= 2 ? "mt-2 py-2" : d >= 1 ? "mt-2.5 py-2.5" : "mt-4 py-2.5"}`}
          >
            <div className="text-[10px] font-semibold uppercase tracking-[0.2em] text-white/40">
              {res.reached}. pitanje · {failed.kategorija}
            </div>
            <div className={`mt-0.5 text-white/80 ${d >= 1 ? "line-clamp-2" : ""}`}>{failed.pitanje}</div>
            <div className="mt-1 flex flex-wrap items-baseline gap-x-2">
              <span className="font-semibold text-accent">{failed.tocno}</span>
              {res.picked !== null ? (
                <span className="text-white/35 line-through decoration-white/30">{failed.odgovori[res.picked]}</span>
              ) : null}
            </div>
          </motion.div>
        ) : null}

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, ease: EASE, delay: 0.2 }}
          className={d >= 2 ? "mt-2.5" : d >= 1 ? "mt-3" : "mt-5"}
        >
          <PrimaryButton onClick={onRestart} icon={RotateCcw} className={d >= 2 ? "!h-[52px] !text-[24px]" : ""}>
            Nova utakmica
          </PrimaryButton>
          <div className="mt-2 grid grid-cols-2 gap-2">
            <SecondaryButton
              onClick={share}
              icon={shareState === "shared" || shareState === "downloaded" ? Check : Share}
              disabled={shareState === "busy"}
              className="!h-[46px]"
            >
              {shareLabel}
            </SecondaryButton>
            <Link
              href="/dresovi"
              className="flex h-[46px] w-full items-center justify-center gap-1.5 rounded-[14px] border border-white/15 bg-white/[0.04] text-[15px] font-semibold text-white transition-colors active:bg-white/[0.08]"
            >
              Dresovi <ArrowRight className="h-[15px] w-[15px]" />
            </Link>
          </div>
        </motion.div>
      </div>
    </motion.div>
  );
}

// ── Startni dodatak ──────────────────────────────────────────────────────
function StartExtra({ pehari, igre, small }: { pehari: number; igre: number; small: boolean }) {
  const marks: [number, string][] = [
    [5, "Kvart"],
    [10, "Prva liga"],
    [15, "Svjetski prvak"],
  ];
  return (
    <div className={`rounded-[16px] border border-white/10 bg-white/[0.035] px-4 ${small ? "pb-2 pt-2" : "pb-3 pt-3"}`}>
      <div className={`items-center justify-between gap-2 ${small ? "hidden" : "flex"}`}>
        <span className="text-[10.5px] font-semibold uppercase tracking-[0.24em] text-white/45">
          Ljestvica
        </span>
        {igre > 0 ? (
          <span className="flex items-center gap-1 text-[11.5px] font-semibold text-white/55">
            <Trophy className="h-[12px] w-[12px] text-accent" strokeWidth={2.4} />
            {pehari > 0 ? `Pehara: ${pehari}` : `Utakmica: ${igre}`}
          </span>
        ) : null}
      </div>
      <div className={`flex items-end gap-[3px] ${small ? "" : "mt-2.5"}`} aria-hidden>
        {LJESTVICA.map((s, i) => {
          const last = i === LJESTVICA.length - 1;
          const h = small ? 4 + i * 0.6 : last ? 36 : 8 + i * 1.6;
          return (
            <motion.span
              key={s.n}
              initial={{ scaleY: 0, opacity: 0 }}
              animate={{ scaleY: 1, opacity: 1 }}
              transition={
                last
                  ? { type: "spring", stiffness: 420, damping: 16, delay: 0.45 + i * 0.035 }
                  : { duration: 0.45, ease: EASE, delay: 0.4 + i * 0.035 }
              }
              className={`relative block flex-1 origin-bottom overflow-hidden rounded-[3px] ${s.sigurno ? "bg-accent" : "bg-white/[0.14]"} ${last && !small ? "shadow-[0_0_18px_rgba(232,255,60,0.45)]" : ""}`}
              style={{ height: h }}
            >
              {/* svjetlo koje povremeno protrči ljestvicom do pehara */}
              <span
                className="ph-run absolute inset-0 bg-white"
                style={{ animationDelay: `${1.6 + i * 0.055}s` }}
              />
              {last && !small ? (
                <Trophy className="absolute left-1/2 top-[5px] h-[13px] w-[13px] -translate-x-1/2 text-black" strokeWidth={2.4} />
              ) : null}
            </motion.span>
          );
        })}
      </div>
      <div className="mt-2 flex items-baseline justify-between gap-2 whitespace-nowrap text-[11px] leading-tight">
        {marks.map(([n, ime]) => (
          <div key={n}>
            <span className="font-heading text-[16px] leading-none text-white">{n}.</span>{" "}
            <span className="text-white/55">{ime}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Igra ─────────────────────────────────────────────────────────────────
export function PeharIgra() {
  const [state, setState] = useState<GameState>("start");
  const [qs, setQs] = useState<KvizPitanje[]>([]);
  const [step, setStep] = useState(0);
  const [fromStep, setFromStep] = useState(0);
  const [phase, setPhase] = useState<Phase>("ladder");
  const [sel, setSel] = useState<number | null>(null);
  const [outcome, setOutcome] = useState<0 | 1 | null>(null);
  const [removed, setRemoved] = useState<number[]>([]);
  const [poll, setPoll] = useState<number[] | null>(null);
  const [used, setUsed] = useState<Record<Joker, boolean>>({ fifty: false, crowd: false, friend: false });
  const [friendNote, setFriendNote] = useState(false);
  const [res, setRes] = useState<RunResult | null>(null);
  const [rec, setRec] = useState({ first: false, record: false, tie: false, best: null as number | null });
  const [stats, setStats] = useState({ pehari: 0, igre: 0 });
  const { best, submit } = useBestScore(PEHAR_BEST_KEY);

  const uiRef = useRef<HTMLDivElement>(null);
  const { w: stageW, h: stageH } = useSize(uiRef);
  const narrow = stageW < 360;
  const size: 0 | 1 | 2 = stageH < 520 ? 2 : stageH < 620 ? 1 : 0;
  const shake = useAnimationControls();

  const timers = useRef<number[]>([]);
  const later = (fn: () => void, ms: number) => {
    timers.current.push(window.setTimeout(fn, ms));
  };
  const clearTimers = () => {
    timers.current.forEach((t) => window.clearTimeout(t));
    timers.current = [];
  };
  useEffect(() => clearTimers, []);
  const stopSuspense = useRef<() => void>(() => {});

  const g = useRef({ phase: "ladder" as Phase, step: 0, sel: null as number | null, qs: [] as KvizPitanje[], acceptAt: 0 });
  g.current.phase = phase;
  g.current.step = step;
  g.current.sel = sel;
  g.current.qs = qs;

  useEffect(() => {
    const s = readStats();
    setStats({ pehari: s.pehari, igre: s.igre });
  }, []);

  // ── Svjetla (canvas) ───────────────────────────────────────────────────
  const back = useCanvas();
  const front = useCanvas({ opaque: false });
  const fx = useRef(createParticles(260));
  const fxDirty = useRef(false);
  const light = useRef({ v: 1, target: 1, flash: 0, flashColor: BRAND.accentRgb as string, spotX: 0.5, spotY: 0.7, spot: 0, spotTarget: 0, sweep: 0, push: false, zoom: 1, zoomV: 0 });
  const motes = useRef<{ x: number; y: number; r: number; a: number; s: number; p: number }[]>([]);
  const beamCache = useRef<{ c: HTMLCanvasElement; w: number; h: number } | null>(null);

  useEffect(() => {
    const L = light.current;
    if (state !== "playing") {
      L.target = 1;
      L.spotTarget = 0;
      return;
    }
    L.target = phase === "locked" ? 0.28 : phase === "ladder" ? 0.55 : 1;
    L.spotTarget = phase === "locked" ? 1 : 0;
    // Kamera se polako primiče dok traje napetost, a na presudi se vrati s mekim odskokom.
    L.push = phase === "locked";
  }, [phase, state]);

  const paintBeams = (w: number, h: number, dpr: number) => {
    const c = document.createElement("canvas");
    c.width = Math.max(1, Math.round(w * dpr));
    c.height = Math.max(1, Math.round(h * dpr));
    const ctx = c.getContext("2d")!;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.globalCompositeOperation = "lighter";
    for (const side of [-1, 1]) {
      const x0 = w / 2 + side * w * 0.62;
      const y0 = -h * 0.06;
      const gr = ctx.createLinearGradient(x0, y0, w / 2, h * 0.9);
      gr.addColorStop(0, "rgba(255,255,236,0.20)");
      gr.addColorStop(0.45, "rgba(255,255,236,0.05)");
      gr.addColorStop(1, "rgba(255,255,236,0)");
      ctx.fillStyle = gr;
      ctx.beginPath();
      ctx.moveTo(x0 - side * 8, y0);
      ctx.lineTo(x0 + side * 8, y0);
      ctx.lineTo(w / 2 + side * w * 0.05, h * 0.95);
      ctx.lineTo(w / 2 - side * w * 0.42, h * 0.95);
      ctx.closePath();
      ctx.fill();
      // izvor svjetla
      const src = ctx.createRadialGradient(x0, y0 + 6, 0, x0, y0 + 6, w * 0.28);
      src.addColorStop(0, "rgba(255,255,240,0.55)");
      src.addColorStop(0.2, "rgba(255,255,240,0.12)");
      src.addColorStop(1, "rgba(0,0,0,0)");
      ctx.fillStyle = src;
      ctx.fillRect(x0 - w * 0.3, y0 - w * 0.3, w * 0.6, w * 0.6);
    }
    // pod: svjetla mrlja ispod odgovora
    ctx.globalCompositeOperation = "source-over";
    const fl = ctx.createRadialGradient(w / 2, h * 0.86, 0, w / 2, h * 0.86, w * 0.75);
    fl.addColorStop(0, `rgba(${BRAND.accentRgb},0.07)`);
    fl.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = fl;
    ctx.fillRect(0, 0, w, h);
    return c;
  };

  useGameLoop({
    running: false,
    update: () => {},
    render: ({ dt, time }) => {
      const v = back.view.current;
      const ctx = v.ctx;
      const L = light.current;
      L.v = damp(L.v, L.target, L.target < L.v ? 3.2 : 5, dt);
      L.spot = damp(L.spot, L.spotTarget, 4, dt);
      L.flash = damp(L.flash, 0, 2.6, dt);
      if (L.push) {
        L.zoom = Math.min(1.085, L.zoom + dt * 0.034);
        L.zoomV = 0;
      } else if (Math.abs(L.zoom - 1) > 0.0004 || Math.abs(L.zoomV) > 0.001) {
        // podkritična opruga: brzi povratak s malim prebačajem (osjećaj "reza" kamere)
        const dtc = Math.min(dt, 1 / 30);
        L.zoomV += (170 * (1 - L.zoom) - 11 * L.zoomV) * dtc;
        L.zoom += L.zoomV * dtc;
      } else {
        L.zoom = 1;
        L.zoomV = 0;
      }
      if (ctx && v.w > 2) {
        const { w, h } = v;
        if (!beamCache.current || beamCache.current.w !== w || beamCache.current.h !== h) {
          beamCache.current = { c: paintBeams(w, h, v.dpr), w, h };
          motes.current = Array.from({ length: 34 }, () => ({
            x: rand(0, w),
            y: rand(0, h),
            r: rand(0.5, 1.6),
            a: rand(0.05, 0.25),
            s: rand(5, 14),
            p: rand(0, 6.28),
          }));
        }
        const bgG = ctx.createLinearGradient(0, 0, 0, h);
        bgG.addColorStop(0, "#0d0e0b");
        bgG.addColorStop(1, "#050505");
        ctx.fillStyle = bgG;
        ctx.fillRect(0, 0, w, h);
        const zoomed = L.zoom !== 1;
        if (zoomed) {
          const cx = L.spotX * w;
          const cy = L.spotY * h;
          ctx.save();
          ctx.translate(cx, cy);
          ctx.scale(L.zoom, L.zoom);
          ctx.translate(-cx, -cy);
        }
        // reflektori dišu, a pri zaključavanju se ugase
        const flick = 0.94 + 0.06 * Math.sin(time * 1.7);
        ctx.globalAlpha = Math.max(0, L.v * flick);
        ctx.drawImage(beamCache.current.c, 0, 0, w, h);
        ctx.globalAlpha = 1;
        // reflektor na odabranom odgovoru
        if (L.spot > 0.01) {
          const sx = L.spotX * w;
          const sy = L.spotY * h;
          const sg = ctx.createRadialGradient(sx, sy, 0, sx, sy, w * 0.7);
          sg.addColorStop(0, `rgba(255,255,240,${0.13 * L.spot})`);
          sg.addColorStop(1, "rgba(0,0,0,0)");
          ctx.fillStyle = sg;
          ctx.fillRect(0, 0, w, h);
        }
        if (L.flash > 0.01) {
          const fg = ctx.createRadialGradient(w / 2, h * 0.55, 0, w / 2, h * 0.55, Math.max(w, h) * 0.8);
          fg.addColorStop(0, `rgba(${L.flashColor},${0.28 * L.flash})`);
          fg.addColorStop(1, "rgba(0,0,0,0)");
          ctx.fillStyle = fg;
          ctx.fillRect(0, 0, w, h);
        }
        // prašina u snopovima
        ctx.fillStyle = "#fff";
        for (const m of motes.current) {
          m.y -= m.s * dt;
          if (m.y < -4) {
            m.y = h + 4;
            m.x = rand(0, w);
          }
          ctx.globalAlpha = m.a * (0.45 + 0.55 * L.v) * (0.6 + 0.4 * Math.sin(time * 1.2 + m.p));
          ctx.beginPath();
          ctx.arc(m.x + Math.sin(time * 0.5 + m.p) * 5, m.y, m.r, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.globalAlpha = 1;
        if (zoomed) ctx.restore();
        // vinjeta (jača kad je mrak)
        const vg = ctx.createRadialGradient(w / 2, h * 0.5, Math.min(w, h) * 0.25, w / 2, h * 0.5, Math.max(w, h) * 0.78);
        vg.addColorStop(0, "rgba(0,0,0,0)");
        vg.addColorStop(1, `rgba(0,0,0,${0.5 + (1 - L.v) * 0.35})`);
        ctx.fillStyle = vg;
        ctx.fillRect(0, 0, w, h);
      }
      const fv = front.view.current;
      if (fv.ctx && fv.w > 2) {
        fx.current.update(dt);
        if (fx.current.count > 0 || fxDirty.current) {
          fv.ctx.clearRect(0, 0, fv.w, fv.h);
          fx.current.draw(fv.ctx);
          fxDirty.current = fx.current.count > 0;
        }
      }
    },
  });

  // ── Tijek ──────────────────────────────────────────────────────────────
  const goAsk = useCallback(() => {
    clearTimers();
    if (g.current.phase !== "ladder") return;
    g.current.acceptAt = performance.now() + 380;
    setPhase("ask");
    zvuk.questionIn(g.current.step);
  }, []);

  const showLadder = useCallback(
    (to: number, from: number) => {
      setFromStep(from);
      setStep(to);
      setSel(null);
      setOutcome(null);
      setRemoved([]);
      setPoll(null);
      setFriendNote(false);
      setPhase("ladder");
      g.current.phase = "ladder";
      g.current.step = to;
      const passedSafe = to > 0 && LJESTVICA[to - 1].sigurno;
      later(goAsk, to === 0 ? 1350 : passedSafe ? 2300 : 1500);
    },
    [goAsk],
  );

  const finish = useCallback(
    (r: RunResult) => {
      clearTimers();
      const sub = submit(r.reached);
      setRec({ first: sub.first, record: sub.record, tie: sub.tie, best: sub.best });
      if (r.won) recordWin();
      const s = readStats();
      setStats({ pehari: s.pehari, igre: s.igre });
      setRes(r);
      setState("result");
    },
    [submit],
  );

  const start = useCallback(() => {
    unlockAudio();
    zvuk.unlock();
    clearTimers();
    stopSuspense.current();
    const run = pickRun();
    recordStart(run.map((q) => q.index));
    setQs(run);
    g.current.qs = run;
    setUsed({ fifty: false, crowd: false, friend: false });
    setRes(null);
    fx.current.clear();
    fxDirty.current = true;
    // Poravnaj okvir ispod zaglavlja prije zaključavanja scrolla.
    const el = uiRef.current?.closest(".g2-stage") as HTMLElement | null;
    if (el && !el.dataset.land) {
      const r = el.getBoundingClientRect();
      const header = window.innerWidth >= 768 ? 92 : 60;
      if (Math.abs(r.top - header) > 2 && (r.top < header || r.bottom > window.innerHeight))
        window.scrollTo({ top: Math.max(0, window.scrollY + r.top - header), behavior: "auto" });
    }
    setState("playing");
    sfx.whistle();
    showLadder(0, 0);
  }, [showLadder]);

  const pick = useCallback((i: number) => {
    const s = g.current;
    if (s.phase !== "ask" || performance.now() < s.acceptAt) return;
    zvuk.unlock();
    setSel((prev) => (prev === i ? prev : i));
    zvuk.select();
    haptic(8);
  }, []);

  const revealRef = useRef<() => void>(() => {});
  const reveal = useCallback(() => {
    const s = g.current;
    const q = s.qs[s.step];
    const choice = s.sel;
    if (!q || choice === null || s.phase !== "locked") return;
    // Skrivena kartica: presuda čeka da se igrač vrati (ne propušta trenutak).
    if (document.visibilityState === "hidden") {
      const back = () => {
        if (document.visibilityState === "hidden") return;
        document.removeEventListener("visibilitychange", back);
        later(() => revealRef.current(), 450);
      };
      document.addEventListener("visibilitychange", back);
      return;
    }
    stopSuspense.current();
    const ok = choice === q.tocan;
    setOutcome(ok ? 1 : 0);
    setPhase("reveal");
    g.current.phase = "reveal";
    const L = light.current;
    L.flash = 1;
    L.flashColor = ok ? BRAND.accentRgb : "255,90,95";
    const stage = uiRef.current?.getBoundingClientRect();
    const el = uiRef.current?.querySelector(`[data-answer="${q.tocan}"]`) as HTMLElement | null;
    const r = el?.getBoundingClientRect();
    if (ok) {
      zvuk.correct(s.step);
      haptic(18);
      if (stage && r) {
        const px = r.left - stage.left + r.width / 2;
        const py = r.top - stage.top + r.height / 2;
        fx.current.burst(px, py, { count: 30, colors: [BRAND.accent, "#ffffff", BRAND.accent], speed: [160, 520], gravity: 380, drag: 2.4, life: [0.5, 1], size: [1.6, 3.8], shape: "spark" });
        fx.current.burst(px, py, { count: 14, colors: [BRAND.accent, "#f5ffb0"], speed: [60, 240], gravity: 260, drag: 2, life: [0.5, 1.1], size: [2, 4.2] });
        fxDirty.current = true;
      }
      if (s.step + 1 >= PEHAR_BROJ) {
        // Pehar!
        later(() => {
          zvuk.champion();
          sfx.crowd(1, 3.4);
          const fv = front.view.current;
          const w = fv.w || 390;
          const h = fv.h || 700;
          const cols = [BRAND.accent, "#ffffff", BRAND.accent, "#c9e01f"];
          fx.current.burst(w * 0.15, h * 0.45, { count: 80, colors: cols, angle: -Math.PI / 2 + 0.5, spread: 1.3, speed: [320, 820], gravity: 900, drag: 1.5, life: [1.4, 2.4], size: [3, 6], shape: "confetti" });
          fx.current.burst(w * 0.85, h * 0.45, { count: 80, colors: cols, angle: -Math.PI / 2 - 0.5, spread: 1.3, speed: [320, 820], gravity: 900, drag: 1.5, life: [1.4, 2.4], size: [3, 6], shape: "confetti" });
          fxDirty.current = true;
        }, 500);
        later(() => finish({ correct: PEHAR_BROJ, reached: PEHAR_BROJ, won: true, safe: "Svjetski prvak", failed: null, picked: null }), 2600);
      } else {
        later(() => showLadder(s.step + 1, s.step), 1350);
      }
    } else {
      zvuk.wrong();
      sfx.crowd(0.35, 1.6);
      haptic(40);
      shake.start({ x: [0, -7, 7, -4, 4, -1, 0], transition: { duration: 0.42, ease: "easeOut" } });
      const correct = s.step;
      const safe = sigurnaRazina(correct);
      later(
        () =>
          finish({
            correct,
            reached: correct + 1,
            won: false,
            safe: safe?.ime ?? null,
            failed: q,
            picked: choice,
          }),
        2500,
      );
    }
  }, [finish, showLadder, shake, front.view]);
  revealRef.current = reveal;

  const lockIn = useCallback(() => {
    const s = g.current;
    if (s.phase !== "ask" || s.sel === null) return;
    zvuk.unlock();
    setPhase("locked");
    g.current.phase = "locked";
    zvuk.lock();
    haptic(20);
    // reflektor na odabrani odgovor
    const stage = uiRef.current?.getBoundingClientRect();
    const el = uiRef.current?.querySelector(`[data-answer="${s.sel}"]`) as HTMLElement | null;
    const r = el?.getBoundingClientRect();
    if (stage && r) {
      light.current.spotX = (r.left - stage.left + r.width / 2) / stage.width;
      light.current.spotY = (r.top - stage.top + r.height / 2) / stage.height;
    }
    const ms = suspenseMs(s.step + 1);
    later(() => {
      stopSuspense.current = zvuk.suspense(ms / 1000 - 0.15);
    }, 260);
    later(reveal, 260 + ms);
  }, [reveal]);

  // ── Džokeri ────────────────────────────────────────────────────────────
  const q = qs[step];
  const useFifty = useCallback(() => {
    const cur = g.current.qs[g.current.step];
    if (!cur || g.current.phase !== "ask") return;
    const cut = fiftyFifty(cur);
    setUsed((u) => ({ ...u, fifty: true }));
    zvuk.joker();
    later(() => zvuk.cut(), 180);
    setRemoved(cut);
    setSel((s) => (s !== null && cut.includes(s) ? null : s));
    // Tribina je već glasala: makni glasove s uklonjenih odgovora i preračunaj.
    setPoll((p) => {
      if (!p) return p;
      const kept = p.map((v, i) => (cut.includes(i) ? 0 : v));
      const sum = kept.reduce((a, b) => a + b, 0) || 1;
      const pct = kept.map((v) => Math.round((v / sum) * 100));
      const fix = 100 - pct.reduce((a, b) => a + b, 0);
      const top = pct.indexOf(Math.max(...pct));
      pct[top] += fix;
      return pct;
    });
  }, []);
  const useCrowd = useCallback(() => {
    const cur = g.current.qs[g.current.step];
    if (!cur || g.current.phase !== "ask") return;
    setUsed((u) => ({ ...u, crowd: true }));
    zvuk.joker();
    sfx.crowd(0.45, 2);
    setPoll(crowdPoll(cur, removed));
  }, [removed]);
  const useFriend = useCallback(() => {
    if (g.current.phase !== "ask") return;
    setUsed((u) => ({ ...u, friend: true }));
    setFriendNote(true);
    zvuk.joker();
  }, []);
  const friendHref = useMemo(
    () => (q ? `https://wa.me/?text=${encodeURIComponent(friendMessage(q, removed, step + 1, PEHAR_URL))}` : undefined),
    [q, removed, step],
  );

  // Tipkovnica (desktop): 1–4 / A–D bira, Enter zaključava.
  useEffect(() => {
    if (state !== "playing") return;
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const k = e.key.toLowerCase();
      const map: Record<string, number> = { "1": 0, "2": 1, "3": 2, "4": 3, a: 0, b: 1, c: 2, d: 3 };
      if (k in map && !removed.includes(map[k])) pick(map[k]);
      else if (k === "enter") lockIn();
      else if (k === " " && g.current.phase === "ladder") {
        e.preventDefault();
        goAsk();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [state, pick, lockIn, goAsk, removed]);

  // ── Prikaz ─────────────────────────────────────────────────────────────
  const look = (i: number): AnswerLook => {
    if (!q) return "idle";
    if (removed.includes(i)) return "removed";
    if (phase === "reveal") {
      if (i === q.tocan) return sel === i ? "correct" : "missed";
      if (i === sel) return "wrong";
      return "dim";
    }
    if (phase === "locked") return i === sel ? "locked" : "dim";
    return i === sel ? "selected" : "idle";
  };
  const pollTop = poll ? poll.indexOf(Math.max(...poll)) : -1;
  const st = LJESTVICA[step];
  const qLen = q ? q.pitanje.length : 0;
  const qSize =
    size === 2
      ? qLen > 90 ? "text-[15.5px]" : qLen > 60 ? "text-[17px]" : "text-[18.5px]"
      : size === 1
        ? qLen > 90 ? "text-[17px]" : qLen > 60 ? "text-[18.5px]" : "text-[20px]"
        : qLen > 90 ? "text-[19px]" : qLen > 60 ? "text-[21px]" : "text-[23px]";
  const live = state === "playing";
  const jokersOff = phase !== "ask";

  let bottom: ReactNode = null;
  if (phase === "ask" && sel === null)
    bottom = (
      <motion.div key="hint" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex h-full items-center justify-center text-[13px] text-white/40">
        Odaberi odgovor, pa ga zaključaj
      </motion.div>
    );
  else if (phase === "ask")
    bottom = (
      <motion.div key="lock" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 4, transition: { duration: 0.12 } }} transition={{ duration: 0.28, ease: EASE }} className="h-full">
        <PrimaryButton onClick={lockIn} icon={Lock} className={size === 2 ? "!h-[44px] !text-[21px]" : "!h-[50px] !text-[23px]"}>
          Zaključaj odgovor
        </PrimaryButton>
      </motion.div>
    );
  else if (phase === "locked")
    bottom = (
      <motion.div key="wait" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex h-full items-center justify-center gap-2 text-[11.5px] font-semibold uppercase tracking-[0.3em] text-white/55">
        <Lock className="h-[13px] w-[13px]" strokeWidth={2.4} />
        Zaključano
        <span className="ph-dots" aria-hidden>
          <i />
          <i />
          <i />
        </span>
      </motion.div>
    );
  else if (phase === "reveal")
    bottom = (
      <motion.div
        key="out"
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0 }}
        transition={{ type: "spring", stiffness: 420, damping: 20 }}
        className={`flex h-full items-center justify-center font-heading uppercase leading-none tracking-[0.08em] ${size === 2 ? "text-[24px]" : "text-[28px]"} ${outcome === 1 ? "text-accent" : "text-[#ff7a7e]"}`}
      >
        {outcome === 1 ? (step + 1 >= PEHAR_BROJ ? "Pehar!" : "Točno") : "Netočno"}
      </motion.div>
    );

  return (
    <GameStage locked={live} state={state} landscape="portrait" title={PEHAR_NAZIV}>
      <div className="absolute inset-0 z-0">
        <canvas ref={back.canvasRef} aria-hidden className="absolute inset-0 h-full w-full" />

        <motion.div
          ref={uiRef}
          animate={shake}
          className={`absolute inset-0 flex flex-col px-4 pb-[max(12px,env(safe-area-inset-bottom))] transition-opacity duration-300 ${size === 2 ? "pt-2.5" : "pt-3"} ${live ? "opacity-100" : "pointer-events-none opacity-0"}`}
        >
          {/* gornja traka: razina + džokeri + zvuk */}
          <div className="flex items-center gap-2">
            <div className={`shrink-0 flex-col justify-center rounded-[12px] border border-white/10 bg-black/45 px-2.5 ${narrow ? "hidden" : "flex"} ${size === 2 ? "h-9" : "h-10"}`}>
              <span className="text-[8.5px] font-semibold uppercase tracking-[0.2em] text-white/45">Pitanje</span>
              <span className="font-heading text-[19px] leading-[0.95] tabular-nums text-white">
                {Math.min(step + 1, PEHAR_BROJ)}
                <span className="text-white/35">/{PEHAR_BROJ}</span>
              </span>
            </div>
            <div className={`flex min-w-0 flex-1 gap-1.5 transition-opacity duration-300 ${jokersOff ? "opacity-40" : ""}`}>
              <JokerButton icon={Layers} label="50:50" used={used.fifty} disabled={jokersOff} onUse={useFifty} compact={size === 2} />
              <JokerButton icon={Users} label="Tribina" used={used.crowd} disabled={jokersOff} onUse={useCrowd} compact={size === 2} />
              <JokerButton icon={MessageCircle} label="Frend" used={used.friend} disabled={jokersOff} onUse={useFriend} href={friendHref} compact={size === 2} />
            </div>
            <MuteButton className={size === 2 ? "!h-9 !w-9" : ""} />
          </div>

          {/* pitanje + mala ljestvica */}
          <div className="relative flex min-h-0 flex-1 gap-3 pb-2 pt-3">
            <div className="flex min-w-0 flex-1 flex-col justify-center">
              <AnimatePresence mode="wait" initial={false}>
                {q && phase !== "ladder" ? (
                  <motion.div
                    key={`q-${step}-${q.index}`}
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: phase === "locked" ? 0.55 : 1, y: 0 }}
                    exit={{ opacity: 0, y: -10, transition: { duration: 0.2 } }}
                    transition={{ duration: 0.5, ease: EASE }}
                  >
                    {st && size !== 2 ? (
                      <div className="mb-1.5 flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.2em] text-accent">
                        {st.sigurno ? (
                          <ShieldCheck className="h-[12px] w-[12px]" strokeWidth={2.6} />
                        ) : (
                          <span className="h-[2px] w-3 rounded-full bg-accent" />
                        )}
                        {st.ime}
                      </div>
                    ) : null}
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-[10.5px] font-semibold uppercase tracking-[0.24em] text-white/45">
                        {q.kategorija}
                      </span>
                      <span className="flex items-center gap-[3px]" aria-label={`Težina: ${TEZINE[q.tezina]}`}>
                        {[1, 2, 3, 4, 5].map((k) => (
                          <span key={k} className={`h-[5px] w-[5px] rounded-full ${k <= q.tezina ? "bg-accent" : "bg-white/15"}`} />
                        ))}
                      </span>
                    </div>
                    <p
                      role="heading"
                      aria-level={2}
                      className={`mt-2 text-balance font-semibold leading-[1.26] text-white ${qSize}`}
                    >
                      {q.pitanje}
                    </p>
                    <AnimatePresence>
                      {friendNote && phase === "ask" ? (
                        <motion.p
                          initial={{ opacity: 0, y: 6 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0 }}
                          className="mt-2 flex items-center gap-1.5 text-[12px] text-white/50"
                        >
                          <MessageCircle className="h-[13px] w-[13px] text-accent" />
                          Poslano. Zaključaj kad frend odgovori.
                        </motion.p>
                      ) : null}
                    </AnimatePresence>
                  </motion.div>
                ) : null}
              </AnimatePresence>
            </div>
            <MiniLadder step={step} phase={phase} outcome={outcome} />
          </div>

          {/* odgovori */}
          <div className={`grid shrink-0 ${size === 2 ? "gap-1.5" : size === 1 ? "gap-[7px]" : "gap-2"}`}>
            {q && phase !== "ladder"
              ? q.odgovori.map((o, i) => (
                  <AnswerButton
                    key={`${step}-${i}`}
                    index={i}
                    text={o}
                    look={look(i)}
                    poll={poll ? poll[i] : null}
                    pollTop={i === pollTop}
                    onPick={pick}
                    size={size}
                  />
                ))
              : Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className={`rounded-[15px] border border-white/[0.05] ${size === 2 ? "h-[42px]" : size === 1 ? "h-[48px]" : "h-[54px]"}`} />
                ))}
          </div>
          <div className={`shrink-0 ${size === 2 ? "mt-2 h-[44px]" : "mt-2.5 h-[50px]"}`}>
            <AnimatePresence mode="wait" initial={false}>
              {bottom}
            </AnimatePresence>
          </div>
        </motion.div>

        {live ? (
          <LadderOverlay
            key={`ladder-${step}`}
            step={step}
            fromStep={fromStep}
            show={phase === "ladder"}
            rowH={Math.max(18, Math.min(30, Math.floor((stageH - 150) / 15)))}
            onSkip={goAsk}
          />
        ) : null}

        <canvas ref={front.canvasRef} aria-hidden className="pointer-events-none absolute inset-0 z-[26] h-full w-full" />
      </div>

      <AnimatePresence>
        {state === "start" ? (
          <StartScreen
            key="start"
            title={PEHAR_NAZIV}
            kicker="Nogometni kviz"
            description="Petnaest pitanja, od lakih do ekspertnih. Jedan krivi odgovor i utakmica je gotova."
            rules={[
              { icon: ShieldCheck, text: "Nakon 5. i 10. pitanja razina ostaje tvoja" },
              { icon: Layers, text: "Tri džokera: 50:50, tribina i frend" },
              { icon: Lock, text: "Odaberi, zaključaj i čekaj presudu" },
            ]}
            best={best}
            bestLabel="Najdalje"
            formatScore={(n) => `${n}. pitanje`}
            onStart={start}
            extra={<StartExtra pehari={stats.pehari} igre={stats.igre} small={stageH < 480} />}
            ctaLabel="Na teren"
          />
        ) : null}
        {state === "result" && res ? (
          <ResultView
            key={`res-${stats.igre}`}
            res={res}
            best={rec.best}
            first={rec.first}
            record={rec.record}
            tie={rec.tie}
            onRestart={start}
          />
        ) : null}
      </AnimatePresence>

      <style>{`
        @keyframes phBreathe{0%,100%{box-shadow:0 0 0 1px rgba(255,255,255,.7),0 0 24px rgba(255,255,255,.18)}50%{box-shadow:0 0 0 1px rgba(255,255,255,.9),0 0 44px rgba(255,255,255,.38)}}
        .ph-breathe{animation:phBreathe 1.1s ease-in-out infinite}
        @keyframes phBlink{0%,100%{background-color:rgba(232,255,60,.14)}50%{background-color:rgba(232,255,60,.34)}}
        .ph-blink{animation:phBlink .5s ease-in-out 4}
        .ph-dots{display:inline-flex;gap:3px;margin-left:2px}
        .ph-dots i{width:4px;height:4px;border-radius:9px;background:currentColor;animation:phDot 1s ease-in-out infinite}
        .ph-dots i:nth-child(2){animation-delay:.15s}.ph-dots i:nth-child(3){animation-delay:.3s}
        .ph-run{opacity:0;animation:phRun 3.6s cubic-bezier(.22,1,.36,1) infinite}
        @keyframes phRun{0%{opacity:0}4%{opacity:.55}16%,100%{opacity:0}}
        @media (prefers-reduced-motion:reduce){.ph-run{animation:none}}
        @keyframes phDot{0%,100%{opacity:.2;transform:translateY(0)}50%{opacity:1;transform:translateY(-3px)}}
      `}</style>
    </GameStage>
  );
}

export default PeharIgra;
