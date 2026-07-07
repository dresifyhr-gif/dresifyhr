"use client";

import { useEffect, useRef } from "react";

import { PROMO_STORAGE_KEY } from "@/components/site/promo-capture";

// DRESIFY Zmija — glatko (interpolirano) kretanje na canvasu, zmija kao svijetleća
// cijev, prava lopta s pulsom, čestice pri jelu, screen shake + bljesak pri udaru.
const STAGE_HTML = `
<style>
.sn-btn{transition:transform .08s ease}
.sn-btn:active{transform:scale(0.97)}
.sn-dpad{display:flex;align-items:center;justify-content:center;width:54px;height:54px;border:1px solid rgba(255,255,255,0.15);border-radius:12px;background:#141414;color:#e8ff3c;font-size:20px;cursor:pointer;user-select:none;}
.sn-dpad:active{background:#1f1f1f}
</style>
<div style="display:flex;justify-content:center;">
  <div style="width:100%;max-width:400px;background:#05070c;border-radius:22px;overflow:hidden;border:1px solid rgba(255,255,255,0.12);font-family:inherit;box-shadow:0 18px 50px rgba(0,0,0,0.5);">
    <div style="display:flex;align-items:center;justify-content:space-between;padding:13px 18px;background:#000;">
      <span style="font-weight:700;letter-spacing:1px;color:#fff;font-size:20px;">DRES<span style="color:#e8ff3c;">IFY</span></span>
      <span style="font-size:11px;color:#e8ff3c;font-weight:700;letter-spacing:2px;text-transform:uppercase;">Zmija</span>
    </div>
    <div style="display:flex;justify-content:space-between;align-items:center;padding:9px 18px;font-size:12px;color:rgba(255,255,255,0.6);background:#0d0d10;">
      <span>5&middot;12&middot;20 lopti = <b style="color:#e8ff3c;">veća nagrada</b></span>
      <span style="display:flex;align-items:center;gap:10px;">REKORD <b id="sn_best" style="color:#fff;font-size:14px;">0</b>
        <button id="sn_mute" aria-label="Zvuk" style="background:none;border:none;color:rgba(255,255,255,0.55);cursor:pointer;font-size:15px;padding:0;line-height:1;">&#9834;</button>
      </span>
    </div>

    <div id="sn_stage" style="position:relative;width:100%;aspect-ratio:360/480;overflow:hidden;background:#0a140d;touch-action:none;">
      <canvas id="sn_canvas" style="display:block;width:100%;height:100%;"></canvas>
      <div style="position:absolute;top:2.5%;left:0;right:0;text-align:center;font-size:9px;letter-spacing:6px;color:rgba(232,255,60,0.5);font-weight:700;pointer-events:none;z-index:2;">D R E S I F Y &nbsp; A R E N A</div>

      <div id="sn_intro" style="position:absolute;inset:0;background:linear-gradient(rgba(5,7,12,0.5),rgba(5,7,12,0.82));display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;z-index:8;padding:20px;">
        <div style="font-size:13px;letter-spacing:3px;color:#e8ff3c;font-weight:700;margin-bottom:6px;">DRESIFY ZMIJA</div>
        <div style="font-size:22px;font-weight:800;color:#fff;line-height:1.1;margin-bottom:10px;">Jedi lopte i rasti</div>
        <div style="font-size:13px;color:rgba(255,255,255,0.7);margin-bottom:18px;max-width:260px;">Vodi zmiju da pojede &#9917;. Što više pojedeš, veća nagrada: <b style="color:#e8ff3c;">5&rarr;besplatna dostava</b>, 12&rarr;-15%, 20&rarr;-20%. Ne udari u zid ni u sebe!</div>
        <button id="sn_start" class="sn-btn" style="padding:14px 34px;border:none;border-radius:12px;background:#e8ff3c;color:#0b0b0b;font-size:15px;font-weight:800;cursor:pointer;box-shadow:0 8px 24px rgba(232,255,60,0.25);">START &#9917;</button>
      </div>

      <div id="sn_over" style="position:absolute;inset:0;background:linear-gradient(rgba(5,7,12,0.6),rgba(5,7,12,0.86));display:none;flex-direction:column;align-items:center;justify-content:center;text-align:center;z-index:8;padding:20px;"></div>
    </div>

    <div style="padding:12px 18px 18px;display:flex;align-items:center;justify-content:space-between;gap:14px;">
      <p style="margin:0;font-size:12px;color:rgba(255,255,255,0.55);max-width:120px;">Swipe ili strelice za smjer</p>
      <div style="display:grid;grid-template-columns:repeat(3,54px);grid-template-rows:repeat(2,54px);gap:6px;">
        <div></div>
        <div class="sn-dpad" id="sn_up">&#8593;</div>
        <div></div>
        <div class="sn-dpad" id="sn_left">&#8592;</div>
        <div class="sn-dpad" id="sn_down">&#8595;</div>
        <div class="sn-dpad" id="sn_right">&#8594;</div>
      </div>
    </div>
  </div>
</div>
`;

export function SnakeGame() {
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const $ = (id: string) => root.querySelector<HTMLElement>("#" + id)!;
    const stage = $("sn_stage"), intro = $("sn_intro"), over = $("sn_over"), startBtn = $("sn_start");
    const bestEl = $("sn_best"), muteBtn = $("sn_mute");
    const canvas = root.querySelector<HTMLCanvasElement>("#sn_canvas")!;
    const ctx = canvas.getContext("2d")!;

    const COLS = 15, ROWS = 20, CELL = 24;
    const W = COLS * CELL, H = ROWS * CELL, SC = 2;
    canvas.width = W * SC; canvas.height = H * SC; ctx.scale(SC, SC);

    const BEST_KEY = "dresify_snake_best";
    const best = () => Number(localStorage.getItem(BEST_KEY) || 0);
    bestEl.textContent = String(best());

    let muted = false;
    muteBtn.onclick = (e) => { e.stopPropagation(); muted = !muted; muteBtn.innerHTML = muted ? "&#128263;" : "&#9834;"; };
    let actx: AudioContext | null = null;
    function tone(freq: number, dur: number, type: OscillatorType, vol: number) {
      if (muted) return;
      try {
        const c: AudioContext = actx || new ((window as any).AudioContext || (window as any).webkitAudioContext)();
        actx = c; const t0 = c.currentTime;
        const o = c.createOscillator(), g = c.createGain();
        o.type = type; o.frequency.setValueAtTime(freq, t0);
        g.gain.setValueAtTime(vol, t0); g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
        o.connect(g); g.connect(c.destination); o.start(t0); o.stop(t0 + dur);
      } catch {}
    }
    const sEat = () => { tone(880, 0.09, "sine", 0.18); tone(1320, 0.08, "sine", 0.1); };
    const sHit = () => { tone(120, 0.25, "sawtooth", 0.2); tone(70, 0.3, "square", 0.12); };
    const buzz = (ms: number | number[]) => { try { (navigator as any).vibrate && navigator.vibrate(ms); } catch {} };

    type Cell = { x: number; y: number };
    let snake: Cell[] = [];
    let old: Cell[] = [];
    let dir: Cell = { x: 1, y: 0 };
    let pending: Cell = { x: 1, y: 0 };
    let ball: Cell = { x: 0, y: 0 };
    let score = 0, speed = 150, tier = "";
    let state: "idle" | "play" | "over" = "idle";
    let timer: ReturnType<typeof setTimeout> | undefined;
    let lastTick = 0, raf = 0;
    let shake = 0, flash = 0, pop = 0;
    const parts: { x: number; y: number; vx: number; vy: number; life: number; max: number; c: string; sz: number }[] = [];

    function rewardFor(s: number) {
      return s >= 20 ? { code: "GOL20", label: "-20% + besplatna dostava (od 100€)" }
        : s >= 12 ? { code: "GOL15", label: "-15% + besplatna dostava (od 80€)" }
        : s >= 5 ? { code: "DOSTAVA", label: "besplatnu dostavu (od 40€)" } : null;
    }
    const nextAt = (s: number) => s < 5 ? 5 : s < 12 ? 12 : s < 20 ? 20 : null;
    const nextLabel = (s: number) => s < 5 ? "besplatnu dostavu (od 40€)" : s < 12 ? "-15% + dostava (od 80€)" : s < 20 ? "-20% + dostava (od 100€)" : null;

    function randBall() {
      let c: Cell;
      do { c = { x: Math.floor(Math.random() * COLS), y: Math.floor(Math.random() * ROWS) }; }
      while (snake.some((s) => s.x === c.x && s.y === c.y));
      ball = c;
    }
    function reset() {
      snake = [{ x: 7, y: 10 }, { x: 6, y: 10 }, { x: 5, y: 10 }];
      old = snake.map((s) => ({ ...s }));
      dir = { x: 1, y: 0 }; pending = { x: 1, y: 0 };
      score = 0; speed = 150; tier = ""; parts.length = 0; shake = 0; flash = 0; pop = 0;
      randBall();
    }
    function setDir(x: number, y: number) {
      if (state !== "play") return;
      if (snake.length > 1 && x === -dir.x && y === -dir.y) return;
      pending = { x, y };
    }
    function burst(cx: number, cy: number) {
      for (let i = 0; i < 12; i++) { const a = Math.random() * 7, v = 1 + Math.random() * 2.6; parts.push({ x: cx, y: cy, vx: Math.cos(a) * v, vy: Math.sin(a) * v, life: 0, max: 0.5 + Math.random() * 0.4, c: Math.random() < 0.7 ? "#e8ff3c" : "#fff", sz: 2 + Math.random() * 2 }); }
    }

    const cx = (c: number) => c * CELL + CELL / 2;
    const cy = (c: number) => c * CELL + CELL / 2;

    function drawBall(time: number) {
      const px = cx(ball.x), py = cy(ball.y), pulse = 1 + Math.sin(time * 6) * 0.08, R = (CELL / 2 - 3) * pulse;
      ctx.save();
      ctx.shadowColor = "rgba(255,255,255,0.5)"; ctx.shadowBlur = 10;
      ctx.fillStyle = "#fff"; ctx.strokeStyle = "#0c0c0c"; ctx.lineWidth = R * 0.16;
      ctx.beginPath(); ctx.arc(px, py, R, 0, 7); ctx.fill(); ctx.stroke();
      ctx.shadowBlur = 0; ctx.fillStyle = "#121212";
      ctx.beginPath(); for (let i = 0; i < 5; i++) { const a = (i / 5) * 7 - 1.57, r = R * 0.36; const x = px + Math.cos(a) * r, y = py + Math.sin(a) * r; i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y); } ctx.closePath(); ctx.fill();
      ctx.restore();
    }

    function segCenter(i: number, t: number) {
      const c = snake[i]; const p = old[i] || old[old.length - 1] || c;
      return { x: cx(p.x) + (cx(c.x) - cx(p.x)) * t, y: cy(p.y) + (cy(c.y) - cy(p.y)) * t };
    }
    function drawSnake(t: number, time: number) {
      const pts = snake.map((_, i) => segCenter(i, t));
      if (pts.length < 1) return;
      // Tamni obrub.
      ctx.strokeStyle = "#0f3a1a"; ctx.lineWidth = CELL - 3; ctx.lineJoin = "round"; ctx.lineCap = "round";
      ctx.beginPath(); pts.forEach((p, i) => (i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y))); if (pts.length === 1) ctx.lineTo(pts[0].x + 0.1, pts[0].y); ctx.stroke();
      // Svijetlo tijelo (gradijent).
      const g = ctx.createLinearGradient(pts[pts.length - 1].x, pts[pts.length - 1].y, pts[0].x, pts[0].y);
      g.addColorStop(0, "#b6d600"); g.addColorStop(1, "#e8ff3c");
      ctx.strokeStyle = g; ctx.lineWidth = CELL - 8;
      ctx.beginPath(); pts.forEach((p, i) => (i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y))); if (pts.length === 1) ctx.lineTo(pts[0].x + 0.1, pts[0].y); ctx.stroke();
      // Glava.
      const h = pts[0], R = (CELL - 4) / 2;
      ctx.save(); ctx.shadowColor = "rgba(232,255,60,0.7)"; ctx.shadowBlur = 12;
      ctx.fillStyle = "#f5ff8a"; ctx.beginPath(); ctx.arc(h.x, h.y, R, 0, 7); ctx.fill(); ctx.restore();
      // Oči (u smjeru kretanja).
      const ox = dir.x * 3.2, oy = dir.y * 3.2, px = -dir.y * 3.4, py = dir.x * 3.4;
      ctx.fillStyle = "#0b0b0b";
      ctx.beginPath(); ctx.arc(h.x + ox + px, h.y + oy + py, 2, 0, 7); ctx.fill();
      ctx.beginPath(); ctx.arc(h.x + ox - px, h.y + oy - py, 2, 0, 7); ctx.fill();
      // Jezik (povremeno).
      if (Math.sin(time * 4) > 0.7) { ctx.strokeStyle = "#ff4d6d"; ctx.lineWidth = 1.6; ctx.beginPath(); ctx.moveTo(h.x + ox, h.y + oy); ctx.lineTo(h.x + ox * 2.2, h.y + oy * 2.2); ctx.stroke(); }
    }

    function render(time: number) {
      ctx.clearRect(0, 0, W, H);
      ctx.save();
      const sxk = shake > 0 ? (Math.random() - 0.5) * shake : 0, syk = shake > 0 ? (Math.random() - 0.5) * shake : 0;
      ctx.translate(sxk, syk);

      // Pozadina (travnati gradijent + mreža + vinjeta).
      const bg = ctx.createLinearGradient(0, 0, 0, H); bg.addColorStop(0, "#12241a"); bg.addColorStop(1, "#0a140d");
      ctx.fillStyle = bg; ctx.fillRect(0, 0, W, H);
      ctx.fillStyle = "rgba(255,255,255,0.02)";
      for (let i = 0; i < COLS; i += 2) ctx.fillRect(i * CELL, 0, CELL, H);
      ctx.strokeStyle = "rgba(255,255,255,0.035)"; ctx.lineWidth = 1;
      for (let i = 1; i < COLS; i++) { ctx.beginPath(); ctx.moveTo(i * CELL, 0); ctx.lineTo(i * CELL, H); ctx.stroke(); }
      for (let j = 1; j < ROWS; j++) { ctx.beginPath(); ctx.moveTo(0, j * CELL); ctx.lineTo(W, j * CELL); ctx.stroke(); }

      const t = state === "play" ? Math.min(1, (performance.now() - lastTick) / speed) : 1;
      drawBall(time);
      if (snake.length) drawSnake(t, time);

      for (const p of parts) { ctx.globalAlpha = Math.max(0, 1 - p.life / p.max); ctx.fillStyle = p.c; ctx.fillRect(p.x, p.y, p.sz, p.sz); }
      ctx.globalAlpha = 1;

      if (state === "play") {
        const sc = 1 + pop * 0.5;
        ctx.save(); ctx.translate(W / 2, 22); ctx.scale(sc, sc);
        ctx.fillStyle = "#fff"; ctx.font = "800 22px Arial"; ctx.textAlign = "center"; ctx.textBaseline = "middle";
        ctx.shadowColor = "rgba(0,0,0,0.5)"; ctx.shadowBlur = 6; ctx.fillText(String(score), 0, 0); ctx.restore(); ctx.shadowBlur = 0;
        if (tier) { ctx.fillStyle = "#e8ff3c"; ctx.font = "700 11px Arial"; ctx.textAlign = "center"; ctx.textBaseline = "top"; ctx.fillText("NAGRADA OTKLJUČANA", W / 2, 40); }
        ctx.textBaseline = "alphabetic";
      }
      ctx.restore();
      if (flash > 0) { ctx.fillStyle = "rgba(255,77,109," + (flash * 0.4) + ")"; ctx.fillRect(0, 0, W, H); }
    }

    function frame() {
      shake = Math.max(0, shake - 0.5); flash = Math.max(0, flash - 0.05); pop = Math.max(0, pop - 0.08);
      for (let i = parts.length - 1; i >= 0; i--) { const p = parts[i]; p.life += 0.016; p.vy += 0.12; p.x += p.vx; p.y += p.vy; if (p.life >= p.max) parts.splice(i, 1); }
      render(performance.now() / 1000);
      raf = requestAnimationFrame(frame);
    }

    function tick() {
      dir = pending;
      old = snake.map((s) => ({ ...s }));
      const head: Cell = { x: snake[0].x + dir.x, y: snake[0].y + dir.y };
      if (head.x < 0 || head.x >= COLS || head.y < 0 || head.y >= ROWS) return gameOver();
      const eating = head.x === ball.x && head.y === ball.y;
      const body = eating ? snake : snake.slice(0, -1);
      if (body.some((s) => s.x === head.x && s.y === head.y)) return gameOver();
      snake.unshift(head);
      if (eating) {
        score++; sEat(); burst(cx(ball.x), cy(ball.y)); pop = 1; randBall(); speed = Math.max(80, 150 - score * 4);
        const r = rewardFor(score); if (r && r.code !== tier) { tier = r.code; buzz(40); flash = 0; }
      } else { snake.pop(); }
      lastTick = performance.now();
      schedule();
    }
    function schedule() { timer = setTimeout(() => { if (state === "play") tick(); }, speed); }

    function startGame() { intro.style.display = "none"; over.style.display = "none"; reset(); state = "play"; lastTick = performance.now(); schedule(); }

    function gameOver() {
      state = "over"; sHit(); buzz(120); shake = 14; flash = 1;
      if (score > best()) localStorage.setItem(BEST_KEY, String(score));
      bestEl.textContent = String(best());
      const reward = rewardFor(score); const win = !!reward;
      let h = '<div style="font-size:13px;letter-spacing:2px;color:' + (win ? "#e8ff3c" : "rgba(255,255,255,0.6)") + ';font-weight:700;margin-bottom:4px;">' + (win ? "POBJEDA!" : "KRAJ IGRE") + '</div>'
        + '<div style="font-size:30px;font-weight:800;color:#fff;line-height:1;margin-bottom:2px;">' + score + '</div>'
        + '<div style="font-size:11px;color:rgba(255,255,255,0.45);margin-bottom:14px;">pojedenih lopti &middot; rekord ' + best() + '</div>';
      if (reward) {
        h += '<div style="font-size:13px;color:rgba(255,255,255,0.75);margin-bottom:14px;">Osvojio si <b style="color:#e8ff3c;font-size:18px;">' + reward.label + '</b>!</div>'
          + '<button id="sn_shop" class="sn-btn" style="width:220px;padding:14px 0;border:none;border-radius:12px;background:#e8ff3c;color:#0b0b0b;font-size:14px;font-weight:800;cursor:pointer;">ISKORISTI NAGRADU &rarr;</button>'
          + '<button id="sn_again" class="sn-btn" style="width:220px;margin-top:8px;padding:10px 0;border:1px solid rgba(255,255,255,0.2);border-radius:12px;background:transparent;color:#fff;font-size:13px;cursor:pointer;">Igraj ponovno</button>'
          + '<div style="margin-top:10px;font-size:10px;color:rgba(255,255,255,0.35);">Nagrada se sama primijeni na blagajni</div>';
      } else {
        h += '<div style="font-size:12px;color:rgba(255,255,255,0.6);margin-bottom:12px;">Pojedi <b style="color:#e8ff3c;">' + nextAt(score) + '</b> lopti za <b style="color:#e8ff3c;">' + nextLabel(score) + '</b>!</div>'
          + '<button id="sn_again" class="sn-btn" style="width:220px;padding:13px 0;border:none;border-radius:12px;background:#e8ff3c;color:#0b0b0b;font-size:14px;font-weight:800;cursor:pointer;">Igraj ponovno</button>';
      }
      over.innerHTML = h; over.style.display = "flex";
      const shopEl = root!.querySelector<HTMLElement>("#sn_shop");
      if (shopEl && reward) shopEl.onclick = () => { try { localStorage.setItem(PROMO_STORAGE_KEY, reward.code); } catch {} window.location.href = "/dresovi"; };
      const againEl = root!.querySelector<HTMLElement>("#sn_again");
      if (againEl) againEl.onclick = () => startGame();
    }

    startBtn.onclick = (e) => { e.stopPropagation(); startGame(); };
    function onKey(e: KeyboardEvent) {
      const k = e.key.toLowerCase();
      if (k === "arrowup" || k === "w") { e.preventDefault(); setDir(0, -1); }
      else if (k === "arrowdown" || k === "s") { e.preventDefault(); setDir(0, 1); }
      else if (k === "arrowleft" || k === "a") { e.preventDefault(); setDir(-1, 0); }
      else if (k === "arrowright" || k === "d") { e.preventDefault(); setDir(1, 0); }
    }
    window.addEventListener("keydown", onKey);
    $("sn_up").onclick = () => setDir(0, -1);
    $("sn_down").onclick = () => setDir(0, 1);
    $("sn_left").onclick = () => setDir(-1, 0);
    $("sn_right").onclick = () => setDir(1, 0);

    let sx = 0, sy = 0;
    stage.addEventListener("touchstart", (e) => { const t = e.touches[0]; sx = t.clientX; sy = t.clientY; }, { passive: true });
    stage.addEventListener("touchmove", (e) => {
      if (state !== "play") return;
      const t = e.touches[0]; const dx = t.clientX - sx, dy = t.clientY - sy;
      if (Math.abs(dx) < 24 && Math.abs(dy) < 24) return;
      if (Math.abs(dx) > Math.abs(dy)) setDir(dx > 0 ? 1 : -1, 0); else setDir(0, dy > 0 ? 1 : -1);
      sx = t.clientX; sy = t.clientY;
    }, { passive: true });

    reset(); raf = requestAnimationFrame(frame);
    return () => { if (timer) clearTimeout(timer); cancelAnimationFrame(raf); window.removeEventListener("keydown", onKey); };
  }, []);

  return <div ref={rootRef} dangerouslySetInnerHTML={{ __html: STAGE_HTML }} />;
}
