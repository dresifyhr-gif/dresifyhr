import { NextResponse } from "next/server";
import { generateClientTokenFromReadWriteToken } from "@vercel/blob/client";

import { verifyIngestKey } from "@/lib/media";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Video (Reel, TikTok/Shorts) je prevelik za tijelo Vercel funkcije (~4,5 MB), pa
// lokalni alat dobije KRATKOTRAJNI token samo za jednu putanju i samo za MP4 do
// 200 MB, i šalje video izravno u Blob. Glavni Blob ključ nikad ne napušta server.
// POST { runDate: "2026-11-17", name: "reel-boksic-tiktok-duga" } → { ok, token, pathname }
export async function POST(request: Request) {
  if (!verifyIngestKey(request)) return NextResponse.json({ ok: false, message: "Neispravan ključ." }, { status: 401 });
  const rw = process.env.BLOB_READ_WRITE_TOKEN;
  if (!rw) return NextResponse.json({ ok: false, message: "Blob nije spojen." }, { status: 500 });

  const body = await request.json().catch(() => ({}));
  const runDate = typeof body?.runDate === "string" && /^\d{4}-\d{2}-\d{2}$/.test(body.runDate) ? body.runDate : null;
  const name = String(body?.name || "").toLowerCase().replace(/[^a-z0-9-]/g, "-").replace(/-+/g, "-").slice(0, 80);
  if (!runDate || !name) return NextResponse.json({ ok: false, message: "Treba runDate i name." }, { status: 400 });

  const pathname = `media/${runDate}/${name}.mp4`;
  const token = await generateClientTokenFromReadWriteToken({
    token: rw,
    pathname,
    allowedContentTypes: ["video/mp4"],
    maximumSizeInBytes: 200 * 1024 * 1024,
    addRandomSuffix: true,
    validUntil: Date.now() + 15 * 60_000
  });
  return NextResponse.json({ ok: true, token, pathname });
}
