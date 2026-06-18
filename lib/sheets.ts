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
        total: payload.subtotal,
      }),
    });

    return { ok: res.ok };
  } catch (error) {
    console.error("[sheets] Failed to log order to Google Sheet", error);
    return { ok: false };
  }
}
