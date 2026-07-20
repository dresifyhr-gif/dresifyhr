"use client";

import { useEffect, useRef } from "react";

import { PROMO_STORAGE_KEY } from "@/components/site/promo-capture";

// DRESIFY Flappy Ball — canvas. Stadion pod reflektorima s paralaks tribinama,
// lopta s tragom i sjenom, čestice pri prolazu, screen shake + bljesak pri udaru.
const STAGE_HTML = `
<style>
.fb-btn{transition:transform .08s ease}
.fb-btn:active{transform:scale(0.97)}
</style>
<div style="display:flex;justify-content:center;">
  <div style="width:100%;max-width:400px;background:#05070c;border-radius:22px;overflow:hidden;border:1px solid rgba(255,255,255,0.12);font-family:inherit;box-shadow:0 18px 50px rgba(0,0,0,0.5);">
    <div style="display:flex;align-items:center;justify-content:space-between;padding:13px 18px;background:#000;">
      <span style="font-weight:700;letter-spacing:1px;color:#fff;font-size:20px;">DRES<span style="color:#e8ff3c;">IFY</span></span>
      <span style="font-size:11px;color:#e8ff3c;font-weight:700;letter-spacing:2px;text-transform:uppercase;">Flappy Ball</span>
    </div>
    <div style="display:flex;justify-content:space-between;align-items:center;padding:9px 18px;font-size:12px;color:rgba(255,255,255,0.6);background:#0d0d10;">
      <span>20&middot;35&middot;50 = <b style="color:#e8ff3c;">veća nagrada</b></span>
      <span style="display:flex;align-items:center;gap:10px;">REKORD <b id="fb_best" style="color:#fff;font-size:14px;">0</b>
        <button id="fb_mute" aria-label="Zvuk" style="background:none;border:none;color:rgba(255,255,255,0.55);cursor:pointer;font-size:15px;padding:0;line-height:1;">&#9834;</button>
      </span>
    </div>

    <div id="fb_stage" style="position:relative;width:100%;aspect-ratio:360/480;overflow:hidden;background:#05070c;cursor:pointer;touch-action:none;">
      <canvas id="fb_canvas" style="display:block;width:100%;height:100%;"></canvas>
      <div style="position:absolute;top:2.5%;left:0;right:0;text-align:center;font-size:9px;letter-spacing:6px;color:rgba(232,255,60,0.5);font-weight:700;pointer-events:none;z-index:2;">D R E S I F Y &nbsp; A R E N A</div>

      <div id="fb_intro" style="position:absolute;inset:0;background:linear-gradient(rgba(5,7,12,0.5),rgba(5,7,12,0.82));display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;z-index:8;padding:20px;">
        <div style="font-size:13px;letter-spacing:3px;color:#e8ff3c;font-weight:700;margin-bottom:6px;">DRESIFY FLAPPY BALL</div>
        <div style="font-size:22px;font-weight:800;color:#fff;line-height:1.1;margin-bottom:10px;">Provedi loptu kroz golove</div>
        <div style="font-size:13px;color:rgba(255,255,255,0.7);margin-bottom:18px;max-width:260px;">Tapni za skok. Što dalje prođeš, veća nagrada: <b style="color:#e8ff3c;">20&rarr;10% popusta</b>, 35&rarr;-15%+dostava, 50&rarr;-20%+dostava. Sve teže ide!</div>
        <button id="fb_start" class="fb-btn" style="padding:14px 34px;border:none;border-radius:12px;background:#e8ff3c;color:#0b0b0b;font-size:15px;font-weight:800;cursor:pointer;box-shadow:0 8px 24px rgba(232,255,60,0.25);">START &#9917;</button>
      </div>

      <div id="fb_over" style="position:absolute;inset:0;background:linear-gradient(rgba(5,7,12,0.6),rgba(5,7,12,0.86));display:none;flex-direction:column;align-items:center;justify-content:center;text-align:center;z-index:8;padding:20px;"></div>
    </div>

    <div id="fb_controls" style="padding:13px 18px 18px;">
      <p style="margin:0;text-align:center;font-size:13px;color:rgba(255,255,255,0.7);">&#9917; Tapni za skok</p>
    </div>
  </div>
</div>
`;

export function FlappyGame() {
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const $ = (id: string) => root.querySelector<HTMLElement>("#" + id)!;
    const stage = $("fb_stage"), intro = $("fb_intro"), over = $("fb_over"), startBtn = $("fb_start");
    const bestEl = $("fb_best"), muteBtn = $("fb_mute");
    const canvas = root.querySelector<HTMLCanvasElement>("#fb_canvas")!;
    const ctx = canvas.getContext("2d")!;

    const W = 360, H = 480, SC = 2;
    canvas.width = W * SC; canvas.height = H * SC; ctx.scale(SC, SC);

    const BEST_KEY = "dresify_flappy_best";
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
    const sFlap = () => tone(520, 0.08, "square", 0.12);
    const sScore = () => { tone(880, 0.09, "sine", 0.18); tone(1320, 0.08, "sine", 0.1); };
    const sHit = () => { tone(120, 0.25, "sawtooth", 0.2); tone(70, 0.3, "square", 0.12); };
    const buzz = (ms: number | number[]) => { try { (navigator as any).vibrate && navigator.vibrate(ms); } catch {} };

    const GROUND = 46, R = 15, PW = 58, GAP0 = 158, SPACE = 210;
    let ball = { x: 108, y: 210, vy: 0 };
    let pipes: { x: number; gy: number; passed: boolean }[] = [];
    let score = 0, state: "idle" | "play" | "over" = "idle", raf = 0, frame = 0, tierCode = "";
    let shake = 0, flash = 0, pop = 0;
    const trail: { x: number; y: number }[] = [];
    const parts: { x: number; y: number; vx: number; vy: number; life: number; max: number; c: string; sz: number }[] = [];
    const stars = Array.from({ length: 24 }, () => ({ x: Math.random() * W, y: Math.random() * 130, r: Math.random() * 1.1 + 0.3, p: Math.random() * 6 }));
    const crowd = Array.from({ length: 110 }, () => ({ x: Math.random() * W, y: 66 + Math.random() * 44, c: Math.random() }));

    function gap() { return score <= 20 ? Math.max(100, GAP0 - score * 3.0) : Math.max(74, 100 - (score - 20) * 3.2); }
    function speed() { return Math.min(6.2, 2.5 + score * 0.16); }
    function spacing() { return Math.max(135, SPACE - score * 3.2); }
    function rewardFor(s: number) { return s >= 50 ? { code: "GOL20", label: "-20% + besplatna dostava (od 100€)" } : s >= 35 ? { code: "GOL15", label: "-15% + besplatna dostava (od 80€)" } : s >= 20 ? { code: "GOL10", label: "10% popusta (od 20€)" } : null; }
    function nextRewardLabel(s: number) { return s < 20 ? "10% popusta (od 20€)" : s < 35 ? "-15% + dostava (od 80€)" : s < 50 ? "-20% + dostava (od 100€)" : null; }
    function nextRewardAt(s: number) { return s < 20 ? 20 : s < 35 ? 35 : s < 50 ? 50 : null; }
    function spawn() { const m = 64, g = gap(); const gy = m + g / 2 + Math.random() * (H - GROUND - 2 * m - g); pipes.push({ x: W + 20, gy, passed: false }); }
    function reset() { ball = { x: 108, y: 210, vy: 0 }; pipes = []; score = 0; frame = 0; tierCode = ""; trail.length = 0; parts.length = 0; shake = 0; flash = 0; pop = 0; spawn(); }

    function puff() { for (let i = 0; i < 4; i++) parts.push({ x: ball.x - R, y: ball.y, vx: -1 - Math.random() * 1.5, vy: (Math.random() - 0.5) * 1.5, life: 0, max: 0.35, c: "rgba(255,255,255,0.5)", sz: 2 + Math.random() * 2 }); }
    function burst(x: number, y: number) { for (let i = 0; i < 10; i++) { const a = Math.random() * 7, v = 1 + Math.random() * 2.4; parts.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, life: 0, max: 0.5 + Math.random() * 0.3, c: Math.random() < 0.7 ? "#e8ff3c" : "#fff", sz: 2 + Math.random() * 2 }); } }

    function flap() {
      if (state === "idle") { intro.style.display = "none"; state = "play"; reset(); ball.vy = -6.6; sFlap(); puff(); }
      else if (state === "play") { ball.vy = -6.6; sFlap(); puff(); }
    }
    startBtn.onclick = (e) => { e.stopPropagation(); flap(); };
    stage.addEventListener("pointerdown", () => { if (state !== "over") flap(); });
    function onKey(e: KeyboardEvent) { if (e.code === "Space" && state !== "over") { e.preventDefault(); flap(); } }
    window.addEventListener("keydown", onKey);

    function gameOver() {
      state = "over"; sHit(); buzz(120); shake = 14; flash = 1;
      if (score > best()) localStorage.setItem(BEST_KEY, String(score));
      bestEl.textContent = String(best());
      const reward = rewardFor(score); const win = !!reward;
      let h = '<div style="font-size:13px;letter-spacing:2px;color:' + (win ? "#e8ff3c" : "rgba(255,255,255,0.6)") + ';font-weight:700;margin-bottom:4px;">' + (win ? "POBJEDA!" : "KRAJ IGRE") + '</div>'
        + '<div style="font-size:30px;font-weight:800;color:#fff;line-height:1;margin-bottom:2px;">' + score + '</div>'
        + '<div style="font-size:11px;color:rgba(255,255,255,0.45);margin-bottom:14px;">bodova &middot; rekord ' + best() + '</div>';
      if (reward) {
        h += '<div style="font-size:13px;color:rgba(255,255,255,0.75);margin-bottom:14px;">Osvojio si <b style="color:#e8ff3c;font-size:18px;">' + reward.label + '</b>!</div>'
          + '<button id="fb_shop" class="fb-btn" style="width:220px;padding:14px 0;border:none;border-radius:12px;background:#e8ff3c;color:#0b0b0b;font-size:14px;font-weight:800;cursor:pointer;">ISKORISTI NAGRADU &rarr;</button>'
          + '<button id="fb_again" class="fb-btn" style="width:220px;margin-top:8px;padding:10px 0;border:1px solid rgba(255,255,255,0.2);border-radius:12px;background:transparent;color:#fff;font-size:13px;cursor:pointer;">Igraj ponovno</button>'
          + '<div style="margin-top:10px;font-size:10px;color:rgba(255,255,255,0.35);">Nagrada se sama primijeni na blagajni</div>';
      } else {
        h += '<div style="font-size:12px;color:rgba(255,255,255,0.6);margin-bottom:12px;">Dođi do <b style="color:#e8ff3c;">' + nextRewardAt(score) + '</b> bodova za <b style="color:#e8ff3c;">' + nextRewardLabel(score) + '</b>!</div>'
          + '<button id="fb_again" class="fb-btn" style="width:220px;padding:13px 0;border:none;border-radius:12px;background:#e8ff3c;color:#0b0b0b;font-size:14px;font-weight:800;cursor:pointer;">Igraj ponovno</button>';
      }
      over.innerHTML = h; over.style.display = "flex";
      const shopEl = root!.querySelector<HTMLElement>("#fb_shop");
      if (shopEl && reward) shopEl.onclick = (e) => { e.stopPropagation(); try { localStorage.setItem(PROMO_STORAGE_KEY, reward.code); } catch {} window.location.href = "/dresovi"; };
      const againEl = root!.querySelector<HTMLElement>("#fb_again");
      if (againEl) againEl.onclick = (e) => { e.stopPropagation(); over.style.display = "none"; state = "play"; reset(); ball.vy = -6.6; };
    }

    function drawBackground(time: number) {
      const sky = ctx.createLinearGradient(0, 0, 0, H - GROUND);
      sky.addColorStop(0, "#0a1330"); sky.addColorStop(0.55, "#0b1020"); sky.addColorStop(1, "#0d2213");
      ctx.fillStyle = sky; ctx.fillRect(0, 0, W, H - GROUND);
      for (const s of stars) { const tw = 0.5 + 0.5 * Math.sin(time * 2 + s.p); ctx.globalAlpha = 0.5 * tw; ctx.fillStyle = "#dfe8ff"; ctx.fillRect(s.x, s.y, s.r, s.r); }
      ctx.globalAlpha = 1;
      for (const fx of [36, W - 36]) { const fg = ctx.createRadialGradient(fx, 6, 0, fx, 6, 130); fg.addColorStop(0, "rgba(255,255,225,0.14)"); fg.addColorStop(1, "rgba(255,255,225,0)"); ctx.fillStyle = fg; ctx.fillRect(0, 0, W, H - GROUND); ctx.fillStyle = "#fffef0"; ctx.beginPath(); ctx.arc(fx, 6, 4, 0, 7); ctx.fill(); }
      ctx.fillStyle = "#0f1218"; ctx.fillRect(0, 58, W, 58);
      for (const p of crowd) { const tw = 0.6 + 0.4 * Math.sin(time * 3 + p.x); ctx.globalAlpha = 0.4 + 0.32 * tw; ctx.fillStyle = p.c < 0.5 ? "#e8ff3c" : p.c < 0.72 ? "#3b82f6" : p.c < 0.86 ? "#ff4d6d" : "#cfd6e0"; ctx.fillRect(p.x, p.y, 2.4, 2.4); }
      ctx.globalAlpha = 1;
    }
    function drawPipe(p: { x: number; gy: number }, g: number) {
      const bottomTop = p.gy + g / 2, topH = p.gy - g / 2, groundY = H - GROUND;
      for (const seg of [{ y: 0, h: topH, capY: topH - 14 }, { y: bottomTop, h: groundY - bottomTop, capY: bottomTop }]) {
        if (seg.h <= 0) continue;
        const grad = ctx.createLinearGradient(p.x, 0, p.x + PW, 0);
        grad.addColorStop(0, "#0c3016"); grad.addColorStop(0.5, "#155f27"); grad.addColorStop(1, "#0c3016");
        ctx.fillStyle = grad; ctx.fillRect(p.x, seg.y, PW, seg.h);
        ctx.fillStyle = "rgba(255,255,255,0.08)"; ctx.fillRect(p.x + 6, seg.y, 3, seg.h);
        // Kapa (neon).
        const cg = ctx.createLinearGradient(0, seg.capY, 0, seg.capY + 14); cg.addColorStop(0, "#f4ff8a"); cg.addColorStop(1, "#c9d600");
        ctx.fillStyle = cg; ctx.fillRect(p.x - 3, seg.capY, PW + 6, 14);
        ctx.fillStyle = "rgba(0,0,0,0.15)"; ctx.fillRect(p.x - 3, seg.capY + 11, PW + 6, 3);
      }
    }
    function drawBall() {
      // Trag.
      for (let i = 0; i < trail.length; i++) { const p = trail[i]; ctx.globalAlpha = (i / trail.length) * 0.35; ctx.fillStyle = "#e8ff3c"; ctx.beginPath(); ctx.arc(p.x, p.y, R * (i / trail.length) * 0.9, 0, 7); ctx.fill(); }
      ctx.globalAlpha = 1;
      // Sjena na tlu.
      ctx.fillStyle = "rgba(0,0,0,0.18)"; ctx.beginPath(); ctx.ellipse(ball.x, H - GROUND - 2, R * 0.9, 3, 0, 0, 7); ctx.fill();
      ctx.save(); ctx.translate(ball.x, ball.y); ctx.rotate(Math.max(-0.5, Math.min(0.9, ball.vy * 0.06)));
      ctx.shadowColor = "rgba(255,255,255,0.4)"; ctx.shadowBlur = 8;
      ctx.beginPath(); ctx.arc(0, 0, R, 0, 7); ctx.fillStyle = "#fff"; ctx.fill(); ctx.shadowBlur = 0;
      ctx.lineWidth = 2; ctx.strokeStyle = "#0c0c0c"; ctx.stroke();
      ctx.fillStyle = "#121212"; ctx.beginPath(); for (let i = 0; i < 5; i++) { const a = (i / 5) * 7 - 1.57, r = R * 0.34; const x = Math.cos(a) * r, y = Math.sin(a) * r; i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y); } ctx.closePath(); ctx.fill();
      ctx.restore();
    }

    function draw() {
      const time = performance.now() / 1000;
      ctx.clearRect(0, 0, W, H);
      ctx.save();
      const sx = shake > 0 ? (Math.random() - 0.5) * shake : 0, sy = shake > 0 ? (Math.random() - 0.5) * shake : 0;
      ctx.translate(sx, sy);

      drawBackground(time);
      const g = gap();
      for (const p of pipes) drawPipe(p, g);

      // Tlo.
      const gg = ctx.createLinearGradient(0, H - GROUND, 0, H); gg.addColorStop(0, "#2f8a37"); gg.addColorStop(1, "#37a041");
      ctx.fillStyle = gg; ctx.fillRect(0, H - GROUND, W, GROUND);
      ctx.fillStyle = "rgba(255,255,255,0.10)"; const off = (frame * speed()) % 40; for (let x = -off; x < W; x += 40) ctx.fillRect(x, H - GROUND, 20, 4);
      ctx.fillStyle = "rgba(255,255,255,0.4)"; ctx.fillRect(0, H - GROUND, W, 2);

      for (const p of parts) { ctx.globalAlpha = Math.max(0, 1 - p.life / p.max); ctx.fillStyle = p.c; ctx.fillRect(p.x, p.y, p.sz, p.sz); }
      ctx.globalAlpha = 1;

      drawBall();

      if (state === "play") {
        const sc = 1 + pop * 0.4;
        ctx.save(); ctx.translate(W / 2, 34); ctx.scale(sc, sc);
        ctx.fillStyle = "#fff"; ctx.font = "800 34px Arial"; ctx.textAlign = "center"; ctx.textBaseline = "middle";
        ctx.shadowColor = "rgba(0,0,0,0.5)"; ctx.shadowBlur = 6; ctx.fillText(String(score), 0, 0); ctx.restore(); ctx.shadowBlur = 0;
        if (tierCode) { ctx.fillStyle = "#e8ff3c"; ctx.font = "700 11px Arial"; ctx.textAlign = "center"; ctx.textBaseline = "top"; ctx.fillText("NAGRADA OTKLJUČANA", W / 2, 58); }
        ctx.textBaseline = "alphabetic";
      }
      ctx.restore();
      if (flash > 0) { ctx.fillStyle = "rgba(255,77,109," + (flash * 0.4) + ")"; ctx.fillRect(0, 0, W, H); }
    }

    function update() {
      ball.vy += 0.46; ball.y += ball.vy;
      trail.push({ x: ball.x, y: ball.y }); if (trail.length > 8) trail.shift();
      const sp = speed();
      for (const p of pipes) p.x -= sp;
      if (pipes.length && pipes[pipes.length - 1].x < W - spacing()) spawn();
      pipes = pipes.filter((p) => p.x + PW > -10);
      const g = gap();
      for (const p of pipes) {
        if (!p.passed && p.x + PW < ball.x) { p.passed = true; score++; pop = 1; sScore(); burst(ball.x, ball.y); const r = rewardFor(score); if (r && r.code !== tierCode) { tierCode = r.code; buzz(40); } }
        if (ball.x + R > p.x && ball.x - R < p.x + PW && (ball.y - R < p.gy - g / 2 || ball.y + R > p.gy + g / 2)) { gameOver(); return; }
      }
      if (ball.y + R > H - GROUND || ball.y - R < 0) { ball.y = Math.max(R, ball.y); gameOver(); }
    }

    function frameLoop() {
      shake = Math.max(0, shake - 0.6); flash = Math.max(0, flash - 0.05); pop = Math.max(0, pop - 0.08);
      for (let i = parts.length - 1; i >= 0; i--) { const p = parts[i]; p.life += 0.016; p.vy += 0.1; p.x += p.vx; p.y += p.vy; if (p.life >= p.max) parts.splice(i, 1); }
      if (state === "play") { frame++; update(); }
      draw();
      raf = requestAnimationFrame(frameLoop);
    }

    spawn(); raf = requestAnimationFrame(frameLoop);
    return () => { cancelAnimationFrame(raf); window.removeEventListener("keydown", onKey); };
  }, []);

  return <div ref={rootRef} dangerouslySetInnerHTML={{ __html: STAGE_HTML }} />;
}
