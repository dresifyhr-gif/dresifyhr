"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";

type Slide = { key: string; alt: string; src: string; href: string; cta: string };

const KOMPLET_SLIDES: Slide[] = [
  { key: "hrvatska-modric-komplet", alt: "Hrvatska Modrić komplet — dres, hlačice, lopta i kapa" },
  { key: "barcelona-yamal-komplet", alt: "Barcelona Yamal komplet — dres, hlačice, lopta i kapa" },
  { key: "real-mbappe-komplet", alt: "Real Madrid Mbappé komplet — dres, hlačice, lopta i kapa" },
  { key: "milan-modric-komplet", alt: "AC Milan Modrić komplet — dres, hlačice, lopta i kapa" },
  { key: "bayern-kane-komplet", alt: "Bayern Kane komplet — dres, hlačice, lopta i kapa" },
  { key: "intermiami-messi-komplet", alt: "Inter Miami Messi komplet — dres, hlačice, lopta i kapa" },
  { key: "njemacka-wirtz-komplet", alt: "Njemačka Wirtz komplet — dres, hlačice, lopta i kapa" },
  { key: "portugal-ronaldo-komplet", alt: "Portugal Ronaldo komplet — dres, hlačice, lopta i kapa" },
].map((s) => ({ ...s, src: `/dresovi/${s.key}/komplet.png`, href: "/kompleti", cta: "Pogledaj komplete →" }));

const PS5_SLIDE: Slide = {
  key: "ps5",
  alt: "Osvoji PS5 + EA SPORTS FC 27 — Dresify nagradna igra",
  src: "/ps5/hero.png",
  href: "/ps5",
  cta: "Sudjeluj u nagradnoj igri →"
};

const INTERVAL_MS = 4000;
const SWIPE_THRESHOLD = 45;

export function HeroKompletiCarousel({ mysteryImage }: { mysteryImage?: string }) {
  const SLIDES: Slide[] = [
    ...KOMPLET_SLIDES,
    PS5_SLIDE,
    ...(mysteryImage
      ? [{ key: "mystery", alt: "Mystery Box — nasumičan dres, iznenađenje", src: mysteryImage, href: "/dres/dresify-mystery-3-pack", cta: "Naruči Mystery Box →" } as Slide]
      : [])
  ];
  const [index, setIndex] = useState(0);
  const pausedRef = useRef(false);

  const paginate = (dir: number) =>
    setIndex((current) => (current + dir + SLIDES.length) % SLIDES.length);

  useEffect(() => {
    const timer = setInterval(() => {
      if (!pausedRef.current) {
        setIndex((current) => (current + 1) % SLIDES.length);
      }
    }, INTERVAL_MS);
    return () => clearInterval(timer);
  }, []);

  const active = SLIDES[index];

  return (
    <div className="relative mx-auto max-w-[540px]">
      <span className="section-kicker mb-3 inline-flex">
        <span className="h-1.5 w-1.5 rounded-full bg-accent" />
        Posebna ponuda — Kompleti 40€
      </span>

      <div className="relative overflow-hidden rounded-[14px] border border-white/10 bg-[#fbfbfb]">
        <div className="relative aspect-square">
          <AnimatePresence mode="wait">
            <motion.div
              key={active.key}
              className="absolute inset-0 cursor-grab active:cursor-grabbing"
              drag="x"
              dragConstraints={{ left: 0, right: 0 }}
              dragElastic={0.18}
              onDragStart={() => { pausedRef.current = true; }}
              onDragEnd={(_, info) => {
                if (info.offset.x < -SWIPE_THRESHOLD) paginate(1);
                else if (info.offset.x > SWIPE_THRESHOLD) paginate(-1);
              }}
              initial={{ opacity: 0, x: 24 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -24 }}
              transition={{ duration: 0.35, ease: "easeInOut" }}
            >
              <Image
                src={active.src}
                alt={active.alt}
                fill
                priority
                sizes="540px"
                draggable={false}
                className="pointer-events-none object-contain select-none"
              />
            </motion.div>
          </AnimatePresence>
        </div>
      </div>

      {/* Dots */}
      <div className="mt-3 flex justify-center gap-2">
        {SLIDES.map((slide, i) => (
          <button
            key={slide.key}
            type="button"
            aria-label={`Komplet ${i + 1}`}
            onClick={() => { pausedRef.current = true; setIndex(i); }}
            className={`h-1.5 rounded-full transition-all duration-300 ${
              i === index ? "w-6 bg-accent" : "w-1.5 bg-white/25 hover:bg-white/40"
            }`}
          />
        ))}
      </div>

      <Link
        href={active.href}
        className="mt-4 flex w-full items-center justify-center gap-2 rounded-[8px] border border-accent/40 bg-accent/10 py-2.5 text-sm font-semibold uppercase tracking-[0.16em] text-accent transition hover:bg-accent hover:text-black"
      >
        {active.cta}
      </Link>
    </div>
  );
}
