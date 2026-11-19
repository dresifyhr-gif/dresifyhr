import Link from "next/link";

import { Breadcrumbs } from "@/components/site/breadcrumbs";
import { CatalogBrowser } from "@/components/site/catalog-browser";
import { ProductCard } from "@/components/site/product-card";
import { forCards, getStreetwearProducts } from "@/lib/data/product-overrides";
import { NOVI_DIZAJN } from "@/lib/novi-dizajn";
import { buildBreadcrumbSchema, buildMetadata } from "@/lib/seo";

export const metadata = buildMetadata({
  title: "Streetwear kompleti — majice i hlačice",
  description:
    "Dresify Streetwear: majice, hlačice i kompleti (Cotton Wreath, graffiti). Dostava po cijeloj Hrvatskoj, plaćanje pouzećem.",
  path: "/streetwear",
  keywords: ["streetwear", "majice", "hlačice", "kompleti", "cotton wreath", "streetwear hrvatska"]
});

export default async function StreetwearPage() {
  const products = await getStreetwearProducts();

  const breadcrumbSchema = buildBreadcrumbSchema([
    { name: "Početna", path: "/" },
    { name: "Streetwear", path: "/streetwear" }
  ]);

  // NOVI DIZAJN (build sa zastavicom): isti metadata, BreadcrumbList JSON-LD, H1 "Streetwear",
  // mrvice i SEO tekst s istim linkovima — samo prikaz kao /kompleti i /dresovi (tamno, katalog
  // s filterima sa strane, kartice na vješalici), bez svijetlog heroja i pilule "Nova linija".
  if (NOVI_DIZAJN) {
    return (
      <section className="bg-[#0a0a0a] py-6 sm:py-8 lg:py-10">
        <div className="mx-auto w-full max-w-[1620px] px-3 sm:px-6 lg:px-10">
          <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }} />
          <Breadcrumbs items={[{ label: "Početna", href: "/" }, { label: "Streetwear" }]} />
          {products.length > 0 ? (
            <CatalogBrowser
              filterSet="apparel"
              clubLabel="Kolekcija"
              countKind="items"
              products={forCards(products)}
              headingLabel="Majice · hlačice · kompleti"
              headingTitle="Streetwear"
              headingDesc="Majice, hlačice i kompleti — ista brza dostava i plaćanje pouzećem kao i za dresove. Odaberi svoj stil."
            />
          ) : (
            <div className="border-b border-white/10 pb-10">
              <h1 className="font-heading text-[clamp(2.6rem,9vw,5rem)] uppercase leading-[0.9] text-white">Streetwear</h1>
              <h2 className="mt-8 font-heading text-2xl uppercase text-white">Uskoro</h2>
              <p className="mt-2 max-w-md text-sm leading-6 text-white/60">Nova streetwear kolekcija stiže — majice, hlačice i kompleti. U međuvremenu pogledaj dresove.</p>
              <Link href="/dresovi" className="mt-6 inline-flex min-h-[48px] items-center bg-[#e8ff3c] px-7 font-heading text-lg uppercase tracking-[0.1em] text-black">
                Pogledaj dresove
              </Link>
            </div>
          )}
          <StreetwearSeo tone={DARK} />
        </div>
      </section>
    );
  }

  return (
    <section className="bg-white text-slate-900">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }} />

      {/* Hero — bijelo-narančasti identitet */}
      <div className="relative overflow-hidden border-b border-orange-200">
        <div
          className="absolute inset-0"
          style={{ background: "radial-gradient(110% 130% at 12% -10%, rgba(255,106,26,0.20), transparent 55%), radial-gradient(90% 120% at 100% 0%, rgba(255,61,0,0.14), transparent 50%), #ffffff" }}
        />
        <div className="relative mx-auto w-full max-w-[1620px] px-4 py-14 sm:px-6 sm:py-20 lg:px-10">
          <span className="inline-flex items-center gap-2 rounded-full border border-orange-300 bg-orange-50 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.3em] text-orange-600">
            Nova linija
          </span>
          <h1 className="mt-4 font-heading text-[clamp(2.6rem,9vw,6rem)] uppercase leading-[0.9] tracking-[0.02em] text-slate-900">
            Street<span className="text-orange-500">wear</span>
          </h1>
          <p className="mt-4 max-w-xl text-sm leading-6 text-slate-500 sm:text-base">
            Majice, hlačice i kompleti — ista brza dostava i plaćanje pouzećem kao i za dresove. Odaberi svoj stil.
          </p>
        </div>
      </div>

      <div className="mx-auto w-full max-w-[1620px] px-3 py-8 sm:px-6 lg:px-10">
        <nav aria-label="Breadcrumb" className="mb-6 flex flex-wrap items-center gap-2 text-xs uppercase tracking-[0.22em] text-slate-400">
          <Link href="/" className="transition hover:text-orange-500">Početna</Link>
          <span className="text-slate-300">/</span>
          <span className="text-slate-700">Streetwear</span>
        </nav>

        {products.length > 0 ? (
          <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4 xl:grid-cols-5">
            {products.map((p, i) => (
              <ProductCard key={p.slug} product={p} priority={i < 5} theme="streetwear" />
            ))}
          </div>
        ) : (
          <div className="mt-10 flex flex-col items-center rounded-[14px] border border-orange-200 bg-orange-50/50 px-6 py-16 text-center">
                        <h2 className="mt-4 font-heading text-2xl uppercase tracking-[0.04em] text-slate-900">Uskoro</h2>
            <p className="mt-2 max-w-md text-sm leading-6 text-slate-500">
              Nova streetwear kolekcija stiže — majice, hlačice i kompleti. U međuvremenu pogledaj dresove.
            </p>
            <Link
              href="/dresovi"
              className="mt-6 inline-flex min-h-[48px] items-center rounded-[4px] bg-orange-500 px-7 font-heading text-lg uppercase tracking-[0.14em] text-white transition hover:bg-orange-600"
            >
              Pogledaj dresove
            </Link>
          </div>
        )}

        <StreetwearSeo tone={LIGHT} />
      </div>
    </section>
  );
}

type Tone = { wrap: string; h2: string; body: string; h3: string; link: string; strong?: string };

const LIGHT: Tone = {
  wrap: "mx-auto mt-14 max-w-3xl border-t border-orange-100 pt-10",
  h2: "font-heading text-2xl uppercase tracking-[0.04em] text-slate-900 sm:text-3xl",
  body: "mt-5 space-y-4 text-sm leading-7 text-slate-600 sm:text-[15px]",
  h3: "pt-2 font-heading text-lg uppercase tracking-[0.04em] text-slate-900",
  link: "font-semibold text-orange-600 hover:underline"
};

// NOVI DIZAJN: isti tekst i linkovi, tamna tipografija (kao SEO blok na /kompleti).
const DARK: Tone = {
  wrap: "mx-auto mt-14 max-w-3xl border-t border-white/10 pt-10",
  h2: "font-heading text-2xl uppercase leading-none text-white sm:text-3xl",
  body: "mt-5 space-y-4 text-sm leading-7 text-white/60 sm:text-[15px]",
  h3: "pt-2 font-heading text-lg uppercase tracking-[0.04em] text-white",
  link: "font-semibold text-[#e8ff3c] hover:underline",
  strong: "text-white"
};

function StreetwearSeo({ tone }: { tone: Tone }) {
  return (
    <>
      {/* SEO sadržaj — stranica je prije imala samo 332 riječi, što je pretanko
          da bi rangirala. Tekst odgovara na stvarna pitanja kupaca. */}
      <div className={tone.wrap}>
        <h2 className={tone.h2}>
          Streetwear kompleti — majice i hlačice u istom stilu
        </h2>
        <div className={tone.body}>
          <p>
            Streetwear komplet je najlakši način da izgledaš sređeno bez razmišljanja — gornji i donji dio
            su usklađeni pa ne moraš pogađati paše li boja. Kod nas su svi kompleti u uličnom kroju,
            malo opuštenijem, kakav se danas nosi. Cijena kompleta je 50 €, dostava po cijeloj
            Hrvatskoj je 7 €, a registriranim kupcima besplatna za narudžbe od 60 €.
          </p>
          <h3 className={tone.h3}>
            Kako odabrati veličinu
          </h3>
          <p>
            Kroj je opušteniji nego kod klasičnih majica, pa ako si između dvije veličine preporučujemo
            manju. Ako nisi siguran, javi nam visinu i uobičajenu veličinu na WhatsApp i reći ćemo ti
            što najčešće odgovara. Zamjena za drugu veličinu je moguća unutar 14 dana.
          </p>
          <h3 className={tone.h3}>
            Dostava i plaćanje
          </h3>
          <p>
            Šaljemo GLS kurirskom službom na svaku adresu u Hrvatskoj, rok je 2–5 radnih dana.
            Plaćaš <strong className={tone.strong}>pouzećem</strong> — dakle tek kad ti paket stigne na vrata, ne unaprijed.
            Dostava je 7 €, a registriranim kupcima besplatna za narudžbe od 60 €.
          </p>
          <h3 className={tone.h3}>
            Zašto Dresify
          </h3>
          <p>
            Radimo isključivo s komadima koje bismo i sami nosili, a svaku narudžbu pratimo do
            preuzimanja. Ako nešto ne odgovara ili ti se ne svidi uživo — javi se i riješit ćemo,
            bez kompliciranja. Osim streetweara nudimo i preko sto{" "}
            <Link href="/dresovi" className={tone.link}>nogometnih dresova po 20 €</Link>{" "}
            te <Link href="/kompleti" className={tone.link}>komplete s loptom i kapom</Link>.
          </p>
        </div>
      </div>
    </>
  );
}
