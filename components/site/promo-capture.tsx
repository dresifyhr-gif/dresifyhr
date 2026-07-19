"use client";

import { useEffect } from "react";

export const PROMO_STORAGE_KEY = "dresify_promo";

// Captures a promo code from the URL (?kod=INSTA15 or ?promo=INSTA15) and stores
// it so the checkout can pre-fill / auto-apply it. Used for Instagram links etc.
// Kod se NE provjerava ovdje (kodovi žive u bazi) — blagajna ga provjeri na
// serveru; neispravan kod je bezopasan jer ga blagajna odbije.
export function PromoCapture() {
  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const raw = params.get("kod") || params.get("promo");
    if (!raw) return;
    const code = raw.trim().toUpperCase();
    if (code) window.localStorage.setItem(PROMO_STORAGE_KEY, code);
  }, []);

  return null;
}
