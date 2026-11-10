import { NextResponse } from "next/server";
import { del, list } from "@vercel/blob";

import { isActiveAdmin, requireAction } from "@/lib/admin-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Biblioteka reklama (videa) — sve živi u Vercel Blobu pod "reklame/", bez baze.
export async function GET() {
  if (!(await isActiveAdmin())) return NextResponse.json({ ok: false }, { status: 401 });
  if (!process.env.BLOB_READ_WRITE_TOKEN) return NextResponse.json({ ok: true, items: [] });
  try {
    const out: { url: string; name: string; size: number; uploadedAt: string }[] = [];
    let cursor: string | undefined;
    do {
      const r = await list({ prefix: "reklame/", cursor, limit: 1000 });
      for (const b of r.blobs) {
        out.push({
          url: b.url,
          name: decodeURIComponent(b.pathname.replace(/^reklame\//, "")),
          size: b.size,
          uploadedAt: new Date(b.uploadedAt).toISOString()
        });
      }
      cursor = r.hasMore ? r.cursor : undefined;
    } while (cursor);
    out.sort((a, b) => (a.uploadedAt < b.uploadedAt ? 1 : -1));
    return NextResponse.json({ ok: true, items: out });
  } catch (e) {
    return NextResponse.json({ ok: false, message: e instanceof Error ? e.message : "Greška" }, { status: 500 });
  }
}

// Brisanje reklame — samo vlasnik.
export async function DELETE(request: Request) {
  if (!(await requireAction("settings"))) return NextResponse.json({ ok: false, message: "Samo vlasnik može brisati." }, { status: 403 });
  const url = new URL(request.url).searchParams.get("url") || "";
  let host = "";
  try {
    host = new URL(url).hostname;
  } catch {
    /* prazno */
  }
  if (!host.endsWith(".blob.vercel-storage.com") || !new URL(url).pathname.startsWith("/reklame/")) {
    return NextResponse.json({ ok: false, message: "Neispravan URL." }, { status: 400 });
  }
  await del(url);
  return NextResponse.json({ ok: true });
}
