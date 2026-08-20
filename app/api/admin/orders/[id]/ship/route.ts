import { NextResponse } from "next/server";

import { getAdminUser, isAdmin } from "@/lib/admin-auth";
import { prisma } from "@/lib/prisma";
import { markOrderShippedInSheet } from "@/lib/sheets";

export const runtime = "nodejs";

// Marks an order shipped (or back to "new") from the admin, and mirrors the
// checkmark into the Google Sheet so Ivica/wife see the same state.
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await isAdmin())) return NextResponse.json({ ok: false }, { status: 401 });
  const me = await getAdminUser(); // tko je prijavljen (audit)

  const { id } = await params;
  const body = await request.json().catch(() => ({}));
  const shipped = body?.shipped !== false; // default: mark shipped
  const by = body?.by === "ivica" ? "ivica" : body?.by === "igor" ? "igor" : null;
  // Kurir: GLS je čest slučaj pa je zadan; HP se bilježi kad se izričito pošalje.
  const courier = body?.courier === "hp" ? "hp" : "gls";

  const order = await prisma.order.findUnique({
    where: { id },
    select: { id: true, phone: true, customerName: true, createdAt: true }
  });
  if (!order) return NextResponse.json({ ok: false, message: "Narudžba ne postoji" }, { status: 404 });

  await prisma.order.update({
    where: { id },
    // shippedBy = NOVAC (ostaje kako je bilo). shippedByUser = AUDIT (tko je stisnuo pošalji).
    data: shipped
      ? { status: "shipped", shippedBy: by, shippedByUser: me?.username ?? null, shippedAt: new Date(), courier }
      : { status: "new", shippedBy: null, shippedByUser: null, shippedAt: null, courier: null, cancelReason: null }
  });

  // Best-effort: never block the admin action on the Sheet call.
  await markOrderShippedInSheet({
    phone: order.phone,
    name: order.customerName,
    createdAt: order.createdAt,
    shipped,
    by
  });

  return NextResponse.json({ ok: true, shipped });
}
