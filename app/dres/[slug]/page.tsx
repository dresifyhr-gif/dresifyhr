import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { ProductGallery } from "@/components/product/product-gallery";
import { ProductDetailPanel } from "@/components/product/product-detail-panel";
import { ProductFaq } from "@/components/product/product-faq";
import { Breadcrumbs } from "@/components/site/breadcrumbs";
import { ProductCard } from "@/components/site/product-card";
import { SeoLinkGrid } from "@/components/site/seo-link-grid";
import {
  getCategoryCollectionsForProduct,
  getClubCollectionForProduct,
  getPlayerCollectionForProduct
} from "@/lib/data/seo-collections";
import { getJerseyBySlug, getJerseyDescription, getJerseyStock, getRelatedJerseys, jerseys } from "@/lib/data/jerseys";
import { getProductBySlug } from "@/lib/data/product-overrides";
import { buildBreadcrumbSchema, buildMetadata, buildProductSchema } from "@/lib/seo";
import { getServerTranslations } from "@/lib/get-server-translations";
import { repairText } from "@/lib/utils";

type ProductPageProps = {
  params: {
    slug: string;
  };
};

export function generateStaticParams() {
  return jerseys.map((product) => ({
    slug: product.slug
  }));
}

// ISR: proizvod se osvježi svakih 60s da admin promjene (cijena/zaliha) budu žive.
export const revalidate = 60;

export function generateMetadata({ params }: ProductPageProps): Metadata {
  const product = getJerseyBySlug(params.slug);

  if (!product) {
    return buildMetadata({
      title: "Dres nije pronađen",
      description: "Traženi dres nije dostupan.",
      path: `/dres/${params.slug}`
    });
  }

  return buildMetadata({
    title: `${repairText(product.klub)} ${repairText(product.igrac)}`,
    description: `${repairText(product.klub)} ${repairText(
      product.igrac
    )} nogometni dres za 20€. Dostava po cijeloj Hrvatskoj za 2-5 dana.`,
    path: `/dres/${product.slug}`,
    keywords: [
      `${repairText(product.klub)} dres`.toLowerCase(),
      `${repairText(product.igrac)} dres`.toLowerCase(),
      "nogometni dres"
    ]
  });
}

export default async function ProductPage({ params }: ProductPageProps) {
  const { t, locale } = await getServerTranslations();
  const product = await getProductBySlug(params.slug, getJerseyBySlug(params.slug));

  if (!product) {
    notFound();
  }

  const relatedProducts = getRelatedJerseys(product);
  const stock = getJerseyStock(product.id);
  const productSchema = buildProductSchema(product, stock);
  const breadcrumbSchema = buildBreadcrumbSchema([
    { name: t.productPage.breadcrumb.home, path: "/" },
    { name: t.productPage.breadcrumb.jerseys, path: "/dresovi" },
    { name: `${repairText(product.klub)} ${repairText(product.igrac)}`, path: `/dres/${product.slug}` }
  ]);
  const clubCollection = getClubCollectionForProduct(product);
  const playerCollection = getPlayerCollectionForProduct(product);
  const categoryCollections = getCategoryCollectionsForProduct(product).slice(0, 5);

  return (
    <section className="section-pad bg-[#0a0a0a]">
      <div className="page-shell">
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(productSchema) }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }}
        />

        <Breadcrumbs
          items={[
            { label: t.productPage.breadcrumb.home, href: "/" },
            { label: t.productPage.breadcrumb.jerseys, href: "/dresovi" },
            { label: `${repairText(product.klub)} ${repairText(product.igrac)}` }
          ]}
        />

        <div className="grid gap-6 lg:grid-cols-[0.95fr_1.05fr]">
          <ProductGallery product={product} />
          <ProductDetailPanel product={product} />
        </div>

        <section className="mt-10 max-w-3xl">
          <h2 className="font-heading text-3xl uppercase leading-none text-white sm:text-4xl">
            {locale === "en" ? "About" : "O proizvodu"} — {repairText(product.klub)} {repairText(product.igrac)}
          </h2>
          <div className="mt-5 space-y-4">
            {(product.descriptionOverride
              ? product.descriptionOverride.split("\n").map((s) => s.trim()).filter(Boolean)
              : getJerseyDescription(product, locale)
            ).map((paragraph, i) => (
              <p key={i} className="text-sm leading-7 text-white/60 sm:text-[15px]">
                {paragraph}
              </p>
            ))}
          </div>
        </section>

        <ProductFaq product={product} locale={locale} />

        <div className="mt-8 grid gap-4 xl:grid-cols-3">
          {clubCollection ? (
            <SeoLinkGrid
              title="Više iz istog kluba"
              description="Otvori klupski hub i pregledaj sve povezane modele iz iste momčadi."
              collections={[clubCollection]}
            />
          ) : null}

          {playerCollection ? (
            <SeoLinkGrid
              title="Modeli istog igrača"
              description="Usporedi varijante za istog igrača i vidi koje boje i sezone su još dostupne."
              collections={[playerCollection]}
            />
          ) : null}

          {categoryCollections.length ? (
            <SeoLinkGrid
              title="Kupuj po kategoriji"
              description="Pregledaj slične modele kroz retro, dječje ili reprezentativne landing stranice."
              collections={categoryCollections}
            />
          ) : null}
        </div>

        <section className="mt-16">
          <div className="mb-8 flex items-end justify-between">
            <div>
              <span className="section-kicker">{t.productPage.related}</span>
              <h2 className="mt-3 text-5xl uppercase leading-none text-white">{t.productPage.relatedTitle}</h2>
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {relatedProducts.map((item) => (
              <ProductCard key={item.slug} product={item} />
            ))}
          </div>
        </section>
      </div>
    </section>
  );
}
