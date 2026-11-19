"use client";

import { forwardRef, memo, useCallback, useEffect, useImperativeHandle, useLayoutEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { ChevronLeft, ChevronRight, RotateCcw } from "lucide-react";

import type { OrmarRailItem } from "@/lib/data/ormar-items";
import { pieces } from "@/components/home/ormar/ormar-g-art";
import { OrmarGInfo } from "@/components/home/ormar/ormar-g-info";
import { FILTERS, type FilterKey, displayName, itemAspect, itemWeight, matchesFilter } from "@/components/home/ormar/ormar-g-lib";
import { OrmarGStage } from "@/components/home/ormar/ormar-g-stage";

import { GrafProductBlock, isGraffitiScene } from "../graf-product-block";
import { RACK_BALLS, ballHdSrc } from "../nd-balls";
import { STAND_CAPS, capSrc } from "../nd-caps";
import { MixSheet, type KompletOption, type MixJerseyOpt, type MixStart } from "../nd-mix-sheet";
import { StoreEngine, type EngineItem } from "./engine";

/* ------------------------------------------------------------------ */
/*  3D hero: filtri, platno (šipka + pod sa stalcima), staklena traka  */
/*  žongliranja, strelice + brojač, info dresa u sredini. Kartica s     */
/*  veličinama (OrmarGStage) i "Složi svoj mix" (MixSheet) su postojeće */
/*  komponente — ovdje se samo upravlja što je otvoreno.                */
/* ------------------------------------------------------------------ */

const toEngine = (it: OrmarRailItem): EngineItem => {
  const aspect = itemAspect(it);
  return {
    slug: it.slug,
    weight: itemWeight(it),
    aspect,
    price: it.price,
    pieces: pieces(it, 1).map((pc) => ({
      src: pc.src,
      dx: pc.left + pc.width / 2 - aspect / 2,
      top: pc.inner?.top ?? 0,
      height: pc.inner?.height ?? 1,
      drawHook: Boolean(pc.hook),
      barY: (pc.inner?.top ?? 0) + 0.002,
    })),
  };
};

type Props = {
  items: OrmarRailItem[];
  komplets: KompletOption[];
  mix: MixJerseyOpt[];
  /** Ukupna visina (px) da zamjena 2D → 3D ne pomakne stranicu; null = vlastita visina. */
  totalH: number | null;
  revealed: boolean;
  onFirstFrame: () => void;
  onFail: () => void;
};

export function NdStore3D({ items, komplets, mix, totalH, revealed, onFirstFrame, onFail }: Props) {
  const [mobile] = useState(() => typeof window !== "undefined" && window.innerWidth < 640);
  // scena "grafit" (zadana): samo dresovi + grafit; bez filtera iznad šipke, bez žongliranja,
  // blok proizvoda dolje u sredini platna (kao na konceptu)
  const [graf] = useState(isGraffitiScene);
  const [filter, setFilter] = useState<FilterKey>("sve");
  const counts = useMemo(() => {
    const c = {} as Record<FilterKey, number>;
    for (const f of FILTERS) c[f.key] = items.filter((it) => matchesFilter(it, f.key)).length;
    return c;
  }, [items]);
  const list = useMemo(() => items.filter((it) => matchesFilter(it, filter)), [items, filter]);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const filtersRef = useRef<HTMLDivElement>(null);
  const engine = useRef<StoreEngine | null>(null);
  const pill = useRef<PillHandle>(null);
  const listRef = useRef(list);
  listRef.current = list;

  const [active, setActive] = useState(0);
  const [touched, setTouched] = useState(false);
  const [sel, setSel] = useState<{ index: number; from: DOMRect | null } | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [mixStart, setMixStart] = useState<MixStart>({ kind: "lopta", club: "hrvatska" });
  const lastPick = useRef<MixStart>({ kind: "lopta", club: "hrvatska" });
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const openMix = useCallback((s: MixStart) => {
    lastPick.current = s;
    setMixStart(s);
    setSheetOpen(true);
  }, []);

  const onMixBtn = useCallback(() => openMix(lastPick.current), [openMix]);
  const onHome = useCallback(() => engine.current?.home(), []);

  const balls = useMemo(() => RACK_BALLS.slice(0, mobile ? 4 : 5), [mobile]);
  const caps = useMemo(() => STAND_CAPS.slice(0, mobile ? 6 : 8), [mobile]);

  /* ---------- engine ---------- */
  const cb = useRef({ onFirstFrame, onFail });
  cb.current = { onFirstFrame, onFail };
  useLayoutEffect(() => {
    const canvas = canvasRef.current;
    const wrap = wrapRef.current;
    if (!canvas || !wrap) return;
    let eng: StoreEngine;
    try {
      eng = new StoreEngine(
        canvas,
        {
          onActive: (i) => setActive(i),
          onOpen: (i) => {
            const it = listRef.current[i];
            if (!it) return;
            setSel({ index: i, from: engine.current?.itemRect(i) ?? null });
            engine.current?.setTaken(it.slug);
          },
          onJuggle: (n) => pill.current?.count(n),
          onStreakEnd: () => pill.current?.end(engine.current?.bestScore() ?? 0),
          onMix: (kind, club) => openMix({ kind, club }),
          onAnyFree: (b) => pill.current?.free(b),
          onDrag: () => setTouched(true),
          onFirstFrame: () => cb.current.onFirstFrame(),
        },
        {
          balls,
          caps: [...caps],
          ballSrc: ballHdSrc,
          capSrc,
          mobile,
          dprCap: mobile ? 1.5 : 1.75,
          // font stranice za zidni natpis (next/font postavlja varijablu na <body>)
          signFont: getComputedStyle(document.body).getPropertyValue("--font-bebas"),
        }
      );
    } catch (err) {
      console.warn("[3d] init failed", err);
      cb.current.onFail();
      return;
    }
    engine.current = eng;
    pill.current?.end(eng.bestScore());
    const lost = (e: Event) => {
      e.preventDefault();
      cb.current.onFail();
    };
    canvas.addEventListener("webglcontextlost", lost);
    const fit = () => {
      const r = wrap.getBoundingClientRect();
      eng.resize(Math.round(r.width), Math.round(r.height));
    };
    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(wrap);
    const io = new IntersectionObserver(([e]) => eng.setVisible(e.isIntersecting), { rootMargin: "80px" });
    io.observe(wrap);
    const vis = () => eng.setVisible(document.visibilityState === "visible" && wrap.getBoundingClientRect().bottom > 0);
    document.addEventListener("visibilitychange", vis);
    // prvi kadar i dok je skriven (ispod 2D sloja) — da je spreman za zamjenu
    eng.setVisible(true);
    if (process.env.NODE_ENV !== "production") (window as unknown as { __nd3d?: StoreEngine }).__nd3d = eng;
    return () => {
      canvas.removeEventListener("webglcontextlost", lost);
      document.removeEventListener("visibilitychange", vis);
      ro.disconnect();
      io.disconnect();
      eng.dispose();
      engine.current = null;
    };
    // jednom po montiranju; popis i prikaz se šalju posebno
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    engine.current?.setItems(list.map(toEngine), 0);
    setActive(0);
  }, [list]);

  useEffect(() => {
    if (revealed) engine.current?.startIntro();
  }, [revealed]);

  /* ---------- kartica (skidanje s vješalice) ---------- */
  const onIndex = useCallback((i: number) => {
    setSel({ index: i, from: null });
    const it = listRef.current[i];
    engine.current?.goTo(i, true);
    engine.current?.setTaken(it?.slug ?? null);
  }, []);
  const onClosed = useCallback(() => {
    setSel(null);
    engine.current?.setTaken(null);
  }, []);
  const getRailRect = useCallback(() => (sel ? engine.current?.itemRect(sel.index) ?? null : null), [sel]);
  const openActive = useCallback(() => {
    const it = listRef.current[active];
    if (!it) return;
    setSel({ index: active, from: engine.current?.itemRect(active) ?? null });
    engine.current?.setTaken(it.slug);
  }, [active]);

  const n = list.length;
  const item = list[Math.min(active, Math.max(0, n - 1))];
  const activeName = item ? displayName(item).title : "";

  return (
    // grafit: platno je samo scena (bez filtera i redaka ispod) → vlastita visina kao kadar
    // koncepta umjesto visine 2D sloja (koja uključuje stalke, žongliranje i info)
    <div className="flex flex-col" style={graf ? { height: Math.min(totalH ?? 1e4, mobile ? 640 : 780) } : totalH ? { height: totalH } : undefined}>
      {/* Filtri (isti kao na 2D šipki) — scena "grafit" ih nema (čista šipka) */}
      {!graf && <div
        ref={filtersRef}
        className="shrink-0 overflow-x-auto px-4 pt-1 [mask-image:linear-gradient(90deg,transparent,#000_16px,#000_calc(100%-56px),transparent)] [scrollbar-width:none] sm:[mask-image:none] [&::-webkit-scrollbar]:hidden"
      >
        <div className="mx-auto flex w-max gap-1 rounded-full border border-white/[0.08] bg-[#111111] p-1">
          {FILTERS.map((f) => {
            const on = filter === f.key;
            const empty = counts[f.key] === 0;
            return (
              <button
                key={f.key}
                type="button"
                disabled={empty}
                onClick={(e) => {
                  setFilter(f.key);
                  const sc = filtersRef.current;
                  if (!sc) return;
                  const br = e.currentTarget.getBoundingClientRect();
                  const sr = sc.getBoundingClientRect();
                  sc.scrollTo({ left: sc.scrollLeft + br.left + br.width / 2 - (sr.left + sr.width / 2), behavior: "smooth" });
                }}
                aria-pressed={on}
                className={`inline-flex h-10 items-center gap-1 rounded-full px-3 text-[10.5px] font-semibold uppercase tracking-[0.14em] transition sm:px-4 sm:text-[11px] ${
                  on ? "bg-accent text-black" : empty ? "text-white/20" : "text-white/60 hover:text-white"
                }`}
              >
                {f.label}
                <sup className={`text-[9px] font-medium ${on ? "text-black/55" : "text-white/30"}`}>{counts[f.key]}</sup>
              </button>
            );
          })}
        </div>
      </div>}

      {/* 3D trgovina */}
      <div
        ref={wrapRef}
        className={graf ? "relative min-h-0 flex-1" : "relative mt-2 min-h-0 flex-1 sm:mt-3"}
        style={totalH || graf ? undefined : { height: mobile ? 600 : 760 }}
        role="group"
        aria-roledescription="karusel"
        aria-label="Dresovi na šipki — povuci vodoravno; lopte i kape na podu"
      >
        <canvas
          ref={canvasRef}
          className="absolute inset-0 block h-full w-full select-none"
          style={{
            touchAction: "pan-y",
            cursor: "grab",
            WebkitMaskImage: "linear-gradient(180deg,transparent 0,#000 28px,#000 calc(100% - 36px),transparent)",
            maskImage: "linear-gradient(180deg,transparent 0,#000 28px,#000 calc(100% - 36px),transparent)",
          }}
        />
        {graf && (
          <GrafProductBlock
            item={item}
            index={Math.min(active, Math.max(0, n - 1))}
            total={n}
            href={item?.href ?? "#"}
            onOpen={openActive}
            onPrev={() => engine.current?.goBy(-1)}
            onNext={() => engine.current?.goBy(1)}
          />
        )}
      </div>

      {!graf && <>

      {/* Žongliranje + mix (staklena traka na rubu poda) — vlastito stanje, bez re-rendera heroa */}
      <JugglePill ref={pill} touched={touched} onMix={onMixBtn} onHome={onHome} />

      {/* Strelice + brojač + napredak */}
      <div className="mx-auto mt-4 flex w-[252px] max-w-full shrink-0 items-center justify-between gap-3 px-4 sm:w-auto sm:max-w-[460px] sm:gap-4">
        <button
          type="button"
          onClick={() => {
            setTouched(true);
            engine.current?.goBy(-1);
          }}
          aria-label="Prethodni"
          className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-white/[0.12] text-white/80 transition hover:border-white/40 hover:text-white active:scale-95"
        >
          <ChevronLeft strokeWidth={1.5} className="h-5 w-5" />
        </button>
        <div className="flex min-w-0 flex-1 flex-col items-center gap-2">
          <p className="text-[11px] tabular-nums tracking-[0.24em] text-white/50" aria-live="polite">
            <span className="text-white">{String(active + 1).padStart(2, "0")}</span> / {String(n).padStart(2, "0")}
            <span className="sr-only">, {activeName}</span>
          </p>
          <div className="relative h-px w-full max-w-[180px] overflow-hidden bg-white/[0.12]">
            <div
              className="absolute inset-y-0 left-0 bg-accent transition-transform duration-300"
              style={{ width: `${100 / Math.max(1, n)}%`, transform: `translateX(${active * 100}%)` }}
            />
          </div>
        </div>
        <button
          type="button"
          onClick={() => {
            setTouched(true);
            engine.current?.goBy(1);
          }}
          aria-label="Sljedeći"
          className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-white/[0.12] text-white/80 transition hover:border-white/40 hover:text-white active:scale-95"
        >
          <ChevronRight strokeWidth={1.5} className="h-5 w-5" />
        </button>
      </div>

      <div className="mt-5 shrink-0 px-4 pb-2">{item && <OrmarGInfo key={item.slug} item={item} reduced={false} onOpen={openActive} />}</div>
      </>}

      {mounted &&
        sel &&
        list[sel.index] &&
        createPortal(
          <OrmarGStage list={list} index={sel.index} from={sel.from} reduce={false} getRailRect={getRailRect} onIndex={onIndex} onClosed={onClosed} />,
          document.body
        )}
      <MixSheet open={sheetOpen} start={mixStart} jerseys={mix} komplets={komplets} onClose={() => setSheetOpen(false)} />
    </div>
  );
}

type PillHandle = { count: (n: number) => void; end: (best: number) => void; free: (b: boolean) => void };

const JugglePill = memo(
  forwardRef<PillHandle, { touched: boolean; onMix: () => void; onHome: () => void }>(function JugglePill({ touched, onMix, onHome }, ref) {
    const [count, setCount] = useState(0);
    const [best, setBest] = useState(0);
    const [anyFree, setAnyFree] = useState(false);
    const counterRef = useRef<HTMLSpanElement>(null);
    useImperativeHandle(ref, () => ({
      count: (n) => {
        setCount(n);
        // "pop" brojača bez prisilnog reflowa (Web Animations)
        counterRef.current?.animate?.([{ transform: "scale(1)" }, { transform: "scale(1.22)", offset: 0.4 }, { transform: "scale(1)" }], {
          duration: 360,
          easing: "cubic-bezier(.3,1.5,.5,1)",
        });
      },
      end: (b) => {
        setBest(b);
        setCount(0);
      },
      free: (b) => setAnyFree(b),
    }));
    return (
      <div className="relative z-[2] -mt-7 shrink-0 px-4">
        <div className="flex items-center justify-center gap-2">
          <div className="nd-pill flex h-11 items-center gap-3 rounded-full px-4" aria-live="polite">
            <span className="flex flex-col leading-[1.15]">
              <span className="text-[9.5px] font-semibold uppercase tracking-[0.16em] text-white/55">Žongliranje</span>
              <span className="text-[10px] text-white/35">Rekord {Math.max(best, count)}</span>
            </span>
            <span ref={counterRef} className="inline-block min-w-[1.3ch] text-center font-heading text-[28px] leading-none text-[#e8ff3c]">
              {count}
            </span>
          </div>
          <button type="button" onClick={onMix} className="nd-btn2 h-11 whitespace-nowrap">
            Složi svoj mix
          </button>
          {anyFree && (
            <button
              type="button"
              onClick={() => {
                onHome();
                setCount(0);
              }}
              className="nd-icon h-11 w-11"
              aria-label="Vrati lopte na stalak"
            >
              <RotateCcw strokeWidth={1.75} className="h-[17px] w-[17px]" />
            </button>
          )}
        </div>
        <p className="mt-2 text-center text-[11px] leading-snug text-white/35">
          {touched ? "Dodirni loptu i žongliraj. Dvaput dodirni loptu ili kapu — složi svoj mix." : "Povuci šipku · dodirni loptu i žongliraj · dvaput za mix"}
        </p>
      </div>
    );
  })
);
