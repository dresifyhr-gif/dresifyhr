"use client";

import { useEffect, useRef, type MutableRefObject } from "react";

import type { Lay, Piece } from "@/components/product/hanger-layout";
import type { StageApi } from "@/components/product/three/hanger-3d";

import { ImeEngine, type TagSpec } from "./ime-engine";

// Kopija components/product/three/hanger-3d.tsx za demo "ime": ImeEngine (prozirno platno +
// etiketa s cijenom), dodir na etiketu je okreće (raspon veličina na poleđini).


export type ImeHanger3DProps = {
  tag: TagSpec | null;
  pieces: Piece[];
  mobile: Lay;
  desktop: Lay;
  flipIdx: number;
  kid: boolean;
  /** 3D je vidljiv (pretopljen preko 2D) → etiketa tada padne na mjesto. */
  revealed: boolean;
  initialSide: 0 | 1;
  onSide: (s: 0 | 1) => void;
  onTouched: () => void;
  apiRef: MutableRefObject<StageApi | null>;
  onFirstFrame: () => void;
  onFail: () => void;
};

const isDesk = () => window.matchMedia("(min-width: 1024px)").matches;

export function ImeHanger3D(props: ImeHanger3DProps) {
  const { pieces, mobile, desktop, flipIdx, kid, apiRef } = props;
  const wrapRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engRef = useRef<ImeEngine | null>(null);
  const cbs = useRef(props);
  cbs.current = props;
  const kidRef = useRef(kid);
  kidRef.current = kid;

  useEffect(() => {
    const canvas = canvasRef.current;
    const wrap = wrapRef.current;
    if (!canvas || !wrap) return;
    let eng: ImeEngine;
    try {
      eng = new ImeEngine(canvas, pieces, isDesk() ? desktop : mobile, flipIdx, cbs.current.initialSide, kidRef.current, {
        onSide: (s) => cbs.current.onSide(s),
        onFirstFrame: () => cbs.current.onFirstFrame(),
        onFail: () => cbs.current.onFail(),
      }, cbs.current.tag);
    } catch (e) {
      console.warn("[hanger3d] init failed", e);
      cbs.current.onFail();
      return;
    }
    engRef.current = eng;
    apiRef.current = { flip: () => eng.flip(), show: (s) => eng.show(s) };

    const size = () => {
      const r = wrap.getBoundingClientRect();
      if (r.width < 2 || r.height < 2) return;
      // mobitel: najviše 1,5× (dovoljno oštro za tkaninu, ~45 % manje piksela nego 2×)
      eng.resize(r.width, r.height, Math.min(window.devicePixelRatio || 1, isDesk() ? 2 : 1.5));
      eng.setLayout(isDesk() ? desktop : mobile);
    };
    size();
    const ro = new ResizeObserver(size);
    ro.observe(wrap);
    const io = new IntersectionObserver((es) => eng.setVisible(es[0]?.isIntersecting ?? true), { rootMargin: "80px" });
    io.observe(wrap);
    const vis = () => eng.setVisible(!document.hidden);
    document.addEventListener("visibilitychange", vis);
    return () => {
      ro.disconnect();
      io.disconnect();
      document.removeEventListener("visibilitychange", vis);
      apiRef.current = null;
      engRef.current = null;
      eng.dispose();
    };
  }, [pieces, mobile, desktop, flipIdx, apiRef]);

  useEffect(() => {
    engRef.current?.setKid(kid);
  }, [kid]);

  useEffect(() => {
    if (props.revealed) engRef.current?.replayTag();
  }, [props.revealed]);

  // Dok je 3D još skriven, korisnik okreće 2D → 3D mora pokazati isto lice.
  useEffect(() => {
    engRef.current?.snapSide(props.initialSide);
  }, [props.initialSide]);

  /* ---- povlačenje: vodoravno okreće, okomito ostaje scroll stranice ---- */
  const drag = useRef<{ id: number; x: number; y: number; on: boolean; lx: number; lt: number; v: number } | null>(null);
  const onDown = (e: React.PointerEvent) => {
    if (e.pointerType === "mouse" && e.button !== 0) return;
    drag.current = { id: e.pointerId, x: e.clientX, y: e.clientY, on: false, lx: e.clientX, lt: e.timeStamp, v: 0 };
  };
  const onMove = (e: React.PointerEvent) => {
    const g = drag.current;
    if (!g || g.id !== e.pointerId) return;
    const w = wrapRef.current?.clientWidth || 340;
    const dx = e.clientX - g.x;
    const dy = e.clientY - g.y;
    if (!g.on) {
      if (Math.abs(dy) > 10 && Math.abs(dy) > Math.abs(dx)) {
        drag.current = null;
        return;
      }
      if (Math.abs(dx) < 6) return;
      g.on = true;
      cbs.current.onTouched();
      const r = wrapRef.current?.getBoundingClientRect();
      engRef.current?.dragStart(r ? (g.x - r.left) / r.width : 0.5);
      try {
        (e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId);
      } catch {
        /* WebKit: neaktivni pokazivač */
      }
    }
    engRef.current?.dragMove(dx / w);
    const dt = Math.max(1, e.timeStamp - g.lt);
    g.v = g.v * 0.6 + (((e.clientX - g.lx) / w) * 1000 / dt) * 0.4;
    g.lx = e.clientX;
    g.lt = e.timeStamp;
  };
  const onUp = (e: React.PointerEvent) => {
    const g = drag.current;
    drag.current = null;
    if (g && g.id === e.pointerId && !g.on && e.type === "pointerup") {
      const r = wrapRef.current?.getBoundingClientRect();
      if (r) engRef.current?.tap((e.clientX - r.left) / r.width, (e.clientY - r.top) / r.height);
      return;
    }
    if (!g || g.id !== e.pointerId || !g.on) return;
    engRef.current?.dragEnd(Math.max(-4, Math.min(4, g.v)));
  };

  return (
    <div
      ref={wrapRef}
      onPointerDown={onDown}
      onPointerMove={onMove}
      onPointerUp={onUp}
      onPointerCancel={onUp}
      className="absolute inset-0 touch-pan-y select-none"
    >
      <canvas ref={canvasRef} className="block h-full w-full" />
    </div>
  );
}
