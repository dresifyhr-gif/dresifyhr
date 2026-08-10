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
import { getCatalogProducts } from "@/lib/data/product-overrides";
import { buildBreadcrumbSchema, buildItemListSchema, buildMetadata } from "@/lib/seo";
import { getServerTranslations } from "@/lib/get-server-translations";

export const metadata = buildMetadata({
  title: "Nogometni dresovi — 70+ modela od 20€",
  description:
    "Kupi nogometni dres online u Hrvatskoj — 70+ modela. Klubovi, reprezentacije, retro i dječji dresovi. Fiksno 20€, dostava pouzećem za 2–5 dana.",
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

        <CatalogBrowser products={dresovi} />

        <div className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          <SeoLinkGrid
            title={t.catalog.byCategory}
            description={t.catalog.byCategoryDesc}
            collections={await getJerseyCategoryCollections()}
          />
          <SeoLinkGrid
            title={t.catalog.topClubs}
            description={t.catalog.topClubsDesc}
            collections={await getJerseyClubCollections()}
          />
          <SeoLinkGrid
            title={t.catalog.popularPlayers}
            description={t.catalog.popularPlayersDesc}
            collections={await getJerseyPlayerCollections()}
          />
        </div>

        <CatalogFaq locale={locale} />
      </div>
    </section>
  );
}
