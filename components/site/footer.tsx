import Link from "next/link";
import { Instagram, MessageCircle, Mail } from "lucide-react";
import { CONTACT_EMAIL, CONTACT_PHONE_DISPLAY, INSTAGRAM_HANDLE, NAV_LINKS } from "@/lib/site";

const seoFooterLinks = [
  { href: "/dresovi/klub/fc-barcelona", label: "Barcelona dresovi" },
  { href: "/dresovi/klub/real-madrid", label: "Real Madrid dresovi" },
  { href: "/dresovi/igrac/messi", label: "Messi dresovi" },
  { href: "/dresovi/igrac/ronaldo", label: "Ronaldo dresovi" },
  { href: "/dresovi/kategorija/retro-dresovi", label: "Retro dresovi" },
] as const;

export function Footer() {
  return (
    <footer className="border-t border-white/10 bg-[#0a0a0a]">
      {/* Top CTA strip */}
      <div className="border-b border-white/8 bg-[#111111]">
        <div className="page-shell flex flex-col items-center justify-between gap-4 py-8 sm:flex-row">
          <div>
            <p className="font-heading text-2xl uppercase text-white sm:text-3xl">Pronašao si dres?</p>
            <p className="mt-1 text-sm text-white/50">Naruči odmah — šaljemo sutra.</p>
          </div>
          <Link href="/dresovi" className="button-primary shrink-0">
            POGLEDAJ KATALOG
          </Link>
        </div>
      </div>

      {/* Main footer grid */}
      <div className="page-shell grid gap-10 py-12 md:grid-cols-[1.4fr_0.6fr_0.7fr_0.9fr]">
        {/* Brand column */}
        <div>
          <Link href="/" className="font-heading text-4xl uppercase leading-none text-white">
            DRES<span className="text-accent">IFY</span>
          </Link>
          <p className="mt-4 max-w-sm text-sm leading-7 text-white/50">
            Premium football shop s fiksnom cijenom 20€, dostavom po cijeloj Hrvatskoj i novim modelima svaki tjedan.
          </p>
          {/* Social links */}
          <div className="mt-6 flex gap-3">
            <a
              href={`https://instagram.com/${INSTAGRAM_HANDLE.replace("@", "")}`}
              target="_blank"
              rel="noreferrer"
              className="flex h-10 w-10 items-center justify-center rounded-[6px] border border-white/10 text-white/50 transition-all duration-200 hover:border-accent hover:text-accent"
            >
              <Instagram className="h-4 w-4" />
            </a>
            <a
              href={`https://wa.me/${CONTACT_PHONE_DISPLAY.replace(/\D/g, "")}`}
              target="_blank"
              rel="noreferrer"
              className="flex h-10 w-10 items-center justify-center rounded-[6px] border border-white/10 text-white/50 transition-all duration-200 hover:border-accent hover:text-accent"
            >
              <MessageCircle className="h-4 w-4" />
            </a>
            <a
              href={`mailto:${CONTACT_EMAIL}`}
              className="flex h-10 w-10 items-center justify-center rounded-[6px] border border-white/10 text-white/50 transition-all duration-200 hover:border-accent hover:text-accent"
            >
              <Mail className="h-4 w-4" />
            </a>
          </div>
        </div>

        {/* Nav */}
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.32em] text-white/35">Navigacija</p>
          <div className="mt-5 flex flex-col gap-3">
            {NAV_LINKS.map((link) => (
              <Link key={link.href} href={link.href} className="text-sm text-white/60 transition-all duration-200 hover:text-accent">
                {link.label}
              </Link>
            ))}
          </div>
        </div>

        {/* Popular */}
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.32em] text-white/35">Popularno</p>
          <div className="mt-5 flex flex-col gap-3">
            {seoFooterLinks.map((link) => (
              <Link key={link.href} href={link.href} className="text-sm text-white/60 transition-all duration-200 hover:text-accent">
                {link.label}
              </Link>
            ))}
          </div>
        </div>

        {/* Contact */}
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.32em] text-white/35">Kontakt</p>
          <div className="mt-5 space-y-4">
            <div className="rounded-[8px] border border-white/8 bg-[#111111] p-4">
              <p className="text-[10px] uppercase tracking-[0.2em] text-white/35">WhatsApp</p>
              <p className="mt-1 text-sm font-medium text-white">{CONTACT_PHONE_DISPLAY}</p>
            </div>
            <div className="rounded-[8px] border border-white/8 bg-[#111111] p-4">
              <p className="text-[10px] uppercase tracking-[0.2em] text-white/35">Instagram</p>
              <p className="mt-1 text-sm font-medium text-white">{INSTAGRAM_HANDLE}</p>
            </div>
            <p className="text-xs text-white/35">Odgovaramo u roku sat vremena</p>
          </div>
        </div>
      </div>

      {/* Bottom bar */}
      <div className="border-t border-white/8">
        <div className="page-shell flex flex-col items-center justify-between gap-2 py-5 sm:flex-row">
          <p className="text-[11px] uppercase tracking-[0.28em] text-white/30">© 2026 DRESIFY — Sva prava pridržana</p>
          <div className="flex items-center gap-1">
            <span className="text-[11px] uppercase tracking-[0.2em] text-white/20">Izrađeno s</span>
            <span className="text-accent/60 text-[11px]">♥</span>
            <span className="text-[11px] uppercase tracking-[0.2em] text-white/20">u Hrvatskoj</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
