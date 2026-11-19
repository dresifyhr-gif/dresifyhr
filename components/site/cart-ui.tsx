"use client";

import Link from "next/link";
import { Check, Minus, Plus, Trash2 } from "lucide-react";

import { useCart, type CartItem } from "@/components/providers/cart-provider";
import { HangerThumb } from "@/components/site/hanger-thumb";
import { hangerThumbSrc } from "@/lib/hanger-thumb";
import { FREE_SHIPPING_THRESHOLD_EUR } from "@/lib/site";
import { cn, repairText } from "@/lib/utils";

/* ------------------------------------------------------------------ */
/*  Zajednički dijelovi košarice (ladica, /kosarica, dodano, blagajna). */
/*  Samo prikaz — logika narudžbe ostaje u cart-provideru i obrascu.    */
/* ------------------------------------------------------------------ */

/** "20 €" / "20,50 €" s neprelomivim razmakom. */
export function eurNb(n: number) {
  const s = Number.isInteger(n) ? String(n) : n.toFixed(2).replace(".", ",");
  return `${s} €`;
}

/* ---------------- Slike "na vješalici" ---------------- */

// Manifest je ionako u glavnom paketu (HangerCardsProvider omata cijelu stranicu), pa se čita
// sinkrono: nema prvog prikaza s fotografijom dok se manifest učitava. Uključuje i komplete.
export type HangerThumbManifest = { get: (slug: string) => string | undefined };
const THUMBS: HangerThumbManifest = { get: hangerThumbSrc };

/** Zadržano radi postojećih poziva; `enabled` više nije potreban. */
export function useHangerManifest(_enabled = true): HangerThumbManifest {
  return THUMBS;
}

/** Sličica stavke: proizvod na vješalici na tamnoj mini-pozornici. Bez vješalice: spremljena slika, ali također na tamnom. */
export function CartThumb({
  item,
  manifest,
  className,
  sizes = "80px"
}: {
  item: Pick<CartItem, "slug" | "klub" | "igrac" | "imageSrc">;
  manifest?: HangerThumbManifest | null;
  className?: string;
  sizes?: string;
}) {
  const src = (manifest ?? THUMBS).get(item.slug) ?? item.imageSrc;
  const alt = `${repairText(item.klub)} ${repairText(item.igrac)}`;
  return <HangerThumb src={src} alt={alt} sizes={sizes} className={className} />;
}

/* ---------------- Grupiranje istih stavki (količina) ---------------- */

export type CartLine = { key: string; item: CartItem; ids: string[]; qty: number };

/** Iste stavke (isti dres, veličina, dob, dodaci, cijena) prikazuju se kao jedan redak s količinom. */
export function groupCartLines(items: CartItem[]): CartLine[] {
  const map = new Map<string, CartLine>();
  // Redoslijed redaka prati NAJSTARIJI primjerak u grupi (košarica je "najnovije prvo"),
  // pa "+" / "−" na retku ne premeće retke; novi, drugačiji artikl i dalje ide na vrh.
  const oldest = new Map<string, number>();
  items.forEach((it, index) => {
    const key = [it.slug, it.segment, it.size, it.segmentLabel, it.price, it.addons?.lopta ?? "", it.addons?.kapa ?? ""].join("|");
    const line = map.get(key);
    if (line) {
      line.ids.push(it.id);
      line.qty += 1;
    } else {
      map.set(key, { key, item: it, ids: [it.id], qty: 1 });
    }
    oldest.set(key, index);
  });
  return Array.from(map.values()).sort((a, b) => (oldest.get(a.key) ?? 0) - (oldest.get(b.key) ?? 0));
}

const MAX_QTY = 10;

/** iOS stepper: − (ili koš kad je 1) · broj · +. "+" dodaje isti artikl (isti put kao gumb na proizvodu). */
export function QtyStepper({ line, locale = "hr", className }: { line: CartLine; locale?: string; className?: string }) {
  const { addItem, removeItem, closeAddModal } = useCart();
  const en = locale === "en";
  const { item, qty, ids } = line;

  // Ukloni najnoviji primjerak (ids[0]) — najstariji drži mjesto retka.
  const dec = () => removeItem(ids[0]);
  const inc = () => {
    if (qty >= MAX_QTY) return;
    const { id: _id, ...rest } = item;
    addItem(rest);
    // Dodavanje iz košarice ne otvara prozor "Dodano" (isto kao kartica u ormaru).
    closeAddModal();
  };

  return (
    <div
      className={cn(
        "inline-flex h-9 items-center rounded-full border border-white/[0.08] bg-white/[0.05] shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]",
        className
      )}
      role="group"
      aria-label={en ? "Quantity" : "Količina"}
    >
      <button
        type="button"
        onClick={dec}
        aria-label={qty === 1 ? (en ? "Remove item" : "Ukloni artikl") : en ? "Decrease quantity" : "Smanji količinu"}
        className="inline-flex h-9 w-9 items-center justify-center rounded-full text-white/70 transition-[color,transform] duration-150 hover:text-white active:scale-90"
      >
        {qty === 1 ? <Trash2 className="h-[15px] w-[15px]" strokeWidth={1.75} /> : <Minus className="h-[15px] w-[15px]" strokeWidth={2} />}
      </button>
      <span className="min-w-[18px] text-center text-[14px] font-semibold tabular-nums text-white" aria-live="polite">
        {qty}
      </span>
      <button
        type="button"
        onClick={inc}
        disabled={qty >= MAX_QTY}
        aria-label={en ? "Increase quantity" : "Povećaj količinu"}
        className="inline-flex h-9 w-9 items-center justify-center rounded-full text-white/70 transition-[color,transform] duration-150 hover:text-white active:scale-90 disabled:opacity-30"
      >
        <Plus className="h-[15px] w-[15px]" strokeWidth={2} />
      </button>
    </div>
  );
}

/* ---------------- Do besplatne dostave ---------------- */

/** Mjerač do besplatne dostave (samo prijavljeni; isto pravilo kao blagajna i server). */
export function FreeShipMeter({
  subtotal,
  signedIn,
  onNavigate,
  compact,
  className
}: {
  subtotal: number;
  signedIn: boolean;
  onNavigate?: () => void;
  compact?: boolean;
  className?: string;
}) {
  const reached = subtotal >= FREE_SHIPPING_THRESHOLD_EUR;
  const free = signedIn && reached;
  const remaining = Math.max(0, FREE_SHIPPING_THRESHOLD_EUR - subtotal);
  const ratio = reached ? 1 : Math.min(1, subtotal / FREE_SHIPPING_THRESHOLD_EUR);

  return (
    <div
      className={cn(
        "rounded-[14px] border border-white/[0.07] bg-[linear-gradient(180deg,rgba(255,255,255,0.045),rgba(255,255,255,0.015))] shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]",
        compact ? "px-3.5 py-2.5" : "px-4 py-3",
        className
      )}
    >
      <p className="text-[13px] leading-5 text-white/65">
        {free ? (
          <span className="inline-flex items-center gap-1.5 font-semibold text-[#e8ff3c]">
            <span className="inline-flex h-4 w-4 items-center justify-center rounded-full bg-[#e8ff3c] text-[#0a0a0a]">
              <Check className="h-3 w-3" strokeWidth={3} />
            </span>
            Ostvario si besplatnu dostavu
          </span>
        ) : reached ? (
          <>
            <Link href="/prijava/" onClick={onNavigate} className="font-semibold text-[#e8ff3c] underline decoration-[#e8ff3c]/40 underline-offset-[3px]">
              Prijavi se ili registriraj (besplatno)
            </Link>{" "}
            i dostava je <span className="font-medium text-white">besplatna</span>
          </>
        ) : (
          <>
            Još <span className="font-semibold tabular-nums text-white">{eurNb(remaining)}</span> do{" "}
            <span className="font-medium text-white">besplatne dostave</span>
            {!signedIn && <span className="text-white/55"> (za registrirane)</span>}
          </>
        )}
      </p>
      <div className="fl-progress mt-2.5" role="progressbar" aria-valuemin={0} aria-valuemax={FREE_SHIPPING_THRESHOLD_EUR} aria-valuenow={Math.min(subtotal, FREE_SHIPPING_THRESHOLD_EUR)} aria-label="Do besplatne dostave">
        <div className="fl-progress-fill" style={{ transform: `scaleX(${ratio})` }} />
      </div>
    </div>
  );
}

/* ---------------- Redak sažetka ---------------- */

export function SumRow({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-3 text-[14px]">
      <span className="text-white/55">{label}</span>
      <span className={cn("font-medium tabular-nums", accent ? "text-[#e8ff3c]" : "text-white/90")}>{value}</span>
    </div>
  );
}
