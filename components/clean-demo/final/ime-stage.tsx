"use client";

import Image from "next/image";
import { animate, motion, useMotionValue, useMotionValueEvent, useReducedMotion, useTransform } from "framer-motion";
import { useCallback, useEffect, useId, useMemo, useRef, useState, type ComponentType, type MutableRefObject, type ReactNode } from "react";

import type { HangerImages } from "@/lib/data/ormar-hanger";
import { DESK_PAIR, DESK_SOLO, MOBILE_PAIR, MOBILE_SOLO, SH, SW, computeLayout, hangerPieces, type Lay, type Piece } from "@/components/product/hanger-layout";
import { useKidSegment } from "@/components/product/hanger-segment";
import type { StageApi } from "@/components/product/three/hanger-3d";

import type { TagSpec } from "./three/ime-engine";
import type { ImeHanger3DProps } from "./three/ime-hanger-3d";

/* ------------------------------------------------------------------ */
/*  Demo "ime" — kopija d-hanger-stage.tsx (← product/hanger-stage).   */
/*  Razlike: pozornica bilo kojeg omjera (2D u sredini 4:5, 3D preko    */
/*  cijele širine), prozirna pozadina (iza je obrisano prezime), šipka  */
/*  preko cijele širine + HTML nastavak, etiketa s cijenom u 3D,        */
/*  kontrole kao goli tekst s podcrtom.                                 */
/*  Smjer D — kopija components/product/hanger-stage.tsx. Ista 2D/3D   */
/*  logika i isti HangerEngine; promijenjen samo okvir (od ruba do ruba,*/
/*  bez obruba i zaobljenja) i kontrole (goli tekst, bez pilula).       */
/*  Pozornica "na vješalici" (prvi prikaz galerije proizvoda).          */
/*  Server šalje 2D verziju (SVG šipka + fotografije). Nakon prvog      */
/*  prikaza, na sposobnim uređajima se lijeno učita 3D scena (three.js, */
/*  zaseban chunk) istog rasporeda i pretopi se preko 2D — bez pomaka.  */
/*  Jedna vješalica koja se okreće oko kuke (povuci ili "Okreni"),      */
/*  "Djeca" → dječje hlačice na drugoj vješalici. ?3d=0 / ?3d=1.        */
/* ------------------------------------------------------------------ */

const px = (u: number) => `${(u / SW) * 100}%`;
const py = (u: number) => `${(u / SH) * 100}%`;

/* ---------------- 3D: smije li se pokrenuti ---------------- */

function webgl2(strict: boolean) {
  try {
    const c = document.createElement("canvas");
    const gl = c.getContext("webgl2", { failIfMajorPerformanceCaveat: strict }) as WebGL2RenderingContext | null;
    if (!gl) return false;
    let ok = true;
    if (strict) {
      const dbg = gl.getExtension("WEBGL_debug_renderer_info");
      const name = dbg ? String(gl.getParameter(dbg.UNMASKED_RENDERER_WEBGL)) : "";
      if (/swiftshader|llvmpipe|software|basic render/i.test(name)) ok = false;
    }
    gl.getExtension("WEBGL_lose_context")?.loseContext();
    return ok;
  } catch {
    return false;
  }
}

function canRun3D(): boolean {
  if (typeof window === "undefined") return false;
  const q = new URLSearchParams(window.location.search).get("3d");
  if (q === "0") return false;
  if (q === "1") return webgl2(false);
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return false;
  const nav = navigator as Navigator & { deviceMemory?: number; connection?: { saveData?: boolean } };
  if (nav.connection?.saveData) return false;
  const ios = /iP(hone|ad|od)/.test(nav.userAgent) || (nav.platform === "MacIntel" && nav.maxTouchPoints > 1);
  const cores = nav.hardwareConcurrency || 0;
  if (typeof nav.deviceMemory === "number" && nav.deviceMemory <= 2) return false;
  // WebKit na iOS-u javlja najviše 4 jezgre (privatnost) i za iPhone 13 → tamo je prag < 4.
  if (cores > 0 && (ios ? cores < 4 : cores < 4)) return false;
  return webgl2(true);
}

/* ---------------- raspored: tanja šipka preko cijele širine ---------------- */

const FAR = 4000; // šipka ide izvan svakog kadra (nosači su izvan slike)
export function imeLayouts(images: HangerImages) {
  const pieces = hangerPieces(images);
  const solo = pieces.filter((p) => !p.kidOnly).length === 1;
  // "Djeca": pogled se umanji oko same šipke → šipka ostaje na istoj visini, spuštaju se samo vješalice
  const wide = (l: Lay): Lay => ({ ...l, x0: SW / 2 - FAR, x1: SW / 2 + FAR, kid: l.kid ? { ...l.kid, py: l.rodTop + l.rodD / 2 } : null });
  return {
    pieces,
    mobile: wide(computeLayout(pieces, { ...(solo ? MOBILE_SOLO : MOBILE_PAIR), rodD: 11 })),
    desktop: wide(computeLayout(pieces, { ...(solo ? DESK_SOLO : DESK_PAIR), rodD: 9 })),
  };
}

/** Okomiti položaji kao udio visine pozornice (za HTML šipku i prezime iza dresa). */
export function stageFractions(l: Lay) {
  const rail = (l.rodTop + l.rodD / 2) / SH;
  const mid = (l.rodTop + l.floorY) / 2 / SH;
  const k = l.kid;
  const kidY = (y: number) => (k ? (k.py + (y * SH - k.py) * k.k) / SH : y);
  return { rail, railH: l.rodD / SH, mid, kidRail: kidY(rail), kidRailH: (l.rodD * (k?.k ?? 1)) / SH, floor: l.floorY / SH };
}

/* ---------------- šipka (SVG, iza vješalica) ---------------- */

function RodLayer({ lay, pieces, id, className }: { lay: Lay; pieces: Piece[]; id: string; className: string }) {
  const { rodTop: y, rodD: d, x0, x1 } = lay;
  const cy = y + d / 2;
  const drops = [x0 + d * 2.2, x1 - d * 2.2];
  return (
    // overflow: visible → kad se pogled umanji ("Djeca"), strop i nosači se nastavljaju
    // izvan okvira SVG-a (kao u 3D), umjesto da se vidi tvrdi pravokutnik.
    <svg aria-hidden viewBox={`0 0 ${SW} ${SH}`} overflow="visible" className={`ime-rod pointer-events-none absolute inset-0 h-full w-full overflow-visible ${className}`}>
      <defs>
        {/* Okrugla cijev: svijetli odsjaj gore, tamna jezgra, slabi povratni odsjaj dolje */}
        <linearGradient id={`${id}rv`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#6b6f75" />
          <stop offset="0.1" stopColor="#f4f5f7" />
          <stop offset="0.24" stopColor="#d3d6da" />
          <stop offset="0.48" stopColor="#80858b" />
          <stop offset="0.72" stopColor="#26282b" />
          <stop offset="0.88" stopColor="#4b4f55" />
          <stop offset="1" stopColor="#151618" />
        </linearGradient>
        <linearGradient id={`${id}rh`} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#050505" stopOpacity="0.7" />
          <stop offset="0.3" stopColor="#050505" stopOpacity="0" />
          <stop offset="0.7" stopColor="#050505" stopOpacity="0" />
          <stop offset="1" stopColor="#050505" stopOpacity="0.7" />
        </linearGradient>
        <linearGradient id={`${id}hl`} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0.2" stopColor="#fff" stopOpacity="0" />
          <stop offset="0.5" stopColor="#fffaf0" stopOpacity="0.95" />
          <stop offset="0.8" stopColor="#fff" stopOpacity="0" />
        </linearGradient>
        <linearGradient id={`${id}dg`} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#2a2c30" />
          <stop offset="0.32" stopColor="#e6e8eb" />
          <stop offset="0.55" stopColor="#8d9197" />
          <stop offset="1" stopColor="#1e2023" />
        </linearGradient>
        <linearGradient id={`${id}ws`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#000" stopOpacity="0.55" />
          <stop offset="1" stopColor="#000" stopOpacity="0" />
        </linearGradient>
        <linearGradient id={`${id}top`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#0b0b0b" stopOpacity="1" />
          <stop offset="1" stopColor="#0b0b0b" stopOpacity="0" />
        </linearGradient>
        <radialGradient id={`${id}glow`}>
          <stop offset="0" stopColor="#ffecd0" stopOpacity="0.1" />
          <stop offset="0.55" stopColor="#ffecd0" stopOpacity="0.035" />
          <stop offset="1" stopColor="#ffecd0" stopOpacity="0" />
        </radialGradient>
        <radialGradient id={`${id}ct`}>
          <stop offset="0" stopColor="#000" stopOpacity="0.75" />
          <stop offset="1" stopColor="#000" stopOpacity="0" />
        </radialGradient>
        <filter id={`${id}bl`} x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="22" />
        </filter>
      </defs>

      {/* odsjaj poda ispod odjeće */}
      {lay.pieces.map((p, i) => {
        const b = p.faces[0];
        if (pieces[i].kidOnly) return null; // dječje hlačice
        return (
          <g key={i}>
            {/* bez stožca reflektora: 3D scena ga nema → pri zamjeni 2D → 3D nema skoka svjetline */}
            <ellipse cx={p.hx} cy={lay.floorY + 6} rx={b.w * 0.75} ry={46} fill={`url(#${id}glow)`} />
          </g>
        );
      })}


      {/* stropni nosači (cijevi odozgo) */}
      {drops.map((dx, i) => (
        <rect key={i} x={dx - d * 0.3} y={-SH} width={d * 0.6} height={cy + SH} fill={`url(#${id}dg)`} />
      ))}

      {/* cijev */}
      <rect x={x0} y={y} width={x1 - x0} height={d} rx={d / 2} fill={`url(#${id}rv)`} />
      <rect x={x0} y={y} width={x1 - x0} height={d} rx={d / 2} fill={`url(#${id}rh)`} />
      <rect x={x0 + d} y={y + d * 0.13} width={x1 - x0 - 2 * d} height={Math.max(1.5, d * 0.13)} rx={d * 0.06} fill={`url(#${id}hl)`} />
      {[x0, x1].map((ex, i) => (
        <ellipse key={i} cx={ex + (i ? -d * 0.2 : d * 0.2)} cy={cy} rx={d * 0.22} ry={d * 0.5} fill="#1b1c1f" opacity="0.6" />
      ))}

      {/* obujmice nosača preko cijevi */}
      {drops.map((dx, i) => (
        <g key={i}>
          <rect x={dx - d * 0.62} y={y - d * 0.32} width={d * 1.24} height={d * 1.64} rx={d * 0.28} fill={`url(#${id}dg)`} />
          <rect x={dx - d * 0.62} y={y - d * 0.32} width={d * 1.24} height={d * 0.2} rx={d * 0.1} fill="#fff" opacity="0.25" />
        </g>
      ))}

    </svg>
  );
}

/* Dočrtana kromirana kuka za vješalice s prečkom (hlače). */
function HookLayer({ lay, pieces, id, className }: { lay: Lay; pieces: Piece[]; id: string; className: string }) {
  const bars = lay.pieces.filter((_, i) => pieces[i].bar);
  if (!bars.length) return null;
  const d = lay.rodD;
  const cy = lay.rodTop + d / 2;
  const sw = Math.max(2.6, d * 0.22);
  const R = d / 2 + sw * 0.55;
  return (
    <svg aria-hidden viewBox={`0 0 ${SW} ${SH}`} className={`pointer-events-none absolute inset-0 h-full w-full ${className}`}>
      <defs>
        <linearGradient id={`${id}hk`} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#6d7177" />
          <stop offset="0.45" stopColor="#d9dce0" />
          <stop offset="1" stopColor="#8a8e94" />
        </linearGradient>
      </defs>
      {bars.map((p, i) => {
        const b = p.faces[0];
        const x = p.hx;
        const d0 = `M ${x} ${b.t + b.h * 0.012} L ${x} ${cy} A ${R} ${R} 0 0 0 ${x - 2 * R} ${cy} q 0 ${R * 0.9} ${-R * 0.7} ${R * 1.2}`;
        return (
          <g key={i}>
            <path d={d0} fill="none" stroke="#000" strokeOpacity="0.5" strokeWidth={sw + 2} strokeLinecap="round" transform="translate(1.5 2)" />
            <path d={d0} fill="none" stroke={`url(#${id}hk)`} strokeWidth={sw} strokeLinecap="round" />
            <circle cx={x} cy={b.t + b.h * 0.012} r={sw * 1.15} fill="#2b2d31" />
          </g>
        );
      })}
    </svg>
  );
}

/* ---------------- 2D pozornica ---------------- */


const CSS = `
.hs-face{position:absolute;left:var(--ml);top:var(--mt);width:var(--mw);height:var(--mh)}
.hs-shadow{position:absolute;left:var(--msl);top:var(--mst);width:var(--msw);height:3%;background:radial-gradient(ellipse 50% 50% at 50% 50%,rgba(0,0,0,.92),rgba(0,0,0,.45) 42%,rgba(0,0,0,0) 72%)}
.hs-turn{transform-style:preserve-3d;transform-origin:var(--mho) 0}
.hs-slot,.hs-view{transition:transform .9s cubic-bezier(.32,.72,0,1),opacity .6s ease}
.hs-view{transform-origin:var(--mvo)}
.ime-kid .hs-view{transform:scale(var(--mk))}
.ime-kid .hs-slot{transform:translateX(var(--mkx))}
.hs-kidonly{opacity:0;transform:translate(var(--mkx),-7%)!important}
.ime-kid .hs-kidonly{opacity:1;transform:translateX(var(--mkx))!important}
@media (min-width:1024px){
 .hs-face{left:var(--dl);top:var(--dt);width:var(--dw);height:var(--dh)}
 .hs-shadow{left:var(--dsl);top:var(--dst);width:var(--dsw)}
 .hs-turn{transform-origin:var(--dho) 0}
 .hs-view{transform-origin:var(--dvo)}
 .ime-kid .hs-view{transform:scale(var(--dk))}
 .ime-kid .hs-slot{transform:translateX(var(--dkx))}
 .hs-kidonly{transform:translate(var(--dkx),-7%)!important}
 .ime-kid .hs-kidonly{transform:translateX(var(--dkx))!important}
}
@media (prefers-reduced-motion:reduce){.hs-slot,.hs-view{transition:opacity .3s ease}}`;

type S2DProps = {
  pieces: Piece[];
  mobile: Lay;
  desktop: Lay;
  flipIdx: number;
  alt: (label: string) => string;
  onSide: (s: 0 | 1) => void;
  onTouched: () => void;
  apiRef: MutableRefObject<StageApi | null>;
  active: boolean;
  uid: string;
};

function Stage2D({ pieces, mobile, desktop, flipIdx, alt, onSide, onTouched, apiRef, active, uid }: S2DProps) {
  const reduced = useReducedMotion();
  const rot = useMotionValue(0);
  const turn = useTransform(rot, (r) => `rotateY(${r}deg)`);
  const frontOp = useTransform(rot, (r) => (Math.cos((r * Math.PI) / 180) >= 0 ? 1 : 0));
  const backOp = useTransform(rot, (r) => (Math.cos((r * Math.PI) / 180) >= 0 ? 0 : 1));
  const shadowSx = useTransform(rot, (r) => `scaleX(${(0.3 + 0.7 * Math.abs(Math.cos((r * Math.PI) / 180))).toFixed(3)})`);
  const lastSide = useRef<0 | 1>(0);
  useMotionValueEvent(rot, "change", (r) => {
    const s = Math.cos((r * Math.PI) / 180) >= 0 ? 0 : 1;
    if (s !== lastSide.current) {
      lastSide.current = s;
      onSide(s);
    }
  });

  const ref = useRef<HTMLDivElement>(null);
  const drag = useRef<{ id: number; x: number; y: number; r0: number; on: boolean; lx: number; lt: number; v: number } | null>(null);

  const goTo = useCallback(
    (target: number, velocity = 0) => {
      animate(rot, target, reduced ? { duration: 0 } : { type: "spring", stiffness: 120, damping: 17, mass: 1, velocity });
    },
    [rot, reduced],
  );

  useEffect(() => {
    if (flipIdx < 0) return;
    apiRef.current = {
      flip: () => goTo(Math.round(rot.get() / 180) * 180 + 180),
      show: (s) => {
        const k = Math.round((rot.get() - s * 180) / 360);
        goTo(k * 360 + s * 180);
      },
    };
    return () => {
      apiRef.current = null;
    };
  }, [apiRef, goTo, rot, flipIdx]);

  // jednokratni "pogled" da se vidi da se vješalica okreće
  useEffect(() => {
    if (flipIdx < 0 || reduced) return;
    const t = window.setTimeout(() => {
      if (drag.current || rot.get() !== 0 || !active) return;
      animate(rot, [0, -34, 0], { duration: 1.5, ease: [0.45, 0, 0.25, 1], times: [0, 0.4, 1] });
    }, 1100);
    return () => window.clearTimeout(t);
  }, [flipIdx, reduced, rot, active]);

  const onDown = (e: React.PointerEvent) => {
    if (flipIdx < 0 || (e.pointerType === "mouse" && e.button !== 0)) return;
    rot.stop();
    drag.current = { id: e.pointerId, x: e.clientX, y: e.clientY, r0: rot.get(), on: false, lx: e.clientX, lt: e.timeStamp, v: 0 };
  };
  const onMove = (e: React.PointerEvent) => {
    const g = drag.current;
    if (!g || g.id !== e.pointerId) return;
    const dx = e.clientX - g.x;
    const dy = e.clientY - g.y;
    if (!g.on) {
      if (Math.abs(dy) > 10 && Math.abs(dy) > Math.abs(dx)) {
        drag.current = null; // okomito → stranica se scrolla
        return;
      }
      if (Math.abs(dx) < 6) return;
      g.on = true;
      onTouched();
      try {
        (e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId);
      } catch {
        /* WebKit baca NotFoundError za neaktivni pokazivač — okret radi i bez capture */
      }
    }
    const w = ref.current?.clientWidth || 340;
    rot.set(g.r0 + (dx / w) * 220);
    const dt = Math.max(1, e.timeStamp - g.lt);
    g.v = g.v * 0.6 + ((((e.clientX - g.lx) / w) * 220 * 1000) / dt) * 0.4;
    g.lx = e.clientX;
    g.lt = e.timeStamp;
  };
  const onUp = (e: React.PointerEvent) => {
    const g = drag.current;
    drag.current = null;
    if (!g || g.id !== e.pointerId || !g.on) return;
    // Najviše jedno lice po potezu; prag 50° (povlačenje + zalet) odlučuje okret.
    const base = Math.round(g.r0 / 180) * 180;
    const delta = rot.get() + Math.max(-180, Math.min(180, g.v * 0.18)) - base;
    const target = Math.abs(delta) > 50 ? base + Math.sign(delta) * 180 : base;
    goTo(target, Math.max(-900, Math.min(900, g.v)));
  };

  const viewVars = {
    "--mk": String(mobile.kid?.k ?? 1),
    "--dk": String(desktop.kid?.k ?? 1),
    "--mvo": `${px(mobile.kid?.px ?? SW / 2)} ${py(mobile.kid?.py ?? SH / 2)}`,
    "--dvo": `${px(desktop.kid?.px ?? SW / 2)} ${py(desktop.kid?.py ?? SH / 2)}`,
  } as React.CSSProperties;

  const showLabels = flipIdx < 0 && pieces.length > 1;
  const labelPill = "pointer-events-none absolute -translate-x-1/2 whitespace-nowrap text-[12px] text-white/45";

  return (
    <div
      ref={ref}
      onPointerDown={onDown}
      onPointerMove={onMove}
      onPointerUp={onUp}
      onPointerCancel={onUp}
      className="absolute inset-0 touch-pan-y select-none"
      style={{ perspective: 1300 }}
    >
      <style dangerouslySetInnerHTML={{ __html: CSS }} />
      <div className="hs-view absolute inset-0" style={viewVars}>
        <RodLayer lay={mobile} pieces={pieces} id={`${uid}m`} className="lg:hidden" />
        <RodLayer lay={desktop} pieces={pieces} id={`${uid}d`} className="hidden lg:block" />

        {pieces.map((p, i) => {
          const m = mobile.pieces[i];
          const d = desktop.pieces[i];
          const flip = i === flipIdx;
          const slotVars = {
            "--mkx": px(m.kx - m.hx),
            "--dkx": px(d.kx - d.hx),
            "--mho": px(m.hx),
            "--dho": px(d.hx),
          } as React.CSSProperties;
          const shadowVars = {
            "--msl": px(m.hx - m.faces[0].w * 0.46),
            "--mst": py(mobile.floorY - 18),
            "--msw": px(m.faces[0].w * 0.92),
            "--dsl": px(d.hx - d.faces[0].w * 0.46),
            "--dst": py(desktop.floorY - 18),
            "--dsw": px(d.faces[0].w * 0.92),
          } as React.CSSProperties;
          const faces = p.faces.map((f, j) => {
            const mf = m.faces[j];
            const df = d.faces[j];
            const isBack = flip && j === 1;
            return (
              <motion.div
                key={f.key}
                className="hs-face"
                data-vt-to={i === Math.max(0, flipIdx) && j === 0 ? "jersey" : undefined}
                style={{
                  ...({
                    "--ml": px(mf.l), "--mt": py(mf.t), "--mw": px(mf.w), "--mh": py(mf.h),
                    "--dl": px(df.l), "--dt": py(df.t), "--dw": px(df.w), "--dh": py(df.h),
                  } as React.CSSProperties),
                  transformOrigin: `${f.geo.x * 100}% 0`,
                  ...(isBack ? { rotateY: 180 } : null),
                  ...(flip ? { opacity: j === 0 ? frontOp : backOp } : null),
                }}
              >
                <Image
                  src={f.src}
                  alt={alt(f.label)}
                  fill
                  draggable={false}
                  priority={i === 0 && j === 0}
                  loading={p.kidOnly ? "lazy" : i === 0 && j === 0 ? undefined : "eager"}
                  sizes="(max-width: 1023px) 62vw, 30vw"
                  className="pointer-events-none object-contain drop-shadow-[0_18px_22px_rgba(0,0,0,0.55)]"
                />
              </motion.div>
            );
          });
          return (
            <div key={p.key} aria-hidden={p.kidOnly || undefined} className={`hs-slot pointer-events-none absolute inset-0 ${p.kidOnly ? "hs-kidonly" : ""}`} style={slotVars}>
              <motion.div aria-hidden className="hs-shadow" style={{ ...shadowVars, ...(flip ? { transform: shadowSx } : null) }} />
              {flip ? (
                <motion.div className="hs-turn absolute inset-0" style={{ transform: turn }}>
                  {faces}
                </motion.div>
              ) : (
                faces
              )}
            </div>
          );
        })}

        <HookLayer lay={mobile} pieces={pieces} id={`${uid}hm`} className="lg:hidden" />
        <HookLayer lay={desktop} pieces={pieces} id={`${uid}hd`} className="hidden lg:block" />

        {showLabels ? (
          <>
            {pieces.map((p, i) =>
              p.kidOnly ? null : (
                <span key={`m${p.key}`} className={`${labelPill} lg:hidden`} style={{ left: px(mobile.pieces[i].hx), top: py(mobile.labelY) }}>
                  {p.faces[0].label}
                </span>
              ),
            )}
            {pieces.map((p, i) =>
              p.kidOnly ? null : (
                <span key={`d${p.key}`} className={`${labelPill} hidden lg:inline-block`} style={{ left: px(desktop.pieces[i].hx), top: py(desktop.labelY) }}>
                  {p.faces[0].label}
                </span>
              ),
            )}
          </>
        ) : null}
      </div>
    </div>
  );
}

/* ---------------- pozornica (2D + lijeni 3D + kontrole) ---------------- */

type Props = {
  images: HangerImages;
  slug: string;
  alt: (label: string) => string;
  /** Obrisano prezime iza dresa (velika slova). */
  surname: string;
  /** Etiketa s cijenom u 3D (null = bez etikete). */
  tag: TagSpec | null;
  /** Naslov iznad šipke ("YAMAL. BROJ 19."). */
  overline?: ReactNode;
  className?: string;
};

const STAGE_CSS = `
/* Pozornica je viša od okvira i pomaknuta gore tako da šipka bude točno --R ispod zaglavlja
   (bez praznog pojasa iznad naslova); okvir ispod ostaje isti. */
.ime-stage{--r:var(--frm);--R:62px;top:calc((var(--R) - var(--r) * 100%) / (1 - var(--r)));height:calc(100% + (var(--r) * 100% - var(--R)) / (1 - var(--r)))}
@media (min-width:1024px){.ime-stage{--r:var(--frd);--R:84px}}
.ime-fade{-webkit-mask-image:linear-gradient(180deg,#000 0,#000 calc(100% - 120px),transparent 100%);mask-image:linear-gradient(180deg,#000 0,#000 calc(100% - 120px),transparent 100%)}
.ime-stage{--rail:var(--rm);--railh:var(--rmh);--mid:var(--nm)}
.ime-stage.ime-kid{--rail:var(--rmk);--railh:var(--rmkh)}
@media (min-width:1024px){
 .ime-stage{--rail:var(--rd);--railh:var(--rdh);--mid:var(--nd)}
 .ime-stage.ime-kid{--rail:var(--rdk);--railh:var(--rdkh)}
}
.ime-rail{top:var(--rail);height:max(3px,var(--railh-px,0px));transform:translateY(-50%);
 background:linear-gradient(180deg,#f3f3f5 0 17%,#46464a 17% 33%,#eeeef0 33% 50%,#1d1d22 50% 67%,#0a0a10 67% 100%);
 transition:top .9s cubic-bezier(.32,.72,0,1),opacity .5s ease}
.ime-name{top:var(--mid);transform:translateY(-50%)}
@media (min-width:1024px){.ime-namewrap{-webkit-mask-image:linear-gradient(90deg,#000 0,#000 72%,transparent 99%);mask-image:linear-gradient(90deg,#000 0,#000 72%,transparent 99%)}}
.ime-over{bottom:calc(100% - var(--rail) + 18px)}
@media (prefers-reduced-motion:reduce){.ime-rail{transition:none}}
`;

function faceWord(label: string, i: number, n: number) {
  if (/prednj|sprijeda/i.test(label)) return "Prednja";
  if (/leđ/i.test(label)) return "Leđa";
  return n === 2 ? (i === 0 ? "Leđa" : "Prednja") : label;
}

export function ImeStage({ images, slug, alt, surname, tag, overline, className = "" }: Props) {
  const { pieces, mobile, desktop } = useMemo(() => imeLayouts(images), [images]);
  const flipIdx = pieces.findIndex((p) => p.faces.length === 2 && !p.kidOnly);
  const hasKid = pieces.some((p) => p.kidOnly);
  const kidSel = useKidSegment(slug);
  const kid = hasKid && kidSel;
  const uid = useId().replace(/[^a-zA-Z0-9]/g, "");

  const [side, setSide] = useState<0 | 1>(0);
  const onTouched = useCallback(() => {}, []);
  const api2d = useRef<StageApi | null>(null);
  const api3d = useRef<StageApi | null>(null);

  /* ---- lijeni 3D ---- */
  const wrapRef = useRef<HTMLDivElement>(null);
  const [Comp, setComp] = useState<ComponentType<ImeHanger3DProps> | null>(null);
  const [ready, setReady] = useState(false);
  const [revealed, setRevealed] = useState(false);
  const [hide2D, setHide2D] = useState(false);
  const lastTouch = useRef(0);
  const sideAtReveal = useRef<0 | 1>(0);
  const mountT = useRef(0);
  useEffect(() => {
    mountT.current = performance.now();
  }, []);

  useEffect(() => {
    if (!canRun3D()) return;
    let cancelled = false;
    const load = () => {
      if (cancelled) return;
      import("./three/ime-hanger-3d")
        .then((m) => {
          if (!cancelled) setComp(() => m.ImeHanger3D);
        })
        .catch((err) => console.warn("[ime-stage] chunk failed", err));
    };
    const idle = () => {
      const w = window as Window & { requestIdleCallback?: (cb: () => void, o?: { timeout: number }) => number };
      if (w.requestIdleCallback) w.requestIdleCallback(load, { timeout: 2000 });
      else setTimeout(load, 300);
    };
    let t: ReturnType<typeof setTimeout> | undefined;
    const start = () => (t = setTimeout(idle, 250));
    if (document.readyState === "complete") start();
    else window.addEventListener("load", start, { once: true });
    return () => {
      cancelled = true;
      if (t) clearTimeout(t);
      window.removeEventListener("load", start);
    };
  }, []);

  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const on = () => (lastTouch.current = performance.now());
    el.addEventListener("pointerdown", on, { passive: true });
    return () => el.removeEventListener("pointerdown", on);
  }, []);

  // zamjena 2D → 3D tek kad korisnik ne dira pozornicu (i nakon prijelaza s kartice)
  useEffect(() => {
    if (!ready || revealed) return;
    let t: ReturnType<typeof setTimeout>;
    const tryReveal = () => {
      const now = performance.now();
      if (now - lastTouch.current < 1500 || now - mountT.current < 1500 || document.documentElement.classList.contains("ime-vt")) {
        t = setTimeout(tryReveal, 600);
        return;
      }
      sideAtReveal.current = side;
      setRevealed(true);
    };
    tryReveal();
    return () => clearTimeout(t);
  }, [ready, revealed, side]);

  useEffect(() => {
    if (!revealed) return;
    const t = setTimeout(() => setHide2D(true), 750);
    return () => clearTimeout(t);
  }, [revealed]);

  const onFirstFrame = useCallback(() => setReady(true), []);
  const onFail = useCallback(() => {
    setHide2D(false);
    setRevealed(false);
    setReady(false);
    setComp(null);
  }, []);

  const api = () => (revealed ? api3d.current : api2d.current);
  const show = (s: 0 | 1) => api()?.show(s);

  /* ---- prezime: polagani paralaksni pomak (pokazivač + skrol) ---- */
  const nameRef = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    const el = nameRef.current;
    if (!el || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let tx = 0, ty = 0, x = 0, y = 0, raf = 0;
    const loop = () => {
      x += (tx - x) * 0.06;
      y += (ty - y) * 0.06;
      el.style.transform = `translate3d(${x.toFixed(2)}px,${y.toFixed(2)}px,0)`;
      raf = Math.abs(tx - x) + Math.abs(ty - y) > 0.05 ? requestAnimationFrame(loop) : 0;
    };
    const kick = () => {
      if (!raf) raf = requestAnimationFrame(loop);
    };
    const onMove = (e: PointerEvent) => {
      if (e.pointerType !== "mouse") return;
      tx = -(e.clientX / window.innerWidth - 0.5) * 36;
      kick();
    };
    const onScroll = () => {
      ty = Math.min(400, window.scrollY) * 0.22;
      kick();
    };
    window.addEventListener("pointermove", onMove, { passive: true });
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("scroll", onScroll);
    };
  }, []);

  // HTML šipka mora imati istu debljinu kao 3D cijev → px iz stvarne visine pozornice
  const [stageH, setStageH] = useState(0);
  const [isDeskW, setDeskW] = useState(false);
  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => {
      setStageH(el.clientHeight);
      setDeskW(window.matchMedia("(min-width: 1024px)").matches);
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const fm = stageFractions(mobile);
  const fd = stageFractions(desktop);
  const pct = (v: number) => `${(v * 100).toFixed(3)}%`;
  const f = isDeskW ? fd : fm;
  const vars = {
    "--rm": pct(fm.rail),
    "--rmk": pct(fm.kidRail),
    "--rd": pct(fd.rail),
    "--rdk": pct(fd.kidRail),
    "--nm": pct(fm.mid),
    "--nd": pct(fd.mid),
    "--frm": fm.rail.toFixed(4),
    "--frd": fd.rail.toFixed(4),
    "--railh-px": `${Math.round((kid ? f.kidRailH : f.railH) * stageH)}px`,
    containerType: "inline-size",
  } as React.CSSProperties;

  const fp = flipIdx >= 0 ? pieces[flipIdx] : null;
  const letters = Math.max(3, surname.length);
  const nameSize = `min(${(108 / (letters * 0.43)).toFixed(2)}cqw, 64vh)`;

  return (
    <div
      ref={wrapRef}
      className={`ime-stage absolute inset-x-0 select-none ${className} ${kid ? "ime-kid" : ""}`}
      style={vars}
      role="group"
      aria-roledescription="prikaz na vješalici"
      aria-label={pieces.filter((p) => !p.kidOnly || kid).map((p) => p.faces[0].label).join(" i ") + " na vješalici"}
    >
      <style dangerouslySetInnerHTML={{ __html: STAGE_CSS }} />

      {/* prezime: obris, iza svega */}
      <div aria-hidden className="ime-namewrap pointer-events-none absolute inset-0 overflow-hidden">
        <div className="ime-name absolute inset-x-0 flex justify-center">
          <span
            ref={nameRef}
            data-vt-to="name"
            className="ime-outline block whitespace-nowrap leading-[0.8]"
            style={{ fontSize: nameSize }}
          >
            {surname}
          </span>
        </div>
      </div>

      {/* šipka: nastavlja se preko cijele stranice (na računalu i iza stupca s kupnjom) */}
      {/* iznad platna (z-1): jedna jednolika šipka preko cijele širine, bez šava na rubu stupca za kupnju */}
      <div aria-hidden data-vt-to="rail" className="ime-rail pointer-events-none absolute left-0 z-[1] w-[100vw]" />

      <div className="ime-fade absolute inset-0 overflow-hidden">
        <div
          aria-hidden={revealed || undefined}
          className="ime-2d absolute inset-y-0 left-1/2 aspect-[4/5] h-full -translate-x-1/2"
          style={{ opacity: revealed ? 0 : 1, transition: "opacity 700ms ease", visibility: hide2D ? "hidden" : undefined, pointerEvents: revealed ? "none" : undefined }}
        >
          <Stage2D
            pieces={pieces}
            mobile={mobile}
            desktop={desktop}
            flipIdx={flipIdx}
            alt={alt}
            onSide={setSide}
            onTouched={onTouched}
            apiRef={api2d}
            active={!revealed}
            uid={uid}
          />
        </div>

        {Comp ? (
          <div
            aria-hidden
            className="ime-3d absolute inset-0"
            style={{ opacity: revealed ? 1 : 0, transition: "opacity 700ms ease", pointerEvents: revealed ? undefined : "none" }}
          >
            <Comp
              tag={tag}
              pieces={pieces}
              mobile={mobile}
              desktop={desktop}
              flipIdx={flipIdx}
              kid={kid}
              revealed={revealed}
              initialSide={revealed ? sideAtReveal.current : side}
              onSide={setSide}
              onTouched={onTouched}
              apiRef={api3d}
              onFirstFrame={onFirstFrame}
              onFail={onFail}
            />
          </div>
        ) : null}
      </div>

      {overline ? (
        <div data-vt-to="over" className="ime-over pointer-events-none absolute left-5 lg:left-10">
          {overline}
        </div>
      ) : null}

      {fp ? (
        <div className="pointer-events-none absolute inset-x-0 bottom-4 flex justify-center lg:bottom-7">
          <div className="pointer-events-auto flex items-center gap-7" role="group" aria-label="Strana — ili povuci za okret">
            {fp.faces.map((fc, i) => {
              const on = side === i;
              return (
                <button
                  key={fc.key}
                  type="button"
                  onClick={() => show(i as 0 | 1)}
                  aria-pressed={on}
                  className={`relative h-10 text-[13px] tracking-[0.02em] transition-colors duration-200 ${on ? "text-white" : "text-white/45 hover:text-white/80"}`}
                >
                  {faceWord(fc.label, i, fp.faces.length)}
                  <span
                    aria-hidden
                    className={`absolute inset-x-0 bottom-1.5 h-px origin-center bg-[#e8ff3c] transition-transform duration-300 ${on ? "scale-x-100" : "scale-x-0"}`}
                  />
                </button>
              );
            })}
          </div>
          <span aria-live="polite" className="sr-only">
            {fp.faces[side]?.label}
          </span>
        </div>
      ) : null}
    </div>
  );
}
