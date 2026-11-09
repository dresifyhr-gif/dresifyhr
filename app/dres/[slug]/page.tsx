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

  const relatedProducts = getRelatedJerseys(product);
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
            { label: catLabel, href: catPath },
            { label: `${repairText(product.klub)} ${repairText(product.igrac)}` }
          ]}
        />

        <div className="grid gap-6 lg:grid-cols-[0.95fr_1.05fr]">
          <ProductGallery product={product} />
          <ProductDetailPanel product={product} />
        </div>

        {relatedProducts.length > 0 && (
          <section className="mt-8 sm:mt-12">
            <h2 className="mb-3 font-heading text-2xl uppercase leading-none text-white sm:mb-5 sm:text-3xl">{t.productPage.relatedTitle}</h2>
            {/* Mobitel: vodoravni red (kupac ne mora scrollati do dna); desktop: mreža. */}
            <div className="-mx-3 sm:mx-0">
              <div className="flex snap-x gap-3 overflow-x-auto px-3 pb-2 sm:grid sm:grid-cols-2 sm:gap-4 sm:overflow-visible sm:px-0 xl:grid-cols-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                {relatedProducts.map((item) => (
                  <div key={item.slug} className="w-[46%] shrink-0 snap-start sm:w-auto">
                    <ProductCard product={item} />
                  </div>
                ))}
              </div>
            </div>
          </section>
        )}

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

      </div>
    </section>
  );
}
