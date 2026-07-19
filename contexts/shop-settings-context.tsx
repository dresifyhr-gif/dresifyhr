"use client";

import { createContext, useContext, type ReactNode } from "react";

// Javne postavke shopa koje trebaju i klijentske komponente (WhatsApp, Instagram…).
// Vrijednosti dolaze sa servera kroz layout — bez dodatnog mrežnog zahtjeva.
// Zadane vrijednosti su iste kao u lib/site.ts, pa sve radi i ako postavke fale.
export type PublicShopSettings = {
  whatsappNumber: string;
  instagramHandle: string;
  businessName: string;
  contactPhone: string;
  contactEmail: string;
  // Izgled
  announcementActive: boolean;
  announcementText: string;
  heroTitle: string;
  heroSubtitle: string;
};

const FALLBACK: PublicShopSettings = {
  whatsappNumber: "385976047510",
  instagramHandle: "dresify.hr",
  businessName: "DRESIFY",
  contactPhone: "+385 97 604 7510",
  contactEmail: "dresify.hr@gmail.com",
  announcementActive: true,
  announcementText: "",
  heroTitle: "",
  heroSubtitle: ""
};

const Ctx = createContext<PublicShopSettings>(FALLBACK);

export function ShopSettingsProvider({ value, children }: { value: PublicShopSettings; children: ReactNode }) {
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useShopSettings() {
  return useContext(Ctx);
}

// Praktični izvedeni linkovi.
export function useWhatsAppUrl() {
  const { whatsappNumber } = useShopSettings();
  return `https://wa.me/${whatsappNumber}`;
}

export function useInstagram() {
  const { instagramHandle } = useShopSettings();
  return { handle: `@${instagramHandle}`, url: `https://instagram.com/${instagramHandle}` };
}
