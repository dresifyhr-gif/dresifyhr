"use client";

import Image from "next/image";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowRight, CheckCircle2, X } from "lucide-react";

import { useCart } from "@/components/providers/cart-provider";
import { useLanguage } from "@/contexts/language-context";
import { formatEuroAmount, repairText } from "@/lib/utils";

export function AddToCartModal() {
  const { isAddModalOpen, recentlyAddedItem, closeAddModal } = useCart();
  const { t, locale } = useLanguage();

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
            className="fixed inset-0 z-50 bg-black/80"
            onClick={closeAddModal}
          />

          <div className="fixed inset-0 z-[60] grid place-items-center p-3 sm:p-6">
            <motion.div
              initial={{ opacity: 0, y: 18, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 18, scale: 0.98 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
              className="my-auto max-h-[calc(100dvh-24px)] w-full max-w-[560px] overflow-y-auto rounded-[18px] border border-white/10 bg-[#111111] p-4 shadow-[0_40px_90px_rgba(0,0,0,0.52)] sm:p-8"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex min-w-0 items-center gap-2.5 sm:gap-3">
                  <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#1f8f4e]/18 text-[#68d391] sm:h-12 sm:w-12">
                    <CheckCircle2 className="h-5 w-5 sm:h-6 sm:w-6" />
                  </span>
                  <div>
                    <p className="text-[10px] uppercase tracking-[0.24em] text-white/45 sm:text-xs">{t.addedModal.label}</p>
                    <h2 className="mt-0.5 font-heading text-lg uppercase leading-tight text-white sm:mt-1 sm:text-[2rem] sm:leading-none">
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

              <div className="mt-4 flex items-center gap-3 rounded-[14px] border border-white/10 bg-[#0a0a0a] p-3 sm:mt-6 sm:gap-5 sm:p-5">
                <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-[8px] bg-[#fbfbfb] sm:h-28 sm:w-28">
                  {recentlyAddedItem.imageSrc ? (
                    <Image
                      src={recentlyAddedItem.imageSrc}
                      alt={`${repairText(recentlyAddedItem.klub)} ${repairText(recentlyAddedItem.igrac)}`}
                      fill
                      sizes="(min-width: 640px) 112px, 80px"
                      className="object-contain p-1.5"
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center text-[10px] uppercase tracking-[0.2em] text-black/35">
                      DRESIFY
                    </div>
                  )}
                </div>

                <div className="min-w-0 flex-1">
                  <h3 className="truncate font-heading text-xl uppercase leading-none text-white sm:text-[2rem]">
                    {repairText(recentlyAddedItem.klub)}
                  </h3>
                  <p className="mt-1 line-clamp-2 text-[13px] leading-5 text-white/65 sm:text-sm">
                    {repairText(recentlyAddedItem.igrac)}
                  </p>
                  <p className="mt-1 text-xs leading-5 text-white/45">{repairText(recentlyAddedItem.segmentLabel)}</p>
                  <p className="mt-2 text-[13px] text-white/60">
                    {t.addedModal.size} <span className="text-white">{recentlyAddedItem.size}</span>
                    <span className="mx-1.5 text-white/25">·</span>
                    {t.addedModal.qty} <span className="text-white">1</span>
                    <span className="mx-1.5 text-white/25">·</span>
                    <span className="font-semibold text-accent">{formatEuroAmount(recentlyAddedItem.price)}</span>
                  </p>
                </div>
              </div>

              <div className="mt-4 sm:mt-6">
                <Link href="/checkout" onClick={closeAddModal} className="button-primary w-full px-4">
                  <span className="inline-flex items-center justify-center gap-2">
                    {t.addedModal.checkout}
                    <ArrowRight className="h-4 w-4" />
                  </span>
                </Link>
                <button
                  type="button"
                  onClick={closeAddModal}
                  className="mt-1 flex h-11 w-full items-center justify-center text-sm text-white/60 underline decoration-white/25 underline-offset-4 transition-colors hover:text-white hover:decoration-white/60"
                >
                  {locale === "en" ? "Continue shopping" : "Nastavi kupovinu"}
                </button>
              </div>
            </motion.div>
          </div>
        </>
      ) : null}
    </AnimatePresence>
  );
}
