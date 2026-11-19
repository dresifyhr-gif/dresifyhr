"use client";

import { useMemo, type ReactNode } from "react";

import { HangerCardsContext, type HangerCardVariant, type HangerCardsValue } from "@/components/providers/hanger-cards-context";
import { HANGER_CARD_CSS, HEART_TOP_IME, HangerCardArt, HangerCardUrlScript, RAIL_BOTTOM_PCT } from "@/components/site/hanger-card-art";
import { HANGER_IMAGES } from "@/lib/data/ormar-hanger";

/* Uključuje kartice "na vješalici" za sve ProductCard unutar sebe.
   Manifest (lib/data/ormar-hanger.ts) se čita pri uvozu — nove slike se pojave same.
   Proizvodi bez slika na vješalici ostaju na staroj fotografiji. */

const VALUE: HangerCardsValue = {
  get: (slug) => {
    const h = HANGER_IMAGES[slug];
    if (!h) return undefined;
    if (h.kind === "trenirka" && !h.jakna && !h.hlace) return undefined;
    return h;
  },
  Art: HangerCardArt,
  // gumb 44 px, znak srca počinje ~13 px niže → ~5 px čistog razmaka ispod šipke
  heartTop: `calc(${RAIL_BOTTOM_PCT.toFixed(2)}% - 8px)`,
  heartTopIme: HEART_TOP_IME,
};

/** variant: zadani izgled kartica ("vjesalica" = dosadašnji, "ime" = kao reklama s prezimenom
    iza dresa). Bez njega vrijedi "vjesalica"; ?kartica=ime u URL-u uvijek ima prednost (pregled). */
export function HangerCardsProvider({
  children,
  enabled = true,
  variant,
}: {
  children: ReactNode;
  enabled?: boolean;
  variant?: HangerCardVariant;
}) {
  const value = useMemo(() => (variant ? { ...VALUE, variant } : VALUE), [variant]);
  if (!enabled) return <>{children}</>;
  return (
    <HangerCardsContext.Provider value={value}>
      <style dangerouslySetInnerHTML={{ __html: HANGER_CARD_CSS }} />
      <HangerCardUrlScript />
      {children}
    </HangerCardsContext.Provider>
  );
}
