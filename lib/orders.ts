import { FREE_SHIPPING_THRESHOLD_EUR, SHIPPING_PRICE_EUR } from "@/lib/site";

export type FulfillmentType = "delivery";
export type ContactChannelType = "web" | "whatsapp" | "instagram";

export type OrderLineInput = {
  slug: string;
  klub: string;
  igrac: string;
  size: string;
  segment: string;
  unitPrice: number;
};

export type OrderPayload = {
  name: string;
  phone: string;
  email: string;
  street?: string;
  city?: string;
  postalCode?: string;
  details: string;
  cartSummary?: string;
  contactChannel: ContactChannelType;
  fulfillment: FulfillmentType;
  payment: string;
  note?: string;
  subtotal: number;
  shipping: number;
  total: number;
  discount?: number;
  promoCode?: string;
  itemCount: number;
  createdAt: string;
  items?: OrderLineInput[];
};

const fulfillmentLabels: Record<FulfillmentType, string> = {
  delivery: "Dostava pouzećem"
};

const contactChannelLabels: Record<ContactChannelType, string> = {
  web: "Web narudžba",
  whatsapp: "WhatsApp",
  instagram: "Instagram"
};

export function getOrderReference(createdAt: string) {
  const date = new Date(createdAt);
  const year = date.getFullYear().toString().slice(-2);
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  return `DRS-${year}${month}${day}-${hours}${minutes}`;
}

// Otkupnina (koliko kupac plaća pouzećem) = roba + dostava, po istoj logici kao blagajna.
// Robustno i za uvezene narudžbe gdje dostava nije zapisana (shipping=0): preračuna se.
// Besplatna dostava kad roba ≥ 60 €, inače 5 €.
export function codAmount(total: number, shipping: number): number {
  const goods = Math.max(0, (total ?? 0) - (shipping ?? 0));
  const delivery = goods >= FREE_SHIPPING_THRESHOLD_EUR ? 0 : SHIPPING_PRICE_EUR;
  return goods + delivery;
}

export function formatOrderTimestamp(createdAt: string) {
  return new Intl.DateTimeFormat("hr-HR", {
    dateStyle: "full",
    timeStyle: "short"
  }).format(new Date(createdAt));
}

function parseMoney(value: unknown) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function normalizeText(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

export function parseOrderPayload(body: unknown): { payload?: OrderPayload; errors: string[] } {
  if (!body || typeof body !== "object") {
    return { errors: ["Neispravni podaci narudžbe."] };
  }

  const source = body as Record<string, unknown>;

  const payload: OrderPayload = {
    name: normalizeText(source.name),
    phone: normalizeText(source.phone),
    email: normalizeText(source.email),
    street: normalizeText(source.street),
    city: normalizeText(source.city),
    postalCode: normalizeText(source.postalCode),
    details: normalizeText(source.details),
    cartSummary: normalizeText(source.cartSummary),
    contactChannel: (normalizeText(source.contactChannel) as ContactChannelType) || "web",
    fulfillment: (normalizeText(source.fulfillment) as FulfillmentType) || "delivery",
    payment: normalizeText(source.payment),
    note: normalizeText(source.note),
    subtotal: parseMoney(source.subtotal),
    shipping: parseMoney(source.shipping),
    total: parseMoney(source.total),
    discount: parseMoney(source.discount),
    promoCode: normalizeText(source.promoCode),
    itemCount: Math.max(0, Math.trunc(parseMoney(source.itemCount))),
    createdAt: normalizeText(source.createdAt) || new Date().toISOString(),
    items: (Array.isArray(source.items) ? source.items : []).map((raw) => {
      const it = (raw ?? {}) as Record<string, unknown>;
      return {
        slug: normalizeText(it.slug),
        klub: normalizeText(it.klub),
        igrac: normalizeText(it.igrac),
        size: normalizeText(it.size),
        segment: normalizeText(it.segment),
        unitPrice: parseMoney(it.unitPrice)
      };
    })
  };

  const errors: string[] = [];

  if (!payload.name) errors.push("Upiši ime i prezime.");
  if (!payload.phone) errors.push("Upiši broj mobitela.");
  if (!payload.email) errors.push("Upiši email adresu.");
  if (!payload.details) errors.push("Odaberi dresove iz košarice ili ručno upiši što želiš naručiti.");

  if (payload.fulfillment === "delivery" && (!payload.street || !payload.city || !payload.postalCode)) {
    errors.push("Upiši ulicu, grad i poštanski broj za dostavu.");
  }

  if (payload.total <= 0) {
    errors.push("Ukupan iznos narudžbe nije ispravan.");
  }

  return { payload: errors.length ? undefined : payload, errors };
}

export function buildOrderSubject(order: OrderPayload) {
  const reference = getOrderReference(order.createdAt);
  const destination = "POUZEĆE";
  const titleLine = order.details
    .split("\n")
    .find((line) => line.trim().length > 0 && /^\d+\./.test(line.trim()));
  const compactTitle = titleLine?.replace(/^\d+\.\s*/, "").replace(/\s+/g, " ").slice(0, 70);

  return compactTitle
    ? `Nova narudžba #${reference} [${destination}] - ${compactTitle} - ${order.name}`
    : `Nova narudžba #${reference} [${destination}] - ${order.name}`;
}

export function buildCustomerOrderSubject(order: OrderPayload) {
  const reference = getOrderReference(order.createdAt);
  return `Potvrda narudžbe #${reference} - DRESIFY`;
}

export function buildOrderText(order: OrderPayload) {
  const reference = getOrderReference(order.createdAt);
  const timestamp = formatOrderTimestamp(order.createdAt);

  return [
    `Nova DRESIFY narudžba #${reference}`,
    "",
    `Vrijeme: ${timestamp}`,
    `Kupac: ${order.name}`,
    `Mobitel: ${order.phone}`,
    `Email: ${order.email}`,
    `Kanal: ${contactChannelLabels[order.contactChannel]}`,
    `Način dostave: ${fulfillmentLabels[order.fulfillment]}`,
    `Plaćanje: ${order.payment}`,
    `Broj artikala: ${order.itemCount}`,
    `Subtotal: ${formatEuro(order.subtotal)}`,
    order.discount && order.discount > 0 ? `Popust${order.promoCode ? ` (${order.promoCode})` : ""}: -${formatEuro(order.discount)}` : undefined,
    `Dostava: ${formatEuro(order.shipping)}`,
    `Ukupno: ${formatEuro(order.total)}`,
    "",
    "Artikli:",
    order.details,
    order.cartSummary ? "" : undefined,
    order.cartSummary ? "Sažetak košarice:" : undefined,
    order.cartSummary || undefined,
    "",
    "Adresa dostave:",
    [order.street, `${order.postalCode} ${order.city}`].filter(Boolean).join("\n"),
    "",
    `Kontakt za potvrdu: ${order.phone} • ${order.email}`
  ]
    .filter(Boolean)
    .join("\n");
}

export function buildCustomerOrderText(order: OrderPayload) {
  const reference = getOrderReference(order.createdAt);
  return [
    `Hvala na narudžbi #${reference}!`,
    "",
    `${order.name}, zaprimili smo tvoju narudžbu #${reference}.`,
    "",
    `Način dostave: ${fulfillmentLabels[order.fulfillment]}`,
    `Plaćanje: ${order.payment}`,
    ...(order.discount && order.discount > 0
      ? [`Popust${order.promoCode ? ` (${order.promoCode})` : ""}: -${formatEuro(order.discount)}`]
      : []),
    `Ukupno: ${formatEuro(order.total)}`,
    "",
    "Tvoj odabir:",
    order.details,
    "",
    "Ako bude trebalo, javit ćemo ti se na ovaj email ili broj mobitela koji si upisao."
  ].join("\n");
}

export function buildOrderHtml(order: OrderPayload) {
  const reference = getOrderReference(order.createdAt);
  const timestamp = formatOrderTimestamp(order.createdAt);

  return `
  <div style="background:#0a0a0a;padding:40px 0;font-family:Barlow,Arial,sans-serif;color:#101010;">
    <div style="max-width:680px;margin:0 auto;background:#ffffff;border-radius:24px;overflow:hidden;">
      <div style="background:#e8ff3c;padding:24px 28px;">
        <div style="font-size:12px;letter-spacing:3px;text-transform:uppercase;">Nova narudžba</div>
        <div style="font-family:'Bebas Neue',Arial,sans-serif;font-size:28px;line-height:1;margin-top:6px;">DRESIFY</div>
      </div>
      <div style="padding:28px;">
        <table style="width:100%;border-collapse:collapse;font-size:16px;">
          ${row("Referenca", reference)}
          ${row("Vrijeme", timestamp)}
          ${row("Kupac", order.name)}
          ${row("Mobitel", order.phone)}
          ${row("Email", order.email)}
          ${row("Kanal", contactChannelLabels[order.contactChannel])}
          ${row("Način dostave", fulfillmentLabels[order.fulfillment])}
          ${row("Plaćanje", order.payment)}
          ${row("Broj artikala", String(order.itemCount))}
          ${row("Subtotal", formatEuro(order.subtotal))}
          ${order.discount && order.discount > 0 ? row(`Popust${order.promoCode ? ` (${escapeHtml(order.promoCode)})` : ""}`, `-${formatEuro(order.discount)}`) : ""}
          ${row("Dostava", formatEuro(order.shipping))}
          ${row("Ukupno", formatEuro(order.total))}
        </table>
        ${section("Artikli", order.details)}
        ${order.cartSummary ? section("Sažetak košarice", order.cartSummary) : ""}
        ${section("Adresa dostave", [order.street, `${order.postalCode} ${order.city}`].filter(Boolean).join("\n"))}
        <div style="margin-top:28px;padding-top:20px;border-top:1px solid rgba(16,16,16,0.12);font-size:14px;color:#555;">
          Kontakt za potvrdu: ${escapeHtml(order.phone)} • ${escapeHtml(order.email)}
        </div>
      </div>
    </div>
  </div>`;
}

export function buildCustomerOrderHtml(order: OrderPayload) {
  const reference = getOrderReference(order.createdAt);

  return `
  <div style="background:#0a0a0a;padding:40px 0;font-family:Barlow,Arial,sans-serif;color:#111;">
    <div style="max-width:640px;margin:0 auto;background:#ffffff;border-radius:24px;overflow:hidden;">
      <div style="background:#e8ff3c;padding:24px 28px;">
        <div style="font-size:12px;letter-spacing:3px;text-transform:uppercase;">Potvrda narudžbe</div>
        <div style="font-family:'Bebas Neue',Arial,sans-serif;font-size:28px;line-height:1;margin-top:6px;">DRESIFY</div>
      </div>
      <div style="padding:28px;">
        <h1 style="margin:0 0 10px;font-family:'Bebas Neue',Arial,sans-serif;font-size:38px;line-height:1;">Hvala na narudžbi!</h1>
        <p style="margin:0 0 18px;font-size:16px;line-height:1.6;color:#444;">
          ${escapeHtml(order.name)}, zaprimili smo tvoju narudžbu <strong>#${escapeHtml(reference)}</strong>.
        </p>
        <table style="width:100%;border-collapse:collapse;font-size:16px;">
          ${row("Način dostave", fulfillmentLabels[order.fulfillment])}
          ${row("Plaćanje", order.payment)}
          ${order.discount && order.discount > 0 ? row(`Popust${order.promoCode ? ` (${escapeHtml(order.promoCode)})` : ""}`, `-${formatEuro(order.discount)}`) : ""}
          ${row("Ukupno", formatEuro(order.total))}
        </table>
        ${section("Tvoj odabir", order.details)}
      </div>
    </div>
  </div>`;
}

export function buildWhatsAppNotification(order: OrderPayload) {
  const reference = getOrderReference(order.createdAt);
  const dostava = order.shipping === 0 ? "BESPLATNA 🎉" : formatEuro(order.shipping);
  return [
    `Nova DRESIFY narudžba #${reference}`,
    `Kupac: ${order.name}`,
    `Mobitel: ${order.phone}`,
    `Plaćanje: ${order.payment}`,
    // Always show the reward code if present (works for both discount and free-ship rewards)
    order.promoCode ? `🎟️ Kod: ${order.promoCode}` : undefined,
    order.discount && order.discount > 0 ? `Popust: -${formatEuro(order.discount)}` : undefined,
    `Dostava: ${dostava}`,
    `Ukupno: ${formatEuro(order.total)}`,
    order.note ? `Napomena: ${order.note}` : undefined,
    "",
    order.details,
    "",
    [order.street, `${order.postalCode} ${order.city}`].filter(Boolean).join(", ")
  ]
    .filter(Boolean)
    .join("\n");
}

function formatEuro(value: number) {
  return `${value.toFixed(2).replace(".", ",")} €`;
}

function escapeHtml(value: string) {
  return value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;");
}

function row(label: string, value: string) {
  return `
    <tr>
      <td style="padding:10px 0;border-bottom:1px solid rgba(16,16,16,0.1);color:#667085;">${escapeHtml(label)}</td>
      <td style="padding:10px 0;border-bottom:1px solid rgba(16,16,16,0.1);text-align:right;font-weight:600;">${escapeHtml(value)}</td>
    </tr>
  `;
}

function section(title: string, value: string) {
  return `
    <div style="margin-top:24px;">
      <div style="margin-bottom:8px;font-size:12px;letter-spacing:3px;text-transform:uppercase;color:#94a3b8;">${escapeHtml(title)}</div>
      <div style="white-space:pre-wrap;font-size:15px;line-height:1.7;color:#111;">${escapeHtml(value)}</div>
    </div>
  `;
}
