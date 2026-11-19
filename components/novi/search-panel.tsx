"use client";

import { Fragment, useEffect, useRef, useState, type KeyboardEvent as ReactKeyboardEvent } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { ArrowUpRight, ChevronRight, Search, Shirt, X } from "lucide-react";

import { repairText } from "@/lib/utils";
import { useLanguage } from "@/contexts/language-context";
import { OverlayScrim, SHEET_EASE, useScrollLock } from "@/components/ui/premium";

type Hit = { slug: string; klub: string; igrac: string; liga: string };

// Prijedlozi u praznom stanju — samo pojmovi koji stvarno postoje u katalogu.
const SUGGESTIONS = ["Modrić", "Hrvatska", "Real Madrid", "Barcelona", "Messi", "Ronaldo"];
const CATEGORIES = [
  { href: "/dresovi/", hr: "Dresovi", en: "Jerseys" },
  { href: "/kompleti/", hr: "Kompleti", en: "Kits" },
  { href: "/trenirke/", hr: "Trenirke", en: "Tracksuits" },
  { href: "/streetwear/", hr: "Streetwear", en: "Streetwear" }
];

const fold = (v: string) => v.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/đ/g, "d");

/** Pogođeni dio naziva podebljan (bijelo), ostatak prigušen. */
function Highlight({ text, query }: { text: string; query: string }) {
  const terms = fold(query).split(/\s+/).filter(Boolean);
  if (!terms.length) return <>{text}</>;
  const f = fold(text);
  const marks = new Array(text.length).fill(false);
  for (const t of terms) {
    let i = f.indexOf(t);
    while (i !== -1) {
      for (let k = i; k < i + t.length && k < marks.length; k++) marks[k] = true;
      i = f.indexOf(t, i + t.length);
    }
  }
  const parts: { s: string; m: boolean }[] = [];
  for (let i = 0; i < text.length; i++) {
    const last = parts[parts.length - 1];
    if (last && last.m === marks[i]) last.s += text[i];
    else parts.push({ s: text[i], m: marks[i] });
  }
  return (
    <>
      {parts.map((p, i) =>
        p.m ? (
          <span key={i} className="text-white">
            {p.s}
          </span>
        ) : (
          <Fragment key={i}>{p.s}</Fragment>
        )
      )}
    </>
  );
}

/** Prozor pretrage (framer-motion). Učitava se tek na prvo otvaranje — components/novi/search-overlay.tsx. */
export function SearchPanel({ open, setOpen, close }: { open: boolean; setOpen: (v: boolean) => void; close: () => void }) {
  const { locale } = useLanguage();
  const router = useRouter();
  const reduce = useReducedMotion();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Hit[]>([]);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const reqId = useRef(0);
  const en = locale === "en";

  useScrollLock(open);

  useEffect(() => {
    if (open) {
      const id = setTimeout(() => inputRef.current?.focus({ preventScroll: true }), 60);
      return () => clearTimeout(id);
    }
    setQuery("");
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // Pretraga ide na server (cijeli katalog: statički + custom + streetwear).
  useEffect(() => {
    const q = query.trim();
    if (!q) {
      setResults([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const my = ++reqId.current;
    const id = setTimeout(async () => {
      try {
        const d = await fetch(`/api/search/?q=${encodeURIComponent(q)}`).then((r) => r.json());
        if (my !== reqId.current) return; // stariji odgovor — ignoriraj
        setResults(d?.ok ? d.results : []);
      } catch {
        if (my === reqId.current) setResults([]);
      }
      if (my === reqId.current) setLoading(false);
    }, 220);
    return () => clearTimeout(id);
  }, [query]);

  const placeholder = en ? "Search jerseys, clubs, players…" : "Traži dres, klub, igrača…";
  const noResults = en ? "No jerseys found." : "Nema rezultata.";
  const q = query.trim();

  // Strelice: iz polja na prvi rezultat, kroz popis gore/dolje; Enter u polju = prvi rezultat.
  const focusRow = (i: number) => {
    const rows = listRef.current?.querySelectorAll<HTMLAnchorElement>("a[data-row]");
    if (!rows || !rows.length) return;
    if (i < 0) {
      inputRef.current?.focus();
      return;
    }
    rows[Math.min(i, rows.length - 1)]?.focus();
  };
  const onInputKey = (e: ReactKeyboardEvent<HTMLInputElement>) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      focusRow(0);
    } else if (e.key === "Enter" && results[0] && !loading) {
      e.preventDefault();
      setOpen(false);
      router.push(`/dres/${results[0].slug}`);
    }
  };
  // Fokus ostaje u prozoru (aria-modal): Tab s posljednjeg elementa skoči na prvi i obrnuto.
  const panelRef = useRef<HTMLDivElement>(null);
  const onPanelKey = (e: ReactKeyboardEvent<HTMLDivElement>) => {
    if (e.key !== "Tab" || !panelRef.current) return;
    const items = Array.from(
      panelRef.current.querySelectorAll<HTMLElement>('a[href], button:not([disabled]), input:not([disabled]), [tabindex]:not([tabindex="-1"])')
    ).filter((el) => el.offsetParent !== null);
    if (!items.length) return;
    const first = items[0];
    const last = items[items.length - 1];
    const active = document.activeElement;
    if (e.shiftKey && (active === first || !panelRef.current.contains(active))) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && active === last) {
      e.preventDefault();
      first.focus();
    }
  };
  const onRowKey = (e: ReactKeyboardEvent<HTMLAnchorElement>, i: number) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      focusRow(i + 1);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      focusRow(i - 1);
    }
  };

  const status = !q ? "" : loading ? (en ? "Searching…" : "Tražim…") : results.length === 0 ? noResults : en ? `${results.length} results` : `Rezultata: ${results.length}`;

  const panel = (
    <AnimatePresence>
      {open ? (
        <motion.div
          key="fl-search"
          role="dialog"
          aria-modal="true"
          aria-label={en ? "Search" : "Pretraga"}
          initial={reduce ? { opacity: 0 } : { opacity: 0, y: -14, scale: 0.985 }}
          animate={{ opacity: 1, y: 0, scale: 1, transition: reduce ? { duration: 0.12 } : { duration: 0.32, ease: SHEET_EASE } }}
          exit={{ opacity: 0, y: reduce ? 0 : -10, transition: { duration: 0.16, ease: "easeIn" } }}
          style={{ zIndex: 131 }}
          className="pointer-events-none fixed inset-x-0 top-0 mx-auto w-full max-w-[680px] px-3 pt-[max(12px,env(safe-area-inset-top))] md:px-4 md:pt-[11vh]"
        >
          <div ref={panelRef} onKeyDown={onPanelKey} className="fl-glass-2 fl-rim pointer-events-auto overflow-hidden rounded-[24px] shadow-[inset_0_1px_0_rgba(255,255,255,0.1),0_30px_80px_-20px_rgba(0,0,0,0.85)]">
            {/* Polje za pretragu */}
            <div className="flex items-center gap-2 p-2.5">
              <label className="relative flex h-[52px] min-w-0 flex-1 items-center rounded-full border border-white/[0.1] bg-white/[0.05] shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] transition-[border-color,box-shadow] duration-150 focus-within:border-[#e8ff3c]/60 focus-within:shadow-[0_0_0_4px_rgba(232,255,60,0.12)]">
                <Search aria-hidden strokeWidth={2} className="pointer-events-none absolute left-4 h-[18px] w-[18px] text-[#e8ff3c]" />
                <span className="sr-only">{placeholder}</span>
                <input
                  ref={inputRef}
                  type="search"
                  inputMode="search"
                  enterKeyHint="search"
                  autoComplete="off"
                  autoCorrect="off"
                  spellCheck={false}
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onKeyDown={onInputKey}
                  placeholder={placeholder}
                  aria-controls="fl-search-results"
                  className="h-full w-full appearance-none bg-transparent pl-11 pr-11 text-[16px] text-white outline-none placeholder:text-white/35 focus-visible:shadow-none focus-visible:outline-none [&::-webkit-search-cancel-button]:appearance-none"
                />
                {query ? (
                  <button
                    type="button"
                    onClick={() => {
                      setQuery("");
                      inputRef.current?.focus();
                    }}
                    aria-label={en ? "Clear" : "Obriši upit"}
                    className="fl-press absolute right-2.5 flex h-7 w-7 items-center justify-center rounded-full bg-white/[0.14] text-white/80 hover:bg-white/[0.2] hover:text-white"
                  >
                    <X strokeWidth={2.25} className="h-3.5 w-3.5" />
                  </button>
                ) : null}
              </label>
              <button
                type="button"
                onClick={close}
                className="fl-press h-11 shrink-0 rounded-full px-3 text-[15px] font-medium text-white/75 transition-colors hover:text-white"
              >
                {en ? "Cancel" : "Odustani"}
              </button>
            </div>

            <div className="fl-hairline mx-4" />

            <p className="sr-only" role="status" aria-live="polite">
              {status}
            </p>

            <div id="fl-search-results" className="fl-noscroll max-h-[min(60vh,520px)] overflow-y-auto overscroll-contain">
              {!q ? (
                <div className="px-4 pb-5 pt-4">
                  <p className="px-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-white/55">
                    {en ? "Popular searches" : "Često traženo"}
                  </p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {SUGGESTIONS.map((s) => (
                      <button
                        key={s}
                        type="button"
                        onClick={() => {
                          setQuery(s);
                          inputRef.current?.focus();
                        }}
                        className="fl-chip fl-chip-sm"
                      >
                        <Search aria-hidden strokeWidth={2} className="h-3 w-3 text-white/45" />
                        {s}
                      </button>
                    ))}
                  </div>
                  <p className="mt-6 px-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-white/55">
                    {en ? "Browse" : "Kategorije"}
                  </p>
                  <div className="fl-group mt-3">
                    {CATEGORIES.map((c) => (
                      <Link key={c.href} href={c.href} onClick={() => setOpen(false)} className="fl-row min-h-[48px] text-[15px] text-white/90">
                        <span className="flex-1">{en ? c.en : c.hr}</span>
                        <ChevronRight aria-hidden strokeWidth={1.75} className="h-4 w-4 text-white/30" />
                      </Link>
                    ))}
                  </div>
                </div>
              ) : loading && results.length === 0 ? (
                <ul aria-hidden className="space-y-1 p-2">
                  {[0, 1, 2].map((i) => (
                    <li key={i} className="flex items-center gap-3 px-3 py-2.5">
                      <span className="h-11 w-11 shrink-0 animate-pulse rounded-[12px] bg-white/[0.06]" />
                      <span className="flex-1 space-y-2">
                        <span className="block h-3 w-1/3 animate-pulse rounded-full bg-white/[0.08]" />
                        <span className="block h-3 w-1/2 animate-pulse rounded-full bg-white/[0.05]" />
                      </span>
                    </li>
                  ))}
                </ul>
              ) : results.length === 0 ? (
                <div className="px-6 py-10 text-center">
                  <p className="text-[15px] font-medium text-white/80">{noResults}</p>
                  <p className="mt-1.5 text-[13px] text-white/55">
                    {en ? "Try a club, player or national team." : "Probaj klub, igrača ili reprezentaciju."}
                  </p>
                  <Link
                    href="/dresovi/"
                    onClick={() => setOpen(false)}
                    className="button-secondary button-sm mt-5 inline-flex px-5 text-[15px]"
                  >
                    {en ? "All jerseys" : "Svi dresovi"}
                  </Link>
                </div>
              ) : (
                <ul ref={listRef} className={`p-2 transition-opacity duration-150 ${loading ? "opacity-60" : ""}`}>
                  {results.map((j, i) => (
                    <li key={j.slug}>
                      <Link
                        data-row
                        href={`/dres/${j.slug}`}
                        onClick={() => setOpen(false)}
                        onKeyDown={(e) => onRowKey(e, i)}
                        className="group flex items-center gap-3 rounded-[14px] px-2.5 py-2 outline-none transition-colors duration-150 hover:bg-white/[0.05] focus-visible:bg-white/[0.06] focus-visible:shadow-[inset_0_0_0_1px_rgba(232,255,60,0.5)] active:bg-white/[0.06]"
                      >
                        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[12px] border border-white/[0.08] bg-[linear-gradient(180deg,rgba(255,255,255,0.08),rgba(255,255,255,0.02))] text-white/55 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]">
                          <Shirt aria-hidden strokeWidth={1.5} className="h-5 w-5" />
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-[15px] font-semibold text-white/75">
                            <Highlight text={repairText(j.klub)} query={q} />
                          </span>
                          <span className="block truncate text-[13px] text-white/55">
                            <Highlight text={repairText(j.igrac)} query={q} />
                          </span>
                        </span>
                        <span className="hidden shrink-0 rounded-full border border-white/[0.08] px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-white/60 sm:inline-flex">
                          {repairText(j.liga)}
                        </span>
                        <ArrowUpRight
                          aria-hidden
                          strokeWidth={1.75}
                          className="h-4 w-4 shrink-0 text-white/25 transition-[color,transform] duration-150 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-[#e8ff3c]"
                        />
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );

  return (
    <>
      <OverlayScrim open={open} onClose={close} zIndex={130} />
      {createPortal(panel, document.body)}
    </>
  );
}
