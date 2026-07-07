"use client";

import { useEffect, useRef } from "react";

import { PROMO_STORAGE_KEY } from "@/components/site/promo-capture";

// DRESIFY Uhvati dres — canvas. Stadion pod reflektorima, svijetli vektorski
// dresovi padaju, kutija ih hvata. Juice: čestice pri hvatanju, bljesak + shake
// pri promašaju, "razina" banner.
const STAGE_HTML = `
<style>
.ct-btn{transition:transform .08s ease}
.ct-btn:active{transform:scale(0.97)}
</style>
<div style="display:flex;justify-content:center;">
  <div style="width:100%;max-width:400px;background:#05070c;border-radius:22px;overflow:hidden;border:1px solid rgba(255,255,255,0.12);font-family:inherit;box-shadow:0 18px 50px rgba(0,0,0,0.5);">
    <div style="display:flex;align-items:center;justify-content:space-between;padding:13px 18px;background:#000;">
      <span style="font-weight:700;letter-spacing:1px;color:#fff;font-size:20px;">DRES<span style="color:#e8ff3c;">IFY</span></span>
      <span style="font-size:11px;color:#e8ff3c;font-weight:700;letter-spacing:2px;text-transform:uppercase;">Uhvati dres</span>
    </div>
    <div style="display:flex;justify-content:space-between;align-items:center;padding:9px 18px;font-size:12px;color:rgba(255,255,255,0.6);background:#0d0d10;">
      <span>3 razine = <b style="color:#e8ff3c;">veća nagrada</b></span>
      <span style="display:flex;align-items:center;gap:10px;">REKORD <b id="ct_best" style="color:#fff;font-size:14px;">0</b>
        <button id="ct_mute" aria-label="Zvuk" style="background:none;border:none;color:rgba(255,255,255,0.55);cursor:pointer;font-size:15px;padding:0;line-height:1;">&#9834;</button>
      </span>
    </div>

    <div id="ct_stage" style="position:relative;width:100%;aspect-ratio:360/480;overflow:hidden;background:#05070c;cursor:pointer;touch-action:none;">
      <canvas id="ct_canvas" style="display:block;width:100%;height:100%;"></canvas>
      <div style="position:absolute;top:2.5%;left:0;right:0;text-align:center;font-size:9px;letter-spacing:6px;color:rgba(232,255,60,0.5);font-weight:700;pointer-events:none;z-index:2;">D R E S I F Y &nbsp; A R E N A</div>

      <div id="ct_intro" style="position:absolute;inset:0;background:linear-gradient(rgba(5,7,12,0.5),rgba(5,7,12,0.82));display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;z-index:8;padding:20px;">
        <div style="font-size:13px;letter-spacing:3px;color:#e8ff3c;font-weight:700;margin-bottom:6px;">DRESIFY UHVATI DRES</div>
        <div style="font-size:22px;font-weight:800;color:#fff;line-height:1.1;margin-bottom:10px;">Skupi dresove u kutiju</div>
        <div style="font-size:13px;color:rgba(255,255,255,0.7);margin-bottom:18px;max-width:260px;">Pomiči kutiju i hvataj dresove. Svaka razina = 20 dresova, sve brže! <b style="color:#e8ff3c;">20&rarr;besplatna dostava</b>, 40&rarr;-15%, 60&rarr;-20%. Smiješ promašiti najviše 3!</div>
        <button id="ct_start" class="ct-btn" style="padding:14px 34px;border:none;border-radius:12px;background:#e8ff3c;color:#0b0b0b;font-size:15px;font-weight:800;cursor:pointer;box-shadow:0 8px 24px rgba(232,255,60,0.25);">START &#128230;</button>
      </div>

      <div id="ct_over" style="position:absolute;inset:0;background:linear-gradient(rgba(5,7,12,0.6),rgba(5,7,12,0.86));display:none;flex-direction:column;align-items:center;justify-content:center;text-align:center;z-index:8;padding:20px;"></div>
    </div>

    <div style="padding:13px 18px 18px;">
      <p style="margin:0;text-align:center;font-size:13px;color:rgba(255,255,255,0.7);">Pomiči prst ili strelice &#8592; &#8594;</p>
    </div>
  </div>
</div>
`;

export function CatchGame() {
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const $ = (id: string) => root.querySelector<HTMLElement>("#" + id)!;
    const stage = $("ct_stage"), intro = $("ct_intro"), over = $("ct_over"), startBtn = $("ct_start");
    const bestEl = $("ct_best"), muteBtn = $("ct_mute");
    const canvas = root.querySelector<HTMLCanvasElement>("#ct_canvas")!;
    const ctx = canvas.getContext("2d")!;

    const W = 360, H = 480, SC = 2;
    canvas.width = W * SC; canvas.height = H * SC; ctx.scale(SC, SC);

    const BEST_KEY = "dresify_catch_best";
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
    const sCatch = () => { tone(880, 0.08, "sine", 0.18); tone(1320, 0.07, "sine", 0.1); };
    const sMiss = () => tone(160, 0.18, "sawtooth", 0.18);
    const sHit = () => { tone(110, 0.28, "sawtooth", 0.2); tone(70, 0.3, "square", 0.12); };
    const buzz = (ms: number | number[]) => { try { (navigator as any).vibrate && navigator.vibrate(ms); } catch {} };

    const GROUND = 30, BOXW = 74, BOXH = 16, ITEM = 26;
    type Item = { x: number; y: number; vy: number; rot: number; done?: boolean };
    let box = { x: W / 2 };
    let items: Item[] = [];
    let score = 0, misses = 0, frame = 0, tier = "";
    let state: "idle" | "play" | "over" = "idle", raf = 0;
    let shake = 0, flash = 0, flashCol = "255,77,109", pop = 0, boxPop = 0, levelBanner = 0, curLevel = 1;
    const parts: { x: number; y: number; vx: number; vy: number; life: number; max: number; c: string; sz: number }[] = [];
    const stars = Array.from({ length: 22 }, () => ({ x: Math.random() * W, y: Math.random() * 130, r: Math.random() * 1.1 + 0.3, p: Math.random() * 6 }));
    const crowd = Array.from({ length: 100 }, () => ({ x: Math.random() * W, y: 60 + Math.random() * 44, c: Math.random() }));

    function rewardFor(s: number) {
      return s >= 60 ? { code: "GOL20", label: "-20% + besplatna dostava (od 100€)" }
        : s >= 40 ? { code: "GOL15", label: "-15% + besplatna dostava (od 80€)" }
        : s >= 20 ? { code: "DOSTAVA", label: "besplatnu dostavu (od 40€)" } : null;
    }
    const nextAt = (s: number) => s < 20 ? 20 : s < 40 ? 40 : s < 60 ? 60 : null;
    const nextLabel = (s: number) => s < 20 ? "besplatnu dostavu (od 40€)" : s < 40 ? "-15% + dostava (od 80€)" : "-20% + dostava (od 100€)";
    const level = (s: number) => Math.floor(s / 20) + 1;
    function fallSpeed() { const l = level(score); const within = score - (l - 1) * 20; const base = 1.8 + (l - 1) * 1.0; return Math.min(9, base + within * 0.03); }
    function spawnEvery() { const l = level(score); return Math.max(28, 98 - (l - 1) * 22); }

    function reset() { box = { x: W / 2 }; items = []; score = 0; misses = 0; frame = 0; tier = ""; parts.length = 0; shake = 0; flash = 0; pop = 0; boxPop = 0; levelBanner = 0; curLevel = 1; }
    function spawn() { const x = 24 + Math.random() * (W - 48); items.push({ x, y: -ITEM, vy: fallSpeed(), rot: (Math.random() - 0.5) * 0.6 }); }
    function burst(x: number, y: number, cols: string[]) { for (let i = 0; i < 12; i++) { const a = Math.random() * 7, v = 1 + Math.random() * 2.6; parts.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 1, life: 0, max: 0.5 + Math.random() * 0.4, c: cols[(Math.random() * cols.length) | 0], sz: 2 + Math.random() * 2 }); } }

    function drawJersey(cx: number, cy: number, rot: number) {
      ctx.save(); ctx.translate(cx, cy); ctx.rotate(rot);
      ctx.shadowColor = "rgba(232,255,60,0.7)"; ctx.shadowBlur = 10;
      const g = ctx.createLinearGradient(0, -13, 0, 13); g.addColorStop(0, "#f4ff8a"); g.addColorStop(1, "rgba(232,255,60,0.6)");
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.moveTo(-13, -6); ctx.lineTo(-7, -11); ctx.lineTo(-3, -7); ctx.lineTo(3, -7); ctx.lineTo(7, -11); ctx.lineTo(13, -6);
      ctx.lineTo(8, -1); ctx.lineTo(7, 12); ctx.lineTo(-7, 12); ctx.lineTo(-8, -1); ctx.closePath(); ctx.fill();
      ctx.shadowBlur = 0; ctx.fillStyle = "rgba(0,0,0,0.5)"; ctx.font = "800 7px Arial"; ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.fillText("10", 0, 3);
      ctx.restore();
    }
    function drawBox() {
      const bx = box.x, by = H - GROUND, sy = 1 + boxPop * 0.4, w = BOXW, hh = BOXH + 10;
      ctx.save(); ctx.translate(bx, by); ctx.scale(1, sy);
      ctx.fillStyle = "rgba(0,0,0,0.25)"; ctx.beginPath(); ctx.ellipse(0, hh + 2, w / 2, 4, 0, 0, 7); ctx.fill();
      // Preklopi kutije.
      ctx.fillStyle = "#c9d600"; ctx.beginPath(); ctx.moveTo(-w / 2, 0); ctx.lineTo(-w / 2 - 8, -12); ctx.lineTo(-w / 2 + 6, -6); ctx.closePath(); ctx.fill();
      ctx.beginPath(); ctx.moveTo(w / 2, 0); ctx.lineTo(w / 2 + 8, -12); ctx.lineTo(w / 2 - 6, -6); ctx.closePath(); ctx.fill();
      // Tijelo.
      const g = ctx.createLinearGradient(0, 0, 0, hh); g.addColorStop(0, "#f4ff8a"); g.addColorStop(1, "#c9d600");
      ctx.fillStyle = g; ctx.beginPath();
      if (typeof (ctx as any).roundRect === "function") (ctx as any).roundRect(-w / 2, 0, w, hh, 5); else ctx.rect(-w / 2, 0, w, hh);
      ctx.fill();
      ctx.fillStyle = "rgba(0,0,0,0.16)"; ctx.fillRect(-w / 2 + 4, 0, w - 8, 4);
      ctx.fillStyle = "#0b0b0b"; ctx.font = "800 10px Arial"; ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.fillText("DRESIFY", 0, hh / 2 + 2);
      ctx.restore();
    }

    function drawBackground(time: number) {
      const sky = ctx.createLinearGradient(0, 0, 0, H); sky.addColorStop(0, "#0a1330"); sky.addColorStop(0.5, "#0b1020"); sky.addColorStop(1, "#0d2213");
      ctx.fillStyle = sky; ctx.fillRect(0, 0, W, H);
      for (const s of stars) { const tw = 0.5 + 0.5 * Math.sin(time * 2 + s.p); ctx.globalAlpha = 0.5 * tw; ctx.fillStyle = "#dfe8ff"; ctx.fillRect(s.x, s.y, s.r, s.r); }
      ctx.globalAlpha = 1;
      for (const fx of [34, W - 34]) { const fg = ctx.createRadialGradient(fx, 6, 0, fx, 6, 120); fg.addColorStop(0, "rgba(255,255,225,0.13)"); fg.addColorStop(1, "rgba(255,255,225,0)"); ctx.fillStyle = fg; ctx.fillRect(0, 0, W, H); ctx.fillStyle = "#fffef0"; ctx.beginPath(); ctx.arc(fx, 6, 4, 0, 7); ctx.fill(); }
      ctx.fillStyle = "#0f1218"; ctx.fillRect(0, 52, W, 52);
      for (const p of crowd) { const tw = 0.6 + 0.4 * Math.sin(time * 3 + p.x); ctx.globalAlpha = 0.4 + 0.3 * tw; ctx.fillStyle = p.c < 0.5 ? "#e8ff3c" : p.c < 0.72 ? "#3b82f6" : p.c < 0.86 ? "#ff4d6d" : "#cfd6e0"; ctx.fillRect(p.x, p.y, 2.4, 2.4); }
      ctx.globalAlpha = 1;
      const gg = ctx.createLinearGradient(0, H - 8, 0, H); gg.addColorStop(0, "#2f8a37"); gg.addColorStop(1, "#37a041");
      ctx.fillStyle = gg; ctx.fillRect(0, H - 8, W, 8);
    }

    function draw() {
      const time = performance.now() / 1000;
      ctx.clearRect(0, 0, W, H);
      ctx.save();
      const sx = shake > 0 ? (Math.random() - 0.5) * shake : 0, sy = shake > 0 ? (Math.random() - 0.5) * shake : 0;
      ctx.translate(sx, sy);

      drawBackground(time);
      for (const it of items) if (!it.done) drawJersey(it.x, it.y, it.rot + Math.sin(frame * 0.05 + it.x) * 0.15);
      drawBox();
      for (const p of parts) { ctx.globalAlpha = Math.max(0, 1 - p.life / p.max); ctx.fillStyle = p.c; ctx.fillRect(p.x, p.y, p.sz, p.sz); }
      ctx.globalAlpha = 1;

      if (state === "play") {
        const sc = 1 + pop * 0.4;
        ctx.save(); ctx.translate(W / 2, 26); ctx.scale(sc, sc);
        ctx.fillStyle = "#fff"; ctx.font = "800 30px Arial"; ctx.textAlign = "center"; ctx.textBaseline = "middle";
        ctx.shadowColor = "rgba(0,0,0,0.5)"; ctx.shadowBlur = 6; ctx.fillText(String(score), 0, 0); ctx.restore(); ctx.shadowBlur = 0;
        ctx.fillStyle = "#e8ff3c"; ctx.font = "700 11px Arial"; ctx.textAlign = "center"; ctx.textBaseline = "top"; ctx.fillText("RAZINA " + level(score), W / 2, 48);
        ctx.font = "13px Arial"; ctx.textAlign = "left";
        ctx.fillStyle = "#ff4d6d"; ctx.fillText("✕".repeat(misses), 14, 16);
        ctx.fillStyle = "rgba(255,255,255,0.25)"; ctx.fillText("✕".repeat(Math.max(0, 3 - misses)), 14 + misses * 9, 16);
        ctx.textBaseline = "alphabetic";
        if (levelBanner > 0) { ctx.globalAlpha = Math.min(1, levelBanner); ctx.fillStyle = "#e8ff3c"; ctx.font = "800 26px Arial"; ctx.textAlign = "center"; ctx.fillText("RAZINA " + curLevel, W / 2, H / 2); ctx.globalAlpha = 1; }
      }
      ctx.restore();
      if (flash > 0) { ctx.fillStyle = "rgba(" + flashCol + "," + (flash * 0.4) + ")"; ctx.fillRect(0, 0, W, H); }
    }

    function update() {
      frame++;
      if (frame % Math.round(spawnEvery()) === 0) spawn();
      const by = H - GROUND;
      for (const it of items) {
        it.y += it.vy;
        if (it.done) continue;
        if (it.y + ITEM / 2 >= by && it.x >= box.x - BOXW / 2 - 6 && it.x <= box.x + BOXW / 2 + 6) {
          it.done = true; score++; sCatch(); burst(it.x, by, ["#e8ff3c", "#fff"]); pop = 1; boxPop = 1;
          const nl = level(score); if (nl > curLevel) { curLevel = nl; levelBanner = 1.4; flashCol = "232,255,60"; flash = 0.6; }
          const r = rewardFor(score); if (r && r.code !== tier) { tier = r.code; buzz(40); }
        } else if (it.y - ITEM / 2 > H) {
          it.done = true; misses++; sMiss(); buzz(30); flashCol = "255,77,109"; flash = 0.7; shake = 5; burst(it.x, H - 6, ["#ff4d6d", "#8891a0"]);
          if (misses >= 3) { gameOver(); return; }
        }
      }
      items = items.filter((it) => !it.done && it.y - ITEM / 2 <= H + 4);
    }

    function frameLoop() {
      shake = Math.max(0, shake - 0.5); flash = Math.max(0, flash - 0.04); pop = Math.max(0, pop - 0.08); boxPop = Math.max(0, boxPop - 0.1); levelBanner = Math.max(0, levelBanner - 0.02);
      for (let i = parts.length - 1; i >= 0; i--) { const p = parts[i]; p.life += 0.016; p.vy += 0.14; p.x += p.vx; p.y += p.vy; if (p.life >= p.max) parts.splice(i, 1); }
      if (state === "play") update();
      draw();
      raf = requestAnimationFrame(frameLoop);
    }

    function startGame() { intro.style.display = "none"; over.style.display = "none"; reset(); state = "play"; }

    function gameOver() {
      state = "over"; sHit(); buzz(120); shake = 14; flashCol = "255,77,109"; flash = 1;
      if (score > best()) localStorage.setItem(BEST_KEY, String(score));
      bestEl.textContent = String(best());
      const reward = rewardFor(score); const win = !!reward;
      let h = '<div style="font-size:13px;letter-spacing:2px;color:' + (win ? "#e8ff3c" : "rgba(255,255,255,0.6)") + ';font-weight:700;margin-bottom:4px;">' + (win ? "POBJEDA!" : "KRAJ IGRE") + '</div>'
        + '<div style="font-size:30px;font-weight:800;color:#fff;line-height:1;margin-bottom:2px;">' + score + '</div>'
        + '<div style="font-size:11px;color:rgba(255,255,255,0.45);margin-bottom:14px;">uhvaćenih dresova &middot; rekord ' + best() + '</div>';
      if (reward) {
        h += '<div style="font-size:13px;color:rgba(255,255,255,0.75);margin-bottom:14px;">Osvojio si <b style="color:#e8ff3c;font-size:18px;">' + reward.label + '</b>!</div>'
          + '<button id="ct_shop" class="ct-btn" style="width:220px;padding:14px 0;border:none;border-radius:12px;background:#e8ff3c;color:#0b0b0b;font-size:14px;font-weight:800;cursor:pointer;">ISKORISTI NAGRADU &rarr;</button>'
          + '<button id="ct_again" class="ct-btn" style="width:220px;margin-top:8px;padding:10px 0;border:1px solid rgba(255,255,255,0.2);border-radius:12px;background:transparent;color:#fff;font-size:13px;cursor:pointer;">Igraj ponovno</button>'
          + '<div style="margin-top:10px;font-size:10px;color:rgba(255,255,255,0.35);">Nagrada se sama primijeni na blagajni</div>';
      } else {
        h += '<div style="font-size:12px;color:rgba(255,255,255,0.6);margin-bottom:12px;">Uhvati <b style="color:#e8ff3c;">' + nextAt(score) + '</b> dresova za <b style="color:#e8ff3c;">' + nextLabel(score) + '</b>!</div>'
          + '<button id="ct_again" class="ct-btn" style="width:220px;padding:13px 0;border:none;border-radius:12px;background:#e8ff3c;color:#0b0b0b;font-size:14px;font-weight:800;cursor:pointer;">Igraj ponovno</button>';
      }
      over.innerHTML = h; over.style.display = "flex";
      const shopEl = root!.querySelector<HTMLElement>("#ct_shop");
      if (shopEl && reward) shopEl.onclick = () => { try { localStorage.setItem(PROMO_STORAGE_KEY, reward.code); } catch {} window.location.href = "/dresovi"; };
      const againEl = root!.querySelector<HTMLElement>("#ct_again");
      if (againEl) againEl.onclick = () => startGame();
    }

    startBtn.onclick = (e) => { e.stopPropagation(); startGame(); };
    function moveTo(clientX: number) { const rect = stage.getBoundingClientRect(); const x = ((clientX - rect.left) / rect.width) * W; box.x = Math.max(BOXW / 2, Math.min(W - BOXW / 2, x)); }
    stage.addEventListener("pointermove", (e) => { if (state === "play") moveTo(e.clientX); });
    stage.addEventListener("pointerdown", (e) => { if (state === "play") moveTo(e.clientX); });
    function onKey(e: KeyboardEvent) {
      if (state !== "play") return; const k = e.key.toLowerCase();
      if (k === "arrowleft" || k === "a") { e.preventDefault(); box.x = Math.max(BOXW / 2, box.x - 28); }
      else if (k === "arrowright" || k === "d") { e.preventDefault(); box.x = Math.min(W - BOXW / 2, box.x + 28); }
    }
    window.addEventListener("keydown", onKey);

    raf = requestAnimationFrame(frameLoop);
    return () => { cancelAnimationFrame(raf); window.removeEventListener("keydown", onKey); };
  }, []);

  return <div ref={rootRef} dangerouslySetInnerHTML={{ __html: STAGE_HTML }} />;
}
