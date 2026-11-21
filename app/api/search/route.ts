import { NextResponse } from "next/server";

import { jerseys } from "@/lib/data/jerseys";
import { getCatalogProducts, getStreetwearProducts } from "@/lib/data/product-overrides";
import { getJerseyClubCollections, getJerseyPlayerCollections } from "@/lib/data/seo-collections";
import { repairText } from "@/lib/utils";

export const runtime = "nodejs";

// Tražilica mora naći SVE proizvode — statički katalog (s izmjenama iz admina),
// custom dresove i streetwear. Prije je čitala samo statički niz pa novi
// proizvodi nisu postojali za pretragu.
const normalize = (v: string) =>
  String(v || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/đ/g, "d");

export async function GET(request: Request) {
  const q = (new URL(request.url).searchParams.get("q") || "").trim();
  if (!q) return NextResponse.json({ ok: true, results: [] });

  const [catalog, streetwear, players, clubs] = await Promise.all([
    getCatalogProducts(jerseys),
    getStreetwearProducts(),
    getJerseyPlayerCollections(),
    getJerseyClubCollections()
  ]);
  const all = [...catalog, ...streetwear];

  // Igor 21.11.: "ronaldo dresovi" mora naći SVE Ronaldove dresove, a ne otvoriti jedan.
  // Riječi "dres/dresovi/jersey" ne sužavaju pretragu; ime igrača ili kluba vodi na njegovu stranicu.
  const STOP = new Set(["dres", "dresovi", "dresa", "dresove", "jersey", "jerseys", "shirt", "kit", "za"]);
  const allTerms = normalize(q).split(/\s+/).filter(Boolean);
  const terms = allTerms.filter((t) => !STOP.has(t));
  const core = terms.join(" ");
  const collections =
    core.length >= 3
      ? [...players, ...clubs]
          .map((c) => {
            const name = normalize(c.label).split(/\s+/).filter((w) => !STOP.has(w)).join(" ");
            const words = name.split(" ");
            const hit = name === core || name.startsWith(core) || words.some((w) => w.startsWith(core)) || core.includes(name);
            return hit ? { href: `${c.path}/`, label: repairText(c.heading || c.label), count: c.products.length, exact: name === core } : null;
          })
          .filter((x): x is { href: string; label: string; count: number; exact: boolean } => !!x)
          .sort((a, b) => Number(b.exact) - Number(a.exact) || b.count - a.count)
          .slice(0, 3)
          .map(({ exact: _e, ...c }) => c)
      : [];
  if (!terms.length) return NextResponse.json({ ok: true, results: [], collections });
  const results = all
    .filter((j) => {
      const hay = normalize(`${repairText(j.klub)} ${repairText(j.igrac)} ${repairText(j.liga)}`);
      return terms.every((t) => hay.includes(t));
    })
    .slice(0, 8)
    .map((j) => ({
      slug: j.slug,
      klub: repairText(j.klub),
      igrac: repairText(j.igrac),
      liga: j.category === "streetwear" ? "Streetwear" : repairText(j.liga)
    }));

  return NextResponse.json({ ok: true, results, collections });
}
