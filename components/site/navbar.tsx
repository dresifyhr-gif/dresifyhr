"use client";

import { SantaHat } from "@/components/bozic/santa-hat";
import Link from "next/link";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { Heart, Menu, ShoppingBag, User, X } from "lucide-react";
import { SignedIn, SignedOut } from "@clerk/nextjs";

import { useCart } from "@/components/providers/cart-provider";
import { useWishlist } from "@/components/providers/wishlist-provider";
import { useLanguage } from "@/contexts/language-context";
import { useShopSettings } from "@/contexts/shop-settings-context";
import { SearchOverlay } from "@/components/site/search-overlay";
import { isBottomNavHidden } from "@/components/site/bottom-nav";
import type { Locale } from "@/lib/i18n";

export function Navbar() {
  const pathname = usePathname();
  const { itemCount, openDrawer } = useCart();
  const { count: favCount } = useWishlist();
  const navHidden = isBottomNavHidden(pathname);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const { t, locale, setLocale } = useLanguage();
  const { christmasOn } = useShopSettings();

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

  // Mobilni izbornik: prvo sezonske stavke (mix + pokloni), zatim kategorije.
  // "Pokloni po budžetu" postoji samo dok je božićna tema uključena (sekcija #pokloni na naslovnoj).
  const MOBILE_ITEMS = [
    { href: "/slozi-mix", label: locale === "en" ? "Build your mix" : "Složi svoj mix", accent: true },
    ...(christmasOn ? [{ href: "/#pokloni", label: locale === "en" ? "Gifts by budget" : "Pokloni po budžetu", accent: false }] : []),
    ...NAV_ITEMS.map((item) => ({ ...item, accent: false })),
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

  return (
    <>
      <header className="sticky top-0 z-40 border-b border-white/10 bg-[#0a0a0a]">
        {/* MOBILE (60px): izbornik + pretraga lijevo · logo u sredini · favoriti desno (košarica i račun su u donjoj traci) */}
        <div className="page-shell grid h-[60px] grid-cols-[1fr_auto_1fr] items-center gap-2 md:hidden">
          <div className="flex items-center gap-1 justify-self-start">
            <button
              type="button"
              onClick={() => setIsMenuOpen(true)}
              className="inline-flex h-11 w-11 items-center justify-center text-white transition-all duration-200 ease-out hover:text-accent"
              aria-label={t.nav.openMenu}
            >
              <Menu className="h-[18px] w-[18px]" />
            </button>
            <SearchOverlay />
          </div>

          <Link href="/" className="relative justify-self-center font-heading text-[2.1rem] uppercase leading-none text-white">
            <SantaHat />DRES<span className="text-accent">IFY</span>
          </Link>

          <div className="flex items-center gap-1 justify-self-end">
            <Link
              href="/favoriti/"
              className="relative inline-flex h-11 w-11 items-center justify-center text-white transition-all duration-200 ease-out hover:text-accent"
              aria-label="Favoriti"
              title="Favoriti"
            >
              <Heart className="h-[18px] w-[18px]" />
              {favCount > 0 ? (
                <span className="absolute right-0.5 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-accent px-1 text-[9px] font-bold leading-none text-black">
                  {favCount > 99 ? "99+" : favCount}
                </span>
              ) : null}
            </Link>
            {/* Košarica je u donjoj traci; gore samo gdje trake nema (dres, košarica, narudžba). */}
            {navHidden && (
              <button
                type="button"
                onClick={openDrawer}
                className="relative inline-flex h-11 w-11 items-center justify-center text-white transition-all duration-200 ease-out hover:text-accent"
                aria-label={t.nav.openCart}
              >
                <ShoppingBag className="h-[18px] w-[18px]" />
                <span className="absolute -right-2 -top-2 min-w-6 rounded-full bg-accent px-1.5 py-1 text-[11px] font-bold leading-none text-black">
                  {itemCount}
                </span>
              </button>
            )}
          </div>
        </div>

        {/* DESKTOP: logo lijevo · navigacija · jezik + pretraga + račun + košarica desno */}
        <div className="page-shell hidden h-[76px] items-center justify-between gap-4 md:flex">
          <Link href="/" className="relative font-heading text-[2.15rem] uppercase leading-none text-white">
            <SantaHat />DRES<span className="text-accent">IFY</span>
          </Link>

          <nav className="flex items-center gap-9">
            {NAV_ITEMS.map((item) => {
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`whitespace-nowrap text-sm font-semibold uppercase tracking-[0.3em] transition-all duration-200 ease-out ${
                    isActive ? "text-accent" : "text-white hover:text-accent"
                  }`}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>

          <div className="flex items-center gap-2">
            {/* Language switcher */}
            <div className="flex items-center gap-0">
              {(["hr", "en"] as Locale[]).map((l, i) => (
                <button
                  key={l}
                  type="button"
                  onClick={() => handleLocale(l)}
                  className={`h-8 px-2.5 text-[11px] font-semibold uppercase tracking-[0.2em] transition-all duration-200 ease-out ${
                    locale === l
                      ? "text-accent"
                      : "text-white/40 hover:text-white/70"
                  } ${i === 0 ? "border-r border-white/10" : ""}`}
                >
                  {l.toUpperCase()}
                </button>
              ))}
            </div>

            <SearchOverlay />

            <Link
              href="/favoriti/"
              className="relative inline-flex h-11 w-11 items-center justify-center text-white transition-all duration-200 ease-out hover:text-accent"
              aria-label="Favoriti"
              title="Favoriti"
            >
              <Heart className="h-[18px] w-[18px]" />
              {favCount > 0 ? (
                <span className="absolute right-0.5 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-accent px-1 text-[9px] font-bold leading-none text-black">
                  {favCount > 99 ? "99+" : favCount}
                </span>
              ) : null}
            </Link>
            <SignedOut>
              <Link
                href="/prijava"
                className="inline-flex h-11 w-11 items-center justify-center text-white transition-all duration-200 ease-out hover:text-accent"
                aria-label="Prijava"
                title="Prijava / Registracija"
              >
                <User className="h-[18px] w-[18px]" />
              </Link>
            </SignedOut>
            <SignedIn>
              <Link
                href="/racun"
                className="inline-flex h-11 w-11 items-center justify-center text-white transition-all duration-200 ease-out hover:text-accent"
                aria-label="Moj profil"
                title="Moj Dresify"
              >
                <User className="h-[18px] w-[18px]" />
              </Link>
            </SignedIn>

            <button
              type="button"
              onClick={openDrawer}
              className="relative inline-flex h-11 w-11 items-center justify-center text-white transition-all duration-200 ease-out hover:text-accent"
              aria-label={t.nav.openCart}
            >
              <ShoppingBag className="h-[18px] w-[18px]" />
              <span className="absolute -right-2 -top-2 min-w-6 rounded-full bg-accent px-1.5 py-1 text-[11px] font-bold leading-none text-black">
                {itemCount}
              </span>
            </button>
          </div>
        </div>
      </header>

      <AnimatePresence>
        {isMenuOpen ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-[#0a0a0a] md:hidden"
          >
            <div className="page-shell flex h-full flex-col overflow-y-auto pt-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))]">
              <div className="flex items-center justify-between border-b border-white/10 pb-3">
                <Link href="/" className="relative font-heading text-[2.1rem] uppercase leading-none text-white">
                  <SantaHat />DRES<span className="text-accent">IFY</span>
                </Link>
                <button
                  type="button"
                  onClick={() => setIsMenuOpen(false)}
                  className="inline-flex h-11 w-11 items-center justify-center border border-white/10 bg-[#111111] text-white"
                  aria-label={t.nav.closeMenu}
                >
                  <X className="h-[18px] w-[18px]" />
                </button>
              </div>

              <nav className="flex flex-col pt-4">
                {MOBILE_ITEMS.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setIsMenuOpen(false)}
                    className={`py-2 font-heading text-[2rem] uppercase leading-none transition-colors duration-200 ease-out ${
                      item.accent ? "text-accent" : pathname === item.href ? "text-accent" : "text-white hover:text-accent"
                    }`}
                  >
                    {item.label}
                  </Link>
                ))}
              </nav>

              <div className="mt-5 flex flex-wrap gap-x-5 gap-y-1 border-t border-white/10 pt-4 text-[15px] text-white/70">
                <Link href="/racun" onClick={() => setIsMenuOpen(false)} className="py-1.5 hover:text-accent">
                  {locale === "en" ? "My account" : "Moj račun"}
                </Link>
                <Link href="/dostava-i-povrat" onClick={() => setIsMenuOpen(false)} className="py-1.5 hover:text-accent">
                  {locale === "en" ? "Delivery & exchange" : "Dostava i zamjena"}
                </Link>
              </div>

              <p className="mt-3 text-[12px] text-white/40">
                {locale === "en" ? "Cash on delivery · 2–5 business days · Size exchange" : "Pouzeće · 2–5 radnih dana · Zamjena veličine"}
              </p>

              {/* Language switcher — mobile */}
              <div className="mt-3 flex items-center gap-1 border-t border-white/10 pt-3">
                {(["hr", "en"] as Locale[]).map((l) => (
                  <button
                    key={l}
                    type="button"
                    onClick={() => handleLocale(l)}
                    className={`inline-flex h-11 min-w-11 items-center justify-center px-2 font-heading text-xl uppercase tracking-[0.2em] transition-all duration-200 ease-out ${
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
