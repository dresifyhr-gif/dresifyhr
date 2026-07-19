import Link from "next/link";
import { Breadcrumbs } from "@/components/site/breadcrumbs";
import { CatalogBrowser } from "@/components/site/catalog-browser";
import { buildBreadcrumbSchema, buildItemListSchema, buildMetadata } from "@/lib/seo";
import { jerseys } from "@/lib/data/jerseys";
import { getCatalogProducts } from "@/lib/data/product-overrides";
import { getServerTranslations } from "@/lib/get-server-translations";

export const metadata = buildMetadata({
  title: "Komplete — Dres + Hlačice + Lopta + Kapa",
  description:
    "Nogometni komplete za djecu i odrasle — dres, hlačice, lopta i kapa u jednom paketu za 40€. Barcelona, Real Madrid, Bayern, Hrvatska i više. Dostava pouzećem po cijeloj Hrvatskoj.",
  path: "/kompleti",
  keywords: [
    "komplet dres lopta kapa",
    "nogometni komplet",
    "dres komplet",
    "komplet za djecu",
    "komplet 40 eura"
  ]
});

export default async function KompletiPage() {
  const { t } = await getServerTranslations();

  const kompleti = (await getCatalogProducts(jerseys)).filter((j) => j.liga === "Komplet");

  const breadcrumbSchema = buildBreadcrumbSchema([
    { name: t.productPage.breadcrumb.home, path: "/" },
    { name: "Komplete", path: "/kompleti" }
  ]);
  const itemListSchema = buildItemListSchema("Komplete u ponudi", "/kompleti", kompleti);

  return (
    <section className="bg-[#0a0a0a] py-6 sm:py-8 lg:py-10">
      <div className="mx-auto w-full max-w-[1620px] px-3 sm:px-6 lg:px-10">
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(itemListSchema) }}
        />

        <Breadcrumbs
          items={[
            { label: t.productPage.breadcrumb.home, href: "/" },
            { label: "Komplete" }
          ]}
        />

        <CatalogBrowser
          products={kompleti}
          headingLabel="Komplete"
          headingTitle="Komplete — Dres + Hlačice + Lopta + Kapa. 40€."
          headingDesc="Nogometni komplete za djecu i odrasle — dres, hlačice, lopta i kapa u jednom paketu. Fiksna cijena 40€, dostava pouzećem po cijeloj Hrvatskoj za 2–5 radnih dana."
        />

        {/* SEO sadržaj — stranica je imala 409 riječi, pretanko za rangiranje.
            Odgovara na stvarna pitanja: što je u kompletu, veličine, dostava. */}
        <section className="mx-auto mt-14 max-w-3xl border-t border-white/10 pt-10">
          <h2 className="font-heading text-2xl uppercase leading-none text-white sm:text-3xl">
            Što dobiješ u nogometnom kompletu
          </h2>
          <div className="mt-5 space-y-4 text-sm leading-7 text-white/60 sm:text-[15px]">
            <p>
              Komplet je cijeli paket u jednom: <strong className="text-white">dres, hlačice, lopta i kapa</strong> —
              sve za 40 €. Zbog toga je najčešći izbor za rođendanski poklon: dijete dobije opremu i loptu
              odjednom, pa ne moraš slagati dar iz više dijelova. Ime i broj igrača su ušiveni, ne otisnuti
              naljepnicom koja se guli nakon prvog pranja.
            </p>
            <h3 className="pt-2 font-heading text-lg uppercase tracking-[0.04em] text-white">
              Veličine za djecu i odrasle
            </h3>
            <p>
              Dječje veličine idu od 104 do 176 (otprilike 4 do 15 godina), a za odrasle od S do XXL.
              Ako biraš poklon i nisi siguran, najsigurnije je javiti nam visinu djeteta na WhatsApp —
              reći ćemo ti koja veličina najčešće odgovara. Zamjena veličine je moguća unutar 14 dana.
            </p>
            <h3 className="pt-2 font-heading text-lg uppercase tracking-[0.04em] text-white">
              Dostava i plaćanje pouzećem
            </h3>
            <p>
              Šaljemo GLS kurirskom službom po cijeloj Hrvatskoj, rok isporuke je 2–5 radnih dana.
              Plaćaš <strong className="text-white">pouzećem</strong> — tek kad ti paket stigne, ništa
              ne plaćaš unaprijed. Za narudžbe iznad 60 € dostava je besplatna. Ako ti komplet treba za
              točan datum (rođendan, turnir), javi nam rok pa ćemo se potruditi.
            </p>
            <h3 className="pt-2 font-heading text-lg uppercase tracking-[0.04em] text-white">
              Koje momčadi imamo
            </h3>
            <p>
              Kompleti su dostupni za najtraženije klubove i reprezentacije — Hrvatska, Barcelona,
              Real Madrid, Bayern, Inter Miami i drugi. Ako tražiš samo dres bez lopte i kape,
              pogledaj <Link href="/dresovi" className="font-semibold text-accent hover:underline">katalog dresova po 20 €</Link>.
            </p>
          </div>
        </section>
      </div>
    </section>
  );
}
