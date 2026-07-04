"use client";

import { useEffect, useRef, useState } from "react";
import { ShoppingBag, X } from "lucide-react";

type ProofItem = {
  name: string;
  city: string;
  product: string;
  agoHours: number;
};

function agoLabel(hours: number): string {
  if (hours <= 1) return "prije nekoliko minuta";
  if (hours < 24) return `prije ${hours} h`;
  const days = Math.round(hours / 24);
  if (days === 1) return "jučer";
  return `prije ${days} dana`;
}

// Social proof: cycles real recent purchases (first name + city + product) as a
// small toast in the corner. Data is anonymized server-side via /api/social-proof.
export function SocialProof() {
  const [items, setItems] = useState<ProofItem[]>([]);
  const [index, setIndex] = useState(0);
  const [visible, setVisible] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

  useEffect(() => {
    let alive = true;
    fetch("/api/social-proof/")
      .then((r) => (r.ok ? r.json() : { items: [] }))
      .then((d) => {
        if (alive && Array.isArray(d.items)) setItems(d.items);
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    if (dismissed || items.length === 0) return;

    const clear = () => {
      timers.current.forEach(clearTimeout);
      timers.current = [];
    };

    const show = () => {
      setVisible(true);
      timers.current.push(
        setTimeout(() => {
          setVisible(false);
          timers.current.push(
            setTimeout(() => {
              setIndex((i) => (i + 1) % items.length);
            }, 500)
          );
        }, 5000) // visible 5s
      );
    };

    // First appearance after a short delay, then repeats via index change.
    timers.current.push(setTimeout(show, 4000));
    return clear;
    // re-run when index changes to show the next item
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index, items, dismissed]);

  if (dismissed || items.length === 0) return null;
  const item = items[index];
  if (!item) return null;

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
            <span className="font-semibold">{item.name}</span>
            {item.city ? <span className="text-white/60"> iz {item.city}</span> : null}{" "}
            <span className="text-white/60">naručio je</span>
          </p>
          <p className="truncate text-[13px] font-medium text-accent">{item.product}</p>
          <p className="mt-0.5 text-[11px] text-white/40">{agoLabel(item.agoHours)} · ✅ potvrđeno</p>
        </div>
        <button
          type="button"
          onClick={() => setDismissed(true)}
          aria-label="Zatvori"
          className="absolute right-2 top-2 text-white/35 transition hover:text-white/70"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}
