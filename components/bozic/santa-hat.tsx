"use client";


import { useShopSettings } from "@/contexts/shop-settings-context";

// Kapica na slovu "D" u logu. Mjere su u em, pa sjedi isto na svakoj veličini loga.
export function SantaHat() {
  const { christmasOn } = useShopSettings();
  if (!christmasOn) return null;
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src="/bozic/kapica-sm.webp"
      alt=""
      aria-hidden
      width={64}
      height={52}
      loading="lazy"
      decoding="async"
      fetchPriority="low"
      className="santa-hat pointer-events-none absolute select-none"
      style={{ width: "0.67em", height: "auto", left: "-0.068em", top: "-0.346em" }}
    />
  );
}
