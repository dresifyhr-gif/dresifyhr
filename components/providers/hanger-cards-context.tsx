"use client";

import { createContext, useContext, useSyncExternalStore, type ComponentType } from "react";

import type { HangerImages } from "@/lib/data/ormar-hanger";

/* Prekidač "kartice na vješalici" (zadano ISKLJUČENO).
   Ova datoteka je namjerno sitna: uvozi je ProductCard na živoj stranici, pa ne smije
   povući manifest slika ni crtež vješalice. To donosi tek HangerCardsProvider
   (components/site/hanger-card-provider.tsx) kroz vrijednost konteksta — samo na demo stranicama. */

export type HangerCardArtProps = {
  /** slike na vješalici; bez njih (izgled "ime") kartica crta zid, šipku i "Fotografija uskoro" */
  images?: HangerImages;
  /** miš iznad kartice (računalo): zanjiši i okreni na prednju stranu */
  active: boolean;
  /** opis proizvoda za alt tekst, npr. "Argentina Messi nr10" */
  label: string;
  priority?: boolean;
  dim?: boolean;
  /** proizvod — za veliki natpis prezimena iza dresa (izgled "ime") */
  product?: { igrac: string; klub: string; liga?: string; category?: string };
  /** izgled kartice; bez njega vrijedi izgled iz HangerCardsProvider-a ili ?kartica=ime */
  variant?: HangerCardVariant;
};

/** "vjesalica" = dosadašnja kartica; "ime" = kao reklama (tamni zid + obrubljeno prezime iza dresa). */
export type HangerCardVariant = "vjesalica" | "ime";

export type HangerCardsValue = {
  get: (slug: string) => HangerImages | undefined;
  Art: ComponentType<HangerCardArtProps>;
  /** top srca na karticama s vješalicom — odmah ispod šipke */
  heartTop?: string;
  /** top srca u izgledu "ime" — iznad (spuštene) šipke, gore desno */
  heartTopIme?: string;
  /** zadani izgled kartica unutar providera (URL ?kartica=ime ima prednost) */
  variant?: HangerCardVariant;
};

export const HangerCardsContext = createContext<HangerCardsValue | null>(null);

export function useHangerCards() {
  return useContext(HangerCardsContext);
}

/* ---------- izgled kartice iz URL-a: ?kartica=ime / ?kartica=vjesalica (pregled) ---------- */
const noopSub = () => () => {};
const urlSnap = () => (typeof window === "undefined" ? "" : window.location.search);
/** Izgled iz URL-a. Na poslužitelju "" — prije hidracije stil postavlja skripta providera
    (atribut data-kartica na <html>), pa stari izgled ne bljesne. */
export function useUrlCardVariant(): HangerCardVariant | undefined {
  const qs = useSyncExternalStore(noopSub, urlSnap, () => "");
  const k = qs ? new URLSearchParams(qs).get("kartica") : null;
  return k === "ime" || k === "vjesalica" ? k : undefined;
}

/** Konačni izgled kartica: prop → URL → provider → "vjesalica". */
export function useHangerCardVariant(own?: HangerCardVariant): HangerCardVariant {
  const ctx = useHangerCards();
  const url = useUrlCardVariant();
  return own ?? url ?? ctx?.variant ?? "vjesalica";
}
