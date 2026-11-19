"use client";

import Link from "next/link";
import { useEffect } from "react";
import { ChevronLeft, Lock } from "lucide-react";

import { Wordmark } from "@/components/clean-demo/d/d-chrome";

import { CART_BASE } from "./cart-css";
import { useCartText } from "./cart-i18n";

/* ------------------------------------------------------------------ */
/*  Zaglavlje košarice i blagajne: bez izbornika i pretrage (ništa ne   */
/*  odvlači od narudžbe). Lijevo natrag, sredina znak, desno sigurnost. */
/* ------------------------------------------------------------------ */

function useNoGlobalBottomNav() {
  useEffect(() => {
    const el = document.documentElement;
    el.removeAttribute("data-bnav");
    const mo = new MutationObserver(() => el.hasAttribute("data-bnav") && el.removeAttribute("data-bnav"));
    mo.observe(el, { attributes: true, attributeFilter: ["data-bnav"] });
    return () => mo.disconnect();
  }, []);
}

export function CartHeader({ back, backLabel }: { back: string; backLabel: string }) {
  useNoGlobalBottomNav();
  const T = useCartText();
  return (
    <header className="fixed inset-x-0 top-0 z-50 border-b border-white/[0.08] bg-[#0a0a0a]" style={{ paddingTop: "env(safe-area-inset-top)" }}>
      <div className="mx-auto grid h-14 max-w-[1280px] grid-cols-[1fr_auto_1fr] items-center px-2 lg:h-[68px] lg:px-10">
        <Link href={back} className="flex h-11 items-center gap-1 justify-self-start pr-3 text-[14px] text-white/70 transition-colors hover:text-white">
          <ChevronLeft className="h-5 w-5" strokeWidth={1.5} />
          <span className="hidden sm:inline">{backLabel}</span>
          <span className="sr-only sm:hidden">{backLabel}</span>
        </Link>
        <Link href={`${CART_BASE}/`} aria-label={T.homeAria}>
          <Wordmark size={26} />
        </Link>
        <span className="flex items-center gap-1.5 justify-self-end pr-3 text-[12px] text-white/50 lg:pr-0">
          <Lock className="h-[14px] w-[14px]" strokeWidth={1.6} />
          <span className="hidden sm:inline">{T.secure}</span>
        </span>
      </div>
    </header>
  );
}
