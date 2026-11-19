"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ArrowRight, Check, ChevronLeft, ChevronRight } from "lucide-react";

import { useCart } from "@/components/providers/cart-provider";
import type { OrmarItem } from "@/lib/data/ormar";
import { getJerseySizeOptions, getJerseyStock, getStockTone } from "@/lib/data/jerseys";
import { getJerseyGallery } from "@/lib/data/jersey-media";
import { hangerThumbSrc } from "@/lib/hanger-thumb";
import { formatPrice } from "@/lib/utils";
import { displayName } from "./ormar-g-lib";

// Kartica skinutog dresa — samo stvarni podaci proizvoda (ime, cijena, veličine, zaliha).
export function OrmarGCard({
  item,
  index,
  total,
  onBack,
  onPrev,
  onNext,
  onSegment,
}: {
  item: OrmarItem;
  index: number;
  total: number;
  onBack: () => void;
  onPrev: () => void;
  onNext: () => void;
  /** Javlja odabrani dio (odrasli / djeca) — pozornica uz dječji dres pokaže hlačice. */
  onSegment?: (segment: "adult" | "kid") => void;
}) {
  const product = item.product;
  const { addItem } = useCart();
  const { club, title, variant } = displayName(item);
  const isTrenirka = product.category === "trenirka";
  const noun = isTrenirka ? "trenirku" : "dres";
  const stock = getJerseyStock(product);
  const sizeOptions = getJerseySizeOptions(product);

  const firstAvailable = (arr: string[], out: boolean) => (out ? "" : arr.find((s) => !sizeOptions.soldOutSizes.includes(s)) ?? "");
  const availAdult = firstAvailable(sizeOptions.adults, sizeOptions.adultsOutOfStock);
  const availKid = firstAvailable(sizeOptions.kids, sizeOptions.kidsOutOfStock);
  const defaultSegment: "adult" | "kid" =
    sizeOptions.hasAdults && availAdult ? "adult" : availKid ? "kid" : sizeOptions.hasAdults ? "adult" : "kid";
  const soldOut = !availAdult && !availKid;
  const hasBoth = sizeOptions.hasAdults && sizeOptions.hasKids;

  const [segment, setSegment] = useState<"adult" | "kid">(defaultSegment);
  useEffect(() => {
    onSegment?.(segment);
  }, [segment, onSegment]);
  const [size, setSize] = useState<string | null>(null);
  const [added, setAdded] = useState(false);
  const [nudge, setNudge] = useState(false); // klik na gumb bez veličine → veličine kratko zasvijetle
  const nudgeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => { if (nudgeTimer.current) clearTimeout(nudgeTimer.current); }, []);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);

  const sizes = segment === "adult" ? sizeOptions.adults : sizeOptions.kids;
  const segmentOut = segment === "adult" ? sizeOptions.adultsOutOfStock : sizeOptions.kidsOutOfStock;
  const segmentLabel =
    product.category === "trenirka" ? "Trenirka"
    : product.category === "streetwear" ? "Streetwear"
    : segment === "adult" || product.category === "dugi-rukav" ? "Dres" : "Dres i hlačice";

  const add = () => {
    if (soldOut) return;
    if (!size) {
      setNudge(true);
      if (nudgeTimer.current) clearTimeout(nudgeTimer.current);
      nudgeTimer.current = setTimeout(() => setNudge(false), 900);
      return;
    }
    const gallery = product.images ?? getJerseyGallery(product.slug);
    // Isti payload kao kartica proizvoda → otvara postojeći prozor "Dodano u košaricu".
    addItem({
      slug: product.slug,
      klub: product.klub,
      igrac: product.igrac,
      size,
      segment,
      segmentLabel,
      imageSrc: hangerThumbSrc(product.slug) ?? gallery[0]?.src,
      price: product.price,
      category: product.category,
    });
    setAdded(true);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setAdded(false), 1600);
  };

  return (
    // Tamno "lažno staklo": slojeviti prozirni gradijenti + tanki rub s odsjajem gore.
    // Bez drugog backdrop-filtera (pozadina iza je već zamućena).
    <div className="relative overflow-hidden rounded-[22px] border border-white/[0.09] bg-[radial-gradient(120%_70%_at_50%_0%,rgba(255,255,255,0.07),rgba(255,255,255,0)_60%),linear-gradient(165deg,rgba(30,30,32,0.95)_0%,rgba(18,18,20,0.94)_55%,rgba(10,10,11,0.96)_100%)] px-4 pb-3 pt-3 text-left shadow-[inset_0_1px_0_rgba(255,255,255,0.1),0_30px_80px_-24px_rgba(0,0,0,0.95)] md:p-6">
      <style>{`@keyframes og-nudge{0%,100%{transform:none}20%{transform:translateX(-4px)}40%{transform:translateX(4px)}60%{transform:translateX(-2px)}80%{transform:translateX(2px)}}.og-nudge{animation:og-nudge .42s ease-out}.og-nudge button:not(:disabled){border-color:rgba(232,255,60,.55)}@media (prefers-reduced-motion:reduce){.og-nudge{animation:none}}`}</style>
      <div className="pointer-events-none absolute inset-x-6 top-0 h-px bg-[linear-gradient(90deg,transparent,rgba(255,255,255,0.28),transparent)]" />

      <div className="flex items-center justify-between gap-3">
        <p className="truncate text-[10px] font-medium uppercase tracking-[0.3em] text-accent">{club}</p>
        <p className="shrink-0 text-[11px] tabular-nums tracking-[0.2em] text-white/55" aria-label={`${index + 1} od ${total}`}>
          <span className="text-white">{String(index + 1).padStart(2, "0")}</span> / {String(total).padStart(2, "0")}
        </p>
      </div>

      <div className="mt-1 flex items-end justify-between gap-3 md:mt-2">
        <div className="min-w-0">
          <h3 className="truncate font-heading text-[30px] uppercase leading-[1.1] tracking-[0.02em] text-white md:text-[44px]">{title}</h3>
          <p className="mt-1 truncate text-[12px] text-white/45">
            {variant || " "}
            {stock > 0 && <span className={`ml-2 ${getStockTone(stock)}`}>Ostalo {stock} kom</span>}
          </p>
        </div>
        <span className="shrink-0 pb-1 font-heading text-[28px] leading-none tracking-[0.04em] text-accent md:text-[34px]">{formatPrice(product.price)}</span>
      </div>

      {soldOut ? (
        <p className="mt-3 text-[11px] font-medium uppercase tracking-[0.2em] text-white/40">Trenutno nema na stanju</p>
      ) : (
        <div className="mt-2 border-t border-white/[0.07] pt-1 md:mt-4 md:pt-2">
          {hasBoth && (
            // Segmentirana kontrola u stilu iOS-a: klizni neonski "palac" ispod aktivnog dijela.
            <div role="group" aria-label="Odrasli ili djeca" className="relative mb-2 mt-1.5 grid h-11 grid-cols-2 rounded-[12px] border border-white/[0.06] bg-white/[0.06] p-[3px]">
              <span
                aria-hidden
                className="absolute bottom-[3px] left-[3px] top-[3px] w-[calc(50%-3px)] rounded-[9px] bg-accent shadow-[0_2px_8px_rgba(0,0,0,0.45),0_0_0_0.5px_rgba(0,0,0,0.2)] transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none"
                style={{ transform: segment === "kid" ? "translateX(100%)" : "translateX(0)" }}
              />
              {(["adult", "kid"] as const).map((seg) => (
                <button
                  key={seg}
                  type="button"
                  onClick={() => { setSegment(seg); setSize(null); }}
                  aria-pressed={segment === seg}
                  className={`relative z-[1] h-full rounded-[9px] text-[12px] font-semibold uppercase tracking-[0.16em] transition-colors duration-200 ${segment === seg ? "text-black" : "text-white/55 hover:text-white"}`}
                >
                  {seg === "adult" ? "Odrasli" : "Djeca"}
                </button>
              ))}
            </div>
          )}
          <div role="radiogroup" aria-label="Veličina" className={`${hasBoth ? "" : "mt-2"} ${nudge ? "og-nudge" : ""} grid auto-cols-fr grid-flow-col gap-1 md:gap-1.5`}>
            {sizes.map((s) => {
              const oos = segmentOut || sizeOptions.soldOutSizes.includes(s);
              const on = size === s;
              return (
                <button
                  key={s}
                  type="button"
                  role="radio"
                  aria-checked={on}
                  disabled={oos}
                  onClick={() => setSize(s)}
                  aria-label={oos ? `${s}, nema na stanju` : `Veličina ${s}`}
                  className={`relative h-10 min-w-10 rounded-full border px-1.5 text-[13px] font-medium tabular-nums transition md:px-2 ${
                    oos
                      ? "cursor-not-allowed border-white/[0.05] text-white/20"
                      : on
                      ? "border-accent bg-accent text-black shadow-[0_0_18px_-4px_rgba(232,255,60,0.6)]"
                      : "border-white/[0.14] bg-white/[0.03] text-white hover:border-white/40"
                  }`}
                >
                  {s}
                  {oos && <span className="absolute left-1/2 top-1/2 h-px w-5 -translate-x-1/2 -translate-y-1/2 -rotate-[30deg] bg-white/20" />}
                </button>
              );
            })}
          </div>
          <p className="mt-1 h-3.5 text-[10px] text-white/35 md:text-[11px]">{segment === "kid" && hasBoth ? "Dječje veličine su visina u cm." : ""}</p>
        </div>
      )}

      <div className="mt-2 flex items-center gap-2 md:mt-3">
        <button
          type="button"
          onClick={add}
          disabled={soldOut}
          aria-disabled={!size || undefined}
          className={`flex h-11 flex-1 items-center justify-center gap-2 rounded-full text-[12px] font-semibold uppercase tracking-[0.18em] transition ${
            soldOut
              ? "cursor-not-allowed bg-white/[0.06] text-white/30"
              : added
              ? "bg-white text-black"
              : size
              ? "bg-accent text-black hover:bg-[#f1ff7a] active:scale-[0.99]"
              : "border border-accent/30 bg-accent/[0.08] text-accent/90 hover:bg-accent/[0.14]"
          }`}
        >
          {soldOut ? "Rasprodano" : added ? (<><Check className="h-4 w-4" strokeWidth={2.2} /> Dodano · {size}</>) : size ? "Dodaj u košaricu" : "Odaberi veličinu"}
        </button>
        <Link
          href={item.href}
          aria-label={`Pogledaj ${noun}`}
          className="group inline-flex h-11 shrink-0 items-center gap-1.5 rounded-full border border-white/[0.14] px-4 text-[11px] font-medium uppercase tracking-[0.16em] text-white/80 transition hover:border-white/40 hover:text-white"
        >
          {isTrenirka ? (
            <>
              <span className="hidden min-[430px]:inline">Pogledaj trenirku</span>
              <span className="min-[430px]:hidden">Trenirka</span>
            </>
          ) : (
            <>
              <span className="hidden min-[380px]:inline">Pogledaj dres</span>
              <span className="min-[380px]:hidden">Dres</span>
            </>
          )}
          <ArrowRight strokeWidth={1.6} className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
        </Link>
      </div>

      <div className="mt-2 flex items-center gap-2">
        <button
          type="button"
          onClick={onBack}
          className="h-11 flex-1 rounded-full text-[11px] font-medium uppercase tracking-[0.24em] text-white/60 transition hover:bg-white/[0.04] hover:text-white"
        >
          Natrag na šipku
        </button>
        <button type="button" onClick={onPrev} aria-label="Prethodni" className="grid h-11 w-11 place-items-center rounded-full border border-white/[0.14] text-white/80 transition hover:border-white/40 hover:text-white">
          <ChevronLeft className="h-5 w-5" strokeWidth={1.5} />
        </button>
        <button type="button" onClick={onNext} aria-label="Sljedeći" className="grid h-11 w-11 place-items-center rounded-full border border-white/[0.14] text-white/80 transition hover:border-white/40 hover:text-white">
          <ChevronRight className="h-5 w-5" strokeWidth={1.5} />
        </button>
      </div>
    </div>
  );
}
