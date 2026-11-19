"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowRight } from "lucide-react";
import { useUser } from "@clerk/nextjs";

import { useCart } from "@/components/providers/cart-provider";
import { FREE_SHIPPING_THRESHOLD_EUR, SHIPPING_PRICE_EUR } from "@/lib/site";

import { CATALOG_PAGE, CHECKOUT_PAGE } from "./cart-css";
import { useCartText } from "./cart-i18n";
import { CartLinesList, CodReminder, SumLine, TotalLine, eurNb } from "./cart-lines";

/* ------------------------------------------------------------------ */
/*  DEMO FINAL — stranica košarice. Računalo: stavke + ljepljivi        */
/*  sažetak desno. Mobitel: stavke, sažetak, a gumb na blagajnu u       */
/*  donjoj traci (jedan neonski gumb po ekranu).                        */
/* ------------------------------------------------------------------ */

export function CartPageView() {
  const { items, subtotal, clearCart } = useCart();
  const T = useCartText();
  const { isSignedIn } = useUser();
  const signedIn = isSignedIn === true;
  const freeShipping = signedIn && subtotal >= FREE_SHIPPING_THRESHOLD_EUR;
  const shipping = items.length && !freeShipping ? SHIPPING_PRICE_EUR : 0;
  const total = subtotal + shipping;
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  if (!mounted) return <div className="min-h-[70svh]" aria-busy="true" />;

  if (!items.length) {
    return (
      <div className="c-in mx-auto flex max-w-[520px] flex-col items-center px-4 pb-24 pt-16 text-center lg:pt-24">
        <h1 className="c-display text-[72px] text-white lg:text-[104px]">{T.cart}</h1>
        <p className="mt-4 text-[16px] leading-7 text-white/55">{T.emptyPage}</p>
        <Link href={CATALOG_PAGE} className="c-cta mt-9 max-w-[340px]">
          {T.browse}
          <ArrowRight className="mb-[3px] h-5 w-5" strokeWidth={2} />
        </Link>
      </div>
    );
  }

  const handleClear = () => {
    if (window.confirm(T.clearConfirm)) clearCart();
  };

  return (
    <>
      <div className="mx-auto max-w-[1280px] px-4 pb-[calc(112px+env(safe-area-inset-bottom))] pt-7 sm:px-6 lg:px-10 lg:pb-24 lg:pt-14">
        <div className="c-in flex items-end justify-between gap-4 border-b border-white/[0.08] pb-5">
          <h1 className="c-display text-[64px] text-white sm:text-[84px] lg:text-[112px]">{T.cart}</h1>
          <p className="pb-2 text-[14px] tabular-nums text-white/50 lg:pb-4">
            {T.items(items.length)}
          </p>
        </div>

        <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_400px] lg:gap-14">
          <div className="min-w-0">
            <CartLinesList items={items} />
            <div className="flex justify-start border-t border-white/[0.08] pt-2">
              <button type="button" onClick={handleClear} className="inline-flex h-11 items-center text-[13px] text-white/45 underline decoration-white/15 underline-offset-4 transition-colors hover:text-white/80">
                {T.clear}
              </button>
            </div>
          </div>

          <aside className="lg:pt-6">
            <div className="lg:sticky lg:top-[100px]">
              <h2 className="c-display text-[30px] text-white/90">
                <span aria-hidden className="mb-3 block h-px w-8 bg-[#e8ff3c]" />
                {T.summary}
              </h2>
              <div className="mt-4 space-y-2">
                <SumLine label={T.subtotal} value={eurNb(subtotal)} />
                <SumLine label={T.shipping} value={freeShipping ? T.free : eurNb(SHIPPING_PRICE_EUR)} accent={freeShipping} />
              </div>
              <div className="mt-4">
                <TotalLine total={total} size={52} />
              </div>
              {!signedIn ? (
                <p className="mt-3 text-[12.5px] leading-5 text-white/45">
                  {T.freeFromA(eurNb(FREE_SHIPPING_THRESHOLD_EUR))}
                  <Link href="/prijava/" className="text-white/75 underline decoration-white/25 underline-offset-[3px] hover:text-white">
                    {T.freeFromLink}
                  </Link>
                  .
                </p>
              ) : null}
              <div className="mt-6 hidden lg:block">
                <Link href={CHECKOUT_PAGE} className="c-cta">
                  {T.toCheckout}
                  <ArrowRight className="mb-[3px] h-5 w-5" strokeWidth={2} />
                </Link>
                <CodReminder className="mt-3" />
              </div>
              <CodReminder className="mt-5 !justify-start lg:hidden" />
            </div>
          </aside>
        </div>
      </div>

      {/* mobitel: donja traka s iznosom i jedinim neonskim gumbom */}
      <div data-c-bar className="fixed inset-x-0 bottom-0 z-40 border-t border-white/[0.08] bg-[#0a0a0a] px-4 pt-3 lg:hidden" style={{ paddingBottom: "max(12px, env(safe-area-inset-bottom))" }}>
        <div className="mx-auto flex max-w-[560px] items-center gap-4">
          <div className="shrink-0">
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-white/45">{T.total}</p>
            <p className="c-price mt-0.5 text-[30px] text-white">{eurNb(total)}</p>
          </div>
          <Link href={CHECKOUT_PAGE} className="c-cta flex-1">
            {T.toCheckout}
            <ArrowRight className="mb-[3px] h-5 w-5" strokeWidth={2} />
          </Link>
        </div>
      </div>
    </>
  );
}
