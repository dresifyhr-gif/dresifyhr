import { NextResponse } from "next/server";

import { isAdmin } from "@/lib/admin-auth";
import { prisma } from "@/lib/prisma";
import { jerseys, adultSizes, kidSizes, getJerseyDescription, getJerseySizeOptions } from "@/lib/data/jerseys";
import { JERSEY_PRICE_EUR } from "@/lib/site";
import { repairText } from "@/lib/utils";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ALL_SIZES = [...adultSizes, ...kidSizes];

// Stvarne veličine koje taj dres ima (za editor: samo relevantne).
function sizeListFor(j: (typeof jerseys)[number]): string[] {
  const so = getJerseySizeOptions(j);
  return [...so.adults, ...so.kids];
}

// Sirovi JSON string → objekt {S:3,...} (za prikaz u editoru).
function parseSizeStockObj(raw: string | null): Record<string, number> {
  if (!raw) return {};
  try {
    const obj = JSON.parse(raw);
    if (!obj || typeof obj !== "object") return {};
    const out: Record<string, number> = {};
    for (const [k, v] of Object.entries(obj)) { const n = Number(v); if (Number.isFinite(n)) out[k] = Math.max(0, Math.round(n)); }
    return out;
  } catch { return {}; }
}

// Lists the catalog with effective price/stock (base merged with admin override).
export async function GET() {
  if (!(await isAdmin())) return NextResponse.json({ ok: false }, { status: 401 });

  const [overrideRows, soldRows, returnRows] = await Promise.all([
    prisma.productOverride.findMany(),
    prisma.orderItem.groupBy({ by: ["slug"], where: { order: { status: { not: "cancelled" } } }, _sum: { quantity: true, unitPrice: true }, _count: true }),
    prisma.orderItem.groupBy({ by: ["slug"], where: { order: { status: "returned" } }, _count: true })
  ]);

  const overrides = new Map(overrideRows.map((r) => [r.slug, r]));
  const soldMap = new Map(soldRows.map((r) => [r.slug ?? "", r]));
  const returnMap = new Map(returnRows.map((r) => [r.slug ?? "", r._count]));

  const products = jerseys.map((j) => {
    const ov = overrides.get(j.slug);
    const outOfStock = ov ? (ov.outOfStock ?? "") : j.outOfStock ?? "";
    const soldOutSizes = ov ? (ov.soldOutSizes ? ov.soldOutSizes.split(",").map((s) => s.trim()).filter(Boolean) : []) : j.soldOutSizes ?? [];

    // Per-product analytics
    const s = soldMap.get(j.slug);
    const sold = s?._count ?? 0;
    const revenue = s?._sum.unitPrice ?? 0;
    const cost = (j.liga === "Komplet" ? 18 : 6) * sold;
    const profit = revenue - cost;
    const returns = returnMap.get(j.slug) ?? 0;

    return {
      slug: j.slug,
      klub: repairText(j.klub),
      igrac: repairText(j.igrac),
      liga: j.liga,
      price: ov?.price != null ? ov.price : j.price ?? JERSEY_PRICE_EUR,
      stock: ov?.stock ?? null,
      sizeStock: parseSizeStockObj(ov?.sizeStock ?? null),
      sizeList: sizeListFor(j),
      outOfStock,
      soldOutSizes,
      hidden: ov ? ov.hidden : false,
      badge: ov?.badge != null ? ov.badge : j.badge ?? "",
      overridden: !!ov,
      sold,
      revenue,
      profit,
      returns,
      description: ov?.description ?? "",
      descriptionAuto: getJerseyDescription(j, "hr").join("\n\n")
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
  const stockRaw = body?.stock;
  const stockNum = stockRaw === null || stockRaw === "" || stockRaw === undefined ? null : Math.round(Number(stockRaw));
  const stockVal = stockNum != null && Number.isFinite(stockNum) && stockNum >= 0 ? stockNum : null;

  // Količina po veličini: primi objekt {S:3,...}, zadrži samo brojeve za stvarne veličine dresa.
  const allowedSizes = new Set(sizeListFor(jerseys.find((j) => j.slug === slug)!));
  let sizeStockVal: string | null = null;
  if (body?.sizeStock && typeof body.sizeStock === "object") {
    const clean: Record<string, number> = {};
    for (const [k, v] of Object.entries(body.sizeStock as Record<string, unknown>)) {
      if (!allowedSizes.has(k)) continue;
      const n = Number(v);
      if (Number.isFinite(n) && String(v).trim() !== "") clean[k] = Math.max(0, Math.round(n));
    }
    sizeStockVal = Object.keys(clean).length ? JSON.stringify(clean) : null;
  }

  const oos = body?.outOfStock;
  const outOfStock = oos === "all" || oos === "adults" || oos === "kids" ? oos : null;
  const sizes: string[] = Array.isArray(body?.soldOutSizes) ? body.soldOutSizes.filter((s: unknown) => typeof s === "string") : [];
  const hidden = body?.hidden === true;
  const badge = body?.badge === "bestseller" || body?.badge === "novo" ? body.badge : null;
  const priceVal = price != null && Number.isFinite(price) ? price : null;
  const description = typeof body?.description === "string" && body.description.trim() ? body.description.trim() : null;

  await prisma.productOverride.upsert({
    where: { slug },
    create: { slug, price: priceVal, stock: stockVal, sizeStock: sizeStockVal, outOfStock, soldOutSizes: sizes.join(",") || null, hidden, badge, description },
    update: { price: priceVal, stock: stockVal, sizeStock: sizeStockVal, outOfStock, soldOutSizes: sizes.join(",") || null, hidden, badge, description }
  });

  return NextResponse.json({ ok: true });
}
