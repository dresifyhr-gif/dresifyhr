import { getJerseySizeOptions, isNationalTeam, jerseys, type Jersey } from "@/lib/data/jerseys";
import { getCatalogProducts } from "@/lib/data/product-overrides";

export type CollectionBodySection = { h2: string; text: string };
export type CollectionFaqItem = { q: string; a: string };

// Kontekst za filtere kojima treba pogled na cijeli katalog (npr. koji su
// nazivi reprezentacije — i one koje nisu u NATIONAL_TEAMS, npr. Španjolska).
type FilterContext = { nationalClubs: Set<string> };

type CollectionDefinition = {
  slug: string;
  label: string;
  heading: string;
  title: string;
  description: string;
  intro: string;
  // Dodatni jedinstveni sadržaj ispod uvoda (H2 + odlomak) — za tanke landinge.
  body?: CollectionBodySection[];
  // Vidljiva pitanja i odgovori (<details>), bez FAQPage sheme.
  faq?: CollectionFaqItem[];
  // Slugovi blog članaka koji se povezuju s landinga (i obrnuto, s članka na landing).
  relatedPosts?: string[];
  filter: (product: Jersey, ctx: FilterContext) => boolean;
};

export type JerseyCollection = {
  slug: string;
  label: string;
  heading: string;
  title: string;
  description: string;
  intro: string;
  body?: CollectionBodySection[];
  faq?: CollectionFaqItem[];
  relatedPosts?: string[];
  path: string;
  products: Jersey[];
};

// Rasprodano = nijedna veličina nije dostupna (isto pravilo kao kartica proizvoda).
export function isProductSoldOut(product: Jersey) {
  const o = getJerseySizeOptions(product);
  const anyAdult = !o.adultsOutOfStock && o.adults.some((s) => !o.soldOutSizes.includes(s));
  const anyKid = !o.kidsOutOfStock && o.kids.some((s) => !o.soldOutSizes.includes(s));
  return !anyAdult && !anyKid;
}

function buildCollections(
  prefix: "kategorija" | "klub" | "igrac",
  definitions: CollectionDefinition[],
  products: Jersey[]
): JerseyCollection[] {
  const ctx: FilterContext = {
    nationalClubs: new Set(products.filter((p) => p.liga === "Reprezentacija").map((p) => norm(p.klub)))
  };
  return definitions
    .map(({ filter, ...definition }) => {
      const matched = products.filter((product) => filter(product, ctx));
      // Rasprodani na kraj (stabilno) — i u mreži i u ItemList shemi.
      const available = matched.filter((p) => !isProductSoldOut(p));
      const soldOut = matched.filter((p) => isProductSoldOut(p));
      return {
        ...definition,
        path: `/dresovi/${prefix}/${definition.slug}`,
        products: [...available, ...soldOut]
      };
    })
    .filter((collection) => collection.products.length > 0);
}

const hasKids = (product: Jersey) => product.vel.includes("Djeca");
const hasAdults = (product: Jersey) => product.vel.includes("Odrasli");
// Dječji kompleti iz admina imaju "Odrasli" u `vel`, ali u nazivu piše "dječji".
const isKidsOnlyByName = (product: Jersey) => /dje[cč]j/i.test(`${product.slug} ${product.igrac}`);
const slugStartsWith =
  (...prefixes: string[]) =>
  (product: Jersey) =>
    prefixes.some((prefix) => product.slug.startsWith(prefix));
// Klupski hubovi gađaju NAZIV kluba, ne slug prefiks — tako u hub sjednu i
// dresovi dodani iz admina (njihov slug je drukčiji, npr. "manchester-united-sesko").
const norm = (v: string) =>
  String(v || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/đ/g, "d").trim();

// Isti klub se iz admina zna upisati na više načina ("Barcelona" vs "FC Barcelona",
// "Paris Saint-Germain" vs "PSG"). Prvi naziv u grupi je kanonski (prikazni).
const CLUB_ALIASES: string[][] = [
  ["FC Barcelona", "Barcelona", "FC Barca", "Barca", "Barça"],
  ["PSG", "Paris Saint-Germain", "Paris Saint Germain", "Paris SG"],
  ["Real Madrid", "Real", "Real Madrid CF"],
  ["Manchester United", "Man Utd", "ManUtd", "Man United", "Manchester Utd"],
  ["Bayern München", "Bayern", "Bayern Munich", "Bayern Munchen", "FC Bayern"],
  ["AC Milan", "Milan"],
  ["Njemačka", "Germany"],
  ["Engleska", "England"],
  ["Španjolska", "Spain"],
  ["Francuska", "France"],
  ["Austrija", "Austria"],
  ["BiH", "Bosna i Hercegovina"]
];
const CLUB_ALIAS_MAP = new Map<string, string>(
  CLUB_ALIASES.flatMap((group) => group.map((name) => [norm(name), group[0]] as [string, string]))
);

// Kanonski naziv kluba (za grupiranje i usporedbu); nepoznati ostaju kakvi jesu.
export function canonicalClubName(name: string) {
  return CLUB_ALIAS_MAP.get(norm(name)) ?? String(name || "").trim();
}

const klubIs = (...names: string[]) => {
  const wanted = new Set(names.map((n) => norm(canonicalClubName(n))));
  return (product: Jersey) => wanted.has(norm(canonicalClubName(product.klub)));
};
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
    title: "Dječji nogometni dresovi i kompleti — od 20€",
    description:
      "Pregledaj dječje nogometne dresove i komplete za najtraženije klubove i reprezentacije od 20 €, uz brzu dostavu po Hrvatskoj.",
    intro:
      "Ova kategorija okuplja modele za klince koji žele komplet spreman za igru, trening ili poklon. U ponudi su veličine od 104 do 176 i najtraženiji klubovi koje roditelji najčešće traže tijekom sezone.",
    body: [
      {
        h2: "Koju veličinu odabrati za dijete",
        text: "Dječje veličine idu od 104 do 176. Najsigurnije je izmjeriti majicu koja djetetu sada dobro stoji ili se voditi njegovom visinom. Ako je dijete između dvije veličine, uzmi veću: djeca brzo rastu, a dres s malo rezerve nosit će i iduću sezonu. Ako nisi siguran, javi nam visinu i dob djeteta pa ćemo ti predložiti veličinu prije slanja."
      },
      {
        h2: "Dres s hlačicama ili cijeli komplet",
        text: "Dječji dres dolazi s hlačicama, pa je odmah spreman za trening, igralište ili rođendanski poklon. Ime i broj igrača su ušiveni. Ako želiš cijeli paket, pogledaj komplete s loptom i kapom. Najčešće se biraju Hrvatska s Modrićem, Barcelona s Yamalom, Real Madrid s Mbappéom i Messijev rozi Inter Miami."
      },
      {
        h2: "Plaćanje i dostava",
        text: "Dječji dresovi su od 20 €. Plaćaš pouzećem kad ti paket stigne, a dostava traje 2–5 dana po cijeloj Hrvatskoj."
      }
    ],
    faq: [
      {
        q: "Koje dječje veličine imate?",
        a: "Dječje veličine su od 104 do 176. Ako je dijete između dvije veličine, preporučujemo veću."
      },
      {
        q: "Dolazi li dječji dres s hlačicama?",
        a: "Da, dječji dres dolazi s hlačicama. Komplet uz to ima i loptu i kapu."
      },
      {
        q: "Kako plaćam i koliko čekam?",
        a: "Plaćaš pouzećem pri preuzimanju, a dostava traje 2–5 dana po cijeloj Hrvatskoj."
      }
    ],
    relatedPosts: ["kako-odabrati-velicinu-dresa-za-dijete", "dres-ili-komplet-za-dijete", "dres-kao-poklon-malom-navijacu"],
    filter: hasKids
  },
  {
    slug: "dresovi-za-odrasle",
    label: "Dresovi za odrasle",
    heading: "Nogometni dresovi za odrasle",
    title: "Nogometni dresovi za odrasle — od 20€",
    description:
      "Nogometni dresovi za odrasle u veličinama S–XL, reprezentacije do XXL. Novi modeli i retro klasici od 20 €, plaćanje pouzećem, dostava 2–5 dana.",
    intro:
      "Ako kupuješ za sebe, ovdje su skupljeni modeli za odrasle koje je najlakše filtrirati po klubu, ligi i igraču. To je dobar ulaz za kupce koji žele brzo usporediti aktualne i retro komade bez pretraživanja cijelog kataloga.",
    filter: (product) => hasAdults(product) && !isKidsOnlyByName(product)
  },
  {
    slug: "retro-dresovi",
    label: "Retro dresovi",
    heading: "Retro nogometni dresovi",
    title: "Retro nogometni dresovi — od 20€",
    description:
      "Retro nogometni dresovi — Messi, Ronaldo, Ronaldinho, Zidane i finala Lige prvaka. Klasici od 20 €, plaćanje pouzećem, dostava 2–5 dana.",
    intro:
      "Retro modeli imaju najjači karakter i često su prvi izbor kad netko želi dres koji izgleda dobro i na tribini i u gradu. Ovdje su okupljeni svi komadi koji nose stariju sezonu, finala Lige prvaka i kultna reprezentacijska izdanja.",
    body: [
      {
        h2: "Koji retro dres odabrati",
        text: "Retro dres biraš po uspomeni. Ronaldovi madridski dresovi iz finala Lige prvaka, Messijev dres iz Berlina 2015., Ronaldinho u Barceloni i Zidaneov francuski dres sa Svjetskog prvenstva 1998. najčešći su izbor. Ako dres kupuješ kao poklon, uzmi igrača kojeg je ta osoba gledala kad je počela pratiti nogomet. Takav dres će stvarno nositi, a ne ostaviti u ormaru."
      },
      {
        h2: "Retro dres za tribinu i za grad",
        text: "Retro modeli imaju klasičan kroj i boje koje se lako slažu s trapericama i tenisicama, pa ih mnogi nose i izvan stadiona. Ime i broj igrača su ušiveni. Većina retro modela dolazi u dječjim i odraslim veličinama, pa i mali navijač može nositi isti dres kao tata."
      },
      {
        h2: "Cijena i dostava",
        text: "Retro dresovi su od 20 €. Plaćaš pouzećem kad paket stigne, a dostava traje 2–5 dana po cijeloj Hrvatskoj."
      }
    ],
    faq: [
      {
        q: "Jesu li retro dresovi dostupni i za djecu?",
        a: "Većina retro modela dolazi u dječjim veličinama od 104 do 176 i u odraslim veličinama. Dostupne veličine piše uz svaki dres."
      },
      {
        q: "Koliko koštaju retro dresovi?",
        a: "Retro dresovi su od 20 €, a točna cijena piše uz svaki model."
      },
      {
        q: "Kako plaćam retro dres?",
        a: "Plaćaš pouzećem pri preuzimanju, a dostava traje 2–5 dana po cijeloj Hrvatskoj."
      }
    ],
    relatedPosts: ["top-10-retro-dresova-2025"],
    filter: (product) => product.retro
  },
  {
    slug: "reprezentativni-dresovi",
    label: "Reprezentativni dresovi",
    heading: "Reprezentativni nogometni dresovi",
    title: "Reprezentativni dresovi od 20€ — Hrvatska, Brazil, Argentina",
    description:
      "Dresovi reprezentacija — Hrvatska, Argentina, Brazil, Francuska, Portugal i ostale. Dječje i odrasle veličine, od 20 €, dostava pouzećem.",
    intro:
      "Reprezentativni dresovi drže najstabilniju potražnju tijekom cijele godine, posebno oko velikih turnira i poklona za djecu. Ova stranica skuplja sve nacionalne timove iz kataloga i olakšava brzo uspoređivanje najtraženijih boja i igrača.",
    relatedPosts: ["sp-2026-spanjolska-prvak-dresovi", "dresovi-hrvatske-reprezentacije-kockasti-ponos"],
    filter: (product) => product.liga === "Reprezentacija"
  },
  {
    slug: "klupski-dresovi",
    label: "Klupski dresovi",
    heading: "Klupski nogometni dresovi",
    title: "Klupski nogometni dresovi — od 20€",
    description:
      "FC Barcelona, Real Madrid, PSG, Bayern i ostali klupski dresovi na jednom mjestu za sve koji traže aktualne ili statement modele.",
    intro:
      "Ako znaš da želiš klub, a ne reprezentaciju, ovdje su svi klupski dresovi na jednom mjestu: najpopularniji europski klubovi, posebna izdanja i modeli koji se najbrže rasprodaju.",
    // Ne gleda samo ligu: kompleti reprezentacija imaju ligu "Komplet", pa se
    // reprezentacija prepoznaje i po nazivu (NATIONAL_TEAMS + sve repke iz kataloga).
    filter: (product, ctx) =>
      !isNationalTeam(product) && !ctx.nationalClubs.has(norm(product.klub))
  }
];

const clubDefinitions: CollectionDefinition[] = [
  {
    slug: "fc-barcelona",
    label: "FC Barcelona",
    heading: "FC Barcelona dresovi",
    title: "FC Barcelona dresovi — od 20€",
    description:
      "FC Barcelona dresovi s Yamalom, Raphinhom, Messijem i Ronaldinhom — novi i retro modeli za djecu i odrasle, od 20 €, uz plaćanje pouzećem.",
    intro:
      "Barcelona je jedan od najtraženijih klubova kod nas, pa su ovdje svi aktualni i retro modeli na jednom mjestu. Najčešće se biraju Yamal, Messi i Ronaldinho te posebne boje koje se odmah primijete.",
    body: [
      {
        h2: "Koji Barcelona dres odabrati",
        text: "Yamal je danas najtraženije ime u Barceloni, pa je njegov broj 10 u ponudi u novom domaćem dresu za 2026/27, u crnom specijalnom izdanju i u nekoliko posebnih boja. Raphinha nr11 dolazi u domaćoj, crnoj i zelenoj varijanti. Ako voliš povijest kluba, tu su retro dresovi s Messijem iz finala Lige prvaka u Berlinu 2015., Ronaldinhom, Neymarom i Ronaldom R9."
      },
      {
        h2: "Barcelona dres za djecu i odrasle",
        text: "Većina Barcelona dresova dolazi u dječjim veličinama od 104 do 176, s hlačicama, i u odraslim veličinama od S do XL. Ime i broj igrača su ušiveni. Ako biraš poklon za dijete, Yamal je najčešći izbor, a za odrasle se uz njega najviše traže retro modeli."
      },
      {
        h2: "Cijena i dostava",
        text: "Barcelona dresovi su od 20 €. Plaćaš pouzećem kad ti paket stigne, a dostava traje 2–5 dana po cijeloj Hrvatskoj."
      }
    ],
    faq: [
      {
        q: "Koji je najtraženiji Barcelona dres?",
        a: "Yamal nr10, posebno novi domaći dres i posebna izdanja u jačim bojama."
      },
      {
        q: "Imate li retro Barcelona dresove?",
        a: "Da — Messi iz Berlina 2015., Ronaldinho, Neymar i Ronaldo R9. Svi su u mreži iznad."
      },
      {
        q: "Koje veličine imaju Barcelona dresovi?",
        a: "Dječje od 104 do 176 i odrasle od S do XL. Dostupne veličine piše uz svaki dres."
      }
    ],
    relatedPosts: ["barcelona-dresovi-koji-model-odabrati"],
    filter: klubIs("FC Barcelona")
  },
  {
    slug: "real-madrid",
    label: "Real Madrid",
    heading: "Real Madrid dresovi",
    title: "Real Madrid dresovi — od 20€",
    description:
      "Real Madrid dresovi s Mbappéom, Bellinghamom, Ronaldom, Ramosom i Gülerom za djecu i odrasle — od 20 €, plaćanje pouzećem, dostava 2–5 dana.",
    intro:
      "Svi bijeli, posebni i finalni Real Madrid modeli na jednom mjestu: aktualne zvijezde, velike europske noći i nekoliko retro komada koje navijači najčešće traže.",
    body: [
      {
        h2: "Koji Real Madrid dres odabrati",
        text: "Bijeli domaći dres je klasik koji nikad ne izlazi iz mode. Mbappé nr10 je danas najtraženije ime, a u ponudi je u novom bijelom dresu za 2026/27 i u nekoliko posebnih izdanja. Bellingham nr5 dolazi u domaćoj, gostujućoj i narančastoj varijanti, a tu je i Arda Güler. Ako tražiš golmanski dres, pogledaj Courtoisove golmanske komplete."
      },
      {
        h2: "Retro dresovi Reala",
        text: "Ako pamtiš velike europske noći, tu su Ronaldovi dresovi iz finala Lige prvaka u Cardiffu 2017. i Kijevu 2018. te Ramosov dres iz finala 2018. Uz njih su i posebna izdanja poput crnog Balmain dresa i crnog zmaj izdanja s Ronaldom."
      },
      {
        h2: "Veličine, cijena i dostava",
        text: "Većina modela dolazi u dječjim veličinama od 104 do 176 i odraslim od S do XL, s ušivenim imenom i brojem. Real Madrid dresovi su od 20 €. Plaćaš pouzećem, a dostava traje 2–5 dana po cijeloj Hrvatskoj."
      }
    ],
    faq: [
      {
        q: "Koji je najtraženiji Real Madrid dres?",
        a: "Mbappé nr10 u bijelom domaćem dresu, a odmah iza njega Bellingham nr5."
      },
      {
        q: "Imate li retro Real Madrid dresove?",
        a: "Da — Ronaldo iz finala Lige prvaka 2017. i 2018. te Ramos iz finala 2018."
      },
      {
        q: "Koliko košta Real Madrid dres?",
        a: "Dresovi su od 20 €, a točna cijena piše uz svaki model. Plaćaš pouzećem pri preuzimanju."
      }
    ],
    relatedPosts: ["real-madrid-dresovi-vodic"],
    filter: klubIs("Real Madrid")
  },
  {
    slug: "brazil",
    label: "Brazil",
    heading: "Brazil dresovi",
    title: "Brazil dresovi — od 20€",
    description:
      "Brazil dresovi s Neymarom, Viníciusom, Ronaldinhom, Peléom, Kakáom i Robertom Carlosom — posebna i retro izdanja od 20 €, plaćanje pouzećem.",
    intro:
      "Brazil je stalni evergreen u katalogu jer prolazi i kod klinaca i kod kupaca koji biraju poklon. Na ovoj stranici su skupljeni svi žuti, crni, plavi i retro modeli koji imaju jak identitet i visoku traženost.",
    filter: klubIs("Brazil")
  },
  {
    slug: "hrvatska",
    label: "Hrvatska",
    heading: "Hrvatska dresovi",
    title: "Hrvatska dresovi — Modrić, Perišić, Livaković",
    description:
      "Dres Hrvatske reprezentacije — Modrić, Perišić, Livaković i ostali. Dječje i odrasle veličine, od 20 €, brza dostava po cijeloj Hrvatskoj.",
    intro:
      "Vatreni su naš najtraženiji dres. Ovdje su svi dostupni modeli Hrvatske, za djecu, za poklon ili za sebe.",
    body: [
      {
        h2: "Koji dres Hrvatske odabrati",
        text: "Najtraženiji je kockasti crveno-bijeli domaći dres, a odmah iza njega plavi gostujući. Za SP 2026 u ponudi su nova izdanja s Modrićem, Gvardiolom, Stanišićem, Baturinom i Vuškovićem, a uz njih i dresovi s Perišićem i Livakovićem. Ako biraš poklon, Modrić nr10 je najsigurniji izbor, a mlađi navijači sve češće traže nova imena reprezentacije."
      },
      {
        h2: "Veličine za djecu i odrasle",
        text: "Dječje veličine idu od 104 do 176 i dolaze s hlačicama, a odrasle od S do XXL. Ako je dijete između dvije veličine, uzmi veću, a ako nisi siguran, javi nam visinu djeteta i predložit ćemo ti veličinu. Za najmlađe navijače postoji i komplet s dresom, hlačicama, loptom i kapom. Ime i broj igrača su ušiveni."
      },
      {
        h2: "Dostava i plaćanje pouzećem",
        text: "Dresovi Hrvatske su od 20 €. Plaćaš pouzećem kad ti paket stigne, a dostava traje 2–5 dana po cijeloj Hrvatskoj."
      }
    ],
    faq: [
      {
        q: "Koji je najtraženiji dres Hrvatske?",
        a: "Kockasti domaći dres s Modrićem i brojem 10 — i kod djece i kod odraslih."
      },
      {
        q: "Ima li dres Hrvatske u dječjim veličinama?",
        a: "Da, dječje veličine od 104 do 176 dolaze s hlačicama. Odrasle veličine su od S do XXL."
      },
      {
        q: "Koliko košta dres Hrvatske?",
        a: "Dresovi Hrvatske su od 20 €, a točna cijena piše uz svaki model. Plaćaš pouzećem pri preuzimanju."
      }
    ],
    relatedPosts: ["dresovi-hrvatske-reprezentacije-kockasti-ponos"],
    filter: klubIs("Hrvatska")
  },
  {
    slug: "argentina",
    label: "Argentina",
    heading: "Argentina dresovi",
    title: "Argentina dresovi — od 20€",
    description:
      "Argentina dresovi s Messijem, uključujući crna posebna izdanja i Svjetsko prvenstvo 2022, za djecu i odrasle. Od 20 €, plaćanje pouzećem.",
    intro:
      "Argentina i Messi imaju konstantnu potražnju jer spajaju ogroman igrački status i prepoznatljiv vizual. Ova stranica okuplja sve argentinske modele i olakšava kupcu da u nekoliko klikova dođe do pravog izdanja.",
    relatedPosts: ["messi-dres-koji-odabrati"],
    filter: klubIs("Argentina")
  },
  {
    slug: "psg",
    label: "PSG",
    heading: "PSG dresovi",
    title: "PSG dresovi — od 20€",
    description:
      "PSG dresovi s Hakimijem, Ronaldinhom, Douéom i Kvaratskheliom za kupce koji traže francuske klupske modele s jačim vizualom.",
    intro:
      "PSG modeli dobro prolaze kod kupaca koji žele tamnije i modernije dresove, kao i kod onih koji traže nešto drukčije od standardnih domaćih garnitura. Na jednom mjestu skupljamo aktualna i retro izdanja s najvećim interesom.",
    filter: klubIs("PSG") // + "Paris Saint-Germain" preko CLUB_ALIASES
  },
  {
    slug: "bayern-munchen",
    label: "Bayern München",
    heading: "Bayern München dresovi",
    title: "Bayern München dresovi — od 20€",
    description:
      "Bayern München dresovi s Musialom i posebnim izdanjima za kupce koji traže Bundesliga favorite u dječjim i odraslim veličinama.",
    intro:
      "Svi crveni i posebni Bayern modeli na jednom mjestu. Ako znaš da želiš Bayern, ovdje odmah vidiš sve dostupne varijante bez dodatnog filtriranja.",
    filter: klubIs("Bayern München")
  },
  {
    slug: "manchester-united",
    label: "Manchester United",
    heading: "Manchester United dresovi",
    title: "Manchester United dresovi — od 20€",
    description:
      "Manchester United dresovi s Ronaldom u UCL i retro izdanjima te Šeškom — prepoznatljivi crveni i crni modeli od 20 €, plaćanje pouzećem.",
    intro:
      "Manchester United je prvi izbor kad netko želi Ronaldov dres s dozom nostalgije i europskih noći. Ovdje su sve varijante koje navijači najčešće biraju.",
    filter: klubIs("Manchester United")
  },
  {
    slug: "inter-miami",
    label: "Inter Miami",
    heading: "Inter Miami dresovi",
    title: "Inter Miami dresovi — od 20€",
    description:
      "Inter Miami dresovi s Messijem i Suárezom — rozi MLS hit i crni gostujući model u dječjim i odraslim veličinama, od 20 €, plaćanje pouzećem.",
    intro:
      "Messijev rozi Inter Miami dres prepoznaje se na prvi pogled. Ovdje su svi Inter Miami modeli koje trenutno imamo.",
    relatedPosts: ["messi-dres-koji-odabrati"],
    filter: klubIs("Inter Miami")
  },
  {
    slug: "bih",
    label: "BiH",
    heading: "BiH dresovi",
    title: "BiH dresovi — reprezentacija Bosne i Hercegovine — od 20€",
    description:
      "BiH dresovi s Džekom, Bajraktarevićem i Alajbegovićem — reprezentacija Bosne i Hercegovine uz dostavu po cijeloj Hrvatskoj.",
    intro:
      "Reprezentacija Bosne i Hercegovine ima vjernu publiku i kod nas i u susjedstvu, a zanimanje raste oko kvalifikacija i velikih turnira. Na ovoj stranici skupljeni su svi dostupni BiH modeli — od aktualnih izdanja do imena koja se najviše traže.",
    filter: klubIs("BiH")
  },
  {
    slug: "spanjolska",
    label: "Španjolska",
    heading: "Španjolska dresovi",
    title: "Španjolska dresovi — reprezentacija — od 20€",
    description:
      "Španjolska dresovi s Yamalom u bijeloj i crvenoj varijanti, za djecu i odrasle. Od 20 €, plaćanje pouzećem, dostava 2–5 dana po Hrvatskoj.",
    intro:
      "Španjolska je uz Yamala postala jedna od najtraženijih reprezentacija kod mlađih kupaca. Ovdje su okupljeni svi španjolski modeli koje držimo, s naglaskom na aktualna izdanja koja se najbrže okreću.",
    relatedPosts: ["sp-2026-spanjolska-prvak-dresovi"],
    filter: klubIs("Španjolska")
  },
  {
    slug: "francuska",
    label: "Francuska",
    heading: "Francuska dresovi",
    title: "Francuska dresovi — reprezentacija — od 20€",
    description:
      "Francuska dresovi s Mbappéom, Oliseom i Zidaneom — od aktualnih izdanja za SP 2026 do retro klasika iz 1998. Od 20 €, plaćanje pouzećem.",
    intro:
      "Francuska spaja aktualne zvijezde i jedan od najkultnijih retro komada u cijelom katalogu. Na ovoj stranici su svi francuski modeli koje držimo, pa je lako usporediti nova izdanja i klasike.",
    filter: klubIs("Francuska")
  },
  {
    slug: "austrija",
    label: "Austrija",
    heading: "Austrija dresovi",
    title: "Austrija dresovi — reprezentacija — od 20€",
    description:
      "Austrija dresovi sa Sabitzerom — reprezentativni modeli od 20 €, uz dostavu 2–5 dana po cijeloj Hrvatskoj i plaćanje pouzećem.",
    intro:
      "Austrijska reprezentacija je rjeđi izbor, pa je zanimljiva onima koji žele dres koji se ne viđa na svakom uglu. Ovdje su svi austrijski modeli koje trenutno držimo.",
    filter: klubIs("Austrija")
  },
  {
    slug: "liverpool",
    label: "Liverpool",
    heading: "Liverpool dresovi",
    title: "Liverpool dresovi — od 20€",
    description:
      "Liverpool dresovi s Ekitikéom u dječjim i odraslim veličinama — od 20 €, plaćanje pouzećem i dostava 2–5 dana po cijeloj Hrvatskoj.",
    intro:
      "Liverpool ima vjerne navijače u Hrvatskoj, posebno tijekom sezone Premier lige. Na ovoj stranici su svi Liverpool modeli koje držimo na jednom mjestu.",
    filter: klubIs("Liverpool")
  },
  {
    slug: "ac-milan",
    label: "AC Milan",
    heading: "AC Milan dresovi",
    title: "AC Milan dresovi — od 20€",
    description:
      "AC Milan dresovi s Modrićem, Maldinijem i Ibrahimovićem — aktualna i retro izdanja.",
    intro:
      "AC Milan je posebno zanimljiv otkad Modrić nosi crveno-crni dres, pa se traži i kod domaćih navijača. Ovdje su okupljeni svi Milan modeli, od aktualnih do retro komada s jakim karakterom.",
    filter: klubIs("AC Milan")
  },
  {
    slug: "portugal",
    label: "Portugal",
    heading: "Portugal dresovi",
    title: "Portugal dresovi — Ronaldo, od 20€",
    description:
      "Portugal dresovi s Ronaldom nr7 — crveni domaći, bijelo-zeleni gostujući i crni SE model. Dječje i odrasle veličine, od 20 €, plaćanje pouzećem.",
    intro:
      "Ronaldo je razlog zašto je Portugal jedna od najtraženijih reprezentacija kod nas. Ovdje su svi portugalski modeli s njegovim brojem 7, od crvenog domaćeg do posebnih izdanja.",
    relatedPosts: ["ronaldo-dres-koji-odabrati"],
    filter: klubIs("Portugal")
  },
  {
    slug: "njemacka",
    label: "Njemačka",
    heading: "Njemačka dresovi",
    title: "Njemačka dresovi — Wirtz i Neuer, od 20€",
    description:
      "Njemačka dresovi s Wirtzom, Undavom i Neuerom — tamnoplavi 2026, domaći bijeli i roza vratarski model. Od 20 €, plaćanje pouzećem, dostava 2–5 dana.",
    intro:
      "Njemačka reprezentacija ulazi u novu generaciju, a Wirtz je njezino najtraženije ime. Ovdje su svi njemački modeli koje držimo, uključujući i Neuerov vratarski dres.",
    filter: klubIs("Njemačka")
  },
  {
    slug: "engleska",
    label: "Engleska",
    heading: "Engleska dresovi",
    title: "Engleska dresovi — Kane i Bellingham, od 20€",
    description:
      "Engleska dresovi s Kaneom i Bellinghamom — bijeli domaći i ljubičasti alternativni model. Od 20 €, plaćanje pouzećem, dostava 2–5 dana po Hrvatskoj.",
    intro:
      "Kane i Bellingham nose novu Englesku, pa su njihovi dresovi čest izbor navijača Premier lige. Ovdje su svi engleski modeli koje trenutno držimo.",
    filter: klubIs("Engleska")
  }
];

const playerDefinitions: CollectionDefinition[] = [
  {
    slug: "mbappe",
    label: "Mbappé dresovi",
    heading: "Mbappé dresovi",
    title: "Mbappé dresovi — od 20€",
    description: "Mbappé dresovi za Real Madrid i Francusku — novi domaći, posebna izdanja i SP 2026. Dječje i odrasle veličine, od 20 €, plaćanje pouzećem.",
    intro:
      "Otkako je prešao u Real Madrid, Mbappé je jedan od najtraženijih igrača kod nas. Ova stranica skuplja i njegove madridske i reprezentativne varijante na jedno mjesto, pa ne moraš prelistavati cijeli katalog da usporediš boje i sezone.",
    filter: playerNameIncludes("mbappe", "mbappé")
  },
  {
    slug: "vinicius",
    label: "Vinícius Jr dresovi",
    heading: "Vinícius Jr dresovi",
    title: "Vinícius Jr dresovi — od 20€",
    description: "Vinícius Jr dresovi Brazila s brojem 7 — žuti domaći i plavi gostujući model za djecu i odrasle. Od 20 €, plaćanje pouzećem, dostava 2–5 dana.",
    intro:
      "Vinícius Jr je uz Mbappéa najprepoznatljivije ime današnjeg Reala, a brazilski dres s njegovim imenom traži se posebno ljeti. Ovdje su okupljene domaće i gostujuće varijante koje držimo na stanju.",
    filter: playerNameIncludes("vinicius", "vinícius")
  },
  {
    slug: "bellingham",
    label: "Bellingham dresovi",
    heading: "Bellingham dresovi",
    title: "Bellingham dresovi — od 20€",
    description: "Bellingham dresovi za Real Madrid i Englesku — domaći, gostujući i narančasti model. Dječje i odrasle veličine, od 20 €, plaćanje pouzećem.",
    intro:
      "Bellinghamov broj 5 postao je jedan od najprodavanijih u Madridu. Ako tražiš dres za dijete ili sebe, ovdje su sve njegove varijante koje trenutačno nudimo, s jasnim veličinama i stanjem.",
    filter: playerNameIncludes("bellingham")
  },
  {
    slug: "haaland-kane",
    label: "Kane dresovi",
    heading: "Kane dresovi",
    title: "Kane dresovi — od 20€",
    description: "Harry Kane dresovi za Bayern München i Englesku — crveni domaći Bayern i engleski bijeli i ljubičasti model. Od 20 €, pouzećem, dostava 2–5 dana.",
    intro:
      "Kane je nosilac napada Bayerna, a njegov dres je čest izbor za darove navijačima Bundeslige. Ovdje su njegove trenutačne varijante, uključujući crvene domaće komplete.",
    filter: playerNameIncludes("kane")
  },
  {
    slug: "raphinha",
    label: "Raphinha dresovi",
    heading: "Raphinha dresovi",
    title: "Raphinha dresovi — od 20€",
    description: "Raphinha dresovi za Barcelonu — domaći CL, crni i zeleni SE model s brojem 11. Dječje i odrasle veličine, od 20 €, plaćanje pouzećem.",
    intro:
      "Raphinha je u zadnjim sezonama izbio u prvi plan Barcelone i njegov broj 11 sve se češće traži. Skupili smo crne, zelene i domaće varijante da lakše usporediš prije narudžbe.",
    filter: playerNameIncludes("raphinha")
  },
  {
    slug: "sesko",
    label: "Šeško dresovi",
    heading: "Šeško dresovi",
    title: "Šeško dresovi — od 20€",
    description: "Benjamin Šeško dresovi — Manchester United, u dječjim i odraslim veličinama. Od 20 €, plaćanje pouzećem i dostava 2–5 dana po cijeloj Hrvatskoj.",
    intro:
      "Šeško je jedno od najzanimljivijih imena regije i njegov prelazak u Premier ligu podigao je potražnju za dresom. Ovdje su varijante koje držimo, u dječjim i odraslim veličinama.",
    filter: playerNameIncludes("sesko", "šeško")
  },
  {
    slug: "dzeko",
    label: "Džeko dresovi",
    heading: "Džeko dresovi",
    title: "Džeko dresovi — od 20€",
    description: "Edin Džeko dresovi — reprezentacija BiH s brojem 9, uključujući izdanje za SP 2026. Dječje i odrasle veličine, od 20 €, plaćanje pouzećem.",
    intro:
      "Džeko je i dalje najpoznatije ime bosanskohercegovačkog nogometa, a njegov dres je stalno tražen i u Hrvatskoj. Ovdje su reprezentativne varijante s njegovim imenom i brojem.",
    filter: playerNameIncludes("dzeko", "džeko")
  },
  {
    slug: "wirtz",
    label: "Wirtz dresovi",
    heading: "Wirtz dresovi",
    title: "Wirtz dresovi — od 20€",
    description: "Florian Wirtz dresovi za Njemačku — domaći bijeli, tamnoplavi 2026 i komplet. Od 20 €, plaćanje pouzećem, dostava 2–5 dana po cijeloj Hrvatskoj.",
    intro:
      "Wirtz je nositelj nove generacije njemačke reprezentacije i njegov dres je čest izbor mlađih navijača. Na ovoj stranici su njegove varijante s dostupnim veličinama.",
    filter: playerNameIncludes("wirtz")
  },
  {
    slug: "doue",
    label: "Doué dresovi",
    heading: "Doué dresovi",
    title: "Doué dresovi — od 20€",
    description: "Désiré Doué dresovi za PSG — novi domaći 2026/27, bijeli i crni SE model s brojem 14. Dječje i odrasle veličine, od 20 €, plaćanje pouzećem.",
    intro:
      "Doué je nakon sjajne sezone u PSG-u postao jedno od traženijih imena kod mlađih kupaca. Ovdje su njegove varijante koje trenutačno nudimo.",
    filter: playerNameIncludes("doue", "doué")
  },
  {
    slug: "suarez",
    label: "Suárez dresovi",
    heading: "Suárez dresovi",
    title: "Suárez dresovi — od 20€",
    description: "Luis Suárez dresovi za Inter Miami — rozi domaći i crni gostujući model. Od 20 €, plaćanje pouzećem i dostava 2–5 dana po cijeloj Hrvatskoj.",
    intro:
      "Suárez je uz Messija dio Inter Miami priče. Ovdje su njegovi dresovi, uključujući rozi domaći koji se najčešće traži i crni gostujući.",
    filter: playerNameIncludes("suarez", "suárez")
  },
  {
    slug: "pele",
    label: "Pelé dresovi",
    heading: "Pelé dresovi",
    title: "Pelé dresovi — od 20€",
    description: "Pelé dresovi — brazilski dres s brojem 10 u posebnom Jesus izdanju, za kolekcionare i poklon. Od 20 €, plaćanje pouzećem, dostava 2–5 dana.",
    intro:
      "Pelé je vječno ime brazilskog nogometa i njegov retro dres je čest poklon starijim navijačima i kolekcionarima. Ovdje su klasične varijante koje držimo.",
    filter: playerNameIncludes("pele", "pelé")
  },
  {
    slug: "bajraktarevic",
    label: "Bajraktarević dresovi",
    heading: "Bajraktarević dresovi",
    title: "Bajraktarević dres BiH — od 20€",
    description: "Bajraktarević dres BiH s brojem 10 — reprezentativni dres za djecu i odrasle, od 20 €. Dostava 2–5 dana po Hrvatskoj, plaćanje pouzećem.",
    intro:
      "Mlada snaga bosanskohercegovačke reprezentacije sve se češće traži uz Džeku. Ovdje su njegove reprezentativne varijante s dostupnim veličinama.",
    filter: playerNameIncludes("bajraktarevic", "bajraktarević")
  },
  {
    slug: "messi",
    label: "Messi dresovi",
    heading: "Messi dresovi",
    title: "Messi dresovi — od 20€",
    description:
      "Messi dresovi iz Argentine, Barcelone i Inter Miamija za kupce koji traže najprepoznatljiviji igrački katalog na jednom mjestu.",
    intro:
      "Messi je jedan od najtraženijih igrača, pa su ovdje svi njegovi modeli na jednom mjestu: Argentina, Barcelona klasici i rozi Inter Miami dres.",
    relatedPosts: ["messi-dres-koji-odabrati"],
    filter: playerNameIncludes("messi")
  },
  {
    slug: "ronaldo",
    label: "Ronaldo dresovi",
    heading: "Ronaldo dresovi",
    title: "Ronaldo dresovi — Al-Nassr, Real, United, Portugal",
    description:
      "Ronaldo dres iz Al-Nassra, Reala, Manchester Uniteda i Portugala — dječje i odrasle veličine, od 20 €, dostava pouzećem 2–5 dana.",
    intro:
      "Kad biraš Ronaldov dres, obično želiš usporediti klubove i reprezentaciju. Zato su ovdje sve njegove najpoznatije varijante na jednom mjestu.",
    relatedPosts: ["ronaldo-dres-koji-odabrati"],
    filter: playerNameIncludes("ronaldo")
  },
  {
    slug: "neymar",
    label: "Neymar dresovi",
    heading: "Neymar dresovi",
    title: "Neymar dresovi — od 20€",
    description:
      "Neymar dresovi iz Brazila, Santosa, Barcelone i PSG-a na jednom mjestu — posebne boje i retro modeli od 20 €, plaćanje pouzećem.",
    intro:
      "Neymar modeli dobro prolaze kod kupaca koji vole posebna izdanja, jače boje i dres koji se odmah primijeti. Ovdje su i reprezentativni i klupski modeli koje navijači najčešće naručuju.",
    filter: playerNameIncludes("neymar")
  },
  {
    slug: "yamal",
    label: "Yamal dresovi",
    heading: "Yamal dresovi",
    title: "Yamal dresovi — FC Barcelona i Španjolska",
    description:
      "Lamine Yamal dres — FC Barcelona i Španjolska, domaće, šarene i posebne varijante. Dječje i odrasle veličine, od 20 €, dostava 2–5 dana.",
    intro:
      "Yamal je jedan od najtraženijih novih igrača, posebno kod djece i mlađih navijača. Ovdje su svi njegovi modeli, od domaćeg do posebnih boja.",
    relatedPosts: ["sp-2026-spanjolska-prvak-dresovi", "barcelona-dresovi-koji-model-odabrati"],
    filter: playerNameIncludes("yamal")
  },
  {
    slug: "modric",
    label: "Modrić dresovi",
    heading: "Modrić dresovi",
    title: "Modrić dresovi — od 20€",
    description:
      "Modrić dresovi Hrvatske i AC Milana — kockasti domaći, plavi 2026 i komplet. Dječje i odrasle veličine, od 20 €, plaćanje pouzećem.",
    intro:
      "Modrić je najtraženiji igrač kod nas i jedan od najdražih poklona za male i velike navijače. Ovdje su svi njegovi dostupni modeli na jednom mjestu.",
    relatedPosts: ["dresovi-hrvatske-reprezentacije-kockasti-ponos"],
    filter: playerNameIncludes("modric")
  },
  {
    slug: "ronaldinho",
    label: "Ronaldinho dresovi",
    heading: "Ronaldinho dresovi",
    title: "Ronaldinho dresovi — od 20€",
    description:
      "Ronaldinho dresovi iz Barcelone, Brazila, PSG-a i Milana za sve koji vole retro i dres koji se nosi i van terena. Od 20 €, plaćanje pouzećem.",
    intro:
      "Ronaldinho komadi spajaju retro nogometnu kulturu i jak modni karakter. Zato su svi njegovi modeli ovdje, na jednom mjestu.",
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

// Obrnuta veza blog → landing: sve klupske, igračke i kategorijske kolekcije
// koje u relatedPosts navode ovaj članak (samo one koje stvarno imaju proizvode).
export async function getCollectionsForBlogPost(postSlug: string): Promise<JerseyCollection[]> {
  const [clubs, players, categories] = await Promise.all([
    getJerseyClubCollections(),
    getJerseyPlayerCollections(),
    getJerseyCategoryCollections()
  ]);
  return [...clubs, ...players, ...categories].filter((collection) =>
    collection.relatedPosts?.includes(postSlug)
  );
}
