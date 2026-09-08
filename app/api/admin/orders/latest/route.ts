import { NextResponse } from "next/server";

import { isActiveAdmin } from "@/lib/admin-auth";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Za "uživo" obavijest u adminu (polling): zadnja narudžba + broj novih danas.
// Klijent pamti zadnji viđeni id; ako se promijeni → zvuk + toast.
export async function GET() {
  if (!(await isActiveAdmin())) return NextResponse.json({ ok: false }, { status: 401 });

  try {
    const latest = await prisma.order.findFirst({
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        reference: true,
        customerName: true,
        total: true,
        itemCount: true,
        createdAt: true,
        status: true
      }
    });
    const newCount = await prisma.order.count({ where: { status: "new" } });
    return NextResponse.json({ ok: true, latest, newCount });
  } catch (e) {
    console.error("[orders/latest] upit nije uspio:", e);
    return NextResponse.json({ ok: false, error: "db" }, { status: 500 });
  }
}
