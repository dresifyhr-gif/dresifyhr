import "server-only";

import { prisma } from "@/lib/prisma";

// Bodovi: svaka prijava = 1 osnovni bod. Za svaku kupnju (narudžbu) +5 bodova.
// Kupnje se spajaju na prijavu po Clerk userId (registrirani) ILI po IG handleu
// upisanom na checkoutu (gosti) — tako i nepregistrirani kupci skupljaju bodove.
export const POINTS_PER_ORDER = 5;

// Normalizira IG handle: makne @, URL dio, razmake, lowercase. Dozvoli a-z 0-9 . _
export function normalizeIgHandle(raw: unknown): string | null {
  let h = String(raw || "").trim().toLowerCase();
  h = h.replace(/^https?:\/\/(www\.)?instagram\.com\//, "").replace(/\/.*$/, "");
  h = h.replace(/^@+/, "").trim();
  if (!/^[a-z0-9._]{1,30}$/.test(h)) return null;
  return h;
}

// Auto-prijava u nagradnu igru iz narudžbe (IG upisan na checkoutu). Best-effort,
// nikad ne ruši narudžbu. Upsert po handleu → nema duplih prijava.
export async function autoEnterGiveaway(handle: unknown, name: string | null, userId: string | null): Promise<void> {
  const h = normalizeIgHandle(handle);
  if (!h) return;
  await prisma.giveawayEntry
    .upsert({
      where: { handle: h },
      update: { ...(userId ? { userId } : {}), ...(name ? { name } : {}) },
      create: { handle: h, userId, name }
    })
    .catch(() => null);
}

export type DrawEntry = { handle: string; name: string | null; registered: boolean; orders: number; tickets: number };

export async function getDrawPool(): Promise<{ entries: DrawEntry[]; totalTickets: number; participants: number }> {
  const rows = await prisma.giveawayEntry.findMany({ orderBy: { createdAt: "asc" } });

  // Sve narudžbe koje mogu nositi bodove (imaju userId ili igHandle), osim otkazanih.
  const orders = await prisma.order.findMany({
    where: { status: { notIn: ["cancelled"] }, OR: [{ userId: { not: null } }, { igHandle: { not: null } }] },
    select: { userId: true, igHandle: true }
  });
  const ordersByUser = new Map<string, number>();
  const ordersByHandle = new Map<string, number>();
  for (const o of orders) {
    if (o.userId) ordersByUser.set(o.userId, (ordersByUser.get(o.userId) ?? 0) + 1);
    const h = normalizeIgHandle(o.igHandle);
    if (h) ordersByHandle.set(h, (ordersByHandle.get(h) ?? 0) + 1);
  }

  const entries: DrawEntry[] = rows.map((r) => {
    // Kupnje po userId ILI po handleu; uzmi veći broj da se ista narudžba ne broji dvaput
    // (registriran kupac koji je i upisao IG na checkoutu → obje mape sadrže tu narudžbu).
    const byUser = r.userId ? ordersByUser.get(r.userId) ?? 0 : 0;
    const byHandle = ordersByHandle.get(r.handle) ?? 0;
    const orderCount = Math.max(byUser, byHandle);
    return { handle: r.handle, name: r.name, registered: !!r.userId, orders: orderCount, tickets: 1 + POINTS_PER_ORDER * orderCount };
  });

  const totalTickets = entries.reduce((s, e) => s + e.tickets, 0);
  return { entries, totalTickets, participants: entries.length };
}
