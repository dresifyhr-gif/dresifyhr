import Link from "next/link";
import { ChevronDown } from "lucide-react";

import { Breadcrumbs } from "@/components/site/breadcrumbs";
import { CatalogBrowser } from "@/components/site/catalog-browser";
import { SectionHeading } from "@/components/site/section-heading";
import { SeoLinkGrid } from "@/components/site/seo-link-grid";
import { getBlogPostBySlug } from "@/lib/data/blog-posts";
import { forCards } from "@/lib/data/product-overrides";
import type { JerseyCollection } from "@/lib/data/seo-collections";
import { NOVI_DIZAJN } from "@/lib/novi-dizajn";
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

  // NOVI DIZAJN (build sa zastavicom): isti JSON-LD, mrvice, H1, tekstovi, FAQ i interni linkovi —
  // samo poredak i izgled: naslov → jedan tihi redak (broj · cijena · dostava) → katalog odmah
  // (proizvodi na prvom ekranu i na mobitelu), a uvod/H2 tekst ide ispod kataloga, bez kutija i pilula.
  if (NOVI_DIZAJN) {
    return (
      <section className="bg-[#0a0a0a] py-6 sm:py-8 lg:py-10">
        <div className="mx-auto w-full max-w-[1620px] px-3 sm:px-6 lg:px-10">
          {schemas.map((schema, index) => (
            <script
              key={index}
              type="application/ld+json"
              dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
            />
          ))}

          <Breadcrumbs items={breadcrumbItems.map((item) => ({ ...item, label: repairText(item.label) }))} />

          <header className="mb-6 max-w-3xl sm:mb-8">
            <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-white/40">Kolekcija</p>
            <h1 className="mt-2 font-heading text-[clamp(2.4rem,7vw,4.5rem)] uppercase leading-[0.92] text-white">
              {repairText(collection.heading)}
            </h1>
            <p className="mt-3 text-sm leading-7 text-white/60 sm:text-base">{repairText(collection.description)}</p>
            <p className="mt-3 text-[13px] text-white/45">
              <span className="text-white">{countLabel}</span>
              <span className="px-2 text-white/20">·</span>Od {minPrice} €
              <span className="px-2 text-white/20">·</span>Dostava 2–5 dana po Hrvatskoj
            </p>
          </header>

          <CatalogBrowser products={forCards(collection.products)} compactHeader soldOutLast />

          <div className="mx-auto mt-14 max-w-3xl border-t border-white/10 pt-10">
            <p className="text-sm leading-7 text-white/60 sm:text-[15px]">{repairText(collection.intro)}</p>
            {collection.body?.length ? (
              <div className="mt-6 space-y-6">
                {collection.body.map((section) => (
                  <div key={section.h2}>
                    <h2 className="font-heading text-2xl uppercase leading-none text-white sm:text-3xl">
                      {repairText(section.h2)}
                    </h2>
                    <p className="mt-3 text-sm leading-7 text-white/60 sm:text-[15px]">{repairText(section.text)}</p>
                  </div>
                ))}
              </div>
            ) : null}

            {collection.faq?.length ? (
              <section className="mt-12">
                <h2 className="font-heading text-2xl uppercase leading-none text-white sm:text-3xl">
                  Česta pitanja — {repairText(collection.label)}
                </h2>
                <div className="mt-5 divide-y divide-white/10 border-y border-white/10">
                  {collection.faq.map((item) => (
                    <details key={item.q} className="group py-4">
                      <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-base font-semibold text-white">
                        {repairText(item.q)}
                        <ChevronDown className="h-5 w-5 shrink-0 text-white/40 transition-transform duration-200 group-open:rotate-180" />
                      </summary>
                      <p className="mt-3 text-sm leading-7 text-white/60 sm:text-[15px]">{repairText(item.a)}</p>
                    </details>
                  ))}
                </div>
              </section>
            ) : null}

            {relatedPosts.length ? (
              <section className="mt-12">
                <h2 className="font-heading text-2xl uppercase leading-none text-white sm:text-3xl">Iz bloga</h2>
                <ul className="mt-5 divide-y divide-white/10 border-y border-white/10">
                  {relatedPosts.map((post) => (
                    <li key={post.slug}>
                      <Link href={`/blog/${post.slug}/`} className="group block py-4">
                        <span className="text-base font-semibold leading-snug text-white transition group-hover:text-[#e8ff3c]">
                          {repairText(post.title)}
                        </span>
                        <span className="mt-1 line-clamp-2 block text-sm leading-6 text-white/50">
                          {repairText(post.description)}
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </section>
            ) : null}
          </div>

          {linkGroups.length ? (
            <div className="mt-14 grid gap-10 border-t border-white/10 pt-10 xl:grid-cols-3">
              {linkGroups.map((group) => (
                <nav key={group.title} aria-label={repairText(group.title)}>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-white/40">{repairText(group.title)}</p>
                  <p className="mt-2 text-sm leading-6 text-white/50">{repairText(group.description)}</p>
                  <ul className="mt-4 flex flex-wrap gap-x-6 gap-y-1">
                    {group.collections.map((c) => (
                      <li key={c.path}>
                        <Link href={c.path} className="flex h-9 items-center text-[15px] text-white/75 transition-colors hover:text-[#e8ff3c]">
                          {c.label}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </nav>
              ))}
            </div>
          ) : null}
        </div>
      </section>
    );
  }

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
