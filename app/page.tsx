import { CategoryBento, type BentoTile } from "@/components/home/category-bento";
import { CodSection } from "@/components/home/cod-section";
import { ClubTape, DropHero } from "@/components/home/drop-hero";
import { FaqSection } from "@/components/home/faq-section";
import { GamesCta } from "@/components/home/games-cta";
import { HomeCatalogTabs } from "@/components/home/home-catalog-tabs";
import { InstagramSection } from "@/components/home/instagram-section";
import { NewsletterSection } from "@/components/home/newsletter-section";
import { ProductRail } from "@/components/home/product-rail";
import { Ps5HomeBanner } from "@/components/home/ps5-home-banner";
import { ReviewsSection } from "@/components/home/reviews-section";
import { SizeHelp } from "@/components/home/size-help";
import { jerseys, type Jersey } from "@/lib/data/jerseys";
import { canFeature, firstImage, resolveHomeDrop } from "@/lib/data/home-drop";
import { forCards, getFeaturedProducts, getCatalogProducts, getStreetwearProducts, getTrenirkaProducts } from "@/lib/data/product-overrides";
import { getVisibleTestimonials } from "@/lib/testimonials";
import { getSettings } from "@/lib/settings";
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

const minPrice = (list: Jersey[], fallback: number) =>
  `${list.length ? Math.min(...list.map((p) => p.price ?? fallback)) : fallback} €`;

export default async function HomePage() {
  const { t } = await getServerTranslations();

  // Sekcije se pale/gase u Postavkama (Izgled). Hero, kategorije i katalog su uvijek tu.
  const { hiddenSections, heroTitle, heroSubtitle } = await getSettings();
  const show = (key: string) => !hiddenSections.includes(key);

  const catalog = await getCatalogProducts(jerseys);
  const dresovi = catalog.filter((j) => j.liga !== "Komplet");
  const kompleti = catalog.filter((j) => j.liga === "Komplet");
  const streetwear = await getStreetwearProducts();
  const trenirke = await getTrenirkaProducts();
  const testimonials = await getVisibleTestimonials();
  const featured = show("featured") ? (await getFeaturedProducts(jerseys)).filter(canFeature) : [];

  // Hero "drop" — proizvod po slugu iz HOME_DROP (pravi katalog), s mekanim padom.
  const drop = resolveHomeDrop(dresovi);

  // H1 ostaje s istim ključnim riječima; naslov/podnaslov iz Postavki ga mogu zamijeniti.
  const titleLines = heroTitle
    ? heroTitle.split("\n").map((l) => l.trim()).filter(Boolean)
    : [t.hero.line1, t.hero.line2, t.hero.line3];

  // Pločice kategorija — slike su prvi proizvodi sa slikom u toj kategoriji (nikad zabranjeni dres).
  const withImg = (list: Jersey[]) => list.filter((p) => canFeature(p) && firstImage(p));
  const dugiRukav = dresovi.filter((j) => j.category === "dugi-rukav");
  const obicni = dresovi.filter((j) => j.category !== "dugi-rukav" && !j.slug?.includes("mystery"));
  const bigImages = [
    drop?.image,
    ...withImg(featured.filter((p) => p.klub !== "Hrvatska" && p.category !== "trenirka" && p.category !== "streetwear")).map(firstImage),
    ...withImg(obicni.filter((p) => p.klub !== "Hrvatska")).map(firstImage)
  ].filter((s): s is string => Boolean(s));
  const tiles: BentoTile[] = [
    { href: "/dresovi", label: "Dresovi", note: "Djeca: dres + hlačice", price: minPrice(obicni, 20), images: [...new Set(bigImages)].slice(0, 2), variant: "big" },
    ...(dugiRukav.length
      ? [{ href: "/dresovi?dugi=1", label: "Dugi rukav", price: minPrice(dugiRukav, 30), images: withImg(dugiRukav).map(firstImage).filter((s): s is string => !!s).slice(0, 1) }]
      : []),
    ...(trenirke.length && show("trenirke")
      ? [{ href: "/trenirke", label: "Trenirke", note: "Jakna + hlače", price: minPrice(trenirke, 35), images: withImg(trenirke).map(firstImage).filter((s): s is string => !!s).slice(0, 1) }]
      : []),
    ...(kompleti.length
      ? [{ href: "/kompleti", label: "Kompleti", note: "S loptom i kapom", price: minPrice(kompleti, 40), images: withImg(kompleti).map(firstImage).filter((s): s is string => !!s).slice(0, 1) }]
      : []),
    ...(streetwear.length && show("streetwear")
      ? [{ href: "/streetwear", label: "Streetwear", note: "Komplet", price: minPrice(streetwear, 50), images: [], variant: "volt" as const }]
      : [])
  ];

  // "Za Vatrene" — hrvatski dresovi sa slikom; hero dres prvi, zabranjeni nikad.
  const vatreni = withImg(dresovi.filter((p) => p.klub === "Hrvatska" && p.category !== "dugi-rukav"))
    .sort((a, b) => (a.slug === drop?.slug ? -1 : b.slug === drop?.slug ? 1 : 0))
    .slice(0, 10);

  let n = 1;
  const idx = () => String(++n).padStart(2, "0");

  return (
    <>
      <Ps5HomeBanner />
      {drop ? <DropHero drop={drop} /> : null}
      <ClubTape />

      <CategoryBento tiles={tiles} titleLines={titleLines} subtitle={heroSubtitle || t.hero.subtitle} />

      {featured.length ? (
        <ProductRail
          index={idx()}
          kicker="Najprodavanije"
          title={
            <>
              Top
              <br />
              izbor
            </>
          }
          products={forCards(featured.slice(0, 10))}
          href="/dresovi"
          linkLabel={`Svi ${dresovi.length} →`}
        />
      ) : null}

      <section id="katalog" className="scroll-mt-20 pt-16 lg:pt-24">
        <div className="page-shell">
          <HomeCatalogTabs
            index={idx()}
            dresovi={forCards(dresovi)}
            streetwear={forCards(streetwear)}
            trenirke={forCards(trenirke)}
            headingLabel={t.home.catalogKicker}
            headingTitle={t.home.catalogTitle}
            headingDesc={t.home.catalogDesc}
          />
        </div>
      </section>

      {vatreni.length ? (
        <ProductRail
          checker
          index={idx()}
          kicker="Kolekcija"
          title={
            <>
              Za
              <br />
              <span className="text-outline">Vatrene</span>
            </>
          }
          lead="Dresovi reprezentacije za SP 2026. Dječje veličine od 104 cm — za male navijače koji rastu brže od dresa."
          products={forCards(vatreni)}
          href="/dresovi/klub/hrvatska"
          linkLabel="Sve →"
        />
      ) : null}

      {show("trust") && <CodSection index={idx()} basePrice={20} />}

      {show("reviews") && <ReviewsSection index={idx()} />}
      {show("testimonials") && <TestimonialsSection items={testimonials} />}
      {show("instagram") && <InstagramSection />}
      {show("games") && <GamesCta />}
      {show("faq") && <FaqSection />}
      <SizeHelp />

      {/* SEO tekst — ostaje na stranici za Google (long-tail), tiho stiliziran. */}
      <section className="pt-20 lg:pt-28">
        <div className="page-shell max-w-3xl">
          <h2 className="font-display text-xl uppercase leading-none text-white/80 sm:text-2xl">{t.hero.seoTitle}</h2>
          <p className="mt-3 text-sm leading-6 text-mute">{t.hero.seoText}</p>
        </div>
      </section>

      {show("newsletter") && <NewsletterSection />}
    </>
  );
}
