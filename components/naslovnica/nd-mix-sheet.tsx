"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import Image from "next/image";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowRight, Check, X } from "lucide-react";

import { useCart } from "@/components/providers/cart-provider";
import { MIX_ADDON_PRICE_EUR, MIX_CLUBS, addonCount, addonsText, type MixAddons, type MixKind } from "@/lib/mix";

import { GameBall, clubLabel } from "./nd-balls";
import { capSrc } from "./nd-caps";

/** Dres koji se može složiti u mix (podaci sa servera, cijene iz kataloga). */
export type MixJerseyOpt = {
  slug: string;
  klub: string;
  igrac: string;
  price: number;
  hanger: string; // slika na vješalici
  imageSrc?: string; // slika za košaricu (ista kao na stranici dresa)
  category?: string;
  adults: string[]; // samo dostupne veličine
  kids: string[];
};
export type KompletOption = { slug: string; klub: string; igrac: string; price: number; img: string };
export type MixStart = { kind: MixKind; club: string };

const SHEET_EASE = [0.32, 0.72, 0, 1] as const;
const norm = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim();
// "Modrić nr10 — komplet (…)" → "Modrić nr10"
const shortName = (igrac: string) => igrac.split("—")[0].trim();

/** Pripada li klub (iz kataloga) ključu kluba iz "Složi svoj mix". */
export function isClub(klub: string, key: string) {
  const k = norm(klub);
  switch (key) {
    case "real-madrid":
      return k.includes("real madrid");
    case "inter-miami":
      return k.includes("inter miami");
    case "milan":
      return k === "ac milan" || k === "milan";
    case "bayern":
      return k.includes("bayern");
    default:
      return k.includes(key);
  }
}

/* Blokira pomicanje stranice izvan lista (bez diranja overflowa na <html>). */
function useScrollLock(locked: boolean) {
  useEffect(() => {
    if (!locked) return;
    const inside = (t: EventTarget | null) => t instanceof Element && !!t.closest("[role=dialog]");
    const block = (e: Event) => {
      if (!inside(e.target)) e.preventDefault();
    };
    document.addEventListener("wheel", block, { passive: false });
    document.addEventListener("touchmove", block, { passive: false });
    return () => {
      document.removeEventListener("wheel", block);
      document.removeEventListener("touchmove", block);
    };
  }, [locked]);
}

function AddonThumb({ kind, club, id }: { kind: MixKind; club: string; id: string }) {
  if (kind === "lopta") return <GameBall club={club} id={id} className="h-full w-full" />;
  return (
    <span className="relative block h-full w-full">
      <Image src={capSrc(club)} alt="" fill sizes="96px" quality={88} draggable={false} className="object-contain" />
    </span>
  );
}

export function MixSheet({
  open,
  start,
  jerseys,
  komplets,
  onClose
}: {
  open: boolean;
  start: MixStart;
  jerseys: MixJerseyOpt[];
  komplets: KompletOption[];
  onClose: () => void;
}) {
  const { addItem } = useCart();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  useScrollLock(open);

  const [addons, setAddons] = useState<MixAddons>({});
  const [pick, setPick] = useState<string | null>(null);
  const [segment, setSegment] = useState<"adult" | "kid">("adult");
  const [size, setSize] = useState("");
  const [flash, setFlash] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const sizeRef = useRef<HTMLDivElement>(null);
  // Veličine su na mobitelu ispod ruba lista — dovedi ih u vidno polje (samo unutar lista).
  const revealSizes = () => {
    window.setTimeout(() => {
      const box = scrollRef.current;
      const el = sizeRef.current;
      if (!box || !el) return;
      const b = box.getBoundingClientRect();
      const e = el.getBoundingClientRect();
      if (e.bottom > b.bottom - 8) box.scrollBy({ top: e.bottom - b.bottom + 16, behavior: "smooth" });
    }, 30);
  };
  const openedAt = useRef(0);

  // Hrvatska prva, zatim dresovi kluba odabrane lopte/kape, pa ostali (redoslijed šipke).
  const list = useMemo(() => {
    const hr = jerseys.filter((j) => isClub(j.klub, "hrvatska"));
    const club = start.club === "hrvatska" ? [] : jerseys.filter((j) => isClub(j.klub, start.club));
    const rest = jerseys.filter((j) => !hr.includes(j) && !club.includes(j));
    return [...hr, ...club, ...rest];
  }, [jerseys, start.club]);

  useEffect(() => {
    if (!open) return;
    openedAt.current = performance.now();
    setAddons({ [start.kind]: start.club });
    const first = list.find((j) => isClub(j.klub, start.club)) ?? list[0];
    setPick(first?.slug ?? null);
    setSegment(first && !first.adults.length ? "kid" : "adult");
    setSize("");
    // odabrani dres u vidno polje liste
    window.setTimeout(() => {
      const el = listRef.current?.querySelector<HTMLElement>("[aria-selected=true]");
      const box = listRef.current;
      if (el && box) box.scrollTo({ left: Math.max(0, el.offsetLeft - 20), behavior: "auto" });
    }, 60);
  }, [open, start.kind, start.club, list]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!mounted) return null;

  const j = list.find((x) => x.slug === pick) ?? null;
  const hasBoth = !!j && j.adults.length > 0 && j.kids.length > 0;
  const sizes = j ? (segment === "adult" ? j.adults : j.kids) : [];
  const isLong = j?.category === "dugi-rukav";
  // Isti zapis kao "Složi svoj mix" (QuickMixSheet / stranica dresa).
  const segmentLabel = segment === "adult" || isLong ? "Dres" : "Dres i hlačice";
  const n = addonCount(addons);
  const total = (j?.price ?? 0) + n * MIX_ADDON_PRICE_EUR;
  const komplet = komplets.find((k) => isClub(k.klub, addons.lopta ?? addons.kapa ?? start.club));

  const toggle = (kind: MixKind, key: string) => setAddons((a) => ({ ...a, [kind]: a[kind] === key ? undefined : key }));
  const choose = (slug: string) => {
    setPick(slug);
    const nj = list.find((x) => x.slug === slug);
    if (nj && !nj.adults.length) setSegment("kid");
    else if (nj && !nj.kids.length) setSegment("adult");
    setSize("");
    revealSizes();
  };

  const add = () => {
    if (!j) return;
    if (!size) {
      revealSizes();
      setFlash(true);
      window.setTimeout(() => setFlash(false), 900);
      return;
    }
    // Isti oblik stavke kao MixPicker / stranica dresa (server sam preračuna dodatke).
    addItem({
      slug: j.slug,
      klub: j.klub,
      igrac: j.igrac,
      size,
      segment,
      segmentLabel: n ? `${segmentLabel}${addonsText(addons)}` : segmentLabel,
      imageSrc: j.imageSrc,
      price: total,
      category: j.category,
      ...(n ? { addons: { ...addons } } : {})
    });
    onClose();
  };

  const row = (kind: MixKind, title: string) => (
    <div className="mt-4">
      <p className="px-5 text-[11px] font-semibold uppercase tracking-[0.18em] text-white/50">
        {title} <span className="text-white/30">· +{MIX_ADDON_PRICE_EUR} €</span>
        {addons[kind] && <span className="ml-1.5 normal-case tracking-normal text-white/80">{clubLabel(addons[kind]!)}</span>}
      </p>
      <div className="nd-noscroll mt-2 flex gap-2 overflow-x-auto overscroll-contain px-5 pb-1">
        {MIX_CLUBS.map((c) => {
          const on = addons[kind] === c.key;
          return (
            <button
              key={c.key}
              type="button"
              onClick={() => toggle(kind, c.key)}
              aria-pressed={on}
              aria-label={`${title} ${c.label}`}
              className={`relative h-[48px] w-[48px] shrink-0 rounded-[14px] p-1.5 transition-[box-shadow,background-color] duration-200 ${
                on ? "bg-white/[0.07] shadow-[0_0_0_2px_#e8ff3c]" : "bg-white/[0.035] shadow-[inset_0_0_0_1px_rgba(255,255,255,.08)]"
              }`}
            >
              <AddonThumb kind={kind} club={c.key} id={`ndm-${kind}-${c.key}`} />
              {on && (
                <span className="absolute -right-1 -top-1 inline-flex h-[18px] w-[18px] items-center justify-center rounded-full bg-[#e8ff3c]">
                  <Check strokeWidth={3.2} className="h-3 w-3 text-[#0a0a0a]" />
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );

  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.button
          key="scrim"
          type="button"
          aria-label="Zatvori"
          onClick={() => {
            if (performance.now() - openedAt.current > 450) onClose();
          }}
          className="nd-scrim z-[130] touch-none"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1, transition: { duration: 0.2, ease: "easeOut" } }}
          exit={{ opacity: 0, transition: { duration: 0.16, ease: "easeIn" } }}
        />
      )}
      {open && (
        <motion.div
          key="panel"
          role="dialog"
          aria-modal="true"
          aria-label="Složi svoj mix"
          // List se otvara na pointerdown (dvostruki dodir lopte) — "click" istog dodira bi
          // inače pao na kontrolu ispod prsta (npr. kapu). Prvih 450 ms klikove gutamo.
          onClickCapture={(e) => {
            if (performance.now() - openedAt.current < 450) {
              e.stopPropagation();
              e.preventDefault();
            }
          }}
          initial={{ y: "100%" }}
          animate={{ y: 0, transition: { duration: 0.38, ease: SHEET_EASE } }}
          exit={{ y: "100%", transition: { duration: 0.24, ease: [0.4, 0, 1, 1] } }}
          className="nd-root nd-l2 nd-rim fixed inset-x-0 bottom-0 z-[131] mx-auto flex max-h-[90vh] w-full max-w-[560px] flex-col overflow-hidden rounded-t-[24px] text-white"
          style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
        >
          <div className="mx-auto mt-2.5 h-1 w-9 shrink-0 rounded-full bg-white/25" />
          <div ref={scrollRef} className="nd-noscroll min-h-0 flex-1 overflow-y-auto overscroll-contain">
            {/* zaglavlje: odabrani dodaci */}
            <div className="flex items-start gap-3 px-5 pb-1 pt-4">
              <div className="relative flex h-[60px] shrink-0 items-center">
                {addons.lopta && <GameBall club={addons.lopta} id="ndm-head-ball" className="h-[54px] w-[54px] shadow-[0_14px_30px_-10px_rgba(0,0,0,.9)]" />}
                {addons.kapa && (
                  <span className={`relative block h-[52px] w-[60px] ${addons.lopta ? "-ml-3" : ""}`}>
                    <AddonThumb kind="kapa" club={addons.kapa} id="ndm-head-cap" />
                  </span>
                )}
                {!n && <span className="block h-[54px] w-[54px] rounded-full border border-dashed border-white/20" />}
              </div>
              <div className="min-w-0 flex-1 pt-0.5">
                <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#e8ff3c]/90">Složi svoj mix</p>
                <h2 className="mt-1 font-heading text-[24px] uppercase leading-[0.95] tracking-[0.02em]">
                  Dres po izboru
                  <span className="block text-white/55">+ lopta i/ili kapa</span>
                </h2>
              </div>
              <button type="button" onClick={onClose} aria-label="Zatvori" className="nd-icon -mr-1 shrink-0">
                <X strokeWidth={1.75} className="h-[18px] w-[18px]" />
              </button>
            </div>

            {row("lopta", "Lopta")}
            {row("kapa", "Kapa")}

            {/* dres */}
            <p className="mt-4 px-5 text-[11px] font-semibold uppercase tracking-[0.18em] text-white/50">Dres</p>
            <div
              ref={listRef}
              className="nd-noscroll relative mt-2 flex snap-x snap-mandatory scroll-px-5 gap-2.5 overflow-x-auto overscroll-contain px-5 pb-1"
              role="listbox"
              aria-label="Dresovi"
            >
              {list.map((x) => {
                const on = x.slug === pick;
                return (
                  <button key={x.slug} type="button" role="option" aria-selected={on} onClick={() => choose(x.slug)} className="group relative w-[92px] shrink-0 snap-start text-left">
                    <div
                      className={`relative aspect-[4/5] overflow-hidden rounded-[16px] transition-shadow duration-200 ${
                        on ? "shadow-[0_0_0_2px_#e8ff3c,0_12px_30px_-12px_rgba(232,255,60,.4)]" : "shadow-[inset_0_0_0_1px_rgba(255,255,255,.08)]"
                      }`}
                      style={{ background: "radial-gradient(80% 60% at 50% 35%, rgba(255,255,255,.09), transparent 70%), linear-gradient(180deg,#171717,#0d0d0d)" }}
                    >
                      <Image src={x.hanger} alt="" fill sizes="92px" className="object-contain px-1 pt-1 transition-transform duration-300 group-active:scale-[.97]" />
                      {on && (
                        <span className="absolute right-1.5 top-1.5 inline-flex h-5 w-5 items-center justify-center rounded-full bg-[#e8ff3c]">
                          <Check strokeWidth={3} className="h-3 w-3 text-[#0a0a0a]" />
                        </span>
                      )}
                    </div>
                    <p className="mt-1.5 truncate text-[12px] font-semibold text-white">{x.klub}</p>
                    <p className="flex items-center justify-between gap-1.5 text-[11px] text-white/50">
                      <span className="truncate">{shortName(x.igrac)}</span>
                      <span className={`shrink-0 whitespace-nowrap ${on ? "font-semibold text-[#e8ff3c]" : "text-white/70"}`}>{x.price} €</span>
                    </p>
                  </button>
                );
              })}
            </div>

            {/* veličina */}
            {j && (
              <div ref={sizeRef} className="mt-4 px-5">
                <div className="flex items-center justify-between gap-3">
                  <p className={`text-[11px] font-semibold uppercase tracking-[0.18em] transition-colors ${flash ? "text-[#e8ff3c]" : "text-white/50"}`}>Veličina</p>
                  {hasBoth && (
                    <div className="inline-flex rounded-full bg-white/[0.04] p-0.5 shadow-[inset_0_0_0_1px_rgba(255,255,255,.08)]">
                      {(["adult", "kid"] as const).map((s) => (
                        <button
                          key={s}
                          type="button"
                          onClick={() => {
                            setSegment(s);
                            setSize("");
                          }}
                          aria-pressed={segment === s}
                          className={`h-8 rounded-full px-3.5 text-[12px] font-semibold transition-colors ${segment === s ? "bg-white text-[#0a0a0a]" : "text-white/65"}`}
                        >
                          {s === "adult" ? "Odrasli" : "Djeca"}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                <div className="mt-2.5 grid grid-cols-5 gap-1.5">
                  {sizes.map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => setSize(s)}
                      aria-pressed={size === s}
                      className={`h-11 rounded-[12px] text-[13.5px] font-semibold transition-[background-color,box-shadow,color] duration-150 ${
                        size === s
                          ? "bg-[#e8ff3c] text-[#0a0a0a]"
                          : `bg-white/[0.04] text-white ${flash ? "shadow-[inset_0_0_0_1px_rgba(232,255,60,.6)]" : "shadow-[inset_0_0_0_1px_rgba(255,255,255,.09)]"}`
                      }`}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* obračun */}
            {j && (
              <div className="mx-5 mt-5 space-y-1 border-t border-white/[0.07] pt-3 text-[13px] text-white/60">
                <div className="flex justify-between gap-3">
                  <span className="truncate">
                    {segmentLabel} · {j.klub} {shortName(j.igrac)}
                    {size ? ` · ${size}` : ""}
                  </span>
                  <span className="shrink-0">{j.price} €</span>
                </div>
                {addons.lopta && (
                  <div className="flex justify-between">
                    <span>Lopta {clubLabel(addons.lopta)}</span>
                    <span>+{MIX_ADDON_PRICE_EUR} €</span>
                  </div>
                )}
                {addons.kapa && (
                  <div className="flex justify-between">
                    <span>Kapa {clubLabel(addons.kapa)}</span>
                    <span>+{MIX_ADDON_PRICE_EUR} €</span>
                  </div>
                )}
              </div>
            )}
            {komplet && (
              <Link
                href={`/dres/${komplet.slug}/`}
                onClick={onClose}
                className="mx-5 mt-3 flex items-center justify-between gap-3 rounded-[14px] bg-white/[0.03] px-3.5 py-2.5 text-[12.5px] text-white/60 shadow-[inset_0_0_0_1px_rgba(255,255,255,.07)] transition-colors hover:text-white"
              >
                <span className="min-w-0">
                  <span className="block truncate text-white/75">Ili cijeli komplet {komplet.klub}</span>
                  <span className="block truncate text-[11.5px] text-white/40">Dres, hlačice, lopta i kapa</span>
                </span>
                <span className="inline-flex shrink-0 items-center gap-1 text-white/80">
                  {komplet.price} € <ArrowRight strokeWidth={2} className="h-3.5 w-3.5" />
                </span>
              </Link>
            )}
            <div className="h-4" />
          </div>

          {/* gumb */}
          <div className="shrink-0 border-t border-white/[0.06] px-5 pb-4 pt-3">
            {j ? (
              <button type="button" onClick={add} className="nd-btn w-full" aria-disabled={false}>
                {size ? `Dodaj u košaricu · ${total} €` : `Odaberi veličinu · ${total} €`}
              </button>
            ) : (
              <span className="nd-btn w-full" aria-disabled="true">
                Odaberi dres
              </span>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  );
}
