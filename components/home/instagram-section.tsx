"use client";

import Script from "next/script";

import { SectionHeading } from "@/components/site/section-heading";
import { useLanguage } from "@/contexts/language-context";
import { useInstagram } from "@/contexts/shop-settings-context";

const BEHOLD_FEED_ID = "Mr4iBO03Jb1m1NL5S20x";

export function InstagramSection() {
  const ig = useInstagram();
  const { t } = useLanguage();

  return (
    <section className="section-pad bg-[#111111]">
      <div className="page-shell">
        <SectionHeading
          kicker={t.instagram.kicker}
          title={t.instagram.title(ig.handle)}
          description={t.instagram.desc}
        />

        <Script src="https://w.behold.so/widget.js" strategy="lazyOnload" />
        {/* @ts-expect-error custom element */}
        <behold-widget feed-id={BEHOLD_FEED_ID} />

        <a
          href={ig.url}
          target="_blank"
          rel="noreferrer"
          className="button-secondary mt-8 px-6"
        >
          {t.instagram.cta(ig.handle)}
        </a>
      </div>
    </section>
  );
}
