import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";

import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const str = (v: unknown, max = 120) => String(v ?? "").trim().slice(0, max);

export async function GET() {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ ok: false }, { status: 401 });
  const addresses = await prisma.customerAddress.findMany({
    where: { userId },
    orderBy: [{ isDefault: "desc" }, { createdAt: "desc" }]
  });
  return NextResponse.json({ ok: true, addresses });
}

export async function POST(request: Request) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ ok: false }, { status: 401 });
  const b = await request.json().catch(() => ({}));
  const action = String(b?.action || "add");

  if (action === "delete") {
    await prisma.customerAddress.deleteMany({ where: { id: str(b?.id), userId } });
    return NextResponse.json({ ok: true });
  }

  if (action === "default") {
    await prisma.customerAddress.updateMany({ where: { userId }, data: { isDefault: false } });
    await prisma.customerAddress.updateMany({ where: { id: str(b?.id), userId }, data: { isDefault: true } });
    return NextResponse.json({ ok: true });
  }

  // add
  const name = str(b?.name);
  const street = str(b?.street);
  const city = str(b?.city);
  const postalCode = str(b?.postalCode, 20);
  if (!name || !street || !city || !postalCode) {
    return NextResponse.json({ ok: false, message: "Ime, ulica, grad i poštanski broj su obavezni." }, { status: 400 });
  }
  const makeDefault = b?.isDefault === true || (await prisma.customerAddress.count({ where: { userId } })) === 0;
  if (makeDefault) await prisma.customerAddress.updateMany({ where: { userId }, data: { isDefault: false } });
  const created = await prisma.customerAddress.create({
    data: {
      userId,
      label: str(b?.label, 40) || null,
      name,
      phone: str(b?.phone, 40) || null,
      street,
      city,
      postalCode,
      isDefault: makeDefault
    }
  });
  return NextResponse.json({ ok: true, address: created });
}
