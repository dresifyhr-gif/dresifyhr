"use client";

import { useRef, useState } from "react";
import dynamic from "next/dynamic";
import { Search } from "lucide-react";

import { useLanguage } from "@/contexts/language-context";

/* Gumb pretrage u zaglavlju. Sam prozor (framer-motion, ~39 kB gzip) je u ./search-panel i učitava se tek
   kad zatreba: prijelaz mišem / fokus ga unaprijed dohvati, prvi klik ga montira (otvara se s animacijom
   čim chunk stigne). Tako framer-motion ne ide u JS svake stranice novog dizajna. */
const loadPanel = () => import("./search-panel").then((m) => m.SearchPanel);
const SearchPanel = dynamic(loadPanel, { ssr: false });

export function SearchOverlay({ triggerClassName }: { triggerClassName?: string } = {}) {
  const { locale } = useLanguage();
  const [open, setOpen] = useState(false);
  const [used, setUsed] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const en = locale === "en";

  const close = () => {
    setOpen(false);
    requestAnimationFrame(() => triggerRef.current?.focus({ preventScroll: true }));
  };
  const prefetch = () => {
    void loadPanel().catch(() => {});
  };

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        onPointerEnter={prefetch}
        onFocus={prefetch}
        onTouchStart={prefetch}
        onClick={() => {
          setUsed(true);
          setOpen(true);
        }}
        className={`fl-icon-btn ${triggerClassName ?? ""}`}
        aria-label={en ? "Search" : "Traži"}
        aria-haspopup="dialog"
        aria-expanded={open}
      >
        <Search strokeWidth={1.75} className="h-[18px] w-[18px]" />
      </button>

      {used ? <SearchPanel open={open} setOpen={setOpen} close={close} /> : null}
    </>
  );
}
