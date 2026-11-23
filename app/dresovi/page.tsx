import { AllProductsIndex } from "@/components/site/all-products-index";
import { Breadcrumbs } from "@/components/site/breadcrumbs";
import { CatalogBrowser } from "@/components/site/catalog-browser";
import { CatalogFaq } from "@/components/site/catalog-faq";
import { SeoLinkGrid } from "@/components/site/seo-link-grid";
import {
  getJerseyCategoryCollections,
  getJerseyClubCollections,
  getJerseyPlayerCollections
} from "@/lib/data/seo-collections";
import { jerseys } from "@/lib/data/jerseys";
import { forCards, getCatalogProducts } from "@/lib/data/product-overrides";
import { buildBreadcrumbSchema, buildItemListSchema, buildMetadata } from "@/lib/seo";
import { getServerTranslations } from "@/lib/get-server-translations";

export const metadata = buildMetadata({
  title: "Nogometni dresovi od 20 € — 150+ modela i dječji",
  description:
    "Nogometni dres od 20 € — 150+ modela: klubovi, reprezentacije, retro i dječji dresovi. Plaćaš pouzećem kad stigne, dostava po Hrvatskoj 2–5 dana.",
  path: "/dresovi",
  keywords: [
    "dresovi",
    "nogometni dresovi",
    "kupiti dres online hrvatska",
    "dječji dresovi",
    "retro dresovi",
    "dresovi hrvatska",
    "football dresovi",
    "dresovi 20 eura"
  ]
});

export default async function JerseysPage() {
  const { t, locale } = await getServerTranslations();

  const dresovi = (await getCatalogProducts(jerseys)).filter((j) => j.liga !== "Komplet");

  const breadcrumbSchema = buildBreadcrumbSchema([
    { name: t.productPage.breadcrumb.home, path: "/" },
    { name: t.productPage.breadcrumb.jerseys, path: "/dresovi" }
  ]);
  const itemListSchema = buildItemListSchema("Svi dresovi u ponudi", "/dresovi", dresovi);
  const clubCollections = await getJerseyClubCollections();

  return (
    <section className="bg-[#0a0a0a] py-6 sm:py-8 lg:py-10">
      <div className="mx-auto w-full max-w-[1620px] px-3 sm:px-6 lg:px-10">
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(itemListSchema) }}
        />

        <Breadcrumbs
          items={[
            { label: t.productPage.breadcrumb.home, href: "/" },
            { label: t.productPage.breadcrumb.jerseys }
          ]}
        />

        <CatalogBrowser
          products={forCards(dresovi)}
          showMixPromo={["dres", "dugi-rukav"]}
          moreHref="/dresovi/#svi-dresovi"
        />

        <div className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          <SeoLinkGrid
            title={t.catalog.byCategory}
            description={t.catalog.byCategoryDesc}
            collections={await getJerseyCategoryCollections()}
          />
          <SeoLinkGrid
            title={t.catalog.topClubs}
            description={t.catalog.topClubsDesc}
            collections={clubCollections}
          />
          <SeoLinkGrid
            title={t.catalog.popularPlayers}
            description={t.catalog.popularPlayersDesc}
            collections={await getJerseyPlayerCollections()}
          />
        </div>

        <CatalogFaq locale={locale} />

        <AllProductsIndex products={dresovi} clubCollections={clubCollections} locale={locale} />
      </div>
    </section>
  );
}
