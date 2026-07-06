import Image from "next/image";

import type { Testimonial } from "@/lib/testimonials";

// "Zadovoljni kupci" — real customer photos (from IG/WhatsApp) as social proof.
export function TestimonialsSection({ items }: { items: Testimonial[] }) {
  if (!items.length) return null;

  return (
    <section className="section-pad bg-[#0a0a0a]">
      <div className="page-shell">
        <div className="mb-8 text-center">
          <p className="text-xs uppercase tracking-[0.28em] text-accent">Recenzije</p>
          <h2 className="mt-2 font-heading text-3xl uppercase text-white sm:text-4xl">Naši zadovoljni kupci</h2>
          <p className="mt-2 text-sm text-white/55">Prave slike kupaca u našim dresovima — hvala na povjerenju! 🙏</p>
        </div>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {items.map((t) => (
            <figure key={t.id} className="overflow-hidden rounded-xl border border-white/10 bg-[#111111]">
              <div className="relative aspect-[4/5]">
                <Image src={t.imageUrl} alt={t.name ? `Zadovoljan kupac ${t.name}` : "Zadovoljan kupac"} fill sizes="(max-width: 640px) 50vw, 25vw" className="object-cover" />
              </div>
              {(t.name || t.text) && (
                <figcaption className="px-3 py-2.5">
                  {t.name && <div className="text-sm font-semibold text-white">{t.name}</div>}
                  {t.text && <div className="text-xs leading-5 text-white/60">{t.text}</div>}
                </figcaption>
              )}
            </figure>
          ))}
        </div>
      </div>
    </section>
  );
}
