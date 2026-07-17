import { NextResponse } from "next/server";

import { isAdmin } from "@/lib/admin-auth";
import { prisma } from "@/lib/prisma";
import { jerseys, adultSizes, kidSizes, streetwearSizes, getJerseyDescription, getJerseySizeOptions } from "@/lib/data/jerseys";
import { JERSEY_PRICE_EUR } from "@/lib/site";
import { customToJersey, type CustomRow } from "@/lib/data/product-overrides";
import { repairText } from "@/lib/utils";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ALL_SIZES = [...streetwearSizes.filter((s) => !(adultSizes as readonly string[]).includes(s)), ...adultSizes, ...kidSizes];

// Stvarne veličine koje taj proizvod ima (za editor: samo relevantne).
function sizeListFor(j: { category?: string; vel: string; liga: string; klub: string; outOfStock?: string; soldOutSizes?: string[] }): string[] {
  const so = getJerseySizeOptions(j as Parameters<typeof getJerseySizeOptions>[0]);
  return [...so.adults, ...so.kids];
}

// JSON niz URL-ova slika (prazno = originalne slike iz /public za statičke dresove).
function parseImagesArr(raw: string | null): string[] {
  if (!raw) return [];
  try {
    const arr = JSON.parse(raw);
    return Array.isArray(arr) ? arr.filter((u): u is string => typeof u === "string" && !!u) : [];
  } catch { return []; }
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

// Očisti sizeStock objekt iz body-ja, zadrži samo brojeve za dopuštene veličine.
function cleanSizeStock(input: unknown, allowed: Set<string>): string | null {
  if (!input || typeof input !== "object") return null;
  const clean: Record<string, number> = {};
  for (const [k, v] of Object.entries(input as Record<string, unknown>)) {
    if (!allowed.has(k)) continue;
    const n = Number(v);
    if (Number.isFinite(n) && String(v).trim() !== "") clean[k] = Math.max(0, Math.round(n));
  }
  return Object.keys(clean).length ? JSON.stringify(clean) : null;
}

// Lists the catalog with effective price/stock (base merged with admin override).
export async function GET() {
  if (!(await isAdmin())) return NextResponse.json({ ok: false }, { status: 401 });

  const [overrideRows, customRows, soldRows, returnRows] = await Promise.all([
    prisma.productOverride.findMany(),
    prisma.customProduct.findMany({ orderBy: { createdAt: "desc" } }) as unknown as Promise<CustomRow[]>,
    prisma.orderItem.groupBy({ by: ["slug"], where: { order: { status: { not: "cancelled" } } }, _sum: { quantity: true, unitPrice: true }, _count: true }),
    prisma.orderItem.groupBy({ by: ["slug"], where: { order: { status: "returned" } }, _count: true })
  ]);

  const overrides = new Map(overrideRows.map((r) => [r.slug, r]));
  const soldMap = new Map(soldRows.map((r) => [r.slug ?? "", r]));
  const returnMap = new Map(returnRows.map((r) => [r.slug ?? "", r._count]));

  const jerseyProducts = jerseys.map((j) => {
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
      // Override može promijeniti naziv/ligu/slike; prazno = original iz kataloga.
      klub: repairText(ov?.klub || j.klub),
      igrac: repairText(ov?.igrac || j.igrac),
      liga: ov?.liga || j.liga,
      images: parseImagesArr(ov?.images ?? null),
      category: j.category ?? "dres",
      custom: false,
      price: ov?.price != null ? ov.price : j.price ?? JERSEY_PRICE_EUR,
      stock: ov?.stock ?? null,
      sizeStock: parseSizeStockObj(ov?.sizeStock ?? null),
      sizeList: sizeListFor(j),
      outOfStock,
      soldOutSizes,
      hidden: ov ? ov.hidden : false,
      badge: ov?.badge != null ? ov.badge : j.badge ?? "",
      featured: ov ? ov.featured : Boolean(j.featured),
      overridden: !!ov,
      sold,
      revenue,
      profit,
      returns,
      description: ov?.description ?? "",
      descriptionAuto: getJerseyDescription(j, "hr").join("\n\n")
    };
  });

  // Custom proizvodi (dresovi + streetwear iz admina) — iste kontrole kao dresovi.
  const customProducts = customRows.map((c) => {
    const jersey = customToJersey(c);
    const streetwear = (c.category ?? "dres") === "streetwear";
    const s = soldMap.get(c.slug);
    const sold = s?._count ?? 0;
    const revenue = s?._sum.unitPrice ?? 0;
    const cost = (streetwear || c.liga === "Komplet" ? 18 : 6) * sold;
    const returns = returnMap.get(c.slug) ?? 0;

    return {
      slug: c.slug,
      klub: repairText(c.klub),
      igrac: repairText(c.igrac),
      liga: streetwear ? "Streetwear" : c.liga,
      images: parseImagesArr(c.images ?? null),
      category: c.category ?? "dres",
      custom: true,
      price: c.price,
      stock: c.stock ?? null,
      sizeStock: parseSizeStockObj(c.sizeStock ?? null),
      sizeList: sizeListFor(jersey as unknown as { category?: string; vel: string; liga: string; klub: string }),
      outOfStock: c.outOfStock ?? "",
      soldOutSizes: c.soldOutSizes ? c.soldOutSizes.split(",").map((s) => s.trim()).filter(Boolean) : [],
      hidden: c.hidden,
      badge: c.badge ?? "",
      featured: Boolean(c.featured),
      overridden: true,
      sold,
      revenue,
      profit: revenue - cost,
      returns,
      description: c.description ?? "",
      descriptionAuto: ""
    };
  });

  return NextResponse.json({ ok: true, products: [...customProducts, ...jerseyProducts], sizes: ALL_SIZES });
}

// Saves an override for one product (full desired state for price/stock).
export async function POST(request: Request) {
  if (!(await isAdmin())) return NextResponse.json({ ok: false }, { status: 401 });

  const body = await request.json().catch(() => ({}));
  const slug = String(body?.slug || "");
  if (!slug) return NextResponse.json({ ok: false, message: "Nepoznat proizvod" }, { status: 400 });

  const price = body?.price === null || body?.price === "" ? null : Number(body.price);
  const stockRaw = body?.stock;
  const stockNum = stockRaw === null || stockRaw === "" || stockRaw === undefined ? null : Math.round(Number(stockRaw));
  const stockVal = stockNum != null && Number.isFinite(stockNum) && stockNum >= 0 ? stockNum : null;
  const oos = body?.outOfStock;
  const outOfStock = oos === "all" || oos === "adults" || oos === "kids" ? oos : null;
  const sizes: string[] = Array.isArray(body?.soldOutSizes) ? body.soldOutSizes.filter((s: unknown) => typeof s === "string") : [];
  const hidden = body?.hidden === true;
  const badge = body?.badge === "bestseller" || body?.badge === "novo" ? body.badge : null;
  const featured = body?.featured === true;
  const priceVal = price != null && Number.isFinite(price) ? price : null;
  const description = typeof body?.description === "string" && body.description.trim() ? body.description.trim() : null;

  // Osnovni podaci i slike — šalju se samo kad ih admin mijenja (undefined = ne diraj).
  const txt = (v: unknown) => (typeof v === "string" && v.trim() ? v.trim() : undefined);
  const klubIn = txt(body?.klub);
  const igracIn = txt(body?.igrac);
  const ligaIn = txt(body?.liga);
  const imagesIn = Array.isArray(body?.images)
    ? (body.images as unknown[]).filter((u): u is string => typeof u === "string" && !!u)
    : undefined;

  // Custom proizvod (dres ili streetwear) → uređujemo CustomProduct redak izravno.
  const custom = (await prisma.customProduct.findUnique({ where: { slug } })) as unknown as CustomRow | null;
  if (custom) {
    const allowedSizes = new Set(sizeListFor(customToJersey(custom) as unknown as { category?: string; vel: string; liga: string; klub: string }));
    const sizeStockVal = cleanSizeStock(body?.sizeStock, allowedSizes);
    await prisma.customProduct.update({
      where: { slug },
      data: {
        // custom cijena je obavezna (Float) — ako je prazno, zadrži postojeću
        ...(priceVal != null ? { price: priceVal } : {}),
        ...(klubIn ? { klub: klubIn } : {}),
        ...(igracIn ? { igrac: igracIn } : {}),
        ...(ligaIn ? { liga: ligaIn } : {}),
        ...(imagesIn ? { images: JSON.stringify(imagesIn) } : {}),
        stock: stockVal,
        sizeStock: sizeStockVal,
        outOfStock,
        soldOutSizes: sizes.join(",") || null,
        hidden,
        badge,
        featured,
        description
      }
    });
    return NextResponse.json({ ok: true });
  }

  // Inače je katalog dres → ProductOverride.
  const jersey = jerseys.find((j) => j.slug === slug);
  if (!jersey) return NextResponse.json({ ok: false, message: "Nepoznat proizvod" }, { status: 400 });

  const allowedSizes = new Set(sizeListFor(jersey));
  const sizeStockVal = cleanSizeStock(body?.sizeStock, allowedSizes);

  // Naziv/liga/slike: prazno = ostaje original iz kataloga (ne spremamo isti tekst bez potrebe).
  const klubVal = klubIn && klubIn !== repairText(jersey.klub) ? klubIn : null;
  const igracVal = igracIn && igracIn !== repairText(jersey.igrac) ? igracIn : null;
  const ligaVal = ligaIn && ligaIn !== jersey.liga ? ligaIn : null;
  const imagesVal = imagesIn ? (imagesIn.length ? JSON.stringify(imagesIn) : null) : undefined;

  const data = {
    klub: klubVal,
    igrac: igracVal,
    liga: ligaVal,
    ...(imagesVal !== undefined ? { images: imagesVal } : {}),
    price: priceVal,
    stock: stockVal,
    sizeStock: sizeStockVal,
    outOfStock,
    soldOutSizes: sizes.join(",") || null,
    hidden,
    badge,
    featured,
    description
  };

  await prisma.productOverride.upsert({
    where: { slug },
    create: { slug, ...data },
    update: data
  });

  return NextResponse.json({ ok: true });
}
