"use client";

import { useLanguage } from "@/contexts/language-context";

// SEO tekst naslovnice (H2 + long-tail pojmovi) — na dnu stranice da ne odgađa proizvode.
export function HomeSeoText() {
  const { t } = useLanguage();
  return (
    <section className="bg-[#0a0a0a] pb-10 pt-2">
      <div className="page-shell max-w-3xl border-t border-white/10 pt-6">
        <h2 className="font-heading text-lg uppercase tracking-wide text-white/80 sm:text-xl">{t.hero.seoTitle}</h2>
        <p className="mt-2 text-sm leading-6 text-white/45">{t.hero.seoText}</p>
      </div>
    </section>
  );
}
