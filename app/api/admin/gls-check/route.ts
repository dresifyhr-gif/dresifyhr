import { NextResponse } from "next/server";

import { isAdmin } from "@/lib/admin-auth";
import { checkGlsDeliveries } from "@/lib/gls-tracking";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

// Gumb u adminu: provjeri GLS dostavu za sve poslane pošiljke i označi dostavljene.
export async function POST() {
  if (!(await isAdmin())) return NextResponse.json({ ok: false }, { status: 401 });
  const r = await checkGlsDeliveries();
  return NextResponse.json({ ok: true, ...r });
}
