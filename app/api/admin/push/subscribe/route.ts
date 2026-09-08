import { NextResponse } from "next/server";

import { isAdmin, getAdminUser } from "@/lib/admin-auth";
import { prisma } from "@/lib/prisma";
import { pushConfigured } from "@/lib/push";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Spremi (ili osvježi) Web Push pretplatu za trenutni admin uređaj.
export async function POST(request: Request) {
  if (!(await isAdmin())) return NextResponse.json({ ok: false }, { status: 401 });

  const body = await request.json().catch(() => null);
  const sub = body?.subscription;
  const endpoint: string | undefined = sub?.endpoint;
  const p256dh: string | undefined = sub?.keys?.p256dh;
  const auth: string | undefined = sub?.keys?.auth;
  if (!endpoint || !p256dh || !auth) {
    return NextResponse.json({ ok: false, error: "invalid_subscription" }, { status: 400 });
  }

  const who = await getAdminUser();
  const ua = request.headers.get("user-agent")?.slice(0, 300) || null;

  try {
    await prisma.pushSubscription.upsert({
      where: { endpoint },
      update: { p256dh, auth, username: who?.username ?? null, ua, lastSeen: new Date() },
      create: { endpoint, p256dh, auth, username: who?.username ?? null, ua }
    });
  } catch (e) {
    console.error("[push/subscribe] spremanje nije uspjelo:", e);
    return NextResponse.json({ ok: false, error: "db" }, { status: 500 });
  }

  return NextResponse.json({ ok: true, configured: pushConfigured() });
}
