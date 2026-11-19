"use client";

import { useEffect, useState, type RefObject } from "react";

/** prefers-reduced-motion (prati promjenu). Na serveru: false. */
export function useReducedMotion() {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const on = () => setReduced(mq.matches);
    on();
    mq.addEventListener("change", on);
    return () => mq.removeEventListener("change", on);
  }, []);
  return reduced;
}

/** Jednokratno: true kad element prvi put uđe u ekran (dovoljno vidljiv). */
export function useOnceInView(ref: RefObject<Element | null>, threshold = 0.4, rootMargin = "0px") {
  const [seen, setSeen] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el || seen) return;
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setSeen(true);
          io.disconnect();
        }
      },
      { threshold, rootMargin },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [ref, seen, threshold, rootMargin]);
  return seen;
}

/** Stanje jednokratne animacije kartice: "done" (SSR, mirno) → "pre" (skriveno, čeka ekran) → "play".
 *  Kod reduced-motion ostaje "done" (statična verzija). */
export function useOneShot(ref: RefObject<HTMLElement | null>, threshold = 0.45, key?: string) {
  const reduced = useReducedMotion();
  const [state, setState] = useState<"done" | "pre" | "play">("done");
  const seen = useOnceInView(ref, threshold);
  useEffect(() => {
    if (reduced) return setState("done");
    // jednom po sesiji: već odigrano → ostaje mirno ("done")
    if (key) {
      try {
        if (sessionStorage.getItem(`zive-${key}`)) return;
      } catch {}
    }
    // već na ekranu pri učitavanju? i dalje odigraj (iz "pre" u sljedećem kadru)
    setState((s) => (s === "done" ? "pre" : s));
  }, [reduced, key]);
  useEffect(() => {
    if (!seen || reduced) return;
    if (key) {
      try {
        if (sessionStorage.getItem(`zive-${key}`)) return;
        sessionStorage.setItem(`zive-${key}`, "1");
      } catch {}
    }
    let r2 = 0;
    const r1 = requestAnimationFrame(() => {
      r2 = requestAnimationFrame(() => setState("play"));
    });
    return () => {
      cancelAnimationFrame(r1);
      cancelAnimationFrame(r2);
    };
  }, [seen, reduced, key]);
  return state;
}
