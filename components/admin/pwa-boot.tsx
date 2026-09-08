"use client";

import { useEffect, useRef, useState } from "react";

type Latest = {
  id: string;
  reference: string | null;
  customerName: string;
  total: number;
  itemCount: number;
  createdAt: string;
  status: string;
};

// Kratki "ka-ching" prizvuk (bez audio datoteke — Web Audio).
function chime() {
  try {
    const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AC) return;
    const ctx = new AC();
    const t0 = ctx.currentTime;
    const notes: Array<[number, number]> = [
      [880, 0],
      [1174.66, 0.1],
      [1567.98, 0.2]
    ];
    for (const [freq, at] of notes) {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.value = freq;
      osc.connect(gain);
      gain.connect(ctx.destination);
      gain.gain.setValueAtTime(0.0001, t0 + at);
      gain.gain.exponentialRampToValueAtTime(0.22, t0 + at + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, t0 + at + 0.32);
      osc.start(t0 + at);
      osc.stop(t0 + at + 0.36);
    }
    setTimeout(() => ctx.close().catch(() => {}), 1200);
  } catch {
    /* zvuk je best-effort */
  }
}

const eur = (n: number) => `${(n ?? 0).toFixed(2).replace(".", ",")} €`;

export function PwaBoot() {
  const [toast, setToast] = useState<{ title: string; body: string; url: string } | null>(null);
  const lastIdRef = useRef<string | null>(null);
  const primedRef = useRef(false); // prvi dohvat samo postavlja baseline (bez alarma)
  const notifiedRef = useRef<Set<string>>(new Set()); // dedupe (poll + push) — isti ključ za obje grane

  // 1) Registracija service workera (za push + instalaciju)
  useEffect(() => {
    if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) return;
    navigator.serviceWorker.register("/sw.js").catch(() => {});
  }, []);

  function fire(title: string, body: string, url: string, key: string) {
    if (notifiedRef.current.has(key)) return;
    notifiedRef.current.add(key);
    // zadrži zadnjih ~20 ključeva (dovoljno za dedupe poll+push, bez rasta u nedogled)
    if (notifiedRef.current.size > 40) {
      notifiedRef.current = new Set(Array.from(notifiedRef.current).slice(-20));
    }
    chime();
    setToast({ title, body, url });
    try {
      const n = window.setTimeout(() => setToast((cur) => (cur && cur.url === url ? null : cur)), 9000);
      return () => window.clearTimeout(n);
    } catch {
      /* ignore */
    }
  }

  // 2) Poll zadnje narudžbe → zvuk + toast + broj na ikoni (radi i bez push dozvole)
  useEffect(() => {
    let alive = true;
    let timer: ReturnType<typeof setTimeout>;

    async function tick() {
      try {
        const r = await fetch("/api/admin/orders/latest/", { cache: "no-store" });
        const d = await r.json();
        if (alive && d?.ok) {
          const latest: Latest | null = d.latest;
          // Broj na ikoni aplikacije (Android/desktop)
          if (typeof navigator !== "undefined" && "setAppBadge" in navigator) {
            const badgeApi = navigator as unknown as { setAppBadge: (n?: number) => Promise<void>; clearAppBadge: () => Promise<void> };
            if (d.newCount > 0) badgeApi.setAppBadge(d.newCount).catch(() => {});
            else badgeApi.clearAppBadge?.().catch(() => {});
          }
          if (latest) {
            if (!primedRef.current) {
              lastIdRef.current = latest.id;
              primedRef.current = true;
            } else if (latest.id !== lastIdRef.current) {
              lastIdRef.current = latest.id;
              const ref = latest.reference ? `#${latest.reference}` : "";
              fire(
                "🛒 Nova narudžba!",
                `${latest.customerName || "Kupac"} — ${eur(latest.total)} · ${latest.itemCount} kom ${ref}`.trim(),
                latest.reference ? `/admin/?order=${encodeURIComponent(latest.reference)}` : "/admin/",
                // isti ključ kao push tag ("order-<ref>") → nema dvostrukog alarma
                latest.reference ? `order-${latest.reference}` : latest.id
              );
            }
          }
        }
      } catch {
        /* offline / preskoči */
      }
      if (alive) timer = setTimeout(tick, document.hidden ? 60000 : 25000);
    }
    tick();
    return () => {
      alive = false;
      clearTimeout(timer);
    };
  }, []);

  // 3) Push stigao dok je admin otvoren → isto zvuk + toast (dedupe s pollom po tagu)
  useEffect(() => {
    if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) return;
    const onMsg = (event: MessageEvent) => {
      const data = event.data;
      if (data?.type === "push" && data.data) {
        const p = data.data;
        fire(p.title || "Dresify", p.body || "", p.url || "/admin/", p.tag || p.body || "push");
      }
    };
    navigator.serviceWorker.addEventListener("message", onMsg);
    return () => navigator.serviceWorker.removeEventListener("message", onMsg);
  }, []);

  if (!toast) return null;

  return (
    <button
      type="button"
      onClick={() => {
        window.location.href = toast.url;
      }}
      className="fixed bottom-24 right-4 z-[100] flex max-w-[320px] items-start gap-3 rounded-[14px] border border-[var(--a-line)] bg-[var(--a-card)] px-4 py-3 text-left shadow-lg lg:bottom-6"
      style={{ animation: "dresify-toast-in .25s ease-out" }}
    >
      <span className="text-xl">🛒</span>
      <span className="min-w-0">
        <span className="block text-sm font-bold text-[var(--a-text)]">{toast.title}</span>
        <span className="block truncate text-[12px] text-[var(--a-text-2)]">{toast.body}</span>
        <span className="mt-0.5 block text-[11px] font-semibold text-[var(--a-info)]">Otvori →</span>
      </span>
      <style>{`@keyframes dresify-toast-in{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:none}}`}</style>
    </button>
  );
}
