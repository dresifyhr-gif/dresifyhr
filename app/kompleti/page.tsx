import { Breadcrumbs } from "@/components/site/breadcrumbs";
import { CatalogBrowser } from "@/components/site/catalog-browser";
import { buildBreadcrumbSchema, buildItemListSchema, buildMetadata } from "@/lib/seo";
import { jerseys } from "@/lib/data/jerseys";
import { withOverrides } from "@/lib/data/product-overrides";
import { getServerTranslations } from "@/lib/get-server-translations";

export const metadata = buildMetadata({
  title: "Komplete — Dres + Hlačice + Lopta + Kapa",
  description:
    "Nogometni komplete za djecu i odrasle — dres, hlačice, lopta i kapa u jednom paketu za 40€. Barcelona, Real Madrid, Bayern, Hrvatska i više. Dostava pouzećem po cijeloj Hrvatskoj.",
  path: "/kompleti",
  keywords: [
    "komplet dres lopta kapa",
    "nogometni komplet",
    "dres komplet",
    "komplet za djecu",
    "komplet 40 eura"
  ]
});

export default async function KompletiPage() {
  const { t } = await getServerTranslations();

  const kompleti = (await withOverrides(jerseys)).filter((j) => j.liga === "Komplet");

  const breadcrumbSchema = buildBreadcrumbSchema([
    { name: t.productPage.breadcrumb.home, path: "/" },
    { name: "Komplete", path: "/kompleti" }
  ]);
  const itemListSchema = buildItemListSchema("Komplete u ponudi", "/kompleti", kompleti);

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
            { label: "Komplete" }
          ]}
        />

        <CatalogBrowser
          products={kompleti}
          headingLabel="Komplete"
          headingTitle="Komplete — Dres + Hlačice + Lopta + Kapa. 40€."
          headingDesc="Nogometni komplete za djecu i odrasle — dres, hlačice, lopta i kapa u jednom paketu. Fiksna cijena 40€, dostava pouzećem po cijeloj Hrvatskoj za 2–5 radnih dana."
        />
      </div>
    </section>
  );
}
