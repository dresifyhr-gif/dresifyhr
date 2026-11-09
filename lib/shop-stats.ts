import "server-only";

import { unstable_cache } from "next/cache";

import { dbQuery, withLastGood } from "@/lib/db-guard";
import { prisma } from "@/lib/prisma";

// Broj stvarno dostavljenih paketa (za "✅ N+ dostavljenih paketa" na naslovnici).
// Keš 12 h, BEZ taga "orders" — da nova narudžba ne budi bazu zbog jednog broja.
const fetchDeliveredCount = unstable_cache(
  async (): Promise<number> => {
    if (!process.env.DATABASE_URL) return 0;
    return dbQuery(() =>
      prisma.order.count({
        where: {
          OR: [{ status: "done" }, { deliveryStatus: "delivered" }],
          status: { notIn: ["returned", "cancelled"] }
        }
      })
    );
  },
  ["delivered-count-v1"],
  { revalidate: 43200 }
);

export async function getDeliveredCount(): Promise<number> {
  return withLastGood("delivered-count", 0, fetchDeliveredCount);
}
