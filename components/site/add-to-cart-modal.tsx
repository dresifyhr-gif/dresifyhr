"use client";

import Image from "next/image";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowRight, CheckCircle2, ShoppingBag, X } from "lucide-react";

import { useCart } from "@/components/providers/cart-provider";
import { useLanguage } from "@/contexts/language-context";
import { formatEuroAmount, repairText } from "@/lib/utils";

export function AddToCartModal() {
  const { isAddModalOpen, recentlyAddedItem, closeAddModal } = useCart();
  const { t } = useLanguage();

  if (!recentlyAddedItem) {
    return null;
  }

  return (
    <AnimatePresence>
      {isAddModalOpen ? (
        <>
          <motion.button
            type="button"
            aria-label={t.addedModal.closeOverlay}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm"
            onClick={closeAddModal}
          />

          <div className="fixed inset-0 z-[60] grid place-items-center p-3 sm:p-6">
            <motion.div
              initial={{ opacity: 0, y: 18, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 18, scale: 0.98 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
              className="my-auto max-h-[92vh] w-full max-w-[860px] overflow-y-auto rounded-[18px] border border-white/10 bg-[#111111] p-4 shadow-[0_40px_90px_rgba(0,0,0,0.52)] sm:p-8"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-2.5 sm:gap-3">
                  <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#1f8f4e]/18 text-[#68d391] sm:h-12 sm:w-12">
                    <CheckCircle2 className="h-5 w-5 sm:h-6 sm:w-6" />
                  </span>
                  <div>
                    <p className="text-[10px] uppercase tracking-[0.24em] text-white/45 sm:text-xs">{t.addedModal.label}</p>
                    <h2 className="mt-0.5 font-heading text-lg uppercase leading-tight text-white sm:mt-1 sm:text-[2.5rem] sm:leading-none">
                      {t.addedModal.title}
                    </h2>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={closeAddModal}
                  className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-[4px] border border-white/10 bg-[#0a0a0a] text-white/70 transition duration-200 ease-out hover:border-accent hover:text-accent sm:h-10 sm:w-10"
                  aria-label={t.addedModal.close}
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="mt-4 rounded-[14px] border border-white/10 bg-[#0a0a0a] p-3.5 sm:mt-6 sm:p-6">
                <div className="flex flex-row items-center gap-3 sm:gap-5">
                  <div className="relative h-24 w-20 shrink-0 overflow-hidden rounded-[10px] border border-white/10 bg-[#111111] sm:h-40 sm:w-36">
                    {recentlyAddedItem.imageSrc ? (
                      <Image
                        src={recentlyAddedItem.imageSrc}
                        alt={`${repairText(recentlyAddedItem.klub)} ${repairText(recentlyAddedItem.igrac)}`}
                        fill
                        sizes="144px"
                        className="object-contain p-2.5"
                      />
                    ) : (
                      <div className="flex h-full items-center justify-center text-xs uppercase tracking-[0.2em] text-white/35">
                        DRESIFY
                      </div>
                    )}
                  </div>

                  <div className="min-w-0 flex-1">
                    <p className="text-[10px] uppercase tracking-[0.24em] text-white/45 sm:text-xs">
                      {recentlyAddedItem.segmentLabel}
                    </p>
                    <h3 className="mt-1 font-heading text-xl uppercase leading-none text-white sm:mt-2 sm:text-[2.75rem]">
                      {repairText(recentlyAddedItem.klub)}
                    </h3>
                    <p className="mt-1 text-[13px] leading-5 text-white/60 sm:mt-2 sm:text-base sm:leading-6">
                      {repairText(recentlyAddedItem.igrac)}
                    </p>
                  </div>
                </div>

                <div className="mt-4 grid grid-cols-3 gap-2 sm:mt-5 sm:gap-3">
                  <div className="rounded-[8px] border border-white/10 bg-[#111111] px-2.5 py-2 sm:px-4 sm:py-3.5">
                    <span className="block text-[10px] uppercase tracking-[0.15em] text-white/40 sm:text-[11px] sm:tracking-[0.2em]">{t.addedModal.size}</span>
                    <span className="mt-0.5 block text-sm font-semibold text-white sm:mt-1 sm:text-base">{recentlyAddedItem.size}</span>
                  </div>
                  <div className="rounded-[8px] border border-white/10 bg-[#111111] px-2.5 py-2 sm:px-4 sm:py-3.5">
                    <span className="block text-[10px] uppercase tracking-[0.15em] text-white/40 sm:text-[11px] sm:tracking-[0.2em]">{t.addedModal.qty}</span>
                    <span className="mt-0.5 block text-sm font-semibold text-white sm:mt-1 sm:text-base">1</span>
                  </div>
                  <div className="rounded-[8px] border border-accent/20 bg-accent/10 px-2.5 py-2 sm:px-4 sm:py-3.5">
                    <span className="block text-[10px] uppercase tracking-[0.15em] text-accent/70 sm:text-[11px] sm:tracking-[0.2em]">{t.addedModal.total}</span>
                    <span className="mt-0.5 block text-sm font-semibold text-accent sm:mt-1 sm:text-base">
                      {formatEuroAmount(recentlyAddedItem.price)}
                    </span>
                  </div>
                </div>
              </div>

              <div className="mt-4 grid gap-2 sm:mt-6 sm:grid-cols-3">
                <button type="button" onClick={closeAddModal} className="button-secondary w-full">
                  {t.addedModal.continueShopping}
                </button>
                <Link href="/kosarica" onClick={closeAddModal} className="button-secondary w-full">
                  <span className="inline-flex items-center justify-center gap-2">
                    {t.addedModal.viewCart}
                    <ShoppingBag className="h-4 w-4" />
                  </span>
                </Link>
                <Link href="/checkout" onClick={closeAddModal} className="button-primary w-full">
                  <span className="inline-flex items-center justify-center gap-2">
                    {t.addedModal.checkout}
                    <ArrowRight className="h-4 w-4" />
                  </span>
                </Link>
              </div>
            </motion.div>
          </div>
        </>
      ) : null}
    </AnimatePresence>
  );
}
