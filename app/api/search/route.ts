import { NextResponse } from "next/server";

import { jerseys } from "@/lib/data/jerseys";
import { getCatalogProducts, getStreetwearProducts } from "@/lib/data/product-overrides";
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

  const [catalog, streetwear] = await Promise.all([getCatalogProducts(jerseys), getStreetwearProducts()]);
  const all = [...catalog, ...streetwear];

  const terms = normalize(q).split(/\s+/).filter(Boolean);
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

  return NextResponse.json({ ok: true, results });
}
