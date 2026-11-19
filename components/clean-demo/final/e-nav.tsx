"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { ArrowRight, ChevronLeft, Heart, ShoppingBag, User, X } from "lucide-react";

import { useCart } from "@/components/providers/cart-provider";
import { useWishlist } from "@/components/providers/wishlist-provider";
import { useLanguage } from "@/contexts/language-context";
import { FlyToCart, useCartBadge } from "@/components/site/fly-to-cart";
import { SearchOverlay } from "@/components/novi/search-overlay";

import { E_BASE, E_NAV_H, E_NAV_H_M, type EMega } from "./e-css";
import { closeProduct } from "./ime-transition";
import { FCartDrawer, useOpenCartDrawer } from "./cart/cart-drawer";
import { CART_PAGE, CATALOG_PAGE } from "./cart/cart-css";
import { LangSwitch } from "./e-footer";
import { useEText } from "./e-i18n";
import { XWordmark, XmasBar } from "./e-xmas";

/* ------------------------------------------------------------------ */
/*  E — navigacija dućana. Računalo: znak lijevo · rubrike u sredini    */
/*  (mala slova, običan rez — ne natječe se s golemim prezimenom;       */
/*  Dresovi otvara mega-izbornik s pravim kolekcijama) · gole ikone     */
/*  desno. Preko scene je prozirna (scena ide do vrha), na skrolu        */
/*  dobije punu #0a0a0a pozadinu i hairline. Mobitel: znak · pretraga ·  */
/*  košarica · izbornik (dvije crte) → puni ekran. Bez donjeg doka.      */
/* ------------------------------------------------------------------ */

// Trenirke i Streetwear: kartice kataloga u ovom demu (#trenirke / #streetwear).
// Kompleti, Kontakt, Favoriti, Košarica i Račun još vode na stranice živog dizajna.
// Prave rute: Trenirke i Streetwear vode na svoje stranice (SEO), ne na kartice naslovnice.
const LINKS_HR = [
  { label: "Kompleti", href: "/kompleti/" },
  { label: "Trenirke", href: "/trenirke/" },
  { label: "Streetwear", href: "/streetwear/" },
  { label: "Igre", href: "/igre/" },
  { label: "Kontakt", href: "/kontakt/" },
];
const LINKS_EN = [
  { label: "Kits", href: "/kompleti/" },
  { label: "Tracksuits", href: "/trenirke/" },
  { label: "Streetwear", href: "/streetwear/" },
  { label: "Games", href: "/igre/" },
  { label: "Contact", href: "/kontakt/" },
];

/** Aktivna rubrika po putanji (demo /cisto-demo/final/** = iste rute). Dresovi: katalog, hubovi
    i stranica dresa; Igre: hub i sve igre. */
const GAME_ROUTES = ["/igre", "/igra", "/kviz", "/pehar", "/zongliranje", "/kolo"];
function activeHref(pathname: string | null): string | null {
  const p = (pathname ?? "/").replace(/^\/cisto-demo\/final/, "").replace(/\/$/, "") || "/";
  const under = (base: string) => p === base || p.startsWith(`${base}/`);
  if (under("/dresovi") || under("/dres")) return CATALOG_PAGE;
  if (GAME_ROUTES.some(under)) return "/igre/";
  for (const href of ["/kompleti/", "/trenirke/", "/streetwear/", "/kontakt/"]) if (under(href.slice(0, -1))) return href;
  return null;
}

/** Favoriti s brojem (isto kao stara traka): broj sjedi na ikoni, ikone se ne pomaknu. */
function FavLink({ label }: { label: string }) {
  const { count } = useWishlist();
  return (
    <Link href="/favoriti/" aria-label={count ? `${label}, ${count}` : label} className="relative flex h-10 w-10 items-center justify-center text-white/80 transition-colors hover:text-white">
      <span className="relative inline-flex">
        <Heart strokeWidth={1.5} className="h-[20px] w-[20px]" />
        {count ? (
          <span className="absolute -right-[9px] -top-[7px] min-w-[16px] text-center text-[11.5px] font-semibold leading-[16px] tabular-nums text-[#e8ff3c]">{count > 99 ? "99+" : count}</span>
        ) : null}
      </span>
    </Link>
  );
}

/** Već smo na naslovnici demoa: kartica kataloga (#trenirke, #streetwear) preko pravog hashchange. */
function sameHash(e: { preventDefault: () => void; metaKey?: boolean; ctrlKey?: boolean }, href: string) {
  const [path, hash] = href.split("#");
  if (!hash || e.metaKey || e.ctrlKey) return;
  if (window.location.pathname.replace(/\/$/, "") !== path.replace(/\/$/, "")) return;
  e.preventDefault();
  if (window.location.hash === `#${hash}`) window.dispatchEvent(new HashChangeEvent("hashchange"));
  else window.location.hash = hash;
}

function useNoGlobalBottomNav() {
  useEffect(() => {
    const el = document.documentElement;
    el.removeAttribute("data-bnav");
    const mo = new MutationObserver(() => el.hasAttribute("data-bnav") && el.removeAttribute("data-bnav"));
    mo.observe(el, { attributes: true, attributeFilter: ["data-bnav"] });
    return () => mo.disconnect();
  }, []);
}

/** Košarica: isti broj na svim stranicama (useCart), značka čeka let proizvoda (FlyToCart). */
export function CartLink({ className = "" }: { className?: string }) {
  const { itemCount } = useCart();
  const tx = useEText();
  const { count, ref, tick } = useCartBadge(itemCount);
  const openCart = useOpenCartDrawer();
  return (
    <Link
      href={CART_PAGE}
      onClick={openCart}
      aria-label={count ? tx.cartCount(count) : tx.cart}
      className={`relative flex h-10 w-10 items-center justify-center text-white/80 transition-colors hover:text-white ${className}`}
    >
      <span data-cart-target className="relative inline-flex">
        <ShoppingBag strokeWidth={1.5} className="h-[20px] w-[20px]" />
        {/* broj sjedi na ikoni (apsolutno) → ikone se ne pomaknu kad se pojavi */}
        {count ? (
          <span ref={ref} className="absolute -right-[9px] -top-[7px] min-w-[16px] text-center text-[11.5px] font-semibold leading-[16px] tabular-nums text-[#e8ff3c]">
            <span key={tick} className="inline-block">
              {count > 99 ? "99+" : count}
            </span>
          </span>
        ) : null}
      </span>
    </Link>
  );
}

/** back: stranica dresa — strelica natrag na mobitelu (isti prijelaz kao demo "ime"). */
export function ENav({ mega, back, solid: solidProp = false }: { mega: EMega; back?: string; solid?: boolean }) {
  const router = useRouter();
  const { locale, setLocale } = useLanguage();
  const en = locale === "en";
  const tx = useEText();
  const LINKS = en ? LINKS_EN : LINKS_HR;
  const current = activeHref(usePathname());
  const [open, setOpen] = useState(false);
  const [sheet, setSheet] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const closeT = useRef<ReturnType<typeof setTimeout> | null>(null);
  useNoGlobalBottomNav();

  useEffect(() => {
    let raf = 0;
    const on = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => setScrolled(window.scrollY > 24));
    };
    on();
    window.addEventListener("scroll", on, { passive: true });
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("scroll", on);
    };
  }, []);
  // stranica dresa: puna traka od vrha (ispod nje nema scene)
  // ostale stranice (bez scene ispod): puna traka od vrha
  const solid = scrolled || open || !!back || solidProp;

  useEffect(() => {
    if (!open && !sheet) return;
    const k = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
        setSheet(false);
      }
    };
    window.addEventListener("keydown", k);
    return () => window.removeEventListener("keydown", k);
  }, [open, sheet]);

  useEffect(() => {
    document.documentElement.style.overflow = sheet ? "hidden" : "";
    return () => {
      document.documentElement.style.overflow = "";
    };
  }, [sheet]);

  const enter = () => {
    if (closeT.current) clearTimeout(closeT.current);
    setOpen(true);
  };
  const leave = () => {
    if (closeT.current) clearTimeout(closeT.current);
    closeT.current = setTimeout(() => setOpen(false), 140);
  };

  return (
    <>
    <FlyToCart />
    <FCartDrawer />
    <header
      className={`e-nav ime-header fixed inset-x-0 top-0 z-50 border-b transition-[background-color,border-color] duration-300 ease-out ${
        solid ? "border-[#ffffff14] bg-[#0a0a0a]" : "border-transparent bg-transparent"
      }`}
      style={{ paddingTop: "env(safe-area-inset-top)" }}
      onMouseLeave={leave}
    >
      {/* božićna traka (Postavke → Božićna tema): iznad navigacije, na skrolu se sklopi */}
      <XmasBar hidden={scrolled} />
      {/* ---------- računalo ---------- */}
      <div className="mx-auto hidden max-w-[1680px] grid-cols-[1fr_auto_1fr] items-center px-10 lg:grid" style={{ height: E_NAV_H }}>
        <Link href={`${E_BASE}/`} aria-label={tx.homeAria} className="justify-self-start">
          <XWordmark size={32} />
        </Link>

        <nav aria-label={tx.mainNav}>
          <ul className="flex items-center gap-9 text-[13px] font-semibold uppercase tracking-[0.14em]">
            <li onMouseEnter={enter}>
              <Link
                href={CATALOG_PAGE}
                data-open={open}
                aria-expanded={open}
                aria-haspopup="true"
                onFocus={enter}
                aria-current={current === CATALOG_PAGE ? "page" : undefined}
                className={`e-link transition-colors hover:text-white ${current === CATALOG_PAGE ? "text-white" : "text-white/75"}`}
              >
                {en ? "Jerseys" : "Dresovi"}
              </Link>
            </li>
            {LINKS.map((l) => (
              <li key={l.href} onMouseEnter={leave}>
                <Link
                  href={l.href}
                  onClick={(e) => sameHash(e, l.href)}
                  aria-current={current === l.href ? "page" : undefined}
                  className={`e-link transition-colors hover:text-white ${current === l.href ? "text-white" : "text-white/75"}`}
                >
                  {l.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <div className="flex items-center justify-self-end gap-3" onMouseEnter={leave}>
          <SearchOverlay />
          <FavLink label={en ? "Favourites" : "Favoriti"} />
          <Link href="/racun/" aria-label={en ? "My account" : "Moj račun"} className="flex h-10 w-10 items-center justify-center text-white/80 transition-colors hover:text-white">
            <User strokeWidth={1.5} className="h-[20px] w-[20px]" />
          </Link>
          <CartLink />
        </div>
      </div>

      {/* mega-izbornik: prave kolekcije, puna širina, bez kartica i okvira */}
      {open ? (
        <div className="e-mega absolute inset-x-0 top-full hidden border-b border-[#ffffff14] bg-[#0a0a0a] lg:block" onMouseEnter={enter} onMouseLeave={leave}>
          <div className="mx-auto grid max-w-[1680px] grid-cols-[1fr_1fr_1fr_1.3fr] gap-12 px-10 pb-12 pt-10">
            <MegaCol title={en ? "Categories" : "Kategorije"} links={mega.categories} />
            <MegaCol title={en ? "Clubs & national teams" : "Klubovi i reprezentacije"} links={mega.clubs} />
            <MegaCol title={en ? "Players" : "Igrači"} links={mega.players} />
            <div className="flex flex-col justify-between border-l border-[#ffffff14] pl-12">
              <div>
                <p className="text-[12px] font-semibold uppercase tracking-[0.14em] text-white/40">{en ? "Full catalogue" : "Cijeli katalog"}</p>
                <Link href="/dresovi/" className="group mt-4 flex items-end gap-4">
                  <span className="e-display text-[64px] text-white">{en ? "All jerseys" : "Svi dresovi"}</span>
                  <ArrowRight strokeWidth={1.5} className="mb-3 h-7 w-7 text-[#e8ff3c] transition-transform duration-300 group-hover:translate-x-1.5" />
                </Link>
              </div>
              <p className="text-[13px] text-white/45">{en ? "Cash on delivery · Delivery 2–5 days" : "Plaćanje pouzećem · Dostava 2–5 dana"}</p>
            </div>
          </div>
        </div>
      ) : null}

      {/* ---------- mobitel ---------- */}
      <div className={`flex items-center justify-between pr-2 lg:hidden ${back ? "pl-1" : "pl-4"}`} style={{ height: E_NAV_H_M }}>
        <div className="flex items-center">
          {back ? (
            <Link
              href={back}
              aria-label={en ? "Back" : "Natrag"}
              onClick={(e) => {
                const slug = document.querySelector<HTMLElement>("[data-ime-pdp]")?.dataset.imePdp;
                if (!slug || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
                e.preventDefault();
                closeProduct(router, slug, back);
              }}
              className="flex h-11 w-11 items-center justify-center text-white/80 active:text-white"
            >
              <ChevronLeft strokeWidth={1.5} className="h-6 w-6" />
            </Link>
          ) : null}
          <Link href={`${E_BASE}/`} aria-label={tx.homeAria}>
            <XWordmark size={26} />
          </Link>
        </div>
        <div className="flex items-center gap-1">
          <SearchOverlay />
          {/* početna i katalog: košarica je u donjoj traci; stranica dresa (bez donje trake): ovdje */}
          {back ? <CartLink className="!w-11" /> : null}
          <button type="button" aria-label={tx.menu} aria-expanded={sheet} onClick={() => setSheet(true)} className="flex h-11 w-11 flex-col items-center justify-center gap-[6px]">
            <span className="block h-[1.5px] w-[20px] bg-white" />
            <span className="block h-[1.5px] w-[20px] bg-white" />
          </button>
        </div>
      </div>

      {sheet ? (
        <div role="dialog" aria-modal="true" aria-label={tx.menu} className="e-sheet fixed inset-0 z-[60] flex flex-col bg-[#0a0a0a] lg:hidden">
          <div className="flex items-center justify-between pl-4 pr-2" style={{ height: E_NAV_H_M, marginTop: "env(safe-area-inset-top)" }}>
            <XWordmark size={26} />
            <button type="button" aria-label={tx.closeMenu} onClick={() => setSheet(false)} className="flex h-11 w-11 items-center justify-center text-white">
              <X strokeWidth={1.5} className="h-6 w-6" />
            </button>
          </div>
          <ul className="mt-6 px-5">
            {[{ label: en ? "Jerseys" : "Dresovi", href: CATALOG_PAGE }, ...LINKS].map((l, i) => (
              <li key={l.href} style={{ animationDelay: `${40 + i * 40}ms` }} className="border-b border-[#ffffff12]">
                <Link
                  href={l.href}
                  onClick={(e) => {
                    setSheet(false);
                    sameHash(e, l.href);
                  }}
                  aria-current={current === l.href ? "page" : undefined}
                  className="flex h-[68px] items-center justify-between"
                >
                  <span className="e-display pt-1 text-[44px] text-white">{l.label}</span>
                  <ArrowRight strokeWidth={1.5} className={`h-5 w-5 ${current === l.href ? "text-[#e8ff3c]" : "text-white/35"}`} />
                </Link>
              </li>
            ))}
          </ul>
          <div className="mt-8 grid grid-cols-2 gap-x-6 gap-y-1 px-5">
            {mega.clubs.slice(0, 6).map((c) => (
              <Link key={c.href} href={c.href} onClick={() => setSheet(false)} className="flex h-10 items-center text-[15px] text-white/65">
                {c.label}
              </Link>
            ))}
          </div>
          <div className="mt-auto flex items-center gap-8 border-t border-[#ffffff12] px-5 py-5" style={{ paddingBottom: "max(20px, env(safe-area-inset-bottom))" }}>
            <Link href="/favoriti/" className="flex items-center gap-2 text-[15px] text-white/80">
              <Heart strokeWidth={1.5} className="h-[18px] w-[18px]" />
              {en ? "Favourites" : "Favoriti"}
            </Link>
            <Link href="/racun/" className="flex items-center gap-2 text-[15px] text-white/80">
              <User strokeWidth={1.5} className="h-[18px] w-[18px]" />
              {en ? "My account" : "Moj račun"}
            </Link>
            <LangSwitch locale={locale} setLocale={setLocale} className="ml-auto" />
          </div>
        </div>
      ) : null}
    </header>
    </>
  );
}

function MegaCol({ title, links }: { title: string; links: { label: string; href: string }[] }) {
  return (
    <div>
      <p className="text-[12px] font-semibold uppercase tracking-[0.14em] text-white/40">{title}</p>
      <ul className="mt-4 space-y-0.5">
        {links.map((l) => (
          <li key={l.href}>
            <Link href={l.href} className="flex h-9 items-center text-[16px] text-white/80 transition-colors hover:text-[#e8ff3c]">
              {l.label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
