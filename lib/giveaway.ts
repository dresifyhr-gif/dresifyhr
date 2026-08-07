import "server-only";

import { prisma } from "@/lib/prisma";
import { phoneKey } from "@/lib/utils";

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
export async function autoEnterGiveaway(
  handle: unknown,
  name: string | null,
  userId: string | null,
  email?: string | null,
  phone?: string | null
): Promise<void> {
  const h = normalizeIgHandle(handle);
  if (!h) return;
  const em = (email || "").toLowerCase() || null;
  const pk = phoneKey(phone || "") || null;
  await prisma.giveawayEntry
    .upsert({
      where: { handle: h },
      update: { ...(userId ? { userId } : {}), ...(name ? { name } : {}), ...(em ? { email: em } : {}), ...(pk ? { phoneKey: pk } : {}) },
      create: { handle: h, userId, name, email: em, phoneKey: pk }
    })
    .catch(() => null);
}

export type DrawEntry = { handle: string; name: string | null; registered: boolean; orders: number; tickets: number };

export async function getDrawPool(): Promise<{ entries: DrawEntry[]; totalTickets: number; participants: number }> {
  const rows = await prisma.giveawayEntry.findMany({ orderBy: { createdAt: "asc" } });

  // SVE narudžbe (osim otkazanih) — spajamo ih na prijavu po bilo kojem ključu:
  // userId (registriran), IG handle (checkout), email ili telefon (STARE kupnje kupca
  // koji se sad registrirao/prijavio). Tako ranije kupnje vrijede bodove.
  const orders = await prisma.order.findMany({
    where: { status: { notIn: ["cancelled"] } },
    select: { id: true, userId: true, igHandle: true, email: true, phone: true }
  });
  const norm = orders.map((o) => ({
    id: o.id,
    userId: o.userId,
    handle: normalizeIgHandle(o.igHandle),
    email: (o.email || "").toLowerCase() || null,
    pk: phoneKey(o.phone || "") || null
  }));

  const entries: DrawEntry[] = rows.map((r) => {
    // Broj RAZLIČITIH narudžbi koje se poklapaju s ovom prijavom (bilo kojim ključem).
    const orderCount = norm.filter(
      (o) =>
        (r.userId && o.userId === r.userId) ||
        (o.handle && o.handle === r.handle) ||
        (r.email && o.email === r.email) ||
        (r.phoneKey && o.pk === r.phoneKey)
    ).length;
    return { handle: r.handle, name: r.name, registered: !!r.userId, orders: orderCount, tickets: 1 + POINTS_PER_ORDER * orderCount };
  });

  const totalTickets = entries.reduce((s, e) => s + e.tickets, 0);
  return { entries, totalTickets, participants: entries.length };
}
