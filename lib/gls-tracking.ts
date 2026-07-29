import "server-only";

import { prisma } from "@/lib/prisma";

// Čita GLS tracking stranicu (nema službeni API) i mapira status u 3 kategorije:
//  "delivered" = 05-Dostavljeno (isporučeno primatelju)
//  "transit"   = u mreži / na dostavi (03-Depo ulaz, 04-Sken dostavne liste)
//  "prep"      = tek predano / u obradi (97-Predano u Paketomat, 85/84-P&S, 01-APL…)
const GLS_TT = "https://online.gls-croatia.com/tt_page.php?tt_value=";

export type GlsStatus = "delivered" | "transit" | "prep" | null;

export async function glsStatus(tracking: string): Promise<GlsStatus> {
  try {
    const res = await fetch(GLS_TT + encodeURIComponent(tracking), { signal: AbortSignal.timeout(12000) });
    if (!res.ok) return null;
    const t = (await res.text()).replace(/<[^>]*>/g, " ");
    if (/05-\s*Dostavljeno/i.test(t)) return "delivered";
    if (/0[34]-\s*(Depo|Sken)/i.test(t)) return "transit";
    return "prep";
  } catch {
    return null;
  }
}

// Prođe kroz sve poslane GLS narudžbe s trackingom, dohvati GLS status i spremi ga
// (deliveryStatus; deliveredAt kad je dostavljeno). Male grupe da ne gnjavimo GLS.
export async function checkGlsDeliveries(opts: { dryRun?: boolean } = {}) {
  const orders = await prisma.order.findMany({
    where: { status: { in: ["shipped", "done"] }, courier: { not: "hp" } },
    select: { id: true, customerName: true, tracking: true, deliveryStatus: true }
  });
  const cand = orders.filter((o) => (o.tracking || "").trim());
  const counts = { delivered: 0, transit: 0, prep: 0, unknown: 0 };
  const newlyDelivered: { name: string; tracking: string }[] = [];
  const BATCH = 5;
  for (let i = 0; i < cand.length; i += BATCH) {
    const chunk = cand.slice(i, i + BATCH);
    const results = await Promise.all(
      chunk.map(async (o) => ({ o, st: await glsStatus((o.tracking || "").trim()) }))
    );
    for (const { o, st } of results) {
      if (!st) { counts.unknown++; continue; }
      counts[st]++;
      if (st === "delivered" && o.deliveryStatus !== "delivered") newlyDelivered.push({ name: o.customerName, tracking: (o.tracking || "").trim() });
      if (!opts.dryRun && o.deliveryStatus !== st) {
        await prisma.order.update({
          where: { id: o.id },
          data: { deliveryStatus: st, ...(st === "delivered" ? { deliveredAt: new Date() } : {}) }
        });
      }
    }
  }
  return { checked: cand.length, ...counts, newlyDelivered: newlyDelivered.length, list: newlyDelivered };
}
