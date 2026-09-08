import { NextResponse } from "next/server";

import { isAdmin } from "@/lib/admin-auth";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Ugasi obavijesti za ovaj uređaj — obriši pretplatu po endpointu.
export async function POST(request: Request) {
  if (!(await isAdmin())) return NextResponse.json({ ok: false }, { status: 401 });

  const body = await request.json().catch(() => null);
  const endpoint: string | undefined = body?.endpoint;
  if (!endpoint) return NextResponse.json({ ok: false, error: "no_endpoint" }, { status: 400 });

  try {
    await prisma.pushSubscription.deleteMany({ where: { endpoint } });
  } catch (e) {
    console.error("[push/unsubscribe] brisanje nije uspjelo:", e);
  }
  return NextResponse.json({ ok: true });
}
