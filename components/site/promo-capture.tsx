"use client";

import { useEffect } from "react";

import { findPromoCode } from "@/lib/promo";

export const PROMO_STORAGE_KEY = "dresify_promo";

// Captures a promo code from the URL (?kod=INSTA15 or ?promo=INSTA15) and stores
// it so the checkout can pre-fill / auto-apply it. Used for Instagram links etc.
export function PromoCapture() {
  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const raw = params.get("kod") || params.get("promo");
    if (!raw) return;
    const promo = findPromoCode(raw);
    if (promo) {
      window.localStorage.setItem(PROMO_STORAGE_KEY, promo.code);
    }
  }, []);

  return null;
}
