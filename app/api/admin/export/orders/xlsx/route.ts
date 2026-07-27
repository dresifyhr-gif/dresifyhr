import ExcelJS from "exceljs";

import { isAdmin } from "@/lib/admin-auth";
import { codAmount, getOrderReference } from "@/lib/orders";
import { prisma } from "@/lib/prisma";
import { promoGrantsFreeShipping } from "@/lib/promo-db";
import { formatCroatianName, repairText } from "@/lib/utils";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Stilizirani Excel izvoz narudžbi u Dresify temi (crno + limeta). Za razliku od
// CSV-a (čisti tekst), .xlsx nosi boje, širine stupaca, formatiranje i filtere.

const STATUS_HR: Record<string, string> = {
  new: "Čeka slanje", shipped: "Poslana", done: "Završena", returned: "Vraćena", cancelled: "Otkazana"
};
// Boja statusne ćelije (ARGB) — pozadina + tekst.
const STATUS_FILL: Record<string, { bg: string; fg: string }> = {
  new: { bg: "FFFFF4CC", fg: "FF8A6D00" },        // žuto
  shipped: { bg: "FFD6F5DD", fg: "FF166534" },     // zeleno
  done: { bg: "FFD6F5DD", fg: "FF166534" },
  returned: { bg: "FFFFE0CC", fg: "FF9A3412" },    // narančasto
  cancelled: { bg: "FFFAD4D4", fg: "FF991B1B" }    // crveno
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

  const wb = new ExcelJS.Workbook();
  wb.creator = "Dresify";
  wb.created = new Date();
  const ws = wb.addWorksheet("Narudžbe", {
    views: [{ state: "frozen", ySplit: 1 }], // zamrznut header pri skrolanju
    properties: { defaultRowHeight: 18 }
  });

  const money = "#,##0.00 €";
  ws.columns = [
    { header: "Datum", key: "datum", width: 12 },
    { header: "Broj narudžbe", key: "ref", width: 20 },
    { header: "Kupac", key: "kupac", width: 24 },
    { header: "Telefon", key: "tel", width: 15 },
    { header: "Email", key: "email", width: 26 },
    { header: "Adresa", key: "adresa", width: 34 },
    { header: "Artikli", key: "artikli", width: 46 },
    { header: "Kom", key: "kom", width: 6 },
    { header: "Roba", key: "roba", width: 12, style: { numFmt: money } },
    { header: "Dostava", key: "dostava", width: 11, style: { numFmt: money } },
    { header: "Ukupno", key: "ukupno", width: 12, style: { numFmt: money } },
    { header: "Pouzeće", key: "pouzece", width: 12, style: { numFmt: money } },
    { header: "Status", key: "status", width: 14 },
    { header: "Poslao", key: "poslao", width: 10 },
    { header: "Kurir", key: "kurir", width: 8 },
    { header: "Naplaćeno", key: "naplaceno", width: 11 },
    { header: "Tracking", key: "tracking", width: 18 },
    { header: "Promo", key: "promo", width: 14 }
  ];

  // ── Header: crna pozadina, limeta tekst, podebljano ────────────────────────
  const head = ws.getRow(1);
  head.height = 26;
  head.eachCell((c) => {
    c.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF0D0D0D" } };
    c.font = { bold: true, color: { argb: "FFE8FF3C" }, size: 11 };
    c.alignment = { vertical: "middle", horizontal: "left", indent: 1 };
    c.border = { bottom: { style: "thin", color: { argb: "FF000000" } } };
  });

  // ── Redovi ─────────────────────────────────────────────────────────────────
  for (const o of rows) {
    const goods = o.total - (o.shipping ?? 0);
    const isCod = o.payment?.toLowerCase().includes("pouze") || !o.payment;
    const freeShip = await promoGrantsFreeShipping(o.promoCode, goods);
    const cod = isCod ? codAmount(o.total, o.shipping, o.promoCode, freeShip) : 0;
    const artikli = o.items
      .map((it) => `${repairText([it.klub, it.igrac].filter(Boolean).join(" "))}${it.size ? ` (${it.size})` : ""}${it.quantity > 1 ? ` x${it.quantity}` : ""}`)
      .join(" · ");
    const sent = isSent(o.status);

    const row = ws.addRow({
      datum: o.createdAt.toLocaleDateString("hr-HR"),
      ref: o.reference || getOrderReference(o.createdAt.toISOString()),
      kupac: formatCroatianName(o.customerName),
      tel: o.phone || "",
      email: o.email || "",
      adresa: repairText(o.address || ""),
      artikli,
      kom: o.itemCount,
      roba: goods,
      dostava: o.shipping ?? 0,
      ukupno: o.total,
      pouzece: cod,
      status: STATUS_HR[o.status] || o.status,
      poslao: o.shippedBy ? (o.shippedBy === "ivica" ? "Ivica" : "Igor") : "",
      kurir: sent ? (o.courier === "hp" ? "HP" : "GLS") : "",
      naplaceno: sent ? (o.cashCollected ? "DA" : "NE") : "",
      tracking: o.tracking || "",
      promo: o.promoCode || ""
    });

    // Statusna ćelija u boji
    const sc = STATUS_FILL[o.status];
    if (sc) {
      const cell = row.getCell("status");
      cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: sc.bg } };
      cell.font = { bold: true, color: { argb: sc.fg } };
      cell.alignment = { horizontal: "center" };
    }
    // Naplaćeno DA/NE u boji
    if (sent) {
      const nc = row.getCell("naplaceno");
      const ok = o.cashCollected;
      nc.fill = { type: "pattern", pattern: "solid", fgColor: { argb: ok ? "FFD6F5DD" : "FFFFF4CC" } };
      nc.font = { bold: true, color: { argb: ok ? "FF166534" : "FF8A6D00" } };
      nc.alignment = { horizontal: "center" };
      // Kurir u boji
      const kc = row.getCell("kurir");
      const hp = o.courier === "hp";
      kc.fill = { type: "pattern", pattern: "solid", fgColor: { argb: hp ? "FFD6E4FF" : "FFFFE0CC" } };
      kc.font = { bold: true, color: { argb: hp ? "FF1E40AF" : "FF9A3412" } };
      kc.alignment = { horizontal: "center" };
    }
    row.alignment = { vertical: "middle" };
  }

  // Naizmjenično sjenčanje redova (bez header-a) za čitljivost
  ws.eachRow((r, i) => {
    if (i === 1) return;
    if (i % 2 === 0) {
      r.eachCell((c) => {
        if (!c.fill || (c.fill as ExcelJS.FillPattern).fgColor?.argb === undefined) {
          c.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF7F7F5" } };
        }
      });
    }
  });

  // Filteri na zaglavlju
  ws.autoFilter = { from: { row: 1, column: 1 }, to: { row: 1, column: ws.columns.length } };

  const buf = await wb.xlsx.writeBuffer();
  const today = new Date().toISOString().slice(0, 10);
  const suffix = [status, shipper, cashF, courierF].filter(Boolean).join("-");
  const filename = `dresify-narudzbe-${today}${suffix ? `-${suffix}` : ""}.xlsx`;

  return new Response(buf, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${filename}"`
    }
  });
}
