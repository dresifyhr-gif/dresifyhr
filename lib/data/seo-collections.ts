import { jerseys, type Jersey } from "@/lib/data/jerseys";

type CollectionDefinition = {
  slug: string;
  label: string;
  heading: string;
  title: string;
  description: string;
  intro: string;
  filter: (product: Jersey) => boolean;
};

export type JerseyCollection = {
  slug: string;
  label: string;
  heading: string;
  title: string;
  description: string;
  intro: string;
  path: string;
  products: Jersey[];
};

function buildCollections(
  prefix: "kategorija" | "klub" | "igrac",
  definitions: CollectionDefinition[]
) {
  return definitions
    .map((definition) => ({
      ...definition,
      path: `/dresovi/${prefix}/${definition.slug}`,
      products: jerseys.filter(definition.filter)
    }))
    .filter((collection) => collection.products.length > 0);
}

const hasKids = (product: Jersey) => product.vel.includes("Djeca");
const hasAdults = (product: Jersey) => product.vel.includes("Odrasli");
const slugStartsWith =
  (...prefixes: string[]) =>
  (product: Jersey) =>
    prefixes.some((prefix) => product.slug.startsWith(prefix));
const playerNameIncludes =
  (...terms: string[]) =>
  (product: Jersey) => {
    const source = `${product.slug} ${product.igrac}`.toLowerCase();
    return terms.some((term) => source.includes(term));
  };

const categoryDefinitions: CollectionDefinition[] = [
  {
    slug: "djecji-dresovi",
    label: "Dječji dresovi",
    heading: "Dječji dresovi i kompleti",
    title: "Dječji nogometni dresovi i kompleti",
    description:
      "Pregledaj dječje nogometne dresove i komplete za najtraženije klubove i reprezentacije uz fiksnu cijenu i brzu dostavu po Hrvatskoj.",
    intro:
      "Ova kategorija okuplja modele za klince koji žele komplet spreman za igru, trening ili poklon. U ponudi su veličine od 116 do 176 i najtraženiji klubovi koje roditelji najčešće traže tijekom sezone.",
    filter: hasKids
  },
  {
    slug: "dresovi-za-odrasle",
    label: "Dresovi za odrasle",
    heading: "Nogometni dresovi za odrasle",
    title: "Nogometni dresovi za odrasle",
    description:
      "Pregledaj dresove za odrasle u veličinama S do XL, od novih modela do retro klasika koji se brzo traže u Hrvatskoj.",
    intro:
      "Ako kupuješ za sebe, ovdje su skupljeni modeli za odrasle koje je najlakše filtrirati po klubu, ligi i igraču. To je dobar ulaz za kupce koji žele brzo usporediti aktualne i retro komade bez pretraživanja cijelog kataloga.",
    filter: hasAdults
  },
  {
    slug: "retro-dresovi",
    label: "Retro dresovi",
    heading: "Retro nogometni dresovi",
    title: "Retro nogometni dresovi",
    description:
      "Izdvojeni retro nogometni dresovi za kupce koji traže klasike, ikonične utakmice i legendarne igrače u jednom katalogu.",
    intro:
      "Retro modeli imaju najjači karakter i često su prvi izbor kad netko želi dres koji izgleda dobro i na tribini i u gradu. Ovdje su okupljeni svi komadi koji nose stariju sezonu, finala Lige prvaka i kultna reprezentacijska izdanja.",
    filter: (product) => product.retro
  },
  {
    slug: "reprezentativni-dresovi",
    label: "Reprezentativni dresovi",
    heading: "Reprezentativni nogometni dresovi",
    title: "Reprezentativni nogometni dresovi",
    description:
      "Hrvatska, Argentina, Brazil, Francuska i ostale reprezentacije na jednom mjestu uz brzu dostavu i stalno rotiranje modela.",
    intro:
      "Reprezentativni dresovi drže najstabilniju potražnju tijekom cijele godine, posebno oko velikih turnira i poklona za djecu. Ova stranica skuplja sve nacionalne timove iz kataloga i olakšava brzo uspoređivanje najtraženijih boja i igrača.",
    filter: (product) => product.liga === "Reprezentacija"
  },
  {
    slug: "klupski-dresovi",
    label: "Klupski dresovi",
    heading: "Klupski nogometni dresovi",
    title: "Klupski nogometni dresovi",
    description:
      "FC Barcelona, Real Madrid, PSG, Bayern i ostali klupski dresovi na jednom mjestu za sve koji traže aktualne ili statement modele.",
    intro:
      "Ako kupac zna da želi klub, a ne reprezentaciju, ovo je najbrži pregled cijelog klupskog dijela ponude. Stranica povezuje najpopularnije europske klubove, posebna izdanja i komade koji se često rasprodaju prvi.",
    filter: (product) => product.liga !== "Reprezentacija"
  }
];

const clubDefinitions: CollectionDefinition[] = [
  {
    slug: "fc-barcelona",
    label: "FC Barcelona",
    heading: "FC Barcelona dresovi",
    title: "FC Barcelona dresovi",
    description:
      "FC Barcelona dresovi s Yamalom, Messijem, Ronaldinhom i ostalim traženim imenima u jednom DRESIFY katalogu.",
    intro:
      "Barcelona je jedan od najtraženijih klubova u cijelom shopu, pa ova landing stranica skuplja aktualne i retro modele na jednom mjestu. Kupci najčešće ovdje traže Yamal, Messi, Ronaldinho i statement boje koje odmah odskaču na slici i uživo.",
    filter: slugStartsWith("barcelona-")
  },
  {
    slug: "real-madrid",
    label: "Real Madrid",
    heading: "Real Madrid dresovi",
    title: "Real Madrid dresovi",
    description:
      "Real Madrid dresovi s Ronaldom, Mbappéom, Bellinghamom, Ramosom i Gülerom za djecu i odrasle.",
    intro:
      "Real Madrid landing stranica namijenjena je kupcima koji žele pregled svih bijelih, posebnih i finalnih modela na jednom mjestu. To uključuje aktualne zvijezde, velike europske trenutke i nekoliko retro komada koji redovito ulaze u top pretrage.",
    filter: slugStartsWith("real-")
  },
  {
    slug: "brazil",
    label: "Brazil",
    heading: "Brazil dresovi",
    title: "Brazil dresovi",
    description:
      "Brazil dresovi s Neymarom, Ronaldinhom, Peléom, Kakáom i Robertom Carlosom u posebnoj i retro ponudi.",
    intro:
      "Brazil je stalni evergreen u katalogu jer prolazi i kod klinaca i kod kupaca koji biraju poklon. Na ovoj stranici su skupljeni svi žuti, crni, plavi i retro modeli koji imaju jak identitet i visoku traženost.",
    filter: slugStartsWith("brazil-")
  },
  {
    slug: "hrvatska",
    label: "Hrvatska",
    heading: "Hrvatska dresovi",
    title: "Hrvatska dresovi",
    description:
      "Hrvatska dresovi s Modrićem i drugim traženim varijantama za kupce koji traže domaću reprezentaciju i brzu dostavu po Hrvatskoj.",
    intro:
      "Hrvatska je jedna od najvažnijih SEO i prodajnih kategorija za lokalnu publiku. Zato smo na ovu stranicu izdvojili sve dostupne domaće modele koji se najčešće traže za djecu, poklon i osobnu narudžbu.",
    filter: slugStartsWith("hrvatska-")
  },
  {
    slug: "argentina",
    label: "Argentina",
    heading: "Argentina dresovi",
    title: "Argentina dresovi",
    description:
      "Argentina dresovi s Messijem, uključujući crna posebna izdanja i Svjetsko prvenstvo 2022, za djecu i odrasle.",
    intro:
      "Argentina i Messi imaju konstantnu potražnju jer spajaju ogroman igrački status i prepoznatljiv vizual. Ova stranica okuplja sve argentinske modele i olakšava kupcu da u nekoliko klikova dođe do pravog izdanja.",
    filter: slugStartsWith("argentina-")
  },
  {
    slug: "psg",
    label: "PSG",
    heading: "PSG dresovi",
    title: "PSG dresovi",
    description:
      "PSG dresovi s Hakimijem, Ronaldinhom, Douéom i Kvaratskheliom za kupce koji traže francuske klupske modele s jačim vizualom.",
    intro:
      "PSG modeli dobro prolaze kod kupaca koji žele tamnije i modernije dresove, kao i kod onih koji traže nešto drukčije od standardnih domaćih garnitura. Na jednom mjestu skupljamo aktualna i retro izdanja s najvećim interesom.",
    filter: slugStartsWith("psg-")
  },
  {
    slug: "bayern-munchen",
    label: "Bayern München",
    heading: "Bayern München dresovi",
    title: "Bayern München dresovi",
    description:
      "Bayern München dresovi s Musialom i posebnim izdanjima za kupce koji traže Bundesliga favorite u dječjim i odraslim veličinama.",
    intro:
      "Bayern landing stranica objedinjuje crvene i posebne modele koji su čest izbor za Bundesliga publiku. Dobra je za kupce koji znaju klub, ali žele brzo vidjeti sve dostupne varijante bez dodatnog filtriranja.",
    filter: slugStartsWith("bayern-")
  },
  {
    slug: "manchester-united",
    label: "Manchester United",
    heading: "Manchester United dresovi",
    title: "Manchester United dresovi",
    description:
      "Manchester United dresovi s Ronaldom u UCL i retro izdanjima za kupce koji traže prepoznatljive crvene i crne modele.",
    intro:
      "Manchester United modeli ulaze među najjače pretrage kad netko traži Ronaldo dres s jačom nostalgijom i europskim kontekstom. Ovdje su skupljene upravo te varijante koje najbolje prolaze u shopu.",
    filter: slugStartsWith("manutd-")
  },
  {
    slug: "inter-miami",
    label: "Inter Miami",
    heading: "Inter Miami dresovi",
    title: "Inter Miami dresovi",
    description:
      "Inter Miami dresovi s Messijem za sve koji traže rozi MLS hit model u dječjim i odraslim veličinama.",
    intro:
      "Inter Miami je odličan long-tail SEO ulaz jer kupci često traže baš Messi rozi dres. Ova stranica cilja te pretrage i odmah vodi prema konkretnom modelu koji je vizualno prepoznatljiv na prvi pogled.",
    filter: slugStartsWith("intermiami-")
  }
];

const playerDefinitions: CollectionDefinition[] = [
  {
    slug: "messi",
    label: "Messi dresovi",
    heading: "Messi dresovi",
    title: "Messi dresovi",
    description:
      "Messi dresovi iz Argentine, Barcelone i Inter Miamija za kupce koji traže najprepoznatljiviji igrački katalog na jednom mjestu.",
    intro:
      "Messi je jedan od najjačih upita u cijeloj niši, zato ova stranica skuplja sve relevantne modele u jednom katalogu. Tu su reprezentativni komadi, Barcelona klasici i Inter Miami rozi dres koji se posebno često traži.",
    filter: playerNameIncludes("messi")
  },
  {
    slug: "ronaldo",
    label: "Ronaldo dresovi",
    heading: "Ronaldo dresovi",
    title: "Ronaldo dresovi",
    description:
      "Ronaldo dresovi iz Reala, Manchester Uniteda, Portugala i Al-Nassra za djecu i odrasle.",
    intro:
      "Kupci koji traže Ronaldo dres gotovo uvijek žele usporediti više klubova i reprezentaciju prije odluke. Ova landing stranica zato skuplja njegove najpoznatije varijante i skraćuje put do kupnje.",
    filter: playerNameIncludes("ronaldo")
  },
  {
    slug: "neymar",
    label: "Neymar dresovi",
    heading: "Neymar dresovi",
    title: "Neymar dresovi",
    description:
      "Neymar dresovi iz Brazila, Santosa i Barcelone na jednom mjestu za kupce koji traže posebne boje i statement modele.",
    intro:
      "Neymar modeli dobro prolaze kod kupaca koji vole posebna izdanja, jače boje i dres koji se odmah primijeti. Na ovoj stranici skupljeni su i reprezentativni i klupski komadi koji najčešće ulaze u poruke i narudžbe.",
    filter: playerNameIncludes("neymar")
  },
  {
    slug: "yamal",
    label: "Yamal dresovi",
    heading: "Yamal dresovi",
    title: "Yamal dresovi",
    description:
      "Yamal dresovi FC Barcelone u domaćim, šarenim i posebnim varijantama za kupce koji traže najaktualnije modele sezone.",
    intro:
      "Yamal je jedan od najtraženijih novih igrača u katalogu i zato ima svoju zasebnu landing stranicu. Ovdje su skupljeni svi modeli koji dobro prolaze kod djece i mladih kupaca koji žele aktualan dres s jakim vizualom.",
    filter: playerNameIncludes("yamal")
  },
  {
    slug: "modric",
    label: "Modrić dresovi",
    heading: "Modrić dresovi",
    title: "Modrić dresovi",
    description:
      "Modrić dresovi Hrvatske u bijeloj i plavoj varijanti za domaće kupce koji traže siguran i prepoznatljiv izbor.",
    intro:
      "Modrić je najjači lokalni igrački upit u katalogu jer ima prepoznatljivost, poklon vrijednost i jaku vezu s hrvatskom publikom. Ova landing stranica skuplja sve njegove dostupne modele na jednom mjestu.",
    filter: playerNameIncludes("modric")
  },
  {
    slug: "ronaldinho",
    label: "Ronaldinho dresovi",
    heading: "Ronaldinho dresovi",
    title: "Ronaldinho dresovi",
    description:
      "Ronaldinho dresovi iz Barcelone, Brazila i PSG-a za kupce koji traže retro energiju i iconic streetwear vibe.",
    intro:
      "Ronaldinho komadi spajaju retro nogometnu kulturu i jak modni karakter. Zato smo ih izdvojili na zasebnu stranicu za kupce koji točnije znaju što traže i žele više opcija na jednom mjestu.",
    filter: playerNameIncludes("ronaldinho")
  }
];

const categoryCollections = buildCollections("kategorija", categoryDefinitions);
const clubCollections = buildCollections("klub", clubDefinitions);
const playerCollections = buildCollections("igrac", playerDefinitions);

export function getJerseyCategoryCollections() {
  return categoryCollections;
}

export function getJerseyCategoryBySlug(slug: string) {
  return categoryCollections.find((collection) => collection.slug === slug);
}

export function getJerseyClubCollections() {
  return clubCollections;
}

export function getJerseyClubBySlug(slug: string) {
  return clubCollections.find((collection) => collection.slug === slug);
}

export function getJerseyPlayerCollections() {
  return playerCollections;
}

export function getJerseyPlayerBySlug(slug: string) {
  return playerCollections.find((collection) => collection.slug === slug);
}

export function getFeaturedCategoryCollections(limit = 5) {
  return [...categoryCollections]
    .sort((left, right) => right.products.length - left.products.length)
    .slice(0, limit);
}

export function getFeaturedClubCollections(limit = 8) {
  return [...clubCollections]
    .sort((left, right) => right.products.length - left.products.length)
    .slice(0, limit);
}

export function getFeaturedPlayerCollections(limit = 6) {
  return [...playerCollections]
    .sort((left, right) => right.products.length - left.products.length)
    .slice(0, limit);
}

export function getClubCollectionForProduct(product: Jersey) {
  return clubCollections.find((collection) =>
    collection.products.some((item) => item.slug === product.slug)
  );
}

export function getPlayerCollectionForProduct(product: Jersey) {
  return playerCollections.find((collection) =>
    collection.products.some((item) => item.slug === product.slug)
  );
}

export function getCategoryCollectionsForProduct(product: Jersey) {
  return categoryCollections.filter((collection) =>
    collection.products.some((item) => item.slug === product.slug)
  );
}
