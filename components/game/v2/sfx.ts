// Mali WebAudio synth za mini igre — bez audio datoteka.
// Sve se generira u hodu (oscilatori + filtrirani šum), pa nema učitavanja.
//
//   import { sfx, unlockAudio, isMuted, setMuted, subscribeMute } from "@/components/game/v2/sfx";
//   sfx.kick();  sfx.coin(2);  sfx.fanfare();
//
// iOS: AudioContext smije krenuti tek nakon korisnikove geste. unlockAudio()
// se sam veže na prvi dodir/klik (installAudioUnlock), a sigurno ga je zvati i
// ručno iz onClick handlera ("Igraj").

const MUTE_KEY = "dresify_game_mute";

type Ctx = AudioContext;

let ctx: Ctx | null = null;
let master: GainNode | null = null;
let noiseBuf: AudioBuffer | null = null;
let unlocked = false;
let muted: boolean | null = null;
const muteListeners = new Set<(m: boolean) => void>();

function readMuted(): boolean {
  if (muted !== null) return muted;
  try {
    muted = typeof window !== "undefined" && window.localStorage.getItem(MUTE_KEY) === "1";
  } catch {
    muted = false;
  }
  return muted;
}

export function isMuted() {
  return readMuted();
}

export function setMuted(next: boolean) {
  muted = next;
  try {
    window.localStorage.setItem(MUTE_KEY, next ? "1" : "0");
  } catch {}
  if (master && ctx) master.gain.setTargetAtTime(next ? 0 : MASTER_VOL, ctx.currentTime, 0.02);
  muteListeners.forEach((fn) => fn(next));
}

export function toggleMuted() {
  setMuted(!readMuted());
  return readMuted();
}

export function subscribeMute(fn: (m: boolean) => void) {
  muteListeners.add(fn);
  return () => {
    muteListeners.delete(fn);
  };
}

const MASTER_VOL = 0.55;

function getCtx(): Ctx | null {
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
  comp.knee.value = 18;
  comp.ratio.value = 4;
  comp.attack.value = 0.003;
  comp.release.value = 0.2;
  master = ctx.createGain();
  master.gain.value = readMuted() ? 0 : MASTER_VOL;
  master.connect(comp);
  comp.connect(ctx.destination);
  return ctx;
}

/** Otključa zvuk (iOS). Pozovi iz korisnikove geste; višestruki pozivi su bezopasni. */
export function unlockAudio() {
  const c = getCtx();
  if (!c) return;
  if (c.state === "suspended") void c.resume().catch(() => {});
  if (!unlocked) {
    try {
      const b = c.createBuffer(1, 1, 22050);
      const s = c.createBufferSource();
      s.buffer = b;
      s.connect(c.destination);
      s.start(0);
      unlocked = true;
    } catch {}
  }
}

let unlockInstalled = false;
/** Veže unlockAudio na prvu gestu na stranici + pauzira kontekst kad je kartica skrivena. */
export function installAudioUnlock() {
  if (unlockInstalled || typeof window === "undefined") return;
  unlockInstalled = true;
  const once = () => {
    unlockAudio();
    if (unlocked) {
      window.removeEventListener("pointerdown", once, true);
      window.removeEventListener("touchend", once, true);
      window.removeEventListener("keydown", once, true);
    }
  };
  window.addEventListener("pointerdown", once, true);
  window.addEventListener("touchend", once, true);
  window.addEventListener("keydown", once, true);
  document.addEventListener("visibilitychange", () => {
    if (!ctx) return;
    if (document.hidden) void ctx.suspend().catch(() => {});
    else if (unlocked) void ctx.resume().catch(() => {});
  });
}

function ready(): Ctx | null {
  if (readMuted()) return null;
  const c = getCtx();
  if (!c || !master) return null;
  if (c.state === "suspended") void c.resume().catch(() => {});
  return c;
}

function noise(c: Ctx) {
  if (noiseBuf) return noiseBuf;
  const len = c.sampleRate * 2;
  noiseBuf = c.createBuffer(1, len, c.sampleRate);
  const d = noiseBuf.getChannelData(0);
  // Ružičasti-ish šum (mekši od bijelog).
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

function env(c: Ctx, g: GainNode, t: number, peak: number, attack: number, decay: number) {
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(Math.max(peak, 0.0002), t + attack);
  g.gain.exponentialRampToValueAtTime(0.0001, t + attack + decay);
}

function tone(
  c: Ctx,
  opts: { type?: OscillatorType; f0: number; f1?: number; t?: number; dur: number; peak: number; attack?: number; dest?: AudioNode; detune?: number }
) {
  const t = opts.t ?? c.currentTime;
  const o = c.createOscillator();
  const g = c.createGain();
  o.type = opts.type ?? "sine";
  o.frequency.setValueAtTime(opts.f0, t);
  if (opts.f1) o.frequency.exponentialRampToValueAtTime(opts.f1, t + opts.dur);
  if (opts.detune) o.detune.value = opts.detune;
  env(c, g, t, opts.peak, opts.attack ?? 0.005, opts.dur);
  o.connect(g);
  g.connect(opts.dest ?? master!);
  o.start(t);
  o.stop(t + (opts.attack ?? 0.005) + opts.dur + 0.05);
}

function noiseHit(
  c: Ctx,
  opts: { t?: number; dur: number; peak: number; type?: BiquadFilterType; freq: number; q?: number; attack?: number; freqTo?: number }
) {
  const t = opts.t ?? c.currentTime;
  const s = c.createBufferSource();
  s.buffer = noise(c);
  const f = c.createBiquadFilter();
  f.type = opts.type ?? "bandpass";
  f.frequency.setValueAtTime(opts.freq, t);
  if (opts.freqTo) f.frequency.exponentialRampToValueAtTime(opts.freqTo, t + opts.dur);
  f.Q.value = opts.q ?? 1;
  const g = c.createGain();
  env(c, g, t, opts.peak, opts.attack ?? 0.002, opts.dur);
  s.connect(f);
  f.connect(g);
  g.connect(master!);
  const off = Math.random() * 1.5;
  s.start(t, off);
  s.stop(t + (opts.attack ?? 0.002) + opts.dur + 0.05);
}

let lastTick = 0;

export const sfx = {
  /** Udarac lopte: tupi "thump" + kratki klik kože. */
  kick(power = 1) {
    const c = ready();
    if (!c) return;
    const p = Math.min(1.4, Math.max(0.4, power));
    tone(c, { f0: 170 * (0.9 + p * 0.1), f1: 48, dur: 0.16, peak: 0.9 * p });
    noiseHit(c, { dur: 0.035, peak: 0.35 * p, type: "highpass", freq: 1800 });
  },

  /** Sudačka zviždaljka (kratka ili duga). */
  whistle(long = false) {
    const c = ready();
    if (!c) return;
    const t = c.currentTime;
    const dur = long ? 0.75 : 0.32;
    const o = c.createOscillator();
    const lfo = c.createOscillator();
    const lfoG = c.createGain();
    const g = c.createGain();
    const bp = c.createBiquadFilter();
    o.type = "sine";
    o.frequency.value = 2650;
    lfo.frequency.value = 34;
    lfoG.gain.value = 70;
    lfo.connect(lfoG);
    lfoG.connect(o.frequency);
    bp.type = "bandpass";
    bp.frequency.value = 2700;
    bp.Q.value = 2;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.16, t + 0.02);
    g.gain.setValueAtTime(0.16, t + dur - 0.06);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(bp);
    bp.connect(g);
    g.connect(master!);
    o.start(t);
    lfo.start(t);
    o.stop(t + dur + 0.05);
    lfo.stop(t + dur + 0.05);
    noiseHit(c, { t, dur: dur * 0.9, peak: 0.04, freq: 3200, q: 3, attack: 0.02 });
  },

  /** Navijači — filtrirani šum koji naraste i utihne. intensity 0..1 */
  crowd(intensity = 0.7, seconds = 2.2) {
    const c = ready();
    if (!c) return;
    const t = c.currentTime;
    const s = c.createBufferSource();
    s.buffer = noise(c);
    s.loop = true;
    const bp = c.createBiquadFilter();
    bp.type = "bandpass";
    bp.frequency.setValueAtTime(500, t);
    bp.frequency.linearRampToValueAtTime(900 + intensity * 500, t + seconds * 0.35);
    bp.frequency.linearRampToValueAtTime(600, t + seconds);
    bp.Q.value = 0.55;
    const lp = c.createBiquadFilter();
    lp.type = "lowpass";
    lp.frequency.value = 2400;
    const g = c.createGain();
    const peak = 0.12 + intensity * 0.3;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(peak, t + seconds * 0.3);
    g.gain.setValueAtTime(peak, t + seconds * 0.45);
    g.gain.exponentialRampToValueAtTime(0.0001, t + seconds);
    // Lagana "valovitost" kao da se gomila diše.
    const lfo = c.createOscillator();
    const lfoG = c.createGain();
    lfo.frequency.value = 3.2;
    lfoG.gain.value = peak * 0.18;
    lfo.connect(lfoG);
    lfoG.connect(g.gain);
    s.connect(bp);
    bp.connect(lp);
    lp.connect(g);
    g.connect(master!);
    s.start(t, Math.random());
    lfo.start(t);
    s.stop(t + seconds + 0.1);
    lfo.stop(t + seconds + 0.1);
  },

  /** Kratki "pling" — bod/novčić. step podiže ton (kombo). */
  coin(step = 0) {
    const c = ready();
    if (!c) return;
    const t = c.currentTime;
    const k = Math.pow(2, Math.min(step, 12) / 12);
    tone(c, { type: "triangle", f0: 1318 * k, t, dur: 0.12, peak: 0.22 });
    tone(c, { type: "sine", f0: 1975 * k, t: t + 0.055, dur: 0.28, peak: 0.2 });
    tone(c, { type: "sine", f0: 3950 * k, t: t + 0.055, dur: 0.12, peak: 0.04 });
  },

  /** Kratki uspješni akord (gol, točan odgovor). */
  success() {
    const c = ready();
    if (!c) return;
    const t = c.currentTime;
    [659.25, 830.61, 987.77].forEach((f, i) =>
      tone(c, { type: "triangle", f0: f, t: t + i * 0.045, dur: 0.32, peak: 0.16 })
    );
  },

  /** Fanfara za kraj / novi rekord. */
  fanfare() {
    const c = ready();
    if (!c) return;
    const t = c.currentTime;
    const lp = c.createBiquadFilter();
    lp.type = "lowpass";
    lp.frequency.value = 3200;
    lp.connect(master!);
    const notes = [523.25, 659.25, 783.99, 1046.5];
    notes.forEach((f, i) => {
      tone(c, { type: "triangle", f0: f, t: t + i * 0.09, dur: 0.22, peak: 0.2, dest: lp });
      tone(c, { type: "square", f0: f, t: t + i * 0.09, dur: 0.12, peak: 0.035, dest: lp });
    });
    const end = t + notes.length * 0.09;
    [523.25, 659.25, 783.99, 1046.5].forEach((f, i) => {
      tone(c, { type: "triangle", f0: f, t: end, dur: 0.9, peak: 0.12, attack: 0.02, dest: lp, detune: i % 2 ? 5 : -5 });
    });
    noiseHit(c, { t: end, dur: 0.6, peak: 0.05, type: "highpass", freq: 6000, attack: 0.01 });
  },

  /** Promašaj / kraj — tupi udarac + silazni ton. */
  fail() {
    const c = ready();
    if (!c) return;
    const t = c.currentTime;
    tone(c, { f0: 120, f1: 45, t, dur: 0.38, peak: 0.8 });
    noiseHit(c, { t, dur: 0.18, peak: 0.25, type: "lowpass", freq: 600 });
    tone(c, { type: "triangle", f0: 392, f1: 262, t: t + 0.06, dur: 0.42, peak: 0.08 });
  },

  /** Otkucaj sata (zadnje sekunde). */
  tick(high = false) {
    const c = ready();
    if (!c) return;
    const now = performance.now();
    if (now - lastTick < 30) return;
    lastTick = now;
    tone(c, { type: "square", f0: high ? 2100 : 1500, dur: 0.025, peak: 0.06, attack: 0.001 });
  },

  /** Klik kola sreće / pregrade. */
  wheelClick() {
    const c = ready();
    if (!c) return;
    const now = performance.now();
    if (now - lastTick < 18) return;
    lastTick = now;
    noiseHit(c, { dur: 0.018, peak: 0.28, freq: 3400, q: 4, attack: 0.001 });
    tone(c, { type: "sine", f0: 950, dur: 0.03, peak: 0.07, attack: 0.001 });
  },

  /** Zamah (bacanje, brzi pokret). */
  whoosh() {
    const c = ready();
    if (!c) return;
    noiseHit(c, { dur: 0.22, peak: 0.16, freq: 600, freqTo: 3000, q: 1.2, attack: 0.04 });
  },

  /** Diskretni UI dodir. */
  tap() {
    const c = ready();
    if (!c) return;
    tone(c, { type: "sine", f0: 880, f1: 660, dur: 0.05, peak: 0.08, attack: 0.002 });
  }
};

export type Sfx = typeof sfx;

/** Lagana vibracija gdje postoji (Android). iOS Safari to ignorira. */
export function haptic(ms = 12) {
  if (readMuted()) return;
  try {
    navigator.vibrate?.(ms);
  } catch {}
}
