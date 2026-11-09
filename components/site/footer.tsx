"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Instagram, MessageCircle, Mail } from "lucide-react";
import { useLanguage } from "@/contexts/language-context";
import { CONTACT_EMAIL, CONTACT_PHONE_DISPLAY, INSTAGRAM_HANDLE, NAV_LINKS, SHIPPING_PRICE_EUR } from "@/lib/site";

const shopLinks = [
  { href: "/dresovi", label: "Dresovi", en: "Jerseys" },
  { href: "/dresovi?dugi=1", label: "Dugi rukav", en: "Long sleeve" },
  { href: "/kompleti", label: "Kompleti", en: "Kits" },
  { href: "/trenirke", label: "Trenirke", en: "Tracksuits" },
  { href: "/streetwear", label: "Streetwear", en: "Streetwear" }
] as const;

const seoFooterLinks = [
  { href: "/dresovi/klub/fc-barcelona", label: "Barcelona dresovi" },
  { href: "/dresovi/klub/real-madrid", label: "Real Madrid dresovi" },
  { href: "/dresovi/igrac/messi", label: "Messi dresovi" },
  { href: "/dresovi/igrac/ronaldo", label: "Ronaldo dresovi" },
  { href: "/dresovi/kategorija/retro-dresovi", label: "Retro dresovi" },
] as const;

const helpLinks = [
  { href: "/dostava-i-povrat", label: "Dostava i zamjena", en: "Delivery & exchange" },
  { href: "/pravila-privatnosti", label: "Pravila privatnosti", en: "Privacy policy" },
  { href: "/igre", label: "Mini igre", en: "Mini games" }
] as const;

const linkCls = "block py-1.5 text-[14px] font-bold leading-tight text-fg transition-colors hover:text-accent";
const headCls = "mb-3 text-[10px] font-bold uppercase leading-none tracking-[0.16em] text-mute";

export function Footer() {
  const { t, locale } = useLanguage();
  const en = locale === "en";
  const pathname = usePathname();

  // Na korisničkom računu footer se skriva — profil je "app-like", bez footera.
  if (pathname?.startsWith("/racun")) return null;

  return (
    <footer className="mt-20 overflow-hidden border-t border-white/10 bg-ink lg:mt-28">
      <div className="page-shell pb-8 pt-10 lg:pt-14">
        <div className="grid grid-cols-2 gap-x-2.5 gap-y-8 md:grid-cols-4 lg:gap-x-10">
          <div>
            <p className={headCls}>Shop</p>
            {shopLinks.map((link) => (
              <Link key={link.href} href={link.href} className={linkCls}>
                {en ? link.en : link.label}
              </Link>
            ))}
          </div>

          <div>
            <p className={headCls}>{t.footer.nav}</p>
            {NAV_LINKS.filter((l) => l.href !== "/" && l.href !== "/dresovi").map((link) => (
              <Link key={link.href} href={link.href} className={linkCls}>
                {link.label}
              </Link>
            ))}
            {helpLinks.map((link) => (
              <Link key={link.href} href={link.href} className={linkCls}>
                {en ? link.en : link.label}
              </Link>
            ))}
          </div>

          <div>
            <p className={headCls}>{t.footer.popular}</p>
            {seoFooterLinks.map((link) => (
              <Link key={link.href} href={link.href} className={linkCls}>
                {link.label}
              </Link>
            ))}
          </div>

          <div>
            <p className={headCls}>{t.footer.contact}</p>
            <p className="py-1.5 text-[14px] font-bold leading-tight text-fg">WhatsApp {CONTACT_PHONE_DISPLAY}</p>
            <p className="py-1.5 text-[14px] font-bold leading-tight text-fg">Instagram {INSTAGRAM_HANDLE}</p>
            <p className="mt-1 text-[12px] font-medium text-mute">{t.footer.response}</p>
            <div className="mt-4 flex gap-2">
              <a
                href={`https://instagram.com/${INSTAGRAM_HANDLE.replace("@", "")}`}
                target="_blank"
                rel="noreferrer"
                aria-label="Instagram"
                className="flex h-10 w-10 items-center justify-center rounded-full border border-white/[0.18] text-fg transition-colors hover:border-accent hover:text-accent"
              >
                <Instagram className="h-4 w-4" />
              </a>
              <a
                href={`https://wa.me/${CONTACT_PHONE_DISPLAY.replace(/\D/g, "")}`}
                target="_blank"
                rel="noreferrer"
                aria-label="WhatsApp"
                className="flex h-10 w-10 items-center justify-center rounded-full border border-white/[0.18] text-fg transition-colors hover:border-accent hover:text-accent"
              >
                <MessageCircle className="h-4 w-4" />
              </a>
              <a
                href={`mailto:${CONTACT_EMAIL}`}
                aria-label="Email"
                className="flex h-10 w-10 items-center justify-center rounded-full border border-white/[0.18] text-fg transition-colors hover:border-accent hover:text-accent"
              >
                <Mail className="h-4 w-4" />
              </a>
            </div>
          </div>
        </div>

        <p className="mt-10 max-w-xl text-[13px] font-medium leading-[1.5] text-mute">{t.footer.desc}</p>

        <div className="mt-6 flex flex-wrap gap-1.5">
          {(en
            ? ["Cash on delivery", "GLS", `Delivery ${SHIPPING_PRICE_EUR} €`, "Croatia only"]
            : ["Pouzeće", "GLS", `Dostava ${SHIPPING_PRICE_EUR} €`, "Samo HR"]
          ).map((chip) => (
            <span
              key={chip}
              className="rounded-full border border-white/[0.18] px-2.5 py-2 text-[10px] font-black uppercase leading-none tracking-[0.1em] text-[#d6d6cf]"
            >
              {chip}
            </span>
          ))}
        </div>

        <p
          aria-hidden
          className="-mx-1.5 mt-11 whitespace-nowrap font-display text-[29vw] uppercase leading-[0.78] tracking-[-0.01em] text-fg lg:text-[22vw] 2xl:text-[300px]"
        >
          Dresify<span className="text-accent">.</span>
        </p>

        <div className="mt-5 flex flex-col justify-between gap-1 text-[11px] font-medium leading-[1.4] text-mute sm:flex-row">
          <span>{t.footer.copyright}</span>
          <span>
            {t.footer.madeWith} <span className="text-accent">♥</span> {t.footer.inCroatia}
          </span>
        </div>
      </div>
    </footer>
  );
}
