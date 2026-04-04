"use client";

import { useState } from "react";
import Image from "next/image";
import { motion } from "framer-motion";
import { Instagram } from "lucide-react";

import { SectionHeading } from "@/components/site/section-heading";
import { INSTAGRAM_HANDLE, INSTAGRAM_URL } from "@/lib/site";

const instagramPosts = [
  {
    src: "/hero/ronaldo-ili-messi.jpg",
    fallback: "/hero/jersey-split-3d.png",
    alt: "DRESIFY promo Ronaldo ili Messi",
    objectPosition: "center 18%"
  },
  {
    src: "/hero/dresify-boy.jpg",
    fallback: "/hero/jersey-nightwave-3d.png",
    alt: "DRESIFY promo dječak u dresu",
    objectPosition: "center 14%"
  },
  null,
  null,
  null,
  null
] as const;

function InstagramMediaTile({
  src,
  fallback,
  alt,
  objectPosition
}: {
  src: string;
  fallback: string;
  alt: string;
  objectPosition: string;
}) {
  const [currentSrc, setCurrentSrc] = useState(src);
  const [usingFallback, setUsingFallback] = useState(false);

  return (
    <div className="group relative aspect-square overflow-hidden border border-white/10 bg-[#111111]">
      <Image
        src={currentSrc}
        alt={alt}
        fill
        sizes="(min-width: 1024px) 20rem, (min-width: 640px) 18rem, 100vw"
        onError={() => {
          if (!usingFallback) {
            setCurrentSrc(fallback);
            setUsingFallback(true);
          }
        }}
        style={!usingFallback ? { objectPosition } : undefined}
        className={`transition duration-300 group-hover:scale-[1.03] ${
          usingFallback ? "object-contain p-8" : "object-cover"
        }`}
      />
      <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(5,5,5,0.02),rgba(5,5,5,0.12)_48%,rgba(5,5,5,0.56)_100%)]" />
      <div className="absolute left-4 top-4 border border-white/10 bg-[#0a0a0a] px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.28em] text-accent">
        {INSTAGRAM_HANDLE}
      </div>
    </div>
  );
}

function InstagramPlaceholderTile() {
  return (
    <div className="flex aspect-square items-center justify-center border border-white/10 bg-[#111111]">
      <Instagram className="h-9 w-9 text-accent" />
    </div>
  );
}

export function InstagramSection() {
  return (
    <section className="section-pad bg-[#111111]">
      <div className="page-shell">
        <SectionHeading
          kicker="Instagram"
          title={`Prati nas ${INSTAGRAM_HANDLE}`}
          description="Tamo prvi objavljujemo nove dropove, dostupne veličine i najtraženije retro komade."
        />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {instagramPosts.map((post, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.4 }}
              transition={{ delay: index * 0.06, duration: 0.3 }}
            >
              {post ? (
                <InstagramMediaTile
                  src={post.src}
                  fallback={post.fallback}
                  alt={post.alt}
                  objectPosition={post.objectPosition}
                />
              ) : (
                <InstagramPlaceholderTile />
              )}
            </motion.div>
          ))}
        </div>
        <a
          href={INSTAGRAM_URL}
          target="_blank"
          rel="noreferrer"
          className="button-secondary mt-8 px-6"
        >
          {`Otvori Instagram ${INSTAGRAM_HANDLE}`}
        </a>
      </div>
    </section>
  );
}
