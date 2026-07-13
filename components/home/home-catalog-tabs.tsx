"use client";

import { useEffect, useState } from "react";

import { CatalogBrowser } from "@/components/site/catalog-browser";
import { ProductCard } from "@/components/site/product-card";
import type { Jersey } from "@/lib/data/jerseys";

type Tab = "dresovi" | "streetwear";

// Switch na naslovnoj: prebacuje katalog dresova ⇄ streetwear u mjestu.
// Banner (i #streetwear u URL-u) mogu preselektirati streetwear tab.
export function HomeCatalogTabs({
  dresovi,
  streetwear,
  headingLabel,
  headingTitle,
  headingDesc
}: {
  dresovi: Jersey[];
  streetwear: Jersey[];
  headingLabel: string;
  headingTitle: string;
  headingDesc: string;
}) {
  const [tab, setTab] = useState<Tab>("dresovi");

  // Otvori streetwear tab kad se do sekcije dođe preko #streetwear (direktan
  // URL ili klik na banner na istoj stranici — tada hashchange, bez remounta).
  useEffect(() => {
    const sync = () => {
      if (window.location.hash === "#streetwear") setTab("streetwear");
    };
    sync();
    window.addEventListener("hashchange", sync);
    return () => window.removeEventListener("hashchange", sync);
  }, []);

  const hasStreetwear = streetwear.length > 0;

  return (
    <div id="streetwear" className="scroll-mt-24">
      {/* Switch */}
      {hasStreetwear && (
        <div className="mb-6 flex justify-center sm:mb-8">
          <div className="inline-flex rounded-full border border-white/10 bg-[#111111] p-1">
            <button
              type="button"
              onClick={() => setTab("dresovi")}
              className={`rounded-full px-5 py-2.5 text-sm font-bold uppercase tracking-wide transition sm:px-7 ${
                tab === "dresovi" ? "bg-accent text-black" : "text-white/60 hover:text-white"
              }`}
            >
              👕 Dresovi
            </button>
            <button
              type="button"
              onClick={() => setTab("streetwear")}
              className={`rounded-full px-5 py-2.5 text-sm font-bold uppercase tracking-wide transition sm:px-7 ${
                tab === "streetwear" ? "bg-orange-500 text-white" : "text-white/60 hover:text-white"
              }`}
            >
              🔥 Streetwear
            </button>
          </div>
        </div>
      )}

      {tab === "dresovi" ? (
        <CatalogBrowser products={dresovi} compactHeader headingLabel={headingLabel} headingTitle={headingTitle} headingDesc={headingDesc} />
      ) : (
        <div>
          <div className="mb-6 text-center">
            <span className="text-[11px] font-bold uppercase tracking-[0.28em] text-orange-500/80">Streetwear</span>
            <h2 className="mt-2 font-heading text-3xl uppercase leading-none text-white sm:text-4xl">Ulični kompleti</h2>
            <p className="mx-auto mt-3 max-w-xl text-sm text-white/55">
              Majica + hlačice u uličnom stilu. Veličine XS–L, besplatna dostava, plaćanje pouzećem.
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
