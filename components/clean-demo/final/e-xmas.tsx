"use client";

import { useEffect, useState } from "react";

import { Wordmark } from "@/components/clean-demo/d/d-chrome";
import { useShopSettings } from "@/contexts/shop-settings-context";
import { daysLeft, deadlineLabel, deadlinePassed } from "@/lib/christmas";

/* ------------------------------------------------------------------ */
/*  Božićna tema u novom dizajnu — ista postavka kao živa stranica       */
/*  (Postavke → Naslovnica → Božićna tema → layout → useShopSettings;    */
/*  sama se gasi 27.12.). Kad je isključena, ovdje se ne iscrta ništa.   */
/*  Traka je "čista" inačica žive (components/site/announcement-bar.tsx):*/
/*  isti tekst i isti rok, ali tanka, boja zaglavlja, jedna hairline     */
/*  crta, bez bordo pozadine, ikona, okvira, sjaja i animacije.          */
/* ------------------------------------------------------------------ */

/** Visina trake (px). Razmak ispod fiksnog zaglavlja (NavSpacer) je dodaje kad je tema uključena. */
export const XBAR_H = 30;

export function useXmasOn() {
  return useShopSettings().christmasOn;
}

/** Tanka traka iznad navigacije. `hidden`: na skrolu se sklopi (živa traka se odlista s ekrana). */
export function XmasBar({ hidden = false }: { hidden?: boolean }) {
  const { christmasOn, christmasDeadline } = useShopSettings();
  // Dani do roka računaju se tek u pregledniku (server nema "danas" kupca) — isto kao živa traka:
  // tekst nevidljiv dok se rok ne izračuna, da nakon roka ne bljesne stara poruka.
  const [left, setLeft] = useState<number | null>(null);
  const [passed, setPassed] = useState(false);
  useEffect(() => {
    if (!christmasOn) return;
    setLeft(daysLeft(christmasDeadline));
    setPassed(deadlinePassed(christmasDeadline));
  }, [christmasOn, christmasDeadline]);

  if (!christmasOn) return null;
  return (
    <div
      className="e-xbar overflow-hidden bg-[#0a0a0a] transition-[height,border-color] duration-200 ease-out"
      style={{ height: hidden ? 0 : XBAR_H, borderBottom: hidden ? "0 solid transparent" : "1px solid #ffffff14" }}
      aria-hidden={hidden || undefined}
    >
      <p
        className={`flex h-full items-center justify-center gap-2.5 whitespace-nowrap px-4 font-body text-[10.5px] font-semibold uppercase leading-none tracking-[0.16em] text-white/80 lg:gap-3 lg:text-[11px] lg:tracking-[0.2em] ${left === null ? "invisible" : ""}`}
      >
        <span className="hidden lg:inline">Božić s Dresifyjem</span>
        <span aria-hidden className="hidden text-white/25 lg:inline">·</span>
        {passed ? (
          <span className="truncate">Šaljemo i dalje — dostava do Božića više nije zajamčena</span>
        ) : (
          <>
            <span>
              Naruči do <span className="text-[#e8ff3c]">{deadlineLabel(christmasDeadline)}</span> — stiže pod bor
            </span>
            {left ? (
              <span className="text-white/45">
                još {left} {left === 1 ? "dan" : "dana"}
              </span>
            ) : null}
          </>
        )}
      </p>
    </div>
  );
}

/** Kapica na "D" — ista slika i isti položaj (em) kao živi SantaHat, ali mirna (bez njihanja). */
function XmasHat() {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src="/bozic/kapica-sm.webp"
      alt=""
      aria-hidden
      width={64}
      height={52}
      decoding="async"
      className="pointer-events-none absolute select-none"
      style={{ width: "0.67em", height: "auto", left: "-0.068em", top: "-0.346em", transform: "rotate(-11deg)", transformOrigin: "40% 88%", filter: "drop-shadow(0 2px 3px rgba(0,0,0,.45))" }}
    />
  );
}

/** Znak zaglavlja; s uključenom temom dobije kapicu na "D". */
export function XWordmark({ size }: { size: number }) {
  const on = useXmasOn();
  if (!on) return <Wordmark size={size} />;
  return (
    <span className="relative inline-block font-heading leading-none" style={{ fontSize: size }}>
      <XmasHat />
      <Wordmark size={size} />
    </span>
  );
}
