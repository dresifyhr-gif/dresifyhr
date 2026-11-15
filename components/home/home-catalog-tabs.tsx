"use client";

import { useEffect, useState } from "react";

import { CatalogBrowser } from "@/components/site/catalog-browser";
import { ProductCard } from "@/components/site/product-card";
import type { Jersey } from "@/lib/data/jerseys";

type Tab = "dresovi" | "streetwear" | "trenirka";

// Switch na naslovnoj: prebacuje katalog dresova ⇄ streetwear ⇄ trenirke u mjestu.
// Banner (i #streetwear / #trenirke u URL-u) mogu preselektirati odgovarajući tab.
export function HomeCatalogTabs({
  dresovi,
  streetwear,
  trenirke,
  headingLabel,
  headingTitle,
  headingDesc
}: {
  dresovi: Jersey[];
  streetwear: Jersey[];
  trenirke: Jersey[];
  headingLabel: string;
  headingTitle: string;
  headingDesc: string;
}) {
  const [tab, setTab] = useState<Tab>("dresovi");

  // Otvori odgovarajući tab kad se do sekcije dođe preko hasha (direktan URL ili
  // klik na banner na istoj stranici — tada hashchange, bez remounta).
  useEffect(() => {
    const sync = () => {
      if (window.location.hash === "#streetwear") setTab("streetwear");
      else if (window.location.hash === "#trenirke") setTab("trenirka");
    };
    sync();
    window.addEventListener("hashchange", sync);
    return () => window.removeEventListener("hashchange", sync);
  }, []);

  const hasStreetwear = streetwear.length > 0;
  const hasTrenirke = trenirke.length > 0;

  return (
    <div id="streetwear" className="scroll-mt-24">
      {/* Switch */}
      {(hasStreetwear || hasTrenirke) && (
        <div className="mb-6 flex justify-center sm:mb-8">
          <div className="grid w-full max-w-[460px] auto-cols-fr grid-flow-col rounded-full border border-white/10 bg-[#111111] p-1">
            {([
              ["dresovi", "Dresovi", true],
              ["trenirka", "Trenirke", hasTrenirke],
              ["streetwear", "Streetwear", hasStreetwear]
            ] as const).filter(([, , show]) => show).map(([key, label]) => (
              <button
                key={key}
                type="button"
                onClick={() => setTab(key)}
                aria-pressed={tab === key}
                className={`min-w-0 whitespace-nowrap rounded-full px-1 py-3 text-center text-[13px] font-bold uppercase tracking-[0.06em] transition sm:text-sm ${
                  tab === key ? "bg-accent text-black" : "text-white/60 hover:text-white"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      )}

      {tab === "dresovi" && (
        <CatalogBrowser products={dresovi} compactHeader showMixPromo={["dres", "dugi-rukav", "trenirka"]} headingLabel={headingLabel} headingTitle={headingTitle} headingDesc={headingDesc} />
      )}

      {tab === "trenirka" && (
        <div>
          <div className="mb-6 text-center">
            <span className="text-[11px] font-bold uppercase tracking-[0.28em] text-accent">Trenirke</span>
            <h2 className="mt-2 font-heading text-3xl uppercase leading-none text-white sm:text-4xl">Komplet trenirke</h2>
            <p className="mx-auto mt-3 max-w-xl text-sm text-white/55">
              Jakna + hlače u klupskom dizajnu. 35 €, dostava po cijeloj Hrvatskoj, plaćanje pouzećem.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
            {trenirke.map((product) => (
              <ProductCard key={product.slug} product={product} theme="trenirka" />
            ))}
          </div>
        </div>
      )}

      {tab === "streetwear" && (
        <div>
          <div className="mb-6 text-center">
            <span className="text-[11px] font-bold uppercase tracking-[0.28em] text-accent">Streetwear</span>
            <h2 className="mt-2 font-heading text-3xl uppercase leading-none text-white sm:text-4xl">Ulični kompleti</h2>
            <p className="mx-auto mt-3 max-w-xl text-sm text-white/55">
              Majica + hlačice u uličnom stilu. Veličine XS–L, plaćanje pouzećem, besplatna dostava od 60 € za registrirane.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
            {streetwear.map((product) => (
              <ProductCard key={product.slug} product={product} theme="streetwear" />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
