import { NextResponse } from "next/server";

import { isAdmin } from "@/lib/admin-auth";
import { prisma } from "@/lib/prisma";
import { jerseys, adultSizes, kidSizes } from "@/lib/data/jerseys";
import { JERSEY_PRICE_EUR } from "@/lib/site";
import { repairText } from "@/lib/utils";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ALL_SIZES = [...adultSizes, ...kidSizes];

// Lists the catalog with effective price/stock (base merged with admin override).
export async function GET() {
  if (!(await isAdmin())) return NextResponse.json({ ok: false }, { status: 401 });

  const overrides = new Map((await prisma.productOverride.findMany()).map((r) => [r.slug, r]));

  const products = jerseys.map((j) => {
    const ov = overrides.get(j.slug);
    const outOfStock = ov ? (ov.outOfStock ?? "") : j.outOfStock ?? "";
    const soldOutSizes = ov ? (ov.soldOutSizes ? ov.soldOutSizes.split(",").map((s) => s.trim()).filter(Boolean) : []) : j.soldOutSizes ?? [];
    return {
      slug: j.slug,
      klub: repairText(j.klub),
      igrac: repairText(j.igrac),
      liga: j.liga,
      price: ov?.price != null ? ov.price : j.price ?? JERSEY_PRICE_EUR,
      outOfStock,
      soldOutSizes,
      overridden: !!ov
    };
  });

  return NextResponse.json({ ok: true, products, sizes: ALL_SIZES });
}

// Saves an override for one product (full desired state for price/stock).
export async function POST(request: Request) {
  if (!(await isAdmin())) return NextResponse.json({ ok: false }, { status: 401 });

  const body = await request.json().catch(() => ({}));
  const slug = String(body?.slug || "");
  if (!slug || !jerseys.some((j) => j.slug === slug)) {
    return NextResponse.json({ ok: false, message: "Nepoznat proizvod" }, { status: 400 });
  }

  const price = body?.price === null || body?.price === "" ? null : Number(body.price);
  const oos = body?.outOfStock;
  const outOfStock = oos === "all" || oos === "adults" || oos === "kids" ? oos : null;
  const sizes: string[] = Array.isArray(body?.soldOutSizes) ? body.soldOutSizes.filter((s: unknown) => typeof s === "string") : [];

  await prisma.productOverride.upsert({
    where: { slug },
    create: { slug, price: price != null && Number.isFinite(price) ? price : null, outOfStock, soldOutSizes: sizes.join(",") || null },
    update: { price: price != null && Number.isFinite(price) ? price : null, outOfStock, soldOutSizes: sizes.join(",") || null }
  });

  return NextResponse.json({ ok: true });
}
