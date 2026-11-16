import { Fragment } from "react";

import type { Jersey } from "@/lib/data/jerseys";
import { canonicalClubName, type JerseyCollection } from "@/lib/data/seo-collections";
import { repairText } from "@/lib/utils";

type AllProductsIndexProps = {
  products: Jersey[];
  clubCollections: JerseyCollection[];
  locale?: "hr" | "en";
};

// "Svi dresovi A–Ž": serverski, kompaktan popis OBIČNIH <a href> linkova na
// svaki proizvod u katalogu, grupiran po klubu. Katalog iznad prikazuje samo
// 24 kartice (gumb "Prikaži još" radi preko JS-a), pa bez ovoga Google preko
// /dresovi/ ne dolazi do ostalih proizvoda. Namjerno bez slika i bez klijentskog
// JS-a: jedan <a> po proizvodu, a content-visibility preskače iscrtavanje dok
// sekcija nije na ekranu (DOM ostaje malen, mobitel brz).
export function AllProductsIndex({ products, clubCollections, locale = "hr" }: AllProductsIndexProps) {
  const en = locale === "en";

  // slug proizvoda → landing kluba (ako postoji)
  const clubPathBySlug = new Map<string, string>();
  for (const collection of clubCollections) {
    for (const product of collection.products) {
      if (!clubPathBySlug.has(product.slug)) clubPathBySlug.set(product.slug, collection.path);
    }
  }

  const groups = new Map<string, Jersey[]>();
  const seen = new Set<string>();
  for (const product of products) {
    if (seen.has(product.slug)) continue;
    seen.add(product.slug);
    const club = repairText(canonicalClubName(product.klub)) || "Ostalo";
    const list = groups.get(club);
    if (list) list.push(product);
    else groups.set(club, [product]);
  }

  const sortedGroups = [...groups.entries()]
    .sort(([left], [right]) => left.localeCompare(right, "hr"))
    .map(([club, items]) => ({
      club,
      items: [...items].sort((a, b) => repairText(a.igrac).localeCompare(repairText(b.igrac), "hr")),
      landing: items.map((item) => clubPathBySlug.get(item.slug)).find(Boolean)
    }));

  return (
    <section
      id="svi-dresovi"
      aria-labelledby="svi-dresovi-naslov"
      className="mt-10 scroll-mt-28 border-t border-white/10 pt-8 [contain-intrinsic-size:auto_1600px] [content-visibility:auto]"
    >
      <h2 id="svi-dresovi-naslov" className="font-heading text-2xl uppercase leading-none text-white sm:text-3xl">
        {en ? "All jerseys A–Z" : "Svi dresovi A–Ž"}
      </h2>
      <p className="mt-3 max-w-3xl text-sm leading-7 text-white/55">
        {en
          ? `Full list of all ${seen.size} jerseys in the catalogue, grouped by club and national team.`
          : `Popis svih ${seen.size} dresova u katalogu, po klubovima i reprezentacijama.`}
      </p>

      <div className="mt-6 gap-x-8 sm:columns-2 xl:columns-3">
        {sortedGroups.map(({ club, items, landing }) => (
          <div key={club} className="mb-5 break-inside-avoid">
            <h3 className="text-xs font-semibold uppercase tracking-[0.24em] text-white/80">
              {landing ? (
                <a href={`${landing}/`} className="hover:text-accent">
                  {club} <span className="text-white/40">({items.length})</span>
                </a>
              ) : (
                <>
                  {club} <span className="text-white/40">({items.length})</span>
                </>
              )}
            </h3>
            <p className="mt-1.5 text-[13px] leading-6 text-white/55">
              {items.map((item, index) => (
                <Fragment key={item.slug}>
                  {index > 0 ? " · " : null}
                  <a href={`/dres/${item.slug}/`} className="hover:text-accent hover:underline">
                    {repairText(item.igrac)}
                  </a>
                </Fragment>
              ))}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}
