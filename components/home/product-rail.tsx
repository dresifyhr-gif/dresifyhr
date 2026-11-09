import Link from "next/link";
import type { ReactNode } from "react";

import { ProductCard } from "@/components/site/product-card";
import type { Jersey } from "@/lib/data/jerseys";

// Vodoravni niz kartica (koncept A). Server omotač; kartice su iste kao u katalogu.
export function ProductRail({
  index,
  kicker,
  title,
  lead,
  products,
  href,
  linkLabel,
  checker = false,
  className = ""
}: {
  index?: string;
  kicker: string;
  title: ReactNode;
  lead?: string;
  products: Jersey[];
  href?: string;
  linkLabel?: string;
  /** Hrvatska šahovnica u kutu (sekcija "Za Vatrene"). */
  checker?: boolean;
  className?: string;
}) {
  if (!products.length) return null;
  return (
    <section className={`relative overflow-hidden ${checker ? "mt-20 bg-[#0d0d0d] pb-10 pt-14 lg:mt-28 lg:pb-16 lg:pt-20" : "pt-16 lg:pt-24"} ${className}`}>
      {checker ? (
        <div
          aria-hidden
          className="chk-full pointer-events-none absolute -right-10 -top-10 h-[260px] w-[260px] rotate-12 opacity-90 lg:h-[420px] lg:w-[420px]"
          style={{
            WebkitMaskImage: "linear-gradient(225deg, #000 10%, transparent 70%)",
            maskImage: "linear-gradient(225deg, #000 10%, transparent 70%)"
          }}
        />
      ) : null}

      <div className="page-shell relative">
        <div className="idx">
          {index ? <b>{index}</b> : null}
          {kicker}
        </div>
        <div className="flex items-end justify-between gap-4">
          <h2 className={`pt-[0.08em] font-display uppercase leading-[0.96] text-fg ${checker ? "text-[84px] lg:text-[120px]" : "text-[54px] lg:text-[80px]"}`}>
            {title}
          </h2>
          {href && linkLabel ? (
            <Link
              href={href}
              className="mb-1 shrink-0 whitespace-nowrap border-b-[1.5px] border-fg pb-1 text-[11px] font-black uppercase leading-none tracking-[0.12em] text-fg transition-colors hover:border-accent hover:text-accent"
            >
              {linkLabel}
            </Link>
          ) : null}
        </div>
        {lead ? <p className="relative mt-3 max-w-[340px] text-[14px] font-medium leading-[1.45] text-[#c4c4bd] lg:max-w-[520px]">{lead}</p> : null}
      </div>

      <div className="page-shell mt-6 lg:mt-8">
        <div className="rail -mx-4 px-4 pb-2 sm:-mx-6 sm:px-6 lg:mx-0 lg:grid lg:grid-cols-4 lg:gap-3 lg:overflow-visible lg:px-0">
          {products.map((p) => (
            <div key={p.slug} className="w-[158px] shrink-0 snap-start sm:w-[200px] lg:w-auto">
              <ProductCard product={p} />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
