import { ContactForm } from "@/components/contact/contact-form";
import { Breadcrumbs } from "@/components/site/breadcrumbs";
import { SectionHeading } from "@/components/site/section-heading";
import { buildBreadcrumbSchema, buildMetadata } from "@/lib/seo";
import { getServerTranslations } from "@/lib/get-server-translations";
import { noviCheckout } from "@/components/novi/checkout";

export const metadata = buildMetadata({
  title: "Narudžba",
  description:
    "Dovrši narudžbu za dresove u nekoliko klikova. Dostava pouzećem po cijeloj Hrvatskoj za 7,00€.",
  path: "/checkout",
  keywords: ["checkout dresovi", "narudžba dresova", "plaćanje pouzećem", "dresify narudžba"],
  noindex: true
});

export default async function CheckoutPage() {
  const { t, locale } = await getServerTranslations();
  // Vidljivi naziv je "Narudžba" (ruta ostaje /checkout).
  const kicker = locale === "en" ? "Order" : "Narudžba";
  const description =
    locale === "en"
      ? "Enter your delivery details. You pay on delivery, when the parcel arrives."
      : "Upiši podatke za dostavu. Plaćaš pouzećem, tek kad ti paket stigne.";

  const breadcrumbSchema = buildBreadcrumbSchema([
    { name: t.productPage.breadcrumb.home, path: "/" },
    { name: kicker, path: "/checkout" }
  ]);

  // NOVI DIZAJN (build sa zastavicom): isti noindex metadata i BreadcrumbList JSON-LD, nov prikaz
  // (ista košarica iz cart-providera; blagajna šalje isti /api/orders payload kao ContactForm).
  if (noviCheckout) {
    return (
      <>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }}
        />
        <noviCheckout.Checkout
          emptyFallback={
            /* prazna košarica: živi obrazac s ručnim upisom narudžbe (isti payload kao živo) */
            <section className="section-pad bg-[#0a0a0a]">
              <div className="page-shell">
                <SectionHeading kicker={kicker} title={t.checkoutPage.title} description={description} />
                <ContactForm />
              </div>
            </section>
          }
        />
      </>
    );
  }

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
            { label: kicker }
          ]}
        />

        <SectionHeading
          kicker={kicker}
          title={t.checkoutPage.title}
          description={description}
        />

        <ContactForm />
      </div>
    </section>
  );
}
