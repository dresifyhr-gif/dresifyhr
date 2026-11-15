"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { ShoppingBag, X } from "lucide-react";

// Podaci dolaze s /api/social-proof (stvarne narudžbe, anonimizirano na serveru).
// `t` (epoch ms) ili `agoMin` koristimo ako ih API vrati; inače samo `agoHours`.
type ProofItem = {
  name?: string;
  city: string;
  product: string;
  agoHours?: number;
  agoMin?: number;
  t?: number;
};

const SESSION_KEY = "dresify_sp_shown";
const VISIBLE_MS = 4000;
const FIRST_DELAY_MS = 2500;
// Anketa samo dok je tab vidljiv i ne češće od ovoga (server ionako kešira).
const POLL_MS = 180_000;
const MIN_REFETCH_MS = 60_000;

// Samo naslovnica i katalog — nikad stranica dresa, košarica ni narudžba.
function isAllowedPath(path: string | null): boolean {
  const p = (path || "/").replace(/\/$/, "") || "/";
  return p === "/" || p === "/dresovi" || p.startsWith("/dresovi/");
}

let shownInMemory = false; // rezerva ako sessionStorage nije dostupan (privatni način)
function alreadyShown(): boolean {
  if (shownInMemory) return true;
  try { return sessionStorage.getItem(SESSION_KEY) === "1"; } catch { return false; }
}
function markShown() {
  shownInMemory = true;
  try { sessionStorage.setItem(SESSION_KEY, "1"); } catch { /* ignore */ }
}

// Stvarno relativno vrijeme. Bez točnog vremena ne pišemo ništa (nikad lažno "upravo sada").
function relativeTime(it: ProofItem): string {
  let minutes: number | null = null;
  if (typeof it.t === "number" && it.t > 0) minutes = Math.max(0, Math.round((Date.now() - it.t) / 60_000));
  else if (typeof it.agoMin === "number") minutes = Math.max(0, Math.round(it.agoMin));
  else if (typeof it.agoHours === "number" && it.agoHours >= 1) minutes = Math.round(it.agoHours) * 60;
  if (minutes === null) return "";
  if (minutes < 60) return `prije ${Math.max(1, minutes)} min`;
  const h = Math.round(minutes / 60);
  if (h < 24) return `prije ${h} h`;
  const d = Math.round(h / 24);
  return d === 1 ? "jučer" : `prije ${d} dana`;
}

// Tanka obavijest u jednom redu: "Nova narudžba · Mjesto — Proizvod · prije 5 min".
// Najviše jednom po posjetu, samo na naslovnici/katalogu, nestaje nakon 4 s.
export function SocialProof() {
  const pathname = usePathname();
  const allowed = isAllowedPath(pathname);

  const [current, setCurrent] = useState<ProofItem | null>(null);
  const [visible, setVisible] = useState(false);
  const doneRef = useRef(false);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const mountedAt = useRef(Date.now());

  useEffect(() => {
    const list = timers.current;
    return () => list.forEach(clearTimeout);
  }, []);

  // Odlazak na stranicu gdje se ne prikazuje → odmah sakrij.
  useEffect(() => {
    if (!allowed) setVisible(false);
  }, [allowed]);

  useEffect(() => {
    if (!allowed || doneRef.current || alreadyShown()) return;
    let alive = true;
    let lastFetch = 0;
    let poll: ReturnType<typeof setInterval> | undefined;

    const stop = () => {
      if (poll) clearInterval(poll);
      document.removeEventListener("visibilitychange", onVisible);
    };

    const show = (it: ProofItem) => {
      if (!alive || doneRef.current || alreadyShown()) return;
      doneRef.current = true;
      markShown();
      stop();
      setCurrent(it);
      setVisible(true);
      timers.current.push(setTimeout(() => setVisible(false), VISIBLE_MS));
    };

    const fetchFresh = async () => {
      if (doneRef.current) return;
      lastFetch = Date.now();
      try {
        const res = await fetch("/api/social-proof/");
        if (!res.ok) return;
        const data = await res.json();
        if (!alive || !Array.isArray(data.items)) return;
        // API vraća najnovije prvo — dovoljna je jedna.
        const it = (data.items as ProofItem[]).find((x) => x && x.product);
        if (!it) return;
        const wait = Math.max(0, FIRST_DELAY_MS - (Date.now() - mountedAt.current));
        timers.current.push(setTimeout(() => show(it), wait));
      } catch {
        /* ignore */
      }
    };

    function onVisible() {
      if (document.visibilityState === "visible" && Date.now() - lastFetch > MIN_REFETCH_MS) fetchFresh();
    }

    fetchFresh();
    poll = setInterval(() => {
      if (document.visibilityState === "visible") fetchFresh();
    }, POLL_MS);
    document.addEventListener("visibilitychange", onVisible);

    return () => {
      alive = false;
      stop();
    };
  }, [allowed]);

  if (!current || !allowed) return null;

  const when = relativeTime(current);

  return (
    <div
      role="status"
      aria-live="polite"
      className={`sp-toast fixed left-3 right-[76px] z-40 transition-[opacity,transform] duration-300 ease-out sm:right-auto md:left-6 ${
        visible ? "translate-y-0 opacity-100" : "pointer-events-none translate-y-2 opacity-0"
      }`}
    >
      <div className="flex h-11 max-w-[440px] items-center rounded-full border border-white/10 bg-[#111] pl-3.5 text-[12px] leading-none">
        <ShoppingBag strokeWidth={1.5} className="mr-2 h-3.5 w-3.5 shrink-0 text-accent" aria-hidden="true" />
        <p className="min-w-0 flex-1 truncate">
          <span className="font-semibold text-white">Nova narudžba</span>
          <span className="text-white/45"> · </span>
          {current.city ? <span className="text-white/60">{current.city} — </span> : null}
          <span className="text-white/85">{current.product}</span>
        </p>
        {when ? <span className="ml-1.5 shrink-0 text-white/40">· {when}</span> : null}
        <button
          type="button"
          onClick={() => setVisible(false)}
          aria-label="Zatvori obavijest"
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-white/40 transition-colors hover:text-white/80"
        >
          <X strokeWidth={1.75} className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
