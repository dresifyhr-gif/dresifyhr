import { HANGER_IMAGES, KOMPLET_IMAGES, type HangerImages } from "@/lib/data/ormar-hanger";

/* ------------------------------------------------------------------ */
/*  Jedini izvor sličica proizvoda za kupce: slika "na vješalici".      */
/*  Odluka 17.11.: originalne fotografije na bijeloj podlozi se više    */
/*  ne prikazuju nigdje na stranici (SEO/feedovi ih i dalje koriste).   */
/* ------------------------------------------------------------------ */

/** Najbolje lice za sličicu: dres → prednja (ili stražnja), trenirka → jakna (ili hlače). */
export function hangerFaceSrc(h?: HangerImages | null): string | undefined {
  if (!h) return undefined;
  return h.kind === "dres" ? h.front ?? h.back : h.jaknaFront ?? h.jakna ?? h.hlace;
}

/** Slika na vješalici za proizvod (dres, trenirka ili složena slika kompleta). */
export function hangerThumbSrc(slug: string): string | undefined {
  return hangerFaceSrc(HANGER_IMAGES[slug]) ?? KOMPLET_IMAGES[slug]?.image;
}

/** Ima li proizvod sliku na vješalici (inače se prikazuje stara fotografija, ali na tamnom). */
export function hasHangerThumb(slug: string): boolean {
  return Boolean(hangerThumbSrc(slug));
}

/**
 * Sličica za košaricu/prikaz: vješalica ako postoji, inače zadana fotografija (fallback).
 * Proizvodi bez vješalice (npr. ručno dodani u bazi) i dalje imaju sliku, samo na tamnoj plohi.
 */
export function productThumbSrc(slug: string, fallback?: string): string | undefined {
  return hangerThumbSrc(slug) ?? fallback;
}
