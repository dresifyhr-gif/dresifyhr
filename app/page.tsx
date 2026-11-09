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
  const { t, locale } = await getServerTranslations();

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

  // Pločice kategorija — prvi proizvodi sa slikom u toj kategoriji (nikad zabranjeni dres;
  // Modrić tek na kraju — vlasnik ga ne želi isticati). Izrez (3D dres) ima prednost.
  const d = t.drop;
  const notModric = (p: Jersey) => (p.slug.includes("modric") ? 1 : 0);
  const withImg = (list: Jersey[]) =>
    list
      .filter((p) => canFeature(p) && firstImage(p))
      .sort((a, b) => notModric(a) - notModric(b) || Number(Boolean(b.stage)) - Number(Boolean(a.stage)));
  const tileImg = (p: Jersey) =>
    p.stage ? { src: p.stage.src, cutout: true } : { src: firstImage(p) as string, cutout: false };
  const dugiRukav = dresovi.filter((j) => j.category === "dugi-rukav");
  const obicni = dresovi.filter((j) => j.category !== "dugi-rukav" && !j.slug?.includes("mystery"));
  const bigImages = [
    drop?.stage ? { src: drop.stage.src, cutout: true } : drop?.image ? { src: drop.image, cutout: false } : undefined,
    ...withImg(featured.filter((p) => p.klub !== "Hrvatska" && p.category !== "trenirka" && p.category !== "streetwear" && p.liga !== "Komplet")).map(tileImg),
    ...withImg(obicni.filter((p) => p.klub !== "Hrvatska")).map(tileImg)
  ].filter((x): x is { src: string; cutout: boolean } => Boolean(x));
  const uniqBig = bigImages.filter((x, i) => bigImages.findIndex((y) => y.src === x.src) === i).slice(0, 2);
  const tiles: BentoTile[] = [
    { href: "/dresovi", label: d.tileJerseys, note: d.tileJerseysNote, price: minPrice(obicni, 20), images: uniqBig, variant: "big" },
    ...(dugiRukav.length
      ? [{ href: "/dresovi?dugi=1", label: d.tileLong, price: minPrice(dugiRukav, 30), images: withImg(dugiRukav).slice(0, 1).map(tileImg) }]
      : []),
    ...(trenirke.length && show("trenirke")
      ? [{ href: "/trenirke", label: d.tileTracksuits, note: d.tileTracksuitsNote, price: minPrice(trenirke, 35), images: withImg(trenirke).slice(0, 1).map(tileImg) }]
      : []),
    ...(kompleti.length
      ? [{ href: "/kompleti", label: d.tileKits, note: d.tileKitsNote, price: minPrice(kompleti, 40), images: withImg(kompleti).slice(0, 1).map(tileImg) }]
      : []),
    ...(streetwear.length && show("streetwear")
      ? [{ href: "/streetwear", label: d.tileStreetwear, note: d.tileStreetwearNote, price: minPrice(streetwear, 50), images: [], variant: "volt" as const }]
      : [])
  ];

  // "Top izbor" — samo dresovi (trenirke/kompleti imaju svoje pločice i stranice).
  const topPicks = featured.filter((p) => p.category !== "trenirka" && p.category !== "streetwear" && p.liga !== "Komplet" && p.liga !== "Trenirka");

  // "Za Vatrene" — hrvatski dresovi sa slikom; hero dres prvi, zabranjeni nikad.
  const vatreni = withImg(dresovi.filter((p) => p.klub === "Hrvatska" && p.category !== "dugi-rukav"))
    .sort((a, b) => (a.slug === drop?.slug ? -1 : b.slug === drop?.slug ? 1 : 0))
    .slice(0, 8);

  let n = 1;
  const idx = () => String(++n).padStart(2, "0");

  return (
    <>
      <Ps5HomeBanner />
      {drop ? <DropHero drop={drop} t={d} /> : null}
      <ClubTape />

      <CategoryBento tiles={tiles} titleLines={titleLines} subtitle={heroSubtitle || t.hero.subtitle} label={d.categories} />

      {topPicks.length ? (
        <ProductRail
          index={idx()}
          kicker={d.bestKicker}
          title={
            <>
              {d.bestTitle[0]}
              <br className="lg:hidden" />
              <span className="hidden lg:inline"> </span>
              {d.bestTitle[1]}
            </>
          }
          products={forCards(topPicks.slice(0, 8))}
          href="/dresovi"
          linkLabel={d.all(dresovi.length)}
        />
      ) : null}

      <section id="katalog" className="scroll-mt-20 pt-16 lg:pt-24">
        <div className="page-shell">
          <HomeCatalogTabs
            index={idx()}
            dresovi={forCards(dresovi.filter(canFeature))}
            flagshipSlug={drop?.slug}
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
          kicker={d.vatreniKicker}
          title={
            <>
              {d.vatreniTitle[0]}
              <br />
              <span className="text-outline">{d.vatreniTitle[1]}</span>
            </>
          }
          lead={d.vatreniLead}
          products={forCards(vatreni)}
          href="/dresovi/klub/hrvatska"
          linkLabel={d.allShort}
        />
      ) : null}

      {show("trust") && <CodSection index={idx()} basePrice={20} t={d} />}

      {show("reviews") && <ReviewsSection index={idx()} />}
      {show("testimonials") && <TestimonialsSection items={testimonials} locale={locale} />}
      {show("instagram") && <InstagramSection />}
      {show("games") && <GamesCta />}
      {show("faq") && <FaqSection />}
      <SizeHelp t={{ title: d.sizeHelpTitle, text: d.sizeHelpText, msg: d.sizeHelpMsg }} />

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
