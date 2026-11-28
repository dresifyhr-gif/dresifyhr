"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { Minus, Plus } from "lucide-react";

import { useCart } from "@/components/providers/cart-provider";
import type { Jersey } from "@/lib/data/jerseys";
import { MIX_ADDON_PRICE_EUR, addonCount, addonsText, isMixEligible, mixImage, mixLabel, mixOptions, type MixAddons, type MixKind } from "@/lib/mix";
import { repairText } from "@/lib/utils";

type Props = {
  product: Jersey;
  selectedSize?: string;
  segment?: "adult" | "kid";
  segmentLabel?: string;
  imageSrc?: string;
  needsSize?: boolean;
  // Kontrolirano (stranica dresa): izbor živi u roditelju, a u košaricu ga dodaje
  // glavni gumb "Dodaj u košaricu" — jedan put dodavanja, dodatak se ne gubi.
  addons?: MixAddons;
  onChange?: (addons: MixAddons) => void;
  bare?: boolean; // prozor za brzo slaganje (/slozi-mix): uvijek otvoreno, vlastiti gumb za dodavanje
  onAdded?: () => void;
};

// "Složi svoj mix" — uz dres kupac doda loptu i/ili kapu kluba, i/ili figuru igrača.
export function MixPicker({
  product,
  selectedSize = "",
  segment = "adult",
  segmentLabel = "",
  imageSrc,
  needsSize = false,
  addons: controlledAddons,
  onChange,
  bare = false,
  onAdded
}: Props) {
  const { addItem } = useCart();
  const [open, setOpen] = useState(bare);
  const [ownAddons, setOwnAddons] = useState<MixAddons>({});
  const boxRef = useRef<HTMLDivElement>(null);

  const controlled = !bare && !!onChange;
  const addons = controlled ? controlledAddons ?? {} : ownAddons;
  const setAddons = (next: MixAddons) => (controlled ? onChange?.(next) : setOwnAddons(next));

  // /dres/...?mix=1 (s artikla "Složi svoj mix") → izbor odmah otvoren.
  useEffect(() => {
    if (!bare && new URLSearchParams(window.location.search).get("mix") === "1") {
      setOpen(true);
      // dovedi izbor veličine i mixa u ekran, bez skrolanja kupca
      window.setTimeout(() => boxRef.current?.scrollIntoView({ behavior: "smooth", block: "center" }), 350);
    }
  }, [bare]);

  if (!isMixEligible(product)) return null;

  const base = product.price ?? 20;
  const n = addonCount(addons);
  const total = base + n * MIX_ADDON_PRICE_EUR;
  const toggle = (kind: MixKind, key: string) => setAddons({ ...addons, [kind]: addons[kind] === key ? undefined : key });

  // Samo u "bare" prozoru — na stranici dresa dodaje glavni gumb.
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
    setOwnAddons({});
    onAdded?.();
  };

  const row = (kind: MixKind, title: string) => (
    <div className="mt-5">
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-white/60">
        {title} <span className="text-white/35">· +{MIX_ADDON_PRICE_EUR} € · {kind === "figura" ? "odaberi figuru" : "odaberi klub"}</span>
      </p>
      <div className="-mx-1 mt-3 flex gap-2 overflow-x-auto px-1 pb-2">
        {mixOptions(kind).map((c) => {
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

  const chosen = addonsText(addons).replace(/^ \+ /, "");

  return (
    <div ref={boxRef} className={bare ? "" : "mt-6 scroll-mt-24 rounded-[12px] border border-accent/30 bg-accent/[0.04]"}>
      {!bare && (
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          aria-expanded={open}
          className="flex w-full items-center justify-between gap-3 px-4 py-3.5 text-left"
        >
          <span className="min-w-0">
            <span className="block text-sm font-bold uppercase tracking-wide text-accent">Složi svoj mix</span>
            <span className="block truncate text-xs text-white/55">
              {n ? `Odabrano: ${chosen}` : `Dodaj loptu, kapu ili figuru igrača — +${MIX_ADDON_PRICE_EUR} € svaka`}
            </span>
          </span>
          {open ? (
            <Minus className="h-5 w-5 shrink-0 text-accent" strokeWidth={1.5} />
          ) : (
            <Plus className="h-5 w-5 shrink-0 text-accent" strokeWidth={1.5} />
          )}
        </button>
      )}

      {open && (
        <div className={bare ? "" : "border-t border-accent/20 px-4 pb-4"}>
          {row("lopta", "Lopta")}
          {row("kapa", "Kapa")}
          {row("figura", "Figura u kutiji")}

          <div className="mt-4 space-y-1 text-sm text-white/70">
            <div className="flex justify-between"><span>{product.category === "trenirka" ? "Trenirka" : "Dres"}</span><span>{base} €</span></div>
            {addons.lopta && <div className="flex justify-between"><span>Lopta {mixLabel("lopta", addons.lopta)}</span><span>+{MIX_ADDON_PRICE_EUR} €</span></div>}
            {addons.kapa && <div className="flex justify-between"><span>Kapa {mixLabel("kapa", addons.kapa)}</span><span>+{MIX_ADDON_PRICE_EUR} €</span></div>}
            {addons.figura && <div className="flex justify-between"><span>Figura {mixLabel("figura", addons.figura)}</span><span>+{MIX_ADDON_PRICE_EUR} €</span></div>}
            <div className="flex justify-between border-t border-white/10 pt-2 text-base font-bold text-white"><span>Ukupno</span><span>{total} €</span></div>
          </div>

          {bare ? (
            <>
              <button
                type="button"
                disabled={needsSize || !n}
                onClick={add}
                className="button-primary mt-4 w-full disabled:cursor-not-allowed disabled:border disabled:border-[#333] disabled:bg-[#1a1a1a] disabled:text-[#737373]"
              >
                {n ? `Dodaj mix u košaricu — ${total} €` : "Odaberi loptu, kapu ili figuru"}
              </button>
              {needsSize && n > 0 && <p className="mt-2 text-center text-xs text-white/55">Prvo gore odaberi veličinu dresa.</p>}
            </>
          ) : (
            n > 0 && <p className="mt-3 text-xs text-white/50">Ide u košaricu zajedno s dresom.</p>
          )}
        </div>
      )}
    </div>
  );
}
