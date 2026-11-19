"use client";

import { useCallback, useEffect, useRef, useState, type ComponentType, type ReactNode } from "react";

import type { OrmarRailItem } from "@/lib/data/ormar-items";
import type { KompletOption, MixJerseyOpt } from "../nd-mix-sheet";

/* ------------------------------------------------------------------ */
/*  2D → 3D: server uvijek šalje postojeću 2D verziju (šipka + pod).   */
/*  Nakon prvog prikaza i kad je preglednik besposlen, na sposobnim    */
/*  uređajima se dinamički učita three.js (zaseban chunk), 3D scena    */
/*  se nacrta ISPOD 2D sloja iste visine, pa se 2D pretopi u 3D —      */
/*  bez pomaka stranice. Slabiji uređaji / reduced-motion / bez        */
/*  WebGL2 ostaju na 2D. ?3d=0 isključi, ?3d=1 prisili (testiranje).   */
/* ------------------------------------------------------------------ */

type Store3DProps = {
  items: OrmarRailItem[];
  komplets: KompletOption[];
  mix: MixJerseyOpt[];
  totalH: number | null;
  revealed: boolean;
  onFirstFrame: () => void;
  onFail: () => void;
};

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

export function canRun3D(): boolean {
  if (typeof window === "undefined") return false;
  const q = new URLSearchParams(window.location.search).get("3d");
  if (q === "0") return false;
  if (q === "1") return webgl2(false);
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return false;
  const nav = navigator as Navigator & { deviceMemory?: number };
  const ios = /iP(hone|ad|od)/.test(nav.userAgent) || (nav.platform === "MacIntel" && nav.maxTouchPoints > 1);
  const cores = nav.hardwareConcurrency || 0;
  if (typeof nav.deviceMemory === "number" && nav.deviceMemory <= 4) return false;
  // WebKit na iOS-u javlja najviše 4 jezgre (privatnost) i za iPhone 13 → tamo je prag < 4.
  if (cores > 0 && (ios ? cores < 4 : cores <= 4)) return false;
  return webgl2(true);
}

// Otvoren dijalog = aria-modal koji je stvarno na ekranu (zatvoreni izbornici/listovi u
// zaglavlju ostaju u DOM-u s aria-modal, ali skriveni ili izvan ekrana).
function anyOpenDialog() {
  for (const el of document.querySelectorAll<HTMLElement>('[aria-modal="true"]')) {
    if (el.closest("[inert],[aria-hidden='true']")) continue;
    const cs = getComputedStyle(el);
    if (cs.display === "none" || cs.visibility === "hidden" || Number(cs.opacity) === 0) continue;
    const r = el.getBoundingClientRect();
    if (r.width < 2 || r.height < 2 || r.bottom <= 0 || r.right <= 0 || r.top >= window.innerHeight || r.left >= window.innerWidth) continue;
    return true;
  }
  return false;
}

export function NdHero3DGate({
  items,
  komplets,
  mix,
  children,
}: {
  items: OrmarRailItem[];
  komplets: KompletOption[];
  mix: MixJerseyOpt[];
  children: ReactNode; // 2D verzija (fallback)
}) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const [Comp, setComp] = useState<ComponentType<Store3DProps> | null>(null);
  const [totalH, setTotalH] = useState<number | null>(null);
  const [ready, setReady] = useState(false); // 3D je nacrtao prvi kadar
  const [revealed, setRevealed] = useState(false); // 3D vidljiv (pretapanje)
  const [twoD, setTwoD] = useState(true); // 2D još u DOM-u
  const lastTouch = useRef(0);
  const swapW = useRef(0);

  // učitaj 3D tek kad je stranica nacrtana i preglednik besposlen
  useEffect(() => {
    if (!canRun3D()) return;
    let cancelled = false;
    const load = () => {
      if (cancelled) return;
      import("./nd-store-3d")
        .then((m) => {
          if (cancelled) return;
          const el = wrapRef.current;
          if (el) setTotalH(el.getBoundingClientRect().height);
          setComp(() => m.NdStore3D);
        })
        .catch((err) => console.warn("[3d] chunk failed", err));
    };
    const idle = () => {
      const w = window as Window & { requestIdleCallback?: (cb: () => void, o?: { timeout: number }) => number };
      if (w.requestIdleCallback) w.requestIdleCallback(load, { timeout: 2000 });
      else setTimeout(load, 300);
    };
    if (document.readyState === "complete") setTimeout(idle, 250);
    else window.addEventListener("load", () => setTimeout(idle, 250), { once: true });
    return () => {
      cancelled = true;
    };
  }, []);

  // 2D sloj: zapamti zadnji dodir (ne mijenjaj scenu korisniku ispod prsta)
  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const on = () => (lastTouch.current = performance.now());
    el.addEventListener("pointerdown", on, { passive: true });
    el.addEventListener("wheel", on, { passive: true });
    return () => {
      el.removeEventListener("pointerdown", on);
      el.removeEventListener("wheel", on);
    };
  }, []);

  // zamjena: kad je 3D spreman, a korisnik ne dira 2D i nijedan dijalog nije otvoren
  useEffect(() => {
    if (!ready || revealed) return;
    let t: ReturnType<typeof setTimeout>;
    const tryReveal = () => {
      const busy = performance.now() - lastTouch.current < 1500 || anyOpenDialog();
      if (busy) {
        t = setTimeout(tryReveal, 800);
        return;
      }
      swapW.current = window.innerWidth;
      setRevealed(true);
    };
    tryReveal();
    return () => clearTimeout(t);
  }, [ready, revealed]);

  // po završenom pretapanju makni 2D iz DOM-a (3D ima istu visinu → bez pomaka)
  useEffect(() => {
    if (!revealed) return;
    const t = setTimeout(() => setTwoD(false), 750);
    return () => clearTimeout(t);
  }, [revealed]);

  // nakon zamjene: kod promjene širine (rotacija) 3D preuzme vlastitu visinu
  useEffect(() => {
    if (twoD) return;
    const on = () => {
      if (Math.abs(window.innerWidth - swapW.current) > 60) setTotalH(null);
    };
    window.addEventListener("resize", on);
    return () => window.removeEventListener("resize", on);
  }, [twoD]);

  const onFirstFrame = useCallback(() => setReady(true), []);
  const onFail = useCallback(() => {
    setTwoD(true);
    setRevealed(false);
    setReady(false);
    setComp(null);
  }, []);

  return (
    <div ref={wrapRef} className="relative">
      {twoD && (
        <div
          aria-hidden={revealed || undefined}
          style={{ opacity: revealed ? 0 : 1, transition: "opacity 700ms ease", pointerEvents: revealed ? "none" : undefined }}
        >
          {children}
        </div>
      )}
      {Comp && (
        <div
          className={twoD ? "absolute inset-x-0 top-0" : "relative"}
          style={{ opacity: revealed ? 1 : 0, transition: "opacity 700ms ease", pointerEvents: revealed ? undefined : "none" }}
          aria-hidden={!revealed || undefined}
        >
          <Comp items={items} komplets={komplets} mix={mix} totalH={totalH} revealed={revealed} onFirstFrame={onFirstFrame} onFail={onFail} />
        </div>
      )}
    </div>
  );
}
