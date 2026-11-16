"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { motion } from "framer-motion";

import { HeroKompletiCarousel } from "@/components/home/hero-kompleti-carousel";
import { ChristmasHeroFx } from "@/components/bozic/hero-fx";
import { useLanguage } from "@/contexts/language-context";
import { useShopSettings } from "@/contexts/shop-settings-context";

// Ticker klubova/igrača — stavke s landing stranicom (lib/data/seo-collections.ts)
// su linkovi (interni linkovi s naslovnice); ostale ostaju običan tekst.
const TICKER_ITEMS: { name: string; href?: string }[] = [
  { name: "Real Madrid", href: "/dresovi/klub/real-madrid/" },
  { name: "Barcelona", href: "/dresovi/klub/fc-barcelona/" },
  { name: "PSG", href: "/dresovi/klub/psg/" },
  { name: "Bayern München", href: "/dresovi/klub/bayern-munchen/" },
  { name: "Man United", href: "/dresovi/klub/manchester-united/" },
  { name: "Atletico Madrid" },
  { name: "Dortmund" },
  { name: "Al-Nassr" },
  { name: "Inter Miami", href: "/dresovi/klub/inter-miami/" },
  { name: "Santos" },
  { name: "Brazil", href: "/dresovi/klub/brazil/" },
  { name: "Italija" },
  { name: "Mbappe", href: "/dresovi/igrac/mbappe/" },
  { name: "Ronaldo", href: "/dresovi/igrac/ronaldo/" },
  { name: "Messi", href: "/dresovi/igrac/messi/" },
  { name: "Bellingham", href: "/dresovi/igrac/bellingham/" },
  { name: "Neymar", href: "/dresovi/igrac/neymar/" },
  { name: "Yamal", href: "/dresovi/igrac/yamal/" },
  { name: "Griezmann" },
  { name: "Musiala" },
  { name: "Raphinha", href: "/dresovi/igrac/raphinha/" },
  { name: "Kvaratskhelia" },
];

// ps5Slot: PS5 traka koja se na mobitelu prikazuje ispod glavnog gumba (na
// većim ekranima ista traka stoji iznad heroa — vidi app/page.tsx).
export function HeroSection({ mysteryImage, ps5Slot }: { mysteryImage?: string; ps5Slot?: ReactNode }) {
  // Naslov/podnaslov iz Postavki; prazno = zadani tekst iz prijevoda.
  const { heroTitle, heroSubtitle, christmasOn } = useShopSettings();
  const customTitleLines = heroTitle ? heroTitle.split("\n").map((l) => l.trim()).filter(Boolean) : null;

  const { t } = useLanguage();

  return (
    <section className="relative overflow-hidden bg-black">
      {christmasOn ? (
        <ChristmasHeroFx />
      ) : (
        <>
      {/* Background atmosphere — left accent glow */}
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_65%_55%_at_6%_22%,rgba(232,255,60,0.13),transparent_52%)]" />
      {/* Right-bottom second glow */}
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_45%_45%_at_88%_82%,rgba(232,255,60,0.07),transparent_55%)]" />
      {/* Subtle dot grid texture */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.035]"
        style={{
          backgroundImage: "radial-gradient(rgba(255,255,255,0.7) 1px, transparent 1px)",
          backgroundSize: "32px 32px",
        }}
      />

        </>
      )}

      <div className="page-shell relative z-10 py-8 sm:py-10 lg:py-14">
        <div className="grid items-center gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(480px,580px)] lg:gap-12">

          {/* ── Left column ── */}
          <div className="max-w-[620px]">

            {/* Eyebrow badge — jedan red, manji razmak slova nego globalni kicker */}
            <motion.div
              className="section-kicker mb-4 whitespace-nowrap tracking-[0.12em] sm:mb-6 sm:tracking-[0.16em]"
              initial={{ y: 10 }}
              animate={{ y: 0 }}
              transition={{ duration: 0.45, ease: "easeOut" }}
            >
              <span className="h-1.5 w-1.5 rounded-full bg-accent" />
              {t.hero.badge}
            </motion.div>

            <motion.h1
              className="font-heading text-[clamp(2.5rem,6vw,5.4rem)] uppercase leading-[0.86] tracking-[0.02em] text-white"
              initial={{ y: 24 }}
              animate={{ y: 0 }}
              transition={{ duration: 0.6, ease: "easeOut" }}
            >
              {customTitleLines ? (
                customTitleLines.map((line, i) => (
                  <span key={i} className={`block ${i === customTitleLines.length - 1 ? "text-accent" : ""}`}>{line}</span>
                ))
              ) : (
                <>
                  <span className="block">{t.hero.line1}</span>
                  <span className="block">{t.hero.line2}</span>
                  <span className="block text-accent">{t.hero.line3}</span>
                </>
              )}
            </motion.h1>

            <motion.p
              className="mt-4 text-[15px] font-medium leading-6 text-white sm:mt-5 sm:text-lg sm:leading-8"
              initial={{ y: 18 }}
              animate={{ y: 0 }}
              transition={{ duration: 0.6, delay: 0.08, ease: "easeOut" }}
            >
              {heroSubtitle || t.hero.subtitle}
            </motion.p>

            {/* Glavni gumb samo od tableta naviše — na mobitelu se odmah lista do proizvoda. */}
            <motion.div
              className="mt-6 hidden sm:mt-8 sm:block"
              initial={{ y: 18 }}
              animate={{ y: 0 }}
              transition={{ duration: 0.6, delay: 0.16, ease: "easeOut" }}
            >
              <Link href="/dresovi" className="button-primary">
                {t.hero.cta}
              </Link>
            </motion.div>

            {/* PS5 traka — na mobitelu tek ispod glavnog gumba */}
            {ps5Slot ? <div className="mt-5 sm:hidden">{ps5Slot}</div> : null}

            {/* Stats row — desktop only */}
            <motion.div
              className="mt-8 hidden flex-wrap gap-x-6 gap-y-3 md:flex"
              initial={{ y: 18 }}
              animate={{ y: 0 }}
              transition={{ duration: 0.6, delay: 0.24, ease: "easeOut" }}
            >
              {[
                { value: "150+", label: t.hero.stats.jerseys },
                { value: t.hero.stats.priceValue, label: t.hero.stats.price },
                { value: "2–5", label: t.hero.stats.delivery },
              ].map((stat) => (
                <div key={stat.label} className="flex items-baseline gap-2">
                  <span className="font-heading text-2xl leading-none text-accent">{stat.value}</span>
                  <span className="text-sm text-white/50">{stat.label}</span>
                </div>
              ))}
            </motion.div>

          </div>

          {/* ── Right column — rotating kompleti promo ── */}
          {/* Bez ulazne animacije: poster je LCP slika i mora se iscrtati odmah,
              na konačnom mjestu (inače kasniji video postane "veći" LCP). */}
          <div className="relative">
            <HeroKompletiCarousel mysteryImage={mysteryImage} />
          </div>
        </div>

        {/* ── Ticker strip ── (bez opacity:0 na SSR-u; druga kopija je samo vizualna) */}
        <div className="relative mt-10 hidden overflow-hidden border-t border-white/10 pt-6 sm:block">
          <div
            className="flex gap-0 whitespace-nowrap"
            style={{
              animation: "tickerScroll 28s linear infinite",
            }}
          >
            {[...TICKER_ITEMS, ...TICKER_ITEMS].map((item, i) => {
              const dup = i >= TICKER_ITEMS.length;
              const cls = "inline-flex items-center gap-4 px-6 text-sm font-semibold uppercase tracking-[0.22em] text-white/25";
              const dot = <span aria-hidden className="h-1 w-1 rounded-full bg-accent/40" />;
              return item.href ? (
                <Link
                  key={i}
                  href={item.href}
                  aria-hidden={dup || undefined}
                  tabIndex={dup ? -1 : undefined}
                  className={`${cls} transition-colors hover:text-white/70`}
                >
                  {item.name}
                  {dot}
                </Link>
              ) : (
                <span key={i} aria-hidden={dup || undefined} className={cls}>
                  {item.name}
                  {dot}
                </span>
              );
            })}
          </div>
        </div>

      </div>
    </section>
  );
}
