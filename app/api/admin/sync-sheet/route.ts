import { NextResponse } from "next/server";

import { isAdmin } from "@/lib/admin-auth";
import { prisma } from "@/lib/prisma";
import { fetchShippedPhonesFromSheet } from "@/lib/sheets";

export const runtime = "nodejs";

const normalize = (p?: string | null) => String(p || "").replace(/\D/g, "");

// Pulls the "Poslao" checkmarks Ivica/wife set in the Sheet and marks the matching
// DB orders as shipped, so the admin queue reflects their work. Only flips
// new → shipped (never un-ships), to avoid clobbering admin actions.
export async function POST() {
  if (!(await isAdmin())) return NextResponse.json({ ok: false }, { status: 401 });

  const shippedPhones = await fetchShippedPhonesFromSheet();
  if (shippedPhones.length === 0) {
    return NextResponse.json({ ok: true, updated: 0, note: "Nema podataka iz Sheeta (ili endpoint nije postavljen)." });
  }

  const phoneSet = new Set(shippedPhones);
  const pending = await prisma.order.findMany({
    where: { status: "new" },
    select: { id: true, phone: true }
  });

  const toShip = pending.filter((o) => phoneSet.has(normalize(o.phone))).map((o) => o.id);
  if (toShip.length > 0) {
    await prisma.order.updateMany({ where: { id: { in: toShip } }, data: { status: "shipped" } });
  }

  return NextResponse.json({ ok: true, updated: toShip.length });
}
