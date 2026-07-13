import { CartPageContent } from "@/components/site/cart-page";
import { Breadcrumbs } from "@/components/site/breadcrumbs";
import { SectionHeading } from "@/components/site/section-heading";
import { buildBreadcrumbSchema, buildMetadata } from "@/lib/seo";
import { getServerTranslations } from "@/lib/get-server-translations";

export const metadata = buildMetadata({
  title: "Košarica",
  description: "Pregledaj odabrane dresove i nastavi na plaćanje.",
  path: "/kosarica",
  keywords: ["košarica dresovi", "narudžba dresovi", "dresify košarica"],
  noindex: true
});

export default async function CartPage() {
  const { t } = await getServerTranslations();

  const breadcrumbSchema = buildBreadcrumbSchema([
    { name: t.productPage.breadcrumb.home, path: "/" },
    { name: t.cartPage.kicker, path: "/kosarica" }
  ]);

  return (
    <section className="section-pad bg-[#0a0a0a]">
      <div className="page-shell">
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }}
        />

        <Breadcrumbs
          items={[
            { label: t.productPage.breadcrumb.home, href: "/" },
            { label: t.cartPage.kicker }
          ]}
        />

        <SectionHeading
          kicker={t.cartPage.kicker}
          title={t.cartPage.title}
          description={t.cartPage.desc}
        />

        <CartPageContent />
      </div>
    </section>
  );
}
