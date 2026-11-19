"use client";

import { forwardRef, memo, useCallback, useEffect, useImperativeHandle, useLayoutEffect, useMemo, useRef, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

import type { OrmarRailItem } from "@/lib/data/ormar-items";
import { OrmarGInfo } from "./ormar-g-info";
import { PieceArt, PieceImage, RAIL_SIZES, pieces } from "./ormar-g-art";
import {
  HOOK_INNER,
  IMG_PER_W,
  JACKET_HOOK,
  PAIR_ASPECT,
  PANTS_HOOK,
  type Layout,
  type Track,
  arcDepth,
  arcRise,
  circDelta,
  displayName,
  itemAspect,
  itemWeight,
  jitter,
  layoutFor,
  makeTrack,
  mod,
  placeAt,
  placeTransform,
  trackDelta,
} from "./ormar-g-lib";

/* ------------------------------------------------------------------ */
/*  Šipka smjera G: zaobljena kromirana šipka (luk gledan sprijeda i   */
/*  malo odozgo — sredina je najbliže, krajevi idu natrag i gore).     */
/*  Svaka vješalica visi NA luku: kuka je na šipki na svom x, dres je  */
/*  manji i okrenut prema sredini (rotateY po tangenti). Beskonačni    */
/*  karusel (povuci/swipe, kotačić, strelice), sredina oštra, susjedi  */
/*  mutni. Svaki komad je njihalo (prigušena opruga) — sve u jednoj    */
/*  rAF petlji (transform/opacity), petlja spava kad je sve mirno.     */
/*  Trenirka = jakna + hlače na dvije vješalice jedna do druge.        */
/*  Sluša window "dresify:kick" (lopta s naslovnice udari u šipku).    */
/* ------------------------------------------------------------------ */

const useIsoLayoutEffect = typeof window !== "undefined" ? useLayoutEffect : useEffect;

const RAIL_PAD = 24; // razmak iznad najvišeg dijela luka
const RAIL_H = 7; // debljina šipke sprijeda (px)
const FLOOR = 46; // prostor ispod dresa (pod + sjena)
const PAIR_SWING = [0.84, 1]; // hlače (iza) se njišu malo manje od jakne

export type RailHandle = {
  goTo: (i: number) => void;
  centreRect: () => DOMRect | null;
  focusCentre: () => void;
};

type Props = {
  items: OrmarRailItem[];
  reduced: boolean;
  takenSlug: string | null;
  /** prvi dres (u sredini pri učitavanju) je LCP → next/image priority (neobavezno) */
  priorityFirst?: boolean;
  onOpen: (index: number, from: DOMRect | null) => void;
};

type KickDetail = { clientX: number; clientY: number; force: number };

export const OrmarGRail = forwardRef<RailHandle, Props>(function OrmarGRail({ items, reduced, takenSlug, onOpen, priorityFirst = false }, ref) {
  const n = items.length;
  const track = useMemo<Track>(() => makeTrack(items.map(itemWeight)), [items]);

  const sectionRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const sheenRef = useRef<SVGLinearGradientElement>(null);
  const progressRef = useRef<HTMLDivElement>(null);
  const posRefs = useRef<(HTMLDivElement | null)[]>([]);
  const swingRefs = useRef<(HTMLDivElement | null)[][]>([]);
  const btnRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const shirtRefs = useRef<(HTMLSpanElement | null)[]>([]);

  const [layout, setLayout] = useState<Layout>(() => layoutFor(375));
  const [stageW, setStageW] = useState(375);
  const [active, setActive] = useState(0);
  const [touched, setTouched] = useState(false);
  const [warm, setWarm] = useState(false);

  const sim = useRef({
    pos: 0,
    vel: 0,
    target: 0,
    mode: "rest" as "rest" | "drag" | "wheel",
    lastPos: 0,
    railV: 0,
    theta: new Float32Array(0),
    omega: new Float32Array(0),
    k: new Float32Array(0),
    raf: 0,
    last: 0,
    active: 0,
    w: 240,
    h: 336, // visina okvira slike (px)
    layout: layoutFor(375),
    track,
    reduced: false,
    lastZ: [] as number[],
    lastVis: [] as (boolean | null)[],
    visible: true,
  });

  if (sim.current.theta.length !== n) {
    sim.current.theta = new Float32Array(n);
    sim.current.omega = new Float32Array(n);
    sim.current.k = new Float32Array(n).map((_, i) => 46 * (0.8 + 0.4 * jitter(i)));
    sim.current.lastZ = new Array(n).fill(-1);
    sim.current.lastVis = new Array(n).fill(null);
  }
  sim.current.reduced = reduced;
  sim.current.track = track;

  /* ---------- crtanje jednog kadra ---------- */
  const paint = useCallback(() => {
    const s = sim.current;
    const L = s.layout;
    for (let i = 0; i < n; i++) {
      const el = posRefs.current[i];
      if (!el) continue;
      const p = placeAt(trackDelta(i, s.pos, s.track), L);
      const vis = p.a <= L.maxA;
      if (vis !== s.lastVis[i]) {
        el.style.visibility = vis ? "visible" : "hidden";
        s.lastVis[i] = vis;
      }
      if (!vis) continue;
      el.style.transform = placeTransform(p);
      el.style.opacity = p.op.toFixed(3);
      if (p.z !== s.lastZ[i]) {
        el.style.zIndex = String(p.z);
        s.lastZ[i] = p.z;
      }
      const sw = swingRefs.current[i];
      if (sw) {
        const th = s.theta[i];
        if (sw.length > 1) {
          // Par: svaka kuka sjedi na luku na SVOM x (hlače su desno od sredine para → malo više/niže).
          const cos = Math.cos((p.rot * Math.PI) / 180);
          const offs = [(PANTS_HOOK - PAIR_ASPECT / 2) * s.h, (JACKET_HOOK - PAIR_ASPECT / 2) * s.h];
          for (let k = 0; k < sw.length; k++) {
            const e = sw[k];
            if (!e) continue;
            const hx = p.x + offs[k] * p.sc * cos;
            const dy = (arcRise(p.x, L) - arcRise(hx, L)) / p.sc;
            e.style.transform = `translate3d(0,${dy.toFixed(2)}px,0) rotate(${(th * PAIR_SWING[k]).toFixed(3)}deg)`;
          }
        } else if (sw[0]) sw[0].style.transform = `rotate(${th.toFixed(3)}deg)`;
      }
    }
    if (sheenRef.current) {
      // Odsjaj klizi po šipki kad se vješalice pomiču (kao da svjetlo putuje po kromu).
      const off = mod(-s.pos * L.w * 0.5, 600);
      sheenRef.current.setAttribute("gradientTransform", `translate(${(-off).toFixed(1)} 0)`);
    }
    if (progressRef.current) {
      progressRef.current.style.transform = `translate3d(${(mod(s.pos, n) / n) * 100 * n}%,0,0)`;
    }
  }, [n]);

  /* ---------- fizika ---------- */
  const tick = useCallback(
    (now: number) => {
      const s = sim.current;
      const dt = Math.min(0.034, Math.max(0.001, (now - (s.last || now - 16)) / 1000));
      s.last = now;

      if (s.mode === "rest") {
        const ks = s.reduced ? 320 : 150;
        const cs = 2 * (s.reduced ? 1 : 0.82) * Math.sqrt(ks);
        const acc = -ks * (s.pos - s.target) - cs * s.vel;
        s.vel += acc * dt;
        s.pos += s.vel * dt;
      }
      const pv = (s.pos - s.lastPos) / dt;
      s.lastPos = s.pos;
      const railV = -pv * s.w * 0.9;
      const prevRailV = s.railV;
      s.railV += (railV - s.railV) * Math.min(1, dt * 22);
      const dV = s.railV - prevRailV;

      let energy = 0;
      if (!s.reduced) {
        const eq = Math.max(-11, Math.min(11, s.railV * 0.0042));
        for (let i = 0; i < n; i++) {
          const k = s.k[i];
          const c = 2 * 0.13 * Math.sqrt(k);
          let om = s.omega[i] + (-k * (s.theta[i] - eq) - c * s.omega[i]) * dt + dV * 0.018;
          let th = s.theta[i] + om * dt;
          if (th > 16) { th = 16; om *= -0.3; }
          if (th < -16) { th = -16; om *= -0.3; }
          s.theta[i] = th;
          s.omega[i] = om;
          energy += Math.abs(th) + Math.abs(om) * 0.1;
        }
      }

      const a = mod(Math.round(s.pos), n);
      if (a !== s.active) {
        s.active = a;
        setActive(a);
      }

      paint();

      const settled =
        s.mode === "rest" && Math.abs(s.pos - s.target) < 0.0008 && Math.abs(s.vel) < 0.002 && energy < 0.02 * n && Math.abs(s.railV) < 1;
      if (settled || !s.visible) {
        if (settled) {
          s.pos = s.target;
          s.vel = 0;
          s.theta.fill(0);
          s.omega.fill(0);
          s.railV = 0;
          paint();
        }
        s.raf = 0;
        s.last = 0;
        return;
      }
      s.raf = requestAnimationFrame(tick);
    },
    [n, paint]
  );

  const wake = useCallback(() => {
    const s = sim.current;
    if (!s.raf && s.visible) {
      s.last = 0;
      s.raf = requestAnimationFrame(tick);
    }
  }, [tick]);

  /* ---------- mjerenje ---------- */
  useIsoLayoutEffect(() => {
    const stage = stageRef.current;
    if (!stage) return;
    const apply = () => {
      const W = stage.clientWidth;
      const L = layoutFor(W);
      sim.current.layout = L;
      sim.current.w = L.w;
      setLayout((prev) => (prev.w === L.w && prev.maxA === L.maxA && prev.arcA === L.arcA ? prev : L));
      setStageW(W);
      paint();
    };
    apply();
    const ro = new ResizeObserver(apply);
    ro.observe(stage);
    return () => ro.disconnect();
  }, [paint]);

  // Promjena popisa (filtar) → nacrtaj iznova.
  // (i nova širina → nova visina slike u sim.h, pomak kuka para ovisi o njoj)
  useIsoLayoutEffect(() => { paint(); }, [paint, track, layout.w]);

  useEffect(() => () => cancelAnimationFrame(sim.current.raf), []);

  /* ---------- vidljivost + početni lagani njihaj ---------- */
  useEffect(() => {
    const el = sectionRef.current;
    if (!el) return;
    let first = true;
    const io = new IntersectionObserver(
      ([e]) => {
        const s = sim.current;
        s.visible = e.isIntersecting;
        if (!e.isIntersecting) return;
        if (first && !s.reduced) {
          first = false;
          for (let i = 0; i < n; i++) s.omega[i] = (jitter(i + 7) - 0.5) * 70;
        }
        wake();
      },
      { threshold: 0.15 }
    );
    io.observe(el);
    const pre = new IntersectionObserver(
      ([e]) => {
        if (!e.isIntersecting) return;
        setWarm(true);
        pre.disconnect();
      },
      { rootMargin: "400px 0px" }
    );
    pre.observe(el);
    return () => {
      io.disconnect();
      pre.disconnect();
    };
  }, [n, wake]);

  /* ---------- skrolanje stranice → lagani njihaj ---------- */
  useEffect(() => {
    let lastY = window.scrollY;
    let lastT = performance.now();
    let lastV = 0;
    const onScroll = () => {
      const s = sim.current;
      if (!s.visible || s.reduced) return;
      const now = performance.now();
      const dt = Math.max(8, now - lastT) / 1000;
      const v = (window.scrollY - lastY) / dt;
      lastY = window.scrollY;
      lastT = now;
      const dv = Math.max(-1500, Math.min(1500, v - lastV));
      lastV = v;
      if (Math.abs(dv) < 30) return;
      for (let i = 0; i < n; i++) s.omega[i] += dv * 0.004 * (i % 2 ? 1 : -0.7) * (0.6 + jitter(i));
      wake();
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [n, wake]);

  /* ---------- lopta udari u šipku (zajednički ugovor s naslovnicom) ---------- */
  // window CustomEvent("dresify:kick", { detail: { clientX, clientY, force 0..1 } }):
  // vješalice najbliže clientX se zanjišu, jačina pada s udaljenošću.
  useEffect(() => {
    const onKick = (e: Event) => {
      const det = (e as CustomEvent<KickDetail>).detail;
      const stage = stageRef.current;
      const s = sim.current;
      if (!det || !stage || s.reduced || !Number.isFinite(det.clientX)) return;
      const force = Math.max(0, Math.min(1, Number(det.force) || 0));
      if (!force) return;
      const r = stage.getBoundingClientRect();
      const cx = r.left + r.width / 2;
      const reach = s.w * 0.75;
      const L = s.layout;
      for (let i = 0; i < n; i++) {
        if (!s.lastVis[i]) continue;
        const p = placeAt(trackDelta(i, s.pos, s.track), L);
        const ix = cx + p.x;
        const dist = Math.abs(det.clientX - ix) / reach;
        const fall = Math.exp(-dist * dist);
        if (fall < 0.02) continue;
        // Udarac s lijeva gura donji dio udesno (rotate < 0) i obrnuto; u samoj točki — nasumično.
        const side = Math.abs(det.clientX - ix) < 6 ? (jitter(i + Math.round(det.clientX)) > 0.5 ? 1 : -1) : det.clientX < ix ? -1 : 1;
        s.omega[i] += side * force * 240 * fall * (0.85 + 0.3 * jitter(i + 3));
      }
      wake();
    };
    window.addEventListener("dresify:kick", onKick);
    return () => window.removeEventListener("dresify:kick", onKick);
  }, [n, wake]);

  /* ---------- navigacija ---------- */
  const goBy = useCallback(
    (delta: number) => {
      const s = sim.current;
      s.mode = "rest";
      const base = Math.abs(s.target - s.pos) < 2.5 ? s.target : Math.round(s.pos);
      s.target = base + delta;
      setTouched(true);
      wake();
    },
    [wake]
  );

  const goTo = useCallback(
    (i: number) => {
      const s = sim.current;
      const d = circDelta(i, s.pos, n);
      s.mode = "rest";
      s.target = Math.round(s.pos + d);
      setTouched(true);
      wake();
    },
    [n, wake]
  );

  const kick = useCallback(
    (i: number, amount: number) => {
      const s = sim.current;
      if (s.reduced) return;
      s.omega[i] += amount;
      wake();
    },
    [wake]
  );

  useImperativeHandle(
    ref,
    () => ({
      goTo,
      centreRect: () => shirtRefs.current[sim.current.active]?.getBoundingClientRect() ?? null,
      focusCentre: () => btnRefs.current[sim.current.active]?.focus({ preventScroll: true }),
    }),
    [goTo]
  );

  const open = useCallback(
    (i: number) => onOpen(i, shirtRefs.current[i]?.getBoundingClientRect() ?? null),
    [onOpen]
  );

  /* ---------- povlačenje (pointer) ---------- */
  const drag = useRef({ id: -1, x0: 0, y0: 0, pos0: 0, dragging: false, samples: [] as { t: number; p: number }[], justDragged: false });

  const onPointerDown = (e: React.PointerEvent) => {
    if (e.button !== 0) return;
    const d = drag.current;
    d.id = e.pointerId;
    d.x0 = e.clientX;
    d.y0 = e.clientY;
    d.pos0 = sim.current.pos;
    d.dragging = false;
    d.samples = [{ t: performance.now(), p: sim.current.pos }];
  };

  const onPointerMove = (e: React.PointerEvent) => {
    const d = drag.current;
    if (d.id !== e.pointerId) return;
    const dx = e.clientX - d.x0;
    const dy = e.clientY - d.y0;
    const s = sim.current;
    if (!d.dragging) {
      if (Math.abs(dx) > 6 && Math.abs(dx) > Math.abs(dy) * 1.1) {
        d.dragging = true;
        d.x0 = e.clientX;
        d.pos0 = s.pos;
        s.mode = "drag";
        s.vel = 0;
        try { (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId); } catch {}
        setTouched(true);
        wake();
      } else if (Math.abs(dy) > 10) {
        d.id = -1;
      }
      return;
    }
    const spacing = s.w * 0.72;
    s.pos = d.pos0 - (e.clientX - d.x0) / spacing;
    const now = performance.now();
    d.samples.push({ t: now, p: s.pos });
    while (d.samples.length > 2 && now - d.samples[0].t > 90) d.samples.shift();
  };

  const endDrag = (e: React.PointerEvent, cancelled: boolean) => {
    const d = drag.current;
    if (d.id !== e.pointerId) return;
    d.id = -1;
    if (!d.dragging) return;
    d.dragging = false;
    d.justDragged = true;
    setTimeout(() => { d.justDragged = false; }, 0);
    const s = sim.current;
    const first = d.samples[0];
    const last = d.samples[d.samples.length - 1];
    const dt = (last.t - first.t) / 1000;
    let v = dt > 0.008 ? (last.p - first.p) / dt : 0;
    if (performance.now() - last.t > 80) v = 0;
    v = Math.max(-28, Math.min(28, v));
    s.vel = v;
    const projected = cancelled ? s.pos : s.pos + v * 0.2;
    s.target = Math.round(Math.max(s.pos - 7, Math.min(s.pos + 7, projected)));
    s.mode = "rest";
    wake();
  };

  /* ---------- kotačić / trackpad (vodoravno) ---------- */
  useEffect(() => {
    const stage = stageRef.current;
    if (!stage) return;
    let timer: ReturnType<typeof setTimeout> | null = null;
    let lastT = 0;
    let v = 0;
    const onWheel = (e: WheelEvent) => {
      const dx = Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.shiftKey ? e.deltaY : 0;
      if (!dx) return;
      e.preventDefault();
      const s = sim.current;
      const now = performance.now();
      const dPos = (dx * (e.deltaMode === 1 ? 16 : 1)) / (s.w * 0.72);
      const dt = lastT ? Math.max(0.008, (now - lastT) / 1000) : 0.016;
      lastT = now;
      v += (dPos / dt - v) * 0.4;
      s.mode = "wheel";
      s.pos += dPos;
      setTouched(true);
      wake();
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => {
        s.mode = "rest";
        s.vel = Math.max(-20, Math.min(20, v)) * 0.4;
        s.target = Math.round(s.pos + s.vel * 0.12);
        v = 0;
        lastT = 0;
        wake();
      }, 110);
    };
    stage.addEventListener("wheel", onWheel, { passive: false });
    return () => {
      stage.removeEventListener("wheel", onWheel);
      if (timer) clearTimeout(timer);
    };
  }, [wake]);

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowRight" || e.key === "ArrowLeft") {
      e.preventDefault();
      goBy(e.key === "ArrowRight" ? 1 : -1);
    }
  };

  useEffect(() => {
    const stage = stageRef.current;
    if (!stage || !stage.contains(document.activeElement) || document.activeElement === stage) return;
    btnRefs.current[active]?.focus({ preventScroll: true });
  }, [active]);

  const onItemClick = useCallback(
    (i: number) => {
      if (drag.current.justDragged) return;
      if (i === sim.current.active && Math.abs(sim.current.pos - sim.current.target) < 0.3) open(i);
      else goTo(i);
    },
    [goTo, open]
  );

  /* ---------- stabilne ref funkcije (memo dresova ostaje djelotvoran) ---------- */
  const refFns = useMemo(
    () =>
      Array.from({ length: n }, (_, i) => ({
        pos: (el: HTMLDivElement | null) => {
          posRefs.current[i] = el;
          // Novo montiran dres → zaboravi zadnje upisane vrijednosti (petlja ih upiše iznova).
          sim.current.lastZ[i] = -1;
          sim.current.lastVis[i] = null;
        },
        swing: (k: number) => (el: HTMLDivElement | null) => {
          (swingRefs.current[i] ??= [])[k] = el;
        },
        btn: (el: HTMLButtonElement | null) => { btnRefs.current[i] = el; },
        shirt: (el: HTMLSpanElement | null) => { shirtRefs.current[i] = el; },
      })),
    [n]
  );

  // Početni stil pri montiranju (SSR i stavke koje tek ulaze u prozor).
  const initialStyle = useCallback((i: number): React.CSSProperties => {
    const s = sim.current;
    const p = placeAt(trackDelta(i, s.pos, s.track), s.layout);
    if (p.a > s.layout.maxA) return { visibility: "hidden", opacity: 0, zIndex: 0 };
    return { transform: placeTransform(p), opacity: p.op, zIndex: p.z };
  }, []);

  const L = layout;
  const w = L.w;
  // Okvir slike (kuka + vješalica + odjeća). Gornji rub šipke = unutarnji vrh zavoja kuke.
  const imgH = Math.round(w * IMG_PER_W);
  sim.current.h = imgH;
  const hookY = HOOK_INNER * imgH;
  const maxRise = Math.ceil(L.arcB * arcDepth(stageW / 2 + 8, L));
  const railTop = RAIL_PAD + maxRise; // gornji rub šipke u sredini (najniža točka luka)
  const pivotY = hookY + RAIL_H / 2; // njihalo se okreće oko šipke (sredina šipke u kuki)
  const itemTop = railTop - hookY;
  const shirtBottom = itemTop + imgH * 0.997;
  const stageH = Math.round(shirtBottom + FLOOR);
  const windowR = Math.min(Math.floor(n / 2), Math.ceil(L.maxA) + 1);

  const rail = useMemo(() => railGeometry(stageW, L, railTop), [stageW, L, railTop]);

  if (!n) return null;
  const item = items[Math.min(active, n - 1)];
  const activeName = displayName(item).title;

  return (
    <div ref={sectionRef}>
      {/* Pozornica sa šipkom */}
      <div
        ref={stageRef}
        role="group"
        aria-roledescription="karusel"
        aria-label="Dresovi na šipki"
        onKeyDown={onKeyDown}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={(e) => endDrag(e, false)}
        onPointerCancel={(e) => endDrag(e, true)}
        className="relative mt-2 w-full touch-pan-y select-none overflow-hidden sm:mt-4"
        style={{ height: stageH, cursor: "grab" }}
      >
        {/* Snop toplog reflektora: mekani konus odozgo (samo gradijent, bez blura) */}
        <div
          aria-hidden
          className="pointer-events-none absolute left-1/2 top-0 h-full -translate-x-1/2 [mask-image:linear-gradient(180deg,transparent,#000_40px)]"
          style={{
            width: Math.round(w * 2),
            background: "radial-gradient(ellipse 34% 100% at 50% 0%, rgba(255,238,212,0.08), rgba(255,238,212,0.035) 45%, rgba(255,238,212,0) 78%)",
          }}
        />
        {/* Toplo svjetlo na sredinu */}
        <div
          aria-hidden
          className="pointer-events-none absolute left-1/2 top-0 h-full -translate-x-1/2"
          style={{
            width: Math.round(w * 2.8),
            background:
              "radial-gradient(ellipse 46% 58% at 50% 40%, rgba(255,236,208,0.085), rgba(255,236,208,0.028) 52%, rgba(255,236,208,0) 74%)",
          }}
        />
        {/* Pod: svjetlo se razlije ispod dresa */}
        <div
          aria-hidden
          className="pointer-events-none absolute left-1/2 -translate-x-1/2"
          style={{
            top: shirtBottom - 10,
            width: Math.round(w * 2.6),
            height: FLOOR + 10,
            background: "radial-gradient(ellipse 50% 70% at 50% 40%, rgba(255,236,208,0.05), rgba(255,236,208,0) 70%)",
          }}
        />

        {/* Zidni natpis iza šipke (samo naslovnica — .nd-rail .og-sign u nd-css): letvice +
            mutni "halo" DRESIFY, statično (2D zamjena za 3D natpis). */}
        <div aria-hidden className="og-sign pointer-events-none absolute inset-x-0 top-0 hidden" style={{ height: railTop + imgH * 0.09 }}>
          <div className="og-sign-wall absolute inset-0" />
          <p
            className="og-sign-text absolute inset-x-0 bottom-0 text-center font-heading uppercase leading-[0.74]"
            style={{ fontSize: Math.round(Math.min(stageW * 0.125, (railTop + imgH * 0.09 - 14) / 0.74)) }}
          >
            DRES<span className="og-sign-ify">IFY</span>
          </p>
        </div>

        {/* Zaobljena šipka (SVG): sjena na zidu, krom u pojasevima, LED traka ispod */}
        <RailSvg W={stageW} H={stageH} rail={rail} sheenRef={sheenRef} />

        {/* Vješalice — samo one oko sredine */}
        {items.map((it, i) => {
          const dist = Math.abs(circDelta(i, active, n));
          if (dist > windowR) return null;
          return (
            <HangingItem
              key={it.slug}
              item={it}
              index={i}
              dist={dist}
              eager={warm && dist <= 3}
              priority={priorityFirst && i === 0}
              blur={dist <= 2 ? L.blur[dist] : 0}
              taken={takenSlug === it.slug}
              h={imgH}
              pivotY={pivotY}
              top={itemTop}
              initialStyle={initialStyle}
              refs={refFns[i]}
              onSelect={onItemClick}
              onHover={kick}
            />
          );
        })}

        {/* LED svjetlo pada odozgo — ISPOD vješalica (z 1 < z stavki): sjaji na zid/šipku, a
            tkaninu ne tonira (boje dresa = boje fotografije) */}
        <svg aria-hidden className="pointer-events-none absolute inset-0 z-[1]" width={stageW} height={stageH} viewBox={`0 0 ${stageW} ${stageH}`}>
          <defs>
            <linearGradient id="og-led-fall" gradientUnits="userSpaceOnUse" x1="0" y1={railTop} x2="0" y2={railTop + imgH * 0.42}>
              <stop offset="0" stopColor="#ffeccc" stopOpacity="0.11" />
              <stop offset="0.35" stopColor="#ffeccc" stopOpacity="0.035" />
              <stop offset="1" stopColor="#ffeccc" stopOpacity="0" />
            </linearGradient>
            <linearGradient id="og-led-x" x1="0" x2="1" y1="0" y2="0">
              <stop offset="0" stopColor="#fff" stopOpacity="0" />
              <stop offset="0.2" stopColor="#fff" stopOpacity="0.6" />
              <stop offset="0.5" stopColor="#fff" stopOpacity="1" />
              <stop offset="0.8" stopColor="#fff" stopOpacity="0.6" />
              <stop offset="1" stopColor="#fff" stopOpacity="0" />
            </linearGradient>
            <mask id="og-led-mask" maskUnits="userSpaceOnUse" x="0" y="0" width={stageW} height={stageH}>
              <rect x="0" y="0" width={stageW} height={stageH} fill="url(#og-led-x)" />
            </mask>
          </defs>
          <path d={rail.fall(imgH * 0.42)} fill="url(#og-led-fall)" mask="url(#og-led-mask)" />
        </svg>

        <p
          aria-hidden
          className={`pointer-events-none absolute inset-x-0 bottom-1 z-[160] text-center text-[10px] font-medium uppercase tracking-[0.3em] text-white/30 transition-opacity duration-500 ${touched ? "opacity-0" : "opacity-100"}`}
        >
          ← Povuci šipku →
        </p>
      </div>

      {/* Kontrole: strelice + brojač + napredak */}
      <div className="mx-auto mt-3 flex w-[252px] max-w-full items-center justify-between gap-3 px-4 sm:w-auto sm:max-w-[460px] sm:gap-4">
        <button
          type="button"
          onClick={() => goBy(-1)}
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
            <div ref={progressRef} className="absolute inset-y-0 left-0 bg-accent" style={{ width: `${100 / n}%` }} />
          </div>
        </div>
        <button
          type="button"
          onClick={() => goBy(1)}
          aria-label="Sljedeći"
          className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-white/[0.12] text-white/80 transition hover:border-white/40 hover:text-white active:scale-95"
        >
          <ChevronRight strokeWidth={1.5} className="h-5 w-5" />
        </button>
      </div>

      <div className="mt-7 min-h-[188px] px-4">
        <OrmarGInfo key={item.slug} item={item} reduced={reduced} onOpen={() => open(sim.current.active)} />
      </div>
    </div>
  );
});

/* ------------------------------------------------------------------ */
/*  Geometrija luka u px pozornice (x = 0 lijevo).                     */
/* ------------------------------------------------------------------ */

type RailGeo = {
  band: (f0: number, f1: number) => string; // pojas cijevi između udjela debljine f0..f1
  line: (f: number, off?: number) => string; // linija na udjelu f (+ pomak prema dolje)
  fall: (len: number) => string; // ploha od donjeg ruba šipke prema dolje (svjetlo LED-a)
  rods: { x: number; y: number; t: number }[]; // nosači sa stropa (samo šira pozornica)
};

function railGeometry(W: number, L: Layout, top: number): RailGeo {
  const half = W / 2;
  const pts: { x: number; y: number; t: number }[] = [];
  const step = Math.max(4, Math.round(W / 140));
  for (let sx = -half - step; sx <= half + step; sx += step) {
    const dep = arcDepth(sx, L);
    pts.push({ x: half + sx, y: top - L.arcB * dep, t: RAIL_H * (1 - 0.45 * dep) });
  }
  const f = (v: number) => v.toFixed(1);
  const edge = (fr: number, off = 0) => pts.map((p) => `${f(p.x)} ${f(p.y + p.t * fr + off)}`);
  return {
    band: (f0, f1) => `M${edge(f0).join("L")}L${edge(f1).reverse().join("L")}Z`,
    line: (fr, off = 0) => `M${edge(fr, off).join("L")}`,
    fall: (len) => `M${edge(1, 1).join("L")}L${edge(1, len).reverse().join("L")}Z`,
    rods:
      W >= 640
        ? [-1, 1].map((sgn) => {
            const sx = sgn * half * 0.64;
            const dep = arcDepth(sx, L);
            return { x: half + sx, y: top - L.arcB * dep, t: RAIL_H * (1 - 0.45 * dep) };
          })
        : [],
  };
}

const RailSvg = memo(function RailSvg({
  W,
  H,
  rail,
  sheenRef,
}: {
  W: number;
  H: number;
  rail: RailGeo;
  sheenRef: React.RefObject<SVGLinearGradientElement>;
}) {
  // Krajevi luka tonu u mrak (idu natrag, dalje od svjetla); sredina ima vrući odsjaj reflektora.
  return (
    <svg aria-hidden className="pointer-events-none absolute inset-0" width={W} height={H} viewBox={`0 0 ${W} ${H}`}>
      <defs>
        <linearGradient id="og-rail-fade" x1="0" x2="1" y1="0" y2="0">
          <stop offset="0" stopColor="#fff" stopOpacity="0" />
          <stop offset="0.07" stopColor="#fff" stopOpacity="0.55" />
          <stop offset="0.3" stopColor="#fff" stopOpacity="0.92" />
          <stop offset="0.5" stopColor="#fff" stopOpacity="1" />
          <stop offset="0.7" stopColor="#fff" stopOpacity="0.92" />
          <stop offset="0.93" stopColor="#fff" stopOpacity="0.55" />
          <stop offset="1" stopColor="#fff" stopOpacity="0" />
        </linearGradient>
        <mask id="og-rail-mask" maskUnits="userSpaceOnUse" x="0" y="0" width={W} height={H}>
          <rect x="0" y="0" width={W} height={H} fill="url(#og-rail-fade)" />
        </mask>
        <linearGradient id="og-rod" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0" stopColor="#6f7277" stopOpacity="0" />
          <stop offset="0.55" stopColor="#6f7277" stopOpacity="0.55" />
          <stop offset="1" stopColor="#a9acb1" stopOpacity="0.95" />
        </linearGradient>
        {/* Vrući odsjaj reflektora u sredini šipke */}
        <linearGradient id="og-rail-hot" x1="0" x2="1" y1="0" y2="0">
          <stop offset="0.3" stopColor="#fffaf0" stopOpacity="0" />
          <stop offset="0.5" stopColor="#fffaf0" stopOpacity="0.85" />
          <stop offset="0.7" stopColor="#fffaf0" stopOpacity="0" />
        </linearGradient>
        <linearGradient
          ref={sheenRef}
          id="og-rail-sheen"
          gradientUnits="userSpaceOnUse"
          x1="0"
          x2="600"
          y1="0"
          y2="0"
          spreadMethod="repeat"
        >
          <stop offset="0" stopColor="#fff" stopOpacity="0" />
          <stop offset="0.37" stopColor="#fff" stopOpacity="0" />
          <stop offset="0.47" stopColor="#fff" stopOpacity="0.5" />
          <stop offset="0.57" stopColor="#fff" stopOpacity="0" />
          <stop offset="1" stopColor="#fff" stopOpacity="0" />
        </linearGradient>
      </defs>

      {/* Nosači sa stropa: tanke kromirane šipke koje drže luk (gore tonu u mrak) */}
      {rail.rods.map((r) => (
        <g key={r.x}>
          <rect x={r.x - 1.6} y={0} width={3.2} height={r.y + r.t * 0.5} fill="url(#og-rod)" />
          <rect x={r.x - 3.4} y={r.y - 5} width={6.8} height={6} rx={1.5} fill="#8d9096" />
          <rect x={r.x - 3.4} y={r.y - 5} width={6.8} height={1.2} rx={0.6} fill="#e8eaec" opacity={0.8} />
        </g>
      ))}
      <g mask="url(#og-rail-mask)">
        {/* Mekana sjena šipke na zidu iza (pomaknuta dolje) */}
        <path d={rail.line(1, 12)} fill="none" stroke="#000" strokeOpacity="0.32" strokeWidth="22" strokeLinecap="round" />
        <path d={rail.line(1, 7)} fill="none" stroke="#000" strokeOpacity="0.45" strokeWidth="8" strokeLinecap="round" />

        {/* LED traka ispod šipke: tanka topla linija + mekani sjaj */}
        <path d={rail.line(1, 2.2)} fill="none" stroke="#ffe7c2" strokeOpacity="0.16" strokeWidth="7" />
        <path d={rail.line(1, 1.6)} fill="none" stroke="#ffeed6" strokeOpacity="0.34" strokeWidth="2.6" />
        <path d={rail.line(1, 1.3)} fill="none" stroke="#fff6e8" strokeOpacity="0.85" strokeWidth="0.9" />

        {/* Krom: pojasevi od svijetlog gore do tamnog dolje */}
        <path d={rail.band(0, 0.2)} fill="#e6e8eb" />
        <path d={rail.band(0.2, 0.45)} fill="#b2b5ba" />
        <path d={rail.band(0.45, 0.72)} fill="#62656b" />
        <path d={rail.band(0.72, 1)} fill="#28292d" />
        {/* Sjajna linija na vrhu cijevi + odsjaj reflektora + putujući odsjaj */}
        <path d={rail.line(0.13)} fill="none" stroke="#fff" strokeOpacity="0.75" strokeWidth="0.8" />
        <path d={rail.band(0, 0.5)} fill="url(#og-rail-hot)" />
        <path d={rail.band(0, 0.6)} fill="url(#og-rail-sheen)" />
        {/* Refleks LED-a na donjem rubu cijevi */}
        <path d={rail.line(0.92)} fill="none" stroke="#ffe9c9" strokeOpacity="0.35" strokeWidth="0.8" />
      </g>
    </svg>
  );
});

/* ------------------------------------------------------------------ */

type ItemRefs = {
  pos: (el: HTMLDivElement | null) => void;
  swing: (k: number) => (el: HTMLDivElement | null) => void;
  btn: (el: HTMLButtonElement | null) => void;
  shirt: (el: HTMLSpanElement | null) => void;
};

type HangingProps = {
  item: OrmarRailItem;
  index: number;
  dist: number;
  eager: boolean;
  priority?: boolean;
  blur: number;
  taken: boolean;
  h: number;
  pivotY: number;
  top: number;
  initialStyle: (i: number) => React.CSSProperties;
  refs: ItemRefs;
  onSelect: (i: number) => void;
  onHover: (i: number, amount: number) => void;
};


const HangingItem = memo(function HangingItem({
  item,
  index,
  dist,
  eager,
  priority = false,
  blur,
  taken,
  h,
  pivotY,
  top,
  initialStyle,
  refs,
  onSelect,
  onHover,
}: HangingProps) {
  const { title, club } = displayName(item);
  const w = Math.round(itemAspect(item) * h);
  const parts = pieces(item, h);
  const pair = parts.length > 1;
  // Os rotacije cijele stavke = kuka (kod para: sredina između dviju kuka).
  const origin = `50% ${pivotY.toFixed(2)}px`;
  // Početni položaj — konstantan, pa ga React kasnije ne prepisuje; dalje piše rAF petlja.
  const [initial] = useState(() => initialStyle(index));
  const centre = dist === 0;
  // Kao A: dva najbliža susjeda su mutna, dalji samo izblijede; sredina uvijek oštra.
  const filter = !centre && blur ? `blur(${blur}px)` : "none";
  const what = pair ? "trenirku" : "dres";
  return (
    <div
      ref={refs.pos}
      className="absolute left-1/2 will-change-transform"
      style={{ top, width: w, marginLeft: -w / 2, height: h, transformOrigin: origin, ...initial }}
    >
      {/* Kontaktna sjena na podu (ne njiše se) */}
      <span
        aria-hidden
        className="pointer-events-none absolute left-1/2 -translate-x-1/2 rounded-[50%]"
        style={{
          top: h + 6,
          width: w * (pair ? 0.82 : 0.72),
          height: 22,
          background: "radial-gradient(ellipse 50% 50% at 50% 50%, rgba(0,0,0,0.9), rgba(0,0,0,0.45) 42%, rgba(0,0,0,0) 72%)",
        }}
      />
      <button
        ref={refs.btn}
        type="button"
        tabIndex={centre ? 0 : -1}
        aria-label={centre ? `Skini ${what} ${title}, ${club} — veličine i košarica` : `Prikaži ${what} ${title}`}
        aria-current={centre ? "true" : undefined}
        aria-haspopup={centre ? "dialog" : undefined}
        onClick={() => onSelect(index)}
        onPointerEnter={(e) => {
          if (e.pointerType !== "mouse") return;
          const mx = e.movementX || (Math.random() > 0.5 ? 4 : -4);
          onHover(index, Math.max(-60, Math.min(60, mx * 7)));
        }}
        className={`absolute inset-0 block rounded-[18px] outline-none transition-opacity duration-200 focus-visible:ring-1 focus-visible:ring-accent/70 focus-visible:ring-offset-4 focus-visible:ring-offset-[#0a0a0a] ${taken ? "opacity-0" : "opacity-100"}`}
        style={{ cursor: centre ? "pointer" : "grab" }}
      >
        <span ref={refs.shirt} className="absolute inset-0 block">
          {parts.map((pc, k) => (
            <div
              key={pc.key}
              ref={refs.swing(k)}
              className="absolute top-0 will-change-transform"
              style={{ left: pc.left, width: pc.width, height: h, transformOrigin: `50% ${pivotY.toFixed(2)}px` }}
            >
              <PieceArt pc={pc} h={h} filter={filter}>
                <PieceImage src={pc.src} alt={pc.alt} sizes={RAIL_SIZES[pc.key]} eager={eager} priority={priority} filter={filter} />
              </PieceArt>
            </div>
          ))}
        </span>
      </button>
    </div>
  );
});
