import "server-only";

import { prisma } from "@/lib/prisma";

export type Testimonial = { id: string; imageUrl: string; name: string | null; text: string | null };

// Visible testimonials for the shop (ordered). Best-effort: empty if DB unavailable.
export async function getVisibleTestimonials(limit = 24): Promise<Testimonial[]> {
  try {
    if (!process.env.DATABASE_URL) return [];
    const rows = await prisma.testimonial.findMany({
      where: { hidden: false },
      orderBy: [{ sort: "asc" }, { createdAt: "desc" }],
      take: limit,
      select: { id: true, imageUrl: true, name: true, text: true }
    });
    return rows;
  } catch {
    return [];
  }
}
