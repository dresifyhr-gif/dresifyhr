"use client";

import { useCallback, useState } from "react";
import { RotateCcw, Truck, Trophy } from "lucide-react";

import { PROMO_STORAGE_KEY } from "@/components/site/promo-capture";

// 6 football-themed symbols → 12 cards (6 pairs).
const SYMBOLS = ["⚽", "🏆", "🥅", "🧤", "👟", "🎽"];
const ATTEMPT_LIMIT = 12; // flips-of-second-card allowed to still win

type Card = { id: number; symbol: string; matched: boolean };
type Phase = "idle" | "playing" | "win" | "lose" | "claimed";

function buildDeck(): Card[] {
  return [...SYMBOLS, ...SYMBOLS]
    .map((symbol, i) => ({ id: i, symbol, matched: false }))
    .sort(() => Math.random() - 0.5);
}

export function MemoryGame() {
  const [phase, setPhase] = useState<Phase>("idle");
  const [cards, setCards] = useState<Card[]>([]);
  const [flipped, setFlipped] = useState<number[]>([]); // indices currently face-up (not matched)
  const [attempts, setAttempts] = useState(0);
  const [busy, setBusy] = useState(false);

  const start = useCallback(() => {
    setCards(buildDeck());
    setFlipped([]);
    setAttempts(0);
    setBusy(false);
    setPhase("playing");
  }, []);

  const pick = (index: number) => {
    if (busy || phase !== "playing") return;
    if (flipped.includes(index) || cards[index].matched) return;

    const next = [...flipped, index];
    setFlipped(next);

    if (next.length < 2) return;

    // Second card flipped → an attempt
    const attemptNo = attempts + 1;
    setAttempts(attemptNo);
    setBusy(true);

    const [a, b] = next;
    const isMatch = cards[a].symbol === cards[b].symbol;

    setTimeout(() => {
      if (isMatch) {
        const updated = cards.map((c, i) => (i === a || i === b ? { ...c, matched: true } : c));
        setCards(updated);
        setFlipped([]);
        setBusy(false);
        if (updated.every((c) => c.matched)) setPhase("win");
      } else {
        setFlipped([]);
        setBusy(false);
        if (attemptNo >= ATTEMPT_LIMIT) setPhase("lose");
      }
    }, 750);
  };

  const claim = () => {
    try { localStorage.setItem(PROMO_STORAGE_KEY, "DOSTAVA"); } catch {}
    setPhase("claimed");
    setTimeout(() => { window.location.href = "/dresovi"; }, 1400);
  };

  const matchedPairs = cards.filter((c) => c.matched).length / 2;
  const attemptsLeft = ATTEMPT_LIMIT - attempts;

  // ── IDLE ──────────────────────────────────────────────────────────────
  if (phase === "idle") {
    return (
      <div className="flex flex-col items-center gap-6 py-8 text-center">
        <div className="inline-flex h-20 w-20 items-center justify-center rounded-full border border-accent/30 bg-accent/10 text-3xl">
          🧠
        </div>
        <div>
          <h2 className="font-heading text-4xl uppercase tracking-[0.04em] text-white">Spojnica</h2>
          <p className="mt-2 text-sm leading-6 text-white/60">
            Spoji svih 6 parova u najviše {ATTEMPT_LIMIT} pokušaja i osvoji nagradu.
          </p>
        </div>
        <div className="flex flex-col gap-2 rounded-[10px] border border-white/10 bg-white/5 px-6 py-4 text-sm text-white/70">
          <p>🚚 <span className="text-white">Besplatna dostava</span> (na narudžbe od 40€)</p>
          <p className="mt-1 text-xs text-white/40">Zapamti gdje je koji simbol!</p>
        </div>
        <button type="button" onClick={start} className="button-primary px-10">
          Kreni
        </button>
      </div>
    );
  }

  // ── WIN ───────────────────────────────────────────────────────────────
  if (phase === "win") {
    return (
      <div className="flex flex-col items-center gap-6 py-8 text-center">
        <div className="inline-flex h-20 w-20 items-center justify-center rounded-full border border-accent/40 bg-accent/15 text-accent">
          <Trophy className="h-9 w-9" />
        </div>
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-accent">Pobjeda!</p>
          <h2 className="mt-1 font-heading text-4xl uppercase tracking-[0.04em] text-white">
            Sve spojeno u {attempts} pokušaja
          </h2>
          <p className="mt-2 text-sm text-white/60">Osvojio si nagradu:</p>
        </div>
        <button
          type="button"
          onClick={claim}
          className="group flex w-full max-w-sm items-center gap-4 rounded-[12px] border border-white/15 bg-[#111] p-5 text-left transition hover:border-accent/60 hover:bg-accent/5"
        >
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-[10px] bg-accent/10 text-accent">
            <Truck className="h-6 w-6" />
          </div>
          <div>
            <p className="font-semibold text-white">Besplatna dostava</p>
            <p className="text-xs text-white/50">Na narudžbe od 40€ · automatski na blagajni</p>
          </div>
        </button>
      </div>
    );
  }

  // ── CLAIMED ───────────────────────────────────────────────────────────
  if (phase === "claimed") {
    return (
      <div className="flex flex-col items-center gap-4 py-12 text-center">
        <div className="inline-flex h-16 w-16 items-center justify-center rounded-full bg-accent text-black">
          <Trophy className="h-8 w-8" />
        </div>
        <p className="font-heading text-2xl uppercase tracking-[0.04em] text-white">Nagrada aktivirana!</p>
        <p className="text-sm text-white/50">Preusmjeravamo te na dresove…</p>
      </div>
    );
  }

  // ── LOSE ──────────────────────────────────────────────────────────────
  if (phase === "lose") {
    return (
      <div className="flex flex-col items-center gap-5 py-8 text-center">
        <div className="inline-flex h-20 w-20 items-center justify-center rounded-full border border-white/10 bg-white/5 text-white/40">
          <RotateCcw className="h-9 w-9" />
        </div>
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-white/50">Kraj igre</p>
          <h2 className="mt-1 font-heading text-4xl uppercase tracking-[0.04em] text-white">
            Spojio si {matchedPairs}/6
          </h2>
          <p className="mt-2 text-sm text-white/60">
            Potrošio si svih {ATTEMPT_LIMIT} pokušaja. Pokušaj ponovo!
          </p>
        </div>
        <button type="button" onClick={start} className="button-primary px-10">
          Igraj ponovno
        </button>
      </div>
    );
  }

  // ── PLAYING ───────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between text-xs uppercase tracking-[0.22em] text-white/40">
        <span>Parovi: <span className="text-accent">{matchedPairs}/6</span></span>
        <span>Pokušaji: <span className={attemptsLeft <= 3 ? "text-red-400" : "text-accent"}>{attemptsLeft}</span></span>
      </div>

      <div className="grid grid-cols-4 gap-2.5 sm:gap-3">
        {cards.map((card, index) => {
          const isUp = flipped.includes(index) || card.matched;
          return (
            <button
              key={card.id}
              type="button"
              onClick={() => pick(index)}
              disabled={isUp || busy}
              aria-label={isUp ? card.symbol : "Skrivena kartica"}
              className="relative aspect-square"
              style={{ perspective: "600px" }}
            >
              <div
                className="relative h-full w-full transition-transform duration-300"
                style={{ transformStyle: "preserve-3d", transform: isUp ? "rotateY(180deg)" : "none" }}
              >
                {/* Face down */}
                <div
                  className="absolute inset-0 flex items-center justify-center rounded-[10px] border border-white/12 bg-[#141414] text-xl font-bold text-accent/50"
                  style={{ backfaceVisibility: "hidden", WebkitBackfaceVisibility: "hidden" }}
                >
                  ?
                </div>
                {/* Face up */}
                <div
                  className={`absolute inset-0 flex items-center justify-center rounded-[10px] border text-3xl sm:text-4xl transition-colors ${
                    card.matched ? "border-accent bg-accent/15" : "border-white/20 bg-[#fbfbfb]"
                  }`}
                  style={{ backfaceVisibility: "hidden", WebkitBackfaceVisibility: "hidden", transform: "rotateY(180deg)" }}
                >
                  {card.symbol}
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
