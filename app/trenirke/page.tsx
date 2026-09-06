import Link from "next/link";

import { ProductCard } from "@/components/site/product-card";
import { getTrenirkaProducts } from "@/lib/data/product-overrides";
import { buildBreadcrumbSchema, buildMetadata } from "@/lib/seo";

export const metadata = buildMetadata({
  title: "Trenirke — dječje i klupske komplet trenirke | Dresify",
  description:
    "Dresify trenirke: kompletni set jakna + hlače u klupskim i reprezentativnim dizajnima (Brazil, Argentina, Barcelona, Portugal…). 35 €, dostava po cijeloj Hrvatskoj, plaćanje pouzećem.",
  path: "/trenirke",
  keywords: ["trenirke", "komplet trenirka", "dječja trenirka", "nogometna trenirka", "trenirka brazil", "trenirka messi", "trenirke hrvatska"]
});

export default async function TrenirkePage() {
  const products = await getTrenirkaProducts();

  const breadcrumbSchema = buildBreadcrumbSchema([
    { name: "Početna", path: "/" },
    { name: "Trenirke", path: "/trenirke" }
  ]);

  return (
    <section className="bg-white text-slate-900">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }} />

      {/* Hero — tirkizno-tamni identitet */}
      <div className="relative overflow-hidden border-b border-teal-200">
        <div
          className="absolute inset-0"
          style={{ background: "radial-gradient(110% 130% at 12% -10%, rgba(13,148,136,0.20), transparent 55%), radial-gradient(90% 120% at 100% 0%, rgba(15,118,110,0.14), transparent 50%), #ffffff" }}
        />
        <div className="relative mx-auto w-full max-w-[1620px] px-4 py-14 sm:px-6 sm:py-20 lg:px-10">
          <span className="inline-flex items-center gap-2 rounded-full border border-teal-300 bg-teal-50 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.3em] text-teal-600">
            🏃 Nova linija
          </span>
          <h1 className="mt-4 font-heading text-[clamp(2.6rem,9vw,6rem)] uppercase leading-[0.9] tracking-[0.02em] text-slate-900">
            Tre<span className="text-teal-500">nirke</span>
          </h1>
          <p className="mt-4 max-w-xl text-sm leading-6 text-slate-500 sm:text-base">
            Kompletna trenirka — jakna + hlače u klupskom dizajnu. 35 €, ista brza dostava i plaćanje pouzećem kao i za dresove.
          </p>
        </div>
      </div>

      <div className="mx-auto w-full max-w-[1620px] px-3 py-8 sm:px-6 lg:px-10">
        <nav aria-label="Breadcrumb" className="mb-6 flex flex-wrap items-center gap-2 text-xs uppercase tracking-[0.22em] text-slate-400">
          <Link href="/" className="transition hover:text-teal-500">Početna</Link>
          <span className="text-slate-300">/</span>
          <span className="text-slate-700">Trenirke</span>
        </nav>

        {products.length > 0 ? (
          <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4 xl:grid-cols-5">
            {products.map((p, i) => (
              <ProductCard key={p.slug} product={p} priority={i < 5} />
            ))}
          </div>
        ) : (
          <div className="mt-10 flex flex-col items-center rounded-[14px] border border-teal-200 bg-teal-50/50 px-6 py-16 text-center">
            <div className="text-4xl">🏃👕</div>
            <h2 className="mt-4 font-heading text-2xl uppercase tracking-[0.04em] text-slate-900">Uskoro</h2>
            <p className="mt-2 max-w-md text-sm leading-6 text-slate-500">
              Nova kolekcija trenirki stiže — kompleti jakna + hlače. U međuvremenu pogledaj dresove.
            </p>
            <Link
              href="/dresovi"
              className="mt-6 inline-flex min-h-[48px] items-center rounded-[4px] bg-teal-600 px-7 font-heading text-lg uppercase tracking-[0.14em] text-white transition hover:bg-teal-700"
            >
              Pogledaj dresove
            </Link>
          </div>
        )}

        {/* SEO sadržaj — odgovara na stvarna pitanja kupaca o trenirkama. */}
        <div className="mx-auto mt-14 max-w-3xl border-t border-teal-100 pt-10">
          <h2 className="font-heading text-2xl uppercase tracking-[0.04em] text-slate-900 sm:text-3xl">
            Komplet trenirke — jakna i hlače u klupskom stilu
          </h2>
          <div className="mt-5 space-y-4 text-sm leading-7 text-slate-600 sm:text-[15px]">
            <p>
              Trenirka kod nas dolazi kao <strong>kompletni set — jakna (gornji dio) i hlače (donji dio)</strong> u
              istom dizajnu tvog kluba ili reprezentacije. Idealna je za trening, školu i svaki dan, a topao materijal
              dobro dođe kad zahladi. Cijena kompleta je <strong>35 €</strong>, s dostavom po cijeloj Hrvatskoj uz
              plaćanje pouzećem.
            </p>
            <h3 className="pt-2 font-heading text-lg uppercase tracking-[0.04em] text-slate-900">
              Kako odabrati veličinu
            </h3>
            <p>
              Trenirke dolaze u spojenim veličinama (npr. 128/134, 158/164, 170/176) te XS. Svaka trenirka na svojoj
              stranici pokazuje točno one veličine koje su na zalihi. Ako si između dvije veličine ili nisi siguran,
              javi nam visinu i uobičajenu veličinu na WhatsApp i reći ćemo ti što najčešće odgovara. Zamjena za drugu
              veličinu je moguća unutar 14 dana.
            </p>
            <h3 className="pt-2 font-heading text-lg uppercase tracking-[0.04em] text-slate-900">
              Dostava i plaćanje
            </h3>
            <p>
              Šaljemo GLS kurirskom službom na svaku adresu u Hrvatskoj, rok je 2–5 radnih dana. Plaćaš{" "}
              <strong>pouzećem</strong> — tek kad ti paket stigne na vrata, ne unaprijed.
            </p>
            <h3 className="pt-2 font-heading text-lg uppercase tracking-[0.04em] text-slate-900">
              Zašto Dresify
            </h3>
            <p>
              Radimo isključivo s komadima koje bismo i sami nosili, a svaku narudžbu pratimo do preuzimanja. Ako nešto
              ne odgovara ili ti se ne svidi uživo — javi se i riješit ćemo, bez kompliciranja. Osim trenirki nudimo i
              preko sto{" "}
              <Link href="/dresovi" className="font-semibold text-teal-600 hover:underline">nogometnih dresova po 20 €</Link>{" "}
              te <Link href="/kompleti" className="font-semibold text-teal-600 hover:underline">komplete s loptom i kapom</Link>.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
