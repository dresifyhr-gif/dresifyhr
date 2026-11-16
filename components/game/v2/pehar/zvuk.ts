// Zvukovi za kvizove ("Kviz dana", "15 do pehara") — WebAudio, bez datoteka.
//
// Vlastiti mali mikser s mekom jekom (generirani impuls), da zaključavanje,
// napetost i otkrivanje odgovora zvuče "studijski", a ne kao goli oscilatori.
// Poštuje zajednički mute (`dresify_game_mute`) iz ../sfx.
//
// iOS: kontekst smije krenuti tek iz korisnikove geste → zovi `zvuk.unlock()`
// u handleru dodira (Igraj, odabir odgovora...). Višestruki pozivi su bezopasni.

import { isMuted, subscribeMute } from "../sfx";

type Ctx = AudioContext;

let ctx: Ctx | null = null;
let out: GainNode | null = null;
let dry: GainNode | null = null;
let wet: GainNode | null = null;
let noiseBuf: AudioBuffer | null = null;
let unsub: (() => void) | null = null;

const VOL = 0.6;

function build(): Ctx | null {
  if (typeof window === "undefined") return null;
  if (ctx) return ctx;
  const AC: typeof AudioContext | undefined =
    window.AudioContext ||
    (window as unknown as { webkitAudioContext?: typeof AudioContext })
      .webkitAudioContext;
  if (!AC) return null;
  try {
    ctx = new AC({ latencyHint: "interactive" });
  } catch {
    return null;
  }
  const c = ctx;
  const comp = c.createDynamicsCompressor();
  comp.threshold.value = -16;
  comp.knee.value = 14;
  comp.ratio.value = 3.5;
  comp.attack.value = 0.004;
  comp.release.value = 0.25;
  out = c.createGain();
  out.gain.value = isMuted() ? 0 : VOL;
  out.connect(comp);
  comp.connect(c.destination);

  dry = c.createGain();
  dry.gain.value = 1;
  dry.connect(out);

  // Jeka: kratka "dvorana" (1.6 s), generirana iz šuma.
  const conv = c.createConvolver();
  const len = Math.round(c.sampleRate * 1.6);
  const ir = c.createBuffer(2, len, c.sampleRate);
  for (let ch = 0; ch < 2; ch++) {
    const d = ir.getChannelData(ch);
    for (let i = 0; i < len; i++) {
      const t = i / len;
      d[i] = (Math.random() * 2 - 1) * Math.pow(1 - t, 3.2) * 0.6;
    }
  }
  conv.buffer = ir;
  const hp = c.createBiquadFilter();
  hp.type = "highpass";
  hp.frequency.value = 220;
  wet = c.createGain();
  wet.gain.value = 0.28;
  wet.connect(hp);
  hp.connect(conv);
  conv.connect(out);

  unsub = subscribeMute((m) => {
    if (out && ctx)
      out.gain.setTargetAtTime(m ? 0 : VOL, ctx.currentTime, 0.02);
  });
  return c;
}

function ready(): Ctx | null {
  if (isMuted()) return null;
  const c = build();
  if (!c || !dry) return null;
  if (c.state === "suspended") void c.resume().catch(() => {});
  return c;
}

function noise(c: Ctx) {
  if (noiseBuf) return noiseBuf;
  const len = c.sampleRate * 2;
  noiseBuf = c.createBuffer(1, len, c.sampleRate);
  const d = noiseBuf.getChannelData(0);
  let b0 = 0,
    b1 = 0,
    b2 = 0;
  for (let i = 0; i < len; i++) {
    const w = Math.random() * 2 - 1;
    b0 = 0.99765 * b0 + w * 0.099046;
    b1 = 0.963 * b1 + w * 0.2965164;
    b2 = 0.57 * b2 + w * 1.0526913;
    d[i] = (b0 + b1 + b2 + w * 0.1848) * 0.18;
  }
  return noiseBuf;
}

/** Izlaz s mješavinom suho/jeka. */
function bus(c: Ctx, send = 0.3) {
  const g = c.createGain();
  g.connect(dry!);
  if (send > 0) {
    const s = c.createGain();
    s.gain.value = send;
    g.connect(s);
    s.connect(wet!);
  }
  return g;
}

type ToneOpts = {
  type?: OscillatorType;
  f0: number;
  f1?: number;
  t: number;
  dur: number;
  peak: number;
  attack?: number;
  release?: number;
  detune?: number;
  send?: number;
  lp?: number;
};

function tone(c: Ctx, o: ToneOpts) {
  const osc = c.createOscillator();
  const g = c.createGain();
  osc.type = o.type ?? "sine";
  osc.frequency.setValueAtTime(o.f0, o.t);
  if (o.f1) osc.frequency.exponentialRampToValueAtTime(o.f1, o.t + o.dur);
  if (o.detune) osc.detune.value = o.detune;
  const a = o.attack ?? 0.005;
  g.gain.setValueAtTime(0.0001, o.t);
  g.gain.exponentialRampToValueAtTime(Math.max(0.0002, o.peak), o.t + a);
  g.gain.exponentialRampToValueAtTime(0.0001, o.t + a + o.dur);
  let node: AudioNode = osc;
  if (o.lp) {
    const f = c.createBiquadFilter();
    f.type = "lowpass";
    f.frequency.value = o.lp;
    osc.connect(f);
    node = f;
  }
  node.connect(g);
  g.connect(bus(c, o.send ?? 0.25));
  osc.start(o.t);
  osc.stop(o.t + a + o.dur + 0.05);
}

function hiss(
  c: Ctx,
  o: {
    t: number;
    dur: number;
    peak: number;
    type?: BiquadFilterType;
    f0: number;
    f1?: number;
    q?: number;
    attack?: number;
    send?: number;
  },
) {
  const s = c.createBufferSource();
  s.buffer = noise(c);
  const f = c.createBiquadFilter();
  f.type = o.type ?? "bandpass";
  f.frequency.setValueAtTime(o.f0, o.t);
  if (o.f1) f.frequency.exponentialRampToValueAtTime(o.f1, o.t + o.dur);
  f.Q.value = o.q ?? 1;
  const g = c.createGain();
  const a = o.attack ?? 0.003;
  g.gain.setValueAtTime(0.0001, o.t);
  g.gain.exponentialRampToValueAtTime(Math.max(0.0002, o.peak), o.t + a);
  g.gain.exponentialRampToValueAtTime(0.0001, o.t + a + o.dur);
  s.connect(f);
  f.connect(g);
  g.connect(bus(c, o.send ?? 0.15));
  s.start(o.t, Math.random() * 1.5);
  s.stop(o.t + a + o.dur + 0.05);
}

/** Polutonovi iznad osnovnog tona. */
const st = (f: number, n: number) => f * Math.pow(2, n / 12);

let lastSel = 0;

export const zvuk = {
  /** Otključaj (iOS) — pozovi iz geste. */
  unlock() {
    const c = build();
    if (c && c.state === "suspended") void c.resume().catch(() => {});
  },

  /** Diskretan odabir odgovora. */
  select() {
    const c = ready();
    if (!c) return;
    const now = performance.now();
    if (now - lastSel < 40) return;
    lastSel = now;
    const t = c.currentTime;
    tone(c, { type: "triangle", f0: 1180, f1: 980, t, dur: 0.06, peak: 0.07, send: 0.1 });
    hiss(c, { t, dur: 0.02, peak: 0.05, type: "highpass", f0: 4000 });
  },

  /** Novo pitanje: meko "paljenje reflektora". */
  questionIn(step = 0) {
    const c = ready();
    if (!c) return;
    const t = c.currentTime;
    tone(c, { f0: 70, f1: 52, t, dur: 0.45, peak: 0.32, send: 0.05 });
    hiss(c, { t, dur: 0.5, peak: 0.05, f0: 300, f1: 1800, q: 0.8, attack: 0.12 });
    tone(c, { type: "sine", f0: st(392, step % 7), t: t + 0.06, dur: 0.6, peak: 0.045, attack: 0.08, send: 0.6 });
  },

  /** Zaključan odgovor: težak "klonk" + pad koji ostaje visjeti. */
  lock() {
    const c = ready();
    if (!c) return;
    const t = c.currentTime;
    tone(c, { f0: 140, f1: 46, t, dur: 0.32, peak: 0.85, send: 0.15 });
    hiss(c, { t, dur: 0.05, peak: 0.25, type: "highpass", f0: 2500 });
    tone(c, { type: "square", f0: 220, t, dur: 0.08, peak: 0.05, lp: 900 });
    tone(c, { type: "triangle", f0: 110, t: t + 0.02, dur: 1.4, peak: 0.07, attack: 0.25, send: 0.5 });
    tone(c, { type: "triangle", f0: st(110, 7), t: t + 0.02, dur: 1.4, peak: 0.05, attack: 0.3, send: 0.5, detune: 6 });
  },

  /**
   * Napetost: otkucaji srca + podizanje (šum i ton). Traje `sec` sekundi.
   * Vraća funkciju koja odmah utiša (npr. pauza).
   */
  suspense(sec: number) {
    const c = ready();
    if (!c) return () => {};
    const t = c.currentTime;
    const master = c.createGain();
    master.gain.value = 1;
    master.connect(dry!);
    const beat = Math.max(0.55, Math.min(0.85, sec / 3));
    for (let b = 0.05; b < sec - 0.15; b += beat) {
      const k = 0.6 + 0.4 * (b / sec);
      [0, 0.17].forEach((off, j) => {
        const o = c.createOscillator();
        const g = c.createGain();
        o.frequency.setValueAtTime(j ? 58 : 64, t + b + off);
        o.frequency.exponentialRampToValueAtTime(38, t + b + off + 0.16);
        g.gain.setValueAtTime(0.0001, t + b + off);
        g.gain.exponentialRampToValueAtTime((j ? 0.42 : 0.6) * k, t + b + off + 0.012);
        g.gain.exponentialRampToValueAtTime(0.0001, t + b + off + 0.2);
        o.connect(g);
        g.connect(master);
        o.start(t + b + off);
        o.stop(t + b + off + 0.25);
      });
    }
    // podizanje
    const s = c.createBufferSource();
    s.buffer = noise(c);
    s.loop = true;
    const f = c.createBiquadFilter();
    f.type = "bandpass";
    f.Q.value = 2.2;
    f.frequency.setValueAtTime(260, t);
    f.frequency.exponentialRampToValueAtTime(2600, t + sec);
    const g = c.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.09, t + sec * 0.9);
    g.gain.exponentialRampToValueAtTime(0.0001, t + sec + 0.05);
    s.connect(f);
    f.connect(g);
    g.connect(master);
    s.start(t, Math.random());
    s.stop(t + sec + 0.1);
    const o = c.createOscillator();
    const og = c.createGain();
    o.type = "sawtooth";
    o.frequency.setValueAtTime(110, t);
    o.frequency.exponentialRampToValueAtTime(220, t + sec);
    const lp = c.createBiquadFilter();
    lp.type = "lowpass";
    lp.frequency.setValueAtTime(300, t);
    lp.frequency.exponentialRampToValueAtTime(1400, t + sec);
    og.gain.setValueAtTime(0.0001, t);
    og.gain.exponentialRampToValueAtTime(0.035, t + sec * 0.95);
    og.gain.exponentialRampToValueAtTime(0.0001, t + sec + 0.04);
    o.connect(lp);
    lp.connect(og);
    og.connect(master);
    o.start(t);
    o.stop(t + sec + 0.1);
    return () => {
      try {
        master.gain.setTargetAtTime(0.0001, c.currentTime, 0.03);
      } catch {}
    };
  },

  /** Točno: svijetli akord, ton raste s `step` (0..14). */
  correct(step = 0) {
    const c = ready();
    if (!c) return;
    const t = c.currentTime;
    const root = st(523.25, Math.min(step, 12) * 0.5);
    tone(c, { f0: 90, f1: 50, t, dur: 0.25, peak: 0.45, send: 0.05 });
    [0, 4, 7, 12].forEach((n, i) => {
      tone(c, { type: "triangle", f0: st(root, n), t: t + i * 0.028, dur: 0.75, peak: 0.13, attack: 0.006, send: 0.45 });
      tone(c, { type: "sine", f0: st(root, n + 12), t: t + i * 0.028, dur: 0.35, peak: 0.035, send: 0.6, detune: i % 2 ? 7 : -7 });
    });
    hiss(c, { t: t + 0.02, dur: 0.5, peak: 0.05, type: "highpass", f0: 7000, attack: 0.01, send: 0.4 });
  },

  /** Netočno: taman silazni akord + duboki udarac. */
  wrong() {
    const c = ready();
    if (!c) return;
    const t = c.currentTime;
    tone(c, { f0: 110, f1: 36, t, dur: 0.6, peak: 0.9, send: 0.2 });
    hiss(c, { t, dur: 0.3, peak: 0.2, type: "lowpass", f0: 500 });
    [0, 3, 6].forEach((n, i) => {
      tone(c, { type: "sawtooth", f0: st(196, n), f1: st(185, n), t: t + 0.04 + i * 0.03, dur: 0.9, peak: 0.05, lp: 1100, send: 0.45 });
    });
  },

  /** Isteklo vrijeme (Kviz dana). */
  timeout() {
    const c = ready();
    if (!c) return;
    const t = c.currentTime;
    tone(c, { type: "square", f0: 330, t, dur: 0.12, peak: 0.06, lp: 1200 });
    tone(c, { type: "square", f0: 262, t: t + 0.16, dur: 0.32, peak: 0.06, lp: 1000, send: 0.35 });
    tone(c, { f0: 90, f1: 40, t, dur: 0.4, peak: 0.5 });
  },

  /** Stepenica na ljestvici (i = 0..14). */
  step(i: number) {
    const c = ready();
    if (!c) return;
    const t = c.currentTime;
    const scale = [0, 2, 4, 7, 9, 12, 14, 16, 19, 21, 24, 26, 28, 31, 33];
    const f = st(261.63, scale[Math.max(0, Math.min(14, i))]);
    tone(c, { type: "sine", f0: f, t, dur: 0.38, peak: 0.16, attack: 0.004, send: 0.5 });
    tone(c, { type: "sine", f0: f * 4, t, dur: 0.06, peak: 0.03, send: 0.2 });
    tone(c, { type: "triangle", f0: f / 2, t, dur: 0.2, peak: 0.06 });
  },

  /** Brojanje na rezultatu: tihi, kratki ton koji raste sa stepenicom (i = 0..14). */
  tally(i: number) {
    const c = ready();
    if (!c) return;
    const t = c.currentTime;
    const scale = [0, 2, 4, 7, 9, 12, 14, 16, 19, 21, 24, 26, 28, 31, 33];
    const f = st(523.25, scale[Math.max(0, Math.min(14, i))]);
    tone(c, { type: "sine", f0: f, t, dur: 0.11, peak: 0.055, attack: 0.002, send: 0.35 });
    tone(c, { type: "triangle", f0: f / 2, t, dur: 0.05, peak: 0.025 });
  },

  /** Sigurna stepenica (Kvart, Prva liga): široki akord koji se rasprostre. */
  checkpoint() {
    const c = ready();
    if (!c) return;
    const t = c.currentTime;
    [0, 7, 12, 16, 19, 24].forEach((n, i) => {
      tone(c, { type: "triangle", f0: st(196, n), t: t + i * 0.05, dur: 1.6, peak: 0.075, attack: 0.03, send: 0.65, detune: i % 2 ? 5 : -5 });
    });
    tone(c, { f0: 65, f1: 45, t, dur: 0.8, peak: 0.5 });
    hiss(c, { t, dur: 1.2, peak: 0.06, f0: 800, f1: 6000, q: 0.6, attack: 0.3, send: 0.5 });
  },

  /** Džoker: zamah + svjetlucanje. */
  joker() {
    const c = ready();
    if (!c) return;
    const t = c.currentTime;
    hiss(c, { t, dur: 0.3, peak: 0.12, f0: 500, f1: 4000, q: 1.2, attack: 0.05 });
    [0, 5, 9, 12].forEach((n, i) =>
      tone(c, { type: "sine", f0: st(1046.5, n), t: t + 0.08 + i * 0.045, dur: 0.22, peak: 0.05, send: 0.6 }),
    );
  },

  /** Brisanje dva odgovora (50:50). */
  cut() {
    const c = ready();
    if (!c) return;
    const t = c.currentTime;
    [0, 0.12].forEach((d) => {
      hiss(c, { t: t + d, dur: 0.12, peak: 0.14, f0: 2400, f1: 700, q: 2 });
      tone(c, { type: "triangle", f0: 520, f1: 260, t: t + d, dur: 0.12, peak: 0.06 });
    });
  },

  /** Otkucaj sata (Kviz dana, zadnje sekunde) — topliji od sfx.tick. */
  tick(high = false) {
    const c = ready();
    if (!c) return;
    const t = c.currentTime;
    tone(c, { type: "sine", f0: high ? 1760 : 1320, t, dur: 0.05, peak: high ? 0.1 : 0.07, attack: 0.001, send: 0.15 });
    hiss(c, { t, dur: 0.015, peak: 0.06, type: "highpass", f0: 5000 });
  },

  /** Pehar: velika završnica. */
  champion() {
    const c = ready();
    if (!c) return;
    const t = c.currentTime;
    const seq = [0, 4, 7, 12, 16, 19, 24];
    seq.forEach((n, i) => {
      tone(c, { type: "triangle", f0: st(392, n), t: t + i * 0.07, dur: 0.3, peak: 0.12, send: 0.4 });
    });
    const end = t + seq.length * 0.07;
    [0, 4, 7, 12, 16].forEach((n, i) => {
      tone(c, { type: "triangle", f0: st(392, n), t: end, dur: 2.4, peak: 0.08, attack: 0.04, send: 0.7, detune: i % 2 ? 6 : -6 });
      tone(c, { type: "sawtooth", f0: st(196, n), t: end, dur: 1.6, peak: 0.02, lp: 1600, send: 0.5 });
    });
    tone(c, { f0: 80, f1: 40, t: end, dur: 1, peak: 0.7 });
    hiss(c, { t: end, dur: 1.8, peak: 0.07, type: "highpass", f0: 6000, attack: 0.02, send: 0.6 });
  },
};

export function disposeZvuk() {
  unsub?.();
  unsub = null;
}
