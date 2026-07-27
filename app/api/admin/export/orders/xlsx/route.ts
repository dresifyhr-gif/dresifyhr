import ExcelJS from "exceljs";

import { isAdmin } from "@/lib/admin-auth";
import { prisma } from "@/lib/prisma";
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
  // Otkazane ne idu u Excel — nikad nisu ni poslane, na njih nije izgubljeno ništa.
  // Vraćene ostaju (kupac odbio pouzeće, izgubljena dostava).
  rows = rows.filter((o) => o.status !== "cancelled");

  const wb = new ExcelJS.Workbook();
  wb.creator = "Dresify";
  wb.created = new Date();
  const ws = wb.addWorksheet("Narudžbe", {
    views: [{ state: "frozen", ySplit: 1 }], // zamrznut header pri skrolanju
    properties: { defaultRowHeight: 18 }
  });

  const money = "#,##0.00 €";
  ws.columns = [
    { header: "Datum", key: "datum", width: 13 },
    { header: "Kupac", key: "kupac", width: 26 },
    { header: "Telefon", key: "tel", width: 16 },
    { header: "Email", key: "email", width: 28 },
    { header: "Adresa", key: "adresa", width: 36 },
    { header: "Artikli", key: "artikli", width: 50 },
    { header: "Kom", key: "kom", width: 7 },
    { header: "Roba", key: "roba", width: 13, style: { numFmt: money } },
    { header: "Dostava", key: "dostava", width: 12, style: { numFmt: money } },
    { header: "Ukupno", key: "ukupno", width: 13, style: { numFmt: money } },
    { header: "Status", key: "status", width: 15 },
    { header: "Poslao", key: "poslao", width: 11 },
    { header: "Kurir", key: "kurir", width: 9 },
    { header: "Naplaćeno", key: "naplaceno", width: 12 },
    { header: "Tracking", key: "tracking", width: 20 },
    { header: "Promo", key: "promo", width: 15 }
  ];

  // ── Header: crna pozadina, limeta tekst, podebljano ────────────────────────
  const head = ws.getRow(1);
  head.height = 30;
  head.eachCell((c) => {
    c.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF0D0D0D" } };
    c.font = { bold: true, color: { argb: "FFE8FF3C" }, size: 13 };
    c.alignment = { vertical: "middle", horizontal: "left", indent: 1 };
    c.border = { bottom: { style: "thin", color: { argb: "FF000000" } } };
  });

  // ── Redovi ─────────────────────────────────────────────────────────────────
  const sum = { poslCount: 0, poslTotal: 0, naplCount: 0, naplTotal: 0, vratCount: 0, vratTotal: 0 };
  for (const o of rows) {
    const goods = o.total - (o.shipping ?? 0);
    const artikli = o.items
      .map((it) => `${repairText([it.klub, it.igrac].filter(Boolean).join(" "))}${it.size ? ` (${it.size})` : ""}${it.quantity > 1 ? ` x${it.quantity}` : ""}`)
      .join(" · ");
    const sent = isSent(o.status);

    // Zbrojevi (nad onim što je u tablici): poslano, naplaćeno, vraćeno — po iznosu "Ukupno".
    if (sent) { sum.poslCount++; sum.poslTotal += o.total; if (o.cashCollected) { sum.naplCount++; sum.naplTotal += o.total; } }
    if (o.status === "returned") { sum.vratCount++; sum.vratTotal += o.total; }

    const row = ws.addRow({
      datum: o.createdAt.toLocaleDateString("hr-HR"),
      kupac: formatCroatianName(o.customerName),
      tel: o.phone || "",
      email: o.email || "",
      adresa: repairText(o.address || ""),
      artikli,
      kom: o.itemCount,
      roba: goods,
      dostava: o.shipping ?? 0,
      ukupno: o.total,
      status: STATUS_HR[o.status] || o.status,
      poslao: o.shippedBy ? (o.shippedBy === "ivica" ? "Ivica" : "Igor") : "",
      kurir: sent ? (o.courier === "hp" ? "HP" : "GLS") : "",
      naplaceno: sent ? (o.cashCollected ? "DA" : "NE") : "",
      tracking: o.tracking || "",
      promo: o.promoCode || ""
    });

    // Podebljano i malo veći font kroz cijeli red (Gazda tražio).
    row.font = { bold: true, size: 12 };
    row.height = 20;
    row.alignment = { vertical: "middle" };

    // Statusna ćelija u boji
    const sc = STATUS_FILL[o.status];
    if (sc) {
      const cell = row.getCell("status");
      cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: sc.bg } };
      cell.font = { bold: true, size: 12, color: { argb: sc.fg } };
      cell.alignment = { horizontal: "center", vertical: "middle" };
    }
    // Naplaćeno DA/NE u boji
    if (sent) {
      const nc = row.getCell("naplaceno");
      const ok = o.cashCollected;
      nc.fill = { type: "pattern", pattern: "solid", fgColor: { argb: ok ? "FFD6F5DD" : "FFFFF4CC" } };
      nc.font = { bold: true, size: 12, color: { argb: ok ? "FF166534" : "FF8A6D00" } };
      nc.alignment = { horizontal: "center", vertical: "middle" };
      // Kurir u boji
      const kc = row.getCell("kurir");
      const hp = o.courier === "hp";
      kc.fill = { type: "pattern", pattern: "solid", fgColor: { argb: hp ? "FFD6E4FF" : "FFFFE0CC" } };
      kc.font = { bold: true, size: 12, color: { argb: hp ? "FF1E40AF" : "FF9A3412" } };
      kc.alignment = { horizontal: "center", vertical: "middle" };
    }
  }

  const dataLastRow = ws.rowCount; // zadnji red PODATAKA (prije zbrojeva)

  // Naizmjenično sjenčanje redova podataka (bez header-a) za čitljivost
  for (let i = 2; i <= dataLastRow; i++) {
    if (i % 2 !== 0) continue;
    ws.getRow(i).eachCell((c) => {
      if (!c.fill || (c.fill as ExcelJS.FillPattern).fgColor?.argb === undefined) {
        c.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF7F7F5" } };
      }
    });
  }

  // Filteri na zaglavlju (samo nad podacima)
  ws.autoFilter = { from: { row: 1, column: 1 }, to: { row: 1, column: ws.columns.length } };

  // ── Zbrojevi na dnu ─────────────────────────────────────────────────────────
  ws.addRow({}); // razmak (prekida i doseg filtera)
  const addSummary = (label: string, count: number, total: number, bg: string, fg: string) => {
    const r = ws.addRow({ kupac: label, ukupno: total });
    r.height = 24;
    for (let col = 1; col <= ws.columns.length; col++) {
      const c = r.getCell(col);
      c.fill = { type: "pattern", pattern: "solid", fgColor: { argb: bg } };
      c.font = { bold: true, size: 13, color: { argb: fg } };
      c.alignment = { vertical: "middle" };
    }
    r.getCell("kupac").value = `${label} — ${count} narudžbi`;
    r.getCell("ukupno").numFmt = "#,##0.00 €";
  };
  addSummary("UKUPNO POSLANO", sum.poslCount, sum.poslTotal, "FFD6F5DD", "FF166534");
  addSummary("UKUPNO NAPLAĆENO", sum.naplCount, sum.naplTotal, "FFCDEEDD", "FF0F5132");
  addSummary("UKUPNO VRAĆENO", sum.vratCount, sum.vratTotal, "FFFAD4D4", "FF991B1B");

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
