"use client";

import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

import { CartHeader } from "@/components/clean-demo/final/cart/cart-header";
import { EFooter } from "@/components/clean-demo/final/e-footer";
import { E_NAV_H, E_NAV_H_M, type EMega } from "@/components/clean-demo/final/e-css";
import { ENav } from "@/components/clean-demo/final/e-nav";
import { FBottomNav } from "@/components/clean-demo/final/f-bottom-nav";
import { XBAR_H, useXmasOn } from "@/components/clean-demo/final/e-xmas";
import { HangerCardsProvider } from "@/components/site/hanger-card-provider";
import { useLanguage } from "@/contexts/language-context";

/* ------------------------------------------------------------------ */
/*  NOVI DIZAJN — zaglavlje i podnožje za app/layout.tsx (SiteChrome).   */
/*  Samo u buildu s NEXT_PUBLIC_NOVI_DIZAJN=1 (components/novi/on.tsx).  */
/*  Naslovnica: prozirna traka preko scene (bez razmaka). Ostale         */
/*  stranice: puna traka + razmak ispod fiksne trake. Košarica i         */
/*  blagajna: mirno zaglavlje bez izbornika (CartHeader), bez podnožja.  */
/*  Donja traka (mobitel) skrivena na istim rutama kao stara BottomNav.  */
/* ------------------------------------------------------------------ */

// /cisto-demo/final/** (demo, noindex) = iste stranice kao prave rute → isti chrome.
const norm = (p: string | null) =>
  (p ?? "/").replace(/\/$/, "").replace(/^\/cisto-demo\/final/, "").replace(/^\/blagajna$/, "/checkout") || "/";

/** Isti popis kao HIDDEN_PREFIXES stare donje navigacije (components/site/bottom-nav.tsx). */
const BNAV_HIDDEN = ["/dres/", "/kosarica", "/checkout", "/zahvala", "/admin", "/prijava", "/registracija"];
function bottomNavHidden(p: string) {
  return BNAV_HIDDEN.some((x) => (x.endsWith("/") ? p.startsWith(x) : p === x || p.startsWith(`${x}/`)));
}

const isCart = (p: string) => p === "/kosarica";
const isCheckout = (p: string) => p === "/checkout";
const isProduct = (p: string) => p.startsWith("/dres/");

/** Razmak ispod fiksne trake (sve osim naslovnice, gdje scena ide pod prozirnu traku). */
function NavSpacer({ xbar = false }: { xbar?: boolean }) {
  // božićna traka (samo ENav) je u fiksnom zaglavlju → isti razmak više dok je tema uključena
  const x = xbar ? XBAR_H : 0; // traka je border-box: 30 px uklj. hairline
  return (
    <div aria-hidden className="nv-nav-spacer" style={{ paddingTop: "env(safe-area-inset-top)" }}>
      <div className="lg:hidden" style={{ height: E_NAV_H_M + x }} />
      <div className="hidden lg:block" style={{ height: E_NAV_H + x }} />
    </div>
  );
}

export function NoviHeader({ mega }: { mega: EMega }) {
  const p = norm(usePathname());
  const en = useLanguage().locale === "en";
  const xmas = useXmasOn();
  if (isCart(p)) {
    return (
      <>
        <CartHeader back="/" backLabel={en ? "Continue shopping" : "Nastavi kupovinu"} />
        <NavSpacer />
      </>
    );
  }
  if (isCheckout(p)) {
    return (
      <>
        <CartHeader back="/kosarica/" backLabel={en ? "Cart" : "Košarica"} />
        <NavSpacer />
      </>
    );
  }
  const home = p === "/";
  return (
    <>
      <ENav mega={mega} back={isProduct(p) ? "/" : undefined} solid={!home} />
      {home ? null : <NavSpacer xbar={xmas} />}
    </>
  );
}

export function NoviFooter({ children }: { children?: ReactNode }) {
  const p = norm(usePathname());
  const bnav = !bottomNavHidden(p);
  // košarica i blagajna: ništa ne odvlači od narudžbe (kao demo)
  const footer = !isCart(p) && !isCheckout(p);
  return (
    <>
      {footer ? (
        // stranica dresa: mjesto za traku za kupnju (68 px) na mobitelu; ostalo: donja traka
        <div className={isProduct(p) ? "pb-[calc(68px+env(safe-area-inset-bottom))] lg:pb-0" : bnav ? "f-has-bnav" : undefined}>
          <EFooter />
        </div>
      ) : null}
      {bnav ? <FBottomNav /> : null}
      {children}
    </>
  );
}

/** Sve kartice proizvoda na stranici u izgledu "ime" (vješalica, tamni zid — nikad bijela fotografija). */
export function NoviCards({ children }: { children: ReactNode }) {
  return (
    <HangerCardsProvider variant="ime">
      <div className="nv-main">{children}</div>
    </HangerCardsProvider>
  );
}
