"use client";

import { useEffect, useRef } from "react";

import { PROMO_STORAGE_KEY } from "@/components/site/promo-capture";

const STAGE_HTML = `
<style>
.ct-btn{transition:transform .08s ease}
.ct-btn:active{transform:scale(0.97)}
</style>
<div style="display:flex;justify-content:center;">
  <div style="width:100%;max-width:400px;background:#0b0b0b;border-radius:22px;overflow:hidden;border:1px solid rgba(255,255,255,0.12);font-family:inherit;box-shadow:0 18px 50px rgba(0,0,0,0.5);">
    <div style="display:flex;align-items:center;justify-content:space-between;padding:13px 18px;background:#000;">
      <span style="font-weight:700;letter-spacing:1px;color:#fff;font-size:20px;">DRES<span style="color:#e8ff3c;">IFY</span></span>
      <span style="font-size:11px;color:#e8ff3c;font-weight:700;letter-spacing:2px;text-transform:uppercase;">Uhvati dres</span>
    </div>
    <div style="display:flex;justify-content:space-between;align-items:center;padding:9px 18px;font-size:12px;color:rgba(255,255,255,0.6);background:#111;">
      <span>3 razine = <b style="color:#e8ff3c;">veća nagrada</b></span>
      <span style="display:flex;align-items:center;gap:10px;">REKORD <b id="ct_best" style="color:#fff;font-size:14px;">0</b>
        <button id="ct_mute" aria-label="Zvuk" style="background:none;border:none;color:rgba(255,255,255,0.55);cursor:pointer;font-size:15px;padding:0;line-height:1;">&#9834;</button>
      </span>
    </div>

    <div id="ct_stage" style="position:relative;width:100%;aspect-ratio:360/480;overflow:hidden;background:#0e1a12;cursor:pointer;touch-action:none;">
      <canvas id="ct_canvas" style="display:block;width:100%;height:100%;"></canvas>

      <div id="ct_intro" style="position:absolute;inset:0;background:rgba(7,7,7,0.74);display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;z-index:8;padding:20px;">
        <div style="font-size:13px;letter-spacing:3px;color:#e8ff3c;font-weight:700;margin-bottom:6px;">DRESIFY UHVATI DRES</div>
        <div style="font-size:22px;font-weight:800;color:#fff;line-height:1.1;margin-bottom:10px;">Skupi dresove u kutiju</div>
        <div style="font-size:13px;color:rgba(255,255,255,0.7);margin-bottom:18px;max-width:260px;">Pomiči kutiju i hvataj dresove. Svaka razina = 20 dresova, sve brže! <b style="color:#e8ff3c;">20&rarr;besplatna dostava</b>, 40&rarr;-15%, 60&rarr;-20%. Smiješ promašiti najviše 3!</div>
        <button id="ct_start" class="ct-btn" style="padding:14px 34px;border:none;border-radius:12px;background:#e8ff3c;color:#0b0b0b;font-size:15px;font-weight:800;cursor:pointer;">START &#128230;</button>
      </div>

      <div id="ct_over" style="position:absolute;inset:0;background:rgba(7,7,7,0.82);display:none;flex-direction:column;align-items:center;justify-content:center;text-align:center;z-index:8;padding:20px;"></div>
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
    const sCatch = () => tone(880, 0.09, "sine", 0.18);
    const sMiss = () => tone(160, 0.18, "sawtooth", 0.18);
    const sHit = () => tone(110, 0.28, "sawtooth", 0.2);
    const buzz = (ms: number | number[]) => { try { (navigator as any).vibrate && navigator.vibrate(ms); } catch {} };

    const GROUND = 30, BOXW = 74, BOXH = 16, ITEM = 26;
    type Item = { x: number; y: number; vy: number; done?: boolean };
    let box = { x: W / 2 };
    let items: Item[] = [];
    let score = 0, misses = 0, frame = 0, tier = "";
    let state: "idle" | "play" | "over" = "idle", raf = 0;

    function rewardFor(s: number) {
      return s >= 60 ? { code: "GOL20", label: "-20% + besplatna dostava (od 100€)" }
        : s >= 40 ? { code: "GOL15", label: "-15% + besplatna dostava (od 80€)" }
        : s >= 20 ? { code: "DOSTAVA", label: "besplatnu dostavu (od 40€)" } : null;
    }
    const nextAt = (s: number) => s < 20 ? 20 : s < 40 ? 40 : s < 60 ? 60 : null;
    const nextLabel = (s: number) => s < 20 ? "besplatnu dostavu (od 40€)" : s < 40 ? "-15% + dostava (od 80€)" : "-20% + dostava (od 100€)";
    // Endless levels of 20 jerseys each; keeps speeding up past level 3.
    const level = (s: number) => Math.floor(s / 20) + 1;

    // Slow start, gentle ramp within a level, faster every 20 caught (no upper level cap).
    function fallSpeed() {
      const l = level(score);
      const within = score - (l - 1) * 20; // 0..19
      const base = 1.8 + (l - 1) * 1.0; // L1:1.8, L2:2.8, L3:3.8, L4:4.8…
      return Math.min(9, base + within * 0.03);
    }
    function spawnEvery() {
      const l = level(score);
      return Math.max(28, 98 - (l - 1) * 22); // L1:98, L2:76, L3:54, L4:32…
    }

    function reset() {
      box = { x: W / 2 }; items = []; score = 0; misses = 0; frame = 0; tier = "";
    }

    function spawn() {
      const x = 24 + Math.random() * (W - 48);
      items.push({ x, y: -ITEM, vy: fallSpeed() });
    }

    function draw() {
      // pitch background
      const sky = ctx.createLinearGradient(0, 0, 0, H);
      sky.addColorStop(0, "#0e1a12"); sky.addColorStop(1, "#163a20");
      ctx.fillStyle = sky; ctx.fillRect(0, 0, W, H);
      ctx.fillStyle = "rgba(232,255,60,0.05)"; ctx.font = "700 26px Arial"; ctx.textAlign = "center"; ctx.fillText("DRESIFY", W / 2, H / 2);

      // ground line
      ctx.fillStyle = "#2f8a37"; ctx.fillRect(0, H - 6, W, 6);

      // items (jerseys)
      ctx.font = `${ITEM}px Arial`; ctx.textAlign = "center"; ctx.textBaseline = "middle";
      for (const it of items) ctx.fillText("👕", it.x, it.y);

      // box (catcher)
      const bx = box.x - BOXW / 2, by = H - GROUND;
      ctx.fillStyle = "#e8ff3c";
      ctx.beginPath();
      if (typeof ctx.roundRect === "function") ctx.roundRect(bx, by, BOXW, BOXH + 10, 5);
      else ctx.rect(bx, by, BOXW, BOXH + 10);
      ctx.fill();
      ctx.fillStyle = "rgba(0,0,0,0.18)"; ctx.fillRect(bx + 4, by, BOXW - 8, 4);
      ctx.fillStyle = "#0b0b0b"; ctx.font = "800 9px Arial"; ctx.textAlign = "center"; ctx.textBaseline = "middle";
      ctx.fillText("DRESIFY", box.x, by + BOXH);

      if (state === "play") {
        // score
        ctx.fillStyle = "#fff"; ctx.font = "800 30px Arial"; ctx.textAlign = "center"; ctx.textBaseline = "top";
        ctx.shadowColor = "rgba(0,0,0,0.5)"; ctx.shadowBlur = 6;
        ctx.fillText(String(score), W / 2, 14); ctx.shadowBlur = 0;
        // level
        ctx.fillStyle = "#e8ff3c"; ctx.font = "700 11px Arial"; ctx.fillText("RAZINA " + level(score), W / 2, 50);
        // misses
        ctx.font = "14px Arial"; ctx.textAlign = "left";
        ctx.fillText("❌".repeat(misses) + "▫️".repeat(Math.max(0, 3 - misses)), 12, 14);
      }
    }

    function update() {
      frame++;
      if (frame % Math.round(spawnEvery()) === 0) spawn();
      const by = H - GROUND;
      for (const it of items) {
        it.y += it.vy;
        if (it.done) continue;
        if (it.y + ITEM / 2 >= by && it.x >= box.x - BOXW / 2 - 6 && it.x <= box.x + BOXW / 2 + 6) {
          it.done = true; score++; sCatch();
          const r = rewardFor(score); if (r && r.code !== tier) { tier = r.code; buzz(40); }
        } else if (it.y - ITEM / 2 > H) {
          it.done = true; misses++; sMiss(); buzz(30);
          if (misses >= 3) { gameOver(); return; }
        }
      }
      items = items.filter((it) => !it.done && it.y - ITEM / 2 <= H + 4);
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
      let h = '<div style="font-size:13px;letter-spacing:2px;color:' + (win ? "#e8ff3c" : "rgba(255,255,255,0.6)") + ';font-weight:700;margin-bottom:4px;">' + (win ? "POBJEDA!" : "KRAJ IGRE") + '</div>'
        + '<div style="font-size:30px;font-weight:800;color:#fff;line-height:1;margin-bottom:2px;">' + score + '</div>'
        + '<div style="font-size:11px;color:rgba(255,255,255,0.45);margin-bottom:14px;">uhvaćenih dresova &middot; rekord ' + best() + '</div>';
      if (reward) {
        h += '<div style="font-size:13px;color:rgba(255,255,255,0.75);margin-bottom:14px;">Osvojio si <b style="color:#e8ff3c;font-size:18px;">' + reward.label + '</b>!</div>'
          + '<button id="ct_shop" class="ct-btn" style="width:220px;padding:14px 0;border:none;border-radius:12px;background:#e8ff3c;color:#0b0b0b;font-size:14px;font-weight:800;cursor:pointer;">ISKORISTI NAGRADU &rarr;</button>'
          + '<button id="ct_again" class="ct-btn" style="width:220px;margin-top:8px;padding:10px 0;border:1px solid rgba(255,255,255,0.2);border-radius:12px;background:transparent;color:#fff;font-size:13px;cursor:pointer;">Igraj ponovno</button>'
          + '<div style="margin-top:10px;font-size:10px;color:rgba(255,255,255,0.35);">Nagrada se sam primijeni na blagajni</div>';
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

    // ── Controls ──────────────────────────────────────────────────────────
    startBtn.onclick = (e) => { e.stopPropagation(); startGame(); };

    function moveTo(clientX: number) {
      const rect = stage.getBoundingClientRect();
      const x = ((clientX - rect.left) / rect.width) * W;
      box.x = Math.max(BOXW / 2, Math.min(W - BOXW / 2, x));
    }
    stage.addEventListener("pointermove", (e) => { if (state === "play") moveTo(e.clientX); });
    stage.addEventListener("pointerdown", (e) => { if (state === "play") moveTo(e.clientX); });

    function onKey(e: KeyboardEvent) {
      if (state !== "play") return;
      const k = e.key.toLowerCase();
      if (k === "arrowleft" || k === "a") { e.preventDefault(); box.x = Math.max(BOXW / 2, box.x - 28); }
      else if (k === "arrowright" || k === "d") { e.preventDefault(); box.x = Math.min(W - BOXW / 2, box.x + 28); }
    }
    window.addEventListener("keydown", onKey);

    draw();

    return () => { cancelAnimationFrame(raf); window.removeEventListener("keydown", onKey); };
  }, []);

  return <div ref={rootRef} dangerouslySetInnerHTML={{ __html: STAGE_HTML }} />;
}
