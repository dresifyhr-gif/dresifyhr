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

  return (
    <section className="bg-[#111111]">
      <div className="page-shell grid grid-cols-2 gap-0 border-x border-white/10 lg:grid-cols-4">
        {trustItems.map(({ label, Icon }, index) => (
          <div
            key={label}
            className={`flex items-center gap-3 border-white/10 px-3 py-4 text-xs font-medium text-white sm:px-5 sm:py-5 sm:text-sm ${
              index % 2 === 0 ? "border-r lg:border-r" : ""
            } ${index < 2 ? "border-b lg:border-b-0" : ""}`}
          >
            <Icon className="h-5 w-5 shrink-0 text-accent" />
            <span>{label}</span>
          </div>
        ))}
      </div>
    </section>
  );
}
