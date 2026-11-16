import { NextResponse } from "next/server";

import { getAdminUser } from "@/lib/admin-auth";
import { getBestSlotFromInstagram } from "@/lib/instagram";
import { MEDIA_SLOTS, releaseStuckPublishing, zagrebNow } from "@/lib/media";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Popis za karticu Media: zadnjih 45 dana + sve zakazano. Jedan upit (Neon štedi).
export async function GET() {
  const user = await getAdminUser();
  if (!user) return NextResponse.json({ ok: false }, { status: 401 });

  await releaseStuckPublishing().catch(() => null);
  const since = new Date(Date.now() - 45 * 86400_000);
  const [items, bestSlot] = await Promise.all([
    prisma.mediaItem.findMany({
      where: { OR: [{ createdAt: { gte: since } }, { status: "ZAKAZANO" }] },
      orderBy: [{ runDate: "desc" }, { createdAt: "asc" }],
      take: 500
    }),
    // Samo stvarni Instagram podaci (online_followers); null → u adminu se ne prikazuje.
    getBestSlotFromInstagram(MEDIA_SLOTS)
  ]);

  return NextResponse.json({
    ok: true,
    today: zagrebNow().date,
    slots: MEDIA_SLOTS,
    bestSlot: bestSlot?.slot ?? null,
    canDecide: user.role === "OWNER",
    items
  });
}
