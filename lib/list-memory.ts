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

type Saved<T> = { state: T; y: number; at: number; href?: string; top?: number };
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
    const href = saved.href;
    const top = saved.top ?? 200;
    const timers: number[] = [];
    let done = false;
    const stop = () => {
      done = true;
    };
    // Cilj je kliknuti dres na istom mjestu na ekranu (sadržaj iznad liste zna narasti nakon učitavanja),
    // a ako ga nema, isti položaj stranice. Ponavljamo ~3 s dok se stranica ne smiri; korisnikov dodir prekida.
    const target = () => {
      if (href) {
        // Isti dres može biti i gore (npr. u vrtuljku) — uzmi pojavu najbližu mjestu gdje je bio kliknut.
        const want = y + top;
        let best: number | null = null;
        const scoped = document.querySelectorAll(`[data-lm="${CSS.escape(id)}"] a[href="${CSS.escape(href)}"]`);
        (scoped.length ? scoped : document.querySelectorAll(`a[href="${CSS.escape(href)}"]`)).forEach((el) => {
          const abs = window.scrollY + el.getBoundingClientRect().top;
          if (best === null || Math.abs(abs - want) < Math.abs(best - want)) best = abs;
        });
        if (best !== null) return Math.max(0, best - top);
      }
      return y;
    };
    window.addEventListener("touchstart", stop, { once: true, passive: true });
    window.addEventListener("wheel", stop, { once: true, passive: true });
    for (const ms of [0, 60, 160, 320, 600, 1000, 1500, 2200, 3000]) {
      timers.push(
        window.setTimeout(() => {
          if (done) return;
          const t = target();
          if (Math.abs(window.scrollY - t) > 3) window.scrollTo({ top: t, left: 0, behavior: "instant" as ScrollBehavior });
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
        const data: Saved<T> = {
          state: snap.current(),
          y: window.scrollY,
          at: Date.now(),
          href: a.getAttribute("href") || undefined,
          top: Math.round(a.getBoundingClientRect().top)
        };
        sessionStorage.setItem(keyOf(id), JSON.stringify(data));
      } catch {
        /* privatni način / pun storage — lista se samo neće vratiti */
      }
    },
    [id]
  );
}
