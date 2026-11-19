"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";

import type { OrmarItem } from "@/lib/data/ormar";
import { formatPrice } from "@/lib/utils";
import { displayName } from "./ormar-g-lib";

// Info za dres u sredini šipke — ime, cijena i ulaz u karticu s veličinama.
export function OrmarGInfo({ item, reduced, onOpen }: { item: OrmarItem; reduced: boolean; onOpen: () => void }) {
  const { club, title, variant } = displayName(item);
  return (
    <motion.div
      initial={reduced ? false : { opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.26, ease: [0.22, 1, 0.36, 1] }}
      className="mx-auto w-full max-w-[460px] text-center"
    >
      <p className="truncate text-[11px] font-medium uppercase tracking-[0.26em] text-white/45">
        {club}
        {variant && <span className="text-white/30"> · {variant}</span>}
      </p>
      <h3 className="mt-2 truncate font-heading text-[40px] uppercase leading-[0.95] tracking-[0.03em] text-white sm:text-[48px]">{title}</h3>
      <p className="mt-2 font-heading text-[24px] leading-none tracking-[0.05em] text-accent">{formatPrice(item.product.price)}</p>

      <div className="mt-5 flex flex-col items-stretch gap-2 sm:flex-row sm:items-center sm:justify-center">
        <button
          type="button"
          onClick={onOpen}
          aria-haspopup="dialog"
          className="inline-flex h-12 w-full items-center justify-center rounded-full bg-accent px-8 text-[12px] font-semibold uppercase tracking-[0.2em] text-black transition duration-200 hover:bg-[#f1ff7a] active:scale-[0.98] sm:w-auto"
        >
          Odaberi veličinu
        </button>
        <Link
          href={item.href}
          className="group inline-flex h-12 items-center justify-center gap-2 rounded-full px-5 text-[12px] font-medium uppercase tracking-[0.2em] text-white/70 transition hover:text-white"
        >
          Pogledaj {item.product.category === "trenirka" ? "trenirku" : "dres"}
          <ArrowRight strokeWidth={1.6} className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-0.5" />
        </Link>
      </div>
    </motion.div>
  );
}
