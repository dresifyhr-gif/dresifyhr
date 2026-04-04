import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, CheckCircle2 } from "lucide-react";

import { Breadcrumbs } from "@/components/site/breadcrumbs";
import { buildBreadcrumbSchema, buildMetadata } from "@/lib/seo";

export const metadata: Metadata = {
  ...buildMetadata({
    title: "Hvala na narudžbi",
    description:
      "Hvala na narudžbi. Potvrđujemo dostupnost u roku sat vremena i javljamo se na odabrani kanal kontakta.",
    path: "/zahvala"
  }),
  robots: {
    index: false,
    follow: false
  }
};

export default function ThankYouPage() {
  const breadcrumbSchema = buildBreadcrumbSchema([
    { name: "Početna", path: "/" },
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
            { label: "Početna", href: "/" },
            { label: "Hvala" }
          ]}
        />

        <div className="panel mt-6 overflow-hidden p-8 text-center sm:p-12">
          <div className="mx-auto inline-flex h-24 w-24 items-center justify-center rounded-[8px] border border-white/10 bg-accent text-black shadow-[0_0_40px_rgba(232,255,60,0.18)]">
            <CheckCircle2 className="h-12 w-12" />
          </div>

          <h1 className="mt-8 font-heading text-[clamp(3rem,8vw,5rem)] uppercase leading-[0.9] tracking-[0.05em] text-white">
            HVALA NA NARUDŽBI!
          </h1>

          <p className="mx-auto mt-6 max-w-2xl text-base leading-8 text-white/65 sm:text-lg">
            Potvrđujemo dostupnost u roku sat vremena i javljamo se na odabrani kanal kontakta.
          </p>

          <Link
            href="/dresovi"
            className="button-primary mt-10 inline-flex min-h-[58px] items-center justify-center gap-2 px-8"
          >
            PREGLEDAJ JOŠ DRESOVA
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </section>
  );
}
