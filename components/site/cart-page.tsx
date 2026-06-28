"use client";

import Image from "next/image";
import Link from "next/link";
import { ArrowRight, ShoppingBag, Trash2 } from "lucide-react";

import { useCart } from "@/components/providers/cart-provider";
import { useLanguage } from "@/contexts/language-context";
import { FREE_SHIPPING_THRESHOLD_EUR, SHIPPING_PRICE_EUR, SHIPPING_PRICE_LABEL } from "@/lib/site";
import { formatEuroAmount, repairText } from "@/lib/utils";

export function CartPageContent() {
  const { t } = useLanguage();
  const { items, subtotal, removeItem } = useCart();
  const freeShipping = subtotal >= FREE_SHIPPING_THRESHOLD_EUR;
  const shipping = items.length && !freeShipping ? SHIPPING_PRICE_EUR : 0;
  const total = subtotal + shipping;
  const remainingForFree = Math.max(0, FREE_SHIPPING_THRESHOLD_EUR - subtotal);

  if (!items.length) {
    return (
      <div className="panel p-8 text-center sm:p-12">
        <div className="mx-auto inline-flex h-16 w-16 items-center justify-center rounded-[4px] border border-white/10 bg-[#0a0a0a] text-accent">
          <ShoppingBag className="h-8 w-8" />
        </div>
        <h2 className="mt-6 font-heading text-[2.8rem] uppercase leading-none text-white">
          {t.cartPage.empty}
        </h2>
        <p className="mx-auto mt-4 max-w-xl text-sm leading-7 text-white/60 sm:text-base">
          {t.cartPage.emptyDesc}
        </p>
        <Link href="/dresovi" className="button-primary mt-8 inline-flex">
          {t.cartPage.viewJerseys}
        </Link>
      </div>
    );
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
      <div className="panel p-4 sm:p-6">
        <div className="space-y-4">
          {items.map((item) => (
            <div
              key={item.id}
              className="grid gap-4 border border-white/10 bg-[#0a0a0a] p-4 sm:grid-cols-[120px_minmax(0,1fr)_auto] sm:items-center"
            >
              <div className="relative aspect-[4/5] overflow-hidden rounded-[4px] border border-white/10 bg-[#111111]">
                {item.imageSrc ? (
                  <Image
                    src={item.imageSrc}
                    alt={`${repairText(item.klub)} ${repairText(item.igrac)}`}
                    fill
                    sizes="120px"
                    className="object-contain p-2"
                  />
                ) : (
                  <div className="flex h-full items-center justify-center text-[10px] uppercase tracking-[0.2em] text-white/35">
                    DRESIFY
                  </div>
                )}
              </div>

              <div>
                <p className="text-xs uppercase tracking-[0.24em] text-white/45">{item.segmentLabel}</p>
                <h3 className="mt-2 font-heading text-[2rem] uppercase leading-none text-white">
                  {repairText(item.klub)}
                </h3>
                <p className="mt-2 text-sm leading-6 text-white/60">{repairText(item.igrac)}</p>
                <div className="mt-4 flex flex-wrap items-center gap-3 text-sm text-white/65">
                  <span className="border border-white/10 px-3 py-2">{t.cartPage.size} {item.size}</span>
                  <span className="border border-white/10 px-3 py-2">{t.cartPage.qty} 1</span>
                  <span className="border border-white/10 px-3 py-2 text-accent">
                    {formatEuroAmount(item.price)}
                  </span>
                </div>
              </div>

              <button
                type="button"
                onClick={() => removeItem(item.id)}
                className="inline-flex h-11 w-11 items-center justify-center border border-white/10 text-white/55 transition duration-200 ease-out hover:border-red-400/40 hover:text-red-400"
                aria-label={t.cartPage.removeItem}
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
      </div>

      <aside className="panel h-fit p-5 sm:sticky sm:top-24 sm:p-6">
        <p className="text-xs uppercase tracking-[0.28em] text-white/45">{t.cartPage.summary}</p>
        <div className="mt-5 space-y-3 text-sm text-white">
          <div className="flex items-center justify-between">
            <span className="text-white/55">{t.cartPage.items}</span>
            <span className="font-semibold">{formatEuroAmount(subtotal)}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-white/55">{t.cartPage.shipping}</span>
            <span className={`font-semibold ${freeShipping ? "text-accent" : ""}`}>
              {freeShipping ? "Besplatno" : SHIPPING_PRICE_LABEL}
            </span>
          </div>
          {items.length ? (
            <div className="rounded-[6px] border border-accent/25 bg-accent/5 px-3 py-2.5">
              <p className="text-center text-[12px] leading-5 text-white/75">
                {freeShipping ? (
                  <span className="font-semibold text-accent">🎉 Ostvario si besplatnu dostavu!</span>
                ) : (
                  <>
                    Dodaj još <span className="font-semibold text-accent">{formatEuroAmount(remainingForFree)}</span> za besplatnu dostavu
                  </>
                )}
              </p>
              <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-white/10">
                <div
                  className="h-full rounded-full bg-accent transition-all duration-500 ease-out"
                  style={{ width: `${Math.min(100, (subtotal / FREE_SHIPPING_THRESHOLD_EUR) * 100)}%` }}
                />
              </div>
            </div>
          ) : null}
          <div className="flex items-center justify-between border-t border-white/10 pt-3">
            <span className="font-heading text-xl uppercase tracking-[0.12em] text-white">{t.cartPage.total}</span>
            <span className="text-3xl font-bold text-accent">{formatEuroAmount(total)}</span>
          </div>
        </div>

        <Link href="/checkout" className="button-primary mt-6 w-full">
          <span className="inline-flex items-center gap-2">
            {t.cartPage.checkout}
            <ArrowRight className="h-4 w-4" />
          </span>
        </Link>
      </aside>
    </div>
  );
}
