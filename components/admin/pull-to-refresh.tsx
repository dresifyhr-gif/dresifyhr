"use client";

import { useEffect, useRef, useState } from "react";

// Igor 23.11.: "povuci prema dolje i osvježi" kao u pregledniku. Instalirana aplikacija
// (dodano na početni zaslon) to NEMA sama od sebe, pa ga radimo ručno — SAMO u
// instaliranoj aplikaciji, jer obični Safari/Chrome već ima svoj (dvostruko bi smetalo).
const TRIGGER = 70; // px povlačenja (nakon prigušenja) za osvježavanje
const MAX = 110;

function isStandalone() {
  try {
    return (
      window.matchMedia("(display-mode: standalone)").matches ||
      (navigator as unknown as { standalone?: boolean }).standalone === true
    );
  } catch {
    return false;
  }
}

// Je li dodir krenuo u nečemu što se samo pomiče (popis, modal) i nije na vrhu?
function insideScrolled(target: EventTarget | null) {
  let el = target as HTMLElement | null;
  while (el && el !== document.body && el !== document.documentElement) {
    if (el.scrollTop > 0) return true;
    el = el.parentElement;
  }
  return false;
}

export function PullToRefresh() {
  const [pull, setPull] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const pullRef = useRef(0);

  useEffect(() => {
    if (!("ontouchstart" in window) || !isStandalone()) return;
    let startY = 0;
    let startX = 0;
    let active = false;

    const set = (v: number) => {
      pullRef.current = v;
      setPull(v);
    };
    const onStart = (e: TouchEvent) => {
      active = false;
      if (e.touches.length !== 1 || window.scrollY > 0) return;
      if (document.querySelector('[role="dialog"]')) return; // otvoren prozor (npr. slika)
      if (insideScrolled(e.target)) return;
      startY = e.touches[0].clientY;
      startX = e.touches[0].clientX;
      active = true;
    };
    const onMove = (e: TouchEvent) => {
      if (!active) return;
      if (e.touches.length !== 1) { // drugi prst (zoom) → prekini
        active = false;
        set(0);
        return;
      }
      const dy = e.touches[0].clientY - startY;
      const dx = Math.abs(e.touches[0].clientX - startX);
      if (window.scrollY > 0 || (dx > 30 && dx > dy)) {
        active = false;
        set(0);
        return;
      }
      set(dy > 0 ? Math.min(dy * 0.5, MAX) : 0);
    };
    const onEnd = () => {
      if (!active) return;
      active = false;
      if (pullRef.current >= TRIGGER) {
        setRefreshing(true);
        set(TRIGGER);
        window.setTimeout(() => window.location.reload(), 120);
      } else {
        set(0);
      }
    };
    window.addEventListener("touchstart", onStart, { passive: true });
    window.addEventListener("touchmove", onMove, { passive: true });
    window.addEventListener("touchend", onEnd, { passive: true });
    window.addEventListener("touchcancel", onEnd, { passive: true });
    return () => {
      window.removeEventListener("touchstart", onStart);
      window.removeEventListener("touchmove", onMove);
      window.removeEventListener("touchend", onEnd);
      window.removeEventListener("touchcancel", onEnd);
    };
  }, []);

  if (pull <= 0 && !refreshing) return null;
  const ready = pull >= TRIGGER;
  return (
    <div
      aria-hidden
      className="pointer-events-none fixed left-1/2 z-[300] flex h-10 w-10 items-center justify-center rounded-full border border-[var(--a-line)] bg-[var(--a-card)] text-[var(--a-text)] shadow-lg"
      style={{
        transform: `translate(-50%, ${Math.max(pull - 30, 6) + 8}px)`,
        opacity: Math.min(1, pull / 40),
        top: "env(safe-area-inset-top)"
      }}
    >
      <span
        className={refreshing ? "animate-spin" : ""}
        style={refreshing ? undefined : { transform: `rotate(${ready ? 180 : (pull / TRIGGER) * 180}deg)`, transition: "transform .1s" }}
      >
        {refreshing ? "⟳" : "↓"}
      </span>
    </div>
  );
}
