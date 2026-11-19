"use client";

import { useEffect } from "react";

/* ------------------------------------------------------------------ */
/*  Zaključavanje pomicanja stranice dok je list/prozor otvoren.        */
/*                                                                      */
/*  NE mijenjamo overflow na <html>/<body> (to preračuna raspored cijele */
/*  stranice baš u trenutku otvaranja, a ljepljivo zaglavlje "nestane"). */
/*  Umjesto toga blokiramo kotačić / dodir / tipke IZVAN dijaloga.       */
/*  Unutar dijaloga se smije listati samo element koji se stvarno može   */
/*  pomicati (inače bi iOS "povukao" stranicu iza).                      */
/*                                                                      */
/*  Brojač: više otvorenih slojeva odjednom = jedno zaključavanje.       */
/*  Dok je zaključano: html.fl-overlay-open (pauzira beskonačne CSS      */
/*  animacije) i pauzirani video iza (matirani zaslon ostaje jeftin).    */
/* ------------------------------------------------------------------ */

const ALLOW = "[role=dialog],[data-scroll-lock-allow]";

let count = 0;
let teardown: (() => void) | null = null;

function scrollableWithin(target: Element, boundary: Element, dy: number) {
  let el: Element | null = target;
  while (el && el !== boundary.parentElement) {
    if (el instanceof HTMLElement) {
      const oy = getComputedStyle(el).overflowY;
      if ((oy === "auto" || oy === "scroll") && el.scrollHeight > el.clientHeight + 1) {
        // Na vrhu i vučeš prema dolje (ili na dnu i vučeš gore) → ne pusti lanac na stranicu.
        if (dy < 0 && el.scrollTop <= 0) return false;
        if (dy > 0 && el.scrollTop + el.clientHeight >= el.scrollHeight - 1) return false;
        return true;
      }
    }
    if (el === boundary) break;
    el = el.parentElement;
  }
  return false;
}

function engage() {
  const root = document.documentElement;
  let lastY = 0;

  const onWheel = (e: WheelEvent) => {
    const t = e.target instanceof Element ? e.target : null;
    const box = t?.closest(ALLOW);
    if (!t || !box || !scrollableWithin(t, box, e.deltaY)) e.preventDefault();
  };
  const onTouchStart = (e: TouchEvent) => {
    lastY = e.touches[0]?.clientY ?? 0;
  };
  const onTouchMove = (e: TouchEvent) => {
    const t = e.target instanceof Element ? e.target : null;
    const box = t?.closest(ALLOW);
    const y = e.touches[0]?.clientY ?? lastY;
    const dy = lastY - y; // >0 = prst ide gore = sadržaj ide dolje
    lastY = y;
    if (!t || !box || !scrollableWithin(t, box, dy)) {
      if (e.cancelable) e.preventDefault();
    }
  };
  const onKey = (e: KeyboardEvent) => {
    if (!["PageDown", "PageUp", "Space", "ArrowDown", "ArrowUp", "Home", "End"].includes(e.code)) return;
    const t = e.target instanceof Element ? e.target : null;
    if (t?.closest(ALLOW) || (t && /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName))) return;
    e.preventDefault();
  };

  root.classList.add("fl-overlay-open");
  const playing = Array.from(document.querySelectorAll<HTMLVideoElement>("video")).filter(
    (v) => !v.paused && !v.closest(ALLOW)
  );
  playing.forEach((v) => v.pause());

  document.addEventListener("wheel", onWheel, { passive: false });
  document.addEventListener("touchstart", onTouchStart, { passive: true });
  document.addEventListener("touchmove", onTouchMove, { passive: false });
  document.addEventListener("keydown", onKey);

  return () => {
    document.removeEventListener("wheel", onWheel);
    document.removeEventListener("touchstart", onTouchStart);
    document.removeEventListener("touchmove", onTouchMove);
    document.removeEventListener("keydown", onKey);
    root.classList.remove("fl-overlay-open");
    playing.forEach((v) => {
      v.play().catch(() => {});
    });
  };
}

/** Imperativno: zaključaj pomicanje. Vraća funkciju za otključavanje (sigurno je pozvati više puta). */
export function lockScroll(): () => void {
  if (typeof document === "undefined") return () => {};
  count += 1;
  if (count === 1) teardown = engage();
  let released = false;
  return () => {
    if (released) return;
    released = true;
    count = Math.max(0, count - 1);
    if (count === 0 && teardown) {
      teardown();
      teardown = null;
    }
  };
}

/** Hook: zaključava pomicanje stranice dok je `locked` true. */
export function useScrollLock(locked: boolean) {
  useEffect(() => {
    if (!locked) return;
    return lockScroll();
  }, [locked]);
}
