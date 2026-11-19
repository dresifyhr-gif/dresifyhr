"use client";

import Link from "next/link";

import { Wordmark } from "@/components/clean-demo/d/d-chrome";
import { useLanguage } from "@/contexts/language-context";
import { useWhatsAppUrl } from "@/contexts/shop-settings-context";
import { INSTAGRAM_URL } from "@/lib/site";
import type { Locale } from "@/lib/i18n";

/* E — tiho podnožje u četiri stupca (iz UI1): znak + rečenica · Trgovina · Pomoć · Kontakt.
   Prave rute: isti interni linkovi kao staro podnožje (popularne kolekcije, pravila
   privatnosti, igre) — podnožje je na svakoj stranici, pa nosi dio unutarnjeg povezivanja.
   Dolje HR/EN prekidač (isti kolačić kao stara traka). */

type L = { hr: string; en: string; href: string };
const SHOP: L[] = [
  { hr: "Dresovi", en: "Jerseys", href: "/dresovi/" },
  { hr: "Kompleti", en: "Kits", href: "/kompleti/" },
  { hr: "Trenirke", en: "Tracksuits", href: "/trenirke/" },
  { hr: "Streetwear", en: "Streetwear", href: "/streetwear/" },
  // Igor 19.11.: bez poveznice "Složi svoj mix" — svaka stranica dresa već nudi loptu i kapu (ruta /slozi-mix ostaje).
];
// Isto kao seoFooterLinks u starom podnožju (components/site/footer.tsx).
const POPULAR: L[] = [
  { hr: "Barcelona dresovi", en: "Barcelona dresovi", href: "/dresovi/klub/fc-barcelona/" },
  { hr: "Real Madrid dresovi", en: "Real Madrid dresovi", href: "/dresovi/klub/real-madrid/" },
  { hr: "Messi dresovi", en: "Messi dresovi", href: "/dresovi/igrac/messi/" },
  { hr: "Ronaldo dresovi", en: "Ronaldo dresovi", href: "/dresovi/igrac/ronaldo/" },
  { hr: "Retro dresovi", en: "Retro dresovi", href: "/dresovi/kategorija/retro-dresovi/" },
];
const HELP: L[] = [
  { hr: "Dostava i zamjena", en: "Delivery & exchange", href: "/dostava-i-povrat/" },
  { hr: "Moj račun", en: "My account", href: "/racun/" },
  { hr: "Favoriti", en: "Favourites", href: "/favoriti/" },
  { hr: "Mini igre", en: "Mini games", href: "/igre/" },
  { hr: "Pravila privatnosti", en: "Privacy policy", href: "/pravila-privatnosti/" },
];

export function EFooter() {
  const { locale, setLocale } = useLanguage();
  const wa = useWhatsAppUrl();
  const en = locale === "en";
  const col = "text-[12px] text-[#e8ff3ccc]";
  const link = "block py-1.5 text-[14.5px] text-white/70 transition-colors hover:text-[#e8ff3c]";
  const list = (items: L[]) => (
    <ul className="mt-3">
      {items.map((l) => (
        <li key={l.href}>
          <Link href={l.href} className={link}>
            {en ? l.en : l.hr}
          </Link>
        </li>
      ))}
    </ul>
  );
  return (
    <footer className="relative border-t border-[#ffffff12] bg-[#0a0a0a]">
      {/* neon: gornja linija = nit limete koja se gubi prema rubovima */}
      <span aria-hidden className="pointer-events-none absolute inset-x-0 -top-px h-px bg-[linear-gradient(90deg,rgba(232,255,60,0),#e8ff3c_50%,rgba(232,255,60,0))] shadow-[0_0_12px_rgba(232,255,60,.4)]" />
      <div className="mx-auto grid max-w-[1280px] grid-cols-2 gap-x-6 gap-y-10 px-4 py-14 sm:px-8 lg:grid-cols-[1.4fr_1fr_1fr_1fr_1fr] lg:gap-10">
        <div className="col-span-2 lg:col-span-1">
          <Wordmark size={30} />
          <p className="mt-4 max-w-[280px] text-[14px] leading-relaxed text-white/45">
            {en
              ? "Football jerseys of clubs and national teams. Delivery across Croatia, cash on delivery."
              : "Nogometni dresovi klubova i reprezentacija. Dostava po Hrvatskoj, plaćanje pouzećem."}
          </p>
        </div>
        <nav aria-label={en ? "Shop" : "Trgovina"}>
          <p className={col}>{en ? "Shop" : "Trgovina"}</p>
          {list(SHOP)}
        </nav>
        <nav aria-label={en ? "Popular" : "Popularno"}>
          <p className={col}>{en ? "Popular" : "Popularno"}</p>
          {list(POPULAR)}
        </nav>
        <nav aria-label={en ? "Help" : "Pomoć"}>
          <p className={col}>{en ? "Help" : "Pomoć"}</p>
          {list(HELP)}
        </nav>
        <div>
          <p className={col}>{en ? "Contact" : "Kontakt"}</p>
          <ul className="mt-3">
            <li>
              <a href={`${wa}?text=${encodeURIComponent(en ? "Hi, I have a question." : "Pozdrav, imam pitanje.")}`} target="_blank" rel="noopener noreferrer" className={link}>
                WhatsApp
              </a>
            </li>
            <li>
              <a href={INSTAGRAM_URL} target="_blank" rel="noopener noreferrer" className={link}>
                Instagram
              </a>
            </li>
            <li>
              <Link href="/kontakt/" className={link}>
                {en ? "Contact" : "Kontakt"}
              </Link>
            </li>
            {/* isto kao NAV_LINKS u starom podnožju (lib/site.ts): Blog i O nama na svakoj stranici */}
            <li>
              <Link href="/blog/" className={link}>
                Blog
              </Link>
            </li>
            <li>
              <Link href="/o-nama/" className={link}>
                {en ? "About us" : "O nama"}
              </Link>
            </li>
          </ul>
        </div>
      </div>
      <div className="mx-auto flex max-w-[1280px] flex-col gap-3 border-t border-[#ffffff0d] px-4 py-6 text-[12.5px] text-white/35 sm:flex-row sm:items-center sm:justify-between sm:px-8">
        <span>© Dresify</span>
        <div className="flex items-center gap-6">
          <span>{en ? "Cash on delivery · Delivery 2–5 days" : "Plaćanje pouzećem · Dostava 2–5 dana"}</span>
          <LangSwitch locale={locale} setLocale={setLocale} />
        </div>
      </div>
    </footer>
  );
}

/** HR / EN — isti LanguageProvider (kolačić dresify_locale) kao stara traka. */
export function LangSwitch({ locale, setLocale, className = "" }: { locale: Locale; setLocale: (l: Locale) => void; className?: string }) {
  return (
    <div role="group" aria-label="Jezik / Language" className={`flex items-center gap-1 ${className}`}>
      {(["hr", "en"] as const).map((l) => (
        <button
          key={l}
          type="button"
          onClick={() => setLocale(l)}
          aria-pressed={locale === l}
          className={`h-8 px-1.5 text-[12px] font-semibold uppercase tracking-[0.14em] transition-colors ${locale === l ? "text-white" : "text-white/35 hover:text-white/70"}`}
        >
          {l}
        </button>
      ))}
    </div>
  );
}
