// Dodatni zvukovi za Penalty Karijeru (stativa, mreža, rukavice, odskok, žamor stadiona).
// Zajednički sfx.ts ih nema, a ne diramo ga — ovo je mali zaseban synth koji
// poštuje isti mute (dresify_game_mute) i otključava se na istoj gesti.

import { isMuted, subscribeMute } from "../sfx";

let ctx: AudioContext | null = null;
let out: GainNode | null = null;
let noiseBuf: AudioBuffer | null = null;
let hooked = false;
let amb: { gain: GainNode } | null = null;

function get(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (ctx) return ctx;
  const AC: typeof AudioContext | undefined =
    window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AC) return null;
  try {
    ctx = new AC({ latencyHint: "interactive" });
  } catch {
    return null;
  }
  const comp = ctx.createDynamicsCompressor();
  comp.threshold.value = -12;
  comp.ratio.value = 4;
  out = ctx.createGain();
  out.gain.value = isMuted() ? 0 : 0.5;
  out.connect(comp);
  comp.connect(ctx.destination);
  if (!hooked) {
    hooked = true;
    subscribeMute((m) => {
      if (ctx && out) out.gain.setTargetAtTime(m ? 0 : 0.5, ctx.currentTime, 0.02);
    });
    document.addEventListener("visibilitychange", () => {
      if (!ctx) return;
      if (document.hidden) void ctx.suspend().catch(() => {});
      else void ctx.resume().catch(() => {});
    });
  }
  return ctx;
}

/** Zovi iz geste (dodir) — iOS tek tada pusti zvuk. */
export function unlockPenaltyAudio() {
  const c = get();
  if (!c) return;
  if (c.state === "suspended") void c.resume().catch(() => {});
  try {
    const b = c.createBuffer(1, 1, 22050);
    const s = c.createBufferSource();
    s.buffer = b;
    s.connect(c.destination);
    s.start(0);
  } catch {}
}

function ready() {
  if (isMuted()) return null;
  const c = get();
  if (!c || !out) return null;
  if (c.state === "suspended") void c.resume().catch(() => {});
  return c;
}

function noise(c: AudioContext) {
  if (noiseBuf) return noiseBuf;
  const len = c.sampleRate;
  noiseBuf = c.createBuffer(1, len, c.sampleRate);
  const d = noiseBuf.getChannelData(0);
  for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
  return noiseBuf;
}

function partial(c: AudioContext, f: number, t: number, peak: number, decay: number, type: OscillatorType = "sine") {
  const o = c.createOscillator();
  const g = c.createGain();
  o.type = type;
  o.frequency.setValueAtTime(f, t);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(peak, t + 0.003);
  g.gain.exponentialRampToValueAtTime(0.0001, t + decay);
  o.connect(g);
  g.connect(out!);
  o.start(t);
  o.stop(t + decay + 0.05);
}

function burst(c: AudioContext, t: number, opts: { dur: number; peak: number; freq: number; to?: number; q?: number; type?: BiquadFilterType; attack?: number }) {
  const s = c.createBufferSource();
  s.buffer = noise(c);
  const f = c.createBiquadFilter();
  f.type = opts.type ?? "bandpass";
  f.frequency.setValueAtTime(opts.freq, t);
  if (opts.to) f.frequency.exponentialRampToValueAtTime(opts.to, t + opts.dur);
  f.Q.value = opts.q ?? 1;
  const g = c.createGain();
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(opts.peak, t + (opts.attack ?? 0.004));
  g.gain.exponentialRampToValueAtTime(0.0001, t + opts.dur);
  s.connect(f);
  f.connect(g);
  g.connect(out!);
  s.start(t, Math.random() * 0.5);
  s.stop(t + opts.dur + 0.05);
}

export const penaltySfx = {
  /** Metalni "klonk" stative/prečke — neharmonijski parcijali + klik. */
  clank(intensity = 1) {
    const c = ready();
    if (!c) return;
    const t = c.currentTime;
    const k = Math.max(0.4, Math.min(1.2, intensity));
    burst(c, t, { dur: 0.03, peak: 0.6 * k, freq: 3800, q: 0.8, type: "highpass" });
    const base = 480 + Math.random() * 40;
    [1, 2.76, 4.07, 5.4, 8.93].forEach((m, i) => partial(c, base * m, t, (0.32 / (i + 1)) * k, 1.1 - i * 0.16, i === 0 ? "triangle" : "sine"));
    partial(c, 120, t, 0.5 * k, 0.12);
  },
  /** Lopta u mreži — mekani "šuš". */
  net() {
    const c = ready();
    if (!c) return;
    const t = c.currentTime;
    burst(c, t, { dur: 0.42, peak: 0.32, freq: 900, to: 2600, q: 0.7, attack: 0.02 });
    burst(c, t + 0.02, { dur: 0.22, peak: 0.18, freq: 220, type: "lowpass" });
  },
  /** Lopta u rukavicama / od tijela golmana. */
  glove(strong = false) {
    const c = ready();
    if (!c) return;
    const t = c.currentTime;
    partial(c, strong ? 150 : 180, t, 0.7, 0.16);
    burst(c, t, { dur: 0.08, peak: 0.45, freq: 1400, q: 0.9 });
    burst(c, t, { dur: 0.16, peak: 0.25, freq: 400, type: "lowpass" });
  },
  /** Odskok od trave. */
  bounce(v = 1) {
    const c = ready();
    if (!c) return;
    const t = c.currentTime;
    const k = Math.max(0.1, Math.min(1, v));
    partial(c, 95, t, 0.35 * k, 0.1);
    burst(c, t, { dur: 0.04, peak: 0.12 * k, freq: 900, q: 1 });
  },
  /** Lopta u tijelo igrača u zidu — tupi udarac. */
  body(v = 1) {
    const c = ready();
    if (!c) return;
    const t = c.currentTime;
    const k = Math.max(0.3, Math.min(1, v));
    partial(c, 82, t, 0.75 * k, 0.18);
    partial(c, 140, t, 0.3 * k, 0.09, "triangle");
    burst(c, t, { dur: 0.12, peak: 0.4 * k, freq: 520, type: "lowpass" });
    burst(c, t, { dur: 0.05, peak: 0.18 * k, freq: 2200, q: 0.8 });
  },
  /** Pogođena meta — svijetli "cing" s iskrama. */
  ring() {
    const c = ready();
    if (!c) return;
    const t = c.currentTime;
    [1318.5, 1975.5, 2637].forEach((f, i) => partial(c, f, t + i * 0.045, 0.22 / (i + 1), 0.9 - i * 0.2));
    partial(c, 3951, t + 0.1, 0.05, 0.5);
    burst(c, t, { dur: 0.25, peak: 0.08, freq: 6000, q: 0.6, type: "highpass" });
  },
  /** Nova razina — dva tona prema gore. */
  level() {
    const c = ready();
    if (!c) return;
    const t = c.currentTime;
    partial(c, 659.3, t, 0.16, 0.28, "triangle");
    partial(c, 987.8, t + 0.09, 0.16, 0.42, "triangle");
    partial(c, 1975.5, t + 0.09, 0.03, 0.4);
  },
  /** Boss izlazi — niski udar i šum koji naraste. */
  boss() {
    const c = ready();
    if (!c) return;
    const t = c.currentTime;
    const o = c.createOscillator();
    const g = c.createGain();
    o.type = "sine";
    o.frequency.setValueAtTime(90, t);
    o.frequency.exponentialRampToValueAtTime(38, t + 0.9);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.85, t + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 1.1);
    o.connect(g);
    g.connect(out!);
    o.start(t);
    o.stop(t + 1.2);
    burst(c, t, { dur: 0.9, peak: 0.12, freq: 300, to: 1600, q: 0.7, attack: 0.5 });
    partial(c, 55, t + 0.55, 0.5, 0.5);
  },
  /** Izgubljen život — kratki ton prema dolje. */
  life() {
    const c = ready();
    if (!c) return;
    const t = c.currentTime;
    const o = c.createOscillator();
    const g = c.createGain();
    o.type = "triangle";
    o.frequency.setValueAtTime(392, t);
    o.frequency.exponentialRampToValueAtTime(196, t + 0.32);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.2, t + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.4);
    o.connect(g);
    g.connect(out!);
    o.start(t);
    o.stop(t + 0.45);
  },
  /** Dodatni "udarac kože" uz zajednički kick: niski sub i kratki klik vezice. */
  strike(power = 1) {
    const c = ready();
    if (!c) return;
    const t = c.currentTime;
    const p = Math.max(0.3, Math.min(1.2, power));
    const o = c.createOscillator();
    const g = c.createGain();
    o.type = "sine";
    o.frequency.setValueAtTime(92, t);
    o.frequency.exponentialRampToValueAtTime(44, t + 0.14);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.42 * p, t + 0.004);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.18);
    o.connect(g);
    g.connect(out!);
    o.start(t);
    o.stop(t + 0.22);
    burst(c, t, { dur: 0.025, peak: 0.22 * p, freq: 1250, q: 1.4 });
  },
  /** Gol: niski udar stadiona i svijetli "zrak" — umjesto arkadnog akorda. */
  goal(boss = false) {
    const c = ready();
    if (!c) return;
    const t = c.currentTime;
    const o = c.createOscillator();
    const g = c.createGain();
    o.type = "sine";
    o.frequency.setValueAtTime(boss ? 74 : 82, t);
    o.frequency.exponentialRampToValueAtTime(38, t + 0.55);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(boss ? 0.8 : 0.62, t + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.7);
    o.connect(g);
    g.connect(out!);
    o.start(t);
    o.stop(t + 0.75);
    burst(c, t, { dur: 0.9, peak: 0.07, freq: 5200, to: 9000, q: 0.5, type: "highpass", attack: 0.03 });
    // Mekani durski akord (kvinta + terca), tih, da ne zvuči kao automat.
    const root = boss ? 392 : 440;
    [1, 1.26, 1.5, 2].forEach((m, i) => partial(c, root * m, t + 0.04 + i * 0.03, 0.07 / (1 + i * 0.4), 0.9 - i * 0.1, "triangle"));
  },
  /** Navijači uzdahnu ("uuuh") — promašaj ili obrana. */
  groan(k = 1) {
    const c = ready();
    if (!c) return;
    const t = c.currentTime + 0.05;
    const a = Math.max(0.3, Math.min(1.2, k));
    burst(c, t, { dur: 1.3, peak: 0.16 * a, freq: 640, to: 360, q: 3.2, attack: 0.18 });
    burst(c, t, { dur: 1.1, peak: 0.08 * a, freq: 1150, to: 760, q: 4, attack: 0.2 });
    burst(c, t, { dur: 1.2, peak: 0.06 * a, freq: 300, type: "lowpass", attack: 0.25 });
  },
  /** Kovanica stigla u brojač: tihi "tik", ton raste s brojem. */
  tally(i = 0, last = false) {
    const c = ready();
    if (!c) return;
    const t = c.currentTime;
    const f = 1500 * Math.pow(2, Math.min(i, 12) / 12);
    partial(c, f, t, last ? 0.09 : 0.055, last ? 0.32 : 0.12, "triangle");
    if (last) partial(c, f * 1.5, t + 0.04, 0.04, 0.3);
    burst(c, t, { dur: 0.015, peak: 0.05, freq: 5200, q: 2 });
  },
  /**
   * Žamor stadiona u pozadini (petlja). level 0..1; 0 = utihne.
   * Prije udarca stadion utihne, dok lopta leti naraste.
   */
  ambience(level: number, time = 0.35) {
    const c = get();
    if (!c || !out) return;
    if (!amb) {
      if (level <= 0) return;
      try {
        const len = Math.floor(c.sampleRate * 2.7);
        const buf = c.createBuffer(1, len, c.sampleRate);
        const d = buf.getChannelData(0);
        let b0 = 0;
        let b1 = 0;
        for (let i = 0; i < len; i++) {
          const w = Math.random() * 2 - 1;
          b0 = 0.995 * b0 + w * 0.06;
          b1 = 0.9 * b1 + w * 0.3;
          d[i] = (b0 + b1 * 0.5 + w * 0.06) * 0.9;
        }
        // Glatki spoj kraja i početka petlje.
        const fade = Math.floor(c.sampleRate * 0.08);
        for (let i = 0; i < fade; i++) {
          const k = i / fade;
          d[len - fade + i] = d[len - fade + i] * (1 - k) + d[i] * k;
        }
        const src = c.createBufferSource();
        src.buffer = buf;
        src.loop = true;
        src.loopStart = 0;
        src.loopEnd = (len - fade) / c.sampleRate;
        const bp = c.createBiquadFilter();
        bp.type = "bandpass";
        bp.frequency.value = 520;
        bp.Q.value = 0.45;
        const lp = c.createBiquadFilter();
        lp.type = "lowpass";
        lp.frequency.value = 1800;
        // Gomila "diše": LFO mijenja jačinu ±18 % (u zasebnom stupnju, pa je na 0 tišina).
        const breathe = c.createGain();
        breathe.gain.value = 1;
        const lfo = c.createOscillator();
        const lfoG = c.createGain();
        lfo.frequency.value = 0.21;
        lfoG.gain.value = 0.18;
        lfo.connect(lfoG);
        lfoG.connect(breathe.gain);
        const g = c.createGain();
        g.gain.value = 0.0001;
        src.connect(bp);
        bp.connect(lp);
        lp.connect(breathe);
        breathe.connect(g);
        g.connect(out);
        src.start();
        lfo.start();
        amb = { gain: g };
      } catch {
        return;
      }
    }
    amb.gain.gain.setTargetAtTime(Math.max(0.0001, level * 0.075), c.currentTime, time);
  },
  /** Kupnja u svlačionici. */
  buy() {
    const c = ready();
    if (!c) return;
    const t = c.currentTime;
    burst(c, t, { dur: 0.04, peak: 0.25, freq: 3200, q: 1.2 });
    [1046.5, 1568, 2093].forEach((f, i) => partial(c, f, t + 0.03 + i * 0.06, 0.16, 0.35));
  }
};
