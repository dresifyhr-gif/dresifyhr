import type { NoviApi } from "./on";

/* ------------------------------------------------------------------ */
/*  NOVI DIZAJN — zadano ISKLJUČENO (ova datoteka).                     */
/*  Žive rute uvoze `novi` odavde: kad je null, renderira se postojeći  */
/*  JSX bez ijedne promjene. Build s NEXT_PUBLIC_NOVI_DIZAJN=1 zamjenjuje */
/*  ovu datoteku s ./on.tsx (next.config.mjs) — jedini prekidač.         */
/*  Namjerno bez uvoza ičega iz novog dizajna (samo tip), da OFF build   */
/*  ne nosi ni bajt novog koda.                                          */
/* ------------------------------------------------------------------ */

export const NOVI_DIZAJN = false as boolean;

export const novi = null as NoviApi | null;

export type { NoviApi };
