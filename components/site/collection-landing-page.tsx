import { Breadcrumbs } from "@/components/site/breadcrumbs";
import { CatalogBrowser } from "@/components/site/catalog-browser";
import { SectionHeading } from "@/components/site/section-heading";
import { SeoLinkGrid } from "@/components/site/seo-link-grid";
import type { JerseyCollection } from "@/lib/data/seo-collections";
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
          kicker="Kolekcija"
          title={repairText(collection.heading)}
          description={repairText(collection.description)}
        />

        <div className="mb-8 border border-white/10 bg-[#0a0a0a] p-6 sm:p-8">
          <div className="flex flex-wrap gap-3">
            <span className="border border-accent bg-accent px-4 py-2 text-sm font-semibold text-black">
              {collection.products.length} modela
            </span>
            <span className="border border-white/10 bg-[#111111] px-4 py-2 text-sm text-white">
              Fiksna cijena 20€
            </span>
            <span className="border border-white/10 bg-[#111111] px-4 py-2 text-sm text-white">
              Dostava 2-5 dana po Hrvatskoj
            </span>
          </div>
          <p className="mt-5 max-w-4xl text-sm leading-8 text-white/60">{repairText(collection.intro)}</p>
        </div>

        <CatalogBrowser products={collection.products} compactHeader />

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
