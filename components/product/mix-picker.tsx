"use client";

import { useEffect, useState } from "react";
import Image from "next/image";

import { useCart } from "@/components/providers/cart-provider";
import type { Jersey } from "@/lib/data/jerseys";
import { MIX_ADDON_PRICE_EUR, MIX_CLUBS, addonCount, addonsText, isMixEligible, mixImage, type MixAddons, type MixKind } from "@/lib/mix";
import { repairText } from "@/lib/utils";

type Props = {
  product: Jersey;
  selectedSize: string;
  segment: "adult" | "kid";
  segmentLabel: string;
  imageSrc?: string;
  needsSize: boolean;
};

// "⚽ Složi svoj mix" — uz dres kupac doda loptu i/ili kapu kluba po izboru.
export function MixPicker({ product, selectedSize, segment, segmentLabel, imageSrc, needsSize }: Props) {
  const { addItem } = useCart();
  const [open, setOpen] = useState(false);
  const [addons, setAddons] = useState<MixAddons>({});

  // /dres/...?mix=1 (s artikla "Složi svoj mix") → izbor odmah otvoren.
  useEffect(() => {
    if (new URLSearchParams(window.location.search).get("mix") === "1") setOpen(true);
  }, []);

  if (!isMixEligible(product)) return null;

  const base = product.price ?? 20;
  const n = addonCount(addons);
  const total = base + n * MIX_ADDON_PRICE_EUR;
  const toggle = (kind: MixKind, key: string) =>
    setAddons((a) => ({ ...a, [kind]: a[kind] === key ? undefined : key }));

  const add = () => {
    if (needsSize || !n) return;
    addItem({
      slug: product.slug,
      klub: repairText(product.klub),
      igrac: repairText(product.igrac),
      size: selectedSize,
      segment,
      segmentLabel: `${segmentLabel}${addonsText(addons)}`,
      imageSrc,
      price: total,
      category: product.category,
      addons: { ...addons }
    });
    setAddons({});
  };

  const row = (kind: MixKind, title: string) => (
    <div className="mt-5">
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-white/60">
        {title} <span className="text-white/35">· +{MIX_ADDON_PRICE_EUR} € · odaberi klub</span>
      </p>
      <div className="-mx-1 mt-3 flex gap-2 overflow-x-auto px-1 pb-2">
        {MIX_CLUBS.map((c) => {
          const on = addons[kind] === c.key;
          return (
            <button
              key={c.key}
              type="button"
              onClick={() => toggle(kind, c.key)}
              aria-pressed={on}
              className={`flex w-[92px] shrink-0 flex-col items-center rounded-[10px] border p-2 transition ${
                on ? "border-accent bg-accent/10" : "border-white/10 bg-[#0a0a0a] hover:border-accent/40"
              }`}
            >
              <Image src={mixImage(kind, c.key)} alt={`${title} ${c.label}`} width={72} height={72} className="h-[72px] w-[72px] object-contain" />
              <span className={`mt-1 text-center text-[11px] font-semibold leading-tight ${on ? "text-accent" : "text-white/70"}`}>{c.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );

  return (
    <div className="mt-4 rounded-[12px] border border-accent/30 bg-accent/[0.04]">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="flex w-full items-center justify-between gap-3 px-4 py-3.5 text-left"
      >
        <span>
          <span className="block text-sm font-bold uppercase tracking-wide text-accent">⚽ Složi svoj mix</span>
          <span className="block text-xs text-white/55">Dodaj loptu i/ili kapu kluba po želji — +{MIX_ADDON_PRICE_EUR} € svaka</span>
        </span>
        <span className="text-lg text-accent">{open ? "−" : "+"}</span>
      </button>

      {open && (
        <div className="border-t border-accent/20 px-4 pb-4">
          {row("lopta", "Lopta")}
          {row("kapa", "Kapa")}

          <div className="mt-4 space-y-1 text-sm text-white/70">
            <div className="flex justify-between"><span>Dres</span><span>{base} €</span></div>
            {addons.lopta && <div className="flex justify-between"><span>Lopta {MIX_CLUBS.find((c) => c.key === addons.lopta)?.label}</span><span>+{MIX_ADDON_PRICE_EUR} €</span></div>}
            {addons.kapa && <div className="flex justify-between"><span>Kapa {MIX_CLUBS.find((c) => c.key === addons.kapa)?.label}</span><span>+{MIX_ADDON_PRICE_EUR} €</span></div>}
            <div className="flex justify-between border-t border-white/10 pt-2 text-base font-bold text-white"><span>Ukupno</span><span>{total} €</span></div>
          </div>

          <button
            type="button"
            disabled={needsSize || !n}
            onClick={add}
            className="button-primary mt-4 w-full disabled:cursor-not-allowed disabled:opacity-40"
          >
            {n ? `Dodaj mix u košaricu — ${total} €` : "Odaberi loptu ili kapu"}
          </button>
          {needsSize && n > 0 && <p className="mt-2 text-center text-xs text-white/55">Prvo gore odaberi veličinu dresa.</p>}
        </div>
      )}
    </div>
  );
}
