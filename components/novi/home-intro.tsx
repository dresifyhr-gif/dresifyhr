"use client";

import Link from "next/link";

import { useLanguage } from "@/contexts/language-context";
import { useShopSettings } from "@/contexts/shop-settings-context";

/* NOVI DIZAJN — vidljivi H1 naslovnice ispod scene: isti tekst kao živi HeroSection
   (Postavke → naslov, inače t.hero.line1–3, HR/EN) i isti interni linkovi na klupske
   i igračke landinge kao živi ticker (components/home/hero-section.tsx). */

const HUBS: { name: string; href: string }[] = [
  { name: "Real Madrid", href: "/dresovi/klub/real-madrid/" },
  { name: "Barcelona", href: "/dresovi/klub/fc-barcelona/" },
  { name: "PSG", href: "/dresovi/klub/psg/" },
  { name: "Bayern München", href: "/dresovi/klub/bayern-munchen/" },
  { name: "Man United", href: "/dresovi/klub/manchester-united/" },
  { name: "Inter Miami", href: "/dresovi/klub/inter-miami/" },
  { name: "Brazil", href: "/dresovi/klub/brazil/" },
  { name: "Mbappe", href: "/dresovi/igrac/mbappe/" },
  { name: "Ronaldo", href: "/dresovi/igrac/ronaldo/" },
  { name: "Messi", href: "/dresovi/igrac/messi/" },
  { name: "Bellingham", href: "/dresovi/igrac/bellingham/" },
  { name: "Neymar", href: "/dresovi/igrac/neymar/" },
  { name: "Yamal", href: "/dresovi/igrac/yamal/" },
  { name: "Raphinha", href: "/dresovi/igrac/raphinha/" },
];

export function NoviHomeIntro() {
  const { t } = useLanguage();
  const { heroTitle } = useShopSettings();
  const custom = heroTitle ? heroTitle.split("\n").map((l) => l.trim()).filter(Boolean) : null;
  const lines = custom?.length ? custom : [t.hero.line1, t.hero.line2, t.hero.line3];
  return (
    <section className="mx-auto w-full max-w-[1280px] px-4 pb-4 pt-12 sm:px-8 lg:pt-16">
      <h1 className="e-display text-[40px] uppercase leading-[.9] text-white sm:text-[56px] lg:text-[72px]">
        {lines.map((l, i) => (
          <span key={i} className={`block ${i === lines.length - 1 ? "text-[#e8ff3c]" : ""}`}>
            {l}
          </span>
        ))}
      </h1>
      <ul className="mt-6 flex flex-wrap gap-x-5 gap-y-1">
        {HUBS.map((h) => (
          <li key={h.href}>
            <Link href={h.href} className="flex h-9 items-center text-[14px] text-white/55 transition-colors hover:text-[#e8ff3c]">
              {h.name}
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
