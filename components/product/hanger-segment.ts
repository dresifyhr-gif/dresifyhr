"use client";

import { useEffect, useState } from "react";

/* Odrasli / Djeca: panel s detaljima objavljuje odabir, galerija (vješalica)
   ga sluša — sestrinske komponente bez zajedničkog stanja. Zadnja vrijednost se
   pamti za komponente koje se montiraju kasnije (lijeno učitana 3D scena). */

type Seg = { slug: string; segment: "adult" | "kid" };
const EVT = "dresify:segment";
let last: Seg | null = null;

export function publishSegment(slug: string, segment: "adult" | "kid") {
  last = { slug, segment };
  if (typeof window !== "undefined") window.dispatchEvent(new CustomEvent<Seg>(EVT, { detail: last }));
}

export function useKidSegment(slug: string): boolean {
  const [kid, setKid] = useState(() => last?.slug === slug && last.segment === "kid");
  useEffect(() => {
    setKid(last?.slug === slug && last.segment === "kid");
    const on = (e: Event) => {
      const d = (e as CustomEvent<Seg>).detail;
      if (d.slug === slug) setKid(d.segment === "kid");
    };
    window.addEventListener(EVT, on);
    return () => window.removeEventListener(EVT, on);
  }, [slug]);
  return kid;
}
