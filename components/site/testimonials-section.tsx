import Image from "next/image";

import type { Testimonial } from "@/lib/testimonials";

// "Kupci u našim dresovima" — PRAVE fotografije kupaca (dodaju se u adminu).
// Koncept A: okviri 9:16 kao story/DM screenshot, vodoravni niz.
export function TestimonialsSection({ items }: { items: Testimonial[] }) {
  if (!items.length) return null;

  return (
    <section className="pt-20 lg:pt-28">
      <div className="page-shell">
        <div className="idx">Recenzije</div>
        <h2 className="font-display text-[54px] uppercase leading-[0.92] text-fg lg:text-[80px]">Kupci u našim dresovima</h2>
        <p className="mt-3 max-w-[360px] text-[14px] font-medium leading-[1.45] text-soft lg:max-w-[520px]">
          Prave slike kupaca koje nam pošalju nakon dostave — hvala na povjerenju!
        </p>
      </div>
      <div className="page-shell mt-6">
        <div className="rail -mx-4 px-4 sm:-mx-6 sm:px-6 lg:mx-0 lg:px-0">
          {items.map((t) => (
            <figure
              key={t.id}
              className="relative w-[176px] shrink-0 snap-start overflow-hidden rounded-[14px] border border-white/[0.18] bg-[#111] sm:w-[210px]"
            >
              <div className="relative aspect-[9/16]">
                <Image
                  src={t.imageUrl}
                  alt={t.name ? `Zadovoljan kupac ${t.name}` : "Zadovoljan kupac"}
                  fill
                  sizes="(max-width: 640px) 176px, 210px"
                  className="object-cover"
                />
                <span aria-hidden className="absolute inset-x-0 bottom-0 h-1/2 bg-[linear-gradient(180deg,transparent,rgba(0,0,0,.85))]" />
              </div>
              {t.name || t.text ? (
                <figcaption className="absolute inset-x-0 bottom-0 p-2.5">
                  {t.name ? <div className="text-[12px] font-black text-fg">{t.name}</div> : null}
                  {t.text ? <div className="mt-0.5 line-clamp-3 text-[11px] leading-[1.35] text-white/75">{t.text}</div> : null}
                </figcaption>
              ) : null}
            </figure>
          ))}
        </div>
      </div>
    </section>
  );
}
