// Generira statičnu masku ambijentalnog svjetla za film-hero: public/film/amb-{desktop,mobile}.webp
// Alfa maske = "albedo" betona iz same ploče (svjetlina piksela, normirana na svijetli dio zida):
// svijetle ploče betona prime više obojenog svjetla, fuge i tamni kutovi ostaju tamni → svjetlo
// izgleda kao reflektor na betonu (svjetlo × albedo), a ne kao ravna obojena magla.
// U istu masku su upečeni i izrezi: otvori u sobe (dresovi iza zida nikad nisu osvijetljeni) i
// neonski natpis DRESIFY (svjetlo ga ne smije dodatno "napuhati"). Rubovi izreza blago omekšani.
// Maska je statična (jedna slika po kadru) → po kadru nema nikakvog dodatnog posla.
// Pokreni: node scripts/film-amb-mask.mjs
import { readFileSync } from "node:fs";
import sharp from "sharp";

const plate = JSON.parse(readFileSync("public/film/plate.json", "utf8"));
const HALF = 0.5; // pola rezolucije ploče — svjetlo je ionako mekano

for (const v of ["desktop", "mobile"]) {
  const P = plate[v];
  const [pw, ph] = P.size;
  const w = Math.round(pw * HALF);
  const h = Math.round(ph * HALF);
  const src = P.files.plate.find((f) => f.endsWith(".webp"));
  // svjetlina u punoj rezoluciji → prosjek 2×2 + mekani box (float, bez stepenica 8-bitne tamne ploče)
  const full = await sharp(`public${src}`).greyscale().raw().toBuffer({ resolveWithObject: true });
  const FW = full.info.width;
  const lum0 = new Float32Array(w * h);
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      const X = Math.min(FW - 2, x * 2);
      const Y = Math.min(full.info.height - 2, y * 2);
      const d = full.data;
      lum0[y * w + x] = (d[Y * FW + X] + d[Y * FW + X + 1] + d[(Y + 1) * FW + X] + d[(Y + 1) * FW + X + 1]) / 4;
    }
  const lum = new Float32Array(w * h);
  const R = 2;
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      let s = 0, n = 0;
      for (let dy = -R; dy <= R; dy++)
        for (let dx = -R; dx <= R; dx++) {
          const yy = y + dy, xx = x + dx;
          if (yy < 0 || yy >= h || xx < 0 || xx >= w) continue;
          s += lum0[yy * w + xx];
          n++;
        }
      lum[y * w + x] = s / n;
    }

  // referentna svjetlina: 92. percentil zida između otvora, ispod natpisa, iznad poda
  const [lx0, , lx1, ly1] = P.logo.bbox;
  const xl = Math.max(...P.portals[0].frontQuad.map((p) => p[0])) * HALF;
  const xr = Math.min(...P.portals[1].frontQuad.map((p) => p[0])) * HALF;
  const yf = P.floorLineY * HALF;
  const vals = [];
  for (let y = Math.round(ly1 * HALF + 20); y < yf - 4; y += 2) for (let x = Math.round(xl + 8); x < xr - 8; x += 2) vals.push(lum[y * w + x]);
  vals.sort((a, b) => a - b);
  const ref = Math.max(24, vals[Math.floor(vals.length * 0.92)]);

  // izrezi (otvori + natpis) kao SVG → zamućeno → množi se s albedom
  const f = (n) => (n * HALF).toFixed(1);
  let cut = "";
  for (const q of P.portals) cut += `<path d="M${q.frontQuad.map((p) => `${f(p[0])} ${f(Math.min(p[1], P.floorLineY))}`).join("L")}Z"/>`;
  const pad = 18;
  cut += `<rect x="${f(lx0 - pad)}" y="${f(P.logo.bbox[1] - pad)}" width="${f(lx1 - lx0 + 2 * pad)}" height="${f(ly1 - P.logo.bbox[1] + 2 * pad)}"/>`;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}"><rect width="100%" height="100%" fill="#fff"/><g fill="#000">${cut}</g></svg>`;
  const { data: keep } = await sharp(Buffer.from(svg)).blur(v === "desktop" ? 4 : 3).greyscale().raw().toBuffer({ resolveWithObject: true });

  const out = Buffer.alloc(w * h * 4);
  for (let y = 0; y < h; y++) {
    const floor = y >= yf;
    for (let x = 0; x < w; x++) {
      const i = y * w + x;
      let a = Math.min(1, lum[i] / ref) ** 0.85;
      // pod (na mobitelu sjajno staklo): tamniji od zida, ali svjetlo se na njemu vidi kao odsjaj → donja granica
      if (floor) a = Math.max(a, 0.5);
      a *= keep[i] / 255;
      const o = i * 4;
      out[o] = out[o + 1] = out[o + 2] = 255;
      out[o + 3] = Math.round(a * 255);
    }
  }
  const file = `public/film/amb-${v}.webp`;
  await sharp(out, { raw: { width: w, height: h, channels: 4 } }).webp({ quality: 70, alphaQuality: 100, effort: 6 }).toFile(file);
  console.log(file, `${w}×${h}`, "ref", ref);
}
