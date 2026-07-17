import "server-only";

import { unstable_cache } from "next/cache";

import { prisma } from "@/lib/prisma";
import {
  SHIPPING_PRICE_EUR,
  FREE_SHIPPING_THRESHOLD_EUR,
  CONTACT_EMAIL,
  CONTACT_PHONE_DISPLAY,
  SITE_NAME,
  COST_DRES_EUR,
  COST_KOMPLET_EUR
} from "@/lib/site";

// Efektivne postavke shopa: DB vrijednost ako postoji, inače default iz koda.
// Ovako promjena u adminu odmah vrijedi, a bez unosa sve radi kao dosad.
export type ShopSettings = {
  shippingPrice: number;
  freeShipThreshold: number;
  costDres: number;
  costKomplet: number;
  senders: {
    igor: { name: string; address: string; city: string };
    ivica: { name: string; address: string; city: string };
  };
  iban: string;
  businessName: string;
  contactPhone: string;
  contactEmail: string;
};

// Zadane vrijednosti = trenutačno zakucane (pošiljatelji su dosad bili u kodu naljepnice).
const DEFAULTS: ShopSettings = {
  shippingPrice: SHIPPING_PRICE_EUR,
  freeShipThreshold: FREE_SHIPPING_THRESHOLD_EUR,
  costDres: COST_DRES_EUR,
  costKomplet: COST_KOMPLET_EUR,
  senders: {
    igor: { name: "Igor Katanić", address: "Dubljevička ulica 91", city: "10040 Zagreb" },
    ivica: { name: "Ivica Karamatić", address: "Katoro 54", city: "52470 Umag" }
  },
  iban: "",
  businessName: SITE_NAME,
  contactPhone: CONTACT_PHONE_DISPLAY,
  contactEmail: CONTACT_EMAIL
};

const num = (v: number | null | undefined, d: number) => (v != null && Number.isFinite(v) ? v : d);
const str = (v: string | null | undefined, d: string) => (v != null && v.trim() ? v : d);

const fetchSettingsRow = unstable_cache(
  async () => {
    if (!process.env.DATABASE_URL) return null;
    try {
      return await prisma.settings.findUnique({ where: { id: "singleton" } });
    } catch {
      return null;
    }
  },
  ["shop-settings-row"],
  { revalidate: 60, tags: ["settings"] }
);

export async function getSettings(): Promise<ShopSettings> {
  const r = await fetchSettingsRow();
  if (!r) return DEFAULTS;
  return {
    shippingPrice: num(r.shippingPrice, DEFAULTS.shippingPrice),
    freeShipThreshold: num(r.freeShipThreshold, DEFAULTS.freeShipThreshold),
    costDres: num(r.costDres, DEFAULTS.costDres),
    costKomplet: num(r.costKomplet, DEFAULTS.costKomplet),
    senders: {
      igor: {
        name: str(r.igorName, DEFAULTS.senders.igor.name),
        address: str(r.igorAddress, DEFAULTS.senders.igor.address),
        city: str(r.igorCity, DEFAULTS.senders.igor.city)
      },
      ivica: {
        name: str(r.ivicaName, DEFAULTS.senders.ivica.name),
        address: str(r.ivicaAddress, DEFAULTS.senders.ivica.address),
        city: str(r.ivicaCity, DEFAULTS.senders.ivica.city)
      }
    },
    iban: str(r.iban, DEFAULTS.iban),
    businessName: str(r.businessName, DEFAULTS.businessName),
    contactPhone: str(r.contactPhone, DEFAULTS.contactPhone),
    contactEmail: str(r.contactEmail, DEFAULTS.contactEmail)
  };
}

export const SETTINGS_DEFAULTS = DEFAULTS;
