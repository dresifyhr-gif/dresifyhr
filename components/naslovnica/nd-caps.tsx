"use client";

import { forwardRef, useImperativeHandle, useRef } from "react";
import Image from "next/image";

import { ChromeDefs, ChromeLeg, clubLabel } from "./nd-balls";

/* ------------------------------------------------------------------ */
/*  Kromirani stalak za kape (isti "namještaj" kao stalak za lopte):   */
/*  dvije noge s utegnutim stopama, prečke u redovima, a na svakoj      */
/*  prečki kukice o kojima vise prave kape (izrezane iz fotografija    */
/*  studijskih HD fotografija → public/naslovnica/kape-hd/<klub>.webp). */
/*  Kape nisu fizička tijela: dodir → mali zamah oko kukice,           */
/*  dvaput → "Složi svoj mix" (onPick).                                 */
/* ------------------------------------------------------------------ */

/** Kape na stalku (red po red, slijeva). Mobitel: 2 × 3, desktop: 2 × 4. */
export const STAND_CAPS = ["hrvatska", "real-madrid", "barcelona", "milan", "portugal", "bayern", "inter-miami", "njemacka"] as const;

export const capSrc = (key: string) => `/naslovnica/kape-hd/${key}.webp`;

export type CapLayout = { cols: number; rows: number; capW: number; capH: number; pitch: number; rowPitch: number; pad: number; top: number; w: number; h: number };

/** capW: širina kape (px) — bira je pod prema širini ekrana da oba stalka stanu. */
export function capLayout(desktop: boolean, capWIn?: number): CapLayout {
  const cols = desktop ? 4 : 3;
  const rows = 2;
  const capW = capWIn ?? (desktop ? 66 : 47);
  const capH = Math.round(capW * 0.86);
  const pitch = capW + (desktop ? 8 : 5);
  const rowPitch = capH + (desktop ? 10 : 7);
  const pad = desktop ? 14 : 10; // od noge do prve kukice
  const top = desktop ? 10 : 8; // gornja prečka
  const w = cols * pitch + pad * 2 - (pitch - capW);
  const h = top + rows * rowPitch + (desktop ? 26 : 20);
  return { cols, rows, capW, capH, pitch, rowPitch, pad, top, w, h };
}

/** Kukice (gdje kapa visi) relativno na gornji lijevi kut stalka. */
export function capSlots(L: CapLayout) {
  const out: { x: number; y: number }[] = [];
  for (let r = 0; r < L.rows; r++) for (let c = 0; c < L.cols; c++) out.push({ x: L.pad + c * L.pitch + L.capW / 2, y: L.top + r * L.rowPitch });
  return out;
}

export type CapStandHandle = { swingNear: (x: number, force?: number) => void };

export const CapStand = forwardRef<CapStandHandle, { desktop: boolean; capW?: number; onPick: (club: string) => void; reduce: boolean }>(function CapStand(
  { desktop, capW, onPick, reduce },
  ref
) {
  const L = capLayout(desktop, capW);
  const slots = capSlots(L);
  const caps = STAND_CAPS.slice(0, L.cols * L.rows);
  const els = useRef<(HTMLSpanElement | null)[]>([]);
  const lastTap = useRef<{ i: number; t: number } | null>(null);
  const legX = [3, L.w - 3];

  const swing = (i: number, force = 1) => {
    const el = els.current[i];
    if (!el || reduce) return;
    el.style.setProperty("--k", String(Math.max(0.35, Math.min(1, force))));
    el.classList.remove("nd-capswing");
    void el.offsetWidth;
    el.classList.add("nd-capswing");
  };

  useImperativeHandle(ref, () => ({
    swingNear: (x: number, force = 0.8) => {
      slots.forEach((s, i) => {
        const d = Math.abs(s.x - x);
        if (i < caps.length && d < L.pitch * 1.1) swing(i, force * (1 - d / (L.pitch * 1.6)));
      });
    }
  }));

  const onTap = (i: number) => {
    const now = performance.now();
    if (lastTap.current && lastTap.current.i === i && now - lastTap.current.t < 360) {
      lastTap.current = null;
      onPick(caps[i]);
      return;
    }
    lastTap.current = { i, t: now };
    if (reduce) onPick(caps[i]);
    else swing(i);
  };

  return (
    <div className="relative" style={{ width: L.w, height: L.h }}>
      <svg width={L.w} height={L.h} viewBox={`0 0 ${L.w} ${L.h}`} className="absolute inset-0 overflow-visible" aria-hidden>
        <ChromeDefs />
        <ellipse cx={L.w / 2} cy={L.h - 1} rx={L.w * 0.6} ry={9} fill="url(#ndc-led)" />
        <ellipse cx={L.w / 2} cy={L.h - 1.5} rx={L.w * 0.52} ry={4.5} fill="url(#ndc-shadow)" />
        {/* stražnja ploča: tamno "staklo" (lažirano) da kape imaju pozadinu */}
        <rect x={legX[0] + 2} y={L.top} width={legX[1] - legX[0] - 4} height={L.rows * L.rowPitch - 4} rx={6} fill="url(#ndc-panel)" />
        <rect x={legX[0] + 2.5} y={L.top + 0.5} width={legX[1] - legX[0] - 5} height={L.rows * L.rowPitch - 5} rx={5.5} fill="none" stroke="#fff" strokeOpacity=".06" />
        {legX.map((x) => (
          <ChromeLeg key={x} x={x} y0={L.top - 4} y1={L.h} t={desktop ? 4 : 3.4} />
        ))}
        {/* prečke + kukice */}
        {Array.from({ length: L.rows }, (_, r) => {
          const y = L.top + r * L.rowPitch;
          const t = desktop ? 4.6 : 3.8;
          return (
            <g key={r}>
              <rect x={legX[0]} y={y - t / 2} width={legX[1] - legX[0]} height={t} rx={t / 2} fill="url(#ndc-tube)" />
              <rect x={legX[0] + 3} y={y - t * 0.32} width={legX[1] - legX[0] - 6} height={0.8} rx={0.4} fill="#fff" opacity=".8" />
              {slots
                .filter((s) => s.y === y)
                .map((s) => (
                  <g key={s.x}>
                    <path d={`M ${s.x} ${y + t / 2 - 0.5} v 3.2 q 0 2.4 2.2 2.4`} fill="none" stroke="#c9ccd1" strokeWidth="1.2" strokeLinecap="round" />
                  </g>
                ))}
            </g>
          );
        })}
        {/* donja prečka (nisko, iza kapa) */}
        <rect x={legX[0]} y={L.h - 10} width={legX[1] - legX[0]} height={2.4} rx={1.2} fill="url(#ndc-tube)" opacity=".75" />
        {/* završni čepovi gore */}
        {legX.map((x) => (
          <circle key={`c${x}`} cx={x} cy={L.top - 4} r={desktop ? 3.4 : 2.8} fill="url(#ndc-foot)" />
        ))}
      </svg>
      {caps.map((key, i) => {
        const s = slots[i];
        return (
          <button
            key={key}
            type="button"
            onClick={() => onTap(i)}
            aria-label={`Kapa ${clubLabel(key)} — dvaput dodirni za mix`}
            className="nd-cap absolute"
            style={{ left: s.x - L.capW / 2, top: s.y + 2, width: L.capW, height: L.capH }}
          >
            <span ref={(el) => { els.current[i] = el; }} className="nd-cap-in relative block h-full w-full">
              <Image src={capSrc(key)} alt="" fill sizes={`${L.capW}px`} quality={88} draggable={false} className="pointer-events-none select-none object-contain object-top" />
            </span>
          </button>
        );
      })}
    </div>
  );
});
