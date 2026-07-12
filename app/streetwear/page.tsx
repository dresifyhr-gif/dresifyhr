import Link from "next/link";

import { Breadcrumbs } from "@/components/site/breadcrumbs";
import { ProductCard } from "@/components/site/product-card";
import { getStreetwearProducts } from "@/lib/data/product-overrides";
import { buildBreadcrumbSchema, buildMetadata } from "@/lib/seo";

export const metadata = buildMetadata({
  title: "Streetwear — tenisice, majice i hlačice | Dresify",
  description:
    "Dresify Streetwear: tenisice (Nike Cortez i sl.), majice i hlačice. Dostava po cijeloj Hrvatskoj, plaćanje pouzećem.",
  path: "/streetwear",
  keywords: ["streetwear", "tenisice", "nike cortez", "majice", "hlačice", "streetwear hrvatska"]
});

export default async function StreetwearPage() {
  const products = await getStreetwearProducts();

  const breadcrumbSchema = buildBreadcrumbSchema([
    { name: "Početna", path: "/" },
    { name: "Streetwear", path: "/streetwear" }
  ]);

  return (
    <section className="bg-[#0a0a0a]">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }} />

      {/* Hero — vlastiti "vatreni" identitet (narančasta) */}
      <div className="relative overflow-hidden border-b border-orange-500/20">
        <div
          className="absolute inset-0"
          style={{ background: "radial-gradient(120% 140% at 15% -10%, rgba(255,106,26,0.35), transparent 55%), radial-gradient(90% 120% at 100% 0%, rgba(255,61,0,0.28), transparent 50%), #0a0a0a" }}
        />
        <div className="relative mx-auto w-full max-w-[1620px] px-4 py-14 sm:px-6 sm:py-20 lg:px-10">
          <span className="inline-flex items-center gap-2 rounded-[4px] border border-orange-500/40 bg-orange-500/10 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.3em] text-orange-400">
            🔥 Nova linija
          </span>
          <h1 className="mt-4 font-heading text-[clamp(2.6rem,9vw,6rem)] uppercase leading-[0.9] tracking-[0.02em] text-white">
            Street<span className="text-orange-500">wear</span>
          </h1>
          <p className="mt-4 max-w-xl text-sm leading-6 text-white/60 sm:text-base">
            Tenisice, majice i hlačice — ista brza dostava i plaćanje pouzećem kao i za dresove. Odaberi svoj stil.
          </p>
        </div>
      </div>

      <div className="mx-auto w-full max-w-[1620px] px-3 py-8 sm:px-6 lg:px-10">
        <Breadcrumbs items={[{ label: "Početna", href: "/" }, { label: "Streetwear" }]} />

        {products.length > 0 ? (
          <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4 xl:grid-cols-5">
            {products.map((p, i) => (
              <ProductCard key={p.slug} product={p} priority={i < 5} />
            ))}
          </div>
        ) : (
          <div className="mt-10 flex flex-col items-center rounded-[14px] border border-orange-500/20 bg-orange-500/[0.04] px-6 py-16 text-center">
            <div className="text-4xl">🔥👟</div>
            <h2 className="mt-4 font-heading text-2xl uppercase tracking-[0.04em] text-white">Uskoro</h2>
            <p className="mt-2 max-w-md text-sm leading-6 text-white/55">
              Nova streetwear kolekcija stiže — tenisice, majice i hlačice. U međuvremenu pogledaj dresove.
            </p>
            <Link
              href="/dresovi"
              className="mt-6 inline-flex min-h-[48px] items-center rounded-[4px] bg-orange-500 px-7 font-heading text-lg uppercase tracking-[0.14em] text-black transition hover:bg-orange-400"
            >
              Pogledaj dresove
            </Link>
          </div>
        )}
      </div>
    </section>
  );
}
