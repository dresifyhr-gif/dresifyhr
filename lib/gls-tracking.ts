import "server-only";

import { prisma } from "@/lib/prisma";

// Čita GLS tracking stranicu (nema službeni API) i utvrđuje je li pošiljka dostavljena.
// Status "05-Dostavljeno" = isporučeno primatelju.
const GLS_TT = "https://online.gls-croatia.com/tt_page.php?tt_value=";

export async function isDeliveredGls(tracking: string): Promise<boolean> {
  try {
    const res = await fetch(GLS_TT + encodeURIComponent(tracking), { signal: AbortSignal.timeout(12000) });
    if (!res.ok) return false;
    const text = (await res.text()).replace(/<[^>]*>/g, " ");
    return /05-\s*Dostavljeno/i.test(text);
  } catch {
    return false;
  }
}

// Prođe kroz sve poslane GLS narudžbe s trackingom koje još nisu označene dostavljenima,
// provjeri GLS status i označi dostavljene (deliveredAt). Male grupe da ne gnjavimo GLS.
export async function checkGlsDeliveries(opts: { dryRun?: boolean } = {}) {
  const orders = await prisma.order.findMany({
    where: { status: { in: ["shipped", "done"] }, deliveredAt: null, courier: { not: "hp" } },
    select: { id: true, customerName: true, tracking: true }
  });
  const cand = orders.filter((o) => (o.tracking || "").trim());
  const delivered: { name: string; tracking: string }[] = [];
  const BATCH = 5;
  for (let i = 0; i < cand.length; i += BATCH) {
    const chunk = cand.slice(i, i + BATCH);
    const results = await Promise.all(
      chunk.map(async (o) => ({ o, ok: await isDeliveredGls((o.tracking || "").trim()) }))
    );
    for (const { o, ok } of results) {
      if (!ok) continue;
      if (!opts.dryRun) await prisma.order.update({ where: { id: o.id }, data: { deliveredAt: new Date() } });
      delivered.push({ name: o.customerName, tracking: (o.tracking || "").trim() });
    }
  }
  return { checked: cand.length, delivered: delivered.length, list: delivered };
}
