import { CartPageContent } from "@/components/site/cart-page";
import { Breadcrumbs } from "@/components/site/breadcrumbs";
import { SectionHeading } from "@/components/site/section-heading";
import { buildBreadcrumbSchema, buildMetadata } from "@/lib/seo";

export const metadata = buildMetadata({
  title: "Košarica",
  description: "Pregledaj odabrane dresove i nastavi na plaćanje.",
  path: "/kosarica",
  keywords: ["košarica dresovi", "narudžba dresovi", "dresify košarica"]
});

export default function CartPage() {
  const breadcrumbSchema = buildBreadcrumbSchema([
    { name: "Početna", path: "/" },
    { name: "Košarica", path: "/kosarica" }
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
            { label: "Košarica" }
          ]}
        />

        <SectionHeading
          kicker="Košarica"
          title="Pregledaj odabrane dresove"
          description="Provjeri artikle, ukloni što ne treba i nastavi na plaćanje."
        />

        <CartPageContent />
      </div>
    </section>
  );
}
