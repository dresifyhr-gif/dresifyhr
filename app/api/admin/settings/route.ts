import { NextResponse } from "next/server";

import { isAdmin, requireAction } from "@/lib/admin-auth";
import { prisma } from "@/lib/prisma";
import { getSettingsStrict } from "@/lib/settings";
import { bustCache } from "@/lib/cache-tags";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Postavke za formu u adminu — izravno iz baze (bez keša) i STROGO: ako baza ne
// radi, 503 umjesto zadanih vrijednosti (forma bi ih inače spremila preko pravih).
export async function GET() {
  if (!(await isAdmin())) return NextResponse.json({ ok: false }, { status: 401 });
  try {
    return NextResponse.json({ ok: true, settings: await getSettingsStrict() });
  } catch {
    return NextResponse.json({ ok: false, message: "Baza trenutno nije dostupna — postavke se ne mogu učitati." }, { status: 503 });
  }
}

const numOrNull = (v: unknown) => {
  const s = String(v ?? "").trim();
  if (!s) return null; // prazno = koristi zadanu vrijednost (ne 0!)
  const n = Number(s.replace(",", "."));
  return Number.isFinite(n) && n >= 0 ? n : null;
};
// Cijeli broj (dani, broj odbijanja) — prazno = zadano.
const intOrNull = (v: unknown) => {
  const n = numOrNull(v);
  return n == null ? null : Math.max(0, Math.round(n));
};
const strOrNull = (v: unknown) => {
  const s = typeof v === "string" ? v.trim() : "";
  return s || null;
};

export async function POST(request: Request) {
  if (!(await requireAction("settings"))) return NextResponse.json({ ok: false, message: "Samo vlasnik može mijenjati postavke." }, { status: 403 });

  const b = await request.json().catch(() => ({}));
  const data = {
    shippingPrice: numOrNull(b?.shippingPrice),
    freeShipThreshold: numOrNull(b?.freeShipThreshold),
    costDres: numOrNull(b?.costDres),
    costKomplet: numOrNull(b?.costKomplet),
    costStreetwear: numOrNull(b?.costStreetwear),
    costLongSleeve: numOrNull(b?.costLongSleeve),
    costTrenirka: numOrNull(b?.costTrenirka),
    deliveryCost: numOrNull(b?.deliveryCost),
    returnCost: numOrNull(b?.returnCost),
    igorSharePct: numOrNull(b?.igorSharePct),
    winbackDays: intOrNull(b?.winbackDays),
    riskMinFailed: intOrNull(b?.riskMinFailed),
    igorName: strOrNull(b?.igorName),
    igorAddress: strOrNull(b?.igorAddress),
    igorCity: strOrNull(b?.igorCity),
    ivicaName: strOrNull(b?.ivicaName),
    ivicaAddress: strOrNull(b?.ivicaAddress),
    ivicaCity: strOrNull(b?.ivicaCity),
    iban: strOrNull(b?.iban),
    whatsappNumber: strOrNull(String(b?.whatsappNumber ?? "").replace(/\D/g, "")),
    instagramHandle: strOrNull(String(b?.instagramHandle ?? "").replace(/^@/, "")),
    leagues: Array.isArray(b?.leagues) && b.leagues.length ? JSON.stringify(b.leagues.filter((x: unknown) => typeof x === "string" && x.trim())) : null,
    notifyEmail: b?.notifyEmail !== false,
    notifyTelegram: b?.notifyTelegram !== false,
    notifyWhatsapp: b?.notifyWhatsapp !== false,
    announcementActive: b?.announcementActive !== false,
    announcementText: strOrNull(b?.announcementText),
    heroTitle: strOrNull(b?.heroTitle),
    heroSubtitle: strOrNull(b?.heroSubtitle),
    hiddenSections: Array.isArray(b?.hiddenSections) && b.hiddenSections.length ? JSON.stringify(b.hiddenSections.filter((x: unknown) => typeof x === "string")) : null,
    accentColor: /^#[0-9a-fA-F]{6}$/.test(String(b?.accentColor ?? "")) ? String(b.accentColor) : null,
    koloActive: b?.koloActive === true,
    klubActive: b?.klubActive === true,
    klubTarget: intOrNull(b?.klubTarget),
    klubRewardKind: strOrNull(b?.klubRewardKind),
    klubRewardValue: numOrNull(b?.klubRewardValue),
    klubRewardLabel: strOrNull(b?.klubRewardLabel),
    businessName: strOrNull(b?.businessName),
    contactPhone: strOrNull(b?.contactPhone),
    contactEmail: strOrNull(b?.contactEmail),
    monthlyGoal: numOrNull(b?.monthlyGoal),
    igFollowers: numOrNull(b?.igFollowers)
  };

  await prisma.settings.upsert({
    where: { id: "singleton" },
    create: { id: "singleton", ...data },
    update: data
  });

  // Javne stranice drže postavke u kešu (do 1 h) — javi im promjenu odmah.
  bustCache("settings");

  return NextResponse.json({ ok: true });
}
