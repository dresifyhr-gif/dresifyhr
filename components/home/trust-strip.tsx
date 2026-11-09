"use client";

import { LifeBuoy, PackageCheck, RotateCcw, Truck } from "lucide-react";

import { useLanguage } from "@/contexts/language-context";

export function TrustStrip() {
  const { t } = useLanguage();

  const trustItems = [
    { label: t.trust.delivery, Icon: Truck },
    { label: t.trust.response, Icon: LifeBuoy },
    { label: t.trust.returns, Icon: RotateCcw },
    { label: t.trust.newWeekly, Icon: PackageCheck },
  ];

  // Mobitel: jedan red koji se vodoravno pomiče (prije 2×2 mreža = puno visine).
  return (
    <section className="border-y border-white/10 bg-[#111111]">
      <div className="page-shell flex gap-5 overflow-x-auto py-3 [scrollbar-width:none] sm:py-4 lg:justify-between [&::-webkit-scrollbar]:hidden">
        {trustItems.map(({ label, Icon }) => (
          <div key={label} className="flex shrink-0 items-center gap-2 text-xs font-medium text-white/85 sm:text-sm">
            <Icon className="h-4 w-4 shrink-0 text-accent sm:h-5 sm:w-5" />
            <span className="whitespace-nowrap">{label}</span>
          </div>
        ))}
      </div>
    </section>
  );
}
