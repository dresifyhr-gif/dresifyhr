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
  by?: string | null; // "igor" | "ivica" → written to the "Poslao" column
}) {
  const url = process.env.GOOGLE_SHEETS_WEBHOOK_URL;
  if (!url) return { ok: false, skipped: true as const };
  // Guard: only fire once the Apps Script knows how to handle `action:"markShipped"`.
  // Otherwise the existing doPost would append a junk row. Flip on after deploying.
  if (process.env.SHEET_SYNC_ENABLED !== "1") return { ok: false, skipped: true as const };

  const byLabel = order.by === "ivica" ? "Ivica" : order.by === "igor" ? "Igor" : "";

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "markShipped",
        phone: order.phone || "",
        name: order.name || "",
        createdAt: order.createdAt ? new Date(order.createdAt).toISOString() : "",
        shipped: order.shipped,
        by: byLabel
      })
    });
    return { ok: res.ok };
  } catch (error) {
    console.error("[sheets] Failed to sync shipped status to Google Sheet", error);
    return { ok: false };
  }
}

export type SheetShippedRow = { phone: string; by: "igor" | "ivica" | null };

// Mirrors a cancel/return into the Sheet: marks the row resolved (Odradeno=TRUE so
// it leaves the "za slanje" view) and writes a status note ("OTKAZANO"/"VRAĆENO…").
// Requires Apps Script `action:"setStatus"`. Gated + best-effort.
export async function setOrderStatusInSheet(order: {
  phone?: string | null;
  name?: string | null;
  createdAt?: string | Date | null;
  note: string;
}) {
  const url = process.env.GOOGLE_SHEETS_WEBHOOK_URL;
  // Separate flag: only on AFTER the Apps Script has the setStatus handler, else the
  // current doPost would append a junk row for the unknown action.
  if (!url || process.env.SHEET_STATUS_SYNC !== "1") return { ok: false, skipped: true as const };

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "setStatus",
        phone: order.phone || "",
        name: order.name || "",
        createdAt: order.createdAt ? new Date(order.createdAt).toISOString() : "",
        note: order.note
      })
    });
    return { ok: res.ok };
  } catch (error) {
    console.error("[sheets] Failed to sync status to Google Sheet", error);
    return { ok: false };
  }
}

// Reads which orders are marked shipped in the Sheet (Odradeno checkbox) plus who
// shipped them (Poslao column), so the admin queue + Igor/Ivica split reflect the
// Sheet. Returns normalized phone + shipper. Requires the Apps Script
// `doGet?action=shipped` endpoint. Best-effort.
export async function fetchShippedPhonesFromSheet(): Promise<SheetShippedRow[]> {
  const url = process.env.GOOGLE_SHEETS_WEBHOOK_URL;
  if (!url || process.env.SHEET_SYNC_ENABLED !== "1") return [];
  try {
    const sep = url.includes("?") ? "&" : "?";
    const res = await fetch(`${url}${sep}action=shipped`, { method: "GET" });
    if (!res.ok) return [];
    const data = await res.json().catch(() => null);
    const arr: unknown[] = Array.isArray(data?.shipped) ? data.shipped : Array.isArray(data) ? data : [];
    const mapBy = (v: unknown): "igor" | "ivica" | null => {
      const s = String(v ?? "").toLowerCase();
      return s.includes("ivic") ? "ivica" : s.includes("igor") ? "igor" : null;
    };
    return arr
      .map((r): SheetShippedRow => {
        const row = r as { phone?: unknown; by?: unknown };
        return { phone: String(row?.phone ?? "").replace(/\D/g, ""), by: mapBy(row?.by) };
      })
      .filter((r) => r.phone);
  } catch (error) {
    console.error("[sheets] Failed to fetch shipped rows from Google Sheet", error);
    return [];
  }
}
