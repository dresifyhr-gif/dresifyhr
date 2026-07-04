import { NextResponse } from "next/server";

import { isAdmin } from "@/lib/admin-auth";
import { getOrderReference } from "@/lib/orders";
import { prisma } from "@/lib/prisma";
import { formatCroatianName, repairText } from "@/lib/utils";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const PAGE_SIZE = 25;

// Full order search for the admin orders page: by name / phone / address.
// Paginated, newest first. Returns everything needed to render + act on a row.
export async function GET(request: Request) {
  if (!(await isAdmin())) return NextResponse.json({ ok: false }, { status: 401 });

  const url = new URL(request.url);
  const q = (url.searchParams.get("q") || "").trim();
  const page = Math.max(1, parseInt(url.searchParams.get("page") || "1", 10) || 1);
  const digits = q.replace(/\D/g, "");

  const where =
    q.length === 0
      ? {}
      : {
          OR: [
            { customerName: { contains: q, mode: "insensitive" as const } },
            { address: { contains: q, mode: "insensitive" as const } },
            ...(digits.length >= 3 ? [{ phone: { contains: digits } }] : [])
          ]
        };

  const [total, orders] = await Promise.all([
    prisma.order.count({ where }),
    prisma.order.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      select: {
        id: true,
        createdAt: true,
        customerName: true,
        phone: true,
        address: true,
        itemCount: true,
        total: true,
        status: true,
        shippedBy: true,
        reference: true
      }
    })
  ]);

  return NextResponse.json({
    ok: true,
    page,
    pages: Math.max(1, Math.ceil(total / PAGE_SIZE)),
    total,
    orders: orders.map((o) => ({
      id: o.id,
      date: o.createdAt.toLocaleDateString("hr-HR"),
      reference: o.reference || getOrderReference(o.createdAt.toISOString()),
      customerName: formatCroatianName(o.customerName),
      phone: o.phone || "",
      address: repairText(o.address || ""),
      itemCount: o.itemCount,
      total: o.total,
      status: o.status,
      shippedBy: o.shippedBy || null
    }))
  });
}
