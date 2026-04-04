"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { Menu, ShoppingBag, X } from "lucide-react";

import { useCart } from "@/components/providers/cart-provider";

const NAV_ITEMS = [
  { href: "/", label: "POČETNA" },
  { href: "/dresovi", label: "DRESOVI" },
  { href: "/blog", label: "BLOG" },
  { href: "/kontakt", label: "KONTAKT" },
  { href: "/o-nama", label: "O NAMA" },
] as const;

export function Navbar() {
  const pathname = usePathname();
  const { itemCount, openDrawer } = useCart();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  useEffect(() => {
    setIsMenuOpen(false);
  }, [pathname]);

  useEffect(() => {
    document.body.style.overflow = isMenuOpen ? "hidden" : "";

    return () => {
      document.body.style.overflow = "";
    };
  }, [isMenuOpen]);

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
                  className={`text-sm font-semibold uppercase tracking-[0.3em] transition-all duration-200 ease-out ${
                    isActive ? "text-accent" : "text-white hover:text-accent"
                  }`}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={openDrawer}
              className="relative inline-flex h-11 w-11 items-center justify-center border border-white/10 bg-[#111111] text-white transition-all duration-200 ease-out hover:border-accent hover:text-accent"
              aria-label="Otvori košaricu"
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
              aria-label="Otvori izbornik"
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
                  aria-label="Zatvori izbornik"
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
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </>
  );
}
