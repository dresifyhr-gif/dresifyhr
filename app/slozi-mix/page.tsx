import Image from "next/image";

import { Breadcrumbs } from "@/components/site/breadcrumbs";
import { MixJerseyChooser, type MixJersey } from "@/components/site/mix-jersey-chooser";
import { getJerseySizeOptions, jerseys } from "@/lib/data/jerseys";
import { getJerseyGallery } from "@/lib/data/jersey-media";
import { getCatalogProducts, getTrenirkaProducts } from "@/lib/data/product-overrides";
import { MIX_ADDON_PRICE_EUR, MIX_CLUBS, isMixEligible, mixImage } from "@/lib/mix";
import { buildMetadata } from "@/lib/seo";
import { repairText } from "@/lib/utils";

export const metadata = buildMetadata({
  title: "Složi svoj mix — dres + lopta + kapa po izboru",
  description:
    "Složi svoj nogometni mix: odaberi dres ili trenirku, pa dodaj loptu i/ili kapu kluba po želji. Dres + lopta ili kapa 30 €, dres + oboje 40 €. Plaćanje pouzećem, dostava po cijeloj Hrvatskoj.",
  path: "/slozi-mix",
  keywords: ["dres i lopta", "dres lopta kapa", "nogometni set", "poklon za nogometaša", "složi svoj mix"]
});

export default async function SloziMixPage({ searchParams }: { searchParams: { vrsta?: string } }) {
  // ?vrsta=dugi-rukav | trenirka — artikli "Složi svoj mix" za dugi rukav / trenirku.
  const vrsta = searchParams?.vrsta === "dugi-rukav" || searchParams?.vrsta === "trenirka" ? searchParams.vrsta : null;
  // Samo dresovi kojima je ostala barem jedna veličina (rasprodani nemaju mix izbor).
  const hasStock = (p: Parameters<typeof getJerseySizeOptions>[0]) => {
    const o = getJerseySizeOptions(p);
    const sizes = [...(o.adultsOutOfStock ? [] : o.adults), ...(o.kidsOutOfStock ? [] : o.kids)];
    return sizes.some((s) => !o.soldOutSizes.includes(s));
  };
  // Katalog namjerno izostavlja trenirke (imaju svoju stranicu) — dodajemo ih ručno.
  const [catalog, trenirke] = await Promise.all([getCatalogProducts(jerseys), getTrenirkaProducts()]);
  const products = [...catalog, ...trenirke].filter(
    (p) => isMixEligible(p) && hasStock(p) && (!vrsta || p.category === vrsta)
  );
  const list: MixJersey[] = products.map((p) => ({
    slug: p.slug,
    klub: repairText(p.klub),
    igrac: repairText(p.igrac),
    price: p.price ?? 20,
    kind: p.category === "trenirka" ? "trenirka" : "dres",
    image: (p.images ?? getJerseyGallery(p.slug))[0]?.src
  }));

  return (
    <section className="bg-[#0a0a0a] py-6 sm:py-8 lg:py-10">
      <div className="mx-auto w-full max-w-[1200px] px-3 sm:px-6 lg:px-10">
        <Breadcrumbs items={[{ label: "Početna", href: "/" }, { label: "Složi svoj mix" }]} />

        <div className="mt-4 grid items-center gap-6 lg:grid-cols-[minmax(0,1fr)_420px] lg:gap-10">
          <div>
            <h1 className="font-heading text-[clamp(2.2rem,5vw,4rem)] uppercase leading-[0.9] text-white">
              Složi svoj <span className="text-accent">mix</span>
            </h1>
            <p className="mt-4 text-base leading-7 text-white/65">
              Odaberi bilo koji dres ili trenirku, pa dodaj loptu i/ili kapu — klub biraš sam. Savršen poklon za malog ili velikog navijača.
            </p>
            <div className="mt-5 grid max-w-md grid-cols-2 gap-2 text-sm">
              {[
                ["Dres + lopta ili kapa", "30 €"],
                ["Dres + lopta + kapa", "40 €"],
                ["Dugi rukav + jedno", "40 €"],
                ["Dugi rukav + oboje", "50 €"],
                ["Trenirka + jedno", "45 €"],
                ["Trenirka + oboje", "55 €"]
              ].map(([l, p]) => (
                <div key={l} className="rounded-[10px] border border-white/10 bg-[#0d0d0d] px-3 py-2.5">
                  <p className="text-white/60">{l}</p>
                  <p className="font-heading text-xl text-accent">{p}</p>
                </div>
              ))}
            </div>
            <p className="mt-4 text-sm text-white/45">
              Lopta i kapa +{MIX_ADDON_PRICE_EUR} € svaka · plaćanje pouzećem · dostava 2–5 radnih dana
            </p>
          </div>
          <div className="relative mx-auto aspect-square w-full max-w-[420px] overflow-hidden rounded-[14px]">
            <Image src={vrsta ? `/mix/slozi-mix-${vrsta}.jpg` : "/mix/slozi-mix.jpg"} alt="Složi svoj mix — lopta i kapa kluba po izboru" fill priority sizes="420px" className="object-cover" />
          </div>
        </div>

        <h2 className="mt-10 font-heading text-2xl uppercase text-white">Lopte i kape koje možeš birati</h2>
        <div className="mt-4 grid grid-cols-4 gap-2 sm:grid-cols-8">
          {MIX_CLUBS.map((c) => (
            <div key={c.key} className="rounded-[10px] border border-white/10 bg-[#0d0d0d] p-2 text-center">
              <Image src={mixImage("lopta", c.key)} alt={`Lopta ${c.label}`} width={80} height={80} className="mx-auto h-16 w-16 object-contain" />
              <Image src={mixImage("kapa", c.key)} alt={`Kapa ${c.label}`} width={80} height={80} className="mx-auto mt-1 h-14 w-16 object-contain" />
              <p className="mt-1 text-[11px] font-semibold text-white/70">{c.label}</p>
            </div>
          ))}
        </div>

        <h2 className="mt-10 font-heading text-2xl uppercase text-white">1. Odaberi {vrsta === "trenirka" ? "trenirku" : vrsta === "dugi-rukav" ? "dres dugih rukava" : "dres ili trenirku"}</h2>
        <p className="mb-4 mt-1 text-sm text-white/55">Klikni dres → odaberi veličinu → dodaj loptu i/ili kapu.</p>
        <MixJerseyChooser jerseys={list} />
      </div>
    </section>
  );
}
