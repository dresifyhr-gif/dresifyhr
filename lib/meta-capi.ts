import "server-only";

import crypto from "node:crypto";

import { META_PIXEL_ID } from "@/lib/site";

// Meta Conversions API (server-side Purchase). Šalje kupnju IZRAVNO sa servera
// na Metu — ne ovisi o browseru (iOS/ad-blockeri gube dio browser piksela), pa
// Meta dobije SVE kupnje → bolja optimizacija reklama i jeftiniji kupci.
//
// Deduplikacija: browser piksel i server šalju isti `event_id` → Meta ih spoji
// i broji JEDNOM. Zato klijent generira eventId i šalje ga u narudžbi.
//
// Token (META_CAPI_TOKEN) se generira u Events Manager → Postavke → Conversions
// API → Generiraj pristupni token. Bez tokena funkcija tiho ne radi ništa.

const CAPI_TOKEN = process.env.META_CAPI_TOKEN;
const API_VERSION = "v21.0";

// Meta traži SHA-256 hash (lowercase, trimano) za osobne podatke (email/telefon).
const hash = (v?: string | null) => {
  const s = (v ?? "").trim().toLowerCase();
  return s ? crypto.createHash("sha256").update(s).digest("hex") : undefined;
};

// Telefon: samo znamenke, s pozivnim brojem (385...) — bez +, razmaka, nula.
const normalizePhone = (raw?: string | null) => {
  if (!raw) return undefined;
  let d = raw.replace(/\D/g, "");
  if (d.startsWith("00")) d = d.slice(2);
  if (d.startsWith("0")) d = "385" + d.slice(1); // domaći 09x → 3859x
  return d || undefined;
};

type CapiPurchaseInput = {
  eventId?: string; // dijeli se s browser pikselom (dedup)
  eventSourceUrl?: string;
  email?: string | null;
  phone?: string | null;
  value: number;
  currency?: string;
  contentIds?: string[];
  numItems?: number;
  clientIp?: string | null;
  userAgent?: string | null;
  fbp?: string | null; // _fbp cookie
  fbc?: string | null; // _fbc cookie (iz fbclid)
};

export async function sendCapiPurchase(input: CapiPurchaseInput): Promise<{ ok: boolean; error?: string }> {
  if (!CAPI_TOKEN) return { ok: false, error: "no-token" };

  const phone = normalizePhone(input.phone);
  const user_data: Record<string, unknown> = {};
  const em = hash(input.email);
  const ph = hash(phone);
  if (em) user_data.em = [em];
  if (ph) user_data.ph = [ph];
  if (input.clientIp) user_data.client_ip_address = input.clientIp;
  if (input.userAgent) user_data.client_user_agent = input.userAgent;
  if (input.fbp) user_data.fbp = input.fbp;
  if (input.fbc) user_data.fbc = input.fbc;

  const event = {
    event_name: "Purchase",
    event_time: Math.floor(Date.now() / 1000),
    action_source: "website",
    ...(input.eventId ? { event_id: input.eventId } : {}),
    ...(input.eventSourceUrl ? { event_source_url: input.eventSourceUrl } : {}),
    user_data,
    custom_data: {
      currency: input.currency ?? "EUR",
      value: Number(input.value.toFixed(2)),
      ...(input.contentIds?.length ? { content_ids: input.contentIds, content_type: "product" } : {}),
      ...(input.numItems ? { num_items: input.numItems } : {})
    }
  };

  try {
    const url = `https://graph.facebook.com/${API_VERSION}/${META_PIXEL_ID}/events?access_token=${encodeURIComponent(CAPI_TOKEN)}`;
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ data: [event] }),
      cache: "no-store"
    });
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      console.error("[meta-capi] Purchase failed", res.status, text.slice(0, 300));
      return { ok: false, error: `http-${res.status}` };
    }
    return { ok: true };
  } catch (e) {
    console.error("[meta-capi] Purchase error", e);
    return { ok: false, error: "exception" };
  }
}
