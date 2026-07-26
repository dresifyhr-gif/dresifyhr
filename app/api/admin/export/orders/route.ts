import { isAdmin } from "@/lib/admin-auth";
import { codAmount, getOrderReference } from "@/lib/orders";
import { prisma } from "@/lib/prisma";
import { promoGrantsFreeShipping } from "@/lib/promo-db";
import { formatCroatianName, repairText } from "@/lib/utils";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Excel (hr) koristi ; kao razdjelnik stupaca i , kao decimalni zarez.
const SEP = ";";
const money = (n: number) => (n ?? 0).toFixed(2).replace(".", ",");

// CSV-escape: navodnici udvostručeni, polje u navodnicima ako sadrži ; " ili novi red.
function cell(v: string | number | null | undefined): string {
  const s = String(v ?? "");
  return /[";\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

const STATUS_HR: Record<string, string> = {
  new: "Nova",
  shipped: "Poslana",
  done: "Završena",
  returned: "Vraćena",
  cancelled: "Otkazana"
};

const deaccent = (s: string) =>
  String(s || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/đ/g, "d");

export async function GET(request: Request) {
  if (!(await isAdmin())) return new Response("Unauthorized", { status: 401 });

  const url = new URL(request.url);
  const q = (url.searchParams.get("q") || "").trim();
  const status = url.searchParams.get("status") || "";
  const shipper = url.searchParams.get("shipper") || "";
  const cashF = url.searchParams.get("cash") || "";
  const courierF = url.searchParams.get("courier") || "";

  const all = await prisma.order.findMany({
    orderBy: { createdAt: "desc" },
    include: { items: { select: { klub: true, igrac: true, size: true, quantity: true, unitPrice: true } } }
  });

  const isSent = (s: string) => s === "shipped" || s === "done";

  let rows = all;
  if (status === "shipped") rows = rows.filter((o) => isSent(o.status));
  else if (status) rows = rows.filter((o) => o.status === status);
  if (shipper === "igor" || shipper === "ivica") rows = rows.filter((o) => o.shippedBy === shipper);
  if (cashF === "collected" || cashF === "pending") {
    rows = rows.filter((o) => isSent(o.status) && (cashF === "collected" ? o.cashCollected : !o.cashCollected));
  }
  if (courierF === "gls" || courierF === "hp") {
    rows = rows.filter((o) => isSent(o.status) && (courierF === "hp" ? o.courier === "hp" : o.courier !== "hp"));
  }
  if (q) {
    const nq = deaccent(q);
    const dq = q.replace(/\D/g, "");
    rows = rows.filter((o) => {
      const inName = deaccent(o.customerName).includes(nq);
      const inAddr = deaccent(o.address || "").includes(nq);
      const inPhone = dq.length >= 3 && String(o.phone || "").replace(/\D/g, "").includes(dq);
      return inName || inAddr || inPhone;
    });
  }

  const header = [
    "Datum", "Broj narudžbe", "Kupac", "Telefon", "Email", "Adresa",
    "Artikli", "Kom", "Roba (€)", "Dostava (€)", "Ukupno (€)", "Pouzeće (€)",
    "Status", "Poslao", "Kurir", "Pouzeće naplaćeno", "Tracking", "Promo"
  ];

  const lines = [header.map(cell).join(SEP)];
  for (const o of rows) {
    const goods = o.total - (o.shipping ?? 0);
    const isCod = o.payment?.toLowerCase().includes("pouze") || !o.payment;
    // Kao na naljepnici: samo "freeship" kod gasi dostavu, ne bilo koji kod.
    const freeShip = await promoGrantsFreeShipping(o.promoCode, goods);
    const cod = isCod ? codAmount(o.total, o.shipping, o.promoCode, freeShip) : 0;
    const artikli = o.items
      .map((it) => `${repairText([it.klub, it.igrac].filter(Boolean).join(" "))}${it.size ? ` (${it.size})` : ""}${it.quantity > 1 ? ` x${it.quantity}` : ""}`)
      .join(" | ");

    lines.push([
      o.createdAt.toLocaleDateString("hr-HR"),
      o.reference || getOrderReference(o.createdAt.toISOString()),
      formatCroatianName(o.customerName),
      o.phone || "",
      o.email || "",
      repairText(o.address || ""),
      artikli,
      o.itemCount,
      money(goods),
      money(o.shipping ?? 0),
      money(o.total),
      money(cod),
      STATUS_HR[o.status] || o.status,
      o.shippedBy || "",
      isSent(o.status) ? (o.courier === "hp" ? "HP" : "GLS") : "",
      isSent(o.status) ? (o.cashCollected ? "DA" : "NE") : "",
      o.tracking || "",
      o.promoCode || ""
    ].map(cell).join(SEP));
  }

  // BOM (﻿) da Excel ispravno pročita hrvatska slova (UTF-8).
  const csv = "﻿" + lines.join("\r\n");
  const today = new Date().toISOString().slice(0, 10);
  const suffix = [status, shipper, cashF].filter(Boolean).join("-");
  const filename = `dresify-narudzbe-${today}${suffix ? `-${suffix}` : ""}.csv`;

  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`
    }
  });
}
