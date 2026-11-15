"use client";

import { useEffect, useRef, useState } from "react";
import { Truck, RotateCcw, MessageCircle, Zap } from "lucide-react";

import { useCart } from "@/components/providers/cart-provider";
import { useLanguage } from "@/contexts/language-context";
import { StickyAddToCart } from "@/components/product/sticky-add-to-cart";
import { SizeGuide } from "@/components/product/size-guide";
import { MixPicker } from "@/components/product/mix-picker";
import { Stars } from "@/components/site/stars";
import { fbTrack } from "@/lib/fbpixel";
import { getJerseyGallery } from "@/lib/data/jersey-media";
import {
  getJerseySizeOptions,
  getJerseyStock,
  getStockTone,
  type Jersey
} from "@/lib/data/jerseys";
import { MIX_ADDON_PRICE_EUR, addonCount, addonsText, type MixAddons } from "@/lib/mix";
import { PAYMENT_METHOD_LABEL, SHIPPING_PRICE_LABEL } from "@/lib/site";
import { createWhatsAppUrl, repairText } from "@/lib/utils";

type ProductDetailPanelProps = {
  product: Jersey;
};

export function ProductDetailPanel({ product }: ProductDetailPanelProps) {
  const { t, locale } = useLanguage();
  const sizeOptions = getJerseySizeOptions(product);
  const gallery = product.images ?? getJerseyGallery(product.slug);
  const frontImage = gallery[0]?.src;
  const stock = getJerseyStock(product);
  const { addItem } = useCart();
  const mainButtonRef = useRef<HTMLButtonElement>(null);
  const sizeBoxRef = useRef<HTMLDivElement>(null);
  const segmentRef = useRef<HTMLDivElement>(null);
  const flashTimer = useRef<number | undefined>(undefined);
  const [sizeFlash, setSizeFlash] = useState(false);
  // Odabrani mix (lopta/kapa) živi ovdje — glavni gumb i sticky traka ga dodaju
  // zajedno s dresom, pa se dodatak ne može "izgubiti" na drugom gumbu.
  const [addons, setAddons] = useState<MixAddons>({});
  const firstAvailable = (arr: string[], segmentOut: boolean) =>
    segmentOut ? "" : (arr.find((s) => !sizeOptions.soldOutSizes.includes(s)) ?? "");
  const defaultAdultSize = firstAvailable(sizeOptions.adults, sizeOptions.adultsOutOfStock);
  const defaultKidSize = firstAvailable(sizeOptions.kids, sizeOptions.kidsOutOfStock);
  const defaultSegment: "adult" | "kid" =
    sizeOptions.hasAdults && defaultAdultSize ? "adult" : defaultKidSize ? "kid" : sizeOptions.hasAdults ? "adult" : "kid";
  const [segment, setSegment] = useState<"adult" | "kid">(defaultSegment);
  // Bez predodabira veličine — kupac mora svjesno odabrati (gumb je disabled dok
  // ne odabere). Auto-odabir najmanje dostupne veličine ('S') vodio je u krive
  // narudžbe → skupe zamjene (a politika je samo zamjena veličine).
  const [selectedSize, setSelectedSize] = useState("");

  // Kod promjene proizvoda biraj segment u kojem STVARNO ima veličina. Prije je
  // ovdje bilo `hasAdults ? "adult" : "kid"` bez obzira na zalihu, pa je kod
  // proizvoda s rasprodanim odraslim veličinama ostajao prazan odabir — a gumb
  // ga je svejedno puštao u košaricu (33 od 403 artikla je stiglo bez veličine).
  useEffect(() => {
    const nextSegment: "adult" | "kid" =
      sizeOptions.hasAdults && defaultAdultSize ? "adult" : defaultKidSize ? "kid" : sizeOptions.hasAdults ? "adult" : "kid";
    setSegment(nextSegment);
    setSelectedSize(""); // bez predodabira — kupac bira svjesno; ne vuče se ni veličina prethodnog proizvoda
  }, [product.slug, sizeOptions.hasAdults, defaultAdultSize, defaultKidSize]);

  useEffect(() => {
    setAddons({});
  }, [product.slug]);

  useEffect(() => () => window.clearTimeout(flashTimer.current), []);

  useEffect(() => {
    fbTrack("ViewContent", {
      content_ids: [product.slug],
      content_type: "product",
      content_name: `${repairText(product.klub)} ${repairText(product.igrac)}`,
      value: product.price ?? 20,
      currency: "EUR"
    });
  }, [product.slug, product.klub, product.igrac, product.price]);

  const currentSizes = segment === "adult" ? sizeOptions.adults : sizeOptions.kids;
  // Prikazujemo SAMO dostupne veličine (rasprodane se sakriju). Ako u ovom
  // segmentu nema nijedne dostupne → "Rasprodano".
  const segmentOut = (segment === "adult" && sizeOptions.adultsOutOfStock) || (segment === "kid" && sizeOptions.kidsOutOfStock);
  const availableSizes = segmentOut ? [] : currentSizes.filter((size) => !sizeOptions.soldOutSizes.includes(size));
  // Dugi rukav = samo gornji dio (bez hlačica) — i dječje veličine pišu samo "Dres".
  const isLongSleeve = product.category === "dugi-rukav";
  const segmentLabel = product.category === "trenirka" ? "Trenirka" : product.category === "streetwear" ? "Streetwear" : segment === "adult" || isLongSleeve ? t.product.segmentAdult : t.product.segmentKid;
  const productPrice = product.price ?? 20;
  const whatsappMessage = `Pozdrav, želim naručiti: ${repairText(product.klub)} ${repairText(
    product.igrac
  )}${selectedSize ? `, veličina: ${selectedSize}` : ""}. Cijena: ${productPrice}€.`;
  const whatsappUrl = createWhatsAppUrl(whatsappMessage);

  // "Jedna veličina" (npr. dio streetweara) nema izbornik pa ni ne treba odabir.
  const hasSizePicker = sizeOptions.adults.length > 0 || sizeOptions.kids.length > 0;
  const allSoldOut = hasSizePicker && !defaultAdultSize && !defaultKidSize;
  const needsSize = hasSizePicker && !selectedSize;

  const handleSegmentChange = (nextSegment: "adult" | "kid") => {
    setSegment(nextSegment);
    setSelectedSize(""); // promjena Odrasli/Djeca — očisti odabir, veličine se razlikuju
  };

  const addonsN = addonCount(addons);
  const total = productPrice + addonsN * MIX_ADDON_PRICE_EUR;

  // Klik na neaktivan gumb: odvedi kupca do veličina i kratko ih istakni.
  const promptSize = () => {
    // Ako je odabrani segment (npr. Odrasli) rasprodan, nema popisa veličina —
    // tada vodi na prekidač Odrasli/Djeca.
    (sizeBoxRef.current ?? segmentRef.current)?.scrollIntoView({ behavior: "smooth", block: "center" });
    setSizeFlash(true);
    window.clearTimeout(flashTimer.current);
    flashTimer.current = window.setTimeout(() => setSizeFlash(false), 1200);
  };

  // JEDINI put dodavanja na stranici dresa (glavni gumb + sticky traka).
  // S mixom: isti oblik stavke kao u MixPickeru (server ionako sam preračuna dodatke).
  const handleAdd = () => {
    if (allSoldOut) return;
    if (needsSize) return promptSize(); // pojas i tregeri — bez veličine ne ide u košaricu
    const base = {
      slug: product.slug,
      klub: repairText(product.klub),
      igrac: repairText(product.igrac),
      size: selectedSize,
      segment,
      imageSrc: frontImage,
      category: product.category
    };
    if (addonsN > 0) {
      addItem({ ...base, segmentLabel: `${segmentLabel}${addonsText(addons)}`, price: total, addons: { ...addons } });
    } else {
      addItem({ ...base, segmentLabel, price: product.price });
    }
    setAddons({});
  };

  return (
    <div className="min-w-0 border border-white/10 bg-[#111111] p-5 sm:p-8">
      <div className="flex flex-wrap items-center gap-3">
        <span className="border border-accent bg-accent px-4 py-2 text-xs font-semibold uppercase tracking-[0.3em] text-black">
          {product.category === "streetwear" ? "Streetwear" : repairText(product.liga)}
        </span>
        <span className="border border-white/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.3em] text-white/70">
          {repairText(product.klub)}
        </span>
      </div>

      <h1 className="mt-6 text-5xl uppercase leading-none text-white sm:text-6xl">
        {repairText(product.igrac)}
      </h1>
      {product.rating && (
        <div className="mt-3">
          <Stars value={product.rating.value} count={product.rating.count} size="md" />
        </div>
      )}
      <p className="mt-4 text-4xl font-semibold text-accent">{productPrice}€</p>
      <p className={`mt-4 text-sm font-semibold uppercase tracking-[0.2em] ${getStockTone(stock)}`}>
        {t.product.stockWarning(stock)}
      </p>

      {sizeOptions.hasAdults && sizeOptions.hasKids ? (
        <div
          ref={segmentRef}
          role="radiogroup"
          aria-label={`${t.product.adults} / ${t.product.kids}`}
          className={`mt-8 grid grid-cols-2 gap-1 rounded-[6px] border bg-[#0a0a0a] p-1 transition-[border-color] duration-300 ${
            sizeFlash && availableSizes.length === 0 ? "border-accent" : "border-white/10"
          }`}
        >
          {(["adult", "kid"] as const).map((s) => {
            const on = segment === s;
            return (
              <button
                key={s}
                type="button"
                role="radio"
                aria-checked={on}
                onClick={() => handleSegmentChange(s)}
                className={`flex h-11 min-w-0 items-center justify-center gap-2 rounded-[4px] px-2 transition duration-200 ease-out ${
                  on ? "bg-accent text-black" : "text-white/70 hover:text-white"
                }`}
              >
                <span className="text-xs font-semibold uppercase tracking-[0.2em]">{s === "adult" ? t.product.adults : t.product.kids}</span>
                <span className={`truncate text-[11px] ${on ? "text-black/60" : "text-white/40"}`}>
                  {s === "adult" || isLongSleeve ? t.product.jersey : t.product.jerseyAndShorts}
                </span>
              </button>
            );
          })}
        </div>
      ) : null}

      {currentSizes.length === 0 ? (
        <p className="mt-8 text-sm font-medium uppercase tracking-[0.24em] text-white/50">Jedna veličina</p>
      ) : availableSizes.length === 0 ? (
        <div className="mt-8 rounded-[12px] border border-red-500/30 bg-red-500/[0.06] px-5 py-4 text-center">
          <p className="text-sm font-bold uppercase tracking-[0.24em] text-red-400">Rasprodano</p>
          <p className="mt-1 text-xs text-white/40">Trenutno nema veličina na stanju.</p>
        </div>
      ) : (
        <div
          ref={sizeBoxRef}
          className={`mt-8 rounded-[6px] outline outline-1 outline-offset-[6px] transition-[outline-color] duration-300 ${
            sizeFlash ? "outline-accent" : "outline-transparent"
          }`}
        >
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium uppercase tracking-[0.24em] text-white/70">{t.product.selectSize}</p>
            <SizeGuide showXXL={sizeOptions.adults.includes("XXL")} />
          </div>
          <div className="mt-4 grid grid-cols-3 gap-3 sm:grid-cols-4">
            {availableSizes.map((size) => (
              <button
                key={size}
                type="button"
                onClick={() => setSelectedSize(size)}
                aria-pressed={selectedSize === size}
                className={`relative h-14 border text-sm font-semibold transition duration-200 ease-out ${
                  selectedSize === size
                    ? "border-accent bg-accent text-black"
                    : "border-white/10 bg-[#0a0a0a] text-white hover:border-accent/40"
                }`}
              >
                {size}
              </button>
            ))}
          </div>
          <p className="mt-3 text-xs text-white/45">
            {locale === "en"
              ? "Wrong size? We'll exchange it — just let us know within 14 days."
              : "Kriva veličina? Mijenjamo je — javi se unutar 14 dana."}
          </p>
        </div>
      )}

      {!allSoldOut && (
        <MixPicker product={product} addons={addons} onChange={setAddons} />
      )}

      <button
        ref={mainButtonRef}
        type="button"
        disabled={allSoldOut}
        aria-disabled={needsSize || allSoldOut}
        onClick={handleAdd}
        className={`button-primary mt-6 w-full ${
          needsSize || allSoldOut
            ? "border border-[#333] bg-[#1a1a1a] text-[#737373] hover:bg-[#1a1a1a] disabled:cursor-not-allowed"
            : ""
        }`}
      >
        {allSoldOut
          ? "Trenutno rasprodano"
          : needsSize
            ? t.product.selectSize
            : addonsN > 0
              ? `${t.product.addToCart} — ${total} €`
              : t.product.addToCart}
      </button>

      {/* Reassurance u trenutku odluke — najveći strah kod pouzeća je "što ako
          platim pa ne stigne". Zato baš ispod gumba potvrdimo: platiš TEK kad
          paket stigne. Diže konverziju kod kupaca s reklama (impulzivni). */}
      {!allSoldOut && (
        <div className="mt-3 flex items-center justify-center gap-2 rounded-[8px] border border-emerald-500/20 bg-emerald-500/[0.06] px-3 py-2.5 text-center">
          <Truck className="h-4 w-4 shrink-0 text-emerald-400" />
          <span className="text-xs font-medium text-white/75">
            {locale === "en"
              ? "Pay cash on delivery — only when the package arrives at your door."
              : "Platiš gotovinom tek kad paket stigne na tvoja vrata."}
          </span>
        </div>
      )}

      {/* Bez ovoga je kupac klikao rasprodane veličine, ništa se nije događalo i
          mislio je da stranica ne radi — pa je odustao ili naručio bez veličine. */}
      {allSoldOut && (
        <p className="mt-3 text-sm text-white/60">
          Sve veličine su trenutno rasprodane.{" "}
          <a href={whatsappUrl} target="_blank" rel="noopener noreferrer" className="text-accent underline underline-offset-4">
            Javi se na WhatsApp
          </a>{" "}
          i javimo ti čim stigne.
        </p>
      )}

      <p className="mt-3 text-sm text-white/50">
        {t.product.paymentSummary(PAYMENT_METHOD_LABEL.toLowerCase(), SHIPPING_PRICE_LABEL)}
      </p>

      <div className="mt-8 grid grid-cols-2 gap-2 border-t border-white/10 pt-6">
        {[
          { icon: Truck, text: t.product.benefits.delivery },
          { icon: Zap, text: t.product.benefits.response },
          { icon: RotateCcw, text: t.product.benefits.returns },
          { icon: MessageCircle, text: t.product.benefits.orderToday },
        ].map(({ icon: Icon, text }) => (
          <div key={text} className="flex items-center gap-2.5 rounded-[8px] border border-white/8 bg-[#0d0d0d] px-3 py-3">
            <Icon className="h-4 w-4 shrink-0 text-accent/70" />
            <span className="text-xs leading-tight text-white/55">{text}</span>
          </div>
        ))}
      </div>

      {!allSoldOut && (
        <StickyAddToCart
          product={product}
          selectedSize={selectedSize}
          hasSizePicker={hasSizePicker}
          needsSize={needsSize}
          addons={addons}
          total={total}
          mainButtonRef={mainButtonRef}
          onAdd={handleAdd}
          onNeedSize={promptSize}
        />
      )}
    </div>
  );
}
