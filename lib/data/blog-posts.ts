import { estimateReadingTime } from "@/lib/utils";

// Tekst u paragraphs/sections/faq smije sadržavati interne linkove u obliku
// [tekst linka](/putanja/) — stranica članka ih pretvara u <Link>. Samo interne
// putanje (počinju s "/"), uvijek s kosom crtom na kraju (trailingSlash).
export type BlogSubsection = { h3: string; paragraphs: string[]; list?: string[] };
export type BlogSection = {
  h2: string;
  paragraphs?: string[];
  // Kratka lista (npr. tablica veličina) prikazana kao <ul> ispod odlomaka.
  list?: string[];
  subsections?: BlogSubsection[];
};
export type BlogFaqItem = { q: string; a: string };

export type BlogPost = {
  slug: string;
  title: string;
  description: string;
  publishedAt: string;
  // Datum zadnje stvarne izmjene sadržaja (YYYY-MM-DD) → dateModified i sitemap lastmod.
  updatedAt?: string;
  // Slika članka (lokalna putanja ili apsolutni URL) za schema.org; zadano OG banner.
  image?: string;
  // Uvodni odlomci (prikazuju se prije H2 sekcija).
  paragraphs: string[];
  // Strukturirani sadržaj članka (H2/H3) — za duže vodiče.
  sections?: BlogSection[];
  // Vidljiva česta pitanja na dnu članka (bez FAQPage sheme).
  faq?: BlogFaqItem[];
  relatedSlugs: string[];
};

export const blogPosts: BlogPost[] = [
  {
    slug: "najljepsi-dresovi-2026",
    title: "Najljepši nogometni dresovi za 2026.",
    description:
      "Pregled najljepših i najtraženijih nogometnih dresova za 2026. — od reprezentativnih klasika do najnovijih klupskih modela.",
    publishedAt: "2026-06-10",
    relatedSlugs: ["hrvatska-modric-2026", "real-madrid-mbappe-nr10-bijeli-2026-27", "barcelona-yamal-domaci"],
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
    title: "Top 10 retro dresova koje moraš imati",
    description:
      "Deset retro nogometnih dresova s pričom: Zidane 1998, Ronaldinho, Messi Berlin 2015, Ronaldo R9, Ramos Kijev 2018 i drugi. Kako odabrati, nositi i održavati retro dres.",
    publishedAt: "2025-01-14",
    updatedAt: "2026-11-16",
    relatedSlugs: [
      "francuska-zidane-sp1998",
      "barcelona-messi-cl-berlin",
      "real-ramos-2018-cl",
      "barcelona-ronaldo-r9"
    ],
    paragraphs: [
      "Retro dres nije samo stara sezona. To je dres koji te vrati na točno određenu utakmicu, gol ili ljeto kad si gledao prvenstvo. Zato se retro modeli prodaju i dvadeset godina nakon što su prvi put izašli na teren, a mnogi ih nose više u gradu nego na tribini.",
      "Ovdje je deset retro dresova koje vrijedi imati, s kratkom pričom za svaki, pa savjeti kako odabrati veličinu, kako retro dres nositi i kako ga održavati. Sve retro modele na jednom mjestu imaš u kategoriji [retro dresovi](/dresovi/kategorija/retro-dresovi/)."
    ],
    sections: [
      {
        h2: "Zašto su retro dresovi toliko traženi",
        paragraphs: [
          "Novi dres prati trenutnu sezonu, a retro dres nosi uspomenu. Kad netko odabere Zidaneov dres iz 1998. ili Ronaldinhov iz Barcelone, ne bira samo boje nego razdoblje nogometa koje mu je nešto značilo. Uz to, stariji dizajni često su jednostavniji: manje detalja, jače boje, prepoznatljiv ovratnik. Takav dres lako se slaže s trapericama i tenisicama, pa se nosi i izvan stadiona."
        ]
      },
      {
        h2: "Deset retro dresova koje vrijedi imati",
        subsections: [
          {
            h3: "1. Francuska 1998. — Zidane",
            paragraphs: [
              "Francuska je 1998. na domaćem prvenstvu prvi put postala svjetski prvak, a Zidane je u finalu protiv Brazila zabio dva gola glavom. Tamnoplavi dres s brojem 10 jedan je od najprepoznatljivijih reprezentativnih dresova uopće: [Francuska Zidane SP 1998](/dres/francuska-zidane-sp1998/)."
            ]
          },
          {
            h3: "2. Brazil — Ronaldinho u žutom",
            paragraphs: [
              "Žuti brazilski dres poznaje cijeli svijet. Ronaldinho je bio dio momčadi koja je 2002. osvojila peti brazilski naslov svjetskog prvaka, a njegov osmijeh i potezi i danas su sinonim za brazilski stil: [Brazil Ronaldinho žuti SP](/dres/brazil-ronaldinho-zuti-sp/)."
            ]
          },
          {
            h3: "3. Barcelona — Messi, Berlin 2015.",
            paragraphs: [
              "U finalu Lige prvaka u Berlinu 2015. Barcelona je pobijedila Juventus 3:1 i zaokružila jednu od najjačih sezona u povijesti kluba. Za mnoge je to vrhunac Messijeve klupske ere: [Barcelona Messi CL Berlin 2015](/dres/barcelona-messi-cl-berlin/)."
            ]
          },
          {
            h3: "4. Barcelona — Ronaldinho, plavo-bordo",
            paragraphs: [
              "Ronaldinho je u Barceloni igrao od 2003. do 2008. i s klubom 2006. osvojio Ligu prvaka. Klasične plavo-bordo pruge s njegovim imenom izgledaju jednako dobro danas kao tada: [Barcelona Ronaldinho retro](/dres/barcelona-ronaldinho-nr10-retro-plavo-bordo/)."
            ]
          },
          {
            h3: "5. Real Madrid — Ramos, Kijev 2018.",
            paragraphs: [
              "Real Madrid je 2018. u Kijevu pobijedio Liverpool i osvojio treću Ligu prvaka zaredom. Kapetan te momčadi bio je Sergio Ramos: [Real Madrid Ramos 2018 CL Final](/dres/real-ramos-2018-cl/)."
            ]
          },
          {
            h3: "6. Manchester United — Ronaldo, Moskva 2008.",
            paragraphs: [
              "U finalu Lige prvaka 2008. u Moskvi Ronaldo je zabio glavom, a United je nakon jedanaesteraca pobijedio Chelsea. Dres iz tog finala imamo s kratkim rukavima, [Manchester United Ronaldo Moskva 2008](/dres/manchester-united-ronaldo-nr7-final-moscow-2008-retro/), i u verziji [dugih rukava](/dres/manchester-united-ronaldo-nr7-retro-2008-final-moscow/) za hladnije dane. Tu je i [crveni United Ronaldo UCL](/dres/manutd-ronaldo-crveni-ucl/)."
            ]
          },
          {
            h3: "7. Barcelona — Ronaldo R9",
            paragraphs: [
              "Brazilski Ronaldo igrao je za Barcelonu samo jednu sezonu, 1996./97., ali dovoljno da ostane legenda. Dres iz vremena kad je Barcelonine dresove radila Kappa danas je pravi kolekcionarski komad: [Barcelona Ronaldo R9](/dres/barcelona-ronaldo-r9/)."
            ]
          },
          {
            h3: "8. PSG — Ronaldinho",
            paragraphs: [
              "Prije Barcelone Ronaldinho je od 2001. do 2003. igrao u Parizu i tamo pokazao Europi što zna. Ovaj dres je za one koji žele nešto rjeđe od očitih izbora: [PSG Ronaldinho retro](/dres/psg-ronaldinho/)."
            ]
          },
          {
            h3: "9. Brazil — Roberto Carlos",
            paragraphs: [
              "Roberto Carlos, lijevi bek poznat po snažnim slobodnim udarcima, nosio je broj 6 u žutom dresu Brazila. Dres je dobar izbor ako želiš brazilski klasik bez imena koje nose svi: [Brazil R. Carlos SP 2006](/dres/brazil-r-carlos-nr6-zuti-retro-sp-2006/)."
            ]
          },
          {
            h3: "10. Argentina — Messi",
            paragraphs: [
              "Plavo-bijele pruge Argentine i broj 10 ne trebaju objašnjenje. Messi je s Argentinom 2022. u Katru napokon osvojio Svjetsko prvenstvo, pa je retro dres s njegovim imenom i dalje jedan od najsigurnijih poklona: [Argentina Messi retro](/dres/argentina-messi-retro/)."
            ]
          }
        ]
      },
      {
        h2: "Kako odabrati retro dres",
        paragraphs: [
          "Biraj po uspomeni, a ne po trendu. Uzmi igrača ili utakmicu koju pamtiš, jer takav dres ćeš stvarno nositi. Ako kupuješ poklon, razmisli koga je ta osoba gledala kad je počela pratiti nogomet: nekome je to Zidane, nekome Ronaldinho, a mlađima Messi u Barceloni.",
          "Ako slažeš malu kolekciju, dobra kombinacija je jedan reprezentativni klasik, jedan klupski dres iz finala Lige prvaka i jedan rjeđi komad, poput PSG-a s Ronaldinhom. Više modela pojedinih igrača imaš na stranicama [Ronaldinho dresovi](/dresovi/igrac/ronaldinho/), [Messi dresovi](/dresovi/igrac/messi/) i [Ronaldo dresovi](/dresovi/igrac/ronaldo/)."
        ]
      },
      {
        h2: "Veličine retro dresova",
        paragraphs: [
          "Većina retro modela dolazi u dječjim veličinama od 104 do 176 (dres s hlačicama) i u odraslim veličinama. Klupski dresovi za odrasle idu od S do XL, a reprezentativni od S do XXL. Retro dresovi dugih rukava imaju drukčiji raspon: 152–176 i S–L. Dostupne veličine uvijek piše uz model.",
          "Ako retro dres planiraš nositi opušteno, preko majice ili uz jaknu, uzmi broj veći. Ako voliš uži sportski kroj, ostani na svojoj standardnoj veličini."
        ]
      },
      {
        h2: "Kako nositi i održavati retro dres",
        paragraphs: [
          "Retro dres najbolje izgleda uz jednostavne komade: ravne traperice ili cargo hlače, bijele tenisice i laganu jaknu. Neka dres bude glavni dio odjeće, a sve ostalo neutralno.",
          "Da bi dugo izgledao kao nov, peri ga naopako na 30 °C, bez izbjeljivača i omekšivača, i suši na zraku, ne u sušilici. Ne glačaj preko imena i broja."
        ]
      }
    ],
    faq: [
      {
        q: "Jesu li retro dresovi dostupni i za djecu?",
        a: "Većina retro modela dolazi u dječjim veličinama od 104 do 176, uz hlačice. Dostupne veličine piše uz svaki model."
      },
      {
        q: "Koliko koštaju retro dresovi?",
        a: "Retro dresovi su od 20 €, a modeli dugih rukava 30 €. Točna cijena piše uz svaki dres."
      },
      {
        q: "Kako se plaća i koliko traje dostava?",
        a: "Plaćaš pouzećem, gotovinom pri preuzimanju paketa. Dostava traje 2–5 radnih dana po cijeloj Hrvatskoj."
      },
      {
        q: "Mogu li zamijeniti veličinu?",
        a: "Da. Javi nam se unutar 14 dana od primitka paketa. Dres mora biti nenošen i neoštećen."
      }
    ]
  },
  {
    slug: "kako-odabrati-velicinu-dresa-za-dijete",
    title: "Kako odabrati pravu veličinu dresa za dijete?",
    description:
      "Kako odabrati veličinu dječjeg nogometnog dresa: tablica veličina 104–176 po visini, kako izmjeriti dijete, dres ili komplet, kad uzeti veću veličinu i što ako ne odgovara.",
    publishedAt: "2025-02-04",
    updatedAt: "2026-11-16",
    relatedSlugs: [
      "hrvatska-modric-komplet",
      "barcelona-yamal-komplet",
      "real-mbappe-komplet",
      "hrvatska-modric-2026"
    ],
    paragraphs: [
      "Odabir veličine dječjeg dresa najčešće je razlika između poklona koji se nosi svaki tjedan i komada koji ostane u ormaru. Dobra vijest je da ne trebaš pogađati. Uz jednu mjeru i par jednostavnih pravila pogodit ćeš veličinu iz prve, čak i kad kupuješ za dijete koje nije pored tebe.",
      "U ovom vodiču su naše dječje veličine s visinama, kako izmjeriti dijete u dvije minute, kada uzeti veću veličinu i što napraviti ako veličina ipak ne odgovara."
    ],
    sections: [
      {
        h2: "Dječje veličine: vodi se visinom, ne godinama",
        paragraphs: [
          "Broj na dječjem dresu označava visinu djeteta u centimetrima. Godine su samo gruba orijentacija, jer dvoje djece iste dobi lako može nositi dvije različite veličine. Naše dječje veličine idu od 104 do 176:"
        ],
        list: [
          "104 — visina 98–104 cm (okvirno 3–4 godine)",
          "116 — visina 110–116 cm (okvirno 5–6 godina)",
          "128 — visina 116–128 cm (okvirno 7–8 godina)",
          "140 — visina 128–140 cm (okvirno 9–10 godina)",
          "152 — visina 140–152 cm (okvirno 11–12 godina)",
          "164 — visina 152–164 cm (okvirno 13–14 godina)",
          "176 — visina 164–176 cm (okvirno 15–16 godina)"
        ]
      },
      {
        h2: "Kako izmjeriti dijete u dvije minute",
        subsections: [
          {
            h3: "Visina",
            paragraphs: [
              "Neka dijete stane bosonogo uz zid, ravno, s petama uz zid. Stavi knjigu vodoravno na tjeme, olovkom označi mjesto na zidu i izmjeri od poda do oznake. To je mjera prema kojoj biraš veličinu iz tablice iznad."
            ]
          },
          {
            h3: "Majica koja već dobro stoji",
            paragraphs: [
              "Uzmi majicu ili dres koji djetetu sada dobro stoji, raširi ga na stol i izmjeri širinu ispod pazuha te dužinu od ramena do donjeg ruba. Ako nam te mjere pošalješ na WhatsApp, usporedit ćemo ih s modelom koji želiš i reći ti koja veličina ima smisla."
            ]
          }
        ]
      },
      {
        h2: "Na granici dvije veličine? Uzmi veću",
        paragraphs: [
          "Ako je dijete na granici dvije veličine, uzmi veću. Djeca brzo rastu, a dres s malo rezerve nosit će i iduću sezonu. Uz to je ugodniji za trčanje i ostavlja mjesta za majicu ispod.",
          "Ipak, nemoj ići dvije veličine gore. Prevelik dres izgleda nabacano, rukavi padaju preko lakta, a hlačice spadaju. Pravilo je jedna veličina rezerve, ne dvije."
        ]
      },
      {
        h2: "Dres s hlačicama ili cijeli komplet",
        paragraphs: [
          "Dječji dres kratkih rukava kod nas dolazi s hlačicama, pa je odmah spreman za igru. Ako kupuješ poklon, pogledaj komplete: uz dres i hlačice dobiješ i loptu i kapu, sve za 40 €. Najčešće se biraju [Hrvatska Modrić komplet](/dres/hrvatska-modric-komplet/), [Barcelona Yamal komplet](/dres/barcelona-yamal-komplet/) i [Real Madrid Mbappé komplet](/dres/real-mbappe-komplet/).",
          "Ako ne znaš što je bolje za tvoju situaciju, usporedbu imaš u članku [dres ili komplet za dijete](/blog/dres-ili-komplet-za-dijete/)."
        ]
      },
      {
        h2: "Starija djeca: dugi rukavi i odrasle veličine",
        paragraphs: [
          "Dresovi dugih rukava dolaze u veličinama 152, 164 i 176 te S, M i L, i to bez hlačica. Ako je dijete visoko i već nosi 176, a voli širi kroj, pogledaj i odrasle veličine: S odgovara opsegu prsa otprilike 88–96 cm. Imaj na umu da odrasli dres dolazi bez hlačica."
        ]
      },
      {
        h2: "Kupuješ za poklon?",
        paragraphs: [
          "Ako ne možeš izmjeriti dijete, pitaj roditelje za visinu ili za veličinu odjeće koju dijete trenutno nosi. Te podatke nam možeš poslati prije narudžbe pa ćemo predložiti veličinu.",
          "Za poklon s rokom, rođendan ili blagdane, naruči na vrijeme jer paket stiže za 2–5 radnih dana. Više ideja imaš u vodiču [dres kao poklon malom navijaču](/blog/dres-kao-poklon-malom-navijacu/)."
        ]
      },
      {
        h2: "Što ako veličina ipak ne odgovara",
        paragraphs: [
          "Javi nam se unutar 14 dana od primitka paketa i dogovorit ćemo zamjenu za drugu veličinu. Dres mora biti nenošen i neoštećen, u originalnom stanju. Najbrže je preko WhatsAppa, a sve detalje imaš na stranici [Dostava i zamjena](/dostava-i-povrat/)."
        ]
      },
      {
        h2: "Kako održavati dječji dres",
        paragraphs: [
          "Dječji dres pere se češće od ostalih, pa se isplati paziti. Peri ga naopako na 30 °C, bez izbjeljivača i omekšivača, i suši na zraku, ne u sušilici. Mrlje od trave isperi hladnom vodom prije pranja i ne glačaj preko imena i broja.",
          "Sve dječje modele, od reprezentacija do klubova, imaš na stranici [dječji dresovi i kompleti](/dresovi/kategorija/djecji-dresovi/)."
        ]
      }
    ],
    faq: [
      {
        q: "Koje dječje veličine imate?",
        a: "104, 116, 128, 140, 152, 164 i 176. Broj označava visinu djeteta u centimetrima."
      },
      {
        q: "Dolazi li dječji dres s hlačicama?",
        a: "Da, dječji dres kratkih rukava dolazi s hlačicama, a komplet uz to ima i loptu i kapu. Dresovi dugih rukava dolaze bez hlačica."
      },
      {
        q: "Dijete ima 8 godina. Koju veličinu uzeti?",
        a: "Okvirno 128, ali provjeri visinu. Ako je dijete visoko 116–128 cm, uzmi 128. Ako je više od 128 cm, uzmi 140."
      },
      {
        q: "Mogu li zamijeniti veličinu?",
        a: "Da. Javi nam se unutar 14 dana od primitka paketa. Dres mora biti nenošen i neoštećen."
      }
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
      "real-ronaldo-bijeli-cl",
      "portugal-ronaldo-2026"
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
      "barcelona-messi-cl-berlin",
      "intermiami-messi-crni"
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
      "Kako naručiti nogometni dres online u Hrvatskoj: dresovi od 20 €, plaćanje pouzećem, dostava 2–5 radnih dana, odabir veličine i zamjena veličine unutar 14 dana.",
    publishedAt: "2025-04-20",
    updatedAt: "2026-11-16",
    relatedSlugs: [
      "hrvatska-modric-2026",
      "barcelona-yamal-domaci",
      "real-madrid-mbappe-nr10-bijeli-2026-27",
      "hrvatska-modric-komplet"
    ],
    paragraphs: [
      "Nogometni dres danas većina ljudi kupuje online, ali ponude se jako razlikuju: u cijeni, kvaliteti, roku dostave i u tome što se dogodi ako veličina ne odgovara. Prije nego što naručiš, isplati se znati na što gledati.",
      "U ovom vodiču prolazimo kroz sve što trebaš provjeriti, od plaćanja i dostave do veličina i kvalitete, i objašnjavamo kako narudžba ide kod nas u Dresifyju."
    ],
    sections: [
      {
        h2: "Na što paziti prije nego što naručiš dres online",
        subsections: [
          {
            h3: "Plaćanje",
            paragraphs: [
              "Ako trgovina traži uplatu unaprijed, a ne poznaješ je, rizik je na tvojoj strani. Plaćanje pouzećem znači da novac daješ tek kad paket držiš u rukama."
            ]
          },
          {
            h3: "Odakle se šalje i koliko čekaš",
            paragraphs: [
              "Paket koji putuje iz inozemstva zna stajati tjednima, a uz to mogu doći carina i dodatni troškovi. Provjeri šalje li se roba iz Hrvatske i koliko točno traje dostava."
            ]
          },
          {
            h3: "Pravila zamjene",
            paragraphs: [
              "Kod dresova je veličina najčešći problem, pa ti treba jasno pravilo što napraviti ako ne odgovara: u kojem roku i pod kojim uvjetima."
            ]
          },
          {
            h3: "Detalji na proizvodu",
            paragraphs: [
              "Pogledaj je li ime i broj igrača ušiven ili samo otisnut, koje su veličine dostupne i piše li jasno što dobivaš, samo dres ili dres s hlačicama. Ako ti nešto nije jasno iz opisa, pitaj prije narudžbe."
            ]
          }
        ]
      },
      {
        h2: "Kako naručiti dres na Dresifyju",
        subsections: [
          {
            h3: "1. Odaberi model",
            paragraphs: [
              "U [katalogu dresova](/dresovi/) možeš filtrirati po klubu, reprezentaciji ili igraču. Ako već znaš što tražiš, kreni ravno na kolekciju, npr. [Hrvatska dresovi](/dresovi/klub/hrvatska/), [Real Madrid dresovi](/dresovi/klub/real-madrid/) ili [FC Barcelona dresovi](/dresovi/klub/fc-barcelona/)."
            ]
          },
          {
            h3: "2. Odaberi veličinu",
            paragraphs: [
              "Na stranici svakog dresa vidiš koje su veličine dostupne, a rasprodane su jasno označene. Uz svaki dres je i vodič za veličine: visina za djecu i opseg prsa za odrasle."
            ]
          },
          {
            h3: "3. Upiši podatke i potvrdi",
            paragraphs: [
              "U košarici upišeš ime, adresu, broj mobitela i email te potvrdiš narudžbu. Registracija nije potrebna i ništa ne plaćaš unaprijed."
            ]
          },
          {
            h3: "4. Prati paket",
            paragraphs: [
              "Čim paket krene, na email ti stiže broj za praćenje i link, pa u svakom trenutku znaš gdje je."
            ]
          }
        ]
      },
      {
        h2: "Cijene, plaćanje i dostava",
        paragraphs: [
          "Dresovi su od 20 €, a dječji kompleti (dres, hlačice, lopta i kapa) 40 €. Dresovi dugih rukava i trenirke koštaju nešto više, a točna cijena uvijek piše uz model.",
          "Šaljemo GLS kurirskom službom na svaku adresu u Hrvatskoj. Dostava je 7,00 €, a registriranim kupcima besplatna je za narudžbe od 60 €. Plaćaš pouzećem, gotovinom pri preuzimanju paketa. Narudžbe potvrđene radnim danom u pravilu šaljemo sljedeći radni dan, a paket stiže za 2–5 radnih dana od potvrde. Sve detalje imaš na stranici [Dostava i zamjena](/dostava-i-povrat/)."
        ]
      },
      {
        h2: "Kako odabrati pravu veličinu",
        paragraphs: [
          "Dječje veličine idu od 104 do 176 i biraju se po visini djeteta, ne po godinama: veličina 128 odgovara visini otprilike 116–128 cm, 152 visini 140–152 cm i tako dalje. Dječji dres dolazi s hlačicama.",
          "Za odrasle su klupski dresovi u veličinama S–XL, a reprezentativni S–XXL. Najlakše je izmjeriti majicu koja ti već dobro stoji: širinu ispod pazuha i dužinu od ramena do ruba. Ako si između dvije veličine, uzmi veću. Detaljnije savjete za djecu imaš u [vodiču za dječje veličine](/blog/kako-odabrati-velicinu-dresa-za-dijete/)."
        ]
      },
      {
        h2: "Što ako veličina ne odgovara",
        paragraphs: [
          "Javi nam se unutar 14 dana od primitka paketa i dogovorit ćemo zamjenu za drugu veličinu. Dres mora biti nenošen i neoštećen, u originalnom stanju. Najbrže je preko WhatsAppa. Riječ je o zamjeni veličine, pa se isplati veličinu provjeriti prije narudžbe."
        ]
      },
      {
        h2: "Kako prepoznati kvalitetan dres",
        paragraphs: [
          "Kod kvalitetnog dresa ime i broj su ušiveni, šavovi su ravni i čisti i s unutarnje strane, a materijal je lagan i prozračan, ne tanak i plastičan. Takav dres zadrži boju i oblik i nakon puno pranja, ako ga pereš naopako na 30 °C i sušiš na zraku. Više o tome piše u članku [kako prepoznati kvalitetan nogometni dres](/blog/kako-prepoznati-kvalitetan-nogometni-dres/)."
        ]
      },
      {
        h2: "Odakle krenuti",
        paragraphs: [
          "Ako ne znaš koji model uzeti, ovo su dobri prvi izbori: [Hrvatska Modrić 2026](/dres/hrvatska-modric-2026/), [Barcelona Yamal domaći](/dres/barcelona-yamal-domaci/) i [Real Madrid Mbappé 2026/27](/dres/real-madrid-mbappe-nr10-bijeli-2026-27/). Za djecu je najzahvalniji poklon [Hrvatska Modrić komplet](/dres/hrvatska-modric-komplet/).",
          "Ako kupuješ za sebe, sve modele za odrasle imaš na stranici [dresovi za odrasle](/dresovi/kategorija/dresovi-za-odrasle/), a za klince u kategoriji [dječji dresovi i kompleti](/dresovi/kategorija/djecji-dresovi/)."
        ]
      }
    ],
    faq: [
      {
        q: "Moram li platiti unaprijed?",
        a: "Ne. Plaćaš pouzećem, gotovinom pri preuzimanju paketa."
      },
      {
        q: "Koliko traje i koliko košta dostava?",
        a: "Paket stiže za 2–5 radnih dana od potvrde narudžbe. Dostava je 7,00 €, a registriranim kupcima besplatna je za narudžbe od 60 €."
      },
      {
        q: "Šaljete li izvan Hrvatske?",
        a: "Trenutno šaljemo samo na adrese u Hrvatskoj."
      },
      {
        q: "Mogu li zamijeniti veličinu?",
        a: "Da. Javi nam se unutar 14 dana od primitka paketa. Dres mora biti nenošen i neoštećen."
      }
    ]
  },
  {
    slug: "streetwear-kompleti-kako-nositi",
    title: "Streetwear kompleti — kako ih nositi i zašto su postali hit",
    description:
      "Vodič kroz streetwear komplete: kako složiti ulični look s majicom i hlačicama, uz koje tenisice i za koje prilike najbolje stoje.",
    publishedAt: "2026-07-08",
    updatedAt: "2026-11-16",
    relatedSlugs: ["graffiti-black-set", "cotton-wreath-white-set", "cloud-black-set"],
    paragraphs: [
      "Streetwear komplet — majica i hlačice u istom stilu — postao je jedan od najlakših načina da izgledaš sređeno bez imalo truda. Umjesto da sam slažeš gornji i donji dio i pogađaš pašu li boje, dobiješ zaokružen look koji radi odmah iz vrećice. Upravo zato su ovi kompleti eksplodirali: mladi kupci žele nešto što izgleda dobro na priči, ali i uživo, u gradu, na kavi ili na druženju s ekipom. Kod nas su svi kompleti u uličnom stilu, s modernim, malo opuštenijim krojem koji odgovara današnjoj streetwear estetici.",
      "Najsigurniji način da nosiš komplet je da ga pustiš da bude glavni komad, a sve ostalo držiš jednostavnim. Uz njega idu čiste tenisice — bijele patike gotovo uvijek rade, a ako je komplet u jačoj boji, crne ili neutralne tenisice ga smire. Dodaj jednostavan lanac, kapu ili crossbody torbicu i look je gotov. Izbjegavaj miješati previše uzoraka: kod streetweara manje je više, a komplet sam po sebi već nosi dovoljno karaktera da ne treba dodatno natrpavati.",
      "Kompleti u neutralnim tonovima — crna, siva, bijela, maslinasta — najlakši su za kombiniranje i nose se cijele godine, pa su odličan prvi izbor ako tek ulaziš u streetwear. Jače boje poput plave, roze ili šarenih grafika su statement komadi: nose se kad želiš da te se primijeti i kad ti je look sam sebi dovoljan. Dobar trik je imati jedan neutralni komplet za svaki dan i jedan izraženiji za izlaske — tako pokriješ i opušteni i 'sređeni' streetwear.",
      "Svi naši streetwear kompleti dolaze u veličinama XS, S, M i L za odrasle, uz plaćanje pouzećem po cijeloj Hrvatskoj — ne plaćaš ništa unaprijed. Dostava je 7,00 €, a registriranim kupcima besplatna je za narudžbe od 60 €. Ako nisi siguran koja veličina ti odgovara ili kako složiti look, javi nam se na WhatsApp i rado pomognemo. Streetwear je na kraju o samopouzdanju: uzmi komad koji ti se sviđa čim ga vidiš, obuci ga i nosi kako tebi paše."
    ]
  },
  {
    slug: "kako-odabrati-streetwear-komplet",
    title: "Kako odabrati streetwear komplet — veličina, materijal i stil",
    description:
      "Praktičan vodič za odabir streetwear kompleta: kako pogoditi veličinu XS–L, na što paziti kod materijala i kroja te koji stil odgovara tebi.",
    publishedAt: "2026-07-10",
    updatedAt: "2026-11-16",
    relatedSlugs: ["graffiti-grey-set", "cotton-wreath-olive-set", "cloud-royal-blue-set"],
    paragraphs: [
      "Kod odabira streetwear kompleta tri stvari odlučuju hoćeš li ga stvarno nositi: veličina, materijal i stil. Za razliku od dresa, streetwear se najčešće nosi malo opuštenije, pa je pametno prvo odlučiti kakav fit voliš — priljubljeniji ili komotniji. Naši kompleti dolaze u veličinama XS, S, M i L za odrasle, a kroj je moderan i blago opušten, baš kako streetwear i treba stajati. Ako si između dvije veličine i voliš komotnije, uzmi veću; ako voliš čišću, uredniju liniju, ostani na svojoj standardnoj.",
      "Najbolji način da pogodiš veličinu je da ne pogađaš. Uzmi majicu koja ti trenutno dobro stoji, raširi je na ravnu podlogu i izmjeri širinu ispod pazuha i duljinu od ramena do ruba. Kod hlačica provjeri opseg struka i duljinu nogavice na komadu koji ti odgovara. Te mjere reci nam u poruci i točno ćemo ti reći koja veličina odgovara konkretnom modelu. To je puno sigurnije nego se voditi samo osjećajem ili općim tablicama s interneta.",
      "Materijal i kroj su ono što razlikuje komplet koji nosiš stalno od onog koji ostane u ormaru. Traži gušći, mekan pamuk koji drži oblik i ne izgleda tanko nakon par pranja — takav materijal je ugodan na koži i daje onaj 'premium' osjećaj koji se odmah primijeti. Kod kroja pazi da hlačice imaju dobar pad i da majica nije ni prekratka ni prevelika. Naši kompleti su rađeni upravo s tim balansom na umu: udobni za cijeli dan, a dovoljno uredni da izgledaju namjerno, a ne nabacano.",
      "Na kraju, stil biraj prema sebi, ne prema trendu. Ako želiš nešto što ide uz sve i nosi se cijelu godinu, kreni od neutralnih boja. Ako želiš da komad bude glavni na looku, uzmi jaču boju ili grafiku. Sve komplete šaljemo po cijeloj Hrvatskoj uz plaćanje pouzećem, a registriranim kupcima dostava je besplatna za narudžbe od 60 €. Ako ti treba pomoć oko veličine ili odabira, javi se na WhatsApp — predložit ćemo ti model i veličinu koja ima smisla za tebe."
    ]
  },
  {
    slug: "sp-2026-spanjolska-prvak-dresovi",
    title: "SP 2026 — Španjolska prvak: koji dresovi su sad najtraženiji",
    description:
      "Nakon što je Španjolska osvojila Svjetsko prvenstvo 2026., dresovi prvaka i najboljih igrača turnira su najtraženiji. Evo što kupci sada najviše biraju.",
    publishedAt: "2026-08-05",
    relatedSlugs: ["spanjolska-yamal-crveni-sp-2026", "argentina-messi-plavi-sp-2026", "barcelona-yamal-domaci"],
    paragraphs: [
      "Svjetsko prvenstvo 2026. je iza nas, a naslov prvaka otišao je u Španjolsku. Kao i uvijek nakon velikog turnira, potražnja za dresovima pobjednika naglo raste — svi žele nositi boje ekipe koja je podigla pehar. Španjolski reprezentativni dres, posebno izdanja s imenima nositelja igre, ovih tjedana je među najtraženijim modelima. Ako želiš dres koji nosi priču o osvojenom prvenstvu, sad je pravi trenutak dok su svježe uspomene na finale.",
      "Uz same prvake, turnir uvijek izbaci i pojedince koji obilježe prvenstvo. Mladi Yamal je jedno od najvećih imena ove Španjolske generacije, pa njegova izdanja odlaze najbrže. No i dresovi ostalih reprezentacija koje su igrale velike utakmice — Argentina, Brazil, Francuska — ostaju popularni jer navijači vežu dres uz konkretne trenutke s turnira. Dobar reprezentativni dres nakon SP-a nije samo odjeća, nego mali komad povijesti nogometa.",
      "Kod nas su reprezentativni dresovi dostupni i za djecu i za odrasle, s ušivenim imenom i brojem igrača. Ako biraš poklon za malog navijača koji je pratio prvenstvo, dres njegovog favorita s turnira gotovo uvijek pogodi u sridu. Za odrasle, klasična izdanja u glavnim bojama reprezentacije najsigurniji su izbor jer se nose i izvan stadiona, kroz cijelu godinu, bez obzira na rezultat sljedeće sezone.",
      "Sve reprezentativne dresove šaljemo po cijeloj Hrvatskoj uz plaćanje pouzećem, pa ne plaćaš ništa unaprijed. Ako nisi siguran koji model ili veličinu uzeti, javi nam se na WhatsApp i pomoći ćemo ti oko odabira. Prvenstvo je gotovo, ali pravi dres čuva onaj osjećaj s finala — i izgleda jednako dobro sljedeće sezone kao i danas.",
    ],
  },
  {
    slug: "kako-prepoznati-kvalitetan-nogometni-dres",
    title: "Kako prepoznati kvalitetan nogometni dres",
    description:
      "Na što paziti pri kupnji nogometnog dresa — materijal, kroj, ušiveni detalji i razlika između jeftine kopije i kvalitetnog dresa koji traje.",
    publishedAt: "2026-08-08",
    updatedAt: "2026-11-16",
    relatedSlugs: ["hrvatska-modric-2026", "barcelona-yamal-domaci", "real-madrid-mbappe-nr10-bijeli-2026-27"],
    paragraphs: [
      "Kad kupuješ nogometni dres online, teško je na prvu procijeniti kvalitetu jer sve fotografije izgledaju dobro. Zato se isplati znati na što obratiti pozornost. Prvo pravilo je materijal — kvalitetan dres izrađen je od prozračne, lagane tkanine koja odvodi znoj i ne lijepi se za tijelo. Takav dres jednako je ugodan i na terenu i u gradu, dok jeftine kopije često koriste tanak, plastičan materijal koji se brzo izliže i gubi boju nakon par pranja.",
      "Drugi znak kvalitete su detalji: ušiveni (a ne samo tiskani) grbovi, čisti šavovi i uredno postavljeno ime i broj igrača. Kod slabijih dresova brojevi se već nakon nekoliko pranja počnu ljuštiti, a rubovi tkanine se rasparaju. Dobar dres izgleda uredno i iz blizine — kad ga okreneš naopako, šavovi su čisti i ravni. To je razlika koja se ne vidi na fotki, ali se osjeti čim ga uzmeš u ruke.",
      "Kroj je treća stvar na koju vrijedi paziti. Kvalitetan dres prati moderan sportski kroj — nije ni prevelik ni preuzak, i jednako dobro stoji i navijaču na tribini i djetetu na igralištu. Kod nas su dresovi dostupni u dječjim veličinama od 104 do 176 te u odraslim veličinama S–XL (reprezentativni dresovi do XXL), pa je lakše pogoditi pravi broj. Ako si između dvije veličine, obično je bolje uzeti veću, pogotovo za djecu koja rastu.",
      "Naši dresovi rađeni su tako da izdrže i nošenje i pranje, s ušivenim imenom i brojem, a dolaze uz dostavu po cijeloj Hrvatskoj i plaćanje pouzećem. Ako želiš savjet oko konkretnog modela ili veličine, javi nam se na WhatsApp prije narudžbe. Kvalitetan dres je ulaganje koje traje sezonama — i zato se isplati kupiti ga na mjestu kojem možeš vjerovati.",
    ],
  },
  {
    slug: "dres-kao-poklon-malom-navijacu",
    title: "Dres kao poklon malom navijaču — vodič za darivanje",
    description:
      "Kako odabrati nogometni dres ili komplet kao poklon za dijete — veličina, omiljeni igrač i savjeti da poklon bude pun pogodak.",
    publishedAt: "2026-08-11",
    relatedSlugs: ["hrvatska-modric-komplet", "hrvatska-modric-2026", "barcelona-yamal-domaci"],
    paragraphs: [
      "Malo koji poklon oduševi dijete kao dres njegovog nogometnog idola. Bez obzira je li riječ o rođendanu, Božiću ili kraju sezone, dres je poklon koji dijete odmah želi obući i pokazati. Ključ dobrog poklona je pogoditi omiljenog igrača ili klub — ako znaš za koga dijete navija, pola posla je gotovo. Ako nisi siguran, reprezentativni dres Hrvatske gotovo je uvijek siguran izbor jer ga vole i mali i veliki navijači.",
      "Kad je poklon u pitanju, komplet često ostavlja jači dojam od samog dresa. Naš dječji komplet uključuje dres, hlačice, loptu i kapu u jednom paketu po cijeni od 40 €, pa dijete dobije sve što mu treba za igru odmah iz kutije. Lopta s istim motivom kao dres čini poklon puno većim i uzbudljivijim — a tebi olakšava jer ne moraš kupovati dodatke posebno.",
      "Najveća dilema kod poklona je veličina, jer često kupuješ bez da dijete isprobava. Vodi se visinom, a ne godinama — dječje veličine idu od 104 do 176. Ako je dijete između dvije veličine, uzmi veću: dres koji je malo prostraniji nosit će se dulje i ugodniji je za trčanje. Ako želiš biti siguran, pošalji nam visinu djeteta na WhatsApp i predložit ćemo veličinu koja ima smisla.",
      "Za poklone s rokom — rođendan ili blagdani — javi nam datum na vrijeme pa ćemo se potruditi da paket stigne prije. Dostava ide po cijeloj Hrvatskoj uz plaćanje pouzećem, pa ne plaćaš ništa unaprijed. Dres ili komplet je poklon koji dijete stvarno koristi, a ne odloži u ormar — i zato je gotovo uvijek pun pogodak.",
    ],
  },
  {
    slug: "barcelona-dresovi-koji-model-odabrati",
    title: "Barcelona dresovi — koji model odabrati",
    description:
      "Kako odabrati Barcelona dres: domaći blaugrana, Yamal i posebna izdanja, retro modeli Messija, Ronaldinha i Ronalda R9, veličine za djecu i odrasle te održavanje.",
    publishedAt: "2026-08-14",
    updatedAt: "2026-11-16",
    relatedSlugs: [
      "barcelona-yamal-nr10-novi-domaci-2026-27",
      "barcelona-yamal-domaci",
      "barcelona-messi-cl-berlin",
      "barcelona-yamal-komplet"
    ],
    paragraphs: [
      "Barcelona je jedan od klubova čiji se dresovi traže svake sezone, bez obzira na rezultat. Razlog su boje: plavo-grimizne pruge prepoznaju se odmah, na stadionu i na ulici.",
      "Ponuda je danas široka, od novog domaćeg dresa s Yamalom do retro modela iz Messijeve i Ronaldinhove ere. Ovaj vodič ima jedan cilj: pomoći ti da odabereš model koji ćeš stvarno nositi, u pravoj veličini."
    ],
    sections: [
      {
        h2: "Blaugrana: priča o bojama",
        paragraphs: [
          "Barcelona je osnovana 1899., a plava i grimizna od početka su njene boje. Po njima je klub dobio i nadimak blaugrana. Domaći dres gotovo uvijek nosi tu kombinaciju, a mijenja se raspored: nekad su pruge uske, nekad široke, a nekad su boje složene u drukčiji uzorak. Gostujući i treći dresovi su slobodniji i svake sezone donose drukčije boje.",
          "Zato je domaći dres najsigurniji izbor za prvi Barcelona dres. Ne izlazi iz mode i odmah se zna čiji je."
        ]
      },
      {
        h2: "Novi modeli: Yamal, Raphinha i posebna izdanja",
        paragraphs: [
          "Lamine Yamal je lice nove Barcelone. U prvu momčad ušao je kao petnaestogodišnjak, a sa Španjolskom je osvojio Euro 2024. Njegovi dresovi danas su među najtraženijima, i kod djece i kod odraslih."
        ],
        subsections: [
          {
            h3: "Domaći dres",
            paragraphs: [
              "Ako kupuješ prvi Barcelona dres, uzmi domaći. [Barcelona Yamal novi domaći 2026/27](/dres/barcelona-yamal-nr10-novi-domaci-2026-27/) je najsvježiji model, a [Barcelona Yamal domaći](/dres/barcelona-yamal-domaci/) klasičan izbor u plavo-grimiznoj."
            ]
          },
          {
            h3: "Posebna izdanja",
            paragraphs: [
              "Za one koji žele nešto što se ne viđa na svakom koraku tu su posebna izdanja u drukčijim bojama, od crno-rozih do šarenih. Sve ih imaš na stranici [Yamal dresovi](/dresovi/igrac/yamal/)."
            ]
          },
          {
            h3: "Raphinha",
            paragraphs: [
              "Raphinha nosi broj 11 i uz Yamala je jedan od igrača čije se ime najčešće traži na Barcelona dresu. Pogledaj [Barcelona Raphinha domaći CL](/dres/barcelona-raphinha/) ili sve modele na stranici [Raphinha dresovi](/dresovi/igrac/raphinha/)."
            ]
          }
        ]
      },
      {
        h2: "Retro Barcelona dresovi",
        paragraphs: [
          "Barcelona ima neke od najljepših retro dresova u nogometu, jer svaka era ima svoju zvijezdu."
        ],
        subsections: [
          {
            h3: "Ronaldo R9 i Kappa",
            paragraphs: [
              "Brazilski Ronaldo igrao je za Barcelonu samo jednu sezonu, 1996./97., ali je ostavio dubok trag. Dres iz vremena kad je Barcelonine dresove radila Kappa danas je kolekcionarski komad: [Barcelona Ronaldo R9](/dres/barcelona-ronaldo-r9/)."
            ]
          },
          {
            h3: "Ronaldinho",
            paragraphs: [
              "Ronaldinho je u Barceloni od 2003. do 2008. vratio radost u igru i 2006. osvojio Ligu prvaka. [Barcelona Ronaldinho retro plavo-bordo](/dres/barcelona-ronaldinho-nr10-retro-plavo-bordo/) jedan je od najljepših modela iz tog razdoblja, a sve njegove dresove imaš na stranici [Ronaldinho dresovi](/dresovi/igrac/ronaldinho/)."
            ]
          },
          {
            h3: "Messi i Berlin 2015.",
            paragraphs: [
              "Messi je za prvu momčad Barcelone igrao od 2004. do 2021. Finale Lige prvaka u Berlinu 2015., pobjeda 3:1 nad Juventusom, jedan je od vrhunaca te ere, a [Barcelona Messi CL Berlin 2015](/dres/barcelona-messi-cl-berlin/) je dres koji nosi tu priču. Više Messijevih modela, od Argentine do Inter Miamija, imaš na stranici [Messi dresovi](/dresovi/igrac/messi/)."
            ]
          }
        ]
      },
      {
        h2: "Barcelona komplet za djecu",
        paragraphs: [
          "Za mlađe navijače najzahvalniji je [Barcelona Yamal komplet](/dres/barcelona-yamal-komplet/): dres, hlačice, lopta i kapa u jednom paketu, za 40 €. Dijete dobije sve za igru odmah iz kutije."
        ]
      },
      {
        h2: "Koju veličinu odabrati",
        paragraphs: [
          "Klupski dresovi za odrasle dolaze u veličinama S–XL. Za orijentaciju: S odgovara opsegu prsa otprilike 88–96 cm, M 96–104 cm, L 104–112 cm, a XL 112–120 cm. Ako voliš opušteniji kroj ili dres nosiš preko majice, uzmi broj veći.",
          "Dječje veličine idu od 104 do 176 i biraju se po visini djeteta: 128 za visinu otprilike 116–128 cm, 152 za 140–152 cm. Dječji dres dolazi s hlačicama. Detaljnije piše u [vodiču za dječje veličine](/blog/kako-odabrati-velicinu-dresa-za-dijete/). Dresovi dugih rukava imaju svoj raspon, 152–176 i S–L, pa provjeri veličine na stranici modela."
        ]
      },
      {
        h2: "Kako održavati Barcelona dres",
        paragraphs: [
          "Tamne i jarke boje najbolje se čuvaju ako dres pereš naopako na 30 °C, s tamnom odjećom, bez omekšivača i izbjeljivača. Suši ga na vješalici na zraku, ne na direktnom suncu i ne u sušilici, i ne glačaj preko imena i broja.",
          "Sve modele, nove i retro, imaš na stranici [FC Barcelona dresovi](/dresovi/klub/fc-barcelona/). Dresovi su od 20 €, plaćaš pouzećem, a dostava traje 2–5 radnih dana po cijeloj Hrvatskoj."
        ]
      }
    ],
    faq: [
      {
        q: "Koji Barcelona dres uzeti za poklon?",
        a: "Domaći plavo-grimizni dres s imenom igrača kojeg ta osoba prati. Za dijete je dobar izbor komplet s hlačicama, loptom i kapom."
      },
      {
        q: "Imate li retro Barcelona dresove?",
        a: "Da: Messi Berlin 2015, Ronaldinho, Ronaldo R9 i Neymar. Sve ih imaš na stranici FC Barcelona dresovi."
      },
      {
        q: "Koje veličine imaju Barcelona dresovi?",
        a: "Za odrasle S–XL, za djecu 104–176 (dres s hlačicama). Dresovi dugih rukava dolaze u 152–176 i S–L."
      },
      {
        q: "Koliko košta dostava?",
        a: "Dostava je 7,00 € po cijeloj Hrvatskoj i traje 2–5 radnih dana. Plaćaš pouzećem pri preuzimanju."
      }
    ]
  },
  {
    slug: "real-madrid-dresovi-vodic",
    title: "Real Madrid dresovi — vodič kroz najtraženija izdanja",
    description:
      "Vodič kroz Real Madrid dresove: zašto je bijeli domaći dres klasik, Mbappé i Bellingham, retro dresovi iz finala Lige prvaka, veličine i održavanje bijelog dresa.",
    publishedAt: "2026-08-17",
    updatedAt: "2026-11-16",
    relatedSlugs: [
      "real-madrid-mbappe-nr10-bijeli-2026-27",
      "real-ramos-2018-cl",
      "real-arda-guler",
      "real-mbappe-komplet"
    ],
    paragraphs: [
      "Real Madrid je klub s najviše naslova prvaka Europe, a njegov bijeli dres jedan je od najprepoznatljivijih u nogometu. Kad biraš Real dres, zapravo biraš između tri stvari: aktualnog modela s imenom današnje zvijezde, retro dresa koji podsjeća na neko veliko finale ili kompleta za dijete.",
      "U ovom vodiču prolazimo kroz sve tri opcije, a onda kroz veličine i održavanje, jer bijeli dres traži malo više pažnje od ostalih."
    ],
    sections: [
      {
        h2: "Zašto je Real bijel",
        paragraphs: [
          "Real Madrid igra u bijelom od osnutka 1902. i zato ga u Španjolskoj zovu Los Blancos, Bijeli. Domaći dres mijenja se iz sezone u sezonu samo u detaljima: ovratniku, rukavima i linijama u bojama kluba. Osnova ostaje ista.",
          "Zato je bijeli Real dres i najsigurniji izbor. Ne izlazi iz mode, dobro izgleda godinama i svi ga prepoznaju, i oni koji ne prate nogomet."
        ]
      },
      {
        h2: "Aktualni modeli",
        subsections: [
          {
            h3: "Mbappé",
            paragraphs: [
              "Kylian Mbappé došao je u Real 2024. i odmah postao jedno od najtraženijih imena na dresu. Ako želiš najnoviji bijeli model, pogledaj [Real Madrid Mbappé 2026/27](/dres/real-madrid-mbappe-nr10-bijeli-2026-27/). Sve njegove dresove, uključujući one francuske reprezentacije, imaš na stranici [Mbappé dresovi](/dresovi/igrac/mbappe/)."
            ]
          },
          {
            h3: "Bellingham i mlađa generacija",
            paragraphs: [
              "Jude Bellingham stigao je 2023. iz Dortmunda i u Realu nosi broj 5. Njegovi dresovi traženi su kod mlađih navijača, kao i dres [Real Madrid Arda Güler](/dres/real-arda-guler/). Sve Bellinghamove modele, klupske i engleske, imaš na stranici [Bellingham dresovi](/dresovi/igrac/bellingham/)."
            ]
          }
        ]
      },
      {
        h2: "Retro dresovi iz finala Lige prvaka",
        paragraphs: [
          "Između 2014. i 2024. Real je osvojio šest Liga prvaka, a dresovi iz tih finala danas su među najtraženijim retro modelima. Cristiano Ronaldo s Realom je osvojio četiri naslova (2014., 2016., 2017. i 2018.), a finale u Kijevu 2018. protiv Liverpoola bilo je treće zaredom.",
          "Iz tog razdoblja imamo [Real Madrid Ramos 2018 CL Final](/dres/real-ramos-2018-cl/) i [Ronaldo Final Kyiv 2018](/dres/real-madrid-ronaldo-nr7-final-kyiv-2018-retro/) dugih rukava, a za nešto drukčije tu je [ljubičasti Ronaldo CL](/dres/real-ronaldo-ljubicasti-cl/). Sve Ronaldove dresove, od Manchester Uniteda do Portugala, imaš na stranici [Ronaldo dresovi](/dresovi/igrac/ronaldo/)."
        ]
      },
      {
        h2: "Gostujući i posebni dresovi",
        paragraphs: [
          "Uz bijeli domaći, Real svake sezone ima gostujući i treći dres u drukčijim bojama, najčešće tamnijim. Takvi dresovi dobro izgledaju i izvan stadiona, uz traperice ili trenirku, i dobar su izbor ako već imaš bijeli ili želiš nešto manje očito.",
          "Posebna izdanja, u bojama koje klub ne nosi u ligi, idu korak dalje. Kupuju ih uglavnom oni kojima je dres više komad odjeće nego navijački rekvizit. Ako biraš poklon za nekoga tko već ima nekoliko Real dresova, takav model je siguran način da dobije nešto što nema."
        ]
      },
      {
        h2: "Real i Modrić",
        paragraphs: [
          "Za navijače u Hrvatskoj Real ima posebnu težinu zbog Luke Modrića, koji je u Madridu igrao od 2012. do 2025. i s klubom osvojio šest Liga prvaka. Danas igra za Milan, a njegove dresove, hrvatske i milanske, imaš na stranici [Modrić dresovi](/dresovi/igrac/modric/)."
        ]
      },
      {
        h2: "Real Madrid komplet za djecu",
        paragraphs: [
          "Za mlađe navijače tu je [Real Madrid Mbappé komplet](/dres/real-mbappe-komplet/): dres, hlačice, lopta i kapa u jednom paketu, za 40 €. Dobar je izbor za rođendan ili blagdane jer dijete dobije sve za igru odmah iz kutije."
        ]
      },
      {
        h2: "Koju veličinu odabrati",
        paragraphs: [
          "Klupski dresovi za odrasle dolaze u veličinama S–XL. Za orijentaciju: S odgovara opsegu prsa otprilike 88–96 cm, M 96–104 cm, L 104–112 cm, a XL 112–120 cm. Ako voliš opušteniji kroj ili dres nosiš preko majice, uzmi broj veći.",
          "Dječje veličine idu od 104 do 176 i biraju se po visini djeteta, a dječji dres dolazi s hlačicama. Retro dresovi dugih rukava imaju svoj raspon, 152–176 i S–L. Ako nisi siguran, pošalji nam visinu na WhatsApp i predložit ćemo veličinu."
        ]
      },
      {
        h2: "Kako održavati bijeli dres",
        paragraphs: [
          "Bijeli dres peri odvojeno od tamne odjeće, naopako, na 30 °C. Ne koristi izbjeljivač jer može oštetiti ime, broj i detalje u boji. Mrlje od trave ili hrane očisti što prije, dok se nisu uvukle u tkaninu. Suši ga na zraku, ne u sušilici, i ne glačaj preko imena i broja.",
          "Sve modele, nove i retro, imaš na stranici [Real Madrid dresovi](/dresovi/klub/real-madrid/). Dresovi su od 20 €, plaćaš pouzećem, a dostava traje 2–5 radnih dana po cijeloj Hrvatskoj."
        ]
      }
    ],
    faq: [
      {
        q: "Koje veličine imaju Real Madrid dresovi?",
        a: "Za odrasle S–XL, za djecu 104–176 (dres s hlačicama). Dresovi dugih rukava dolaze u 152–176 i S–L."
      },
      {
        q: "Koji Real dres uzeti za poklon?",
        a: "Bijeli domaći dres s imenom igrača kojeg ta osoba prati. Za dijete je dobar izbor komplet s hlačicama, loptom i kapom."
      },
      {
        q: "Koliko koštaju Real Madrid dresovi?",
        a: "Dresovi su od 20 €, retro dresovi dugih rukava 30 €, a dječji komplet 40 €."
      },
      {
        q: "Kako se plaća?",
        a: "Pouzećem, gotovinom pri preuzimanju paketa. Ništa ne plaćaš unaprijed."
      }
    ]
  },
  {
    slug: "dresovi-hrvatske-reprezentacije-kockasti-ponos",
    title: "Dresovi hrvatske reprezentacije — kockasti ponos",
    description:
      "Sve o kockastom dresu Hrvatske: odakle dolaze kocke, generacije od 1998. do danas, koje izdanje odabrati, veličine za djecu i odrasle (do XXL) i kako održavati dres.",
    publishedAt: "2026-08-20",
    updatedAt: "2026-11-16",
    relatedSlugs: [
      "hrvatska-modric-2026",
      "hrvatska-gvardiol-2026",
      "hrvatska-livakovic",
      "hrvatska-modric-komplet"
    ],
    paragraphs: [
      "Malo koji dres na svijetu prepoznaješ tako brzo kao hrvatski. Crveno-bijele kocke vide se s druge strane stadiona i odmah znaš o kome je riječ. Zato je dres reprezentacije kod nas tražen cijele godine, ne samo kad Vatreni igraju.",
      "U ovom vodiču pišemo odakle dolaze kocke, koja izdanja postoje, kako odabrati veličinu za sebe ili dijete i kako dres održavati da dugo izgleda kao nov."
    ],
    sections: [
      {
        h2: "Odakle dolaze kocke",
        paragraphs: [
          "Kocke na dresu dolaze iz hrvatskog grba, šahovnice s crvenim i bijelim poljima. Kad je Hrvatska početkom devedesetih počela igrati kao samostalna reprezentacija, šahovnica je postala glavni motiv domaćeg dresa. Od tada se mijenja samo u detaljima: veličini kocaka, kroju, ovratniku i rasporedu boja.",
          "Upravo zato je dres toliko prepoznatljiv. Dok druge reprezentacije svako malo mijenjaju dizajn iz temelja, kocke ostaju."
        ]
      },
      {
        h2: "Generacije koje su obilježile dres",
        paragraphs: [
          "Prvi veliki trenutak bilo je Svjetsko prvenstvo 1998. u Francuskoj, gdje je Hrvatska na prvom nastupu osvojila broncu, a Davor Šuker postao najbolji strijelac turnira. Dvadeset godina kasnije, u Rusiji 2018., reprezentacija je stigla do finala, a Luka Modrić proglašen je najboljim igračem prvenstva. U Katru 2022. stigla je još jedna bronca.",
          "Zato mnogi biraju dres s imenom igrača koji ih veže uz neki od tih trenutaka. Modrić je i dalje prvi izbor, a sve njegove modele imaš na stranici [Modrić dresovi](/dresovi/igrac/modric/). Traženi su i dresovi drugih reprezentativaca, poput [Hrvatska Gvardiol 2026](/dres/hrvatska-gvardiol-2026/), vratarskog [Hrvatska Livaković](/dres/hrvatska-livakovic/) ili [Hrvatska Baturina 2026](/dres/hrvatska-baturina-nr16-domaci-2026/) za one koji prate novu generaciju."
        ]
      },
      {
        h2: "Koje izdanje odabrati",
        subsections: [
          {
            h3: "Domaći kockasti dres",
            paragraphs: [
              "Klasični crveno-bijeli dres najsigurniji je izbor. Nosi se na utakmici, u gradu i na putovanjima i nikad ne izgleda zastarjelo. Ako kupuješ samo jedan hrvatski dres, neka bude ovaj: [Hrvatska Modrić 2026](/dres/hrvatska-modric-2026/)."
            ]
          },
          {
            h3: "Gostujući dres",
            paragraphs: [
              "Gostujući dresovi Hrvatske obično su u tamnijim tonovima, najčešće plavima, a kocke se pojavljuju kao detalj ili uzorak. Dobar su izbor ako želiš nešto manje očito ili već imaš domaći."
            ]
          },
          {
            h3: "Komplet za djecu",
            paragraphs: [
              "[Hrvatska Modrić komplet](/dres/hrvatska-modric-komplet/) uključuje dres, hlačice, loptu i kapu, za 40 €. To je poklon koji dijete odmah obuče i s kojim izađe na igralište."
            ]
          }
        ]
      },
      {
        h2: "Veličine za djecu i odrasle",
        paragraphs: [
          "Reprezentativni dresovi za odrasle dolaze u veličinama S–XXL, jednu veličinu više nego klupski. Za orijentaciju: M odgovara opsegu prsa otprilike 96–104 cm, L 104–112 cm, XL 112–120 cm, a XXL 120–128 cm.",
          "Dječje veličine idu od 104 do 176 i biraju se po visini: 116 za djecu visine otprilike 110–116 cm, 140 za 128–140 cm, 164 za 152–164 cm. Dječji dres dolazi s hlačicama. Ako je dijete između dvije veličine, uzmi veću jer će dres nositi i iduću sezonu. Detaljnije piše u [vodiču za dječje veličine](/blog/kako-odabrati-velicinu-dresa-za-dijete/)."
        ]
      },
      {
        h2: "Kako prepoznati kvalitetan kockasti dres",
        paragraphs: [
          "Kod hrvatskog dresa odmah se vidi je li rađen pažljivo. Kocke trebaju biti oštre i ravne, a na šavovima se uzorak ne smije vidljivo lomiti. Ime i broj trebaju biti ušiveni i uredno postavljeni, a materijal lagan i prozračan, ne tanak i plastičan.",
          "Okreni dres naopako i pogledaj šavove: kod dobrog dresa su ravni i čisti i s unutarnje strane. Više o tome piše u članku [kako prepoznati kvalitetan nogometni dres](/blog/kako-prepoznati-kvalitetan-nogometni-dres/)."
        ]
      },
      {
        h2: "Hrvatski dres kao poklon",
        paragraphs: [
          "Kockasti dres je jedan od rijetkih poklona koji odgovara gotovo svima: djetetu koje tek počinje trenirati, tati koji ne propušta utakmicu i prijatelju koji se i danas rado sjeti ljeta 2018. Ako ne znaš čije ime odabrati, Modrić je najsigurniji izbor. Za dijete uzmi komplet, a za odrasle dres u veličini koju inače nosi u majicama. Ako veličina ne sjedne, zamjena je moguća unutar 14 dana."
        ]
      },
      {
        h2: "Kako održavati dres",
        paragraphs: [
          "Peri ga naopako na 30 °C, bez izbjeljivača i omekšivača, i suši na zraku, ne u sušilici. Crvene kocke najbolje čuvaju boju ako dres prvih nekoliko puta opereš odvojeno od bijelog rublja. Ne glačaj preko imena i broja."
        ]
      },
      {
        h2: "Sve hrvatske dresove imaš na jednom mjestu",
        paragraphs: [
          "Sve modele imaš na stranici [Hrvatska dresovi](/dresovi/klub/hrvatska/), a ako tražiš i druge reprezentacije, pogledaj [reprezentativne dresove](/dresovi/kategorija/reprezentativni-dresovi/). Dresovi su od 20 €, plaćaš pouzećem, a dostava traje 2–5 radnih dana po cijeloj Hrvatskoj."
        ]
      }
    ],
    faq: [
      {
        q: "Koje veličine ima dres Hrvatske?",
        a: "Za odrasle S–XXL, za djecu 104–176. Dječji dres dolazi s hlačicama. Koje su veličine trenutno dostupne, piše uz svaki model."
      },
      {
        q: "Koliko košta dres Hrvatske?",
        a: "Dres je 20 €, a dječji komplet s hlačicama, loptom i kapom 40 €."
      },
      {
        q: "Je li ime i broj igrača ušiven?",
        a: "Da, ime i broj igrača su ušiveni, ne samo otisnuti."
      },
      {
        q: "Mogu li zamijeniti veličinu?",
        a: "Da. Javi nam se unutar 14 dana od primitka paketa. Dres mora biti nenošen i neoštećen."
      }
    ]
  }
];

export function getBlogPostBySlug(slug: string) {
  return blogPosts.find((post) => post.slug === slug);
}

// [tekst](/putanja/) → tekst (za brojanje riječi i čisti tekst).
export function stripBlogLinks(text: string) {
  return text.replace(/\[([^\]]+)\]\((\/[^)\s]*)\)/g, "$1");
}

// Sav vidljivi tekst članka (uvod + sekcije + FAQ) kao jedan string.
export function getBlogPlainText(post: BlogPost) {
  const parts: string[] = [...post.paragraphs];
  for (const section of post.sections ?? []) {
    parts.push(section.h2, ...(section.paragraphs ?? []), ...(section.list ?? []));
    for (const sub of section.subsections ?? []) {
      parts.push(sub.h3, ...sub.paragraphs, ...(sub.list ?? []));
    }
  }
  for (const item of post.faq ?? []) parts.push(item.q, item.a);
  return stripBlogLinks(parts.join(" "));
}

export function getBlogReadingTime(post: BlogPost) {
  return estimateReadingTime(getBlogPlainText(post));
}
