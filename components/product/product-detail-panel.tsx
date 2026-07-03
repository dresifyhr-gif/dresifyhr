"use client";

import { useEffect, useRef, useState } from "react";
import { Truck, RotateCcw, MessageCircle, Zap } from "lucide-react";

import { useCart } from "@/components/providers/cart-provider";
import { useLanguage } from "@/contexts/language-context";
import { StickyAddToCart } from "@/components/product/sticky-add-to-cart";
import { SizeGuide } from "@/components/product/size-guide";
import { fbTrack } from "@/lib/fbpixel";
import { getJerseyGallery } from "@/lib/data/jersey-media";
import {
  getJerseySizeOptions,
  getJerseyStock,
  getStockTone,
  type Jersey
} from "@/lib/data/jerseys";
import { PAYMENT_METHOD_LABEL, SHIPPING_PRICE_LABEL } from "@/lib/site";
import { createWhatsAppUrl, repairText } from "@/lib/utils";

type ProductDetailPanelProps = {
  product: Jersey;
};

export function ProductDetailPanel({ product }: ProductDetailPanelProps) {
  const { t } = useLanguage();
  const sizeOptions = getJerseySizeOptions(product);
  const gallery = getJerseyGallery(product.slug);
  const frontImage = gallery[0]?.src;
  const stock = getJerseyStock(product.id);
  const { addItem } = useCart();
  const mainButtonRef = useRef<HTMLButtonElement>(null);
  const firstAvailable = (arr: string[], segmentOut: boolean) =>
    segmentOut ? "" : (arr.find((s) => !sizeOptions.soldOutSizes.includes(s)) ?? "");
  const defaultAdultSize = firstAvailable(sizeOptions.adults, sizeOptions.adultsOutOfStock);
  const defaultKidSize = firstAvailable(sizeOptions.kids, sizeOptions.kidsOutOfStock);
  const defaultSegment: "adult" | "kid" =
    sizeOptions.hasAdults && defaultAdultSize ? "adult" : defaultKidSize ? "kid" : sizeOptions.hasAdults ? "adult" : "kid";
  const [segment, setSegment] = useState<"adult" | "kid">(defaultSegment);
  const [selectedSize, setSelectedSize] = useState(
    defaultSegment === "adult" ? defaultAdultSize : defaultKidSize
  );

  useEffect(() => {
    const nextSegment = sizeOptions.hasAdults ? "adult" : "kid";
    const nextSize = nextSegment === "adult" ? defaultAdultSize : defaultKidSize;
    setSegment(nextSegment);
    if (nextSize) {
      setSelectedSize(nextSize);
    }
  }, [product.slug, sizeOptions.hasAdults, defaultAdultSize, defaultKidSize]);

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
  const segmentLabel = segment === "adult" ? t.product.segmentAdult : t.product.segmentKid;
  const productPrice = product.price ?? 20;
  const whatsappMessage = `Pozdrav, želim naručiti: ${repairText(product.klub)} ${repairText(
    product.igrac
  )}${selectedSize ? `, veličina: ${selectedSize}` : ""}. Cijena: ${productPrice}€.`;

  const handleSegmentChange = (nextSegment: "adult" | "kid") => {
    setSegment(nextSegment);
    const nextSize = nextSegment === "adult" ? defaultAdultSize : defaultKidSize;
    if (nextSize) {
      setSelectedSize(nextSize);
    }
  };

  return (
    <div className="border border-white/10 bg-[#111111] p-5 sm:p-8">
      <div className="flex flex-wrap items-center gap-3">
        <span className="border border-accent bg-accent px-4 py-2 text-xs font-semibold uppercase tracking-[0.3em] text-black">
          {repairText(product.liga)}
        </span>
        <span className="border border-white/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.3em] text-white/70">
          {repairText(product.klub)}
        </span>
      </div>

      <h1 className="mt-6 text-5xl uppercase leading-none text-white sm:text-6xl">
        {repairText(product.igrac)}
      </h1>
      <p className="mt-4 text-4xl font-semibold text-accent">{productPrice}€</p>
      <p className={`mt-4 text-sm font-semibold uppercase tracking-[0.2em] ${getStockTone(stock)}`}>
        {t.product.stockWarning(stock)}
      </p>

      {sizeOptions.hasAdults && sizeOptions.hasKids ? (
        <div className="mt-8 grid gap-3 sm:grid-cols-2">
          <button
            type="button"
            onClick={() => handleSegmentChange("adult")}
            className={`border p-4 text-left transition duration-200 ease-out ${
              segment === "adult"
                ? "border-accent bg-accent/10"
                : "border-white/10 bg-[#0a0a0a] hover:border-accent/40"
            }`}
          >
            <p className="text-xs uppercase tracking-[0.3em] text-white/45">{t.product.adults}</p>
            <p className="mt-3 text-2xl uppercase leading-none text-white">{t.product.jersey}</p>
          </button>
          <button
            type="button"
            onClick={() => handleSegmentChange("kid")}
            className={`border p-4 text-left transition duration-200 ease-out ${
              segment === "kid"
                ? "border-accent bg-accent/10"
                : "border-white/10 bg-[#0a0a0a] hover:border-accent/40"
            }`}
          >
            <p className="text-xs uppercase tracking-[0.3em] text-white/45">{t.product.kids}</p>
            <p className="mt-3 text-2xl uppercase leading-none text-white">{t.product.jerseyAndShorts}</p>
          </button>
        </div>
      ) : null}

      {currentSizes.length > 0 ? (
        <div className="mt-8">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium uppercase tracking-[0.24em] text-white/70">{t.product.selectSize}</p>
            <SizeGuide showXXL={sizeOptions.adults.includes("XXL")} />
          </div>
          <div className="mt-4 grid grid-cols-3 gap-3 sm:grid-cols-4">
            {currentSizes.map((size) => {
              const oos = (segment === "adult" && sizeOptions.adultsOutOfStock) || (segment === "kid" && sizeOptions.kidsOutOfStock) || sizeOptions.soldOutSizes.includes(size);
              return (
                <button
                  key={size}
                  type="button"
                  onClick={() => !oos && setSelectedSize(size)}
                  disabled={oos}
                  aria-pressed={selectedSize === size}
                  title={oos ? "Nema na stanju" : undefined}
                  className={`relative h-14 border text-sm font-semibold transition duration-200 ease-out ${
                    oos
                      ? "cursor-not-allowed border-white/5 bg-[#0a0a0a] text-white/20"
                      : selectedSize === size
                      ? "border-accent bg-accent text-black"
                      : "border-white/10 bg-[#0a0a0a] text-white hover:border-accent/40"
                  }`}
                >
                  {oos ? (
                    <span className="flex flex-col items-center leading-tight">
                      <span>{size}</span>
                      <span className="text-[9px] uppercase tracking-[0.15em] text-white/30">nema</span>
                    </span>
                  ) : size}
                </button>
              );
            })}
          </div>
        </div>
      ) : (
        <p className="mt-8 text-sm font-medium uppercase tracking-[0.24em] text-white/50">Jedna veličina</p>
      )}

      <button
        ref={mainButtonRef}
        type="button"
        onClick={() =>
          addItem({
            slug: product.slug,
            klub: repairText(product.klub),
            igrac: repairText(product.igrac),
            size: selectedSize,
            segment,
            segmentLabel,
            imageSrc: frontImage,
            price: product.price
          })
        }
        className="button-primary mt-8 w-full"
      >
        {t.product.addToCart}
      </button>

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

      <StickyAddToCart
        product={product}
        selectedSize={selectedSize}
        segment={segment}
        segmentLabel={segmentLabel}
        imageSrc={frontImage}
        mainButtonRef={mainButtonRef}
      />
    </div>
  );
}
