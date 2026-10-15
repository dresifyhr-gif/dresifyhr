import "server-only";

import { unstable_cache } from "next/cache";

import { dbQuery, withLastGood } from "@/lib/db-guard";
import { prisma } from "@/lib/prisma";
import { PROMO_CODES, computePromoDiscount, type PromoCode } from "@/lib/promo";

// Popust-kodovi iz baze (uređuju se u adminu). Ako baza nije dostupna ili je
// prazna, pada natrag na zakucanu listu iz lib/promo.ts — blagajna nikad ne
// ostaje bez kodova zbog problema s bazom.
//
// Keš 1 h (prije 60 s, što je budilo Neon — ispad kvote 15.10.2026.); admin
// spremanje i nove nagrade (Klub, kolo) zovu bustCache("promo-codes"). Bez
// try/catch unutra — greška se ne sprema u keš (vidi lib/db-guard.ts).
const fetchActiveCodesCached = unstable_cache(
  async () => {
    if (!process.env.DATABASE_URL) return null;
    const rows = await dbQuery(() => prisma.promoCode.findMany({ where: { active: true } }));
    return rows.length ? rows : null;
  },
  ["promo-codes-active-v2"],
  { revalidate: 3600, tags: ["promo-codes"] }
);
const fetchActiveCodes = () => withLastGood("promo", null, fetchActiveCodesCached);

const norm = (s: string) => String(s || "").trim().toUpperCase();

// Koliko je puta kod već iskorišten (izvodi se iz narudžbi — uvijek točno).
async function usedCount(code: string): Promise<number> {
  try {
    return await prisma.order.count({ where: { promoCode: { equals: code, mode: "insensitive" } } });
  } catch {
    return 0;
  }
}

export type PromoLookup =
  | { ok: true; promo: PromoCode; discount: number }
  | { ok: false; reason: "not_found" | "min_not_met" | "expired" | "used_up"; promo?: PromoCode };

// Format koda — isto pravilo kao u adminu (KLUB-/KOLO- nagrade ga također
// zadovoljavaju). Sve ostalo je "ne postoji" i NIKAD ne ide u bazu (bez %, _,
// NUL znakova i sl. — nema pogađanja kodova ni rušenja osigurača smećem).
const CODE_RE = /^[A-Z0-9-]{2,24}$/;

// Provjera koda za blagajnu: postoji li, je li aktivan, u roku, ispod limita
// korištenja i je li dosegnut minimalni iznos.
export async function lookupPromo(input: string, subtotal: number, buyerKey?: string): Promise<PromoLookup> {
  const code = norm(input);
  if (!CODE_RE.test(code)) return { ok: false, reason: "not_found" };

  const rows = await fetchActiveCodes();
  let row = rows?.find((r) => norm(r.code) === code);

  // Valjan kod se UVIJEK provjerava svježe u bazi — i u košarici (/validate) i
  // pri kreiranju narudžbe — pa obje strane daju ISTI popust, a deaktiviran,
  // izmijenjen ili upravo osvojen (KLUB-/KOLO-) kod vrijedi odmah. Ovo se zove
  // samo kad kupac unese kod (ne na običan posjet), pa ne smeta spavanju baze.
  // Keš služi samo kao rezerva kad baza ne radi.
  // Točno podudaranje po primarnom ključu (kodovi su uvijek velikim slovima).
  try {
    const fresh = await dbQuery(() => prisma.promoCode.findUnique({ where: { code } }));
    row = fresh && fresh.active ? fresh : undefined;
  } catch {
    /* baza ne radi → ostaje keširani red (ako ga ima) */
  }
  if (row) {
    // Osobni kod (KLUB-/kolo- nagrada) vrijedi SAMO vlasniku. Provjeravamo kad je
    // kupac poznat (buyerKey = phoneKey iz narudžbe). Bez buyerKey (javni /validate)
    // ne diramo — autoritativna provjera je pri kreiranju narudžbe.
    if (buyerKey !== undefined && row.personalFor && row.personalFor !== buyerKey) {
      return { ok: false, reason: "not_found" };
    }
    const promo: PromoCode = {
      code: norm(row.code),
      kind: row.kind === "freeship" ? "freeship" : row.kind === "amount" ? "amount" : "percent",
      value: row.value,
      minSubtotal: row.minSubtotal,
      label: row.label || ""
    };
    // new Date(): iz keša datum stiže kao tekst (unstable_cache ga serijalizira u JSON)
    // pa bi row.expiresAt.getTime() puknuo i blagajna bi odbila kod.
    if (row.expiresAt && new Date(row.expiresAt).getTime() < Date.now()) return { ok: false, reason: "expired", promo };
    if (row.maxUses != null && (await usedCount(promo.code)) >= row.maxUses) return { ok: false, reason: "used_up", promo };
    if (subtotal < promo.minSubtotal) return { ok: false, reason: "min_not_met", promo };
    return { ok: true, promo, discount: computePromoDiscount(promo, subtotal) };
  }

  // …ili fallback na zakucanu listu (samo ako baza nije dala ništa).
  if (!rows) {
    const fb = PROMO_CODES.find((p) => p.code === code);
    if (fb) {
      if (subtotal < fb.minSubtotal) return { ok: false, reason: "min_not_met", promo: fb };
      return { ok: true, promo: fb, discount: computePromoDiscount(fb, subtotal) };
    }
  }

  return { ok: false, reason: "not_found" };
}

// Je li kod dao besplatnu dostavu VEĆ NAPRAVLJENOJ narudžbi (naljepnica, izvoz)?
// Ta je narudžba kod već iskoristila, pa se NE provjeravaju rok ni broj
// korištenja — inače bi jednokratni kod (Klub/kolo "besplatna dostava") brojao
// samu tu narudžbu kao "iskorišten", a naljepnica bi kuriru dodala dostavu na
// pouzeće koju kupac na blagajni nije platio. Važe samo vrsta koda i minimum.
export async function promoGrantsFreeShipping(code: string | null | undefined, goods: number): Promise<boolean> {
  const c = norm(code ?? "");
  if (!CODE_RE.test(c)) return false;
  let row: { kind: string; minSubtotal: number } | null = (await fetchActiveCodes())?.find((r) => norm(r.code) === c) ?? null;
  // Iskorišten/istekao/ugašen kod nije u keširanom popisu aktivnih — pročitaj ga
  // izravno (naljepnice i izvoz su admin, ne utječu na spavanje baze).
  if (!row) row = await dbQuery(() => prisma.promoCode.findUnique({ where: { code: c } })).catch(() => null);
  if (row) return row.kind === "freeship" && goods >= row.minSubtotal;
  const fb = PROMO_CODES.find((p) => p.code === c);
  return !!fb && fb.kind === "freeship" && goods >= fb.minSubtotal;
}
