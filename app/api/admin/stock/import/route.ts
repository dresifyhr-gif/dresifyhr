import ExcelJS from "exceljs";
import { NextResponse } from "next/server";
import { revalidateTag } from "next/cache";

import { isActiveAdmin } from "@/lib/admin-auth";
import { prisma } from "@/lib/prisma";
import { SNAPSHOT_SHEET, loadStockRows, mergeStock } from "@/lib/stock-excel";
import { repairText } from "@/lib/utils";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Change = { slug: string; name: string; before: Record<string, number> | null; after: Record<string, number>; outOfStock: string };

// Tekst ćelije bez obzira na oblik (obični, oblikovani tekst, poveznica, formula).
const cellText = (c: ExcelJS.Cell) => {
  const v = c.value as unknown;
  if (v && typeof v === "object" && "result" in (v as object)) return String((v as { result?: unknown }).result ?? "").trim();
  return String(c.text ?? "").trim();
};
const parseNum = (t: string): number | null | "bad" => {
  if (!t) return null;
  const n = Number(t.replace(",", "."));
  return Number.isFinite(n) && n >= 0 && Number.isInteger(n) ? n : "bad";
};

// Uvoz zalihe iz Excela (izvoz /api/admin/stock/export). Bez ?apply=1 samo vraća pregled
// promjena; s ?apply=1 upisuje. Mijenja se SAMO ono što je u Excelu promijenjeno u odnosu na
// izvoz (skriveni list _izvoz) — prazna ili nedirana ćelija ne dira veličinu.
export async function POST(request: Request) {
  if (!(await isActiveAdmin())) return NextResponse.json({ ok: false }, { status: 401 });
  const apply = new URL(request.url).searchParams.get("apply") === "1";
  const form = await request.formData().catch(() => null);
  const file = form?.get("file");
  if (!file || typeof file === "string") return NextResponse.json({ ok: false, message: "Odaberi Excel datoteku." }, { status: 400 });

  const wb = new ExcelJS.Workbook();
  try {
    await wb.xlsx.load(Buffer.from(await file.arrayBuffer()) as unknown as ArrayBuffer);
  } catch {
    return NextResponse.json({ ok: false, message: "To nije ispravna .xlsx datoteka." }, { status: 400 });
  }
  const ws = wb.getWorksheet("Zaliha") ?? wb.worksheets.find((w) => w.name !== SNAPSHOT_SHEET);
  if (!ws) return NextResponse.json({ ok: false, message: "Excel nema list Zaliha." }, { status: 400 });

  // Snimak izvoza: slug → { veličina: broj u trenutku izvoza }.
  const snapshot = new Map<string, Record<string, number>>();
  const snapWs = wb.getWorksheet(SNAPSHOT_SHEET);
  snapWs?.eachRow((row) => {
    const slug = cellText(row.getCell(1));
    try { if (slug) snapshot.set(slug, JSON.parse(cellText(row.getCell(2)) || "{}")); } catch { /* preskoči */ }
  });

  // Stupci po zaglavlju (redoslijed se smije mijenjati).
  let slugCol = 0;
  const headerCol = new Map<string, number>();
  ws.getRow(1).eachCell((cell, col) => {
    const h = cellText(cell);
    if (/^(Š|S)IFRA/i.test(h)) slugCol = col;
    else if (h) headerCol.set(h, col);
  });
  if (!slugCol) return NextResponse.json({ ok: false, message: "Nema stupca ŠIFRA — koristi Excel iz izvoza." }, { status: 400 });

  const products = new Map((await loadStockRows()).map((r) => [r.slug, r]));
  const changes: Change[] = [];
  const unknown: string[] = [];
  const errors: string[] = [];
  let unchanged = 0;

  for (let r = 2; r <= ws.rowCount; r++) {
    const row = ws.getRow(r);
    const slug = cellText(row.getCell(slugCol));
    if (!slug) continue;
    const p = products.get(slug);
    if (!p) { unknown.push(slug); continue; }
    const name = `${repairText(p.klub)} ${repairText(p.igrac)}`;
    const exported = snapshot.get(slug); // undefined = Excel bez snimka → svaki upis se računa
    const entered: Record<string, number> = {};
    let bad = false;
    for (const s of p.sizes) {
      const col = headerCol.get(s);
      if (!col) continue;
      const n = parseNum(cellText(row.getCell(col)));
      if (n === "bad") { bad = true; continue; }
      if (n === null) continue; // prazno = ne diram
      if (exported && exported[s] === n) continue; // isto kao u izvozu = nije mijenjano
      entered[s] = n;
    }
    if (bad) { errors.push(`${name}: neispravan broj (samo cijeli brojevi ≥ 0)`); continue; }
    if (!Object.keys(entered).length) { unchanged++; continue; }
    const next = mergeStock(p, entered);
    // Trenirka: dućan nudi samo upisane veličine — djelomičan upis bi ostale maknuo iz dućana.
    if (p.category === "trenirka") {
      const missing = p.shown.filter((s) => !(s in next.stock));
      if (missing.length) {
        errors.push(`${name}: kod trenirke upiši SVE veličine (fali ${missing.join(", ")}; inače nestaju iz dućana)`);
        continue;
      }
    }
    const before = p.stock ?? {};
    const same = Object.keys(next.stock).length === Object.keys(before).length && Object.entries(next.stock).every(([s, n]) => before[s] === n);
    if (same) { unchanged++; continue; }
    changes.push({ slug, name, before: p.stock, after: next.stock, outOfStock: next.outOfStock });
  }

  if (apply && !errors.length) {
    for (const c of changes) {
      const p = products.get(c.slug)!;
      // c.after = cijela nova zaliha; promijenjene su samo veličine različite od trenutnih.
      const entered = Object.fromEntries(Object.entries(c.after).filter(([s, n]) => p.stock?.[s] !== n));
      const next = mergeStock(p, entered);
      // Ručni ukupni broj (stock) se briše SAMO kad su sve veličine upisane (tada vrijedi zbroj).
      const full = p.sizes.every((s) => s in next.stock);
      const data = { sizeStock: JSON.stringify(next.stock), soldOutSizes: next.soldOutSizes, outOfStock: next.outOfStock, ...(full ? { stock: null } : {}) };
      if (p.custom) await prisma.customProduct.update({ where: { slug: c.slug }, data });
      else await prisma.productOverride.upsert({ where: { slug: c.slug }, create: { slug: c.slug, ...data }, update: data });
    }
    if (changes.length) revalidateTag("products");
  }

  return NextResponse.json({ ok: true, applied: apply && !errors.length, changes, unknown, errors, unchanged, skipped: 0, noSnapshot: !snapWs });
}
