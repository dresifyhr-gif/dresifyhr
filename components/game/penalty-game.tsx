"use client";

import { useEffect, useRef } from "react";

import { PROMO_STORAGE_KEY } from "@/components/site/promo-capture";

const STAGE_HTML = `
<style>
@keyframes pgspin{from{transform:rotate(0)}to{transform:rotate(360deg)}}
@keyframes pgshake{0%,100%{transform:translate(0,0)}25%{transform:translate(-3px,1px)}50%{transform:translate(3px,-1px)}75%{transform:translate(-2px,1px)}}
.pg-shake{animation:pgshake .22s ease}
.pg-btn{transition:transform .08s ease}
.pg-btn:active{transform:scale(0.97)}
</style>
<div style="display:flex;justify-content:center;">
  <div style="width:100%;max-width:400px;background:#0b0b0b;border-radius:22px;overflow:hidden;border:1px solid rgba(255,255,255,0.12);font-family:inherit;box-shadow:0 18px 50px rgba(0,0,0,0.5);">

    <div style="display:flex;align-items:center;justify-content:space-between;padding:13px 18px;background:#000;">
      <span style="font-weight:700;letter-spacing:1px;color:#fff;font-size:20px;">DRES<span style="color:#e8ff3c;">IFY</span></span>
      <span style="font-size:11px;color:#e8ff3c;font-weight:700;letter-spacing:2px;text-transform:uppercase;">Penalty Cup</span>
    </div>

    <div style="display:flex;justify-content:space-between;align-items:center;padding:9px 18px;font-size:12px;color:rgba(255,255,255,0.6);background:#111;">
      <span>PENAL <b id="pg_shot" style="color:#fff;font-size:15px;">1</b><span style="opacity:.5;">/5</span></span>
      <div id="pg_dots" style="display:flex;gap:5px;"></div>
      <span style="display:flex;align-items:center;gap:10px;">GOLOVI <b id="pg_goals" style="color:#e8ff3c;font-size:15px;">0</b>
        <button id="pg_mute" aria-label="Zvuk" style="background:none;border:none;color:rgba(255,255,255,0.55);cursor:pointer;font-size:15px;padding:0;line-height:1;">&#9834;</button>
      </span>
    </div>

    <div id="pg_pitch" style="position:relative;width:100%;aspect-ratio:344/272;overflow:hidden;cursor:crosshair;background:repeating-linear-gradient(#2f8a37 0 8%, #2b7f33 8% 16%);">
      <div style="position:absolute;top:0;left:0;right:0;height:10%;background:#161a20;"></div>
      <div style="position:absolute;top:2.5%;left:0;right:0;text-align:center;font-size:9px;letter-spacing:6px;color:rgba(232,255,60,0.5);font-weight:700;">D R E S I F Y &nbsp; A R E N A</div>
      <div style="position:absolute;top:3%;left:14%;width:10px;height:10px;border-radius:50%;background:#fffef0;box-shadow:0 0 12px 4px rgba(255,255,200,0.5);"></div>
      <div style="position:absolute;top:3%;right:14%;width:10px;height:10px;border-radius:50%;background:#fffef0;box-shadow:0 0 12px 4px rgba(255,255,200,0.5);"></div>

      <div id="pg_goal" style="position:absolute;top:11%;left:8%;right:8%;height:38%;border:5px solid #f7f7f7;border-bottom:none;border-radius:6px 6px 0 0;overflow:hidden;background:linear-gradient(90deg,rgba(255,255,255,0.16) 1px,transparent 1px) 0 0/12px 12px,linear-gradient(rgba(255,255,255,0.16) 1px,transparent 1px) 0 0/12px 12px;transition:transform .12s ease;"></div>

      <div style="position:absolute;bottom:0;left:0;right:0;height:30%;background:#36933c;border-top:2px solid rgba(255,255,255,0.3);"></div>
      <div style="position:absolute;bottom:46%;left:50%;width:42%;height:16%;transform:translateX(-50%);border:2px solid rgba(255,255,255,0.2);border-top:none;border-radius:0 0 50% 50%;"></div>
      <div style="position:absolute;bottom:11%;left:50%;width:7px;height:7px;margin-left:-3px;border-radius:50%;background:#fff;"></div>
      <div style="position:absolute;top:15%;left:2%;font-size:8px;letter-spacing:2px;color:rgba(255,255,255,0.4);transform:rotate(-90deg);transform-origin:left;">DRESIFY</div>
      <div style="position:absolute;top:15%;right:2%;font-size:8px;letter-spacing:2px;color:rgba(255,255,255,0.4);transform:rotate(90deg);transform-origin:right;">DRESIFY</div>

      <div id="pg_aim" style="position:absolute;width:26px;height:26px;border:2px solid #e8ff3c;border-radius:50%;box-shadow:0 0 10px #e8ff3c;opacity:0;transition:opacity .15s;pointer-events:none;z-index:2;transform:translate(-50%,-50%);"></div>

      <div id="pg_keeper" style="position:absolute;left:50%;top:30%;z-index:3;transform:translate(-50%,-50%);">
        <svg width="54" height="68" viewBox="0 0 64 82"><ellipse cx="32" cy="79" rx="16" ry="3" fill="rgba(0,0,0,0.25)"/><rect x="3" y="20" width="13" height="10" rx="5" transform="rotate(-32 9 25)" fill="#16171b"/><rect x="48" y="20" width="13" height="10" rx="5" transform="rotate(32 55 25)" fill="#16171b"/><circle cx="6" cy="17" r="6" fill="#e8ff3c"/><circle cx="58" cy="17" r="6" fill="#e8ff3c"/><rect x="19" y="24" width="26" height="36" rx="8" fill="#16171b"/><text x="32" y="40" text-anchor="middle" font-family="Arial" font-size="6.5" font-weight="800"><tspan fill="#fff">DRES</tspan><tspan fill="#e8ff3c">IFY</tspan></text><text x="32" y="54" text-anchor="middle" font-family="Arial" font-size="13" font-weight="800" fill="#fff">1</text><circle cx="32" cy="14" r="9" fill="#f0c08a"/><path d="M23 12a9 9 0 0118 0z" fill="#3a2a1a"/><rect x="22" y="60" width="8" height="18" rx="3" fill="#16171b"/><rect x="34" y="60" width="8" height="18" rx="3" fill="#16171b"/><rect x="21" y="76" width="11" height="5" rx="2" fill="#e8ff3c"/><rect x="33" y="76" width="11" height="5" rx="2" fill="#e8ff3c"/></svg>
      </div>

      <div id="pg_ball" style="position:absolute;left:50%;top:86%;z-index:4;transform:translate(-50%,-50%);">
        <div id="pg_spin" style="width:34px;height:34px;">
          <svg width="34" height="34" viewBox="0 0 120 120"><circle cx="60" cy="60" r="56" fill="#fff" stroke="#0c0c0c" stroke-width="3"/><path d="M6 60h108" stroke="rgba(0,0,0,0.08)" stroke-width="2"/><text x="60" y="67" text-anchor="middle" font-family="Arial" font-weight="800" font-size="22" letter-spacing="-0.5"><tspan fill="#121212">DRES</tspan><tspan fill="#c9d600">IFY</tspan></text></svg>
        </div>
      </div>

      <div id="pg_status" style="position:absolute;top:40%;left:0;right:0;text-align:center;font-size:34px;font-weight:800;letter-spacing:1px;color:#e8ff3c;opacity:0;transition:opacity .15s;pointer-events:none;z-index:5;text-shadow:0 2px 12px rgba(0,0,0,0.6);"></div>

      <div id="pg_intro" style="position:absolute;inset:0;background:rgba(7,7,7,0.78);display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;z-index:8;padding:20px;">
        <div style="font-size:13px;letter-spacing:3px;color:#e8ff3c;font-weight:700;margin-bottom:6px;">DRESIFY PENALTY CUP</div>
        <div style="font-size:22px;font-weight:800;color:#fff;line-height:1.1;margin-bottom:10px;">Zabij 4 od 5 penala</div>
        <div style="font-size:13px;color:rgba(255,255,255,0.7);margin-bottom:18px;max-width:240px;">i osvoji <b style="color:#e8ff3c;">besplatnu dostavu</b> na svoju narudžbu. Tapni u gol gdje želiš pucati.</div>
        <button id="pg_start" class="pg-btn" style="padding:14px 34px;border:none;border-radius:12px;background:#e8ff3c;color:#0b0b0b;font-size:15px;font-weight:800;cursor:pointer;">START &#9917;</button>
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
    const pitch = $("pg_pitch"), goal = $("pg_goal"), ball = $("pg_ball"), spin = $("pg_spin");
    const keeper = $("pg_keeper"), aim = $("pg_aim"), statusEl = $("pg_status");
    const shotEl = $("pg_shot"), goalsEl = $("pg_goals"), dotsEl = $("pg_dots");
    let hint = $("pg_hint");
    const intro = $("pg_intro"), startBtn = $("pg_start"), bestEl = $("pg_best");
    const muteBtn = $("pg_mute");
    let controls = $("pg_controls");

    let shot = 1, goals = 0, busy = false, playing = false, raf = 0;
    let muted = false;
    const results: (boolean | null)[] = [null, null, null, null, null];
    const BEST_KEY = "dresify_penalty_best";
    const best = () => Number(localStorage.getItem(BEST_KEY) || 0);
    bestEl.textContent = best() ? "Najbolje: " + best() + "/5" : "";

    let actx: AudioContext | null = null;
    function tone(freq: number, dur: number, type: OscillatorType, vol: number, delay: number) {
      if (muted) return;
      try {
        const ctx: AudioContext = actx || new ((window as any).AudioContext || (window as any).webkitAudioContext)();
        actx = ctx;
        const t0 = ctx.currentTime + delay;
        const o = ctx.createOscillator(), g = ctx.createGain();
        o.type = type; o.frequency.setValueAtTime(freq, t0);
        g.gain.setValueAtTime(vol, t0); g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
        o.connect(g); g.connect(ctx.destination); o.start(t0); o.stop(t0 + dur);
      } catch {}
    }
    const sfxKick = () => tone(150, 0.12, "square", 0.18, 0);
    const sfxGoal = () => { [523, 659, 784].forEach((f, i) => tone(f, 0.18, "sine", 0.2, i * 0.09)); };
    const sfxSave = () => tone(220, 0.25, "sawtooth", 0.16, 0);
    const sfxWhistle = () => { tone(2000, 0.15, "sine", 0.12, 0); tone(2200, 0.15, "sine", 0.12, 0.16); };
    const buzz = (ms: number | number[]) => { try { (navigator as any).vibrate && navigator.vibrate(ms); } catch {} };

    muteBtn.onclick = () => { muted = !muted; muteBtn.innerHTML = muted ? "&#128263;" : "&#9834;"; muteBtn.style.color = muted ? "rgba(255,255,255,0.3)" : "rgba(255,255,255,0.55)"; };

    function drawDots() {
      let h = "";
      for (let i = 0; i < 5; i++) {
        const c = results[i] === true ? "#e8ff3c" : results[i] === false ? "#ff4d6d" : "rgba(255,255,255,0.18)";
        h += '<span style="width:7px;height:7px;border-radius:50%;background:' + c + ';display:inline-block;"></span>';
      }
      dotsEl.innerHTML = h;
    }
    drawDots();

    function dims() { const r = pitch.getBoundingClientRect(); return { PW: r.width, PH: r.height, r }; }
    function setHint(html: string) { hint.innerHTML = html; }

    startBtn.onclick = () => { sfxWhistle(); intro.style.display = "none"; playing = true; };

    pitch.addEventListener("click", (e) => {
      if (!playing || busy) return;
      const { PW, PH, r } = dims();
      const x = e.clientX - r.left, y = e.clientY - r.top;
      if (x < PW * 0.1 || x > PW * 0.9 || y < PH * 0.13 || y > PH * 0.49) {
        setHint('<span style="color:#ff4d6d;">Pucaj unutar gola!</span>');
        return;
      }
      shoot(x, y, PW, PH);
    });

    function shoot(x: number, y: number, PW: number, PH: number) {
      busy = true; setHint("&nbsp;"); sfxKick(); buzz(15);
      aim.style.left = x + "px"; aim.style.top = y + "px"; aim.style.opacity = "1";

      const xs = [0.27 * PW, 0.5 * PW, 0.73 * PW], ys = [0.30 * PH, 0.46 * PH];
      let kx = xs[(Math.random() * 3) | 0], ky = ys[(Math.random() * 2) | 0];
      const readChance = 0.12 + 0.06 * (shot - 1);
      if (Math.random() < readChance) { kx = Math.max(xs[0], Math.min(xs[2], x)); ky = Math.abs(y - ys[0]) < Math.abs(y - ys[1]) ? ys[0] : ys[1]; }
      const reach = (0.17 + 0.015 * (shot - 1)) * PW;

      const ballHomeX = 0.5 * PW, ballHomeY = 0.86 * PH;
      const keeperHomeX = 0.5 * PW, keeperHomeY = 0.30 * PH;
      const arc = 0.2 * PH;
      let t = 0;

      function step() {
        t += 0.02;
        const tt = t > 1 ? 1 : t;
        const cx = ballHomeX + (x - ballHomeX) * tt;
        const cy = ballHomeY + (y - ballHomeY) * tt - arc * Math.sin(Math.PI * tt);
        const s = 1 - 0.5 * tt;
        ball.style.transform = "translate(-50%,-50%) translate(" + (cx - ballHomeX) + "px," + (cy - ballHomeY) + "px) scale(" + s + ")";
        spin.style.transform = "rotate(" + (tt * 720) + "deg)";
        const kt = Math.min(1, t / 0.62);
        keeper.style.transform = "translate(-50%,-50%) translate(" + ((kx - keeperHomeX) * kt) + "px," + ((ky - keeperHomeY) * kt) + "px) rotate(" + ((kx - keeperHomeX) * 0.06 * kt) + "deg)";
        if (t < 1) { raf = requestAnimationFrame(step); }
        else { finish(Math.hypot(x - kx, y - ky) < reach); }
      }
      raf = requestAnimationFrame(step);
    }

    function finish(saved: boolean) {
      if (saved) { statusEl.textContent = "OBRANA!"; statusEl.style.color = "#ff4d6d"; results[shot - 1] = false; sfxSave(); buzz(60); }
      else {
        goals++; goalsEl.textContent = String(goals); statusEl.textContent = "GOOOL!"; statusEl.style.color = "#e8ff3c";
        results[shot - 1] = true; sfxGoal(); buzz([30, 40, 60]);
        goal.classList.add("pg-shake"); pitch.classList.add("pg-shake");
        setTimeout(() => { goal.classList.remove("pg-shake"); pitch.classList.remove("pg-shake"); }, 240);
      }
      statusEl.style.opacity = "1"; drawDots();
      setTimeout(() => {
        statusEl.style.opacity = "0"; aim.style.opacity = "0";
        if (shot >= 5) { setTimeout(endGame, 300); }
        else { shot++; shotEl.textContent = String(shot); resetShot(); }
      }, 1050);
    }

    function resetShot() {
      ball.style.transition = "none"; keeper.style.transition = "none";
      ball.style.transform = "translate(-50%,-50%)"; keeper.style.transform = "translate(-50%,-50%)";
      spin.style.transform = "rotate(0deg)";
      void ball.offsetWidth;
      busy = false; setHint("&#9917; Tapni u gol gdje želiš pucati");
    }

    function confetti() {
      const cols = ["#e8ff3c", "#fff", "#ff4d6d", "#3b82f6"];
      const w = pitch.clientWidth;
      for (let i = 0; i < 26; i++) {
        const d = document.createElement("div");
        const dur = 1 + Math.random() * 1.3;
        d.style.cssText = "position:absolute;top:-10px;left:" + (Math.random() * w) + "px;width:7px;height:10px;background:" + cols[i % 4] + ";z-index:9;border-radius:1px;";
        pitch.appendChild(d);
        d.animate([{ transform: "translateY(0) rotate(0)", opacity: 1 }, { transform: "translateY(" + (pitch.clientHeight + 20) + "px) rotate(560deg)", opacity: 0.9 }], { duration: dur * 1000, easing: "ease-in" });
        setTimeout(() => d.remove(), dur * 1000);
      }
    }

    function endGame() {
      playing = false;
      if (goals > best()) localStorage.setItem(BEST_KEY, String(goals));
      const win = goals >= 4;
      const bestLine = '<p style="margin:6px 0 0;text-align:center;font-size:11px;color:rgba(255,255,255,0.45);">Najbolje: ' + best() + '/5</p>';
      if (win) {
        controls.innerHTML =
          '<p style="margin:0 0 2px;text-align:center;font-size:18px;font-weight:800;color:#e8ff3c;">POBJEDA — ' + goals + '/5!</p>' +
          '<p style="margin:0 0 14px;text-align:center;font-size:13px;color:rgba(255,255,255,0.75);">Osvojio si <b style="color:#e8ff3c;font-size:18px;">besplatnu dostavu</b>!</p>' +
          '<button id="pg_shop" class="pg-btn" style="width:100%;padding:14px 0;border:none;border-radius:12px;background:#e8ff3c;color:#0b0b0b;font-size:14px;font-weight:800;cursor:pointer;">ISKORISTI NA SHOPU &rarr;</button>' +
          '<button id="pg_again" class="pg-btn" style="width:100%;margin-top:8px;padding:11px 0;border:1px solid rgba(255,255,255,0.2);border-radius:12px;background:transparent;color:#fff;font-size:13px;cursor:pointer;">Igraj ponovno</button>' +
          '<p style="margin:8px 0 0;text-align:center;font-size:10px;color:rgba(255,255,255,0.35);">Besplatna dostava se sam primijeni na blagajni</p>' + bestLine;
        confetti(); sfxGoal();
      } else {
        controls.innerHTML =
          '<p style="margin:0 0 2px;text-align:center;font-size:18px;font-weight:800;color:#fff;">' + goals + '/5 golova</p>' +
          '<p style="margin:0 0 12px;text-align:center;font-size:12px;color:rgba(255,255,255,0.6);">Treba 4 za kod — ciljaj same kuteve!</p>' +
          '<button id="pg_again" class="pg-btn" style="width:100%;padding:14px 0;border:none;border-radius:12px;background:#e8ff3c;color:#0b0b0b;font-size:14px;font-weight:800;cursor:pointer;">Igraj ponovno</button>' + bestLine;
      }
      const shopEl = root!.querySelector<HTMLElement>("#pg_shop");
      if (shopEl) shopEl.onclick = () => { try { localStorage.setItem(PROMO_STORAGE_KEY, "DOSTAVA"); } catch {} window.location.href = "/dresovi"; };
      const againEl = root!.querySelector<HTMLElement>("#pg_again");
      if (againEl) againEl.onclick = () => {
        shot = 1; goals = 0; for (let i = 0; i < 5; i++) results[i] = null;
        shotEl.textContent = "1"; goalsEl.textContent = "0"; drawDots();
        controls.innerHTML = '<p id="pg_hint" style="margin:0;text-align:center;font-size:13px;color:rgba(255,255,255,0.7);">&#9917; Tapni u gol gdje želiš pucati</p>';
        hint = root!.querySelector<HTMLElement>("#pg_hint")!;
        resetShot(); playing = true;
      };
    }

    return () => { cancelAnimationFrame(raf); };
  }, []);

  return <div ref={rootRef} dangerouslySetInnerHTML={{ __html: STAGE_HTML }} />;
}
