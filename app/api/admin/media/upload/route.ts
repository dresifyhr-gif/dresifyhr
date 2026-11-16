import { NextResponse } from "next/server";
import { put } from "@vercel/blob";
import sharp from "sharp";

import { requireAction } from "@/lib/admin-auth";

export const runtime = "nodejs";

const MAX_BYTES = 4 * 1024 * 1024; // Vercel funkcija prima ~4,5 MB

// "Učitaj svoju" — Igor ručno ubaci sliku za nacrt. Uvijek spremamo JPEG
// (Instagram prima samo JPEG), najviše 1440 px širine.
export async function POST(request: Request) {
  if (!(await requireAction("owner"))) return NextResponse.json({ ok: false, message: "Samo vlasnik." }, { status: 403 });
  if (!process.env.BLOB_READ_WRITE_TOKEN) return NextResponse.json({ ok: false, message: "Blob nije spojen." }, { status: 500 });

  const form = await request.formData().catch(() => null);
  const file = form?.get("file");
  if (!(file instanceof File)) return NextResponse.json({ ok: false, message: "Nema datoteke." }, { status: 400 });
  if (!file.type.startsWith("image/")) return NextResponse.json({ ok: false, message: "To nije slika." }, { status: 400 });
  if (file.size > MAX_BYTES) return NextResponse.json({ ok: false, message: "Slika je veća od 4 MB. Smanji je pa probaj ponovno." }, { status: 413 });

  let jpeg: Buffer;
  try {
    jpeg = await sharp(Buffer.from(await file.arrayBuffer()))
      .rotate()
      .resize({ width: 1440, withoutEnlargement: true })
      .jpeg({ quality: 90, mozjpeg: true })
      .toBuffer();
  } catch {
    return NextResponse.json({ ok: false, message: "Ne mogu pročitati sliku (probaj JPG ili PNG)." }, { status: 400 });
  }
  const blob = await put(`media/upload/${Date.now()}.jpg`, jpeg, { access: "public", addRandomSuffix: true, contentType: "image/jpeg" });
  return NextResponse.json({ ok: true, url: blob.url });
}
