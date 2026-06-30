"use client";

import { useEffect, useRef } from "react";

import { PROMO_STORAGE_KEY } from "@/components/site/promo-capture";

const STAGE_HTML = `
<style>
.rn-btn{transition:transform .08s ease}
.rn-btn:active{transform:scale(0.97)}
</style>
<div style="display:flex;justify-content:center;">
  <div style="width:100%;max-width:400px;background:#0b0b0b;border-radius:22px;overflow:hidden;border:1px solid rgba(255,255,255,0.12);font-family:inherit;box-shadow:0 18px 50px rgba(0,0,0,0.5);">
    <div style="display:flex;align-items:center;justify-content:space-between;padding:13px 18px;background:#000;">
      <span style="font-weight:700;letter-spacing:1px;color:#fff;font-size:20px;">SUPER&nbsp;DRES<span style="color:#e8ff3c;">IFY</span></span>
      <span style="display:flex;align-items:center;gap:10px;font-size:11px;color:rgba(255,255,255,0.6);">REKORD <b id="rn_best" style="color:#fff;font-size:14px;">0</b>
        <button id="rn_mute" aria-label="Zvuk" style="background:none;border:none;color:rgba(255,255,255,0.55);cursor:pointer;font-size:15px;padding:0;line-height:1;">&#9834;</button>
      </span>
    </div>

    <div id="rn_stage" style="position:relative;width:100%;aspect-ratio:360/480;overflow:hidden;background:#0e1a12;cursor:pointer;touch-action:none;">
      <canvas id="rn_canvas" style="display:block;width:100%;height:100%;"></canvas>

      <div id="rn_intro" style="position:absolute;inset:0;background:rgba(7,7,7,0.74);display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;z-index:8;padding:20px;">
        <div style="font-size:13px;letter-spacing:3px;color:#e8ff3c;font-weight:700;margin-bottom:6px;">SUPER DRESIFY</div>
        <div style="font-size:22px;font-weight:800;color:#fff;line-height:1.1;margin-bottom:10px;">Trči, skači, skupljaj dresove</div>
        <div style="font-size:13px;color:rgba(255,255,255,0.7);margin-bottom:18px;max-width:270px;">Tapni za skok (dvaput za dvostruki skok). Skupljaj dresove, preskači čunjeve. <b style="color:#e8ff3c;">8&rarr;besplatna dostava</b>, 15&rarr;-15%, 25&rarr;-20%.</div>
        <button id="rn_start" class="rn-btn" style="padding:14px 34px;border:none;border-radius:12px;background:#e8ff3c;color:#0b0b0b;font-size:15px;font-weight:800;cursor:pointer;">START &#127939;</button>
      </div>

      <div id="rn_over" style="position:absolute;inset:0;background:rgba(7,7,7,0.82);display:none;flex-direction:column;align-items:center;justify-content:center;text-align:center;z-index:8;padding:20px;"></div>
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
    const sCollect = () => tone(880, 0.09, "sine", 0.18);
    const sHit = () => tone(110, 0.3, "sawtooth", 0.2);
    const buzz = (ms: number | number[]) => { try { (navigator as any).vibrate && navigator.vibrate(ms); } catch {} };

    const GROUND = H - 44;          // y of the ground line
    const PW = 24, PH = 34;          // player width/height
    const GRAV = 0.72, JUMP = -11.5;

    type Ent = { type: "cone" | "jersey"; x: number; y: number; done?: boolean };
    let player = { y: GROUND, vy: 0, jumps: 0 };
    let ents: Ent[] = [];
    let score = 0, frame = 0, speed = 3.2, distAcc = 0, nextGap = 200, tier = "", grounded = true;
    let state: "idle" | "play" | "over" = "idle", raf = 0;

    function rewardFor(s: number) {
      return s >= 25 ? { code: "GOL20", label: "-20% + besplatna dostava (od 100€)" }
        : s >= 15 ? { code: "GOL15", label: "-15% + besplatna dostava (od 80€)" }
        : s >= 8 ? { code: "DOSTAVA", label: "besplatnu dostavu (od 40€)" } : null;
    }
    const nextAt = (s: number) => s < 8 ? 8 : s < 15 ? 15 : s < 25 ? 25 : null;
    const nextLabel = (s: number) => s < 8 ? "besplatnu dostavu (od 40€)" : s < 15 ? "-15% + dostava (od 80€)" : "-20% + dostava (od 100€)";

    function reset() {
      player = { y: GROUND, vy: 0, jumps: 0 };
      ents = []; score = 0; frame = 0; speed = 3.2; distAcc = 0; nextGap = 200; tier = ""; grounded = true;
    }

    function jump() {
      if (state !== "play") return;
      if (player.jumps < 2) { player.vy = JUMP; player.jumps++; grounded = false; sJump(); }
    }

    function spawnOne() {
      if (Math.random() < 0.42) {
        ents.push({ type: "cone", x: W + 24, y: GROUND });
      } else {
        ents.push({ type: "jersey", x: W + 24, y: GROUND - (28 + Math.random() * 80) });
      }
    }
    function computeGap() {
      const base = Math.max(165, 250 - score * 3);
      return base + Math.random() * 70;
    }

    function roundRect(x: number, y: number, w: number, h: number, r: number) {
      if (typeof ctx.roundRect === "function") { ctx.beginPath(); ctx.roundRect(x, y, w, h, r); }
      else { ctx.beginPath(); ctx.rect(x, y, w, h); }
    }

    const PX = 58; // fixed player x

    function draw() {
      // sky / pitch
      const sky = ctx.createLinearGradient(0, 0, 0, H);
      sky.addColorStop(0, "#0e1a12"); sky.addColorStop(1, "#163a20");
      ctx.fillStyle = sky; ctx.fillRect(0, 0, W, H);
      ctx.fillStyle = "rgba(232,255,60,0.05)"; ctx.font = "700 26px Arial"; ctx.textAlign = "center"; ctx.fillText("DRESIFY", W / 2, 70);

      // ground with moving stripes
      ctx.fillStyle = "#2f8a37"; ctx.fillRect(0, GROUND, W, H - GROUND);
      ctx.fillStyle = "rgba(255,255,255,0.10)";
      const off = (frame * speed) % 40;
      for (let x = -off; x < W; x += 40) ctx.fillRect(x, GROUND, 20, 4);

      // entities
      for (const e of ents) {
        if (e.type === "cone") {
          const cw = 22, ch = 26, bx = e.x, by = GROUND;
          ctx.fillStyle = "#ff7a1a";
          ctx.beginPath(); ctx.moveTo(bx, by); ctx.lineTo(bx + cw, by); ctx.lineTo(bx + cw / 2, by - ch); ctx.closePath(); ctx.fill();
          ctx.fillStyle = "#fff"; ctx.fillRect(bx + 4, by - ch * 0.55, cw - 8, 3);
        } else {
          ctx.font = "24px Arial"; ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.fillText("👕", e.x + 12, e.y);
        }
      }

      // player
      const feet = player.y;
      const bodyTop = feet - PH;
      // legs (run animation when grounded)
      ctx.strokeStyle = "#0b0b0b"; ctx.lineWidth = 4; (ctx as any).lineCap = "round";
      const ph = grounded ? Math.sin(frame * 0.5) : 0.7;
      ctx.beginPath();
      ctx.moveTo(PX + 8, feet - 8); ctx.lineTo(PX + 8 - ph * 6, feet);
      ctx.moveTo(PX + 16, feet - 8); ctx.lineTo(PX + 16 + ph * 6, feet);
      ctx.stroke();
      // body (lime jersey)
      ctx.fillStyle = "#e8ff3c"; roundRect(PX, bodyTop + 8, PW, PH - 16, 5); ctx.fill();
      ctx.fillStyle = "#0b0b0b"; ctx.font = "800 10px Arial"; ctx.textAlign = "center"; ctx.textBaseline = "middle";
      ctx.fillText("10", PX + PW / 2, bodyTop + 8 + (PH - 16) / 2);
      // head
      ctx.fillStyle = "#f1c27d"; ctx.beginPath(); ctx.arc(PX + PW / 2, bodyTop + 4, 7, 0, Math.PI * 2); ctx.fill();

      if (state === "play") {
        ctx.fillStyle = "#fff"; ctx.font = "800 30px Arial"; ctx.textAlign = "center"; ctx.textBaseline = "top";
        ctx.shadowColor = "rgba(0,0,0,0.5)"; ctx.shadowBlur = 6;
        ctx.fillText(String(score), W / 2, 14); ctx.shadowBlur = 0;
        ctx.fillStyle = "#e8ff3c"; ctx.font = "700 11px Arial"; ctx.fillText("DRESOVA", W / 2, 50);
      }
    }

    function hit(a: { x: number; y: number; w: number; h: number }, b: { x: number; y: number; w: number; h: number }) {
      return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
    }

    function update() {
      frame++;
      speed = Math.min(7.2, 3.2 + score * 0.06 + frame * 0.0009);

      // physics
      player.vy += GRAV; player.y += player.vy;
      if (player.y >= GROUND) { player.y = GROUND; player.vy = 0; player.jumps = 0; grounded = true; }
      else grounded = false;

      // spawn
      distAcc += speed;
      if (distAcc >= nextGap) { distAcc = 0; spawnOne(); nextGap = computeGap(); }

      // move + collide
      const pBox = { x: PX, y: player.y - PH, w: PW, h: PH };
      for (const e of ents) {
        e.x -= speed;
        if (e.done) continue;
        if (e.type === "cone") {
          const cBox = { x: e.x + 2, y: GROUND - 26, w: 18, h: 26 };
          if (hit(pBox, cBox)) { gameOver(); return; }
        } else {
          const dx = (e.x + 12) - (PX + PW / 2), dy = e.y - (player.y - PH / 2);
          if (Math.sqrt(dx * dx + dy * dy) < 24) { e.done = true; score++; sCollect(); const r = rewardFor(score); if (r && r.code !== tier) { tier = r.code; buzz(40); } }
        }
      }
      ents = ents.filter((e) => !e.done && e.x > -40);
    }

    function loop() {
      if (state !== "play") { draw(); return; }
      update();
      if (state !== "play") { draw(); return; }
      draw();
      raf = requestAnimationFrame(loop);
    }

    function startGame() {
      intro.style.display = "none"; over.style.display = "none";
      reset(); state = "play"; loop();
    }

    function gameOver() {
      state = "over"; sHit(); buzz(120);
      if (score > best()) localStorage.setItem(BEST_KEY, String(score));
      bestEl.textContent = String(best());
      const reward = rewardFor(score);
      const win = !!reward;
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

    // ── Controls ──────────────────────────────────────────────────────────
    startBtn.onclick = (e) => { e.stopPropagation(); startGame(); };
    stage.addEventListener("pointerdown", (e) => { if (state === "play") { e.preventDefault(); jump(); } });
    function onKey(e: KeyboardEvent) {
      const k = e.key.toLowerCase();
      if (k === " " || k === "arrowup" || k === "w") { e.preventDefault(); if (state === "play") jump(); }
    }
    window.addEventListener("keydown", onKey);

    draw();

    return () => { cancelAnimationFrame(raf); window.removeEventListener("keydown", onKey); };
  }, []);

  return <div ref={rootRef} dangerouslySetInnerHTML={{ __html: STAGE_HTML }} />;
}
