"use client";

import Script from "next/script";

import { useLanguage } from "@/contexts/language-context";
import { useInstagram } from "@/contexts/shop-settings-context";

const BEHOLD_FEED_ID = "Mr4iBO03Jb1m1NL5S20x";

export function InstagramSection() {
  const ig = useInstagram();
  const { t } = useLanguage();

  return (
    <section className="pt-20 lg:pt-28">
      <div className="page-shell">
        <div className="mb-3.5 flex items-center justify-between gap-3">
          <h2 className="font-display text-[32px] uppercase leading-none text-fg lg:text-[48px]">{ig.handle}</h2>
          <a
            href={ig.url}
            target="_blank"
            rel="noreferrer"
            className="shrink-0 text-[12px] font-bold text-mute transition-colors hover:text-accent"
          >
            {t.instagram.follow} →
          </a>
        </div>
        <p className="mb-5 max-w-[520px] text-[14px] font-medium leading-[1.45] text-soft">{t.instagram.desc}</p>

        <Script src="https://w.behold.so/widget.js" strategy="lazyOnload" />
        {/* @ts-expect-error custom element */}
        <behold-widget feed-id={BEHOLD_FEED_ID} />

        <a href={ig.url} target="_blank" rel="noreferrer" className="button-secondary mt-6 w-full sm:w-auto">
          {t.instagram.cta(ig.handle)}
        </a>
      </div>
    </section>
  );
}
