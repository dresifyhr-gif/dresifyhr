import ExcelJS from "exceljs";
import sharp from "sharp";

import { isActiveAdmin } from "@/lib/admin-auth";
import { SNAPSHOT_SHEET, loadStockRows, sizeColumns } from "@/lib/stock-excel";
import { repairText } from "@/lib/utils";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 120;

// Excel zalihe sa slikom svakog proizvoda (Igor 28.11.). Upiši količine po veličini i
// vrati preko "Uvoz zalihe". Stupac ŠIFRA se NE mijenja (po njemu se prepoznaje proizvod).
export async function GET(request: Request) {
  if (!(await isActiveAdmin())) return new Response("Unauthorized", { status: 401 });
  const origin = new URL(request.url).origin;
  const rows = await loadStockRows();
  const sizeCols = sizeColumns(rows);

  // Sličice (JPEG 120 px visine, ~5× manje od PNG-a → Excel ostaje ispod limita uploada).
  const thumbs = new Map<string, { buf: Buffer; w: number; h: number }>();
  const queue = rows.filter((r) => r.image);
  for (let i = 0; i < queue.length; i += 8) {
    await Promise.all(queue.slice(i, i + 8).map(async (r) => {
      try {
        const url = r.image!.startsWith("http") ? r.image! : `${origin}${r.image}`;
        const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
        if (!res.ok) return;
        const buf = Buffer.from(await res.arrayBuffer());
        const { data, info } = await sharp(buf).resize({ height: 120, withoutEnlargement: true }).flatten({ background: "#ffffff" }).jpeg({ quality: 72 }).toBuffer({ resolveWithObject: true });
        thumbs.set(r.slug, { buf: data, w: info.width, h: info.height });
      } catch { /* bez slike */ }
    }));
  }

  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet("Zaliha", { views: [{ state: "frozen", xSplit: 3, ySplit: 1 }] });
  ws.columns = [
    { header: "Slika", key: "img", width: 14 },
    { header: "Klub", key: "klub", width: 18 },
    { header: "Model", key: "igrac", width: 36 },
    ...sizeCols.map((s) => ({ header: s, key: `s_${s}`, width: 7 })),
    { header: "Ukupno", key: "total", width: 9 },
    { header: "ŠIFRA (ne mijenjati)", key: "slug", width: 40 }
  ];
  const head = ws.getRow(1);
  head.font = { bold: true };
  head.alignment = { vertical: "middle", horizontal: "center" };
  head.height = 22;

  const grey: ExcelJS.Fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFD9D9D9" } };
  rows.forEach((r, i) => {
    const rowNum = i + 2;
    const values: Record<string, unknown> = { klub: repairText(r.klub), igrac: repairText(r.igrac), slug: r.slug };
    for (const s of sizeCols) if (r.sizes.includes(s) && r.stock && s in r.stock) values[`s_${s}`] = r.stock[s];
    const row = ws.addRow(values);
    row.height = 92;
    row.alignment = { vertical: "middle" };
    sizeCols.forEach((s, k) => {
      const cell = row.getCell(4 + k);
      cell.alignment = { vertical: "middle", horizontal: "center" };
      if (!r.sizes.includes(s)) cell.fill = grey; // veličina ne postoji za taj proizvod
    });
    const first = ws.getColumn(4).letter, last = ws.getColumn(3 + sizeCols.length).letter;
    row.getCell(4 + sizeCols.length).value = { formula: `SUM(${first}${rowNum}:${last}${rowNum})` };
    row.getCell(4 + sizeCols.length).font = { bold: true };
    row.getCell(5 + sizeCols.length).font = { color: { argb: "FF888888" }, size: 9 };
    const t = thumbs.get(r.slug);
    if (t) {
      const id = wb.addImage({ base64: t.buf.toString("base64"), extension: "jpeg" });
      const scale = Math.min(90 / t.w, 115 / t.h); // bez razvlačenja (široke slike streetweara)
      ws.addImage(id, { tl: { col: 0.1, row: rowNum - 1 + 0.05 }, ext: { width: Math.round(t.w * scale), height: Math.round(t.h * scale) } });
    }
  });

  // Skriveni snimak izvoza: pri uvozu se mijenja SAMO ono što se u Excelu promijenilo
  // (stari Excel vraćen nakon prodaje ne vraća prodane veličine u prodaju).
  const snap = wb.addWorksheet(SNAPSHOT_SHEET, { state: "veryHidden" });
  for (const r of rows) {
    const exp: Record<string, number> = {};
    for (const s of r.sizes) if (r.stock && s in r.stock) exp[s] = r.stock[s];
    snap.addRow([r.slug, JSON.stringify(exp)]);
  }

  const help = wb.addWorksheet("Upute");
  help.getColumn(1).width = 110;
  [
    "UPUTE — zaliha po veličinama",
    "1. Upiši broj komada za svaku veličinu (0 = nema). Sive ćelije = ta veličina ne postoji za taj dres.",
    "2. Mijenja se SAMO ono što promijeniš. Prazna ili nedirana ćelija = ta veličina ostaje kakva je. Ako veličine nema, upiši 0 (rasprodana).",
    "3. Ne mijenjaj stupac ŠIFRA — po njemu se prepoznaje dres. Redove smiješ presložiti i brisati.",
    "4. U adminu → Proizvodi → „Uvoz zalihe”: prvo vidiš pregled promjena, pa potvrdiš."
  ].forEach((t, i) => { const c = help.getCell(i + 1, 1); c.value = t; if (i === 0) c.font = { bold: true, size: 13 }; });

  const buf = await wb.xlsx.writeBuffer();
  const d = new Date().toISOString().slice(0, 10);
  return new Response(buf as ArrayBuffer, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="dresify-zaliha-${d}.xlsx"`
    }
  });
}
