import { NextResponse } from "next/server";

import { isAdmin } from "@/lib/admin-auth";
import { prisma } from "@/lib/prisma";
import { markOrderShippedInSheet } from "@/lib/sheets";

export const runtime = "nodejs";

// Marks an order shipped (or back to "new") from the admin, and mirrors the
// checkmark into the Google Sheet so Ivica/wife see the same state.
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await isAdmin())) return NextResponse.json({ ok: false }, { status: 401 });

  const { id } = await params;
  const body = await request.json().catch(() => ({}));
  const shipped = body?.shipped !== false; // default: mark shipped

  const order = await prisma.order.findUnique({
    where: { id },
    select: { id: true, phone: true, customerName: true, createdAt: true }
  });
  if (!order) return NextResponse.json({ ok: false, message: "Narudžba ne postoji" }, { status: 404 });

  await prisma.order.update({
    where: { id },
    data: { status: shipped ? "shipped" : "new" }
  });

  // Best-effort: never block the admin action on the Sheet call.
  await markOrderShippedInSheet({
    phone: order.phone,
    name: order.customerName,
    createdAt: order.createdAt,
    shipped
  });

  return NextResponse.json({ ok: true, shipped });
}
