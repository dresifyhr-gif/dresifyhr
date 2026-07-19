import { NextResponse } from "next/server";

import { getKlubProgress } from "@/lib/klub";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Napredak u Dresify Klubu za upisani broj mobitela (bez prijave).
//
// SIGURNOST: namjerno NE vraćamo šifru nagrade. Nemamo načina provjeriti da
// osoba koja je upisala broj doista jest vlasnik tog broja, pa bi vraćanje koda
// značilo da netko može redom probavati tuđe brojeve i pokupiti njihove nagrade.
// Vraćamo samo napredak i signal da nagrada postoji — kod šalje Gazda
// (vidi ga na profilu kupca u adminu) preko WhatsAppa.
export async function GET(request: Request) {
  const phone = (new URL(request.url).searchParams.get("phone") || "").trim();
  if (!phone) return NextResponse.json({ ok: false });

  const p = await getKlubProgress(phone);
  if (!p.active) return NextResponse.json({ ok: false });

  return NextResponse.json({
    ok: true,
    target: p.target,
    inCycle: p.inCycle,
    remaining: p.remaining,
    hasReward: p.hasReward
  });
}
