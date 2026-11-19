import type { ReactNode } from "react";

import { CART_CSS } from "@/components/clean-demo/final/cart/cart-css";
import { CheckoutView } from "@/components/clean-demo/final/cart/checkout-view";

/* NOVI DIZAJN — blagajna, UKLJUČENO (zamjenjuje ./checkout.ts samo u buildu sa zastavicom).
   Isti /api/orders payload kao živi ContactForm (cart/use-checkout.ts). */
function NoviCheckout({ emptyFallback }: { emptyFallback?: ReactNode }) {
  return (
    <div className="c-root min-h-screen bg-[#0a0a0a] text-white [-webkit-tap-highlight-color:transparent]">
      <style dangerouslySetInnerHTML={{ __html: CART_CSS }} />
      <CheckoutView emptyFallback={emptyFallback} />
    </div>
  );
}

export const noviCheckout = { Checkout: NoviCheckout };
export type NoviCheckoutApi = typeof noviCheckout;
