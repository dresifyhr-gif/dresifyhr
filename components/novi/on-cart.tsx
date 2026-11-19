import { CART_CSS } from "@/components/clean-demo/final/cart/cart-css";
import { CartPageView } from "@/components/clean-demo/final/cart/cart-page";

/* NOVI DIZAJN — košarica, UKLJUČENO (zamjenjuje ./cart.ts samo u buildu sa zastavicom).
   Ista košarica iz cart-providera kao živa stranica. */
function NoviCart() {
  return (
    <div className="c-root min-h-screen bg-[#0a0a0a] text-white [-webkit-tap-highlight-color:transparent]">
      <style dangerouslySetInnerHTML={{ __html: CART_CSS }} />
      <CartPageView />
    </div>
  );
}

export const noviCart = { Cart: NoviCart };
export type NoviCartApi = typeof noviCart;
