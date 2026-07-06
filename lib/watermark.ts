import "server-only";

import sharp from "sharp";

// Tiled diagonal "DRESIFY" watermark — baked into the file so the raw image is
// protected (matches the site's diagonal overlay look).
const TILE = Buffer.from(
  `<svg xmlns="http://www.w3.org/2000/svg" width="300" height="200">
     <text x="8" y="120" font-family="Arial, Helvetica, sans-serif" font-weight="700" font-size="30"
       fill="rgba(255,255,255,0.34)" stroke="rgba(0,0,0,0.14)" stroke-width="0.6"
       transform="rotate(-28 150 100)">DRESIFY</text>
   </svg>`
);

// Applies the watermark and returns a buffer in the same format + the extension.
export async function watermark(input: Buffer): Promise<{ buffer: Buffer; ext: string }> {
  const base = sharp(input, { failOn: "none" }).rotate(); // respect EXIF orientation
  const meta = await base.metadata();
  const composed = base.composite([{ input: TILE, tile: true, blend: "over" }]);

  if (meta.format === "png") return { buffer: await composed.png().toBuffer(), ext: "png" };
  if (meta.format === "webp") return { buffer: await composed.webp({ quality: 86 }).toBuffer(), ext: "webp" };
  return { buffer: await composed.jpeg({ quality: 86 }).toBuffer(), ext: "jpg" };
}
