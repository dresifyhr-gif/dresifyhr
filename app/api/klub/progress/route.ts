import { NextResponse } from "next/server";

import { getKlubProgress } from "@/lib/klub";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Napredak u Dresify Klubu za upisani broj mobitela (bez prijave).
// Vraća SAMO napredak i eventualne nezauzete kodove tog broja — ništa osobno.
export async function GET(request: Request) {
  const phone = (new URL(request.url).searchParams.get("phone") || "").trim();
  if (!phone) return NextResponse.json({ ok: false });

  const p = await getKlubProgress(phone);
  if (!p.active) return NextResponse.json({ ok: false });

  return NextResponse.json({
    ok: true,
    collected: p.collected,
    target: p.target,
    inCycle: p.inCycle,
    remaining: p.remaining,
    // Neiskorišteni kodovi — da kupac odmah vidi svoju nagradu na blagajni.
    available: p.codes.filter((c) => !c.used).map((c) => ({ code: c.code, label: c.label }))
  });
}
