import type { ReactNode } from "react";

import { ContentProtection } from "@/components/site/content-protection";
import { PromoCapture } from "@/components/site/promo-capture";

import { NoviCards, NoviFooter, NoviHeader } from "./chrome";
import { NoviClerkProvider } from "./clerk-provider";
import { NOVI_CHROME_CSS } from "./css";
import { getNoviMega } from "./mega";

/* ------------------------------------------------------------------ */
/*  NOVI DIZAJN — UKLJUČENO (layout: zaglavlje, podnožje, kartice).    */
/*  Ova datoteka zamjenjuje components/novi/                            */
/*  index.ts SAMO kad je build pokrenut s NEXT_PUBLIC_NOVI_DIZAJN=1     */
/*  (webpack NormalModuleReplacementPlugin u next.config.mjs). Bez      */
/*  zastavice build fizički ne sadrži ništa od ovoga.                   */
/* ------------------------------------------------------------------ */

export const NOVI_DIZAJN = true as boolean;

async function Header() {
  const mega = await getNoviMega();
  return (
    <div className="f-root e-root">
      <style dangerouslySetInnerHTML={{ __html: NOVI_CHROME_CSS }} />
      <NoviHeader mega={mega} />
    </div>
  );
}

function Footer() {
  return (
    <div className="f-root e-root">
      <NoviFooter>
        {/* iz starog podnožja ostaju samo nevidljivi/servisni dijelovi; stari Navbar, Footer,
            BottomNav, CartDrawer i AddToCartModal se NE montiraju (dvije ladice / prozor) */}
        <ContentProtection />
        <PromoCapture />
      </NoviFooter>
    </div>
  );
}

function Cards({ children }: { children: ReactNode }) {
  return <NoviCards>{children}</NoviCards>;
}

export const novi = {
  Header,
  Footer,
  Cards,
  /** klijentski ClerkProvider (hrHR u JS chunku, ne u RSC-u svake stranice) — app/layout.tsx */
  ClerkProvider: NoviClerkProvider,
};

export type NoviApi = typeof novi;
