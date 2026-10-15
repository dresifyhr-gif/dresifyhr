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

// Provjera koda za blagajnu: postoji li, je li aktivan, u roku, ispod limita
// korištenja i je li dosegnut minimalni iznos.
export async function lookupPromo(input: string, subtotal: number, buyerKey?: string): Promise<PromoLookup> {
  const code = norm(input);
  if (!code) return { ok: false, reason: "not_found" };

  const rows = await fetchActiveCodes();

  // Iz baze…
  let row = rows?.find((r) => norm(r.code) === code);
  // Sigurnosna mreža: kod kojeg nema u kešu (npr. upravo osvojen KLUB-/KOLO- kod,
  // a signal za osvježavanje se izgubio) provjeri jednom izravno u bazi.
  if (!row && rows) {
    row =
      (await dbQuery(() => prisma.promoCode.findFirst({ where: { code: { equals: code, mode: "insensitive" }, active: true } })).catch(
        () => null
      )) ?? undefined;
  }
  if (row) {
    // Osobni kod (KLUB-/kolo- nagrada) vrijedi SAMO vlasniku. Provjeravamo kad je
    // kupac poznat (buyerKey = phoneKey iz narudžbe). Bez buyerKey (javni /validate,
    // izračun naljepnice) ne diramo — autoritativna provjera je pri kreiranju narudžbe.
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

// Daje li ovaj kod besplatnu dostavu na ovoj robi? Naljepnica (codAmount) mora
// suditi po istim pravilima kao blagajna: samo kodovi tipa "freeship" i to tek
// kad je njihov minimum zadovoljen. lookupPromo već provjerava minimum, rok i
// iskorištenost, pa ovdje ostaje samo provjera vrste.
export async function promoGrantsFreeShipping(code: string | null | undefined, goods: number): Promise<boolean> {
  if (!code?.trim()) return false;
  const r = await lookupPromo(code, goods);
  return r.ok && r.promo.kind === "freeship";
}
