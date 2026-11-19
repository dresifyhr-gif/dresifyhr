/* NOVI DIZAJN — jedna build-time zastavica: NEXT_PUBLIC_NOVI_DIZAJN=1.
   Čita se SAMO u next.config.mjs, koji tada zamijeni modul components/novi/index.ts
   (isključeno: `novi = null`) s components/novi/on.tsx (uključeno). Zato:
   - zadano (varijabla nije postavljena) = produkcija identična zadnjem izdanju,
   - nema runtime prekidača koji bi netko slučajno upalio na produkciji,
   - preview: vercel deploy --build-env NEXT_PUBLIC_NOVI_DIZAJN=1 --env NEXT_PUBLIC_NOVI_DIZAJN=1 (bez --prod).
   Nakon puštanja: ukloniti grane `novi ? … : …` i ovu datoteku. */
export { NOVI_DIZAJN } from "@/components/novi";
