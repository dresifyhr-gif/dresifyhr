import { NextResponse } from "next/server";
import { unstable_cache } from "next/cache";

import { dbQuery } from "@/lib/db-guard";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
// Ostaje force-dynamic: bez toga Next 14.2 prerenderira ovaj GET pri buildu i
// zamrzne Date.now(). Bazu štiti unstable_cache ispod, ne ova postavka.
export const dynamic = "force-dynamic";

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

// CDN drži odgovor 60 s (isti je za sve posjetitelje), pa većina anketa iz
// preglednika uopće ne pokrene funkciju. I greška se kratko kešira, da ispad
// baze ne pretvori svaku anketu u novi pokušaj spajanja.
const OK_HEADERS = { "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300" };
const ERR_HEADERS = { "Cache-Control": "public, s-maxage=60" };

// Zadnjih 10 narudžbi, već anonimizirano (u keš ne ide puno ime ni adresa).
// Baza se čita samo kad stigne nova narudžba (revalidateTag("orders") u
// /api/orders) ili kad keš istekne — prije je to bilo svakih 90 s iz svakog taba
// i Neon nikad nije mogao zaspati. Namjerno BEZ try/catch unutra: greška se
// tada ne sprema u keš, a Next nastavlja služiti zadnji dobar popis.
const fetchRecentProof = unstable_cache(
  async () => {
    const orders = await dbQuery(() =>
      prisma.order.findMany({
        orderBy: { createdAt: "desc" },
        take: 10,
        select: {
          createdAt: true,
          customerName: true,
          address: true,
          items: { select: { klub: true, igrac: true }, take: 1 }
        }
      })
    );
    return orders
      .map((o) => {
        const it = o.items[0];
        return {
          name: firstName(o.customerName),
          city: parseCity(o.address),
          product: it ? [it.klub, String(it.igrac || "").split("—")[0].trim()].filter(Boolean).join(" ") : "",
          t: o.createdAt.getTime() // epoch ms — JSON-siguran u kešu
        };
      })
      .filter((x) => x.name && x.product);
  },
  ["social-proof-recent-v1"],
  { revalidate: 21600, tags: ["orders"] }
);

export async function GET() {
  if (!process.env.DATABASE_URL) return NextResponse.json({ items: [] }, { headers: OK_HEADERS });
  try {
    const now = Date.now();
    const items = (await fetchRecentProof())
      .filter((i) => now - i.t <= LIVE_WINDOW_MS)
      .map((i) => ({
        name: i.name,
        city: i.city,
        product: i.product,
        agoHours: Math.max(0, Math.round((now - i.t) / 3_600_000))
      }));
    return NextResponse.json({ items }, { headers: OK_HEADERS });
  } catch {
    return NextResponse.json({ items: [] }, { headers: ERR_HEADERS });
  }
}
