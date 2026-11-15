"use client";

import { useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Heart, House, Layers, Shirt, User } from "lucide-react";

import { useWishlist } from "@/components/providers/wishlist-provider";

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

const ITEMS: Item[] = [
  { href: "/", label: "Početna", icon: House, match: (p) => p === "/" },
  { href: "/dresovi/", label: "Dresovi", icon: Shirt, match: (p) => CATALOG_PREFIXES.some((c) => p === c || p.startsWith(`${c}/`)) },
  { href: "/slozi-mix/", label: "Složi mix", icon: Layers, match: (p) => p === "/slozi-mix" || p.startsWith("/slozi-mix/") },
  { href: "/favoriti/", label: "Favoriti", icon: Heart, match: (p) => p === "/favoriti" },
  { href: "/racun/", label: "Račun", icon: User, match: (p) => p === "/racun" || p.startsWith("/racun/") }
];

export function BottomNav() {
  const pathname = usePathname();
  const { count } = useWishlist();
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
        {ITEMS.map((item) => {
          const active = item.match(p);
          const Icon = item.icon;
          const center = item.href === "/slozi-mix/";
          const isFav = item.href === "/favoriti/";
          return (
            <li key={item.href} className="min-w-0">
              <Link
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={`flex h-full flex-col items-center justify-center gap-1 text-[10px] font-medium leading-none tracking-[0.02em] transition-colors ${
                  active ? "text-accent" : "text-white/55 active:text-white"
                }`}
              >
                {center ? (
                  <span
                    className={`flex h-8 w-12 items-center justify-center rounded-full transition-colors ${
                      active ? "bg-accent text-black" : "bg-accent/10 text-accent ring-1 ring-accent/40"
                    }`}
                  >
                    <Icon strokeWidth={1.75} className="h-[18px] w-[18px]" />
                  </span>
                ) : (
                  <span className="relative flex h-8 items-center justify-center">
                    <Icon strokeWidth={1.5} className={`h-[22px] w-[22px] ${isFav && active ? "fill-accent/20" : ""}`} />
                    {isFav && count > 0 ? (
                      <span className="absolute -right-2.5 top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-accent px-1 text-[9px] font-bold leading-none text-black">
                        {count > 99 ? "99+" : count}
                      </span>
                    ) : null}
                  </span>
                )}
                <span className="max-w-full truncate px-0.5">{item.label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
