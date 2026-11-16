import { NextResponse } from "next/server";

import { getAdminUser } from "@/lib/admin-auth";
import { getBestSlotFromInstagram, getIgStats, getRecentPostStats } from "@/lib/instagram";
import { MEDIA_SLOTS, goalStatus, releaseStuckPublishing, zagrebNow } from "@/lib/media";
import { getMediaSettings } from "@/lib/media-autopilot";
import { getFollowerCount } from "@/lib/ig-stats";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Popis za karticu Media: zadnjih 45 dana + sve zakazano. Jedan upit (Neon štedi).
export async function GET() {
  const user = await getAdminUser();
  if (!user) return NextResponse.json({ ok: false }, { status: 401 });

  await releaseStuckPublishing().catch(() => null);
  const since = new Date(Date.now() - 45 * 86400_000);
  let postsPending = false;
  const [items, bestSlot, settings, messages, posts, ig] = await Promise.all([
    prisma.mediaItem.findMany({
      where: { OR: [{ createdAt: { gte: since } }, { status: "ZAKAZANO" }] },
      orderBy: [{ runDate: "desc" }, { createdAt: "asc" }],
      take: 500
    }),
    // Samo stvarni Instagram podaci (online_followers); null → u adminu se ne prikazuje.
    getBestSlotFromInstagram(MEDIA_SLOTS),
    getMediaSettings(),
    // Razgovori s timom (Redakcija → Piši): zadnjih 60 dana.
    prisma.mediaMessage.findMany({ where: { createdAt: { gte: new Date(Date.now() - 60 * 86400_000) } }, orderBy: { createdAt: "desc" }, take: 400 }).then((r) => r.reverse()),
    // Rezultati objava s Instagrama (keš 1 h, bez baze). Ne čekaj dulje od 6 s
    // da se stranica ne zablokira; keš se puni u pozadini za idući put.
    (() => {
      let timer: ReturnType<typeof setTimeout> | undefined;
      return Promise.race([
        getRecentPostStats(30),
        new Promise<[]>((r) => {
          timer = setTimeout(() => {
            postsPending = true;
            r([]);
          }, 8000);
        })
      ]).finally(() => clearTimeout(timer));
    })(),
    // Pratitelji za cilj "Put do 10k" (keš 10 min).
    getIgStats().catch(() => null)
  ]);

  return NextResponse.json({
    ok: true,
    today: zagrebNow().date,
    slots: MEDIA_SLOTS,
    bestSlot: bestSlot?.slot ?? null,
    canDecide: user.role === "OWNER",
    settings,
    // TikTok račun (env TIKTOK_HANDLE). Dok ga nema, Media podsjeća da se otvori.
    tiktokHandle: (process.env.TIKTOK_HANDLE || "").trim() || null,
    items,
    messages,
    posts,
    postsPending: postsPending && posts.length === 0,
    goal: goalStatus(ig?.ok ? ig.followers : await getFollowerCount().catch(() => null), ig?.ok ? ig.newFollowers7d : null)
  });
}
