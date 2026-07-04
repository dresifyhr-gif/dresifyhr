import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const DAY = 86_400_000;

// Anonymize: first name only (never full name / phone / address).
function firstName(name?: string | null): string {
  const n = String(name || "").trim().split(/\s+/)[0] || "";
  // Capitalize first letter, keep the rest as-is.
  return n ? n.charAt(0).toUpperCase() + n.slice(1) : "";
}

function parseCity(address?: string | null): string {
  const parts = String(address || "").split(",").map((s) => s.trim()).filter(Boolean);
  const city = (parts[parts.length - 1] || "")
    .replace(/\d{4,6}/g, "")
    .replace(/^grad\s+/i, "")
    .replace(/\s+/g, " ")
    .trim();
  if (!city) return "";
  return city.charAt(0).toUpperCase() + city.slice(1);
}

// Public feed of recent real purchases for the social-proof popup.
// Only exposes first name + city + product + rough time — no PII.
// Only genuinely fresh orders (last ~20 min) so the popup shows a purchase in
// near-real-time when a shopper is on the site — not stale orders from hours ago.
const LIVE_WINDOW_MS = 20 * 60 * 1000;

export async function GET() {
  try {
    if (!process.env.DATABASE_URL) return NextResponse.json({ items: [] });

    const orders = await prisma.order.findMany({
      where: { createdAt: { gte: new Date(Date.now() - LIVE_WINDOW_MS) } },
      orderBy: { createdAt: "desc" },
      take: 10,
      select: {
        createdAt: true,
        customerName: true,
        address: true,
        items: { select: { klub: true, igrac: true }, take: 1 }
      }
    });

    const items = orders
      .map((o) => {
        const name = firstName(o.customerName);
        const it = o.items[0];
        const product = it ? [it.klub, String(it.igrac || "").split("—")[0].trim()].filter(Boolean).join(" ") : "";
        if (!name || !product) return null;
        return {
          name,
          city: parseCity(o.address),
          product,
          agoHours: Math.max(0, Math.round((Date.now() - o.createdAt.getTime()) / 3_600_000))
        };
      })
      .filter(Boolean)
      .slice(0, 20);

    return NextResponse.json({ items });
  } catch {
    return NextResponse.json({ items: [] });
  }
}
