// Žongliranje — statična scena (noćni trening na stadionu) i sjenčanje lopte.
// Sve se crta jednom po veličini u offscreen canvas; petlja ga samo kopira.

export const SCENE_BLEED = 36;

/** Deterministički "random" da se scena ne mijenja kod svakog resizea. */
function prng(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export type SceneGeometry = {
  horizon: number;
  /** Projekcija točke na terenu (X metri lijevo/desno, Z metri u dubinu, Y visina). */
  project: (X: number, Z: number, Y?: number) => [number, number];
};

export function sceneGeometry(w: number, h: number): SceneGeometry {
  const horizon = h * 0.47;
  const f = Math.max(w, h * 0.62) * 0.95;
  const cam = 1.7;
  const cx = w / 2;
  return {
    horizon,
    project: (X, Z, Y = 0) => [cx + (f * X) / Z, horizon + (f * (cam - Y)) / Z]
  };
}

export function paintScene(w: number, h: number, dpr: number): HTMLCanvasElement {
  const B = SCENE_BLEED;
  const W = w + B * 2;
  const H = h + B * 2;
  const c = document.createElement("canvas");
  c.width = Math.max(1, Math.round(W * dpr));
  c.height = Math.max(1, Math.round(H * dpr));
  const ctx = c.getContext("2d", { alpha: false })!;
  ctx.scale(dpr, dpr);
  ctx.translate(B, B);
  const rnd = prng(1907);
  const { horizon, project } = sceneGeometry(w, h);
  const cx = w / 2;

  // ── Nebo ──────────────────────────────────────────────────────────────
  let g = ctx.createLinearGradient(0, -B, 0, horizon);
  g.addColorStop(0, "#03050a");
  g.addColorStop(0.55, "#070b14");
  g.addColorStop(1, "#0f1622");
  ctx.fillStyle = g;
  ctx.fillRect(-B, -B, W, H);

  // Zvijezde, vrlo diskretno
  for (let i = 0; i < 46; i++) {
    const x = rnd() * W - B;
    const y = rnd() * horizon * 0.55 - B;
    const a = 0.08 + rnd() * 0.22;
    const r = rnd() < 0.15 ? 1.1 : 0.6;
    ctx.fillStyle = `rgba(220,230,255,${a})`;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }

  // Sjaj grada / reflektora nad tribinom
  g = ctx.createRadialGradient(cx, horizon, 0, cx, horizon, w * 0.9);
  g.addColorStop(0, "rgba(120,150,190,0.20)");
  g.addColorStop(0.5, "rgba(60,80,120,0.07)");
  g.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = g;
  ctx.fillRect(-B, -B, W, horizon + B);

  // ── Tribina iza gola ─────────────────────────────────────────────────
  const [, baseY] = project(0, 40);
  const standTop = horizon - h * 0.12;
  const roofY = standTop - h * 0.018;

  // Tijelo tribine
  g = ctx.createLinearGradient(0, roofY, 0, baseY);
  g.addColorStop(0, "#0b0f16");
  g.addColorStop(0.4, "#0e131b");
  g.addColorStop(1, "#080b10");
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.moveTo(-B, baseY);
  ctx.lineTo(-B, standTop + h * 0.03);
  ctx.quadraticCurveTo(cx, standTop - h * 0.012, w + B, standTop + h * 0.03);
  ctx.lineTo(w + B, baseY);
  ctx.closePath();
  ctx.fill();

  // Redovi sjedala
  ctx.save();
  ctx.clip();
  const rows = 11;
  for (let i = 0; i < rows; i++) {
    const t = i / rows;
    const y = standTop + (baseY - standTop) * (0.08 + t * 0.92);
    ctx.fillStyle = `rgba(160,180,210,${0.03 + t * 0.02})`;
    ctx.fillRect(-B, y, W, 1);
  }
  // Publika: sitne točkice (rijetko popunjeno, trening)
  for (let i = 0; i < 520; i++) {
    const x = rnd() * W - B;
    const y = standTop + h * 0.03 + rnd() * (baseY - standTop - h * 0.03);
    const k = rnd();
    const col = k < 0.08 ? "232,255,60" : k < 0.3 ? "255,255,255" : k < 0.45 ? "200,60,60" : "150,170,200";
    ctx.fillStyle = `rgba(${col},${0.05 + rnd() * 0.12})`;
    ctx.fillRect(x, y, 1.4, 1.4);
  }
  // Svjetlo reflektora pada na tribinu
  g = ctx.createRadialGradient(cx, standTop, 0, cx, standTop, w * 0.7);
  g.addColorStop(0, "rgba(200,220,255,0.10)");
  g.addColorStop(1, "rgba(200,220,255,0)");
  ctx.fillStyle = g;
  ctx.fillRect(-B, standTop - 10, W, baseY - standTop + 20);
  ctx.restore();

  // Krov + svjetla ispod krova
  ctx.fillStyle = "#05070b";
  ctx.beginPath();
  ctx.moveTo(-B, roofY + h * 0.03);
  ctx.quadraticCurveTo(cx, roofY - h * 0.012, w + B, roofY + h * 0.03);
  ctx.lineTo(w + B, roofY + h * 0.03 + 5);
  ctx.quadraticCurveTo(cx, roofY - h * 0.012 + 5, -B, roofY + h * 0.03 + 5);
  ctx.closePath();
  ctx.fill();
  for (let i = 0; i <= 22; i++) {
    const t = i / 22;
    const x = -B + t * W;
    // točka na krivulji krova
    const y = (1 - t) * (1 - t) * (roofY + h * 0.03) + 2 * (1 - t) * t * (roofY - h * 0.012) + t * t * (roofY + h * 0.03) + 6;
    ctx.fillStyle = "rgba(255,250,230,0.75)";
    ctx.fillRect(x - 1, y, 2, 1.2);
    const lg = ctx.createRadialGradient(x, y, 0, x, y, 9);
    lg.addColorStop(0, "rgba(255,250,230,0.18)");
    lg.addColorStop(1, "rgba(255,250,230,0)");
    ctx.fillStyle = lg;
    ctx.fillRect(x - 9, y - 9, 18, 18);
  }

  // LED reklamni panoi uz rub terena (brend): segmenti, svaki treći jači
  const [, ledY] = project(0, 36.5);
  const ledH = Math.max(5, h * 0.011);
  g = ctx.createLinearGradient(0, ledY - ledH, 0, ledY);
  g.addColorStop(0, "#0d1108");
  g.addColorStop(1, "#141a0a");
  ctx.fillStyle = g;
  ctx.fillRect(-B, ledY - ledH, W, ledH);
  {
    const seg = Math.max(26, w / 9);
    for (let x = -B, i = 0; x < w + B; x += seg, i++) {
      const strong = i % 3 === 1;
      ctx.fillStyle = strong ? "rgba(232,255,60,0.42)" : "rgba(232,255,60,0.13)";
      ctx.fillRect(x + 1, ledY - ledH + 1, seg - 2, ledH - 2);
      if (strong) {
        ctx.fillStyle = "rgba(10,10,10,0.55)";
        for (let k = 0; k < 4; k++) ctx.fillRect(x + seg * (0.22 + k * 0.15), ledY - ledH * 0.7, seg * 0.08, ledH * 0.4);
      }
    }
    ctx.fillStyle = "rgba(232,255,60,0.5)";
    ctx.fillRect(-B, ledY - ledH, W, 0.8);
  }

  // ── Teren ────────────────────────────────────────────────────────────
  const goalZ = 30;
  // Podloga do horizonta (izvan terena)
  g = ctx.createLinearGradient(0, baseY, 0, h + B);
  g.addColorStop(0, "#0b1a10");
  g.addColorStop(1, "#0a2414");
  ctx.fillStyle = g;
  ctx.fillRect(-B, ledY, W, h + B - ledY);

  // Pruge košnje (u dubinu)
  const zNear = 1.2;
  const zFar = goalZ + 4;
  const stripe = 3.6;
  let k = 0;
  for (let z = zNear; z < zFar; z += stripe, k++) {
    const z2 = Math.min(zFar, z + stripe);
    const [, y0] = project(0, z2);
    const [, y1] = project(0, z);
    ctx.fillStyle = k % 2 ? "#1a552f" : "#216639";
    ctx.fillRect(-B, y0, W, Math.min(h + B, y1) - y0 + 0.6);
  }

  // odsjaj LED panoa na travi ispred njih
  g = ctx.createLinearGradient(0, ledY, 0, ledY + h * 0.035);
  g.addColorStop(0, "rgba(232,255,60,0.10)");
  g.addColorStop(1, "rgba(232,255,60,0)");
  ctx.fillStyle = g;
  ctx.fillRect(-B, ledY, W, h * 0.035);

  // Svjetlo reflektora na travi + hladni rubovi
  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  g = ctx.createRadialGradient(cx, h * 0.78, 0, cx, h * 0.78, Math.max(w, h) * 0.62);
  g.addColorStop(0, "rgba(120,170,90,0.20)");
  g.addColorStop(0.5, "rgba(60,110,60,0.08)");
  g.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = g;
  ctx.fillRect(-B, baseY, W, h + B - baseY);
  ctx.restore();

  // Fina tekstura trave
  for (let i = 0; i < 900; i++) {
    const y = baseY + Math.pow(rnd(), 0.8) * (h + B - baseY);
    const x = rnd() * W - B;
    const depth = (y - horizon) / (h - horizon);
    ctx.fillStyle = rnd() < 0.5 ? `rgba(0,0,0,${0.05 + depth * 0.06})` : `rgba(180,230,150,${0.025 + depth * 0.03})`;
    ctx.fillRect(x, y, 1 + depth * 1.4, 1 + depth * 2.2);
  }

  // Linije terena
  const line = (pts: [number, number][], z: number) => {
    ctx.lineWidth = Math.max(0.6, Math.min(3, (w * 0.13) / z));
    ctx.beginPath();
    pts.forEach(([X, Z], i) => {
      const [x, y] = project(X, Z);
      if (i) ctx.lineTo(x, y);
      else ctx.moveTo(x, y);
    });
    ctx.stroke();
  };
  ctx.strokeStyle = "rgba(235,245,235,0.55)";
  ctx.lineJoin = "round";
  // Gol-aut linija
  line([[-60, goalZ], [60, goalZ]], goalZ);
  // Kazneni prostor
  line([[-20.15, goalZ], [-20.15, goalZ - 16.5], [20.15, goalZ - 16.5], [20.15, goalZ]], goalZ - 16.5);
  // Peterac
  line([[-9.16, goalZ], [-9.16, goalZ - 5.5], [9.16, goalZ - 5.5], [9.16, goalZ]], goalZ - 5.5);
  // Luk kaznenog prostora
  {
    const pz = goalZ - 11;
    const pts: [number, number][] = [];
    for (let a = -Math.PI; a <= 0.001; a += Math.PI / 40) {
      const X = Math.cos(a) * 9.15;
      const Z = pz + Math.sin(a) * 9.15;
      if (Z < goalZ - 16.5) pts.push([X, Z]);
    }
    if (pts.length > 1) line(pts, goalZ - 18);
    // bijela točka
    const [sx, sy] = project(0, pz);
    ctx.fillStyle = "rgba(235,245,235,0.6)";
    ctx.beginPath();
    ctx.ellipse(sx, sy, (w * 0.32) / pz, (w * 0.09) / pz, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  // ── Gol s mrežom ─────────────────────────────────────────────────────
  {
    const gw = 3.66;
    const gh = 2.44;
    const back = goalZ + 2.2;
    const backH = 1.6;
    const P = (X: number, Z: number, Y: number) => project(X, Z, Y);
    // mreža (lagana ispuna)
    ctx.fillStyle = "rgba(255,255,255,0.05)";
    ctx.beginPath();
    const fl = P(-gw, goalZ, gh), fr = P(gw, goalZ, gh), br = P(gw, back, backH), bl = P(-gw, back, backH);
    const blb = P(-gw, back, 0), brb = P(gw, back, 0);
    ctx.moveTo(...fl); ctx.lineTo(...fr); ctx.lineTo(...br); ctx.lineTo(...brb); ctx.lineTo(...blb); ctx.lineTo(...bl);
    ctx.closePath();
    ctx.fill();
    // linije mreže
    ctx.strokeStyle = "rgba(255,255,255,0.14)";
    ctx.lineWidth = 0.5;
    for (let i = 0; i <= 14; i++) {
      const X = -gw + (2 * gw * i) / 14;
      ctx.beginPath();
      ctx.moveTo(...P(X, back, 0));
      ctx.lineTo(...P(X, back, backH));
      ctx.lineTo(...P(X, goalZ, gh));
      ctx.stroke();
    }
    for (let j = 0; j <= 5; j++) {
      const Y = (backH * j) / 5;
      ctx.beginPath();
      ctx.moveTo(...P(-gw, back, Y));
      ctx.lineTo(...P(gw, back, Y));
      ctx.stroke();
    }
    // okvir
    ctx.strokeStyle = "rgba(250,252,255,0.92)";
    ctx.lineWidth = Math.max(1.2, (w * 0.16) / goalZ);
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(...P(-gw, goalZ, 0));
    ctx.lineTo(...P(-gw, goalZ, gh));
    ctx.lineTo(...P(gw, goalZ, gh));
    ctx.lineTo(...P(gw, goalZ, 0));
    ctx.stroke();
    ctx.strokeStyle = "rgba(250,252,255,0.35)";
    ctx.lineWidth = 0.8;
    ctx.beginPath();
    ctx.moveTo(...P(-gw, goalZ, gh)); ctx.lineTo(...P(-gw, back, backH)); ctx.lineTo(...P(-gw, back, 0));
    ctx.moveTo(...P(gw, goalZ, gh)); ctx.lineTo(...P(gw, back, backH)); ctx.lineTo(...P(gw, back, 0));
    ctx.stroke();
  }

  // ── Čunjevi za trening (brend boja) ──────────────────────────────────
  const cone = (X: number, Z: number) => {
    const [x, y] = project(X, Z);
    const s = (w * 0.9) / Z;
    const bw = s * 0.3;
    const ch = s * 0.34;
    // sjena
    ctx.fillStyle = "rgba(0,0,0,0.35)";
    ctx.beginPath();
    ctx.ellipse(x + bw * 0.25, y, bw * 0.9, bw * 0.25, 0, 0, Math.PI * 2);
    ctx.fill();
    const cg = ctx.createLinearGradient(x - bw / 2, 0, x + bw / 2, 0);
    cg.addColorStop(0, "#f2ff7a");
    cg.addColorStop(0.45, "#d9ee2c");
    cg.addColorStop(1, "#7f8c12");
    ctx.fillStyle = cg;
    ctx.beginPath();
    ctx.moveTo(x - bw / 2, y);
    ctx.lineTo(x - bw * 0.08, y - ch);
    ctx.lineTo(x + bw * 0.08, y - ch);
    ctx.lineTo(x + bw / 2, y);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = "rgba(0,0,0,0.25)";
    ctx.fillRect(x - bw * 0.3, y - ch * 0.45, bw * 0.6, Math.max(0.6, ch * 0.08));
  };
  for (const [X, Z] of [[-7.5, 12], [-4.5, 12.6], [-1.5, 13.2], [5.5, 10.5], [8.2, 9.8]] as const) cone(X, Z);

  // ── Reflektorski stupovi ─────────────────────────────────────────────
  const tower = (X: number, Z: number, H: number) => {
    const [bx, by] = project(X, Z, 0);
    const [tx, ty] = project(X, Z, H);
    const s = (w * 0.9) / Z;
    // stup
    ctx.strokeStyle = "#151b24";
    ctx.lineWidth = Math.max(1.5, s * 0.5);
    ctx.beginPath();
    ctx.moveTo(bx, by);
    ctx.lineTo(tx, ty);
    ctx.stroke();
    // glava reflektora
    const hw = s * 5.2;
    const hh = s * 3.1;
    ctx.save();
    ctx.translate(tx, ty - hh * 0.35);
    ctx.rotate(X < 0 ? 0.06 : -0.06);
    ctx.fillStyle = "#0b0e13";
    ctx.fillRect(-hw / 2 - 1.5, -hh / 2 - 1.5, hw + 3, hh + 3);
    const cols = 5;
    const rws = 3;
    const cw = hw / cols;
    const rh = hh / rws;
    for (let i = 0; i < cols; i++)
      for (let j = 0; j < rws; j++) {
        ctx.fillStyle = "#fffdf2";
        ctx.fillRect(-hw / 2 + i * cw + cw * 0.12, -hh / 2 + j * rh + rh * 0.14, cw * 0.76, rh * 0.72);
      }
    ctx.restore();
    // bloom
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    let bg = ctx.createRadialGradient(tx, ty - hh * 0.35, 0, tx, ty - hh * 0.35, hw * 1.6);
    bg.addColorStop(0, "rgba(255,252,235,0.9)");
    bg.addColorStop(0.3, "rgba(255,248,220,0.28)");
    bg.addColorStop(1, "rgba(255,248,220,0)");
    ctx.fillStyle = bg;
    ctx.fillRect(tx - hw * 1.6, ty - hh * 0.35 - hw * 1.6, hw * 3.2, hw * 3.2);
    bg = ctx.createRadialGradient(tx, ty, 0, tx, ty, w * 0.75);
    bg.addColorStop(0, "rgba(220,235,255,0.16)");
    bg.addColorStop(0.4, "rgba(200,220,255,0.05)");
    bg.addColorStop(1, "rgba(200,220,255,0)");
    ctx.fillStyle = bg;
    ctx.fillRect(tx - w * 0.75, ty - w * 0.75, w * 1.5, w * 1.5);
    // snop svjetla prema terenu
    const [px, py] = project(X * 0.15, 8);
    const beam = ctx.createLinearGradient(tx, ty, px, py);
    beam.addColorStop(0, "rgba(235,245,255,0.10)");
    beam.addColorStop(1, "rgba(235,245,255,0)");
    ctx.fillStyle = beam;
    ctx.beginPath();
    ctx.moveTo(tx - hw * 0.4, ty);
    ctx.lineTo(tx + hw * 0.4, ty);
    ctx.lineTo(px + w * 0.32, py);
    ctx.lineTo(px - w * 0.32, py);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  };
  tower(-24, 58, 36);
  tower(24, 58, 36);

  // ── Atmosfera ────────────────────────────────────────────────────────
  // Izmaglica na horizontu
  g = ctx.createLinearGradient(0, baseY - h * 0.06, 0, baseY + h * 0.05);
  g.addColorStop(0, "rgba(150,175,210,0)");
  g.addColorStop(0.5, "rgba(150,175,210,0.07)");
  g.addColorStop(1, "rgba(150,175,210,0)");
  ctx.fillStyle = g;
  ctx.fillRect(-B, baseY - h * 0.06, W, h * 0.11);

  // Vinjeta
  const vg = ctx.createRadialGradient(cx, h * 0.55, Math.min(w, h) * 0.25, cx, h * 0.55, Math.max(w, h) * 0.85);
  vg.addColorStop(0, "rgba(0,0,0,0)");
  vg.addColorStop(1, "rgba(0,0,0,0.62)");
  ctx.fillStyle = vg;
  ctx.fillRect(-B, -B, W, H);
  // Donji rub tamniji (dno igre, ispod "tla")
  g = ctx.createLinearGradient(0, h * 0.8, 0, h + B);
  g.addColorStop(0, "rgba(0,0,0,0)");
  g.addColorStop(1, "rgba(0,0,0,0.45)");
  ctx.fillStyle = g;
  ctx.fillRect(-B, h * 0.8, W, h * 0.2 + B);

  return c;
}

/**
 * Sjenčanje lopte (svjetlo odozgo-lijevo): crta se PREKO rotirajuće slike,
 * bez rotacije, pa lopta izgleda kao kugla pod reflektorima.
 */
export function paintBallShade(r: number, dpr: number): HTMLCanvasElement {
  const pad = 2;
  const size = (r + pad) * 2;
  const c = document.createElement("canvas");
  c.width = Math.max(1, Math.round(size * dpr));
  c.height = Math.max(1, Math.round(size * dpr));
  const ctx = c.getContext("2d")!;
  ctx.scale(dpr, dpr);
  ctx.translate(size / 2, size / 2);
  ctx.save();
  ctx.beginPath();
  ctx.arc(0, 0, r * 0.985, 0, Math.PI * 2);
  ctx.clip();
  // sjena prema dolje-desno
  let g = ctx.createRadialGradient(-r * 0.32, -r * 0.4, r * 0.1, -r * 0.1, -r * 0.12, r * 1.25);
  g.addColorStop(0, "rgba(0,0,0,0)");
  g.addColorStop(0.55, "rgba(0,0,0,0.06)");
  g.addColorStop(0.85, "rgba(4,10,20,0.38)");
  g.addColorStop(1, "rgba(4,10,20,0.62)");
  ctx.fillStyle = g;
  ctx.fillRect(-r, -r, r * 2, r * 2);
  // odsjaj
  g = ctx.createRadialGradient(-r * 0.36, -r * 0.44, 0, -r * 0.36, -r * 0.44, r * 0.62);
  g.addColorStop(0, "rgba(255,255,255,0.42)");
  g.addColorStop(0.45, "rgba(255,255,255,0.10)");
  g.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = g;
  ctx.fillRect(-r, -r, r * 2, r * 2);
  // hladni povratni sjaj s trave (dolje)
  g = ctx.createRadialGradient(r * 0.1, r * 0.95, 0, r * 0.1, r * 0.95, r * 0.7);
  g.addColorStop(0, "rgba(120,200,120,0.16)");
  g.addColorStop(1, "rgba(120,200,120,0)");
  ctx.fillStyle = g;
  ctx.fillRect(-r, -r, r * 2, r * 2);
  ctx.restore();
  // rubno svjetlo reflektora
  ctx.strokeStyle = "rgba(255,255,255,0.28)";
  ctx.lineWidth = Math.max(1, r * 0.035);
  ctx.beginPath();
  ctx.arc(0, 0, r * 0.975, Math.PI * 1.08, Math.PI * 1.62);
  ctx.stroke();
  return c;
}

/** Mekani sjaj (accent) — za iza kape i za savršeni udarac. */
export function paintGlow(radius: number, dpr: number, rgb: string, alpha = 0.5): HTMLCanvasElement {
  const c = document.createElement("canvas");
  c.width = c.height = Math.max(1, Math.round(radius * 2 * dpr));
  const ctx = c.getContext("2d")!;
  ctx.scale(dpr, dpr);
  const g = ctx.createRadialGradient(radius, radius, 0, radius, radius, radius);
  g.addColorStop(0, `rgba(${rgb},${alpha})`);
  g.addColorStop(0.35, `rgba(${rgb},${alpha * 0.4})`);
  g.addColorStop(1, `rgba(${rgb},0)`);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, radius * 2, radius * 2);
  return c;
}

// ── Dinamični slojevi (crtaju se jednom po veličini, petlja ih samo kopira) ──

export type SceneAnchors = {
  horizon: number;
  /** Gornji i donji rub tribine (za bljeskove fotoaparata). */
  standTop: number;
  standBottom: number;
  /** Središta glava reflektora i njihova veličina (za odbljesak). */
  towers: { x: number; y: number; s: number }[];
};

export function sceneAnchors(w: number, h: number): SceneAnchors {
  const { horizon, project } = sceneGeometry(w, h);
  const [, baseY] = project(0, 40);
  const standTop = horizon - h * 0.12;
  const towers = [-24, 24].map((X) => {
    const Z = 58;
    const [tx, ty] = project(X, Z, 36);
    const s = (w * 0.9) / Z;
    return { x: tx, y: ty - s * 3.1 * 0.35, s: s * 5.2 };
  });
  return { horizon, standTop: standTop + h * 0.035, standBottom: baseY - 2, towers };
}

/** Izmaglica u svjetlu reflektora — širok, ponovljiv pojas (širina 2w). */
export function paintFog(w: number, h: number, dpr: number): HTMLCanvasElement {
  const bandH = h * 0.34;
  const W = w * 2;
  const c = document.createElement("canvas");
  const k = Math.min(1, dpr) * 0.5; // pola rezolucije — ionako je mutno
  c.width = Math.max(1, Math.round(W * k));
  c.height = Math.max(1, Math.round(bandH * k));
  const ctx = c.getContext("2d")!;
  ctx.scale(k, k);
  const rnd = prng(77);
  for (let i = 0; i < 22; i++) {
    const x = rnd() * W;
    const y = bandH * (0.25 + rnd() * 0.5);
    const rx = w * (0.18 + rnd() * 0.3);
    const ry = bandH * (0.16 + rnd() * 0.22);
    const a = 0.035 + rnd() * 0.05;
    for (const ox of [-W, 0, W]) {
      const g = ctx.createRadialGradient(x + ox, y, 0, x + ox, y, rx);
      g.addColorStop(0, `rgba(190,210,235,${a})`);
      g.addColorStop(1, "rgba(190,210,235,0)");
      ctx.save();
      ctx.translate(x + ox, y);
      ctx.scale(1, ry / rx);
      ctx.translate(-(x + ox), -y);
      ctx.fillStyle = g;
      ctx.fillRect(x + ox - rx, y - rx, rx * 2, rx * 2);
      ctx.restore();
    }
  }
  return c;
}

/** Vlati trave u prvom planu (tamna silueta uz donji rub — dubina). */
export function paintGrassFront(w: number, stripH: number, dpr: number): HTMLCanvasElement {
  const c = document.createElement("canvas");
  c.width = Math.max(1, Math.round(w * dpr));
  c.height = Math.max(1, Math.round(stripH * dpr));
  const ctx = c.getContext("2d")!;
  ctx.scale(dpr, dpr);
  const rnd = prng(4242);
  const g = ctx.createLinearGradient(0, 0, 0, stripH);
  g.addColorStop(0, "rgba(4,14,8,0)");
  g.addColorStop(0.55, "rgba(4,14,8,0.55)");
  g.addColorStop(1, "rgba(3,9,5,0.92)");
  ctx.fillStyle = g;
  ctx.fillRect(0, stripH * 0.45, w, stripH * 0.55);
  const n = Math.round(w / 2.2);
  for (let i = 0; i < n; i++) {
    const x = rnd() * w;
    const bh = stripH * (0.3 + rnd() * 0.7);
    const bw = 1.4 + rnd() * 2.6;
    const lean = (rnd() - 0.5) * bh * 0.5;
    const shade = rnd();
    ctx.fillStyle = shade < 0.7 ? `rgba(6,20,11,${0.7 + rnd() * 0.3})` : `rgba(28,70,38,${0.5 + rnd() * 0.3})`;
    ctx.beginPath();
    ctx.moveTo(x - bw, stripH);
    ctx.quadraticCurveTo(x + lean * 0.3, stripH - bh * 0.6, x + lean, stripH - bh);
    ctx.quadraticCurveTo(x + lean * 0.3 + bw * 0.4, stripH - bh * 0.55, x + bw, stripH);
    ctx.closePath();
    ctx.fill();
  }
  // vrhovi vlati na svjetlu
  for (let i = 0; i < n * 0.25; i++) {
    const x = rnd() * w;
    const y = stripH * (0.25 + rnd() * 0.4);
    ctx.fillStyle = `rgba(160,220,150,${0.05 + rnd() * 0.08})`;
    ctx.fillRect(x, y, 1, 2 + rnd() * 3);
  }
  return c;
}

/** Anamorfni odbljesak reflektora (jezgra + vodoravna pruga). */
export function paintFlare(size: number, dpr: number): HTMLCanvasElement {
  const W = size * 4;
  const H = size;
  const c = document.createElement("canvas");
  c.width = Math.max(1, Math.round(W * dpr));
  c.height = Math.max(1, Math.round(H * dpr));
  const ctx = c.getContext("2d")!;
  ctx.scale(dpr, dpr);
  const cx = W / 2;
  const cy = H / 2;
  let g = ctx.createRadialGradient(cx, cy, 0, cx, cy, H / 2);
  g.addColorStop(0, "rgba(255,253,240,0.95)");
  g.addColorStop(0.25, "rgba(255,248,225,0.4)");
  g.addColorStop(1, "rgba(255,248,225,0)");
  ctx.fillStyle = g;
  ctx.fillRect(cx - H / 2, 0, H, H);
  ctx.save();
  ctx.translate(cx, cy);
  ctx.scale(1, 0.05);
  g = ctx.createRadialGradient(0, 0, 0, 0, 0, W / 2);
  g.addColorStop(0, "rgba(220,240,255,0.85)");
  g.addColorStop(0.4, "rgba(190,220,255,0.22)");
  g.addColorStop(1, "rgba(190,220,255,0)");
  ctx.fillStyle = g;
  ctx.fillRect(-W / 2, -W / 2, W, W);
  ctx.restore();
  return c;
}

/** Bijeli bljesak preko lopte u trenutku udarca. */
export function paintBallFlash(r: number, dpr: number): HTMLCanvasElement {
  const size = r * 2;
  const c = document.createElement("canvas");
  c.width = c.height = Math.max(1, Math.round(size * dpr));
  const ctx = c.getContext("2d")!;
  ctx.scale(dpr, dpr);
  const g = ctx.createRadialGradient(r, r * 1.35, 0, r, r * 1.1, r);
  g.addColorStop(0, "rgba(255,255,255,0.95)");
  g.addColorStop(0.55, "rgba(255,255,255,0.35)");
  g.addColorStop(1, "rgba(255,255,255,0)");
  ctx.beginPath();
  ctx.arc(r, r, r * 0.99, 0, Math.PI * 2);
  ctx.fillStyle = g;
  ctx.fill();
  return c;
}
