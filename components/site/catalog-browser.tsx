"use client";

import { type ReactNode, useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronDown, Search, SlidersHorizontal, X } from "lucide-react";
import Image from "next/image";
import Link from "next/link";

import { ProductCard } from "@/components/site/product-card";
import { useLanguage } from "@/contexts/language-context";
import { hasJerseyGallery } from "@/lib/data/jersey-media";
import {
  PLAYER_FILTER_OPTIONS,
  getClubOptions,
  matchesPlayerFilter,
  normalizeText,
  productSupportsSize,
  type Jersey
} from "@/lib/data/jerseys";
import { repairText } from "@/lib/utils";

type CatalogBrowserProps = {
  products: Jersey[];
  compactHeader?: boolean;
  headingLabel?: string;
  headingTitle?: string;
  headingDesc?: string;
};

type FilterSectionKey = "liga" | "klub" | "igrac" | "velicina" | "retro";

const leagueOptions = [
  "La Liga",
  "Premier Liga",
  "Bundesliga",
  "Serie A",
  "Ligue 1",
  "Reprezentacija",
  "Saudi Pro",
  "Brazil",
  "MLS"
];

const clubLabelOrder = [
  "FC Barcelona",
  "Real Madrid",
  "Liverpool",
  "Manchester United",
  "Manchester City",
  "Bayern München",
  "PSG",
  "AC Milan",
  "Juventus",
  "Chelsea",
  "Borussia Dortmund",
  "Atletico Madrid",
  "Hrvatska",
  "Argentina",
  "Brazil",
  "Njemačka",
  "Francuska",
  "Portugal",
  "Al-Nassr",
  "Santos",
  "Inter Miami",
  "Italija"
];

const adultSizeOptions = ["S", "M", "L", "XL"];
const kidSizeOptions = ["116", "128", "140", "152", "164", "176"];

function toggleFilterValue(values: string[], nextValue: string) {
  return values.includes(nextValue)
    ? values.filter((value) => value !== nextValue)
    : [...values, nextValue];
}

function FilterSection({
  title,
  count,
  isOpen,
  onToggle,
  children
}: {
  title: string;
  count?: number;
  isOpen: boolean;
  onToggle: () => void;
  children: ReactNode;
}) {
  return (
    <div className="border-b border-white/10 pb-4 sm:pb-5">
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-center justify-between gap-3 text-left"
      >
        <div className="flex items-center gap-3">
          <span className="text-sm font-semibold uppercase tracking-[0.24em] text-white">
            {title}
          </span>
          {count ? (
            <span className="rounded-[4px] bg-accent px-2 py-1 text-[11px] font-semibold text-black">
              {count}
            </span>
          ) : null}
        </div>
        <ChevronDown
          className={`h-4 w-4 text-white/50 transition-transform ${isOpen ? "rotate-180" : ""}`}
        />
      </button>
      {isOpen ? <div className="mt-4">{children}</div> : null}
    </div>
  );
}

export function CatalogBrowser({ products, compactHeader = false, headingLabel, headingTitle, headingDesc }: CatalogBrowserProps) {
  const { t } = useLanguage();
  const availableClubs = getClubOptions();
  const clubOptions = useMemo(() => {
    return [...availableClubs].sort((left, right) => {
      const leftIndex = clubLabelOrder.indexOf(repairText(left));
      const rightIndex = clubLabelOrder.indexOf(repairText(right));

      if (leftIndex !== -1 && rightIndex !== -1) {
        return leftIndex - rightIndex;
      }

      if (leftIndex !== -1) {
        return -1;
      }

      if (rightIndex !== -1) {
        return 1;
      }

      return repairText(left).localeCompare(repairText(right), "hr");
    });
  }, [availableClubs]);

  const [search, setSearch] = useState("");
  const [selectedLeagues, setSelectedLeagues] = useState<string[]>([]);
  const [selectedClubs, setSelectedClubs] = useState<string[]>([]);
  const [selectedPlayers, setSelectedPlayers] = useState<string[]>([]);
  const [selectedSizes, setSelectedSizes] = useState<string[]>([]);
  const [retroOnly, setRetroOnly] = useState(false);
  const [clubSearch, setClubSearch] = useState("");
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);
  const [searchFocused, setSearchFocused] = useState(false);
  const searchWrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (searchWrapperRef.current && !searchWrapperRef.current.contains(e.target as Node)) {
        setSearchFocused(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const suggestions = useMemo(() => {
    const term = normalizeText(search.trim());
    if (!term || term.length < 2) return [];
    return products
      .filter((p) =>
        normalizeText(`${repairText(p.klub)} ${repairText(p.igrac)} ${repairText(p.liga)}`).includes(term)
      )
      .slice(0, 6);
  }, [search, products]);
  const [openSections, setOpenSections] = useState<Record<FilterSectionKey, boolean>>({
    liga: true,
    klub: true,
    igrac: true,
    velicina: true,
    retro: true
  });

  const filteredClubOptions = useMemo(() => {
    const term = normalizeText(clubSearch.trim());

    if (!term) {
      return clubOptions;
    }

    return clubOptions.filter((club) => normalizeText(repairText(club)).includes(term));
  }, [clubOptions, clubSearch]);

  const filteredProducts = useMemo(() => {
    const normalizedSearch = normalizeText(search.trim());

    return [...products]
      .filter((product) => {
        const searchable = normalizeText(
          `${repairText(product.klub)} ${repairText(product.igrac)} ${repairText(product.liga)}`
        );

        const matchesSearch = !normalizedSearch || searchable.includes(normalizedSearch);
        const matchesLeague = !selectedLeagues.length || selectedLeagues.includes(product.liga);
        const matchesClub = !selectedClubs.length || selectedClubs.includes(product.klub);
        const matchesPlayer =
          !selectedPlayers.length ||
          selectedPlayers.some((player) => matchesPlayerFilter(product, player));
        const matchesSize =
          !selectedSizes.length ||
          selectedSizes.some((size) => productSupportsSize(product, size));
        const matchesRetro = !retroOnly || product.retro;

        return (
          matchesSearch &&
          matchesLeague &&
          matchesClub &&
          matchesPlayer &&
          matchesSize &&
          matchesRetro
        );
      })
      .sort((left, right) => {
        const leftHasImage = hasJerseyGallery(left.slug);
        const rightHasImage = hasJerseyGallery(right.slug);

        if (leftHasImage !== rightHasImage) {
          return leftHasImage ? -1 : 1;
        }

        return repairText(left.klub).localeCompare(repairText(right.klub), "hr");
      });
  }, [
    products,
    retroOnly,
    search,
    selectedClubs,
    selectedLeagues,
    selectedPlayers,
    selectedSizes
  ]);

  const activeTags = [
    ...selectedLeagues.map((value) => ({ type: "league" as const, value })),
    ...selectedClubs.map((value) => ({ type: "club" as const, value })),
    ...selectedPlayers.map((value) => ({ type: "player" as const, value })),
    ...selectedSizes.map((value) => ({ type: "size" as const, value })),
    ...(retroOnly ? [{ type: "retro" as const, value: "RETRO" }] : [])
  ];

  const activeFilterCount = activeTags.length;
  const hasAnyFilter =
    !!search.trim() ||
    selectedLeagues.length > 0 ||
    selectedClubs.length > 0 ||
    selectedPlayers.length > 0 ||
    selectedSizes.length > 0 ||
    retroOnly;

  const clearAllFilters = () => {
    setSearch("");
    setSelectedLeagues([]);
    setSelectedClubs([]);
    setSelectedPlayers([]);
    setSelectedSizes([]);
    setRetroOnly(false);
    setClubSearch("");
  };

  const toggleSection = (section: FilterSectionKey) => {
    setOpenSections((current) => ({ ...current, [section]: !current[section] }));
  };

  const removeTag = (type: (typeof activeTags)[number]["type"], value: string) => {
    if (type === "league") {
      setSelectedLeagues((current) => current.filter((item) => item !== value));
      return;
    }

    if (type === "club") {
      setSelectedClubs((current) => current.filter((item) => item !== value));
      return;
    }

    if (type === "player") {
      setSelectedPlayers((current) => current.filter((item) => item !== value));
      return;
    }

    if (type === "size") {
      setSelectedSizes((current) => current.filter((item) => item !== value));
      return;
    }

    setRetroOnly(false);
  };

  const checkboxClass =
    "flex items-center gap-3 rounded-[8px] border border-white/10 bg-black/45 px-3 py-2.5 text-sm text-white/72 transition duration-200 ease-out hover:border-white/20 hover:bg-white/[0.02]";
  const checkboxInputClass =
    "h-5 w-5 rounded-[4px] border-white/20 bg-black text-accent focus:ring-accent/30";

  const filterSidebar = (
    <div className="flex h-full flex-col gap-5">
      <div className="flex items-center justify-between gap-4 border-b border-white/10 pb-4 sm:pb-5">
        <div>
          <p className="text-xs uppercase tracking-[0.32em] text-white/45">{t.catalog.filters}</p>
          <p className="mt-2 text-2xl uppercase leading-none text-white">{t.catalog.filterTitle}</p>
          <p className="mt-2 text-sm text-white/45">{t.catalog.filterDesc}</p>
        </div>
        {hasAnyFilter ? (
          <button
            type="button"
            onClick={clearAllFilters}
            className="text-sm font-medium text-accent transition duration-200 ease-out hover:text-white"
          >
            {t.catalog.clearAll}
          </button>
        ) : null}
      </div>

      <FilterSection
        title={t.catalog.league}
        count={selectedLeagues.length}
        isOpen={openSections.liga}
        onToggle={() => toggleSection("liga")}
      >
        <div className="space-y-2.5">
          {leagueOptions.map((option) => (
            <label key={option} className={checkboxClass}>
              <input
                type="checkbox"
                checked={selectedLeagues.includes(option)}
                onChange={() => setSelectedLeagues((current) => toggleFilterValue(current, option))}
                className={checkboxInputClass}
              />
              <span>{option}</span>
            </label>
          ))}
        </div>
      </FilterSection>

      <FilterSection
        title={t.catalog.club}
        count={selectedClubs.length}
        isOpen={openSections.klub}
        onToggle={() => toggleSection("klub")}
      >
        <div className="space-y-4">
          {clubOptions.length > 8 ? (
            <label className="relative block">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/35" />
              <input
                value={clubSearch}
                onChange={(event) => setClubSearch(event.target.value)}
                placeholder={t.catalog.searchClub}
                className="h-12 w-full rounded-[8px] border border-white/10 bg-black pl-10 pr-4 text-sm text-white outline-none transition duration-200 ease-out focus:border-accent"
              />
            </label>
          ) : null}

          <div className="max-h-64 space-y-2.5 overflow-y-auto pr-1">
            {filteredClubOptions.map((option) => (
              <label key={option} className={checkboxClass}>
                <input
                  type="checkbox"
                  checked={selectedClubs.includes(option)}
                  onChange={() => setSelectedClubs((current) => toggleFilterValue(current, option))}
                  className={checkboxInputClass}
                />
                <span>{repairText(option)}</span>
              </label>
            ))}
          </div>
        </div>
      </FilterSection>

      <FilterSection
        title={t.catalog.player}
        count={selectedPlayers.length}
        isOpen={openSections.igrac}
        onToggle={() => toggleSection("igrac")}
      >
        <div className="max-h-64 space-y-2.5 overflow-y-auto pr-1">
          {PLAYER_FILTER_OPTIONS.map((option) => (
            <label key={option} className={checkboxClass}>
              <input
                type="checkbox"
                checked={selectedPlayers.includes(option)}
                onChange={() => setSelectedPlayers((current) => toggleFilterValue(current, option))}
                className={checkboxInputClass}
              />
              <span>{repairText(option)}</span>
            </label>
          ))}
        </div>
      </FilterSection>

      <FilterSection
        title={t.catalog.size}
        count={selectedSizes.length}
        isOpen={openSections.velicina}
        onToggle={() => toggleSection("velicina")}
      >
        <div className="space-y-4">
          <div>
            <p className="mb-3 text-xs uppercase tracking-[0.28em] text-white/45">{t.catalog.adults}</p>
            <div className="flex flex-wrap gap-2">
              {adultSizeOptions.map((size) => (
                <button
                  key={size}
                  type="button"
                  onClick={() => setSelectedSizes((current) => toggleFilterValue(current, size))}
                  className={`rounded-[6px] border px-4 py-2.5 text-sm font-semibold transition duration-200 ease-out ${
                    selectedSizes.includes(size)
                      ? "border-accent bg-accent text-black"
                      : "border-white/10 bg-[#111111] text-white hover:border-accent"
                  }`}
                >
                  {size}
                </button>
              ))}
            </div>
          </div>
          <div>
            <p className="mb-3 text-xs uppercase tracking-[0.28em] text-white/45">{t.catalog.kids}</p>
            <div className="flex flex-wrap gap-2">
              {kidSizeOptions.map((size) => (
                <button
                  key={size}
                  type="button"
                  onClick={() => setSelectedSizes((current) => toggleFilterValue(current, size))}
                  className={`rounded-[6px] border px-4 py-2.5 text-sm font-semibold transition duration-200 ease-out ${
                    selectedSizes.includes(size)
                      ? "border-accent bg-accent text-black"
                      : "border-white/10 bg-[#111111] text-white hover:border-accent"
                  }`}
                >
                  {size}
                </button>
              ))}
            </div>
          </div>
        </div>
      </FilterSection>

      <FilterSection
        title={t.catalog.retro}
        count={retroOnly ? 1 : 0}
        isOpen={openSections.retro}
        onToggle={() => toggleSection("retro")}
      >
        <button
          type="button"
          onClick={() => setRetroOnly((current) => !current)}
          className={`flex w-full items-center justify-between rounded-[8px] border px-4 py-4 transition duration-200 ease-out ${
            retroOnly
              ? "border-accent bg-accent/10"
              : "border-white/10 bg-[#111111] hover:border-accent"
          }`}
        >
          <span className="text-sm font-medium text-white">{t.catalog.retroToggle}</span>
          <span
            className={`relative inline-flex h-6 w-11 rounded-full transition ${
              retroOnly ? "bg-accent" : "bg-white/20"
            }`}
          >
            <span
              className={`absolute top-0.5 h-5 w-5 rounded-full bg-black transition ${
                retroOnly ? "left-[22px]" : "left-0.5"
              }`}
            />
          </span>
        </button>
      </FilterSection>
    </div>
  );

  return (
    <div className="panel p-3 sm:p-5 lg:p-7">
      {compactHeader ? (
        <div className="mb-5 flex items-center justify-between border-b border-white/10 pb-5 sm:mb-6">
          <div>
            <p className="text-xs uppercase tracking-[0.32em] text-white/45">{t.catalog.label}</p>
            <p className="mt-2 text-2xl uppercase leading-none text-white">{t.catalog.filterTitle}</p>
          </div>
          <span className="inline-flex w-fit rounded-[4px] bg-accent px-3 py-2 text-xs font-semibold text-black sm:px-4 sm:text-sm">
            {t.catalog.count(filteredProducts.length)}
          </span>
        </div>
      ) : (
        <div className="mb-6 flex flex-col gap-4 border-b border-white/10 pb-6 lg:mb-8 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.35em] text-white/45">{headingLabel ?? t.catalog.label}</p>
            <h1 className="mt-3 text-3xl uppercase leading-none text-white sm:text-5xl">
              {headingTitle ?? t.catalog.title}
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-7 text-white/60">
              {headingDesc ?? t.catalog.desc}
            </p>
          </div>
          <span className="inline-flex w-fit rounded-[4px] bg-accent px-4 py-2 text-sm font-semibold text-black">
            {t.catalog.count(filteredProducts.length)}
          </span>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-[272px_minmax(0,1fr)] lg:gap-7">
        <aside
          className="hidden lg:block lg:sticky"
          style={{ top: "calc(var(--announcement-offset, 0px) + 96px)" }}
        >
          {filterSidebar}
        </aside>

        <div className="min-w-0">
          <div className="mb-4 flex flex-col gap-3 sm:mb-5 sm:flex-row sm:items-center sm:justify-between">
            <div ref={searchWrapperRef} className="relative w-full">
              <Search className="pointer-events-none absolute left-4 top-1/2 z-10 h-4 w-4 -translate-y-1/2 text-white/35" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onFocus={() => setSearchFocused(true)}
                placeholder={t.catalog.searchPlaceholder}
                className="h-[52px] w-full rounded-[8px] border border-white/10 bg-black pl-11 pr-4 text-sm text-white outline-none transition duration-200 ease-out focus:border-accent sm:h-14"
              />
              {/* Suggestions dropdown */}
              <AnimatePresence>
                {searchFocused && suggestions.length > 0 && (
                  <motion.div
                    initial={{ opacity: 0, y: -6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -6 }}
                    transition={{ duration: 0.15, ease: "easeOut" }}
                    className="absolute left-0 right-0 top-full z-50 mt-1 overflow-hidden rounded-[10px] border border-white/10 bg-[#111111] shadow-[0_16px_48px_rgba(0,0,0,0.6)]"
                  >
                    {suggestions.map((product) => {
                      const gallery = (typeof window !== "undefined" || true) ? null : null;
                      const imgSrc = `/dresovi/${product.slug}/front.jpg`;
                      return (
                        <Link
                          key={product.slug}
                          href={`/dres/${product.slug}`}
                          onClick={() => { setSearchFocused(false); setSearch(""); }}
                          className="flex items-center gap-3 border-b border-white/5 px-4 py-3 transition-all duration-150 last:border-0 hover:bg-white/5"
                        >
                          <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-[6px] bg-[#0d0d0d]">
                            <Image
                              src={imgSrc}
                              alt={repairText(product.klub)}
                              fill
                              sizes="40px"
                              className="object-contain p-1"
                              style={{ mixBlendMode: "screen" }}
                              onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                            />
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-semibold text-white">{repairText(product.klub)}</p>
                            <p className="truncate text-xs text-white/45">{repairText(product.igrac)}</p>
                          </div>
                          <span className="shrink-0 font-heading text-sm text-accent">{product.price ?? 20}€</span>
                        </Link>
                      );
                    })}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <button
              type="button"
              onClick={() => setMobileFiltersOpen(true)}
              className="inline-flex h-[52px] w-full items-center justify-center gap-3 rounded-[8px] border border-accent bg-transparent px-5 text-sm font-semibold uppercase tracking-[0.24em] text-accent transition duration-200 ease-out hover:bg-accent/10 sm:h-14 lg:hidden"
            >
              <SlidersHorizontal className="h-4 w-4" />
              {t.catalog.filtersMobile}
              {activeFilterCount ? (
                <span className="rounded-[4px] bg-accent px-2 py-1 text-[11px] font-bold text-black">
                  {activeFilterCount}
                </span>
              ) : null}
            </button>
          </div>

          {activeTags.length ? (
            <div className="mb-4 flex flex-wrap gap-2 sm:mb-5">
              {activeTags.map((tag) => (
                <button
                  key={`${tag.type}-${tag.value}`}
                  type="button"
                  onClick={() => removeTag(tag.type, tag.value)}
                  className="inline-flex items-center gap-2 rounded-[4px] border border-accent/30 bg-accent/10 px-3 py-2 text-[13px] font-medium text-accent transition duration-200 ease-out hover:border-accent sm:px-4 sm:text-sm"
                >
                  <span>{repairText(tag.value)}</span>
                  <X className="h-3.5 w-3.5" />
                </button>
              ))}
            </div>
          ) : null}

          <div className="grid grid-cols-2 gap-3 md:gap-4 xl:grid-cols-3 2xl:grid-cols-3">
            {filteredProducts.map((product) => (
              <ProductCard key={product.slug} product={product} />
            ))}
          </div>

          {!filteredProducts.length ? (
            <div className="mt-6 rounded-[12px] border border-dashed border-white/10 bg-[#111111] p-6 text-center text-sm text-white/60 sm:mt-8 sm:p-8">
              {t.catalog.noResults}
            </div>
          ) : null}
        </div>
      </div>

      <AnimatePresence>
        {mobileFiltersOpen ? (
          <>
            <motion.button
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              type="button"
              className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm lg:hidden"
              onClick={() => setMobileFiltersOpen(false)}
              aria-label={t.catalog.closeFilters}
            />
            <motion.aside
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ type: "spring", stiffness: 240, damping: 28 }}
              className="fixed inset-0 z-[60] flex w-full flex-col bg-[#0a0a0a] p-4 lg:hidden"
            >
              <div className="mb-4 flex items-center justify-between border-b border-white/10 pb-4">
                <div>
                  <p className="text-xs uppercase tracking-[0.32em] text-white/45">{t.catalog.filters}</p>
                  <h3 className="mt-2 text-3xl uppercase leading-none text-white">{t.catalog.select}</h3>
                </div>
                <button
                  type="button"
                  onClick={() => setMobileFiltersOpen(false)}
                  className="flex h-11 w-11 items-center justify-center rounded-[8px] border border-white/10 bg-[#111111] text-white"
                  aria-label={t.catalog.closeFilters}
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto pr-1">{filterSidebar}</div>

              <button
                type="button"
                onClick={() => setMobileFiltersOpen(false)}
                className="button-primary mt-4 inline-flex h-14 items-center justify-center px-6"
              >
                {t.catalog.apply}
              </button>
            </motion.aside>
          </>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
