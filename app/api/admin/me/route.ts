import { NextResponse } from "next/server";

import { getAdminUser } from "@/lib/admin-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Trenutno prijavljeni admin (za UI: skrivanje Postavki, prikaz imena/uloge).
export async function GET() {
  const me = await getAdminUser();
  if (!me) return NextResponse.json({ ok: false }, { status: 401 });
  return NextResponse.json({ ok: true, username: me.username, role: me.role, avatar: me.avatar });
}
