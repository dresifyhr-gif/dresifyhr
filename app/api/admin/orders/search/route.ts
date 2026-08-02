import { NextResponse } from "next/server";

import { isAdmin } from "@/lib/admin-auth";
import { getOrderReference } from "@/lib/orders";
import { prisma } from "@/lib/prisma";
import { getSettings } from "@/lib/settings";
import { formatCroatianName, phoneKey, repairText } from "@/lib/utils";

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
  const shipper = url.searchParams.get("shipper") || ""; // "" | igor | ivica  (tko je poslao)
  const cashF = url.searchParams.get("cash") || ""; // "" | collected | pending  (naplata poslanih)
  const courierF = url.searchParams.get("courier") || ""; // "" | gls | hp  (kurir poslanih)
  const deliveryF = url.searchParams.get("delivery") || ""; // "" | delivered | transit | prep  (GLS status dostave)
  const sort = url.searchParams.get("sort") || ""; // "" (new-first) | old | new
  const page = Math.max(1, parseInt(url.searchParams.get("page") || "1", 10) || 1);

  const { riskMinFailed, costDres, costKomplet, costStreetwear } = await getSettings();
  // Streetwear slugovi imaju svoju nabavu (prodaja 50 €), da se ne broje kao dres.
  const streetwearSlugs = new Set(
    (await prisma.customProduct.findMany({ where: { category: "streetwear" }, select: { slug: true } }))
      .map((p) => p.slug)
      .filter((s): s is string => !!s)
  );
  const all = await prisma.order.findMany({
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      createdAt: true,
      customerName: true,
      phone: true,
      email: true,
      address: true,
      itemCount: true,
      total: true,
      shipping: true,
      status: true,
      cancelReason: true,
      shippedBy: true,
      courier: true,
      reference: true,
      tracking: true,
      pin: true,
      deliveredAt: true,
      deliveryStatus: true,
      promoCode: true,
      cashCollected: true,
      items: { select: { id: true, slug: true, klub: true, igrac: true, size: true, quantity: true, unitPrice: true } }
    }
  });

  const isSent = (s: string) => s === "shipped" || s === "done";

  // ── Rizik kupca ─────────────────────────────────────────────────────────
  // Po telefonu (phoneKey iz lib/utils) izbroji koliko je narudžbi propalo (otkazano ili vraćeno) i
  // koliko ih je uspješno preuzeto (naplaćeno pouzeće). Cijela povijest kupca.
  const historyByPhone = new Map<string, { failed: number; collected: number; total: number }>();
  for (const o of all) {
    const key = phoneKey(o.phone);
    if (!key) continue;
    const h = historyByPhone.get(key) || { failed: 0, collected: 0, total: 0 };
    h.total++;
    // Rizik = SAMO vraćene pošiljke (kupac odbio pouzeće). Otkazane ne broje —
    // njih otkaže Gazda ili su zbog njegove greške; ništa nije poslano ni izgubljeno.
    if (o.status === "returned") h.failed++;
    else if (isSent(o.status) && o.cashCollected) h.collected++;
    historyByPhone.set(key, h);
  }
  // Rizik POJEDINE narudžbe = propale narudžbe tog broja BEZ trenutne
  // (zanima nas ima li kupac RANIJE odbijanja, ne broji se ova narudžba).
  const riskFor = (o: { phone?: string | null; status: string }) => {
    const key = phoneKey(o.phone);
    const h = key ? historyByPhone.get(key) : null;
    if (!h) return { failed: 0, collected: 0, priorOrders: 0 };
    const isThisFailed = o.status === "returned";
    return {
      failed: h.failed - (isThisFailed ? 1 : 0), // ranija odbijanja
      collected: h.collected,
      priorOrders: h.total - 1
    };
  };

  let filtered = all;
  if (status === "shipped") filtered = filtered.filter((o) => isSent(o.status));
  else if (status) filtered = filtered.filter((o) => o.status === status);
  if (q) {
    const nq = deaccent(q);
    const dq = q.replace(/\D/g, "");
    // Pretraga se primjenjuje NA VEĆ FILTRIRANO (prije je resetirala status filter).
    filtered = filtered.filter((o) => {
      const inName = deaccent(o.customerName).includes(nq);
      const inAddr = deaccent(o.address || "").includes(nq);
      const inPhone = dq.length >= 3 && String(o.phone || "").replace(/\D/g, "").includes(dq);
      return inName || inAddr || inPhone;
    });
  }
  // Tko je poslao (Igor / Ivica).
  if (shipper === "igor" || shipper === "ivica") {
    filtered = filtered.filter((o) => o.shippedBy === shipper);
  }
  // Naplata — odnosi se samo na POSLANE narudžbe.
  if (cashF === "collected" || cashF === "pending") {
    filtered = filtered.filter((o) => isSent(o.status) && (cashF === "collected" ? o.cashCollected : !o.cashCollected));
  }
  // Kurir — poslane preko GLS-a ili HP-a. null tretiramo kao GLS (kao i prikaz).
  if (courierF === "gls" || courierF === "hp") {
    filtered = filtered.filter((o) => isSent(o.status) && (courierF === "hp" ? o.courier === "hp" : o.courier !== "hp"));
  }
  // Status dostave (auto-provjera): dostavljeno / na dostavi / u pripremi.
  // Samo NE-prikupljene — prikupljeno = završeno, ne prati se više dostava.
  if (deliveryF === "delivered" || deliveryF === "transit" || deliveryF === "prep") {
    filtered = filtered.filter((o) => (o.deliveryStatus || "") === deliveryF && !o.cashCollected);
  }

  if (sort === "old") {
    filtered = [...filtered].sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
  } else if (sort === "new") {
    filtered = [...filtered].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  } else {
    // Zadano: neposlane ("new") prve, ostalo po datumu (prisma već vraća datum desc; stabilan sort).
    const rank = (s: string) => (s === "new" ? 0 : 1);
    filtered = [...filtered].sort((a, b) => rank(a.status) - rank(b.status));
  }

  const total = filtered.length;
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const slice = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  // Sažetak pouzeća (nad SVIM poslanim narudžbama, neovisno o pretrazi/filteru).
  // Prikupio = tko je poslao (shippedBy). Iznos = ROBA BEZ DOSTAVE (dostava nije
  // prihod — to je povrat onoga što je pošiljatelj platio iz svog džepa).
  // Komplet (dres + hlačice + lopta + kapa) ima drukčiju maržu → broji se odvojeno od dresa.
  const isKomplet = (it: { slug?: string | null; klub?: string | null; igrac?: string | null }) =>
    /komplet/i.test(it.slug || "") || /komplet/i.test(it.klub || "") || /komplet/i.test(it.igrac || "");

  // Koliko je dresova/kompleta u SVIM filtriranim narudžbama (ne samo na ovoj
  // stranici) — popis se učitava stranicu po stranicu, pa se ne može zbrojiti
  // na klijentu. Komplet se broji odvojeno (drukčija marža), isto kao u sažetku.
  let filteredDresovi = 0, filteredKompleti = 0;
  for (const o of filtered) {
    for (const it of o.items) { const q = it.quantity || 1; if (isKomplet(it)) filteredKompleti += q; else filteredDresovi += q; }
  }

  // Sažetak razloga otkazivanja (nad SVIM otkazanim narudžbama) — da Gazda vidi
  // obrazac: "15× nemam veličinu, 8× predugo čekanje…".
  const cancelReasons: { reason: string; count: number }[] = (() => {
    const m = new Map<string, number>();
    for (const o of all) {
      if (o.status !== "cancelled") continue;
      const r = (o.cancelReason || "").trim() || "Bez razloga";
      m.set(r, (m.get(r) || 0) + 1);
    }
    return [...m.entries()].map(([reason, count]) => ({ reason, count })).sort((a, b) => b.count - a.count);
  })();

  const sent = all.filter((o) => o.status === "shipped" || o.status === "done");
  const cash = {
    pendingCount: 0, pendingTotal: 0, pendingDresovi: 0, pendingKompleti: 0,
    collectedTotal: 0, collectedDresovi: 0, collectedKompleti: 0,
    igorCollected: 0, ivicaCollected: 0, igorPending: 0, ivicaPending: 0,
    igorDresovi: 0, igorKompleti: 0, ivicaDresovi: 0, ivicaKompleti: 0
  };
  for (const o of sent) {
    // PRIKAZ: puni iznos pouzeća (roba + dostava) — usklađeno s "za sjesti na račun" i bankom.
    const amt = o.total;
    let dresovi = 0, kompleti = 0;
    for (const it of o.items) { const q = it.quantity || 1; if (isKomplet(it)) kompleti += q; else dresovi += q; }
    const who = o.shippedBy === "ivica" ? "ivica" : o.shippedBy === "igor" ? "igor" : "";
    if (o.cashCollected) {
      cash.collectedTotal += amt; cash.collectedDresovi += dresovi; cash.collectedKompleti += kompleti;
      if (who === "igor") { cash.igorCollected += amt; cash.igorDresovi += dresovi; cash.igorKompleti += kompleti; }
      else if (who === "ivica") { cash.ivicaCollected += amt; cash.ivicaDresovi += dresovi; cash.ivicaKompleti += kompleti; }
    } else {
      cash.pendingCount++; cash.pendingTotal += amt; cash.pendingDresovi += dresovi; cash.pendingKompleti += kompleti;
      if (who === "igor") cash.igorPending += amt; else if (who === "ivica") cash.ivicaPending += amt;
    }
  }

  // Dostavljeno ali još NENAPLAĆENO — novac koji treba sjesti na račun (pouzeće u pipelineu).
  // SAMO GLS: kod GLS-a pouzeće ide preko GLS-a na bankovni račun. HP dostave su keš u ruci
  // (dobiješ gotovinu na dostavi), to ne sjeda na račun pa se ovdje ne broji.
  // Nabava po artiklu (uz količinu): streetwear > komplet > dres. Neto = cijena − nabava
  // (isti model kao profit u admin-metrics; dostava se ne oduzima, kao kod "komplet 40 − 18 = 22").
  const orderCost = (o: { items: { slug?: string | null; klub?: string | null; igrac?: string | null; quantity?: number | null }[] }) => {
    let c = 0;
    for (const it of o.items) {
      const qty = it.quantity || 1;
      const unit = it.slug && streetwearSlugs.has(it.slug) ? costStreetwear : isKomplet(it) ? costKomplet : costDres;
      c += unit * qty;
    }
    return c;
  };

  let deliveredPendingTotal = 0, deliveredPendingCount = 0, deliveredPendingNet = 0;
  // glsPendingTotal = SVE GLS pouzeće koje tek treba sjesti na račun (poslano + nenaplaćeno).
  // Iznosi su PUNI iznos pouzeća (roba + dostava) jer GLS na račun uplati baš toliko —
  // tako se "za sjesti na račun" poklapa s bankom i s alatom GLS isplata.
  let glsPendingTotal = 0;
  for (const o of all) {
    const isGlsPending = isSent(o.status) && !o.cashCollected && o.courier !== "hp";
    if (!isGlsPending) continue;
    const cod = o.total; // puni iznos pouzeća (sjeda na račun)
    const netRobe = o.total - (o.shipping ?? 0); // neto roba (za profit; dostava nije prihod)
    glsPendingTotal += cod;
    if (o.deliveryStatus === "delivered") {
      deliveredPendingTotal += cod;
      deliveredPendingNet += netRobe - orderCost(o);
      deliveredPendingCount++;
    }
  }

  return NextResponse.json({
    ok: true,
    page,
    pages,
    total,
    filteredDresovi,
    filteredKompleti,
    cash,
    deliveredPending: { total: deliveredPendingTotal, count: deliveredPendingCount, glsPendingTotal, net: deliveredPendingNet },
    cancelReasons,
    orders: slice.map((o) => ({
      id: o.id,
      date: o.createdAt.toLocaleDateString("hr-HR"),
      reference: o.reference || getOrderReference(o.createdAt.toISOString()),
      customerName: formatCroatianName(o.customerName),
      phone: o.phone || "",
      email: o.email || "",
      address: repairText(o.address || ""),
      itemCount: o.itemCount,
      total: o.total - (o.shipping ?? 0),
      status: o.status,
      cancelReason: o.cancelReason || null,
      shippedBy: o.shippedBy || null,
      courier: o.courier || null,
      tracking: o.tracking || "",
      pin: o.pin || null,
      delivered: !!o.deliveredAt,
      deliveryStatus: o.deliveryStatus || null,
      promoCode: o.promoCode || null,
      cashCollected: o.cashCollected,
      risk: { ...riskFor(o), min: riskMinFailed },
      items: o.items.map((it) => ({
        id: it.id,
        klub: repairText(it.klub || ""),
        igrac: repairText(it.igrac || ""),
        label: repairText([it.klub, it.igrac].filter(Boolean).join(" — ")),
        size: it.size || "",
        quantity: it.quantity,
        unitPrice: it.unitPrice
      }))
    }))
  });
}
