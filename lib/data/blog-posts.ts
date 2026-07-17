import { estimateReadingTime } from "@/lib/utils";

export type BlogPost = {
  slug: string;
  title: string;
  description: string;
  publishedAt: string;
  paragraphs: string[];
  relatedSlugs: string[];
};

export const blogPosts: BlogPost[] = [
  {
    slug: "najljepsi-dresovi-2026",
    title: "Najljepši nogometni dresovi za 2026.",
    description:
      "Pregled najljepših i najtraženijih nogometnih dresova za 2026. — od reprezentativnih klasika do najnovijih klupskih modela.",
    publishedAt: "2026-06-10",
    relatedSlugs: ["hrvatska-modric-2026", "real-mbappe-2526", "barcelona-yamal-domaci"],
    paragraphs: [
      "Svaka nova sezona donosi val novih dizajna, a 2026. je posebno jaka godina za nogometne dresove. Reprezentacije su osvježile svoje komplete uoči velikih natjecanja, a klubovi su izbacili modele koji spajaju tradiciju i moderan kroj. Ako biraš dres koji će izgledati jednako dobro na tribini i u gradu, ovo je sezona u kojoj imaš puno odličnih opcija. U ovom pregledu izdvajamo modele koji se najviše traže i koji najbolje stoje i djeci i odraslima.",
      "Na vrhu liste je Hrvatska Modrić 2026 — dres koji je apsolutni hit kod nas. Spaja prepoznatljivi kockasti identitet reprezentacije i ime igrača koji je obilježio cijelu generaciju. Uz njega, najnoviji Real Madrid Mbappé model privlači sve koji prate Ligu prvaka, dok Barcelona Yamal domaći dres nosi onaj svjež, mladenački karakter nove ere katalonskog kluba. Ovi modeli najbrže odlaze čim nova tura stigne, pa se isplati ne čekati predugo.",
      "Za one koji vole nešto drukčije, tu su i statement modeli u posebnim bojama i retro reizdanja koja se ne viđaju svaki dan. Dobar dres ne mora pratiti samo trenutni rezultat kluba — često najbolje stoje upravo oni komadi koji nose priču ili neobičnu kombinaciju boja. Kod odabira vodi se onime što tebi budi reakciju čim ga vidiš, jer takav dres ćeš stvarno nositi, a ne ostaviti u ormaru.",
      "Bez obzira koji model odabereš, svi naši dresovi dolaze s ušivenim imenom i brojem igrača, dostupni su za djecu (s hlačicama) i odrasle, a dostava ide po cijeloj Hrvatskoj uz plaćanje pouzećem. Ako nisi siguran koji model ili veličinu uzeti, javi nam se na WhatsApp i rado ćemo ti pomoći oko odabira. Nova sezona je prava prilika da osvježiš kolekciju komadom koji izgleda kao da znaš što nosiš.",
    ],
  },
  {
    slug: "dres-ili-komplet-za-dijete",
    title: "Dres ili komplet za dijete — što odabrati?",
    description:
      "Usporedba dječjeg dresa i kompleta (dres + hlačice + lopta + kapa) uz savjete kako odabrati pravi poklon za malog navijača.",
    publishedAt: "2026-06-14",
    relatedSlugs: ["hrvatska-modric-komplet", "hrvatska-modric-2026", "barcelona-yamal-domaci"],
    paragraphs: [
      "Kad kupuješ dres za dijete, prva dilema je gotovo uvijek ista: uzeti samo dres ili cijeli komplet? Odgovor ovisi o tome za što ti dres treba. Ako dijete već ima hlačice i loptu i samo želi dres svog idola, klasična dječja varijanta dresa s hlačicama je sasvim dovoljna. Ako pak tražiš poklon koji ostavlja dojam — za rođendan, Božić ili kraj sezone — komplet je očiti izbor jer dolazi kao zaokružen paket.",
      "Naš komplet uključuje dres, hlačice, loptu i kapu, sve u jednom paketu po cijeni od 40 €. To je odlična opcija upravo za poklone jer dijete dobije sve što mu treba za igru odmah iz kutije, bez dodatnog kupovanja. Mali navijači posebno vole kad uz dres dobiju i loptu s istim motivom — to čini cijeli poklon puno većim i uzbudljivijim nego sam dres.",
      "Kod veličina vrijedi isto pravilo i za dres i za komplet: ne vodi se godinama nego visinom djeteta. Dječje veličine kreću od 104 pa sve do 176, a ako je dijete između dvije veličine, gotovo uvijek je bolje uzeti veću — dres koji je malo prostraniji nosit će se dulje i ugodniji je za trčanje. Ako nisi siguran, pošalji nam visinu djeteta na WhatsApp i predložit ćemo veličinu koja ima smisla.",
      "Bilo da odabereš samo dres ili cijeli komplet, dostava ide po cijeloj Hrvatskoj uz plaćanje pouzećem, pa ne plaćaš ništa unaprijed. Za poklone s rokom (rođendan, blagdani) javi nam datum na vrijeme i potrudit ćemo se da paket stigne prije. Komplet je najsigurnija opcija kad želiš da poklon izgleda potpuno i da dijete bude oduševljeno čim otvori kutiju.",
    ],
  },
  {
    slug: "top-10-retro-dresova-2025",
    title: "Top 10 retro dresova koje moraš imati u 2025.",
    description:
      "Pregled najlegendarnijih retro nogometnih dresova koji i dalje nose karakter, priču i ogroman streetwear potencijal.",
    publishedAt: "2025-01-14",
    relatedSlugs: [
      "barcelona-messi-cl-berlin",
      "real-bellingham",
      "francuska-zidane-sp1998"
    ],
    paragraphs: [
      "Retro dresovi odavno nisu samo navijački komad. Oni su dio nogometne kulture, streetwear scene i osobnog stava. U 2025. najjači modeli nisu nužno najnoviji, nego oni koji nose trenutak, priču i prepoznatljivu siluetu čim ih vidiš na ulici. Ako slažeš kolekciju koja izgleda ozbiljno, a ne nasumično, kreni od komada koji su obilježili eru: Barcelona 2006 s Ronaldinhom, Francuska 1998 sa Zidaneom i Brazil 2002 stil koji i danas izgleda jednako moćno kao na starim snimkama Svjetskog prvenstva.",
      "Na vrhu liste su modeli koji spajaju emociju i dizajn. Real Madrid CL finale iz ere Ramosa i Ronalda donosi onu čistu, pobjedničku estetiku koja nikad ne izlazi iz mode. Barcelona Messi Berlin 2015 ima kultni status jer podsjeća na jedan od vrhunaca moderne tiki-take. Brazil Ronaldinho žuti SP i R.Carlos retro žuti imaju onu sirovu energiju reprezentacijskog nogometa iz vremena kada su dresovi izgledali odvažnije, a igrači imali upečatljiviji vizualni identitet nego danas.",
      "Vrijedi gledati i manje očekivane klasike. PSG Ronaldinho Thomson retro savršen je za nekoga tko želi nešto rjeđe, dok Manchester United Ronaldo UCL u crvenoj ili crnoj varijanti spaja kultnog igrača i europsku priču. FC Barcelona Kappa retro i Rivaldo retro nose staru školu s jačim modnim karakterom, pogotovo kada se nose uz cargo hlače, traper ili laganu jaknu. Dobar retro dres mora funkcionirati i na tribini i u gradu, a upravo ti modeli to rade najbolje.",
      "Ako biraš samo jedan komad, uzmi onaj koji ti i danas budi reakciju čim ga vidiš. Ako slažeš više njih, ciljaj ravnotežu: jedan reprezentativni klasik, jedan klupski europski komad i jedan statement dres koji se ne viđa stalno. Tako kolekcija ne izgleda kao da si kupovao po algoritmu, nego kao da stvarno znaš što nosiš. U našoj ponudi zato uvijek držimo mix sigurnih klasika i jačih retro komada koji se brzo rasprodaju čim nova tura stigne."
    ]
  },
  {
    slug: "kako-odabrati-velicinu-dresa-za-dijete",
    title: "Kako odabrati pravu veličinu dresa za dijete?",
    description:
      "Jednostavan vodič za odabir dječje veličine nogometnog dresa uz praktične mjere i savjete za sigurniju kupnju.",
    publishedAt: "2025-02-04",
    relatedSlugs: [
      "hrvatska-modric-2026",
      "barcelona-yamal-domaci",
      "argentina-messi-retro"
    ],
    paragraphs: [
      "Odabir veličine za dječji dres najčešće je razlika između poklona koji se nosi svaki tjedan i komada koji ostane u ormaru. Najbolji pristup nije pogađanje po godinama, nego kratko mjerenje kod kuće. Uzmi omiljenu majicu koja djetetu trenutno dobro stoji, raširi je na ravnu podlogu i izmjeri širinu ispod pazuha te duljinu od ramena do donjeg ruba. Kod kompleta pogledaj i duljinu hlačica ako naručuješ dječju varijantu. Te dvije mjere obično su dovoljne da odabereš puno sigurnije nego samo prema dobi.",
      "Naša dječja ponuda pokriva veličine 116, 128, 140, 152, 164 i 176. Veličina 116 obično odgovara sitnijoj djeci i ranijim razredima, 128 i 140 su najčešći izbor za osnovnu školu, dok 152, 164 i 176 bolje odgovaraju starijoj djeci i višim klincima koji vole malo komotniji fit. Ako je dijete između dvije veličine, preporuka je uzeti veću opciju. Dres mora ostaviti mjesta za pokret, majicu ispod i malo rezerve kako bi trajao više od jedne sezone.",
      "Bitno je uzeti u obzir i naviku nošenja. Neka djeca vole uži sportski osjećaj, dok druga žele da dres pada opuštenije, pogotovo ako ga nose i u školu, na igralište ili preko trenirke. Ako kupuješ za poklon i ne možeš izmjeriti, pošalji nam visinu i dob djeteta, a još bolje i fotografiju postojećeg dresa koji mu dobro stoji. Tako možemo predložiti veličinu s puno više sigurnosti nego da se vodiš samo općim tablicama s interneta.",
      "Najsigurnija kombinacija je kratka poruka s tri podatka: visina djeteta, okvirna građa i veličina dresa koji već nosi. Tada možemo usporediti i preporučiti najbolju opciju prije slanja. To je posebno korisno kod popularnih modela koji brzo nestanu, poput Hrvatske, Barcelone ili Argentine za djecu. Cilj nije samo da dres stigne brzo, nego da stigne spreman za nošenje odmah prvi dan."
    ]
  },
  {
    slug: "ronaldo-dres-koji-odabrati",
    title: "Ronaldo dres — koja izdanja su najtraženija i kako odabrati",
    description:
      "Pregled najpopularnijih Ronaldo dresova od Manchestera do Al-Nassra: koji modeli imaju najveći karakter i zašto su uvijek prvi na listi.",
    publishedAt: "2025-04-02",
    relatedSlugs: [
      "manutd-ronaldo-crveni-ucl",
      "manutd-ronaldo-crveni-ucl",
      "real-ronaldo-2014"
    ],
    paragraphs: [
      "Ronaldo dres jedna je od najtraženijih pretraga kada govorimo o nogometnim dresovima u Hrvatskoj i regiji. Razlog je jednostavan: Ronaldo je kroz karijeru nosio dresove koji su postali ikone, a svaki od njih nosi drugačiju priču i vizualni identitet. Kada birate koji Ronaldo dres kupiti, ključno pitanje nije koji je najnoviji, nego koji vam nosi najveći naboj. Trenutni Al-Nassr žuti dres privlači pažnju zbog atipičnog kluba i upečatljive boje, dok su Manchester United i Real Madrid modeli klasici koji nikad ne izgledaju zastarjelo.",
      "Manchester United CL dresovi u crvenoj i crnoj varijanti najprodavaniji su Ronaldo modeli u našoj ponudi. Crna UCL verzija posebno je tražena jer je rjeđa i odmah se ističe, dok crvena donosi onu klasičnu United energiju koja stoji uz naziv Ronaldo već od njegovih prvih europskih nastupa. Real Madrid Ronaldo dresovi, posebno bijela CL varijanta i ljubičasti gostujući model, imaju jaku publiku koja veže njegovo ime uz razdoblje dominacije u Europi. Balmain x Real Madrid specijal ide korak dalje i spaja football i fashion na način koji malo koji dres može.",
      "Ako kupujete Ronaldo dres kao poklon, najsigurniji izbor je Manchester United ili Real Madrid model — prepoznatljivi su svima, bez obzira na to prate li aktivno football. Za nekoga tko želi nešto upečatljivije i rjeđe, Al-Nassr žuti dres s Ronaldovim imenom i brojem je statement komad koji se neće vidjeti na svakom uglu. Kod izbora veličine vrijedi uzeti u obzir kako osoba voli nositi dres: sportski prilegnut ili opuštenije, uz hlače i jaknu. Obje opcije rade, ali veličina utječe na to kako komad izgleda u oba slučaja.",
      "Kod nas dresovi dolaze s imenom i brojem igrača već ušivenim, a ne tiskanim, što znači bolju trajnost i autentičniji izgled. Ronaldo dresovi uvijek se brzo rasprodaju jer ima puno generacija kupaca koje ga prate: od onih koji su gledali United 2008 do novih fanova koji ga prate od Saudijske Arabije. Ako vidite model koji vam odgovara, ne vrijedi čekati jer se upravo ti komadi nađu na popisu zadnjih dostupnih čim dođe nova tura. Sve Ronaldo modele možete pregledati u katalogu i odmah provjeriti dostupnost."
    ]
  },
  {
    slug: "messi-dres-koji-odabrati",
    title: "Messi dres — od Argentine do Barcelone, koji model kupiti",
    description:
      "Vodič kroz najpopularnije Messi dresove: SP 2022, Barcelona klasici i crni Inter Miami — što svaki model predstavlja i kome odgovara.",
    publishedAt: "2025-04-10",
    relatedSlugs: [
      "argentina-messi-retro",
      "argentina-messi-retro",
      "barcelona-messi-cl-berlin"
    ],
    paragraphs: [
      "Messi dres posebna je kategorija za sebe. Nitko drugi nije prošao kroz toliko ikoničnih dresova u jednoj karijeri, i svaki od njih ima jasnu priču i vizualni identitet koji ga razlikuje od ostalih. Kada tražite koji Messi dres kupiti u Hrvatskoj, ponuda je danas šira nego ikad: Argentina SP 2022 u plavoj prugastoj kombinaciji, crna gostujuća verzija, Barcelona CL Berlin model iz 2015, retro Barça dresovi iz Ronaldinhove ere i Inter Miami rozo-bijela kombinacija koja je postala hit odmah po dolasku u MLS.",
      "Argentina SP 2022 model najprodavaniji je Messi dres u našoj ponudi i jedan od najprodavanijih dresova općenito. Razlog je direktan: to je dres u kojem je Messi napokon podigao trofej koji mu je nedostajao, a plava prugasta kombinacija izgleda jednako dobro na terenu i na ulici. Crna Argentina gostujuća verzija ide korak dalje u modernom smjeru i tražena je od kupaca koji žele nešto mračnije i rjeđe od standardnog modela. Obje varijante imaju gotovo identičnu tražnju, a česta je i narudžba jedne i druge u istoj poruci.",
      "Barcelona Messi CL Berlin model iz 2015. klasičan je izbor za one koji žele dresove koji podsjećaju na vrhunac klupske karijere. Barcelona Ronaldinho retro i Neymar retro Qatar modeli uz Messijevo ime su rjeđe kombinacije, ali upravo zato privlače kupce koji slažu ozbiljniju kolekciju i ne žele imati isti komad kao svi ostali. Inter Miami pink model brzo je ušao u kategoriju prepoznatljivih dresova čim je Messi počeo igrati u MLS, a tražen je i kod onih koji uopće ne prate MLS ali znaju tko je Messi.",
      "Za poklon je najsigurniji izbor Argentina SP 2022 — prepoznaju ga svi, od djece do odraslih, a plava pruga i zlatni detalji izgledaju vrhunski čak i van konteksta sporta. Ako kupujete za nekoga tko aktivno prati football i već ima standardne modele, crna Argentina ili Barcelona Berlin model će izazvati jaču reakciju. Sve Messi modele možete provjeriti u katalogu, a ako niste sigurni koji odabrati, pošaljite nam poruku na WhatsApp i preporučit ćemo što najviše odgovara osobi za koju kupujete."
    ]
  },
  {
    slug: "najtrazenji-dresovi-sezone",
    title: "Najtraženiji dresovi ove sezone — što kupci biraju",
    description:
      "Pregled modela koji se najbrže prodaju: od novih hitova do retro klasika koje kupci stalno traže.",
    publishedAt: "2025-03-12",
    relatedSlugs: [
      "real-mbappe-2526",
      "barcelona-yamal-domaci",
      "hrvatska-modric-2026"
    ],
    paragraphs: [
      "Svaka sezona ima nekoliko modela koji iskaču odmah, ali pravi signal dolazi tek kad vidiš što ljudi stvarno traže u porukama. Kod nas se najviše izdvajaju tri smjera: veliki europski klubovi, reprezentacije s jakim identitetom i retro modeli koji imaju veću priču od trenutne forme na terenu. Ove sezone Real Madrid, Barcelona i Hrvatska drže vrh interesa gotovo stalno, dok Brazil i Argentina ulaze u svaku jaču turu narudžbi čim objavimo nove komade na Instagramu.",
      "Real Madrid Mbappé 25/26 i Arda Güler modeli traženi su zato što kupci žele nešto aktualno, nosivo i odmah prepoznatljivo. S druge strane, Ronaldo CL finale varijante imaju publiku koja traži dres s karakterom i uspomenom, a ne samo novim rosterom. Kod Barcelone je Yamal trenutno među najjačim imenima, posebno domaća i šarena izdanja, dok Ronaldinho i Messi Berlin retro i dalje prodajemo ljudima koji žele sigurni klasik. To je dobar pokazatelj da kupci ne biraju samo prema trendu, nego i prema emociji.",
      "U reprezentacijskom segmentu Hrvatska Modrić u bijeloj i plavoj verziji ima konstantnu potražnju tijekom cijele godine. Brazil Neymar posebna izdanja i Ronaldinho retro modeli također se brzo okreću jer dobro prolaze i kod mlađih kupaca i kod onih koji kupuju poklon. Argentina Messi SP 2022 ostaje evergreen jer spaja svježu povijest i ogromnu prepoznatljivost. Ako netko želi jedan siguran dres koji će izazvati reakciju čim ga izvadi iz vrećice, to je i dalje jedan od najsigurnijih odabira.",
      "Najzanimljivije je to što se najbrže prodaju modeli koji imaju jasan identitet: posebna boja, poznati igrač ili retro kontekst. Kupci danas žele komad koji izgleda dobro na slici, ali i uživo, u gradu, na tribini ili kao poklon. Zato u svakom dropu držimo miks novih hitova i kultnih klasika. Ako loviš model koji je trenutno vruć, nemoj čekati predugo jer se upravo ti dresovi najčešće prvi spuste na zadnjih nekoliko komada."
    ]
  }
  ,{
    slug: "gdje-kupiti-nogometni-dres-online-hrvatska",
    title: "Gdje kupiti nogometni dres online u Hrvatskoj — sve što trebaš znati",
    description:
      "Kako naručiti kvalitetan nogometni dres online u Hrvatskoj: dostava, plaćanje pouzećem, veličine i što provjeriti prije narudžbe.",
    publishedAt: "2025-04-20",
    relatedSlugs: [
      "real-mbappe-2526",
      "hrvatska-modric-2026",
      "barcelona-yamal-domaci"
    ],
    paragraphs: [
      "Kupovina nogometnog dresa online u Hrvatskoj postala je standard, ali razlike između ponuda su ogromne. Ključna pitanja su uvijek ista: je li dres kvalitetan, kolika je dostava, kako ide veličina i što ako nešto nije u redu? Kod Dresifyja svaki dres dolazi s jasnom cijenom od 20€, ušivenim imenom i brojem igrača, a dostava ide GLS kurirskom službom na cijelo područje Hrvatske uz plaćanje pouzećem. To znači da ne plaćate unaprijed — platite vozaču pri preuzimanju, bez skrivenih troškova ili pretplate.",
      "Proces narudžbe je namjerno jednostavan: izaberete dres iz kataloga, dodate ga u košaricu, popunite ime, adresu i broj telefona, i potvrdite narudžbu. Naš tim provjerava dostupnost i potvrđuje svaku narudžbu osobno u roku sat vremena, najčešće putem WhatsApp poruke. Ako veličine nema ili je nešto nejasno oko modela, javimo se odmah i predložimo alternativu. Cilj nije samo poslati paket, nego da dres stigne točno onakav kakvog ste naručili i u veličini koja odgovara.",
      "Dostava ide po cijeloj Hrvatskoj i iznosi 7,00 € uz GLS uslugu s plaćanjem pouzećem. Rok isporuke je 2 do 5 radnih dana od potvrde narudžbe, a pratimo svaki paket do preuzimanja. Ako naručujete za posebnu prigodu — rođendan, poklon, natjecanje — javite nam rok i pokušat ćemo ga ispoštovati. U većini slučajeva to nije problem ako narudžba stigne dovoljno rano.",
      "Najčešće pitanje koje dobivamo je kako odabrati pravu veličinu. Odgovor je uvijek isti: ne vodite se godinama nego mjerama. Izmjerite širinu ramena ili se oslonite na majicu koja vam trenutno dobro odgovara. Dječje veličine idu od 116 do 176, odrasle od S do XL. Ako niste sigurni, pošaljite visinu i okvirnu građu na WhatsApp i predložit ćemo veličinu koja ima smisla za konkretan model koji ste odabrali. Bolje je pitati nego čekati na dostavu i otkriti da ne odgovara."
    ]
  },
  {
    slug: "streetwear-kompleti-kako-nositi",
    title: "Streetwear kompleti — kako ih nositi i zašto su postali hit",
    description:
      "Vodič kroz streetwear komplete: kako složiti ulični look s majicom i hlačicama, uz koje tenisice i za koje prilike najbolje stoje.",
    publishedAt: "2026-07-08",
    relatedSlugs: ["graffiti-black-set", "cotton-wreath-white-set", "cloud-black-set"],
    paragraphs: [
      "Streetwear komplet — majica i hlačice u istom stilu — postao je jedan od najlakših načina da izgledaš sređeno bez imalo truda. Umjesto da sam slažeš gornji i donji dio i pogađaš pašu li boje, dobiješ zaokružen look koji radi odmah iz vrećice. Upravo zato su ovi kompleti eksplodirali: mladi kupci žele nešto što izgleda dobro na priči, ali i uživo, u gradu, na kavi ili na druženju s ekipom. Kod nas su svi kompleti u uličnom stilu, s modernim, malo opuštenijim krojem koji odgovara današnjoj streetwear estetici.",
      "Najsigurniji način da nosiš komplet je da ga pustiš da bude glavni komad, a sve ostalo držiš jednostavnim. Uz njega idu čiste tenisice — bijele patike gotovo uvijek rade, a ako je komplet u jačoj boji, crne ili neutralne tenisice ga smire. Dodaj jednostavan lanac, kapu ili crossbody torbicu i look je gotov. Izbjegavaj miješati previše uzoraka: kod streetweara manje je više, a komplet sam po sebi već nosi dovoljno karaktera da ne treba dodatno natrpavati.",
      "Kompleti u neutralnim tonovima — crna, siva, bijela, maslinasta — najlakši su za kombiniranje i nose se cijele godine, pa su odličan prvi izbor ako tek ulaziš u streetwear. Jače boje poput plave, roze ili šarenih grafika su statement komadi: nose se kad želiš da te se primijeti i kad ti je look sam sebi dovoljan. Dobar trik je imati jedan neutralni komplet za svaki dan i jedan izraženiji za izlaske — tako pokriješ i opušteni i 'sređeni' streetwear.",
      "Svi naši streetwear kompleti dolaze u veličinama XS, S, M i L za odrasle, uz besplatnu dostavu i plaćanje pouzećem po cijeloj Hrvatskoj — ne plaćaš ništa unaprijed. Ako nisi siguran koja veličina ti odgovara ili kako složiti look, javi nam se na WhatsApp i rado pomognemo. Streetwear je na kraju o samopouzdanju: uzmi komad koji ti se sviđa čim ga vidiš, obuci ga i nosi kako tebi paše."
    ]
  },
  {
    slug: "kako-odabrati-streetwear-komplet",
    title: "Kako odabrati streetwear komplet — veličina, materijal i stil",
    description:
      "Praktičan vodič za odabir streetwear kompleta: kako pogoditi veličinu XS–L, na što paziti kod materijala i kroja te koji stil odgovara tebi.",
    publishedAt: "2026-07-10",
    relatedSlugs: ["graffiti-grey-set", "cotton-wreath-olive-set", "cloud-royal-blue-set"],
    paragraphs: [
      "Kod odabira streetwear kompleta tri stvari odlučuju hoćeš li ga stvarno nositi: veličina, materijal i stil. Za razliku od dresa, streetwear se najčešće nosi malo opuštenije, pa je pametno prvo odlučiti kakav fit voliš — priljubljeniji ili komotniji. Naši kompleti dolaze u veličinama XS, S, M i L za odrasle, a kroj je moderan i blago opušten, baš kako streetwear i treba stajati. Ako si između dvije veličine i voliš komotnije, uzmi veću; ako voliš čišću, uredniju liniju, ostani na svojoj standardnoj.",
      "Najbolji način da pogodiš veličinu je da ne pogađaš. Uzmi majicu koja ti trenutno dobro stoji, raširi je na ravnu podlogu i izmjeri širinu ispod pazuha i duljinu od ramena do ruba. Kod hlačica provjeri opseg struka i duljinu nogavice na komadu koji ti odgovara. Te mjere reci nam u poruci i točno ćemo ti reći koja veličina odgovara konkretnom modelu. To je puno sigurnije nego se voditi samo osjećajem ili općim tablicama s interneta.",
      "Materijal i kroj su ono što razlikuje komplet koji nosiš stalno od onog koji ostane u ormaru. Traži gušći, mekan pamuk koji drži oblik i ne izgleda tanko nakon par pranja — takav materijal je ugodan na koži i daje onaj 'premium' osjećaj koji se odmah primijeti. Kod kroja pazi da hlačice imaju dobar pad i da majica nije ni prekratka ni prevelika. Naši kompleti su rađeni upravo s tim balansom na umu: udobni za cijeli dan, a dovoljno uredni da izgledaju namjerno, a ne nabacano.",
      "Na kraju, stil biraj prema sebi, ne prema trendu. Ako želiš nešto što ide uz sve i nosi se cijelu godinu, kreni od neutralnih boja. Ako želiš da komad bude glavni na looku, uzmi jaču boju ili grafiku. Svi kompleti idu uz besplatnu dostavu i plaćanje pouzećem po cijeloj Hrvatskoj, a ako ti treba pomoć oko veličine ili odabira, javi se na WhatsApp — predložit ćemo ti model i veličinu koja ima smisla za tebe."
    ]
  }
];

export function getBlogPostBySlug(slug: string) {
  return blogPosts.find((post) => post.slug === slug);
}

export function getBlogReadingTime(post: BlogPost) {
  return estimateReadingTime(post.paragraphs.join(" "));
}
