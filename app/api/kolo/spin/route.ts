import { NextResponse } from "next/server";

import { getSpinState, spin } from "@/lib/kolo";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// SIGURNOST — što ovdje NAMJERNO ne radimo:
//
// 1. Ne vraćamo nikakve postojeće kodove za upisani broj. Vraćamo samo šifru
//    koju je OVA vrtnja upravo stvorila. (Kod Kluba je javni endpoint vraćao
//    postojeću nagradu za bilo koji upisani broj — tko god pogodi tuđi broj,
//    ukrao bi mu gratis dres. Ovdje toga nema.)
// 2. Ishod bira server, ne preglednik — klijent dobije gotov rezultat i samo
//    animira kolo do tog polja.
//
// Ostaje poznato ograničenje: bez prijave ne možemo dokazati da broj pripada
// osobi koja ga je upisala. Tko upiše tuđi broj, potrošit će tuđu vrtnju.
// Šteta je ograničena (jedna vrtnja, nagrade male), a jedina prava obrana bila
// bi SMS potvrda — to je za sad prevelika prepreka za kupca.

export async function GET(request: Request) {
  const phone = new URL(request.url).searchParams.get("tel");
  const state = await getSpinState(phone);
  return NextResponse.json({ ok: true, ...state });
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const phone = typeof body?.phone === "string" ? body.phone : "";

  const result = await spin(phone);
  if (!result.ok) {
    const status = result.reason === "no_phone" ? 400 : result.reason === "off" ? 404 : 409;
    return NextResponse.json({ ok: false, reason: result.reason }, { status });
  }
  return NextResponse.json(result);
}
