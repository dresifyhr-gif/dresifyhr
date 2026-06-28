"use client";

import { useCallback, useEffect, useState } from "react";
import { ArrowRight, Gift, Percent, RotateCcw, Trophy } from "lucide-react";

import { GIFT_STORAGE_KEY } from "@/lib/promo";
import { PROMO_STORAGE_KEY } from "@/components/site/promo-capture";

type Q = { q: string; o: [string, string, string, string]; a: number };

const ALL_QUESTIONS: Q[] = [
  // === SVJETSKA PRVENSTVA ===
  { q: "Koja zemlja je pobijednik SP 2022. u Kataru?", o: ["Francuska", "Brazil", "Argentina", "Hrvatska"], a: 2 },
  { q: "Koja zemlja je pobijednik SP 2018. u Rusiji?", o: ["Hrvatska", "Belgija", "Engleska", "Francuska"], a: 3 },
  { q: "Koliko puta je Brazil osvojio Svjetsko prvenstvo?", o: ["3", "4", "5", "6"], a: 2 },
  { q: "Koji je Hrvat bio top strijelac SP 1998. s 6 golova?", o: ["Zvonimir Boban", "Davor Šuker", "Robert Prosinečki", "Goran Vlaović"], a: 1 },
  { q: "Koja zemlja je bila domaćin Svjetskog prvenstva 2014.?", o: ["Argentina", "Brazil", "Kolumbija", "Urugvaj"], a: 1 },
  { q: "Koji igrač drži rekord po golovima na SP svih vremena (16 pogodaka)?", o: ["Cristiano Ronaldo", "Gerd Müller", "Miroslav Klose", "Lionel Messi"], a: 2 },
  { q: "Na kojoj poziciji je Hrvatska završila SP 2022. u Kataru?", o: ["1. (prvaci)", "2. (finalisti)", "3. (bronca)", "4. (polufinale)"], a: 2 },
  { q: "U kojoj godini je Italija zadnji put osvoji SP?", o: ["2002.", "2006.", "2010.", "2014."], a: 1 },
  { q: "Koji je igrač dobio Zlatnu loptu SP 2022. kao najbolji igrač?", o: ["Kylian Mbappé", "Luka Modrić", "Lionel Messi", "Neymar"], a: 2 },
  { q: "Tko je bio top strijelac SP 2022. s 8 golova?", o: ["Lionel Messi", "Kylian Mbappé", "Olivier Giroud", "Harry Kane"], a: 1 },
  { q: "U kojoj godini je Argentina zadnji put (do 2022.) osvoji SP?", o: ["1978.", "1982.", "1986.", "1990."], a: 2 },
  { q: "Koliko timova sudjeluje na SP od 2026.?", o: ["32", "40", "48", "64"], a: 2 },

  // === LIGA PRVAKA ===
  { q: "Koji klub ima najviše naslova Lige prvaka?", o: ["FC Barcelona", "Bayern München", "Liverpool", "Real Madrid"], a: 3 },
  { q: "Koji je klub pobijedio u LP sezoni 2023/24.?", o: ["Manchester City", "PSG", "Real Madrid", "Borussia Dortmund"], a: 2 },
  { q: "Tko je rekordni strijelac Lige prvaka svih vremena?", o: ["Lionel Messi", "Cristiano Ronaldo", "Raúl González", "Robert Lewandowski"], a: 1 },
  { q: "Gdje je odigrana finale Lige prvaka 2024.?", o: ["Pariz", "Madrid", "London (Wembley)", "München"], a: 2 },
  { q: "U kojoj godini je Chelsea prvi put osvoji Ligu prvaka?", o: ["2010.", "2011.", "2012.", "2013."], a: 2 },
  { q: "Koji klub je 2023. osvoji treble — LP, Premier ligu i FA Cup?", o: ["Arsenal", "Manchester City", "Chelsea", "Liverpool"], a: 1 },
  { q: "Koji je klub rekorder po uzastopnim naslovima LP (2016–2018)?", o: ["Bayern München", "Juventus", "Real Madrid", "Barcelona"], a: 2 },

  // === ZLATNA LOPTA ===
  { q: "Koji igrač ima najviše Zlatnih lopti u povijesti?", o: ["Cristiano Ronaldo (5)", "Ronaldinho (1)", "Lionel Messi (8)", "Zinédine Zidane (1)"], a: 2 },
  { q: "U kojoj godini je Luka Modrić dobio Zlatnu loptu?", o: ["2016.", "2017.", "2018.", "2019."], a: 2 },
  { q: "Koji je igrač dobio Zlatnu loptu 2023.?", o: ["Kylian Mbappé", "Erling Haaland", "Lionel Messi", "Vinicius Jr."], a: 2 },

  // === IGRAČI ===
  { q: "Za koji klub igra Cristiano Ronaldo od 2023.?", o: ["Juventus", "Manchester United", "Inter Miami", "Al-Nassr"], a: 3 },
  { q: "Koji je igrač 2024. prešao iz PSG-a u Real Madrid?", o: ["Neymar", "Kylian Mbappé", "Marco Verratti", "Achraf Hakimi"], a: 1 },
  { q: "Koji igrač nosi nadimak 'La Pulga' (Buha)?", o: ["Neymar", "Lionel Messi", "Kylian Mbappé", "Luis Suárez"], a: 1 },
  { q: "Za koji je klub Zlatan Ibrahimović završio igračku karijeru 2023.?", o: ["PSG", "LA Galaxy", "AC Milan", "Manchester United"], a: 2 },
  { q: "Koji je igrač najskuplje prodan u povijesti (222 mil. €, PSG 2017.)?", o: ["Kylian Mbappé", "Neymar", "Cristiano Ronaldo", "Gareth Bale"], a: 1 },
  { q: "Koji je Lionel Messi 2023. prešao iz PSG-a u?", o: ["Barcelonu", "Inter Miami", "Al-Hilal", "Manchester City"], a: 1 },
  { q: "Koji je igrač poznat po triku 'elastico' i čarobnom fudbalu?", o: ["Messi", "Ronaldinho", "Zidane", "Ronaldo"], a: 1 },
  { q: "Koji igrač je rekorder po golovima za englesku reprezentaciju?", o: ["David Beckham", "Wayne Rooney", "Gary Lineker", "Harry Kane"], a: 3 },
  { q: "Koji je igrač 2022. prešao iz Borussije Dortmund u Manchester City?", o: ["Erling Haaland", "Jadon Sancho", "Jude Bellingham", "Marco Reus"], a: 0 },
  { q: "Za koji je klub Robert Lewandowski prešao 2022. iz Bayerna?", o: ["Real Madrid", "FC Barcelona", "PSG", "Juventus"], a: 1 },
  { q: "Koji igrač nosi broj 7 za Portugal?", o: ["Bruno Fernandes", "João Félix", "Cristiano Ronaldo", "Bernardo Silva"], a: 2 },
  { q: "Koji je Jude Bellingham 2023. prešao u?", o: ["Bayern München", "Barcelona", "Real Madrid", "PSG"], a: 2 },
  { q: "Koji igrač igra za FC Barcelona i nosi broj 19 od 2024.?", o: ["Pedri", "Gavi", "Lamine Yamal", "Ferran Torres"], a: 2 },
  { q: "Koji je igrač poznat kao 'R9' i igrao za Barcelonu i Real?", o: ["Ronaldinho", "Ronaldo Nazário", "Roberto Carlos", "Rivaldo"], a: 1 },

  // === KLUBOVI ===
  { q: "U kojoj je ligi FC Barcelona?", o: ["Ligue 1", "Serie A", "La Liga", "Bundesliga"], a: 2 },
  { q: "Koji klub igra domaće utakmice na Anfieldu?", o: ["Manchester City", "Everton", "Liverpool", "Manchester United"], a: 2 },
  { q: "Koji je suparnički klub Realu Madridu u 'El Clásicu'?", o: ["Atletico Madrid", "FC Barcelona", "Sevilla", "Valencia"], a: 1 },
  { q: "U kojoj je ligi Bayern München?", o: ["Eredivisie", "Bundesliga", "Serie A", "La Liga"], a: 1 },
  { q: "Koji je stadion Manchestera Uniteda?", o: ["Etihad Stadium", "Anfield", "Old Trafford", "Stamford Bridge"], a: 2 },
  { q: "Koji je stadion Barcelone?", o: ["Santiago Bernabéu", "Spotify Camp Nou", "Mestalla", "Wanda Metropolitano"], a: 1 },
  { q: "Koji je klub poznat kao 'I Bianconeri' (Bijelo-crni)?", o: ["Inter Milan", "AC Milan", "Juventus", "Napoli"], a: 2 },
  { q: "Koji je grad domaćin kluba PSG?", o: ["Lyon", "Marseille", "Bordeaux", "Pariz"], a: 3 },
  { q: "Koji je klub rekorder po naslovima u Serie A?", o: ["AC Milan", "Inter Milan", "Juventus", "Napoli"], a: 2 },
  { q: "U kojoj godini je osnovan Real Madrid?", o: ["1898.", "1900.", "1902.", "1910."], a: 2 },
  { q: "Koji je engleski klub poznat kao 'The Gunners'?", o: ["Chelsea", "Arsenal", "Tottenham", "West Ham"], a: 1 },
  { q: "Na kojoj se adresi nalazi stadion Borussia Dortmunda?", o: ["Signal Iduna Park", "Allianz Arena", "Red Bull Arena", "Rhein Energie Stadion"], a: 0 },

  // === HRVATSKA ===
  { q: "Za koji španjolski klub igra Luka Modrić od 2012.?", o: ["Barcelonu", "Atletico Madrid", "Real Madrid", "Valenciju"], a: 2 },
  { q: "Koji je broj dresa Luke Modrića u Real Madridu?", o: ["8", "10", "6", "5"], a: 1 },
  { q: "Na kojoj poziciji igra Luka Modrić?", o: ["Napadač", "Vratar", "Vezni igrač", "Stoper"], a: 2 },
  { q: "U kojim bojama igra Hrvatska reprezentacija?", o: ["Plavo-bijelo", "Crveno-bijelo (karo)", "Bijelo-plavo", "Crveno-zlatno"], a: 1 },
  { q: "Koji je Luka Modrić klub bio prije Real Madrida?", o: ["Chelsea", "Tottenham Hotspur", "Arsenal", "Everton"], a: 1 },
  { q: "Koji je Ivan Perišić klub bio 2022.?", o: ["Inter Milan", "Bayern München", "Tottenham", "Ajax"], a: 0 },
  { q: "Na kojoj je poziciji Joško Gvardiol?", o: ["Napadač", "Veznjak", "Branič / lijevokrilni branič", "Vratar"], a: 2 },
  { q: "Koji je Joško Gvardiol 2023. prešao u?", o: ["Real Madrid", "Manchester City", "PSG", "Bayern München"], a: 1 },

  // === TRENERI ===
  { q: "Koji je trener poznat kao 'The Special One'?", o: ["Pep Guardiola", "Jürgen Klopp", "José Mourinho", "Carlo Ancelotti"], a: 2 },
  { q: "Koji je trener Manchester Citya koji je 2023. osvoji treble?", o: ["José Mourinho", "Jürgen Klopp", "Pep Guardiola", "Carlo Ancelotti"], a: 2 },
  { q: "Koji je trener s Barcelonom osvoji LP 2009. i 2011.?", o: ["Luis Enrique", "Pep Guardiola", "Johan Cruyff", "Frank Rijkaard"], a: 1 },

  // === OSNOVE ===
  { q: "Koliko igrača ima momčad na terenu?", o: ["9", "10", "11", "12"], a: 2 },
  { q: "Koliko bodova donosi pobjeda u ligi?", o: ["1", "2", "3", "4"], a: 2 },
  { q: "Što je 'hat-trick' u fudbalu?", o: ["3 asistencije u utakmici", "3 gola jednog igrača u utakmici", "2 gola jednog igrača", "Gol iz slobodnog udarca"], a: 1 },
  { q: "S koliko igrača momčad nastavlja igru nakon crvenog kartona?", o: ["9", "10", "11", "8"], a: 1 },
  { q: "Koliko dugo traje regularni dio utakmice?", o: ["80 minuta", "85 minuta", "90 minuta", "95 minuta"], a: 2 },
  { q: "Što je 'penaltije' (kazneni udarac)?", o: ["Slobodan udarac iz kuta", "Udarac iz 11 metara", "Indirektan slobodan udarac", "Slobodan udarac s ruba kaznenog prostora"], a: 1 },
  { q: "Koliko bodova donosi neriješeno (remi)?", o: ["0", "1", "2", "3"], a: 1 },
  { q: "Što znači 'zaleđe' (offside) u fudbalu?", o: ["Lopta izlazi iz terena", "Napadač je ispred zadnjeg braniča pri primanju lopte", "Faul bez kartona", "Igrač napušta teren bez dozvole"], a: 1 },
];

const TOTAL_Q = 5;
const NEEDED = 4;

function shuffle<T>(arr: T[]): T[] {
  return [...arr].sort(() => Math.random() - 0.5);
}

type Phase = "idle" | "playing" | "answered" | "win" | "lose" | "claimed";

export function QuizGame() {
  const [phase, setPhase] = useState<Phase>("idle");
  const [questions, setQuestions] = useState<Q[]>([]);
  const [current, setCurrent] = useState(0);
  const [score, setScore] = useState(0);
  const [chosen, setChosen] = useState<number | null>(null);

  const startGame = useCallback(() => {
    setQuestions(shuffle(ALL_QUESTIONS).slice(0, TOTAL_Q));
    setCurrent(0);
    setScore(0);
    setChosen(null);
    setPhase("playing");
  }, []);

  const pick = (idx: number) => {
    if (phase !== "playing" || chosen !== null) return;
    const q = questions[current];
    const correct = idx === q.a;
    setChosen(idx);
    const newScore = correct ? score + 1 : score;
    setScore(newScore);
    setPhase("answered");

    setTimeout(() => {
      if (current + 1 >= TOTAL_Q) {
        setPhase(newScore >= NEEDED ? "win" : "lose");
      } else {
        setCurrent((c) => c + 1);
        setChosen(null);
        setPhase("playing");
      }
    }, 1100);
  };

  const claimDiscount = () => {
    try { localStorage.setItem(PROMO_STORAGE_KEY, "KVIZ10"); } catch {}
    setPhase("claimed");
    setTimeout(() => { window.location.href = "/dresovi"; }, 1400);
  };

  const claimGift = () => {
    try { localStorage.setItem(GIFT_STORAGE_KEY, "1"); } catch {}
    setPhase("claimed");
    setTimeout(() => { window.location.href = "/dresovi"; }, 1400);
  };

  const q = questions[current];

  // ── IDLE ──────────────────────────────────────────────────────────────
  if (phase === "idle") {
    return (
      <div className="flex flex-col items-center gap-6 py-8 text-center">
        <div className="inline-flex h-20 w-20 items-center justify-center rounded-full border border-accent/30 bg-accent/10 text-accent">
          <Trophy className="h-9 w-9" />
        </div>
        <div>
          <h2 className="font-heading text-4xl uppercase tracking-[0.04em] text-white">Football Kviz</h2>
          <p className="mt-2 text-sm leading-6 text-white/60">
            5 pitanja · treba {NEEDED}/{TOTAL_Q} točnih odgovora · osvoji nagradu po izboru
          </p>
        </div>
        <div className="flex flex-col gap-2 rounded-[10px] border border-white/10 bg-white/5 px-6 py-4 text-sm text-white/70">
          <p>🎁 <span className="text-white">Poklon iznenađenja</span> uz narudžbu</p>
          <p>💰 <span className="text-white">−10%</span> popust na sve dresove</p>
          <p className="mt-1 text-xs text-white/40">Ti biraš nagradu ako pobijediš</p>
        </div>
        <button
          type="button"
          onClick={startGame}
          className="button-primary px-10"
        >
          Kreni na kviz
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
            {score}/{TOTAL_Q} točnih
          </h2>
          <p className="mt-2 text-sm text-white/60">Odaberi svoju nagradu:</p>
        </div>

        <div className="grid w-full max-w-sm gap-3">
          <button
            type="button"
            onClick={claimGift}
            className="group flex items-center gap-4 rounded-[12px] border border-white/15 bg-[#111] p-5 text-left transition hover:border-accent/60 hover:bg-accent/5"
          >
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-[10px] bg-accent/10 text-accent">
              <Gift className="h-6 w-6" />
            </div>
            <div>
              <p className="font-semibold text-white">Poklon iznenađenja</p>
              <p className="text-xs text-white/50">Prilaže se uz tvoju narudžbu</p>
            </div>
            <ArrowRight className="ml-auto h-4 w-4 shrink-0 text-white/30 transition group-hover:translate-x-1 group-hover:text-accent" />
          </button>

          <button
            type="button"
            onClick={claimDiscount}
            className="group flex items-center gap-4 rounded-[12px] border border-white/15 bg-[#111] p-5 text-left transition hover:border-accent/60 hover:bg-accent/5"
          >
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-[10px] bg-accent/10 text-accent">
              <Percent className="h-6 w-6" />
            </div>
            <div>
              <p className="font-semibold text-white">−10% na sve dresove</p>
              <p className="text-xs text-white/50">Automatski se primijeni na blagajni</p>
            </div>
            <ArrowRight className="ml-auto h-4 w-4 shrink-0 text-white/30 transition group-hover:translate-x-1 group-hover:text-accent" />
          </button>
        </div>
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
          <h2 className="mt-1 font-heading text-4xl uppercase tracking-[0.04em] text-white">{score}/{TOTAL_Q} točnih</h2>
          <p className="mt-2 text-sm text-white/60">
            Treba {NEEDED} točnih za nagradu. Pokušaj ponovo!
          </p>
        </div>
        <button type="button" onClick={startGame} className="button-primary px-10">
          Igraj ponovno
        </button>
      </div>
    );
  }

  // ── PLAYING / ANSWERED ───────────────────────────────────────────────
  if (!q) return null;

  return (
    <div className="flex flex-col gap-6">
      {/* Progress */}
      <div className="flex items-center justify-between text-xs uppercase tracking-[0.22em] text-white/40">
        <span>Pitanje {current + 1} / {TOTAL_Q}</span>
        <span className="text-accent">{score} točnih</span>
      </div>
      <div className="h-1 w-full overflow-hidden rounded-full bg-white/10">
        <div
          className="h-full bg-accent transition-all duration-300"
          style={{ width: `${((current) / TOTAL_Q) * 100}%` }}
        />
      </div>

      {/* Question */}
      <p className="text-center text-lg font-semibold leading-snug text-white sm:text-xl">{q.q}</p>

      {/* Options */}
      <div className="grid gap-2.5 sm:grid-cols-2">
        {q.o.map((opt, idx) => {
          const isChosen = chosen === idx;
          const isCorrect = idx === q.a;
          const revealed = phase === "answered";

          let cls = "w-full rounded-[10px] border px-4 py-3.5 text-left text-sm font-medium transition-all duration-200 ";
          if (!revealed) {
            cls += "border-white/15 bg-[#111] text-white hover:border-accent/60 hover:bg-accent/5";
          } else if (isCorrect) {
            cls += "border-green-500 bg-green-500/15 text-green-400";
          } else if (isChosen && !isCorrect) {
            cls += "border-red-500 bg-red-500/15 text-red-400";
          } else {
            cls += "border-white/8 bg-[#0d0d0d] text-white/30";
          }

          return (
            <button
              key={idx}
              type="button"
              onClick={() => pick(idx)}
              disabled={revealed}
              className={cls}
            >
              <span className="mr-2 text-white/40">{["A", "B", "C", "D"][idx]}.</span>
              {opt}
            </button>
          );
        })}
      </div>
    </div>
  );
}
