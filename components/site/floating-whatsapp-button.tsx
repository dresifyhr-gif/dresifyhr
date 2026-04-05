"use client";

import { MessageCircle } from "lucide-react";

import { useLanguage } from "@/contexts/language-context";
import { WHATSAPP_URL } from "@/lib/site";

export function FloatingWhatsAppButton() {
  const { t } = useLanguage();
  return (
    <a
      href={WHATSAPP_URL}
      target="_blank"
      rel="noreferrer"
      className="fixed bottom-4 right-4 z-40 flex h-16 w-16 items-center justify-center rounded-[4px] border border-white/10 bg-[#25D366] text-white shadow-[0_18px_40px_rgba(37,211,102,0.28)] transition-transform duration-200 ease-out hover:-translate-y-1 sm:bottom-6 sm:right-6 md:h-auto md:w-auto md:gap-3 md:px-4 md:py-3"
      aria-label={t.whatsapp.aria}
    >
      <span className="flex h-16 w-16 items-center justify-center md:h-11 md:w-11 md:bg-black/10">
        <MessageCircle className="h-7 w-7 shrink-0 md:h-5 md:w-5" />
      </span>
      <span className="hidden md:block">
        <span className="block text-[10px] font-semibold uppercase tracking-[0.28em] text-white/80">
          WhatsApp
        </span>
        <span className="block font-heading text-xl uppercase tracking-[0.16em] text-white">
          {t.whatsapp.order}
        </span>
      </span>
    </a>
  );
}
