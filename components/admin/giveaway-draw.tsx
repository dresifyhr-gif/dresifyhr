"use client";

import { useMemo, useRef, useState } from "react";
import type { DrawEntry } from "@/lib/giveaway";

// Fullscreen 9:16 izvlačenje za snimanje ekrana. Weighted bubanj (svaki listić = slot),
// slot-roll animacija → zaključa na pobjedniku + konfeti. Nasumično, pošteno.
export function GiveawayDraw({ entries, totalTickets, participants }: { entries: DrawEntry[]; totalTickets: number; participants: number }) {
  const [winner, setWinner] = useState<DrawEntry | null>(null);
  const [rolling, setRolling] = useState(false);
  const [display, setDisplay] = useState<string>("—");
  const [copied, setCopied] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Weighted pool: svaki listić je jedan slot.
  const pool = useMemo(() => {
    const arr: DrawEntry[] = [];
    for (const e of entries) for (let i = 0; i < e.tickets; i++) arr.push(e);
    return arr;
  }, [entries]);

  function confetti() {
    const cv = canvasRef.current;
    if (!cv) return;
    const ctx = cv.getContext("2d");
    if (!ctx) return;
    cv.width = cv.offsetWidth;
    cv.height = cv.offsetHeight;
    const cols = ["#e8ff3c", "#ffffff", "#4ade80", "#38bdf8", "#f472b6"];
    const parts = Array.from({ length: 160 }, (_, i) => ({
      x: cv.width / 2, y: cv.height * 0.42, vx: (Math.random() - 0.5) * 11, vy: (Math.random() - 0.95) * 12,
      c: cols[i % cols.length], s: 4 + Math.random() * 6, r: Math.random() * 6
    }));
    let frame = 0;
    const tick = () => {
      ctx.clearRect(0, 0, cv.width, cv.height);
      let live = false;
      for (const p of parts) {
        p.vy += 0.32; p.x += p.vx; p.y += p.vy; p.r += 0.2;
        if (p.y < cv.height + 20) live = true;
        ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.r); ctx.fillStyle = p.c;
        ctx.fillRect(-p.s / 2, -p.s / 2, p.s, p.s * 0.6); ctx.restore();
      }
      frame++;
      if (live && frame < 260) requestAnimationFrame(tick); else ctx.clearRect(0, 0, cv.width, cv.height);
    };
    requestAnimationFrame(tick);
  }

  function draw() {
    if (rolling || pool.length === 0) return;
    setRolling(true); setWinner(null); setCopied(false);
    const win = pool[Math.floor(Math.random() * pool.length)];
    let t = 0, delay = 45;
    const step = () => {
      const r = entries[Math.floor(Math.random() * entries.length)];
      setDisplay(r.name || "@" + r.handle);
      t++; delay *= 1.14;
      if (t < 28) setTimeout(step, delay);
      else { setDisplay(win.name || "@" + win.handle); setWinner(win); setRolling(false); confetti(); }
    };
    step();
  }

  function copyWinner() {
    if (!winner) return;
    navigator.clipboard?.writeText(`@${winner.handle}${winner.name ? " (" + winner.name + ")" : ""}`).then(() => {
      setCopied(true); setTimeout(() => setCopied(false), 2000);
    });
  }

  return (
    <div className="mx-auto flex w-full max-w-[420px] flex-col items-center">
      <div className="relative flex aspect-[9/16] w-full flex-col items-center justify-between overflow-hidden rounded-[26px] bg-[#0b0b0b] px-6 py-8" style={{ boxShadow: "0 0 0 6px #1c1c1c" }}>
        <canvas ref={canvasRef} className="pointer-events-none absolute inset-0 h-full w-full" />

        <div className="text-center">
          <div className="text-[15px] font-bold uppercase tracking-[0.34em] text-white">DRESIFY</div>
          <div className="mt-1.5 text-[11px] font-semibold uppercase tracking-[0.2em] text-[#e8ff3c]">Izvlačenje · PS5 + FC 27</div>
        </div>

        <div className="flex w-full flex-col items-center">
          <div className="mb-4 text-[11px] uppercase tracking-[0.2em] text-white/45">{winner ? "Pobjednik" : "Bubanj"}</div>
          <div className="flex min-h-[110px] w-full flex-col items-center justify-center rounded-[16px] border px-4 text-center" style={{ borderColor: winner ? "#e8ff3c" : "#232323", background: "#141414" }}>
            <div className="text-[26px] font-bold leading-tight" style={{ color: winner ? "#e8ff3c" : "#ffffff" }}>{display}</div>
            {winner && (
              <div className="mt-2 text-[12px] text-white/55">
                @{winner.handle} · {winner.registered ? `kupac · ${winner.orders} narudžbi` : "pratitelj"} · {winner.tickets} bodova
              </div>
            )}
          </div>
          <div className="mt-4 text-[11px] text-white/40">{participants} sudionika · {totalTickets} bodova u bubnju</div>
        </div>

        <button
          onClick={draw}
          disabled={rolling || pool.length === 0}
          className="z-10 rounded-[12px] bg-[#e8ff3c] px-8 py-3.5 text-[15px] font-bold text-black transition disabled:opacity-50"
        >
          {rolling ? "Vrti se…" : winner ? "Izvuci ponovno" : "Izvuci pobjednika"}
        </button>
      </div>

      {winner && (
        <button onClick={copyWinner} className="mt-4 rounded-[10px] border border-[var(--a-line)] px-4 py-2 text-sm font-medium text-[var(--a-text-2)] hover:text-[var(--a-text)]">
          {copied ? "Kopirano ✓" : "Kopiraj pobjednika"}
        </button>
      )}
      {pool.length === 0 && <p className="mt-4 text-sm text-[var(--a-text-3)]">Još nema prijava — bubanj je prazan.</p>}
    </div>
  );
}
