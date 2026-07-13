import { NextResponse } from "next/server";

import { isAdmin } from "@/lib/admin-auth";
import { prisma } from "@/lib/prisma";
import { jerseys } from "@/lib/data/jerseys";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function slugify(s: string) {
  return String(s)
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/đ/g, "d")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 60);
}

export async function GET() {
  if (!(await isAdmin())) return NextResponse.json({ ok: false }, { status: 401 });
  const rows = await prisma.customProduct.findMany({ orderBy: { createdAt: "desc" } });
  const products = rows.map((r) => ({ ...r, images: JSON.parse(r.images || "[]") as string[] }));
  return NextResponse.json({ ok: true, products });
}

export async function POST(request: Request) {
  if (!(await isAdmin())) return NextResponse.json({ ok: false }, { status: 401 });

  const b = await request.json().catch(() => ({}));
  const klub = String(b?.klub || "").trim();
  const igrac = String(b?.igrac || "").trim();
  if (!klub || !igrac) return NextResponse.json({ ok: false, message: "Upiši klub i igrača." }, { status: 400 });

  const images: string[] = Array.isArray(b?.images) ? b.images.filter((u: unknown) => typeof u === "string") : [];

  // Jedinstveni slug (ne smije se sudariti s katalogom ni drugim custom dresom)
  const base = slugify(`${klub}-${igrac}`) || `dres-${Date.now()}`;
  const taken = new Set([...jerseys.map((j) => j.slug), ...(await prisma.customProduct.findMany({ select: { slug: true } })).map((r) => r.slug)]);
  let slug = base;
  let n = 2;
  while (taken.has(slug)) slug = `${base}-${n++}`;

  const editId = typeof b?.id === "string" ? b.id : null;
  const data = {
    category: b?.category === "streetwear" ? "streetwear" : "dres",
    klub,
    igrac,
    vel: typeof b?.vel === "string" && b.vel.trim() ? b.vel.trim() : "Djeca: 104-176 · Odrasli: S-XXL",
    liga: String(b?.liga || "Reprezentacija"),
    price: Number.isFinite(Number(b?.price)) ? Number(b.price) : 20,
    retro: b?.retro === true,
    badge: b?.badge === "bestseller" || b?.badge === "novo" ? b.badge : null,
    outOfStock: b?.outOfStock === "all" || b?.outOfStock === "adults" || b?.outOfStock === "kids" ? b.outOfStock : null,
    soldOutSizes: Array.isArray(b?.soldOutSizes) ? b.soldOutSizes.join(",") || null : null,
    description: typeof b?.description === "string" && b.description.trim() ? b.description.trim() : null,
    images: JSON.stringify(images),
    hidden: b?.hidden === true
  };

  if (editId) {
    await prisma.customProduct.update({ where: { id: editId }, data });
    return NextResponse.json({ ok: true, id: editId });
  }
  const created = await prisma.customProduct.create({ data: { ...data, slug } });
  return NextResponse.json({ ok: true, id: created.id, slug });
}

export async function DELETE(request: Request) {
  if (!(await isAdmin())) return NextResponse.json({ ok: false }, { status: 401 });
  const url = new URL(request.url);
  const id = url.searchParams.get("id");
  if (!id) return NextResponse.json({ ok: false }, { status: 400 });
  await prisma.customProduct.delete({ where: { id } }).catch(() => {});
  return NextResponse.json({ ok: true });
}
