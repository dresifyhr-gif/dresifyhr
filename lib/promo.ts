// Promo codes. To add/remove a code, edit this list and redeploy.
// `value` is a percentage; `minSubtotal` is the minimum item subtotal (without
// shipping) required for the code to apply.

export type PromoCode = {
  code: string;
  value: number; // percent off
  minSubtotal: number;
  label: string; // short description shown in the UI
};

export const PROMO_CODES: PromoCode[] = [
  { code: "DRESIFY10", value: 10, minSubtotal: 60, label: "10% popusta na narudžbe od 60 €" },
  { code: "INSTA15", value: 15, minSubtotal: 100, label: "15% popusta na narudžbe od 100 €" },
  { code: "GOL10", value: 10, minSubtotal: 20, label: "10% popusta — nagrada iz igre" },
  { code: "GOL15", value: 15, minSubtotal: 30, label: "15% popusta — nagrada iz igre" },
  { code: "GOL20", value: 20, minSubtotal: 40, label: "20% popusta — nagrada iz igre" }
];

export function findPromoCode(input: string): PromoCode | null {
  const norm = input.trim().toUpperCase();
  if (!norm) return null;
  return PROMO_CODES.find((p) => p.code === norm) ?? null;
}

export function roundMoney(amount: number) {
  return Math.round(amount * 100) / 100;
}

export function computePromoDiscount(promo: PromoCode | null, subtotal: number): number {
  if (!promo) return 0;
  if (subtotal < promo.minSubtotal) return 0;
  return roundMoney((subtotal * promo.value) / 100);
}

export type PromoValidation =
  | { ok: true; promo: PromoCode; discount: number }
  | { ok: false; reason: "not_found" | "min_not_met"; promo?: PromoCode };

export function validatePromo(input: string, subtotal: number): PromoValidation {
  const promo = findPromoCode(input);
  if (!promo) return { ok: false, reason: "not_found" };
  if (subtotal < promo.minSubtotal) return { ok: false, reason: "min_not_met", promo };
  return { ok: true, promo, discount: computePromoDiscount(promo, subtotal) };
}
