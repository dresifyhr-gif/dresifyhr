import { NextResponse } from "next/server";
import { auth, currentUser } from "@clerk/nextjs/server";

import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Normalizira IG handle: makne @, razmake, URL dio, lowercase. Dozvoli a-z 0-9 . _
function normalizeHandle(raw: string): string | null {
  let h = String(raw || "").trim().toLowerCase();
  h = h.replace(/^https?:\/\/(www\.)?instagram\.com\//, "").replace(/\/.*$/, "");
  h = h.replace(/^@+/, "").trim();
  if (!/^[a-z0-9._]{1,30}$/.test(h)) return null;
  return h;
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const handle = normalizeHandle(body?.handle);
  if (!handle) {
    return NextResponse.json({ ok: false, message: "Upiši ispravan Instagram korisnički račun." }, { status: 400 });
  }

  // Ako je prijavljen (Clerk) spoji userId i ime — kasnije se kupnje spajaju po userId.
  let userId: string | null = null;
  let name: string | null = typeof body?.name === "string" && body.name.trim() ? body.name.trim() : null;
  try {
    const a = await auth();
    userId = a.userId ?? null;
    if (userId && !name) {
      const u = await currentUser();
      name = [u?.firstName, u?.lastName].filter(Boolean).join(" ") || null;
    }
  } catch {
    /* gost — bez userId */
  }

  try {
    await prisma.giveawayEntry.upsert({
      where: { handle },
      update: { ...(userId ? { userId } : {}), ...(name ? { name } : {}) },
      create: { handle, userId, name }
    });
  } catch {
    return NextResponse.json({ ok: false, message: "Greška. Pokušaj ponovno." }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
