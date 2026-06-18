import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, CheckCircle2 } from "lucide-react";

import { Breadcrumbs } from "@/components/site/breadcrumbs";
import { buildBreadcrumbSchema, buildMetadata } from "@/lib/seo";
import { getServerTranslations } from "@/lib/get-server-translations";

export const metadata: Metadata = {
  ...buildMetadata({
    title: "Hvala na narudžbi",
    description:
      "Hvala na narudžbi. Zaprimili smo tvoju narudžbu i uskoro ti se javljamo na odabrani kanal kontakta.",
    path: "/zahvala"
  }),
  robots: {
    index: false,
    follow: false
  }
};

export default async function ThankYouPage() {
  const { t } = await getServerTranslations();

  const breadcrumbSchema = buildBreadcrumbSchema([
    { name: t.productPage.breadcrumb.home, path: "/" },
    { name: "Hvala", path: "/zahvala" }
  ]);

  return (
    <section className="section-pad">
      <div className="page-shell max-w-4xl">
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }}
        />

        <Breadcrumbs
          items={[
            { label: t.productPage.breadcrumb.home, href: "/" },
            { label: "Hvala" }
          ]}
        />

        <div className="panel mt-6 overflow-hidden p-8 text-center sm:p-12">
          <div className="mx-auto inline-flex h-24 w-24 items-center justify-center rounded-[8px] border border-white/10 bg-accent text-black shadow-[0_0_40px_rgba(232,255,60,0.18)]">
            <CheckCircle2 className="h-12 w-12" />
          </div>

          <h1 className="mt-8 font-heading text-[clamp(3rem,8vw,5rem)] uppercase leading-[0.9] tracking-[0.05em] text-white">
            {t.thankYouPage.title}
          </h1>

          <p className="mx-auto mt-6 max-w-2xl text-base leading-8 text-white/65 sm:text-lg">
            {t.thankYouPage.message}
          </p>

          <Link
            href="/dresovi"
            className="button-primary mt-10 inline-flex min-h-[58px] items-center justify-center gap-2 px-8"
          >
            {t.thankYouPage.cta}
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </section>
  );
}
