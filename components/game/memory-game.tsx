"use client";

import { useCallback, useState } from "react";

import { PROMO_STORAGE_KEY } from "@/components/site/promo-capture";

// 6 football-themed symbols → 12 cards (6 pairs).
const SYMBOLS = ["⚽", "🏆", "🥅", "🧤", "👟", "🎽"];
const ATTEMPT_LIMIT = 8; // flips-of-second-card allowed to still win (teže)

type Card = { id: number; symbol: string; matched: boolean };
type Phase = "idle" | "playing" | "win" | "lose" | "claimed";

function buildDeck(): Card[] {
  return [...SYMBOLS, ...SYMBOLS]
    .map((symbol, i) => ({ id: i, symbol, matched: false }))
    .sort(() => Math.random() - 0.5);
}

// Zajednički okvir-konzola (isti stil kao canvas igre).
function Frame({ children, footer }: { children: React.ReactNode; footer?: React.ReactNode }) {
  return (
    <div className="flex justify-center">
      <style>{`
        @keyframes mgShake{0%,100%{transform:translateX(0)}20%{transform:translateX(-5px)}40%{transform:translateX(5px)}60%{transform:translateX(-3px)}80%{transform:translateX(3px)}}
        @keyframes mgPop{0%{transform:scale(1)}45%{transform:scale(1.12)}100%{transform:scale(1)}}
        @keyframes mgFall{to{transform:translateY(320px) rotate(540deg);opacity:.2}}
        .mg-shake{animation:mgShake .32s ease}
        .mg-pop{animation:mgPop .35s ease}
      `}</style>
      <div className="w-full max-w-[400px] overflow-hidden rounded-[22px] border border-white/12 bg-[#05070c] shadow-[0_18px_50px_rgba(0,0,0,0.5)]">
        <div className="flex items-center justify-between bg-black px-[18px] py-[13px]">
          <span className="text-[20px] font-bold tracking-[1px] text-white">DRES<span className="text-accent">IFY</span></span>
          <span className="text-[11px] font-bold uppercase tracking-[2px] text-accent">Spojnica</span>
        </div>
        <div className="relative overflow-hidden px-4 py-5" style={{ background: "radial-gradient(120% 80% at 50% -10%, rgba(232,255,60,0.06), transparent 60%), linear-gradient(#0a1020,#070a12)" }}>
          <div className="pointer-events-none absolute inset-x-0 top-2 text-center text-[9px] font-bold tracking-[6px] text-accent/40">D R E S I F Y &nbsp; A R E N A</div>
          {children}
        </div>
        {footer ? <div className="px-[18px] py-[14px] text-center">{footer}</div> : null}
      </div>
    </div>
  );
}

export function MemoryGame() {
  const [phase, setPhase] = useState<Phase>("idle");
  const [cards, setCards] = useState<Card[]>([]);
  const [flipped, setFlipped] = useState<number[]>([]);
  const [attempts, setAttempts] = useState(0);
  const [busy, setBusy] = useState(false);
  const [wrong, setWrong] = useState<number[]>([]); // par koji se ne poklapa (shake)

  const start = useCallback(() => {
    setCards(buildDeck());
    setFlipped([]);
    setAttempts(0);
    setBusy(false);
    setWrong([]);
    setPhase("playing");
  }, []);

  const pick = (index: number) => {
    if (busy || phase !== "playing") return;
    if (flipped.includes(index) || cards[index].matched) return;

    const next = [...flipped, index];
    setFlipped(next);
    if (next.length < 2) return;

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
        setWrong([a, b]);
        setTimeout(() => { setWrong([]); setFlipped([]); setBusy(false); if (attemptNo >= ATTEMPT_LIMIT) setPhase("lose"); }, 360);
      }
    }, 700);
  };

  const claim = () => {
    try { localStorage.setItem(PROMO_STORAGE_KEY, "GOL10"); } catch {}
    setPhase("claimed");
    setTimeout(() => { window.location.href = "/dresovi"; }, 1400);
  };

  const matchedPairs = cards.filter((c) => c.matched).length / 2;
  const attemptsLeft = ATTEMPT_LIMIT - attempts;

  // ── IDLE ──
  if (phase === "idle") {
    return (
      <Frame footer={<p className="text-[13px] text-white/70">Zapamti gdje je koji simbol 🧠</p>}>
        <div className="flex flex-col items-center gap-4 py-6 text-center">
          <div className="text-[13px] font-bold tracking-[3px] text-accent">DRESIFY SPOJNICA</div>
          <div className="text-[22px] font-extrabold leading-tight text-white">Spoji svih 6 parova</div>
          <p className="max-w-[260px] text-[13px] text-white/70">u najviše {ATTEMPT_LIMIT} pokušaja i osvoji <b className="text-accent">10% popusta</b> (od 20€).</p>
          <button type="button" onClick={start} className="mt-1 rounded-[12px] bg-accent px-9 py-3.5 text-[15px] font-extrabold text-black shadow-[0_8px_24px_rgba(232,255,60,0.25)] transition active:scale-[0.97]">
            KRENI 🧠
          </button>
        </div>
      </Frame>
    );
  }

  // ── WIN ──
  if (phase === "win") {
    return (
      <Frame footer={<p className="text-[11px] text-white/40">Nagrada se sama primijeni na blagajni</p>}>
        <div className="relative flex flex-col items-center gap-3 py-6 text-center">
          {Array.from({ length: 24 }).map((_, i) => (
            <span key={i} aria-hidden className="pointer-events-none absolute top-0 h-2.5 w-1.5 rounded-[1px]"
              style={{ left: `${(i * 4.1) % 100}%`, background: ["#e8ff3c", "#fff", "#ff4d6d", "#3b82f6"][i % 4], animation: `mgFall ${1 + (i % 5) * 0.25}s ease-in ${(i % 7) * 0.08}s forwards` }} />
          ))}
          <div className="text-[13px] font-bold tracking-[3px] text-accent">POBJEDA!</div>
          <div className="text-[24px] font-extrabold leading-tight text-white">Sve spojeno u {attempts} pokušaja</div>
          <button type="button" onClick={claim} className="mt-2 flex w-full max-w-[280px] items-center gap-3 rounded-[12px] border border-accent/40 bg-accent/10 p-4 text-left transition hover:bg-accent/15">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[10px] bg-accent text-black text-xl">🚚</div>
            <div>
              <p className="font-bold text-white">Besplatna dostava</p>
              <p className="text-[11px] text-white/55">Na narudžbe od 40€ · iskoristi na shopu →</p>
            </div>
          </button>
        </div>
      </Frame>
    );
  }

  // ── CLAIMED ──
  if (phase === "claimed") {
    return (
      <Frame>
        <div className="flex flex-col items-center gap-3 py-12 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-accent text-2xl text-black">🏆</div>
          <p className="text-[22px] font-extrabold uppercase text-white">Nagrada aktivirana!</p>
          <p className="text-[13px] text-white/50">Preusmjeravamo te na dresove…</p>
        </div>
      </Frame>
    );
  }

  // ── LOSE ──
  if (phase === "lose") {
    return (
      <Frame>
        <div className="flex flex-col items-center gap-3 py-8 text-center">
          <div className="text-[13px] font-bold tracking-[2px] text-white/60">KRAJ IGRE</div>
          <div className="text-[30px] font-extrabold leading-none text-white">{matchedPairs}/6</div>
          <p className="max-w-[240px] text-[12px] text-white/60">Potrošio si svih {ATTEMPT_LIMIT} pokušaja. Pokušaj ponovo!</p>
          <button type="button" onClick={start} className="mt-1 rounded-[12px] bg-accent px-9 py-3.5 text-[14px] font-extrabold text-black transition active:scale-[0.97]">Igraj ponovno</button>
        </div>
      </Frame>
    );
  }

  // ── PLAYING ──
  return (
    <Frame footer={<p className="text-[12px] text-white/55">Spoji svih 6 parova ⚡</p>}>
      <div className="mb-4 mt-3 flex items-center justify-between text-[11px] font-semibold uppercase tracking-[0.22em] text-white/40">
        <span>Parovi <span className="text-accent">{matchedPairs}/6</span></span>
        <span>Pokušaji <span className={attemptsLeft <= 3 ? "text-red-400" : "text-accent"}>{attemptsLeft}</span></span>
      </div>

      <div className="grid grid-cols-4 gap-2.5">
        {cards.map((card, index) => {
          const isUp = flipped.includes(index) || card.matched;
          const isWrong = wrong.includes(index);
          return (
            <button
              key={card.id}
              type="button"
              onClick={() => pick(index)}
              disabled={isUp || busy}
              aria-label={isUp ? card.symbol : "Skrivena kartica"}
              className={`relative aspect-square ${isWrong ? "mg-shake" : ""} ${card.matched ? "mg-pop" : ""}`}
              style={{ perspective: "600px" }}
            >
              <div className="relative h-full w-full transition-transform duration-300" style={{ transformStyle: "preserve-3d", transform: isUp ? "rotateY(180deg)" : "none" }}>
                {/* Poleđina */}
                <div
                  className="absolute inset-0 flex items-center justify-center rounded-[10px] border border-white/12 text-[10px] font-extrabold tracking-[1px]"
                  style={{ backfaceVisibility: "hidden", WebkitBackfaceVisibility: "hidden", background: "linear-gradient(145deg,#161a24,#0d1018)" }}
                >
                  <span className="text-white/70">DRES<span className="text-accent/70">IFY</span></span>
                </div>
                {/* Lice */}
                <div
                  className={`absolute inset-0 flex items-center justify-center rounded-[10px] border text-3xl sm:text-4xl ${
                    card.matched ? "border-accent bg-accent/15 shadow-[0_0_16px_rgba(232,255,60,0.45)]" : "border-white/20 bg-[#fbfbfb]"
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
    </Frame>
  );
}
