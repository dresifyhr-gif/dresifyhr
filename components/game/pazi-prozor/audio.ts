// PAZI PROZOR! — dodatni zvukovi (beton, lim auta, kontejner, staklo).
// Mali zaseban WebAudio synth; poštuje zajednički mute (dresify_game_mute).

import { isMuted, subscribeMute } from "../v2/sfx";

let ctx: AudioContext | null = null;
let out: GainNode | null = null;
let verb: ConvolverNode | null = null;
let verbIn: GainNode | null = null;
let noiseBuf: AudioBuffer | null = null;
let hooked = false;
const VOL = 0.6;

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
  comp.threshold.value = -14;
  comp.ratio.value = 4;
  comp.attack.value = 0.002;
  comp.release.value = 0.18;
  out = ctx.createGain();
  out.gain.value = isMuted() ? 0 : VOL;
  out.connect(comp);
  comp.connect(ctx.destination);
  // kratka "dvorišna" jeka: impulsni odziv iz šuma s brzim padom + rana refleksija od zgrade
  try {
    const len = Math.round(ctx.sampleRate * 1.1);
    const ir = ctx.createBuffer(2, len, ctx.sampleRate);
    for (let ch = 0; ch < 2; ch++) {
      const d = ir.getChannelData(ch);
      for (let i = 0; i < len; i++) {
        const t = i / ctx.sampleRate;
        const early = Math.abs(t - 0.055 - ch * 0.012) < 0.004 ? 0.6 : 0;
        d[i] = ((Math.random() * 2 - 1) * Math.exp(-t * 6.5) * 0.55 + early * (Math.random() * 2 - 1)) * (1 - t / 1.1);
      }
    }
    verb = ctx.createConvolver();
    verb.buffer = ir;
    verbIn = ctx.createGain();
    verbIn.gain.value = 0.32;
    verbIn.connect(verb);
    verb.connect(out);
  } catch {
    verb = null;
    verbIn = null;
  }
  if (!hooked) {
    hooked = true;
    subscribeMute((m) => {
      if (ctx && out) out.gain.setTargetAtTime(m ? 0 : VOL, ctx.currentTime, 0.02);
    });
    document.addEventListener("visibilitychange", () => {
      if (!ctx) return;
      if (document.hidden) void ctx.suspend().catch(() => {});
      else void ctx.resume().catch(() => {});
    });
  }
  return ctx;
}

/** Zovi iz geste (iOS). */
export function unlockPaziAudio() {
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
  const len = c.sampleRate * 2;
  noiseBuf = c.createBuffer(1, len, c.sampleRate);
  const d = noiseBuf.getChannelData(0);
  for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
  return noiseBuf;
}

function dest(wet: number) {
  // vrati čvor koji šalje i suho i u jeku
  const c = ctx!;
  const g = c.createGain();
  g.connect(out!);
  if (verbIn && wet > 0) {
    const w = c.createGain();
    w.gain.value = wet;
    g.connect(w);
    w.connect(verbIn);
  }
  return g;
}

function tone(c: AudioContext, o: { type?: OscillatorType; f0: number; f1?: number; t?: number; dur: number; peak: number; attack?: number; to: AudioNode }) {
  const t = o.t ?? c.currentTime;
  const osc = c.createOscillator();
  const g = c.createGain();
  osc.type = o.type ?? "sine";
  osc.frequency.setValueAtTime(o.f0, t);
  if (o.f1) osc.frequency.exponentialRampToValueAtTime(o.f1, t + o.dur);
  const a = o.attack ?? 0.003;
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(Math.max(0.0002, o.peak), t + a);
  g.gain.exponentialRampToValueAtTime(0.0001, t + a + o.dur);
  osc.connect(g);
  g.connect(o.to);
  osc.start(t);
  osc.stop(t + a + o.dur + 0.05);
}

function burst(c: AudioContext, o: { t?: number; dur: number; peak: number; type?: BiquadFilterType; freq: number; q?: number; to: AudioNode; freqTo?: number; attack?: number }) {
  const t = o.t ?? c.currentTime;
  const s = c.createBufferSource();
  s.buffer = noise(c);
  const f = c.createBiquadFilter();
  f.type = o.type ?? "bandpass";
  f.frequency.setValueAtTime(o.freq, t);
  if (o.freqTo) f.frequency.exponentialRampToValueAtTime(o.freqTo, t + o.dur);
  f.Q.value = o.q ?? 1;
  const g = c.createGain();
  const a = o.attack ?? 0.001;
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(Math.max(0.0002, o.peak), t + a);
  g.gain.exponentialRampToValueAtTime(0.0001, t + a + o.dur);
  s.connect(f);
  f.connect(g);
  g.connect(o.to);
  s.start(t, Math.random() * 1.5);
  s.stop(t + a + o.dur + 0.05);
}

const k01 = (impact: number, max = 16) => Math.max(0.15, Math.min(1, impact / max));
let lastGround = 0;

export const pazi = {
  /** Lopta o betonski zid: tupi udarac + kratka jeka dvorišta. */
  wall(impact: number) {
    const c = ready();
    if (!c) return;
    const k = k01(impact);
    const d = dest(0.9);
    tone(c, { f0: 150 + k * 40, f1: 55, dur: 0.14, peak: 0.85 * k, to: d });
    burst(c, { dur: 0.05, peak: 0.45 * k, type: "lowpass", freq: 1400, to: d });
    burst(c, { dur: 0.02, peak: 0.25 * k, type: "highpass", freq: 2500, to: d });
  },
  /** Lim starog auta: "bonk" s neharmonijskim prizvucima. */
  car(impact: number) {
    const c = ready();
    if (!c) return;
    const k = k01(impact);
    const d = dest(0.6);
    tone(c, { f0: 120, f1: 70, dur: 0.18, peak: 0.7 * k, to: d });
    [311, 523, 877, 1290].forEach((f, i) => tone(c, { type: i % 2 ? "triangle" : "sine", f0: f * (0.97 + Math.random() * 0.06), dur: 0.22 + 0.1 * (3 - i), peak: (0.16 - i * 0.03) * k, to: d }));
    burst(c, { dur: 0.04, peak: 0.3 * k, type: "bandpass", freq: 2200, q: 2, to: d });
  },
  /** Kratki zvuk alarma auta (dva "ciju"). */
  alarm() {
    const c = ready();
    if (!c) return;
    const d = dest(0.8);
    const t = c.currentTime + 0.08;
    for (let i = 0; i < 3; i++) {
      tone(c, { type: "square", f0: 1350, f1: 760, t: t + i * 0.26, dur: 0.2, peak: 0.05, to: d });
    }
  },
  /** Metalni kontejner: zvono s dugim repom. */
  clang(impact: number) {
    const c = ready();
    if (!c) return;
    const k = k01(impact);
    const d = dest(1);
    tone(c, { f0: 95, f1: 60, dur: 0.25, peak: 0.6 * k, to: d });
    [220, 563, 1123, 1688, 2410].forEach((f, i) => tone(c, { type: "sine", f0: f * (0.98 + Math.random() * 0.04), dur: 0.7 - i * 0.1, peak: (0.2 - i * 0.03) * k, to: d }));
    burst(c, { dur: 0.06, peak: 0.25 * k, type: "highpass", freq: 3000, to: d });
  },
  /** Stup lampe: tanki "ting". */
  pole(impact: number) {
    const c = ready();
    if (!c) return;
    const k = k01(impact);
    const d = dest(0.8);
    [740, 1980, 3350].forEach((f, i) => tone(c, { f0: f, dur: 0.9 - i * 0.25, peak: (0.22 - i * 0.06) * k, to: d }));
    burst(c, { dur: 0.02, peak: 0.2 * k, type: "highpass", freq: 4000, to: d });
  },
  /** Ruksak / klupa: mekani tupi udarac. */
  soft(impact: number) {
    const c = ready();
    if (!c) return;
    const k = k01(impact);
    const d = dest(0.3);
    tone(c, { f0: 110, f1: 60, dur: 0.12, peak: 0.6 * k, to: d });
    burst(c, { dur: 0.08, peak: 0.3 * k, type: "lowpass", freq: 700, to: d });
  },
  /** Odskok od asfalta. */
  ground(impact: number) {
    const c = ready();
    if (!c) return;
    const now = performance.now();
    if (now - lastGround < 60) return;
    lastGround = now;
    const k = k01(impact, 10);
    const d = dest(0.5);
    tone(c, { f0: 180, f1: 70, dur: 0.09, peak: 0.45 * k, to: d });
    burst(c, { dur: 0.03, peak: 0.18 * k, type: "bandpass", freq: 1800, q: 1.4, to: d });
  },
  /** Razbijeno staklo: prasak + kiša krhotina. */
  glass() {
    const c = ready();
    if (!c) return;
    const d = dest(1);
    const t = c.currentTime;
    burst(c, { t, dur: 0.25, peak: 0.9, type: "highpass", freq: 2500, to: d });
    burst(c, { t, dur: 0.12, peak: 0.7, type: "bandpass", freq: 5200, q: 0.8, to: d });
    tone(c, { f0: 140, f1: 60, t, dur: 0.12, peak: 0.6, to: d });
    for (let i = 0; i < 26; i++) {
      const tt = t + 0.03 + Math.random() * 0.9 + (i > 16 ? 0.4 : 0);
      tone(c, { f0: 2600 + Math.random() * 5200, t: tt, dur: 0.05 + Math.random() * 0.12, peak: 0.05 + Math.random() * 0.08, to: d });
      if (i % 3 === 0) burst(c, { t: tt, dur: 0.03, peak: 0.12, type: "highpass", freq: 6000, to: d });
    }
  },
  /** Zatezanje praćke — tihi klik koji raste s jačinom. */
  stretch(step: number) {
    const c = ready();
    if (!c) return;
    const d = dest(0);
    tone(c, { type: "triangle", f0: 500 + step * 90, dur: 0.025, peak: 0.05 + step * 0.006, attack: 0.001, to: d });
  },
  /** Nova lopta na točki: mekani "pop" (tih, da ne smeta nakon gola). */
  pop() {
    const c = ready();
    if (!c) return;
    const d = dest(0.25);
    const t = c.currentTime + 0.12;
    tone(c, { f0: 420, f1: 760, t, dur: 0.07, peak: 0.09, attack: 0.004, to: d });
    tone(c, { type: "triangle", f0: 1520, t: t + 0.02, dur: 0.05, peak: 0.025, to: d });
  },
  /** Brzi "fiju" za udarac jakom snagom. */
  swish(power: number) {
    const c = ready();
    if (!c) return;
    const d = dest(0.2);
    burst(c, { dur: 0.28, peak: 0.12 * power, freq: 700, freqTo: 3400, q: 1.1, attack: 0.03, to: d });
  },
  /** Dječji "jeeej" — šum s formantima koji raste (bez glasa). */
  cheer(intensity = 0.6) {
    const c = ready();
    if (!c) return;
    const d = dest(0.9);
    const t = c.currentTime;
    const dur = 1.6 + intensity;
    [900, 1500, 2600].forEach((f, i) => {
      const s = c.createBufferSource();
      s.buffer = noise(c);
      s.loop = true;
      const bp = c.createBiquadFilter();
      bp.type = "bandpass";
      bp.Q.value = 4 - i;
      bp.frequency.setValueAtTime(f * 0.85, t);
      bp.frequency.linearRampToValueAtTime(f * 1.15, t + 0.4);
      bp.frequency.linearRampToValueAtTime(f, t + dur);
      const g = c.createGain();
      const pk = (0.16 - i * 0.03) * (0.5 + intensity);
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(pk, t + 0.12);
      g.gain.setValueAtTime(pk, t + dur * 0.35);
      g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      s.connect(bp);
      bp.connect(g);
      g.connect(d);
      s.start(t, Math.random());
      s.stop(t + dur + 0.1);
    });
  }
};
