"use client";

import type { HangerImages } from "@/lib/data/ormar-hanger";

/* ------------------------------------------------------------------ */
/*  Predučitavanje 3D vješalice s kartica kataloga.                     */
/*  - namjera (hover mišem / dodir): odmah chunk + prva slika           */
/*  - kartica u kadru: samo prva slika, u idle vremenu, niski prioritet, */
/*    najviše MAX_CONCURRENT istovremeno i 24 (dodir: 10) ukupno po      */
/*    učitavanju stranice → katalog se ne usporava.                     */
/*  Ne radi ništa na slabim uređajima / saveData / sporoj mreži.        */
/* ------------------------------------------------------------------ */

const MAX_CONCURRENT = 6;
const MAX_VIEWPORT_DESKTOP = 24; // ~60 KB po slici → najviše ~1,5 MB po stranici
const MAX_VIEWPORT_TOUCH = 10; // mobitel: mobilni podaci, manji budžet
const DWELL_MS = 350; // kartica mora ostati u kadru (brzo listanje ne skida ništa)

type Loader = (src: string) => Promise<unknown>;

let allowed: boolean | null = null;
function prefetchAllowed(): boolean {
  if (allowed !== null) return allowed;
  if (typeof window === "undefined") return false;
  const nav = navigator as Navigator & { deviceMemory?: number; connection?: { saveData?: boolean; effectiveType?: string } };
  const q = new URLSearchParams(window.location.search).get("3d");
  allowed =
    q !== "0" &&
    !nav.connection?.saveData &&
    !/(^|-)(2g|3g)$/.test(nav.connection?.effectiveType ?? "") &&
    !(typeof nav.deviceMemory === "number" && nav.deviceMemory <= 2) &&
    !window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  return allowed;
}

/** Prva slika koju 3D stranica proizvoda učita (prednja strana dresa ili jakna kompleta). */
export function firstHangerSrc(h: HangerImages | undefined): string | undefined {
  if (!h) return undefined;
  if (h.kind === "dres") return h.front ?? h.back;
  return h.jakna ?? h.hlace;
}

const queued = new Set<string>();
const queue: Array<{ src: string; load: Loader }> = [];
let running = 0;
let viewportCount = 0;
let maxViewport = -1;
function viewportBudget(): number {
  if (maxViewport < 0) maxViewport = window.matchMedia("(pointer: coarse)").matches ? MAX_VIEWPORT_TOUCH : MAX_VIEWPORT_DESKTOP;
  return maxViewport;
}

function idle(cb: () => void) {
  const w = window as Window & { requestIdleCallback?: (cb: () => void, o?: { timeout: number }) => number };
  if (w.requestIdleCallback) w.requestIdleCallback(cb, { timeout: 3000 });
  else setTimeout(cb, 200);
}

function pump() {
  while (running < MAX_CONCURRENT && queue.length) {
    const job = queue.shift()!;
    running++;
    idle(() => {
      job
        .load(job.src)
        .catch(() => undefined)
        .finally(() => {
          running--;
          pump();
        });
    });
  }
}

/** Kartica u kadru → slika u red (niski prioritet, ograničeno). */
export function queueViewportPrefetch(src: string | undefined, load: Loader) {
  if (!src || queued.has(src) || !prefetchAllowed()) return;
  if (viewportCount >= viewportBudget()) return;
  // čekaj da stranica završi vlastito učitavanje (slike kataloga imaju prednost)
  if (document.readyState !== "complete") {
    window.addEventListener("load", () => queueViewportPrefetch(src, load), { once: true });
    return;
  }
  queued.add(src);
  viewportCount++;
  queue.push({ src, load });
  pump();
}

/** Jedan zajednički IntersectionObserver za sve kartice. */
const targets = new WeakMap<Element, () => void>();
const timers = new WeakMap<Element, ReturnType<typeof setTimeout>>();
let io: IntersectionObserver | null = null;

export function observeCardForPrefetch(el: Element, onVisible: () => void): () => void {
  if (typeof IntersectionObserver === "undefined" || !prefetchAllowed()) return () => undefined;
  if (!io) {
    io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          const t = timers.get(e.target);
          if (e.isIntersecting) {
            if (t) continue;
            timers.set(
              e.target,
              setTimeout(() => {
                timers.delete(e.target);
                const cb = targets.get(e.target);
                io?.unobserve(e.target);
                targets.delete(e.target);
                cb?.();
              }, DWELL_MS),
            );
          } else if (t) {
            clearTimeout(t);
            timers.delete(e.target);
          }
        }
      },
      { rootMargin: "0px 0px 120px 0px", threshold: 0.35 },
    );
  }
  targets.set(el, onVisible);
  io.observe(el);
  return () => {
    const t = timers.get(el);
    if (t) clearTimeout(t);
    timers.delete(el);
    targets.delete(el);
    io?.unobserve(el);
  };
}

/** Namjera (hover / dodir): ne čeka red ni ograničenje. */
export function intentAllowed(): boolean {
  return prefetchAllowed();
}
