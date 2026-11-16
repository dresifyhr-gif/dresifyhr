"use client";

// PAZI PROZOR! — prototip (jedna razina). 3D dvorište između zgrada u sumrak.
// Povuci unatrag i pusti (praćka), luk poteza zavrne loptu. Gol između dva
// ruksaka iza starog auta; bodovi po odbijanjima. Bakin prozor na trećem redu:
// razbiješ ga, ide se doma.

import { AnimatePresence, motion } from "framer-motion";
import { Hand, Spline, TriangleAlert } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

import { GameShell, HudStat, useGameLoop, type GameResult, type GameState } from "../v2/game-shell";
import { haptic, sfx, unlockAudio } from "../v2/sfx";
import { unlockPaziAudio } from "./audio";
import { Engine, loadThree } from "./engine";
import { BALLS, Game, type AimInfo, type Callout, type ShotOutcome } from "./game";
import { BEST_KEY, KITS, KIT_KEY, kitById, kitShareImage } from "./kits";
import type { Kit } from "./textures";

const EASE = [0.22, 1, 0.36, 1] as const;

function plural(n: number, one: string, few: string, many: string) {
  const m10 = n % 10;
  const m100 = n % 100;
  if (m10 === 1 && m100 !== 11) return one;
  if (m10 >= 2 && m10 <= 4 && (m100 < 12 || m100 > 14)) return few;
  return many;
}

export function PaziProzorGame() {
  const [state, setState] = useState<GameState>("start");
  const [score, setScore] = useState(0);
  const [shots, setShots] = useState<ShotOutcome[]>([]);
  const [result, setResult] = useState<GameResult | null>(null);
  const [kitId, setKitId] = useState(KITS[0].id);
  // "net" = three.js nije stigao s CDN-a (ponovni pokušaj ima smisla), "gl" = preglednik ne da WebGL
  const [load, setLoad] = useState<"loading" | "ready" | "net" | "gl">("loading");
  const [callout, setCallout] = useState<Callout | null>(null);
  const [bounce, setBounce] = useState<Extract<Callout, { type: "bounce" }> | null>(null);
  const [hint, setHint] = useState(false);
  const [aimTag, setAimTag] = useState<{ curve: boolean; danger: boolean }>({ curve: false, danger: false });

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const engineRef = useRef<Engine | null>(null);
  const gameRef = useRef<Game | null>(null);
  const stateRef = useRef(state);
  stateRef.current = state;
  const kitRef = useRef(kitId);
  kitRef.current = kitId;
  const lineRef = useRef<SVGLineElement | null>(null);
  const knobRef = useRef<SVGCircleElement | null>(null);
  const anchorRef = useRef<SVGCircleElement | null>(null);
  const ringRef = useRef<SVGCircleElement | null>(null);
  const svgRef = useRef<SVGSVGElement | null>(null);
  const perf = useRef({ t: 0, n: 0, checked: 0 });

  // ── učitavanje three.js + motora ───────────────────────────────────
  const aliveRef = useRef(true);
  const roRef = useRef<ResizeObserver | null>(null);
  const bootingRef = useRef(false);
  const boot = useCallback(() => {
    if (bootingRef.current || engineRef.current) return;
    bootingRef.current = true;
    setLoad("loading");
    // CDN koji visi ne smije ostaviti vječni spinner: nakon 20 s javi grešku (učitavanje i dalje može uspjeti kod idućeg pokušaja)
    let timer = 0;
    const timeout = new Promise<never>((_, rej) => {
      timer = window.setTimeout(() => rej(new Error("timeout")), 20000);
    });
    Promise.race([loadThree(), timeout])
      .then((T) => {
        const c = canvasRef.current;
        if (!aliveRef.current || !c) return;
        let engine: Engine;
        try {
          engine = new Engine(T, c, kitById(kitRef.current));
        } catch {
          setLoad("gl");
          if (stateRef.current !== "start") setState("start");
          return;
        }
        engineRef.current = engine;
        let lastW = 0;
        let lastH = 0;
        const resize = () => {
          const r = c.getBoundingClientRect();
          if (Math.abs(r.width - lastW) < 0.5 && Math.abs(r.height - lastH) < 0.5) return;
          // okretanje mobitela usred poteza: odustani od nišana (koordinate više ne vrijede)
          if (lastW) gameRef.current?.cancelAim();
          lastW = r.width;
          lastH = r.height;
          engine.setSize(r.width, r.height, window.devicePixelRatio || 1);
        };
        resize();
        roRef.current?.disconnect();
        roRef.current = new ResizeObserver(resize);
        roRef.current.observe(c);
        const game = new Game(engine, {
          onScore: (s, list) => {
            setScore(s);
            setShots(list);
          },
          onCallout: (co) => {
            if (co.type === "bounce") setBounce(co);
            else if (co.type === "clear") {
              setBounce(null);
              setCallout(null);
            } else {
              // kraj udarca: niz odbijanja se više ne vraća kad najava istekne
              if (co.type === "goal" || co.type === "miss" || co.type === "window") setBounce(null);
              setCallout(co);
            }
          },
          onAim: (a) => drawAim(a),
          onHint: (h) => setHint(h),
          onEnd: (s, list) => finish(s, list)
        });
        gameRef.current = game;
        setLoad("ready");
        // igrač je kliknuo "Igraj" prije nego se scena učitala → kreni sad
        if (stateRef.current === "playing" || stateRef.current === "paused") game.start();
      })
      .catch(() => {
        if (!aliveRef.current) return;
        setLoad("net");
        if (stateRef.current !== "start") setState("start");
      })
      .finally(() => {
        window.clearTimeout(timer);
        bootingRef.current = false;
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    aliveRef.current = true;
    try {
      const saved = window.localStorage.getItem(KIT_KEY);
      if (saved && KITS.some((k) => k.id === saved)) setKitId(saved);
    } catch {}
    boot();
    return () => {
      aliveRef.current = false;
      roRef.current?.disconnect();
      roRef.current = null;
      engineRef.current?.dispose();
      engineRef.current = null;
      gameRef.current = null;
    };
  }, [boot]);

  useEffect(() => {
    engineRef.current?.setKit(kitById(kitId));
  }, [kitId, load]);

  // Samo u razvoju: stanje za automatske testove.
  useEffect(() => {
    if (process.env.NODE_ENV === "production") return;
    const w = window as unknown as { __pazi?: () => unknown };
    w.__pazi = () => {
      const g = gameRef.current;
      const e = engineRef.current;
      return g && e
        ? { phase: g.phase, aim: g.aim, missText: g.missText, score: g.score, shots: g.shots, ball: g.ball.p, done: g.ball.done, dpr: e.dpr, calls: e.renderer.info.render.calls, tris: e.renderer.info.render.triangles }
        : null;
    };
    return () => {
      delete w.__pazi;
    };
  }, []);

  const drawAim = (a: AimInfo) => {
    const svg = svgRef.current;
    if (!svg) return;
    if (!a.active) {
      svg.style.opacity = "0";
      setAimTag((t) => (t.curve || t.danger ? { curve: false, danger: false } : t));
      return;
    }
    svg.style.opacity = "1";
    lineRef.current?.setAttribute("x1", String(a.x0));
    lineRef.current?.setAttribute("y1", String(a.y0));
    lineRef.current?.setAttribute("x2", String(a.x));
    lineRef.current?.setAttribute("y2", String(a.y));
    anchorRef.current?.setAttribute("cx", String(a.x0));
    anchorRef.current?.setAttribute("cy", String(a.y0));
    knobRef.current?.setAttribute("cx", String(a.x));
    knobRef.current?.setAttribute("cy", String(a.y));
    const r = 10 + a.power * 8;
    knobRef.current?.setAttribute("r", String(r));
    const col = a.danger ? "#ff5a5f" : "#e8ff3c";
    lineRef.current?.setAttribute("stroke", col);
    knobRef.current?.setAttribute("stroke", col);
    // prsten snage oko prsta: puni se u smjeru kazaljke od vrha
    const ring = ringRef.current;
    if (ring) {
      const rr = r + 7;
      const c = 2 * Math.PI * rr;
      ring.setAttribute("r", String(rr));
      ring.setAttribute("cx", String(a.x));
      ring.setAttribute("cy", String(a.y));
      ring.setAttribute("transform", `rotate(-90 ${a.x} ${a.y})`);
      ring.setAttribute("stroke-dasharray", `${(c * a.power).toFixed(1)} ${c.toFixed(1)}`);
      ring.setAttribute("stroke", a.power >= 0.97 ? "#ffffff" : col);
      ring.setAttribute("stroke-width", a.power >= 0.97 ? "3.5" : "2.5");
    }
    const curve = Math.abs(a.curve) > 0.05;
    setAimTag((t) => (t.curve !== curve || t.danger !== a.danger ? { curve, danger: a.danger } : t));
  };

  const finish = useCallback((s: number, list: ShotOutcome[]) => {
    const goals = list.filter((x) => x.kind === "goal") as Extract<ShotOutcome, { kind: "goal" }>[];
    const win = list.some((x) => x.kind === "window");
    const best = goals.reduce<Extract<ShotOutcome, { kind: "goal" }> | null>((m, g) => (!m || g.points > m.points ? g : m), null);
    const title = win
      ? "Ajde doma!"
      : goals.length === BALLS
        ? "Čisti hat-trick"
        : goals.length === 2
          ? "Dva od tri"
          : goals.length === 1
            ? "Jedan je ušao"
            : "Danas ne ide";
    // kratko: pojedinačni udarci su odmah ispod u kartama
    const message = win
      ? "Razbijen prozor. Baka je uzela loptu."
      : best
        ? `Najbolji udarac: ${best.style.name}`
        : "Odbij loptu od zida i obiđi auto.";
    setResult({ score: s, title, message });
    setState("result");
  }, []);

  const start = useCallback(() => {
    if (load === "gl") return; // bez WebGL-a nema igre; poruka stoji na startnom ekranu
    unlockAudio();
    unlockPaziAudio();
    if (!gameRef.current) boot(); // još se učitava ili je CDN pao → (ponovno) učitaj pa kreni
    setResult(null);
    setScore(0);
    setShots([]);
    setCallout(null);
    setBounce(null);
    gameRef.current?.start();
    setState("playing");
  }, [load, boot]);

  useEffect(() => {
    if (state === "start") gameRef.current?.attract();
    if (state !== "playing") gameRef.current?.cancelAim();
  }, [state]);

  const pickKit = useCallback((id: string) => {
    unlockAudio();
    sfx.tap();
    haptic(8);
    setKitId(id);
    try {
      window.localStorage.setItem(KIT_KEY, id);
    } catch {}
  }, []);

  // ── petlja ──────────────────────────────────────────────────────────
  useGameLoop({
    running: state === "playing",
    update: (step) => gameRef.current?.update(step),
    render: ({ dt }) => {
      const g = gameRef.current;
      if (!g) return;
      g.render(dt, stateRef.current !== "paused");
      // spori uređaj: ako je prosjek ispod ~45 fps, smanji DPR (najviše dvaput)
      const p = perf.current;
      // (prva 1.5 s se preskače — kompilacija shadera na iOS-u zna zastati)
      if (stateRef.current === "playing" && p.checked < 2 && dt > 0) {
        p.t += dt;
        p.n++;
        if (p.t < 1.5) p.n = 0;
        else if (p.t > 3.5) {
          const avg = 2 / Math.max(1, p.n);
          if (avg > 1 / 45 && engineRef.current?.degrade()) p.checked++;
          else p.checked = 2;
          p.t = 1.5;
          p.n = 0;
        }
      }
    }
  });

  // ── dodir ───────────────────────────────────────────────────────────
  const local = (e: React.PointerEvent) => {
    const r = wrapRef.current!.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  };
  const onDown = (e: React.PointerEvent) => {
    if (stateRef.current !== "playing") return;
    const p = local(e);
    try {
      (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    } catch {}
    gameRef.current?.pointerDown(e.pointerId, p.x, p.y);
  };
  const onMove = (e: React.PointerEvent) => {
    const p = local(e);
    gameRef.current?.pointerMove(e.pointerId, p.x, p.y);
  };
  const onUp = (e: React.PointerEvent) => {
    // otpuštanje dok je pauza (ili nakon nje) ne smije opaliti udarac
    if (stateRef.current !== "playing") {
      gameRef.current?.cancelAim();
      return;
    }
    const p = local(e);
    gameRef.current?.pointerUp(e.pointerId, p.x, p.y);
  };
  const onCancel = () => gameRef.current?.cancelAim();

  const ballsLeft = BALLS - shots.length;

  return (
    <GameShell
      gameId="pazi-prozor"
      title="Pazi prozor!"
      kicker="Mini igra · 3D"
      description="Zabij između ruksaka iza starog auta. Što više odbijanja, to više bodova."
      bestKey={BEST_KEY}
      rules={[
        { icon: Hand, text: "Povuci unatrag i pusti, kao praćku" },
        { icon: Spline, text: "Povuci u luku i lopta će se zavrnuti" },
        { icon: TriangleAlert, text: "Bakin prozor na trećem katu ne diraj" }
      ]}
      state={state}
      onStart={start}
      onPause={() => setState("paused")}
      onResume={() => setState("playing")}
      result={result}
      scoreLabel={result ? plural(result.score, "bod", "boda", "bodova") : "bodova"}
      shareImage={kitShareImage(kitId)}
      startExtra={
        <>
          {load === "net" || load === "gl" ? (
            <div role="alert" className="mb-3 rounded-[12px] border border-[#ff5a5f]/35 bg-[#ff5a5f]/[0.08] px-3 py-2 text-[12.5px] leading-snug text-white/80">
              {load === "gl"
                ? "Ovaj preglednik ne podržava 3D prikaz pa se igra ne može pokrenuti."
                : "Igra se nije učitala. Provjeri vezu i pritisni Igraj za novi pokušaj."}
            </div>
          ) : load === "loading" ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.6, duration: 0.3 }}
              className="mb-3 flex items-center gap-2 text-[12px] font-medium text-white/55"
              aria-live="polite"
            >
              <span className="h-3.5 w-3.5 animate-spin rounded-full border-[1.5px] border-white/15 border-t-accent" />
              Učitavam dvorište
            </motion.div>
          ) : null}
          <KitPicker kitId={kitId} onPick={pickKit} />
        </>
      }
      resultExtra={<ShotList shots={shots} />}
      hud={
        <>
          <HudStat label="Bodovi" value={score} accent bump={score} />
          <BallsHud shots={shots} left={ballsLeft} />
        </>
      }
    >
      <div
        ref={wrapRef}
        className="absolute inset-0"
        style={{ touchAction: "none" }}
        onPointerDown={onDown}
        onPointerMove={onMove}
        onPointerUp={onUp}
        onPointerCancel={onCancel}
        onLostPointerCapture={onUp}
      >
        <canvas
          ref={canvasRef}
          className="block h-full w-full transition-opacity duration-700 ease-out"
          style={{ opacity: load === "ready" ? 1 : 0 }}
          aria-label="Pazi prozor — igra"
        />
        {/* izbornik i rezultat: scena se malo povuče u pozadinu da se tekst čita */}
        <div
          className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgba(6,5,12,0.62)_0%,rgba(6,5,12,0.34)_45%,rgba(6,5,12,0.1)_100%)] transition-opacity duration-500"
          style={{ opacity: state === "start" || state === "result" ? 1 : 0 }}
        />
        {/* vinjeta */}
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_50%_45%,transparent_55%,rgba(5,3,12,0.55)_100%)]" />

        {/* potez praćke */}
        <svg ref={svgRef} className="pointer-events-none absolute inset-0 h-full w-full transition-opacity duration-150" style={{ opacity: 0 }} aria-hidden>
          <line ref={lineRef} x1="0" y1="0" x2="0" y2="0" stroke="#e8ff3c" strokeWidth="2.5" strokeDasharray="2 7" strokeLinecap="round" opacity="0.8" />
          <circle ref={anchorRef} cx="0" cy="0" r="5" fill="rgba(255,255,255,0.7)" />
          <circle ref={knobRef} cx="0" cy="0" r="12" fill="rgba(0,0,0,0.25)" stroke="#e8ff3c" strokeWidth="2.5" />
          <circle ref={ringRef} cx="0" cy="0" r="19" fill="none" stroke="#e8ff3c" strokeWidth="2.5" strokeLinecap="round" strokeDasharray="0 200" opacity="0.9" />
        </svg>

        {load === "loading" && state !== "start" ? (
          <div className="pointer-events-none absolute inset-x-0 top-[38%] grid place-items-center">
            <span className="h-7 w-7 animate-spin rounded-full border-2 border-white/15 border-t-accent" />
          </div>
        ) : null}

        <Callouts callout={callout} bounce={bounce} live={state === "playing" || state === "paused"} />

        <AnimatePresence>
          {state === "playing" && (aimTag.curve || aimTag.danger) ? (
            <motion.div
              key={aimTag.danger ? "d" : "c"}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.18 }}
              className={`pointer-events-none absolute left-1/2 top-[84px] -translate-x-1/2 rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] ${
                aimTag.danger ? "bg-[#ff5a5f] text-black" : "border border-white/15 bg-black/55 text-accent"
              }`}
            >
              {aimTag.danger ? "Pazi prozor!" : "Zavrnuta"}
            </motion.div>
          ) : null}
        </AnimatePresence>

        <AnimatePresence>
          {state === "playing" && hint ? (
            <motion.div
              key="hint"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0, transition: { duration: 0.15 } }}
              className="pointer-events-none absolute inset-x-0 top-[40%] flex flex-col items-center"
            >
              <div className="relative h-[70px] w-[60px]">
                <span className="absolute left-1/2 top-1 h-3 w-3 -translate-x-1/2 rounded-full bg-white/70" />
                <motion.span
                  className="absolute left-1/2 top-0 h-6 w-6 -translate-x-1/2 rounded-full border-2 border-accent bg-black/30"
                  animate={{ y: [0, 44, 44, 0], opacity: [0, 1, 0, 0] }}
                  transition={{ duration: 1.6, times: [0, 0.55, 0.8, 1], repeat: Infinity, ease: "easeInOut" }}
                />
              </div>
              <span className="font-heading text-[22px] uppercase tracking-[0.04em] text-white">Povuci unatrag i pusti</span>
              <span className="mt-0.5 text-[12.5px] text-white/55">Odbij loptu od zida oko auta</span>
            </motion.div>
          ) : null}
        </AnimatePresence>
      </div>
    </GameShell>
  );
}

// ── HUD: lopte ──────────────────────────────────────────────────────────
function BallsHud({ shots, left }: { shots: ShotOutcome[]; left: number }) {
  const dots = Array.from({ length: BALLS }, (_, i) => shots[i] ?? null);
  return (
    <div className="flex flex-col rounded-[12px] border border-white/10 bg-black/45 px-3 pb-2 pt-1.5">
      <span className="text-[9.5px] font-semibold uppercase tracking-[0.22em] text-white/50">Lopte</span>
      <div className="mt-[7px] flex items-center gap-1.5" aria-label={`Preostalo lopti: ${left}`}>
        {dots.map((s, i) => (
          <motion.span
            key={`${i}-${s?.kind ?? "x"}`}
            initial={s ? { scale: 1.75 } : false}
            animate={{ scale: 1 }}
            transition={{ type: "spring", stiffness: 560, damping: 17 }}
            className={`h-[13px] w-[13px] rounded-full transition-colors duration-300 ${
              !s ? "bg-white" : s.kind === "goal" ? "bg-accent" : s.kind === "window" ? "bg-[#ff5a5f]" : "bg-white/20"
            }`}
          />
        ))}
      </div>
    </div>
  );
}

// ── Najave na ekranu ────────────────────────────────────────────────────
/** Meka tamna mrlja iza velikog teksta: čita se i preko osvijetljenih prozora, bez blura. */
function Scrim({ wide = false }: { wide?: boolean }) {
  return (
    <span
      aria-hidden
      className={`pointer-events-none absolute left-1/2 top-1/2 -z-10 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[radial-gradient(closest-side,rgba(6,5,12,0.62),rgba(6,5,12,0.35)_55%,rgba(6,5,12,0))] ${
        wide ? "h-[230%] w-[170%]" : "h-[260%] w-[150%]"
      }`}
    />
  );
}

/** "+250" koji se odbroji od nule (piše ravno u DOM, bez React rendera po frejmu). */
function CountUp({ to, delay = 0.16, dur = 0.6 }: { to: number; delay?: number; dur?: number }) {
  const ref = useRef<HTMLSpanElement | null>(null);
  useEffect(() => {
    let raf = 0;
    const t0 = performance.now() + delay * 1000;
    const tick = (now: number) => {
      const k = Math.min(1, Math.max(0, (now - t0) / (dur * 1000)));
      const e = 1 - Math.pow(1 - k, 3);
      if (ref.current) ref.current.textContent = `+${Math.round(to * e)}`;
      if (k < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [to, delay, dur]);
  return <span ref={ref}>+0</span>;
}

function Callouts({ callout, bounce, live }: { callout: Callout | null; bounce: Extract<Callout, { type: "bounce" }> | null; live: boolean }) {
  const [shown, setShown] = useState<Callout | null>(null);
  useEffect(() => {
    if (!callout) {
      setShown(null);
      return;
    }
    setShown(callout);
    const ms = callout.type === "small" ? 900 : callout.type === "ball" ? 1100 : callout.type === "miss" ? 1300 : 2600;
    const id = window.setTimeout(() => setShown((s) => (s && s.id === callout.id ? null : s)), ms);
    return () => window.clearTimeout(id);
  }, [callout]);
  if (!live) return null;
  return (
    <>
      {/* niz odbijanja tijekom leta */}
      <div className="pointer-events-none absolute inset-x-0 top-[84px] flex justify-center">
        <AnimatePresence mode="popLayout">
          {bounce && (!shown || shown.type === "small" || shown.type === "bounce") ? (
            <motion.div
              key={bounce.id}
              initial={{ opacity: 0, scale: 0.6, y: -6 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.15 } }}
              transition={{ type: "spring", stiffness: 520, damping: 22 }}
              className="flex items-center gap-2 rounded-full border border-accent/40 bg-black/65 py-1 pl-1 pr-3.5 shadow-[0_6px_20px_rgba(0,0,0,0.35)]"
            >
              <span className="grid h-6 min-w-6 place-items-center rounded-full bg-accent px-1.5 font-heading text-[15px] leading-none text-black">{bounce.n}</span>
              <span className="font-heading text-[19px] uppercase leading-none tracking-[0.04em] text-white">{bounce.name}</span>
            </motion.div>
          ) : null}
        </AnimatePresence>
      </div>

      <div
        className={`pointer-events-none absolute inset-x-0 flex justify-center px-5 ${
          shown?.type === "goal" ? "top-[19%]" : shown?.type === "window" ? "top-[62%]" : "top-[30%]"
        }`}
      >
        <AnimatePresence mode="wait">
          {shown && shown.type === "goal" ? (
            <motion.div
              key={shown.id}
              initial={{ opacity: 0, scale: 0.72, y: 6 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, y: -12, scale: 0.98, transition: { duration: 0.28, ease: EASE } }}
              transition={{ type: "spring", stiffness: 430, damping: 19 }}
              className="relative isolate text-center"
            >
              <Scrim />
              <motion.div
                initial={{ opacity: 0, letterSpacing: "0.6em" }}
                animate={{ opacity: 1, letterSpacing: "0.34em" }}
                transition={{ duration: 0.5, ease: EASE }}
                className="flex items-center justify-center gap-2.5 pl-[0.34em] text-[11px] font-semibold uppercase text-white/85"
              >
                <span className="h-px w-5 bg-accent/70" />
                Gol
                <span className="h-px w-5 bg-accent/70" />
              </motion.div>
              <div className="mt-1.5 font-heading text-[clamp(2.6rem,13vw,4.2rem)] uppercase leading-[0.88] text-accent [text-shadow:0_4px_24px_rgba(0,0,0,0.5)]">
                {shown.name}
              </div>
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.14, duration: 0.4, ease: EASE }}
                className="mt-1.5 font-heading text-[28px] tabular-nums text-white [text-shadow:0_2px_14px_rgba(0,0,0,0.6)]"
              >
                <CountUp to={shown.points} />
              </motion.div>
            </motion.div>
          ) : shown && shown.type === "window" ? (
            <motion.div
              key={shown.id}
              initial={{ opacity: 0, scale: 1.5, rotate: -4 }}
              animate={{ opacity: 1, scale: 1, rotate: -3 }}
              exit={{ opacity: 0, transition: { duration: 0.2 } }}
              transition={{ type: "spring", stiffness: 520, damping: 15 }}
              className="relative isolate text-center"
            >
              <Scrim wide />
              <div className="font-heading text-[clamp(3rem,15vw,4.8rem)] uppercase leading-[0.86] text-[#ff5a5f] [text-shadow:0_4px_28px_rgba(0,0,0,0.6)]">
                Ajde doma!
              </div>
              <div className="mt-2 text-[14px] font-semibold text-white/85 [text-shadow:0_2px_10px_rgba(0,0,0,0.7)]">Baka je uzela loptu.</div>
            </motion.div>
          ) : shown && shown.type === "miss" ? (
            <motion.div
              key={shown.id}
              initial={{ opacity: 0, y: 10, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -6, transition: { duration: 0.22 } }}
              transition={{ duration: 0.34, ease: EASE }}
              className="relative isolate font-heading text-[34px] uppercase tracking-[0.04em] text-white/85 [text-shadow:0_2px_16px_rgba(0,0,0,0.6)]"
            >
              <Scrim wide />
              {shown.text}
            </motion.div>
          ) : shown && shown.type === "ball" && shown.n > 1 ? (
            <motion.div
              key={shown.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, transition: { duration: 0.25 } }}
              transition={{ duration: 0.35, ease: EASE }}
              className={`rounded-full border px-3.5 py-1.5 text-[11px] font-semibold uppercase tracking-[0.26em] ${
                shown.n === shown.total ? "border-accent/40 bg-black/60 text-accent" : "border-white/12 bg-black/50 text-white/80"
              }`}
            >
              {shown.n === shown.total ? "Zadnja lopta" : `Lopta ${shown.n} / ${shown.total}`}
            </motion.div>
          ) : shown && shown.type === "small" ? (
            <motion.div
              key={shown.id}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, transition: { duration: 0.2 } }}
              transition={{ type: "spring", stiffness: 500, damping: 22 }}
              className="font-heading text-[24px] uppercase tracking-[0.05em] text-white/90 [text-shadow:0_2px_12px_rgba(0,0,0,0.7)]"
            >
              {shown.text}
            </motion.div>
          ) : null}
        </AnimatePresence>
      </div>
    </>
  );
}

// ── Start: izbor dresa ──────────────────────────────────────────────────
const TEE =
  "M10.5 4.5 5.4 6.8 1.8 12.2 6 15.2 8.4 13V27.6H23.6V13L26 15.2 30.2 12.2 26.6 6.8 21.5 4.5C20.6 6.3 18.6 7.4 16 7.4 13.4 7.4 11.4 6.3 10.5 4.5Z";

/** Mali dres (SVG) u bojama i uzorku tima. */
function KitIcon({ kit }: { kit: Kit }) {
  const pid = `pz-kit-${kit.id}`;
  const solid = kit.pattern === "solid";
  const fill = solid ? kit.a : `url(#${pid})`;
  const trim = solid ? kit.b : kit.a;
  return (
    <svg viewBox="0 0 32 32" className="h-[64%] w-[64%]" aria-hidden>
      {kit.pattern === "stripes" ? (
        <defs>
          <pattern id={pid} width="6" height="32" patternUnits="userSpaceOnUse" x="1">
            <rect width="3" height="32" fill={kit.a} />
            <rect x="3" width="3" height="32" fill={kit.b} />
          </pattern>
        </defs>
      ) : kit.pattern === "checker" ? (
        <defs>
          <pattern id={pid} width="6" height="6" patternUnits="userSpaceOnUse">
            <rect width="6" height="6" fill={kit.a} />
            <rect width="3" height="3" fill={kit.b} />
            <rect x="3" y="3" width="3" height="3" fill={kit.b} />
          </pattern>
        </defs>
      ) : null}
      <path d={TEE} fill={fill} stroke="rgba(255,255,255,0.32)" strokeWidth="0.9" strokeLinejoin="round" />
      <path d="M10.5 4.5C11.4 6.3 13.4 7.4 16 7.4 18.6 7.4 20.6 6.3 21.5 4.5" fill="none" stroke={trim} strokeWidth="1.7" strokeLinecap="round" />
      {solid ? <path d="M2.6 11.1 6.6 14M29.4 11.1 25.4 14" stroke={trim} strokeWidth="1.5" strokeLinecap="round" /> : null}
    </svg>
  );
}

function KitPicker({ kitId, onPick }: { kitId: string; onPick: (id: string) => void }) {
  const name = kitById(kitId).name;
  return (
    <div>
      <div className="flex items-baseline justify-between">
        <span className="text-[10.5px] font-semibold uppercase tracking-[0.24em] text-white/45">Dres</span>
        <span className="relative h-[18px] overflow-hidden text-right">
          <AnimatePresence mode="popLayout" initial={false}>
            <motion.span
              key={name}
              initial={{ y: 14, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: -14, opacity: 0 }}
              transition={{ duration: 0.24, ease: EASE }}
              className="block text-[12.5px] font-semibold leading-[18px] text-white/85"
            >
              {name}
            </motion.span>
          </AnimatePresence>
        </span>
      </div>
      <div className="mt-2 flex justify-between gap-1" role="radiogroup" aria-label="Odaberi dres">
        {KITS.map((k) => {
          const on = k.id === kitId;
          return (
            <button
              key={k.id}
              type="button"
              role="radio"
              aria-checked={on}
              aria-label={k.name}
              onClick={() => onPick(k.id)}
              className={`relative grid h-[clamp(34px,10.4vw,42px)] w-[clamp(34px,10.4vw,42px)] shrink-0 place-items-center rounded-full border transition-[transform,background-color,border-color,opacity] duration-200 ease-out active:scale-90 ${
                on ? "border-accent bg-accent/[0.13] shadow-[0_0_0_3px_rgba(232,255,60,0.12)]" : "border-white/10 bg-white/[0.04] opacity-75 hover:opacity-100"
              }`}
            >
              <span className={`grid h-full w-full place-items-center transition-transform duration-300 ease-out ${on ? "scale-[1.12]" : ""}`}>
                <KitIcon kit={k} />
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ── Rezultat: tri udarca ────────────────────────────────────────────────
function ShotList({ shots }: { shots: ShotOutcome[] }) {
  const rows = Array.from({ length: BALLS }, (_, i) => shots[i] ?? null);
  return (
    <div className="grid grid-cols-3 gap-1.5">
      {rows.map((s, i) => {
        const goal = s?.kind === "goal";
        const label = !s ? "Nije ispucana" : s.kind === "goal" ? s.style.name : s.kind === "window" ? "Prozor" : s.over ? "Preko gola" : "Promašaj";
        return (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.32 + i * 0.07, duration: 0.42, ease: EASE }}
            className={`flex min-w-0 flex-col rounded-[12px] border px-2.5 py-2 ${goal ? "border-accent/35 bg-accent/[0.07]" : s?.kind === "window" ? "border-[#ff5a5f]/40 bg-[#ff5a5f]/[0.07]" : "border-white/10 bg-white/[0.03]"}`}
          >
            <span className="text-[9.5px] font-semibold uppercase tracking-[0.2em] text-white/40">Lopta {i + 1}</span>
            <span className={`mt-0.5 truncate text-[12.5px] font-semibold ${goal ? "text-white" : "text-white/55"}`}>{label}</span>
            <span className={`mt-0.5 font-heading text-[18px] leading-none tabular-nums ${goal ? "text-accent" : "text-white/30"}`}>{goal ? `+${s.points}` : "0"}</span>
          </motion.div>
        );
      })}
    </div>
  );
}
