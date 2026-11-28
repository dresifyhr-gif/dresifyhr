"use client";

import Image from "next/image";
import Link from "next/link";
import { Banknote, Minus, Plus, Trash2 } from "lucide-react";

import { useCart, type CartItem } from "@/components/providers/cart-provider";
import { CartThumb, eurNb, groupCartLines, type CartLine } from "@/components/site/cart-ui";
import { MIX_KINDS, mixImage, mixLabel, stripAddonText, type MixKind } from "@/lib/mix";
import { cn, repairText } from "@/lib/utils";

import { CART_BASE } from "./cart-css";
import { imeNames } from "../ime-lib";
import { useCartText, type CartText } from "./cart-i18n";

/* ------------------------------------------------------------------ */
/*  DEMO FINAL — redak košarice (ladica, /kosarica, blagajna).          */
/*  Stanje i količine: isti cart-provider i groupCartLines kao živo.    */
/* ------------------------------------------------------------------ */

const MAX_QTY = 10;
const addonLabel = (kind: MixKind, key?: string) => mixLabel(kind, key) ?? key ?? "";

export { eurNb };

/** "Lamine Yamal nr19" → "YAMAL 19" (tisak na leđima), inače null. */
function printOf(igrac: string) {
  const m = repairText(igrac).match(/^(.*?)\s*\bnr\.?\s*(\d{1,2})\b/i);
  if (!m) return null;
  const name = m[1].trim().split(/\s+/).pop() ?? "";
  return `${name} ${m[2]}`.trim().toLocaleUpperCase("hr");
}

/** Vrsta stavke bez zapisa dodataka (dodaci se prikazuju sličicama). */
function typeOf(item: CartItem, T: CartText) {
  if (item.category === "streetwear") return "Streetwear";
  if (item.category === "trenirka") return T.tracksuit;
  return T.seg(repairText(stripAddonText(item.segmentLabel)).trim()) || (item.segment === "kid" ? T.kid : T.adult);
}

/** Stepper: − (koš kad je 1) · broj · +. Isti put kao živa košarica ("+" = isti artikl još jednom). */
export function DemoQty({ line, size = "md" }: { line: CartLine; size?: "sm" | "md" }) {
  const { addItem, removeItem, closeAddModal } = useCart();
  const T = useCartText();
  const { item, qty, ids } = line;
  const dec = () => removeItem(ids[0]);
  const inc = () => {
    if (qty >= MAX_QTY) return;
    const { id: _id, ...rest } = item;
    addItem(rest);
    closeAddModal();
  };
  const h = size === "sm" ? "h-9" : "h-10";
  const w = size === "sm" ? "w-9" : "w-10";
  return (
    <div role="group" aria-label={T.qty} className={cn("inline-flex items-center rounded-[6px] border border-white/[0.12]", h)}>
      <button
        type="button"
        onClick={dec}
        aria-label={qty === 1 ? T.remove : T.dec}
        className={cn("inline-flex items-center justify-center text-white/65 transition-colors hover:text-white active:scale-90", h, w)}
      >
        {qty === 1 ? <Trash2 className="h-[15px] w-[15px]" strokeWidth={1.6} /> : <Minus className="h-[15px] w-[15px]" strokeWidth={1.8} />}
      </button>
      <span className="min-w-[22px] text-center text-[15px] font-semibold tabular-nums text-white" aria-live="polite">
        {qty}
      </span>
      <button
        type="button"
        onClick={inc}
        disabled={qty >= MAX_QTY}
        aria-label={T.inc}
        className={cn("inline-flex items-center justify-center text-white/65 transition-colors hover:text-white active:scale-90 disabled:opacity-30", h, w)}
      >
        <Plus className="h-[15px] w-[15px]" strokeWidth={1.8} />
      </button>
    </div>
  );
}

/** Mix dodaci (lopta/kapa) kao male tamne sličice ispod dresa. */
function MixUnder({ item, width }: { item: CartItem; width: number }) {
  const T = useCartText();
  const kinds = MIX_KINDS.filter((k) => item.addons?.[k]);
  if (!kinds.length) return null;
  const s = Math.floor((width - (kinds.length - 1) * 4) / kinds.length);
  return (
    <div className="mt-1 flex gap-1" style={{ width }}>
      {kinds.map((k) => (
        <span
          key={k}
          title={`${k === "lopta" ? T.ball : k === "kapa" ? T.cap : T.figure} ${addonLabel(k, item.addons?.[k])}`}
          className="relative block overflow-hidden rounded-[8px] border border-white/[0.08] bg-[#141414]"
          style={{ width: s, height: Math.min(s, 40) }}
        >
          <Image src={mixImage(k, item.addons![k]!)} alt={`${k === "lopta" ? T.ball : k === "kapa" ? T.cap : T.figure} ${addonLabel(k, item.addons?.[k])}`} fill sizes="40px" className="object-contain p-1" />
        </span>
      ))}
    </div>
  );
}

export function CartLineRow({
  line,
  dense,
  readOnly,
  onNavigate,
}: {
  line: CartLine;
  /** ladica / sažetak: manja sličica */
  dense?: boolean;
  /** sažetak blagajne: bez steppera, samo "× 2" */
  readOnly?: boolean;
  onNavigate?: () => void;
}) {
  const { item, qty } = line;
  const T = useCartText();
  const tw = readOnly ? 56 : dense ? 76 : 96;
  const thumb = readOnly ? "h-[68px] w-[56px]" : dense ? "h-[93px] w-[76px]" : "h-[117px] w-[96px]";
  const print = printOf(item.igrac);
  const addons = MIX_KINDS.filter((k) => item.addons?.[k]);
  const href = `${CART_BASE}/dres/${item.slug}/`;
  const title = `${repairText(item.klub)} ${repairText(item.igrac)}`;
  // isti naziv kao na stranici dresa: "Baturina #16" + "Domaći 2026" (ne sirovi "Baturina nr16 — domaci 2026")
  const nm = item.category === "streetwear" ? null : imeNames({ klub: item.klub, igrac: item.igrac, liga: "" });

  return (
    <li className={cn("flex", readOnly ? "gap-3 py-3" : dense ? "gap-3.5 py-4" : "gap-4 py-5 sm:gap-6 sm:py-6")}>
      <div className="shrink-0">
        <Link href={href} onClick={onNavigate} aria-label={title} className="block rounded-[10px] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#e8ff3c]">
          <CartThumb item={item} className={`!rounded-[10px] ${thumb}`} sizes={`${tw}px`} />
        </Link>
        <MixUnder item={item} width={tw} />
      </div>

      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="truncate text-[11px] font-semibold uppercase tracking-[0.16em] text-white/45">
              {repairText(item.klub)}
              {nm?.variant ? <span className="font-medium normal-case tracking-normal text-white/40"> · {nm.variant}</span> : null}
            </p>
            <Link href={href} onClick={onNavigate} className={cn("c-display c-clamp mt-0.5 block text-white", readOnly ? "text-[19px]" : dense ? "text-[22px]" : "text-[26px] sm:text-[30px]")}>
              {nm?.title || repairText(item.igrac)}
            </Link>
          </div>
          <p className={cn("c-price shrink-0 pt-0.5 text-white", readOnly ? "text-[20px]" : dense ? "text-[24px]" : "text-[28px]")}>{eurNb(item.price * qty)}</p>
        </div>

        <dl className={cn("mt-2 space-y-0.5 text-white/60", readOnly ? "text-[12.5px]" : "text-[13.5px]")}>
          <div className="flex gap-1.5">
            <dt className="sr-only">{T.kind}</dt>
            <dd className="truncate">
              {typeOf(item, T)} <span className="text-white/30">·</span> <span className="font-semibold text-white/90">{item.size}</span>
            </dd>
          </div>
          {print ? (
            <div className="flex gap-1.5">
              <dt className="text-white/40">{T.print}</dt>
              <dd className="truncate font-medium tracking-[0.04em] text-white/85">{print}</dd>
            </div>
          ) : null}
          {addons.length ? (
            <div className="flex gap-1.5">
              <dt className="text-white/40">Mix</dt>
              <dd className="truncate text-white/85">{addons.map((k) => `${k} ${addonLabel(k, item.addons?.[k])}`).join(" · ")}</dd>
            </div>
          ) : null}
        </dl>

        {readOnly ? (
          qty > 1 ? <p className="mt-1 text-[12.5px] tabular-nums text-white/50">{T.qty} {qty}</p> : null
        ) : (
          <div className="mt-auto flex items-end justify-between gap-3 pt-3">
            <DemoQty line={line} size={dense ? "sm" : "md"} />
            {qty > 1 ? <span className="pb-2 text-[12px] tabular-nums text-white/40">{eurNb(item.price)} {T.perPc}</span> : null}
          </div>
        )}
      </div>
    </li>
  );
}

export function CartLinesList({ items, dense, readOnly, onNavigate, className }: { items: CartItem[]; dense?: boolean; readOnly?: boolean; onNavigate?: () => void; className?: string }) {
  const lines = groupCartLines(items);
  return (
    <ul className={cn("divide-y divide-white/[0.08]", className)}>
      {lines.map((line) => (
        <CartLineRow key={line.key} line={line} dense={dense} readOnly={readOnly} onNavigate={onNavigate} />
      ))}
    </ul>
  );
}

export function SumLine({ label, value, accent, muted }: { label: string; value: string; accent?: boolean; muted?: boolean }) {
  return (
    <div className="flex items-baseline justify-between gap-3 text-[14.5px]">
      <span className={muted ? "text-white/45" : "text-white/60"}>{label}</span>
      <span className={cn("font-medium tabular-nums", accent ? "text-[#e8ff3c]" : "text-white/90")}>{value}</span>
    </div>
  );
}

export function TotalLine({ total, size = 44 }: { total: number; size?: number }) {
  const T = useCartText();
  return (
    <div className="flex items-end justify-between gap-3 border-t border-white/[0.08] pt-4">
      <span className="c-display pb-1 text-[22px] text-white/80">{T.total}</span>
      <span className="c-price text-white" style={{ fontSize: size }}>
        {eurNb(total)}
      </span>
    </div>
  );
}

/** Podsjetnik: pouzeće, rok i cijena dostave. */
export function CodReminder({ className }: { className?: string }) {
  const T = useCartText();
  return (
    <p className={cn("flex items-center justify-center gap-2 text-center text-[13px] text-white/55", className)}>
      <Banknote className="h-[15px] w-[15px] shrink-0 text-[#e8ff3c]/80" strokeWidth={1.7} />
      <span>{T.cod}</span>
    </p>
  );
}
