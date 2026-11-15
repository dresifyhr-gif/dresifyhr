"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { X } from "lucide-react";

import { MixPicker } from "@/components/product/mix-picker";
import type { Jersey } from "@/lib/data/jerseys";

export type MixJersey = {
  slug: string;
  klub: string;
  igrac: string;
  price: number;
  image?: string;
  kind?: "dres" | "trenirka";
  category?: string;
  liga?: string;
  // samo dostupne veličine (rasprodane već izbačene na serveru)
  adults: string[];
  kids: string[];
};

// Prozor odozdo: veličina → lopta/kapa → u košaricu, bez odlaska na stranicu dresa.
function QuickMixSheet({ j, onClose }: { j: MixJersey; onClose: () => void }) {
  const isTr = j.kind === "trenirka", isLong = j.category === "dugi-rukav";
  const hasBoth = j.adults.length > 0 && j.kids.length > 0;
  const [segment, setSegment] = useState<"adult" | "kid">(j.adults.length ? "adult" : "kid");
  const [size, setSize] = useState("");
  const sizes = segment === "adult" ? j.adults : j.kids;
  const segmentLabel = isTr ? "Trenirka" : segment === "adult" || isLong ? "Dres" : "Dres i hlačice";
  const product = { slug: j.slug, klub: j.klub, igrac: j.igrac, price: j.price, category: j.category, liga: j.liga } as unknown as Jersey;

  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => { document.body.style.overflow = prev; window.removeEventListener("keydown", onKey); };
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-[70] flex items-end justify-center md:items-center" role="dialog" aria-modal="true" aria-label={`Složi mix — ${j.klub} ${j.igrac}`}>
      <button type="button" aria-label="Zatvori" onClick={onClose} className="absolute inset-0 bg-black/70" />
      <div className="relative max-h-[90vh] w-full overflow-y-auto rounded-t-[22px] border border-white/10 bg-[#0d0d0d] px-4 pb-6 pt-3 md:max-w-[560px] md:rounded-[22px] md:px-6">
        <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-white/20 md:hidden" />
        <button type="button" onClick={onClose} aria-label="Zatvori" className="absolute right-3 top-3 inline-flex h-9 w-9 items-center justify-center rounded-full text-white/60 hover:text-white">
          <X className="h-5 w-5" />
        </button>

        <div className="flex items-center gap-3 pr-10">
          <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-[10px] bg-[#fbfbfb]">
            {j.image && <Image src={j.image} alt="" fill sizes="64px" className="object-contain p-1" />}
          </div>
          <div className="min-w-0">
            <p className="truncate text-xs uppercase tracking-wide text-white/50">{j.klub}</p>
            <p className="truncate text-sm font-semibold text-white">{j.igrac}</p>
            <p className="text-xs text-accent">{isTr ? "Trenirka" : "Dres"} {j.price} € · mix {j.price + 10}–{j.price + 20} €</p>
          </div>
        </div>

        <p className="mt-5 text-xs font-semibold uppercase tracking-[0.2em] text-white/60">1. Veličina</p>
        {hasBoth && (
          <div className="mt-2 inline-flex rounded-full border border-white/10 p-1">
            {(["adult", "kid"] as const).map((s) => (
              <button key={s} type="button" onClick={() => { setSegment(s); setSize(""); }}
                className={`rounded-full px-4 py-1.5 text-xs font-bold ${segment === s ? "bg-accent text-black" : "text-white/70"}`}>
                {s === "adult" ? "Odrasli" : "Djeca"}
              </button>
            ))}
          </div>
        )}
        <div className="mt-2 grid grid-cols-5 gap-2">
          {sizes.map((s) => (
            <button key={s} type="button" onClick={() => setSize(s)} aria-pressed={size === s}
              className={`h-11 rounded-[8px] border text-sm font-semibold ${size === s ? "border-accent bg-accent text-black" : "border-white/10 bg-black text-white"}`}>
              {s}
            </button>
          ))}
        </div>

        <p className="mt-5 text-xs font-semibold uppercase tracking-[0.2em] text-white/60">2. Lopta i/ili kapa</p>
        <MixPicker bare product={product} selectedSize={size} segment={segment} segmentLabel={segmentLabel} imageSrc={j.image} needsSize={!size} onAdded={onClose} />

        <Link href={`/dres/${j.slug}`} className="mt-3 block text-center text-xs text-white/45 underline underline-offset-4">Pogledaj sve detalje dresa</Link>
      </div>
    </div>
  );
}

// /slozi-mix: pretraži i odaberi dres → brzi prozor za slaganje.
export function MixJerseyChooser({ jerseys }: { jerseys: MixJersey[] }) {
  const [q, setQ] = useState("");
  const [open, setOpen] = useState<MixJersey | null>(null);
  const list = useMemo(() => {
    const t = q.trim().toLowerCase();
    const hit = t ? jerseys.filter((j) => `${j.klub} ${j.igrac}`.toLowerCase().includes(t)) : jerseys;
    return hit.slice(0, 60);
  }, [q, jerseys]);

  return (
    <div>
      <input
        type="search"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Traži klub ili igrača (npr. Real, Messi, Hrvatska)…"
        className="w-full rounded-[10px] border border-white/15 bg-[#0d0d0d] px-4 py-3.5 text-base text-white placeholder:text-white/35 focus:border-accent focus:outline-none"
      />
      <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {list.map((j) => (
          <Link
            key={j.slug}
            href={`/dres/${j.slug}?mix=1`}
            onClick={(e) => { e.preventDefault(); setOpen(j); }}
            className="group overflow-hidden rounded-[12px] border border-white/10 bg-[#0d0d0d] transition hover:border-accent"
          >
            <div className="relative aspect-square bg-[#fbfbfb]">
              {j.image && <Image src={j.image} alt={`${j.klub} ${j.igrac}`} fill sizes="(max-width: 640px) 50vw, 25vw" className="object-contain p-2" />}
            </div>
            <div className="p-3">
              <p className="truncate text-xs uppercase tracking-wide text-white/50">{j.klub}</p>
              <p className="truncate text-sm font-semibold text-white">{j.igrac}</p>
              <p className="mt-1 text-xs text-accent">Mix {j.price + 10}–{j.price + 20} €</p>
              <span className="mt-2 block rounded-full bg-accent py-1.5 text-center text-[12px] font-extrabold text-black">Složi mix →</span>
            </div>
          </Link>
        ))}
      </div>
      {!list.length && <p className="mt-6 text-center text-white/50">Nema rezultata — probaj drugi naziv.</p>}
      {open && <QuickMixSheet j={open} onClose={() => setOpen(null)} />}
    </div>
  );
}
