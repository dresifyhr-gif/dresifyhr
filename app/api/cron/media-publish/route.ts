import { NextResponse } from "next/server";

import { currentSlot, publishMediaItem, releaseStuckPublishing } from "@/lib/media";
import { prisma } from "@/lib/prisma";
import { sendPushToOwners } from "@/lib/push";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

// Objava zakazanih Media nacrta u FIKSNIM terminima (12:00, 18:00, 19:30, 21:00 po Zagrebu).
// Vercel Cron radi u UTC-u, pa je u vercel.json upisan i ljetni i zimski sat; ruta
// prvo provjeri je li sad stvarno termin — ako nije, odmah izlazi i NE budi bazu.
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }
  const slot = currentSlot();
  if (!slot) return NextResponse.json({ ok: true, skipped: "nije termin" });

  await releaseStuckPublishing().catch(() => null);
  const due = await prisma.mediaItem.findMany({
    where: { status: "ZAKAZANO", scheduledAt: { lte: new Date(Date.now() + 5 * 60_000) } },
    orderBy: { scheduledAt: "asc" },
    take: 5
  });

  const results: { id: string; ok: boolean; error?: string }[] = [];
  const started = Date.now();
  for (const item of due) {
    // Reel može čekati obradu do ~4 min; ne započinji novu objavu ako nema vremena (ostaje za idući termin).
    if (Date.now() - started > 45_000) break;
    const claimed = await prisma.mediaItem.updateMany({ where: { id: item.id, status: "ZAKAZANO" }, data: { status: "OBJAVLJUJEM" } });
    if (claimed.count === 0) continue;
    const r = await publishMediaItem(item);
    await prisma.mediaItem.update({
      where: { id: item.id },
      data: r.ok
        ? { status: "OBJAVLJENO", publishedAt: new Date(), igMediaId: r.id || null, permalink: r.permalink || null, error: null }
        : { status: "NEUSPJELO", error: r.error }
    });
    results.push({ id: item.id, ok: r.ok, error: r.ok ? undefined : r.error });
    await sendPushToOwners({
      title: r.ok ? "✅ Objavljeno na Instagram" : "⚠️ Objava nije uspjela",
      body: r.ok ? item.title.slice(0, 100) : `${item.title.slice(0, 60)}: ${(r.error || "").slice(0, 80)}`,
      url: r.ok && r.permalink ? r.permalink : "/admin/media/",
      tag: `media-pub-${item.id}`,
      kind: "media"
    }).catch(() => null);
  }
  return NextResponse.json({ ok: true, slot, published: results });
}
