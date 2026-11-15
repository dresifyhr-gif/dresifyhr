"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import Image from "next/image";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { Check, Heart, Plus, X } from "lucide-react";

import { JerseyVisual } from "@/components/site/jersey-visual";
import { useCart } from "@/components/providers/cart-provider";
import { useWishlist } from "@/components/providers/wishlist-provider";
import { type Jersey, getJerseyStock, getStockTone, getJerseySizeOptions } from "@/lib/data/jerseys";
import { getJerseyGallery } from "@/lib/data/jersey-media";
import { formatPrice, repairText } from "@/lib/utils";

/* ------------------------------------------------------------------ */
/*  Kartica proizvoda — smjer C "Vitrina".                             */
/*  Fotografija na toploj bijeloj plohi, tekst ispod u dva retka.      */
/*  Mobitel: "+" otvara donji list s veličinama (jedan dodir = dodano).*/
/*  Računalo: traka s veličinama izlazi kad je miš iznad kartice.      */
/* ------------------------------------------------------------------ */

type Theme = "jersey" | "streetwear" | "trenirka";

// useLayoutEffect bez upozorenja na serveru.
const useIsoLayoutEffect = typeof window !== "undefined" ? useLayoutEffect : useEffect;

// "Yamal nr10 — rozo/plavi" → naslov "Yamal nr10", varijanta "rozo/plavi".
function splitName(igrac: string) {
  const clean = repairText(igrac);
  const [title, ...rest] = clean.split(/\s+[—–]\s+/);
  return { title, variant: rest.join(" — ") };
}

// Je li stvarna pozadina iza kartice svijetla? (Streetwear/trenirke stranice su bijele,
// a iste kartice na naslovnici stoje na tamnoj pozadini.)
function sitsOnLightSurface(el: HTMLElement | null) {
  let node = el?.parentElement ?? null;
  while (node) {
    const bg = getComputedStyle(node).backgroundColor;
    const m = bg.match(/rgba?\(([\d.]+),\s*([\d.]+),\s*([\d.]+)(?:,\s*([\d.]+))?/);
    if (m && (m[4] === undefined || Number(m[4]) > 0.5)) {
      const lum = 0.2126 * Number(m[1]) + 0.7152 * Number(m[2]) + 0.0722 * Number(m[3]);
      return lum > 160;
    }
    node = node.parentElement;
  }
  return false;
}

export function ProductCard({ product, priority = false, theme = "jersey" }: { product: Jersey; priority?: boolean; theme?: Theme }) {
  const sw = theme === "streetwear"; // narančasti akcent
  const tr = theme === "trenirka"; // tirkizni akcent
  const themed = sw || tr;

  const { addItem } = useCart();
  const { has, toggle } = useWishlist();
  const liked = has(product.slug);

  // Svijetla stranica: tamni tekst. Pretpostavka za temu, provjera stvarne pozadine na klijentu.
  const rootRef = useRef<HTMLElement>(null);
  const [light, setLight] = useState(themed);
  useIsoLayoutEffect(() => {
    if (themed) setLight(sitsOnLightSurface(rootRef.current));
  }, [themed]);

  // Boje po temi (pune Tailwind klase, bez CSS varijabli).
  const c = {
    price: sw ? "text-orange-500" : tr ? "text-teal-600" : "text-accent",
    dot: sw ? "bg-orange-500" : tr ? "bg-teal-500" : "bg-accent",
    barAccent: sw ? "text-orange-400" : tr ? "text-teal-400" : "text-accent",
    barAdded: sw ? "bg-orange-500 text-white" : tr ? "bg-teal-500 text-white" : "bg-accent text-black",
    sizeActive: sw
      ? "active:border-orange-500 active:bg-orange-500 active:text-white"
      : tr
      ? "active:border-teal-600 active:bg-teal-600 active:text-white"
      : "active:border-accent active:bg-accent active:text-black",
    tile: light ? "bg-[#efeee9]" : "bg-[#f6f5f2]",
    title: light ? "text-[#0b0b0b]" : "text-white",
    meta: light ? "text-black/55" : "text-white/45",
    variant: light ? "text-black/40" : "text-white/30",
  };

  const stock = getJerseyStock(product);
  const sizeOptions = getJerseySizeOptions(product);
  const name = splitName(product.igrac);
  const club = repairText(product.klub);
  // Trenirke imaju generičko ime ("Komplet") — tada je klub naslov, a vrsta ide u drugi red.
  const generic = !name.title || /^komplet$/i.test(name.title.trim());
  const title = generic ? club : name.title;
  const metaMain = generic ? (product.category === "trenirka" ? "Trenirka" : name.title || club) : club;
  const isKomplet = product.liga === "Komplet";
  // Kompleti: "komplet (dres + hlačice + lopta + kapa)" → "komplet" (sadržaj već piše na plakatu).
  const variant = isKomplet ? name.variant.replace(/\s*\([^)]*\)/g, "").trim() : name.variant;

  // Najviše JEDNA oznaka po kartici.
  const badge: { label: string; promo: boolean } | null =
    product.badge === "bestseller" ? { label: "Bestseller", promo: true }
    : product.badge === "novo" ? { label: "Novo", promo: true }
    : product.retro ? { label: "Retro", promo: false }
    : product.category === "dugi-rukav" ? { label: "Dugi rukav", promo: false }
    : product.category === "trenirka" && !tr ? { label: "Trenirka", promo: false }
    : null;

  const firstAvailable = (arr: string[], segmentOut: boolean) =>
    segmentOut ? "" : (arr.find((s) => !sizeOptions.soldOutSizes.includes(s)) ?? "");
  const availAdult = firstAvailable(sizeOptions.adults, sizeOptions.adultsOutOfStock);
  const availKid = firstAvailable(sizeOptions.kids, sizeOptions.kidsOutOfStock);
  const defaultSegment: "adult" | "kid" =
    sizeOptions.hasAdults && availAdult ? "adult" : availKid ? "kid" : sizeOptions.hasAdults ? "adult" : "kid";
  // Rasprodano tek kad nijedna veličina nije dostupna (isto pravilo kao filter po veličini).
  const soldOut = !availAdult && !availKid;

  const [hovered, setHovered] = useState(false); // traka na računalu (miš)
  const [sheetOpen, setSheetOpen] = useState(false); // donji list na mobitelu
  const [sheetMounted, setSheetMounted] = useState(false);
  const [segment, setSegment] = useState<"adult" | "kid">(defaultSegment);
  const [added, setAdded] = useState<string | null>(null);
  const addedTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => { if (addedTimer.current) clearTimeout(addedTimer.current); }, []);

  useEffect(() => {
    if (!sheetOpen) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setSheetOpen(false); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [sheetOpen]);

  const currentSizes = segment === "adult" ? sizeOptions.adults : sizeOptions.kids;
  const segmentOut = segment === "adult" ? sizeOptions.adultsOutOfStock : sizeOptions.kidsOutOfStock;
  const segmentLabel = product.category === "trenirka" ? "Trenirka" : product.category === "streetwear" ? "Streetwear" : segment === "adult" || product.category === "dugi-rukav" ? "Dres" : "Dres i hlačice";
  const gallery = product.images ?? getJerseyGallery(product.slug);

  const stop = (e: React.SyntheticEvent) => { e.preventDefault(); e.stopPropagation(); };

  // Jedan dodir na veličinu = dodano u košaricu (isti payload kao dosad).
  const addSize = (e: React.MouseEvent, size: string) => {
    stop(e);
    addItem({
      slug: product.slug,
      klub: product.klub,
      igrac: product.igrac,
      size,
      segment,
      segmentLabel,
      imageSrc: gallery[0]?.src,
      price: product.price,
      category: product.category,
    });
    // Mobitel: list se odmah zatvara — potvrdu prikazuje postojeći prozor "Dodano u košaricu".
    setSheetOpen(false);
    setAdded(size);
    if (addedTimer.current) clearTimeout(addedTimer.current);
    addedTimer.current = setTimeout(() => { setAdded(null); setHovered(false); }, 1300);
  };

  const openSheet = (e: React.MouseEvent) => {
    stop(e);
    setSegment(defaultSegment);
    setSheetMounted(true);
    setSheetOpen(true);
  };

  const showBar = hovered && !soldOut;
  const hasBoth = sizeOptions.hasAdults && sizeOptions.hasKids;

  // Donji list: tamni na tamnim stranicama, bijeli na svijetlim.
  const s = light
    ? {
        panel: "border-black/[0.06] bg-white",
        grip: "bg-black/15",
        close: "text-black/50",
        title: "text-[#0b0b0b]",
        meta: "text-black/55",
        variant: "text-black/40",
        rule: "bg-black/[0.08]",
        hint: "text-black/45",
        note: "text-black/40",
        tabOn: "text-[#0b0b0b]",
        tabOff: "text-black/35 hover:text-black/60",
        tabLine: "bg-[#0b0b0b]",
        size: "border-black/[0.14] text-[#0b0b0b]",
        sizeOut: "border-black/[0.06] text-black/25",
        slash: "bg-black/25",
        stock: stock <= 2 ? "text-red-600" : stock <= 4 ? "text-orange-600" : c.price,
      }
    : {
        panel: "border-white/[0.08] bg-[#0e0e0e]",
        grip: "bg-white/15",
        close: "text-white/60",
        title: "text-white",
        meta: "text-white/45",
        variant: "text-white/30",
        rule: "bg-white/[0.08]",
        hint: "text-white/45",
        note: "text-white/35",
        tabOn: "text-white",
        tabOff: "text-white/35 hover:text-white/60",
        tabLine: "bg-white",
        size: "border-white/[0.12] text-white",
        sizeOut: "border-white/[0.05] text-white/20",
        slash: "bg-white/20",
        stock: themed && stock > 4 ? c.barAccent : getStockTone(stock),
      };
  // Zaliha u crnoj traci (računalo) — uvijek na tamnom.
  const barStock = themed && stock > 4 ? c.barAccent : getStockTone(stock);

  const segmentTabs = (size: "sm" | "lg") => (
    <div className={`flex items-center ${size === "lg" ? "gap-6" : "gap-3"}`}>
      {(["adult", "kid"] as const).map((seg) => (
        <button
          key={seg}
          type="button"
          tabIndex={size === "sm" && !showBar ? -1 : 0}
          onClick={(e) => { stop(e); setSegment(seg); }}
          aria-pressed={segment === seg}
          className={`relative text-[12px] font-medium uppercase tracking-[0.16em] transition ${size === "lg" ? "h-11" : "h-6"} ${
            size === "lg"
              ? segment === seg ? s.tabOn : s.tabOff
              : segment === seg ? "text-white" : "text-white/35 hover:text-white/60"
          }`}
        >
          {seg === "adult" ? "Odrasli" : "Djeca"}
          {size === "lg" && segment === seg && <span className={`absolute inset-x-0 bottom-2 h-px ${s.tabLine}`} />}
        </button>
      ))}
    </div>
  );

  return (
    <article
      ref={rootRef}
      className="relative min-w-0"
      onPointerEnter={(e) => { if (e.pointerType === "mouse") setHovered(true); }}
      onPointerLeave={(e) => { if (e.pointerType === "mouse") setHovered(false); }}
    >
      {/* Fotografija */}
      <div className="relative">
        <Link
          href={`/dres/${product.slug}`}
          aria-label={`${club} ${repairText(product.igrac)}`}
          className={`group block overflow-hidden rounded-[14px] ${c.tile}`}
        >
          {/* multiply + blagi brightness: gotovo-bijela pozadina fotke nestaje u toploj bijeloj plohi.
              Kompleti su gotovi plakati (1:1 i 5:4): cijela širina pločice, bez rezanja teksta na plakatu.
              Gornjih 40 px ostaje prazno za srce — inače bi sjelo točno na cijenu otisnutu na plakatu. */}
          <div
            className={`mix-blend-multiply transition-opacity duration-300 [&>div>span]:hidden [&_div]:!border-0 [&_div]:!bg-transparent [&_img]:brightness-[1.035] ${
              isKomplet ? "[&>div>div>div>div]:!max-h-full [&>div>div>div>div]:!max-w-full [&>div>div>div]:!px-0 [&>div>div>div]:!pb-0 [&>div>div>div]:!pt-10" : ""
            } ${soldOut ? "opacity-40" : ""}`}
          >
            <JerseyVisual product={product} priority={priority} />
          </div>
        </Link>

        {/* Srce — goli znak, 44 px dodirna površina */}
        <button
          type="button"
          aria-label={liked ? "Ukloni iz favorita" : "Dodaj u favorite"}
          aria-pressed={liked}
          title={liked ? "Ukloni iz favorita" : "Dodaj u favorite"}
          onClick={(e) => { stop(e); toggle({ slug: product.slug, klub: product.klub, igrac: product.igrac }); }}
          className="absolute right-[5px] top-[5px] z-20 inline-flex h-11 w-11 items-center justify-center text-black/70 transition hover:text-black"
        >
          <Heart strokeWidth={1.5} className={`h-[18px] w-[18px] transition ${liked ? "fill-black text-black" : ""}`} />
        </button>

        {/* Oznaka — dolje lijevo, centrirana s gumbom "+" */}
        {(soldOut || badge) && (
          <span
            className={`pointer-events-none absolute bottom-[15px] left-3 z-10 inline-flex h-6 items-center gap-1.5 rounded-full px-2.5 text-[10px] font-medium uppercase leading-none tracking-[0.14em] transition-opacity duration-200 ${
              soldOut ? "border border-black/15 bg-white/80 text-black/60" : "bg-[#0b0b0b] text-white"
            } ${showBar ? "opacity-0" : "opacity-100"}`}
          >
            {!soldOut && badge?.promo && <span className={`h-1 w-1 rounded-full ${c.dot}`} />}
            {soldOut ? "Rasprodano" : badge?.label}
          </span>
        )}

        {/* "+" — otvara donji list s veličinama (samo uređaji bez miša) */}
        {!soldOut && (
          <button
            type="button"
            onClick={openSheet}
            aria-label="Brzo dodaj u košaricu"
            aria-haspopup="dialog"
            className="absolute bottom-[5px] right-[5px] z-10 inline-flex h-11 w-11 items-center justify-center [@media(hover:hover)]:hidden"
          >
            <span className="inline-flex h-[34px] w-[34px] items-center justify-center rounded-full bg-[#0b0b0b] text-white transition active:scale-90">
              <Plus strokeWidth={1.75} className="h-4 w-4" />
            </span>
          </button>
        )}

        {/* Traka s veličinama — računalo, izlazi kad je miš iznad kartice */}
        {!soldOut && (
          <div className="pointer-events-none absolute -inset-px z-20 hidden overflow-hidden rounded-[15px] [@media(hover:hover)]:block">
            <div
              onClick={stop}
              aria-hidden={!showBar}
              className={`absolute inset-x-0 bottom-0 bg-[#0b0b0b] p-3 transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] ${
                showBar ? "pointer-events-auto translate-y-0" : "translate-y-full"
              }`}
            >
              <div className="mb-2 flex h-6 items-center justify-between gap-2">
                {added ? (
                  <span className={`flex items-center gap-1.5 text-[12px] font-medium uppercase tracking-[0.16em] ${c.barAccent}`}>
                    <Check strokeWidth={2} className="h-3.5 w-3.5" /> Dodano · {added}
                  </span>
                ) : hasBoth ? (
                  segmentTabs("sm")
                ) : (
                  <span className="text-[12px] font-medium uppercase tracking-[0.16em] text-white/45">Veličina</span>
                )}
                {!added && stock > 0 && <span className={`shrink-0 text-[12px] ${barStock}`}>Ostalo {stock} kom</span>}
              </div>
              <div className="flex gap-1">
                {currentSizes.map((size) => {
                  const oos = segmentOut || sizeOptions.soldOutSizes.includes(size);
                  return (
                    <button
                      key={size}
                      type="button"
                      disabled={oos}
                      tabIndex={showBar ? 0 : -1}
                      onClick={(e) => (oos ? stop(e) : addSize(e, size))}
                      title={oos ? "Nema na stanju" : `Dodaj veličinu ${size}`}
                      className={`h-9 min-w-0 flex-1 rounded-[8px] text-[12px] font-medium tabular-nums transition duration-150 ${
                        oos
                          ? "cursor-not-allowed text-white/25 line-through decoration-white/25"
                          : added === size
                          ? c.barAdded
                          : "bg-white/[0.07] text-white hover:bg-white hover:text-black"
                      }`}
                    >
                      {size}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Tekst ispod fotografije — dva retka */}
      <Link href={`/dres/${product.slug}`} tabIndex={-1} className="block px-1 pt-3">
        <h3 className={`truncate font-body text-[14px] font-medium normal-case leading-[1.25] tracking-normal sm:text-[15px] ${c.title}`}>
          {title}
        </h3>
        <div className="mt-1 flex items-baseline justify-between gap-3">
          <p className={`min-w-0 truncate text-[12px] leading-[1.3] ${c.meta}`}>
            {metaMain}
            {variant && <span className={c.variant}> · {variant}</span>}
          </p>
          <p className={`shrink-0 font-heading text-[18px] leading-none tracking-[0.04em] ${c.price}`}>
            {formatPrice(product.price)}
          </p>
        </div>
      </Link>

      {/* Donji list s veličinama (mobitel) — montira se tek na prvi dodir.
          z-[120]: iznad donje navigacije (z-40), chata (z-45) i prozora košarice (z-60). */}
      {sheetMounted &&
        createPortal(
          <AnimatePresence>
            {sheetOpen && (
              <motion.div
                key="sheet"
                className="fixed inset-0 z-[120]"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
              >
                <button type="button" aria-label="Zatvori" onClick={() => setSheetOpen(false)} className="absolute inset-0 touch-none bg-black/65" />
                <motion.div
                  role="dialog"
                  aria-modal="true"
                  aria-label="Odaberi veličinu"
                  initial={{ y: "100%" }}
                  animate={{ y: 0 }}
                  exit={{ y: "100%" }}
                  transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
                  className={`absolute inset-x-0 bottom-0 mx-auto max-w-[520px] touch-none rounded-t-[22px] border-t px-5 pb-[max(20px,env(safe-area-inset-bottom))] pt-2.5 ${s.panel}`}
                >
                  <div className={`mx-auto h-1 w-9 rounded-full ${s.grip}`} />
                  <button
                    type="button"
                    onClick={() => setSheetOpen(false)}
                    aria-label="Zatvori"
                    className={`absolute right-2 top-2 inline-flex h-11 w-11 items-center justify-center ${s.close}`}
                  >
                    <X strokeWidth={1.5} className="h-5 w-5" />
                  </button>

                  {/* Proizvod */}
                  <div className="mt-4 flex items-center gap-4 pr-10">
                    <div className={`relative h-[80px] w-[64px] shrink-0 overflow-hidden rounded-[10px] ${c.tile}`}>
                      {gallery[0] && (
                        <Image src={gallery[0].src} alt="" fill sizes="64px" className="object-contain mix-blend-multiply brightness-[1.035]" />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className={`truncate text-[15px] font-medium ${s.title}`}>{title}</p>
                      <p className={`mt-0.5 truncate text-[12px] ${s.meta}`}>
                        {metaMain}{variant && <span className={s.variant}> · {variant}</span>}
                      </p>
                      <p className={`mt-2 font-heading text-[20px] leading-none tracking-[0.04em] ${c.price}`}>{formatPrice(product.price)}</p>
                    </div>
                  </div>

                  <div className={`mt-5 h-px ${s.rule}`} />

                  {/* Odrasli / Djeca + zaliha */}
                  <div className="flex h-12 items-center justify-between gap-3">
                    {hasBoth ? (
                      segmentTabs("lg")
                    ) : (
                      <span className={`text-[12px] font-medium uppercase tracking-[0.16em] ${s.hint}`}>Odaberi veličinu</span>
                    )}
                    {stock > 0 && <span className={`shrink-0 text-[12px] ${s.stock}`}>Ostalo {stock} kom</span>}
                  </div>

                  <div className="grid grid-cols-5 gap-2">
                    {currentSizes.map((size) => {
                      const oos = segmentOut || sizeOptions.soldOutSizes.includes(size);
                      return (
                        <button
                          key={size}
                          type="button"
                          disabled={oos}
                          onClick={(e) => (oos ? stop(e) : addSize(e, size))}
                          aria-label={oos ? `${size}, nema na stanju` : `Dodaj veličinu ${size}`}
                          className={`relative h-12 rounded-[12px] border text-[15px] font-medium tabular-nums transition duration-150 ${
                            oos ? `cursor-not-allowed ${s.sizeOut}` : `${s.size} ${c.sizeActive}`
                          }`}
                        >
                          {size}
                          {oos && <span className={`absolute left-1/2 top-1/2 h-px w-6 -translate-x-1/2 -translate-y-1/2 -rotate-[30deg] ${s.slash}`} />}
                        </button>
                      );
                    })}
                  </div>

                  <p className={`mt-4 text-[12px] ${s.note}`}>
                    {segment === "kid" ? "Dječje veličine su visina u cm. " : ""}Dodir na veličinu odmah dodaje {product.category === "trenirka" ? "trenirku" : product.category === "streetwear" ? "komplet" : "dres"} u košaricu.
                  </p>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>,
          document.body
        )}
    </article>
  );
}
