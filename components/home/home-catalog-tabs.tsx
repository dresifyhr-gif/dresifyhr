"use client";

import { useEffect, useState } from "react";

import { CatalogBrowser } from "@/components/site/catalog-browser";
import { ProductCard } from "@/components/site/product-card";
import type { Jersey } from "@/lib/data/jerseys";

type Tab = "dresovi" | "streetwear" | "trenirka";

// Switch na naslovnoj: prebacuje katalog dresova ⇄ streetwear ⇄ trenirke u mjestu.
// Banner (i #streetwear / #trenirke u URL-u) mogu preselektirati odgovarajući tab.
export function HomeCatalogTabs({
  index,
  dresovi,
  streetwear,
  trenirke,
  headingLabel,
  headingTitle,
  headingDesc
}: {
  index?: string;
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
      <div className="idx">
        {index ? <b>{index}</b> : null}
        {headingLabel}
      </div>

      {/* Switch: dresovi ⇄ trenirke ⇄ streetwear */}
      {(hasStreetwear || hasTrenirke) && (
        <div className="rail mb-5" role="tablist">
          {([
            ["dresovi", "Dresovi", true],
            ["trenirka", "Trenirke", hasTrenirke],
            ["streetwear", "Streetwear", hasStreetwear]
          ] as const)
            .filter(([, , on]) => on)
            .map(([key, label]) => (
              <button
                key={key}
                type="button"
                role="tab"
                aria-selected={tab === key}
                onClick={() => setTab(key)}
                className={`h-[34px] shrink-0 rounded-full border px-3.5 text-[11.5px] font-bold uppercase tracking-[0.04em] transition-colors ${
                  tab === key ? "border-fg bg-fg text-black" : "border-white/[0.18] text-[#d6d6cf] hover:border-white/40"
                }`}
              >
                {label}
              </button>
            ))}
        </div>
      )}

      {tab === "dresovi" && (
        <CatalogBrowser products={dresovi} compactHeader headingLabel={headingLabel} headingTitle={headingTitle} headingDesc={headingDesc} />
      )}

      {tab === "trenirka" && (
        <div>
          <div className="mb-6">
            <h2 className="font-display text-[54px] uppercase leading-[0.92] text-fg lg:text-[80px]">Komplet trenirke</h2>
            <p className="mt-3 max-w-xl text-[14px] font-medium leading-[1.45] text-soft">
              Jakna + hlače u klupskom dizajnu. 35 €, dostava po cijeloj Hrvatskoj, plaćanje pouzećem.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-x-2 gap-y-6 sm:gap-x-3 lg:grid-cols-4">
            {trenirke.map((product) => (
              <ProductCard key={product.slug} product={product} theme="trenirka" />
            ))}
          </div>
        </div>
      )}

      {tab === "streetwear" && (
        <div>
          <div className="mb-6">
            <h2 className="font-display text-[54px] uppercase leading-[0.92] text-fg lg:text-[80px]">Ulični kompleti</h2>
            <p className="mt-3 max-w-xl text-[14px] font-medium leading-[1.45] text-soft">
              Majica + hlačice u uličnom stilu. Veličine XS–L, plaćanje pouzećem, besplatna dostava od 60 € za registrirane.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-x-2 gap-y-6 sm:gap-x-3 lg:grid-cols-4">
            {streetwear.map((product) => (
              <ProductCard key={product.slug} product={product} theme="streetwear" />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
