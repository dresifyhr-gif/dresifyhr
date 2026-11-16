import Link from "next/link";
import { ChevronDown } from "lucide-react";

import { Breadcrumbs } from "@/components/site/breadcrumbs";
import { CatalogBrowser } from "@/components/site/catalog-browser";
import { SectionHeading } from "@/components/site/section-heading";
import { SeoLinkGrid } from "@/components/site/seo-link-grid";
import { getBlogPostBySlug } from "@/lib/data/blog-posts";
import { forCards } from "@/lib/data/product-overrides";
import type { JerseyCollection } from "@/lib/data/seo-collections";
import { JERSEY_PRICE_EUR } from "@/lib/site";
import { repairText } from "@/lib/utils";

type BreadcrumbItem = {
  label: string;
  href?: string;
};

type LinkGroup = {
  title: string;
  description: string;
  collections: JerseyCollection[];
};

type CollectionLandingPageProps = {
  collection: JerseyCollection;
  breadcrumbItems: BreadcrumbItem[];
  schemas?: unknown[];
  linkGroups?: LinkGroup[];
};

export function CollectionLandingPage({
  collection,
  breadcrumbItems,
  schemas = [],
  linkGroups = []
}: CollectionLandingPageProps) {
  // Najniža stvarna cijena u kolekciji (dugi rukav i kompleti koštaju više od 20 €).
  const minPrice = collection.products.length
    ? Math.min(...collection.products.map((p) => p.price ?? JERSEY_PRICE_EUR))
    : JERSEY_PRICE_EUR;
  const count = collection.products.length;
  // 1/21/31 model, sve ostalo "modela" (2–4 i 5+ imaju isti oblik).
  const countLabel = `${count} ${count % 10 === 1 && count % 100 !== 11 ? "model" : "modela"}`;
  const relatedPosts = (collection.relatedPosts ?? [])
    .map((slug) => getBlogPostBySlug(slug))
    .filter((post): post is NonNullable<typeof post> => Boolean(post));

  return (
    <section className="section-pad bg-[#111111]">
      <div className="page-shell">
        {schemas.map((schema, index) => (
          <script
            key={index}
            type="application/ld+json"
            dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
          />
        ))}

        <Breadcrumbs items={breadcrumbItems.map((item) => ({ ...item, label: repairText(item.label) }))} />

        <SectionHeading
          as="h1"
          kicker="Kolekcija"
          title={repairText(collection.heading)}
          description={repairText(collection.description)}
        />

        <div className="mb-8 border border-white/10 bg-[#0a0a0a] p-6 sm:p-8">
          <div className="flex flex-wrap gap-3">
            <span className="border border-accent bg-accent px-4 py-2 text-sm font-semibold text-black">
              {countLabel}
            </span>
            <span className="border border-white/10 bg-[#111111] px-4 py-2 text-sm text-white">
              Od {minPrice} €
            </span>
            <span className="border border-white/10 bg-[#111111] px-4 py-2 text-sm text-white">
              Dostava 2–5 dana po Hrvatskoj
            </span>
          </div>
          <p className="mt-5 max-w-4xl text-sm leading-8 text-white/60">{repairText(collection.intro)}</p>
          {collection.body?.length ? (
            <div className="mt-6 max-w-4xl space-y-5">
              {collection.body.map((section) => (
                <div key={section.h2}>
                  <h2 className="font-heading text-xl uppercase leading-tight text-white sm:text-2xl">
                    {repairText(section.h2)}
                  </h2>
                  <p className="mt-2 text-sm leading-7 text-white/60">{repairText(section.text)}</p>
                </div>
              ))}
            </div>
          ) : null}
        </div>

        <CatalogBrowser products={forCards(collection.products)} compactHeader soldOutLast />

        {collection.faq?.length ? (
          <section className="mt-10 max-w-3xl">
            <h2 className="font-heading text-2xl uppercase leading-none text-white sm:text-3xl">
              Česta pitanja — {repairText(collection.label)}
            </h2>
            <div className="mt-5 divide-y divide-white/10 border-y border-white/10">
              {collection.faq.map((item) => (
                <details key={item.q} className="group py-4">
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-base font-semibold text-white">
                    {repairText(item.q)}
                    <ChevronDown className="h-5 w-5 shrink-0 text-accent transition-transform duration-200 group-open:rotate-180" />
                  </summary>
                  <p className="mt-3 text-sm leading-7 text-white/60 sm:text-[15px]">{repairText(item.a)}</p>
                </details>
              ))}
            </div>
          </section>
        ) : null}

        {relatedPosts.length ? (
          <section className="mt-10">
            <h2 className="font-heading text-2xl uppercase leading-none text-white sm:text-3xl">Iz bloga</h2>
            <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {relatedPosts.map((post) => (
                <Link
                  key={post.slug}
                  href={`/blog/${post.slug}/`}
                  className="group flex flex-col border border-white/10 bg-[#0a0a0a] p-5 transition duration-200 ease-out hover:border-accent"
                >
                  <span className="text-[11px] uppercase tracking-[0.28em] text-white/45">Članak</span>
                  <span className="mt-3 text-lg font-semibold leading-snug text-white transition group-hover:text-accent">
                    {repairText(post.title)}
                  </span>
                  <span className="mt-2 line-clamp-3 text-sm leading-6 text-white/55">
                    {repairText(post.description)}
                  </span>
                  <span className="mt-4 text-xs font-semibold uppercase tracking-[0.2em] text-accent">
                    Pročitaj članak →
                  </span>
                </Link>
              ))}
            </div>
          </section>
        ) : null}

        {linkGroups.length ? (
          <div className="mt-8 grid gap-4 xl:grid-cols-3">
            {linkGroups.map((group) => (
              <SeoLinkGrid
                key={group.title}
                title={repairText(group.title)}
                description={repairText(group.description)}
                collections={group.collections}
              />
            ))}
          </div>
        ) : null}
      </div>
    </section>
  );
}
