"use client";

import { useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { House, Shirt, ShoppingBag, User } from "lucide-react";

import { useWhatsAppUrl } from "@/contexts/shop-settings-context";
import { useCart } from "@/components/providers/cart-provider";

// Donja navigacija u stilu aplikacije — samo mobitel (md:hidden).
// Puna crna pozadina, bez blura (vidi pravila brzine). Visinu javlja kroz
// html[data-bnav="1"] → globals.css postavlja --bnav-h (60px), pa se plutajući
// gumb, obavijest o narudžbi, kolačići i donji razmak stranice dignu iznad nje.

// Stranice s vlastitom donjom trakom ili tokom kupnje — tu je nema.
const HIDDEN_PREFIXES = ["/dres/", "/kosarica", "/checkout", "/zahvala", "/admin", "/prijava", "/registracija"];

const CATALOG_PREFIXES = ["/dresovi", "/kompleti", "/trenirke", "/streetwear"];

function normalize(path: string | null): string {
  if (!path) return "/";
  return path.length > 1 && path.endsWith("/") ? path.slice(0, -1) : path;
}

export function isBottomNavHidden(path: string | null): boolean {
  const p = normalize(path);
  return HIDDEN_PREFIXES.some((h) => (h.endsWith("/") ? p.startsWith(h) : p === h || p.startsWith(`${h}/`)));
}

type Item = { href: string; label: string; icon: typeof House; match: (p: string) => boolean };

const WA_PATH = "M17.47 14.38c-.3-.15-1.75-.86-2.02-.96-.27-.1-.47-.15-.67.15-.2.3-.77.96-.94 1.16-.17.2-.35.22-.64.07-.3-.15-1.26-.46-2.39-1.47-.88-.79-1.48-1.76-1.65-2.06-.17-.3-.02-.46.13-.6.13-.13.3-.35.45-.52.15-.17.2-.3.3-.5.1-.2.05-.37-.02-.52-.07-.15-.67-1.61-.92-2.21-.24-.58-.49-.5-.67-.51h-.57c-.2 0-.52.07-.79.37-.27.3-1.04 1.02-1.04 2.48s1.07 2.88 1.21 3.08c.15.2 2.1 3.2 5.08 4.49.71.31 1.26.49 1.69.63.71.23 1.36.2 1.87.12.57-.09 1.75-.72 2-1.41.25-.69.25-1.29.17-1.41-.07-.12-.27-.2-.57-.35zM12.05 21.5h-.01a9.4 9.4 0 0 1-4.8-1.31l-.34-.2-3.57.94.95-3.48-.22-.36a9.43 9.43 0 0 1-1.44-5.03c0-5.2 4.24-9.44 9.45-9.44 2.52 0 4.89.98 6.67 2.77a9.38 9.38 0 0 1 2.76 6.68c0 5.2-4.24 9.43-9.45 9.43zm8.04-17.48A11.3 11.3 0 0 0 12.05.7C5.78.7.68 5.8.68 12.06c0 2 .52 3.96 1.52 5.68L.58 23.5l5.9-1.55a11.33 11.33 0 0 0 5.57 1.42h.01c6.26 0 11.36-5.1 11.37-11.36 0-3.04-1.18-5.89-3.34-8z";

const ITEMS: Item[] = [
  { href: "/", label: "Početna", icon: House, match: (p) => p === "/" },
  { href: "/dresovi/", label: "Dresovi", icon: Shirt, match: (p) => CATALOG_PREFIXES.some((c) => p === c || p.startsWith(`${c}/`)) },
  { href: "/racun/", label: "Račun", icon: User, match: (p) => p === "/racun" || p.startsWith("/racun/") }
];

export function BottomNav() {
  const pathname = usePathname();
  const whatsappUrl = useWhatsAppUrl();
  const { itemCount, openDrawer } = useCart();
  const hidden = isBottomNavHidden(pathname);
  const p = normalize(pathname);

  useEffect(() => {
    const root = document.documentElement;
    if (hidden) delete root.dataset.bnav;
    else root.dataset.bnav = "1";
    return () => { delete root.dataset.bnav; };
  }, [hidden]);

  if (hidden) return null;

  return (
    <nav
      aria-label="Glavna navigacija"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-white/10 bg-[#0a0a0a] pb-[env(safe-area-inset-bottom)] md:hidden"
    >
      <ul className="mx-auto grid h-[60px] max-w-md grid-cols-5">
        {ITEMS.map((item, idx) => {
          const active = item.match(p);
          const Icon = item.icon;
          const wa = idx === 2 ? (
            <li key="whatsapp" className="min-w-0">
              <a
                href={whatsappUrl}
                target="_blank"
                rel="noreferrer"
                aria-label="Piši nam na WhatsApp"
                className="flex h-full flex-col items-center justify-center gap-1 text-[10px] font-medium leading-none tracking-[0.02em] text-white/55 active:text-white"
              >
                <span className="flex h-8 w-12 items-center justify-center rounded-full bg-[#25D366]/10 ring-1 ring-[#25D366]/50">
                  <svg viewBox="0 0 24 24" aria-hidden="true" className="h-[18px] w-[18px] fill-[#25D366]"><path d={WA_PATH} /></svg>
                </span>
                <span className="max-w-full truncate px-0.5">WhatsApp</span>
              </a>
            </li>
          ) : null;
          const cart = idx === 2 ? (
            <li key="kosarica" className="min-w-0">
              <button
                type="button"
                onClick={openDrawer}
                aria-label={`Košarica (${itemCount})`}
                className="flex h-full w-full flex-col items-center justify-center gap-1 text-[10px] font-medium leading-none tracking-[0.02em] text-white/55 active:text-white"
              >
                <span className="relative flex h-8 items-center justify-center">
                  <ShoppingBag strokeWidth={1.5} className="h-[22px] w-[22px]" />
                  {itemCount > 0 ? (
                    <span className="absolute -right-2.5 top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-accent px-1 text-[9px] font-bold leading-none text-black">
                      {itemCount > 99 ? "99+" : itemCount}
                    </span>
                  ) : null}
                </span>
                <span className="max-w-full truncate px-0.5">Košarica</span>
              </button>
            </li>
          ) : null;
          return [wa, cart, (
            <li key={item.href} className="min-w-0">
              <Link
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={`flex h-full flex-col items-center justify-center gap-1 text-[10px] font-medium leading-none tracking-[0.02em] transition-colors ${
                  active ? "text-accent" : "text-white/55 active:text-white"
                }`}
              >
                {(
                  <span className="relative flex h-8 items-center justify-center">
                    <Icon strokeWidth={1.5} className="h-[22px] w-[22px]" />
                  </span>
                )}
                <span className="max-w-full truncate px-0.5">{item.label}</span>
              </Link>
            </li>
          )];
        })}
      </ul>
    </nav>
  );
}
