"use client";

import { useEffect, useRef } from "react";

import { PROMO_STORAGE_KEY } from "@/components/site/promo-capture";

// SUPER DRESIFY — endless runner na canvasu. Stadion pod reflektorima s
// paralaks tribinama, perspektivna trava, lebdeće platforme, dresovi za skupljanje.
// Juice: čestice, prašina pri doskoku, screen shake, bljesak, "+1" plutači.
const STAGE_HTML = `
<style>
.rn-btn{transition:transform .08s ease}
.rn-btn:active{transform:scale(0.97)}
</style>
<div style="display:flex;justify-content:center;">
  <div style="width:100%;max-width:400px;background:#05070c;border-radius:22px;overflow:hidden;border:1px solid rgba(255,255,255,0.12);font-family:inherit;box-shadow:0 18px 50px rgba(0,0,0,0.5);">
    <div style="display:flex;align-items:center;justify-content:space-between;padding:13px 18px;background:#000;">
      <span style="font-weight:700;letter-spacing:1px;color:#fff;font-size:20px;">SUPER&nbsp;DRES<span style="color:#e8ff3c;">IFY</span></span>
      <span style="display:flex;align-items:center;gap:10px;font-size:11px;color:rgba(255,255,255,0.6);">REKORD <b id="rn_best" style="color:#fff;font-size:14px;">0</b>
        <button id="rn_mute" aria-label="Zvuk" style="background:none;border:none;color:rgba(255,255,255,0.55);cursor:pointer;font-size:15px;padding:0;line-height:1;">&#9834;</button>
      </span>
    </div>

    <div id="rn_stage" style="position:relative;width:100%;aspect-ratio:360/480;overflow:hidden;background:#05070c;cursor:pointer;touch-action:none;">
      <canvas id="rn_canvas" style="display:block;width:100%;height:100%;"></canvas>

      <div id="rn_intro" style="position:absolute;inset:0;background:linear-gradient(rgba(5,7,12,0.5),rgba(5,7,12,0.8));display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;z-index:8;padding:20px;">
        <div style="font-size:13px;letter-spacing:3px;color:#e8ff3c;font-weight:700;margin-bottom:6px;">SUPER DRESIFY</div>
        <div style="font-size:22px;font-weight:800;color:#fff;line-height:1.1;margin-bottom:10px;">Trči, skači, skupljaj dresove</div>
        <div style="font-size:13px;color:rgba(255,255,255,0.7);margin-bottom:18px;max-width:270px;">Tapni za skok (dvaput = dvostruki skok). Skupljaj dresove, preskači čunjeve, penji se po platformama. <b style="color:#e8ff3c;">15&rarr;10% popusta</b>, 30&rarr;-15%, 50&rarr;-20%.</div>
        <button id="rn_start" class="rn-btn" style="padding:14px 34px;border:none;border-radius:12px;background:#e8ff3c;color:#0b0b0b;font-size:15px;font-weight:800;cursor:pointer;box-shadow:0 8px 24px rgba(232,255,60,0.25);">START &#127939;</button>
      </div>

      <div id="rn_over" style="position:absolute;inset:0;background:linear-gradient(rgba(5,7,12,0.6),rgba(5,7,12,0.86));display:none;flex-direction:column;align-items:center;justify-content:center;text-align:center;z-index:8;padding:20px;"></div>
    </div>

    <div style="padding:13px 18px 18px;">
      <p style="margin:0;text-align:center;font-size:13px;color:rgba(255,255,255,0.7);">Tapni ekran ili razmaknicu za skok &#11014;</p>
    </div>
  </div>
</div>
`;

export function RunnerGame() {
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const $ = (id: string) => root.querySelector<HTMLElement>("#" + id)!;
    const stage = $("rn_stage"), intro = $("rn_intro"), over = $("rn_over"), startBtn = $("rn_start");
    const bestEl = $("rn_best"), muteBtn = $("rn_mute");
    const canvas = root.querySelector<HTMLCanvasElement>("#rn_canvas")!;
    const ctx = canvas.getContext("2d")!;

    const W = 360, H = 480, SC = 2;
    canvas.width = W * SC; canvas.height = H * SC; ctx.scale(SC, SC);

    const BEST_KEY = "dresify_runner_best";
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
    const sJump = () => tone(520, 0.12, "square", 0.14);
    const sCollect = () => { tone(880, 0.08, "sine", 0.18); tone(1320, 0.08, "sine", 0.12); };
    const sHit = () => { tone(110, 0.3, "sawtooth", 0.2); tone(70, 0.35, "square", 0.14); };
    const buzz = (ms: number | number[]) => { try { (navigator as any).vibrate && navigator.vibrate(ms); } catch {} };

    const GROUND = H - 48;
    const PW = 24, PH = 34;
    const GRAV = 0.72, JUMP = -11.5, PX = 58;

    type Ent = { type: "cone" | "jersey" | "plat"; x: number; y: number; w?: number; done?: boolean };
    let player = { y: GROUND, vy: 0, jumps: 0, rot: 0 };
    let ents: Ent[] = [];
    let score = 0, frame = 0, speed = 3.2, distAcc = 0, nextGap = 200, tier = "", grounded = true;
    let state: "idle" | "play" | "over" = "idle", raf = 0;

    // Juice.
    let shake = 0, flash = 0;
    const parts: { x: number; y: number; vx: number; vy: number; life: number; max: number; c: string; sz: number }[] = [];
    const floaters: { x: number; y: number; life: number }[] = [];
    const stars = Array.from({ length: 26 }, () => ({ x: Math.random() * W, y: Math.random() * 120, r: Math.random() * 1.1 + 0.3, p: Math.random() * 6 }));
    const crowd = Array.from({ length: 120 }, () => ({ x: Math.random() * (W + 80), y: 74 + Math.random() * 46, c: Math.random() }));

    function rewardFor(s: number) {
      return s >= 50 ? { code: "GOL20", label: "-20% + besplatna dostava (od 100€)" }
        : s >= 30 ? { code: "GOL15", label: "-15% + besplatna dostava (od 80€)" }
        : s >= 15 ? { code: "GOL10", label: "10% popusta (od 20€)" } : null;
    }
    const nextAt = (s: number) => s < 15 ? 15 : s < 30 ? 30 : s < 50 ? 50 : null;
    const nextLabel = (s: number) => s < 15 ? "10% popusta (od 20€)" : s < 30 ? "-15% + dostava (od 80€)" : "-20% + dostava (od 100€)";

    function reset() {
      player = { y: GROUND, vy: 0, jumps: 0, rot: 0 };
      ents = []; parts.length = 0; floaters.length = 0; shake = 0; flash = 0;
      score = 0; frame = 0; speed = 3.2; distAcc = 0; nextGap = 200; tier = ""; grounded = true;
    }
    function jump() {
      if (state !== "play") return;
      if (player.jumps < 2) { player.vy = JUMP; player.jumps++; grounded = false; sJump(); puff(PX + PW / 2, player.y, 4); }
    }
    function puff(x: number, y: number, n: number) {
      for (let i = 0; i < n; i++) parts.push({ x, y, vx: (Math.random() - 0.5) * 2, vy: -Math.random() * 1.2, life: 0, max: 0.4, c: "rgba(255,255,255,0.5)", sz: 2 + Math.random() * 2 });
    }
    function burst(x: number, y: number) {
      for (let i = 0; i < 12; i++) { const a = Math.random() * 7, v = 1 + Math.random() * 3; parts.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 1, life: 0, max: 0.5 + Math.random() * 0.4, c: Math.random() < 0.7 ? "#e8ff3c" : "#fff", sz: 2 + Math.random() * 2.5 }); }
    }

    function spawnOne() {
      const r = Math.random();
      if (r < 0.24) {
        ents.push({ type: "cone", x: W + 24, y: GROUND });
      } else if (r < 0.66) {
        // Platforma + dres na vrhu (češće nego prije). Ponekad stepenasto dvije.
        const pw = 58 + Math.random() * 34;
        const py = GROUND - (58 + Math.random() * 52);
        ents.push({ type: "plat", x: W + 24, y: py, w: pw });
        ents.push({ type: "jersey", x: W + 24 + pw / 2 - 12, y: py - 22 });
        if (Math.random() < 0.4) {
          const pw2 = 46 + Math.random() * 24, py2 = py - (42 + Math.random() * 20);
          ents.push({ type: "plat", x: W + 24 + pw + 40, y: py2, w: pw2 });
          ents.push({ type: "jersey", x: W + 24 + pw + 40 + pw2 / 2 - 12, y: py2 - 22 });
        }
      } else {
        // Luk dresova u zraku (nagrada za skok).
        const n = 2 + ((Math.random() * 2) | 0), baseY = GROUND - (36 + Math.random() * 70);
        for (let i = 0; i < n; i++) ents.push({ type: "jersey", x: W + 24 + i * 30, y: baseY - Math.sin((i / (n - 1 || 1)) * Math.PI) * 28 });
      }
    }
    function computeGap() { return Math.max(150, 245 - score * 3) + Math.random() * 70; }

    function roundRect(x: number, y: number, w: number, h: number, r: number) {
      if (typeof (ctx as any).roundRect === "function") { ctx.beginPath(); (ctx as any).roundRect(x, y, w, h, r); }
      else { ctx.beginPath(); ctx.rect(x, y, w, h); }
    }
    function drawJersey(cx: number, cy: number) {
      const bob = Math.sin(frame * 0.12 + cx * 0.05) * 2;
      cy += bob;
      ctx.save();
      ctx.shadowColor = "rgba(232,255,60,0.7)"; ctx.shadowBlur = 12;
      const g = ctx.createLinearGradient(0, cy - 11, 0, cy + 11);
      g.addColorStop(0, "#f4ff8a"); g.addColorStop(1, "rgba(232,255,60,0.55)");
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.moveTo(cx - 11, cy - 5); ctx.lineTo(cx - 6, cy - 9); ctx.lineTo(cx - 3, cy - 6); ctx.lineTo(cx + 3, cy - 6);
      ctx.lineTo(cx + 6, cy - 9); ctx.lineTo(cx + 11, cy - 5); ctx.lineTo(cx + 7, cy); ctx.lineTo(cx + 6, cy + 10);
      ctx.lineTo(cx - 6, cy + 10); ctx.lineTo(cx - 7, cy); ctx.closePath(); ctx.fill();
      ctx.restore();
    }

    function drawBackground() {
      // Nebo.
      const sky = ctx.createLinearGradient(0, 0, 0, GROUND);
      sky.addColorStop(0, "#0a1330"); sky.addColorStop(0.55, "#0b1020"); sky.addColorStop(1, "#0d2213");
      ctx.fillStyle = sky; ctx.fillRect(0, 0, W, GROUND);
      for (const s of stars) { const tw = 0.5 + 0.5 * Math.sin(frame * 0.05 + s.p); ctx.globalAlpha = 0.5 * tw; ctx.fillStyle = "#dfe8ff"; ctx.fillRect(s.x, s.y, s.r, s.r); }
      ctx.globalAlpha = 1;
      // Reflektori.
      for (const fx of [36, W - 36]) {
        const fg = ctx.createRadialGradient(fx, 6, 0, fx, 6, 130); fg.addColorStop(0, "rgba(255,255,225,0.16)"); fg.addColorStop(1, "rgba(255,255,225,0)");
        ctx.fillStyle = fg; ctx.fillRect(0, 0, W, GROUND);
        ctx.fillStyle = "#fffef0"; ctx.beginPath(); ctx.arc(fx, 6, 5, 0, 7); ctx.fill();
      }
      // Tribine + navijači (paralaks spor).
      ctx.fillStyle = "#0f1218"; ctx.fillRect(0, 66, W, 62);
      const coff = (frame * speed * 0.2) % 40;
      for (const p of crowd) {
        const x = ((p.x - coff) % (W + 80) + (W + 80)) % (W + 80) - 40;
        const tw = 0.6 + 0.4 * Math.sin(frame * 0.08 + p.x);
        ctx.globalAlpha = 0.4 + 0.35 * tw;
        ctx.fillStyle = p.c < 0.5 ? "#e8ff3c" : p.c < 0.72 ? "#3b82f6" : p.c < 0.86 ? "#ff4d6d" : "#cfd6e0";
        ctx.fillRect(x, p.y, 2.4, 2.4);
      }
      ctx.globalAlpha = 1;
      ctx.fillStyle = "#05060a"; ctx.fillRect(0, 128, W, 10);
      ctx.fillStyle = "rgba(232,255,60,0.45)"; ctx.font = "700 8px Arial"; ctx.textAlign = "center"; ctx.fillText("D R E S I F Y   A R E N A", W / 2, 136);
    }

    function draw() {
      ctx.clearRect(0, 0, W, H);
      ctx.save();
      const sx = shake > 0 ? (Math.random() - 0.5) * shake : 0, sy = shake > 0 ? (Math.random() - 0.5) * shake : 0;
      ctx.translate(sx, sy);

      drawBackground();

      // Trava + perspektivne pruge.
      const gg = ctx.createLinearGradient(0, GROUND, 0, H); gg.addColorStop(0, "#2f8a37"); gg.addColorStop(1, "#37a041");
      ctx.fillStyle = gg; ctx.fillRect(0, GROUND, W, H - GROUND);
      ctx.fillStyle = "rgba(255,255,255,0.10)";
      const off = (frame * speed) % 40;
      for (let x = -off; x < W; x += 40) ctx.fillRect(x, GROUND, 20, 4);
      ctx.fillStyle = "rgba(255,255,255,0.5)"; ctx.fillRect(0, GROUND - 2, W, 2);

      // Entiteti.
      for (const e of ents) {
        if (e.type === "cone") {
          const cw = 22, ch = 26, bx = e.x, by = GROUND;
          ctx.fillStyle = "rgba(0,0,0,0.25)"; ctx.beginPath(); ctx.ellipse(bx + cw / 2, by, cw / 2, 3, 0, 0, 7); ctx.fill();
          const cg = ctx.createLinearGradient(bx, by - ch, bx, by); cg.addColorStop(0, "#ff9a3c"); cg.addColorStop(1, "#ff6a12");
          ctx.fillStyle = cg; ctx.beginPath(); ctx.moveTo(bx, by); ctx.lineTo(bx + cw, by); ctx.lineTo(bx + cw / 2, by - ch); ctx.closePath(); ctx.fill();
          ctx.fillStyle = "#fff"; ctx.fillRect(bx + 4, by - ch * 0.55, cw - 8, 3);
        } else if (e.type === "plat") {
          const pw = e.w || 60;
          ctx.fillStyle = "rgba(0,0,0,0.3)"; roundRect(e.x + 2, e.y + 3, pw, 12, 4); ctx.fill();
          ctx.fillStyle = "#123a1d"; roundRect(e.x, e.y, pw, 12, 4); ctx.fill();
          ctx.fillStyle = "#37a041"; roundRect(e.x, e.y, pw, 5, 3); ctx.fill();
          ctx.fillStyle = "#e8ff3c"; ctx.fillRect(e.x + 4, e.y + 1, pw - 8, 1.5);
        } else {
          drawJersey(e.x + 12, e.y);
        }
      }

      // Čestice (iza igrača).
      for (const p of parts) { ctx.globalAlpha = Math.max(0, 1 - p.life / p.max); ctx.fillStyle = p.c; ctx.fillRect(p.x, p.y, p.sz, p.sz); }
      ctx.globalAlpha = 1;

      // Igrač.
      const feet = player.y, bodyTop = feet - PH;
      ctx.save(); ctx.translate(PX + PW / 2, bodyTop + PH / 2); ctx.rotate(player.rot); ctx.translate(-(PX + PW / 2), -(bodyTop + PH / 2));
      ctx.fillStyle = "rgba(0,0,0,0.22)"; ctx.beginPath(); ctx.ellipse(PX + PW / 2, GROUND, 14, 3.5, 0, 0, 7); ctx.fill();
      ctx.strokeStyle = "#0b0b0b"; ctx.lineWidth = 4; (ctx as any).lineCap = "round";
      const ph = grounded ? Math.sin(frame * 0.5) : 0.7;
      ctx.beginPath(); ctx.moveTo(PX + 8, feet - 8); ctx.lineTo(PX + 8 - ph * 6, feet); ctx.moveTo(PX + 16, feet - 8); ctx.lineTo(PX + 16 + ph * 6, feet); ctx.stroke();
      const bgd = ctx.createLinearGradient(0, bodyTop, 0, feet); bgd.addColorStop(0, "#f4ff8a"); bgd.addColorStop(1, "#e8ff3c");
      ctx.fillStyle = bgd; roundRect(PX, bodyTop + 8, PW, PH - 16, 5); ctx.fill();
      ctx.fillStyle = "#0b0b0b"; ctx.font = "800 10px Arial"; ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.fillText("10", PX + PW / 2, bodyTop + 8 + (PH - 16) / 2);
      ctx.fillStyle = "#f1c27d"; ctx.beginPath(); ctx.arc(PX + PW / 2, bodyTop + 4, 7, 0, 7); ctx.fill();
      ctx.fillStyle = "#2a1c10"; ctx.beginPath(); ctx.arc(PX + PW / 2, bodyTop + 2, 7, Math.PI, 0); ctx.fill();
      ctx.restore();
      ctx.textBaseline = "alphabetic";

      // "+1" plutači.
      for (const f of floaters) { ctx.globalAlpha = Math.max(0, 1 - f.life / 0.7); ctx.fillStyle = "#e8ff3c"; ctx.font = "800 14px Arial"; ctx.textAlign = "center"; ctx.fillText("+1", f.x, f.y); }
      ctx.globalAlpha = 1;

      // HUD rezultat.
      if (state === "play") {
        ctx.fillStyle = "#fff"; ctx.font = "800 30px Arial"; ctx.textAlign = "center"; ctx.textBaseline = "top";
        ctx.shadowColor = "rgba(0,0,0,0.5)"; ctx.shadowBlur = 6; ctx.fillText(String(score), W / 2, 12); ctx.shadowBlur = 0;
        ctx.fillStyle = "#e8ff3c"; ctx.font = "700 11px Arial"; ctx.fillText("DRESOVA", W / 2, 46);
        ctx.textBaseline = "alphabetic";
      }

      ctx.restore();
      if (flash > 0) { ctx.fillStyle = "rgba(255,77,109," + (flash * 0.4) + ")"; ctx.fillRect(0, 0, W, H); }
    }

    function hit(a: { x: number; y: number; w: number; h: number }, b: { x: number; y: number; w: number; h: number }) {
      return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
    }

    function update() {
      frame++;
      speed = Math.min(7.4, 3.2 + score * 0.06 + frame * 0.0009);
      shake = Math.max(0, shake - 0.6);
      flash = Math.max(0, flash - 0.04);
      for (let i = parts.length - 1; i >= 0; i--) { const p = parts[i]; p.life += 0.016; p.vy += 0.25; p.x += p.vx; p.y += p.vy; if (p.life >= p.max) parts.splice(i, 1); }
      for (let i = floaters.length - 1; i >= 0; i--) { const f = floaters[i]; f.life += 0.016; f.y -= 1; if (f.life >= 0.7) floaters.splice(i, 1); }

      for (const e of ents) e.x -= speed;
      distAcc += speed;
      if (distAcc >= nextGap) { distAcc = 0; spawnOne(); nextGap = computeGap(); }

      const prevFeet = player.y;
      const wasAir = !grounded;
      player.vy += GRAV; player.y += player.vy;
      player.rot = Math.max(-0.4, Math.min(0.4, player.vy * 0.02));
      let support = player.y >= GROUND ? GROUND : Infinity;
      if (player.vy >= 0) {
        for (const e of ents) {
          if (e.type !== "plat") continue;
          const pw = e.w || 60;
          if (PX + PW > e.x && PX < e.x + pw && prevFeet <= e.y + 1 && player.y >= e.y && e.y < support) support = e.y;
        }
      }
      if (support !== Infinity) { if (wasAir) puff(PX + PW / 2, support, 5); player.y = support; player.vy = 0; player.jumps = 0; grounded = true; }
      else grounded = false;

      const pBox = { x: PX, y: player.y - PH, w: PW, h: PH };
      for (const e of ents) {
        if (e.done) continue;
        if (e.type === "cone") {
          const cBox = { x: e.x + 3, y: GROUND - 24, w: 16, h: 24 };
          if (hit(pBox, cBox)) { gameOver(); return; }
        } else if (e.type === "jersey") {
          const dx = (e.x + 12) - (PX + PW / 2), dy = e.y - (player.y - PH / 2);
          if (Math.sqrt(dx * dx + dy * dy) < 24) {
            e.done = true; score++; sCollect(); burst(e.x + 12, e.y); floaters.push({ x: e.x + 12, y: e.y - 6, life: 0 });
            const rw = rewardFor(score); if (rw && rw.code !== tier) { tier = rw.code; buzz(40); flash = 0; shake = 4; }
          }
        }
      }
      ents = ents.filter((e) => !e.done && e.x > -140);
    }

    function loop() {
      if (state !== "play") { draw(); return; }
      update();
      if (state !== "play") { draw(); return; }
      draw();
      raf = requestAnimationFrame(loop);
    }

    function startGame() { intro.style.display = "none"; over.style.display = "none"; reset(); state = "play"; loop(); }

    function gameOver() {
      state = "over"; sHit(); buzz(120); shake = 14; flash = 1;
      if (score > best()) localStorage.setItem(BEST_KEY, String(score));
      bestEl.textContent = String(best());
      const reward = rewardFor(score); const win = !!reward;
      let h = '<div style="font-size:13px;letter-spacing:2px;color:' + (win ? "#e8ff3c" : "rgba(255,255,255,0.6)") + ';font-weight:700;margin-bottom:4px;">' + (win ? "BRAVO!" : "KRAJ IGRE") + '</div>'
        + '<div style="font-size:30px;font-weight:800;color:#fff;line-height:1;margin-bottom:2px;">' + score + '</div>'
        + '<div style="font-size:11px;color:rgba(255,255,255,0.45);margin-bottom:14px;">skupljenih dresova &middot; rekord ' + best() + '</div>';
      if (reward) {
        h += '<div style="font-size:13px;color:rgba(255,255,255,0.75);margin-bottom:14px;">Osvojio si <b style="color:#e8ff3c;font-size:18px;">' + reward.label + '</b>!</div>'
          + '<button id="rn_shop" class="rn-btn" style="width:220px;padding:14px 0;border:none;border-radius:12px;background:#e8ff3c;color:#0b0b0b;font-size:14px;font-weight:800;cursor:pointer;">ISKORISTI NAGRADU &rarr;</button>'
          + '<button id="rn_again" class="rn-btn" style="width:220px;margin-top:8px;padding:10px 0;border:1px solid rgba(255,255,255,0.2);border-radius:12px;background:transparent;color:#fff;font-size:13px;cursor:pointer;">Igraj ponovno</button>'
          + '<div style="margin-top:10px;font-size:10px;color:rgba(255,255,255,0.35);">Nagrada se sama primijeni na blagajni</div>';
      } else {
        h += '<div style="font-size:12px;color:rgba(255,255,255,0.6);margin-bottom:12px;">Skupi <b style="color:#e8ff3c;">' + nextAt(score) + '</b> dresova za <b style="color:#e8ff3c;">' + nextLabel(score) + '</b>!</div>'
          + '<button id="rn_again" class="rn-btn" style="width:220px;padding:13px 0;border:none;border-radius:12px;background:#e8ff3c;color:#0b0b0b;font-size:14px;font-weight:800;cursor:pointer;">Igraj ponovno</button>';
      }
      over.innerHTML = h; over.style.display = "flex";
      const shopEl = root!.querySelector<HTMLElement>("#rn_shop");
      if (shopEl && reward) shopEl.onclick = () => { try { localStorage.setItem(PROMO_STORAGE_KEY, reward.code); } catch {} window.location.href = "/dresovi"; };
      const againEl = root!.querySelector<HTMLElement>("#rn_again");
      if (againEl) againEl.onclick = () => startGame();
    }

    startBtn.onclick = (e) => { e.stopPropagation(); startGame(); };
    stage.addEventListener("pointerdown", (e) => { if (state === "play") { e.preventDefault(); jump(); } });
    function onKey(e: KeyboardEvent) { const k = e.key.toLowerCase(); if (k === " " || k === "arrowup" || k === "w") { e.preventDefault(); if (state === "play") jump(); } }
    window.addEventListener("keydown", onKey);

    draw();
    return () => { cancelAnimationFrame(raf); window.removeEventListener("keydown", onKey); };
  }, []);

  return <div ref={rootRef} dangerouslySetInnerHTML={{ __html: STAGE_HTML }} />;
}
