"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { ArrowRight, X } from "lucide-react";
import { useUser } from "@clerk/nextjs";

import { useCart } from "@/components/providers/cart-provider";
import { FREE_SHIPPING_THRESHOLD_EUR, SHIPPING_PRICE_EUR } from "@/lib/site";

import { CART_CSS, CART_PAGE, CATALOG_PAGE, CHECKOUT_PAGE } from "./cart-css";
import { useCartText } from "./cart-i18n";
import { CartLinesList, CodReminder, SumLine, TotalLine, eurNb } from "./cart-lines";

/* ------------------------------------------------------------------ */
/*  DEMO FINAL — ladica košarice. Računalo: ploča s desna (440 px);     */
/*  mobitel: donji list do 88 % visine. Puni tamni zaslon bez blura.    */
/*  Otvara/zatvara je isti cart-provider (openDrawer / closeDrawer) —   */
/*  živa ladica se na /cisto-demo ne montira, pa nema sudara.           */
/* ------------------------------------------------------------------ */

export function FCartDrawer() {
  const { items, subtotal, isDrawerOpen, closeDrawer } = useCart();
  const T = useCartText();
  const { isSignedIn } = useUser();
  const pathname = usePathname();
  const [closing, setClosing] = useState(false);
  const [shown, setShown] = useState(false);
  const closeBtn = useRef<HTMLButtonElement>(null);
  const lastFocus = useRef<HTMLElement | null>(null);

  // isto pravilo kao živa ladica i server: besplatna dostava od 60 € samo za prijavljene
  const freeShipping = isSignedIn === true && subtotal >= FREE_SHIPPING_THRESHOLD_EUR;
  const shipping = items.length && !freeShipping ? SHIPPING_PRICE_EUR : 0;
  const total = subtotal + shipping;
  const count = items.length;

  useEffect(() => {
    if (isDrawerOpen) {
      lastFocus.current = document.activeElement as HTMLElement | null;
      setClosing(false);
      setShown(true);
    } else if (shown) {
      setClosing(true);
      const t = window.setTimeout(() => {
        setShown(false);
        setClosing(false);
        lastFocus.current?.focus?.();
      }, 260);
      return () => window.clearTimeout(t);
    }
  }, [isDrawerOpen]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (shown && !closing) closeBtn.current?.focus({ preventScroll: true });
  }, [shown, closing]);

  useEffect(() => {
    if (!isDrawerOpen) return;
    const k = (e: KeyboardEvent) => e.key === "Escape" && closeDrawer();
    window.addEventListener("keydown", k);
    return () => window.removeEventListener("keydown", k);
  }, [isDrawerOpen, closeDrawer]);

  // promjena stranice zatvara ladicu
  useEffect(() => {
    closeDrawer();
  }, [pathname]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!shown) return null;

  return (
    <div className="c-root fixed inset-0 z-[70]" role="dialog" aria-modal="true" aria-label={T.cart} style={{ background: "transparent" }}>
      <style dangerouslySetInnerHTML={{ __html: CART_CSS }} />
      <button type="button" aria-label={T.closeCart} tabIndex={-1} onClick={closeDrawer} data-closing={closing} className="c-scrim absolute inset-0 cursor-default bg-black/70" />

      <section
        data-closing={closing}
        className="c-panel absolute inset-x-0 bottom-0 flex max-h-[88svh] flex-col rounded-t-[18px] border-t border-white/[0.1] bg-[#0c0c0c] shadow-[0_-30px_80px_-20px_rgba(0,0,0,0.9)] lg:inset-y-0 lg:left-auto lg:right-0 lg:max-h-none lg:w-[440px] lg:rounded-none lg:border-l lg:border-t-0"
      >
        {/* ručka (mobitel) */}
        <div aria-hidden className="flex justify-center pt-2.5 lg:hidden">
          <span className="h-1 w-10 rounded-full bg-white/20" />
        </div>

        <header className="flex items-center justify-between gap-3 px-5 pb-2 pt-2 lg:px-7 lg:pt-6">
          <h2 className="c-display flex items-baseline gap-3 pt-1 text-[38px] text-white lg:text-[44px]">
            {T.cart}
            {count ? <span className="font-sans text-[14px] font-semibold tracking-normal tabular-nums text-white/45">{count}</span> : null}
          </h2>
          <div className="flex items-center gap-1">
          {count ? (
            <Link href={CART_PAGE} onClick={closeDrawer} className="inline-flex h-11 items-center px-2 text-[13px] text-white/60 underline decoration-white/20 underline-offset-4 hover:text-white">
              {T.editCart}
            </Link>
          ) : null}
          <button ref={closeBtn} type="button" onClick={closeDrawer} aria-label={T.closeCart} className="-mr-2 flex h-11 w-11 items-center justify-center text-white/70 transition-colors hover:text-white">
            <X className="h-6 w-6" strokeWidth={1.5} />
          </button>
          </div>
        </header>

        {count ? (
          <>
            <div className="c-scroll min-h-0 flex-1 overflow-y-auto px-5 lg:px-7">
              <CartLinesList items={items} dense onNavigate={closeDrawer} />
            </div>

            <footer className="border-t border-white/[0.08] bg-[#0c0c0c] px-5 pt-4 lg:px-7 lg:pt-5" style={{ paddingBottom: "max(16px, env(safe-area-inset-bottom))" }}>
              <div className="space-y-1.5">
                <SumLine label={T.subtotal} value={eurNb(subtotal)} />
                <SumLine label={T.shipping} value={freeShipping ? T.free : eurNb(SHIPPING_PRICE_EUR)} accent={freeShipping} />
              </div>
              <div className="mt-3">
                <TotalLine total={total} size={40} />
              </div>
              <Link href={CHECKOUT_PAGE} onClick={closeDrawer} className="c-cta mt-4">
                {T.toCheckout}
                <ArrowRight className="mb-[3px] h-5 w-5" strokeWidth={2} />
              </Link>
              <CodReminder className="mt-3 text-[12.5px]" />
            </footer>
          </>
        ) : (
          <div className="flex flex-col items-center px-6 pb-10 pt-10 text-center" style={{ paddingBottom: "max(40px, env(safe-area-inset-bottom))" }}>
            <p className="c-display text-[44px] text-white/90">{T.emptyTitle}</p>
            <p className="mt-3 max-w-[280px] text-[14.5px] leading-6 text-white/55">{T.emptyHint}</p>
            <Link href={CATALOG_PAGE} onClick={closeDrawer} className="c-cta mt-7 max-w-[320px]">
              {T.browse}
              <ArrowRight className="mb-[3px] h-5 w-5" strokeWidth={2} />
            </Link>
          </div>
        )}
      </section>
    </div>
  );
}

/** Otvori demo ladicu umjesto odlaska na stranicu (osim cmd/ctrl-klika — tada nova kartica na /kosarica). */
export function useOpenCartDrawer() {
  const { openDrawer } = useCart();
  return (e: { preventDefault: () => void; metaKey?: boolean; ctrlKey?: boolean; shiftKey?: boolean; button?: number }) => {
    if (e.metaKey || e.ctrlKey || e.shiftKey || (e.button ?? 0) !== 0) return;
    e.preventDefault();
    openDrawer();
  };
}
