import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";

import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const str = (v: unknown, max = 120) => String(v ?? "").trim().slice(0, max);

// Lista omiljenih (samo slugovi — dovoljno za ❤️ stanje na proizvodima).
export async function GET() {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ ok: true, slugs: [], items: [] });
  const items = await prisma.wishlistItem.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" }
  });
  return NextResponse.json({ ok: true, slugs: items.map((i) => i.slug), items });
}

// Toggle: ako postoji makni, inače dodaj. Vraća novo stanje.
export async function POST(request: Request) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ ok: false, needsAuth: true }, { status: 401 });
  const b = await request.json().catch(() => ({}));
  const slug = str(b?.slug);
  if (!slug) return NextResponse.json({ ok: false }, { status: 400 });

  const existing = await prisma.wishlistItem.findUnique({ where: { userId_slug: { userId, slug } } });
  if (existing) {
    await prisma.wishlistItem.delete({ where: { id: existing.id } });
    return NextResponse.json({ ok: true, inWishlist: false });
  }
  await prisma.wishlistItem.create({
    data: { userId, slug, klub: str(b?.klub) || null, igrac: str(b?.igrac) || null }
  });
  return NextResponse.json({ ok: true, inWishlist: true });
}
