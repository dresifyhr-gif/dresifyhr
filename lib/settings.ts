import "server-only";

import { unstable_cache } from "next/cache";

import { dbQuery, withLastGood } from "@/lib/db-guard";
import { prisma } from "@/lib/prisma";
import {
  SHIPPING_PRICE_EUR,
  FREE_SHIPPING_THRESHOLD_EUR,
  CONTACT_EMAIL,
  CONTACT_PHONE_DISPLAY,
  SITE_NAME,
  WHATSAPP_NUMBER,
  INSTAGRAM_HANDLE,
  COST_DRES_EUR,
  COST_KOMPLET_EUR,
  COST_STREETWEAR_EUR,
  COST_LONGSLEEVE_EUR,
  COST_TRENIRKA_EUR
} from "@/lib/site";

// Efektivne postavke shopa: DB vrijednost ako postoji, inače default iz koda.
// Ovako promjena u adminu odmah vrijedi, a bez unosa sve radi kao dosad.
export type ShopSettings = {
  shippingPrice: number;
  freeShipThreshold: number;
  costDres: number;
  costKomplet: number;
  costStreetwear: number;
  costLongSleeve: number;
  costTrenirka: number;
  // Poslovna pravila (admin/obračun)
  deliveryCost: number;
  returnCost: number;
  igorSharePct: number;
  winbackDays: number;
  riskMinFailed: number;
  senders: {
    igor: { name: string; address: string; city: string };
    ivica: { name: string; address: string; city: string };
  };
  iban: string;
  businessName: string;
  whatsappNumber: string;
  instagramHandle: string;
  igFollowers: number;
  leagues: string[];
  notifyEmail: boolean;
  notifyTelegram: boolean;
  notifyWhatsapp: boolean;
  // Izgled shopa
  announcementActive: boolean;
  announcementText: string;
  heroTitle: string;
  heroSubtitle: string;
  hiddenSections: string[];
  accentColor: string;
  // Kolo sreće
  koloActive: boolean;
  // Dresify Klub
  klubActive: boolean;
  klubTarget: number;
  klubRewardKind: string;
  klubRewardValue: number;
  klubRewardLabel: string;
  contactPhone: string;
  contactEmail: string;
  // Ciljevi (progress na Pregledu)
  monthlyGoal: number;
};

// Zadane lige (dosad zakucane u formama proizvoda).
const DEFAULT_LEAGUES = ["Reprezentacija", "La Liga", "Premier Liga", "Serie A", "Bundesliga", "Ligue 1", "Saudi Pro", "Brazil", "MLS", "Komplet", "Streetwear"];

// Zadane vrijednosti = trenutačno zakucane (pošiljatelji su dosad bili u kodu naljepnice).
const DEFAULTS: ShopSettings = {
  shippingPrice: SHIPPING_PRICE_EUR,
  freeShipThreshold: FREE_SHIPPING_THRESHOLD_EUR,
  costDres: COST_DRES_EUR,
  costKomplet: COST_KOMPLET_EUR,
  costStreetwear: COST_STREETWEAR_EUR,
  costLongSleeve: COST_LONGSLEEVE_EUR,
  costTrenirka: COST_TRENIRKA_EUR,
  deliveryCost: 5,   // trošak besplatne dostave koji snosimo mi
  returnCost: 0,     // povrat trenutno ne plaćamo
  igorSharePct: 50,  // pola-pola
  winbackDays: 30,
  riskMinFailed: 1,
  senders: {
    igor: { name: "Igor Katanić", address: "Dubljevička ulica 91", city: "10040 Zagreb" },
    ivica: { name: "Ivica Karamatić", address: "Katoro 54", city: "52470 Umag" }
  },
  iban: "",
  businessName: SITE_NAME,
  whatsappNumber: WHATSAPP_NUMBER,
  instagramHandle: INSTAGRAM_HANDLE.replace(/^@/, ""),
  igFollowers: 0,
  leagues: DEFAULT_LEAGUES,
  notifyEmail: true,
  notifyTelegram: true,
  notifyWhatsapp: true,
  announcementActive: true,
  announcementText: "",
  heroTitle: "",
  heroSubtitle: "",
  hiddenSections: [],
  accentColor: "#e8ff3c",
  koloActive: false,          // kolo sreće — pali se u Postavkama
  klubActive: false,          // pali se u Postavkama kad Gazda želi
  klubTarget: 3,              // 3 preuzete narudžbe
  klubRewardKind: "amount",   // fiksni popust = gratis dres
  klubRewardValue: 20,
  klubRewardLabel: "Gratis dres — Dresify Klub 🎁",
  contactPhone: CONTACT_PHONE_DISPLAY,
  contactEmail: CONTACT_EMAIL,
  monthlyGoal: 15000
};

const bool = (v: boolean | null | undefined, d: boolean) => (typeof v === "boolean" ? v : d);
const num = (v: number | null | undefined, d: number) => (v != null && Number.isFinite(v) ? v : d);
const str = (v: string | null | undefined, d: string) => (v != null && v.trim() ? v : d);

// Postavke čita i JAVNA trgovina (layout na svakoj stranici: obavijest, kolo,
// klub, sekcije…), pa ostaju keširane: 1 h kao sigurnosna mreža, a spremanje u
// adminu zove bustCache("settings") pa se promjena vidi odmah. Prije je TTL bio
// 60 s i budio je Neon na svaki posjet nakon isteka (ispad kvote 15.10.2026.).
// Bez try/catch unutra — greška se ne sprema u keš (vidi lib/db-guard.ts).
const readSettingsRow = () => prisma.settings.findUnique({ where: { id: "singleton" } });

const fetchSettingsRowCached = unstable_cache(
  async () => {
    if (!process.env.DATABASE_URL) return null;
    return dbQuery(readSettingsRow);
  },
  ["shop-settings-row-v2"],
  { revalidate: 3600, tags: ["settings"] }
);

// Lige su spremljene kao JSON niz; prazno/neispravno = zadane.
function parseLeagues(raw: string | null): string[] | undefined {
  if (!raw) return undefined;
  try {
    const arr = JSON.parse(raw);
    const list = Array.isArray(arr) ? arr.filter((x): x is string => typeof x === "string" && !!x.trim()) : [];
    return list.length ? list : undefined;
  } catch { return undefined; }
}

// Javne stranice: keširano; ako baza ne radi, zadnje dobro ili zadane vrijednosti.
export async function getSettings(): Promise<ShopSettings> {
  return toSettings(await withLastGood("settings", null, fetchSettingsRowCached));
}

// Admin i novac (profit, Novci, poravnanje, naljepnice): uvijek svježe iz baze,
// nikad iz keša — izgubljeni signal ne smije ostaviti staru nabavu ili IBAN.
export async function getSettingsFresh(): Promise<ShopSettings> {
  if (!process.env.DATABASE_URL) return DEFAULTS;
  return toSettings(await withLastGood("settings-fresh", null, readSettingsRow));
}

// Forma Postavki: NE smije tiho vratiti zadane vrijednosti (admin bi ih
// spremanjem upisao preko pravih — IBAN, nabava…). Greška se propušta dalje.
export async function getSettingsStrict(): Promise<ShopSettings> {
  if (!process.env.DATABASE_URL) return DEFAULTS;
  return toSettings(await readSettingsRow());
}

function toSettings(r: Awaited<ReturnType<typeof readSettingsRow>>): ShopSettings {
  if (!r) return DEFAULTS;
  return {
    shippingPrice: num(r.shippingPrice, DEFAULTS.shippingPrice),
    freeShipThreshold: num(r.freeShipThreshold, DEFAULTS.freeShipThreshold),
    costDres: num(r.costDres, DEFAULTS.costDres),
    costKomplet: num(r.costKomplet, DEFAULTS.costKomplet),
    costStreetwear: num(r.costStreetwear, DEFAULTS.costStreetwear),
    costLongSleeve: num(r.costLongSleeve, DEFAULTS.costLongSleeve),
    costTrenirka: num(r.costTrenirka, DEFAULTS.costTrenirka),
    deliveryCost: num(r.deliveryCost, DEFAULTS.deliveryCost),
    returnCost: num(r.returnCost, DEFAULTS.returnCost),
    igorSharePct: num(r.igorSharePct, DEFAULTS.igorSharePct),
    winbackDays: num(r.winbackDays, DEFAULTS.winbackDays),
    riskMinFailed: num(r.riskMinFailed, DEFAULTS.riskMinFailed),
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
    whatsappNumber: str(r.whatsappNumber, DEFAULTS.whatsappNumber).replace(/\D/g, ""),
    instagramHandle: str(r.instagramHandle, DEFAULTS.instagramHandle).replace(/^@/, ""),
    igFollowers: Math.max(0, Math.round(num(r.igFollowers, 0))),
    leagues: parseLeagues(r.leagues) ?? DEFAULTS.leagues,
    notifyEmail: bool(r.notifyEmail, DEFAULTS.notifyEmail),
    notifyTelegram: bool(r.notifyTelegram, DEFAULTS.notifyTelegram),
    notifyWhatsapp: bool(r.notifyWhatsapp, DEFAULTS.notifyWhatsapp),
    announcementActive: bool(r.announcementActive, DEFAULTS.announcementActive),
    announcementText: r.announcementText?.trim() || "",
    heroTitle: r.heroTitle?.trim() || "",
    heroSubtitle: r.heroSubtitle?.trim() || "",
    hiddenSections: parseLeagues(r.hiddenSections) ?? [],
    accentColor: /^#[0-9a-fA-F]{6}$/.test(r.accentColor || "") ? r.accentColor! : DEFAULTS.accentColor,
    koloActive: bool(r.koloActive, DEFAULTS.koloActive),
    klubActive: bool(r.klubActive, DEFAULTS.klubActive),
    klubTarget: Math.max(1, Math.round(num(r.klubTarget, DEFAULTS.klubTarget))),
    klubRewardKind: str(r.klubRewardKind, DEFAULTS.klubRewardKind),
    klubRewardValue: num(r.klubRewardValue, DEFAULTS.klubRewardValue),
    klubRewardLabel: str(r.klubRewardLabel, DEFAULTS.klubRewardLabel),
    contactPhone: str(r.contactPhone, DEFAULTS.contactPhone),
    contactEmail: str(r.contactEmail, DEFAULTS.contactEmail),
    monthlyGoal: num(r.monthlyGoal, DEFAULTS.monthlyGoal)
  };
}

export const SETTINGS_DEFAULTS = DEFAULTS;
