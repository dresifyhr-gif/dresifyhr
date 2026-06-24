import { type ClassValue, clsx } from "clsx";

import { CURRENCY_LABEL, JERSEY_PRICE_EUR, SITE_URL, WHATSAPP_URL } from "@/lib/site";

export function cn(...inputs: ClassValue[]) {
  return clsx(inputs);
}

export function absoluteUrl(path = "/") {
  const url = new URL(path, SITE_URL);
  // Match next.config `trailingSlash: true` for page routes so sitemap/canonical
  // URLs equal the served URL. Skip the root and file paths (.jpg, .png, .xml…).
  if (url.pathname !== "/" && !url.pathname.endsWith("/") && !/\.[a-z0-9]+$/i.test(url.pathname)) {
    url.pathname += "/";
  }
  return url.toString();
}

export function formatPrice(price?: number) {
  return price != null ? `${price}€` : CURRENCY_LABEL;
}

export function formatEuroAmount(value: number) {
  return `${value.toFixed(2).replace(".", ",")} \u20ac`;
}

export function createWhatsAppUrl(message: string) {
  return `${WHATSAPP_URL}?text=${encodeURIComponent(message)}`;
}

export function estimateReadingTime(text: string) {
  const words = text.trim().split(/\s+/).length;
  return Math.max(2, Math.round(words / 190));
}

export function formatCroatianDate(dateString: string) {
  const date = new Date(`${dateString}T12:00:00`);

  return new Intl.DateTimeFormat("hr-HR", {
    day: "numeric",
    month: "long",
    year: "numeric"
  }).format(date);
}

export function getInitials(value: string) {
  return value
    .replace(/[^\p{L}0-9\s-]/gu, "")
    .split(/[\s-]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join("");
}

const mojibakeReplacements: Array<[string, string]> = [
  ["MÄ‚â€žĂ˘â‚¬ĹˇÄ‚â€žĂ‹ĹĄnchen", "MĂĽnchen"],
  ["MĂ„â€šĂ„Ëťnchen", "MĂĽnchen"],
  ["NjemaĂ„â€šĂ˘â‚¬ĹľĂ„Ä…Ă‚Â¤ka", "Njema\u010dka"],
  ["PoĂ„â€šĂ˘â‚¬ĹľĂ„Ä…Ă‚Â¤etna", "Po\u010detna"],
  ["POÄ‚â€žÄąĹˇETNA", "PO\u010cETNA"],
  ["PretraÄ‚â€žĂ„â€¦Ä‚â€žĂ„Äľi", "Pretra\u017ei"],
  ["PoniÄ‚â€žĂ„â€¦Ä‚â€ąĂ˘â‚¬Ë‡ti", "Poni\u0161ti"],
  ["PrikaÄ‚â€žĂ„â€¦Ä‚â€žĂ„Äľi", "Prika\u017ei"],
  ["VeliĂ„â€šĂ˘â‚¬ĹľĂ„Ä…Ă‚Â¤ina", "Veli\u010dina"],
  ["igraĂ„â€šĂ˘â‚¬ĹľĂ„Ä…Ă‚Â¤", "igra\u010d"],
  ["igraĂ„â€šĂ˘â‚¬ĹľĂ„Ä…Ă‚Â¤a", "igra\u010da"],
  ["doĂ„â€šĂ˘â‚¬ĹľÄ‚ËĂ˘â€šÂ¬Ă‚Âi", "do\u0111i"],
  ["najtraÄ‚â€žĂ„â€¦Ä‚â€žĂ„Äľenijih", "najtra\u017eenijih"],
  ["proÄ‚â€žĂ„â€¦Ä‚â€ąĂ˘â‚¬Ë‡iriti", "pro\u0161iriti"],
  ["djeĂ„â€šĂ˘â‚¬ĹľĂ„Ä…Ă‚Â¤ji", "dje\u010dji"],
  ["NajtraÄ‚â€žĂ„â€¦Ä‚â€žĂ„Äľeniji", "Najtra\u017eeniji"],
  ["kljuĂ„â€šĂ˘â‚¬ĹľĂ„Ä…Ă‚Â¤ne", "klju\u010dne"],
  ["kljuĂ„â€šĂ˘â‚¬ĹľĂ„Ä…Ă‚Â¤", "klju\u010d"],
  ["Ä‚â€žĂ„â€¦Ä‚â€žĂ„Äľ", "\u017e"],
  ["Ä‚â€žĂ„â€¦Ä‚â€ąĂ˘â‚¬Ë‡", "\u0161"],
  ["Ä‚â€žĂ„â€¦Ä‚â€ąÄąÄ„", "\u017d"],
  ["Ä‚â€žĂ„â€¦Ä‚â€šĂ‚Â ", "\u0160"],
  ["Ă„â€šĂ˘â‚¬ĹľĂ„Ä…Ă‚Â¤", "\u010d"],
  ["Ă„â€šĂ˘â‚¬ĹľÄ‚ËĂ˘â€šÂ¬Ă‹â€ˇ", "\u0107"],
  ["Ă„â€šĂ˘â‚¬ĹľÄ‚ËĂ˘â€šÂ¬Ă‚Â", "\u0111"],
  ["Ă„â€šĂ˘â‚¬ĹľĂ„Ä…ÄąË‡", "\u010c"],
  ["Ă„â€šĂ˘â‚¬ĹľÄ‚ËĂ˘â€šÂ¬Ă‚Â ", "\u0106"],
  ["Ă„â€šĂ˘â‚¬ĹľÄ‚â€šĂ‚Â", "\u0110"],
  ["Ă„â€šĂ‹ÂÄ‚ËĂ˘â€šÂ¬ÄąË‡Ä‚â€šĂ‚Â¬", "\u20ac"],
  ["Ä‚ËĂ˘â€šÂ¬Ă˘â‚¬ĹĄ", "-"],
  ["Ä‚â€šĂ‚Â·", "\u00b7"]
];

export function repairText(value: string) {
  return mojibakeReplacements.reduce(
    (current, [search, replace]) => current.split(search).join(replace),
    value
  );
}

export function storageAvailable() {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

export function createCartInquiryMessage(
  items: Array<{ klub: string; igrac: string; size: string; segmentLabel: string }>
) {
  if (!items.length) {
    return "";
  }

  return items
    .map(
      (item, index) =>
        `${index + 1}. ${item.klub} - ${item.igrac}, ${item.segmentLabel.toLowerCase()}, veli\u010dina ${item.size}, ${formatPrice()}`
    )
    .join("\n");
}

export function createCartOrderSummary(
  items: Array<{ klub: string; igrac: string; size: string; segmentLabel: string }>
) {
  if (!items.length) {
    return "";
  }

  return items
    .map(
      (item, index) =>
        `${index + 1}. ${item.klub} - ${item.igrac}, ${item.segmentLabel.toLowerCase()}, veli\u010dina ${item.size}, ${formatEuroAmount(JERSEY_PRICE_EUR)}`
    )
    .join("\n");
}
