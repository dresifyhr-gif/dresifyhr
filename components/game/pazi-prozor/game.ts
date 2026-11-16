// PAZI PROZOR! — tijek igre: intro, nišanjenje praćkom, let, gol/promašaj/prozor.
// Ovdje nema Reacta; komponenta prosljeđuje dodire i crta HUD iz povratnih poziva.

import { haptic, sfx } from "../v2/sfx";
import { pazi } from "./audio";
import type { Engine } from "./engine";
import {
  BALL_R, BALL_START, COURT, GOAL_HALF, GOAL_TOP, GOAL_Z, WINDOW, buildColliders, launch, newBall, predict, stepBall, type Ball, type Box, type ShotInput, type SimEvent,
  type Style, type V3
} from "./physics";

export const BALLS = 3;

export type ShotOutcome = { kind: "goal"; style: Style; points: number } | { kind: "miss"; over: boolean } | { kind: "window" };

export type Callout =
  | { id: number; type: "bounce"; n: number; name: string }
  | { id: number; type: "goal"; name: string; points: number; bounces: number }
  | { id: number; type: "miss"; text: string }
  | { id: number; type: "window" }
  | { id: number; type: "small"; text: string }
  | { id: number; type: "ball"; n: number; total: number }
  | { id: number; type: "clear" };

export type AimInfo = { active: boolean; power: number; curve: number; danger: boolean; x0: number; y0: number; x: number; y: number };

export type GameCallbacks = {
  onScore: (score: number, shots: ShotOutcome[]) => void;
  onCallout: (c: Callout) => void;
  onAim: (a: AimInfo) => void;
  onHint: (show: boolean) => void;
  onEnd: (score: number, shots: ShotOutcome[]) => void;
};

type Phase = "attract" | "intro" | "aim" | "windup" | "flight" | "after" | "reset" | "over";

const easeInOut = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
const clamp = (v: number, a: number, b: number) => (v < a ? a : v > b ? b : v);
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

let calloutId = 0;
const cid = () => ++calloutId;

export class Game {
  boxes: Box[] = buildColliders();
  ball: Ball = newBall();
  phase: Phase = "attract";
  phaseT = 0;
  time = 0;
  score = 0;
  shots: ShotOutcome[] = [];
  ev: SimEvent[] = [];

  timeScale = 1;
  hitstop = 0;
  slowmo = false;
  slowmoT = 0;
  goalAt = -1;
  aftermath = 0;
  endReason: "goal" | "miss" | "window" | null = null;
  over = false;
  shotsFired = 0;
  deadCheck = 0;
  rounds = 0;
  introD = 2;
  /** Natpis za promašaj ovog udarca ("Preko gola", "Za dlaku"). */
  missText: string | null = null;

  // nišanjenje
  pointerId = -1;
  path: { x: number; y: number }[] = [];
  aim: ShotInput = { yaw: 0, power: 0, curve: 0 };
  lastStretchStep = 0;
  preview: V3[] = Array.from({ length: 40 }, () => ({ x: 0, y: 0, z: 0 }));
  pending: ShotInput | null = null;

  // kamera
  introFrom: { pos: V3; look: V3 } | null = null;
  orbitA = 0;
  windowFlash = 0;
  winMoodT = 0;

  constructor(public engine: Engine, private cb: GameCallbacks) {
    this.engine.setCam(this.orbitShot(0), true);
  }

  // ── kamere ─────────────────────────────────────────────────────────
  private aimShot(power = 0) {
    const e = this.engine;
    const portrait = e.portrait;
    const back = portrait ? 7.4 : 6.2;
    const up = portrait ? 4.7 : 3.4;
    return {
      pos: { x: 0, y: up - power * 0.35, z: BALL_START.z + back - power * 0.5 },
      look: { x: 0, y: portrait ? -0.6 : 0.2, z: portrait ? -7.5 : -6 },
      fov: portrait ? 56 : 44,
      lambda: 5
    };
  }
  private orbitShot(t: number) {
    const a = Math.sin(t * 0.13) * 0.75 + 0.15;
    const r = 13.5;
    const portrait = this.engine.portrait;
    return {
      pos: { x: Math.sin(a) * r, y: 6.2 + Math.sin(t * 0.21) * 0.6, z: -4 + Math.cos(a) * r },
      look: { x: 0, y: portrait ? 2.4 : 2.0, z: -8.5 },
      fov: portrait ? 62 : 46,
      lambda: 2.2
    };
  }

  // ── tijek ──────────────────────────────────────────────────────────
  start() {
    this.score = 0;
    this.shots = [];
    this.shotsFired = 0;
    this.over = false;
    // "Kreni ispočetka" može doći usred leta ili dok baka još maše
    this.winMoodT = 0;
    this.pending = null;
    this.pointerId = -1;
    this.aftermath = 0;
    this.engine.hideTrajectory();
    this.cb.onAim({ active: false, power: 0, curve: 0, danger: false, x0: 0, y0: 0, x: 0, y: 0 });
    this.engine.setWindowMood(0);
    this.engine.clearFx();
    this.engine.shards.clear();
    this.engine.resetKid();
    this.cb.onScore(0, []);
    this.cb.onCallout({ id: cid(), type: "clear" });
    this.resetBall();
    // prva runda: puni prelet kamere; svaka iduća kraće, da se brže igra
    this.introD = this.rounds++ === 0 ? 2.0 : 1.35;
    sfx.whoosh();
    const cam = this.engine.camera;
    this.introFrom = {
      pos: { x: cam.position.x, y: cam.position.y, z: cam.position.z },
      look: { x: this.engine.camLook.x, y: this.engine.camLook.y, z: this.engine.camLook.z }
    };
    this.setPhase("intro");
  }

  private setPhase(p: Phase) {
    this.phase = p;
    this.phaseT = 0;
    if (p === "aim") {
      this.engine.setCam(this.aimShot(0));
      this.cb.onHint(this.shotsFired === 0);
      this.cb.onCallout({ id: cid(), type: "ball", n: this.shotsFired + 1, total: BALLS });
    } else {
      this.cb.onHint(false);
    }
  }

  private resetBall() {
    this.ball = newBall();
    this.engine.resetBallRotation();
    this.engine.setBall(this.ball.p, 0, 0, true, 1);
    this.engine.placeKid(0, 0);
    this.timeScale = 1;
    this.hitstop = 0;
    this.slowmo = false;
    this.goalAt = -1;
    this.endReason = null;
    this.deadCheck = 0;
    this.missText = null;
    this.engine.roll = 0;
  }

  /** Fiksni korak (1/120 s) dok je stanje "playing". */
  update(step: number) {
    this.time += step;
    this.phaseT += step;
    const e = this.engine;

    // vrijeme igre: zaustavljanje (hitstop) i usporenje
    let scale = 1;
    if (this.hitstop > 0) {
      // zamrzni simulaciju (putanja ostaje ista kao u predviđanju)
      this.hitstop -= step;
      scale = 0;
    } else if (this.slowmo) {
      this.slowmoT += step;
      scale = this.goalAt >= 0 && this.time - this.goalAt > 0.75 ? Math.min(1, this.timeScale + step * 2.2) : Math.max(0.3, this.timeScale - step * 6);
      if (scale >= 1) this.slowmo = false;
    }
    this.timeScale = scale;
    const sdt = step * scale;

    switch (this.phase) {
      case "intro": {
        const k = clamp(this.phaseT / this.introD, 0, 1);
        const from = this.introFrom!;
        const to = this.aimShot(0);
        const ek = easeInOut(k);
        // luk: preko dvorišta pa iza lopte
        const mid = { x: 6.5, y: 7.5, z: 6 };
        const bz = (a: number, b: number, c: number) => lerp(lerp(a, b, ek), lerp(b, c, ek), ek);
        e.setCam(
          {
            pos: { x: bz(from.pos.x, mid.x, to.pos.x), y: bz(from.pos.y, mid.y, to.pos.y), z: bz(from.pos.z, mid.z, to.pos.z) },
            look: { x: lerp(from.look.x, to.look.x, ek), y: lerp(from.look.y, to.look.y, ek), z: lerp(from.look.z, to.look.z, ek) },
            fov: lerp(62, to.fov, ek),
            lambda: 30
          },
          true
        );
        if (k >= 1) this.setPhase("aim");
        break;
      }
      case "aim":
        break;
      case "windup": {
        if (this.phaseT >= 0.085 && this.pending) {
          const s = this.pending;
          this.pending = null;
          launch(this.ball, s);
          this.shotsFired++;
          sfx.kick(0.6 + s.power * 0.8);
          if (s.power > 0.6) pazi.swish(s.power);
          haptic(14);
          this.hitstop = 0.05;
          e.shake(0.12 + s.power * 0.14);
          e.fovKick = 2 + s.power * 3;
          e.dustPuff(this.ball.p, { x: 0, y: 1, z: 0 }, 6 + s.power * 8);
          this.setPhase("flight");
        }
        break;
      }
      case "flight":
      case "after": {
        const b = this.ball;
        if (!b.done) {
          const px = b.p.x;
          const py = b.p.y;
          const pz = b.p.z;
          stepBall(b, this.boxes, sdt, this.ev);
          for (const ev of this.ev) this.onEvent(ev);
          this.ev.length = 0;
          // za dlaku pored stative: lopta je prošla liniju gola tik uz ruksak
          if (this.phase === "flight" && this.endReason === null && !b.goal && pz > GOAL_Z && b.p.z <= GOAL_Z) {
            const k = (pz - GOAL_Z) / Math.max(1e-6, pz - b.p.z);
            const gx = Math.abs(px + (b.p.x - px) * k);
            const gy = py + (b.p.y - py) * k;
            if (gx >= GOAL_HALF - BALL_R * 0.3 && gx < GOAL_HALF + 0.7 && gy < GOAL_TOP + 0.5) {
              this.missText = "Za dlaku";
              if (this.isDead()) this.miss(false);
            }
          }
          // mrtva lopta: kotrlja se polako i više ne može ući → odmah "Promašaj" (lopta se i dalje kotrlja),
          // umjesto da igrač 4–5 s gleda kako staje
          if (this.phase === "flight" && this.endReason === null && b.onGround && b.t > 0.8 && (this.deadCheck -= step) <= 0) {
            this.deadCheck = 0.2;
            const nearMouth = Math.abs(b.p.x) < 3 && b.p.z > GOAL_Z - 0.5 && b.p.z - GOAL_Z < 2.5;
            if (!nearMouth && Math.hypot(b.v.x, b.v.y, b.v.z) < 4 && this.isDead()) this.miss(false);
          }
          // pred golom: provjeri unaprijed i uspori
          if (!this.slowmo && !b.goal && this.goalAt < 0 && b.v.z < -2 && b.p.z - GOAL_Z < 1.9 && b.p.z > GOAL_Z) {
            if (this.willScore()) {
              this.slowmo = true;
              this.slowmoT = 0;
            }
          }
        }
        this.camFollow();
        if (this.phase === "after") {
          this.aftermath -= step;
          if (this.aftermath <= 0) this.finishShot();
        } else if (b.done) {
          // lopta je stala/izašla bez gola
          if (this.endReason === null) this.miss(false);
        }
        break;
      }
      case "reset": {
        if (this.phaseT > 0.75) this.setPhase("aim");
        break;
      }
      default:
        break;
    }

    // bakin prozor: ljutita baka maše
    if (this.winMoodT > 0) {
      this.winMoodT -= step;
      const m = Math.floor(this.winMoodT * 7) % 2 === 0 ? 2 : 1;
      e.setWindowMood(this.winMoodT <= 0 ? 2 : (m as 1 | 2));
    }
  }

  private willScore() {
    const c: Ball = { ...this.ball, p: { ...this.ball.p }, v: { ...this.ball.v } };
    const ev: SimEvent[] = [];
    for (let i = 0; i < 48 && !c.done; i++) {
      stepBall(c, this.boxes, 1 / 120, ev);
      for (const x of ev) if (x.type === "goal") return true;
      ev.length = 0;
    }
    return false;
  }

  /** Simulira do kraja: true ako lopta više ne može u gol ni u prozor. */
  private isDead() {
    const c: Ball = { ...this.ball, p: { ...this.ball.p }, v: { ...this.ball.v } };
    const ev: SimEvent[] = [];
    for (let i = 0; i < 1000 && !c.done; i++) {
      stepBall(c, this.boxes, 1 / 120, ev);
      for (const x of ev) if (x.type === "goal" || x.type === "window") return false;
      ev.length = 0;
    }
    return true;
  }

  private camFollow() {
    const e = this.engine;
    const b = this.ball;
    if (this.endReason === "window") {
      e.setCam({ pos: { x: 2.4, y: 3.6, z: WINDOW.z + 6.2 }, look: { x: COURT.right, y: WINDOW.y - 0.2, z: WINDOW.z }, fov: e.portrait ? 50 : 40, lambda: 3.2 });
      return;
    }
    if (this.slowmo || this.goalAt >= 0) {
      // niska kamera sa strane gola
      const side = b.p.x > 0 ? -1 : 1;
      const gx = clamp(b.p.x, -1.5, 1.5);
      e.setCam(
        {
          // dok je kamera još daleko, ostaje visoko — preleti auto umjesto da prođe kroz njega
          pos: { x: gx + side * 3.4, y: 1.45 + Math.max(0, e.camPos.z - (GOAL_Z + 1)) * 0.42, z: GOAL_Z + 2.0 },
          look: { x: lerp(gx, b.p.x, 0.5), y: Math.max(0.35, b.p.y * 0.6), z: Math.min(GOAL_Z + 0.4, b.p.z) },
          fov: e.portrait ? 54 : 42,
          lambda: 4.2
        }
      );
      e.roll = lerp(e.roll, side * 0.03, 0.05);
      return;
    }
    // praćenje: kamera ostaje visoko i iza lopte, nikad bliže od ~9 m autu
    const portrait = e.portrait;
    e.setCam({
      pos: {
        x: clamp(b.p.x * 0.45, -4.5, 4.5),
        y: Math.max(portrait ? 5.0 : 3.8, b.p.y + 2.6),
        z: clamp(b.p.z + (portrait ? 10.5 : 9), 1.2, BALL_START.z + 7.4)
      },
      look: { x: b.p.x * 0.85, y: Math.min(3, b.p.y * 0.5) + (portrait ? -0.6 : 0.1), z: b.p.z - (portrait ? 4.5 : 3) },
      fov: portrait ? 54 : 43,
      lambda: 2.4
    });
  }

  private onEvent(ev: SimEvent) {
    const e = this.engine;
    const b = this.ball;
    switch (ev.type) {
      case "hit": {
        const k = clamp(ev.impact / 14, 0, 1);
        if (ev.kind === "wall") pazi.wall(ev.impact);
        else if (ev.kind === "car") {
          pazi.car(ev.impact);
          if (ev.impact > 9) pazi.alarm();
        } else if (ev.kind === "dumpster") pazi.clang(ev.impact);
        else if (ev.kind === "pole") pazi.pole(ev.impact);
        else pazi.soft(ev.impact);
        e.dustPuff(ev.pos, ev.n, ev.impact);
        e.shake(0.04 + k * 0.12);
        if (ev.impact > 8) this.hitstop = Math.max(this.hitstop, 0.035);
        if (ev.counts && this.endReason === null) {
          e.impactRing(ev.pos, ev.n, 0.9 + k * 0.6);
          e.sparks(ev.pos, ev.n, [0.91, 1, 0.24], 8 + Math.round(k * 10), 3.5);
          sfx.coin(ev.bounce * 3);
          const name = ev.bounce >= 3 ? "Majstor s kvarta" : ev.bounce === 2 ? "Bilijar" : "Bankica";
          this.cb.onCallout({ id: cid(), type: "bounce", n: ev.bounce, name });
        } else if (ev.kind === "backpack") {
          this.cb.onCallout({ id: cid(), type: "small", text: "Ruksak!" });
        }
        break;
      }
      case "ground":
        pazi.ground(ev.impact);
        if (ev.impact > 3) e.dustPuff(ev.pos, { x: 0, y: 1, z: 0 }, ev.impact * 0.6);
        break;
      case "over":
        if (this.endReason !== null) break;
        this.missText = "Preko gola";
        // lopta je preletjela gol i ne može se vratiti → odmah presudi
        if (this.isDead()) this.miss(true);
        else this.cb.onCallout({ id: cid(), type: "small", text: "Previsoko" });
        break;
      case "goal": {
        if (this.endReason !== null) break; // promašaj je već proglašen
        this.goalAt = this.time;
        this.slowmo = true;
        this.endReason = "goal";
        const pts = ev.style.points;
        this.score += pts;
        this.shots.push({ kind: "goal", style: ev.style, points: pts });
        this.cb.onScore(this.score, this.shots.slice());
        this.cb.onCallout({ id: cid(), type: "goal", name: ev.style.name, points: pts, bounces: ev.bounces });
        // kamera gola stoji na strani suprotnoj od lopte (vidi camFollow) → konfete većinom iz daljeg ruksaka
        e.confettiBurst({ x: ev.pos.x, y: 0, z: GOAL_Z - 0.4 }, b.p.x > 0 ? 1 : -1);
        e.sparks(ev.pos, { x: 0, y: 1, z: -0.5 }, [1, 1, 1], 18, 4);
        e.shake(0.18);
        e.fovKick = -3;
        e.celebrate();
        sfx.success();
        pazi.cheer(ev.bounces >= 2 ? 1 : 0.6);
        if (ev.bounces >= 2) window.setTimeout(() => sfx.fanfare(), 260);
        haptic(30);
        this.phase = "after";
        this.aftermath = 2.6;
        break;
      }
      case "window": {
        if (this.endReason !== null) break;
        this.endReason = "window";
        b.done = true;
        e.setBall(b.p, 0, 0, false);
        e.glass();
        pazi.glass();
        e.shake(0.45);
        this.hitstop = 0.09;
        this.winMoodT = 1.6;
        e.setWindowMood(2);
        e.sad();
        this.shots.push({ kind: "window" });
        this.cb.onScore(this.score, this.shots.slice());
        this.cb.onCallout({ id: cid(), type: "window" });
        haptic(60);
        this.phase = "after";
        this.aftermath = 2.8;
        this.over = true;
        break;
      }
      case "stop":
        break;
    }
  }

  private miss(over: boolean) {
    this.endReason = "miss";
    this.shots.push({ kind: "miss", over: over || this.missText === "Preko gola" });
    this.cb.onScore(this.score, this.shots.slice());
    this.cb.onCallout({ id: cid(), type: "miss", text: this.missText ?? "Promašaj" });
    this.engine.sad();
    sfx.fail();
    this.phase = "after";
    this.aftermath = 1.3;
  }

  private finishShot() {
    const e = this.engine;
    if (this.over || this.shotsFired >= BALLS) {
      this.phase = "over";
      e.hideTrajectory();
      this.cb.onEnd(this.score, this.shots.slice());
      return;
    }
    this.resetBall();
    e.resetKid();
    e.setBall(this.ball.p, 0, 0, true, 0.01);
    this.cb.onCallout({ id: cid(), type: "clear" });
    pazi.pop();
    this.setPhase("reset");
  }

  // ── unos (koordinate u CSS px unutar platna) ─────────────────────────
  pointerDown(id: number, x: number, y: number) {
    if (this.phase === "intro") {
      this.phaseT = 99; // preskoči intro
      return;
    }
    if (this.phase !== "aim" || this.pointerId !== -1) return;
    this.pointerId = id;
    this.path = [{ x, y }];
    this.aim = { yaw: 0, power: 0, curve: 0 };
    this.lastStretchStep = 0;
    this.cb.onHint(false);
  }

  pointerMove(id: number, x: number, y: number) {
    if (id !== this.pointerId || this.phase !== "aim") return;
    const path = this.path;
    const last = path[path.length - 1];
    if (Math.hypot(x - last.x, y - last.y) > 3) path.push({ x, y });
    if (path.length > 120) path.splice(1, 1);
    this.computeAim(x, y);
  }

  pointerUp(id: number, x: number, y: number) {
    if (id !== this.pointerId) return;
    this.pointerId = -1;
    if (this.phase !== "aim") return;
    this.computeAim(x, y);
    const e = this.engine;
    e.hideTrajectory();
    this.cb.onAim({ active: false, power: 0, curve: 0, danger: false, x0: 0, y0: 0, x: 0, y: 0 });
    if (this.aim.power < 0.1) {
      e.placeKid(0, 0);
      e.setCam(this.aimShot(0));
      this.cb.onHint(this.shotsFired === 0);
      return;
    }
    this.pending = { ...this.aim };
    e.kick();
    this.setPhase("windup");
  }

  cancelAim() {
    if (this.pointerId === -1) return;
    this.pointerId = -1;
    this.engine.hideTrajectory();
    this.engine.placeKid(0, 0);
    this.cb.onAim({ active: false, power: 0, curve: 0, danger: false, x0: 0, y0: 0, x: 0, y: 0 });
  }

  private computeAim(x: number, y: number) {
    const e = this.engine;
    const s = this.path[0];
    const dx = x - s.x;
    const dy = y - s.y;
    const len = Math.hypot(dx, dy);
    const full = clamp(Math.min(e.w, e.h) * 0.36, 105, 220);
    const power = clamp((len - 10) / full, 0, 1);
    let yaw = Math.atan2(-dx, Math.max(dy, -Math.abs(dx) * 0.2 + 1));
    yaw = clamp(yaw, -1.25, 1.25);
    // zakrivljenost poteza: najveći bočni otklon od pravca početak→prst
    let dev = 0;
    if (len > 30) {
      const ux = dx / len;
      const uy = dy / len;
      for (const p of this.path) {
        const ox = p.x - s.x;
        const oy = p.y - s.y;
        const along = ox * ux + oy * uy;
        if (along < len * 0.1 || along > len * 0.9) continue;
        const side = -(ux * oy - uy * ox); // + = izbočeno udesno na ekranu
        if (Math.abs(side) > Math.abs(dev)) dev = side;
      }
    }
    let curve = dev / Math.max(40, len * 0.42);
    curve = Math.sign(curve) * clamp((Math.abs(curve) - 0.1) / 0.9, 0, 1);
    this.aim = { yaw, power, curve };
    const step = Math.floor(power * 10);
    if (step !== this.lastStretchStep) {
      if (step > this.lastStretchStep) {
        pazi.stretch(step);
        if (step === 10) haptic(6); // puna snaga: kratki "klik" pod prstom
      }
      this.lastStretchStep = step;
    }
    e.placeKid(yaw, power);
    const shot = this.aimShot(power);
    e.setCam(shot);
    if (power > 0.02) {
      const r = predict(this.aim, this.boxes, 1.05, 1 / 30, this.preview);
      e.setTrajectory(this.preview, r.n, clamp(power * 4, 0, 1), r.window ? 1 : 0);
      this.cb.onAim({ active: true, power, curve, danger: r.window, x0: s.x, y0: s.y, x, y });
    } else {
      e.hideTrajectory();
      this.cb.onAim({ active: true, power: 0, curve: 0, danger: false, x0: s.x, y0: s.y, x, y });
    }
  }

  // ── iscrtavanje (svaki frejm) ────────────────────────────────────────
  render(dt: number, running: boolean) {
    const e = this.engine;
    const simDt = running ? dt * this.timeScale : 0;
    if (this.phase === "attract") {
      this.orbitA += dt;
      e.setCam(this.orbitShot(this.orbitA));
    }
    const b = this.ball;
    if (this.phase === "reset") {
      const k = clamp(this.phaseT / 0.35, 0, 1);
      const pop = k < 1 ? 1 + Math.sin(k * Math.PI) * 0.25 : 1;
      e.setBall(b.p, 0, 0, true, Math.max(0.01, k * pop));
    } else if (this.endReason !== "window") {
      e.setBall(b.p, b.spin, simDt, true, 1);
      const sp = Math.hypot(b.v.x, b.v.y, b.v.z);
      if (running && !b.done && sp > 9 && (this.phase === "flight" || this.phase === "after")) e.trail(b.p, Math.min(1, (sp - 9) / 12));
    }
    e.render(dt, simDt);
  }

  /** Startni ekran / rezultat: vrati se u lagani orbit. */
  attract() {
    this.phase = "attract";
    this.engine.hideTrajectory();
    this.pointerId = -1;
    this.slowmo = false;
    this.timeScale = 1;
    this.engine.roll = 0;
  }
}
