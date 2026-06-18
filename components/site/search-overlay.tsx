"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { Search, X } from "lucide-react";

import { jerseys } from "@/lib/data/jerseys";
import { repairText } from "@/lib/utils";
import { useLanguage } from "@/contexts/language-context";

function normalize(value: string) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

export function SearchOverlay() {
  const { locale } = useLanguage();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  useEffect(() => {
    if (open) {
      const id = setTimeout(() => inputRef.current?.focus(), 80);
      return () => clearTimeout(id);
    }
    setQuery("");
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  const results = useMemo(() => {
    const q = normalize(query.trim());
    if (!q) return [];
    const terms = q.split(/\s+/);
    return jerseys
      .filter((j) => {
        const haystack = normalize(`${j.klub} ${j.igrac} ${j.liga}`);
        return terms.every((term) => haystack.includes(term));
      })
      .slice(0, 8);
  }, [query]);

  const placeholder = locale === "en" ? "Search jerseys, clubs, players…" : "Traži dres, klub, igrača…";
  const noResults = locale === "en" ? "No jerseys found." : "Nema rezultata.";
  const hint = locale === "en" ? "Type to search, e.g. \"Modrić\" or \"Real Madrid\"" : "Upiši pojam, npr. \"Modrić\" ili \"Real Madrid\"";

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex h-11 w-11 items-center justify-center border border-white/10 bg-[#111111] text-white transition-all duration-200 ease-out hover:border-accent hover:text-accent"
        aria-label={locale === "en" ? "Search" : "Traži"}
      >
        <Search className="h-5 w-5" />
      </button>

      <AnimatePresence>
        {open ? (
          <>
            <motion.button
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              type="button"
              className="fixed inset-0 z-[70] bg-black/72 backdrop-blur-sm"
              onClick={() => setOpen(false)}
              aria-label="Close search"
            />
            <motion.div
              initial={{ opacity: 0, y: -16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -16 }}
              transition={{ duration: 0.18, ease: "easeOut" }}
              className="fixed inset-x-0 top-0 z-[80] mx-auto w-full max-w-2xl px-4 pt-[14vh]"
            >
              <div className="overflow-hidden rounded-[14px] border border-white/10 bg-[#0d0d0d] shadow-2xl">
                <div className="flex items-center gap-3 border-b border-white/10 px-4">
                  <Search className="h-5 w-5 shrink-0 text-accent" />
                  <input
                    ref={inputRef}
                    type="text"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder={placeholder}
                    className="h-14 w-full bg-transparent text-base text-white placeholder:text-white/30 outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => setOpen(false)}
                    aria-label="Close"
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[6px] text-white/50 transition hover:bg-white/10 hover:text-white"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>

                <div className="max-h-[55vh] overflow-y-auto">
                  {query.trim() && results.length === 0 ? (
                    <p className="px-5 py-8 text-center text-sm text-white/45">{noResults}</p>
                  ) : !query.trim() ? (
                    <p className="px-5 py-8 text-center text-sm text-white/35">{hint}</p>
                  ) : (
                    <ul className="py-2">
                      {results.map((j) => (
                        <li key={j.id}>
                          <Link
                            href={`/dres/${j.slug}`}
                            onClick={() => setOpen(false)}
                            className="flex items-center justify-between gap-3 px-5 py-3 transition hover:bg-white/5"
                          >
                            <span className="min-w-0">
                              <span className="block truncate text-sm font-semibold text-white">
                                {repairText(j.klub)}
                              </span>
                              <span className="block truncate text-[13px] text-white/55">
                                {repairText(j.igrac)}
                              </span>
                            </span>
                            <span className="shrink-0 text-[11px] uppercase tracking-[0.16em] text-white/35">
                              {repairText(j.liga)}
                            </span>
                          </Link>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
            </motion.div>
          </>
        ) : null}
      </AnimatePresence>
    </>
  );
}
