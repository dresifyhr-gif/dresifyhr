import { Breadcrumbs } from "@/components/site/breadcrumbs";
import { CatalogBrowser } from "@/components/site/catalog-browser";
import { SeoLinkGrid } from "@/components/site/seo-link-grid";
import {
  getFeaturedCategoryCollections,
  getFeaturedClubCollections,
  getFeaturedPlayerCollections
} from "@/lib/data/seo-collections";
import { jerseys } from "@/lib/data/jerseys";
import { withOverrides } from "@/lib/data/product-overrides";
import { buildBreadcrumbSchema, buildItemListSchema, buildMetadata } from "@/lib/seo";
import { getServerTranslations } from "@/lib/get-server-translations";

export const metadata = buildMetadata({
  title: "Dresovi — Nogometni dresovi za djecu i odrasle",
  description:
    "Kupuj nogometne dresove online u Hrvatskoj. 58+ modela, fiksna cijena 20€, dostava pouzećem. Barcelona, Real Madrid, Hrvatska i retro dresovi na jednom mjestu.",
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
  const { t } = await getServerTranslations();

  const dresovi = (await withOverrides(jerseys)).filter((j) => j.liga !== "Komplet");

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
            collections={getFeaturedCategoryCollections()}
          />
          <SeoLinkGrid
            title={t.catalog.topClubs}
            description={t.catalog.topClubsDesc}
            collections={getFeaturedClubCollections()}
          />
          <SeoLinkGrid
            title={t.catalog.popularPlayers}
            description={t.catalog.popularPlayersDesc}
            collections={getFeaturedPlayerCollections()}
          />
        </div>
      </div>
    </section>
  );
}
