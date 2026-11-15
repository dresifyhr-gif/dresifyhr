import Image from "next/image";
import Link from "next/link";

import { MIX_PATH } from "@/lib/mix";

// Kartica "Složi svoj mix" — stoji u katalogu kao artikl, vodi na izbor dresa.
export function MixPromoCard() {
  return (
    <Link
      href={MIX_PATH}
      className="group flex flex-col overflow-hidden rounded-[14px] border border-accent/40 bg-[#0d0d0d] transition hover:border-accent"
    >
      <div className="relative aspect-square overflow-hidden bg-accent">
        <Image
          src="/mix/slozi-mix.jpg"
          alt="Složi svoj mix — dres + lopta + kapa, klub po izboru"
          fill
          sizes="(max-width: 768px) 50vw, 33vw"
          className="object-cover transition duration-300 group-hover:scale-[1.03]"
        />
      </div>
      <div className="flex flex-1 flex-col gap-1 p-3 sm:p-4">
        <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-accent">Novo</p>
        <h3 className="text-sm font-semibold uppercase leading-tight text-white sm:text-base">Složi svoj mix</h3>
        <p className="text-xs text-white/55">Dres + lopta i/ili kapa — klub po izboru. Jedno 30 €, oboje 40 €.</p>
        <p className="mt-auto pt-2 font-heading text-lg text-accent">30–40 €</p>
      </div>
    </Link>
  );
}
