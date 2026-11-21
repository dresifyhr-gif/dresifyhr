"use client";

/* NOVI DIZAJN — zamjena za components/site/catalog-browser.tsx SAMO u buildu sa zastavicom
   (next.config.mjs → NOVI_SWAPS). Bez zastavice se ova datoteka ni ne učitava, pa stari
   katalog ostaje bajt-za-bajt isti.

   Ista logika kao stari CatalogBrowser (pretraga, poredak, svi filteri — liga, klub, igrač,
   veličina, retro, dugi rukav; "apparel" skup za trenirke/streetwear — brojač, "Prikaži još"
   s pravim <a href> za crawlere), samo prikaz u jeziku kataloga s naslovnice:
   - kartice "ime" (vješalica, "MODRIĆ. BROJ 14.", obrisano prezime, limeta cijena) — ista
     pretvorba proizvoda kao na naslovnici (ime-lib → cardData),
   - kontrole bez kutija: pretraga s tankom crtom, poredak i "Filteri" kao tekst,
   - filteri su hairline retci (tekst · broj · kvačica), bez pilula i sivih kutija,
   - bez kartica/redaka "Složi svoj mix" (svaka stranica proizvoda već nudi loptu i kapu). */

import Image from "next/image";
import Link from "next/link";
import { type ReactNode, useEffect, useMemo, useRef, useState } from "react";
import { useListMemory } from "@/lib/list-memory";
import { Check, ChevronDown, Search, X } from "lucide-react";

import { ImeCard, Overline } from "@/components/clean-demo/final/ime-card";
import { IME_BASE, IME_CSS, imePrice } from "@/components/clean-demo/final/ime-const";
import { cardData, imeNames, isSoldOut as imeSoldOut, kidsOnly } from "@/components/clean-demo/final/ime-lib";
import { useEText } from "@/components/clean-demo/final/e-i18n";
import type { MixVariant } from "@/components/site/mix-promo-card";
import { useLanguage } from "@/contexts/language-context";
import { hasJerseyGallery } from "@/lib/data/jersey-media";
import {
  FLAGSHIP_SLUG,
  PLAYER_FILTER_OPTIONS,
  getJerseySizeOptions,
  matchesPlayerFilter,
  normalizeText,
  productSupportsSize,
  type Jersey
} from "@/lib/data/jerseys";
import { hangerThumbSrc } from "@/lib/hanger-thumb";
import { repairText } from "@/lib/utils";

type CatalogBrowserProps = {
  products: Jersey[];
  compactHeader?: boolean;
  headingLabel?: string;
  headingTitle?: string;
  headingDesc?: string;
  /** Novi dizajn: zanemaruje se (promo "Složi svoj mix" se ne prikazuje). */
  showMixPromo?: boolean | MixVariant[];
  countKind?: "jerseys" | "kits" | "items";
  soldOutLast?: boolean;
  moreHref?: string;
  filterSet?: "all" | "apparel";
  clubLabel?: string;
};

// Rasprodano = nijedna veličina nije dostupna (isto pravilo kao stari katalog).
function isSoldOut(product: Jersey) {
  const o = getJerseySizeOptions(product);
  const anyAdult = !o.adultsOutOfStock && o.adults.some((s) => !o.soldOutSizes.includes(s));
  const anyKid = !o.kidsOutOfStock && o.kids.some((s) => !o.soldOutSizes.includes(s));
  return !anyAdult && !anyKid;
}

type SortOption = "recommended" | "price-asc" | "price-desc" | "name";
const SORTS: SortOption[] = ["recommended", "price-asc", "price-desc", "name"];

const leagueOptions = ["La Liga", "Premier Liga", "Bundesliga", "Serie A", "Ligue 1", "Reprezentacija", "Saudi Pro", "Brazil", "MLS"];

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

const PAGE_SIZE = 24;
const CLUB_LIMIT = 10;
const adultSizeOptions = ["S", "M", "L", "XL"];
const kidSizeOptions = ["116", "128", "140", "152", "164", "176"];

const toggleValue = (values: string[], v: string) => (values.includes(v) ? values.filter((x) => x !== v) : [...values, v]);

type TagType = "league" | "club" | "player" | "size" | "retro" | "long";

export function CatalogBrowser({
  products,
  compactHeader = false,
  headingLabel,
  headingTitle,
  headingDesc,
  countKind = "jerseys",
  soldOutLast = false,
  moreHref,
  filterSet = "all",
  clubLabel
}: CatalogBrowserProps) {
  const { t, locale } = useLanguage();
  const e = useEText();
  const en = locale === "en";
  const apparel = filterSet === "apparel";
  const clubTitle = clubLabel ?? t.catalog.club;

  // apparel: veličine iz samih proizvoda (dječje po visini, zatim slovne XS → XXL)
  const apparelSizes = useMemo(() => {
    if (!apparel) return [];
    const out: string[] = [];
    for (const p of products) for (const s of getJerseySizeOptions(p).adults) if (!out.includes(s)) out.push(s);
    const LETTERS = ["XXS", "XS", "S", "M", "L", "XL", "XXL", "XXXL"];
    const rank = (s: string) => {
      const n = parseInt(s, 10);
      if (!Number.isNaN(n)) return n + (s.includes("/") ? -0.5 : 0);
      const i = LETTERS.indexOf(s.toUpperCase());
      return 1000 + (i < 0 ? 99 : i);
    };
    return out.sort((a, b) => rank(a) - rank(b));
  }, [apparel, products]);

  // Opcije filtera s brojem proizvoda (iz STVARNIH proizvoda, i ručno dodanih).
  const leagueCounts = useMemo(() => {
    const m = new Map<string, number>();
    for (const p of products) m.set(p.liga, (m.get(p.liga) ?? 0) + 1);
    return leagueOptions.filter((l) => m.has(l)).map((v) => ({ v, n: m.get(v)! }));
  }, [products]);
  const clubCounts = useMemo(() => {
    const m = new Map<string, number>();
    for (const p of products) if (p.klub) m.set(p.klub, (m.get(p.klub) ?? 0) + 1);
    return [...m.entries()]
      .sort(([a], [b]) => {
        const ia = clubLabelOrder.indexOf(repairText(a));
        const ib = clubLabelOrder.indexOf(repairText(b));
        if (ia !== -1 && ib !== -1) return ia - ib;
        if (ia !== -1) return -1;
        if (ib !== -1) return 1;
        return repairText(a).localeCompare(repairText(b), "hr");
      })
      .map(([v, n]) => ({ v, n }));
  }, [products]);
  const playerCounts = useMemo(() => {
    if (apparel) return [];
    return PLAYER_FILTER_OPTIONS.map((v) => ({ v: v as string, n: products.filter((p) => matchesPlayerFilter(p, v)).length })).filter((o) => o.n > 0);
  }, [apparel, products]);
  const retroCount = useMemo(() => products.filter((p) => p.retro).length, [products]);
  const longCount = useMemo(() => products.filter((p) => p.category === "dugi-rukav").length, [products]);

  const [search, setSearch] = useState("");
  const [selectedLeagues, setSelectedLeagues] = useState<string[]>([]);
  const [selectedClubs, setSelectedClubs] = useState<string[]>([]);
  const [selectedPlayers, setSelectedPlayers] = useState<string[]>([]);
  const [selectedSizes, setSelectedSizes] = useState<string[]>([]);
  const [retroOnly, setRetroOnly] = useState(false);
  const [longSleeveOnly, setLongSleeveOnly] = useState(false);
  const [sortBy, setSortBy] = useState<SortOption>("recommended");
  const [sheet, setSheet] = useState(false);
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

  const skipReset = useRef(false);
  useEffect(() => {
    if (skipReset.current) return;
    setVisibleCount(PAGE_SIZE);
  }, [search, selectedLeagues, selectedClubs, selectedPlayers, selectedSizes, retroOnly, longSleeveOnly, sortBy]);

  // Povratak iz dresa: ista lista, isti broj učitanih, isti položaj.
  const rememberList = useListMemory(
    "katalog",
    () => ({ search, selectedLeagues, selectedClubs, selectedPlayers, selectedSizes, retroOnly, longSleeveOnly, sortBy, visibleCount }),
    (st) => {
      skipReset.current = true;
      setSearch(st.search ?? "");
      setSelectedLeagues(st.selectedLeagues ?? []);
      setSelectedClubs(st.selectedClubs ?? []);
      setSelectedPlayers(st.selectedPlayers ?? []);
      setSelectedSizes(st.selectedSizes ?? []);
      setRetroOnly(!!st.retroOnly);
      setLongSleeveOnly(!!st.longSleeveOnly);
      setSortBy(st.sortBy ?? "recommended");
      setVisibleCount(Math.max(PAGE_SIZE, Number(st.visibleCount) || PAGE_SIZE));
      window.setTimeout(() => {
        skipReset.current = false;
      }, 400);
    }
  );

  // ESC zatvara list; tijelo se ne pomiče dok je list otvoren
  useEffect(() => {
    if (!sheet) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (ev: KeyboardEvent) => ev.key === "Escape" && setSheet(false);
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [sheet]);

  const filteredProducts = useMemo(() => {
    const term = normalizeText(search.trim());
    return [...products]
      .filter((product) => {
        const searchable = normalizeText(`${repairText(product.klub)} ${repairText(product.igrac)} ${repairText(product.liga)}`);
        if (term && !searchable.includes(term)) return false;
        if (selectedLeagues.length && !selectedLeagues.includes(product.liga)) return false;
        if (selectedClubs.length && !selectedClubs.includes(product.klub)) return false;
        if (selectedPlayers.length && !selectedPlayers.some((pl) => matchesPlayerFilter(product, pl))) return false;
        if (
          selectedSizes.length &&
          !selectedSizes.some((size) =>
            apparel
              ? (() => {
                  const o = getJerseySizeOptions(product);
                  return !o.adultsOutOfStock && o.adults.includes(size) && !o.soldOutSizes.includes(size);
                })()
              : productSupportsSize(product, size)
          )
        )
          return false;
        if (retroOnly && !product.retro) return false;
        if (longSleeveOnly && product.category !== "dugi-rukav") return false;
        return true;
      })
      .sort((left, right) => {
        const recommended = () => {
          if (soldOutLast) {
            const lo = isSoldOut(left);
            const ro = isSoldOut(right);
            if (lo !== ro) return lo ? 1 : -1;
          }
          if (left.slug === FLAGSHIP_SLUG) return -1;
          if (right.slug === FLAGSHIP_SLUG) return 1;
          const lh = left.klub === "Hrvatska";
          const rh = right.klub === "Hrvatska";
          if (lh !== rh) return lh ? -1 : 1;
          const byClub = repairText(left.klub).localeCompare(repairText(right.klub), "hr");
          if (byClub !== 0) return byClub;
          const byPlayer = repairText(left.igrac).localeCompare(repairText(right.igrac), "hr");
          if (byPlayer !== 0) return byPlayer;
          const li = (left.images?.length ?? 0) > 0 || hasJerseyGallery(left.slug);
          const ri = (right.images?.length ?? 0) > 0 || hasJerseyGallery(right.slug);
          if (li !== ri) return li ? -1 : 1;
          return left.slug.localeCompare(right.slug);
        };
        if (sortBy === "price-asc" || sortBy === "price-desc") {
          const diff = (left.price ?? 20) - (right.price ?? 20);
          if (diff !== 0) return sortBy === "price-asc" ? diff : -diff;
          return recommended();
        }
        if (sortBy === "name") {
          const byName = repairText(left.klub).localeCompare(repairText(right.klub), "hr");
          if (byName !== 0) return byName;
          return recommended();
        }
        return recommended();
      });
  }, [products, search, selectedLeagues, selectedClubs, selectedPlayers, selectedSizes, retroOnly, longSleeveOnly, sortBy, soldOutLast, apparel]);

  const retroLabel = en ? "Retro" : "Retro";
  const longLabel = en ? "Long sleeve" : "Dugi rukav";
  const activeTags: { type: TagType; value: string; label: string }[] = [
    ...selectedLeagues.map((value) => ({ type: "league" as const, value, label: value })),
    ...selectedClubs.map((value) => ({ type: "club" as const, value, label: repairText(value) })),
    ...selectedPlayers.map((value) => ({ type: "player" as const, value, label: repairText(value) })),
    ...selectedSizes.map((value) => ({ type: "size" as const, value, label: value })),
    ...(retroOnly ? [{ type: "retro" as const, value: "retro", label: retroLabel }] : []),
    ...(longSleeveOnly ? [{ type: "long" as const, value: "long", label: longLabel }] : [])
  ];
  const activeCount = activeTags.length;

  const clearFilters = () => {
    setSelectedLeagues([]);
    setSelectedClubs([]);
    setSelectedPlayers([]);
    setSelectedSizes([]);
    setRetroOnly(false);
    setLongSleeveOnly(false);
  };
  const clearAll = () => {
    setSearch("");
    clearFilters();
  };
  const removeTag = (type: TagType, value: string) => {
    if (type === "league") setSelectedLeagues((c) => c.filter((x) => x !== value));
    else if (type === "club") setSelectedClubs((c) => c.filter((x) => x !== value));
    else if (type === "player") setSelectedPlayers((c) => c.filter((x) => x !== value));
    else if (type === "size") setSelectedSizes((c) => c.filter((x) => x !== value));
    else if (type === "retro") setRetroOnly(false);
    else setLongSleeveOnly(false);
  };

  const n = filteredProducts.length;
  const countLabel =
    countKind === "kits"
      ? t.catalog.countKits(n)
      : countKind === "items"
        ? en
          ? `${n} ${n === 1 ? "item" : "items"}`
          : `${n} ${n % 10 === 1 && n % 100 !== 11 ? "model" : "modela"}`
        : t.catalog.count(n);

  const searchPlaceholder = apparel
    ? en
      ? `Search model or ${clubTitle.toLowerCase()}`
      : `Pretraži model ili ${clubLabel ? clubLabel.toLowerCase().replace(/a$/, "u") : "klub"}`
    : t.catalog.searchPlaceholder;

  const visible = filteredProducts.slice(0, visibleCount);
  const remaining = n - visibleCount;

  const filterBody = (
    <div>
      {!apparel && leagueCounts.length > 0 ? (
        <Group title={t.catalog.league}>
          {leagueCounts.map((l) => (
            <Row key={l.v} label={e.leagueName(l.v)} n={l.n} on={selectedLeagues.includes(l.v)} onClick={() => setSelectedLeagues((c) => toggleValue(c, l.v))} />
          ))}
        </Group>
      ) : null}

      {apparel && clubCounts.length < 2 ? null : (
        <ClubGroup title={clubTitle} clubs={clubCounts} selected={selectedClubs} onToggle={(v) => setSelectedClubs((c) => toggleValue(c, v))} placeholder={t.catalog.searchClub} />
      )}

      {!apparel && playerCounts.length > 0 ? (
        <Group title={t.catalog.player}>
          <Collapsible items={playerCounts} limit={CLUB_LIMIT} moreLabel={(k) => (en ? `All players (${k})` : `Svi igrači (${k})`)} lessLabel={e.showLess}>
            {(o) => <Row key={o.v} label={repairText(o.v)} n={o.n} on={selectedPlayers.includes(o.v)} onClick={() => setSelectedPlayers((c) => toggleValue(c, o.v))} />}
          </Collapsible>
        </Group>
      ) : null}

      <Group title={t.catalog.size}>
        {apparel ? (
          <SizeLine sizes={apparelSizes} selected={selectedSizes} onToggle={(s) => setSelectedSizes((c) => toggleValue(c, s))} />
        ) : (
          <>
            <SizeLine label={t.catalog.adults} sizes={adultSizeOptions} selected={selectedSizes} onToggle={(s) => setSelectedSizes((c) => toggleValue(c, s))} />
            <SizeLine label={t.catalog.kids} sizes={kidSizeOptions} selected={selectedSizes} onToggle={(s) => setSelectedSizes((c) => toggleValue(c, s))} />
          </>
        )}
      </Group>

      {apparel ? null : (
        <Group title={en ? "Style" : "Stil"}>
          <Row label={t.catalog.retro} n={retroCount} on={retroOnly} onClick={() => setRetroOnly((v) => !v)} />
          <Row label={longLabel} n={longCount} on={longSleeveOnly} onClick={() => setLongSleeveOnly((v) => !v)} />
        </Group>
      )}
    </div>
  );

  // H1 "Dresovi — Klubovi & Reprezentacije. Od 20 €.": prvi dio krupno (Bebas), ostatak tiše —
  // tekst naslova (SEO) ostaje doslovno isti.
  const title = headingTitle ?? t.catalog.title;
  const dash = title.indexOf(" — ");
  const titleMain = dash > 0 ? title.slice(0, dash) : title;
  const titleRest = dash > 0 ? title.slice(dash) : "";

  return (
    <div className="nv-cat" onClickCapture={rememberList}>
      <style dangerouslySetInnerHTML={{ __html: IME_CSS + NV_CAT_CSS }} />

      {compactHeader ? null : (
        <header className="mt-3 border-b border-[#ffffff14] pb-5 sm:mt-6 lg:pb-8">
          <p className="text-[12px] font-medium uppercase tracking-[0.16em] text-white/40">{headingLabel ?? t.catalog.label}</p>
          <div className="mt-3 flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between lg:gap-10">
            <h1 className="e-display text-white">
              <span className="block text-[56px] sm:text-[72px] lg:text-[88px]">{titleMain}</span>
              {titleRest ? <span className="mt-2 block text-[22px] !leading-[1.05] text-white/55 sm:text-[28px]">{titleRest}</span> : null}
            </h1>
            <p className="shrink-0 text-[14px] tabular-nums text-[#e8ff3c] lg:pb-1">{countLabel}</p>
          </div>
          <p className="mt-3 line-clamp-2 max-w-2xl text-[13.5px] leading-[1.6] text-white/55 sm:mt-4 sm:line-clamp-none sm:text-[15px] sm:leading-[1.65]">{headingDesc ?? t.catalog.desc}</p>
        </header>
      )}

      <div className={`${compactHeader ? "" : "mt-3 lg:mt-8 "}lg:grid lg:grid-cols-[220px_minmax(0,1fr)] lg:gap-12`}>
        {/* Računalo: filteri lijevo, prilijepljeni */}
        <aside aria-label={t.catalog.filters} className="hidden lg:block">
          <div className="nv-cat-side sticky max-h-[calc(100vh-116px)] overflow-y-auto pb-28 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            <div className="flex h-11 items-center justify-between">
              <p className="text-[13px] text-white/50">
                <span className="tabular-nums text-white">{n}</span> {e.products}
              </p>
              {activeCount ? (
                <button type="button" onClick={clearFilters} className="text-[13px] text-white/50 transition-colors hover:text-[#e8ff3c]">
                  {e.clear}
                </button>
              ) : null}
            </div>
            {filterBody}
          </div>
        </aside>

        <div className="min-w-0">
          {/* Pretraga + poredak (+ Filteri na mobitelu) — bez kutija */}
          <div className="flex flex-col lg:flex-row lg:items-center lg:gap-8">
            <label className="relative block flex-1">
              <span className="sr-only">{e.search}</span>
              <Search aria-hidden strokeWidth={1.5} className="pointer-events-none absolute left-0 top-1/2 h-[17px] w-[17px] -translate-y-1/2 text-white/40" />
              <input
                type="search"
                value={search}
                onChange={(ev) => setSearch(ev.target.value)}
                placeholder={searchPlaceholder}
                className="h-12 w-full rounded-none border-0 border-b border-[#ffffff1f] bg-transparent pl-7 pr-9 text-[16px] text-white outline-none transition-colors placeholder:text-white/35 focus:border-[#e8ff3c] [&::-webkit-search-cancel-button]:appearance-none"
              />
              {search ? (
                <button type="button" aria-label={e.clearSearch} onClick={() => setSearch("")} className="absolute right-0 top-1/2 flex h-10 w-9 -translate-y-1/2 items-center justify-end text-white/45 hover:text-white">
                  <X strokeWidth={1.5} className="h-4 w-4" />
                </button>
              ) : null}
            </label>
            <div className="flex h-12 items-center justify-between lg:justify-end">
              <SortSelect value={sortBy} onChange={setSortBy} label={en ? "Sort" : "Sortiraj"} />
              <button
                type="button"
                onClick={() => setSheet(true)}
                aria-haspopup="dialog"
                className="relative flex h-11 items-center gap-1.5 pl-3 text-[14px] text-white/85 active:text-white lg:hidden"
              >
                {t.catalog.filters}
                {activeCount ? <span className="tabular-nums text-[#e8ff3c]">{activeCount}</span> : null}
                {activeCount ? <span aria-hidden className="absolute inset-x-0 left-3 bottom-2 h-px bg-[#e8ff3c]" /> : null}
              </button>
            </div>
          </div>

          {/* Odabrano (samo tekst, dodir uklanja) */}
          {activeCount ? (
            <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-0.5 text-[13.5px]">
              {activeTags.map((tag) => (
                <button key={`${tag.type}-${tag.value}`} type="button" onClick={() => removeTag(tag.type, tag.value)} className="flex h-9 items-center gap-1.5 text-white/85 hover:text-white">
                  {tag.label}
                  <X aria-hidden strokeWidth={1.5} className="h-3.5 w-3.5 text-white/40" />
                </button>
              ))}
              <button type="button" onClick={clearFilters} className="h-9 text-white/45 hover:text-[#e8ff3c]">
                {t.catalog.clearAll}
              </button>
            </div>
          ) : null}

          <div className="mt-4 lg:mt-6">
            {n === 0 ? (
              <div className="border-y border-[#ffffff14] py-10 text-center">
                <p className="mx-auto max-w-md text-[15px] leading-relaxed text-white/80">{t.catalog.noResults}</p>
                <button type="button" onClick={clearAll} className="mt-3 h-10 text-[14px] text-white/55 underline decoration-[#e8ff3c] underline-offset-4 hover:text-white">
                  {e.clearSearchFilters}
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-x-3 gap-y-9 sm:gap-x-5 md:grid-cols-3 lg:gap-x-6 lg:gap-y-12 xl:grid-cols-4">
                {visible.map((p, i) => (
                  <ListingCard key={p.slug} product={p} priority={!compactHeader && i < 4} />
                ))}
              </div>
            )}
          </div>

          {remaining > 0 ? (
            <div className="mt-12 flex flex-col items-center gap-3">
              <p className="text-[12.5px] tabular-nums text-white/40">{e.of(visibleCount, n)}</p>
              {moreHref ? (
                <a
                  href={moreHref}
                  onClick={(ev) => {
                    ev.preventDefault();
                    setVisibleCount((c) => c + PAGE_SIZE);
                  }}
                  className="nv-more"
                >
                  {en ? "Show more" : "Prikaži još"} <span className="tabular-nums text-[#e8ff3c]">{remaining}</span>
                </a>
              ) : (
                <button type="button" onClick={() => setVisibleCount((c) => c + PAGE_SIZE)} className="nv-more">
                  {en ? "Show more" : "Prikaži još"} <span className="tabular-nums text-[#e8ff3c]">{remaining}</span>
                </button>
              )}
            </div>
          ) : null}
        </div>
      </div>

      {/* Mobitel: list s filterima preko cijelog ekrana (puna pozadina, bez zamućenja) */}
      {sheet ? (
        <div role="dialog" aria-modal="true" aria-label={t.catalog.filters} className="fixed inset-0 z-[80] flex flex-col bg-[#0a0a0a] lg:hidden">
          <div className="flex h-[56px] shrink-0 items-center justify-between border-b border-[#ffffff14] px-4" style={{ marginTop: "env(safe-area-inset-top)" }}>
            <button type="button" onClick={clearFilters} disabled={!activeCount} className="h-11 text-[14px] text-white/55 disabled:opacity-35">
              {e.clear}
            </button>
            <p className="e-display text-[24px] text-white">
              {t.catalog.filters}
              {activeCount ? <span className="ml-1.5 tabular-nums text-[#e8ff3c]">{activeCount}</span> : null}
            </p>
            <button type="button" aria-label={t.catalog.closeFilters} onClick={() => setSheet(false)} className="-mr-2 flex h-11 w-11 items-center justify-center text-white/70">
              <X strokeWidth={1.5} className="h-5 w-5" />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto overscroll-contain px-4 pb-8">{filterBody}</div>
          <div className="shrink-0 border-t border-[#ffffff14] px-4 pt-3" style={{ paddingBottom: "max(12px, env(safe-area-inset-bottom))" }}>
            <button type="button" onClick={() => setSheet(false)} className="e-display flex h-12 w-full items-center justify-center bg-[#e8ff3c] pt-0.5 text-[22px] text-black active:bg-[#d6ec2f]">
              {e.show} <span className="ml-2 tabular-nums">{n}</span>
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

/* ---------------- kartica ---------------- */

/** Kartica "ime" s naslovnice; proizvodi bez slike na vješalici (kompleti — složena slika,
 *  streetwear — izrez) dobiju isti kadar, natpis i cijenu, samo bez šipke. */
function ListingCard({ product, priority }: { product: Jersey; priority: boolean }) {
  const c = cardData(product);
  if (c) return <ImeCard c={c} priority={priority} sizes="(max-width: 767px) 50vw, (max-width: 1279px) 30vw, 300px" />;
  return <PhotoCard product={product} priority={priority} />;
}

function PhotoCard({ product, priority }: { product: Jersey; priority: boolean }) {
  const e = useEText();
  const nm = imeNames(product);
  const img = hangerThumbSrc(product.slug);
  const soldOut = imeSoldOut(product);
  const kids = !soldOut && kidsOnly(product);
  const letters = Math.max(3, nm.surname.length);
  return (
    <article className="ime-card group">
      <Link href={`${IME_BASE}/dres/${product.slug}`} className="block outline-none focus-visible:ring-1 focus-visible:ring-white/60">
        <div
          className="relative aspect-[4/5] overflow-hidden bg-[#121212]"
          style={{ containerType: "size", backgroundImage: "radial-gradient(ellipse 75% 60% at 50% 46%, #1d1d1d 0%, #141414 55%, #0f0f0f 100%)" }}
        >
          <div aria-hidden className="absolute inset-x-0 flex justify-center" style={{ top: "50%", transform: "translateY(-50%)" }}>
            <span className="ime-outline block whitespace-nowrap leading-[0.8]" style={{ fontSize: `${(125 / (letters * 0.43)).toFixed(2)}cqw` }}>
              {nm.surname}
            </span>
          </div>
          <div className="absolute left-3.5 lg:left-4" style={{ bottom: "calc(84% + 9px)" }}>
            <Overline surname={nm.number ? nm.surname : nm.title.toLocaleUpperCase("hr")} number={nm.number} />
          </div>
          {img ? (
            <Image
              src={img}
              alt={`${nm.club} ${nm.title}`}
              fill
              priority={priority}
              sizes="(max-width: 767px) 50vw, 300px"
              className={`object-contain px-[7%] pb-[6%] pt-[17%] drop-shadow-[0_16px_18px_rgba(0,0,0,0.55)] transition-transform duration-500 ease-[cubic-bezier(.22,1,.36,1)] group-hover:-translate-y-1 ${soldOut ? "opacity-40" : ""}`}
            />
          ) : (
            <>
              <span aria-hidden className="absolute inset-x-0 top-[16%] h-[3px] -translate-y-1/2" style={{ background: "linear-gradient(180deg,#f3f3f5 0 25%,#55555a 25% 50%,#d9d9dc 50% 75%,#121216 75% 100%)" }} />
              <p className="absolute inset-x-0 bottom-6 text-center text-[13px] text-white/40">{e.hangerSoon}</p>
            </>
          )}
        </div>
        <div className="pt-3.5">
          <p className="truncate text-[12.5px] text-white/45">
            {nm.club}
            {nm.variant ? <span className="text-white/30"> · {nm.variant}</span> : null}
            {kids ? <span className="text-white/70"> · {e.kidsOnly}</span> : null}
          </p>
          <div className="mt-1 flex items-baseline justify-between gap-3">
            <h3 className="ime-card-name e-display truncate pt-0.5 text-[22px] !leading-none text-white lg:text-[24px]">{nm.title}</h3>
            <p className="shrink-0 text-[15px] tabular-nums text-[#e8ff3c]">{soldOut ? <span className="text-white/40">{e.soldOut}</span> : imePrice(product.price ?? 20)}</p>
          </div>
        </div>
      </Link>
    </article>
  );
}

/* ---------------- kontrole ---------------- */

function SortSelect({ value, onChange, label }: { value: SortOption; onChange: (s: SortOption) => void; label: string }) {
  const { locale } = useLanguage();
  const en = locale === "en";
  const names: Record<SortOption, string> = en
    ? { recommended: "Recommended", "price-asc": "Price: low → high", "price-desc": "Price: high → low", name: "Name: A–Z" }
    : { recommended: "Preporučeno", "price-asc": "Cijena: niža → viša", "price-desc": "Cijena: viša → niža", name: "Naziv: A–Z" };
  return (
    <label className="relative flex h-11 cursor-pointer items-center gap-1 text-[14px] text-white/85 hover:text-white">
      <span className="sr-only">{label}</span>
      <span aria-hidden>{names[value]}</span>
      <ChevronDown aria-hidden strokeWidth={1.5} className="h-4 w-4 text-white/40" />
      <select value={value} onChange={(ev) => onChange(ev.target.value as SortOption)} className="absolute inset-0 cursor-pointer appearance-none bg-transparent text-transparent opacity-0">
        {SORTS.map((k) => (
          <option key={k} value={k}>
            {names[k]}
          </option>
        ))}
      </select>
    </label>
  );
}

function Group({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="mt-7 first:mt-3">
      <h3 className="e-display pb-1.5 text-[15px] !tracking-[0.08em] text-white/40">{title}</h3>
      <div className="border-t border-[#ffffff14]">{children}</div>
    </section>
  );
}

function Row({ label, n, on, onClick }: { label: string; n: number; on: boolean; onClick: () => void }) {
  return (
    <button type="button" role="checkbox" aria-checked={on} onClick={onClick} className="group/row flex h-11 w-full items-center justify-between border-b border-[#ffffff0d] text-left text-[14.5px]">
      <span className={on ? "text-white" : "text-white/70 group-hover/row:text-white"}>{label}</span>
      <span className="flex items-center gap-2">
        <span className="text-[12px] tabular-nums text-white/30">{n}</span>
        <span className="flex w-4 justify-end">{on ? <Check strokeWidth={2} className="h-4 w-4 text-[#e8ff3c]" /> : null}</span>
      </span>
    </button>
  );
}

function Collapsible<T>({ items, limit, moreLabel, lessLabel, children }: { items: T[]; limit: number; moreLabel: (n: number) => string; lessLabel: string; children: (item: T) => ReactNode }) {
  const [all, setAll] = useState(false);
  const shown = all ? items : items.slice(0, limit);
  return (
    <>
      {shown.map(children)}
      {items.length > limit ? (
        <button type="button" onClick={() => setAll((a) => !a)} className="flex h-11 w-full items-center text-[14px] text-white/50 hover:text-white">
          {all ? lessLabel : moreLabel(items.length)}
        </button>
      ) : null}
    </>
  );
}

function ClubGroup({ title, clubs, selected, onToggle, placeholder }: { title: string; clubs: { v: string; n: number }[]; selected: string[]; onToggle: (v: string) => void; placeholder: string }) {
  const e = useEText();
  const [cq, setCq] = useState("");
  const term = normalizeText(cq.trim());
  const found = term ? clubs.filter((c) => normalizeText(repairText(c.v)).includes(term)) : null;
  const row = (c: { v: string; n: number }) => <Row key={c.v} label={repairText(c.v)} n={c.n} on={selected.includes(c.v)} onClick={() => onToggle(c.v)} />;
  return (
    <Group title={title}>
      {clubs.length > 8 ? (
        <label className="relative block border-b border-[#ffffff0d]">
          <span className="sr-only">{placeholder}</span>
          <Search aria-hidden strokeWidth={1.5} className="pointer-events-none absolute left-0 top-1/2 h-[15px] w-[15px] -translate-y-1/2 text-white/35" />
          <input
            type="search"
            value={cq}
            onChange={(ev) => setCq(ev.target.value)}
            placeholder={placeholder}
            className="h-11 w-full rounded-none border-0 bg-transparent pl-6 text-[16px] text-white outline-none placeholder:text-white/35 lg:text-[14px] [&::-webkit-search-cancel-button]:appearance-none"
          />
        </label>
      ) : null}
      {found ? (
        found.length ? found.map(row) : <p className="py-3 text-[13px] text-white/40">{e.noResults}</p>
      ) : (
        <Collapsible items={clubs} limit={CLUB_LIMIT} moreLabel={e.allClubs} lessLabel={e.showLess}>
          {row}
        </Collapsible>
      )}
    </Group>
  );
}

function SizeLine({ label, sizes, selected, onToggle }: { label?: string; sizes: string[]; selected: string[]; onToggle: (s: string) => void }) {
  return (
    <div className="border-b border-[#ffffff0d] py-2.5">
      {label ? <p className="text-[12px] text-white/35">{label}</p> : null}
      <div className="-ml-2 mt-1 flex flex-wrap gap-x-1">
        {sizes.map((s) => {
          const on = selected.includes(s);
          return (
            <button
              key={s}
              type="button"
              role="checkbox"
              aria-checked={on}
              onClick={() => onToggle(s)}
              className={`relative h-10 min-w-[40px] px-2 text-[14.5px] tabular-nums transition-colors ${on ? "text-white" : "text-white/60 hover:text-white"}`}
            >
              {s}
              {on ? <span aria-hidden className="absolute inset-x-2 bottom-1.5 h-[2px] bg-[#e8ff3c]" /> : null}
            </button>
          );
        })}
      </div>
    </div>
  );
}

/* Prilijepljena bočna traka ispod zaglavlja; "Prikaži još" = tekst s tankim crtama (bez kutije). */
const NV_CAT_CSS = `
.nv-cat-side{top:calc(var(--announcement-offset,0px) + 92px)}
.nv-cat .nv-more{display:inline-flex;align-items:center;gap:.5rem;height:48px;padding:0 28px;border-top:1px solid #ffffff1f;border-bottom:1px solid #ffffff1f;font-family:var(--font-bebas),sans-serif;font-size:20px;letter-spacing:.04em;color:#fff;transition:border-color .2s}
.nv-cat .nv-more:hover{border-color:#e8ff3c}
`;
