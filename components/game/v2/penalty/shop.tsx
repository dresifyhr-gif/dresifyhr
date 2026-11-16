"use client";

// Svlačionica: nadogradnje i lopte za Penalty Karijeru.
// Kovanice su samo u igri (zarađuju se golovima), nisu novac u dućanu.

import { AnimatePresence, motion } from "framer-motion";
import { Check, Crosshair, Lock, Spline, Zap, type LucideIcon } from "lucide-react";
import { useEffect, useLayoutEffect, useRef, useState } from "react";

import { MuteButton, PrimaryButton, useFastTap, useStageLayout } from "../game-shell";
import { haptic, sfx } from "../sfx";
import { penaltySfx } from "./audio";
import { BALLS, UPGRADES, nextPrice, type Progress, type UpgradeId } from "./career";

const EASE = [0.22, 1, 0.36, 1] as const;
export const ballSrc = (id: string) => `/mix/lopta-${id}.webp`;

const ICONS: Record<UpgradeId, LucideIcon> = { power: Zap, curve: Spline, aim: Crosshair };

/** Kovanica (CSS, bez slike). */
export function CoinGlyph({ size = 14, dark = false }: { size?: number; dark?: boolean }) {
  return (
    <span
      aria-hidden
      className={`relative inline-grid shrink-0 place-items-center rounded-full ${dark ? "bg-black/85" : "bg-accent shadow-[0_0_10px_rgba(232,255,60,0.35)]"}`}
      style={{ width: size, height: size }}
    >
      <span
        className={`rounded-full border ${dark ? "border-accent/80" : "border-black/60"}`}
        style={{ width: size * 0.5, height: size * 0.5, borderWidth: Math.max(1, size * 0.1) }}
      />
    </span>
  );
}

/** Broj koji se glatko pomakne do nove vrijednosti (kovanice nakon kupnje). */
function useTween(value: number, ms = 450) {
  const [shown, setShown] = useState(value);
  const from = useRef(value);
  useEffect(() => {
    const a = from.current;
    if (a === value) return;
    let raf = 0;
    const t0 = performance.now();
    const tick = (now: number) => {
      const k = Math.min(1, (now - t0) / ms);
      const e = 1 - Math.pow(1 - k, 3);
      const v = Math.round(a + (value - a) * e);
      setShown(v);
      from.current = v;
      if (k < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [value, ms]);
  return shown;
}

export type ShopContext = "start" | "result" | "boss";

export function Shop({
  progress,
  context,
  closing = false,
  nextLevel,
  lifeBack = false,
  onUpgrade,
  onBall,
  onClose
}: {
  progress: Progress;
  context: ShopContext;
  /** Zatvara se: izblijedi i ne prima dodire. */
  closing?: boolean;
  nextLevel?: number;
  /** Boss je vratio izgubljeni život. */
  lifeBack?: boolean;
  onUpgrade: (id: UpgradeId) => boolean;
  onBall: (id: string) => "picked" | "bought" | "poor";
  onClose: () => void;
}) {
  const [tab, setTab] = useState<"up" | "balls">("up");
  const land = useStageLayout().land === "fit";
  const coins = useTween(progress.coins);
  const rootRef = useRef<HTMLDivElement>(null);
  const [tight, setTight] = useState(false);
  useLayoutEffect(() => {
    const el = rootRef.current;
    if (!el) return;
    const check = () => setTight(el.clientHeight < 470);
    check();
    if (typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(check);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const boss = context === "boss";
  const header = (
    <div className="flex items-start justify-between gap-3">
      <div className="min-w-0">
        <div className="flex items-center gap-2 text-[10.5px] font-semibold uppercase tracking-[0.3em] text-accent">
          <span className="h-[2px] w-5 rounded-full bg-accent" />
          {boss ? "Boss je pao" : "Svlačionica"}
        </div>
        <h2 className={`mt-1.5 font-heading uppercase leading-[0.9] tracking-[0.02em] text-white ${tight ? "text-[28px]" : "text-[34px]"}`}>
          {boss ? `Level ${nextLevel ?? ""} čeka` : "Nadogradnje"}
        </h2>
      </div>
      <div className="flex shrink-0 items-center gap-2 pt-0.5">
        <div className="flex h-10 items-center gap-2 rounded-full border border-white/10 bg-white/[0.05] pl-2.5 pr-3.5" aria-label={`${progress.coins} kovanica`}>
          <CoinGlyph size={16} />
          <span className="font-heading text-[22px] leading-none tabular-nums text-white">{coins}</span>
        </div>
        <MuteButton />
      </div>
    </div>
  );

  const noteText = tight ? "Kovanice vrijede samo u igri." : "Kovanice se zarađuju golovima i troše samo ovdje, u igri.";
  const note = (
    <p className={`leading-snug text-white/45 ${tight ? "mt-1.5 text-[12px]" : "mt-2 text-[12.5px]"}`}>
      {boss && lifeBack ? <span className="font-semibold text-accent">+1 život. </span> : null}
      {noteText}
    </p>
  );

  const tabs = (
    <div className={`relative grid grid-cols-2 rounded-[13px] border border-white/10 bg-white/[0.03] p-1 ${tight ? "mt-3" : "mt-4"}`} role="tablist">
      {/* Klizna oznaka bez layoutId (dijeljeni layout zna zapeti kad se sloj zatvara ili mobitel okrene). */}
      <motion.span
        aria-hidden
        initial={false}
        animate={{ x: tab === "up" ? "0%" : "100%" }}
        transition={{ type: "spring", stiffness: 500, damping: 38 }}
        className="pointer-events-none absolute bottom-1 left-1 top-1 w-[calc(50%-4px)] rounded-[10px] bg-accent"
      />
      {(
        [
          ["up", "Nadogradnje"],
          ["balls", "Lopte"]
        ] as const
      ).map(([id, label]) => (
        <TabButton key={id} on={tab === id} onTap={() => { if (tab !== id) { setTab(id); sfx.tap(); } }}>
          {label}
        </TabButton>
      ))}
    </div>
  );

  const list = (
    <AnimatePresence mode="wait" initial={false}>
      {tab === "up" ? (
        <motion.div key="up" initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -10 }} transition={{ duration: 0.2, ease: EASE }} className={tight ? "space-y-1.5" : "space-y-2"}>
          {UPGRADES.map((u) => (
            <UpgradeRow key={u.id} id={u.id} progress={progress} tight={tight} onBuy={() => onUpgrade(u.id)} />
          ))}
        </motion.div>
      ) : (
        <motion.div key="balls" initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 10 }} transition={{ duration: 0.2, ease: EASE }} className="grid grid-cols-4 gap-1.5">
          {BALLS.map((b) => (
            <BallTile key={b.id} id={b.id} name={b.name} price={b.price} progress={progress} tight={tight} onTap={() => onBall(b.id)} />
          ))}
        </motion.div>
      )}
    </AnimatePresence>
  );

  const footer = (
    <PrimaryButton onClick={onClose} className={tight ? "!h-[52px] !text-[24px]" : ""}>
      {boss ? "Nastavi" : "Gotovo"}
    </PrimaryButton>
  );

  return (
    <motion.div
      ref={rootRef}
      data-overlay="shop"
      initial={{ opacity: 0 }}
      animate={{ opacity: closing ? 0 : 1 }}
      transition={{ duration: closing ? 0.18 : 0.25 }}
      style={{ pointerEvents: closing ? "none" : undefined }}
      className="absolute inset-0 z-[45] overflow-y-auto overscroll-contain bg-[#0a0a0a] bg-[radial-gradient(120%_60%_at_50%_0%,rgba(232,255,60,0.07),transparent_60%)]"
    >
      <motion.div
        initial={{ y: 18, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.4, ease: EASE }}
        className={
          land
            ? "mx-auto grid min-h-full w-full max-w-[860px] grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] items-center gap-x-8 px-[max(24px,env(safe-area-inset-left))] py-4"
            : `mx-auto flex min-h-full w-full max-w-[420px] flex-col px-4 ${tight ? "pb-3 pt-3" : "pb-4 pt-4"}`
        }
      >
        {land ? (
          <>
            <div className="min-w-0">
              {header}
              {note}
              {tabs}
              <div className="mt-4">{footer}</div>
            </div>
            <div className="min-w-0">{list}</div>
          </>
        ) : (
          <>
            {header}
            {note}
            {tabs}
            <div className={`${tight ? "mt-2.5" : "mt-3"}`}>{list}</div>
            <div className={`mt-auto ${tight ? "pt-3" : "pt-4"}`}>{footer}</div>
          </>
        )}
      </motion.div>
    </motion.div>
  );
}

function TabButton({ on, onTap, children }: { on: boolean; onTap: () => void; children: React.ReactNode }) {
  const fast = useFastTap(onTap);
  return (
    <button
      type="button"
      role="tab"
      aria-selected={on}
      {...fast}
      className={`relative h-9 rounded-[10px] text-[13px] font-semibold transition-colors duration-200 ${on ? "text-black" : "text-white/60"}`}
    >
      <span className="relative">{children}</span>
    </button>
  );
}

function UpgradeRow({ id, progress, tight, onBuy }: { id: UpgradeId; progress: Progress; tight: boolean; onBuy: () => boolean }) {
  const u = UPGRADES.find((x) => x.id === id)!;
  const lvl = progress.up[id];
  const max = u.prices.length;
  const price = nextPrice(progress, id);
  const can = price !== null && price <= progress.coins;
  const [shake, setShake] = useState(0);
  const [pop, setPop] = useState(0);
  const Icon = ICONS[id];
  const fast = useFastTap(() => {
    if (price === null) return;
    if (!can) {
      setShake((n) => n + 1);
      sfx.tap();
      haptic(8);
      return;
    }
    if (onBuy()) {
      setPop((n) => n + 1);
      penaltySfx.buy();
      haptic(18);
    }
  });
  return (
    <div className={`flex items-center gap-3 rounded-[14px] border border-white/[0.08] bg-white/[0.03] px-3 ${tight ? "py-2" : "py-2.5"}`}>
      <span className={`grid shrink-0 place-items-center rounded-[11px] border border-white/10 bg-white/[0.05] ${tight ? "h-9 w-9" : "h-10 w-10"}`}>
        <Icon className="h-[18px] w-[18px] text-accent" strokeWidth={2} />
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline justify-between gap-2">
          <span className="truncate text-[14px] font-semibold text-white">{u.name}</span>
          <span className="shrink-0 text-[11px] font-semibold tabular-nums text-white/40">
            {lvl}/{max}
          </span>
        </div>
        <div className="mt-1.5 flex gap-1">
          {Array.from({ length: max }, (_, i) => (
            <motion.span
              key={i === lvl - 1 ? `on-${pop}` : i}
              initial={i === lvl - 1 && pop ? { scaleY: 2.4, opacity: 0.4 } : false}
              animate={{ scaleY: 1, opacity: 1 }}
              transition={{ type: "spring", stiffness: 500, damping: 18 }}
              className={`h-[4px] flex-1 rounded-full ${i < lvl ? "bg-accent shadow-[0_0_8px_rgba(232,255,60,0.45)]" : "bg-white/[0.12]"}`}
            />
          ))}
        </div>
        {tight ? null : <p className="mt-1.5 truncate text-[11.5px] text-white/45">{u.desc}</p>}
      </div>
      <motion.button
        type="button"
        key={shake}
        animate={shake ? { x: [0, -5, 5, -3, 3, 0] } : undefined}
        transition={{ duration: 0.32 }}
        whileTap={can ? { scale: 0.94 } : undefined}
        {...fast}
        aria-label={price === null ? `${u.name}: najviša razina` : `Kupi ${u.name} za ${price} kovanica`}
        className={`flex h-[38px] min-w-[78px] shrink-0 items-center justify-center gap-1.5 rounded-[11px] px-2.5 text-[14px] font-bold tabular-nums transition-colors ${
          price === null ? "border border-white/10 text-white/35" : can ? "bg-accent text-black" : "border border-white/10 bg-white/[0.04] text-white/40"
        }`}
      >
        {price === null ? (
          <span className="text-[11px] uppercase tracking-[0.18em]">Max</span>
        ) : (
          <>
            <CoinGlyph size={13} dark={can} />
            {price}
          </>
        )}
      </motion.button>
    </div>
  );
}

function BallTile({ id, name, price, progress, tight, onTap }: { id: string; name: string; price: number; progress: Progress; tight: boolean; onTap: () => "picked" | "bought" | "poor" }) {
  const owned = progress.balls.includes(id);
  const on = progress.ball === id;
  const can = owned || price <= progress.coins;
  const [shake, setShake] = useState(0);
  const fast = useFastTap(() => {
    const r = onTap();
    if (r === "poor") {
      setShake((n) => n + 1);
      sfx.tap();
      haptic(8);
    } else if (r === "bought") {
      penaltySfx.buy();
      haptic(18);
    } else sfx.tap();
  });
  return (
    <motion.button
      type="button"
      key={shake}
      animate={shake ? { x: [0, -4, 4, -2, 2, 0] } : undefined}
      transition={{ duration: 0.3 }}
      whileTap={{ scale: 0.95 }}
      {...fast}
      aria-pressed={on}
      aria-label={owned ? `Lopta ${name}` : `Lopta ${name}, ${price} kovanica`}
      className={`relative flex flex-col items-center rounded-[14px] border px-1 transition-colors ${tight ? "pb-1.5 pt-2" : "pb-2 pt-2.5"} ${
        on ? "border-accent bg-accent/[0.08]" : "border-white/[0.08] bg-white/[0.03]"
      }`}
    >
      <span className={`relative ${tight ? "h-[38px] w-[38px]" : "h-[46px] w-[46px]"}`}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={ballSrc(id)} alt="" draggable={false} className={`h-full w-full rounded-full object-contain ${owned ? "" : "opacity-35 grayscale-[0.6]"}`} />
        {!owned ? (
          <span className="absolute -right-1 -top-1 grid h-[18px] w-[18px] place-items-center rounded-full border border-white/15 bg-[#0a0a0a]">
            <Lock className="h-[10px] w-[10px] text-white/70" strokeWidth={2.4} />
          </span>
        ) : on ? (
          <span className="absolute -right-1 -top-1 grid h-[18px] w-[18px] place-items-center rounded-full bg-accent">
            <Check className="h-[11px] w-[11px] text-black" strokeWidth={3} />
          </span>
        ) : null}
      </span>
      <span className={`w-full truncate text-center text-[10.5px] font-semibold text-white/80 ${tight ? "mt-1" : "mt-1.5"}`}>{name}</span>
      <span className={`mt-0.5 flex h-[15px] items-center gap-1 text-[10.5px] font-bold tabular-nums ${owned ? (on ? "text-accent" : "text-white/40") : can ? "text-white" : "text-white/35"}`}>
        {owned ? (
          on ? "Odabrana" : "Odaberi"
        ) : (
          <>
            <CoinGlyph size={10} />
            {price}
          </>
        )}
      </span>
    </motion.button>
  );
}
