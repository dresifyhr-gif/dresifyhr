import { NextResponse } from "next/server";

import { checkGlsDeliveries } from "@/lib/gls-tracking";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

// Vercel Cron (raspored u vercel.json). Vercel automatski šalje
// Authorization: Bearer $CRON_SECRET ako je CRON_SECRET env postavljen.
// Bez ispravnog ključa → 401 (da endpoint ne bude javno okidan).
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }
  const r = await checkGlsDeliveries();
  return NextResponse.json({ ok: true, ...r });
}
