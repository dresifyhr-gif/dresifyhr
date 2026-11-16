import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { ProductGallery } from "@/components/product/product-gallery";
import { ProductDetailPanel } from "@/components/product/product-detail-panel";
import { ProductFaq, displayIgrac } from "@/components/product/product-faq";
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
import { productTypeDescription, productTypeWord } from "@/lib/product-type";
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
  const what = productTypeDescription(product);
  // "Komplet (dres + hlačice …)" već je u imenu → ne ponavljaj vrstu u opisu.
  const descName = [klub, displayIgrac(klub, igrac), /komplet/i.test(igrac) ? "" : what].filter(Boolean).join(" ");

  // Naslov: <klub> <igrač> <vrsta> — <cijena> €. Ključna riječ ("dres", "trenirka",
  // "komplet") mora biti u naslovu; degenerirana imena (Japan Japan, Italija Prazan)
  // svode se na samo klub.
  const typeWord = productTypeWord(product);
  const igracPart = displayIgrac(klub, igrac);
  // Vrsta se preskače ako je već u imenu; trenirka mora reći "trenirka" (ne samo "Komplet").
  const typeContained = typeWord === "trenirka" ? /trenirka/i.test(igracPart) : /dres|komplet|trenirka/i.test(igracPart);
  const typePart = typeContained ? "" : typeWord;
  const baseTitle = isStreetwear
    ? `${klub}${igracPart ? ` ${igracPart}` : ""} — streetwear komplet`
    : [klub, igracPart, typePart].filter(Boolean).join(" ");
  const withPrice = isStreetwear ? baseTitle : `${baseTitle} — ${price} €`;
  // Template dodaje " | DRESIFY" (10 znakova); cilj je ≤ 60 ukupno.
  const fitsWithBrand = (t: string) => t.length + 10 <= 60;
  const title = fitsWithBrand(withPrice) ? withPrice : baseTitle;
  const meta = buildMetadata({
    title,
    description: `${descName} za ${price}€. Dostava po cijeloj Hrvatskoj za 2-5 dana, plaćanje pouzećem.`,
    image: productMainImage(product), // og:image = prava slika proizvoda (ne generični banner)
    path: `/dres/${product.slug}`,
    noindex: Boolean(product.hidden),
    keywords: isStreetwear
      ? [`${klub} streetwear`.toLowerCase(), `${igrac} komplet`.toLowerCase(), "streetwear hrvatska"]
      : [`${klub} dres`.toLowerCase(), `${igrac} dres`.toLowerCase(), "nogometni dres"]
  });
  // Predugo i bez cijene → bez " | DRESIFY" sufiksa (title.absolute).
  return fitsWithBrand(title) ? meta : { ...meta, title: { absolute: title } };
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
  const isTrenirka = product.category === "trenirka";
  const catLabel = isStreetwear ? "Streetwear" : isTrenirka ? "Trenirke" : t.productPage.breadcrumb.jerseys;
  const catPath = isStreetwear ? "/streetwear" : isTrenirka ? "/trenirke" : "/dresovi";
  const clubCollection = await getClubCollectionForProduct(product);
  const productName = [repairText(product.klub), displayIgrac(product.klub, product.igrac)].filter(Boolean).join(" ");
  // Početna / Dresovi / <Klub hub> / Proizvod — klupski hub je međukorak.
  const breadcrumbSchema = buildBreadcrumbSchema([
    { name: t.productPage.breadcrumb.home, path: "/" },
    { name: catLabel, path: catPath },
    ...(clubCollection ? [{ name: clubCollection.label, path: clubCollection.path }] : []),
    { name: productName, path: `/dres/${product.slug}` }
  ]);
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
            ...(clubCollection ? [{ label: clubCollection.label, href: clubCollection.path }] : []),
            { label: productName }
          ]}
        />

        <div className="grid grid-cols-[minmax(0,1fr)] gap-6 lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)]">
          <ProductGallery product={product} />
          <ProductDetailPanel product={product} />
        </div>

        <section className="mt-10 max-w-3xl">
          <h2 className="font-heading text-3xl uppercase leading-none text-white sm:text-4xl">
            {locale === "en" ? "About" : "O proizvodu"} — {productName}
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
              description="Svi dresovi ovog kluba na jednom mjestu."
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
              description="Pogledaj i retro, dječje i reprezentativne dresove."
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
          <div className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
            {relatedProducts.map((item) => (
              <ProductCard key={item.slug} product={item} />
            ))}
          </div>
        </section>
      </div>
    </section>
  );
}
