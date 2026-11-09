"use client";

import { useLanguage } from "@/contexts/language-context";

const reviews = [
  {
    name: "Marko",
    city: "Zagreb",
    text: "Naručio Barcelona dres, stiglo za 2 dana. Sin oduševljen!"
  },
  {
    name: "Ana",
    city: "Split",
    text: "Odlična kvaliteta za cijenu, već druga narudžba."
  },
  {
    name: "Tomislav",
    city: "Rijeka",
    text: "Brza dostava, dres točno kao na slici."
  },
  {
    name: "Petra",
    city: "Osijek",
    text: "Dijete presretno, preporučujem svima!"
  }
];

export function ReviewsSection({ index = "05" }: { index?: string }) {
  const { t } = useLanguage();

  return (
    <section className="pt-20 lg:pt-28">
      <div className="page-shell">
        <div className="idx">
          <b>{index}</b>
          {t.reviews.kicker}
        </div>
        <h2 className="pt-[0.08em] font-display text-[54px] uppercase leading-[0.96] text-fg lg:text-[80px]">{t.reviews.title}</h2>
        <p className="mt-3 max-w-[360px] text-[14px] font-medium leading-[1.45] text-soft lg:max-w-[520px]">{t.reviews.desc}</p>
      </div>
      <div className="page-shell mt-6">
        <div className="rail -mx-4 px-4 sm:-mx-6 sm:px-6 lg:mx-0 lg:grid lg:grid-cols-4 lg:gap-3 lg:px-0">
          {reviews.map((review) => (
            <article
              key={`${review.name}-${review.city}`}
              className="w-[250px] shrink-0 snap-start rounded-[14px] border border-white/[0.18] bg-[#111] p-3 lg:w-auto"
            >
              <div className="flex items-center gap-2 border-b border-white/10 pb-2.5">
                <i
                  aria-hidden
                  className="h-[26px] w-[26px] shrink-0 rounded-full"
                  style={{ background: "conic-gradient(#e8ff3c, #ff4fa3, #e8ff3c)" }}
                />
                <div className="min-w-0">
                  <b className="block truncate text-[11.5px] font-black leading-none text-fg">
                    {review.name}, {review.city}
                  </b>
                  <small className="mt-1 block text-[10px] font-medium leading-none text-mute">{t.reviews.source}</small>
                </div>
              </div>
              <p className="mt-3 rounded-[12px] rounded-tl-[4px] bg-[#262626] px-3 py-2.5 text-[13.5px] font-medium leading-[1.45] text-fg">
                {review.text}
              </p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
