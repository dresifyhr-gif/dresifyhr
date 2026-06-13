"use client";

import Image from "next/image";
import Link from "next/link";
import { motion } from "framer-motion";

import { useLanguage } from "@/contexts/language-context";

const TICKER_ITEMS = [
  "Real Madrid", "Barcelona", "PSG", "Bayern München", "Man United",
  "Atletico Madrid", "Dortmund", "Al-Nassr", "Inter Miami", "Santos",
  "Brazil", "Italija", "Mbappe", "Ronaldo", "Messi", "Bellingham",
  "Neymar", "Yamal", "Griezmann", "Musiala", "Raphinha", "Kvaratskhelia",
];

export function HeroSection() {
  const { t } = useLanguage();

  return (
    <section className="relative overflow-hidden bg-black">
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

      <div className="page-shell relative z-10 py-8 sm:py-10 lg:py-14">
        <div className="grid items-center gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(460px,580px)] lg:gap-12">

          {/* ── Left column ── */}
          <div className="order-2 max-w-[620px] lg:order-1">

            {/* Eyebrow badge */}
            <motion.div
              className="section-kicker mb-6"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.45, ease: "easeOut" }}
            >
              <span className="h-1.5 w-1.5 rounded-full bg-accent" />
              {t.hero.badge}
            </motion.div>

            <motion.h1
              className="font-heading text-[clamp(3.2rem,8.5vw,7.4rem)] uppercase leading-[0.84] tracking-[0.02em] text-white"
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, ease: "easeOut" }}
            >
              <span className="block">{t.hero.line1}</span>
              <span className="block">{t.hero.line2}</span>
              <span className="block text-accent">{t.hero.line3}</span>
            </motion.h1>

            <motion.p
              className="mt-5 text-base leading-7 text-white/60 sm:text-lg sm:leading-8"
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.08, ease: "easeOut" }}
            >
              {t.hero.subtitle}
            </motion.p>

            <motion.div
              className="mt-8"
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.16, ease: "easeOut" }}
            >
              <Link href="/dresovi" className="button-primary">
                {t.hero.cta}
              </Link>
            </motion.div>

            {/* Stats row — desktop only */}
            <motion.div
              className="mt-8 hidden flex-wrap gap-x-6 gap-y-3 md:flex"
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.24, ease: "easeOut" }}
            >
              {[
                { value: "100+", label: t.hero.stats.jerseys },
                { value: "20€", label: t.hero.stats.price },
                { value: "1–3", label: t.hero.stats.delivery },
              ].map((stat) => (
                <div key={stat.label} className="flex items-baseline gap-2">
                  <span className="font-heading text-2xl leading-none text-accent">{stat.value}</span>
                  <span className="text-sm text-white/50">{stat.label}</span>
                </div>
              ))}
            </motion.div>

            {/* Trust items — mobile only */}
            <motion.div
              className="mt-6 grid grid-cols-2 gap-3 md:hidden"
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.24, ease: "easeOut" }}
            >
              {[
                { icon: "🚚", label: t.hero.trust.delivery },
                { icon: "⚡", label: t.hero.trust.response },
                { icon: "↩️", label: t.hero.trust.returns },
                { icon: "📦", label: t.hero.trust.newWeekly },
              ].map((item) => (
                <div key={item.label} className="flex items-center gap-2 rounded-[6px] border border-white/8 bg-white/4 px-3 py-2.5">
                  <span className="text-base">{item.icon}</span>
                  <span className="text-[11px] font-medium leading-tight text-white/60">{item.label}</span>
                </div>
              ))}
            </motion.div>
          </div>

          {/* ── Right column — hero kit image ── */}
          <motion.div
            className="relative order-1 lg:order-2"
            initial={{ opacity: 0, x: 28 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.7, delay: 0.12, ease: "easeOut" }}
          >
            <div className="relative aspect-[3/2]">
              <Image
                src="/hero/hero-kitovi.jpg"
                alt="DRESIFY — nogometni kompleti"
                fill
                priority
                sizes="(max-width: 1024px) 100vw, 580px"
                className="object-contain"
              />
            </div>
          </motion.div>
        </div>

        {/* ── Ticker strip ── */}
        <motion.div
          className="relative mt-10 overflow-hidden border-t border-white/10 pt-6"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.4 }}
        >
          <div
            className="flex gap-0 whitespace-nowrap"
            style={{
              animation: "tickerScroll 28s linear infinite",
            }}
          >
            {[...TICKER_ITEMS, ...TICKER_ITEMS].map((name, i) => (
              <span
                key={i}
                className="inline-flex items-center gap-4 px-6 text-sm font-semibold uppercase tracking-[0.22em] text-white/25"
              >
                {name}
                <span className="h-1 w-1 rounded-full bg-accent/40" />
              </span>
            ))}
          </div>
        </motion.div>
      </div>
    </section>
  );
}
