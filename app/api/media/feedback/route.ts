import { NextResponse } from "next/server";

import { verifyIngestKey } from "@/lib/media";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const RATING_LABEL: Record<number, string> = { 4: "Odlično", 3: "Dobro", 2: "Prosječno", 1: "Loše" };

// Za jutarnju rutinu: Igorove ocjene/komentari + arhiva tema (da se ne ponavljaju).
// Samo čitanje; isti zaseban ključ kao /api/media/ingest. ?days=90
export async function GET(request: Request) {
  if (!verifyIngestKey(request)) return NextResponse.json({ ok: false, message: "Neispravan ključ." }, { status: 401 });
  const days = Math.max(1, Math.min(365, Number(new URL(request.url).searchParams.get("days")) || 90));
  const since = new Date(Date.now() - days * 86400_000);

  const rows = await prisma.mediaItem.findMany({
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
      permalink: true
    },
    take: 600
  });

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
    }))
  });
}
