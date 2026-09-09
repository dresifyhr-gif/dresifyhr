import { NextResponse } from "next/server";

import { ensureFreshIgToken } from "@/lib/ig-token";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

// Tjedni osigurač: produži Instagram long-lived token (60 dana) da ne istekne
// tijekom neaktivnosti. ensureFreshIgToken sam produžuje ako je <7 dana do isteka.
// Vercel Cron šalje Authorization: Bearer $CRON_SECRET.
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }
  try {
    const conn = await ensureFreshIgToken();
    return NextResponse.json({ ok: true, connected: Boolean(conn), expiresAt: conn?.expiresAt ?? null });
  } catch (e) {
    return NextResponse.json({ ok: false, error: e instanceof Error ? e.message : "refresh failed" }, { status: 500 });
  }
}
