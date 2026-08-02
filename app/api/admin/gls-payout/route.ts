import { NextResponse } from "next/server";

import { isAdmin } from "@/lib/admin-auth";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// GLS isplata (ponedjeljak): sve GLS narudžbe DOSTAVLJENO + NENAPLAĆENO, najstarije
// dostavljeno prvo. GLS plaća tjedno u nizu (FIFO), pa se uz upisani iznos uplate
// najstarije redom slože do tog iznosa. HP je keš u ruci → ne ulazi.
export async function GET() {
  if (!(await isAdmin())) return NextResponse.json({ ok: false }, { status: 401 });

  const orders = await prisma.order.findMany({
    where: {
      status: { in: ["shipped", "done"] },
      cashCollected: false,
      deliveryStatus: "delivered",
      // GLS = sve što nije HP (null = GLS default)
      OR: [{ courier: null }, { courier: { not: "hp" } }]
    },
    orderBy: { deliveredAt: "asc" },
    select: {
      id: true,
      createdAt: true,
      deliveredAt: true,
      customerName: true,
      total: true,
      shippedBy: true,
      tracking: true
    }
  });

  return NextResponse.json({
    ok: true,
    orders: orders.map((o) => ({
      id: o.id,
      date: o.createdAt.toLocaleDateString("hr-HR"),
      deliveredAt: o.deliveredAt ? o.deliveredAt.toLocaleDateString("hr-HR") : "",
      name: o.customerName,
      amount: o.total, // puni iznos pouzeća = ono što GLS naplati i uplati
      shippedBy: o.shippedBy || null,
      tracking: o.tracking || null
    }))
  });
}
