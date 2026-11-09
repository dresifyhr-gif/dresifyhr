"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeftRight, CreditCard, Info, Truck } from "lucide-react";

import { useCart } from "@/components/providers/cart-provider";
import { useLanguage } from "@/contexts/language-context";
import { StickyAddToCart } from "@/components/product/sticky-add-to-cart";
import { SizeGuide } from "@/components/product/size-guide";
import { fbTrack } from "@/lib/fbpixel";
import { getJerseyGallery } from "@/lib/data/jersey-media";
import { getJerseySizeOptions, getJerseyStock, type Jersey } from "@/lib/data/jerseys";
import { SHIPPING_PRICE_EUR } from "@/lib/site";
import { createWhatsAppUrl, repairText } from "@/lib/utils";

type ProductDetailPanelProps = {
  product: Jersey;
};

// Dječja veličina = visina u cm → okvirna dob (ista tablica kao "Vodič za veličine").
const KID_AGE: Record<string, string> = {
  "104": "3–4 g.",
  "116": "5–6 g.",
  "128": "7–8 g.",
  "140": "9–10 g.",
  "152": "11–12 g.",
  "164": "13–14 g.",
  "176": "15–16 g."
};

const WEEKDAYS_HR = ["ned", "pon", "uto", "sri", "čet", "pet", "sub"];
const WEEKDAYS_EN = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function addWorkingDays(from: Date, days: number) {
  const d = new Date(from);
  let left = days;
  while (left > 0) {
    d.setDate(d.getDate() + 1);
    const wd = d.getDay();
    if (wd !== 0 && wd !== 6) left--;
  }
  return d;
}

export function ProductDetailPanel({ product }: ProductDetailPanelProps) {
  const { t, locale } = useLanguage();
  const en = locale === "en";
  const router = useRouter();
  const sizeOptions = getJerseySizeOptions(product);
  const gallery = product.images ?? getJerseyGallery(product.slug);
  const frontImage = gallery[0]?.src;
  // Zaliha se prikazuje SAMO ako je stvarno upisana u adminu (bez izmišljenih brojki).
  const hasRealStock = product.stock != null || (product.sizeStock != null && Object.keys(product.sizeStock).length > 0);
  const stock = getJerseyStock(product);
  const { addItem, closeAddModal } = useCart();
  const mainButtonRef = useRef<HTMLButtonElement>(null);
  const sizesRef = useRef<HTMLDivElement>(null);
  const firstAvailable = (arr: string[], segmentOut: boolean) =>
    segmentOut ? "" : (arr.find((s) => !sizeOptions.soldOutSizes.includes(s)) ?? "");
  const defaultAdultSize = firstAvailable(sizeOptions.adults, sizeOptions.adultsOutOfStock);
  const defaultKidSize = firstAvailable(sizeOptions.kids, sizeOptions.kidsOutOfStock);
  const defaultSegment: "adult" | "kid" =
    sizeOptions.hasAdults && defaultAdultSize ? "adult" : defaultKidSize ? "kid" : sizeOptions.hasAdults ? "adult" : "kid";
  const [segment, setSegment] = useState<"adult" | "kid">(defaultSegment);
  // Bez predodabira veličine — kupac mora svjesno odabrati (gumb je disabled dok
  // ne odabere). Auto-odabir najmanje dostupne veličine ('S') vodio je u krive
  // narudžbe → skupe zamjene (a politika je samo zamjena veličine).
  const [selectedSize, setSelectedSize] = useState("");
  const [eta, setEta] = useState<string | null>(null);

  // Kod promjene proizvoda: segment u kojem STVARNO ima veličina + bez predodabira.
  useEffect(() => {
    const nextSegment: "adult" | "kid" =
      sizeOptions.hasAdults && defaultAdultSize ? "adult" : defaultKidSize ? "kid" : sizeOptions.hasAdults ? "adult" : "kid";
    setSegment(nextSegment);
    setSelectedSize("");
  }, [product.slug, sizeOptions.hasAdults, defaultAdultSize, defaultKidSize]);

  useEffect(() => {
    fbTrack("ViewContent", {
      content_ids: [product.slug],
      content_type: "product",
      content_name: `${repairText(product.klub)} ${repairText(product.igrac)}`,
      value: product.price ?? 20,
      currency: "EUR"
    });
  }, [product.slug, product.klub, product.igrac, product.price]);

  // Procjena dostave (2–5 radnih dana) — računa se tek u pregledniku (bez hydration razlike).
  useEffect(() => {
    const now = new Date();
    const a = addWorkingDays(now, 2);
    const b = addWorkingDays(now, 5);
    const days = en ? WEEKDAYS_EN : WEEKDAYS_HR;
    const f = (d: Date) => `${days[d.getDay()]} ${d.getDate()}.${d.getMonth() + 1}.`;
    setEta(`${f(a)} – ${f(b)}`);
  }, [en]);

  const isLongSleeve = product.category === "dugi-rukav";
  const isSet = product.category === "trenirka" || product.category === "streetwear" || product.liga === "Komplet";
  const segmentLabel = segment === "adult" || isLongSleeve ? t.product.segmentAdult : t.product.segmentKid;
  const productPrice = product.price ?? 20;
  const total = productPrice + SHIPPING_PRICE_EUR;
  const whatsappMessage = `Pozdrav, želim naručiti: ${repairText(product.klub)} ${repairText(
    product.igrac
  )}${selectedSize ? `, veličina: ${selectedSize}` : ""}. Cijena: ${productPrice}€.`;
  const whatsappUrl = createWhatsAppUrl(whatsappMessage);

  const isOut = (seg: "adult" | "kid", size: string) =>
    (seg === "adult" && sizeOptions.adultsOutOfStock) ||
    (seg === "kid" && sizeOptions.kidsOutOfStock) ||
    sizeOptions.soldOutSizes.includes(size);

  // "Jedna veličina" (npr. dio streetweara) nema izbornik pa ni ne treba odabir.
  const hasSizePicker = sizeOptions.adults.length > 0 || sizeOptions.kids.length > 0;
  const allSoldOut = hasSizePicker && !defaultAdultSize && !defaultKidSize;
  const needsSize = hasSizePicker && !selectedSize;
  const soldOutKid = sizeOptions.kids.find((s) => isOut("kid", s));

  const priceLabel = isSet
    ? en ? "set" : "komplet"
    : selectedSize
    ? segment === "kid" && !isLongSleeve
      ? en ? "jersey + shorts" : "dres + hlačice"
      : en ? "jersey" : "dres"
    : sizeOptions.hasKids && !isLongSleeve && !defaultAdultSize && defaultKidSize
    ? en ? "jersey + shorts" : "dres + hlačice"
    : sizeOptions.hasKids && !isLongSleeve
    ? en ? "kids: + shorts" : "djeca: + hlačice"
    : en ? "jersey" : "dres";

  const pick = (seg: "adult" | "kid", size: string) => {
    if (isOut(seg, size)) return;
    setSegment(seg);
    setSelectedSize(size);
  };

  const add = () => {
    if (needsSize) return; // pojas i tregeri — bez veličine ne ide u košaricu
    addItem({
      slug: product.slug,
      klub: repairText(product.klub),
      igrac: repairText(product.igrac),
      size: selectedSize,
      segment,
      segmentLabel,
      imageSrc: frontImage,
      price: product.price,
      category: product.category
    });
  };

  const buyNow = () => {
    if (needsSize) {
      sizesRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }
    add();
    closeAddModal();
    router.push("/checkout");
  };

  const sizeButton = (seg: "adult" | "kid", size: string, withAge: boolean) => {
    const out = isOut(seg, size);
    const active = selectedSize === size && segment === seg;
    return (
      <button
        key={`${seg}-${size}`}
        type="button"
        onClick={() => pick(seg, size)}
        disabled={out}
        aria-pressed={active}
        aria-label={out ? `${size} — ${en ? "sold out" : "rasprodano"}` : size}
        className={`flex h-[52px] min-w-0 flex-col items-center justify-center rounded-[2px] border transition-colors duration-150 ${
          out
            ? "cursor-not-allowed border-white/10 text-[#555]"
            : active
            ? "border-accent bg-accent text-black"
            : "border-white/[0.18] text-fg hover:border-white/60"
        }`}
      >
        <span className={`text-[15px] font-black leading-none ${out ? "line-through" : ""}`}>{size}</span>
        {out ? (
          <span className="mt-1 text-[8.5px] font-bold leading-none">{en ? "sold out" : "rasprodano"}</span>
        ) : withAge && KID_AGE[size] ? (
          <span className={`mt-1 text-[9.5px] font-medium leading-none ${active ? "text-black/70" : "text-mute"}`}>{KID_AGE[size]}</span>
        ) : null}
      </button>
    );
  };

  const showGroups = sizeOptions.hasKids && sizeOptions.hasAdults;
  const [titleHead, ...titleRest] = repairText(product.igrac).split(/\s+[—–]\s+/);
  const titleTail = titleRest.join(" · ");

  return (
    <div className="lg:sticky lg:top-[calc(var(--announcement-offset,0px)+88px)] lg:self-start">
      <p className="truncate text-[10.5px] font-bold uppercase leading-none tracking-[0.16em] text-mute">
        {repairText(product.klub)} · {product.category === "streetwear" ? "Streetwear" : repairText(product.liga)}
      </p>

      {/* H1 = puni naziv (SEO); dio iza crtice ("— 2026") je sitni drugi red. */}
      <h1 className="mt-2.5 pt-[0.08em] font-display text-[52px] uppercase leading-[0.96] text-fg sm:text-[64px] lg:text-[72px]">
        {titleHead}
        {titleTail ? (
          <span className="mt-2 block font-body text-[0.24em] font-bold leading-none tracking-[0.14em] text-soft">
            <span className="sr-only"> — </span>
            {titleTail}
          </span>
        ) : null}
      </h1>

      <div className="mt-4 flex items-end gap-3">
        <p className="font-display text-[64px] leading-[0.85] text-fg">{productPrice} €</p>
        <p className="pb-1 text-[11px] font-bold uppercase leading-none tracking-[0.14em] text-mute">{priceLabel}</p>
      </div>
      <p className="mt-2 text-[14px] font-medium leading-[1.4] text-soft">
        {en ? (
          <>
            + {SHIPPING_PRICE_EUR} € delivery · total <b className="text-fg">{total} €</b> paid to the courier
          </>
        ) : (
          <>
            + {SHIPPING_PRICE_EUR} € dostava · ukupno <b className="text-fg">{total} €</b> plaćaš dostavljaču
          </>
        )}
      </p>
      {hasRealStock && stock > 0 && stock <= 5 ? (
        <p className="mt-2 text-[12px] font-bold uppercase tracking-[0.12em] text-[#ff8a5c]">{t.product.stockWarning(stock)}</p>
      ) : null}

      {/* ── Veličine ── */}
      <div ref={sizesRef} className="mt-7 scroll-mt-32">
        {!hasSizePicker ? (
          <p className="text-[12px] font-bold uppercase tracking-[0.16em] text-mute">{en ? "One size" : "Jedna veličina"}</p>
        ) : (
          <>
            <div className="flex items-center justify-between gap-3">
              <p className="text-[13px] font-black uppercase tracking-[0.1em] text-fg">
                {en ? "Size" : "Veličina"}: <span className="text-accent">{selectedSize || "—"}</span>
              </p>
              <SizeGuide showXXL={sizeOptions.adults.includes("XXL")} />
            </div>

            {sizeOptions.kids.length > 0 ? (
              <div className="mt-3">
                {showGroups ? (
                  <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.16em] text-mute">
                    {en ? "Kids · height in cm" : "Djeca · visina u cm"}
                  </p>
                ) : null}
                <div className="grid grid-cols-4 gap-1.5">{sizeOptions.kids.map((s) => sizeButton("kid", s, true))}</div>
              </div>
            ) : null}

            {sizeOptions.adults.length > 0 ? (
              <div className="mt-3">
                {showGroups ? (
                  <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.16em] text-mute">{en ? "Adults" : "Odrasli"}</p>
                ) : null}
                <div className="grid grid-cols-5 gap-1.5">{sizeOptions.adults.map((s) => sizeButton("adult", s, false))}</div>
              </div>
            ) : null}

            {sizeOptions.hasKids && !allSoldOut ? (
              <p className="mt-3 flex gap-2.5 rounded-[2px] border border-white/10 bg-ink2 px-3 py-2.5 text-[12.5px] font-medium leading-[1.4] text-[#c4c4bd]">
                <Info className="mt-px h-4 w-4 shrink-0 text-accent" />
                <span>
                  {en ? (
                    <>
                      Kids size = child&apos;s height in cm. <b className="text-fg">Between two?</b> Take the bigger one.
                    </>
                  ) : (
                    <>
                      Broj = visina djeteta u cm. <b className="text-fg">Između dvije?</b> Uzmi veću — dres traje i iduću sezonu.
                    </>
                  )}
                </span>
              </p>
            ) : null}
            {soldOutKid && !allSoldOut ? (
              <p className="mt-2.5 flex items-center gap-2 text-[11.5px] font-bold text-[#ff5c5c]">
                <i className="inline-block h-1.5 w-1.5 rounded-full bg-[#ff5c5c]" />
                {en ? "Some sizes are currently sold out" : "Neke veličine su trenutno rasprodane"}
              </p>
            ) : null}
          </>
        )}
      </div>

      {/* ── Glavni CTA (jedan) ── */}
      <button
        ref={mainButtonRef}
        type="button"
        aria-disabled={needsSize}
        onClick={() => {
          // Bez veličine: gumb ostaje pun volt (ne "mutna maslinasta"), a klik vodi na veličine.
          if (needsSize) {
            if (!allSoldOut) sizesRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
            return;
          }
          add();
        }}
        className={`button-primary mt-6 w-full ${
          allSoldOut ? "!cursor-not-allowed !bg-[#2a2a2a] !text-[#777]" : needsSize ? "cursor-pointer" : ""
        }`}
      >
        {allSoldOut ? "Trenutno rasprodano" : `${t.product.addToCart} — ${productPrice} €`}
      </button>

      {!allSoldOut ? (
        <button
          type="button"
          onClick={buyNow}
          className="mt-3 block w-full text-center text-[14px] font-semibold text-fg underline-offset-4 hover:underline"
        >
          {en ? "or order now in 1 step →" : "ili naruči odmah u 1 koraku →"}
        </button>
      ) : null}

      {/* Bez ovoga je kupac klikao rasprodane veličine i mislio da stranica ne radi. */}
      {needsSize ? (
        <p className="mt-2 text-center text-[12.5px] text-mute">
          {allSoldOut ? (
            <>
              Sve veličine su trenutno rasprodane.{" "}
              <a href={whatsappUrl} target="_blank" rel="noopener noreferrer" className="text-accent underline underline-offset-4">
                Javi se na WhatsApp
              </a>{" "}
              i javimo ti čim stigne.
            </>
          ) : en ? (
            "Pick a size to continue."
          ) : (
            "Odaberi veličinu da nastaviš."
          )}
        </p>
      ) : null}

      {/* ── Dostava / pouzeće ── */}
      <div className="mt-7 overflow-hidden rounded-[2px] border border-white/10">
        <div className="border-b border-white/10 bg-[linear-gradient(90deg,rgba(232,255,60,.10),transparent)] px-4 py-3.5">
          <p className="text-[10px] font-bold uppercase leading-none tracking-[0.16em] text-mute">
            {en ? "Order today · estimated delivery" : "Naručiš danas · procjena dostave"}
          </p>
          <p className="mt-2 font-display text-[26px] uppercase leading-none text-fg">
            {en ? "Arrives" : "Stiže"} <span className="text-accent">{eta ?? (en ? "in 2–5 working days" : "za 2–5 radnih dana")}</span>
          </p>
        </div>
        {[
          {
            Icon: CreditCard,
            title: en ? "Cash on delivery" : "Plaćanje pouzećem",
            text: en
              ? "Pay the courier in cash when the package arrives. Nothing to pay online."
              : "Gotovinom dostavljaču kad paket stigne. Ništa ne plaćaš na webu."
          },
          {
            Icon: Truck,
            title: `${en ? "GLS delivery" : "GLS dostava"} · ${SHIPPING_PRICE_EUR} €`,
            text: en ? "To any address in Croatia, 2–5 working days." : "Na adresu bilo gdje u Hrvatskoj, 2–5 radnih dana."
          },
          {
            Icon: ArrowLeftRight,
            title: en ? "Size exchange" : "Zamjena veličine",
            text: en ? "Doesn't fit? We'll swap it for another size." : "Ne paše? Zamijenimo za drugu veličinu."
          }
        ].map(({ Icon, title, text }) => (
          <div key={title} className="flex gap-3 border-b border-white/10 px-4 py-3.5 last:border-b-0">
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-ink3 text-fg">
              <Icon className="h-4 w-4" />
            </span>
            <span>
              <b className="block text-[14px] font-black leading-tight text-fg">{title}</b>
              <small className="mt-0.5 block text-[12.5px] font-medium leading-[1.4] text-mute">{text}</small>
            </span>
          </div>
        ))}
      </div>

      <a
        href={whatsappUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="mt-3 block text-center text-[12.5px] font-semibold text-mute transition-colors hover:text-accent"
      >
        {en ? "Questions? Order on WhatsApp →" : "Pitanje? Naruči na WhatsApp →"}
      </a>

      <StickyAddToCart
        product={product}
        selectedSize={selectedSize}
        segment={segment}
        segmentLabel={segmentLabel}
        imageSrc={frontImage}
        mainButtonRef={mainButtonRef}
        onNeedSize={() => sizesRef.current?.scrollIntoView({ behavior: "smooth", block: "center" })}
      />
    </div>
  );
}
