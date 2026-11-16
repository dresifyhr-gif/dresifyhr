"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";

import { useShopSettings } from "@/contexts/shop-settings-context";

type Slide = { key: string; alt: string; src?: string; video?: string; videoMobile?: string; poster?: string; href: string; cta: string };

// Video se ne učitava odmah: prvo se iscrta samo poster (LCP), a video src se
// postavlja tek nakon window "load" + requestIdleCallback. Na mobitelu (<768px)
// ide manja verzija (540px, bez zvuka); uz "štednju podataka" ili 2G/3G ostaje poster.
type VideoMode = "pending" | "mobile" | "desktop" | "skip";

function whenIdleAfterLoad(cb: () => void) {
  let idleId: number | undefined;
  let timer: ReturnType<typeof setTimeout> | undefined;
  const go = () => {
    if ("requestIdleCallback" in window) idleId = window.requestIdleCallback(cb, { timeout: 2500 });
    else timer = setTimeout(cb, 300);
  };
  if (document.readyState === "complete") go();
  else window.addEventListener("load", go, { once: true });
  return () => {
    window.removeEventListener("load", go);
    if (idleId !== undefined && "cancelIdleCallback" in window) window.cancelIdleCallback(idleId);
    if (timer) clearTimeout(timer);
  };
}

// Video promo — prvi slide u rotaciji.
const VIDEO_SLIDE: Slide = {
  key: "video",
  alt: "Dresify — nogometni dresovi",
  video: "/hero/reklama-v4.mp4",
  videoMobile: "/hero/reklama-v4-mobile.mp4",
  poster: "/hero/reklama-v4-poster.jpg",
  href: "/dresovi",
  cta: "Pogledaj dresove →"
};

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

// Božićna tema: Mihaelova božićna reklama (kvadrat, bez zvuka) umjesto obične.
const XMAS_VIDEO_SLIDE: Slide = {
  key: "video-bozic",
  alt: "Dresify — božićna reklama",
  video: "/hero/reklama-bozic-v2.mp4",
  videoMobile: "/hero/reklama-bozic-v2-mobile.mp4",
  poster: "/hero/reklama-bozic-v2-poster.webp",
  href: "/slozi-mix",
  cta: "Složi svoj mix →"
};

// Božićna tema: slajd sa slikom (Postavke → Božićna tema).
const XMAS_SLIDE: Slide = {
  key: "bozic",
  alt: "Božićna kolekcija — dres, lopta i kapa, složi svoj mix",
  src: "/bozic/slajd.webp",
  href: "/slozi-mix",
  cta: "Složi svoj mix →"
};

const INTERVAL_MS = 4000;
// Video reklama traje ~21 s — slide ostaje do kraja videa (onEnded), a ovo je
// samo rezerva ako preglednik ne pusti video (npr. iPhone u štednji baterije).
const VIDEO_FALLBACK_MS = 23000;
const SWIPE_THRESHOLD = 45;

export function HeroKompletiCarousel({ mysteryImage }: { mysteryImage?: string }) {
  const { christmasOn } = useShopSettings();
  const SLIDES: Slide[] = useMemo(
    () => [
      // PS5 slajd je maknut: nagradnu igru već nosi PS5 traka (bez duplog "Sudjeluj").
      // Božić: prvo božićna reklama (15 s), odmah iza nje obična reklama (21 s), pa slika.
      ...(christmasOn ? [XMAS_VIDEO_SLIDE, VIDEO_SLIDE, XMAS_SLIDE] : [VIDEO_SLIDE]),
      ...(mysteryImage
        ? [{ key: "mystery", alt: "Mystery Box — nasumičan dres, iznenađenje", src: mysteryImage, href: "/dres/dresify-mystery-3-pack", cta: "Naruči Mystery Box →" } as Slide]
        : []),
      ...KOMPLET_SLIDES
    ],
    [mysteryImage, christmasOn]
  );
  const [index, setIndex] = useState(0);
  const pausedRef = useRef(false);
  const [videoMode, setVideoMode] = useState<VideoMode>("pending");

  useEffect(() => {
    type Conn = { saveData?: boolean; effectiveType?: string };
    const conn = (navigator as Navigator & { connection?: Conn }).connection;
    if (conn?.saveData || ["slow-2g", "2g", "3g"].includes(conn?.effectiveType ?? "")) {
      setVideoMode("skip");
      return;
    }
    return whenIdleAfterLoad(() =>
      setVideoMode(window.matchMedia("(max-width:767px)").matches ? "mobile" : "desktop")
    );
  }, []);

  const paginate = (dir: number) =>
    setIndex((current) => (current + dir + SLIDES.length) % SLIDES.length);

  const active = SLIDES[index];

  useEffect(() => {
    const timer = setTimeout(() => {
      if (!pausedRef.current) {
        setIndex((current) => (current + 1) % SLIDES.length);
      }
    }, active.video && videoMode !== "skip" ? VIDEO_FALLBACK_MS : active.key === "bozic" ? 8000 : INTERVAL_MS);
    return () => clearTimeout(timer);
  }, [index, active.video, SLIDES.length, videoMode]);

  const videoSrc =
    active.video && (videoMode === "mobile" || videoMode === "desktop")
      ? videoMode === "mobile" ? active.videoMobile ?? active.video : active.video
      : undefined;

  return (
    <div className="relative mx-auto max-w-[540px]">
      {/* U božićnoj temi video slajd već nosi "Složi svoj mix →", pa bez duplog natpisa. */}
      {christmasOn ? null : (
        <span className="section-kicker mb-3 inline-flex">
          <span className="h-1.5 w-1.5 rounded-full bg-accent" />
          Posebna ponuda — kompleti 40 €
        </span>
      )}

      <div className="relative overflow-hidden rounded-[14px] border border-white/10 bg-[#fbfbfb]">
        <div className="relative aspect-square">
          <AnimatePresence mode="wait" initial={false}>
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
              {active.video ? (
                <>
                  {/* Prvi kadar: samo poster (jedina slika koja se preloada na naslovnici). */}
                  <Image
                    src={active.poster as string}
                    alt={active.alt}
                    fill
                    priority
                    sizes="(max-width: 767px) 100vw, 540px"
                    draggable={false}
                    className="pointer-events-none select-none object-cover"
                  />
                  {videoSrc ? (
                    <video
                      key={videoSrc}
                      src={videoSrc}
                      // poster i na videu: ako preglednik ne pusti autoplay (npr. iPhone u
                      // štednji baterije), ostaje slika umjesto praznog okvira.
                      poster={active.poster}
                      autoPlay
                      muted
                      playsInline
                      preload="metadata"
                      onEnded={() => { if (!pausedRef.current) paginate(1); }}
                      draggable={false}
                      className="pointer-events-none absolute inset-0 h-full w-full select-none object-cover"
                    />
                  ) : null}
                </>
              ) : (
                <Image
                  src={active.src as string}
                  alt={active.alt}
                  fill
                  priority
                  sizes="540px"
                  draggable={false}
                  className="pointer-events-none object-contain select-none"
                />
              )}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>

      {/* Dots — točkica je mala, ::after daje veću površinu za prst */}
      <div className="mt-3 flex justify-center gap-2">
        {SLIDES.map((slide, i) => (
          <button
            key={slide.key}
            type="button"
            aria-label={`Slajd ${i + 1}`}
            onClick={() => { pausedRef.current = true; setIndex(i); }}
            className={`relative h-1.5 rounded-full transition-all duration-300 after:absolute after:-inset-x-1 after:-inset-y-3 after:content-[''] ${
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
