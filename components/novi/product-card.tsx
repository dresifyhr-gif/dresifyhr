"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Check, Heart, Plus, X } from "lucide-react";

import { productImageAlt } from "@/components/site/jersey-visual";
import { HangerThumb } from "@/components/site/hanger-thumb";
import { useCart } from "@/components/providers/cart-provider";
import { useHangerCardVariant, useHangerCards } from "@/components/providers/hanger-cards-context";
import { hangerImage, prefetchHanger3D } from "@/components/product/hanger-preload";
import { firstHangerSrc, intentAllowed, observeCardForPrefetch, queueViewportPrefetch } from "@/components/site/hanger-prefetch";
import { useWishlist } from "@/components/providers/wishlist-provider";
import { type Jersey, getJerseyStock, getStockTone, getJerseySizeOptions } from "@/lib/data/jerseys";
import { getJerseyGallery } from "@/lib/data/jersey-media";
import { hangerThumbSrc } from "@/lib/hanger-thumb";
import { formatPrice, repairText } from "@/lib/utils";
import { IconButton, Segmented, Sheet, SizeTile, eur } from "@/components/ui/premium";

/* ------------------------------------------------------------------ */
/*  Kartica proizvoda — smjer C "Vitrina".                             */
/*  Slika na vješalici na tamnoj plohi, tekst ispod u dva retka.       */
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
    title: light ? "text-[#0b0b0b]" : "text-white",
    // AA kontrast (≥4.5:1) i za sitni tekst; hijerarhija naslov > meta > varijanta ostaje.
    meta: light ? "text-black/65" : "text-white/[0.58]",
    variant: light ? "text-black/[0.56]" : "text-white/[0.47]",
    // Cijena u (uvijek tamnom) listu veličina — svjetliji ton teme radi kontrasta.
    sheetPrice: sw ? "text-orange-400" : "text-teal-400",
  };

  // Kartica "na vješalici" — samo unutar HangerCardsProvider (demo stranice); inače nepromijenjeno.
  const hangerCards = useHangerCards();
  // Izgled "ime" (kao reklama): i proizvodi bez slike na vješalici dobiju isti zid + šipku
  // ("Fotografija uskoro") — nikad siva/bijela fotografija u istom gridu. Pravi kompleti
  // (dres + hlačice + lopta + kapa, složena slika) ostaju svoji; trenirke s ligom "Komplet"
  // u izgledu "ime" idu na vješalicu kao ostale trenirke.
  const ime = useHangerCardVariant() === "ime" && Boolean(hangerCards);
  const kompletSet = product.liga === "Komplet" && product.category !== "trenirka";
  const hangerImages = product.liga !== "Komplet" || (ime && !kompletSet) ? hangerCards?.get(product.slug) : undefined;
  const HangerArt = hangerImages || (ime && !kompletSet) ? hangerCards?.Art : undefined;
  const onHanger = Boolean(HangerArt);
  // 3D vješalica stranice proizvoda: prva slika u red kad je kartica u kadru (niski prioritet,
  // ograničeno), chunk + slika odmah na namjeru (hover mišem / dodir).
  const prefetchSrc = firstHangerSrc(hangerImages);
  const intentDone = useRef(false);
  const onIntent = () => {
    if (!prefetchSrc || intentDone.current || !intentAllowed()) return;
    intentDone.current = true;
    prefetchHanger3D([prefetchSrc]);
  };
  useEffect(() => {
    const el = rootRef.current;
    if (!el || !prefetchSrc) return;
    return observeCardForPrefetch(el, () => queueViewportPrefetch(prefetchSrc, hangerImage));
  }, [prefetchSrc]);

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

  const closeSheet = () => setSheetOpen(false);

  const currentSizes = segment === "adult" ? sizeOptions.adults : sizeOptions.kids;
  const segmentOut = segment === "adult" ? sizeOptions.adultsOutOfStock : sizeOptions.kidsOutOfStock;
  const segmentLabel = product.category === "trenirka" ? "Trenirka" : product.category === "streetwear" ? "Streetwear" : segment === "adult" || product.category === "dugi-rukav" ? "Dres" : "Dres i hlačice";
  const gallery = product.images ?? getJerseyGallery(product.slug);
  // Sličica: vješalica (dres/trenirka) ili složena slika kompleta; stara fotografija samo ako nema ničega.
  const hangerSrc = hangerThumbSrc(product.slug);
  const thumbSrc = hangerSrc ?? gallery[0]?.src;

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
      imageSrc: thumbSrc,
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

  // "20 €" (nbsp) — samo stvarna cijena iz podataka.
  const priceLabel = product.price != null ? eur(product.price) : formatPrice(product.price);
  // Raspon veličina za drugi redak segmenta ("S–XXL", "116–176").
  const sizeRange = (arr: string[]) => (arr.length > 1 ? `${arr[0]}–${arr[arr.length - 1]}` : arr[0] ?? "");
  const sheetStock = themed && stock > 4 ? c.sheetPrice : getStockTone(stock);
  // Zaliha u crnoj traci (računalo) — uvijek na tamnom.
  const barStock = themed && stock > 4 ? c.barAccent : getStockTone(stock);

  // Odrasli / Djeca u traci na računalu (mala, tekstualna).
  const segmentTabs = () => (
    <div className="flex items-center gap-3">
      {(["adult", "kid"] as const).map((seg) => (
        <button
          key={seg}
          type="button"
          tabIndex={showBar ? 0 : -1}
          onClick={(e) => { stop(e); setSegment(seg); }}
          aria-pressed={segment === seg}
          className={`relative h-6 text-[11px] font-semibold uppercase tracking-[0.16em] transition-colors ${
            segment === seg ? "text-white" : "text-white/40 hover:text-white/70"
          }`}
        >
          {seg === "adult" ? "Odrasli" : "Djeca"}
          {segment === seg && <span aria-hidden className="absolute inset-x-0 bottom-0 h-[2px] rounded-full bg-[#e8ff3c] shadow-[0_0_8px_rgba(232,255,60,0.6)]" />}
        </button>
      ))}
    </div>
  );

  return (
    <article
      ref={rootRef}
      className="relative min-w-0"
      onPointerEnter={(e) => { if (e.pointerType === "mouse") { setHovered(true); onIntent(); } }}
      onTouchStart={onIntent}
      onPointerLeave={(e) => { if (e.pointerType === "mouse") setHovered(false); }}
    >
      {/* Fotografija */}
      <div className="relative">
        <Link
          href={`/dres/${product.slug}`}
          aria-label={`${club} ${repairText(product.igrac)}`}
          className={`group relative block overflow-hidden rounded-[14px] transition-transform duration-200 ease-out active:scale-[0.985] [-webkit-tap-highlight-color:transparent] ${
            "bg-[#0c0c0c] shadow-[inset_0_0_0_1px_rgba(255,255,255,0.07),inset_0_1px_0_rgba(255,255,255,0.06),0_18px_40px_-24px_rgba(0,0,0,0.9)]"
          }`}
        >
          {HangerArt ? (
            <HangerArt
              images={hangerImages}
              active={hovered}
              label={`${club} ${repairText(product.igrac)}`}
              priority={priority}
              dim={soldOut}
              product={product}
            />
          ) : (
            /* Kompleti (složena slika na vješalici) i proizvodi bez vješalice — tamna ploha, nikad bijela.
               Gornjih 40 px ostaje prazno za srce. */
            <div className={`${kompletSet ? "" : "hc-fallback "}relative aspect-[4/5] bg-[radial-gradient(ellipse_80%_55%_at_50%_0%,rgba(255,255,255,0.05),rgba(255,255,255,0)_70%),linear-gradient(180deg,#141414,#0a0a0a)]`}>
              {thumbSrc ? (
                <Image
                  src={thumbSrc}
                  alt={productImageAlt(product, hangerSrc ? "na vješalici" : gallery[0]?.altLabel)}
                  fill
                  priority={priority}
                  sizes="(max-width: 768px) 50vw, 25vw"
                  className={`object-contain px-[6%] pb-[5%] pt-10 drop-shadow-[0_10px_14px_rgba(0,0,0,0.5)] transition-[opacity,transform] duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] [@media(hover:hover)]:group-hover:scale-[1.035] ${soldOut ? "opacity-40" : ""}`}
                />
              ) : (
                <div className="flex h-full items-center justify-center font-heading text-[13px] tracking-[0.22em] text-white/30">DRESIFY</div>
              )}
            </div>
          )}
        </Link>

        {/* Srce — goli znak, 44 px dodirna površina */}
        <button
          type="button"
          aria-label={liked ? "Ukloni iz favorita" : "Dodaj u favorite"}
          aria-pressed={liked}
          title={liked ? "Ukloni iz favorita" : "Dodaj u favorite"}
          onClick={(e) => { stop(e); toggle({ slug: product.slug, klub: product.klub, igrac: product.igrac }); }}
          style={onHanger && (ime ? hangerCards?.heartTopIme : hangerCards?.heartTop) ? { top: ime ? hangerCards?.heartTopIme : hangerCards?.heartTop } : undefined}
          className={`hc-heart absolute right-[5px] top-[5px] z-20 inline-flex h-11 w-11 items-center justify-center transition ${
            "text-white/70 hover:text-white"
          }`}
        >
          <Heart
            strokeWidth={1.5}
            className={`h-[18px] w-[18px] transition ${liked ? "fill-accent text-accent" : ""}`}
          />
        </button>

        {/* Oznaka — dolje lijevo, centrirana s gumbom "+" */}
        {/* Izgled "ime": oznaka ide u redak teksta ispod kartice — slika ostaje čista kao u reklami. */}
        {!ime && (soldOut || badge) && (
          <span
            className={`hc-pill pointer-events-none absolute bottom-[15px] left-3 z-10 inline-flex h-6 items-center gap-1.5 rounded-full px-2.5 text-[10px] font-medium uppercase leading-none tracking-[0.14em] transition-opacity duration-200 ${
              soldOut
                ? "border border-white/15 bg-white/[0.06] text-white/60"
                : "border border-white/[0.12] bg-[linear-gradient(180deg,rgba(255,255,255,0.11),rgba(255,255,255,0.035))] text-white/90 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]"
            } ${showBar ? "opacity-0" : "opacity-100"}`}
          >
            {!soldOut && badge?.promo && (
              <span className={`h-1.5 w-1.5 rounded-full ${c.dot} ${themed ? "" : "shadow-[0_0_6px_rgba(232,255,60,0.7)]"}`} />
            )}
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
            className="group/plus absolute bottom-[5px] right-[5px] z-10 inline-flex h-11 w-11 items-center justify-center [-webkit-tap-highlight-color:transparent] [@media(hover:hover)]:hidden"
          >
            <span
              className={`relative inline-flex items-center justify-center rounded-full transition-transform duration-150 ease-out group-active/plus:scale-90 ${
                ime
                  ? "h-[28px] w-[28px] border border-white/[0.1] bg-black/25 text-white/75"
                  : "hc-plus-old h-[34px] w-[34px] border border-white/[0.14] bg-[linear-gradient(180deg,rgba(255,255,255,0.16),rgba(255,255,255,0.05))] text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.12),0_6px_14px_-6px_rgba(0,0,0,0.8)]"
              }`}
            >
              {/* neonski prsten pri pritisku (samo opacity) */}
              <span aria-hidden className="pointer-events-none absolute -inset-[3px] rounded-full shadow-[0_0_0_2px_rgba(232,255,60,0.75),0_0_14px_rgba(232,255,60,0.45)] opacity-0 transition-opacity duration-150 group-active/plus:opacity-100" />
              <Plus strokeWidth={2} className={ime ? "h-3.5 w-3.5" : "h-4 w-4"} />
            </span>
          </button>
        )}

        {/* Traka s veličinama — računalo, izlazi kad je miš iznad kartice */}
        {!soldOut && (
          <div className="pointer-events-none absolute -inset-px z-20 hidden overflow-hidden rounded-[15px] [@media(hover:hover)]:block">
            <div
              onClick={stop}
              aria-hidden={!showBar}
              className={`absolute inset-x-0 bottom-0 bg-[linear-gradient(180deg,rgba(24,24,24,0.97),rgba(10,10,10,0.98))] p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.08),0_-12px_30px_-12px_rgba(0,0,0,0.5)] transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] ${
                showBar ? "pointer-events-auto translate-y-0" : "translate-y-full"
              }`}
            >
              <div className="mb-2 flex h-6 items-center justify-between gap-2">
                {added ? (
                  <span className={`flex items-center gap-1.5 text-[12px] font-medium uppercase tracking-[0.16em] ${c.barAccent}`}>
                    <Check strokeWidth={2} className="h-3.5 w-3.5" /> Dodano · {added}
                  </span>
                ) : hasBoth ? (
                  segmentTabs()
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
                      className={`h-9 min-w-0 flex-1 rounded-[10px] text-[12px] font-medium tabular-nums transition-[transform,background-color,color] duration-150 active:scale-95 ${
                        oos
                          ? "cursor-not-allowed text-white/25 line-through decoration-white/25"
                          : added === size
                          ? `${c.barAdded} ${themed ? "" : "shadow-[0_8px_20px_-8px_rgba(232,255,60,0.6)]"}`
                          : "border border-white/[0.08] bg-white/[0.06] text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] hover:border-white hover:bg-white hover:text-black"
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
        {ime && (soldOut || badge) ? (
          <div className="flex items-center gap-2">
            <h3 className={`min-w-0 truncate font-body text-[14px] font-medium normal-case leading-[1.25] tracking-normal sm:text-[15px] ${c.title}`}>
              {title}
            </h3>
            <span className={`shrink-0 text-[9.5px] font-semibold uppercase leading-none tracking-[0.14em] ${soldOut ? "text-white/45" : badge?.promo ? "text-[#e8ff3c]/85" : "text-white/55"}`}>
              {soldOut ? "Rasprodano" : badge?.label}
            </span>
          </div>
        ) : (
          <h3 className={`truncate font-body text-[14px] font-medium normal-case leading-[1.25] tracking-normal sm:text-[15px] ${c.title}`}>
            {title}
          </h3>
        )}
        <div className="mt-1 flex items-baseline justify-between gap-3">
          <p className={`min-w-0 truncate text-[12px] leading-[1.3] ${c.meta}`}>
            {metaMain}
            {variant && <span className={c.variant}> · {variant}</span>}
          </p>
          <p className={`shrink-0 font-heading text-[18px] leading-none tracking-[0.04em] tabular-nums ${c.price}`}>
            {priceLabel}
          </p>
        </div>
      </Link>

      {/* Donji list s veličinama (mobitel) — FLOODLIGHT Sheet (matirani zaslon, lažno staklo).
          Montira se tek na prvi dodir na "+" (24+ kartica = ne 24 lista u DOM-u). */}
      {sheetMounted && (
        <Sheet open={sheetOpen} onClose={closeSheet} label={`Odaberi veličinu — ${title}`} side="bottom">
          <div className="px-5 pb-5">
            {/* Proizvod */}
            <div className="flex items-center gap-4">
              <HangerThumb src={thumbSrc} sizes="68px" className="h-[84px] w-[68px]" imgClassName="p-1.5" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-[16px] font-semibold leading-tight text-white">{title}</p>
                <p className="mt-1 truncate text-[12.5px] text-white/50">
                  {metaMain}
                  {variant && <span className="text-white/[0.47]"> · {variant}</span>}
                </p>
                <p className={`mt-2 font-heading text-[24px] leading-none tracking-[0.04em] tabular-nums ${themed ? c.sheetPrice : "text-[#e8ff3c] [text-shadow:0_0_18px_rgba(232,255,60,0.35)]"}`}>
                  {priceLabel}
                </p>
              </div>
              <IconButton label="Zatvori" size="sm" onClick={closeSheet} className="-mr-1 self-start">
                <X strokeWidth={1.75} className="h-[18px] w-[18px]" />
              </IconButton>
            </div>

            <div aria-hidden className="fl-hairline mt-5" />

            {/* Odrasli / Djeca (iOS segmentirana kontrola, raspon veličina u drugom retku) */}
            {hasBoth && (
              <Segmented
                className="mt-5"
                label="Odrasli ili djeca"
                value={segment}
                onChange={setSegment}
                options={[
                  { value: "adult", label: "Odrasli", sub: sizeRange(sizeOptions.adults), disabled: !availAdult },
                  { value: "kid", label: "Djeca", sub: sizeRange(sizeOptions.kids), disabled: !availKid },
                ]}
              />
            )}

            <div className="mb-3 mt-5 flex items-center justify-between gap-3">
              <span className="text-[12px] font-semibold uppercase tracking-[0.16em] text-white/55">
                {segment === "kid" && hasBoth ? "Visina (cm)" : "Odaberi veličinu"}
              </span>
              {stock > 0 && (
                <span className={`inline-flex items-center gap-1.5 text-[12px] ${sheetStock}`}>
                  <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-current opacity-80" />
                  Ostalo {stock} kom
                </span>
              )}
            </div>

            <div role="group" aria-label="Veličine" className="grid grid-cols-5 gap-2">
              {currentSizes.map((size) => {
                const oos = segmentOut || sizeOptions.soldOutSizes.includes(size);
                return (
                  <SizeTile
                    key={size}
                    soldOut={oos}
                    selected={!themed && added === size}
                    onClick={(e) => (oos ? stop(e) : addSize(e, size))}
                    aria-label={oos ? undefined : `Dodaj veličinu ${size}`}
                    className={`w-full tabular-nums ${themed && added === size ? c.barAdded : ""}`}
                  >
                    {size}
                  </SizeTile>
                );
              })}
            </div>

            <p className="mt-4 flex items-start gap-2 text-[12.5px] leading-snug text-white/45">
              <span aria-hidden className={`mt-[5px] h-1.5 w-1.5 shrink-0 rounded-full ${themed ? c.dot : "bg-[#e8ff3c] shadow-[0_0_8px_rgba(232,255,60,0.6)]"}`} />
              <span>
                {segment === "kid" ? "Dječje veličine su visina u cm. " : ""}Dodir na veličinu odmah dodaje{" "}
                {product.category === "trenirka" ? "trenirku" : product.category === "streetwear" ? "komplet" : "dres"} u košaricu.
              </span>
            </p>
          </div>
        </Sheet>
      )}
    </article>
  );
}
