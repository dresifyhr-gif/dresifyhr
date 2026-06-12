import { ContactForm } from "@/components/contact/contact-form";
import { Breadcrumbs } from "@/components/site/breadcrumbs";
import { SectionHeading } from "@/components/site/section-heading";
import { buildBreadcrumbSchema, buildMetadata } from "@/lib/seo";
import { getServerTranslations } from "@/lib/get-server-translations";

export const metadata = buildMetadata({
  title: "Checkout i narudžba",
  description:
    "Dovrši narudžbu za dresove u nekoliko klikova. Dostava pouzećem po cijeloj Hrvatskoj za 7,50€.",
  path: "/checkout",
  keywords: ["checkout dresovi", "narudžba dresova", "plaćanje pouzećem", "dresify narudžba"]
});

export default async function CheckoutPage() {
  const { t } = await getServerTranslations();

  const breadcrumbSchema = buildBreadcrumbSchema([
    { name: t.productPage.breadcrumb.home, path: "/" },
    { name: t.checkoutPage.kicker, path: "/checkout" }
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
            { label: t.checkoutPage.kicker }
          ]}
        />

        <SectionHeading
          kicker={t.checkoutPage.kicker}
          title={t.checkoutPage.title}
          description={t.checkoutPage.desc}
        />

        <ContactForm />
      </div>
    </section>
  );
}
