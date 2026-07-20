"use client";

import { useEffect, useRef } from "react";

import { PROMO_STORAGE_KEY } from "@/components/site/promo-capture";

// DRESIFY Snajper — shooting gallery. Dresovi klize na trakama, tapni/klikni da
// gađaš. 40 s, što više pogodaka veća nagrada. Zlatni dres = 3 boda.
// Juice: muzzle flash, tracer, čestice, kombo, screen shake — stadion pod reflektorima.
const STAGE_HTML = `
<style>
.sh-btn{transition:transform .08s ease}
.sh-btn:active{transform:scale(0.97)}
</style>
<div style="display:flex;justify-content:center;">
  <div style="width:100%;max-width:400px;background:#05070c;border-radius:22px;overflow:hidden;border:1px solid rgba(255,255,255,0.12);font-family:inherit;box-shadow:0 18px 50px rgba(0,0,0,0.5);">
    <div style="display:flex;align-items:center;justify-content:space-between;padding:13px 18px;background:#000;">
      <span style="font-weight:700;letter-spacing:1px;color:#fff;font-size:20px;">DRES<span style="color:#e8ff3c;">IFY</span></span>
      <span style="font-size:11px;color:#e8ff3c;font-weight:700;letter-spacing:2px;text-transform:uppercase;">Snajper</span>
    </div>
    <div style="display:flex;justify-content:space-between;align-items:center;padding:9px 18px;font-size:12px;color:rgba(255,255,255,0.6);background:#0d0d10;">
      <span>VRIJEME <b id="sh_time" style="color:#fff;font-size:15px;">40</b>s</span>
      <span>POGOCI <b id="sh_score" style="color:#e8ff3c;font-size:15px;">0</b></span>
      <span style="display:flex;align-items:center;gap:10px;">REKORD <b id="sh_best" style="color:#fff;font-size:14px;">0</b>
        <button id="sh_mute" aria-label="Zvuk" style="background:none;border:none;color:rgba(255,255,255,0.55);cursor:pointer;font-size:15px;padding:0;line-height:1;">&#9834;</button>
      </span>
    </div>

    <div id="sh_stage" style="position:relative;width:100%;aspect-ratio:360/480;overflow:hidden;background:#05070c;cursor:crosshair;touch-action:none;">
      <canvas id="sh_canvas" style="display:block;width:100%;height:100%;"></canvas>
      <div style="position:absolute;top:2.5%;left:0;right:0;text-align:center;font-size:9px;letter-spacing:6px;color:rgba(232,255,60,0.5);font-weight:700;pointer-events:none;z-index:2;">D R E S I F Y &nbsp; A R E N A</div>

      <div id="sh_intro" style="position:absolute;inset:0;background:linear-gradient(rgba(5,7,12,0.5),rgba(5,7,12,0.82));display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;z-index:8;padding:20px;">
        <div style="font-size:13px;letter-spacing:3px;color:#e8ff3c;font-weight:700;margin-bottom:6px;">DRESIFY SNAJPER</div>
        <div style="font-size:22px;font-weight:800;color:#fff;line-height:1.1;margin-bottom:10px;">Gađaj dresove na traci</div>
        <div style="font-size:13px;color:rgba(255,255,255,0.7);margin-bottom:18px;max-width:270px;">Tapni na dres da pogodiš. Imaš 40 s! Zlatni dres = 3 boda. <b style="color:#e8ff3c;">25&rarr;10% popusta</b>, 40&rarr;-15%, 60&rarr;-20%.</div>
        <button id="sh_start" class="sh-btn" style="padding:14px 34px;border:none;border-radius:12px;background:#e8ff3c;color:#0b0b0b;font-size:15px;font-weight:800;cursor:pointer;box-shadow:0 8px 24px rgba(232,255,60,0.25);">START &#127919;</button>
      </div>

      <div id="sh_over" style="position:absolute;inset:0;background:linear-gradient(rgba(5,7,12,0.6),rgba(5,7,12,0.86));display:none;flex-direction:column;align-items:center;justify-content:center;text-align:center;z-index:8;padding:20px;"></div>
    </div>

    <div style="padding:13px 18px 18px;">
      <p style="margin:0;text-align:center;font-size:13px;color:rgba(255,255,255,0.7);">&#127919; Tapni na dres da pucaš</p>
    </div>
  </div>
</div>
`;

export function ShooterGame() {
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const $ = (id: string) => root.querySelector<HTMLElement>("#" + id)!;
    const stage = $("sh_stage"), intro = $("sh_intro"), over = $("sh_over"), startBtn = $("sh_start");
    const scoreEl = $("sh_score"), timeEl = $("sh_time"), bestEl = $("sh_best"), muteBtn = $("sh_mute");
    const canvas = root.querySelector<HTMLCanvasElement>("#sh_canvas")!;
    const ctx = canvas.getContext("2d")!;

    const W = 360, H = 480, SC = 2;
    canvas.width = W * SC; canvas.height = H * SC; ctx.scale(SC, SC);

    const BEST_KEY = "dresify_shooter_best";
    const best = () => Number(localStorage.getItem(BEST_KEY) || 0);
    bestEl.textContent = String(best());

    let muted = false;
    muteBtn.onclick = (e) => { e.stopPropagation(); muted = !muted; muteBtn.innerHTML = muted ? "&#128263;" : "&#9834;"; };
    let actx: AudioContext | null = null;
    function tone(freq: number, dur: number, type: OscillatorType, vol: number, delay = 0) {
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
    const sShot = () => { tone(180, 0.08, "square", 0.16); tone(90, 0.12, "sawtooth", 0.12); };
    const sHit = () => { tone(880, 0.09, "sine", 0.18); tone(1320, 0.08, "sine", 0.1); };
    const sGold = () => { [660, 880, 1180].forEach((f, i) => tone(f, 0.12, "sine", 0.16, i * 0.05)); };
    const sMiss = () => tone(140, 0.1, "sawtooth", 0.08);
    const sEnd = () => { [523, 659, 784].forEach((f, i) => tone(f, 0.18, "sine", 0.18, i * 0.09)); };
    const buzz = (ms: number | number[]) => { try { (navigator as any).vibrate && navigator.vibrate(ms); } catch {} };

    // Trake (lanes) na terenu.
    const LANES = [188, 258, 328];
    type Target = { x: number; y: number; dir: number; speed: number; golden: boolean; dead: boolean; hitAnim: number };
    let targets: Target[] = [];
    let score = 0, timeLeft = 40, combo = 0, comboTimer = 0, elapsed = 0;
    let state: "idle" | "play" | "over" = "idle", raf = 0, last = 0, spawnAcc = 0;
    let shake = 0, gunRecoil = 0, muzzle = 0, tierCode = "";
    const crosshair = { x: W / 2, y: H / 2 };
    const tracers: { x1: number; y1: number; x2: number; y2: number; life: number }[] = [];
    const parts: { x: number; y: number; vx: number; vy: number; life: number; max: number; c: string; sz: number }[] = [];
    const floaters: { x: number; y: number; life: number; text: string; c: string }[] = [];
    const stars = Array.from({ length: 22 }, () => ({ x: Math.random() * W, y: Math.random() * 120, r: Math.random() * 1.1 + 0.3, p: Math.random() * 6 }));
    const crowd = Array.from({ length: 100 }, () => ({ x: Math.random() * W, y: 56 + Math.random() * 40, c: Math.random() }));

    function rewardFor(s: number) {
      return s >= 60 ? { code: "GOL20", label: "-20% + besplatna dostava (od 100€)" }
        : s >= 40 ? { code: "GOL15", label: "-15% + besplatna dostava (od 80€)" }
        : s >= 25 ? { code: "GOL10", label: "10% popusta (od 20€)" } : null;
    }
    const nextAt = (s: number) => s < 25 ? 25 : s < 40 ? 40 : s < 60 ? 60 : null;
    const nextLabel = (s: number) => s < 25 ? "10% popusta (od 20€)" : s < 40 ? "-15% + dostava (od 80€)" : "-20% + dostava (od 100€)";

    function reset() {
      targets = []; score = 0; timeLeft = 40; combo = 0; comboTimer = 0; elapsed = 0; spawnAcc = 0; tierCode = "";
      shake = 0; gunRecoil = 0; muzzle = 0; tracers.length = 0; parts.length = 0; floaters.length = 0;
      scoreEl.textContent = "0"; timeEl.textContent = "40";
    }
    function spawn() {
      const lane = LANES[(Math.random() * LANES.length) | 0];
      const dir = Math.random() < 0.5 ? 1 : -1;
      const baseSpeed = 55 + elapsed * 2.2; // px/s, raste s vremenom
      const speed = baseSpeed * (0.8 + Math.random() * 0.5);
      const golden = Math.random() < 0.14;
      targets.push({ x: dir === 1 ? -26 : W + 26, y: lane, dir, speed, golden, dead: false, hitAnim: 0 });
    }
    function spawnInterval() { return Math.max(0.42, 1.0 - elapsed * 0.02); } // sve češće

    function burst(x: number, y: number, cols: string[], n: number) {
      for (let i = 0; i < n; i++) { const a = Math.random() * 7, v = 40 + Math.random() * 120; parts.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 30, life: 0, max: 0.5 + Math.random() * 0.4, c: cols[(Math.random() * cols.length) | 0], sz: 2 + Math.random() * 3 }); }
    }

    function shoot(px: number, py: number) {
      if (state !== "play") return;
      sShot(); buzz(12); gunRecoil = 1; muzzle = 1; shake = Math.max(shake, 3);
      tracers.push({ x1: W / 2, y1: H - 6, x2: px, y2: py, life: 1 });
      // Pogodi najbliži živi dres unutar radijusa.
      let hit: Target | null = null, bestD = 26 * 26;
      for (const t of targets) { if (t.dead) continue; const dx = t.x - px, dy = t.y - py; const d = dx * dx + dy * dy; if (d < bestD) { bestD = d; hit = t; } }
      if (hit) {
        hit.dead = true; hit.hitAnim = 0.001;
        comboTimer = 1.6; combo++;
        const pts = hit.golden ? 3 : 1;
        const bonus = combo >= 5 ? 1 : 0; // nagrada za niz
        const gained = pts + bonus;
        score += gained;
        scoreEl.textContent = String(score);
        if (hit.golden) { sGold(); burst(hit.x, hit.y, ["#ffd23c", "#fff", "#e8ff3c"], 22); } else { sHit(); burst(hit.x, hit.y, ["#e8ff3c", "#fff"], 14); }
        floaters.push({ x: hit.x, y: hit.y - 10, life: 0, text: "+" + gained + (combo >= 5 ? "!" : ""), c: hit.golden ? "#ffd23c" : "#e8ff3c" });
        buzz(hit.golden ? [20, 30, 40] : 20);
        const r = rewardFor(score); if (r && r.code !== tierCode) { tierCode = r.code; buzz(60); }
      } else { sMiss(); combo = 0; }
    }

    // ── Scena ────────────────────────────────────────────────────────
    function drawBackground(time: number) {
      const sky = ctx.createLinearGradient(0, 0, 0, 150); sky.addColorStop(0, "#0a1330"); sky.addColorStop(0.6, "#0b1020"); sky.addColorStop(1, "#0d2213");
      ctx.fillStyle = sky; ctx.fillRect(0, 0, W, 150);
      for (const s of stars) { const tw = 0.5 + 0.5 * Math.sin(time * 2 + s.p); ctx.globalAlpha = 0.5 * tw; ctx.fillStyle = "#dfe8ff"; ctx.fillRect(s.x, s.y, s.r, s.r); }
      ctx.globalAlpha = 1;
      for (const fx of [34, W - 34]) { const fg = ctx.createRadialGradient(fx, 6, 0, fx, 6, 120); fg.addColorStop(0, "rgba(255,255,225,0.14)"); fg.addColorStop(1, "rgba(255,255,225,0)"); ctx.fillStyle = fg; ctx.fillRect(0, 0, W, 150); ctx.fillStyle = "#fffef0"; ctx.beginPath(); ctx.arc(fx, 6, 4, 0, 7); ctx.fill(); }
      ctx.fillStyle = "#0f1218"; ctx.fillRect(0, 50, W, 48);
      for (const p of crowd) { const tw = 0.6 + 0.4 * Math.sin(time * 3 + p.x); ctx.globalAlpha = 0.4 + 0.3 * tw; ctx.fillStyle = p.c < 0.5 ? "#e8ff3c" : p.c < 0.72 ? "#3b82f6" : p.c < 0.86 ? "#ff4d6d" : "#cfd6e0"; ctx.fillRect(p.x, p.y, 2.4, 2.4); }
      ctx.globalAlpha = 1;
      // Teren.
      const gg = ctx.createLinearGradient(0, 150, 0, H); gg.addColorStop(0, "#1f6b2a"); gg.addColorStop(1, "#38a344");
      ctx.fillStyle = gg; ctx.fillRect(0, 150, W, H - 150);
      // Trake (šine).
      for (const ly of LANES) {
        ctx.fillStyle = "rgba(0,0,0,0.22)"; ctx.fillRect(0, ly + 16, W, 6);
        ctx.strokeStyle = "rgba(255,255,255,0.12)"; ctx.lineWidth = 2; ctx.setLineDash([10, 8]);
        ctx.beginPath(); ctx.moveTo(0, ly + 19); ctx.lineTo(W, ly + 19); ctx.stroke(); ctx.setLineDash([]);
      }
    }
    function drawJersey(t: Target) {
      const s = t.hitAnim > 0 ? Math.max(0, 1 - t.hitAnim * 4) : 1;
      if (s <= 0) return;
      ctx.save(); ctx.translate(t.x, t.y + Math.sin(elapsed * 4 + t.x * 0.1) * 1.5); ctx.scale(s * 1.5, s * 1.5);
      ctx.shadowColor = t.golden ? "rgba(255,210,60,0.8)" : "rgba(232,255,60,0.7)"; ctx.shadowBlur = 12;
      const g = ctx.createLinearGradient(0, -13, 0, 13);
      if (t.golden) { g.addColorStop(0, "#ffe27a"); g.addColorStop(1, "#f5b301"); } else { g.addColorStop(0, "#f4ff8a"); g.addColorStop(1, "#c9d600"); }
      ctx.fillStyle = g; ctx.beginPath();
      ctx.moveTo(-13, -6); ctx.lineTo(-7, -11); ctx.lineTo(-3, -7); ctx.lineTo(3, -7); ctx.lineTo(7, -11); ctx.lineTo(13, -6);
      ctx.lineTo(8, -1); ctx.lineTo(7, 12); ctx.lineTo(-7, 12); ctx.lineTo(-8, -1); ctx.closePath(); ctx.fill();
      ctx.shadowBlur = 0; ctx.fillStyle = "rgba(0,0,0,0.55)"; ctx.font = "800 7px Arial"; ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.fillText(t.golden ? "★" : "10", 0, 3);
      ctx.restore();
    }
    function drawGun() {
      const gy = H, gx = W / 2, rec = gunRecoil * 10;
      ctx.save(); ctx.translate(gx, gy + rec);
      // Cijev usmjerena prema crosshairu.
      const ang = Math.atan2(crosshair.y - (gy - 30), crosshair.x - gx) + Math.PI / 2;
      ctx.rotate(Math.max(-0.5, Math.min(0.5, ang)));
      ctx.fillStyle = "#15171d"; ctx.beginPath(); (ctx as any).roundRect ? (ctx as any).roundRect(-9, -54, 18, 60, 5) : ctx.rect(-9, -54, 18, 60); ctx.fill();
      ctx.fillStyle = "#0b0c10"; ctx.fillRect(-4, -60, 8, 12);
      ctx.fillStyle = "#e8ff3c"; ctx.fillRect(-9, -20, 18, 4);
      // Muzzle flash.
      if (muzzle > 0) { ctx.globalAlpha = muzzle; ctx.fillStyle = "#fff6c0"; ctx.beginPath(); ctx.arc(0, -60, 6 + muzzle * 8, 0, 7); ctx.fill(); ctx.fillStyle = "rgba(255,210,60,0.7)"; ctx.beginPath(); ctx.arc(0, -60, 3 + muzzle * 5, 0, 7); ctx.fill(); ctx.globalAlpha = 1; }
      ctx.restore();
    }
    function drawCrosshair() {
      const { x, y } = crosshair;
      ctx.strokeStyle = "rgba(232,255,60,0.9)"; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(x, y, 12, 0, 7); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(x - 18, y); ctx.lineTo(x - 6, y); ctx.moveTo(x + 6, y); ctx.lineTo(x + 18, y); ctx.moveTo(x, y - 18); ctx.lineTo(x, y - 6); ctx.moveTo(x, y + 6); ctx.lineTo(x, y + 18); ctx.stroke();
      ctx.fillStyle = "#e8ff3c"; ctx.fillRect(x - 1, y - 1, 2, 2);
    }

    function render(time: number) {
      ctx.clearRect(0, 0, W, H);
      ctx.save();
      const sx = shake > 0 ? (Math.random() - 0.5) * shake : 0, sy = shake > 0 ? (Math.random() - 0.5) * shake : 0;
      ctx.translate(sx, sy);
      drawBackground(time);
      for (const t of targets) drawJersey(t);
      // Tracers.
      for (const tr of tracers) { ctx.globalAlpha = tr.life * 0.8; ctx.strokeStyle = "#fff6c0"; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(tr.x1, tr.y1); ctx.lineTo(tr.x2, tr.y2); ctx.stroke(); }
      ctx.globalAlpha = 1;
      for (const p of parts) { ctx.globalAlpha = Math.max(0, 1 - p.life / p.max); ctx.fillStyle = p.c; ctx.fillRect(p.x, p.y, p.sz, p.sz); }
      ctx.globalAlpha = 1;
      for (const f of floaters) { ctx.globalAlpha = Math.max(0, 1 - f.life / 0.8); ctx.fillStyle = f.c; ctx.font = "800 15px Arial"; ctx.textAlign = "center"; ctx.fillText(f.text, f.x, f.y); }
      ctx.globalAlpha = 1;
      drawGun();
      if (state === "play") drawCrosshair();
      // Kombo.
      if (state === "play" && combo >= 2) { ctx.fillStyle = "#ffd23c"; ctx.font = "800 15px Arial"; ctx.textAlign = "right"; ctx.fillText("KOMBO x" + combo, W - 12, 20); }
      ctx.restore();
      if (muzzle > 0) { ctx.fillStyle = "rgba(255,246,192," + (muzzle * 0.08) + ")"; ctx.fillRect(0, 0, W, H); }
    }

    function update(dt: number) {
      shake = Math.max(0, shake - dt * 40); gunRecoil = Math.max(0, gunRecoil - dt * 6); muzzle = Math.max(0, muzzle - dt * 8);
      for (let i = tracers.length - 1; i >= 0; i--) { tracers[i].life -= dt * 6; if (tracers[i].life <= 0) tracers.splice(i, 1); }
      for (let i = parts.length - 1; i >= 0; i--) { const p = parts[i]; p.life += dt; p.vy += dt * 220; p.x += p.vx * dt; p.y += p.vy * dt; if (p.life >= p.max) parts.splice(i, 1); }
      for (let i = floaters.length - 1; i >= 0; i--) { const f = floaters[i]; f.life += dt; f.y -= dt * 34; if (f.life >= 0.8) floaters.splice(i, 1); }

      if (state !== "play") return;
      elapsed += dt;
      timeLeft -= dt; if (timeLeft <= 0) { timeLeft = 0; timeEl.textContent = "0"; return gameOver(); }
      timeEl.textContent = String(Math.ceil(timeLeft));
      if (comboTimer > 0) { comboTimer -= dt; if (comboTimer <= 0) combo = 0; }

      spawnAcc += dt; if (spawnAcc >= spawnInterval()) { spawnAcc = 0; spawn(); }
      for (const t of targets) { if (t.dead) { t.hitAnim += dt; continue; } t.x += t.dir * t.speed * dt; }
      targets = targets.filter((t) => (t.dead ? t.hitAnim < 0.4 : t.x > -40 && t.x < W + 40));
    }

    function loop(ts: number) {
      const dt = last ? Math.min(0.05, (ts - last) / 1000) : 0.016; last = ts;
      update(dt); render(ts / 1000);
      raf = requestAnimationFrame(loop);
    }

    function startGame() { intro.style.display = "none"; over.style.display = "none"; reset(); state = "play"; }

    function gameOver() {
      state = "over"; sEnd(); buzz(120); shake = 8;
      if (score > best()) localStorage.setItem(BEST_KEY, String(score));
      bestEl.textContent = String(best());
      const reward = rewardFor(score); const win = !!reward;
      let h = '<div style="font-size:13px;letter-spacing:2px;color:' + (win ? "#e8ff3c" : "rgba(255,255,255,0.6)") + ';font-weight:700;margin-bottom:4px;">' + (win ? "BRAVO!" : "ISTEKLO VRIJEME") + '</div>'
        + '<div style="font-size:30px;font-weight:800;color:#fff;line-height:1;margin-bottom:2px;">' + score + '</div>'
        + '<div style="font-size:11px;color:rgba(255,255,255,0.45);margin-bottom:14px;">pogodaka &middot; rekord ' + best() + '</div>';
      if (reward) {
        h += '<div style="font-size:13px;color:rgba(255,255,255,0.75);margin-bottom:14px;">Osvojio si <b style="color:#e8ff3c;font-size:18px;">' + reward.label + '</b>!</div>'
          + '<button id="sh_shop" class="sh-btn" style="width:220px;padding:14px 0;border:none;border-radius:12px;background:#e8ff3c;color:#0b0b0b;font-size:14px;font-weight:800;cursor:pointer;">ISKORISTI NAGRADU &rarr;</button>'
          + '<button id="sh_again" class="sh-btn" style="width:220px;margin-top:8px;padding:10px 0;border:1px solid rgba(255,255,255,0.2);border-radius:12px;background:transparent;color:#fff;font-size:13px;cursor:pointer;">Igraj ponovno</button>'
          + '<div style="margin-top:10px;font-size:10px;color:rgba(255,255,255,0.35);">Nagrada se sama primijeni na blagajni</div>';
      } else {
        h += '<div style="font-size:12px;color:rgba(255,255,255,0.6);margin-bottom:12px;">Pogodi <b style="color:#e8ff3c;">' + nextAt(score) + '</b> dresova za <b style="color:#e8ff3c;">' + nextLabel(score) + '</b>!</div>'
          + '<button id="sh_again" class="sh-btn" style="width:220px;padding:13px 0;border:none;border-radius:12px;background:#e8ff3c;color:#0b0b0b;font-size:14px;font-weight:800;cursor:pointer;">Igraj ponovno</button>';
      }
      over.innerHTML = h; over.style.display = "flex";
      const shopEl = root!.querySelector<HTMLElement>("#sh_shop");
      if (shopEl && reward) shopEl.onclick = () => { try { localStorage.setItem(PROMO_STORAGE_KEY, reward.code); } catch {} window.location.href = "/dresovi"; };
      const againEl = root!.querySelector<HTMLElement>("#sh_again");
      if (againEl) againEl.onclick = () => startGame();
    }

    function toStage(clientX: number, clientY: number) {
      const r = stage.getBoundingClientRect();
      return { x: ((clientX - r.left) / r.width) * W, y: ((clientY - r.top) / r.height) * H };
    }
    startBtn.onclick = (e) => { e.stopPropagation(); startGame(); };
    stage.addEventListener("pointermove", (e) => { const p = toStage(e.clientX, e.clientY); crosshair.x = p.x; crosshair.y = p.y; });
    stage.addEventListener("pointerdown", (e) => { if (state !== "play") return; e.preventDefault(); const p = toStage(e.clientX, e.clientY); crosshair.x = p.x; crosshair.y = p.y; shoot(p.x, p.y); });

    raf = requestAnimationFrame(loop);
    return () => { cancelAnimationFrame(raf); };
  }, []);

  return <div ref={rootRef} dangerouslySetInnerHTML={{ __html: STAGE_HTML }} />;
}
