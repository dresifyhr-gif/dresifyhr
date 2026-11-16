import { NextResponse } from "next/server";
import { put } from "@vercel/blob";
import sharp from "sharp";

import { verifyIngestKey } from "@/lib/media";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_BYTES = 4 * 1024 * 1024; // Vercel funkcija prima ~4,5 MB

// Upload jedne gotove grafike od agenta → Blob (javni JPEG koji Instagram može dohvatiti).
// POST tijelo = sirovi JPEG/PNG; ?runDate=2026-11-17&name=palermo-1994-1
// Authorization: Bearer <MEDIA_INGEST_SECRET>. Vrati { ok, url }.
export async function POST(request: Request) {
  if (!verifyIngestKey(request)) return NextResponse.json({ ok: false, message: "Neispravan ključ." }, { status: 401 });
  if (!process.env.BLOB_READ_WRITE_TOKEN) return NextResponse.json({ ok: false, message: "Blob nije spojen." }, { status: 500 });

  const u = new URL(request.url);
  const runDate = /^\d{4}-\d{2}-\d{2}$/.test(u.searchParams.get("runDate") || "") ? u.searchParams.get("runDate")! : null;
  const name = (u.searchParams.get("name") || "").toLowerCase().replace(/[^a-z0-9-]/g, "-").replace(/-+/g, "-").slice(0, 80);
  if (!runDate || !name) return NextResponse.json({ ok: false, message: "Treba runDate i name." }, { status: 400 });

  const buf = Buffer.from(await request.arrayBuffer());
  if (buf.length === 0 || buf.length > MAX_BYTES) return NextResponse.json({ ok: false, message: "Slika je prazna ili veća od 4 MB." }, { status: 413 });

  // Uvijek JPEG (Instagram prima samo JPEG), najviše 1440 px širine, bez metapodataka.
  let jpeg: Buffer;
  try {
    jpeg = await sharp(buf).rotate().resize({ width: 1440, withoutEnlargement: true }).jpeg({ quality: 90, mozjpeg: true }).toBuffer();
  } catch {
    return NextResponse.json({ ok: false, message: "Datoteka nije ispravna slika." }, { status: 400 });
  }

  const blob = await put(`media/${runDate}/${name}.jpg`, jpeg, { access: "public", addRandomSuffix: true, contentType: "image/jpeg" });
  return NextResponse.json({ ok: true, url: blob.url });
}
