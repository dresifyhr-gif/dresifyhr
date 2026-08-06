import "server-only";

import { prisma } from "@/lib/prisma";

// Listići: svaka prijava = 1 osnovni listić. Registrirani (imaju userId) dobiju +5 po
// narudžbi (kupnja = veća šansa). Gosti bez userId ostaju na osnovnom listiću jer im
// kupnje ne možemo pouzdano spojiti.
export const TICKETS_PER_ORDER = 5;

export type DrawEntry = { handle: string; name: string | null; registered: boolean; orders: number; tickets: number };

export async function getDrawPool(): Promise<{ entries: DrawEntry[]; totalTickets: number; participants: number }> {
  const rows = await prisma.giveawayEntry.findMany({ orderBy: { createdAt: "asc" } });
  const userIds = rows.map((r) => r.userId).filter((u): u is string => !!u);

  const orderCounts = new Map<string, number>();
  if (userIds.length) {
    const grouped = await prisma.order.groupBy({
      by: ["userId"],
      _count: { _all: true },
      where: { userId: { in: userIds }, status: { notIn: ["cancelled"] } }
    });
    for (const g of grouped) if (g.userId) orderCounts.set(g.userId, g._count._all);
  }

  const entries: DrawEntry[] = rows.map((r) => {
    const orders = r.userId ? orderCounts.get(r.userId) ?? 0 : 0;
    return { handle: r.handle, name: r.name, registered: !!r.userId, orders, tickets: 1 + TICKETS_PER_ORDER * orders };
  });

  const totalTickets = entries.reduce((s, e) => s + e.tickets, 0);
  return { entries, totalTickets, participants: entries.length };
}
