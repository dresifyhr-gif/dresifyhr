"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState, type MouseEvent } from "react";
import { Home, MessageCircle, Shirt, ShoppingBag, User, type LucideIcon } from "lucide-react";

import { useCart } from "@/components/providers/cart-provider";
import { useCartBadge } from "@/components/site/fly-to-cart";
import { useLanguage } from "@/contexts/language-context";
import { useWhatsAppUrl } from "@/contexts/shop-settings-context";

import { F_BASE, F_BNAV_H } from "./f-css";
import { useOpenCartDrawer } from "./cart/cart-drawer";
import { CART_PAGE, CATALOG_PAGE } from "./cart/cart-css";

/* ------------------------------------------------------------------ */
/*  FINAL — donja traka (samo mobitel; računalo ima gornju navigaciju). */
/*  Puna #0a0a0a ploha + hairline gore, gole ikone 1,5 px s malim        */
/*  natpisima. Aktivno: bijelo + sitna limeta točka. Bez zamućenja, bez  */
/*  izdignutog kruga. Safe-area za iPhone (traka za povratak na početni). */
/*  Početna/Dresovi: aktivno prema tome je li katalog (#dresovi) na      */
/*  ekranu.                                                              */
/* ------------------------------------------------------------------ */

type Key = "home" | "catalog" | "cart" | "account";

export function FBottomNav() {
  const { itemCount } = useCart();
  const { count, ref, tick } = useCartBadge(itemCount);
  const openCart = useOpenCartDrawer();
  const [inCatalog, setInCatalog] = useState(false);
  const en = useLanguage().locale === "en";
  const wa = useWhatsAppUrl();

  const path = (usePathname() ?? "/").replace(/\/$/, "");
  const active: Key | null =
    path === "" ? (inCatalog ? "catalog" : "home")
    : path.startsWith("/dresovi") || path === "/kompleti" || path === "/trenirke" || path === "/streetwear" ? "catalog"
    : path.startsWith("/racun") ? "account"
    : null;

  useEffect(() => {
    const el = document.getElementById("dresovi");
    if (!el) {
      setInCatalog(false);
      return;
    }
    const on = () => {
      const r = el.getBoundingClientRect();
      setInCatalog(r.top < window.innerHeight * 0.5);
    };
    on();
    window.addEventListener("scroll", on, { passive: true });
    window.addEventListener("resize", on);
    return () => {
      window.removeEventListener("scroll", on);
      window.removeEventListener("resize", on);
    };
  }, [path]);

  // Igor 19.11.: u igrama donja traka prekriva "Pokreni igru" — igre su preko cijelog ekrana, bez donje trake (hub /igre ostaje s njom)
  if (/^\/(igra|zongliranje|kviz|pehar|kolo)(\/|$)/.test(path)) return null;

  return (
    <nav
      aria-label={en ? "Bottom navigation" : "Donja navigacija"}
      className="f-bnav fixed inset-x-0 bottom-0 z-40 border-t border-[#ffffff14] bg-[#0a0a0a] lg:hidden"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <ul className="grid grid-cols-5" style={{ height: F_BNAV_H }}>
        <Item href={`${F_BASE}/`} label={en ? "Home" : "Početna"} icon={Home} on={active === "home"} onClick={(e) => scrollTopIfHere(e)} />
        <Item href={CATALOG_PAGE} label={en ? "Jerseys" : "Dresovi"} icon={Shirt} on={active === "catalog"} />
        <li>
          <Link href={CART_PAGE} onClick={openCart} aria-label={en ? (count ? `Cart, ${count} items` : "Cart") : count ? `Košarica, ${count} u košarici` : "Košarica"} className="flex h-full flex-col items-center justify-center gap-[5px] text-white/55 active:text-white">
            <span className="relative flex">
              <span data-cart-target className="inline-flex">
                <ShoppingBag strokeWidth={1.5} className="h-[22px] w-[22px]" />
              </span>
              {count ? (
                <span ref={ref} aria-hidden className="absolute -right-3 -top-1.5 min-w-[14px] text-[11px] font-semibold leading-none tabular-nums text-[#e8ff3c]">
                  <span key={tick} className="inline-block">
                    {count > 99 ? "99+" : count}
                  </span>
                </span>
              ) : null}
            </span>
            <span className="text-[10.5px] leading-none tracking-[0.01em]">{en ? "Cart" : "Košarica"}</span>
          </Link>
        </li>
        <Item href="/racun/" label={en ? "Account" : "Račun"} icon={User} on={active === "account"} />
        <li>
          <a
            href={`${wa}?text=${encodeURIComponent(en ? "Hi, I have a question." : "Pozdrav, imam pitanje.")}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex h-full flex-col items-center justify-center gap-[5px] text-white/55 active:text-white"
          >
            <MessageCircle strokeWidth={1.5} className="h-[22px] w-[22px]" />
            <span className="text-[10.5px] leading-none tracking-[0.01em]">WhatsApp</span>
          </a>
        </li>
      </ul>
    </nav>
  );
}

function scrollTopIfHere(e: MouseEvent) {
  if (window.location.pathname.replace(/\/$/, "") === F_BASE) {
    e.preventDefault();
    window.scrollTo({ top: 0, behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" });
  }
}

function Item({
  href,
  label,
  icon: Icon,
  on,
  onClick,
}: {
  href: string;
  label: string;
  icon: LucideIcon;
  on: boolean;
  onClick?: (e: MouseEvent) => void;
}) {
  return (
    <li>
      <Link
        href={href}
        onClick={onClick}
        aria-current={on ? "page" : undefined}
        className={`relative flex h-full flex-col items-center justify-center gap-[5px] transition-colors ${on ? "text-white" : "text-white/55 active:text-white"}`}
      >
        {on ? <span aria-hidden className="absolute -top-px left-[30%] right-[30%] h-px bg-[linear-gradient(90deg,rgba(232,255,60,0),#e8ff3c,rgba(232,255,60,0))]" /> : null}
        <Icon strokeWidth={1.5} className={`h-[22px] w-[22px] ${on ? "text-[#e8ff3c] drop-shadow-[0_0_5px_rgba(232,255,60,.45)]" : ""}`} />
        <span className="text-[10.5px] leading-none tracking-[0.01em]">{label}</span>
        <span aria-hidden className={`absolute bottom-[5px] h-[3px] w-[3px] rounded-full bg-[#e8ff3c] shadow-[0_0_6px_1px_rgba(232,255,60,.55)] transition-opacity ${on ? "opacity-100" : "opacity-0"}`} />
      </Link>
    </li>
  );
}
