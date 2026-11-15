"use client";

// Hookovi za v2 igre: canvas (DPR + resize), petlja s fiksnim korakom,
// rekord, zvuk, dnevni niz, zaključavanje scrolla, pointer unos.

import { useCallback, useEffect, useRef, useState, type RefObject } from "react";

import { isMuted, setMuted, subscribeMute } from "./sfx";

// ── Canvas ──────────────────────────────────────────────────────────────
export type CanvasView = {
  ctx: CanvasRenderingContext2D | null;
  /** Širina/visina u CSS pikselima — crtaj u tim jedinicama. */
  w: number;
  h: number;
  dpr: number;
};

/**
 * Canvas koji prati veličinu svog elementa, s DPR-om ograničenim na 2.
 * ctx već ima setTransform(dpr) — crtaj u CSS pikselima (view.current.w/h).
 */
export function useCanvas(opts: { maxDpr?: number; opaque?: boolean; onResize?: (v: CanvasView) => void } = {}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const view = useRef<CanvasView>({ ctx: null, w: 0, h: 0, dpr: 1 });
  const onResize = useRef(opts.onResize);
  onResize.current = opts.onResize;
  const maxDpr = opts.maxDpr ?? 2;
  const opaque = opts.opaque ?? true;

  useEffect(() => {
    const c = canvasRef.current;
    if (!c) return;
    const ctx = c.getContext("2d", { alpha: !opaque });
    if (!ctx) return;
    const apply = () => {
      const rect = c.getBoundingClientRect();
      const w = Math.max(1, rect.width);
      const h = Math.max(1, rect.height);
      const dpr = Math.min(maxDpr, window.devicePixelRatio || 1);
      const pw = Math.round(w * dpr);
      const ph = Math.round(h * dpr);
      if (c.width !== pw || c.height !== ph) {
        c.width = pw;
        c.height = ph;
      }
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.imageSmoothingQuality = "high";
      view.current = { ctx, w, h, dpr };
      onResize.current?.(view.current);
    };
    apply();
    const ro = typeof ResizeObserver !== "undefined" ? new ResizeObserver(apply) : null;
    ro?.observe(c);
    window.addEventListener("orientationchange", apply);
    if (!ro) window.addEventListener("resize", apply);
    return () => {
      ro?.disconnect();
      window.removeEventListener("orientationchange", apply);
      window.removeEventListener("resize", apply);
    };
  }, [maxDpr, opaque]);

  return { canvasRef, view };
}

// ── Petlja ──────────────────────────────────────────────────────────────
export type FrameInfo = {
  /** 0..1 — koliko smo između dva fiksna koraka (za interpolaciju). */
  alpha: number;
  /** Stvarno vrijeme od prošlog frejma (s), max 0.1 — za kozmetiku (čestice na startnom ekranu). */
  dt: number;
  /** Sekunde od početka petlje. */
  time: number;
};

/**
 * requestAnimationFrame petlja s fiksnim korakom.
 * - update(step) se zove samo dok je `running` (default korak 1/120 s — glatko i na 120 Hz).
 * - render(frame) se zove SVAKI frejm (i na startnom ekranu), pa pozadina može živjeti.
 * - Staje dok je kartica skrivena; nakon povratka nema "skoka" (dt je ograničen).
 */
export function useGameLoop(opts: {
  update: (step: number, time: number) => void;
  render: (frame: FrameInfo) => void;
  running: boolean;
  step?: number;
  maxSteps?: number;
}) {
  const update = useRef(opts.update);
  const render = useRef(opts.render);
  const running = useRef(opts.running);
  update.current = opts.update;
  render.current = opts.render;
  running.current = opts.running;
  const step = opts.step ?? 1 / 120;
  const maxSteps = opts.maxSteps ?? 8;

  useEffect(() => {
    let raf = 0;
    let last = 0;
    let acc = 0;
    let time = 0;
    let alive = true;
    const frame = (now: number) => {
      if (!alive) return;
      raf = requestAnimationFrame(frame);
      let dt = last ? (now - last) / 1000 : 0;
      last = now;
      if (dt > 0.1) dt = 0.1;
      time += dt;
      if (running.current) {
        acc += dt;
        let n = 0;
        while (acc >= step && n < maxSteps) {
          update.current(step, time);
          acc -= step;
          n++;
        }
        if (n >= maxSteps) acc = 0;
      } else {
        acc = 0;
      }
      render.current({ alpha: running.current ? acc / step : 0, dt, time });
    };
    const onVis = () => {
      if (document.hidden) {
        cancelAnimationFrame(raf);
        raf = 0;
      } else if (!raf && alive) {
        last = 0;
        raf = requestAnimationFrame(frame);
      }
    };
    raf = requestAnimationFrame(frame);
    document.addEventListener("visibilitychange", onVis);
    return () => {
      alive = false;
      cancelAnimationFrame(raf);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, [step, maxSteps]);
}

// ── Rekord ──────────────────────────────────────────────────────────────
function readNum(key: string): number | null {
  try {
    const v = window.localStorage.getItem(key);
    if (v === null) return null;
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
  } catch {
    return null;
  }
}

/**
 * Najbolji rezultat u localStorage. submit(score) sprema ako je bolji i vraća
 * { record, previous } — record je true samo ako je postojao raniji rezultat i
 * novi ga je nadmašio (prva igra nije "novi rekord").
 */
export function useBestScore(key: string, lowerIsBetter = false) {
  const [best, setBest] = useState<number | null>(null);
  useEffect(() => {
    setBest(readNum(key));
  }, [key]);
  const submit = useCallback(
    (score: number) => {
      const previous = readNum(key);
      const better = previous === null || (lowerIsBetter ? score < previous : score > previous);
      if (better) {
        try {
          window.localStorage.setItem(key, String(score));
        } catch {}
        setBest(score);
      }
      return { record: previous !== null && better, previous, best: better ? score : previous };
    },
    [key, lowerIsBetter]
  );
  return { best, submit };
}

// ── Zvuk ────────────────────────────────────────────────────────────────
export function useMute(): [boolean, () => void] {
  const [m, setM] = useState(false);
  useEffect(() => {
    setM(isMuted());
    return subscribeMute(setM);
  }, []);
  const toggle = useCallback(() => setMuted(!isMuted()), []);
  return [m, toggle];
}

// ── Dnevni niz ("Kviz dana") ────────────────────────────────────────────
function dayStr(d = new Date()) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/** Niz uzastopnih dana igranja. mark() zovi kad je današnja igra odigrana. */
export function useDailyStreak(key: string) {
  const [state, setState] = useState<{ streak: number; playedToday: boolean }>({ streak: 0, playedToday: false });
  useEffect(() => {
    try {
      const raw = JSON.parse(window.localStorage.getItem(key) || "null") as { last: string; streak: number } | null;
      if (!raw) return;
      const today = dayStr();
      const y = new Date();
      y.setDate(y.getDate() - 1);
      const alive = raw.last === today || raw.last === dayStr(y);
      setState({ streak: alive ? raw.streak : 0, playedToday: raw.last === today });
    } catch {}
  }, [key]);
  const mark = useCallback(() => {
    try {
      const today = dayStr();
      const raw = JSON.parse(window.localStorage.getItem(key) || "null") as { last: string; streak: number } | null;
      if (raw?.last === today) return raw.streak;
      const y = new Date();
      y.setDate(y.getDate() - 1);
      const streak = raw?.last === dayStr(y) ? raw.streak + 1 : 1;
      window.localStorage.setItem(key, JSON.stringify({ last: today, streak }));
      setState({ streak, playedToday: true });
      return streak;
    } catch {
      return 0;
    }
  }, [key]);
  return { ...state, mark, today: dayStr() };
}

// ── Scroll / dodir ──────────────────────────────────────────────────────
/** Dok je aktivno: stranica se ne scrolla (iOS uključivo). */
export function useScrollLock(active: boolean) {
  useEffect(() => {
    if (!active) return;
    const html = document.documentElement;
    const prevHtml = html.style.overflow;
    const prevBody = document.body.style.overflow;
    const prevOver = html.style.overscrollBehavior;
    html.style.overflow = "hidden";
    document.body.style.overflow = "hidden";
    html.style.overscrollBehavior = "none";
    return () => {
      html.style.overflow = prevHtml;
      document.body.style.overflow = prevBody;
      html.style.overscrollBehavior = prevOver;
    };
  }, [active]);
}

export type LocalPointer = { x: number; y: number; id: number; type: string; event: PointerEvent };

/**
 * Pointer događaji u lokalnim CSS koordinatama elementa (canvasa).
 * Hvata pointer (setPointerCapture) pa povlačenje radi i izvan elementa.
 */
export function usePointer(
  ref: RefObject<HTMLElement | HTMLCanvasElement | null>,
  handlers: {
    onDown?: (p: LocalPointer) => void;
    onMove?: (p: LocalPointer) => void;
    onUp?: (p: LocalPointer) => void;
  }
) {
  const h = useRef(handlers);
  h.current = handlers;
  useEffect(() => {
    const el = ref.current as HTMLElement | null;
    if (!el) return;
    const local = (e: PointerEvent): LocalPointer => {
      const r = el.getBoundingClientRect();
      return { x: e.clientX - r.left, y: e.clientY - r.top, id: e.pointerId, type: e.pointerType, event: e };
    };
    const down = (e: PointerEvent) => {
      if (e.button > 0) return;
      e.preventDefault();
      try {
        el.setPointerCapture(e.pointerId);
      } catch {}
      h.current.onDown?.(local(e));
    };
    const move = (e: PointerEvent) => h.current.onMove?.(local(e));
    const up = (e: PointerEvent) => h.current.onUp?.(local(e));
    el.addEventListener("pointerdown", down);
    el.addEventListener("pointermove", move);
    el.addEventListener("pointerup", up);
    el.addEventListener("pointercancel", up);
    return () => {
      el.removeEventListener("pointerdown", down);
      el.removeEventListener("pointermove", move);
      el.removeEventListener("pointerup", up);
      el.removeEventListener("pointercancel", up);
    };
  }, [ref]);
}

/** Broji od 0 do target (easeOutCubic). onStep se zove kad se prikazani broj promijeni. */
export function useCountUp(target: number, opts: { duration?: number; run?: boolean; onStep?: (v: number) => void; onDone?: () => void } = {}) {
  const [value, setValue] = useState(opts.run === false ? 0 : 0);
  const onStep = useRef(opts.onStep);
  const onDone = useRef(opts.onDone);
  onStep.current = opts.onStep;
  onDone.current = opts.onDone;
  const run = opts.run ?? true;
  const duration = opts.duration ?? Math.min(1400, 500 + Math.abs(target) * 12);
  useEffect(() => {
    if (!run) return;
    let raf = 0;
    let shown = 0;
    const t0 = performance.now();
    const isInt = Number.isInteger(target);
    const tick = (now: number) => {
      const t = Math.min(1, (now - t0) / duration);
      const e = 1 - Math.pow(1 - t, 3);
      const v = isInt ? Math.round(target * e) : Math.round(target * e * 10) / 10;
      if (v !== shown) {
        shown = v;
        setValue(v);
        onStep.current?.(v);
      }
      if (t < 1) raf = requestAnimationFrame(tick);
      else onDone.current?.();
    };
    setValue(0);
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, run, duration]);
  return value;
}
