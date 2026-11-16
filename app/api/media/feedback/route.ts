import { NextResponse } from "next/server";

import { getRecentPostStats } from "@/lib/instagram";
import { verifyIngestKey } from "@/lib/media";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const maxDuration = 120; // hladno punjenje Instagram brojki može potrajati

// Shortcode iz IG linka (/p/X/, /reel/X/, s www ili bez) — za spajanje objave s nacrtom.
const igCode = (u?: string | null) => u?.match(/instagram\.com\/(?:[^/]+\/)?(?:p|reel|reels|tv)\/([^/?#]+)/)?.[1] ?? null;

const RATING_LABEL: Record<number, string> = { 4: "Odlično", 3: "Dobro", 2: "Prosječno", 1: "Loše" };

// Za jutarnju rutinu: Igorove ocjene/komentari + arhiva tema (da se ne ponavljaju).
// Samo čitanje; isti zaseban ključ kao /api/media/ingest. ?days=90
export async function GET(request: Request) {
  if (!verifyIngestKey(request)) return NextResponse.json({ ok: false, message: "Neispravan ključ." }, { status: 401 });
  const days = Math.max(1, Math.min(365, Number(new URL(request.url).searchParams.get("days")) || 90));
  const since = new Date(Date.now() - days * 86400_000);

  const [rows, posts] = await Promise.all([prisma.mediaItem.findMany({
    where: { createdAt: { gte: since }, kind: { in: ["IDEA", "DRAFT"] } },
    orderBy: { createdAt: "desc" },
    select: {
      extKey: true,
      runDate: true,
      kind: true,
      series: true,
      format: true,
      title: true,
      status: true,
      verification: true,
      rating: true,
      ratingComment: true,
      scheduledAt: true,
      publishedAt: true,
      permalink: true,
      igMediaId: true
    },
    take: 600
  }),
  // Stvarni rezultati objava s Instagrama (zadnjih 30 dana, i ručne objave) — za Emu.
  getRecentPostStats(30)]);

  const ratings = rows
    .filter((r) => r.rating || r.ratingComment || r.status === "VRACENO" || r.status === "ODBIJENO")
    .map((r) => ({
      runDate: r.runDate,
      extKey: r.extKey,
      series: r.series,
      title: r.title,
      rating: r.rating,
      ratingLabel: r.rating ? RATING_LABEL[r.rating] : null,
      comment: r.ratingComment,
      status: r.status
    }));

  return NextResponse.json({
    ok: true,
    // Za VRACENO: agent treba poslati novu verziju s ISTIM extKey (komentar kaže što promijeniti).
    returned: ratings.filter((r) => r.status === "VRACENO"),
    ratings,
    archive: rows.map((r) => ({
      runDate: r.runDate,
      kind: r.kind,
      series: r.series,
      title: r.title,
      status: r.status,
      published: Boolean(r.publishedAt),
      permalink: r.permalink
    })),
    // Uz svaku IG objavu: naš nacrt (ako je iz Media), da se vidi serija/format/sat.
    posts: posts.map((p) => {
      const pc = igCode(p.permalink);
      const d = rows.find((r) => (r.igMediaId && r.igMediaId === p.id) || (pc && igCode(r.permalink) === pc));
      return { ...p, series: d?.series ?? null, format: d?.format ?? null, title: d?.title ?? null, extKey: d?.extKey ?? null };
    })
  });
}
