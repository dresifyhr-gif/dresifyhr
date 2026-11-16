import Link from "next/link";

import { FaqSection } from "@/components/home/faq-section";
import { FeaturedSection } from "@/components/home/featured-section";
import { GamesCta } from "@/components/home/games-cta";
import { HeroSection } from "@/components/home/hero-section";
import { GiftsByBudget } from "@/components/bozic/gifts-by-budget";
import { HomeCatalogTabs } from "@/components/home/home-catalog-tabs";
import { HomeSeoText } from "@/components/home/home-seo-text";
import { InstagramSection } from "@/components/home/instagram-section";
import { NewsletterSection } from "@/components/home/newsletter-section";
import { Ps5HomeBanner } from "@/components/home/ps5-home-banner";
import { ReviewsSection } from "@/components/home/reviews-section";
import { StreetwearBanner } from "@/components/home/streetwear-banner";
import { TrenirkaBanner } from "@/components/home/trenirka-banner";
import { TrustStrip } from "@/components/home/trust-strip";
import { jerseys } from "@/lib/data/jerseys";
import { forCards, getFeaturedProducts, getCatalogProducts, getStreetwearProducts, getTrenirkaProducts } from "@/lib/data/product-overrides";
import { getVisibleTestimonials } from "@/lib/testimonials";
import { getSettings } from "@/lib/settings";
import { getFollowerCount } from "@/lib/ig-stats";
import { TestimonialsSection } from "@/components/site/testimonials-section";
import { buildMetadata } from "@/lib/seo";
import { getServerTranslations } from "@/lib/get-server-translations";


export const metadata = buildMetadata({
  title: "Dresify — Nogometni dresovi za djecu i odrasle | Od 20€",
  description:
    "Nogometni dresovi za djecu i odrasle — Barcelona, Real Madrid, Hrvatska i retro klasici. Vrhunska izrada, dresovi od 20€, dostava pouzećem po cijeloj Hrvatskoj.",
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

// Server-renderirani interni linkovi s naslovnice prema glavnim landing stranicama
// (Google ih vidi u HTML-u bez JS-a). URL-ovi završavaju s "/" (trailingSlash).
const CATEGORY_LINKS = [
  { href: "/dresovi/kategorija/djecji-dresovi/", hr: "Dječji dresovi", en: "Kids jerseys" },
  { href: "/dresovi/klub/hrvatska/", hr: "Dres Hrvatska", en: "Croatia jersey" },
  { href: "/dresovi/kategorija/reprezentativni-dresovi/", hr: "Reprezentacije", en: "National teams" },
  { href: "/dresovi/kategorija/retro-dresovi/", hr: "Retro", en: "Retro" },
  { href: "/kompleti/", hr: "Kompleti", en: "Kits" }
];

export default async function HomePage() {
  const { t, locale } = await getServerTranslations();

  // Sekcije se pale/gase u Postavkama (Izgled). Hero i katalog su uvijek tu.
  const { hiddenSections } = await getSettings();
  const show = (key: string) => !hiddenSections.includes(key);

  const dresovi = (await getCatalogProducts(jerseys)).filter((j) => j.liga !== "Komplet");
  const streetwear = await getStreetwearProducts();
  const trenirke = await getTrenirkaProducts();
  const testimonials = await getVisibleTestimonials();
  const followers = await getFollowerCount();
  // Mystery box slika za hero rotaciju (ako je proizvod dodan i ima sliku).
  const mysteryImage = dresovi.find((p) => p.slug?.includes("mystery"))?.images?.[0]?.src;

  return (
    <>
      {/* PS5 traka: iznad heroa od tableta naviše; na mobitelu ide ispod glavnog gumba (ps5Slot). */}
      <div className="hidden sm:block">
        <Ps5HomeBanner followers={followers} />
      </div>
      <HeroSection mysteryImage={mysteryImage} ps5Slot={<Ps5HomeBanner followers={followers} variant="card" />} />
      <GiftsByBudget />
      {show("trust") && <TrustStrip />}
      {show("streetwear") && streetwear.length > 0 && (
        <StreetwearBanner
          images={streetwear.map((p) => p.images?.[0]?.src).filter((s): s is string => !!s).slice(0, 5)}
        />
      )}
      {show("trenirke") && trenirke.length > 0 && (
        <TrenirkaBanner
          images={trenirke.map((p) => p.images?.[0]?.src).filter((s): s is string => !!s).slice(0, 5)}
        />
      )}
      {show("featured") && <FeaturedSection products={forCards(await getFeaturedProducts(jerseys))} />}

      <section className="section-pad bg-[#0a0a0a]">
        <div className="page-shell">
          <nav aria-label={locale === "en" ? "Shop by category" : "Kupuj po kategoriji"} className="mb-8">
            <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.2em] text-white/45">
              {locale === "en" ? "Shop by category" : "Kupuj po kategoriji"}
            </p>
            <ul className="flex flex-wrap gap-2">
              {CATEGORY_LINKS.map((c) => (
                <li key={c.href}>
                  <Link
                    href={c.href}
                    className="inline-flex items-center rounded-full border border-white/15 bg-white/[0.04] px-4 py-2 text-sm font-semibold text-white transition-colors hover:border-accent/60 hover:text-accent"
                  >
                    {locale === "en" ? c.en : c.hr}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
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

      {show("games") && <GamesCta />}

      {show("testimonials") && <TestimonialsSection items={testimonials} />}
      {show("reviews") && <ReviewsSection />}
      {show("instagram") && <InstagramSection />}
      {show("faq") && <FaqSection />}
      {show("newsletter") && <NewsletterSection />}
      <HomeSeoText />
    </>
  );
}
