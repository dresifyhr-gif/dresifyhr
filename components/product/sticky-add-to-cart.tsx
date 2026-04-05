"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ShoppingBag } from "lucide-react";
import { useCart } from "@/components/providers/cart-provider";
import { useLanguage } from "@/contexts/language-context";
import { repairText } from "@/lib/utils";
import type { Jersey } from "@/lib/data/jerseys";

type Props = {
  product: Jersey;
  selectedSize: string;
  segment: "adult" | "kid";
  segmentLabel: string;
  imageSrc?: string;
  mainButtonRef: React.RefObject<HTMLButtonElement>;
};

export function StickyAddToCart({ product, selectedSize, segment, segmentLabel, imageSrc, mainButtonRef }: Props) {
  const { addItem } = useCart();
  const { t } = useLanguage();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => setVisible(!entry.isIntersecting),
      { threshold: 0 }
    );
    if (mainButtonRef.current) observer.observe(mainButtonRef.current);
    return () => observer.disconnect();
  }, [mainButtonRef]);

  const handleAdd = () => {
    if (!selectedSize) return;
    addItem({ slug: product.slug, klub: repairText(product.klub), igrac: repairText(product.igrac), size: selectedSize, segment, segmentLabel, imageSrc });
  };

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ y: 80, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 80, opacity: 0 }}
          transition={{ duration: 0.25, ease: "easeOut" }}
          className="fixed bottom-0 inset-x-0 z-40 border-t border-white/10 bg-[#0d0d0d]/95 p-4 backdrop-blur-md md:hidden"
        >
          <div className="flex items-center gap-3">
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs font-semibold uppercase tracking-[0.15em] text-white">{repairText(product.klub)}</p>
              <p className="text-accent font-heading text-xl leading-none">{selectedSize ? `Vel. ${selectedSize}` : t.stickyCart.selectSize}</p>
            </div>
            <button
              type="button"
              onClick={handleAdd}
              disabled={!selectedSize}
              className="flex items-center gap-2 rounded-[4px] bg-accent px-5 py-3 font-heading text-sm uppercase tracking-[0.15em] text-black transition hover:bg-[#f0ff71] disabled:opacity-40"
            >
              <ShoppingBag className="h-4 w-4" />
              {t.stickyCart.add}
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
