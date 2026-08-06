import { BlogPreviewSection } from "@/components/home/blog-preview-section";
import { FaqSection } from "@/components/home/faq-section";
import { FeaturedSection } from "@/components/home/featured-section";
import { GamesCta } from "@/components/home/games-cta";
import { HeroSection } from "@/components/home/hero-section";
import { HomeCatalogTabs } from "@/components/home/home-catalog-tabs";
import { InstagramSection } from "@/components/home/instagram-section";
import { NewsletterSection } from "@/components/home/newsletter-section";
import { Ps5HomeBanner } from "@/components/home/ps5-home-banner";
import { ReviewsSection } from "@/components/home/reviews-section";
import { StreetwearBanner } from "@/components/home/streetwear-banner";
import { TrustStrip } from "@/components/home/trust-strip";
import { jerseys } from "@/lib/data/jerseys";
import { getFeaturedProducts, getCatalogProducts, getStreetwearProducts } from "@/lib/data/product-overrides";
import { getVisibleTestimonials } from "@/lib/testimonials";
import { getSettings } from "@/lib/settings";
import { TestimonialsSection } from "@/components/site/testimonials-section";
import { buildMetadata } from "@/lib/seo";
import { getServerTranslations } from "@/lib/get-server-translations";


export const metadata = buildMetadata({
  title: "Dresovi — Nogometni dresovi za djecu i odrasle | 20€",
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
  const testimonials = await getVisibleTestimonials();

  return (
    <>
      <Ps5HomeBanner />
      <HeroSection />
      {show("trust") && <TrustStrip />}
      {show("streetwear") && streetwear.length > 0 && (
        <StreetwearBanner
          images={streetwear.map((p) => p.images?.[0]?.src).filter((s): s is string => !!s).slice(0, 5)}
        />
      )}
      {show("featured") && <FeaturedSection products={await getFeaturedProducts(jerseys)} />}

      <section className="section-pad bg-[#0a0a0a]">
        <div className="page-shell">
          <HomeCatalogTabs
            dresovi={dresovi}
            streetwear={streetwear}
            headingLabel={t.home.catalogKicker}
            headingTitle={t.home.catalogTitle}
            headingDesc={t.home.catalogDesc}
          />
        </div>
      </section>

      {show("games") && <GamesCta />}

      {show("testimonials") && <TestimonialsSection items={testimonials} />}
      {show("reviews") && <ReviewsSection />}
      {show("instagram") && <InstagramSection />}
      {show("faq") && <FaqSection />}
      {show("blog") && <BlogPreviewSection />}
      {show("newsletter") && <NewsletterSection />}
    </>
  );
}
