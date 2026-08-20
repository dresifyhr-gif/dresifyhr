import { NextResponse } from "next/server";
import { revalidateTag } from "next/cache";

import { isAdmin, requireAction } from "@/lib/admin-auth";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const norm = (s: unknown) => String(s ?? "").trim().toUpperCase();
const num = (v: unknown, d = 0) => {
  const n = Number(String(v ?? "").replace(",", "."));
  return Number.isFinite(n) && n >= 0 ? n : d;
};
const intOrNull = (v: unknown) => {
  const s = String(v ?? "").trim();
  if (!s) return null;
  const n = Number(s);
  return Number.isFinite(n) && n > 0 ? Math.round(n) : null;
};

// Popis kodova + koliko je puta svaki iskorišten i koliko je popusta dano.
// Iskorištenja se izvode iz narudžbi (Order.promoCode) — uvijek točno.
export async function GET() {
  if (!(await isAdmin())) return NextResponse.json({ ok: false }, { status: 401 });

  const [codes, orders] = await Promise.all([
    prisma.promoCode.findMany({ orderBy: [{ active: "desc" }, { code: "asc" }] }),
    prisma.order.findMany({
      where: { promoCode: { not: null } },
      select: { promoCode: true, discount: true, status: true }
    })
  ]);

  const stats = new Map<string, { uses: number; discount: number }>();
  for (const o of orders) {
    const key = norm(o.promoCode);
    if (!key) continue;
    const s = stats.get(key) || { uses: 0, discount: 0 };
    s.uses++;
    s.discount += o.discount || 0;
    stats.set(key, s);
  }

  return NextResponse.json({
    ok: true,
    codes: codes.map((c) => ({
      code: c.code,
      kind: c.kind,
      value: c.value,
      minSubtotal: c.minSubtotal,
      label: c.label,
      active: c.active,
      expiresAt: c.expiresAt ? c.expiresAt.toISOString().slice(0, 10) : "",
      maxUses: c.maxUses ?? "",
      note: c.note || "",
      uses: stats.get(norm(c.code))?.uses ?? 0,
      discountGiven: stats.get(norm(c.code))?.discount ?? 0
    }))
  });
}

// Stvori ili uredi kod.
export async function POST(request: Request) {
  if (!(await requireAction("settings"))) return NextResponse.json({ ok: false }, { status: 401 });

  const b = await request.json().catch(() => ({}));
  const code = norm(b?.code);
  if (!code) return NextResponse.json({ ok: false, message: "Upiši šifru koda" }, { status: 400 });
  if (!/^[A-Z0-9-]{2,24}$/.test(code)) {
    return NextResponse.json({ ok: false, message: "Šifra: samo slova, brojevi i crtica (2–24 znaka)" }, { status: 400 });
  }

  const expires = String(b?.expiresAt ?? "").trim();
  const data = {
    kind: b?.kind === "freeship" ? "freeship" : "percent",
    value: b?.kind === "freeship" ? 0 : num(b?.value),
    minSubtotal: num(b?.minSubtotal),
    label: String(b?.label ?? "").trim(),
    active: b?.active !== false,
    expiresAt: expires ? new Date(`${expires}T23:59:59`) : null,
    maxUses: intOrNull(b?.maxUses),
    note: String(b?.note ?? "").trim() || null
  };

  await prisma.promoCode.upsert({ where: { code }, create: { code, ...data }, update: data });
  revalidateTag("promo-codes");

  return NextResponse.json({ ok: true });
}

// Obriši kod (postojeće narudžbe zadržavaju zapisan kod).
export async function DELETE(request: Request) {
  if (!(await requireAction("settings"))) return NextResponse.json({ ok: false }, { status: 401 });

  const code = norm(new URL(request.url).searchParams.get("code"));
  if (!code) return NextResponse.json({ ok: false }, { status: 400 });

  await prisma.promoCode.deleteMany({ where: { code } });
  revalidateTag("promo-codes");

  return NextResponse.json({ ok: true });
}
