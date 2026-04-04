"use client";

import Image from "next/image";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowRight, CheckCircle2, ShoppingBag, X } from "lucide-react";

import { useCart } from "@/components/providers/cart-provider";
import { formatEuroAmount, repairText } from "@/lib/utils";

export function AddToCartModal() {
  const { isAddModalOpen, recentlyAddedItem, closeAddModal } = useCart();

  if (!recentlyAddedItem) {
    return null;
  }

  return (
    <AnimatePresence>
      {isAddModalOpen ? (
        <>
          <motion.button
            type="button"
            aria-label="Zatvori prozor"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm"
            onClick={closeAddModal}
          />

          <div className="fixed inset-0 z-[60] grid place-items-center p-4 sm:p-6">
            <motion.div
              initial={{ opacity: 0, y: 18, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 18, scale: 0.98 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
              className="my-auto w-full max-w-[860px] rounded-[18px] border border-white/10 bg-[#111111] p-6 shadow-[0_40px_90px_rgba(0,0,0,0.52)] sm:p-8"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-center gap-3">
                  <span className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-[#1f8f4e]/18 text-[#68d391]">
                    <CheckCircle2 className="h-6 w-6" />
                  </span>
                  <div>
                    <p className="text-xs uppercase tracking-[0.24em] text-white/45">Košarica</p>
                    <h2 className="mt-1 font-heading text-[2.15rem] uppercase leading-none text-white sm:text-[2.5rem]">
                      Uspješno dodano u košaricu!
                    </h2>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={closeAddModal}
                  className="inline-flex h-10 w-10 items-center justify-center rounded-[4px] border border-white/10 bg-[#0a0a0a] text-white/70 transition duration-200 ease-out hover:border-accent hover:text-accent"
                  aria-label="Zatvori"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="mt-6 rounded-[14px] border border-white/10 bg-[#0a0a0a] p-5 sm:p-6">
                <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
                  <div className="relative h-36 w-32 shrink-0 overflow-hidden rounded-[10px] border border-white/10 bg-[#111111] sm:h-40 sm:w-36">
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
                    <p className="text-xs uppercase tracking-[0.24em] text-white/45">
                      {recentlyAddedItem.segmentLabel}
                    </p>
                    <h3 className="mt-2 font-heading text-[2.2rem] uppercase leading-none text-white sm:text-[2.75rem]">
                      {repairText(recentlyAddedItem.klub)}
                    </h3>
                    <p className="mt-2 text-sm leading-6 text-white/60 sm:text-base">
                      {repairText(recentlyAddedItem.igrac)}
                    </p>

                    <div className="mt-5 grid gap-3 sm:grid-cols-3">
                      <div className="rounded-[8px] border border-white/10 bg-[#111111] px-4 py-3.5">
                        <span className="block text-[11px] uppercase tracking-[0.2em] text-white/40">Veličina</span>
                        <span className="mt-1 block text-base font-semibold text-white">{recentlyAddedItem.size}</span>
                      </div>
                      <div className="rounded-[8px] border border-white/10 bg-[#111111] px-4 py-3.5">
                        <span className="block text-[11px] uppercase tracking-[0.2em] text-white/40">Količina</span>
                        <span className="mt-1 block text-base font-semibold text-white">1</span>
                      </div>
                      <div className="rounded-[8px] border border-accent/20 bg-accent/10 px-4 py-3.5">
                        <span className="block text-[11px] uppercase tracking-[0.2em] text-accent/70">Ukupno</span>
                        <span className="mt-1 block text-base font-semibold text-accent">
                          {formatEuroAmount(recentlyAddedItem.price)}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-6 grid gap-3 sm:grid-cols-3">
                <button type="button" onClick={closeAddModal} className="button-secondary w-full">
                  NASTAVAK KUPOVINE
                </button>
                <Link href="/kosarica" onClick={closeAddModal} className="button-secondary w-full">
                  <span className="inline-flex items-center justify-center gap-2">
                    VIDI KOŠARICU
                    <ShoppingBag className="h-4 w-4" />
                  </span>
                </Link>
                <Link href="/checkout" onClick={closeAddModal} className="button-primary w-full">
                  <span className="inline-flex items-center justify-center gap-2">
                    NASTAVAK NA PLAĆANJE
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
