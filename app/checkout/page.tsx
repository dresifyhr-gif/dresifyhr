import { ContactForm } from "@/components/contact/contact-form";
import { Breadcrumbs } from "@/components/site/breadcrumbs";
import { SectionHeading } from "@/components/site/section-heading";
import { buildBreadcrumbSchema, buildMetadata } from "@/lib/seo";

export const metadata = buildMetadata({
  title: "Checkout i narudžba",
  description:
    "Dovrši narudžbu za dresove u nekoliko klikova. Dostava pouzećem po cijeloj Hrvatskoj ili osobna dostava unutar Zagreba.",
  path: "/checkout",
  keywords: ["checkout dresovi", "narudžba dresova", "plaćanje pouzećem", "dresify narudžba"]
});

export default function CheckoutPage() {
  const breadcrumbSchema = buildBreadcrumbSchema([
    { name: "Početna", path: "/" },
    { name: "Checkout", path: "/checkout" }
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
            { label: "Početna", href: "/" },
            { label: "Checkout" }
          ]}
        />

        <SectionHeading
          kicker="Checkout"
          title="Dovrši narudžbu"
          description="Unesi podatke za dostavu i potvrdi narudžbu. Ako je košarica prazna, željeni dres možeš ručno upisati ispod."
        />

        <ContactForm />
      </div>
    </section>
  );
}
