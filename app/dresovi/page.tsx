import { Breadcrumbs } from "@/components/site/breadcrumbs";
import { CatalogBrowser } from "@/components/site/catalog-browser";
import { SeoLinkGrid } from "@/components/site/seo-link-grid";
import {
  getFeaturedCategoryCollections,
  getFeaturedClubCollections,
  getFeaturedPlayerCollections
} from "@/lib/data/seo-collections";
import { jerseys } from "@/lib/data/jerseys";
import { buildBreadcrumbSchema, buildItemListSchema, buildMetadata } from "@/lib/seo";

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

export default function JerseysPage() {
  const breadcrumbSchema = buildBreadcrumbSchema([
    { name: "Početna", path: "/" },
    { name: "Dresovi", path: "/dresovi" }
  ]);
  const itemListSchema = buildItemListSchema("Svi dresovi u ponudi", "/dresovi", jerseys);

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
            { label: "Početna", href: "/" },
            { label: "Dresovi" }
          ]}
        />

        <CatalogBrowser products={jerseys} />

        <div className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          <SeoLinkGrid
            title="Kupuj po kategoriji"
            description="Brzi ulaz za dječje komplete, dresove za odrasle, retro favorite i reprezentativne modele."
            collections={getFeaturedCategoryCollections()}
          />
          <SeoLinkGrid
            title="Najtraženiji klubovi"
            description="Otvaraj zasebne stranice za klubove koji nose najveći interes i najbolje pokrivaju ključne Google upite."
            collections={getFeaturedClubCollections()}
          />
          <SeoLinkGrid
            title="Popularni igrači"
            description="Messi, Ronaldo, Neymar, Yamal i drugi jaki igrači sada imaju vlastite landing stranice."
            collections={getFeaturedPlayerCollections()}
          />
        </div>
      </div>
    </section>
  );
}
