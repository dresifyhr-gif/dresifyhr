// Žongliranje — statična scena (noćni trening na stadionu) i sjenčanje lopte.
// Sve se crta jednom po veličini u offscreen canvas; petlja ga samo kopira.

export const SCENE_BLEED = 14;

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

  // LED traka uz rub terena (brend)
  const [, ledY] = project(0, 36.5);
  g = ctx.createLinearGradient(0, ledY - 6, 0, ledY);
  g.addColorStop(0, "#0d1108");
  g.addColorStop(1, "#141a0a");
  ctx.fillStyle = g;
  ctx.fillRect(-B, ledY - 6, W, 6);
  ctx.fillStyle = "rgba(232,255,60,0.55)";
  ctx.fillRect(-B, ledY - 5, W, 1);
  ctx.fillStyle = "rgba(232,255,60,0.12)";
  ctx.fillRect(-B, ledY - 4, W, 3);

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
