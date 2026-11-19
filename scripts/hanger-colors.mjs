// Generira lib/data/hanger-colors.ts: boja ambijentalnog svjetla za SVAKU sliku na vješalici
// (isti ključevi kao lib/data/hanger-hooks.ts). Iz piksela tkanine: prozirna pozadina, crna
// vješalica i gotovo crni/sivi pikseli se preskaču; dominantne zasićene boje se traže
// histogramom nijanse (težina = zasićenost² × √svjetlina × površina), pa se vrh i drugi vrh
// (dovoljno daleko po nijansi i dovoljno jak) uzmu kao 1–2 boje svjetla (lijevo / desno).
// Bijeli / slabo zasićeni dresovi → hladno bijelo; crni → neutralno hladno sivo.
// Izlaz je BOJA SVJETLA (puna svjetlina, umjerena zasićenost), ne boja tkanine.
// Pokreni: node scripts/hanger-colors.mjs
import { readFileSync, writeFileSync } from "node:fs";
import sharp from "sharp";

const keys = [...readFileSync("lib/data/hanger-hooks.ts", "utf8").matchAll(/^\s*"(\/ormar\/[^"]+\.webp)":/gm)].map((m) => m[1]);

const COOL_WHITE = "#cad9ff"; // hladno bijelo: dovoljno plavkasto da se čita kao hladno svjetlo, ne samo svjetliji zid
const COOL_GREY = "#a9b2c2";
const BINS = 36; // 10° po košu
// ručne ispravke (provjereno okom na kontaktnom listu svih slika sa šipke, 18.11.) — ključ = ime datoteke,
// vrijedi za leđa i prednju stranu (ne za hlačice). Tipične greške automatike: boja uzeta s broja/imena/
// sponzora/grba umjesto s tkanine, pastelne boje ispod praga zasićenosti (→ krivo "hladno bijelo"),
// tirkiz umjesto zelene. Prva boja = glavna (lijevo), druga = naglasak (desno).
const W = COOL_WHITE;
const G = COOL_GREY;
const HR = ["#ff5965", W]; // hrvatski šahovnica: crveno + bijelo (ne plavi broj)
const MINT = "#a3ffe0";
const OVERRIDES = {
  "inter-miami-suarez-rozi.webp": ["#ff8cc5"],
  "barcelona-yamal-bijelo-rozi.webp": [W, "#ff8cc5"],
  "real-madrid-bellingham-nr5-tamnoplavi-gostujuci-2024-25.webp": ["#7fa4ff"], // drugi vrh = limeta s manžeta
  "argentina-messi-nr10--jakna.webp": [G], // crna jakna; žuto je samo tisak MESSI 10
  "atletico-griezmann.webp": ["#ff595f", W], // plavo je broj
  "engleska-bellingham-nr10-bijeli-domaci-komplet.webp": [W], // tamnoplavi obrub/broj nije plava lampa
  "paris-saint-germain-dembele-nr10-bijeli-2025-26.webp": [W], // plavo je iz broja (prijelaz plavo-roza)
  "barcelona-komplet--jakna.webp": ["#7c9bff", W], // žuto je grb
  "barcelona-komplet-2--jakna.webp": ["#ff9cc0"], // pastelno roza, ne koralj
  "barcelona-raphinha-zeleni.webp": ["#e5ff61"], // plavo je grb/sponzor
  "barcelona-yamal-nr10-crno-crveni-champions-league-komplet.webp": ["#ff6577"], // žuto je broj
  "brazil-neymar-domaci.webp": ["#ffe359", "#5aff62"], // zeleni obrub kao ostali Brazili
  "brazil-neymar-jr-nr10-plavi-jesus-edicija.webp": ["#8ccaff", "#ffe059"], // tkanina plava, žuto je broj
  "brazil-pele-jesus-edition.webp": ["#ffa6d2", "#ffe859"], // roza uzorak, žuto je broj
  "brazil-pele-jesus.webp": ["#ffa6d2", "#ffe859"],
  "cloud-sky-blue-set--jakna.webp": ["#8ccbff"],
  "cotton-wreath-pink-set--jakna.webp": ["#ffa6c9"],
  "cotton-wreath-sky-blue-set--jakna.webp": ["#9fd0ff"],
  "spray-white-set--jakna.webp": ["#ffa6c9"], // roza s bijelim oblacima
  "engleska-kane-nr9-ljubicasti-alternativni.webp": ["#ac7aff"], // žuto je broj
  "francuska-mbappe-nr10-mint-zeleni.webp": [MINT], // narančasto je broj
  "francuska-mbappe-zeleni-sp-2026.webp": [MINT],
  "francuska-olise-zeleni-sp-2026.webp": [MINT],
  "hrvatska-baturina-nr16-domaci-2026.webp": HR,
  "hrvatska-gvardiol-2026.webp": HR,
  "hrvatska-modric-2026.webp": HR,
  "hrvatska-modric-nr10-crveni-rukav-2026.webp": HR,
  "hrvatska-perisic.webp": HR,
  "hrvatska-stanisic-2026.webp": HR,
  "hrvatska-vuskovic-nr22-sp-2026.webp": HR,
  "hrvatska-modric-komplet.webp": HR,
  "inter-miami-suarez-nr9-crni-gostujuci.webp": [G, "#ff8cc5"],
  "italija-prazan.webp": ["#5cffc8"], // tamnozelena, ne cijan
  "milan-maldini-gucci.webp": ["#ffe4bf"], // krem = toplo bijelo
  "njemacka-neuer-nr1-roza-vratarski-2022.webp": ["#ff888b"], // plavo je detalj
  "portugal-ronaldo-2026.webp": ["#8cffe6", "#ff5969"], // metvica + crveni broj
  "portugal-ronaldo-nr7--jakna.webp": ["#ff5960", "#5aff7a"], // zelena, ne tirkiz
  "portugal-ronaldo-nr7-bijelo-zeleni-gostujuci.webp": [W, "#6bffa0"],
  "portugal-ronaldo-komplet.webp": ["#ff5963", "#5aff7a"],
  "spanjolska-komplet--jakna.webp": ["#ff5964", "#ffd659"],
};

function rgb2hsv(r, g, b) {
  const mx = Math.max(r, g, b);
  const mn = Math.min(r, g, b);
  const d = mx - mn;
  let h = 0;
  if (d > 0) {
    if (mx === r) h = ((g - b) / d) % 6;
    else if (mx === g) h = (b - r) / d + 2;
    else h = (r - g) / d + 4;
    h *= 60;
    if (h < 0) h += 360;
  }
  return [h, mx ? d / mx : 0, mx];
}
function hsv2rgb(h, s, v) {
  const c = v * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = v - c;
  const [r, g, b] = h < 60 ? [c, x, 0] : h < 120 ? [x, c, 0] : h < 180 ? [0, c, x] : h < 240 ? [0, x, c] : h < 300 ? [x, 0, c] : [c, 0, x];
  return [r + m, g + m, b + m];
}
const hex = ([r, g, b]) => "#" + [r, g, b].map((v) => Math.round(Math.max(0, Math.min(1, v)) * 255).toString(16).padStart(2, "0")).join("");
const hueDist = (a, b) => {
  const d = Math.abs(a - b) % 360;
  return d > 180 ? 360 - d : d;
};

async function analyse(src) {
  const { data, info } = await sharp(`public${src}`).ensureAlpha().resize({ width: 200 }).raw().toBuffer({ resolveWithObject: true });
  const { width: w, height: h } = info;
  const hist = new Float64Array(BINS);
  const sum = Array.from({ length: BINS }, () => [0, 0, 0, 0]); // Σh·w (preko vektora), Σs·w, Σv·w, Σw
  const vec = Array.from({ length: BINS }, () => [0, 0]);
  let fabric = 0;
  let lum = 0;
  let colourful = 0;
  for (let y = Math.round(h * 0.08); y < h; y++) {
    // gornjih ~8 % = kuka i rame vješalice (crna žica) — preskoči
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4;
      if (data[i + 3] < 220) continue;
      const r = data[i] / 255;
      const g = data[i + 1] / 255;
      const b = data[i + 2] / 255;
      const [hh, s, v] = rgb2hsv(r, g, b);
      if (v < 0.09) continue; // crna vješalica / duboke sjene
      fabric++;
      lum += 0.2126 * r + 0.7152 * g + 0.0722 * b;
      if (s < 0.28 || v < 0.16) continue;
      colourful++;
      const wt = s * s * Math.sqrt(v);
      const bin = Math.floor(hh / (360 / BINS)) % BINS;
      hist[bin] += wt;
      const a = (hh * Math.PI) / 180;
      vec[bin][0] += Math.cos(a) * wt;
      vec[bin][1] += Math.sin(a) * wt;
      sum[bin][1] += s * wt;
      sum[bin][2] += v * wt;
      sum[bin][3] += wt;
    }
  }
  if (!fabric) return { c: [COOL_GREY], k: "black" };
  const meanL = lum / fabric;
  const colFrac = colourful / fabric;
  // glatki histogram (kružno, 3 koša) → vrhovi
  const sm = Array.from(hist, (_, i) => hist[(i + BINS - 1) % BINS] * 0.5 + hist[i] + hist[(i + 1) % BINS] * 0.5);
  const total = hist.reduce((a, b) => a + b, 0);
  if (colFrac < 0.14 || total < fabric * 0.012) return meanL > 0.42 ? { c: [COOL_WHITE], k: "white" } : { c: [COOL_GREY], k: "black" };

  const peak = (exclude) => {
    let best = -1;
    for (let i = 0; i < BINS; i++) {
      if (exclude != null && hueDist(i * 10 + 5, exclude) < 55) continue;
      if (best < 0 || sm[i] > sm[best]) best = i;
    }
    return best;
  };
  const colourAt = (bin) => {
    // ponderirana sredina koševa ±1 oko vrha (nijansa kao vektor)
    let cx = 0, cy = 0, ws = 0, ss = 0, vs = 0;
    for (let d = -1; d <= 1; d++) {
      const j = (bin + d + BINS) % BINS;
      cx += vec[j][0];
      cy += vec[j][1];
      ss += sum[j][1];
      vs += sum[j][2];
      ws += sum[j][3];
    }
    let hh = (Math.atan2(cy, cx) * 180) / Math.PI;
    if (hh < 0) hh += 360;
    const s = ss / Math.max(1e-9, ws);
    // plavo-ljubičasti rub plave (≈222°–250°, npr. Barcelona #597fff) na toplom betonu uz screen izgleda lila →
    // svjetlo se pomakne prema čistoj plavoj (~216°); prava ljubičasta (Real, Kane alternativni) ostaje
    if (hh >= 222 && hh < 250) hh = 216 + (hh - 222) * 0.35;
    // bordo/granat (≈341°–352°, Barcelona) kao svjetlo na betonu izgleda roza → prema crvenoj (~352°–355°);
    // prave roze (Real roza ≈336°, Inter Miami ≈326°) ostaju
    if (hh >= 341 && hh < 352 && s > 0.75) hh = 352 + (hh - 341) * 0.27;
    // boja SVJETLA: puna svjetlina, zasićenost umjerena (gel, ne neon)
    const sl = Math.max(0.45, Math.min(0.65, s * 0.8));
    return { h: hh, rgb: hsv2rgb(hh, sl, 1) };
  };
  const p1 = peak(null);
  const c1 = colourAt(p1);
  const p2 = peak(c1.h);
  const out = [hex(c1.rgb)];
  // drugi komplet boja: dovoljno jak (≥ 3 % prvog vrha — i uski obrub kluba, npr. zeleni na Brazilu) i daleko po nijansi
  if (p2 >= 0 && sm[p2] >= sm[p1] * 0.03 && sm[p2] > total * 0.025) {
    const c2 = colourAt(p2);
    if (hueDist(c1.h, c2.h) >= 55) out.push(hex(c2.rgb));
  }
  // pretežno bijeli dres s malo boje (npr. Real s detaljima): hladno bijelo + boja detalja tek kao drugo svjetlo
  if (colFrac < 0.3 && meanL > 0.5) return { c: [COOL_WHITE, out[0]], k: "white" };
  return { c: out, k: "colour" };
}

const rows = [];
let n = 0;
for (const src of keys) {
  let r;
  const ov = !src.startsWith("/ormar/hlacice/") && OVERRIDES[src.split("/").pop()];
  try {
    r = ov ? { c: ov } : await analyse(src);
  } catch (e) {
    console.warn("preskačem", src, e.message);
    continue;
  }
  rows.push(`  ${JSON.stringify(src)}: ${JSON.stringify(r.c)},`);
  n++;
}
const ts = `// AUTOMATSKI GENERIRANO (scripts/hanger-colors.mjs) — ne uređuj ručno.
// Boja ambijentalnog svjetla po slici na vješalici (isti ključevi kao hanger-hooks): 1–2 boje
// SVJETLA (puna svjetlina, umjerena zasićenost) iz dominantnih zasićenih boja tkanine.
// Dvije boje = lijeva / desna strana svjetla (npr. Barcelona plavo + bordo, Brazil žuto + zeleno).
// Bijeli / slabo zasićeni dresovi → hladno bijelo (${COOL_WHITE}); crni → hladno sivo (${COOL_GREY}).
export type HangerColor = [string] | [string, string];
/** hladno bijelo (bijeli dresovi) i hladno sivo (crni) — svjetlo se za njih prigušuje drugačije nego za boje */
export const AMB_WHITE = "${COOL_WHITE}";
export const AMB_GREY = "${COOL_GREY}";

export const HANGER_COLORS: Record<string, HangerColor> = {
${rows.join("\n")}
};
`;
writeFileSync("lib/data/hanger-colors.ts", ts);
console.log(`hanger-colors: ${n} slika`);
