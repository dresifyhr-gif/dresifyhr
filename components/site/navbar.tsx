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
    { href: "/streetwear", label: "Streetwear" },
    { href: "/blog", label: t.nav.blog },
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

  return (
    <>
      <header
        className="sticky z-40 border-b border-white/10 bg-[#0a0a0a]"
        style={{ top: "var(--announcement-offset, 0px)" }}
      >
        <div className="page-shell flex h-[76px] items-center justify-between gap-4">
          <Link href="/" className="font-heading text-[2.15rem] uppercase leading-none text-white">
            DRES<span className="text-accent">IFY</span>
          </Link>

          <nav className="hidden items-center gap-9 md:flex">
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
            <div className="hidden items-center gap-0 md:flex">
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

            <SignedOut>
              <Link
                href="/prijava"
                className="inline-flex h-11 w-11 items-center justify-center border border-white/10 bg-[#111111] text-white transition-all duration-200 ease-out hover:border-accent hover:text-accent"
                aria-label="Prijava"
                title="Prijava / Registracija"
              >
                <User className="h-5 w-5" />
              </Link>
            </SignedOut>
            <SignedIn>
              <Link
                href="/racun"
                className="inline-flex h-11 w-11 items-center justify-center border border-white/10 bg-[#111111] text-white transition-all duration-200 ease-out hover:border-accent hover:text-accent"
                aria-label="Moj profil"
                title="Moj Dresify"
              >
                <User className="h-5 w-5" />
              </Link>
            </SignedIn>

            <button
              type="button"
              onClick={openDrawer}
              className="relative inline-flex h-11 w-11 items-center justify-center border border-white/10 bg-[#111111] text-white transition-all duration-200 ease-out hover:border-accent hover:text-accent"
              aria-label={t.nav.openCart}
            >
              <ShoppingBag className="h-5 w-5" />
              <span className="absolute -right-2 -top-2 min-w-6 rounded-full bg-accent px-1.5 py-1 text-[11px] font-bold leading-none text-black">
                {itemCount}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setIsMenuOpen(true)}
              className="inline-flex h-11 w-11 items-center justify-center border border-white/10 bg-[#111111] text-white transition-all duration-200 ease-out hover:border-accent hover:text-accent md:hidden"
              aria-label={t.nav.openMenu}
            >
              <Menu className="h-5 w-5" />
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
            <div className="page-shell flex h-full flex-col py-6">
              <div className="flex items-center justify-between border-b border-white/10 pb-5">
                <Link href="/" className="font-heading text-[2.15rem] uppercase leading-none text-white">
                  DRES<span className="text-accent">IFY</span>
                </Link>
                <button
                  type="button"
                  onClick={() => setIsMenuOpen(false)}
                  className="inline-flex h-11 w-11 items-center justify-center border border-white/10 bg-[#111111] text-white"
                  aria-label={t.nav.closeMenu}
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <nav className="flex flex-1 flex-col justify-center gap-5">
                {NAV_ITEMS.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    className="font-heading text-[2.7rem] uppercase leading-[0.9] text-white transition-all duration-200 ease-out hover:text-accent"
                  >
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
                    className={`font-heading text-2xl uppercase tracking-[0.2em] transition-all duration-200 ease-out ${
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
