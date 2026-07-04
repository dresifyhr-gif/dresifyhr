import type { OrderPayload } from "@/lib/orders";

// Logs each order to a Google Sheet via a Google Apps Script Web App.
// Set GOOGLE_SHEETS_WEBHOOK_URL to the deployed Apps Script URL.
// No-ops silently if the URL isn't configured, and never blocks/fails the order.

export async function logOrderToSheet(payload: OrderPayload) {
  const url = process.env.GOOGLE_SHEETS_WEBHOOK_URL;
  if (!url) {
    return { ok: false, skipped: true as const };
  }

  const address = [payload.street, payload.postalCode, payload.city]
    .filter(Boolean)
    .join(", ");

  const eur = (n: number) => `${n.toFixed(2)} €`;
  const dostava = payload.shipping === 0 ? "BESPLATNA" : eur(payload.shipping);
  const popust = payload.discount ? `-${eur(payload.discount)}` : "";

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        createdAt: payload.createdAt,
        name: payload.name,
        phone: payload.phone,
        email: payload.email,
        address,
        items: payload.cartSummary || payload.details,
        itemCount: payload.itemCount,
        fulfillment: payload.fulfillment,
        payment: payload.payment,
        // numeric so existing "Ukupno" column + sum formulas keep working
        subtotal: payload.subtotal,
        total: payload.total,
        // readable info columns
        dostava,
        popust,
        promoCode: payload.promoCode || "",
        napomena: payload.note || "",
      }),
    });

    return { ok: res.ok };
  } catch (error) {
    console.error("[sheets] Failed to log order to Google Sheet", error);
    return { ok: false };
  }
}

// Ticks (or un-ticks) the "Poslao" checkbox for an order in the Google Sheet so
// the Sheet (used by Ivica/wife) and the admin stay in sync. Best-effort:
// no-ops if the webhook isn't configured, never throws. Requires the Apps Script
// to handle `action: "markShipped"` (see admin docs).
export async function markOrderShippedInSheet(order: {
  phone?: string | null;
  name?: string | null;
  createdAt?: string | Date | null;
  shipped: boolean;
}) {
  const url = process.env.GOOGLE_SHEETS_WEBHOOK_URL;
  if (!url) return { ok: false, skipped: true as const };
  // Guard: only fire once the Apps Script knows how to handle `action:"markShipped"`.
  // Otherwise the existing doPost would append a junk row. Flip on after deploying.
  if (process.env.SHEET_SYNC_ENABLED !== "1") return { ok: false, skipped: true as const };

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "markShipped",
        phone: order.phone || "",
        name: order.name || "",
        createdAt: order.createdAt ? new Date(order.createdAt).toISOString() : "",
        shipped: order.shipped
      })
    });
    return { ok: res.ok };
  } catch (error) {
    console.error("[sheets] Failed to sync shipped status to Google Sheet", error);
    return { ok: false };
  }
}

// Reads which orders are marked shipped in the Sheet (by Ivica/wife) so the admin
// queue reflects their checkmarks. Returns a set of normalized phone numbers.
// Requires the Apps Script `doGet?action=shipped` endpoint. Best-effort.
export async function fetchShippedPhonesFromSheet(): Promise<string[]> {
  const url = process.env.GOOGLE_SHEETS_WEBHOOK_URL;
  if (!url || process.env.SHEET_SYNC_ENABLED !== "1") return [];
  try {
    const sep = url.includes("?") ? "&" : "?";
    const res = await fetch(`${url}${sep}action=shipped`, { method: "GET" });
    if (!res.ok) return [];
    const data = await res.json().catch(() => null);
    const arr = Array.isArray(data) ? data : Array.isArray(data?.phones) ? data.phones : [];
    return arr.map((p: unknown) => String(p ?? "").replace(/\D/g, "")).filter(Boolean);
  } catch (error) {
    console.error("[sheets] Failed to fetch shipped phones from Google Sheet", error);
    return [];
  }
}
