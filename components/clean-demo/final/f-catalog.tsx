"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useState, type ReactNode, useRef } from "react";
import { useListMemory } from "@/lib/list-memory";
import { Check, ChevronDown, Search, X } from "lucide-react";

import { DSegmented } from "@/components/clean-demo/d/d-segmented";
import { hasJerseyGallery } from "@/lib/data/jersey-media";
import { FLAGSHIP_SLUG, normalizeText, productSupportsSize, type Jersey } from "@/lib/data/jerseys";
import { hangerThumbSrc } from "@/lib/hanger-thumb";
import { repairText } from "@/lib/utils";

import { ImeCard, Overline } from "./ime-card";
import { IME_BASE, imePrice } from "./ime-const";
import { cardData, imeNames, isSoldOut, kidsOnly } from "./ime-lib";
import { isReturning } from "./ime-transition";
import { useEText } from "./e-i18n";

/* ------------------------------------------------------------------ */
/*  FINAL katalog: filteri Smjera D + kartice "ime" (prijelaz u dres). */
/*  Tiho: bez neonskih natpisa, bez kutija oko filtera, bez pilula.     */
/*  Filteri su hairline retci (tekst · broj · kvačica kad je odabrano). */
/*  Kartice: vješalica + vlastita šipka (razmak između kartica), srce,  */
/*  ime, klub, cijena. Dodir kartice → stranica dresa.                  */
/*  Bez retka "Složi svoj mix" (Igor 19.11.: svaka stranica dresa već  */
/*  nudi loptu i kapu).                                                 */
/* ------------------------------------------------------------------ */

type Tab = "dresovi" | "trenirka" | "streetwear";
type Sort = "recommended" | "price-asc" | "price-desc" | "name";

const SORTS: Sort[] = ["recommended", "price-asc", "price-desc", "name"];

const LEAGUES = ["La Liga", "Premier Liga", "Bundesliga", "Serie A", "Ligue 1", "Reprezentacija", "Saudi Pro", "Brazil", "MLS"];
const CLUB_ORDER = [
  "Hrvatska",
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
  "Argentina",
  "Brazil",
  "Njemačka",
  "Francuska",
  "Portugal",
  "Al-Nassr",
  "Inter Miami",
];
const ADULT_SIZES = ["S", "M", "L", "XL", "XXL"];
const KID_SIZES = ["116", "128", "140", "152", "164", "176"];
const PAGE = 24;
const CLUB_LIMIT = 10;

export function FCatalog({ dresovi, trenirke, streetwear }: { dresovi: Jersey[]; trenirke: Jersey[]; streetwear: Jersey[] }) {
  const [tab, setTab] = useState<Tab>("dresovi");
  const t = useEText();

  useEffect(() => {
    const sync = () => {
      const h = window.location.hash;
      if (h === "#streetwear") setTab("streetwear");
      else if (h === "#trenirke") setTab("trenirka");
      else {
        if (h === "#dresovi") setTab("dresovi");
        return;
      }
      // kartica kataloga nema vlastito sidro → skrolaj na katalog (ne kod povratka sa stranice dresa)
      if (isReturning()) return;
      requestAnimationFrame(() => document.getElementById("dresovi")?.scrollIntoView({ block: "start" }));
    };
    sync();
    window.addEventListener("hashchange", sync);
    return () => window.removeEventListener("hashchange", sync);
  }, []);

  const options = [
    { key: "dresovi" as Tab, label: t.jerseys, count: dresovi.length },
    ...(trenirke.length ? [{ key: "trenirka" as Tab, label: t.tracksuits, count: trenirke.length }] : []),
    ...(streetwear.length ? [{ key: "streetwear" as Tab, label: "Streetwear", count: streetwear.length }] : []),
  ];
  const products = tab === "trenirka" ? trenirke : tab === "streetwear" ? streetwear : dresovi;

  return (
    <div>
      <h2 className="e-display text-[44px] text-white sm:text-[56px]">{t.catalog}</h2>
      {options.length > 1 ? (
        <div className="-mx-4 mt-3 sm:-mx-[22px]">
          <DSegmented label={t.catalog} options={options} value={tab} onChange={setTab} />
        </div>
      ) : null}
      <FBrowser key={tab} products={products} withFilters={tab === "dresovi"} />
    </div>
  );
}

/* ================================================================== */
/*  Pretraga + filteri + grid                                          */
/* ================================================================== */

type Filters = { leagues: string[]; clubs: string[]; sizes: string[] };
const EMPTY: Filters = { leagues: [], clubs: [], sizes: [] };
const toggle = (arr: string[], v: string) => (arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v]);

function FBrowser({ products, withFilters }: { products: Jersey[]; withFilters: boolean }) {
  const [q, setQ] = useState("");
  const [sort, setSort] = useState<Sort>("recommended");
  const [f, setF] = useState<Filters>(EMPTY);
  const [sheet, setSheet] = useState(false);
  const [shown, setShown] = useState(PAGE);
  const t = useEText();

  const skipReset = useRef(false);
  useEffect(() => {
    if (!skipReset.current) setShown(PAGE);
  }, [q, sort, f]);

  // Povratak iz dresa: ista lista, isti broj učitanih, isti položaj.
  const lmId = `pocetna-${withFilters ? "dresovi" : products.length}`;
  const rememberList = useListMemory(
    lmId,
    () => ({ q, sort, f, shown }),
    (st) => {
      skipReset.current = true;
      setQ(st.q ?? "");
      setSort(st.sort ?? "recommended");
      setF(st.f ?? EMPTY);
      setShown(Math.max(PAGE, Number(st.shown) || PAGE));
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
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setSheet(false);
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [sheet]);

  const leagues = useMemo(() => {
    const m = new Map<string, number>();
    for (const p of products) m.set(p.liga, (m.get(p.liga) ?? 0) + 1);
    return LEAGUES.filter((l) => m.has(l)).map((l) => ({ v: l, n: m.get(l)! }));
  }, [products]);
  const clubs = useMemo(() => {
    const m = new Map<string, number>();
    for (const p of products) if (p.klub) m.set(p.klub, (m.get(p.klub) ?? 0) + 1);
    return [...m.entries()]
      .sort((a, b) => {
        const ia = CLUB_ORDER.indexOf(repairText(a[0]));
        const ib = CLUB_ORDER.indexOf(repairText(b[0]));
        if (ia !== -1 || ib !== -1) return (ia === -1 ? 999 : ia) - (ib === -1 ? 999 : ib);
        return b[1] - a[1] || repairText(a[0]).localeCompare(repairText(b[0]), "hr");
      })
      .map(([v, n]) => ({ v, n }));
  }, [products]);

  // rasprodano uvijek na kraj (u svakom poretku) — da ne sjedi među prvih šest
  const outSet = useMemo(() => new Set(products.filter(isSoldOut).map((p) => p.slug)), [products]);

  const list = useMemo(() => {
    const term = normalizeText(q.trim());
    const rec = (a: Jersey, b: Jersey) => {
      if (a.slug === FLAGSHIP_SLUG) return -1;
      if (b.slug === FLAGSHIP_SLUG) return 1;
      const ah = a.klub === "Hrvatska";
      const bh = b.klub === "Hrvatska";
      if (ah !== bh) return ah ? -1 : 1;
      const c = repairText(a.klub).localeCompare(repairText(b.klub), "hr");
      if (c) return c;
      const p = repairText(a.igrac).localeCompare(repairText(b.igrac), "hr");
      if (p) return p;
      const ai = (a.images?.length ?? 0) > 0 || hasJerseyGallery(a.slug);
      const bi = (b.images?.length ?? 0) > 0 || hasJerseyGallery(b.slug);
      if (ai !== bi) return ai ? -1 : 1;
      return a.slug.localeCompare(b.slug);
    };
    return products
      .filter((p) => {
        if (term && !normalizeText(`${repairText(p.klub)} ${repairText(p.igrac)} ${repairText(p.liga)}`).includes(term)) return false;
        if (f.leagues.length && !f.leagues.includes(p.liga)) return false;
        if (f.clubs.length && !f.clubs.includes(p.klub)) return false;
        if (f.sizes.length && !f.sizes.some((s) => productSupportsSize(p, s))) return false;
        return true;
      })
      .sort((a, b) => {
        const ao = outSet.has(a.slug);
        if (ao !== outSet.has(b.slug)) return ao ? 1 : -1;
        if (sort === "price-asc" || sort === "price-desc") {
          const d = (a.price ?? 20) - (b.price ?? 20);
          if (d) return sort === "price-asc" ? d : -d;
        }
        if (sort === "name") {
          const d = repairText(a.klub).localeCompare(repairText(b.klub), "hr");
          if (d) return d;
        }
        return rec(a, b);
      });
  }, [products, q, sort, f, outSet]);

  const active = f.leagues.length + f.clubs.length + f.sizes.length;
  const clear = () => setF(EMPTY);
  const visible = list.slice(0, shown);

  const filterBody = (
    <FilterList
      leagues={leagues}
      clubs={clubs}
      f={f}
      setF={setF}
    />
  );

  return (
    <div className="mt-6 lg:grid lg:grid-cols-[220px_minmax(0,1fr)] lg:gap-12" data-lm={lmId} onClickCapture={rememberList}>
      {/* Računalo: filteri lijevo, prilijepljeni */}
      {withFilters ? (
        <aside aria-label={t.filters} className="hidden lg:block">
          <div className="sticky top-[92px] max-h-[calc(100vh-116px)] overflow-y-auto pb-28 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            <div className="flex h-10 items-center justify-between">
              <p className="text-[13px] text-white/50">
                <span className="tabular-nums text-white">{list.length}</span> {t.products}
              </p>
              {active ? (
                <button type="button" onClick={clear} className="text-[13px] text-white/50 hover:text-white">
                  {t.clear}
                </button>
              ) : null}
            </div>
            {filterBody}
          </div>
        </aside>
      ) : (
        <div className="hidden lg:block" />
      )}

      <div className="min-w-0">
        {/* Pretraga + poredak (+ Filteri na mobitelu) */}
        <div className="flex flex-col gap-1 lg:flex-row lg:items-center lg:gap-4">
          <label className="relative block flex-1">
            <span className="sr-only">{t.search}</span>
            <Search strokeWidth={1.5} className="pointer-events-none absolute left-3.5 top-1/2 h-[17px] w-[17px] -translate-y-1/2 text-white/40" />
            <input
              type="search"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder={t.searchPh}
              className="h-11 w-full rounded-[12px] bg-[#141414] pl-10 pr-10 text-[15px] text-white outline-none placeholder:text-white/35 focus:bg-[#1a1a1a] [&::-webkit-search-cancel-button]:appearance-none"
            />
            {q ? (
              <button type="button" aria-label={t.clearSearch} onClick={() => setQ("")} className="absolute right-1 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center text-white/45">
                <X strokeWidth={1.5} className="h-4 w-4" />
              </button>
            ) : null}
          </label>
          <div className="flex h-11 items-center justify-between lg:justify-end">
            <SortSelect value={sort} onChange={setSort} />
            {withFilters ? (
              <button type="button" onClick={() => setSheet(true)} className="flex h-11 items-center gap-1.5 pl-3 text-[14px] text-white/80 active:text-white lg:hidden">
                {t.filters}
                {active ? <span className="tabular-nums text-white/45">{active}</span> : null}
              </button>
            ) : null}
          </div>
        </div>

        {/* Odabrano (samo tekst, dodir uklanja) */}
        {active ? (
          <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-[13px]">
            {[...f.leagues.map((v) => ["leagues", v] as const), ...f.clubs.map((v) => ["clubs", v] as const), ...f.sizes.map((v) => ["sizes", v] as const)].map(([k, v]) => (
              <button
                key={`${k}${v}`}
                type="button"
                onClick={() => setF((c) => ({ ...c, [k]: c[k].filter((x) => x !== v) }))}
                className="flex h-8 items-center gap-1 text-white/80"
              >
                {repairText(v)}
                <X strokeWidth={1.5} className="h-3.5 w-3.5 text-white/40" />
              </button>
            ))}
            <button type="button" onClick={clear} className="h-8 text-white/45">
              {t.clearAll}
            </button>
          </div>
        ) : null}

        <div className="mt-5">
          {list.length === 0 ? (
            <div className="border-y border-[#ffffff12] py-10 text-center">
              <p className="text-[15px] text-white">{t.noResults}</p>
              <button type="button" onClick={() => { setQ(""); clear(); }} className="mt-2 h-10 text-[14px] text-white/55 underline-offset-4 hover:underline">
                {t.clearSearchFilters}
              </button>
            </div>
          ) : (
            <>
              {/* katalog je na naslovnici daleko ispod prvog ekrana → bez priority (ne otima pojas LCP ploči scene) */}
              <Grid items={visible} />
            </>
          )}
        </div>

        {list.length > shown ? (
          <div className="mt-10 flex flex-col items-center gap-2">
            <p className="text-[12.5px] tabular-nums text-white/40">
              {t.of(shown, list.length)}
            </p>
            <button type="button" onClick={() => setShown((s) => s + PAGE)} className="h-11 rounded-[12px] bg-[#141414] px-6 text-[14.5px] font-medium text-white active:bg-[#1c1c1c]">
              {t.showMore}
            </button>
          </div>
        ) : null}
      </div>

      {/* Mobitel: list s filterima preko cijelog ekrana (puna pozadina, bez zamućenja) */}
      {withFilters && sheet ? (
        <div role="dialog" aria-modal="true" aria-label={t.filters} className="fixed inset-0 z-[60] flex flex-col bg-[#0b0b0b] lg:hidden">
          <div className="flex h-[54px] shrink-0 items-center justify-between border-b border-[#ffffff12] px-4" style={{ marginTop: "env(safe-area-inset-top)" }}>
            <button type="button" onClick={clear} className="h-11 text-[14px] text-white/50 disabled:opacity-40" disabled={!active}>
              {t.clear}
            </button>
            <p className="text-[15px] font-semibold text-white">{t.filters}</p>
            <button type="button" aria-label={t.close} onClick={() => setSheet(false)} className="-mr-2 flex h-11 w-11 items-center justify-center text-white/70">
              <X strokeWidth={1.5} className="h-5 w-5" />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto overscroll-contain px-4 pb-6">{filterBody}</div>
          <div className="shrink-0 border-t border-[#ffffff12] px-4 pt-3" style={{ paddingBottom: "max(12px, env(safe-area-inset-bottom))" }}>
            <button type="button" onClick={() => setSheet(false)} className="h-12 w-full rounded-[14px] bg-white text-[15px] font-semibold text-black">
              {t.show} <span className="tabular-nums">{list.length}</span>
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function SortSelect({ value, onChange }: { value: Sort; onChange: (s: Sort) => void }) {
  const t = useEText();
  return (
    <label className="relative flex h-11 items-center gap-1 text-[14px] text-white/80">
      <span className="sr-only">{t.sortLabel}</span>
      <span aria-hidden>{t.sort[value]}</span>
      <ChevronDown aria-hidden strokeWidth={1.5} className="h-4 w-4 text-white/40" />
      <select
        value={value}
        onChange={(e) => onChange(e.target.value as Sort)}
        className="absolute inset-0 cursor-pointer appearance-none bg-transparent text-transparent opacity-0"
      >
        {SORTS.map((k) => (
          <option key={k} value={k}>
            {t.sort[k]}
          </option>
        ))}
      </select>
    </label>
  );
}

/* ---------------- popis filtera (isti za list i bočnu traku) ---------------- */

function FilterList({
  leagues,
  clubs,
  f,
  setF,
}: {
  leagues: { v: string; n: number }[];
  clubs: { v: string; n: number }[];
  f: Filters;
  setF: (fn: (c: Filters) => Filters) => void;
}) {
  const [all, setAll] = useState(false);
  const [cq, setCq] = useState("");
  const t = useEText();
  const term = normalizeText(cq.trim());
  const cl = term ? clubs.filter((c) => normalizeText(repairText(c.v)).includes(term)) : all ? clubs : clubs.slice(0, CLUB_LIMIT);
  return (
    <div>
      <Group title={t.league}>
        {leagues.map((l) => (
          <Row key={l.v} label={t.leagueName(l.v)} n={l.n} on={f.leagues.includes(l.v)} onClick={() => setF((c) => ({ ...c, leagues: toggle(c.leagues, l.v) }))} />
        ))}
      </Group>
      <Group title={t.club}>
        <label className="relative mb-1 block">
          <span className="sr-only">{t.searchClub}</span>
          <input
            type="search"
            value={cq}
            onChange={(e) => setCq(e.target.value)}
            placeholder={t.searchClub}
            className="h-10 w-full rounded-[10px] bg-[#141414] px-3 text-[14px] text-white outline-none placeholder:text-white/35 [&::-webkit-search-cancel-button]:appearance-none"
          />
        </label>
        {cl.map((c) => (
          <Row key={c.v} label={repairText(c.v)} n={c.n} on={f.clubs.includes(c.v)} onClick={() => setF((x) => ({ ...x, clubs: toggle(x.clubs, c.v) }))} />
        ))}
        {!term && clubs.length > CLUB_LIMIT ? (
          <button type="button" onClick={() => setAll((a) => !a)} className="flex h-11 w-full items-center text-[14px] text-white/50 hover:text-white">
            {all ? t.showLess : t.allClubs(clubs.length)}
          </button>
        ) : null}
      </Group>
      <Group title={t.size}>
        <SizeGrid label={t.adults} sizes={ADULT_SIZES} f={f} setF={setF} />
        <SizeGrid label={t.kids} sizes={KID_SIZES} f={f} setF={setF} />
      </Group>
    </div>
  );
}

function Group({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="mt-6 first:mt-3">
      <h3 className="e-display pb-1 text-[15px] !tracking-[0.08em] text-white/40">{title}</h3>
      <div className="border-t border-[#ffffff12]">{children}</div>
    </section>
  );
}

function Row({ label, n, on, onClick }: { label: string; n: number; on: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={on}
      onClick={onClick}
      className="flex h-11 w-full items-center justify-between border-b border-[#ffffff0d] text-left text-[14.5px]"
    >
      <span className={on ? "text-white" : "text-white/70 hover:text-white"}>{label}</span>
      <span className="flex items-center gap-2">
        <span className="text-[12px] tabular-nums text-white/30">{n}</span>
        <span className="flex w-4 justify-end">{on ? <Check strokeWidth={2} className="h-4 w-4 text-[#e8ff3c]" /> : null}</span>
      </span>
    </button>
  );
}

function SizeGrid({ label, sizes, f, setF }: { label: string; sizes: string[]; f: Filters; setF: (fn: (c: Filters) => Filters) => void }) {
  return (
    <div className="border-b border-[#ffffff0d] py-2.5">
      <p className="text-[12px] text-white/35">{label}</p>
      <div className="mt-1 flex flex-wrap gap-x-1">
        {sizes.map((s) => {
          const on = f.sizes.includes(s);
          return (
            <button
              key={s}
              type="button"
              role="checkbox"
              aria-checked={on}
              onClick={() => setF((c) => ({ ...c, sizes: toggle(c.sizes, s) }))}
              className={`h-9 min-w-[40px] rounded-[8px] px-2 text-[14px] tabular-nums transition-colors ${on ? "bg-white font-medium text-black shadow-[inset_0_-2px_0_#e8ff3c]" : "text-white/65 hover:text-white"}`}
            >
              {s}
            </button>
          );
        })}
      </div>
    </div>
  );
}

/* ================================================================== */
/*  Grid + kartica                                                     */
/* ================================================================== */

function Grid({ items, priority = false }: { items: Jersey[]; priority?: boolean }) {
  return (
    <div className="grid grid-cols-2 gap-x-3 gap-y-9 sm:gap-x-5 md:grid-cols-3 lg:gap-x-6 lg:gap-y-12">
      {items.map((p, i) => {
        const c = cardData(p);
        return c ? (
          <ImeCard key={p.slug} c={c} priority={priority && i < 4} sizes="(max-width: 767px) 50vw, (max-width: 1279px) 30vw, 340px" />
        ) : (
          <PhotoCard key={p.slug} product={p} priority={priority && i < 4} />
        );
      })}
    </div>
  );
}

/* Proizvod bez slike na vješalici (streetwear, tek dodano): isti kadar i natpis kao kartica
   "ime" — fotografija na tamnoj plohi, obrisano prezime iza (ako ga ima). */
function PhotoCard({ product, priority }: { product: Jersey; priority: boolean }) {
  const n = imeNames(product);
  // samo izrez bez pozadine (streetwear); bijele fotografije proizvoda se ovdje ne prikazuju
  const img = product.category === "streetwear" ? hangerThumbSrc(product.slug) : undefined;
  const soldOut = isSoldOut(product);
  const kids = !soldOut && kidsOnly(product);
  const letters = Math.max(3, n.surname.length);
  const t = useEText();
  return (
    <article className="ime-card group">
      <Link href={`${IME_BASE}/dres/${product.slug}`} className="block outline-none focus-visible:ring-1 focus-visible:ring-white/60">
        <div
          className="relative aspect-[4/5] overflow-hidden bg-[#121212]"
          style={{ containerType: "size", backgroundImage: "radial-gradient(ellipse 75% 60% at 50% 46%, #1d1d1d 0%, #141414 55%, #0f0f0f 100%)" }}
        >
          <div aria-hidden className="absolute inset-x-0 flex justify-center" style={{ top: "50%", transform: "translateY(-50%)" }}>
            <span className="ime-outline block whitespace-nowrap leading-[0.8]" style={{ fontSize: `${(125 / (letters * 0.43)).toFixed(2)}cqw` }}>
              {n.surname}
            </span>
          </div>
          {/* naslov kao na ostalim karticama ("MODRIĆ. BROJ 10.") — iznad šipke */}
          <div className="absolute left-3.5 lg:left-4" style={{ bottom: "calc(84% + 9px)" }}>
            {/* dres igrača: "MODRIĆ. BROJ 10."; ostalo (streetwear): cijeli naziv ("BLACK SET.") */}
            <Overline surname={n.number ? n.surname : n.title.toLocaleUpperCase("hr")} number={n.number} />
          </div>
          {img ? (
            <Image src={img} alt={`${n.club} ${n.title}`} fill priority={priority} sizes="(max-width: 767px) 50vw, 340px" className={`object-contain px-[9%] pb-[8%] pt-[12%] ${soldOut ? "opacity-40" : ""}`} />
          ) : (
            <>
              <span aria-hidden className="absolute inset-x-0 top-[16%] h-[3px] -translate-y-1/2" style={{ background: "linear-gradient(180deg,#f3f3f5 0 25%,#55555a 25% 50%,#d9d9dc 50% 75%,#121216 75% 100%)" }} />
              <p className="absolute inset-x-0 bottom-6 text-center text-[13px] text-white/40">{t.hangerSoon}</p>
            </>
          )}
        </div>
        <div className="pt-3.5">
          <p className="truncate text-[12.5px] text-white/45">
            {n.club}
            {n.variant ? <span className="text-white/30"> · {n.variant}</span> : null}
            {kids ? <span className="text-white/70"> · {t.kidsOnly}</span> : null}
          </p>
          <div className="mt-1 flex items-baseline justify-between gap-3">
            <h3 className="e-display truncate pt-0.5 text-[22px] !leading-none text-white lg:text-[24px]">{n.title}</h3>
            <p className="shrink-0 text-[15px] tabular-nums text-white/85">{soldOut ? <span className="text-white/40">{t.soldOut}</span> : imePrice(product.price ?? 20)}</p>
          </div>
        </div>
      </Link>
    </article>
  );
}
