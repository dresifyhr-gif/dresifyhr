import Link from "next/link";

import { getServerTranslations } from "@/lib/get-server-translations";

export default async function NotFound() {
  const { t } = await getServerTranslations();

  return (
    <section className="section-pad">
      <div className="page-shell">
        <div className="panel max-w-2xl p-8">
          <p className="text-xs uppercase tracking-[0.32em] text-white/40">404</p>
          <h1 className="mt-4 font-heading text-5xl uppercase leading-none text-white">{t.notFound.title}</h1>
          <p className="mt-4 text-sm leading-7 text-white/65">{t.notFound.message}</p>
          <Link href="/" className="button-primary mt-6 inline-flex px-6 py-4">
            {t.notFound.cta}
          </Link>
        </div>
      </div>
    </section>
  );
}
