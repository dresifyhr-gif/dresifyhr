"use client";

import { useEffect, useRef } from "react";

import { PROMO_STORAGE_KEY } from "@/components/site/promo-capture";

// DRESIFY Penalty Cup — canvas verzija. Bogata scena (stadion pod reflektorima,
// perspektivna trava, mreža koja se trese), golman koji se baca u skoku, trag
// lopte, čestice, screen shake. Izazov raste sa svakim penalom.
const STAGE_HTML = `
<style>
.pg-btn{transition:transform .08s ease}
.pg-btn:active{transform:scale(0.97)}
</style>
<div style="display:flex;justify-content:center;">
  <div style="width:100%;max-width:400px;background:#07070a;border-radius:22px;overflow:hidden;border:1px solid rgba(255,255,255,0.12);font-family:inherit;box-shadow:0 18px 50px rgba(0,0,0,0.5);">

    <div style="display:flex;align-items:center;justify-content:space-between;padding:13px 18px;background:#000;">
      <span style="font-weight:700;letter-spacing:1px;color:#fff;font-size:20px;">DRES<span style="color:#e8ff3c;">IFY</span></span>
      <span style="font-size:11px;color:#e8ff3c;font-weight:700;letter-spacing:2px;text-transform:uppercase;">Penalty Cup</span>
    </div>

    <div style="display:flex;justify-content:space-between;align-items:center;padding:9px 18px;font-size:12px;color:rgba(255,255,255,0.6);background:#0d0d10;">
      <span>PENAL <b id="pg_shot" style="color:#fff;font-size:15px;">1</b><span style="opacity:.5;">/5</span></span>
      <div id="pg_dots" style="display:flex;gap:5px;"></div>
      <span style="display:flex;align-items:center;gap:10px;">GOLOVI <b id="pg_goals" style="color:#e8ff3c;font-size:15px;">0</b>
        <button id="pg_mute" aria-label="Zvuk" style="background:none;border:none;color:rgba(255,255,255,0.55);cursor:pointer;font-size:15px;padding:0;line-height:1;">&#9834;</button>
      </span>
    </div>

    <div id="pg_stage" style="position:relative;width:100%;aspect-ratio:360/456;overflow:hidden;background:#05070c;cursor:crosshair;touch-action:none;">
      <canvas id="pg_canvas" style="display:block;width:100%;height:100%;"></canvas>

      <div id="pg_intro" style="position:absolute;inset:0;background:linear-gradient(rgba(5,7,12,0.55),rgba(5,7,12,0.82));display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;z-index:8;padding:20px;">
        <div style="font-size:13px;letter-spacing:3px;color:#e8ff3c;font-weight:700;margin-bottom:6px;">DRESIFY PENALTY CUP</div>
        <div style="font-size:23px;font-weight:800;color:#fff;line-height:1.1;margin-bottom:10px;">Zabij 4 od 5 penala</div>
        <div style="font-size:13px;color:rgba(255,255,255,0.72);margin-bottom:18px;max-width:250px;">i osvoji <b style="color:#e8ff3c;">10% popusta</b> (od 20€). Ciljaj kuteve — golman je sve bolji!</div>
        <button id="pg_start" class="pg-btn" style="padding:14px 34px;border:none;border-radius:12px;background:#e8ff3c;color:#0b0b0b;font-size:15px;font-weight:800;cursor:pointer;box-shadow:0 8px 24px rgba(232,255,60,0.25);">START &#9917;</button>
        <div id="pg_best" style="margin-top:14px;font-size:11px;color:rgba(255,255,255,0.45);"></div>
      </div>
    </div>

    <div id="pg_controls" style="padding:14px 18px 20px;min-height:30px;">
      <p id="pg_hint" style="margin:0;text-align:center;font-size:13px;color:rgba(255,255,255,0.7);">&#9917; Tapni u gol gdje želiš pucati</p>
    </div>
  </div>
</div>
`;

export function PenaltyGame() {
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const $ = (id: string) => root.querySelector<HTMLElement>("#" + id)!;
    const stage = $("pg_stage");
    const canvas = root.querySelector<HTMLCanvasElement>("#pg_canvas")!;
    const ctx = canvas.getContext("2d")!;
    const shotEl = $("pg_shot"), goalsEl = $("pg_goals"), dotsEl = $("pg_dots");
    const intro = $("pg_intro"), startBtn = $("pg_start"), bestEl = $("pg_best"), muteBtn = $("pg_mute");
    let hint = $("pg_hint");
    let controls = $("pg_controls");

    // Logička rezolucija scene.
    const W = 360, H = 456, SC = 2;
    canvas.width = W * SC; canvas.height = H * SC; ctx.scale(SC, SC);

    // Geometrija gola / terena.
    const POST_L = 74, POST_R = 286, CROSS_Y = 92, LINE_Y = 176; // gol
    const GOAL_CX = (POST_L + POST_R) / 2;
    const HORIZON = 150;
    const BALL_HOME = { x: W / 2, y: 416 };
    const SPOT = { x: W / 2, y: 380 };

    let shot = 1, goals = 0, playing = false, raf = 0, last = 0;
    let muted = false;
    let phase: "idle" | "aim" | "shoot" | "result" = "idle";
    const results: (boolean | null)[] = [null, null, null, null, null];
    const BEST_KEY = "dresify_penalty_best";
    const best = () => Number(localStorage.getItem(BEST_KEY) || 0);
    bestEl.textContent = best() ? "Najbolje: " + best() + "/5" : "";

    // Zvijezde + navijači (statični raspored, tvinklaju).
    const stars = Array.from({ length: 34 }, () => ({ x: Math.random() * W, y: Math.random() * (HORIZON - 20), r: Math.random() * 1.1 + 0.3, p: Math.random() * 6 }));
    const crowd = Array.from({ length: 150 }, () => ({ x: Math.random() * W, y: 60 + Math.random() * 70, c: Math.random(), p: Math.random() * 6 }));

    // ── Zvuk (zadržano) ──────────────────────────────────────────────
    let actx: AudioContext | null = null;
    function tone(freq: number, dur: number, type: OscillatorType, vol: number, delay: number) {
      if (muted) return;
      try {
        const c: AudioContext = actx || new ((window as any).AudioContext || (window as any).webkitAudioContext)();
        actx = c; const t0 = c.currentTime + delay;
        const o = c.createOscillator(), g = c.createGain();
        o.type = type; o.frequency.setValueAtTime(freq, t0);
        g.gain.setValueAtTime(vol, t0); g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
        o.connect(g); g.connect(c.destination); o.start(t0); o.stop(t0 + dur);
      } catch {}
    }
    const sfxKick = () => { tone(150, 0.12, "square", 0.18, 0); tone(90, 0.16, "sine", 0.14, 0); };
    const sfxGoal = () => { [523, 659, 784, 1046].forEach((f, i) => tone(f, 0.2, "sine", 0.2, i * 0.08)); };
    const sfxSave = () => { tone(220, 0.26, "sawtooth", 0.16, 0); tone(140, 0.2, "square", 0.12, 0.02); };
    const sfxWhistle = () => { tone(2000, 0.15, "sine", 0.12, 0); tone(2300, 0.15, "sine", 0.12, 0.16); };
    const sfxRoar = () => { for (let i = 0; i < 6; i++) tone(300 + Math.random() * 500, 0.5, "triangle", 0.05, i * 0.02); };
    const buzz = (ms: number | number[]) => { try { (navigator as any).vibrate && navigator.vibrate(ms); } catch {} };
    muteBtn.onclick = (e) => { e.stopPropagation(); muted = !muted; muteBtn.innerHTML = muted ? "&#128263;" : "&#9834;"; muteBtn.style.color = muted ? "rgba(255,255,255,0.3)" : "rgba(255,255,255,0.55)"; };

    // ── Stanje animacije ─────────────────────────────────────────────
    let shake = 0, flash = 0, roar = 0;
    const trail: { x: number; y: number; s: number }[] = [];
    const parts: { x: number; y: number; vx: number; vy: number; life: number; max: number; c: string; sz: number }[] = [];
    const netRipple = { x: 0, y: 0, str: 0 };
    const ball = { x: BALL_HOME.x, y: BALL_HOME.y, s: 1, rot: 0, t: 0, tx: 0, ty: 0, flying: false, saved: false, dead: false };
    const keeper = { x: GOAL_CX, y: LINE_Y, dir: 0, pose: 0, tx: GOAL_CX, ty: LINE_Y, react: 0, diving: false, bob: 0 };
    let statusText = "", statusCol = "#e8ff3c", statusT = 0;

    function drawDots() {
      let h = "";
      for (let i = 0; i < 5; i++) {
        const c = results[i] === true ? "#e8ff3c" : results[i] === false ? "#ff4d6d" : "rgba(255,255,255,0.18)";
        h += '<span style="width:7px;height:7px;border-radius:50%;background:' + c + ';display:inline-block;"></span>';
      }
      dotsEl.innerHTML = h;
    }
    drawDots();

    function setHint(html: string) { hint.innerHTML = html; }
    function burst(x: number, y: number, cols: string[], n: number, spd: number) {
      for (let i = 0; i < n; i++) {
        const a = Math.random() * Math.PI * 2, v = spd * (0.4 + Math.random());
        parts.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 1, life: 0, max: 0.5 + Math.random() * 0.6, c: cols[(Math.random() * cols.length) | 0], sz: 2 + Math.random() * 3 });
      }
    }

    // ── Crtanje scene ────────────────────────────────────────────────
    function drawSky(time: number) {
      const g = ctx.createLinearGradient(0, 0, 0, HORIZON);
      g.addColorStop(0, "#0a1330"); g.addColorStop(0.6, "#0b1020"); g.addColorStop(1, "#0d1a10");
      ctx.fillStyle = g; ctx.fillRect(0, 0, W, HORIZON + 4);
      for (const s of stars) { const tw = 0.5 + 0.5 * Math.sin(time * 2 + s.p); ctx.globalAlpha = 0.5 * tw; ctx.fillStyle = "#dfe8ff"; ctx.beginPath(); ctx.arc(s.x, s.y, s.r, 0, 7); ctx.fill(); }
      ctx.globalAlpha = 1;
      // Reflektori (glow gore lijevo/desno).
      for (const fx of [40, W - 40]) {
        const fg = ctx.createRadialGradient(fx, 8, 0, fx, 8, 120);
        fg.addColorStop(0, "rgba(255,255,225,0.18)"); fg.addColorStop(1, "rgba(255,255,225,0)");
        ctx.fillStyle = fg; ctx.fillRect(0, 0, W, HORIZON);
        ctx.fillStyle = "#fffef0"; ctx.beginPath(); ctx.arc(fx, 8, 4, 0, 7); ctx.fill();
        ctx.fillStyle = "rgba(255,255,220,0.6)"; ctx.beginPath(); ctx.arc(fx, 8, 8, 0, 7); ctx.fill();
      }
    }
    function drawStands(time: number) {
      ctx.fillStyle = "#0f1218"; ctx.fillRect(0, 44, W, HORIZON - 44);
      for (const p of crowd) {
        const tw = 0.6 + 0.4 * Math.sin(time * 3 + p.p) + roar * 0.6;
        ctx.globalAlpha = Math.min(1, 0.35 + 0.4 * tw);
        ctx.fillStyle = p.c < 0.5 ? "#e8ff3c" : p.c < 0.7 ? "#3b82f6" : p.c < 0.85 ? "#ff4d6d" : "#cfd6e0";
        ctx.fillRect(p.x, p.y, 2.4, 2.4);
      }
      ctx.globalAlpha = 1;
      // Ograda / reklama.
      ctx.fillStyle = "#05060a"; ctx.fillRect(0, HORIZON - 12, W, 12);
      ctx.fillStyle = "rgba(232,255,60,0.5)"; ctx.font = "700 8px Arial"; ctx.textAlign = "center";
      ctx.fillText("D R E S I F Y   A R E N A", W / 2, HORIZON - 4);
    }
    function drawPitch() {
      const g = ctx.createLinearGradient(0, HORIZON, 0, H);
      g.addColorStop(0, "#1f6b2a"); g.addColorStop(1, "#38a344");
      ctx.fillStyle = g; ctx.fillRect(0, HORIZON, W, H - HORIZON);
      // Perspektivne pruge (šire prema gledatelju).
      let y = HORIZON, i = 0, band = 6;
      while (y < H) { band = 6 + (y - HORIZON) * 0.12; if (i % 2 === 0) { ctx.fillStyle = "rgba(255,255,255,0.045)"; ctx.fillRect(0, y, W, band); } y += band; i++; }
      // Kazneni prostor (perspektiva).
      ctx.strokeStyle = "rgba(255,255,255,0.55)"; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(40, H); ctx.lineTo(105, LINE_Y + 24); ctx.lineTo(W - 105, LINE_Y + 24); ctx.lineTo(W - 40, H); ctx.stroke();
      ctx.beginPath(); ctx.ellipse(SPOT.x, SPOT.y + 6, 22, 6, 0, Math.PI, 0); ctx.stroke();
      // Bijela crta gola.
      ctx.strokeStyle = "rgba(255,255,255,0.85)"; ctx.beginPath(); ctx.moveTo(POST_L - 6, LINE_Y); ctx.lineTo(POST_R + 6, LINE_Y); ctx.stroke();
      // Točka penala.
      ctx.fillStyle = "#fff"; ctx.beginPath(); ctx.arc(SPOT.x, SPOT.y, 3, 0, 7); ctx.fill();
    }
    function netNode(px: number, py: number) {
      // Bulge mreže oko točke udarca.
      if (netRipple.str <= 0) return { x: px, y: py };
      const d = Math.hypot(px - netRipple.x, py - netRipple.y);
      const b = netRipple.str * Math.exp(-(d * d) / 900);
      return { x: px, y: py + b * 0.6, r: b };
    }
    function drawGoal() {
      // Mreža (perspektivna rešetka) iza gola.
      ctx.save();
      ctx.beginPath(); ctx.rect(POST_L, CROSS_Y, POST_R - POST_L, LINE_Y - CROSS_Y); ctx.clip();
      ctx.strokeStyle = "rgba(255,255,255,0.16)"; ctx.lineWidth = 1;
      for (let gx = POST_L; gx <= POST_R; gx += 12) {
        ctx.beginPath();
        for (let gy = CROSS_Y; gy <= LINE_Y; gy += 6) { const n = netNode(gx, gy); (gy === CROSS_Y ? ctx.moveTo : ctx.lineTo).call(ctx, n.x, n.y); }
        ctx.stroke();
      }
      for (let gy = CROSS_Y; gy <= LINE_Y; gy += 12) {
        ctx.beginPath();
        for (let gx = POST_L; gx <= POST_R; gx += 6) { const n = netNode(gx, gy); (gx === POST_L ? ctx.moveTo : ctx.lineTo).call(ctx, n.x, n.y); }
        ctx.stroke();
      }
      ctx.restore();
      // Okvir gola (3D).
      ctx.lineCap = "round";
      ctx.strokeStyle = "rgba(0,0,0,0.35)"; ctx.lineWidth = 8;
      ctx.beginPath(); ctx.moveTo(POST_L + 2, LINE_Y + 2); ctx.lineTo(POST_L + 2, CROSS_Y + 2); ctx.lineTo(POST_R + 2, CROSS_Y + 2); ctx.lineTo(POST_R + 2, LINE_Y + 2); ctx.stroke();
      ctx.strokeStyle = "#f6f7f9"; ctx.lineWidth = 6;
      ctx.beginPath(); ctx.moveTo(POST_L, LINE_Y); ctx.lineTo(POST_L, CROSS_Y); ctx.lineTo(POST_R, CROSS_Y); ctx.lineTo(POST_R, LINE_Y); ctx.stroke();
      ctx.strokeStyle = "rgba(255,255,255,0.9)"; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.moveTo(POST_L - 1.5, CROSS_Y - 2.5); ctx.lineTo(POST_R + 1.5, CROSS_Y - 2.5); ctx.stroke();
    }
    function drawKeeper() {
      const k = keeper;
      ctx.save();
      ctx.translate(k.x, k.y);
      const ang = k.dir * 0.9 * k.pose;
      // Sjena.
      ctx.save(); ctx.rotate(0); ctx.fillStyle = "rgba(0,0,0,0.28)"; ctx.beginPath(); ctx.ellipse(0, 6, 16 + 10 * k.pose, 4, 0, 0, 7); ctx.fill(); ctx.restore();
      ctx.rotate(ang);
      const bob = Math.sin(k.bob) * 1.2 * (1 - k.pose);
      ctx.translate(0, bob);
      const reach = 14 * k.pose; // ruke se pružaju u stranu pri obrani
      // Ruke + rukavice.
      ctx.strokeStyle = "#16171b"; ctx.lineWidth = 6; ctx.lineCap = "round";
      for (const sgn of [-1, 1]) {
        const ax = sgn * (10 + reach), ay = -14 - reach * 0.7;
        ctx.beginPath(); ctx.moveTo(sgn * 8, -8); ctx.lineTo(ax, ay); ctx.stroke();
        ctx.fillStyle = "#e8ff3c"; ctx.beginPath(); ctx.arc(ax, ay, 5.5, 0, 7); ctx.fill();
      }
      // Trup (dres).
      const bg = ctx.createLinearGradient(0, -18, 0, 8); bg.addColorStop(0, "#20222a"); bg.addColorStop(1, "#101116");
      ctx.fillStyle = bg; ctx.beginPath(); (ctx as any).roundRect(-11, -18, 22, 30, 7); ctx.fill();
      ctx.fillStyle = "#fff"; ctx.font = "800 5.5px Arial"; ctx.textAlign = "center";
      ctx.fillText("DRES", 0, -6); ctx.fillStyle = "#e8ff3c"; ctx.fillText("IFY", 0, -0.5);
      ctx.fillStyle = "#fff"; ctx.font = "800 11px Arial"; ctx.fillText("1", 0, 9);
      // Noge.
      ctx.fillStyle = "#16171b"; ctx.fillRect(-8, 10, 6, 14); ctx.fillRect(2, 10, 6, 14);
      ctx.fillStyle = "#e8ff3c"; ctx.fillRect(-9, 22, 8, 4); ctx.fillRect(1, 22, 8, 4);
      // Glava.
      ctx.fillStyle = "#f0c08a"; ctx.beginPath(); ctx.arc(0, -24, 7, 0, 7); ctx.fill();
      ctx.fillStyle = "#3a2a1a"; ctx.beginPath(); ctx.arc(0, -26, 7, Math.PI, 0); ctx.fill();
      ctx.restore();
    }
    function drawBall(x: number, y: number, s: number, rot: number) {
      const R = 17 * s;
      // Sjena na travi (manja kad je lopta viša → dojam visine preko skale).
      ctx.fillStyle = "rgba(0,0,0,0.25)"; ctx.beginPath(); ctx.ellipse(x, BALL_HOME.y, 14 * s + 4, 4 * s + 1.5, 0, 0, 7); ctx.fill();
      ctx.save(); ctx.translate(x, y); ctx.rotate(rot);
      ctx.fillStyle = "#fff"; ctx.strokeStyle = "#0c0c0c"; ctx.lineWidth = R * 0.14;
      ctx.beginPath(); ctx.arc(0, 0, R, 0, 7); ctx.fill(); ctx.stroke();
      // Pentagon detalj.
      ctx.fillStyle = "#121212"; ctx.beginPath();
      for (let i = 0; i < 5; i++) { const a = (i / 5) * Math.PI * 2 - Math.PI / 2, r = R * 0.36; const px = Math.cos(a) * r, py = Math.sin(a) * r; i === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py); }
      ctx.closePath(); ctx.fill();
      if (s > 0.7) { ctx.fillStyle = "#e8ff3c"; ctx.font = "800 " + (R * 0.5) + "px Arial"; ctx.textAlign = "center"; ctx.fillText("D", 0, R * 0.18); }
      ctx.restore();
    }

    function render(time: number) {
      ctx.clearRect(0, 0, W, H);
      ctx.save();
      const sx = shake > 0 ? (Math.random() - 0.5) * shake : 0, sy = shake > 0 ? (Math.random() - 0.5) * shake : 0;
      ctx.translate(sx, sy);

      drawSky(time); drawStands(time); drawPitch(); drawGoal();

      // Trag lopte.
      for (let i = 0; i < trail.length; i++) { const p = trail[i]; ctx.globalAlpha = (i / trail.length) * 0.4; ctx.fillStyle = "#e8ff3c"; ctx.beginPath(); ctx.arc(p.x, p.y, 15 * p.s * (i / trail.length), 0, 7); ctx.fill(); }
      ctx.globalAlpha = 1;

      drawKeeper();
      if (!ball.dead) drawBall(ball.x, ball.y, ball.s, ball.rot);

      // Čestice.
      for (const p of parts) { ctx.globalAlpha = Math.max(0, 1 - p.life / p.max); ctx.fillStyle = p.c; ctx.fillRect(p.x, p.y, p.sz, p.sz); }
      ctx.globalAlpha = 1;

      // Status tekst (GOOOL / OBRANA) — skalira i trese se sa scenom.
      if (statusT > 0) {
        const sc = 1 + (1 - Math.min(1, statusT * 3)) * 0.6;
        ctx.save(); ctx.translate(W / 2, 150); ctx.scale(sc, sc);
        ctx.globalAlpha = Math.min(1, statusT * 4);
        ctx.font = "800 34px Arial"; ctx.textAlign = "center";
        ctx.fillStyle = "rgba(0,0,0,0.5)"; ctx.fillText(statusText, 2, 2);
        ctx.fillStyle = statusCol; ctx.fillText(statusText, 0, 0);
        ctx.restore(); ctx.globalAlpha = 1;
      }

      ctx.restore();

      // Bljesak preko cijelog ekrana (gol).
      if (flash > 0) { ctx.fillStyle = "rgba(232,255,60," + (flash * 0.35) + ")"; ctx.fillRect(0, 0, W, H); }
    }

    function update(dt: number, time: number) {
      shake = Math.max(0, shake - dt * 40);
      flash = Math.max(0, flash - dt * 2.5);
      roar = Math.max(0, roar - dt * 1.5);
      netRipple.str = Math.max(0, netRipple.str - dt * 34);
      statusT = Math.max(0, statusT - dt);
      keeper.bob += dt * 3;

      for (let i = parts.length - 1; i >= 0; i--) { const p = parts[i]; p.life += dt; p.vy += dt * 14; p.x += p.vx; p.y += p.vy; if (p.life >= p.max) parts.splice(i, 1); }

      // Golman: reakcija pa skok prema meti.
      if (keeper.diving) {
        keeper.react -= dt;
        if (keeper.react <= 0) {
          keeper.pose = Math.min(1, keeper.pose + dt * 3.4);
          keeper.x += (keeper.tx - keeper.x) * Math.min(1, dt * 9);
          keeper.y += (keeper.ty - keeper.y) * Math.min(1, dt * 9);
        }
      } else {
        keeper.pose += (0 - keeper.pose) * Math.min(1, dt * 6);
        keeper.x += (GOAL_CX - keeper.x) * Math.min(1, dt * 6);
        keeper.y += (LINE_Y - keeper.y) * Math.min(1, dt * 6);
      }

      // Lopta u letu.
      if (ball.flying) {
        ball.t += dt / 0.66;
        const tt = ball.t > 1 ? 1 : ball.t;
        const e = tt; // linearno napredovanje prema golu
        ball.x = BALL_HOME.x + (ball.tx - BALL_HOME.x) * e;
        ball.y = BALL_HOME.y + (ball.ty - BALL_HOME.y) * e - Math.sin(Math.PI * tt) * 26;
        ball.s = 1 - 0.5 * tt;
        ball.rot += dt * 14;
        trail.push({ x: ball.x, y: ball.y, s: ball.s }); if (trail.length > 9) trail.shift();
        if (ball.t >= 1) resolveShot();
      }
    }

    function loop(ts: number) {
      const dt = last ? Math.min(0.05, (ts - last) / 1000) : 0.016; last = ts;
      update(dt, ts / 1000); render(ts / 1000);
      raf = requestAnimationFrame(loop);
    }

    // ── Tijek igre ───────────────────────────────────────────────────
    function beginShot() {
      phase = "aim";
      ball.x = BALL_HOME.x; ball.y = BALL_HOME.y; ball.s = 1; ball.rot = 0; ball.t = 0; ball.flying = false; ball.dead = false;
      keeper.diving = false; keeper.tx = GOAL_CX; keeper.ty = LINE_Y; keeper.dir = 0;
      trail.length = 0;
      setHint("&#9917; Tapni u gol gdje želiš pucati");
    }

    function shoot(tx: number, ty: number) {
      phase = "shoot"; setHint("&nbsp;"); sfxKick(); buzz(15);
      ball.tx = tx; ball.ty = ty; ball.flying = true;

      // Izazov: golman jači svakim penalom. Kutevi ostaju najsigurniji.
      const dcx = Math.min(1, Math.abs(tx - GOAL_CX) / ((POST_R - 14) - GOAL_CX));
      const highShot = ty < (CROSS_Y + LINE_Y) / 2;
      let saveChance = (0.34 + 0.10 * (shot - 1)) * (1 - 0.60 * dcx) * (highShot ? 0.85 : 1);
      saveChance = Math.max(0.12, Math.min(0.82, saveChance));
      const saved = Math.random() < saveChance;
      ball.saved = saved;

      // Golman ide prema lopti ako brani, inače pogađa krivu stranu.
      if (saved) { keeper.tx = tx; keeper.ty = ty + 4; }
      else {
        const wrongSide = tx >= GOAL_CX ? -1 : 1;
        // Ponekad pogodi stranu ali prekratko (realističnije).
        const guessSide = Math.random() < 0.45 ? -wrongSide : wrongSide;
        keeper.tx = GOAL_CX + guessSide * (40 + Math.random() * 55);
        keeper.ty = LINE_Y - 6 - Math.random() * 20;
      }
      keeper.dir = keeper.tx >= GOAL_CX ? 1 : -1;
      keeper.diving = true;
      keeper.react = Math.max(0.04, 0.22 - 0.03 * (shot - 1)); // brža reakcija kasnije
    }

    function resolveShot() {
      ball.flying = false;
      if (ball.saved) {
        statusText = "OBRANA!"; statusCol = "#ff4d6d"; statusT = 1.1; results[shot - 1] = false;
        sfxSave(); buzz(60); shake = 6; ball.dead = true;
        burst(ball.x, ball.y, ["#cfd6e0", "#8891a0"], 10, 3);
      } else {
        goals++; goalsEl.textContent = String(goals);
        statusText = "GOOOL!"; statusCol = "#e8ff3c"; statusT = 1.1; results[shot - 1] = true;
        sfxGoal(); sfxRoar(); buzz([30, 40, 60]);
        shake = 12; flash = 1; roar = 1;
        netRipple.x = ball.x; netRipple.y = Math.max(CROSS_Y + 6, ball.y); netRipple.str = 16;
        burst(ball.x, ball.y, ["#e8ff3c", "#fff", "#3b82f6"], 22, 4.5);
        ball.dead = true;
      }
      drawDots();
      phase = "result";
      setTimeout(() => {
        if (shot >= 5) { endGame(); }
        else { shot++; shotEl.textContent = String(shot); beginShot(); }
      }, 1150);
    }

    stage.addEventListener("click", (e) => {
      if (phase !== "aim") return;
      const r = stage.getBoundingClientRect();
      const x = ((e.clientX - r.left) / r.width) * W;
      const y = ((e.clientY - r.top) / r.height) * H;
      if (x < POST_L + 8 || x > POST_R - 8 || y < CROSS_Y + 4 || y > LINE_Y) { setHint('<span style="color:#ff4d6d;">Pucaj unutar gola!</span>'); return; }
      shoot(x, y);
    });

    startBtn.onclick = () => { sfxWhistle(); intro.style.display = "none"; playing = true; beginShot(); };

    function confetti() {
      const cols = ["#e8ff3c", "#fff", "#ff4d6d", "#3b82f6"];
      for (let i = 0; i < 40; i++) burst(Math.random() * W, -10, cols, 1, 3);
    }

    function endGame() {
      phase = "idle"; playing = false;
      if (goals > best()) localStorage.setItem(BEST_KEY, String(goals));
      const win = goals >= 4;
      const bestLine = '<p style="margin:6px 0 0;text-align:center;font-size:11px;color:rgba(255,255,255,0.45);">Najbolje: ' + best() + '/5</p>';
      if (win) {
        controls.innerHTML =
          '<p style="margin:0 0 2px;text-align:center;font-size:18px;font-weight:800;color:#e8ff3c;">POBJEDA — ' + goals + '/5!</p>' +
          '<p style="margin:0 0 14px;text-align:center;font-size:13px;color:rgba(255,255,255,0.75);">Osvojio si <b style="color:#e8ff3c;font-size:18px;">10% popusta</b> (na narudžbe od 20€)!</p>' +
          '<button id="pg_shop" class="pg-btn" style="width:100%;padding:14px 0;border:none;border-radius:12px;background:#e8ff3c;color:#0b0b0b;font-size:14px;font-weight:800;cursor:pointer;">ISKORISTI NA SHOPU &rarr;</button>' +
          '<button id="pg_again" class="pg-btn" style="width:100%;margin-top:8px;padding:11px 0;border:1px solid rgba(255,255,255,0.2);border-radius:12px;background:transparent;color:#fff;font-size:13px;cursor:pointer;">Igraj ponovno</button>' +
          '<p style="margin:8px 0 0;text-align:center;font-size:10px;color:rgba(255,255,255,0.35);">Besplatna dostava se sama primijeni na blagajni</p>' + bestLine;
        confetti(); flash = 1; sfxGoal(); sfxRoar();
      } else {
        controls.innerHTML =
          '<p style="margin:0 0 2px;text-align:center;font-size:18px;font-weight:800;color:#fff;">' + goals + '/5 golova</p>' +
          '<p style="margin:0 0 12px;text-align:center;font-size:12px;color:rgba(255,255,255,0.6);">Treba 4 za kod — ciljaj same kuteve!</p>' +
          '<button id="pg_again" class="pg-btn" style="width:100%;padding:14px 0;border:none;border-radius:12px;background:#e8ff3c;color:#0b0b0b;font-size:14px;font-weight:800;cursor:pointer;">Igraj ponovno</button>' + bestLine;
      }
      const shopEl = root!.querySelector<HTMLElement>("#pg_shop");
      if (shopEl) shopEl.onclick = () => { try { localStorage.setItem(PROMO_STORAGE_KEY, "GOL10"); } catch {} window.location.href = "/dresovi"; };
      const againEl = root!.querySelector<HTMLElement>("#pg_again");
      if (againEl) againEl.onclick = () => {
        shot = 1; goals = 0; for (let i = 0; i < 5; i++) results[i] = null;
        shotEl.textContent = "1"; goalsEl.textContent = "0"; drawDots();
        controls.innerHTML = '<p id="pg_hint" style="margin:0;text-align:center;font-size:13px;color:rgba(255,255,255,0.7);">&#9917; Tapni u gol gdje želiš pucati</p>';
        hint = root!.querySelector<HTMLElement>("#pg_hint")!;
        playing = true; beginShot();
      };
    }

    raf = requestAnimationFrame(loop);
    return () => { cancelAnimationFrame(raf); };
  }, []);

  return <div ref={rootRef} dangerouslySetInnerHTML={{ __html: STAGE_HTML }} />;
}
