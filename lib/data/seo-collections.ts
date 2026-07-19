import { jerseys, type Jersey } from "@/lib/data/jerseys";
import { getCatalogProducts } from "@/lib/data/product-overrides";

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
  definitions: CollectionDefinition[],
  products: Jersey[]
) {
  return definitions
    .map((definition) => ({
      ...definition,
      path: `/dresovi/${prefix}/${definition.slug}`,
      products: products.filter(definition.filter)
    }))
    .filter((collection) => collection.products.length > 0);
}

const hasKids = (product: Jersey) => product.vel.includes("Djeca");
const hasAdults = (product: Jersey) => product.vel.includes("Odrasli");
const slugStartsWith =
  (...prefixes: string[]) =>
  (product: Jersey) =>
    prefixes.some((prefix) => product.slug.startsWith(prefix));
// Klupski hubovi gađaju NAZIV kluba, ne slug prefiks — tako u hub sjednu i
// dresovi dodani iz admina (njihov slug je drukčiji, npr. "manchester-united-sesko").
const norm = (v: string) =>
  String(v || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/đ/g, "d").trim();
const klubIs =
  (...names: string[]) =>
  (product: Jersey) =>
    names.some((n) => norm(product.klub) === norm(n));
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
    title: "Dječji nogometni dresovi i kompleti — 20€",
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
    title: "Nogometni dresovi za odrasle — 20€",
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
    title: "Retro nogometni dresovi — 20€",
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
    title: "Reprezentativni nogometni dresovi — 20€",
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
    title: "Klupski nogometni dresovi — 20€",
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
    title: "FC Barcelona dresovi — 20€",
    description:
      "FC Barcelona dresovi s Yamalom, Messijem, Ronaldinhom i ostalim traženim imenima u jednom DRESIFY katalogu.",
    intro:
      "Barcelona je jedan od najtraženijih klubova u cijelom shopu, pa ova landing stranica skuplja aktualne i retro modele na jednom mjestu. Kupci najčešće ovdje traže Yamal, Messi, Ronaldinho i statement boje koje odmah odskaču na slici i uživo.",
    filter: klubIs("FC Barcelona")
  },
  {
    slug: "real-madrid",
    label: "Real Madrid",
    heading: "Real Madrid dresovi",
    title: "Real Madrid dresovi — 20€",
    description:
      "Real Madrid dresovi s Ronaldom, Mbappéom, Bellinghamom, Ramosom i Gülerom za djecu i odrasle.",
    intro:
      "Real Madrid landing stranica namijenjena je kupcima koji žele pregled svih bijelih, posebnih i finalnih modela na jednom mjestu. To uključuje aktualne zvijezde, velike europske trenutke i nekoliko retro komada koji redovito ulaze u top pretrage.",
    filter: klubIs("Real Madrid")
  },
  {
    slug: "brazil",
    label: "Brazil",
    heading: "Brazil dresovi",
    title: "Brazil dresovi — 20€",
    description:
      "Brazil dresovi s Neymarom, Ronaldinhom, Peléom, Kakáom i Robertom Carlosom u posebnoj i retro ponudi.",
    intro:
      "Brazil je stalni evergreen u katalogu jer prolazi i kod klinaca i kod kupaca koji biraju poklon. Na ovoj stranici su skupljeni svi žuti, crni, plavi i retro modeli koji imaju jak identitet i visoku traženost.",
    filter: klubIs("Brazil")
  },
  {
    slug: "hrvatska",
    label: "Hrvatska",
    heading: "Hrvatska dresovi",
    title: "Hrvatska dresovi — 20€",
    description:
      "Hrvatska dresovi s Modrićem i drugim traženim varijantama za kupce koji traže domaću reprezentaciju i brzu dostavu po Hrvatskoj.",
    intro:
      "Hrvatska je jedna od najvažnijih SEO i prodajnih kategorija za lokalnu publiku. Zato smo na ovu stranicu izdvojili sve dostupne domaće modele koji se najčešće traže za djecu, poklon i osobnu narudžbu.",
    filter: klubIs("Hrvatska")
  },
  {
    slug: "argentina",
    label: "Argentina",
    heading: "Argentina dresovi",
    title: "Argentina dresovi — 20€",
    description:
      "Argentina dresovi s Messijem, uključujući crna posebna izdanja i Svjetsko prvenstvo 2022, za djecu i odrasle.",
    intro:
      "Argentina i Messi imaju konstantnu potražnju jer spajaju ogroman igrački status i prepoznatljiv vizual. Ova stranica okuplja sve argentinske modele i olakšava kupcu da u nekoliko klikova dođe do pravog izdanja.",
    filter: klubIs("Argentina")
  },
  {
    slug: "psg",
    label: "PSG",
    heading: "PSG dresovi",
    title: "PSG dresovi — 20€",
    description:
      "PSG dresovi s Hakimijem, Ronaldinhom, Douéom i Kvaratskheliom za kupce koji traže francuske klupske modele s jačim vizualom.",
    intro:
      "PSG modeli dobro prolaze kod kupaca koji žele tamnije i modernije dresove, kao i kod onih koji traže nešto drukčije od standardnih domaćih garnitura. Na jednom mjestu skupljamo aktualna i retro izdanja s najvećim interesom.",
    filter: klubIs("PSG")
  },
  {
    slug: "bayern-munchen",
    label: "Bayern München",
    heading: "Bayern München dresovi",
    title: "Bayern München dresovi — 20€",
    description:
      "Bayern München dresovi s Musialom i posebnim izdanjima za kupce koji traže Bundesliga favorite u dječjim i odraslim veličinama.",
    intro:
      "Bayern landing stranica objedinjuje crvene i posebne modele koji su čest izbor za Bundesliga publiku. Dobra je za kupce koji znaju klub, ali žele brzo vidjeti sve dostupne varijante bez dodatnog filtriranja.",
    filter: klubIs("Bayern München", "Bayern Munich")
  },
  {
    slug: "manchester-united",
    label: "Manchester United",
    heading: "Manchester United dresovi",
    title: "Manchester United dresovi — 20€",
    description:
      "Manchester United dresovi s Ronaldom u UCL i retro izdanjima za kupce koji traže prepoznatljive crvene i crne modele.",
    intro:
      "Manchester United modeli ulaze među najjače pretrage kad netko traži Ronaldo dres s jačom nostalgijom i europskim kontekstom. Ovdje su skupljene upravo te varijante koje najbolje prolaze u shopu.",
    filter: klubIs("Manchester United")
  },
  {
    slug: "inter-miami",
    label: "Inter Miami",
    heading: "Inter Miami dresovi",
    title: "Inter Miami dresovi — 20€",
    description:
      "Inter Miami dresovi s Messijem za sve koji traže rozi MLS hit model u dječjim i odraslim veličinama.",
    intro:
      "Inter Miami je odličan long-tail SEO ulaz jer kupci često traže baš Messi rozi dres. Ova stranica cilja te pretrage i odmah vodi prema konkretnom modelu koji je vizualno prepoznatljiv na prvi pogled.",
    filter: klubIs("Inter Miami")
  },
  {
    slug: "bih",
    label: "BiH",
    heading: "BiH dresovi",
    title: "BiH dresovi — reprezentacija Bosne i Hercegovine — 20€",
    description:
      "BiH dresovi s Džekom, Bajraktarevićem i Alajbegovićem — reprezentacija Bosne i Hercegovine uz dostavu po cijeloj Hrvatskoj.",
    intro:
      "Reprezentacija Bosne i Hercegovine ima vjernu publiku i kod nas i u susjedstvu, a zanimanje raste oko kvalifikacija i velikih turnira. Na ovoj stranici skupljeni su svi dostupni BiH modeli — od aktualnih izdanja do imena koja se najviše traže.",
    filter: klubIs("BiH", "Bosna i Hercegovina")
  },
  {
    slug: "spanjolska",
    label: "Španjolska",
    heading: "Španjolska dresovi",
    title: "Španjolska dresovi — reprezentacija — 20€",
    description:
      "Španjolska dresovi s Yamalom u bijeloj i crvenoj varijanti, za djecu i odrasle, uz plaćanje pouzećem.",
    intro:
      "Španjolska je uz Yamala postala jedna od najtraženijih reprezentacija kod mlađih kupaca. Ovdje su okupljeni svi španjolski modeli koje držimo, s naglaskom na aktualna izdanja koja se najbrže okreću.",
    filter: klubIs("Španjolska", "Spain")
  },
  {
    slug: "francuska",
    label: "Francuska",
    heading: "Francuska dresovi",
    title: "Francuska dresovi — reprezentacija — 20€",
    description:
      "Francuska dresovi s Mbappéom, Oliseom i Zidaneom — od aktualnih izdanja do retro klasika.",
    intro:
      "Francuska spaja aktualne zvijezde i jedan od najkultnijih retro komada u cijelom katalogu. Na ovoj stranici su svi francuski modeli koje držimo, pa je lako usporediti nova izdanja i klasike.",
    filter: klubIs("Francuska", "France")
  },
  {
    slug: "austrija",
    label: "Austrija",
    heading: "Austrija dresovi",
    title: "Austrija dresovi — reprezentacija — 20€",
    description:
      "Austrija dresovi sa Sabitzerom — reprezentativni model uz dostavu po cijeloj Hrvatskoj i plaćanje pouzećem.",
    intro:
      "Austrijska reprezentacija je rjeđi izbor, pa je zanimljiva onima koji žele dres koji se ne viđa na svakom uglu. Ovdje su svi austrijski modeli koje trenutno držimo.",
    filter: klubIs("Austrija", "Austria")
  },
  {
    slug: "liverpool",
    label: "Liverpool",
    heading: "Liverpool dresovi",
    title: "Liverpool dresovi — 20€",
    description:
      "Liverpool dresovi u dječjim i odraslim veličinama, uz fiksnu cijenu i dostavu po cijeloj Hrvatskoj.",
    intro:
      "Liverpool ima stabilnu navijačku bazu u Hrvatskoj i redovito ulazi u pretrage tijekom sezone Premier lige. Na ovoj stranici su svi Liverpool modeli koje držimo na jednom mjestu.",
    filter: klubIs("Liverpool")
  },
  {
    slug: "ac-milan",
    label: "AC Milan",
    heading: "AC Milan dresovi",
    title: "AC Milan dresovi — 20€",
    description:
      "AC Milan dresovi s Modrićem, Maldinijem i Ibrahimovićem — aktualna i retro izdanja.",
    intro:
      "AC Milan je posebno zanimljiv otkad Modrić nosi crveno-crni dres, pa se traži i kod domaćih navijača. Ovdje su okupljeni svi Milan modeli, od aktualnih do retro komada s jakim karakterom.",
    filter: klubIs("AC Milan", "Milan")
  }
];

const playerDefinitions: CollectionDefinition[] = [
  {
    slug: "mbappe",
    label: "Mbappé dresovi",
    heading: "Mbappé dresovi",
    title: "Mbappé dresovi — 20€",
    description: "Mbappé dresovi za Real Madrid i Francusku — dječje i odrasle veličine, fiksna cijena 20 €.",
    intro:
      "Otkako je prešao u Real Madrid, Mbappé je jedan od najtraženijih igrača kod nas. Ova stranica skuplja i njegove madridske i reprezentativne varijante na jedno mjesto, pa ne moraš prelistavati cijeli katalog da usporediš boje i sezone.",
    filter: playerNameIncludes("mbappe", "mbappé")
  },
  {
    slug: "vinicius",
    label: "Vinícius Jr dresovi",
    heading: "Vinícius Jr dresovi",
    title: "Vinícius Jr dresovi — 20€",
    description: "Vinícius Jr dresovi za Brazil i Real Madrid, za djecu i odrasle, 20 €.",
    intro:
      "Vinícius Jr je uz Mbappéa najprepoznatljivije ime današnjeg Reala, a brazilski dres s njegovim imenom traži se posebno ljeti. Ovdje su okupljene domaće i gostujuće varijante koje držimo na stanju.",
    filter: playerNameIncludes("vinicius", "vinícius")
  },
  {
    slug: "bellingham",
    label: "Bellingham dresovi",
    heading: "Bellingham dresovi",
    title: "Bellingham dresovi — 20€",
    description: "Bellingham dresovi (Real Madrid, Engleska) — dječje i odrasle veličine, 20 €.",
    intro:
      "Bellinghamov broj 5 postao je jedan od najprodavanijih u Madridu. Ako tražiš dres za dijete ili sebe, ovdje su sve njegove varijante koje trenutačno nudimo, s jasnim veličinama i stanjem.",
    filter: playerNameIncludes("bellingham")
  },
  {
    slug: "haaland-kane",
    label: "Kane dresovi",
    heading: "Kane dresovi",
    title: "Kane dresovi — 20€",
    description: "Harry Kane dresovi za Bayern München i Englesku — 20 €, dostava 2–5 dana.",
    intro:
      "Kane je nosilac napada Bayerna, a njegov dres je čest izbor za darove navijačima Bundeslige. Ovdje su njegove trenutačne varijante, uključujući crvene domaće komplete.",
    filter: playerNameIncludes("kane")
  },
  {
    slug: "raphinha",
    label: "Raphinha dresovi",
    heading: "Raphinha dresovi",
    title: "Raphinha dresovi — 20€",
    description: "Raphinha dresovi za Barcelonu i Brazil — dječje i odrasle veličine, 20 €.",
    intro:
      "Raphinha je u zadnjim sezonama izbio u prvi plan Barcelone i njegov broj 11 sve se češće traži. Skupili smo crne, zelene i domaće varijante da lakše usporediš prije narudžbe.",
    filter: playerNameIncludes("raphinha")
  },
  {
    slug: "sesko",
    label: "Šeško dresovi",
    heading: "Šeško dresovi",
    title: "Šeško dresovi — 20€",
    description: "Benjamin Šeško dresovi — Manchester United i Slovenija, 20 €.",
    intro:
      "Šeško je jedno od najzanimljivijih imena regije i njegov prelazak u Premier ligu podigao je potražnju za dresom. Ovdje su varijante koje držimo, u dječjim i odraslim veličinama.",
    filter: playerNameIncludes("sesko", "šeško")
  },
  {
    slug: "dzeko",
    label: "Džeko dresovi",
    heading: "Džeko dresovi",
    title: "Džeko dresovi — 20€",
    description: "Edin Džeko dresovi — reprezentacija BiH, dječje i odrasle veličine, 20 €.",
    intro:
      "Džeko je i dalje najpoznatije ime bosanskohercegovačkog nogometa, a njegov dres je stalno tražen i u Hrvatskoj. Ovdje su reprezentativne varijante s njegovim imenom i brojem.",
    filter: playerNameIncludes("dzeko", "džeko")
  },
  {
    slug: "wirtz",
    label: "Wirtz dresovi",
    heading: "Wirtz dresovi",
    title: "Wirtz dresovi — 20€",
    description: "Florian Wirtz dresovi za Njemačku i klub — 20 €, dostava po cijeloj Hrvatskoj.",
    intro:
      "Wirtz je nositelj nove generacije njemačke reprezentacije i njegov dres je čest izbor mlađih navijača. Na ovoj stranici su njegove varijante s dostupnim veličinama.",
    filter: playerNameIncludes("wirtz")
  },
  {
    slug: "doue",
    label: "Doué dresovi",
    heading: "Doué dresovi",
    title: "Doué dresovi — 20€",
    description: "Désiré Doué dresovi (PSG, Francuska) — dječje i odrasle veličine, 20 €.",
    intro:
      "Doué je nakon sjajne sezone u PSG-u postao jedno od traženijih imena kod mlađih kupaca. Ovdje su njegove varijante koje trenutačno nudimo.",
    filter: playerNameIncludes("doue", "doué")
  },
  {
    slug: "suarez",
    label: "Suárez dresovi",
    heading: "Suárez dresovi",
    title: "Suárez dresovi — 20€",
    description: "Luis Suárez dresovi — Inter Miami i klasici, 20 €.",
    intro:
      "Suárez je uz Messija dio Inter Miami priče koja i dalje vuče kupce. Ovdje su njegove varijante, uključujući rozi dres koji se najčešće traži.",
    filter: playerNameIncludes("suarez", "suárez")
  },
  {
    slug: "pele",
    label: "Pelé dresovi",
    heading: "Pelé dresovi",
    title: "Pelé dresovi — 20€",
    description: "Pelé retro dresovi — brazilski klasici za kolekcionare, 20 €.",
    intro:
      "Pelé je vječno ime brazilskog nogometa i njegov retro dres je čest poklon starijim navijačima i kolekcionarima. Ovdje su klasične varijante koje držimo.",
    filter: playerNameIncludes("pele", "pelé")
  },
  {
    slug: "bajraktarevic",
    label: "Bajraktarević dresovi",
    heading: "Bajraktarević dresovi",
    title: "Bajraktarević dres BiH — 20€",
    description: "Bajraktarević dres BiH — reprezentativni dres za djecu i odrasle, 20 €. Dostava 2–5 dana, plaćanje pouzećem.",
    intro:
      "Mlada snaga bosanskohercegovačke reprezentacije sve se češće traži uz Džeku. Ovdje su njegove reprezentativne varijante s dostupnim veličinama.",
    filter: playerNameIncludes("bajraktarevic", "bajraktarević")
  },
  {
    slug: "messi",
    label: "Messi dresovi",
    heading: "Messi dresovi",
    title: "Messi dresovi — 20€",
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
    title: "Ronaldo dresovi — 20€",
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
    title: "Neymar dresovi — 20€",
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
    title: "Yamal dresovi — 20€",
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
    title: "Modrić dresovi — 20€",
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
    title: "Ronaldinho dresovi — 20€",
    description:
      "Ronaldinho dresovi iz Barcelone, Brazila i PSG-a za kupce koji traže retro energiju i iconic streetwear vibe.",
    intro:
      "Ronaldinho komadi spajaju retro nogometnu kulturu i jak modni karakter. Zato smo ih izdvojili na zasebnu stranicu za kupce koji točnije znaju što traže i žele više opcija na jednom mjestu.",
    filter: playerNameIncludes("ronaldinho")
  }
];

// Kolekcije se grade nad CIJELIM katalogom (statički dresovi + izmjene iz admina
// + dresovi dodani iz admina). Prije su gledale samo statički niz, pa novi
// proizvodi nisu ulazili u klupske/igračke hubove. Katalog je keširan (60s).
async function allJerseys(): Promise<Jersey[]> {
  return getCatalogProducts(jerseys);
}

export async function getJerseyCategoryCollections() {
  return buildCollections("kategorija", categoryDefinitions, await allJerseys());
}

export async function getJerseyCategoryBySlug(slug: string) {
  return (await getJerseyCategoryCollections()).find((collection) => collection.slug === slug);
}

export async function getJerseyClubCollections() {
  return buildCollections("klub", clubDefinitions, await allJerseys());
}

export async function getJerseyClubBySlug(slug: string) {
  return (await getJerseyClubCollections()).find((collection) => collection.slug === slug);
}

export async function getJerseyPlayerCollections() {
  return buildCollections("igrac", playerDefinitions, await allJerseys());
}

export async function getJerseyPlayerBySlug(slug: string) {
  return (await getJerseyPlayerCollections()).find((collection) => collection.slug === slug);
}

export async function getFeaturedCategoryCollections(limit = 5) {
  return [...(await getJerseyCategoryCollections())]
    .sort((left, right) => right.products.length - left.products.length)
    .slice(0, limit);
}

export async function getFeaturedClubCollections(limit = 8) {
  return [...(await getJerseyClubCollections())]
    .sort((left, right) => right.products.length - left.products.length)
    .slice(0, limit);
}

export async function getFeaturedPlayerCollections(limit = 6) {
  return [...(await getJerseyPlayerCollections())]
    .sort((left, right) => right.products.length - left.products.length)
    .slice(0, limit);
}

export async function getClubCollectionForProduct(product: Jersey) {
  return (await getJerseyClubCollections()).find((collection) =>
    collection.products.some((item) => item.slug === product.slug)
  );
}

export async function getPlayerCollectionForProduct(product: Jersey) {
  return (await getJerseyPlayerCollections()).find((collection) =>
    collection.products.some((item) => item.slug === product.slug)
  );
}

export async function getCategoryCollectionsForProduct(product: Jersey) {
  return (await getJerseyCategoryCollections()).filter((collection) =>
    collection.products.some((item) => item.slug === product.slug)
  );
}
