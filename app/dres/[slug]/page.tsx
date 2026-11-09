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
import { withStage } from "@/lib/data/stage-images";
import { canFeature } from "@/lib/data/home-drop";
import { buildBreadcrumbSchema, buildMetadata, buildProductSchema, productMainImage } from "@/lib/seo";
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

export async function generateMetadata({ params }: ProductPageProps): Promise<Metadata> {
  // Razrješavamo i custom (streetwear) proizvode, ne samo statički katalog.
  const product = await getProductBySlug(params.slug, getJerseyBySlug(params.slug));

  if (!product) {
    return buildMetadata({
      title: "Proizvod nije pronađen",
      description: "Traženi proizvod nije dostupan.",
      path: `/dres/${params.slug}`
    });
  }

  const isStreetwear = product.category === "streetwear";
  const klub = repairText(product.klub);
  const igrac = repairText(product.igrac);

  // Opis za Google i dijeljenje linka (WhatsApp/IG/FB) — PRAVA cijena i vrsta proizvoda.
  const price = product.price ?? (isStreetwear ? 50 : 20);
  const what =
    isStreetwear ? "streetwear komplet"
    : product.liga === "Komplet" ? "komplet (dres, hlačice, lopta i kapa)"
    : product.category === "trenirka" ? "trenirka (jakna + hlače)"
    : product.category === "dugi-rukav" ? "dres dugih rukava"
    : "nogometni dres";
  return buildMetadata({
    title: isStreetwear ? `${klub} ${igrac} — Streetwear` : `${klub} ${igrac}`,
    description: `${klub} ${igrac} ${what} za ${price}€. Dostava po cijeloj Hrvatskoj za 2-5 dana, plaćanje pouzećem.`,
    image: productMainImage(product), // og:image = prava slika proizvoda (ne generični banner)
    path: `/dres/${product.slug}`,
    keywords: isStreetwear
      ? [`${klub} streetwear`.toLowerCase(), `${igrac} komplet`.toLowerCase(), "streetwear hrvatska"]
      : [`${klub} dres`.toLowerCase(), `${igrac} dres`.toLowerCase(), "nogometni dres"]
  });
}

export default async function ProductPage({ params }: ProductPageProps) {
  const { t, locale } = await getServerTranslations();
  const product = await getProductBySlug(params.slug, getJerseyBySlug(params.slug));

  if (!product) {
    notFound();
  }

  const relatedProducts = getRelatedJerseys(product).filter(canFeature).map(withStage);
  const stock = getJerseyStock(product);
  const productSchema = buildProductSchema(product, stock);
  const isStreetwear = product.category === "streetwear";
  const catLabel = isStreetwear ? "Streetwear" : t.productPage.breadcrumb.jerseys;
  const catPath = isStreetwear ? "/streetwear" : "/dresovi";
  const breadcrumbSchema = buildBreadcrumbSchema([
    { name: t.productPage.breadcrumb.home, path: "/" },
    { name: catLabel, path: catPath },
    { name: `${repairText(product.klub)} ${repairText(product.igrac)}`, path: `/dres/${product.slug}` }
  ]);
  const clubCollection = await getClubCollectionForProduct(product);
  const playerCollection = await getPlayerCollectionForProduct(product);
  const categoryCollections = (await getCategoryCollectionsForProduct(product)).slice(0, 5);

  return (
    <section className="pb-16 pt-4 sm:pt-8 lg:pb-24">
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
            { label: catLabel, href: catPath },
            { label: `${repairText(product.klub)} ${repairText(product.igrac)}` }
          ]}
        />

        <div className="grid items-start gap-6 lg:grid-cols-[1.05fr_0.95fr] lg:gap-12">
          <ProductGallery product={withStage(product)} />
          <ProductDetailPanel product={product} />
        </div>

        <section className="mt-14 max-w-3xl border-t border-white/10 pt-6">
          <h2 className="font-display text-[34px] uppercase leading-[0.95] text-fg sm:text-5xl">
            {locale === "en" ? "About" : "O proizvodu"} — {repairText(product.klub)} {repairText(product.igrac)}
          </h2>
          <div className="mt-5 space-y-4">
            {(product.descriptionOverride
              ? product.descriptionOverride.split("\n").map((s) => s.trim()).filter(Boolean)
              : getJerseyDescription(product, locale)
            ).map((paragraph, i) => (
              <p key={i} className="text-[14px] leading-[1.6] text-[#c4c4bd] sm:text-[15px]">
                {paragraph}
              </p>
            ))}
          </div>
        </section>

        <ProductFaq product={product} locale={locale} />

        <div className="mt-10 grid gap-6 xl:grid-cols-3">
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
          <div className="idx">{t.productPage.related}</div>
          <h2 className="pt-[0.08em] font-display text-[54px] uppercase leading-[0.96] text-fg lg:text-[72px]">{t.productPage.relatedTitle}</h2>
          <div className="rail -mx-4 mt-6 px-4 pb-2 sm:-mx-6 sm:px-6 lg:mx-0 lg:grid lg:grid-cols-4 lg:gap-3 lg:overflow-visible lg:px-0">
            {relatedProducts.map((item) => (
              <div key={item.slug} className="w-[158px] shrink-0 snap-start sm:w-[200px] lg:w-auto">
                <ProductCard product={item} />
              </div>
            ))}
          </div>
        </section>
      </div>
    </section>
  );
}
