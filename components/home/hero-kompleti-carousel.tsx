"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";

const SLIDES = [
  { slug: "hrvatska-modric-komplet", alt: "Hrvatska Modrić komplet — dres, hlačice, lopta i kapa" },
  { slug: "barcelona-yamal-komplet", alt: "Barcelona Yamal komplet — dres, hlačice, lopta i kapa" },
  { slug: "real-mbappe-komplet", alt: "Real Madrid Mbappé komplet — dres, hlačice, lopta i kapa" },
  { slug: "milan-modric-komplet", alt: "AC Milan Modrić komplet — dres, hlačice, lopta i kapa" },
  { slug: "bayern-kane-komplet", alt: "Bayern Kane komplet — dres, hlačice, lopta i kapa" },
  { slug: "intermiami-messi-komplet", alt: "Inter Miami Messi komplet — dres, hlačice, lopta i kapa" },
  { slug: "njemacka-wirtz-komplet", alt: "Njemačka Wirtz komplet — dres, hlačice, lopta i kapa" },
  { slug: "portugal-ronaldo-komplet", alt: "Portugal Ronaldo komplet — dres, hlačice, lopta i kapa" },
];

const INTERVAL_MS = 3500;

export function HeroKompletiCarousel() {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setIndex((current) => (current + 1) % SLIDES.length);
    }, INTERVAL_MS);
    return () => clearInterval(timer);
  }, []);

  const active = SLIDES[index];

  return (
    <div className="relative">
      <span className="section-kicker mb-3 inline-flex">
        <span className="h-1.5 w-1.5 rounded-full bg-accent" />
        Posebna ponuda — Kompleti 40€
      </span>

      <Link
        href="/kompleti"
        className="group relative block overflow-hidden rounded-[14px] border border-white/10 bg-[#fbfbfb]"
        aria-label="Pogledaj komplete"
      >
        <div className="relative aspect-square">
          <AnimatePresence mode="wait">
            <motion.div
              key={active.slug}
              className="absolute inset-0"
              initial={{ opacity: 0, scale: 1.02 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.99 }}
              transition={{ duration: 0.5, ease: "easeInOut" }}
            >
              <Image
                src={`/dresovi/${active.slug}/komplet.png`}
                alt={active.alt}
                fill
                priority
                sizes="(max-width: 1024px) 100vw, 580px"
                className="object-contain"
              />
            </motion.div>
          </AnimatePresence>
        </div>
      </Link>

      {/* Dots */}
      <div className="mt-4 flex justify-center gap-2">
        {SLIDES.map((slide, i) => (
          <button
            key={slide.slug}
            type="button"
            aria-label={`Komplet ${i + 1}`}
            onClick={() => setIndex(i)}
            className={`h-1.5 rounded-full transition-all duration-300 ${
              i === index ? "w-6 bg-accent" : "w-1.5 bg-white/25 hover:bg-white/40"
            }`}
          />
        ))}
      </div>
    </div>
  );
}
