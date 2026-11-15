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
  const list: MixJersey[] = products.map((p) => {
    const o = getJerseySizeOptions(p);
    const avail = (arr: readonly string[], out: boolean) => (out ? [] : arr.filter((s) => !o.soldOutSizes.includes(s)));
    return {
    slug: p.slug,
    klub: repairText(p.klub),
    igrac: repairText(p.igrac),
    price: p.price ?? 20,
    kind: p.category === "trenirka" ? "trenirka" : "dres",
    image: (p.images ?? getJerseyGallery(p.slug))[0]?.src,
    category: p.category,
    liga: p.liga,
    adults: o.hasAdults ? avail(o.adults, o.adultsOutOfStock) : [],
    kids: o.hasKids ? avail(o.kids, o.kidsOutOfStock) : []
    };
  });

  return (
    <section className="bg-[#0a0a0a] py-6 sm:py-8 lg:py-10">
      <div className="mx-auto w-full max-w-[1200px] px-3 sm:px-6 lg:px-10">
        <Breadcrumbs items={[{ label: "Početna", href: "/" }, { label: "Složi svoj mix" }]} />

        {/* Kompaktno zaglavlje — dresovi odmah ispod, da se mix složi u par dodira */}
        <h1 className="mt-2 font-heading text-[clamp(2.2rem,5vw,4rem)] uppercase leading-[0.9] text-white">
          Složi svoj <span className="text-accent">mix</span>
        </h1>
        <p className="mt-2 text-sm leading-6 text-white/65">
          Odaberi {vrsta === "trenirka" ? "trenirku" : vrsta === "dugi-rukav" ? "dres dugih rukava" : "dres"} → veličinu → loptu i/ili kapu.{" "}
          <span className="text-white/45">+{MIX_ADDON_PRICE_EUR} € svaka · plaćaš pouzećem</span>
        </p>
        <div className="mb-5 mt-3 flex flex-wrap gap-2 text-xs">
          {[["Dres", "30–40 €"], ["Dugi rukav", "40–50 €"], ["Trenirka", "45–55 €"]].map(([l, p]) => (
            <span key={l} className="rounded-full border border-white/10 bg-[#0d0d0d] px-3 py-1.5 text-white/70">
              {l} <b className="text-accent">{p}</b>
            </span>
          ))}
        </div>

        <MixJerseyChooser jerseys={list} />

        <div className="mt-14 grid items-center gap-6 lg:grid-cols-[minmax(0,1fr)_420px] lg:gap-10">
          <div>
            <h2 className="font-heading text-2xl uppercase text-white">Lopte i kape koje možeš birati</h2>
            <div className="mt-4 grid grid-cols-4 gap-2">
              {MIX_CLUBS.map((c) => (
                <div key={c.key} className="rounded-[10px] border border-white/10 bg-[#0d0d0d] p-2 text-center">
                  <Image src={mixImage("lopta", c.key)} alt={`Lopta ${c.label}`} width={80} height={80} className="mx-auto h-14 w-14 object-contain" />
                  <Image src={mixImage("kapa", c.key)} alt={`Kapa ${c.label}`} width={80} height={80} className="mx-auto mt-1 h-12 w-14 object-contain" />
                  <p className="mt-1 text-[11px] font-semibold text-white/70">{c.label}</p>
                </div>
              ))}
            </div>
          </div>
          <div className="relative mx-auto aspect-square w-full max-w-[420px] overflow-hidden rounded-[14px]">
            <Image src={vrsta ? `/mix/slozi-mix-${vrsta}.jpg` : "/mix/slozi-mix.jpg"} alt="Složi svoj mix — lopta i kapa kluba po izboru" fill sizes="420px" className="object-cover" />
          </div>
        </div>
      </div>
    </section>
  );
}
