import { BlogPreviewSection } from "@/components/home/blog-preview-section";
import { HeroSection } from "@/components/home/hero-section";
import { InstagramSection } from "@/components/home/instagram-section";
import { NewsletterSection } from "@/components/home/newsletter-section";
import { ReviewsSection } from "@/components/home/reviews-section";
import { TrustStrip } from "@/components/home/trust-strip";
import { CatalogBrowser } from "@/components/site/catalog-browser";
import { SectionHeading } from "@/components/site/section-heading";
import { jerseys } from "@/lib/data/jerseys";
import { buildMetadata } from "@/lib/seo";

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

export default function HomePage() {
  return (
    <>
      <HeroSection />
      <div className="hidden md:block">
        <TrustStrip />
      </div>

      <section className="section-pad bg-[#111111]">
        <div className="page-shell">
          <div className="hidden md:block">
            <SectionHeading
              kicker="Drop"
              title="Odaberi svoj sljedeći dres"
              description="Jedna cijena, jasan izbor i katalog koji kombinira najtraženije aktualne modele i retro favorite."
            />
          </div>
          <CatalogBrowser products={jerseys} compactHeader />
        </div>
      </section>

      <ReviewsSection />
      <InstagramSection />
      <BlogPreviewSection />
      <NewsletterSection />
    </>
  );
}
