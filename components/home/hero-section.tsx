"use client";

import Image from "next/image";
import Link from "next/link";
import { motion } from "framer-motion";

const TICKER_ITEMS = [
  "Real Madrid", "Barcelona", "PSG", "Bayern München", "Man United",
  "Atletico Madrid", "Dortmund", "Al-Nassr", "Inter Miami", "Santos",
  "Brazil", "Italija", "Mbappe", "Ronaldo", "Messi", "Bellingham",
  "Neymar", "Yamal", "Griezmann", "Musiala", "Raphinha", "Kvaratskhelia",
];

export function HeroSection() {
  return (
    <section className="relative overflow-hidden bg-[#0a0a0a]">
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
        <div className="grid items-center gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(520px,640px)] lg:gap-12">

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
              Novi katalog · 100+ dresova
            </motion.div>

            <motion.h1
              className="font-heading text-[clamp(3.2rem,8.5vw,7.4rem)] uppercase leading-[0.84] tracking-[0.02em] text-white"
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, ease: "easeOut" }}
            >
              <span className="block">DRESOVI.</span>
              <span className="block">KLUBOVI &amp; REPREZENTACIJE.</span>
              <span className="block text-accent">ZA DJECU I ODRASLE.</span>
            </motion.h1>

            <motion.p
              className="mt-5 text-base leading-7 text-white/60 sm:text-lg sm:leading-8"
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.08, ease: "easeOut" }}
            >
              Dostava po cijeloj Hrvatskoj • Plaćanje pouzećem
            </motion.p>

            <motion.div
              className="mt-8"
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.16, ease: "easeOut" }}
            >
              <Link href="/dresovi" className="button-primary">
                POGLEDAJ DRESOVE
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
                { value: "100+", label: "dresova" },
                { value: "20€", label: "fiksna cijena" },
                { value: "1–3", label: "dana dostava" },
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
                { icon: "🚚", label: "Dostava 1–3 dana" },
                { icon: "⚡", label: "Odgovor u sat vremena" },
                { icon: "↩️", label: "Jednostavan povrat" },
                { icon: "📦", label: "Novo svaki tjedan" },
              ].map((item) => (
                <div key={item.label} className="flex items-center gap-2 rounded-[6px] border border-white/8 bg-white/4 px-3 py-2.5">
                  <span className="text-base">{item.icon}</span>
                  <span className="text-[11px] font-medium leading-tight text-white/60">{item.label}</span>
                </div>
              ))}
            </motion.div>
          </div>

          {/* ── Right column — hero image ── */}
          <motion.div
            className="relative order-1 hidden lg:order-2 lg:block"
            initial={{ opacity: 0, x: 28 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.7, delay: 0.12, ease: "easeOut" }}
          >
            {/* Accent halo glow behind card */}
            <div className="pointer-events-none absolute -inset-6 rounded-[24px] bg-[radial-gradient(ellipse_75%_65%_at_50%_55%,rgba(232,255,60,0.14),transparent_68%)]" />

            {/* Decorative corner accent lines */}
            <div className="pointer-events-none absolute -left-2 -top-2 h-10 w-10 border-l-2 border-t-2 border-accent/50" />
            <div className="pointer-events-none absolute -bottom-2 -right-2 h-10 w-10 border-b-2 border-r-2 border-accent/50" />

            <div className="relative min-h-[280px] overflow-hidden rounded-[12px] border border-white/10 bg-[#111111] sm:min-h-[360px] lg:min-h-0">
              {/* Left gradient fade */}
              <div className="absolute inset-0 z-10 bg-[linear-gradient(90deg,rgba(10,10,10,0.52)_0%,rgba(10,10,10,0.12)_28%,rgba(10,10,10,0.06)_56%,rgba(10,10,10,0.26)_100%)]" />
              {/* Bottom vignette */}
              <div className="absolute inset-0 z-10 bg-[linear-gradient(180deg,rgba(10,10,10,0.04)_0%,rgba(10,10,10,0.36)_100%)]" />

              <Image
                src="/hero/tri-klinca.png"
                alt="DRESIFY hero kampanja"
                width={960}
                height={960}
                priority
                className="h-full w-full object-cover object-top"
              />

              {/* Watermark — top right */}
              <span className="pointer-events-none absolute right-4 top-4 z-20 select-none font-heading text-lg tracking-[0.18em] text-white/40">
                DRES<span className="text-accent/60">IFY</span>
              </span>
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
