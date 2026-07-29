import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { sendShippedTrackingEmail } from "@/lib/notifications";
import { checkGlsDeliveries } from "@/lib/gls-tracking";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

// Automatski uvoz GLS paketomat PIN-ova iz paket.hr mailova.
// Google Apps Script čita nove mailove, izvuče PIN + ime primatelja + paket.hr ID,
// i šalje ovamo. Spajamo na pravu Dresify narudžbu po imenu i prezimenu.
// Zaštita: tajni ključ u zaglavlju (PIN_IMPORT_SECRET), jer Apps Script nema admin cookie.

const deaccent = (s: string) =>
  String(s || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/đ/g, "d");

export async function POST(request: Request) {
  const secret = process.env.PIN_IMPORT_SECRET || "";
  if (!secret || request.headers.get("x-pin-secret") !== secret) {
    return NextResponse.json({ ok: false, message: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => ({}));

  // Test slanja maila (za provjeru Resend/inbox) — pošalje "poslano" primjer na zadanu adresu.
  const testEmail = String(body?.testEmail || "").trim();
  if (testEmail) {
    const r = await sendShippedTrackingEmail({ email: testEmail, customerName: "Test Kupac", tracking: "08025585905", courier: "gls" });
    return NextResponse.json({ ok: true, test: true, configured: r.configured, sent: r.sent });
  }

  // Provjera GLS dostave — čita tracking stranicu za sve poslane GLS pošiljke i označi dostavljene.
  if (body?.glsCheck === true) {
    const r = await checkGlsDeliveries({ dryRun: body?.dryRun === true });
    return NextResponse.json({ ok: true, glsCheck: true, dryRun: body?.dryRun === true, ...r });
  }

  // Backfill "poslano" maila za već poslane narudžbe s trackingom koje kupci nisu dobili.
  // dryRun (default) samo vrati listu; slanje tek kad se izričito pošalje dryRun:false.
  if (body?.backfill === true) {
    const sinceDays = Number(body?.sinceDays) > 0 ? Number(body.sinceDays) : 3;
    const dryRun = body?.dryRun !== false;
    const exclude = new Set((Array.isArray(body?.exclude) ? body.exclude : []).map((e: string) => String(e).toLowerCase().trim()));
    const cutoff = new Date(Date.now() - sinceDays * 86_400_000);
    const rows = await prisma.order.findMany({
      where: { status: { in: ["shipped", "done"] }, shippedEmailAt: null, shippedAt: { gte: cutoff } },
      select: { id: true, customerName: true, email: true, tracking: true, courier: true, shippedAt: true }
    });
    const cand = rows.filter((o) => (o.tracking || "").trim() && (o.email || "").trim() && !exclude.has((o.email || "").toLowerCase().trim()));
    if (dryRun) {
      return NextResponse.json({
        ok: true, backfill: true, dryRun: true, count: cand.length,
        preview: cand.map((o) => ({ ime: o.customerName, email: o.email, tracking: o.tracking, poslano: o.shippedAt }))
      });
    }
    let sent = 0;
    for (const o of cand) {
      try {
        const r = await sendShippedTrackingEmail({ email: o.email, customerName: o.customerName, tracking: (o.tracking || "").trim(), courier: o.courier });
        if (r.sent) { await prisma.order.update({ where: { id: o.id }, data: { shippedEmailAt: new Date() } }); sent++; }
      } catch {}
    }
    return NextResponse.json({ ok: true, backfill: true, sent, total: cand.length });
  }

  const pin = String(body?.pin || "").trim();
  const tracking = String(body?.tracking || "").trim();
  const ime = String(body?.ime || "").trim();
  const prezime = String(body?.prezime || "").trim();
  const paketId = String(body?.paketId || "").trim() || null;

  // ── Uvoz TRACKING broja (drugi paket.hr mail, nakon predaje u paketomat) ──
  // Spaja se na narudžbu po paket.hr ID-u (koji smo spremili kad je stigao PIN).
  if (tracking) {
    if (!paketId) return NextResponse.json({ ok: false, message: "Tracking bez paketId" }, { status: 400 });
    const ord = await prisma.order.findFirst({ where: { paketId }, select: { id: true, customerName: true, tracking: true, email: true, courier: true, shippedEmailAt: true } });
    if (!ord) return NextResponse.json({ ok: true, matched: false, reason: "Nema narudžbe s tim paket.hr ID-om", paketId });
    let emailed = false;
    if (ord.tracking !== tracking) {
      await prisma.order.update({ where: { id: ord.id }, data: { tracking } });
      // Auto-mail kupcu "poslano + tracking" — samo kad tracking prvi put dođe i ako nije već poslan (dedup).
      if (!ord.shippedEmailAt) {
        try {
          const r = await sendShippedTrackingEmail({ email: ord.email, customerName: ord.customerName, tracking, courier: ord.courier });
          if (r.sent) { await prisma.order.update({ where: { id: ord.id }, data: { shippedEmailAt: new Date() } }); emailed = true; }
        } catch {}
      }
    }
    return NextResponse.json({ ok: true, matched: true, orderId: ord.id, customerName: ord.customerName, tracking, emailed });
  }

  if (!pin || (!ime && !prezime)) {
    return NextResponse.json({ ok: false, message: "Nedostaje pin ili ime" }, { status: 400 });
  }

  // Idempotentno: ako je taj PIN već negdje upisan (isti paket.hr ID ili isti PIN), ne diramo.
  const already = await prisma.order.findFirst({
    where: paketId ? { OR: [{ paketId }, { pin }] } : { pin },
    select: { id: true, customerName: true }
  });
  if (already) {
    return NextResponse.json({ ok: true, matched: true, orderId: already.id, alreadyHad: true, customerName: already.customerName });
  }

  // Kandidati: narudžbe čije ime sadrži i ime i prezime primatelja (bez dijakritike).
  // Mali skup → filtriramo u JS-u (kao i pretraga narudžbi).
  const orders = await prisma.order.findMany({
    orderBy: { createdAt: "desc" },
    select: { id: true, customerName: true, createdAt: true, status: true, courier: true, pin: true }
  });
  const dIme = deaccent(ime);
  const dPrez = deaccent(prezime);
  const matches = orders.filter((o) => {
    const n = deaccent(o.customerName);
    return (!dIme || n.includes(dIme)) && (!dPrez || n.includes(dPrez));
  });

  if (matches.length === 0) {
    // Zabilježimo da mail nije spojen — Apps Script će to logirati, a Gazda može ručno.
    return NextResponse.json({ ok: true, matched: false, reason: "Nema narudžbe s tim imenom", ime, prezime });
  }

  // Odaberi najbolju: bez postojećeg PIN-a > GLS/prazan kurir (paketomat PIN nije za HP) > najnovija.
  const best = [...matches].sort((a, b) => {
    const pinRank = (o: typeof a) => (o.pin ? 1 : 0);
    if (pinRank(a) !== pinRank(b)) return pinRank(a) - pinRank(b);
    const glsRank = (o: typeof a) => (o.courier === "hp" ? 1 : 0);
    if (glsRank(a) !== glsRank(b)) return glsRank(a) - glsRank(b);
    return b.createdAt.getTime() - a.createdAt.getTime();
  })[0];

  await prisma.order.update({ where: { id: best.id }, data: { pin, ...(paketId ? { paketId } : {}) } });

  return NextResponse.json({
    ok: true,
    matched: true,
    orderId: best.id,
    customerName: best.customerName,
    ambiguous: matches.length > 1 // više kandidata istog imena — Gazda neka provjeri
  });
}
