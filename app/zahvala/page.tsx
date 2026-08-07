import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, CheckCircle2, Instagram } from "lucide-react";

import { Breadcrumbs } from "@/components/site/breadcrumbs";
import { GiveawayEntryForm } from "@/components/site/giveaway-entry-form";
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

        {/* PS5 nagradna igra — zaprati + upiši Instagram da uđeš (kupnja već donosi +5 bodova) */}
        <div className="mt-6 rounded-[16px] border border-accent/30 bg-accent/[0.05] p-6 text-center sm:p-8">
          <div className="text-sm font-bold uppercase tracking-[0.14em] text-accent">🎁 Osvoji PS5 + EA SPORTS FC 27</div>
          <p className="mx-auto mt-2 max-w-xl text-sm text-white/60">
            Tvoja narudžba ti nosi <b className="text-accent">+5 bodova</b>! Uđi u nagradnu igru u 2 koraka:
          </p>
          <div className="mx-auto mt-5 flex max-w-md flex-col gap-3">
            <a
              href="https://instagram.com/dresify.hr"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-2 rounded-[12px] bg-accent px-6 py-3 text-sm font-bold uppercase tracking-wide text-black transition hover:brightness-95"
            >
              <Instagram className="h-5 w-5" /> 1. Zaprati @dresify.hr
            </a>
            <div className="text-xs font-semibold uppercase tracking-widest text-white/40">2. Upiši svoj Instagram</div>
            <GiveawayEntryForm />
          </div>
        </div>
      </div>
    </section>
  );
}
