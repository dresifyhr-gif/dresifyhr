import { NextResponse } from "next/server";

import { isAdmin } from "@/lib/admin-auth";
import { prisma } from "@/lib/prisma";
import { fetchShippedPhonesFromSheet } from "@/lib/sheets";

export const runtime = "nodejs";

const normalize = (p?: string | null) => String(p || "").replace(/\D/g, "");

// Pulls the "Odradeno" checkmarks + "Poslao" (Igor/Ivica) column from the Sheet and
// reflects them into the DB: matching orders become shipped and get shippedBy set.
// Matches by phone. Also backfills shippedBy on already-shipped orders that had no
// shipper tagged. Never un-ships.
export async function POST() {
  if (!(await isAdmin())) return NextResponse.json({ ok: false }, { status: 401 });

  const rows = await fetchShippedPhonesFromSheet();
  if (rows.length === 0) {
    return NextResponse.json({ ok: true, updated: 0, note: "Nema podataka iz Sheeta (ili endpoint/sync nije uključen)." });
  }

  // phone → shipper (last non-null wins)
  const byPhone = new Map<string, "igor" | "ivica" | null>();
  for (const r of rows) {
    if (!byPhone.has(r.phone) || r.by) byPhone.set(r.phone, r.by ?? byPhone.get(r.phone) ?? null);
  }

  // Candidate DB orders: anything not yet shipped, or shipped but missing a shipper.
  const candidates = await prisma.order.findMany({
    where: { OR: [{ status: "new" }, { shippedBy: null, status: { in: ["shipped", "done"] } }] },
    select: { id: true, phone: true, status: true, shippedBy: true }
  });

  let updated = 0;
  const now = new Date();
  for (const o of candidates) {
    const key = normalize(o.phone);
    if (!byPhone.has(key)) continue;
    const by = byPhone.get(key) ?? null;
    const data: { status?: string; shippedBy?: string | null; shippedAt?: Date } = {};
    if (o.status === "new") {
      data.status = "shipped";
      data.shippedAt = now;
    }
    if (!o.shippedBy && by) data.shippedBy = by;
    if (Object.keys(data).length === 0) continue;
    await prisma.order.update({ where: { id: o.id }, data });
    updated++;
  }

  return NextResponse.json({ ok: true, updated });
}
