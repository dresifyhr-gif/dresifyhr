import { NextResponse } from "next/server";

import { isAdmin } from "@/lib/admin-auth";
import { getCatalogProducts, getStreetwearProducts } from "@/lib/data/product-overrides";
import { jerseys } from "@/lib/data/jerseys";
import { getOrderReference } from "@/lib/orders";
import { prisma } from "@/lib/prisma";
import { formatCroatianName, repairText } from "@/lib/utils";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const deaccent = (s: string) =>
  String(s || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/đ/g, "d");

// Globalno pretraživanje admina (⌘K): narudžbe + proizvodi, samo najbolji pogodci.
export async function GET(request: Request) {
  if (!(await isAdmin())) return NextResponse.json({ ok: false }, { status: 401 });

  const q = (new URL(request.url).searchParams.get("q") || "").trim();
  if (!q) return NextResponse.json({ ok: true, orders: [], products: [] });

  const nq = deaccent(q);
  const dq = q.replace(/\D/g, "");

  // ── Narudžbe: po imenu / telefonu / broju narudžbe ──
  const recent = await prisma.order.findMany({
    orderBy: { createdAt: "desc" },
    take: 400,
    select: { id: true, createdAt: true, customerName: true, phone: true, reference: true, total: true, shipping: true, status: true }
  });
  const orders = recent
    .filter((o) => {
      const ref = o.reference || getOrderReference(o.createdAt.toISOString());
      return (
        deaccent(o.customerName).includes(nq) ||
        (dq.length >= 3 && String(o.phone || "").replace(/\D/g, "").includes(dq)) ||
        deaccent(ref).includes(nq)
      );
    })
    .slice(0, 6)
    .map((o) => ({
      customerName: formatCroatianName(o.customerName),
      phone: o.phone || "",
      reference: o.reference || getOrderReference(o.createdAt.toISOString()),
      date: o.createdAt.toLocaleDateString("hr-HR"),
      total: o.total - (o.shipping ?? 0),
      status: o.status
    }));

  // ── Proizvodi: po klubu / igraču / ligi ──
  const [catalog, streetwear] = await Promise.all([getCatalogProducts(jerseys), getStreetwearProducts()]);
  const products = [...catalog, ...streetwear]
    .filter((p) => deaccent(`${repairText(p.klub)} ${repairText(p.igrac)} ${repairText(p.liga)}`).includes(nq))
    .slice(0, 6)
    .map((p) => ({
      slug: p.slug,
      klub: repairText(p.klub),
      igrac: repairText(p.igrac),
      liga: p.category === "streetwear" ? "Streetwear" : repairText(p.liga)
    }));

  return NextResponse.json({ ok: true, orders, products });
}
