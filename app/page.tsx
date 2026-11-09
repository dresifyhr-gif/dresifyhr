import { FaqSection } from "@/components/home/faq-section";
import { FeaturedSection } from "@/components/home/featured-section";
import { GamesCta } from "@/components/home/games-cta";
import { HeroSection } from "@/components/home/hero-section";
import { HomeCatalogTabs } from "@/components/home/home-catalog-tabs";
import { InstagramSection } from "@/components/home/instagram-section";
import { NewsletterSection } from "@/components/home/newsletter-section";
import { Ps5HomeBanner } from "@/components/home/ps5-home-banner";
import { ReviewsSection } from "@/components/home/reviews-section";
import { CategoryTiles, type CategoryTile } from "@/components/home/category-tiles";
import { TrustStrip } from "@/components/home/trust-strip";
import { jerseys } from "@/lib/data/jerseys";
import { forCards, getFeaturedProducts, getCatalogProducts, getStreetwearProducts, getTrenirkaProducts } from "@/lib/data/product-overrides";
import { getVisibleTestimonials } from "@/lib/testimonials";
import { getSettings } from "@/lib/settings";
import { getDeliveredCount } from "@/lib/shop-stats";
import { TestimonialsSection } from "@/components/site/testimonials-section";
import { buildMetadata } from "@/lib/seo";
import { getServerTranslations } from "@/lib/get-server-translations";


export const metadata = buildMetadata({
  title: "Dresify — Nogometni dresovi za djecu i odrasle | Od 20€",
  description:
    "Nogometni dresovi za djecu i odrasle — Barcelona, Real Madrid, Hrvatska i retro klasici. Vrhunska izrada, fiksna cijena 20€, dostava pouzećem po cijeloj Hrvatskoj.",
  path: "/",
  keywords: [
    "dresovi",
    "nogometni dresovi",
    "dresovi hrvatska",
    "kupiti dresove online",
    "dresovi online hrvatska",
    "football dresovi",
    "dresovi za odrasle",
    "dječji dresovi",
    "dječji nogometni dresovi",
    "hrvatski dresovi",
    "gdje kupiti dresove",
    "dresovi 20 eura",
    "retro dresovi",
    "retro dresovi hrvatska",
    "messi dres",
    "ronaldo dres",
    "barcelona dres",
    "real madrid dres",
    "hrvatska reprezentacija dres"
  ]
});

export const revalidate = 120;

export default async function HomePage() {
  const { t } = await getServerTranslations();

  // Sekcije se pale/gase u Postavkama (Izgled). Hero i katalog su uvijek tu.
  const { hiddenSections } = await getSettings();
  const show = (key: string) => !hiddenSections.includes(key);

  const dresovi = (await getCatalogProducts(jerseys)).filter((j) => j.liga !== "Komplet");
  const streetwear = await getStreetwearProducts();
  const trenirke = await getTrenirkaProducts();
  const testimonials = await getVisibleTestimonials();
  // Mystery box slika za hero rotaciju (ako je proizvod dodan i ima sliku).
  const mysteryImage = dresovi.find((p) => p.slug?.includes("mystery"))?.images?.[0]?.src;

  // Pločice kategorija — slika = prvi proizvod s fotografijom u toj kategoriji.
  const firstImg = (list: typeof dresovi) => list.find((p) => p.images?.[0]?.src)?.images?.[0]?.src;
  const fromPrice = (list: typeof dresovi, fallback: number) =>
    `${list.length ? Math.min(...list.map((p) => p.price ?? fallback)) : fallback} €`;
  const kompleti = (await getCatalogProducts(jerseys)).filter((j) => j.liga === "Komplet");
  const dugiRukav = dresovi.filter((j) => j.category === "dugi-rukav");
  const obicni = dresovi.filter((j) => j.category !== "dugi-rukav" && !j.slug?.includes("mystery"));
  const tiles: CategoryTile[] = [
    { href: "/dresovi", label: "Dresovi", price: fromPrice(obicni, 20), image: firstImg(obicni.filter((j) => j.klub === "Hrvatska")) ?? firstImg(obicni) },
    { href: "/kompleti", label: "Kompleti", price: fromPrice(kompleti, 40), image: firstImg(kompleti), note: "+ lopta i kapa" },
    ...(dugiRukav.length ? [{ href: "/dresovi?dugi=1", label: "Dugi rukav", price: fromPrice(dugiRukav, 30), image: firstImg(dugiRukav), note: "Novo" }] : []),
    ...(trenirke.length && show("trenirke") ? [{ href: "/trenirke", label: "Trenirke", price: fromPrice(trenirke, 35), image: firstImg(trenirke), note: "Novo" }] : []),
    ...(streetwear.length && show("streetwear") ? [{ href: "/streetwear", label: "Streetwear", price: fromPrice(streetwear, 50), image: firstImg(streetwear) }] : [])
  ];

  return (
    <>
      <Ps5HomeBanner />
      <HeroSection mysteryImage={mysteryImage} deliveredCount={await getDeliveredCount()} />
      {show("trust") && <TrustStrip />}
      <CategoryTiles tiles={tiles} />
      {show("featured") && <FeaturedSection products={forCards(await getFeaturedProducts(jerseys))} />}

      <section id="katalog" className="section-pad scroll-mt-20 bg-[#0a0a0a]">
        <div className="page-shell">
          <HomeCatalogTabs
            dresovi={forCards(dresovi)}
            streetwear={forCards(streetwear)}
            trenirke={forCards(trenirke)}
            headingLabel={t.home.catalogKicker}
            headingTitle={t.home.catalogTitle}
            headingDesc={t.home.catalogDesc}
          />
        </div>
      </section>

      {show("testimonials") && <TestimonialsSection items={testimonials} />}
      {show("reviews") && <ReviewsSection />}
      {show("faq") && <FaqSection />}
      {show("instagram") && <InstagramSection />}
      {show("games") && <GamesCta />}
      {show("newsletter") && <NewsletterSection />}

      {/* SEO tekst (prije u heroju) — ostaje na stranici za Google, ali ne smeta kupcu. */}
      <section className="bg-[#0a0a0a] pb-10">
        <div className="page-shell max-w-3xl border-t border-white/10 pt-6">
          <h2 className="font-heading text-lg uppercase tracking-wide text-white/70 sm:text-xl">{t.hero.seoTitle}</h2>
          <p className="mt-2 text-sm leading-6 text-white/40">{t.hero.seoText}</p>
        </div>
      </section>
    </>
  );
}
