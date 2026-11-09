"use client";

import { MessageCircle } from "lucide-react";

import { useWhatsAppUrl } from "@/contexts/shop-settings-context";

// "Ne znaš veličinu?" — kupac pošalje visinu djeteta na WhatsApp (broj iz Postavki).
export function SizeHelp({ t }: { t: { title: string; text: string; msg: string } }) {
  const wa = useWhatsAppUrl();
  const href = `${wa}?text=${encodeURIComponent(t.msg)}`;
  return (
    <div className="page-shell pt-20 lg:pt-28">
      <a
        href={href}
        target="_blank"
        rel="noreferrer"
        className="grid grid-cols-[1fr_auto] items-center gap-3.5 rounded-[2px] border border-white/[0.18] p-[22px] transition-colors hover:border-accent lg:p-8"
      >
        <span>
          <b className="block font-display text-[28px] font-normal uppercase leading-[0.95] text-fg lg:text-[40px]">{t.title}</b>
          <small className="mt-2 block text-[13px] font-medium leading-[1.4] text-[#c4c4bd] lg:text-[15px]">
            {t.text}
          </small>
        </span>
        <span className="grid h-[54px] w-[54px] place-items-center rounded-full bg-fg text-black">
          <MessageCircle className="h-6 w-6" strokeWidth={2} />
        </span>
      </a>
    </div>
  );
}
