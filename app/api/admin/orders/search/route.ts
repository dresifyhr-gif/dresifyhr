import { NextResponse } from "next/server";

import { isAdmin } from "@/lib/admin-auth";
import { getOrderReference } from "@/lib/orders";
import { prisma } from "@/lib/prisma";
import { formatCroatianName, repairText } from "@/lib/utils";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const PAGE_SIZE = 25;

// Strip Croatian diacritics so search is accent-insensitive: "maric" matches "Marić".
const deaccent = (s: string) =>
  String(s || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/đ/g, "d");

// Full order search for the admin orders page: by name / phone / address,
// accent-insensitive. Paginated, newest first. Small dataset → filter in JS.
export async function GET(request: Request) {
  if (!(await isAdmin())) return NextResponse.json({ ok: false }, { status: 401 });

  const url = new URL(request.url);
  const q = (url.searchParams.get("q") || "").trim();
  const status = url.searchParams.get("status") || ""; // "" | new | shipped | returned | cancelled
  const page = Math.max(1, parseInt(url.searchParams.get("page") || "1", 10) || 1);

  const all = await prisma.order.findMany({
    orderBy: { createdAt: "desc" },
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
      reference: true,
      tracking: true,
      items: { select: { klub: true, igrac: true, size: true, quantity: true } }
    }
  });

  let filtered = all;
  if (status === "shipped") filtered = filtered.filter((o) => o.status === "shipped" || o.status === "done");
  else if (status) filtered = filtered.filter((o) => o.status === status);
  if (q) {
    const nq = deaccent(q);
    const dq = q.replace(/\D/g, "");
    filtered = all.filter((o) => {
      const inName = deaccent(o.customerName).includes(nq);
      const inAddr = deaccent(o.address || "").includes(nq);
      const inPhone = dq.length >= 3 && String(o.phone || "").replace(/\D/g, "").includes(dq);
      return inName || inAddr || inPhone;
    });
  }

  // Neposlane ("new") prve, ostalo po datumu (stabilan sort — prisma već vraća datum desc).
  const rank = (s: string) => (s === "new" ? 0 : 1);
  filtered.sort((a, b) => rank(a.status) - rank(b.status));

  const total = filtered.length;
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const slice = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  return NextResponse.json({
    ok: true,
    page,
    pages,
    total,
    orders: slice.map((o) => ({
      id: o.id,
      date: o.createdAt.toLocaleDateString("hr-HR"),
      reference: o.reference || getOrderReference(o.createdAt.toISOString()),
      customerName: formatCroatianName(o.customerName),
      phone: o.phone || "",
      address: repairText(o.address || ""),
      itemCount: o.itemCount,
      total: o.total,
      status: o.status,
      shippedBy: o.shippedBy || null,
      tracking: o.tracking || "",
      items: o.items.map((it) => ({
        label: repairText([it.klub, it.igrac].filter(Boolean).join(" — ")),
        size: it.size || "",
        quantity: it.quantity
      }))
    }))
  });
}
