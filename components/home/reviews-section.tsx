"use client";

import { motion } from "framer-motion";
import { Star } from "lucide-react";

import { SectionHeading } from "@/components/site/section-heading";
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

export function ReviewsSection() {
  const { t } = useLanguage();

  return (
    <section className="section-pad bg-[#0a0a0a]">
      <div className="page-shell">
        <SectionHeading
          kicker={t.reviews.kicker}
          title={t.reviews.title}
          description={t.reviews.desc}
        />
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {reviews.map((review, index) => (
            <motion.article
              key={`${review.name}-${review.city}`}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.25 }}
              transition={{ delay: index * 0.08, duration: 0.35 }}
              className="border border-white/10 bg-[#111111] p-5 sm:p-6"
            >
              <div className="flex items-center gap-1 text-accent">
                {Array.from({ length: 5 }).map((_, starIndex) => (
                  <Star key={starIndex} className="h-4 w-4 fill-current" />
                ))}
              </div>
              <p className="mt-4 text-xs uppercase tracking-[0.28em] text-white/50">
                {review.name}, {review.city}
              </p>
              <p className="mt-4 text-sm leading-7 text-white/70">{review.text}</p>
            </motion.article>
          ))}
        </div>
        <div className="mt-6 border border-white/10 bg-[#111111] px-5 py-4 text-center text-xs font-semibold uppercase tracking-[0.2em] text-white sm:px-6 sm:py-5 sm:text-sm sm:tracking-[0.24em]">
          {t.reviews.bar}
        </div>
      </div>
    </section>
  );
}
