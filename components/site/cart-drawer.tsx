"use client";

import Image from "next/image";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowRight, ShoppingBag, Trash2, X } from "lucide-react";

import { useCart } from "@/components/providers/cart-provider";
import { useLanguage } from "@/contexts/language-context";
import { SHIPPING_PRICE_EUR, SHIPPING_PRICE_LABEL, ZAGREB_DELIVERY_PRICE_LABEL } from "@/lib/site";
import { formatEuroAmount, repairText } from "@/lib/utils";

export function CartDrawer() {
  const { items, subtotal, isDrawerOpen, closeDrawer, removeItem, clearCart } = useCart();
  const { t } = useLanguage();
  const shipping = items.length ? SHIPPING_PRICE_EUR : 0;
  const total = subtotal + shipping;

  return (
    <AnimatePresence>
      {isDrawerOpen ? (
        <>
          <motion.button
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            type="button"
            className="fixed inset-0 z-50 bg-black/72 backdrop-blur-sm"
            onClick={closeDrawer}
            aria-label={t.cart.closeOverlay}
          />
          <motion.aside
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", stiffness: 220, damping: 28 }}
            className="fixed right-0 top-0 z-[60] flex h-full w-full max-w-md flex-col border-l border-white/10 bg-[#0a0a0a] p-5 shadow-2xl"
          >
            <div className="mb-6 flex items-center justify-between">
              <div>
                <p className="text-xs uppercase tracking-[0.35em] text-white/45">{t.cart.label}</p>
                <h2 className="mt-2 flex items-center gap-3 text-4xl uppercase leading-none text-white">
                  <ShoppingBag className="h-8 w-8 text-accent" />
                  {t.cart.title}
                </h2>
              </div>
              <button
                type="button"
                onClick={closeDrawer}
                className="flex h-11 w-11 items-center justify-center border border-white/10 bg-[#111111]"
                aria-label={t.cart.close}
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="flex-1 space-y-3 overflow-y-auto pr-1">
              {items.length ? (
                items.map((item) => (
                  <div key={item.id} className="border border-white/10 bg-[#111111] p-4">
                    <div className="flex items-start gap-3">
                      <div className="relative h-24 w-20 shrink-0 overflow-hidden rounded-[4px] border border-white/10 bg-[#0a0a0a]">
                        {item.imageSrc ? (
                          <Image
                            src={item.imageSrc}
                            alt={`${repairText(item.klub)} ${repairText(item.igrac)}`}
                            fill
                            sizes="80px"
                            className="object-contain p-2"
                          />
                        ) : (
                          <div className="flex h-full items-center justify-center text-[10px] uppercase tracking-[0.18em] text-white/35">
                            DRESIFY
                          </div>
                        )}
                      </div>

                      <div className="min-w-0 flex-1">
                        <p className="text-xs uppercase tracking-[0.3em] text-white/45">{item.segmentLabel}</p>
                        <h3 className="mt-2 text-2xl uppercase leading-none text-white">
                          {repairText(item.klub)}
                        </h3>
                        <p className="mt-2 text-sm leading-6 text-white/60">{repairText(item.igrac)}</p>
                        <div className="mt-3 flex items-center justify-between gap-3 text-sm">
                          <span className="text-white/55">{t.cart.size} {item.size}</span>
                          <span className="font-semibold text-accent">{formatEuroAmount(item.price)}</span>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => removeItem(item.id)}
                        className="flex h-10 w-10 items-center justify-center border border-white/10 text-white/45 transition duration-200 ease-out hover:border-red-400/40 hover:text-red-400"
                        aria-label={t.cart.removeItem}
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                ))
              ) : (
                <div className="border border-dashed border-white/10 bg-[#111111] p-8 text-center text-sm leading-7 text-white/50">
                  {t.cart.empty}
                </div>
              )}
            </div>

            <div className="mt-6 border border-white/10 bg-[#111111] p-5">
              <div className="space-y-3 text-sm text-white">
                <div className="flex items-center justify-between">
                  <span className="font-medium uppercase tracking-[0.2em] text-white/50">{t.cart.items}</span>
                  <span className="font-semibold">{formatEuroAmount(subtotal)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="font-medium uppercase tracking-[0.2em] text-white/50">{t.cart.shipping}</span>
                  <span className="font-semibold">{items.length ? SHIPPING_PRICE_LABEL : ZAGREB_DELIVERY_PRICE_LABEL}</span>
                </div>
                <div className="flex items-center justify-between border-t border-white/10 pt-3">
                  <span className="font-medium uppercase tracking-[0.28em] text-white/50">{t.cart.total}</span>
                  <span className="text-2xl font-bold text-accent">{formatEuroAmount(total)}</span>
                </div>
              </div>

              <div className="mt-5 grid gap-3">
                <Link href="/kosarica" onClick={closeDrawer} className="button-secondary w-full">
                  {t.cart.viewCart}
                </Link>
                <Link href="/checkout" onClick={closeDrawer} className="button-primary w-full">
                  <span className="inline-flex items-center gap-2">
                    {t.cart.checkout}
                    <ArrowRight className="h-4 w-4" />
                  </span>
                </Link>
                {items.length ? (
                  <button type="button" onClick={clearCart} className="button-secondary w-full">
                    {t.cart.clear}
                  </button>
                ) : null}
              </div>
            </div>
          </motion.aside>
        </>
      ) : null}
    </AnimatePresence>
  );
}
