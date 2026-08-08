import { NextResponse } from "next/server";

import { isAdmin } from "@/lib/admin-auth";
import { prisma } from "@/lib/prisma";
import { formatCroatianName } from "@/lib/utils";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// CSV izvoz emailova PRAVIH kupaca (poslano/dostavljeno) za Brevo kampanju nagradne igre.
// Dedupe po emailu; zadnja poznata narudžba daje ime. Bez otkazanih/novih/vraćenih.
export async function GET() {
  if (!(await isAdmin())) return NextResponse.json({ ok: false }, { status: 401 });

  const rows = await prisma.order.findMany({
    where: { status: { in: ["shipped", "done"] }, email: { not: null } },
    orderBy: { createdAt: "desc" },
    select: { email: true, customerName: true }
  });

  const seen = new Map<string, string>(); // email(lower) → ime
  for (const r of rows) {
    const email = (r.email || "").trim().toLowerCase();
    if (!email || !email.includes("@")) continue;
    if (!seen.has(email)) seen.set(email, formatCroatianName(r.customerName || "") || "");
  }

  const esc = (s: string) => (/[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s);
  const lines = ["EMAIL,IME"];
  for (const [email, name] of seen) lines.push(`${esc(email)},${esc(name)}`);
  const csv = "﻿" + lines.join("\n"); // BOM za ispravan prikaz č/ć/š u Excelu

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="dresify-kupci-emailovi.csv"`
    }
  });
}
