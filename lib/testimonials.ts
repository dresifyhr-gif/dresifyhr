import "server-only";

import { unstable_cache } from "next/cache";

import { prisma } from "@/lib/prisma";

export type Testimonial = { id: string; imageUrl: string; name: string | null; text: string | null };

// Visible testimonials for the shop (ordered). Keširano 60s u Vercel Data Cache —
// stranice su dinamičke (i18n), pa bez ovoga svaki render gađa bazu. Best-effort.
export const getVisibleTestimonials = unstable_cache(
  async (limit = 24): Promise<Testimonial[]> => {
    try {
      if (!process.env.DATABASE_URL) return [];
      return await prisma.testimonial.findMany({
        where: { hidden: false },
        orderBy: [{ sort: "asc" }, { createdAt: "desc" }],
        take: limit,
        select: { id: true, imageUrl: true, name: true, text: true }
      });
    } catch {
      return [];
    }
  },
  ["visible-testimonials"],
  { revalidate: 60, tags: ["testimonials"] }
);
