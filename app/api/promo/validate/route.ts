import { NextResponse } from "next/server";

import { lookupPromo } from "@/lib/promo-db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Javna provjera popust-koda za blagajnu (kodovi žive u bazi, uređuju se u adminu).
export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = (url.searchParams.get("code") || "").trim();
  const subtotal = Math.max(0, Number(url.searchParams.get("subtotal") || "0") || 0);

  const result = await lookupPromo(code, subtotal);

  if (result.ok) {
    return NextResponse.json({ ok: true, promo: result.promo, discount: result.discount });
  }
  return NextResponse.json({ ok: false, reason: result.reason, promo: result.promo ?? null });
}
