// Žongliranje — glazbeni sloj (WebAudio, bez datoteka).
//
// Svaki udarac je nota. Niz savršenih udaraca penje se po pentatonici (D-dur),
// pa dobar niz zvuči kao melodija koja raste. Množitelj dodaje slojeve:
//   x1 — udarac + nota          x2 — + bas
//   x3 — + hi-hat i iskra       x4 — + tihi pad akord koji traje dok niz traje
// Ispod svega je tihi žamor stadiona koji raste s nizom.
//
// Vlastiti AudioContext (zajednički sfx.ts ga ne izvozi). Otključava se iz
// geste ("Igraj", "Nastavi", dodir lopte) i poštuje globalni mute iz sfx.ts.

import { isMuted, subscribeMute } from "../sfx";

let ac: AudioContext | null = null;
let out: GainNode | null = null;
let echo: GainNode | null = null;
let noiseBuf: AudioBuffer | null = null;
let primed = false;
/** Igra je na ekranu (između unlock i sleep) — samo tada se kontekst budi nakon povratka u karticu. */
let awake = false;

type Bed = { src: AudioBufferSourceNode; gain: GainNode; lfo: OscillatorNode };
type Pad = { gain: GainNode; nodes: OscillatorNode[] };
let bed: Bed | null = null;
let pad: Pad | null = null;

const VOL = 0.62;
const ROOT = 62; // D4
const PENTA = [0, 2, 4, 7, 9];
const BASS_LINE = [0, 0, 7, 5]; // D D A G — po četiri udarca

const hz = (midi: number) => 440 * Math.pow(2, (midi - 69) / 12);

function context(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (ac) return ac;
  const AC: typeof AudioContext | undefined =
    window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AC) return null;
  try {
    ac = new AC({ latencyHint: "interactive" });
  } catch {
    return null;
  }
  const comp = ac.createDynamicsCompressor();
  comp.threshold.value = -16;
  comp.knee.value = 14;
  comp.ratio.value = 3.5;
  comp.attack.value = 0.004;
  comp.release.value = 0.22;
  out = ac.createGain();
  out.gain.value = isMuted() ? 0 : VOL;
  out.connect(comp);
  comp.connect(ac.destination);

  // Kratki eho (ping) za note — "produciran" zvuk bez reverba.
  const d = ac.createDelay(1);
  d.delayTime.value = 0.19;
  const fb = ac.createGain();
  fb.gain.value = 0.3;
  const lp = ac.createBiquadFilter();
  lp.type = "lowpass";
  lp.frequency.value = 2600;
  echo = ac.createGain();
  echo.gain.value = 0.22;
  echo.connect(d);
  d.connect(lp);
  lp.connect(fb);
  fb.connect(d);
  lp.connect(out);

  subscribeMute((m) => {
    if (!ac || !out) return;
    out.gain.setTargetAtTime(m ? 0 : VOL, ac.currentTime, 0.03);
    if (m) music.stopAll();
  });
  document.addEventListener("visibilitychange", () => {
    if (!ac) return;
    if (document.hidden) void ac.suspend().catch(() => {});
    else if (primed && awake) void ac.resume().catch(() => {});
  });
  return ac;
}

function live(): AudioContext | null {
  if (isMuted()) return null;
  const c = context();
  if (!c || !out) return null;
  if (c.state !== "running") void c.resume().catch(() => {});
  return c;
}

function noise(c: AudioContext) {
  if (noiseBuf) return noiseBuf;
  const len = c.sampleRate * 2;
  noiseBuf = c.createBuffer(1, len, c.sampleRate);
  const d = noiseBuf.getChannelData(0);
  let b0 = 0, b1 = 0, b2 = 0;
  for (let i = 0; i < len; i++) {
    const w = Math.random() * 2 - 1;
    b0 = 0.99765 * b0 + w * 0.099046;
    b1 = 0.963 * b1 + w * 0.2965164;
    b2 = 0.57 * b2 + w * 1.0526913;
    d[i] = (b0 + b1 + b2 + w * 0.1848) * 0.18;
  }
  return noiseBuf;
}

function env(g: GainNode, t: number, peak: number, attack: number, decay: number) {
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(Math.max(peak, 0.0002), t + attack);
  g.gain.exponentialRampToValueAtTime(0.0001, t + attack + decay);
}

function osc(c: AudioContext, type: OscillatorType, f: number, t: number, dur: number, peak: number, dest: AudioNode, opts: { attack?: number; f1?: number; detune?: number } = {}) {
  const o = c.createOscillator();
  const g = c.createGain();
  o.type = type;
  o.frequency.setValueAtTime(f, t);
  if (opts.f1) o.frequency.exponentialRampToValueAtTime(opts.f1, t + dur);
  if (opts.detune) o.detune.value = opts.detune;
  env(g, t, peak, opts.attack ?? 0.004, dur);
  o.connect(g);
  g.connect(dest);
  o.start(t);
  o.stop(t + (opts.attack ?? 0.004) + dur + 0.05);
}

function hiss(c: AudioContext, t: number, dur: number, peak: number, type: BiquadFilterType, freq: number, opts: { q?: number; to?: number; attack?: number } = {}) {
  const s = c.createBufferSource();
  s.buffer = noise(c);
  const f = c.createBiquadFilter();
  f.type = type;
  f.frequency.setValueAtTime(freq, t);
  if (opts.to) f.frequency.exponentialRampToValueAtTime(opts.to, t + dur);
  f.Q.value = opts.q ?? 0.8;
  const g = c.createGain();
  env(g, t, peak, opts.attack ?? 0.002, dur);
  s.connect(f);
  f.connect(g);
  g.connect(out!);
  s.start(t, Math.random() * 1.5);
  s.stop(t + (opts.attack ?? 0.002) + dur + 0.05);
}

/** Trzaj (pluck): trokut + oktava, filtar se brzo zatvara. */
function pluck(c: AudioContext, midi: number, t: number, peak: number, bright = 1) {
  const f = hz(midi);
  const lp = c.createBiquadFilter();
  lp.type = "lowpass";
  lp.Q.value = 0.9;
  lp.frequency.setValueAtTime(Math.min(12000, f * 7 * bright), t);
  lp.frequency.exponentialRampToValueAtTime(Math.max(200, f * 1.6), t + 0.32);
  const g = c.createGain();
  g.gain.value = 1;
  lp.connect(g);
  g.connect(out!);
  g.connect(echo!);
  osc(c, "triangle", f, t, 0.42, peak, lp);
  osc(c, "sine", f * 2, t, 0.18, peak * 0.32, lp);
  osc(c, "square", f, t, 0.05, peak * 0.07, lp);
}

function thump(c: AudioContext, t: number, power: number, perfect: boolean) {
  const p = Math.min(1.3, Math.max(0.5, power));
  osc(c, "sine", 165 * (0.92 + p * 0.08), t, 0.15, 0.85 * p, out!, { f1: 46 });
  hiss(c, t, 0.03, 0.3 * p, "highpass", 1900);
  // savršen: suh "krek" kože
  if (perfect) hiss(c, t, 0.045, 0.22, "bandpass", 3600, { q: 2.5 });
}

function streakNote(streak: number) {
  let i = Math.max(0, streak - 1);
  if (i > 11) i = 7 + ((i - 7) % 5);
  return ROOT + 12 * Math.floor(i / 5) + PENTA[i % 5];
}

export const music = {
  /** Pozovi iz geste (pointerup/click) — iOS tek tada pusti zvuk. */
  unlock() {
    const c = context();
    if (!c) return;
    awake = true;
    if (c.state !== "running") void c.resume().catch(() => {});
    if (!primed) {
      try {
        const b = c.createBuffer(1, 1, 22050);
        const s = c.createBufferSource();
        s.buffer = b;
        s.connect(c.destination);
        s.start(0);
        primed = true;
      } catch {}
    }
  },

  /** Jedan udarac lopte. */
  kick(o: { perfect: boolean; streak: number; mult: number; kicks: number; power: number }) {
    const c = live();
    if (!c) return;
    const t = c.currentTime + 0.002;
    if (!bed) music.bedStart(); // npr. zvuk ponovno uključen usred igre
    thump(c, t, o.power, o.perfect);
    const bar = Math.floor((o.kicks - 1) / 4) % BASS_LINE.length;
    if (o.perfect) {
      const n = streakNote(o.streak);
      pluck(c, n, t, 0.16 + Math.min(0.05, o.streak * 0.004), 1.1);
      if (o.mult >= 3) osc(c, "sine", hz(n + 12), t + 0.07, 0.5, 0.035, echo!);
    } else {
      // obični udarac: tiša, tamnija nota iz akorda (bas linija se nastavlja)
      const n = ROOT - 12 + BASS_LINE[bar] + [0, 7, 4, 7][(o.kicks - 1) % 4];
      pluck(c, n, t, 0.085, 0.6);
    }
    if (o.mult >= 2) {
      const b = hz(ROOT - 24 + BASS_LINE[bar]);
      osc(c, "sine", b, t, 0.32, 0.3, out!);
      osc(c, "triangle", b * 2, t, 0.12, 0.05, out!);
    }
    if (o.mult >= 3) hiss(c, t + 0.0, 0.035, 0.06, "highpass", 7500);
    if (o.mult >= 4) music.padOn();
  },

  /** Množitelj je narastao: kratki arpeggio prema gore + zamah. */
  multUp(mult: number) {
    const c = live();
    if (!c) return;
    const t = c.currentTime + 0.04;
    const base = ROOT + 12 + (mult - 2) * 2;
    [0, 4, 7, 12].forEach((iv, i) => pluck(c, base + iv, t + i * 0.055, 0.1, 1.2));
    hiss(c, t - 0.03, 0.28, 0.07, "bandpass", 700, { to: 4200, q: 1.1, attack: 0.05 });
  },

  /** Niz savršenih je prekinut (samo ako je bio vrijedan). */
  streakBreak() {
    const c = live();
    if (!c) return;
    const t = c.currentTime + 0.05;
    osc(c, "triangle", hz(ROOT + 4), t, 0.16, 0.06, out!);
    osc(c, "triangle", hz(ROOT - 1), t + 0.11, 0.3, 0.06, out!);
    music.padOff();
  },

  /** Cilj (25 / 50 / 100 …): akord, iskre prema gore, nisko "bum". */
  milestone(level: number) {
    const c = live();
    if (!c) return;
    const t = c.currentTime + 0.02;
    osc(c, "sine", 70, t, 0.6, 0.55, out!, { f1: 38 });
    hiss(c, t, 0.9, 0.06 + level * 0.02, "highpass", 5200, { attack: 0.01 });
    const lp = c.createBiquadFilter();
    lp.type = "lowpass";
    lp.frequency.setValueAtTime(3200, t);
    lp.frequency.exponentialRampToValueAtTime(900, t + 1.4);
    lp.connect(out!);
    lp.connect(echo!);
    [0, 4, 7, 12, 16].forEach((iv, i) => {
      osc(c, "triangle", hz(ROOT + iv), t, 1.4, 0.075, lp, { attack: 0.01, detune: i % 2 ? 6 : -6 });
      osc(c, "sawtooth", hz(ROOT + iv), t, 0.5, 0.018, lp);
    });
    [12, 16, 19, 24, 28].forEach((iv, i) => pluck(c, ROOT + iv, t + 0.16 + i * 0.05, 0.075, 1.3));
  },

  /** Lopta je pala: tupi udarac o travu + uzdah tribine ("uuuh") koji ovisi o tome
   *  koliko je niz bio dug — nakon 3 dodira tišina, nakon 60 cijeli stadion. */
  groan(kicks: number) {
    const c = live();
    if (!c) return;
    const t = c.currentTime + 0.04;
    // mekani "tup" lopte u travi (bez zvonjave)
    osc(c, "sine", 92, t, 0.22, 0.32, out!, { f1: 52 });
    hiss(c, t, 0.09, 0.08, "lowpass", 420);
    if (kicks < 6) return;
    const k = Math.min(1, (kicks - 6) / 54);
    const dur = 1.1 + k * 0.7;
    const peak = 0.05 + k * 0.11;
    // dva "vokalna" pojasa koji klize prema dolje = razočarani uzdah mase
    for (const [f0, f1, q, w] of [
      [720, 380, 2.2, 1],
      [1150, 640, 3, 0.55]
    ] as const) {
      const s = c.createBufferSource();
      s.buffer = noise(c);
      const bp = c.createBiquadFilter();
      bp.type = "bandpass";
      bp.Q.value = q;
      bp.frequency.setValueAtTime(f0, t);
      bp.frequency.exponentialRampToValueAtTime(f1, t + dur);
      const g = c.createGain();
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(peak * w, t + 0.22);
      g.gain.setTargetAtTime(0.0001, t + dur * 0.45, dur * 0.22);
      s.connect(bp);
      bp.connect(g);
      g.connect(out!);
      s.start(t, Math.random() * 1.2);
      s.stop(t + dur + 0.6);
    }
  },

  /** Spašena lopta s trave. */
  save() {
    const c = live();
    if (!c) return;
    const t = c.currentTime + 0.03;
    pluck(c, ROOT + 7, t, 0.12, 1.2);
    pluck(c, ROOT + 14, t + 0.07, 0.12, 1.2);
  },

  /** Pokupljena kapa. */
  cap() {
    const c = live();
    if (!c) return;
    const t = c.currentTime;
    osc(c, "triangle", hz(ROOT + 31), t, 0.12, 0.16, out!);
    osc(c, "sine", hz(ROOT + 36), t + 0.06, 0.4, 0.14, out!);
    osc(c, "sine", hz(ROOT + 43), t + 0.06, 0.18, 0.03, echo!);
  },

  /** Tihi akord (x4) — drži dok niz traje. */
  padOn() {
    const c = live();
    if (!c || pad) return;
    const t = c.currentTime;
    const gain = c.createGain();
    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.exponentialRampToValueAtTime(0.05, t + 0.9);
    const lp = c.createBiquadFilter();
    lp.type = "lowpass";
    lp.frequency.value = 820;
    lp.Q.value = 0.6;
    const lfo = c.createOscillator();
    const lfoG = c.createGain();
    lfo.frequency.value = 0.18;
    lfoG.gain.value = 260;
    lfo.connect(lfoG);
    lfoG.connect(lp.frequency);
    lp.connect(gain);
    gain.connect(out!);
    const nodes: OscillatorNode[] = [lfo];
    for (const n of [ROOT - 12, ROOT - 5, ROOT + 4]) {
      for (const d of [-8, 8]) {
        const o = c.createOscillator();
        o.type = "sawtooth";
        o.frequency.value = hz(n);
        o.detune.value = d;
        o.connect(lp);
        o.start(t);
        nodes.push(o);
      }
    }
    lfo.start(t);
    pad = { gain, nodes };
  },

  padOff() {
    if (!pad || !ac) {
      pad = null;
      return;
    }
    const t = ac.currentTime;
    const p = pad;
    pad = null;
    p.gain.gain.cancelScheduledValues(t);
    p.gain.gain.setTargetAtTime(0.0001, t, 0.18);
    p.nodes.forEach((o) => {
      try {
        o.stop(t + 1.2);
      } catch {}
    });
  },

  /** Žamor stadiona ispod igre. */
  bedStart() {
    const c = live();
    if (!c || bed) return;
    const t = c.currentTime;
    const src = c.createBufferSource();
    src.buffer = noise(c);
    src.loop = true;
    const bp = c.createBiquadFilter();
    bp.type = "bandpass";
    bp.frequency.value = 620;
    bp.Q.value = 0.5;
    const lp = c.createBiquadFilter();
    lp.type = "lowpass";
    lp.frequency.value = 1700;
    const gain = c.createGain();
    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.exponentialRampToValueAtTime(0.03, t + 1.2);
    const lfo = c.createOscillator();
    const lfoG = c.createGain();
    lfo.frequency.value = 0.35;
    lfoG.gain.value = 0.008;
    lfo.connect(lfoG);
    lfoG.connect(gain.gain);
    src.connect(bp);
    bp.connect(lp);
    lp.connect(gain);
    gain.connect(out!);
    src.start(t, Math.random());
    lfo.start(t);
    bed = { src, gain, lfo };
  },

  /** k 0..1 — koliko je stadion glasan (raste s nizom). */
  bedLevel(k: number) {
    if (!bed || !ac) return;
    bed.gain.gain.setTargetAtTime(0.03 + Math.min(1, Math.max(0, k)) * 0.08, ac.currentTime, 0.6);
  },

  bedStop() {
    if (!bed || !ac) {
      bed = null;
      return;
    }
    const t = ac.currentTime;
    const b = bed;
    bed = null;
    b.gain.gain.cancelScheduledValues(t);
    b.gain.gain.setTargetAtTime(0.0001, t, 0.25);
    try {
      b.src.stop(t + 1.5);
      b.lfo.stop(t + 1.5);
    } catch {}
  },

  stopAll() {
    music.padOff();
    music.bedStop();
  },

  /** Igra je napustila ekran (unmount): ugasi slojeve i uspavaj kontekst, da iOS
   *  ne drži audio sesiju budnom (i ne prekida glazbu drugih aplikacija). */
  sleep() {
    awake = false;
    music.stopAll();
    if (ac && ac.state === "running") {
      const c = ac;
      window.setTimeout(() => {
        if (!awake) void c.suspend().catch(() => {});
      }, 1600);
    }
  }
};
