import Image from "next/image";
import Link from "next/link";

import { MIX_PATH } from "@/lib/mix";

export type MixVariant = "dres" | "dugi-rukav" | "trenirka";

const VARIANTS: Record<MixVariant, { img: string; title: string; desc: string; price: string; href: string }> = {
  dres: { img: "/mix/slozi-mix.jpg", title: "Složi svoj mix — dres", desc: "Dres + lopta i/ili kapa, klub po izboru. Jedno 30 €, oboje 40 €.", price: "30–40 €", href: MIX_PATH },
  "dugi-rukav": { img: "/mix/slozi-mix-dugi-rukav.jpg", title: "Složi svoj mix — dugi rukav", desc: "Dugi rukav + lopta i/ili kapa. Jedno 40 €, oboje 50 €.", price: "40–50 €", href: `${MIX_PATH}?vrsta=dugi-rukav` },
  trenirka: { img: "/mix/slozi-mix-trenirka.jpg", title: "Složi svoj mix — trenirka", desc: "Trenirka + lopta i/ili kapa. Jedno 45 €, oboje 55 €.", price: "45–55 €", href: `${MIX_PATH}?vrsta=trenirka` }
};

// Kartica "Složi svoj mix" — stoji u katalogu kao artikl, vodi na izbor proizvoda.
export function MixPromoCard({ variant = "dres" }: { variant?: MixVariant }) {
  const v = VARIANTS[variant];
  return (
    <Link
      href={v.href}
      className="group flex flex-col overflow-hidden rounded-[14px] border border-accent/40 bg-[#0d0d0d] transition hover:border-accent"
    >
      <div className="relative aspect-square overflow-hidden bg-accent">
        <Image src={v.img} alt={`${v.title} — lopta i kapa kluba po izboru`} fill sizes="(max-width: 768px) 50vw, 33vw" className="object-cover transition duration-300 group-hover:scale-[1.03]" />
      </div>
      <div className="flex flex-1 flex-col gap-1 p-3 sm:p-4">
        <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-accent">Novo</p>
        <h3 className="text-sm font-semibold uppercase leading-tight text-white sm:text-base">{v.title}</h3>
        <p className="text-xs text-white/55">{v.desc}</p>
        <p className="mt-auto pt-2 font-heading text-lg text-accent">{v.price}</p>
      </div>
    </Link>
  );
}
