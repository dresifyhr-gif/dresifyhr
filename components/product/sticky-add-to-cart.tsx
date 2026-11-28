"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ShoppingBag } from "lucide-react";
import { useLanguage } from "@/contexts/language-context";
import { repairText } from "@/lib/utils";
import type { MixAddons } from "@/lib/mix";
import type { Jersey } from "@/lib/data/jerseys";

type Props = {
  product: Jersey;
  selectedSize: string;
  hasSizePicker: boolean;
  needsSize: boolean;
  addons: MixAddons;
  total: number;
  mainButtonRef: React.RefObject<HTMLButtonElement>;
  // Isti put dodavanja kao glavni gumb (dres + odabrani mix), da se dodatak ne izgubi.
  onAdd: () => void;
  onNeedSize: () => void;
};

export function StickyAddToCart({ product, selectedSize, hasSizePicker, needsSize, addons, total, mainButtonRef, onAdd, onNeedSize }: Props) {
  const { t } = useLanguage();
  const [visible, setVisible] = useState(false);
  const barRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => setVisible(!entry.isIntersecting),
      { threshold: 0 }
    );
    if (mainButtonRef.current) observer.observe(mainButtonRef.current);
    return () => observer.disconnect();
  }, [mainButtonRef]);

  // Plutajući gumbi (WhatsApp, AI) se dignu iznad trake samo dok je traka vidljiva (mobitel).
  // Visina se mjeri jer traka raste za safe-area na iPhoneu.
  useEffect(() => {
    const root = document.documentElement;
    const h = visible ? barRef.current?.offsetHeight || 84 : 0;
    root.style.setProperty("--fab-lift", `${h}px`);
    return () => root.style.setProperty("--fab-lift", "0px");
  }, [visible]);

  const extras = `${addons.lopta ? " + lopta" : ""}${addons.kapa ? " + kapa" : ""}${addons.figura ? " + figura" : ""}`;
  const summary = needsSize
    ? t.stickyCart.selectSize
    : `${hasSizePicker && selectedSize ? `Vel. ${selectedSize}` : "Jedna vel."}${extras} · ${total} €`;

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          ref={barRef}
          initial={{ y: 80, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 80, opacity: 0 }}
          transition={{ duration: 0.25, ease: "easeOut" }}
          className="fixed inset-x-0 bottom-0 z-40 border-t border-white/10 bg-black px-4 pt-3 md:hidden"
          style={{ paddingBottom: "max(12px, env(safe-area-inset-bottom))" }}
        >
          <div className="flex items-center gap-3">
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs font-semibold uppercase tracking-[0.15em] text-white/70">{repairText(product.klub)}</p>
              <p className={`truncate font-heading text-xl leading-none ${needsSize ? "text-white/55" : "text-accent"}`}>{summary}</p>
            </div>
            <button
              type="button"
              onClick={needsSize ? onNeedSize : onAdd}
              aria-disabled={needsSize}
              className={`flex shrink-0 items-center gap-2 rounded-[4px] px-5 py-3 font-heading text-sm uppercase tracking-[0.15em] transition ${
                needsSize
                  ? "border border-[#333] bg-[#1a1a1a] text-[#737373]"
                  : "bg-accent text-black hover:bg-[#f0ff71]"
              }`}
            >
              <ShoppingBag className="h-4 w-4" strokeWidth={1.75} />
              {t.stickyCart.add}
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
