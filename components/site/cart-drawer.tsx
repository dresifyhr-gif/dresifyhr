"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowRight, Trash2, X } from "lucide-react";

import { useUser } from "@clerk/nextjs";

import { useCart } from "@/components/providers/cart-provider";
import { CartUpsell } from "@/components/site/cart-upsell";
import { useLanguage } from "@/contexts/language-context";
import { FREE_SHIPPING_THRESHOLD_EUR, SHIPPING_PRICE_EUR, SHIPPING_PRICE_LABEL } from "@/lib/site";
import { formatEuroAmount, repairText } from "@/lib/utils";

// Iznos bez ",00" kad je cijeli broj (27 €), inače s decimalama (27,50 €).
const eur = (n: number) => (Number.isInteger(n) ? `${n} €` : formatEuroAmount(n));

export function CartDrawer() {
  const { items, subtotal, isDrawerOpen, closeDrawer, removeItem, clearCart } = useCart();
  const { t, locale } = useLanguage();
  const en = locale === "en";
  // Besplatna dostava od 60 € SAMO za prijavljene kupce — isto pravilo kao blagajna i server.
  const { isSignedIn } = useUser();
  const signedIn = isSignedIn === true;
  const reachedThreshold = subtotal >= FREE_SHIPPING_THRESHOLD_EUR;
  const freeShipping = signedIn && reachedThreshold;
  const shipping = items.length && !freeShipping ? SHIPPING_PRICE_EUR : 0;
  const total = subtotal + shipping;
  const remainingForFree = Math.max(0, FREE_SHIPPING_THRESHOLD_EUR - subtotal);

  // Mobitel: donji "sheet"; desktop: ladica s desne strane.
  const [desktop, setDesktop] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(min-width: 768px)");
    const sync = () => setDesktop(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);
  const hidden = desktop ? { x: "100%" } : { y: "100%" };
  const shown = desktop ? { x: 0 } : { y: 0 };

  const countLabel = en
    ? `${items.length} ${items.length === 1 ? "item" : "items"}`
    : `${items.length} ${items.length === 1 ? "artikl" : items.length < 5 && items.length > 1 ? "artikla" : "artikala"}`;

  return (
    <AnimatePresence>
      {isDrawerOpen ? (
        <>
          <motion.button
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            type="button"
            className="fixed inset-0 z-[65] bg-black/75"
            onClick={closeDrawer}
            aria-label={t.cart.closeOverlay}
          />
          <motion.aside
            initial={hidden}
            animate={shown}
            exit={hidden}
            transition={{ type: "spring", stiffness: 260, damping: 30 }}
            role="dialog"
            aria-modal="true"
            aria-label={t.cart.title}
            className="fixed inset-x-0 bottom-0 z-[66] flex max-h-[90vh] flex-col rounded-t-[14px] border-t border-white/10 bg-[#111] md:inset-x-auto md:right-0 md:top-0 md:h-full md:max-h-none md:w-full md:max-w-md md:rounded-none md:border-l md:border-t-0"
          >
            <span aria-hidden className="mx-auto mt-2.5 block h-1 w-10 rounded-full bg-white/20 md:hidden" />
            <div className="flex items-center justify-between px-4 pb-3 pt-3 md:px-5 md:pt-5">
              <h2 className="pt-[0.1em] font-display text-[34px] uppercase leading-none text-fg">{en ? "Cart" : "Košarica"}</h2>
              <div className="flex items-center gap-3">
                <span className="text-[11px] font-bold uppercase tracking-[0.14em] text-mute">{countLabel}</span>
                <button
                  type="button"
                  onClick={closeDrawer}
                  className="flex h-10 w-10 items-center justify-center rounded-full border border-white/[0.18] text-fg"
                  aria-label={t.cart.close}
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto border-t border-white/10 px-4 md:px-5">
              {items.length ? (
                items.map((item) => (
                  <div key={item.id} className="flex items-start gap-3 border-b border-white/10 py-4">
                    <div className="relative h-[84px] w-[72px] shrink-0 overflow-hidden rounded-[2px] bg-white">
                      {item.imageSrc ? (
                        <Image
                          src={item.imageSrc}
                          alt={`${repairText(item.klub)} ${repairText(item.igrac)}`}
                          fill
                          sizes="72px"
                          className="object-contain p-1"
                        />
                      ) : (
                        <div className="flex h-full items-center justify-center text-[9px] font-bold uppercase tracking-[0.14em] text-black/40">
                          Dresify
                        </div>
                      )}
                    </div>

                    <div className="min-w-0 flex-1">
                      <h3 className="truncate pt-[0.12em] font-display text-[22px] uppercase leading-none text-fg">
                        {repairText(item.igrac)}
                      </h3>
                      <p className="mt-1 truncate text-[12.5px] font-medium leading-[1.35] text-mute">
                        {repairText(item.klub)} · {item.segmentLabel.toLowerCase()}
                      </p>
                      <p className="text-[12.5px] font-medium leading-[1.35] text-mute">
                        {t.cart.size} {item.size} · 1 kom
                      </p>
                    </div>

                    <div className="flex shrink-0 flex-col items-end gap-2">
                      <span className="text-[15px] font-black text-fg">{eur(item.price)}</span>
                      <button
                        type="button"
                        onClick={() => removeItem(item.id)}
                        className="flex h-8 w-8 items-center justify-center rounded-full text-white/40 transition-colors hover:text-red-400"
                        aria-label={t.cart.removeItem}
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                ))
              ) : (
                <div className="py-10 text-center">
                  <p className="text-[14px] leading-[1.5] text-mute">{t.cart.empty}</p>
                  <Link href="/dresovi" onClick={closeDrawer} className="button-primary mt-5 w-full">
                    {en ? "Browse jerseys" : "Pogledaj dresove"} <ArrowRight className="h-4 w-4" />
                  </Link>
                </div>
              )}

              {items.length ? (
                <div className="py-4">
                  <CartUpsell onNavigate={closeDrawer} />
                </div>
              ) : null}
            </div>

            {items.length ? (
              <div className="border-t border-white/10 px-4 pb-[max(16px,env(safe-area-inset-bottom))] pt-3 md:px-5 md:pb-5">
                {/* Besplatna dostava (samo registrirani, od 60 €) */}
                <div className="mb-3">
                  <p className="text-[12px] leading-5 text-[#c4c4bd]">
                    {freeShipping ? (
                      <span className="font-bold text-accent">Ostvario si besplatnu dostavu!</span>
                    ) : reachedThreshold ? (
                      <>
                        <Link href="/prijava/" onClick={closeDrawer} className="font-bold text-accent underline">
                          Prijavi se ili registriraj (besplatno)
                        </Link>{" "}
                        i dostava je <span className="font-bold text-fg">besplatna</span> — uštediš {SHIPPING_PRICE_LABEL}
                      </>
                    ) : (
                      <>
                        Dodaj još <span className="font-bold text-accent">{formatEuroAmount(remainingForFree)}</span> za{" "}
                        <span className="font-bold text-fg">besplatnu dostavu</span>
                        {!signedIn && " (za registrirane)"}
                      </>
                    )}
                  </p>
                  <div className="mt-1.5 h-1 w-full overflow-hidden rounded-full bg-white/10">
                    <div
                      className="h-full rounded-full bg-accent transition-[width] duration-500 ease-out"
                      style={{ width: `${reachedThreshold ? 100 : Math.min(100, (subtotal / FREE_SHIPPING_THRESHOLD_EUR) * 100)}%` }}
                    />
                  </div>
                </div>

                <div className="space-y-1 text-[14px] font-medium text-[#c4c4bd]">
                  <div className="flex items-center justify-between">
                    <span>{en ? "Products" : "Proizvodi"}</span>
                    <span className="font-bold text-fg">{eur(subtotal)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>{en ? "GLS delivery (2–5 days)" : "GLS dostava (2–5 dana)"}</span>
                    <span className={`font-bold ${freeShipping ? "text-accent" : "text-fg"}`}>
                      {freeShipping ? (en ? "Free" : "Besplatno") : eur(SHIPPING_PRICE_EUR)}
                    </span>
                  </div>
                </div>
                <div className="mt-3 flex items-end justify-between border-t border-white/10 pt-3">
                  <div>
                    <p className="text-[13px] font-black uppercase tracking-[0.12em] text-fg">{t.cart.total}</p>
                    <p className="mt-1 text-[11.5px] font-medium text-mute">
                      {en ? "paid to the courier on delivery" : "plaćaš dostavljaču pri preuzimanju"}
                    </p>
                  </div>
                  <span className="font-display text-[44px] leading-[0.85] text-fg">{eur(total)}</span>
                </div>

                <Link href="/checkout" onClick={closeDrawer} className="button-primary mt-4 w-full">
                  {en ? `Order cash on delivery — ${eur(total)}` : `Naruči pouzećem — ${eur(total)}`}
                </Link>
                <div className="mt-3 flex items-center justify-between text-[12px] font-semibold text-mute">
                  <Link href="/kosarica" onClick={closeDrawer} className="underline-offset-4 hover:text-fg hover:underline">
                    {en ? "View cart" : "Vidi košaricu"}
                  </Link>
                  <span className="hidden sm:inline">{en ? "No card, no sign-up · size exchange" : "Bez kartice i registracije · zamjena veličine"}</span>
                  <button type="button" onClick={clearCart} className="underline-offset-4 hover:text-fg hover:underline">
                    {en ? "Clear" : "Isprazni"}
                  </button>
                </div>
                <p className="mt-2 text-center text-[11.5px] font-medium text-mute sm:hidden">
                  {en ? "No card, no sign-up · size exchange" : "Bez kartice i registracije · zamjena veličine"}
                </p>
              </div>
            ) : null}
          </motion.aside>
        </>
      ) : null}
    </AnimatePresence>
  );
}
