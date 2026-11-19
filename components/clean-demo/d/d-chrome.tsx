"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useCallback, useEffect, useState, type ReactNode } from "react";
import { ChevronLeft, ChevronRight, Home, Shirt, ShoppingBag, User } from "lucide-react";

import { useCart } from "@/components/providers/cart-provider";
import { INSTAGRAM_URL } from "@/lib/site";
import { createWhatsAppUrl } from "@/lib/utils";

import { D_BASE } from "./d-css";

/* ------------------------------------------------------------------ */
/*  Smjer D — "Aplikacija". Vlastito zaglavlje, izbornik i dok.         */
/*  Zaglavlje: samo znak u sredini, na naslovnici se izgubi na skrolu.  */
/*  Bez izbornika gore — WhatsApp i ostalo su u podnožju i na dresu.    */
/* ------------------------------------------------------------------ */


/** Zadrži ?3d=… parametar kod navigacije unutar demoa (testiranje). */
export function useDemoHref() {
  const sp = useSearchParams();
  const q = sp?.get("3d");
  return useCallback((path: string) => (q ? `${path}${path.includes("?") ? "&" : "?"}3d=${q}` : path), [q]);
}

/** Globalni skript postavlja html[data-bnav] (donja traka živog dućana) → ovdje ga skidamo. */
function useNoGlobalBottomNav() {
  useEffect(() => {
    const el = document.documentElement;
    el.removeAttribute("data-bnav");
    const mo = new MutationObserver(() => el.hasAttribute("data-bnav") && el.removeAttribute("data-bnav"));
    mo.observe(el, { attributes: true, attributeFilter: ["data-bnav"] });
    return () => mo.disconnect();
  }, []);
}

export function Wordmark({ size = 22 }: { size?: number }) {
  return (
    <span className="font-heading uppercase leading-none tracking-[0.04em] text-white" style={{ fontSize: size }}>
      DRES<span className="text-[#e8ff3c]">IFY</span>
    </span>
  );
}

export function DHeader({ back }: { back?: string }) {
  const href = useDemoHref();
  const [y, setY] = useState(0);
  useNoGlobalBottomNav();

  useEffect(() => {
    let raf = 0;
    const on = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => setY(window.scrollY));
    };
    on();
    window.addEventListener("scroll", on, { passive: true });
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("scroll", on);
    };
  }, []);

  // Naslovnica: znak se tiho izgubi dok skrolaš (scena ostaje sama).
  // Stranica dresa: traka ostaje (treba "natrag"), na skrolu dobije punu pozadinu i hairline.
  const fade = back ? 1 : Math.max(0, 1 - y / 90);
  const solid = Boolean(back) && y > 12;

  return (
    <header
      className={`fixed inset-x-0 top-0 z-40 border-b transition-[background-color,border-color] duration-300 ease-out ${
        solid ? "border-[#ffffff12] bg-[#050505]" : "border-transparent bg-[#050505]"
      }`}
      style={{ paddingTop: "env(safe-area-inset-top)", opacity: fade, pointerEvents: fade < 0.05 ? "none" : undefined }}
    >
      <div className="relative mx-auto flex h-[54px] max-w-[1200px] items-center justify-center px-2">
        {back ? (
          <Link href={href(back)} aria-label="Natrag" className="absolute left-1 flex h-11 w-11 items-center justify-center text-white/80 active:text-white">
            <ChevronLeft strokeWidth={1.5} className="h-[22px] w-[22px]" />
          </Link>
        ) : null}
        <Link href={href(`${D_BASE}/`)} aria-label="Dresify — početna">
          <Wordmark size={24} />
        </Link>
      </div>
    </header>
  );
}

/* ---------------- podnožje (umjesto izbornika) ---------------- */
/* Zaglavlje nosi samo znak; sve ostalo je ovdje, na dnu: tihi popis bez okvira. */

const FOOT_LINKS = [
  { label: "Moj račun", href: "/racun" },
  { label: "Favoriti", href: "/favoriti/" },
  { label: "Dostava i zamjena", href: "/dostava-i-povrat" },
  { label: "Kontakt", href: "/kontakt" },
];

export function DFooter() {
  return (
    <footer className="border-t border-[#ffffff0f] px-5 pb-[128px] pt-10">
      <div className="mx-auto max-w-[1200px] sm:px-1">
        <a
          href={createWhatsAppUrl("Pozdrav, imam pitanje.")}
          target="_blank"
          rel="noopener noreferrer"
          className="flex h-12 items-center justify-between border-b border-[#ffffff0f] text-[16px] font-medium text-white sm:max-w-[420px]"
        >
          Piši nam na WhatsApp
          <ChevronRight strokeWidth={1.25} className="h-5 w-5 text-white/30" />
        </a>
        <a
          href={INSTAGRAM_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="flex h-12 items-center justify-between border-b border-[#ffffff0f] text-[16px] font-medium text-white sm:max-w-[420px]"
        >
          Instagram
          <ChevronRight strokeWidth={1.25} className="h-5 w-5 text-white/30" />
        </a>
        <ul className="mt-6 flex flex-wrap gap-x-6 gap-y-1">
          {FOOT_LINKS.map((l) => (
            <li key={l.href}>
              <Link href={l.href} className="flex h-10 items-center text-[13.5px] text-white/50 active:text-white">
                {l.label}
              </Link>
            </li>
          ))}
        </ul>
        <p className="mt-6 text-[12px] text-white/30">Dostava po Hrvatskoj · plaćanje pouzećem</p>
      </div>
    </footer>
  );
}

/* ---------------- dok ---------------- */
/* Odluka: JEDAN plutajući dok umjesto trake s 5 stavki. Četiri gole ikone (Početna,
   Dresovi, Košarica, Račun) — palcem dohvatljive, bez natpisa i bez izdignutog gumba.
   WhatsApp NIJE u doku: na naslovnici je u podnožju, na stranici dresa
   je redak "Pitaj na WhatsAppu" odmah ispod veličina — tamo gdje se pitanje stvarno javlja.
   Na stranici dresa isti dok postaje traka "Dodaj u košaricu" (vidi DProduct). */

type Tab = "home" | "dresovi" | "kosarica" | "racun";

export function DDockShell({ children, label }: { children: ReactNode; label: string }) {
  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-0 z-40 px-3" style={{ paddingBottom: "max(12px, env(safe-area-inset-bottom))" }}>
      <nav
        aria-label={label}
        className="pointer-events-auto mx-auto max-w-[420px] rounded-[22px] border border-[#ffffff14] bg-[#141414] shadow-[0_18px_40px_-12px_rgba(0,0,0,0.85)]"
      >
        {children}
      </nav>
    </div>
  );
}

export function DDock({ active = "home" }: { active?: Tab }) {
  const href = useDemoHref();
  const { itemCount } = useCart();
  const tabs: { key: Tab; label: string; href: string; Icon: typeof Home }[] = [
    { key: "home", label: "Početna", href: href(`${D_BASE}/`), Icon: Home },
    { key: "dresovi", label: "Dresovi", href: href(`${D_BASE}/#dresovi`), Icon: Shirt },
    { key: "kosarica", label: "Košarica", href: "/kosarica", Icon: ShoppingBag },
    { key: "racun", label: "Račun", href: "/racun", Icon: User },
  ];
  return (
    <DDockShell label="Glavna navigacija">
      <ul className="grid h-[58px] grid-cols-4">
        {tabs.map(({ key, label, href: h, Icon }) => {
          const on = key === active;
          return (
            <li key={key} className="flex">
              <Link
                href={h}
                aria-label={key === "kosarica" && itemCount ? `${label}, ${itemCount} u košarici` : label}
                aria-current={on ? "page" : undefined}
                className={`relative flex flex-1 flex-col items-center justify-center transition-colors duration-200 ${on ? "text-white" : "text-[#ffffff66] active:text-white"}`}
              >
                <span className="relative">
                  <Icon strokeWidth={1.5} className="h-[22px] w-[22px]" />
                  {key === "kosarica" && itemCount > 0 ? (
                    <span className="absolute -right-[11px] -top-[5px] text-[10px] font-semibold tabular-nums leading-none text-white">{itemCount}</span>
                  ) : null}
                </span>
                <span aria-hidden className={`mt-[6px] h-[4px] w-[4px] rounded-full ${on ? "bg-[#e8ff3c]" : "bg-transparent"}`} />
              </Link>
            </li>
          );
        })}
      </ul>
    </DDockShell>
  );
}
