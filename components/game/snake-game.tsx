"use client";

import { useEffect, useRef } from "react";

import { PROMO_STORAGE_KEY } from "@/components/site/promo-capture";

const STAGE_HTML = `
<style>
.sn-btn{transition:transform .08s ease}
.sn-btn:active{transform:scale(0.97)}
.sn-dpad{display:flex;align-items:center;justify-content:center;width:54px;height:54px;border:1px solid rgba(255,255,255,0.15);border-radius:12px;background:#141414;color:#e8ff3c;font-size:20px;cursor:pointer;user-select:none;}
.sn-dpad:active{background:#1f1f1f}
</style>
<div style="display:flex;justify-content:center;">
  <div style="width:100%;max-width:400px;background:#0b0b0b;border-radius:22px;overflow:hidden;border:1px solid rgba(255,255,255,0.12);font-family:inherit;box-shadow:0 18px 50px rgba(0,0,0,0.5);">
    <div style="display:flex;align-items:center;justify-content:space-between;padding:13px 18px;background:#000;">
      <span style="font-weight:700;letter-spacing:1px;color:#fff;font-size:20px;">DRES<span style="color:#e8ff3c;">IFY</span></span>
      <span style="font-size:11px;color:#e8ff3c;font-weight:700;letter-spacing:2px;text-transform:uppercase;">Zmija</span>
    </div>
    <div style="display:flex;justify-content:space-between;align-items:center;padding:9px 18px;font-size:12px;color:rgba(255,255,255,0.6);background:#111;">
      <span>5&middot;12&middot;20 lopti = <b style="color:#e8ff3c;">veća nagrada</b></span>
      <span style="display:flex;align-items:center;gap:10px;">REKORD <b id="sn_best" style="color:#fff;font-size:14px;">0</b>
        <button id="sn_mute" aria-label="Zvuk" style="background:none;border:none;color:rgba(255,255,255,0.55);cursor:pointer;font-size:15px;padding:0;line-height:1;">&#9834;</button>
      </span>
    </div>

    <div id="sn_stage" style="position:relative;width:100%;aspect-ratio:360/480;overflow:hidden;background:#0e1a12;touch-action:none;">
      <canvas id="sn_canvas" style="display:block;width:100%;height:100%;"></canvas>

      <div id="sn_intro" style="position:absolute;inset:0;background:rgba(7,7,7,0.74);display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;z-index:8;padding:20px;">
        <div style="font-size:13px;letter-spacing:3px;color:#e8ff3c;font-weight:700;margin-bottom:6px;">DRESIFY ZMIJA</div>
        <div style="font-size:22px;font-weight:800;color:#fff;line-height:1.1;margin-bottom:10px;">Jedi lopte i rasti</div>
        <div style="font-size:13px;color:rgba(255,255,255,0.7);margin-bottom:18px;max-width:260px;">Vodi zmiju da pojede &#9917;. Što više pojedeš, veća nagrada: <b style="color:#e8ff3c;">5&rarr;besplatna dostava</b>, 12&rarr;-15%, 20&rarr;-20%. Ne udari u zid ni u sebe!</div>
        <button id="sn_start" class="sn-btn" style="padding:14px 34px;border:none;border-radius:12px;background:#e8ff3c;color:#0b0b0b;font-size:15px;font-weight:800;cursor:pointer;">START &#9917;</button>
      </div>

      <div id="sn_over" style="position:absolute;inset:0;background:rgba(7,7,7,0.82);display:none;flex-direction:column;align-items:center;justify-content:center;text-align:center;z-index:8;padding:20px;"></div>
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
    const sEat = () => tone(880, 0.1, "sine", 0.18);
    const sHit = () => tone(120, 0.25, "sawtooth", 0.2);
    const buzz = (ms: number | number[]) => { try { (navigator as any).vibrate && navigator.vibrate(ms); } catch {} };

    type Cell = { x: number; y: number };
    let snake: Cell[] = [];
    let dir: Cell = { x: 1, y: 0 };
    let pending: Cell = { x: 1, y: 0 };
    let ball: Cell = { x: 0, y: 0 };
    let score = 0, speed = 150, tier = "";
    let state: "idle" | "play" | "over" = "idle";
    let timer: ReturnType<typeof setTimeout> | undefined;

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
      dir = { x: 1, y: 0 }; pending = { x: 1, y: 0 };
      score = 0; speed = 150; tier = "";
      randBall();
    }

    function setDir(x: number, y: number) {
      if (state !== "play") return;
      if (snake.length > 1 && x === -dir.x && y === -dir.y) return; // no reverse
      pending = { x, y };
    }

    function draw() {
      ctx.fillStyle = "#0e1a12"; ctx.fillRect(0, 0, W, H);
      // subtle grid
      ctx.strokeStyle = "rgba(255,255,255,0.03)"; ctx.lineWidth = 1;
      for (let i = 1; i < COLS; i++) { ctx.beginPath(); ctx.moveTo(i * CELL, 0); ctx.lineTo(i * CELL, H); ctx.stroke(); }
      for (let j = 1; j < ROWS; j++) { ctx.beginPath(); ctx.moveTo(0, j * CELL); ctx.lineTo(W, j * CELL); ctx.stroke(); }

      // ball
      ctx.font = `${CELL - 4}px Arial`; ctx.textAlign = "center"; ctx.textBaseline = "middle";
      ctx.fillText("⚽", ball.x * CELL + CELL / 2, ball.y * CELL + CELL / 2 + 1);

      // snake
      for (let i = snake.length - 1; i >= 0; i--) {
        const s = snake[i];
        ctx.fillStyle = i === 0 ? "#f5ff8a" : "#e8ff3c";
        const pad = 2;
        const r = 6;
        const x = s.x * CELL + pad, y = s.y * CELL + pad, w = CELL - pad * 2, h = CELL - pad * 2;
        ctx.beginPath();
        if (typeof ctx.roundRect === "function") ctx.roundRect(x, y, w, h, r);
        else ctx.rect(x, y, w, h);
        ctx.fill();
        if (i === 0) {
          // eyes
          ctx.fillStyle = "#0b0b0b";
          ctx.beginPath(); ctx.arc(x + w * 0.32, y + h * 0.38, 1.8, 0, Math.PI * 2); ctx.fill();
          ctx.beginPath(); ctx.arc(x + w * 0.68, y + h * 0.38, 1.8, 0, Math.PI * 2); ctx.fill();
        }
      }

      // score
      if (state === "play") {
        ctx.fillStyle = "#fff"; ctx.font = "800 22px Arial"; ctx.textAlign = "center"; ctx.textBaseline = "top";
        ctx.shadowColor = "rgba(0,0,0,0.5)"; ctx.shadowBlur = 6;
        ctx.fillText(String(score), W / 2, 12); ctx.shadowBlur = 0;
        if (tier) { ctx.fillStyle = "#e8ff3c"; ctx.font = "700 11px Arial"; ctx.fillText("NAGRADA OTKLJUČANA", W / 2, 40); }
      }
    }

    function tick() {
      dir = pending;
      const head: Cell = { x: snake[0].x + dir.x, y: snake[0].y + dir.y };
      if (head.x < 0 || head.x >= COLS || head.y < 0 || head.y >= ROWS) return gameOver();
      const eating = head.x === ball.x && head.y === ball.y;
      const body = eating ? snake : snake.slice(0, -1);
      if (body.some((s) => s.x === head.x && s.y === head.y)) return gameOver();
      snake.unshift(head);
      if (eating) {
        score++; sEat(); randBall(); speed = Math.max(80, 150 - score * 4);
        const r = rewardFor(score); if (r && r.code !== tier) { tier = r.code; buzz(40); }
      } else {
        snake.pop();
      }
      draw();
      schedule();
    }

    function schedule() { timer = setTimeout(() => { if (state === "play") tick(); }, speed); }

    function startGame() {
      intro.style.display = "none"; over.style.display = "none";
      reset(); state = "play"; draw(); schedule();
    }

    function gameOver() {
      state = "over"; sHit(); buzz(120);
      if (score > best()) localStorage.setItem(BEST_KEY, String(score));
      bestEl.textContent = String(best());
      const reward = rewardFor(score);
      const win = !!reward;
      let h = '<div style="font-size:13px;letter-spacing:2px;color:' + (win ? "#e8ff3c" : "rgba(255,255,255,0.6)") + ';font-weight:700;margin-bottom:4px;">' + (win ? "POBJEDA!" : "KRAJ IGRE") + '</div>'
        + '<div style="font-size:30px;font-weight:800;color:#fff;line-height:1;margin-bottom:2px;">' + score + '</div>'
        + '<div style="font-size:11px;color:rgba(255,255,255,0.45);margin-bottom:14px;">pojedenih lopti &middot; rekord ' + best() + '</div>';
      if (reward) {
        h += '<div style="font-size:13px;color:rgba(255,255,255,0.75);margin-bottom:14px;">Osvojio si <b style="color:#e8ff3c;font-size:18px;">' + reward.label + '</b>!</div>'
          + '<button id="sn_shop" class="sn-btn" style="width:220px;padding:14px 0;border:none;border-radius:12px;background:#e8ff3c;color:#0b0b0b;font-size:14px;font-weight:800;cursor:pointer;">ISKORISTI NAGRADU &rarr;</button>'
          + '<button id="sn_again" class="sn-btn" style="width:220px;margin-top:8px;padding:10px 0;border:1px solid rgba(255,255,255,0.2);border-radius:12px;background:transparent;color:#fff;font-size:13px;cursor:pointer;">Igraj ponovno</button>'
          + '<div style="margin-top:10px;font-size:10px;color:rgba(255,255,255,0.35);">Nagrada se sam primijeni na blagajni</div>';
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

    // ── Controls ──────────────────────────────────────────────────────────
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

    // Swipe on stage
    let sx = 0, sy = 0;
    stage.addEventListener("touchstart", (e) => {
      const t = e.touches[0]; sx = t.clientX; sy = t.clientY;
    }, { passive: true });
    stage.addEventListener("touchmove", (e) => {
      if (state !== "play") return;
      const t = e.touches[0];
      const dx = t.clientX - sx, dy = t.clientY - sy;
      if (Math.abs(dx) < 24 && Math.abs(dy) < 24) return;
      if (Math.abs(dx) > Math.abs(dy)) setDir(dx > 0 ? 1 : -1, 0);
      else setDir(0, dy > 0 ? 1 : -1);
      sx = t.clientX; sy = t.clientY;
    }, { passive: true });

    draw();

    return () => {
      if (timer) clearTimeout(timer);
      window.removeEventListener("keydown", onKey);
    };
  }, []);

  return <div ref={rootRef} dangerouslySetInnerHTML={{ __html: STAGE_HTML }} />;
}
