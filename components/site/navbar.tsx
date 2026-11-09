"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { Menu, ShoppingBag, User, X } from "lucide-react";
import { SignedIn, SignedOut } from "@clerk/nextjs";

import { useCart } from "@/components/providers/cart-provider";
import { useLanguage } from "@/contexts/language-context";
import { SearchOverlay } from "@/components/site/search-overlay";
import type { Locale } from "@/lib/i18n";

export function Navbar() {
  const pathname = usePathname();
  const { itemCount, openDrawer } = useCart();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const { t, locale, setLocale } = useLanguage();

  // Gornji izbornik je fokusiran na kupnju. "Početna" izbačena (logo vodi doma),
  // "Nagradna igra" je već u žutoj PS5 traci ispod, a "O nama" je u footeru —
  // tako se izbornik ne lomi u dva reda i djeluje prozračnije.
  const NAV_ITEMS = [
    { href: "/dresovi", label: t.nav.jerseys },
    { href: "/kompleti", label: t.nav.sets },
    { href: "/trenirke", label: "Trenirke" },
    { href: "/streetwear", label: "Streetwear" },
    { href: "/kontakt", label: t.nav.contact },
  ];

  useEffect(() => {
    setIsMenuOpen(false);
  }, [pathname]);

  useEffect(() => {
    document.body.style.overflow = isMenuOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [isMenuOpen]);

  const handleLocale = (next: Locale) => {
    setLocale(next);
    setIsMenuOpen(false);
    // Reload so server components re-render in the new language
    window.location.reload();
  };

  const iconBtn =
    "inline-flex h-11 w-11 items-center justify-center text-fg transition-colors duration-200 ease-out hover:text-accent";
  const cartButton = (
    <button type="button" onClick={openDrawer} className={`relative ${iconBtn}`} aria-label={t.nav.openCart}>
      <ShoppingBag className="h-[21px] w-[21px]" strokeWidth={1.8} />
      {itemCount > 0 ? (
        <span className="absolute right-1 top-1.5 flex h-[16px] min-w-[16px] items-center justify-center rounded-full bg-accent px-1 text-[9px] font-black leading-none text-black">
          {itemCount}
        </span>
      ) : null}
    </button>
  );
  const accountLink = (
    <>
      <SignedOut>
        <Link href="/prijava" className={iconBtn} aria-label="Prijava" title="Prijava / Registracija">
          <User className="h-[21px] w-[21px]" strokeWidth={1.8} />
        </Link>
      </SignedOut>
      <SignedIn>
        <Link href="/racun" className={iconBtn} aria-label="Moj profil" title="Moj Dresify">
          <User className="h-[21px] w-[21px]" strokeWidth={1.8} />
        </Link>
      </SignedIn>
    </>
  );
  const logo = (
    <Link href="/" className="font-display text-[1.6rem] uppercase leading-none tracking-[0.02em] text-fg md:text-[1.85rem]" aria-label="Dresify — početna">
      DRESIFY<span className="text-accent">.</span>
    </Link>
  );

  return (
    <>
      <header
        className="sticky z-40 border-b border-white/10 bg-ink"
        style={{ top: "var(--announcement-offset, 0px)" }}
      >
        {/* MOBILE: ☰ lijevo · logo u sredini · traži + račun + košarica desno */}
        <div className="grid h-14 grid-cols-[1fr_auto_1fr] items-center px-2 md:hidden">
          <div className="flex items-center justify-self-start">
            <button
              type="button"
              onClick={() => setIsMenuOpen(true)}
              className={iconBtn}
              aria-label={t.nav.openMenu}
            >
              <Menu className="h-6 w-6" strokeWidth={1.8} />
            </button>
          </div>

          <div className="justify-self-center">{logo}</div>

          <div className="flex items-center justify-self-end">
            <SearchOverlay />
            {accountLink}
            {cartButton}
          </div>
        </div>

        {/* DESKTOP: logo lijevo · navigacija · jezik + pretraga + račun + košarica desno */}
        <div className="page-shell hidden h-[68px] items-center justify-between gap-4 md:flex">
          {logo}

          <nav className="flex items-center gap-8 lg:gap-10">
            {NAV_ITEMS.map((item) => {
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`relative whitespace-nowrap py-2 text-[12px] font-black uppercase tracking-[0.14em] transition-colors duration-200 ease-out ${
                    isActive ? "text-accent" : "text-fg hover:text-accent"
                  }`}
                >
                  {item.label}
                  {isActive ? <span className="absolute inset-x-0 -bottom-[3px] h-[2px] bg-accent" /> : null}
                </Link>
              );
            })}
          </nav>

          <div className="flex items-center gap-1">
            {/* Language switcher */}
            <div className="mr-2 flex items-center">
              {(["hr", "en"] as Locale[]).map((l, i) => (
                <button
                  key={l}
                  type="button"
                  onClick={() => handleLocale(l)}
                  className={`h-8 px-2.5 text-[11px] font-bold uppercase tracking-[0.16em] transition-colors duration-200 ease-out ${
                    locale === l ? "text-accent" : "text-white/40 hover:text-white/70"
                  } ${i === 0 ? "border-r border-white/10" : ""}`}
                >
                  {l.toUpperCase()}
                </button>
              ))}
            </div>

            <SearchOverlay />
            {accountLink}
            {cartButton}
          </div>
        </div>
      </header>

      <AnimatePresence>
        {isMenuOpen ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-ink md:hidden"
          >
            <div className="page-shell flex h-full flex-col py-6">
              <div className="flex items-center justify-between border-b border-white/10 pb-5">
                {logo}
                <button
                  type="button"
                  onClick={() => setIsMenuOpen(false)}
                  className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-white/[0.18] text-fg"
                  aria-label={t.nav.closeMenu}
                >
                  <X className="h-[18px] w-[18px]" />
                </button>
              </div>

              <nav className="flex flex-1 flex-col justify-center gap-1">
                {NAV_ITEMS.map((item, i) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    className="flex items-baseline gap-4 border-b border-white/10 py-3 font-display text-[2.6rem] uppercase leading-[0.95] text-fg transition-colors duration-200 ease-out hover:text-accent"
                  >
                    <span className="w-7 text-[11px] font-black not-italic tracking-[0.16em] text-mute" style={{ fontFamily: "var(--font-archivo)" }}>
                      {String(i + 1).padStart(2, "0")}
                    </span>
                    {item.label}
                  </Link>
                ))}
              </nav>

              {/* Language switcher — mobile */}
              <div className="flex items-center gap-4 border-t border-white/10 pt-6">
                {(["hr", "en"] as Locale[]).map((l) => (
                  <button
                    key={l}
                    type="button"
                    onClick={() => handleLocale(l)}
                    className={`text-sm font-black uppercase tracking-[0.2em] transition-all duration-200 ease-out ${
                      locale === l ? "text-accent" : "text-white/35 hover:text-white/60"
                    }`}
                  >
                    {l.toUpperCase()}
                  </button>
                ))}
              </div>
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </>
  );
}
