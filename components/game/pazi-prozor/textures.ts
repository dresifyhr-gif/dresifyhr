// PAZI PROZOR! — sve teksture se slikaju na canvasu (nema datoteka).
// "Pečeno" osvjetljenje: sumrak, sunce nisko s lijeve strane, desna fasada
// dobije toplo svjetlo iznad sjene lijeve zgrade, tlo je u hladnoj sjeni.

import { BASE_H, FLOOR_H, WINDOW } from "./physics";

export function rng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function cv(w: number, h: number) {
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  const ctx = c.getContext("2d")!;
  return { c, ctx };
}

function grain(ctx: CanvasRenderingContext2D, w: number, h: number, r: () => number, amount: number, count: number) {
  for (let i = 0; i < count; i++) {
    const v = r() < 0.5 ? 0 : 255;
    ctx.fillStyle = `rgba(${v},${v},${v},${amount * r()})`;
    const s = 1 + r() * 2.2;
    ctx.fillRect(r() * w, r() * h, s, s);
  }
}

// ── Fasade ─────────────────────────────────────────────────────────────
export type FacadeSpec = {
  /** širina i visina fasade u metrima */
  w: number;
  h: number;
  floors: number;
  /** razmak prozorskih osi (m) i pomak prve osi od lijevog ruba (m) */
  bay: number;
  offset: number;
  seed: number;
  /** "warm" = desna fasada (sunce gore), "cool" = lijeva (sjena), "back" = stražnja */
  light: "warm" | "cool" | "back";
  /** boje parapeta balkona */
  panels: string[];
  /** udio upaljenih prozora */
  lit: number;
  /** prozor koji se ne slika (bakin — poseban mesh): u metrima od lijevog ruba, red */
  skip?: { u: number; row: number };
  /** prizemlje: "doors" | "garages" */
  ground: "doors" | "garages" | "shop";
  /** pravac granice sjene na toploj fasadi: visina sjene na lijevom i desnom kraju (m) */
  shadow?: [number, number];
};

const PPM = 40; // piksela po metru

export function paintFacade(spec: FacadeSpec) {
  const W = Math.round(spec.w * PPM);
  const H = Math.round(spec.h * PPM);
  const { c, ctx } = cv(W, H);
  const r = rng(spec.seed);
  const Y = (m: number) => H - m * PPM; // metri od tla → piksel

  // osnovni beton
  const base =
    spec.light === "warm" ? ["#8a7f78", "#6f6672"] : spec.light === "cool" ? ["#5b5d6e", "#45475a"] : ["#6c6574", "#4f4a5c"];
  const g = ctx.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, base[0]);
  g.addColorStop(1, base[1]);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);

  // panelne fuge
  ctx.strokeStyle = "rgba(20,18,30,0.22)";
  ctx.lineWidth = 2;
  for (let f = 0; f <= spec.floors; f++) {
    const y = Y(BASE_H + f * FLOOR_H);
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(W, y);
    ctx.stroke();
  }
  for (let x = spec.offset - spec.bay / 2; x < spec.w; x += spec.bay) {
    ctx.beginPath();
    ctx.moveTo(x * PPM, 0);
    ctx.lineTo(x * PPM, Y(BASE_H + FLOOR_H));
    ctx.stroke();
  }

  // mrlje od kiše ispod prozora
  for (let i = 0; i < 70; i++) {
    const x = r() * W;
    const y = r() * H * 0.8;
    const lg = ctx.createLinearGradient(0, y, 0, y + 60 + r() * 120);
    lg.addColorStop(0, "rgba(25,20,35,0.16)");
    lg.addColorStop(1, "rgba(25,20,35,0)");
    ctx.fillStyle = lg;
    ctx.fillRect(x, y, 3 + r() * 10, 60 + r() * 120);
  }

  // prizemlje (tamniji sokl)
  const gh = BASE_H + FLOOR_H;
  const sg = ctx.createLinearGradient(0, Y(gh), 0, H);
  sg.addColorStop(0, "rgba(30,26,40,0.25)");
  sg.addColorStop(1, "rgba(15,12,22,0.62)");
  ctx.fillStyle = sg;
  ctx.fillRect(0, Y(gh), W, gh * PPM);

  // prozori
  const bays: number[] = [];
  for (let u = spec.offset; u < spec.w - 0.6; u += spec.bay) bays.push(u);
  for (let row = 0; row < spec.floors; row++) {
    for (let bi = 0; bi < bays.length; bi++) {
      const u = bays[bi];
      const y0 = BASE_H + row * FLOOR_H + 0.55;
      const wy = 1.3;
      const ww = 1.2;
      const x = (u - ww / 2) * PPM;
      const y = Y(y0 + wy);
      const isSkip = spec.skip && row === spec.skip.row && Math.abs(spec.skip.u - u) < 0.3;
      if (row === 0) {
        if (spec.ground === "garages" && bi % 2 === 0) {
          paintGarage(ctx, x - 10, Y(BASE_H + 2.1), ww * PPM + 20, 2.1 * PPM, r);
          continue;
        }
        if (spec.ground === "doors" && bi % 4 === 1) {
          paintDoor(ctx, x, Y(2.25), ww * PPM, 2.25 * PPM, r);
          continue;
        }
        if (spec.ground === "shop" && bi % 3 === 0) {
          paintShop(ctx, x - 14, Y(2.3), ww * PPM + 28, 2.0 * PPM, r);
          continue;
        }
      }
      if (isSkip) {
        // okvir ostaje (mesh prozora stoji ispred), samo tamna rupa
        ctx.fillStyle = "#1a1622";
        ctx.fillRect(x - 3, y - 3, ww * PPM + 6, wy * PPM + 6);
        continue;
      }
      const lit = r() < spec.lit * (row === 0 ? 0.5 : 1);
      paintWindow(ctx, x, y, ww * PPM, wy * PPM, lit, r);
      // balkonski parapet na dijelu prozora (ne u prizemlju)
      if (row > 0 && (bi + row * 3 + spec.seed) % 3 === 0) {
        const col = spec.panels[(bi + row) % spec.panels.length];
        const px = x - 0.25 * PPM;
        const pw = (ww + 0.5) * PPM;
        const py = Y(BASE_H + row * FLOOR_H + 1.0);
        ctx.fillStyle = col;
        ctx.fillRect(px, py, pw, 1.0 * PPM);
        ctx.fillStyle = "rgba(255,255,255,0.08)";
        ctx.fillRect(px, py, pw, 3);
        ctx.fillStyle = "rgba(0,0,0,0.3)";
        ctx.fillRect(px, py + PPM - 4, pw, 4);
        // ploča balkona
        ctx.fillStyle = "rgba(20,16,28,0.55)";
        ctx.fillRect(px - 4, py + PPM, pw + 8, 6);
      } else if (row > 0 && r() < 0.14) {
        // klima uređaj
        const ax = x + ww * PPM + 6;
        const ay = y + wy * PPM * 0.55;
        ctx.fillStyle = "#c9c4c0";
        ctx.fillRect(ax, ay, 26, 18);
        ctx.fillStyle = "rgba(0,0,0,0.35)";
        ctx.beginPath();
        ctx.arc(ax + 13, ay + 9, 6, 0, Math.PI * 2);
        ctx.fill();
      } else if (row > 0 && r() < 0.1) {
        // satelitska antena
        const ax = x - 18;
        const ay = y + 14;
        ctx.fillStyle = "#d8d4d0";
        ctx.beginPath();
        ctx.ellipse(ax, ay, 11, 13, -0.4, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = "rgba(0,0,0,0.25)";
        ctx.beginPath();
        ctx.ellipse(ax + 2, ay + 1, 7, 9, -0.4, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }

  // grafit u prizemlju stražnje zgrade
  if (spec.light === "back") paintGraffiti(ctx, W * 0.3, Y(1.35), r);

  // vijenac na vrhu
  ctx.fillStyle = "rgba(20,16,26,0.5)";
  ctx.fillRect(0, 0, W, 10);
  ctx.fillStyle = "rgba(255,255,255,0.06)";
  ctx.fillRect(0, 10, W, 3);

  // pečeno svjetlo
  if (spec.light === "warm" && spec.shadow) {
    // sunce gornji dio, sjena lijeve zgrade dijagonalno
    const [a, b] = spec.shadow;
    ctx.save();
    ctx.globalCompositeOperation = "overlay";
    ctx.beginPath();
    ctx.moveTo(0, Y(a));
    ctx.lineTo(W, Y(b));
    ctx.lineTo(W, 0);
    ctx.lineTo(0, 0);
    ctx.closePath();
    const sun = ctx.createLinearGradient(0, 0, W, H * 0.4);
    sun.addColorStop(0, "rgba(255,150,70,0.85)");
    sun.addColorStop(1, "rgba(255,120,60,0.6)");
    ctx.fillStyle = sun;
    ctx.fill();
    ctx.restore();
    ctx.save();
    ctx.globalCompositeOperation = "soft-light";
    ctx.beginPath();
    ctx.moveTo(0, Y(a));
    ctx.lineTo(W, Y(b));
    ctx.lineTo(W, 0);
    ctx.lineTo(0, 0);
    ctx.closePath();
    ctx.fillStyle = "rgba(255,190,120,0.55)";
    ctx.fill();
    ctx.restore();
    // mekani rub sjene
    ctx.save();
    ctx.strokeStyle = "rgba(255,140,80,0.18)";
    ctx.lineWidth = 16;
    ctx.beginPath();
    ctx.moveTo(0, Y(a) + 6);
    ctx.lineTo(W, Y(b) + 6);
    ctx.stroke();
    ctx.restore();
  }
  // AO pri dnu + hladni ton
  const ao = ctx.createLinearGradient(0, H - 2.4 * PPM, 0, H);
  ao.addColorStop(0, "rgba(10,8,20,0)");
  ao.addColorStop(1, "rgba(10,8,20,0.55)");
  ctx.fillStyle = ao;
  ctx.fillRect(0, H - 2.4 * PPM, W, 2.4 * PPM);
  if (spec.light !== "warm") {
    ctx.save();
    ctx.globalCompositeOperation = "multiply";
    ctx.fillStyle = spec.light === "cool" ? "rgba(150,160,215,1)" : "rgba(185,165,205,1)";
    ctx.fillRect(0, 0, W, H);
    ctx.restore();
    // topli odsjaj neba na vrhu
    const top = ctx.createLinearGradient(0, 0, 0, H * 0.35);
    top.addColorStop(0, "rgba(255,150,110,0.16)");
    top.addColorStop(1, "rgba(255,150,110,0)");
    ctx.fillStyle = top;
    ctx.fillRect(0, 0, W, H * 0.35);
  }
  // upaljeni prozori svijetle i u sjeni — ponovno preko multiply sloja
  grain(ctx, W, H, r, 0.05, Math.round((W * H) / 90));
  return c;
}

function paintWindow(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, lit: boolean, r: () => number) {
  // okvir
  ctx.fillStyle = "rgba(225,220,214,0.75)";
  ctx.fillRect(x - 3, y - 3, w + 6, h + 6);
  if (lit) {
    const g = ctx.createLinearGradient(0, y, 0, y + h);
    const warm = r();
    g.addColorStop(0, warm > 0.3 ? "#ffd892" : "#cfe0ff");
    g.addColorStop(1, warm > 0.3 ? "#f09a4c" : "#8ea6d8");
    ctx.fillStyle = g;
    ctx.fillRect(x, y, w, h);
    // zavjese / rolete
    const k = r();
    if (k < 0.4) {
      ctx.fillStyle = "rgba(120,50,30,0.35)";
      ctx.fillRect(x, y, w * 0.28, h);
      ctx.fillRect(x + w * 0.72, y, w * 0.28, h);
    } else if (k < 0.7) {
      ctx.fillStyle = "rgba(90,50,30,0.35)";
      for (let i = 0; i < 7; i++) ctx.fillRect(x, y + (i / 7) * h * 0.5, w, 2);
      ctx.fillRect(x, y, w, h * 0.32);
    }
  } else {
    const g = ctx.createLinearGradient(0, y, 0, y + h);
    g.addColorStop(0, "#3a3a62");
    g.addColorStop(1, "#1d1c33");
    ctx.fillStyle = g;
    ctx.fillRect(x, y, w, h);
    // odsjaj neba
    ctx.fillStyle = "rgba(255,170,140,0.13)";
    ctx.beginPath();
    ctx.moveTo(x + w * 0.15, y);
    ctx.lineTo(x + w * 0.45, y);
    ctx.lineTo(x + w * 0.1, y + h);
    ctx.lineTo(x - w * 0.2, y + h);
    ctx.closePath();
    ctx.fill();
    if (r() < 0.35) {
      // spuštena roleta
      ctx.fillStyle = "#6d6670";
      ctx.fillRect(x, y, w, h * (0.4 + r() * 0.6));
      ctx.fillStyle = "rgba(0,0,0,0.18)";
      for (let i = 0; i < 10; i++) ctx.fillRect(x, y + i * 5, w, 1);
    }
  }
  // križ okvira
  ctx.fillStyle = "rgba(225,220,214,0.8)";
  ctx.fillRect(x + w / 2 - 2, y, 4, h);
  // klupčica
  ctx.fillStyle = "rgba(0,0,0,0.35)";
  ctx.fillRect(x - 6, y + h + 3, w + 12, 4);
}

function paintDoor(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: () => number) {
  ctx.fillStyle = "#2a2430";
  ctx.fillRect(x - 6, y - 6, w + 12, h + 6);
  const g = ctx.createLinearGradient(0, y, 0, y + h);
  g.addColorStop(0, "#ffdca0");
  g.addColorStop(1, "#c77a3c");
  ctx.fillStyle = g;
  ctx.fillRect(x + 4, y + 4, w - 8, h * 0.55);
  ctx.fillStyle = "#4c3a36";
  ctx.fillRect(x + 4, y + 4 + h * 0.55, w - 8, h * 0.45 - 4);
  ctx.fillStyle = "rgba(255,255,255,0.15)";
  ctx.fillRect(x + w / 2 - 1, y + 4, 2, h - 8);
  // nadstrešnica
  ctx.fillStyle = "#1e1a24";
  ctx.fillRect(x - 18, y - 16, w + 36, 10);
  void r;
}

function paintGarage(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: () => number) {
  const tone = ["#5d6a73", "#6e5f55", "#4f5d52", "#6a5a6a"][Math.floor(r() * 4)];
  ctx.fillStyle = tone;
  ctx.fillRect(x, y, w, h);
  ctx.fillStyle = "rgba(0,0,0,0.22)";
  for (let i = 0; i < 9; i++) ctx.fillRect(x, y + (i / 9) * h, w, 2);
  ctx.fillStyle = "rgba(0,0,0,0.3)";
  ctx.fillRect(x, y, w, 5);
  ctx.fillStyle = "rgba(160,70,40,0.25)";
  ctx.fillRect(x + w * r(), y + h * 0.6, 14, h * 0.4);
}

function paintShop(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: () => number) {
  ctx.fillStyle = "#231d27";
  ctx.fillRect(x, y, w, h);
  ctx.fillStyle = "#7d6a52";
  ctx.fillRect(x, y, w, h * 0.7);
  ctx.fillStyle = "rgba(0,0,0,0.25)";
  for (let i = 0; i < 12; i++) ctx.fillRect(x, y + (i / 12) * h * 0.7, w, 2);
  void r;
}

function paintGraffiti(ctx: CanvasRenderingContext2D, x: number, y: number, r: () => number) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(-0.06);
  ctx.font = "900 46px Arial Black, Arial, sans-serif";
  ctx.lineJoin = "round";
  ctx.lineWidth = 10;
  ctx.strokeStyle = "rgba(15,12,20,0.75)";
  ctx.strokeText("KVART", 0, 0);
  ctx.fillStyle = "rgba(232,255,60,0.78)";
  ctx.fillText("KVART", 0, 0);
  ctx.lineWidth = 3;
  ctx.strokeStyle = "rgba(255,255,255,0.35)";
  ctx.beginPath();
  ctx.moveTo(-12, 14);
  ctx.quadraticCurveTo(80, 30 + r() * 10, 190, 12);
  ctx.stroke();
  ctx.restore();
}

// ── Tlo dvorišta ───────────────────────────────────────────────────────
export type GroundSpec = {
  x0: number;
  x1: number;
  z0: number;
  z1: number;
  car: { x: number; z: number; yaw: number; len: number; wid: number };
  dumpster: { x: number; z: number; yaw: number; w: number; d: number };
  lamp: { x: number; z: number };
  goalZ: number;
  goalHalf: number;
  bench: { x: number; z: number; w: number; d: number };
};

const GPPM = 32;

export function paintGround(s: GroundSpec) {
  const Wm = s.x1 - s.x0;
  const Hm = s.z1 - s.z0;
  const W = Math.round(Wm * GPPM);
  const H = Math.round(Hm * GPPM);
  const { c, ctx } = cv(W, H);
  const r = rng(7);
  // u = (x - x0)/Wm, v: z0 (daleko) gore → z1 dolje
  const X = (x: number) => (x - s.x0) * GPPM;
  const Z = (z: number) => (z - s.z0) * GPPM;

  ctx.fillStyle = "#3f3b49";
  ctx.fillRect(0, 0, W, H);
  // zakrpe asfalta
  for (let i = 0; i < 26; i++) {
    ctx.fillStyle = r() < 0.5 ? "rgba(30,28,38,0.35)" : "rgba(90,84,96,0.18)";
    const w = 40 + r() * 160;
    const h = 30 + r() * 120;
    ctx.save();
    ctx.translate(r() * W, r() * H);
    ctx.rotate((r() - 0.5) * 0.4);
    ctx.fillRect(-w / 2, -h / 2, w, h);
    ctx.restore();
  }
  grain(ctx, W, H, r, 0.12, Math.round((W * H) / 7));
  // pukotine
  ctx.strokeStyle = "rgba(18,16,24,0.55)";
  ctx.lineWidth = 1.6;
  for (let i = 0; i < 22; i++) {
    let x = r() * W;
    let y = r() * H;
    ctx.beginPath();
    ctx.moveTo(x, y);
    for (let k = 0; k < 7; k++) {
      x += (r() - 0.5) * 50;
      y += (r() - 0.5) * 50;
      ctx.lineTo(x, y);
    }
    ctx.stroke();
  }

  // stare parkirne crte uz lijevi zid
  ctx.strokeStyle = "rgba(230,225,210,0.16)";
  ctx.lineWidth = 4;
  for (let z = s.z0 + 5; z < s.z1 - 4; z += 2.6) {
    ctx.beginPath();
    ctx.moveTo(X(s.x0), Z(z));
    ctx.lineTo(X(s.x0 + 2.2), Z(z));
    ctx.stroke();
  }

  // kredom: gol-crta između ruksaka i školica
  ctx.strokeStyle = "rgba(255,255,255,0.55)";
  ctx.lineWidth = 3.5;
  ctx.setLineDash([12, 7]);
  ctx.beginPath();
  ctx.moveTo(X(-s.goalHalf), Z(s.goalZ));
  ctx.lineTo(X(s.goalHalf), Z(s.goalZ));
  ctx.stroke();
  ctx.setLineDash([]);
  paintHopscotch(ctx, X(-4.6), Z(4.2), GPPM);
  // kredom krug oko mjesta lopte
  ctx.strokeStyle = "rgba(255,255,255,0.35)";
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(X(0), Z(7), 0.45 * GPPM, 0, Math.PI * 2);
  ctx.stroke();

  // sjene (pečene)
  const blob = (x: number, z: number, rx: number, rz: number, yaw: number, a: number) => {
    ctx.save();
    ctx.translate(X(x), Z(z));
    ctx.rotate(-yaw);
    ctx.scale(rx * GPPM, rz * GPPM);
    const g = ctx.createRadialGradient(0, 0, 0, 0, 0, 1);
    g.addColorStop(0, `rgba(8,6,16,${a})`);
    g.addColorStop(0.6, `rgba(8,6,16,${a * 0.75})`);
    g.addColorStop(1, "rgba(8,6,16,0)");
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(0, 0, 1, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  };
  // auto: duga sjena prema desno-naprijed (sunce s lijeva iza)
  blob(s.car.x + 0.5, s.car.z + 0.3, s.car.len * 0.66, s.car.wid * 0.8, s.car.yaw, 0.75);
  blob(s.car.x, s.car.z, s.car.len * 0.56, s.car.wid * 0.6, s.car.yaw, 0.6);
  blob(s.dumpster.x + 0.25, s.dumpster.z, s.dumpster.w * 0.75, s.dumpster.d * 0.62, s.dumpster.yaw, 0.7);
  blob(s.bench.x - 0.05, s.bench.z, s.bench.w * 0.8, s.bench.d * 0.6, 0, 0.55);
  // ruksaci
  blob(-s.goalHalf - 0.2, s.goalZ, 0.4, 0.3, 0, 0.6);
  blob(s.goalHalf + 0.2, s.goalZ, 0.4, 0.3, 0, 0.6);

  // AO uz zidove
  const edge = (x0: number, y0: number, x1: number, y1: number, w: number, h: number) => {
    const g = ctx.createLinearGradient(x0, y0, x1, y1);
    g.addColorStop(0, "rgba(6,4,14,0.6)");
    g.addColorStop(1, "rgba(6,4,14,0)");
    ctx.fillStyle = g;
    ctx.fillRect(Math.min(x0, x1), Math.min(y0, y1), w, h);
  };
  const aw = 1.4 * GPPM;
  edge(0, 0, aw, 0, aw, H);
  edge(W, 0, W - aw, 0, aw, H);
  edge(0, 0, 0, aw, W, aw);

  // topli krug svjetla ispod lampe
  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  const lg = ctx.createRadialGradient(X(s.lamp.x - 1.2), Z(s.lamp.z), 0, X(s.lamp.x - 1.2), Z(s.lamp.z), 5.5 * GPPM);
  lg.addColorStop(0, "rgba(255,170,80,0.42)");
  lg.addColorStop(0.45, "rgba(255,140,60,0.16)");
  lg.addColorStop(1, "rgba(255,120,50,0)");
  ctx.fillStyle = lg;
  ctx.fillRect(0, 0, W, H);
  // odsjaj tople fasade na tlu uz desni zid (sunce)
  const rg = ctx.createLinearGradient(W, 0, W - 3.2 * GPPM, 0);
  rg.addColorStop(0, "rgba(255,130,70,0.12)");
  rg.addColorStop(1, "rgba(255,130,70,0)");
  ctx.fillStyle = rg;
  ctx.fillRect(W - 3.2 * GPPM, 0, 3.2 * GPPM, H);
  ctx.restore();

  // lišće
  for (let i = 0; i < 90; i++) {
    ctx.fillStyle = ["rgba(150,90,40,0.6)", "rgba(110,70,40,0.6)", "rgba(170,120,50,0.5)"][i % 3];
    ctx.save();
    const nearWall = r() < 0.6;
    const x = nearWall ? (r() < 0.5 ? r() * 1.6 * GPPM : W - r() * 1.6 * GPPM) : r() * W;
    ctx.translate(x, r() * H);
    ctx.rotate(r() * 6);
    ctx.fillRect(-3, -1.5, 6, 3);
    ctx.restore();
  }
  return c;
}

function paintHopscotch(ctx: CanvasRenderingContext2D, x: number, y: number, ppm: number) {
  const s = 0.62 * ppm;
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(0.08);
  ctx.strokeStyle = "rgba(255,240,230,0.42)";
  ctx.lineWidth = 3;
  const cells: [number, number][] = [
    [0, 0],
    [0, -1],
    [-0.5, -2],
    [0.5, -2],
    [0, -3],
    [-0.5, -4],
    [0.5, -4],
    [0, -5]
  ];
  ctx.font = `600 ${Math.round(s * 0.5)}px Arial, sans-serif`;
  ctx.fillStyle = "rgba(255,240,230,0.4)";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  cells.forEach(([cx, cy], i) => {
    ctx.strokeRect(cx * s - s / 2, cy * s - s / 2, s, s);
    ctx.fillText(String(i + 1), cx * s, cy * s);
  });
  ctx.beginPath();
  ctx.arc(0, -6 * s + s * 0.1, s * 0.6, Math.PI, 0);
  ctx.stroke();
  ctx.restore();
}

// ── Nebo (sumrak) ──────────────────────────────────────────────────────
export function paintSky() {
  const W = 1024;
  const H = 512;
  const { c, ctx } = cv(W, H);
  const r = rng(3);
  const g = ctx.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, "#0f1230");
  g.addColorStop(0.28, "#2a2550");
  g.addColorStop(0.4, "#5b3d6a");
  g.addColorStop(0.47, "#b8607a");
  g.addColorStop(0.5, "#ff9a62");
  g.addColorStop(0.53, "#3a2c44");
  g.addColorStop(1, "#1a1626");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);
  // sunčev sjaj (iza lijevo-straga)
  const sunU = 0.62 * W;
  const sg = ctx.createRadialGradient(sunU, H * 0.5, 0, sunU, H * 0.5, H * 0.42);
  sg.addColorStop(0, "rgba(255,200,120,0.75)");
  sg.addColorStop(0.3, "rgba(255,140,90,0.35)");
  sg.addColorStop(1, "rgba(255,120,90,0)");
  ctx.fillStyle = sg;
  ctx.fillRect(0, 0, W, H);
  // oblaci — tanke trake
  for (let i = 0; i < 18; i++) {
    const y = H * (0.3 + r() * 0.16);
    const x = r() * W;
    const w = 80 + r() * 260;
    const cg = ctx.createLinearGradient(x, 0, x + w, 0);
    const a = 0.12 + r() * 0.2;
    cg.addColorStop(0, "rgba(255,150,130,0)");
    cg.addColorStop(0.5, `rgba(255,${150 + Math.round(r() * 40)},${120 + Math.round(r() * 30)},${a})`);
    cg.addColorStop(1, "rgba(255,150,130,0)");
    ctx.fillStyle = cg;
    ctx.fillRect(x, y, w, 2 + r() * 5);
  }
  // zvijezde
  for (let i = 0; i < 110; i++) {
    ctx.fillStyle = `rgba(255,255,255,${0.2 + r() * 0.6})`;
    const s = r() < 0.1 ? 2 : 1;
    ctx.fillRect(r() * W, r() * H * 0.3, s, s);
  }
  // silueta grada na horizontu
  ctx.fillStyle = "#211a2c";
  let x = 0;
  while (x < W) {
    const w = 10 + r() * 34;
    const h = 6 + r() * 30 + (r() < 0.08 ? 30 : 0);
    ctx.fillRect(x, H * 0.5 - h, w, h + 4);
    for (let k = 0; k < 6; k++) {
      if (r() < 0.45) {
        ctx.fillStyle = r() < 0.7 ? "rgba(255,200,120,0.75)" : "rgba(200,220,255,0.6)";
        ctx.fillRect(x + 2 + r() * (w - 4), H * 0.5 - h + 3 + r() * (h - 4), 1.5, 1.5);
        ctx.fillStyle = "#211a2c";
      }
    }
    x += w + r() * 4;
  }
  // dizalica
  ctx.strokeStyle = "#211a2c";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(W * 0.2, H * 0.5);
  ctx.lineTo(W * 0.2, H * 0.36);
  ctx.lineTo(W * 0.27, H * 0.36);
  ctx.moveTo(W * 0.2, H * 0.36);
  ctx.lineTo(W * 0.18, H * 0.37);
  ctx.stroke();
  ctx.fillStyle = "#ff4a3a";
  ctx.fillRect(W * 0.2 - 1, H * 0.36 - 3, 3, 3);
  return c;
}

// ── Bakin prozor ───────────────────────────────────────────────────────
/** Prozor 1.25 x 1.45 m + okvir; `mood`: 0 mirno, 1 ljuta (ruka gore), 2 razbijeno + ljuta */
export function paintGrandmaWindow(mood: 0 | 1 | 2) {
  const W = 256;
  const H = Math.round((W * WINDOW.h) / WINDOW.w);
  const { c, ctx } = cv(W, H);
  const pad = 12;
  ctx.fillStyle = "#e9e1d6";
  ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = "#c8beb3";
  ctx.fillRect(4, 4, W - 8, H - 8);
  const x = pad;
  const y = pad;
  const w = W - pad * 2;
  const h = H - pad * 2 - 10;
  const g = ctx.createLinearGradient(0, y, 0, y + h);
  g.addColorStop(0, "#ffe6b0");
  g.addColorStop(0.6, "#ffbf6e");
  g.addColorStop(1, "#e58a44");
  ctx.fillStyle = g;
  ctx.fillRect(x, y, w, h);
  // luster sjaj
  const lg = ctx.createRadialGradient(x + w * 0.62, y + h * 0.18, 2, x + w * 0.62, y + h * 0.18, w * 0.6);
  lg.addColorStop(0, "rgba(255,255,230,0.8)");
  lg.addColorStop(1, "rgba(255,255,230,0)");
  ctx.fillStyle = lg;
  ctx.fillRect(x, y, w, h);
  // zavjese s čipkom
  ctx.fillStyle = "rgba(255,250,240,0.55)";
  ctx.fillRect(x, y, w * 0.22, h);
  ctx.fillRect(x + w * 0.78, y, w * 0.22, h);
  ctx.fillStyle = "rgba(255,255,255,0.35)";
  for (let i = 0; i < 9; i++) {
    ctx.beginPath();
    ctx.arc(x + w * 0.11, y + 12 + i * (h / 9), 4, 0, Math.PI * 2);
    ctx.arc(x + w * 0.89, y + 12 + i * (h / 9), 4, 0, Math.PI * 2);
    ctx.fill();
  }
  // baka — silueta
  ctx.save();
  ctx.fillStyle = "#2a1a22";
  const bx = x + w * 0.46 + (mood ? -6 : 0);
  const by = y + h * 0.42 + (mood ? -8 : 0);
  // punđa
  ctx.beginPath();
  ctx.arc(bx + 2, by - 34, 13, 0, Math.PI * 2);
  ctx.fill();
  // glava
  ctx.beginPath();
  ctx.ellipse(bx, by - 8, 21, 25, 0, 0, Math.PI * 2);
  ctx.fill();
  // ramena + marama
  ctx.beginPath();
  ctx.moveTo(bx - 58, y + h);
  ctx.quadraticCurveTo(bx - 52, by + 22, bx - 12, by + 18);
  ctx.lineTo(bx + 12, by + 18);
  ctx.quadraticCurveTo(bx + 52, by + 22, bx + 58, y + h);
  ctx.closePath();
  ctx.fill();
  if (mood) {
    // podignuta ruka s kuhačom
    ctx.beginPath();
    ctx.moveTo(bx + 40, by + 34);
    ctx.quadraticCurveTo(bx + 66, by + 10, bx + 64, by - 30);
    ctx.lineTo(bx + 52, by - 30);
    ctx.quadraticCurveTo(bx + 52, by + 6, bx + 28, by + 28);
    ctx.closePath();
    ctx.fill();
    ctx.beginPath();
    ctx.arc(bx + 58, by - 34, 9, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillRect(bx + 55, by - 82, 6, 50);
    ctx.beginPath();
    ctx.ellipse(bx + 58, by - 88, 10, 14, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
  // tegla s cvijećem na prozorskoj dasci
  ctx.fillStyle = "#8a3a2a";
  ctx.fillRect(x + w * 0.12, y + h - 22, 26, 22);
  ctx.fillStyle = "#3e6a3a";
  ctx.beginPath();
  ctx.arc(x + w * 0.12 + 13, y + h - 28, 15, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#e0405a";
  ctx.beginPath();
  ctx.arc(x + w * 0.12 + 7, y + h - 34, 4, 0, Math.PI * 2);
  ctx.arc(x + w * 0.12 + 19, y + h - 30, 4, 0, Math.PI * 2);
  ctx.fill();

  if (mood === 2) {
    // razbijeno staklo: velika rupa nazubljenih rubova + pukotine do okvira
    const hx = x + w * 0.62;
    const hy = y + h * 0.5;
    const r = rng(11);
    const pts: [number, number][] = [];
    for (let i = 0; i < 18; i++) {
      const a = (i / 18) * Math.PI * 2;
      const rr = (i % 2 ? 22 : 44) + r() * 26;
      pts.push([hx + Math.cos(a) * rr * 0.9, hy + Math.sin(a) * rr]);
    }
    ctx.save();
    ctx.beginPath();
    pts.forEach(([px, py], i) => (i ? ctx.lineTo(px, py) : ctx.moveTo(px, py)));
    ctx.closePath();
    ctx.fillStyle = "rgba(40,16,10,0.72)";
    ctx.fill();
    ctx.strokeStyle = "rgba(255,255,255,0.95)";
    ctx.lineWidth = 3;
    ctx.stroke();
    ctx.restore();
    ctx.strokeStyle = "rgba(255,255,255,0.9)";
    ctx.lineWidth = 2.4;
    for (let i = 0; i < 18; i++) {
      const [sx, sy] = pts[i];
      const a = Math.atan2(sy - hy, sx - hx);
      let px = sx;
      let py = sy;
      ctx.beginPath();
      ctx.moveTo(px, py);
      for (let k = 0; k < 4; k++) {
        px += Math.cos(a + (r() - 0.5) * 0.9) * (14 + r() * 26);
        py += Math.sin(a + (r() - 0.5) * 0.9) * (14 + r() * 26);
        ctx.lineTo(px, py);
      }
      ctx.stroke();
    }
    // krhotine na dasci
    ctx.fillStyle = "rgba(220,240,255,0.9)";
    for (let i = 0; i < 9; i++) {
      const px = x + r() * w;
      ctx.beginPath();
      ctx.moveTo(px, y + h - 2);
      ctx.lineTo(px + 6 + r() * 6, y + h - 2);
      ctx.lineTo(px + 3, y + h - 8 - r() * 8);
      ctx.closePath();
      ctx.fill();
    }
  } else {
    // odsjaj stakla
    ctx.fillStyle = "rgba(255,255,255,0.14)";
    ctx.beginPath();
    ctx.moveTo(x + w * 0.55, y);
    ctx.lineTo(x + w * 0.75, y);
    ctx.lineTo(x + w * 0.35, y + h);
    ctx.lineTo(x + w * 0.15, y + h);
    ctx.closePath();
    ctx.fill();
  }
  // križ okvira
  ctx.fillStyle = "#e9e1d6";
  ctx.fillRect(x + w / 2 - 3, y, 6, h);
  // daska
  ctx.fillStyle = "#b8ada0";
  ctx.fillRect(0, H - 14, W, 14);
  return c;
}

// ── Dres (za trup djeteta) ─────────────────────────────────────────────
export type KitPattern = "solid" | "stripes" | "checker" | "hoops" | "sash";
export type Kit = {
  id: string;
  name: string;
  pattern: KitPattern;
  a: string;
  b: string;
  number: string;
  shorts: string;
  socks: string;
};

/** Lijeva polovica = uzorak (prednja/bočne strane), desna = leđa s brojem. */
export function paintJersey(kit: Kit) {
  const S = 256;
  const { c, ctx } = cv(S * 2, S);
  for (let half = 0; half < 2; half++) {
    ctx.save();
    ctx.translate(half * S, 0);
    ctx.beginPath();
    ctx.rect(0, 0, S, S);
    ctx.clip();
    ctx.fillStyle = kit.a;
    ctx.fillRect(0, 0, S, S);
    if (kit.pattern === "stripes") {
      ctx.fillStyle = kit.b;
      for (let i = 0; i < 5; i++) ctx.fillRect(i * (S / 5) + S / 10, 0, S / 10, S);
    } else if (kit.pattern === "checker") {
      ctx.fillStyle = kit.b;
      const n = 6;
      for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) if ((i + j) % 2) ctx.fillRect(i * (S / n), j * (S / n), S / n, S / n);
    } else if (kit.pattern === "hoops") {
      ctx.fillStyle = kit.b;
      for (let i = 0; i < 4; i++) ctx.fillRect(0, i * (S / 4) + S / 8, S, S / 8);
    } else if (kit.pattern === "sash") {
      ctx.fillStyle = kit.b;
      ctx.beginPath();
      ctx.moveTo(-20, S * 0.15);
      ctx.lineTo(S * 0.25, -20);
      ctx.lineTo(S + 20, S * 0.85);
      ctx.lineTo(S * 0.75, S + 20);
      ctx.closePath();
      ctx.fill();
    }
    // ovratnik
    ctx.fillStyle = "rgba(0,0,0,0.18)";
    ctx.fillRect(0, 0, S, 10);
    if (half === 1) {
      // broj na leđima
      ctx.font = `700 ${Math.round(S * 0.52)}px "Arial Black", Arial, sans-serif`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.lineJoin = "round";
      ctx.lineWidth = 12;
      ctx.strokeStyle = kit.pattern === "solid" ? "rgba(0,0,0,0.12)" : kit.a;
      ctx.strokeText(kit.number, S / 2, S * 0.56);
      ctx.fillStyle = numberColor(kit);
      ctx.fillText(kit.number, S / 2, S * 0.56);
    }
    // nabori tkanine
    const fg = ctx.createLinearGradient(0, 0, S, 0);
    fg.addColorStop(0, "rgba(0,0,0,0.12)");
    fg.addColorStop(0.5, "rgba(255,255,255,0.05)");
    fg.addColorStop(1, "rgba(0,0,0,0.12)");
    ctx.fillStyle = fg;
    ctx.fillRect(0, 0, S, S);
    ctx.restore();
  }
  return c;
}

function numberColor(kit: Kit) {
  if (kit.id === "dresify") return "#e8ff3c";
  if (kit.id === "hrvatska") return "#1d3f8f";
  if (kit.id === "real-madrid") return "#c6a456";
  if (kit.id === "inter-miami") return "#111111";
  return "#ffffff";
}

// ── Lopta ──────────────────────────────────────────────────────────────
export function paintBall() {
  const W = 512;
  const H = 256;
  const { c, ctx } = cv(W, H);
  ctx.fillStyle = "#f4f1ea";
  ctx.fillRect(0, 0, W, H);
  // klasični peterokuti (približno, equirect)
  const spots: [number, number][] = [
    [0.5, 0.06], [0.5, 0.94],
    [0.0, 0.36], [0.2, 0.36], [0.4, 0.36], [0.6, 0.36], [0.8, 0.36], [1.0, 0.36],
    [0.1, 0.64], [0.3, 0.64], [0.5, 0.64], [0.7, 0.64], [0.9, 0.64]
  ];
  ctx.fillStyle = "#1b1b22";
  for (const [u, v] of spots) {
    const cx = u * W;
    const cy = v * H;
    const rx = (v < 0.15 || v > 0.85 ? 0.5 : 0.042) * W;
    const ry = 0.085 * H;
    ctx.beginPath();
    for (let i = 0; i < 5; i++) {
      const a = (i / 5) * Math.PI * 2 - Math.PI / 2;
      const px = cx + Math.cos(a) * rx;
      const py = cy + Math.sin(a) * ry;
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.fill();
  }
  // šavovi
  ctx.strokeStyle = "rgba(0,0,0,0.18)";
  ctx.lineWidth = 2;
  for (let i = 0; i < 10; i++) {
    ctx.beginPath();
    ctx.moveTo((i / 10) * W + W / 20, 0.36 * H + 18);
    ctx.lineTo((i / 10) * W + W / 20, 0.64 * H - 18);
    ctx.stroke();
  }
  return c;
}

// ── Sitnice ────────────────────────────────────────────────────────────
export function paintBlob() {
  const S = 128;
  const { c, ctx } = cv(S, S);
  const g = ctx.createRadialGradient(S / 2, S / 2, 0, S / 2, S / 2, S / 2);
  g.addColorStop(0, "rgba(0,0,0,0.85)");
  g.addColorStop(0.5, "rgba(0,0,0,0.5)");
  g.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, S, S);
  return c;
}

export function paintDot() {
  const S = 64;
  const { c, ctx } = cv(S, S);
  const g = ctx.createRadialGradient(S / 2, S / 2, 0, S / 2, S / 2, S / 2);
  g.addColorStop(0, "rgba(255,255,255,1)");
  g.addColorStop(0.45, "rgba(255,255,255,0.9)");
  g.addColorStop(0.7, "rgba(255,255,255,0.25)");
  g.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, S, S);
  return c;
}

export function paintGlow() {
  const S = 128;
  const { c, ctx } = cv(S, S);
  const g = ctx.createRadialGradient(S / 2, S / 2, 0, S / 2, S / 2, S / 2);
  g.addColorStop(0, "rgba(255,235,190,1)");
  g.addColorStop(0.15, "rgba(255,200,120,0.6)");
  g.addColorStop(0.5, "rgba(255,150,70,0.12)");
  g.addColorStop(1, "rgba(255,140,60,0)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, S, S);
  return c;
}
