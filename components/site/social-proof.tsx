"use client";

import { useEffect, useRef, useState } from "react";
import { ShoppingBag, X } from "lucide-react";

type ProofItem = {
  name: string;
  city: string;
  product: string;
  agoHours: number;
};

const keyOf = (i: ProofItem) => `${i.name}|${i.city}|${i.product}`;

// Social proof: shows a toast ONLY when a genuinely fresh order lands (last ~20 min)
// while the shopper is on the site — polls the API and shows each new order once.
// Anonymized server-side (first name + city + product).
export function SocialProof() {
  const [current, setCurrent] = useState<ProofItem | null>(null);
  const [visible, setVisible] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  const seen = useRef<Set<string>>(new Set());
  const queue = useRef<ProofItem[]>([]);
  const showing = useRef(false);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const dismissedRef = useRef(false);

  useEffect(() => {
    let alive = true;

    const pump = () => {
      if (dismissedRef.current || showing.current) return;
      const next = queue.current.shift();
      if (!next) return;
      showing.current = true;
      setCurrent(next);
      setVisible(true);
      timers.current.push(
        setTimeout(() => {
          setVisible(false);
          timers.current.push(
            setTimeout(() => {
              showing.current = false;
              pump();
            }, 600)
          );
        }, 6000) // visible 6s
      );
    };

    const fetchFresh = async () => {
      try {
        const res = await fetch("/api/social-proof/");
        if (!res.ok) return;
        const data = await res.json();
        if (!alive || !Array.isArray(data.items)) return;
        // Oldest first so they appear in the order they were placed.
        for (const it of [...data.items].reverse() as ProofItem[]) {
          const k = keyOf(it);
          if (!seen.current.has(k)) {
            seen.current.add(k);
            queue.current.push(it);
          }
        }
        pump();
      } catch {
        /* ignore */
      }
    };

    fetchFresh();
    const poll = setInterval(fetchFresh, 90_000);

    return () => {
      alive = false;
      clearInterval(poll);
      timers.current.forEach(clearTimeout);
    };
  }, []);

  if (dismissed || !current) return null;

  return (
    <div
      className={`fixed bottom-4 left-4 z-40 max-w-[300px] transition-all duration-500 ease-out ${
        visible ? "translate-y-0 opacity-100" : "pointer-events-none translate-y-3 opacity-0"
      }`}
    >
      <div className="relative flex items-start gap-3 rounded-xl border border-white/10 bg-[#111111] px-4 py-3 pr-8 shadow-2xl shadow-black/40">
        <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-accent/15 text-accent">
          <ShoppingBag className="h-4 w-4" />
        </div>
        <div className="min-w-0">
          <p className="text-[13px] leading-5 text-white">
            <span className="font-semibold">{current.name}</span>
            {current.city ? <span className="text-white/60"> iz {current.city}</span> : null}{" "}
            <span className="text-white/60">upravo je naručio</span>
          </p>
          <p className="truncate text-[13px] font-medium text-accent">{current.product}</p>
          <p className="mt-0.5 text-[11px] text-white/40">upravo sada · ✅ potvrđeno</p>
        </div>
        <button
          type="button"
          onClick={() => {
            dismissedRef.current = true;
            setDismissed(true);
          }}
          aria-label="Zatvori"
          className="absolute right-2 top-2 text-white/35 transition hover:text-white/70"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}
