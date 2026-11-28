"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowRight, Check, Lock, ShoppingBag, Trash2 } from "lucide-react";

import { useUser } from "@clerk/nextjs";

import { useCart, type CartItem } from "@/components/providers/cart-provider";
import { CartUpsell } from "@/components/site/cart-upsell";
import { useLanguage } from "@/contexts/language-context";
import { addonsText } from "@/lib/mix";
import { FREE_SHIPPING_THRESHOLD_EUR, SHIPPING_PRICE_EUR, SHIPPING_PRICE_LABEL } from "@/lib/site";
import { cartItemTypeLabel, formatEuroAmount, repairText } from "@/lib/utils";

// Varijanta stavke: "Odrasli · Dres + lopta Barcelona", trenirka, streetwear...
// Mix dodaci su obično već u segmentLabel; dodaj ih samo ako nisu.
function variantLabel(item: CartItem) {
  if (item.category === "trenirka" || item.category === "streetwear") {
    const s = cartItemTypeLabel(item);
    return s.charAt(0).toUpperCase() + s.slice(1);
  }
  const hasAddonText = /\+ (lopta|kapa|figura)/i.test(item.segmentLabel);
  return repairText(`${item.segmentLabel}${hasAddonText ? "" : addonsText(item.addons)}`);
}

export function CartPageContent() {
  const { t } = useLanguage();
  const { items, subtotal, removeItem } = useCart();
  // Besplatna dostava od 60 € SAMO za prijavljene kupce — isto pravilo kao blagajna i server.
  const { isSignedIn } = useUser();
  const signedIn = isSignedIn === true;
  const reachedThreshold = subtotal >= FREE_SHIPPING_THRESHOLD_EUR;
  const freeShipping = signedIn && reachedThreshold;
  const shipping = items.length && !freeShipping ? SHIPPING_PRICE_EUR : 0;
  const total = subtotal + shipping;
  const remainingForFree = Math.max(0, FREE_SHIPPING_THRESHOLD_EUR - subtotal);
  // Košarica se čita iz localStorage tek nakon montiranja — bez ovoga se na
  // trenutak prikaže "Košarica je prazna" i kupcu s artiklima.
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  if (!mounted) {
    return <div className="panel min-h-[280px]" aria-busy="true" />;
  }

  if (!items.length) {
    return (
      <div className="panel px-5 py-10 text-center sm:p-12">
        <div className="mx-auto inline-flex h-14 w-14 items-center justify-center rounded-full border border-white/10 bg-[#0a0a0a] text-accent">
          <ShoppingBag className="h-6 w-6" strokeWidth={1.5} />
        </div>
        <h2 className="mt-5 font-heading text-[2rem] uppercase leading-none text-white sm:text-[2.8rem]">
          {t.cartPage.empty}
        </h2>
        <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-white/55 sm:text-base sm:leading-7">
          {t.cartPage.emptyDesc}
        </p>
        <Link href="/dresovi" className="button-primary mt-7 w-full sm:w-auto">
          <span className="inline-flex items-center gap-2">
            {t.cartPage.viewJerseys}
            <ArrowRight className="h-4 w-4" />
          </span>
        </Link>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-4 sm:gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
      {/* Stavke — jedan panel, tanki razdjelnici između stavki */}
      <div className="panel min-w-0 overflow-hidden xl:col-start-1 xl:row-start-1">
        <ul className="divide-y divide-white/10">
          {items.map((item) => (
            <li
              key={item.id}
              className="grid grid-cols-[80px_minmax(0,1fr)] gap-3 p-3 sm:grid-cols-[104px_minmax(0,1fr)] sm:gap-5 sm:p-5"
            >
              <div className="relative aspect-square min-w-0 overflow-hidden rounded-[8px] bg-[#fbfbfb]">
                {item.imageSrc ? (
                  <Image
                    src={item.imageSrc}
                    alt={`${repairText(item.klub)} ${repairText(item.igrac)}`}
                    fill
                    sizes="(min-width: 640px) 104px, 80px"
                    className="object-contain p-1.5"
                  />
                ) : (
                  <div className="flex h-full items-center justify-center text-[10px] uppercase tracking-[0.2em] text-black/35">
                    DRESIFY
                  </div>
                )}
              </div>

              <div className="flex min-w-0 flex-col">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <h3 className="truncate font-heading text-lg uppercase leading-none text-white sm:text-2xl">
                      {repairText(item.klub)}
                    </h3>
                    <p className="mt-1 line-clamp-2 text-[13px] leading-5 text-white/70 sm:text-sm">
                      {repairText(item.igrac)}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => removeItem(item.id)}
                    className="-mr-2 -mt-2 inline-flex h-10 w-10 shrink-0 items-center justify-center text-white/40 transition-colors duration-200 hover:text-red-400"
                    aria-label={t.cartPage.removeItem}
                  >
                    <Trash2 className="h-4 w-4" strokeWidth={1.5} />
                  </button>
                </div>

                <p className="mt-1 text-xs leading-5 text-white/45">{variantLabel(item)}</p>

                <div className="mt-auto flex items-end justify-between gap-3 pt-2">
                  <span className="text-[13px] text-white/55">
                    {t.cartPage.size} <span className="text-white">{item.size}</span>
                    <span className="mx-1.5 text-white/25">·</span>
                    {t.cartPage.qty} <span className="text-white">1</span>
                  </span>
                  <span className="shrink-0 text-[15px] font-semibold text-accent">
                    {formatEuroAmount(item.price)}
                  </span>
                </div>
              </div>
            </li>
          ))}
        </ul>
      </div>

      {/* Sažetak — na mobitelu odmah ispod stavki, na desktopu desno i ljepljiv */}
      <aside className="panel h-fit min-w-0 p-4 sm:p-6 xl:sticky xl:top-24 xl:col-start-2 xl:row-span-2 xl:row-start-1">
        <p className="text-xs uppercase tracking-[0.28em] text-white/45">{t.cartPage.summary}</p>
        <div className="mt-4 space-y-3 text-sm text-white">
          <div className="flex items-center justify-between gap-3">
            <span className="text-white/55">{t.cartPage.items}</span>
            <span className="font-semibold">{formatEuroAmount(subtotal)}</span>
          </div>
          <div className="flex items-center justify-between gap-3">
            <span className="text-white/55">{t.cartPage.shipping}</span>
            <span className={`font-semibold ${freeShipping ? "text-accent" : ""}`}>
              {freeShipping ? "Besplatno" : SHIPPING_PRICE_LABEL}
            </span>
          </div>

          <div className="rounded-[6px] border border-accent/20 bg-accent/5 px-3 py-2.5">
            <p className="text-center text-[12px] leading-5 text-white/75">
              {freeShipping ? (
                <span className="inline-flex items-center gap-1.5 font-semibold text-accent">
                  <Check className="h-3.5 w-3.5" strokeWidth={2} />
                  Ostvario si besplatnu dostavu
                </span>
              ) : reachedThreshold ? (
                <>
                  <Lock className="mr-1 inline h-3 w-3 -translate-y-px text-accent" strokeWidth={1.75} />
                  <Link href="/prijava/" className="font-semibold text-accent underline underline-offset-2">
                    Prijavi se ili registriraj (besplatno)
                  </Link>{" "}
                  i dostava je besplatna — uštediš {SHIPPING_PRICE_LABEL}
                </>
              ) : (
                <>
                  Dodaj još <span className="font-semibold text-accent">{formatEuroAmount(remainingForFree)}</span> za
                  besplatnu dostavu{!signedIn && " (za registrirane)"}
                </>
              )}
            </p>
            <div className="mt-2 h-1 w-full overflow-hidden rounded-full bg-white/10">
              <div
                className="h-full rounded-full bg-accent transition-all duration-500 ease-out"
                style={{ width: `${Math.min(100, (subtotal / FREE_SHIPPING_THRESHOLD_EUR) * 100)}%` }}
              />
            </div>
          </div>

          <div className="flex items-end justify-between gap-3 border-t border-white/10 pt-3">
            <span className="font-heading text-xl uppercase tracking-[0.12em] text-white">{t.cartPage.total}</span>
            <span className="text-3xl font-bold leading-none text-accent">{formatEuroAmount(total)}</span>
          </div>
        </div>

        <Link href="/checkout" className="button-primary mt-5 w-full px-4">
          <span className="inline-flex items-center gap-2">
            {t.cartPage.checkout}
            <ArrowRight className="h-4 w-4" />
          </span>
        </Link>
      </aside>

      <CartUpsell className="panel p-4 sm:p-5 xl:col-start-1 xl:row-start-2" />
    </div>
  );
}
