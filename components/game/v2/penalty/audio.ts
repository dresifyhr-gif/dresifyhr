// Dodatni zvukovi za Penalty Cup (stativa, mreža, rukavice, odskok).
// Zajednički sfx.ts ih nema, a ne diramo ga — ovo je mali zaseban synth koji
// poštuje isti mute (dresify_game_mute) i otključava se na istoj gesti.

import { isMuted, subscribeMute } from "../sfx";

let ctx: AudioContext | null = null;
let out: GainNode | null = null;
let noiseBuf: AudioBuffer | null = null;
let hooked = false;

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
  }
};
