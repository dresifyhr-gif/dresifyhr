import { NextResponse } from "next/server";

import { isActiveAdmin } from "@/lib/admin-auth";
import { fetchTrackingEvents, latestLabel } from "@/lib/gls-tracking";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Cijela povijest pošiljke uživo s GLS-a (dodir na stanje dostave na kartici narudžbe).
// Usput osvježi zadnji događaj na kartici (deliveryInfo) — oznaku dostave NE dira.
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await isActiveAdmin())) return NextResponse.json({ ok: false }, { status: 401 });
  const { id } = await params;
  const order = await prisma.order.findUnique({ where: { id }, select: { tracking: true, courier: true, deliveryInfo: true } });
  const tracking = (order?.tracking || "").trim();
  if (!order || !tracking) return NextResponse.json({ ok: false, message: "Nema broja pošiljke" }, { status: 404 });
  if (order.courier === "hp") return NextResponse.json({ ok: false, message: "Za Hrvatsku poštu otvori praćenje na Pošti." }, { status: 400 });

  const events = await fetchTrackingEvents(tracking);
  if (!events) return NextResponse.json({ ok: false, message: "GLS trenutno ne odgovara — probaj za minutu." }, { status: 502 });

  const latest = latestLabel(events);
  if (latest && latest !== order.deliveryInfo) {
    await prisma.order.update({ where: { id }, data: { deliveryInfo: latest } }).catch(() => {});
  }
  return NextResponse.json({ ok: true, latest, events });
}
