"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { X } from "lucide-react";

import dynamic from "next/dynamic";

import { useCart } from "@/components/providers/cart-provider";
import { publishSegment } from "@/components/product/hanger-segment";
import { Stars } from "@/components/site/stars";
import { useLanguage } from "@/contexts/language-context";
import { fbTrack } from "@/lib/fbpixel";
import { getJerseySizeOptions, getJerseyStock, getStockTone, type Jersey } from "@/lib/data/jerseys";
import type { HangerImages } from "@/lib/data/ormar-hanger";
import { MIX_ADDON_PRICE_EUR, MIX_CLUBS, addonCount, addonsText, isMixEligible, mixImage, type MixAddons, type MixKind } from "@/lib/mix";
import { SHIPPING_PRICE_LABEL } from "@/lib/site";
import { createWhatsAppUrl, repairText } from "@/lib/utils";
import { productTypeWord } from "@/lib/product-type";
import { displayIgracClient } from "@/components/site/jersey-visual";

import { ImeCard, Overline } from "./ime-card";
import { imePrice, type ImeCardData } from "./ime-const";
import { useImeText } from "./ime-i18n";
import { ImePhotoStage, type MixFlyFrom } from "./ime-photo-stage";
import { useArrival, useBackTransition } from "./ime-transition";
import { CART_PAGE } from "./cart/cart-css";

/* ------------------------------------------------------------------ */
/*  Stranica dresa, demo "ime".                                         */
/*  Pozornica (tamna scena, obrisano prezime, fotografija na vješalici  */
/*  s etiketom — 2D, bez WebGL; stara 3D: ?scena=3d)                    */
/*  + tipografski stupac za kupnju. Šipka je vodoravna crta stranice:   */
/*  na računalu se nastavlja preko stupca s kupnjom, a stupac počinje   */
/*  točno ispod nje. Logika veličina = ProductDetailPanel / DProduct.   */
/* ------------------------------------------------------------------ */

const KIDS: [string, string, string][] = [
  ["104", "98–104 cm", "3–4 god."],
  ["116", "110–116 cm", "5–6 god."],
  ["128", "116–128 cm", "7–8 god."],
  ["140", "128–140 cm", "9–10 god."],
  ["152", "140–152 cm", "11–12 god."],
  ["164", "152–164 cm", "13–14 god."],
  ["176", "164–176 cm", "15–16 god."],
];
const ADULTS: [string, string, string][] = [
  ["S", "88–96 cm", "70 cm"],
  ["M", "96–104 cm", "72 cm"],
  ["L", "104–112 cm", "74 cm"],
  ["XL", "112–120 cm", "76 cm"],
  ["XXL", "120–128 cm", "78 cm"],
];

type Props = {
  product: Jersey;
  names: { club: string; title: string; variant: string; surname: string; number: string };
  hanger: HangerImages | null;
  image: string | undefined;
  description: string[];
  similar: ImeCardData[];
  /** vidljive mrvice (iste stavke kao BreadcrumbList JSON-LD na ruti) */
  breadcrumbs?: { label: string; href?: string }[];
  /** ispod opisa: ProductFaq (FAQ JSON-LD) i "Istraži više" (interni linkovi) — sa žive stranice */
  after?: ReactNode;
  /** umjesto demo bloka "Dostava i zamjena": živi ProductFaq (isti vidljivi sadržaj kao FAQPage JSON-LD) */
  faq?: ReactNode;
  /** prava ruta: H1 nosi klub + vrstu (kao <title>), h2 "O proizvodu — {naziv}" */
  seo?: { typeWord: string; productName: string; hasName: boolean };
};

// stara 3D pozornica (three.js) samo na zahtjev: ?scena=3d — zaseban chunk, inače se ne učitava
const ImeStage3D = dynamic(() => import("./ime-stage").then((m) => m.ImeStage), { ssr: false });

/* ---------------- tablica veličina (mali list) ---------------- */

function SizeSheet({ open, onClose, kids, current }: { open: boolean; onClose: () => void; kids: boolean; current: string[] }) {
  const T = useImeText();
  const closeRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (!open) return;
    closeRef.current?.focus();
    const on = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", on);
    return () => window.removeEventListener("keydown", on);
  }, [open, onClose]);
  if (!open) return null;
  const base = kids ? KIDS : ADULTS;
  const rows = base.filter((r) => current.some((s) => s === r[0] || s.split("/").includes(r[0])));
  const list = rows.length ? rows : base;
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center lg:items-center" role="dialog" aria-modal="true" aria-labelledby="ime-size-title">
      <button type="button" aria-label={T.close} onClick={onClose} className="ime-in absolute inset-0 bg-[rgba(0,0,0,0.72)]" />
      <div className="ime-in relative w-full max-w-[440px] rounded-t-[14px] border-t border-[#ffffff14] bg-[#141414] px-5 pb-[calc(20px+env(safe-area-inset-bottom))] pt-4 lg:rounded-[10px] lg:border lg:px-7 lg:pb-7 lg:pt-6">
        <div className="flex items-center justify-between">
          <p id="ime-size-title" className="text-[16px] font-medium text-white">
            {T.guideTitle(kids)}
          </p>
          <button ref={closeRef} type="button" onClick={onClose} aria-label={T.closeGuide} className="-mr-2 flex h-10 w-10 items-center justify-center text-white/60 hover:text-white">
            <X strokeWidth={1.5} className="h-5 w-5" />
          </button>
        </div>
        <table className="mt-3 w-full text-[14px] tabular-nums">
          <thead>
            <tr className="text-left text-[12px] text-white/40">
              <th className="pb-2 font-normal">{T.size}</th>
              <th className="pb-2 font-normal">{kids ? T.colHeight : T.colChest}</th>
              <th className="pb-2 font-normal">{kids ? T.colAge : T.colLength}</th>
            </tr>
          </thead>
          <tbody className="text-white/75">
            {list.map((r) => (
              <tr key={r[0]} className="border-t border-[#ffffff10]">
                <td className="py-2.5 text-white">{r[0]}</td>
                <td className="py-2.5">{r[1]}</td>
                <td className="py-2.5 text-white/50">{kids ? T.age(r[2]) : r[2]}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className="mt-4 text-[13px] leading-snug text-white/45">{T.guideHint}</p>
      </div>
    </div>
  );
}

/* ---------------- složi svoj mix (lopta / kapa, +10 €) ---------------- */

function MixRow({ kind, title, value, clubs, onPick }: { kind: MixKind; title: string; value?: string; clubs: { key: string; label: string }[]; onPick: (k?: string, from?: HTMLElement) => void }) {
  const T = useImeText();
  const label = clubs.find((c) => c.key === value)?.label;
  return (
    <div>
      <div className="flex items-baseline justify-between">
        <p className="text-[14px] text-white">
          {title}
          <span className="text-white/45">{label ? ` · ${T.club(label)}` : ` · ${T.none}`}</span>
        </p>
        <p className="text-[13px] tabular-nums text-white/45">+{MIX_ADDON_PRICE_EUR} €</p>
      </div>
      <div role="group" aria-label={T.pickClub(title)} className="ime-noscroll -mx-5 mt-3 flex gap-1 overflow-x-auto px-5 lg:mx-0 lg:grid lg:grid-cols-8 lg:gap-2 lg:overflow-visible lg:px-0">
        {clubs.map((c) => {
          const on = value === c.key;
          return (
            <button
              key={c.key}
              type="button"
              aria-pressed={on}
              onClick={(e) => onPick(on ? undefined : c.key, (e.currentTarget.firstElementChild as HTMLElement | null) ?? undefined)}
              className="group flex w-[84px] shrink-0 flex-col items-center pb-2 pt-1 lg:w-auto"
            >
              <span className={`relative block h-[72px] w-[72px] transition-transform duration-300 ${on ? "scale-105" : "group-hover:scale-[1.03]"}`}>
                <Image src={mixImage(kind, c.key)} alt="" fill sizes="72px" className="object-contain" />
              </span>
              <span className={`relative mt-2 whitespace-nowrap text-[12px] ${on ? "text-white" : "text-white/50"}`}>
                {T.club(c.label)}
                <span aria-hidden className={`absolute inset-x-0 -bottom-1.5 h-px bg-[#e8ff3c] transition-transform duration-300 ${on ? "scale-x-100" : "scale-x-0"}`} />
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

/* ---------------- stranica ---------------- */

export function ImeProduct({ product, names, hanger, image, description, similar, breadcrumbs, after, faq, seo }: Props) {
  useArrival(product.slug);
  useBackTransition(product.slug);
  const { t } = useLanguage();
  const T = useImeText();
  // H1 kao živa stranica (components/product/product-detail-panel.tsx), znak po znak.
  const h1 = useMemo(() => {
    const klub = repairText(product.klub);
    const name = displayIgracClient(product.klub, product.igrac);
    const typeWord = productTypeWord(product);
    const type = (typeWord === "trenirka" ? /trenirka/i.test(name) : /dres|komplet|trenirka/i.test(name)) ? "" : typeWord;
    return { klub, name, type };
  }, [product]);
  // Meta Pixel ViewContent — isti događaj i parametri kao živi ProductDetailPanel.
  useEffect(() => {
    fbTrack("ViewContent", {
      content_ids: [product.slug],
      content_type: "product",
      content_name: `${repairText(product.klub)} ${repairText(product.igrac)}`,
      value: product.price ?? 20,
      currency: "EUR"
    });
  }, [product.slug, product.klub, product.igrac, product.price]);
  // Samo stvarna, niska zaliha (1–5) — getJerseyStock vraća 0 kad broj nije poznat (kao živo).
  const stock = getJerseyStock(product);
  const { addItem, closeAddModal } = useCart();
  const o = getJerseySizeOptions(product);
  const firstAvail = (arr: string[], out: boolean) => (out ? "" : arr.find((s) => !o.soldOutSizes.includes(s)) ?? "");
  const defAdult = firstAvail(o.adults, o.adultsOutOfStock);
  const defKid = firstAvail(o.kids, o.kidsOutOfStock);
  const [segment, setSegment] = useState<"adult" | "kid">(o.hasAdults && defAdult ? "adult" : defKid ? "kid" : o.hasAdults ? "adult" : "kid");
  const [size, setSize] = useState("");
  const [flash, setFlash] = useState(false);
  const [added, setAdded] = useState(false);
  const [guide, setGuide] = useState(false);
  const [addons, setAddons] = useState<MixAddons>({});
  // odabir u biraču → dodatak odleti iz pločice u scenu (pozornica čita i potroši)
  const flyFrom = useRef<MixFlyFrom>(null);
  const pick = (kind: MixKind) => (k?: string, from?: HTMLElement) => {
    flyFrom.current = k && from ? { kind, rect: from.getBoundingClientRect(), t: performance.now() } : null;
    setAddons((a) => ({ ...a, [kind]: k }));
  };
  const sizesRef = useRef<HTMLDivElement>(null);
  const timers = useRef<number[]>([]);
  useEffect(() => () => timers.current.forEach((t) => window.clearTimeout(t)), []);
  useEffect(() => publishSegment(product.slug, segment), [product.slug, segment]);

  const isTrenirka = product.category === "trenirka";
  const isLong = product.category === "dugi-rukav";
  const current = segment === "adult" ? o.adults : o.kids;
  const segOut = (segment === "adult" && o.adultsOutOfStock) || (segment === "kid" && o.kidsOutOfStock);
  const isOut = (s: string) => segOut || o.soldOutSizes.includes(s);
  const available = current.filter((s) => !isOut(s));
  const hasPicker = o.adults.length > 0 || o.kids.length > 0;
  const allSoldOut = hasPicker && !defAdult && !defKid;
  const needsSize = hasPicker && !size;
  const showSegment = o.hasAdults && o.hasKids;
  // Ista oznaka kao live ProductDetailPanel ("Trenirka" i u EN) — ide u cartSummary narudžbe.
  const segmentLabel = isTrenirka ? "Trenirka" : product.category === "streetwear" ? "Streetwear" : segment === "adult" || isLong ? t.product.segmentAdult : t.product.segmentKid;
  const mixOk = isMixEligible(product) && !allSoldOut;
  const n = addonCount(addons);
  const base = product.price ?? 20;
  const total = base + n * MIX_ADDON_PRICE_EUR;

  // etiketa: cijena + raspon dostupnih veličina (poleđina, dodir na etiketu)
  const tagSizes = useMemo(() => {
    const av = [...(o.adultsOutOfStock ? [] : o.adults), ...(o.kidsOutOfStock ? [] : o.kids)].filter((s) => !o.soldOutSizes.includes(s));
    return av.length > 1 ? `${av[0]} – ${av[av.length - 1]}` : av[0];
  }, [o.adults, o.kids, o.adultsOutOfStock, o.kidsOutOfStock, o.soldOutSizes]);
  const tag = useMemo(() => ({ price: base, sizes: tagSizes, scale: 1 }), [base, tagSizes]);
  const [scena3d, setScena3d] = useState(false);
  useEffect(() => setScena3d(new URLSearchParams(window.location.search).get("scena") === "3d"), []);


  const wa = createWhatsAppUrl(T.waMsg(`${repairText(product.klub)} ${repairText(product.igrac)}`, size));

  const promptSize = () => {
    sizesRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
    setFlash(true);
    timers.current.push(window.setTimeout(() => setFlash(false), 1400));
  };

  const add = () => {
    if (allSoldOut) return;
    if (needsSize) return promptSize();
    const item = {
      slug: product.slug,
      klub: repairText(product.klub),
      igrac: repairText(product.igrac),
      size,
      segment,
      imageSrc: image,
      category: product.category,
    };
    if (n > 0) addItem({ ...item, segmentLabel: `${segmentLabel}${addonsText(addons)}`, price: total, addons: { ...addons } });
    else addItem({ ...item, segmentLabel, price: product.price });
    // demo nema globalni prozor "Dodano" → ne zaključavaj skrol; stanje je u gumbu
    closeAddModal();
    setAddons({});
    setAdded(true);
    timers.current.push(window.setTimeout(() => setAdded(false), 4000));
  };

  const fold = (v: string) => v.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
  const own = MIX_CLUBS.find((c) => fold(names.club).includes(fold(c.label).replace(/^ac /, "")));
  const clubs = own ? [own, ...MIX_CLUBS.filter((c) => c.key !== own.key)] : [...MIX_CLUBS];

  // jedan red kad stane (do 7 kratkih oznaka), inače 3/4 stupca + prazne ćelije do kraja reda
  const COLS = ["grid-cols-1", "grid-cols-1", "grid-cols-2", "grid-cols-3", "grid-cols-4", "grid-cols-5", "grid-cols-6", "grid-cols-7"];
  const nCols = current.some((s) => s.length > 4) ? 3 : current.length <= 7 ? Math.max(1, current.length) : 4;
  const fillers = (nCols - (current.length % nCols)) % nCols;
  const hair = flash ? "rgba(255,255,255,.55)" : "rgba(255,255,255,.12)";
  const line = `-1px 0 0 0 ${hair}, 0 -1px 0 0 ${hair}`;

  const range = available.length > 1 ? `${available[0]} – ${available[available.length - 1]}` : available[0] ?? "";
  const buyLabel = n > 0 ? `${T.addToCart} · ${imePrice(total)}` : T.addToCart;
  const buy = (cls: string) =>
    allSoldOut ? (
      <a href={wa} target="_blank" rel="noopener noreferrer" className={`flex h-[52px] items-center justify-center rounded-[6px] border border-[#ffffff2e] px-5 text-[15px] text-white ${cls}`}>
        {T.notifyWa}
      </a>
    ) : added ? (
      <Link href={CART_PAGE} className={`flex h-[52px] items-center justify-center rounded-[6px] bg-white px-5 text-[15px] font-medium text-black ${cls}`}>
        {T.addedOpenCart}
      </Link>
    ) : (
      <button
        type="button"
        onClick={add}
        className={`h-[52px] rounded-[6px] px-5 text-[15px] font-medium transition-[background-color,color,transform] duration-200 active:scale-[0.99] ${
          needsSize ? "bg-[#1d1d1d] text-white/70 hover:bg-[#242424] hover:text-white" : "bg-[#e8ff3c] !font-bold text-[#0a0a0a] shadow-[0_12px_34px_-12px_rgba(232,255,60,.6)] hover:bg-[#f2ff7a]"
        } ${cls}`}
      >
        {needsSize ? T.selectSize : buyLabel}
      </button>
    );

  return (
    <div data-ime-pdp={product.slug}>
      {/* ---------------- hero ---------------- */}
      {/* računalo: ista širina i rubovi kao navigacija (max 1680, 40 px) — naslov, stupac i šipka poravnati s logom i ikonama */}
      <section className="relative overflow-x-clip lg:mx-auto lg:grid lg:h-[calc(100svh-68px)] lg:min-h-[660px] lg:max-w-[1680px] lg:grid-cols-[minmax(0,1fr)_minmax(400px,30vw)] min-[1680px]:grid-cols-[minmax(0,1fr)_504px]">
        {hanger && !scena3d ? (
          <div className="relative lg:h-full" style={{ backgroundImage: "radial-gradient(ellipse 60% 46% at 50% 50%, #1a1a1a 0%, #131313 52%, #0a0a0a 100%)" }}>
            <ImePhotoStage
              images={hanger}
              slug={product.slug}
              alt={(label) => `${names.club} ${names.title} — ${label} ${T.onHanger}`}
              surname={names.surname}
              tag={tag}
              overline={<Overline surname={names.surname} number={names.number} size="stage" />}
              mix={mixOk ? addons : undefined}
              flyFrom={flyFrom}
            />
          </div>
        ) : (
          <div
            className="relative h-[52svh] min-h-[380px] max-h-[560px] lg:h-full lg:max-h-none"
            style={{ backgroundImage: "radial-gradient(ellipse 48% 46% at 50% 54%, #1a1a1a 0%, #131313 52%, #0a0a0a 100%)" }}
          >
            {hanger ? (
              <ImeStage3D
                images={hanger}
                slug={product.slug}
                alt={(label) => `${names.club} ${names.title} — ${label} ${T.onHanger}`}
                surname={names.surname}
                tag={tag}
                overline={<Overline surname={names.surname} number={names.number} size="stage" />}
              />
            ) : image ? (
              <Image src={image} alt={`${names.club} ${names.title}`} fill priority sizes="(max-width: 1023px) 100vw, 70vw" className="object-contain px-8 pb-10 pt-16" />
            ) : (
              /* bez slike na vješalici: tamni zid, nikad fotografija na bijelom (og:image/JSON-LD ostaju original) */
              <div className="absolute inset-0 flex items-center justify-center">
                <p className="text-[12px] font-semibold uppercase tracking-[0.22em] text-white/30">{T.photoSoon}</p>
              </div>
            )}
          </div>
        )}

        <aside className="relative z-10 px-5 pb-10 pt-4 lg:overflow-y-auto lg:pb-10 lg:pl-10 lg:pr-10 lg:pt-[118px]">
          <div>
            {breadcrumbs?.length ? (
              <nav aria-label="Breadcrumb" className="mb-3 lg:mb-4">
                <ol className="flex flex-wrap items-center gap-x-1.5 gap-y-1 text-[12px] text-white/40">
                  {breadcrumbs.map((b, i) => {
                    const last = i === breadcrumbs.length - 1;
                    return (
                      <li key={`${b.label}-${i}`} className="flex min-w-0 items-center gap-1.5">
                        {b.href && !last ? (
                          <Link href={b.href} className="transition-colors hover:text-white">
                            {b.label}
                          </Link>
                        ) : (
                          <span className={last ? "truncate text-white/60" : undefined}>{b.label}</span>
                        )}
                        {!last ? <span aria-hidden className="text-white/20">/</span> : null}
                      </li>
                    );
                  })}
                </ol>
              </nav>
            ) : null}
            {seo ? (
              /* prava ruta: H1 = TOČNO tekst žive stranice (ProductDetailPanel): klub + igrač + vrsta,
                 isti na HR i EN (živa ne prevodi H1). Izgled novog dizajna: klub mali redak, ime veliko. */
              <h1>
                {h1.name ? (
                  <span data-stg style={{ ["--i" as string]: 0 }} className="ime-h1-k block text-[13px] text-white/50">
                    {h1.klub}
                  </span>
                ) : null}
                {h1.name ? " " : null}
                <span data-stg style={{ ["--i" as string]: 1 }} className="mt-1.5 block text-[44px] leading-[.92] text-white lg:mt-2 lg:text-[68px]">
                  {h1.name || h1.klub}
                  {h1.type ? <span className="text-white/35"> {h1.type}</span> : null}
                </span>
              </h1>
            ) : (
              <>
                <p data-stg style={{ ["--i" as string]: 0 }} className="text-[13px] text-white/50">
                  {names.club}
                  {names.variant ? <span className="text-white/35"> · {names.variant}</span> : null}
                </p>
                <h1 data-stg style={{ ["--i" as string]: 1 }} className="mt-1.5 text-[44px] leading-[.92] text-white lg:mt-2 lg:text-[68px]">
                  {names.title}
                </h1>
              </>
            )}
            {/* mobitel: cijena je u traci za kupnju (i na etiketi) → ovdje samo na računalu */}
            <p data-stg style={{ ["--i" as string]: 2 }} className="mt-3 hidden text-[36px] font-semibold leading-none tabular-nums text-[#e8ff3c] lg:block">
              {imePrice(base)}
            </p>
            {product.rating ? (
              <div data-stg style={{ ["--i" as string]: 2 }} className="mt-3">
                <Stars value={product.rating.value} count={product.rating.count} size="md" />
              </div>
            ) : null}
            {stock > 0 && !allSoldOut ? (
              <p data-stg style={{ ["--i" as string]: 2 }} className={`mt-3 text-[13px] font-semibold ${getStockTone(stock)}`}>
                {t.product.stockWarning(stock)}
              </p>
            ) : null}

            {showSegment ? (
              <div data-stg style={{ ["--i" as string]: 3 }} role="radiogroup" aria-label={T.adultsOrKids} className="mt-4 flex gap-7 border-b border-[#ffffff14] lg:mt-7">
                {(
                  [
                    ["adult", T.adults, o.adultsOutOfStock || !defAdult],
                    ["kid", T.kids, o.kidsOutOfStock || !defKid],
                  ] as const
                ).map(([k, label, out]) => {
                  const on = segment === k;
                  return (
                    <button
                      key={k}
                      type="button"
                      role="radio"
                      aria-checked={on}
                      onClick={() => {
                        setSegment(k);
                        setSize("");
                      }}
                      className={`relative -mb-px h-11 text-[15px] transition-colors ${on ? "text-white" : "text-white/45 hover:text-white/80"}`}
                    >
                      {label}
                      {out ? <span className="text-white/30">{T.soldOutSuffix}</span> : null}
                      <span aria-hidden className={`absolute inset-x-0 bottom-0 h-[2px] bg-[#e8ff3c] transition-transform duration-300 ${on ? "scale-x-100" : "scale-x-0"}`} />
                    </button>
                  );
                })}
              </div>
            ) : null}

            {current.length === 0 ? (
              <p data-stg style={{ ["--i" as string]: 4 }} className="mt-7 text-[14px] text-white/55">{T.oneSize}</p>
            ) : (
              <div ref={sizesRef} data-stg style={{ ["--i" as string]: 4 }} className={`${showSegment ? "mt-3 lg:mt-5" : "mt-4 lg:mt-6"} scroll-mt-28`}>
                <div className="flex items-center justify-between">
                  <p id="ime-size-label" className={`text-[13px] transition-colors duration-300 ${flash ? "text-white" : "text-white/50"}`}>
                    {flash ? T.selectSize : T.size}
                    {size ? <span className="text-white"> {size}</span> : null}
                    <span className="text-white/30"> · {segmentLabel}</span>
                  </p>
                  <button type="button" onClick={() => setGuide(true)} className="-mr-1 h-10 px-1 text-[13px] text-white/60 underline decoration-white/25 underline-offset-4 hover:text-white">
                    {T.sizeGuide}
                  </button>
                </div>
                {/* samo tanke crte između veličina — bez vanjskog okvira (prvi stupac/red ih odreže) */}
                <div role="radiogroup" aria-labelledby="ime-size-label" className={`mt-1 grid overflow-hidden ${COLS[nCols]}`}>
                  {current.map((s) => {
                    const out = isOut(s);
                    const on = s === size;
                    return (
                      <button
                        key={s}
                        type="button"
                        role="radio"
                        aria-checked={on}
                        disabled={out}
                        aria-label={out ? T.sizeSoldOut(s) : s}
                        onClick={() => setSize(s)}
                        style={{ boxShadow: on && !out ? `${line}, inset 0 -2px 0 0 #e8ff3c` : line }}
                        className={`h-[50px] text-[15px] tabular-nums transition-colors duration-150 ${
                          out ? "cursor-not-allowed text-white/25 line-through decoration-white/30" : on ? "bg-white font-medium text-black" : "text-white/85 hover:bg-[#151515] hover:text-white"
                        }`}
                      >
                        {s}
                      </button>
                    );
                  })}
                  {Array.from({ length: fillers }, (_, i) => (
                    <span key={`f${i}`} aria-hidden style={{ boxShadow: line }} />
                  ))}
                </div>
                {available.length === 0 ? (
                  <p className="mt-3 text-[13px] text-white/50">{showSegment ? T.segSoldOut(segment === "adult" ? T.adults : T.kids) : T.soldOutNow}</p>
                ) : null}
              </div>
            )}

            <div data-stg style={{ ["--i" as string]: 5 }} className="mt-6 hidden lg:block">
              {buy("w-full")}
            </div>

            <p data-stg style={{ ["--i" as string]: 6 }} className="mt-5 text-[13px] text-white/60">{T.codLine(SHIPPING_PRICE_LABEL)}</p>
            <p data-stg style={{ ["--i" as string]: 6 }} className="mt-1.5 text-[13px] text-white/40">
              {T.exchangeLine}{" "}
              <Link href="/dostava-i-povrat" className="underline decoration-white/25 underline-offset-4 hover:text-white">
                {T.terms}
              </Link>
            </p>
          </div>
        </aside>
      </section>

      {/* ---------------- ispod pregiba ---------------- */}
      <div className="px-5 pb-[120px] lg:mx-auto lg:max-w-[1680px] lg:px-10 lg:pb-24">
        {mixOk ? (
          <section aria-labelledby="ime-mix" className="border-t border-[#ffffff14] pt-10 lg:grid lg:grid-cols-[minmax(0,360px)_minmax(0,1fr)] lg:gap-16 lg:pt-14">
            <div>
              <h2 id="ime-mix" className="text-[38px] text-white lg:text-[48px]">
                <span aria-hidden className="mb-3.5 block h-[2px] w-10 bg-[#e8ff3c]" />
                {T.mixTitle}
              </h2>
              <p className="mt-2 max-w-[340px] text-[14px] leading-relaxed text-white/50">
                {T.mixBody(isTrenirka, MIX_ADDON_PRICE_EUR)}
              </p>
              <dl className="mt-6 hidden max-w-[340px] text-[14px] lg:block">
                <div className="flex justify-between border-t border-[#ffffff14] py-2.5 text-white/60">
                  <dt>{isTrenirka ? T.tracksuit : T.jerseyWord}</dt>
                  <dd className="tabular-nums">{imePrice(base)}</dd>
                </div>
                <div className="flex justify-between border-t border-[#ffffff14] py-2.5 text-white/60">
                  <dt>{T.addons(n)}</dt>
                  <dd className="tabular-nums">{imePrice(n * MIX_ADDON_PRICE_EUR)}</dd>
                </div>
                <div className="flex items-baseline justify-between border-t border-[#ffffff14] pt-3 text-white">
                  <dt>{T.total}</dt>
                  <dd className="text-[22px] font-semibold tabular-nums text-[#e8ff3c]">{imePrice(total)}</dd>
                </div>
              </dl>
            </div>
            <div className="mt-7 space-y-8 lg:mt-1">
              <MixRow kind="lopta" title={T.ball} value={addons.lopta} clubs={clubs} onPick={pick("lopta")} />
              <MixRow kind="kapa" title={T.cap} value={addons.kapa} clubs={clubs} onPick={pick("kapa")} />
              {n > 0 ? <p className="text-[13px] text-white/50 lg:hidden">{T.totalWithAddons} <span className="text-white">{imePrice(total)}</span></p> : null}
            </div>
          </section>
        ) : null}

        <div className="mt-14 grid gap-12 border-t border-[#ffffff14] pt-10 lg:mt-16 lg:grid-cols-2 lg:gap-16 lg:pt-14">
          {description.length ? (
            <section aria-labelledby="ime-about">
              <h2 id="ime-about" className="text-[32px] text-white lg:text-[38px]">
                {seo ? `${T.aboutNamed} — ${seo.productName}` : T.about(isTrenirka)}
              </h2>
              <div className="mt-4 max-w-[620px] space-y-3">
                {description.map((p, i) => (
                  <p key={i} className={`text-[15px] leading-[1.7] ${i === 0 ? "text-white/70" : "text-white/50"}`}>
                    {p}
                  </p>
                ))}
              </div>
            </section>
          ) : null}

          {faq ? (
            <div className="ime-faq">{faq}</div>
          ) : (
          <section aria-labelledby="ime-faq">
            <h2 id="ime-faq" className="text-[32px] text-white lg:text-[38px]">
              {T.faqTitle}
            </h2>
            <div className="mt-3 border-b border-[#ffffff14]">
              {[
                ["Kada stiže paket?", "Dostava je 2–5 radnih dana po cijeloj Hrvatskoj (GLS). Čim paket krene, na email dobiješ broj za praćenje."],
                ["Kako se plaća?", "Pouzećem — gotovinom pri preuzimanju paketa. Ništa ne plaćaš unaprijed."],
                ["Koliko košta dostava?", `${SHIPPING_PRICE_LABEL} po cijeloj Hrvatskoj. Registriranim kupcima dostava je besplatna za narudžbe od 60 €.`],
                ["Što ako veličina ne odgovara?", "Mijenjamo je za drugu veličinu: javi nam se unutar 14 dana od primitka paketa. Dres mora biti nenošen i neoštećen. Moguća je samo zamjena veličine."],
                ["Šaljete li izvan Hrvatske?", "Ne — dostava je samo unutar Hrvatske."],
              ].map(([q, a]) => (
                <details key={q} className="group border-t border-[#ffffff14]">
                  <summary className="flex h-14 cursor-pointer list-none items-center justify-between text-[15px] text-white/85 hover:text-white [&::-webkit-details-marker]:hidden">
                    {q}
                    <span aria-hidden className="relative h-3 w-3">
                      <span className="absolute left-0 top-1/2 h-px w-3 bg-white/60" />
                      <span className="absolute left-1/2 top-0 h-3 w-px bg-white/60 transition-transform duration-200 group-open:scale-y-0" />
                    </span>
                  </summary>
                  <p className="max-w-[560px] pb-5 text-[14px] leading-relaxed text-white/55">{a}</p>
                </details>
              ))}
            </div>
          </section>
          )}
        </div>

        {after}

        {similar.length ? (
          <section aria-labelledby="ime-similar" className="mt-16 border-t border-[#ffffff14] pt-10 lg:mt-20 lg:pt-14">
            <h2 id="ime-similar" className="text-[32px] text-white lg:text-[38px]">
              <span aria-hidden className="mb-3.5 block h-[2px] w-10 bg-[#e8ff3c]" />
              {T.similar(isTrenirka ? "trenirka" : product.category === "streetwear" ? "streetwear" : "dres")}
            </h2>
            <div className="mt-6 grid grid-cols-2 gap-x-3 gap-y-8 lg:grid-cols-4 lg:gap-x-6">
              {similar.map((c) => (
                <ImeCard key={c.slug} c={c} />
              ))}
            </div>
          </section>
        ) : null}
      </div>

      {/* mobitel: traka za kupnju */}
      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-[#ffffff14] bg-[#0d0d0d] lg:hidden" style={{ paddingBottom: "env(safe-area-inset-bottom)" }}>
        <div className="flex h-[68px] items-center gap-4 pl-5 pr-3">
          <div className="min-w-0 flex-1">
            <p className="text-[20px] font-semibold leading-none tabular-nums text-[#e8ff3c]">{imePrice(total)}</p>
            <p className="mt-1.5 truncate text-[12px] leading-none text-white/45">
              {allSoldOut
                ? T.soldOut
                : size
                  ? `${showSegment ? `${segment === "kid" ? T.kids : T.adults} · ` : ""}${size}`
                  : hasPicker
                    ? range
                      ? `${showSegment ? `${segment === "kid" ? T.kids : T.adults} · ` : ""}${range}`
                      : T.soldOut
                    : T.oneSize}
            </p>
          </div>
          {buy("px-6")}
        </div>
      </div>

      <SizeSheet open={guide} onClose={() => setGuide(false)} kids={segment === "kid" || (isTrenirka && current.every((s) => /\d/.test(s)))} current={current} />
    </div>
  );
}
