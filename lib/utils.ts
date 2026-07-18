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

// Normalizira ime i prezime kupca (za prikaz i poštanske naljepnice):
// - veliko prvo slovo svake riječi (i dijela iza crtice), ostalo malo
// - hrvatska prezimena koja završavaju na "ic" → "ić" (npr. maric → Marić),
//   jer za poštu prezime mora biti točno napisano s ć.
export function formatCroatianName(value: string) {
  const cleaned = repairText(String(value ?? "")).replace(/\s+/g, " ").trim();
  if (!cleaned) return "";

  const fixIc = (seg: string) => (/ic$/i.test(seg) ? seg.slice(0, -2) + "ić" : seg);
  const titleCase = (word: string) =>
    word
      .split("-")
      .map((seg) => {
        if (!seg) return seg;
        const cased = seg.charAt(0).toLocaleUpperCase("hr") + seg.slice(1).toLocaleLowerCase("hr");
        return fixIc(cased);
      })
      .join("-");

  return cleaned.split(" ").map(titleCase).join(" ");
}

// Ključ kupca iz telefona: same znamenke bez prefiksa 385/0, da isti kupac
// zapisan različito (+385, 0…, 00385) bude jedna osoba. Prazno ako nema broja.
export function phoneKey(raw?: string | null): string {
  let d = String(raw ?? "").replace(/\D/g, "");
  if (d.startsWith("00385")) d = d.slice(5);
  else if (d.startsWith("385")) d = d.slice(3);
  if (d.startsWith("0")) d = d.slice(1);
  return d;
}

// Normalizira hrvatski broj mobitela za prikaz (naljepnica/pošta): uvijek počinje 09.
// Rješava brojeve upisane bez vodeće nule ili s +385 / 00385.
export function formatCroatianPhone(raw: string) {
  let d = String(raw ?? "").replace(/\D/g, "");
  if (!d) return String(raw ?? "");
  if (d.startsWith("00385")) d = d.slice(5);
  else if (d.startsWith("385")) d = d.slice(3);
  if (!d.startsWith("0")) d = "0" + d; // mobitel bez vodeće nule → dodaj 0
  // grupiranje radi čitljivosti: 095 887 8719
  const m = d.match(/^(\d{3})(\d{3})(\d+)$/);
  return m ? `${m[1]} ${m[2]} ${m[3]}` : d;
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
