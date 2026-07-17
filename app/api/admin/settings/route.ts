import { NextResponse } from "next/server";
import { revalidateTag } from "next/cache";

import { isAdmin } from "@/lib/admin-auth";
import { prisma } from "@/lib/prisma";
import { getSettings } from "@/lib/settings";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Trenutačne efektivne postavke (DB ili zadane) za prikaz u adminu.
export async function GET() {
  if (!(await isAdmin())) return NextResponse.json({ ok: false }, { status: 401 });
  return NextResponse.json({ ok: true, settings: await getSettings() });
}

const numOrNull = (v: unknown) => {
  const n = Number(String(v ?? "").replace(",", "."));
  return Number.isFinite(n) && n >= 0 ? n : null;
};
const strOrNull = (v: unknown) => {
  const s = typeof v === "string" ? v.trim() : "";
  return s || null;
};

export async function POST(request: Request) {
  if (!(await isAdmin())) return NextResponse.json({ ok: false }, { status: 401 });

  const b = await request.json().catch(() => ({}));
  const data = {
    shippingPrice: numOrNull(b?.shippingPrice),
    freeShipThreshold: numOrNull(b?.freeShipThreshold),
    costDres: numOrNull(b?.costDres),
    costKomplet: numOrNull(b?.costKomplet),
    igorName: strOrNull(b?.igorName),
    igorAddress: strOrNull(b?.igorAddress),
    igorCity: strOrNull(b?.igorCity),
    ivicaName: strOrNull(b?.ivicaName),
    ivicaAddress: strOrNull(b?.ivicaAddress),
    ivicaCity: strOrNull(b?.ivicaCity),
    iban: strOrNull(b?.iban),
    businessName: strOrNull(b?.businessName),
    contactPhone: strOrNull(b?.contactPhone),
    contactEmail: strOrNull(b?.contactEmail)
  };

  await prisma.settings.upsert({
    where: { id: "singleton" },
    create: { id: "singleton", ...data },
    update: data
  });

  // Osvježi keširane postavke (getSettings ima tag "settings").
  revalidateTag("settings");

  return NextResponse.json({ ok: true });
}
