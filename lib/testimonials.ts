import "server-only";

import { unstable_cache } from "next/cache";

import { dbQuery, withLastGood } from "@/lib/db-guard";
import { prisma } from "@/lib/prisma";

export type Testimonial = { id: string; imageUrl: string; name: string | null; text: string | null };

// Visible testimonials for the shop (ordered). Keš 6 h u Vercel Data Cache;
// svježinu daje revalidateTag("testimonials") iz admina. Keširana funkcija
// namjerno baca grešku (ne vraća []), da ispad baze ne pregazi zadnje dobre
// recenzije — vidi lib/db-guard.ts i lib/data/product-overrides.ts.
const fetchVisibleTestimonials = unstable_cache(
  async (limit: number): Promise<Testimonial[]> => {
    if (!process.env.DATABASE_URL) return [];
    return dbQuery(() =>
      prisma.testimonial.findMany({
        where: { hidden: false },
        orderBy: [{ sort: "asc" }, { createdAt: "desc" }],
        take: limit,
        select: { id: true, imageUrl: true, name: true, text: true }
      })
    );
  },
  ["visible-testimonials-v2"],
  { revalidate: 21600, tags: ["testimonials"] }
);

export async function getVisibleTestimonials(limit = 24): Promise<Testimonial[]> {
  return withLastGood(`testimonials:${limit}`, [] as Testimonial[], () => fetchVisibleTestimonials(limit));
}
