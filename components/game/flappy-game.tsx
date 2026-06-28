"use client";

import { useEffect, useRef } from "react";

import { PROMO_STORAGE_KEY } from "@/components/site/promo-capture";

const STAGE_HTML = `
<style>
.fb-btn{transition:transform .08s ease}
.fb-btn:active{transform:scale(0.97)}
</style>
<div style="display:flex;justify-content:center;">
  <div style="width:100%;max-width:400px;background:#0b0b0b;border-radius:22px;overflow:hidden;border:1px solid rgba(255,255,255,0.12);font-family:inherit;box-shadow:0 18px 50px rgba(0,0,0,0.5);">
    <div style="display:flex;align-items:center;justify-content:space-between;padding:13px 18px;background:#000;">
      <span style="font-weight:700;letter-spacing:1px;color:#fff;font-size:20px;">DRES<span style="color:#e8ff3c;">IFY</span></span>
      <span style="font-size:11px;color:#e8ff3c;font-weight:700;letter-spacing:2px;text-transform:uppercase;">Flappy Ball</span>
    </div>
    <div style="display:flex;justify-content:space-between;align-items:center;padding:9px 18px;font-size:12px;color:rgba(255,255,255,0.6);background:#111;">
      <span>10&middot;15&middot;20 = <b style="color:#e8ff3c;">veća nagrada</b></span>
      <span style="display:flex;align-items:center;gap:10px;">REKORD <b id="fb_best" style="color:#fff;font-size:14px;">0</b>
        <button id="fb_mute" aria-label="Zvuk" style="background:none;border:none;color:rgba(255,255,255,0.55);cursor:pointer;font-size:15px;padding:0;line-height:1;">&#9834;</button>
      </span>
    </div>

    <div id="fb_stage" style="position:relative;width:100%;aspect-ratio:360/480;overflow:hidden;background:#0e1a12;cursor:pointer;touch-action:none;">
      <canvas id="fb_canvas" style="display:block;width:100%;height:100%;"></canvas>

      <div id="fb_intro" style="position:absolute;inset:0;background:rgba(7,7,7,0.74);display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;z-index:8;padding:20px;">
        <div style="font-size:13px;letter-spacing:3px;color:#e8ff3c;font-weight:700;margin-bottom:6px;">DRESIFY FLAPPY BALL</div>
        <div style="font-size:22px;font-weight:800;color:#fff;line-height:1.1;margin-bottom:10px;">Provedi loptu kroz golove</div>
        <div style="font-size:13px;color:rgba(255,255,255,0.7);margin-bottom:18px;max-width:260px;">Tapni za skok. Što dalje prođeš, veća nagrada: <b style="color:#e8ff3c;">10&rarr;besplatna dostava</b>, 15&rarr;-15%, 20&rarr;-20%. Sve teže ide!</div>
        <button id="fb_start" class="fb-btn" style="padding:14px 34px;border:none;border-radius:12px;background:#e8ff3c;color:#0b0b0b;font-size:15px;font-weight:800;cursor:pointer;">START &#9917;</button>
      </div>

      <div id="fb_over" style="position:absolute;inset:0;background:rgba(7,7,7,0.82);display:none;flex-direction:column;align-items:center;justify-content:center;text-align:center;z-index:8;padding:20px;"></div>
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
    const sScore = () => tone(880, 0.1, "sine", 0.18);
    const sHit = () => tone(120, 0.25, "sawtooth", 0.2);
    const buzz = (ms: number | number[]) => { try { (navigator as any).vibrate && navigator.vibrate(ms); } catch {} };

    const GROUND = 46, R = 15, PW = 58, GAP0 = 158, SPACE = 210;
    let ball = { x: 108, y: 210, vy: 0 };
    let pipes: { x: number; gy: number; passed: boolean }[] = [];
    let score = 0, state: "idle" | "play" | "over" = "idle", raf = 0, frame = 0, tierCode = "";

    function gap() { return score <= 20 ? Math.max(100, GAP0 - score * 3.0) : Math.max(74, 100 - (score - 20) * 3.2); }
    function speed() { return Math.min(6.2, 2.5 + score * 0.16); }
    function spacing() { return Math.max(135, SPACE - score * 3.2); }
    function rewardFor(s: number) { return s >= 20 ? { code: "GOL20", label: "-20% popusta" } : s >= 15 ? { code: "GOL15", label: "-15% popusta" } : s >= 10 ? { code: "DOSTAVA", label: "besplatnu dostavu" } : null; }
    function nextRewardLabel(s: number) { return s < 10 ? "besplatnu dostavu" : s < 15 ? "-15% popusta" : s < 20 ? "-20% popusta" : null; }
    function nextRewardAt(s: number) { return s < 10 ? 10 : s < 15 ? 15 : s < 20 ? 20 : null; }
    function spawn() { const m = 64, g = gap(); const gy = m + g / 2 + Math.random() * (H - GROUND - 2 * m - g); pipes.push({ x: W + 20, gy, passed: false }); }
    function reset() { ball = { x: 108, y: 210, vy: 0 }; pipes = []; score = 0; frame = 0; tierCode = ""; spawn(); }

    function flap() {
      if (state === "idle") { intro.style.display = "none"; state = "play"; reset(); ball.vy = -6.6; sFlap(); loop(); }
      else if (state === "play") { ball.vy = -6.6; sFlap(); }
    }

    startBtn.onclick = (e) => { e.stopPropagation(); flap(); };
    stage.addEventListener("pointerdown", () => { if (state !== "over") flap(); });
    function onKey(e: KeyboardEvent) { if (e.code === "Space" && state !== "over") { e.preventDefault(); flap(); } }
    window.addEventListener("keydown", onKey);

    function gameOver() {
      state = "over"; sHit(); buzz(120);
      if (score > best()) localStorage.setItem(BEST_KEY, String(score));
      bestEl.textContent = String(best());
      const reward = rewardFor(score);
      const win = !!reward;
      let h = '<div style="font-size:13px;letter-spacing:2px;color:' + (win ? "#e8ff3c" : "rgba(255,255,255,0.6)") + ';font-weight:700;margin-bottom:4px;">' + (win ? "POBJEDA!" : "KRAJ IGRE") + '</div>'
        + '<div style="font-size:30px;font-weight:800;color:#fff;line-height:1;margin-bottom:2px;">' + score + '</div>'
        + '<div style="font-size:11px;color:rgba(255,255,255,0.45);margin-bottom:14px;">bodova &middot; rekord ' + best() + '</div>';
      if (reward) {
        h += '<div style="font-size:13px;color:rgba(255,255,255,0.75);margin-bottom:14px;">Osvojio si <b style="color:#e8ff3c;font-size:18px;">' + reward.label + '</b>!</div>'
          + '<button id="fb_shop" class="fb-btn" style="width:220px;padding:14px 0;border:none;border-radius:12px;background:#e8ff3c;color:#0b0b0b;font-size:14px;font-weight:800;cursor:pointer;">ISKORISTI NAGRADU &rarr;</button>'
          + '<button id="fb_again" class="fb-btn" style="width:220px;margin-top:8px;padding:10px 0;border:1px solid rgba(255,255,255,0.2);border-radius:12px;background:transparent;color:#fff;font-size:13px;cursor:pointer;">Igraj ponovno</button>'
          + '<div style="margin-top:10px;font-size:10px;color:rgba(255,255,255,0.35);">Nagrada se sam primijeni na blagajni</div>';
      } else {
        h += '<div style="font-size:12px;color:rgba(255,255,255,0.6);margin-bottom:12px;">Dođi do <b style="color:#e8ff3c;">' + nextRewardAt(score) + '</b> bodova za <b style="color:#e8ff3c;">' + nextRewardLabel(score) + '</b>!</div>'
          + '<button id="fb_again" class="fb-btn" style="width:220px;padding:13px 0;border:none;border-radius:12px;background:#e8ff3c;color:#0b0b0b;font-size:14px;font-weight:800;cursor:pointer;">Igraj ponovno</button>';
      }
      over.innerHTML = h; over.style.display = "flex";
      const shopEl = root!.querySelector<HTMLElement>("#fb_shop");
      if (shopEl && reward) shopEl.onclick = (e) => { e.stopPropagation(); try { localStorage.setItem(PROMO_STORAGE_KEY, reward.code); } catch {} window.location.href = "/dresovi"; };
      const againEl = root!.querySelector<HTMLElement>("#fb_again");
      if (againEl) againEl.onclick = (e) => { e.stopPropagation(); over.style.display = "none"; state = "play"; reset(); ball.vy = -6.6; loop(); };
    }

    function drawBall() {
      ctx.save();
      ctx.translate(ball.x, ball.y);
      ctx.rotate(Math.max(-0.5, Math.min(0.9, ball.vy * 0.06)));
      ctx.beginPath(); ctx.arc(0, 0, R, 0, Math.PI * 2); ctx.fillStyle = "#fff"; ctx.fill();
      ctx.lineWidth = 2; ctx.strokeStyle = "#0c0c0c"; ctx.stroke();
      ctx.beginPath(); ctx.moveTo(-R, 0); ctx.lineTo(R, 0); ctx.strokeStyle = "rgba(0,0,0,0.08)"; ctx.stroke();
      ctx.font = "800 8px Arial"; ctx.textAlign = "center"; ctx.textBaseline = "middle";
      ctx.fillStyle = "#121212"; ctx.fillText("DRES", -4, 0);
      ctx.fillStyle = "#c9d600"; ctx.fillText("IFY", 9, 0);
      ctx.restore();
    }

    function draw() {
      const sky = ctx.createLinearGradient(0, 0, 0, H);
      sky.addColorStop(0, "#0e1a12"); sky.addColorStop(0.6, "#16482099".slice(0, 7)); sky.addColorStop(1, "#1c5a2a");
      ctx.fillStyle = "#0e1a12"; ctx.fillRect(0, 0, W, H);
      ctx.fillStyle = sky; ctx.fillRect(0, 0, W, H);
      ctx.fillStyle = "rgba(232,255,60,0.06)"; ctx.font = "700 26px Arial"; ctx.textAlign = "center"; ctx.fillText("DRESIFY", W / 2, H / 2);

      for (const p of pipes) {
        const g = gap();
        ctx.fillStyle = "#0f3d1a";
        ctx.fillRect(p.x, 0, PW, p.gy - g / 2);
        ctx.fillRect(p.x, p.gy + g / 2, PW, H - GROUND - (p.gy + g / 2));
        ctx.fillStyle = "#e8ff3c";
        ctx.fillRect(p.x - 3, p.gy - g / 2 - 12, PW + 6, 12);
        ctx.fillRect(p.x - 3, p.gy + g / 2, PW + 6, 12);
      }

      ctx.fillStyle = "#2f8a37"; ctx.fillRect(0, H - GROUND, W, GROUND);
      ctx.fillStyle = "rgba(255,255,255,0.25)"; ctx.fillRect(0, H - GROUND, W, 2);

      drawBall();

      if (state === "play") {
        ctx.fillStyle = "#fff"; ctx.font = "800 34px Arial"; ctx.textAlign = "center"; ctx.textBaseline = "top";
        ctx.shadowColor = "rgba(0,0,0,0.5)"; ctx.shadowBlur = 6;
        ctx.fillText(String(score), W / 2, 18); ctx.shadowBlur = 0;
        if (tierCode) { ctx.fillStyle = "#e8ff3c"; ctx.font = "700 11px Arial"; ctx.fillText("NAGRADA OTKLJUČANA", W / 2, 58); }
      }
    }

    function update() {
      ball.vy += 0.46; ball.y += ball.vy;
      const sp = speed();
      for (const p of pipes) p.x -= sp;
      if (pipes.length && pipes[pipes.length - 1].x < W - spacing()) spawn();
      pipes = pipes.filter((p) => p.x + PW > -10);
      const g = gap();
      for (const p of pipes) {
        if (!p.passed && p.x + PW < ball.x) { p.passed = true; score++; sScore(); const r = rewardFor(score); if (r && r.code !== tierCode) { tierCode = r.code; buzz(40); } }
        if (ball.x + R > p.x && ball.x - R < p.x + PW && (ball.y - R < p.gy - g / 2 || ball.y + R > p.gy + g / 2)) { gameOver(); return; }
      }
      if (ball.y + R > H - GROUND || ball.y - R < 0) { ball.y = Math.max(R, ball.y); gameOver(); }
    }

    function loop() {
      if (state !== "play") { draw(); return; }
      frame++; update();
      if (state !== "play") { draw(); return; }
      draw();
      raf = requestAnimationFrame(loop);
    }

    spawn(); draw();

    return () => { cancelAnimationFrame(raf); window.removeEventListener("keydown", onKey); };
  }, []);

  return <div ref={rootRef} dangerouslySetInnerHTML={{ __html: STAGE_HTML }} />;
}
