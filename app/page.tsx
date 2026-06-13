import { BlogPreviewSection } from "@/components/home/blog-preview-section";
import { CategoriesSection } from "@/components/home/categories-section";
import { FeaturedSection } from "@/components/home/featured-section";
import { HeroSection } from "@/components/home/hero-section";
import { InstagramSection } from "@/components/home/instagram-section";
import { NewsletterSection } from "@/components/home/newsletter-section";
import { ReviewsSection } from "@/components/home/reviews-section";
import { TrustStrip } from "@/components/home/trust-strip";
import { CatalogBrowser } from "@/components/site/catalog-browser";
import { SectionHeading } from "@/components/site/section-heading";
import { jerseys } from "@/lib/data/jerseys";
import { buildMetadata } from "@/lib/seo";
import { getServerTranslations } from "@/lib/get-server-translations";

const dresovi = jerseys.filter((j) => j.liga !== "Komplet");

export const metadata = buildMetadata({
  title: "Dresovi — Nogometni dresovi za djecu i odrasle | 20€",
  description:
    "Kupuj nogometne dresove online u Hrvatskoj. Dresovi za djecu i odrasle — Barcelona, Real Madrid, Hrvatska i retro klasici. Fiksna cijena 20€, dostava pouzećem.",
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

export default async function HomePage() {
  const { t } = await getServerTranslations();

  return (
    <>
      <HeroSection />
      <TrustStrip />
      <CategoriesSection />
      <FeaturedSection />

      <section className="section-pad bg-[#0a0a0a]">
        <div className="page-shell">
          <div className="hidden md:block">
            <SectionHeading
              kicker={t.home.catalogKicker}
              title={t.home.catalogTitle}
              description={t.home.catalogDesc}
            />
          </div>
          <CatalogBrowser products={dresovi} compactHeader />
        </div>
      </section>

      <ReviewsSection />
      <InstagramSection />
      <BlogPreviewSection />
      <NewsletterSection />
    </>
  );
}
