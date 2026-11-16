"use client";

// Zajednički okvir za v2 mini igre. Vidi README.md u ovoj mapi.
//
// Složivo: <GameShell> je samo gotova kombinacija manjih dijelova
// (<GameStage>, <StartScreen>, <Hud>, <PauseScreen>, <ResultScreen>, <RewardCard>)
// — igra koja treba nešto drugačije može ih složiti sama.

import Link from "next/link";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowRight, Check, Copy, Pause, Play, RotateCcw, Share, Smartphone, Trophy, Volume2, VolumeX, type LucideIcon } from "lucide-react";
import { createContext, useCallback, useContext, useEffect, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from "react";

import { createParticles, BRAND } from "./draw";
import { useBestScore, useCountUp, useLandscapeTouch, useMute, useScrollLock } from "./hooks";
import { claimPrize, formatPrize, pickReward, rewardsEnabled, type RewardPrize, type RewardTier } from "./rewards";
import { haptic, installAudioUnlock, sfx, unlockAudio } from "./sfx";
import { prepareShareCard, shareFile, type ShareResult } from "./share-card";

export * from "./hooks";

export type GameState = "start" | "playing" | "paused" | "result";

export type GameRule = { icon: LucideIcon; text: string };

export type GameResult = {
  score: number;
  /** Naslov iznad broja, npr. "Kraj igre" (default), "Pobjeda", "Vrijeme je isteklo". */
  title?: string;
  /** Kratka rečenica ispod broja, npr. "4 od 5 penala". */
  message?: string;
  /** Prikaz broja ako nije običan broj, npr. "9/10" ili "0:42". */
  display?: string;
};

const EASE = [0.22, 1, 0.36, 1] as const;

// ── Globalni stilovi (jednom po stranici) ────────────────────────────────
const STAGE_CSS = `
.g2-stage{position:relative;width:100%;overflow:hidden;background:#0a0a0a;isolation:isolate;
  -webkit-user-select:none;user-select:none;-webkit-touch-callout:none;-webkit-tap-highlight-color:transparent;touch-action:manipulation;
  height:calc(100vh - 60px - var(--bnav-h,0px) - env(safe-area-inset-bottom));
  height:calc(100svh - 60px - var(--bnav-h,0px) - env(safe-area-inset-bottom));
  min-height:360px;scroll-margin-top:60px}
.g2-stage canvas{touch-action:none;display:block}
.g2-stage:not([data-state="start"]) [data-overlay="start"],
.g2-stage:not([data-state="paused"]) [data-overlay="pause"],
.g2-stage:not([data-state="result"]) [data-overlay="result"]{pointer-events:none!important}
.g2-stage:not([data-state="start"]) [data-overlay="start"] *,
.g2-stage:not([data-state="paused"]) [data-overlay="pause"] *,
.g2-stage:not([data-state="result"]) [data-overlay="result"] *{pointer-events:none!important}
.g2-stage[data-lock="1"]{touch-action:none}
@media (min-width:768px){
  .g2-stage{height:min(calc(100vh - 76px - 64px),880px);height:min(calc(100svh - 76px - 64px),880px);
    width:auto;aspect-ratio:9/16;max-width:480px;margin:32px auto;border-radius:22px;
    box-shadow:0 0 0 1px rgba(255,255,255,0.08),0 30px 80px rgba(0,0,0,0.6);scroll-margin-top:92px}
}
.g2-stage-active .fab,.g2-stage-active .fab-panel,.g2-stage-active .sp-toast,.g2-stage-active [data-cookie-notice]{display:none!important}
.g2-stage[data-land]{position:fixed;inset:0;z-index:90;width:auto;height:auto;min-height:0;max-width:none;aspect-ratio:auto;margin:0;border-radius:0;box-shadow:none}
.g2-stage[data-land] [data-overlay]{padding-left:max(24px,env(safe-area-inset-left));padding-right:max(24px,env(safe-area-inset-right))}
@keyframes g2shine{0%{transform:translateX(-120%) skewX(-20deg)}60%,100%{transform:translateX(260%) skewX(-20deg)}}
@keyframes g2pulse{0%,100%{box-shadow:0 10px 30px rgba(232,255,60,.22),0 0 0 0 rgba(232,255,60,.35)}50%{box-shadow:0 10px 30px rgba(232,255,60,.28),0 0 0 10px rgba(232,255,60,0)}}
.g2-pulse{animation:g2pulse 2.4s ease-in-out infinite}
.g2-shine{position:relative;overflow:hidden}
.g2-shine::after{content:"";position:absolute;inset:0;width:40%;background:linear-gradient(90deg,transparent,rgba(255,255,255,.55),transparent);animation:g2shine 2.6s ease-in-out .4s infinite}
`;

// ── Stage ───────────────────────────────────────────────────────────────
export type LandscapeMode = "fit" | "portrait";

/** Raspored okvira: `land` je postavljen samo na položenom mobitelu. */
export type StageLayout = { land: LandscapeMode | null };
const StageLayoutContext = createContext<StageLayout>({ land: null });
/** Za dijelove igre koji se trebaju drugačije složiti na položenom mobitelu. */
export function useStageLayout() {
  return useContext(StageLayoutContext);
}

/**
 * Okvir igre: na mobitelu puna širina i visina ekrana ispod zaglavlja (iznad
 * donje navigacije), na desktopu 9:16 kartica max 480 px, centrirana.
 * `locked` = igra je u tijeku → nema scrolla/zooma stranice.
 *
 * Položeni mobitel (visina <= 540 px): okvir preuzme cijeli ekran (iznad
 * zaglavlja i donje navigacije). `landscape`:
 * - "fit" (default): igra koristi cijeli položeni ekran, startni ekran i
 *   rezultat se slože u dva stupca;
 * - "portrait": igra traži uspravan mobitel — preko okvira stoji poruka
 *   "Okreni mobitel" (GameShell tada sam pauzira igru).
 */
export function GameStage({
  children,
  locked = false,
  className = "",
  stageRef,
  state,
  landscape = "fit",
  title
}: {
  children: ReactNode;
  locked?: boolean;
  className?: string;
  /** Upisuje se u data-state (korisno za testove). */
  state?: string;
  stageRef?: React.MutableRefObject<HTMLDivElement | null>;
  landscape?: LandscapeMode;
  /** Ime igre za poruku "Okreni mobitel". */
  title?: string;
}) {
  const ref = useRef<HTMLDivElement | null>(null);
  const isLand = useLandscapeTouch();
  const land: LandscapeMode | null = isLand ? landscape : null;
  useScrollLock(locked || !!land);
  const layout = useMemo<StageLayout>(() => ({ land }), [land]);

  useEffect(() => {
    installAudioUnlock();
    document.documentElement.classList.add("g2-stage-active");
    return () => document.documentElement.classList.remove("g2-stage-active");
  }, []);

  // Mobitel: okvir popuni točno ostatak ekrana ispod zaglavlja/trake s obavijesti
  // (na vrhu stranice), iznad donje navigacije. Ako je iznad okvira puno sadržaja,
  // uzmi punu visinu ispod zaglavlja (igra se poravna na "Igraj").
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    let raf = 0;
    const fit = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const vh = window.visualViewport?.height ?? window.innerHeight;
        if (el.dataset.land) {
          // Položeni mobitel: okvir je fiksan preko cijelog ekrana (CSS).
          el.style.removeProperty("height");
          return;
        }
        if (window.innerWidth >= 768) {
          // Desktop: kartica 9:16 stane u prozor ispod zaglavlja (32 px razmaka dolje).
          const top = el.getBoundingClientRect().top + window.scrollY;
          const fitted = vh - top - 32;
          if (fitted >= 560) el.style.height = `${Math.round(Math.min(880, fitted))}px`;
          else el.style.removeProperty("height");
          return;
        }
        const cs = getComputedStyle(document.documentElement);
        const bnav = parseFloat(cs.getPropertyValue("--bnav-h")) || 0;
        const probe = document.createElement("div");
        probe.style.cssText = "position:fixed;bottom:0;height:env(safe-area-inset-bottom);visibility:hidden;pointer-events:none";
        document.body.appendChild(probe);
        const safe = probe.getBoundingClientRect().height;
        probe.remove();
        const top = el.getBoundingClientRect().top + window.scrollY;
        const full = vh - 60 - bnav - safe;
        const fitted = vh - top - bnav - safe;
        const h = fitted >= full - 80 ? fitted : full;
        // Bez većeg minimuma: okvir nikad ne smije ući pod donju navigaciju
        // (iPhone SE + traka s obavijesti); slojevi se sami zbiju (useFitDensity).
        el.style.height = `${Math.max(360, Math.round(h))}px`;
      });
    };
    fit();
    const ro = typeof ResizeObserver !== "undefined" ? new ResizeObserver(fit) : null;
    ro?.observe(document.body);
    window.addEventListener("resize", fit);
    window.addEventListener("orientationchange", fit);
    return () => {
      cancelAnimationFrame(raf);
      ro?.disconnect();
      window.removeEventListener("resize", fit);
      window.removeEventListener("orientationchange", fit);
    };
  }, [land]);

  // iOS: spriječi pinch-zoom, dvostruki dodir i povlačenje stranice preko igre.
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const prevent = (e: Event) => e.preventDefault();
    const onMove = (e: TouchEvent) => {
      if (locked || e.touches.length > 1) {
        e.preventDefault();
        return;
      }
      // Položeno (okvir preko cijelog ekrana): stranica ispod se ne smije
      // pomicati — dopušten je samo scroll unutar sloja koji se može scrollati.
      if (land && e.target instanceof Element) {
        const sc = e.target.closest("[data-overlay]") as HTMLElement | null;
        if (!sc || sc.scrollHeight <= sc.clientHeight + 1) e.preventDefault();
      }
    };
    el.addEventListener("gesturestart", prevent);
    el.addEventListener("dblclick", prevent);
    el.addEventListener("touchmove", onMove, { passive: false });
    return () => {
      el.removeEventListener("gesturestart", prevent);
      el.removeEventListener("dblclick", prevent);
      el.removeEventListener("touchmove", onMove);
    };
  }, [locked, land]);

  return (
    <StageLayoutContext.Provider value={layout}>
      <style dangerouslySetInnerHTML={{ __html: STAGE_CSS }} />
      <div
        ref={(n) => {
          ref.current = n;
          if (stageRef) stageRef.current = n;
        }}
        data-lock={locked ? "1" : "0"}
        data-state={state}
        data-land={land ?? undefined}
        className={`g2-stage ${className}`}
      >
        {children}
        <AnimatePresence>{land === "portrait" ? <RotatePrompt key="rotate" title={title} /> : null}</AnimatePresence>
      </div>
    </StageLayoutContext.Provider>
  );
}

/** Poruka preko igre kad igra traži uspravan mobitel. */
function RotatePrompt({ title }: { title?: string }) {
  return (
    <motion.div
      data-overlay="rotate"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, transition: { duration: 0.2 } }}
      className="absolute inset-0 z-[60] flex flex-col items-center justify-center bg-[#0a0a0a] text-center"
    >
      <div className="grid h-[76px] w-[76px] place-items-center rounded-[22px] border border-white/10 bg-white/[0.04]">
        <motion.div
          initial={{ rotate: -90 }}
          animate={{ rotate: [-90, -90, 0, 0] }}
          transition={{ duration: 2.6, times: [0, 0.3, 0.62, 1], ease: EASE, repeat: Infinity, repeatDelay: 0.4 }}
        >
          <Smartphone className="h-[34px] w-[34px] text-accent" strokeWidth={1.7} />
        </motion.div>
      </div>
      <div className="mt-5 font-heading text-[34px] uppercase leading-none tracking-[0.04em] text-white">Okreni mobitel</div>
      <p className="mt-2 max-w-[300px] text-[14px] leading-snug text-white/55">
        {title ? `${title} se igra s uspravnim mobitelom.` : "Ova igra se igra s uspravnim mobitelom."}
      </p>
    </motion.div>
  );
}

// ── Gumbi ───────────────────────────────────────────────────────────────
/**
 * Okida akciju na pointerup (bez čekanja na sintetizirani "click"). Na iOS-u
 * brzi drugi dodir odmah nakon prvog (npr. "Nastavi" pa odmah tap u igru)
 * inače zna progutati click. Tipkovnica (Enter/Space) i dalje ide preko onClick.
 */
export function useFastTap(action: () => void) {
  const down = useRef<{ id: number; x: number; y: number } | null>(null);
  const fired = useRef(0);
  return {
    onPointerDown: (e: React.PointerEvent) => {
      if (e.button > 0) return;
      down.current = { id: e.pointerId, x: e.clientX, y: e.clientY };
    },
    onPointerUp: (e: React.PointerEvent) => {
      const d = down.current;
      down.current = null;
      if (!d || d.id !== e.pointerId) return;
      if (Math.hypot(e.clientX - d.x, e.clientY - d.y) > 12) return;
      const r = (e.currentTarget as HTMLElement).getBoundingClientRect();
      if (e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom) return;
      fired.current = performance.now();
      action();
    },
    onPointerCancel: () => {
      down.current = null;
    },
    onClick: () => {
      if (performance.now() - fired.current < 700) return;
      action();
    }
  };
}

export function PrimaryButton({
  children,
  onClick,
  icon: Icon,
  pulse = false,
  className = ""
}: {
  children: ReactNode;
  onClick: () => void;
  icon?: LucideIcon;
  pulse?: boolean;
  className?: string;
}) {
  const fast = useFastTap(onClick);
  return (
    <motion.button
      type="button"
      whileTap={{ scale: 0.965 }}
      transition={{ type: "spring", stiffness: 600, damping: 30 }}
      {...fast}
      className={`flex h-[58px] w-full items-center justify-center gap-2.5 rounded-[16px] bg-accent font-heading text-[26px] uppercase leading-none tracking-[0.08em] text-black ${pulse ? "g2-pulse" : "shadow-[0_10px_30px_rgba(232,255,60,0.22)]"} ${className}`}
    >
      {Icon ? <Icon className="h-[20px] w-[20px] -translate-y-[1px]" strokeWidth={2.4} fill={Icon === Play ? "currentColor" : "none"} /> : null}
      <span className="translate-y-[1px]">{children}</span>
    </motion.button>
  );
}

export function SecondaryButton({
  children,
  onClick,
  icon: Icon,
  className = "",
  disabled
}: {
  children: ReactNode;
  onClick: () => void;
  icon?: LucideIcon;
  className?: string;
  disabled?: boolean;
}) {
  const fast = useFastTap(onClick);
  return (
    <motion.button
      type="button"
      disabled={disabled}
      whileTap={{ scale: 0.965 }}
      transition={{ type: "spring", stiffness: 600, damping: 30 }}
      {...fast}
      className={`flex h-[50px] w-full items-center justify-center gap-2 rounded-[14px] border border-white/15 bg-white/[0.04] text-[15px] font-semibold text-white transition-colors active:bg-white/[0.08] disabled:opacity-50 ${className}`}
    >
      {Icon ? <Icon className="h-[17px] w-[17px]" strokeWidth={2} /> : null}
      {children}
    </motion.button>
  );
}

export function MuteButton({ className = "" }: { className?: string }) {
  const [muted, toggle] = useMute();
  return (
    <button
      type="button"
      onClick={() => {
        unlockAudio();
        toggle();
      }}
      aria-label={muted ? "Uključi zvuk" : "Isključi zvuk"}
      className={`grid h-10 w-10 place-items-center rounded-full border border-white/10 bg-black/45 text-white/80 transition-colors active:bg-white/10 ${className}`}
    >
      {muted ? <VolumeX className="h-[17px] w-[17px]" /> : <Volume2 className="h-[17px] w-[17px]" />}
    </button>
  );
}

// ── HUD ─────────────────────────────────────────────────────────────────
/** Gornja traka tijekom igre. children = lijevo (rezultat, vrijeme), desno su pauza i zvuk. */
export function Hud({ children, onPause }: { children?: ReactNode; onPause?: () => void }) {
  const pauseTap = useFastTap(() => onPause?.());
  return (
    <div className="pointer-events-none absolute inset-x-0 top-0 z-20 flex items-start justify-between gap-3 bg-gradient-to-b from-black/55 via-black/20 to-transparent px-[max(14px,env(safe-area-inset-left))] pb-8 pt-3">
      <div className="pointer-events-none flex min-w-0 items-start gap-2.5">{children}</div>
      <div className="pointer-events-auto flex shrink-0 items-center gap-2">
        {onPause ? (
          <button
            type="button"
            {...pauseTap}
            aria-label="Pauza"
            className="grid h-10 w-10 place-items-center rounded-full border border-white/10 bg-black/45 text-white/80 active:bg-white/10"
          >
            <Pause className="h-[16px] w-[16px]" fill="currentColor" />
          </button>
        ) : null}
        <MuteButton />
      </div>
    </div>
  );
}

/** Jedna vrijednost u HUD-u. `bump` promijeni (npr. na score) za kratki "pop". */
export function HudStat({ label, value, accent = false, bump }: { label: string; value: ReactNode; accent?: boolean; bump?: unknown }) {
  return (
    <div className="flex min-w-[64px] flex-col rounded-[12px] border border-white/10 bg-black/45 px-3 pb-1.5 pt-1.5">
      <span className="text-[9.5px] font-semibold uppercase tracking-[0.22em] text-white/50">{label}</span>
      <motion.span
        key={bump === undefined ? undefined : String(bump)}
        initial={bump === undefined ? false : { scale: 1.35 }}
        animate={{ scale: 1 }}
        transition={{ type: "spring", stiffness: 520, damping: 18 }}
        className={`origin-left font-heading text-[28px] leading-[0.95] tabular-nums ${accent ? "text-accent" : "text-white"}`}
      >
        {value}
      </motion.span>
    </div>
  );
}

/** Odbrojavanje s tankom trakom napretka; zadnje 3 s pocrveni. */
export function HudTimer({ seconds, total, label = "Vrijeme" }: { seconds: number; total: number; label?: string }) {
  const s = Math.max(0, seconds);
  const low = s <= 3.05;
  const pct = total > 0 ? Math.max(0, Math.min(1, s / total)) : 0;
  return (
    <div className="flex min-w-[76px] flex-col rounded-[12px] border border-white/10 bg-black/45 px-3 pb-2 pt-1.5">
      <span className="text-[9.5px] font-semibold uppercase tracking-[0.22em] text-white/50">{label}</span>
      <span className={`font-heading text-[28px] leading-[0.95] tabular-nums transition-colors ${low ? "text-[#ff5a5f]" : "text-white"}`}>
        {s >= 10 ? Math.ceil(s) : s.toFixed(1)}
      </span>
      <span className="mt-1 h-[3px] w-full overflow-hidden rounded-full bg-white/10">
        <span
          className={`block h-full origin-left rounded-full ${low ? "bg-[#ff5a5f]" : "bg-accent"}`}
          style={{ transform: `scaleX(${pct})` }}
        />
      </span>
    </div>
  );
}

// ── Gustoća sloja ──────────────────────────────────────────────────────
/**
 * 0 = prozračno, 1 = zbijeno, 2+ = najzbijenije (do `max`). Kreće od 0 i penje se dok
 * sadržaj (inner) ne stane u sloj (outer, bez paddinga) bez scrolla. Mjeri
 * layout (offsetHeight), pa početne framer animacije (y pomak) ne smetaju.
 * Visina ovisi o traci s obavijesti, donjoj navigaciji i dodatku igre, zato
 * se mjeri, a ne pogađa.
 */
function useFitDensity(deps: unknown[] = [], max = 2) {
  const outerRef = useRef<HTMLDivElement>(null);
  const innerRef = useRef<HTMLDivElement>(null);
  const [dense, setDense] = useState(0);
  useLayoutEffect(() => {
    const outer = outerRef.current;
    const inner = innerRef.current;
    if (!outer || !inner) return;
    let lastH = outer.clientHeight;
    const check = () => {
      const h = outer.clientHeight;
      if (h > lastH + 40) {
        lastH = h;
        setDense(0);
        return;
      }
      lastH = h;
      const cs = getComputedStyle(outer);
      const avail = h - (parseFloat(cs.paddingTop) || 0) - (parseFloat(cs.paddingBottom) || 0);
      if (inner.offsetHeight > avail + 1) setDense((d) => Math.min(max, d + 1));
    };
    check();
    if (typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(check);
    ro.observe(outer);
    ro.observe(inner);
    return () => ro.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
  return { outerRef, innerRef, dense };
}

// ── Start ───────────────────────────────────────────────────────────────
export function StartScreen({
  title,
  kicker = "Mini igra",
  description,
  rules,
  best,
  bestLabel = "Rekord",
  formatScore = String,
  onStart,
  extra,
  ctaLabel = "Igraj"
}: {
  title: string;
  kicker?: string;
  description: string;
  rules?: GameRule[];
  best?: number | null;
  bestLabel?: string;
  formatScore?: (n: number) => string;
  onStart: () => void;
  extra?: ReactNode;
  ctaLabel?: string;
}) {
  const item = {
    hidden: { opacity: 0, y: 14 },
    show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: EASE } }
  };
  // Položeni mobitel: dva stupca (naslov i pravila lijevo, izbor i "Igraj" desno).
  const land = useStageLayout().land === "fit";
  // 3 = i bez opisa (naslov i pravila su dovoljni) — npr. iPhone SE s trakom s obavijesti.
  const { outerRef, innerRef, dense: d } = useFitDensity([land], 3);
  return (
    <motion.div
      ref={outerRef}
      data-overlay="start"
      key="start"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, transition: { duration: 0.22 } }}
      className={`absolute inset-0 z-30 flex flex-col overflow-y-auto overscroll-contain ${
        land
          ? "bg-[linear-gradient(90deg,rgba(0,0,0,0.92)_0%,rgba(0,0,0,0.78)_55%,rgba(0,0,0,0.55)_100%)] py-5"
          : `bg-[linear-gradient(180deg,rgba(0,0,0,0.05)_0%,rgba(0,0,0,0.2)_28%,rgba(0,0,0,0.82)_50%,rgba(0,0,0,0.95)_100%)] px-5 ${d >= 1 ? "pb-3 pt-14" : "pb-5 pt-16"}`
      }`}
    >
      <div className="absolute right-[max(14px,env(safe-area-inset-right))] top-3 z-[1]">
        <MuteButton />
      </div>
      <motion.div
        ref={innerRef}
        initial="hidden"
        animate="show"
        variants={{ show: { transition: { staggerChildren: 0.06, delayChildren: 0.05 } } }}
        className={
          land
            ? "m-auto grid w-full max-w-[820px] grid-cols-[minmax(0,1.05fr)_minmax(0,1fr)] items-end gap-x-10"
            : "mx-auto mt-auto w-full max-w-[400px]"
        }
      >
        <div className={land ? "min-w-0 pr-2" : "contents"}>
        <motion.div variants={item} className="flex items-center gap-2 text-[10.5px] font-semibold uppercase tracking-[0.3em] text-accent">
          <span className="h-[2px] w-5 rounded-full bg-accent" />
          {kicker}
        </motion.div>
        <motion.h2
          variants={item}
          className={`font-heading uppercase leading-[0.86] tracking-[0.01em] text-white ${
            land
              ? "mt-2 text-[clamp(2.6rem,13vh,3.6rem)]"
              : d >= 2
                ? "mt-2 text-[clamp(2.6rem,12.5vw,3.4rem)]"
                : d === 1
                  ? "mt-2 text-[clamp(2.9rem,14vw,4rem)]"
                  : "mt-2.5 text-[clamp(3.1rem,15vw,4.4rem)]"
          }`}
        >
          {title}
        </motion.h2>
        {d >= 3 && !land ? null : (
        <motion.p variants={item} className={`leading-snug text-white/65 ${d >= 2 ? "text-[14px]" : "text-[15px]"} ${land || d >= 1 ? "mt-2" : "mt-3"}`}>
          {description}
        </motion.p>
        )}

        {rules && rules.length ? (
          <motion.ul variants={item} className={land ? "mt-3.5 space-y-2" : d >= 2 ? "mt-3 space-y-1.5" : d === 1 ? "mt-4 space-y-2" : "mt-5 space-y-2.5"}>
            {rules.map(({ icon: Icon, text }, i) => (
              <li key={i} className="flex items-center gap-3">
                <span className={`grid shrink-0 place-items-center rounded-[11px] border border-white/10 bg-white/[0.05] ${d >= 2 ? "h-8 w-8" : "h-9 w-9"}`}>
                  <Icon className="h-[17px] w-[17px] text-accent" strokeWidth={2} />
                </span>
                <span className={`leading-snug text-white/80 ${d >= 2 ? "text-[13px]" : "text-[14px]"}`}>{text}</span>
              </li>
            ))}
          </motion.ul>
        ) : null}
        </div>

        <div className={land ? "min-w-0" : "contents"}>
        {extra ? <motion.div variants={item} className={land ? "" : d >= 2 ? "mt-3" : d === 1 ? "mt-4" : "mt-5"}>{extra}</motion.div> : null}

        <motion.div variants={item} className={land ? (extra ? "mt-5" : "") : d >= 2 ? "mt-4" : d === 1 ? "mt-5" : "mt-7"}>
          <PrimaryButton onClick={onStart} icon={Play} pulse className={d >= 2 && !land ? "!h-[54px]" : ""}>
            {ctaLabel}
          </PrimaryButton>
        </motion.div>
        <motion.div
          variants={item}
          className={`flex items-center justify-center gap-1.5 text-[12.5px] text-white/45 ${best !== null && best !== undefined ? (d >= 1 ? "mt-2.5 h-5" : "mt-3.5 h-5") : "h-0"}`}
        >
          {best !== null && best !== undefined ? (
            <>
              <Trophy className="h-[13px] w-[13px] text-accent/80" />
              {bestLabel}: <b className="font-semibold tabular-nums text-white/80">{formatScore(best)}</b>
            </>
          ) : null}
        </motion.div>
        </div>
      </motion.div>
    </motion.div>
  );
}

// ── Pauza ───────────────────────────────────────────────────────────────
export function PauseScreen({ onResume, onRestart }: { onResume: () => void; onRestart?: () => void }) {
  return (
    <motion.div
      data-overlay="pause"
      key="pause"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, transition: { duration: 0.15 } }}
      className="absolute inset-0 z-30 flex flex-col items-center justify-center bg-black/80 px-8"
    >
      <motion.div
        initial={{ scale: 0.94, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.35, ease: EASE }}
        className="w-full max-w-[320px] text-center"
      >
        <div className="font-heading text-[56px] uppercase leading-none text-white">Pauza</div>
        <div className="mt-6 space-y-2.5">
          <PrimaryButton onClick={onResume} icon={Play}>
            Nastavi
          </PrimaryButton>
          {onRestart ? (
            <SecondaryButton onClick={onRestart} icon={RotateCcw}>
              Kreni ispočetka
            </SecondaryButton>
          ) : null}
        </div>
      </motion.div>
    </motion.div>
  );
}

// ── Konfete (canvas, samo za novi rekord / nagradu) ──────────────────────
function ConfettiBurst({ fire }: { fire: boolean }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    if (!fire) return;
    const c = ref.current;
    if (!c) return;
    const ctx = c.getContext("2d");
    if (!ctx) return;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const w = c.clientWidth;
    const h = c.clientHeight;
    c.width = Math.round(w * dpr);
    c.height = Math.round(h * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const fx = createParticles(220);
    const cols = [BRAND.accent, "#ffffff", BRAND.accent, "#c9e01f"];
    fx.burst(w * 0.2, h * 0.34, { count: 70, colors: cols, angle: -Math.PI / 2 + 0.5, spread: 1.4, speed: [260, 720], gravity: 900, drag: 1.6, life: [1.2, 2.2], size: [3, 6], shape: "confetti" });
    fx.burst(w * 0.8, h * 0.34, { count: 70, colors: cols, angle: -Math.PI / 2 - 0.5, spread: 1.4, speed: [260, 720], gravity: 900, drag: 1.6, life: [1.2, 2.2], size: [3, 6], shape: "confetti" });
    let raf = 0;
    let last = performance.now();
    const loop = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      fx.update(dt);
      ctx.clearRect(0, 0, w, h);
      fx.draw(ctx);
      if (fx.count > 0) raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [fire]);
  return <canvas ref={ref} aria-hidden className="pointer-events-none absolute inset-0 z-[1] h-full w-full" />;
}

// ── Nagrada ─────────────────────────────────────────────────────────────
/**
 * Kartica nagrade. Renderiraj je SAMO ako pickReward() vrati razinu (dakle
 * samo kad je GAME_REWARDS_ENABLED). `preview` = pregled dizajna, ništa ne sprema.
 */
export function RewardCard({ tier, preview = false, shopHref = "/dresovi" }: { tier: RewardTier; preview?: boolean; shopHref?: string }) {
  const router = useRouter();
  const [choice, setChoice] = useState(0);
  const [copied, setCopied] = useState(false);
  const [note, setNote] = useState<string | null>(null);
  const prize: RewardPrize = tier.prizes[Math.min(choice, tier.prizes.length - 1)];
  const f = formatPrize(prize);

  const copy = async () => {
    if (!f.code) return;
    try {
      await navigator.clipboard.writeText(f.code);
    } catch {
      const ta = document.createElement("textarea");
      ta.value = f.code;
      document.body.appendChild(ta);
      ta.select();
      try {
        document.execCommand("copy");
      } catch {}
      ta.remove();
    }
    setCopied(true);
    haptic(10);
    setTimeout(() => setCopied(false), 1600);
  };

  const use = () => {
    const saved = claimPrize(prize);
    if (!saved) {
      setNote(preview ? "Pregled — ništa nije spremljeno." : "Nije uspjelo, pokušaj ponovno.");
      return;
    }
    router.push(shopHref);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 16, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.55, ease: EASE, delay: 0.25 }}
      className="relative overflow-hidden rounded-[18px] border border-accent/35 bg-[linear-gradient(160deg,rgba(232,255,60,0.13),rgba(232,255,60,0.03)_45%,rgba(255,255,255,0.02))] px-4 pb-4 pt-3.5"
    >
      <div className="flex items-center gap-2 text-[10.5px] font-semibold uppercase tracking-[0.28em] text-accent">
        <span className="h-1.5 w-1.5 rounded-full bg-accent" />
        Otključano
      </div>

      {tier.prizes.length > 1 ? (
        <div className="mt-3 grid grid-cols-2 gap-1.5 rounded-[12px] bg-black/40 p-1">
          {tier.prizes.map((p, i) => (
            <button
              key={i}
              type="button"
              onClick={() => setChoice(i)}
              className={`rounded-[9px] px-2 py-2 text-[12.5px] font-semibold transition-colors ${i === choice ? "bg-accent text-black" : "text-white/70"}`}
            >
              {p.title}
            </button>
          ))}
        </div>
      ) : null}

      <div className="mt-2 font-heading text-[28px] uppercase leading-[0.95] text-white">{f.title}</div>
      <div className="mt-0.5 text-[13px] text-white/60">
        {f.detail}
        <span className="text-white/35"> · sam se primijeni na blagajni</span>
      </div>

      {f.code ? (
        <div className="mt-3 flex h-[46px] items-stretch gap-2">
          <div className="flex flex-1 items-center justify-center rounded-[12px] border border-dashed border-white/25 bg-black/40 font-heading text-[24px] tracking-[0.18em] text-white">
            {f.code}
          </div>
          <button
            type="button"
            onClick={copy}
            className="flex w-[104px] items-center justify-center gap-1.5 rounded-[12px] border border-white/15 bg-white/[0.05] text-[13px] font-semibold text-white active:bg-white/10"
          >
            {copied ? <Check className="h-4 w-4 text-accent" /> : <Copy className="h-4 w-4" />}
            {copied ? "Kopirano" : "Kopiraj"}
          </button>
        </div>
      ) : null}

      <div className="mt-2">
        <PrimaryButton onClick={use} className="!h-[50px] !text-[22px]">
          {prize.kind === "gift" ? "Uzmi poklon" : "Iskoristi u dućanu"}
        </PrimaryButton>
      </div>
      {note ? <p className="mt-1.5 text-center text-[11.5px] text-white/50">{note}</p> : null}
    </motion.div>
  );
}

// ── Rezultat ────────────────────────────────────────────────────────────
export function ResultScreen({
  gameTitle,
  result,
  record,
  first = false,
  tie = false,
  best,
  scoreLabel,
  formatScore = String,
  lowerIsBetter = false,
  reward,
  previewRewards = false,
  onRestart,
  shareImage,
  extra,
  shopHref = "/dresovi"
}: {
  gameTitle: string;
  result: GameResult;
  /** Nadmašen raniji rekord. */
  record: boolean;
  /** Prvi rezultat koji se pamti (nema s čim usporediti) — "Tvoj prvi rekord". */
  first?: boolean;
  /** Izjednačen rekord. */
  tie?: boolean;
  /** Rekord nakon ove igre (null = nema ga). */
  best: number | null;
  scoreLabel?: string;
  formatScore?: (n: number) => string;
  lowerIsBetter?: boolean;
  reward?: RewardTier | null;
  previewRewards?: boolean;
  onRestart: () => void;
  shareImage?: string | null;
  extra?: ReactNode;
  shopHref?: string;
}) {
  const [counted, setCounted] = useState(false);
  const [shareState, setShareState] = useState<ShareResult | "busy" | null>(null);
  const fileRef = useRef<File | null>(null);
  const filePromise = useRef<Promise<File> | null>(null);
  const land = useStageLayout().land === "fit";

  const value = useCountUp(result.score, {
    onStep: (v) => {
      if (v !== 0) sfx.tick(v % 2 === 0);
    },
    onDone: () => setCounted(true)
  });

  useEffect(() => {
    if (!counted) return;
    if (record) {
      sfx.fanfare();
      haptic(30);
    } else if (first) {
      haptic(15);
    }
  }, [counted, record, first]);

  // Pripremi sliku za story odmah — da navigator.share u kliku ostane unutar geste (iOS).
  const shareText = result.display ?? formatScore(result.score);
  useEffect(() => {
    fileRef.current = null;
    const p = prepareShareCard({ game: gameTitle, score: shareText, scoreLabel, record, image: shareImage });
    filePromise.current = p;
    p.then((f) => {
      if (filePromise.current === p) fileRef.current = f;
    }).catch(() => {});
  }, [gameTitle, shareText, scoreLabel, record, shareImage]);

  const share = async () => {
    unlockAudio();
    const ready = fileRef.current;
    setShareState("busy");
    let res: ShareResult;
    if (ready) res = await shareFile(ready, `DRESIFY · ${gameTitle}`);
    else {
      try {
        const f = await (filePromise.current ?? prepareShareCard({ game: gameTitle, score: shareText, scoreLabel, record, image: shareImage }));
        res = await shareFile(f, `DRESIFY · ${gameTitle}`);
      } catch {
        res = "failed";
      }
    }
    setShareState(res);
    setTimeout(() => setShareState(null), 2200);
  };

  const { outerRef: scrollRef, innerRef, dense } = useFitDensity([land]);

  const gap = best !== null && !record && !first && !tie ? (lowerIsBetter ? result.score - best : best - result.score) : null;
  const shownValue = result.display && counted ? result.display : formatScore(value);
  // S karticom nagrade sve mora stati na ekran mobitela → zbijeniji raspored.
  const compact = !!reward && (rewardsEnabled() || previewRewards);
  const d = compact ? Math.max(1, dense) : dense;

  const shareIcon = shareState === "shared" || shareState === "downloaded" ? Check : Share;
  const shareLong =
    shareState === "downloaded" ? "Slika spremljena" : shareState === "shared" ? "Podijeljeno" : shareState === "failed" ? "Nije uspjelo" : "Podijeli rezultat";
  const shareShort = shareState === "downloaded" ? "Spremljeno" : shareState === "shared" ? "Podijeljeno" : shareState === "failed" ? "Nije uspjelo" : "Podijeli";

  const numberSize = land
    ? d >= 2
      ? "text-[clamp(3.5rem,19vh,4.75rem)]"
      : d === 1
        ? "text-[clamp(4rem,23vh,5.75rem)]"
        : "text-[clamp(4.5rem,27vh,7rem)]"
    : compact
      ? "text-[clamp(4.25rem,20vw,6rem)]"
      : d >= 2
        ? "text-[clamp(3.75rem,18vw,5rem)]"
        : d === 1
          ? "text-[clamp(4.5rem,22vw,6.5rem)]"
          : "text-[clamp(5.5rem,28vw,8rem)]";

  const recordLine = (
    <AnimatePresence mode="wait">
      {counted && record ? (
        <motion.div
          key="rec"
          initial={{ scale: 0.4, opacity: 0, rotate: -6 }}
          animate={{ scale: 1, opacity: 1, rotate: 0 }}
          transition={{ type: "spring", stiffness: 420, damping: 16 }}
          className="g2-shine flex items-center gap-1.5 rounded-full bg-accent px-3.5 py-1.5 text-[11.5px] font-bold uppercase tracking-[0.2em] text-black"
        >
          <Trophy className="h-[13px] w-[13px]" strokeWidth={2.4} />
          Novi rekord
        </motion.div>
      ) : counted && first ? (
        <motion.div
          key="first"
          initial={{ scale: 0.7, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: "spring", stiffness: 380, damping: 20 }}
          className="flex items-center gap-1.5 rounded-full border border-accent/35 bg-accent/[0.08] px-3.5 py-1.5 text-[11.5px] font-semibold uppercase tracking-[0.2em] text-accent"
        >
          <Trophy className="h-[13px] w-[13px]" strokeWidth={2.2} />
          Tvoj prvi rekord
        </motion.div>
      ) : counted && tie && best !== null ? (
        <motion.div key="tie" initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} className="flex items-center gap-1.5 text-[13px] text-white/55">
          <Trophy className="h-[13px] w-[13px] text-accent/80" />
          Izjednačen rekord <b className="font-semibold tabular-nums text-white/85">{formatScore(best)}</b>
        </motion.div>
      ) : counted && best !== null ? (
        <motion.div key="best" initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} className="flex items-center gap-1.5 text-[13px] text-white/50">
          <Trophy className="h-[13px] w-[13px] text-accent/70" />
          Rekord <b className="font-semibold tabular-nums text-white/85">{formatScore(best)}</b>
          {gap !== null && gap > 0 ? <span className="text-white/35">· još {formatScore(gap)} do njega</span> : null}
        </motion.div>
      ) : null}
    </AnimatePresence>
  );

  const head = (
    <div className={land ? "min-w-0" : ""}>
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, ease: EASE }}
        className="text-center"
      >
        {d === 0 && !land ? <div className="mb-1.5 text-[10.5px] font-semibold uppercase tracking-[0.3em] text-white/45">{gameTitle}</div> : null}
        <div className={`font-heading uppercase leading-none tracking-[0.04em] text-white ${d >= 2 ? "text-[24px]" : "text-[28px]"}`}>
          {result.title ?? "Kraj igre"}
        </div>
      </motion.div>

      <div className={`relative flex flex-col items-center ${d >= 1 ? "mt-2" : "mt-3"}`}>
        <motion.div
          initial={{ scale: 0.6, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: "spring", stiffness: 260, damping: 20, delay: 0.05 }}
          className={`font-heading leading-[0.82] tabular-nums text-accent [text-shadow:0_0_48px_rgba(232,255,60,0.35)] ${numberSize}`}
        >
          {shownValue}
        </motion.div>
        {scoreLabel ? (
          <div className={`${d >= 1 ? "mt-1" : "mt-1.5"} text-[12px] font-semibold uppercase tracking-[0.28em] text-white/70`}>{scoreLabel}</div>
        ) : null}
        {result.message && !compact ? (
          <p className={`${d >= 1 ? "mt-1" : "mt-2"} text-center text-[14px] leading-snug text-white/65`}>{result.message}</p>
        ) : null}
        <div className={`flex items-center justify-center ${d >= 1 ? "mt-1.5 h-7" : "mt-2.5 h-8"}`}>{recordLine}</div>
      </div>
    </div>
  );

  const shopLink = (
    <Link
      href={shopHref}
      className="flex h-[46px] w-full items-center justify-center gap-1.5 rounded-[14px] border border-white/15 bg-white/[0.04] text-[15px] font-semibold text-white transition-colors active:bg-white/[0.08]"
    >
      Dresovi <ArrowRight className="h-[15px] w-[15px]" />
    </Link>
  );

  const actions = (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, ease: EASE, delay: 0.15 }}
      className={compact ? "mt-2.5 grid grid-cols-2 gap-2" : land ? "mt-4" : d >= 1 ? "mt-3" : "mt-5 space-y-2"}
    >
      {compact ? (
        <>
          <SecondaryButton onClick={onRestart} icon={RotateCcw}>
            Igraj ponovno
          </SecondaryButton>
          <SecondaryButton onClick={share} icon={shareIcon} disabled={shareState === "busy"}>
            {shareShort}
          </SecondaryButton>
        </>
      ) : d >= 1 || land ? (
        <>
          <PrimaryButton onClick={onRestart} icon={RotateCcw} className={d >= 2 ? "!h-[52px] !text-[24px]" : ""}>
            Igraj ponovno
          </PrimaryButton>
          <div className="mt-2 grid grid-cols-2 gap-2">
            <SecondaryButton onClick={share} icon={shareIcon} disabled={shareState === "busy"} className="!h-[46px]">
              {shareShort}
            </SecondaryButton>
            {shopLink}
          </div>
        </>
      ) : (
        <>
          <PrimaryButton onClick={onRestart} icon={RotateCcw}>
            Igraj ponovno
          </PrimaryButton>
          <SecondaryButton onClick={share} icon={shareIcon} disabled={shareState === "busy"}>
            {shareLong}
          </SecondaryButton>
          <Link
            href={shopHref}
            className="mx-auto flex h-9 w-fit items-center gap-1.5 px-3 text-[13px] text-white/45 transition-colors hover:text-white/75"
          >
            Pogledaj dresove <ArrowRight className="h-[14px] w-[14px]" />
          </Link>
        </>
      )}
    </motion.div>
  );

  const rewardBlock =
    compact && reward ? (
      <div className="mt-3">
        <RewardCard tier={reward} preview={previewRewards && !rewardsEnabled()} shopHref={shopHref} />
      </div>
    ) : null;
  const extraBlock = extra ? <div className={land ? "" : d >= 2 ? "mt-2.5" : d === 1 ? "mt-3" : "mt-5"}>{extra}</div> : null;

  return (
    <motion.div
      ref={scrollRef}
      data-overlay="result"
      key="result"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, transition: { duration: 0.2 } }}
      className={`absolute inset-0 z-30 overflow-y-auto overscroll-contain ${
        land ? "bg-black/[0.86]" : "bg-gradient-to-b from-black/70 via-black/[0.86] to-black/95"
      }`}
    >
      <ConfettiBurst fire={counted && (record || !!reward)} />
      <div className="absolute right-[max(14px,env(safe-area-inset-right))] top-3 z-[3]">
        <MuteButton />
      </div>
      {land ? (
        <div
          ref={innerRef}
          className="relative z-[2] mx-auto grid min-h-full w-full max-w-[820px] grid-cols-[minmax(0,1fr)_minmax(0,1fr)] items-center gap-x-10 py-4"
        >
          {head}
          <div className="min-w-0">
            {rewardBlock}
            {extraBlock}
            {actions}
          </div>
        </div>
      ) : (
        <div
          ref={innerRef}
          className={`relative z-[2] mx-auto flex min-h-full w-full max-w-[400px] flex-col justify-end px-5 pb-3 ${d >= 1 ? "pt-12" : "pt-14"}`}
        >
          {head}
          {rewardBlock}
          {extraBlock}
          {actions}
        </div>
      )}
    </motion.div>
  );
}

// ── Sve zajedno ─────────────────────────────────────────────────────────
export type GameShellProps = {
  /** Ključ igre — za nagrade (config.ts) i ime slike. */
  gameId: string;
  title: string;
  kicker?: string;
  /** Jedna rečenica na startnom ekranu. */
  description: string;
  /** localStorage ključ za rekord, npr. "dresify_v2_best_penalty". */
  bestKey: string;
  rules?: GameRule[];
  /** Stanje igre — kontrolira ga igra. */
  state: GameState;
  /** "Igraj" i "Igraj ponovno". Zvuk je već otključan kad se ovo pozove. */
  onStart: () => void;
  /** Ako postoji: gumb pauze u HUD-u + automatska pauza kad se kartica sakrije. */
  onPause?: () => void;
  onResume?: () => void;
  /** Rezultat — obavezan kad je state === "result". */
  result?: GameResult | null;
  /** Lijevi dio HUD-a tijekom igre (npr. <HudStat/>, <HudTimer/>). */
  hud?: ReactNode;
  /** Natpis ispod broja na rezultatu i na slici, npr. "bodova". */
  scoreLabel?: string;
  formatScore?: (n: number) => string;
  lowerIsBetter?: boolean;
  /** Pragovi nagrada za ovu igru (inače iz config.ts po gameId). */
  rewardTiers?: RewardTier[];
  /** SAMO pregled dizajna (demo): prikaže karticu nagrade iako je prekidač ugašen; ništa ne sprema. */
  previewRewards?: boolean;
  /** Slika na story kartici (prozirni PNG/WebP), null = bez. */
  shareImage?: string | null;
  startExtra?: ReactNode;
  resultExtra?: ReactNode;
  ctaLabel?: string;
  shopHref?: string;
  /**
   * Položeni mobitel: "fit" (default) = igra preko cijelog položenog ekrana;
   * "portrait" = poruka "Okreni mobitel" i automatska pauza (ako postoji onPause).
   */
  landscape?: LandscapeMode;
  /** Sloj igre (canvas ili React UI) — uvijek montiran, vidi se ispod startnog ekrana. */
  children: ReactNode;
};

export function GameShell(props: GameShellProps) {
  const {
    gameId, title, kicker, description, bestKey, rules, state, onStart, onPause, onResume,
    result, hud, scoreLabel, formatScore, lowerIsBetter = false, rewardTiers, previewRewards = false,
    shareImage, startExtra, resultExtra, ctaLabel, shopHref, landscape = "fit", children
  } = props;
  const stageRef = useRef<HTMLDivElement | null>(null);
  const { best, submit } = useBestScore(bestKey, lowerIsBetter);
  const [outcome, setOutcome] = useState<{ record: boolean; first: boolean; tie: boolean; best: number | null; runId: number; ready: boolean }>({
    record: false,
    first: false,
    tie: false,
    best: null,
    runId: 0,
    ready: false
  });
  const submitted = useRef(false);

  // Ulazak u "result" (s rezultatom) → rekord se sprema TOČNO jednom po igri,
  // neovisno o tome mijenja li igra objekt `result` između rendera.
  useEffect(() => {
    if (state !== "result") {
      if (submitted.current) {
        submitted.current = false;
        setOutcome((o) => ({ ...o, ready: false }));
      }
      return;
    }
    if (!result || submitted.current) return;
    submitted.current = true;
    const r = submit(result.score);
    setOutcome((o) => ({ record: r.record, first: r.first, tie: r.tie, best: r.best, runId: o.runId + 1, ready: true }));
  }, [state, result, submit]);

  // Skrivena kartica → pauza.
  const pauseRef = useRef(onPause);
  pauseRef.current = onPause;
  const stateRef = useRef(state);
  stateRef.current = state;
  useEffect(() => {
    const onVis = () => {
      if (document.hidden && stateRef.current === "playing") pauseRef.current?.();
    };
    document.addEventListener("visibilitychange", onVis);
    window.addEventListener("pagehide", onVis);
    return () => {
      document.removeEventListener("visibilitychange", onVis);
      window.removeEventListener("pagehide", onVis);
    };
  }, []);

  // Igra traži uspravan mobitel, a mobitel je položen → pauza.
  const isLand = useLandscapeTouch();
  const blocked = isLand && landscape === "portrait";
  useEffect(() => {
    if (blocked && state === "playing") pauseRef.current?.();
  }, [blocked, state]);

  const start = useCallback(() => {
    unlockAudio();
    const el = stageRef.current;
    if (el && !el.dataset.land) {
      const r = el.getBoundingClientRect();
      const header = window.innerWidth >= 768 ? 92 : 60;
      // Poravnaj okvir ispod zaglavlja da cijela igra stane na ekran (prije zaključavanja scrolla).
      if (Math.abs(r.top - header) > 2 && (r.top < header || r.bottom > window.innerHeight)) {
        window.scrollTo({ top: Math.max(0, window.scrollY + r.top - header), behavior: "auto" });
      }
    }
    onStart();
  }, [onStart]);

  const reward = useMemo(
    () => (state === "result" && result ? pickReward(result.score, { gameId, tiers: rewardTiers, force: previewRewards }) : null),
    [state, result, gameId, rewardTiers, previewRewards]
  );

  const live = state === "playing" || state === "paused";

  return (
    <GameStage locked={live} stageRef={stageRef} state={state} landscape={landscape} title={title}>
      <div className="absolute inset-0 z-0">{children}</div>
      {live && hud !== undefined ? <Hud onPause={onPause}>{hud}</Hud> : null}
      <AnimatePresence>
        {state === "start" ? (
          <StartScreen
            key="start"
            title={title}
            kicker={kicker}
            description={description}
            rules={rules}
            best={best}
            formatScore={formatScore}
            onStart={start}
            extra={startExtra}
            ctaLabel={ctaLabel}
          />
        ) : null}
        {state === "paused" ? (
          <PauseScreen key="pause" onResume={() => { unlockAudio(); onResume?.(); }} onRestart={start} />
        ) : null}
        {state === "result" && result && outcome.ready ? (
          <ResultScreen
            key={`result-${outcome.runId}`}
            gameTitle={title}
            result={result}
            record={outcome.record}
            first={outcome.first}
            tie={outcome.tie}
            best={outcome.best}
            scoreLabel={scoreLabel}
            formatScore={formatScore}
            lowerIsBetter={lowerIsBetter}
            reward={reward}
            previewRewards={previewRewards}
            onRestart={start}
            shareImage={shareImage}
            extra={resultExtra}
            shopHref={shopHref}
          />
        ) : null}
      </AnimatePresence>
    </GameStage>
  );
}

// ── Ostale igre (ispod pozornice) ────────────────────────────────────────
// Blok s linkovima na ostale mini igre + hub /igre. Ide na stranicu ISPOD
// igre (ne u pozornicu), pa ne dira visinu ni kontrole igre. Bez riječi o
// nagradama (GAME_REWARDS_ENABLED = false). Linkovi imaju završnu kosu crtu
// (trailingSlash: true), da nema preusmjeravanja.
export type OstalaIgraId = "igra" | "pehar" | "kviz" | "zongliranje";

const OSTALE_IGRE: { id: OstalaIgraId; href: string; naziv: string; opis: string }[] = [
  { id: "igra", href: "/igra/", naziv: "Penalty Karijera", opis: "Penali level po level, sve do boss golmana." },
  { id: "pehar", href: "/pehar/", naziv: "15 do pehara", opis: "Petnaest pitanja zaredom. Jedan krivi i ispadaš." },
  { id: "kviz", href: "/kviz/", naziv: "Kviz dana", opis: "Deset novih pitanja svaki dan, ista za sve." },
  { id: "zongliranje", href: "/zongliranje/", naziv: "Žongliranje", opis: "Drži loptu u zraku što dulje možeš." }
];

export function OstaleIgre({ current, className = "" }: { current: OstalaIgraId; className?: string }) {
  const igre = OSTALE_IGRE.filter((g) => g.id !== current);
  return (
    <nav aria-labelledby="ostale-igre-naslov" className={`page-shell max-w-2xl pb-16 ${className}`}>
      <div className="border-t border-white/[0.07] pt-8">
        <h2
          id="ostale-igre-naslov"
          className="font-heading text-[22px] uppercase leading-none tracking-[0.04em] text-white"
        >
          Ostale igre
        </h2>
        <ul className="mt-4 grid gap-2.5 sm:grid-cols-3">
          {igre.map((g) => (
            <li key={g.id}>
              <Link
                href={g.href}
                className="group flex h-full items-start justify-between gap-3 rounded-[14px] border border-white/10 bg-white/[0.03] p-4 transition-colors hover:border-accent/40 hover:bg-white/[0.05]"
              >
                <span>
                  <span className="block font-heading text-[17px] uppercase leading-tight tracking-[0.03em] text-white">
                    {g.naziv}
                  </span>
                  <span className="mt-1 block text-[13px] leading-snug text-white/55">{g.opis}</span>
                </span>
                <ArrowRight
                  aria-hidden
                  className="mt-0.5 h-4 w-4 shrink-0 text-white/35 transition-transform group-hover:translate-x-0.5 group-hover:text-accent"
                />
              </Link>
            </li>
          ))}
        </ul>
        <div className="mt-5 flex flex-wrap gap-x-5 gap-y-2 text-[14px]">
          <Link href="/igre/" className="text-accent underline-offset-4 hover:underline">
            Sve mini igre
          </Link>
          <Link href="/dresovi/" className="text-white/60 underline-offset-4 hover:text-white hover:underline">
            Pogledaj dresove
          </Link>
        </div>
      </div>
    </nav>
  );
}
