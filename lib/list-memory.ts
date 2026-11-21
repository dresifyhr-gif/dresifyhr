"use client";

// Igor 21.11.: kad iz liste dresova uđeš u dres pa se vratiš (natrag), lista se vrati točno gdje si stao:
// isti filteri, isti broj učitanih dresova ("Prikaži još") i isti položaj na stranici.
// Stanje se sprema samo pri kliku na poveznicu unutar liste, a vraća samo pri navigaciji "natrag/naprijed".
import { useCallback, useEffect, useRef } from "react";

let lastPop = 0;
if (typeof window !== "undefined") {
  window.addEventListener("popstate", () => {
    lastPop = Date.now();
  });
}

type Saved<T> = { state: T; y: number; at: number };
const keyOf = (id: string) => `nv-list:${id}:${window.location.pathname}${window.location.search}`;

export function useListMemory<T>(id: string, snapshot: () => T, restore: (s: T) => void) {
  const snap = useRef(snapshot);
  snap.current = snapshot;
  const restoreRef = useRef(restore);
  restoreRef.current = restore;

  useEffect(() => {
    let saved: Saved<T> | null = null;
    try {
      const raw = sessionStorage.getItem(keyOf(id));
      saved = raw ? (JSON.parse(raw) as Saved<T>) : null;
    } catch {
      saved = null;
    }
    const isBack = Date.now() - lastPop < 4000;
    if (!saved || !isBack || Date.now() - saved.at > 60 * 60 * 1000) return;
    restoreRef.current(saved.state);
    const y = saved.y;
    const timers: number[] = [];
    let done = false;
    const stop = () => {
      done = true;
    };
    // Ako korisnik sam krene skrolati, ne vučemo ga natrag.
    window.addEventListener("touchstart", stop, { once: true, passive: true });
    window.addEventListener("wheel", stop, { once: true, passive: true });
    for (const ms of [0, 60, 160, 320, 600, 1000]) {
      timers.push(
        window.setTimeout(() => {
          if (done) return;
          window.scrollTo({ top: y, left: 0, behavior: "instant" as ScrollBehavior });
          if (Math.abs(window.scrollY - y) < 4 && ms >= 320) done = true;
        }, ms)
      );
    }
    return () => {
      timers.forEach((t) => window.clearTimeout(t));
      window.removeEventListener("touchstart", stop);
      window.removeEventListener("wheel", stop);
    };
  }, [id]);

  // Na klik bilo koje poveznice u listi (kartica dresa) zapamti stanje i položaj.
  return useCallback(
    (e: { target: EventTarget | null }) => {
      const a = (e.target as Element | null)?.closest?.("a[href]");
      if (!a) return;
      try {
        const data: Saved<T> = { state: snap.current(), y: window.scrollY, at: Date.now() };
        sessionStorage.setItem(keyOf(id), JSON.stringify(data));
      } catch {
        /* privatni način / pun storage — lista se samo neće vratiti */
      }
    },
    [id]
  );
}
