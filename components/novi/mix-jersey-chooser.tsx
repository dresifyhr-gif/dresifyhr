"use client";

/* NOVI DIZAJN — zamjena za components/site/mix-jersey-chooser.tsx SAMO u buildu s
   NEXT_PUBLIC_NOVI_DIZAJN=1 (next.config.mjs). Tamni izgled + sličice na vješalici: stranica
   šalje originalnu fotografiju, ovdje se zamjenjuje slikom na vješalici (bez nje: tamni zamjenski
   okvir) — kupac nigdje ne vidi fotografiju na bijelom. */

import { useMemo, useState } from "react";
import Link from "next/link";
import { ArrowRight, X } from "lucide-react";

import { MixPicker } from "@/components/product/mix-picker";
import { HangerThumb } from "@/components/site/hanger-thumb";
import { hangerThumbSrc } from "@/lib/hanger-thumb";
import type { Jersey } from "@/lib/data/jerseys";
import { IconButton, Segmented, Sheet, SizeTile, eur, eurRange } from "@/components/ui/premium";

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
// FLOODLIGHT: zajednički Sheet (matirani zaslon, ručkica, Escape, zaključan scroll).
function QuickMixBody({ j, onClose }: { j: MixJersey; onClose: () => void }) {
  const isTr = j.kind === "trenirka", isLong = j.category === "dugi-rukav";
  const hasBoth = j.adults.length > 0 && j.kids.length > 0;
  const [segment, setSegment] = useState<"adult" | "kid">(j.adults.length ? "adult" : "kid");
  const [size, setSize] = useState("");
  const sizes = segment === "adult" ? j.adults : j.kids;
  const segmentLabel = isTr ? "Trenirka" : segment === "adult" || isLong ? "Dres" : "Dres i hlačice";
  const product = { slug: j.slug, klub: j.klub, igrac: j.igrac, price: j.price, category: j.category, liga: j.liga } as unknown as Jersey;

  return (
    <div className="px-5 pb-5">
      <div className="flex items-center gap-4">
        <HangerThumb src={j.image} sizes="72px" className="h-[72px] w-[72px]" imgClassName="p-1.5" />
        <div className="min-w-0 flex-1">
          <p className="truncate text-[12px] font-semibold uppercase tracking-[0.16em] text-white/55">{j.klub}</p>
          <p className="mt-0.5 truncate text-[16px] font-semibold leading-tight text-white">{j.igrac}</p>
          <p className="mt-1.5 text-[13px] text-white/55">
            {isTr ? "Trenirka" : "Dres"} <span className="text-white">{eur(j.price)}</span> · mix{" "}
            <span className="font-semibold text-[#e8ff3c]">{eurRange(j.price + 10, j.price + 20)}</span>
          </p>
        </div>
        <IconButton label="Zatvori" size="sm" onClick={onClose} className="-mr-1 self-start">
          <X className="h-[18px] w-[18px]" strokeWidth={1.75} aria-hidden />
        </IconButton>
      </div>

      <div className="mt-5 h-px bg-[linear-gradient(90deg,transparent,rgba(255,255,255,0.08),transparent)]" />

      <p className="mt-5 text-[12px] font-semibold uppercase tracking-[0.2em] text-white/55">1. Veličina</p>
      {hasBoth && (
        <Segmented
          className="mt-3"
          label="Odrasli ili djeca"
          value={segment}
          onChange={(v) => { setSegment(v); setSize(""); }}
          options={[
            { value: "adult", label: "Odrasli" },
            { value: "kid", label: "Djeca" }
          ]}
        />
      )}
      <div className="mt-3 grid grid-cols-5 gap-2">
        {sizes.map((s) => (
          <SizeTile key={s} selected={size === s} onClick={() => setSize(s)}>
            {s}
          </SizeTile>
        ))}
      </div>

      <p className="mt-6 text-[12px] font-semibold uppercase tracking-[0.2em] text-white/55">2. Lopta i/ili kapa</p>
      <MixPicker bare product={product} selectedSize={size} segment={segment} segmentLabel={segmentLabel} imageSrc={j.image} needsSize={!size} onAdded={onClose} />

      <Link href={`/dres/${j.slug}`} className="mt-4 block text-center text-[13px] text-white/55 underline decoration-white/25 underline-offset-4 transition-colors hover:text-white">
        Pogledaj sve detalje dresa
      </Link>
    </div>
  );
}

// /slozi-mix: pretraži i odaberi dres → brzi prozor za slaganje.
export function MixJerseyChooser({ jerseys: input }: { jerseys: MixJersey[] }) {
  const jerseys = useMemo(() => input.map((j) => ({ ...j, image: hangerThumbSrc(j.slug) })), [input]);
  const [q, setQ] = useState("");
  const [open, setOpen] = useState<MixJersey | null>(null);
  const [shown, setShown] = useState(false);
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
        aria-label="Traži klub ili igrača"
        className="h-12 w-full rounded-[4px] border border-white/10 bg-[#0a0a0a] px-4 text-base text-white outline-none transition-colors duration-150 placeholder:text-white/40 focus:border-[#e8ff3c]/70"
      />
      <div className="mt-5 grid grid-cols-2 gap-x-3 gap-y-6 sm:grid-cols-3 sm:gap-x-4 lg:grid-cols-4">
        {list.map((j) => (
          <Link
            key={j.slug}
            href={`/dres/${j.slug}?mix=1`}
            onClick={(e) => { e.preventDefault(); setOpen(j); setShown(true); }}
            className="group block active:opacity-80"
          >
            <HangerThumb
              src={j.image}
              alt={`${j.klub} ${j.igrac}`}
              sizes="(max-width: 640px) 50vw, 25vw"
              className="aspect-square w-full !border-0"
              imgClassName="p-3 transition-transform duration-500 group-hover:scale-[1.035]"
            />
            <div className="pt-2.5">
              <p className="truncate text-[11px] font-semibold uppercase tracking-[0.16em] text-white/55">{j.klub}</p>
              <p className="mt-0.5 truncate text-sm font-semibold text-white">{j.igrac}</p>
              <p className="mt-1 text-[13px] font-semibold tabular-nums text-[#e8ff3c]">Mix {eurRange(j.price + 10, j.price + 20)}</p>
              <span className="mt-1.5 flex items-center gap-1.5 text-[12px] font-semibold uppercase tracking-[0.08em] text-white/70 transition-colors group-hover:text-[#e8ff3c]">
                Složi mix <ArrowRight className="h-3.5 w-3.5" strokeWidth={2} aria-hidden />
              </span>
            </div>
          </Link>
        ))}
      </div>
      {!list.length && <p className="mt-6 text-center text-white/55">Nema rezultata — probaj drugi naziv.</p>}
      <Sheet
        open={shown}
        onClose={() => setShown(false)}
        label={open ? `Složi mix — ${open.klub} ${open.igrac}` : "Složi mix"}
        side="bottom"
        keepMounted={false}
      >
        {open ? <QuickMixBody key={open.slug} j={open} onClose={() => setShown(false)} /> : null}
      </Sheet>
    </div>
  );
}
