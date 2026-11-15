// Banka pitanja za "Kviz dana".
//
// Pravila za nova pitanja:
//   - samo provjerene, POVIJESNE činjenice koje se ne mogu promijeniti
//     (piši "2023. je prešao u..." umjesto "igra za...", "osvojio je 2018."
//     umjesto "ima najviše..." ako bi se to moglo promijeniti),
//   - točno JEDAN točan odgovor (`tocno`) i tri netočna (`netocno`),
//   - kratko i prirodno, hrvatski standard (nogomet, ne "fudbal").
// Redoslijed odgovora miješa igra; godine i brojevi se sami poslože uzlazno.

export type Kategorija =
  | "Svjetsko prvenstvo"
  | "Europsko prvenstvo"
  | "Liga prvaka"
  | "HNL"
  | "Hrvatska reprezentacija"
  | "Klubovi"
  | "Igrači"
  | "Rekordi"
  | "Dresovi i boje"
  | "Pravila igre";

export type Pitanje = {
  kategorija: Kategorija;
  pitanje: string;
  tocno: string;
  netocno: [string, string, string];
};

const SP: Kategorija = "Svjetsko prvenstvo";
const EP: Kategorija = "Europsko prvenstvo";
const LP: Kategorija = "Liga prvaka";
const HNL: Kategorija = "HNL";
const HR: Kategorija = "Hrvatska reprezentacija";
const KL: Kategorija = "Klubovi";
const IG: Kategorija = "Igrači";
const RE: Kategorija = "Rekordi";
const DR: Kategorija = "Dresovi i boje";
const PR: Kategorija = "Pravila igre";

const q = (
  kategorija: Kategorija,
  pitanje: string,
  tocno: string,
  netocno: [string, string, string],
): Pitanje => ({
  kategorija,
  pitanje,
  tocno,
  netocno,
});

export const PITANJA: Pitanje[] = [
  // ── Svjetsko prvenstvo ────────────────────────────────────────────────
  q(
    SP,
    "Koja je reprezentacija osvojila Svjetsko prvenstvo 2022. u Kataru?",
    "Argentina",
    ["Francuska", "Brazil", "Hrvatska"],
  ),
  q(
    SP,
    "Koja je reprezentacija osvojila Svjetsko prvenstvo 2018. u Rusiji?",
    "Francuska",
    ["Hrvatska", "Belgija", "Engleska"],
  ),
  q(SP, "Koja je reprezentacija osvojila Svjetsko prvenstvo 2002.?", "Brazil", [
    "Njemačka",
    "Italija",
    "Francuska",
  ]),
  q(
    SP,
    "Koja je reprezentacija osvojila Svjetsko prvenstvo 2010. u Južnoafričkoj Republici?",
    "Španjolska",
    ["Nizozemska", "Njemačka", "Urugvaj"],
  ),
  q(
    SP,
    "Koja je reprezentacija osvojila Svjetsko prvenstvo 2006. u Njemačkoj?",
    "Italija",
    ["Francuska", "Njemačka", "Portugal"],
  ),
  q(
    SP,
    "Koja je reprezentacija osvojila prvo Svjetsko prvenstvo, 1930.?",
    "Urugvaj",
    ["Argentina", "Brazil", "Italija"],
  ),
  q(SP, "Koja je država bila domaćin Svjetskog prvenstva 2014.?", "Brazil", [
    "Argentina",
    "Njemačka",
    "Meksiko",
  ]),
  q(
    SP,
    "Koje su dvije države zajedno bile domaćini Svjetskog prvenstva 2002.?",
    "Japan i Južna Koreja",
    ["Kina i Japan", "SAD i Kanada", "Južna Koreja i Kina"],
  ),
  q(
    SP,
    "Koje su države bile domaćini Svjetskog prvenstva 2026.?",
    "SAD, Kanada i Meksiko",
    ["SAD i Kanada", "Španjolska, Portugal i Maroko", "Meksiko i SAD"],
  ),
  q(SP, "Koliko je reprezentacija nastupilo na Svjetskom prvenstvu 2026.?", "48", [
    "32",
    "40",
    "64",
  ]),
  q(
    SP,
    "Tko je zabio hat-trick u finalu Svjetskog prvenstva 2022.?",
    "Kylian Mbappé",
    ["Lionel Messi", "Ángel Di María", "Olivier Giroud"],
  ),
  q(
    SP,
    "Kako je odlučeno finale Svjetskog prvenstva 2022. između Argentine i Francuske?",
    "Jedanaestercima nakon 3:3",
    [
      "Golom u produžecima",
      "Jedanaestercima nakon 2:2",
      "Pobjedom 3:2 u regularnom dijelu",
    ],
  ),
  q(
    SP,
    "Tko je zabio pobjednički gol u finalu Svjetskog prvenstva 2010.?",
    "Andrés Iniesta",
    ["David Villa", "Xavi", "Fernando Torres"],
  ),
  q(
    SP,
    "Tko je zabio jedini gol u finalu Svjetskog prvenstva 2014.?",
    "Mario Götze",
    ["Thomas Müller", "Miroslav Klose", "Toni Kroos"],
  ),
  q(
    SP,
    "Kojim je rezultatom Njemačka pobijedila Brazil u polufinalu Svjetskog prvenstva 2014.?",
    "7:1",
    ["4:0", "5:1", "6:2"],
  ),
  q(
    SP,
    "Tko je zabio dva gola glavom u finalu Svjetskog prvenstva 1998.?",
    "Zinédine Zidane",
    ["Thierry Henry", "Emmanuel Petit", "Didier Deschamps"],
  ),
  q(
    SP,
    "Tko je bio najbolji strijelac Svjetskog prvenstva 2022. s osam golova?",
    "Kylian Mbappé",
    ["Lionel Messi", "Olivier Giroud", "Harry Kane"],
  ),
  q(
    SP,
    "Tko je bio najbolji strijelac Svjetskog prvenstva 2018.?",
    "Harry Kane",
    ["Antoine Griezmann", "Romelu Lukaku", "Cristiano Ronaldo"],
  ),
  q(
    SP,
    "Tko je bio najbolji strijelac Svjetskog prvenstva 2014.?",
    "James Rodríguez",
    ["Thomas Müller", "Lionel Messi", "Neymar"],
  ),
  q(
    SP,
    "Tko je bio najbolji strijelac Svjetskog prvenstva 2002. s osam golova?",
    "Ronaldo",
    ["Rivaldo", "Miroslav Klose", "Hakan Şükür"],
  ),
  q(
    SP,
    "Tko je proglašen najboljim igračem Svjetskog prvenstva 2018.?",
    "Luka Modrić",
    ["Kylian Mbappé", "Antoine Griezmann", "Eden Hazard"],
  ),
  q(
    SP,
    "Tko je proglašen najboljim igračem Svjetskog prvenstva 2010.?",
    "Diego Forlán",
    ["Andrés Iniesta", "Wesley Sneijder", "Xavi"],
  ),
  q(
    SP,
    "Tko je proglašen najboljim igračem i Svjetskog prvenstva 2014. i onog 2022.?",
    "Lionel Messi",
    ["Kylian Mbappé", "Luka Modrić", "Neymar"],
  ),
  q(
    SP,
    "Zbog čega je Zidane isključen u finalu Svjetskog prvenstva 2006.?",
    "Udario je Materazzija glavom",
    ["Igrao je rukom na crti", "Skupio je dva žuta kartona", "Gurnuo je suca"],
  ),
  q(SP, "Koji je igrač osvojio tri svjetska prvenstva?", "Pelé", [
    "Diego Maradona",
    "Franz Beckenbauer",
    "Ronaldo",
  ]),
  q(
    SP,
    'Protiv koje je reprezentacije Maradona 1986. zabio gol koji se zove „Božja ruka“?',
    "Engleske",
    ["Njemačke", "Belgije", "Italije"],
  ),
  q(
    SP,
    "Koja je reprezentacija 1950. na Maracani pobijedila Brazil i postala svjetski prvak?",
    "Urugvaj",
    ["Argentina", "Italija", "Švedska"],
  ),
  q(
    SP,
    "Koja je reprezentacija osvojila Svjetsko prvenstvo 1966. kao domaćin?",
    "Engleska",
    ["Zapadna Njemačka", "Brazil", "Portugal"],
  ),
  q(
    SP,
    "Tko je osvojio Svjetsko prvenstvo i kao igrač (1998.) i kao izbornik (2018.)?",
    "Didier Deschamps",
    ["Zinédine Zidane", "Laurent Blanc", "Franz Beckenbauer"],
  ),
  q(
    SP,
    "U kojim je mjesecima odigrano Svjetsko prvenstvo 2022.?",
    "Studeni i prosinac",
    ["Lipanj i srpanj", "Svibanj i lipanj", "Listopad i studeni"],
  ),
  q(
    SP,
    "Na kojem je stadionu odigrano finale Svjetskog prvenstva 2022.?",
    "Lusail",
    ["Al Bayt", "Khalifa International", "Education City"],
  ),
  q(
    SP,
    "Koji je igrač 2014. postao rekorder po broju golova na svjetskim prvenstvima?",
    "Miroslav Klose",
    ["Thomas Müller", "Ronaldo", "Lionel Messi"],
  ),
  q(
    SP,
    "Tko je promašio posljednji, odlučujući jedanaesterac u finalu Svjetskog prvenstva 1994.?",
    "Roberto Baggio",
    ["Alessandro Del Piero", "Paolo Maldini", "Romário"],
  ),

  // ── Europsko prvenstvo ────────────────────────────────────────────────
  q(
    EP,
    "Koja je reprezentacija osvojila Europsko prvenstvo 2024.?",
    "Španjolska",
    ["Engleska", "Francuska", "Njemačka"],
  ),
  q(EP, "U kojoj je državi odigrano Europsko prvenstvo 2024.?", "Njemačka", [
    "Francuska",
    "Engleska",
    "Italija",
  ]),
  q(
    EP,
    "Koja je reprezentacija osvojila Europsko prvenstvo 2020. (odigrano 2021.)?",
    "Italija",
    ["Engleska", "Španjolska", "Danska"],
  ),
  q(
    EP,
    "Na kojem je stadionu odigrano finale Europskog prvenstva 2020.?",
    "Wembley",
    ["Olimpijski stadion u Rimu", "Puskás Aréna", "Allianz Arena"],
  ),
  q(
    EP,
    "Koja je reprezentacija osvojila Europsko prvenstvo 2016. u Francuskoj?",
    "Portugal",
    ["Francuska", "Wales", "Njemačka"],
  ),
  q(EP, "Tko je zabio jedini gol u finalu Europskog prvenstva 2016.?", "Éder", [
    "Cristiano Ronaldo",
    "Nani",
    "Renato Sanches",
  ]),
  q(
    EP,
    "Kojim je rezultatom Španjolska pobijedila Italiju u finalu Europskog prvenstva 2012.?",
    "4:0",
    ["1:0", "2:1", "3:1"],
  ),
  q(
    EP,
    "Koja je reprezentacija iznenađujuće osvojila Europsko prvenstvo 2004.?",
    "Grčka",
    ["Portugal", "Češka", "Nizozemska"],
  ),
  q(
    EP,
    "Koja je reprezentacija, ušavši umjesto Jugoslavije, osvojila Europsko prvenstvo 1992.?",
    "Danska",
    ["Švedska", "Nizozemska", "Njemačka"],
  ),
  q(
    EP,
    "Koja je reprezentacija osvajanjem Europskog prvenstva 2024. postala prva s četiri europska naslova?",
    "Španjolska",
    ["Njemačka", "Italija", "Francuska"],
  ),
  q(
    EP,
    "Koji je Španjolac na Europskom prvenstvu 2024. postao najmlađi strijelac u povijesti turnira?",
    "Lamine Yamal",
    ["Pedri", "Gavi", "Nico Williams"],
  ),
  q(
    EP,
    "Tko je zabio pobjednički gol u finalu Europskog prvenstva 2024.?",
    "Mikel Oyarzabal",
    ["Nico Williams", "Dani Olmo", "Álvaro Morata"],
  ),
  q(
    EP,
    "Tko je proglašen najboljim igračem Europskog prvenstva 2024.?",
    "Rodri",
    ["Lamine Yamal", "Jude Bellingham", "Dani Olmo"],
  ),
  q(
    EP,
    "Tko je rekorder po broju golova na europskim prvenstvima?",
    "Cristiano Ronaldo",
    ["Michel Platini", "Antoine Griezmann", "Alan Shearer"],
  ),
  q(
    EP,
    "Koja je reprezentacija osvojila Europsko prvenstvo 1976. Panenkinim jedanaestercem?",
    "Čehoslovačka",
    ["Zapadna Njemačka", "Nizozemska", "Jugoslavija"],
  ),
  q(
    EP,
    "Koji je Nizozemac zabio slavni volej u finalu Europskog prvenstva 1988.?",
    "Marco van Basten",
    ["Ruud Gullit", "Frank Rijkaard", "Ronald Koeman"],
  ),
  q(EP, "Koje je Europsko prvenstvo prvo imalo 24 reprezentacije?", "2016.", [
    "2008.",
    "2012.",
    "2020.",
  ]),
  q(
    EP,
    "Koja je reprezentacija izbacila Hrvatsku u četvrtfinalu Europskog prvenstva 2008.?",
    "Turska",
    ["Njemačka", "Rusija", "Španjolska"],
  ),
  q(
    EP,
    "Koju je reprezentaciju Hrvatska pobijedila 2:1 u skupini Europskog prvenstva 2016.?",
    "Španjolsku",
    ["Portugal", "Češku", "Tursku"],
  ),
  q(
    EP,
    "Kojim je rezultatom Hrvatska pobijedila Njemačku u skupini Europskog prvenstva 2008.?",
    "2:1",
    ["1:0", "2:0", "3:1"],
  ),
  q(
    EP,
    "Koja je reprezentacija golom u 98. minuti remizirala s Hrvatskom na Europskom prvenstvu 2024.?",
    "Italija",
    ["Albanija", "Španjolska", "Švicarska"],
  ),
  q(
    EP,
    "Koje je godine Hrvatska prvi put igrala na Europskom prvenstvu?",
    "1996.",
    ["1992.", "2000.", "2004."],
  ),

  // ── Liga prvaka ───────────────────────────────────────────────────────
  q(LP, "Koji klub ima najviše naslova prvaka Europe?", "Real Madrid", [
    "AC Milan",
    "Bayern München",
    "Liverpool",
  ]),
  q(
    LP,
    "Tko je najbolji strijelac u povijesti Lige prvaka?",
    "Cristiano Ronaldo",
    ["Lionel Messi", "Robert Lewandowski", "Raúl"],
  ),
  q(LP, "Koji je klub osvojio Ligu prvaka u sezoni 2023./24.?", "Real Madrid", [
    "Borussia Dortmund",
    "Manchester City",
    "Bayern München",
  ]),
  q(
    LP,
    "Koji je klub osvojio svoju prvu Ligu prvaka 2023. u Istanbulu?",
    "Manchester City",
    ["Inter", "Arsenal", "PSG"],
  ),
  q(
    LP,
    "Koji je klub osvojio Ligu prvaka tri puta zaredom, od 2016. do 2018.?",
    "Real Madrid",
    ["Barcelona", "Bayern München", "Juventus"],
  ),
  q(
    LP,
    "Koji je trener s Realom osvojio Ligu prvaka tri puta zaredom?",
    "Zinédine Zidane",
    ["Carlo Ancelotti", "José Mourinho", "Rafael Benítez"],
  ),
  q(
    LP,
    "Koji je trener 2024. osvojio svoju petu Ligu prvaka?",
    "Carlo Ancelotti",
    ["Pep Guardiola", "Zinédine Zidane", "Jürgen Klopp"],
  ),
  q(
    LP,
    "Koji je klub 2005. u Istanbulu preokrenuo 0:3 protiv Milana i osvojio Ligu prvaka?",
    "Liverpool",
    ["Manchester United", "Chelsea", "Juventus"],
  ),
  q(
    LP,
    "Koji je klub 1999. s dva gola u sudačkoj nadoknadi okrenuo finale protiv Bayerna?",
    "Manchester United",
    ["Arsenal", "Liverpool", "Valencia"],
  ),
  q(
    LP,
    "Koji je klub 2012. u Münchenu osvojio svoju prvu Ligu prvaka, pobijedivši Bayern na jedanaesterce?",
    "Chelsea",
    ["Arsenal", "Tottenham", "Manchester City"],
  ),
  q(
    LP,
    "Koji je klub 2010. pod Mourinhom osvojio Ligu prvaka i trostruku krunu?",
    "Inter",
    ["Porto", "Chelsea", "Real Madrid"],
  ),
  q(LP, "S kojim je klubom José Mourinho osvojio Ligu prvaka 2004.?", "Porto", [
    "Benfica",
    "Chelsea",
    "Monaco",
  ]),
  q(
    LP,
    "Tko je zabio pobjednički gol u finalu Lige prvaka 2020. protiv PSG-a?",
    "Kingsley Coman",
    ["Robert Lewandowski", "Thomas Müller", "Serge Gnabry"],
  ),
  q(LP, "Tko je škaricama zabio u finalu Lige prvaka 2018.?", "Gareth Bale", [
    "Cristiano Ronaldo",
    "Karim Benzema",
    "Sergio Ramos",
  ]),
  q(
    LP,
    "Tko je u 93. minuti finala 2014. izjednačio za Real protiv Atlética?",
    "Sergio Ramos",
    ["Gareth Bale", "Cristiano Ronaldo", "Marcelo"],
  ),
  q(
    LP,
    "Koji je Hrvat zabio u dva finala Lige prvaka, za Bayern i za Juventus?",
    "Mario Mandžukić",
    ["Ivica Olić", "Ivan Rakitić", "Ivan Perišić"],
  ),
  q(
    LP,
    "Koji je Hrvat zabio prvi gol u finalu Lige prvaka 2015. za Barcelonu?",
    "Ivan Rakitić",
    ["Luka Modrić", "Mario Mandžukić", "Mateo Kovačić"],
  ),
  q(
    LP,
    "Koliko je naslova Lige prvaka Luka Modrić osvojio s Real Madridom?",
    "6",
    ["4", "5", "7"],
  ),
  q(
    LP,
    "Koji je hrvatski veznjak osvojio Ligu prvaka i s Real Madridom i s Chelseajem?",
    "Mateo Kovačić",
    ["Luka Modrić", "Ivan Rakitić", "Marcelo Brozović"],
  ),
  q(
    LP,
    "Koji je Hrvat 1993. osvojio Ligu prvaka s Marseilleom?",
    "Alen Bokšić",
    ["Davor Šuker", "Zvonimir Boban", "Igor Štimac"],
  ),
  q(LP, "Za koji je klub Dado Pršo igrao finale Lige prvaka 2004.?", "Monaco", [
    "Porto",
    "Rangers",
    "Deportivo",
  ]),
  q(
    LP,
    "Koji je hrvatski klub igrao četvrtfinale Lige prvaka u sezoni 1994./95.?",
    "Hajduk Split",
    ["Dinamo Zagreb", "Rijeka", "Osijek"],
  ),
  q(
    LP,
    "Na kojoj se skladbi temelji himna Lige prvaka?",
    'Händelovoj „Zadok the Priest“',
    [
      'Beethovenovoj „Odi radosti“',
      'Verdijevoj „Aidi“',
      'Mozartovom „Requiemu“',
    ],
  ),
  q(
    LP,
    "Koje se godine Kup europskih prvaka preimenovao u Ligu prvaka?",
    "1992.",
    ["1988.", "1995.", "1999."],
  ),
  q(
    LP,
    "Koji je igrač Barcelone 2012. zabio pet golova Leverkusenu u Ligi prvaka?",
    "Lionel Messi",
    ["David Villa", "Alexis Sánchez", "Pedro"],
  ),
  q(
    LP,
    "Koji je britanski klub prvi osvojio Kup europskih prvaka, 1967.?",
    "Celtic",
    ["Manchester United", "Liverpool", "Rangers"],
  ),
  q(
    LP,
    "Tko je zabio jedini gol u finalu Lige prvaka 2022. protiv Liverpoola?",
    "Vinícius Júnior",
    ["Karim Benzema", "Federico Valverde", "Rodrygo"],
  ),
  q(
    LP,
    "Koji je klub osvojio Ligu prvaka 2019. pobjedom nad Tottenhamom u Madridu?",
    "Liverpool",
    ["Ajax", "Barcelona", "Chelsea"],
  ),

  // ── HNL ───────────────────────────────────────────────────────────────
  q(HNL, "Koji je klub osvojio prvo izdanje HNL-a, 1992.?", "Hajduk Split", [
    "Dinamo Zagreb",
    "Rijeka",
    "NK Zagreb",
  ]),
  q(
    HNL,
    "Koji je klub osvojio najviše naslova prvaka Hrvatske?",
    "Dinamo Zagreb",
    ["Hajduk Split", "Rijeka", "Osijek"],
  ),
  q(
    HNL,
    "Koji je klub 2017. prekinuo Dinamov niz od 11 uzastopnih naslova prvaka?",
    "Rijeka",
    ["Hajduk Split", "Osijek", "Lokomotiva"],
  ),
  q(
    HNL,
    "Koji je klub 2002. osvojio svoj jedini naslov prvaka Hrvatske?",
    "NK Zagreb",
    ["Osijek", "Varaždin", "Slaven Belupo"],
  ),
  q(HNL, "U kojem je gradu 1911. osnovan Hajduk?", "U Pragu", [
    "U Splitu",
    "U Beču",
    "U Zagrebu",
  ]),
  q(HNL, "Kako se zove stadion Hajduka otvoren 1979.?", "Poljud", [
    "Stari plac",
    "Kantrida",
    "Gradski vrt",
  ]),
  q(
    HNL,
    "Za koje je natjecanje 1979. izgrađen stadion Poljud?",
    "Mediteranske igre",
    ["Europsko prvenstvo", "Univerzijadu", "Olimpijske igre"],
  ),
  q(HNL, "Kako se zove stadion Dinama u Zagrebu?", "Maksimir", [
    "Kranjčevićeva",
    "Rujevica",
    "Kantrida",
  ]),
  q(HNL, "Na koji se stadion Rijeka preselila 2015.?", "Rujevica", [
    "Kantrida",
    "Gradski vrt",
    "Aldo Drosina",
  ]),
  q(
    HNL,
    "Koji je stari stadion Rijeke poznat po stijeni iza jednog gola?",
    "Kantrida",
    ["Rujevica", "Poljud", "Šubićevac"],
  ),
  q(HNL, "Kako se zove navijačka skupina Hajduka, osnovana 1950.?", "Torcida", [
    "Bad Blue Boys",
    "Armada",
    "Kohorta",
  ]),
  q(HNL, "Kako se zove navijačka skupina Dinama?", "Bad Blue Boys", [
    "Torcida",
    "Armada",
    "White Stones",
  ]),
  q(HNL, "Kako se zove navijačka skupina Rijeke?", "Armada", [
    "Kohorta",
    "Torcida",
    "Demoni",
  ]),
  q(HNL, "Kako se zove navijačka skupina Osijeka?", "Kohorta", [
    "Armada",
    "Demoni",
    "Bad Blue Boys",
  ]),
  q(HNL, "Kako se zove utakmica između Dinama i Hajduka?", "Vječni derbi", [
    "Jadranski derbi",
    "Plavi derbi",
    "Hrvatski klasik",
  ]),
  q(HNL, "Kako navijači od milja zovu Hajduk?", "Bili", [
    "Modri",
    "Zeleni",
    "Crveni",
  ]),
  q(
    HNL,
    "Koji je europski trofej Dinamo osvojio 1967.?",
    "Kup velesajamskih gradova",
    ["Kup pobjednika kupova", "Kup prvaka", "Intertoto kup"],
  ),
  q(
    HNL,
    "Pod kojim se imenom Dinamo natjecao od 1993. do 2000.?",
    "Croatia Zagreb",
    ["HAŠK", "Zagrebački plavi", "Concordia"],
  ),
  q(HNL, "Koje je godine osnovan Dinamo Zagreb?", "1945.", [
    "1911.",
    "1926.",
    "1961.",
  ]),
  q(
    HNL,
    "Tko je 2021. zabio hat-trick Tottenhamu u Europskoj ligi?",
    "Mislav Oršić",
    ["Bruno Petković", "Luka Ivanušec", "Lovro Majer"],
  ),
  q(HNL, "Iz kojeg je grada Slaven Belupo?", "Iz Koprivnice", [
    "Iz Varaždina",
    "Iz Bjelovara",
    "Iz Čakovca",
  ]),
  q(HNL, "Iz kojeg je grada NK Istra 1961?", "Iz Pule", [
    "Iz Rovinja",
    "Iz Poreča",
    "Iz Pazina",
  ]),
  q(HNL, "Iz kojeg je grada HNK Gorica?", "Iz Velike Gorice", [
    "Iz Nove Gradiške",
    "Iz Gospića",
    "Iz Gorice u Italiji",
  ]),

  // ── Hrvatska reprezentacija ───────────────────────────────────────────
  q(
    HR,
    "Koje je mjesto Hrvatska osvojila na Svjetskom prvenstvu 2018.?",
    "Drugo",
    ["Prvo", "Treće", "Četvrto"],
  ),
  q(
    HR,
    "Koje je mjesto Hrvatska osvojila na Svjetskom prvenstvu 2022. u Kataru?",
    "Treće",
    ["Drugo", "Četvrto", "Peto"],
  ),
  q(
    HR,
    "Koje je mjesto Hrvatska osvojila na svom prvom Svjetskom prvenstvu, 1998.?",
    "Treće",
    ["Drugo", "Četvrto", "Osmo"],
  ),
  q(
    HR,
    "Kojim je rezultatom završilo finale Svjetskog prvenstva 2018. između Francuske i Hrvatske?",
    "4:2",
    ["2:1", "3:1", "4:1"],
  ),
  q(
    HR,
    "Na kojem je stadionu Hrvatska igrala finale Svjetskog prvenstva 2018.?",
    "Lužnjiki",
    ["Krestovski", "Otkrytie Arena", "Kazan Arena"],
  ),
  q(
    HR,
    "Tko je zabio prvi gol Hrvatske u finalu Svjetskog prvenstva 2018.?",
    "Ivan Perišić",
    ["Mario Mandžukić", "Luka Modrić", "Ante Rebić"],
  ),
  q(
    HR,
    "Tko je zabio pobjednički gol protiv Engleske u polufinalu Svjetskog prvenstva 2018.?",
    "Mario Mandžukić",
    ["Ivan Perišić", "Andrej Kramarić", "Ante Rebić"],
  ),
  q(
    HR,
    "Koliko je utakmica s produžecima Hrvatska odigrala na putu do finala Svjetskog prvenstva 2018.?",
    "Tri",
    ["Jednu", "Dvije", "Četiri"],
  ),
  q(
    HR,
    "Koji je vratar obranio tri jedanaesterca Danskoj na Svjetskom prvenstvu 2018.?",
    "Danijel Subašić",
    ["Dominik Livaković", "Lovre Kalinić", "Stipe Pletikosa"],
  ),
  q(
    HR,
    "Koji je vratar obranio tri jedanaesterca Japanu na Svjetskom prvenstvu 2022.?",
    "Dominik Livaković",
    ["Danijel Subašić", "Ivica Ivušić", "Lovre Kalinić"],
  ),
  q(
    HR,
    "Kojim je rezultatom Hrvatska pobijedila Argentinu u skupini Svjetskog prvenstva 2018.?",
    "3:0",
    ["1:0", "2:0", "2:1"],
  ),
  q(
    HR,
    "Tko je izjednačio protiv Brazila u četvrtfinalu Svjetskog prvenstva 2022.?",
    "Bruno Petković",
    ["Andrej Kramarić", "Mislav Oršić", "Luka Modrić"],
  ),
  q(
    HR,
    "Koju je reprezentaciju Hrvatska pobijedila 4:1 u skupini Svjetskog prvenstva 2022.?",
    "Kanadu",
    ["Maroko", "Belgiju", "Japan"],
  ),
  q(
    HR,
    "Koju je reprezentaciju Hrvatska pobijedila u utakmici za broncu na Svjetskom prvenstvu 2022.?",
    "Maroko",
    ["Argentinu", "Francusku", "Brazil"],
  ),
  q(
    HR,
    "Koju je reprezentaciju Hrvatska pobijedila 3:0 u četvrtfinalu Svjetskog prvenstva 1998.?",
    "Njemačku",
    ["Rumunjsku", "Nizozemsku", "Italiju"],
  ),
  q(
    HR,
    "Koliko je golova Davor Šuker zabio na Svjetskom prvenstvu 1998.?",
    "6",
    ["4", "5", "8"],
  ),
  q(
    HR,
    "Tko je bio izbornik Hrvatske na Svjetskom prvenstvu 1998.?",
    "Miroslav Blažević",
    ["Otto Barić", "Slaven Bilić", "Zlatko Dalić"],
  ),
  q(
    HR,
    "Tko je bio izbornik Hrvatske na Svjetskom prvenstvu 2018.?",
    "Zlatko Dalić",
    ["Ante Čačić", "Niko Kovač", "Slaven Bilić"],
  ),
  q(
    HR,
    "Protiv koje je reprezentacije Hrvatska 1990. odigrala prvu utakmicu moderne povijesti?",
    "SAD-a",
    ["Rumunjske", "Italije", "Slovenije"],
  ),
  q(
    HR,
    "Na kojem je stadionu Hrvatska u studenom 2007. pobijedila Englesku 3:2?",
    "Wembley",
    ["Old Trafford", "Maksimir", "Anfield"],
  ),
  q(
    HR,
    "Koji je hrvatski igrač na Svjetskom prvenstvu 2006. dobio tri žuta kartona u istoj utakmici?",
    "Josip Šimunić",
    ["Dario Šimić", "Robert Kovač", "Igor Tudor"],
  ),
  q(
    HR,
    "Koju je reprezentaciju Hrvatska pobijedila 2:1 na Svjetskom prvenstvu 2002.?",
    "Italiju",
    ["Meksiko", "Ekvador", "Brazil"],
  ),
  q(HR, "Kako se od milja zove hrvatska nogometna reprezentacija?", "Vatreni", [
    "Sokoli",
    "Plavi",
    "Jadranski lavovi",
  ]),
  q(HR, "U kojem je gradu rođen Luka Modrić?", "U Zadru", [
    "U Splitu",
    "U Šibeniku",
    "U Zagrebu",
  ]),
  q(
    HR,
    "Koji je igrač odigrao najviše utakmica za hrvatsku reprezentaciju?",
    "Luka Modrić",
    ["Darijo Srna", "Ivan Perišić", "Stipe Pletikosa"],
  ),
  q(
    HR,
    "Koja je reprezentacija pobijedila Hrvatsku u finalu Lige nacija 2023.?",
    "Španjolska",
    ["Italija", "Nizozemska", "Francuska"],
  ),

  // ── Klubovi ───────────────────────────────────────────────────────────
  q(KL, "Koji klub igra domaće utakmice na Anfieldu?", "Liverpool", [
    "Everton",
    "Manchester City",
    "Manchester United",
  ]),
  q(KL, "Kako se zove stadion Manchester Uniteda?", "Old Trafford", [
    "Etihad",
    "Anfield",
    "Stamford Bridge",
  ]),
  q(KL, "Kako se zove stadion Real Madrida?", "Santiago Bernabéu", [
    "Camp Nou",
    "Metropolitano",
    "Mestalla",
  ]),
  q(KL, "Koji klub igra na stadionu Camp Nou?", "Barcelona", [
    "Espanyol",
    "Valencia",
    "Real Madrid",
  ]),
  q(
    KL,
    "Koji klub igra domaće utakmice na Allianz Areni u Münchenu?",
    "Bayern München",
    ["Borussia Dortmund", "RB Leipzig", "Bayer Leverkusen"],
  ),
  q(
    KL,
    "Koja dva kluba desetljećima dijele stadion San Siro?",
    "AC Milan i Inter",
    ["Juventus i Torino", "Roma i Lazio", "Napoli i Inter"],
  ),
  q(KL, "Kako se zove derbi Real Madrida i Barcelone?", "El Clásico", [
    "Derby della Madonnina",
    "Der Klassiker",
    "Superclásico",
  ]),
  q(KL, "Kako se zove derbi Milana i Intera?", "Derby della Madonnina", [
    "Derby d'Italia",
    "Derby della Capitale",
    "El Clásico",
  ]),
  q(KL, 'Koja dva kluba igraju „Old Firm“ derbi?', "Celtic i Rangers", [
    "Liverpool i Everton",
    "Arsenal i Tottenham",
    "Hearts i Hibernian",
  ]),
  q(
    KL,
    "Koja dva kluba igraju argentinski Superclásico?",
    "Boca Juniors i River Plate",
    [
      "Racing i Independiente",
      "Boca Juniors i Racing",
      "River Plate i San Lorenzo",
    ],
  ),
  q(
    KL,
    'Koji je engleski klub poznat kao „Topnici“ (The Gunners)?',
    "Arsenal",
    ["Chelsea", "West Ham", "Tottenham"],
  ),
  q(KL, 'Koji je klub poznat po nadimku „Stara dama“?', "Juventus", [
    "AC Milan",
    "Inter",
    "Roma",
  ]),
  q(
    KL,
    'Navijači kojeg kluba pjevaju himnu „You’ll Never Walk Alone“?',
    "Liverpoola",
    ["Manchester Uniteda", "Evertona", "Leedsa"],
  ),
  q(KL, 'Koji klub ima geslo „Més que un club“ (Više od kluba)?', "Barcelona", [
    "Athletic Bilbao",
    "Valencia",
    "Real Madrid",
  ]),
  q(
    KL,
    "Koji je klub sezonu 2003./04. u Premier ligi završio bez poraza?",
    "Arsenal",
    ["Chelsea", "Manchester United", "Liverpool"],
  ),
  q(
    KL,
    "Koji je klub senzacionalno osvojio Premier ligu u sezoni 2015./16.?",
    "Leicester City",
    ["Tottenham", "West Ham", "Southampton"],
  ),
  q(
    KL,
    "Koji je klub u sezoni 2023./24. postao prvak Bundeslige bez ijednog poraza?",
    "Bayer Leverkusen",
    ["Bayern München", "VfB Stuttgart", "Borussia Dortmund"],
  ),
  q(
    KL,
    "Koji je klub 2023. postao prvak Italije prvi put nakon Maradonine ere?",
    "Napoli",
    ["Lazio", "Roma", "Atalanta"],
  ),
  q(
    KL,
    "Koji je klub od 2021. do 2024. osvojio četiri naslova Premier lige zaredom?",
    "Manchester City",
    ["Liverpool", "Manchester United", "Chelsea"],
  ),
  q(
    KL,
    "Koji je klub osvojio najviše naslova Europske lige (Kupa UEFA)?",
    "Sevilla",
    ["Inter", "Liverpool", "Atlético Madrid"],
  ),
  q(KL, "Koje je godine osnovan Real Madrid?", "1902.", [
    "1899.",
    "1910.",
    "1920.",
  ]),
  q(KL, "Tko je 1899. osnovao Barcelonu?", "Joan Gamper", [
    "Santiago Bernabéu",
    "Johan Cruyff",
    "Josep Suñol",
  ]),
  q(
    KL,
    "Koji je slavni bivši igrač suvlasnik Inter Miamija?",
    "David Beckham",
    ["Thierry Henry", "Kaká", "Andrea Pirlo"],
  ),
  q(KL, "Kako se zove stadion Borussije Dortmund?", "Signal Iduna Park", [
    "Veltins-Arena",
    "Red Bull Arena",
    "BayArena",
  ]),
  q(KL, "Kako se zove slavna južna tribina Dortmunda?", "Žuti zid", [
    "Crna zavjesa",
    "Kop",
    "Curva Sud",
  ]),
  q(KL, "Kako se zove stadion Benfice?", "Estádio da Luz", [
    "Estádio do Dragão",
    "José Alvalade",
    "Estádio do Bessa",
  ]),
  q(
    KL,
    "Koji je klub 2020. osvojio prvi naslov prvaka Engleske nakon 30 godina?",
    "Liverpool",
    ["Arsenal", "Manchester City", "Chelsea"],
  ),
  q(
    KL,
    "Koji je klub osvojio 11 naslova Bundeslige zaredom, od 2013. do 2023.?",
    "Bayern München",
    ["Borussia Dortmund", "Schalke 04", "Bayer Leverkusen"],
  ),

  // ── Igrači ────────────────────────────────────────────────────────────
  q(IG, 'Koji igrač nosi nadimak „La Pulga“ (Buha)?', "Lionel Messi", [
    "Neymar",
    "Sergio Agüero",
    "Luis Suárez",
  ]),
  q(IG, 'Koji je Brazilac poznat kao „Il Fenomeno“?', "Ronaldo", [
    "Ronaldinho",
    "Rivaldo",
    "Kaká",
  ]),
  q(IG, "U koji je klub Lionel Messi prešao 2023. iz PSG-a?", "Inter Miami", [
    "Barcelonu",
    "Al-Hilal",
    "Manchester City",
  ]),
  q(
    IG,
    "U koji je saudijski klub Cristiano Ronaldo prešao nakon Svjetskog prvenstva 2022.?",
    "Al-Nassr",
    ["Al-Hilal", "Sporting", "Inter Miami"],
  ),
  q(
    IG,
    "Koji je igrač 2017. prešao iz Barcelone u PSG za 222 milijuna eura?",
    "Neymar",
    ["Kylian Mbappé", "Philippe Coutinho", "Ousmane Dembélé"],
  ),
  q(IG, "Koji je igrač 2024. iz PSG-a prešao u Real Madrid?", "Kylian Mbappé", [
    "Neymar",
    "Achraf Hakimi",
    "Marco Verratti",
  ]),
  q(
    IG,
    "Iz kojeg je kluba Jude Bellingham 2023. prešao u Real Madrid?",
    "Borussije Dortmund",
    ["Birmingham Cityja", "Liverpoola", "Bayerna"],
  ),
  q(
    IG,
    "Iz kojeg je kluba Erling Haaland 2022. prešao u Manchester City?",
    "Borussije Dortmund",
    ["RB Salzburga", "Moldea", "RB Leipziga"],
  ),
  q(
    IG,
    "U koji je klub Robert Lewandowski prešao 2022. iz Bayerna?",
    "Barcelonu",
    ["Real Madrid", "PSG", "Chelsea"],
  ),
  q(
    IG,
    "Iz kojeg je kluba Luka Modrić 2012. prešao u Real Madrid?",
    "Tottenhama",
    ["Chelseaja", "Arsenala", "Dinama Zagreb"],
  ),
  q(
    IG,
    "Iz kojeg je hrvatskog kluba Luka Modrić 2008. prešao u Tottenham?",
    "Iz Dinama Zagreb",
    ["Iz Hajduka", "Iz Rijeke", "Iz Osijeka"],
  ),
  q(
    IG,
    "U koji je klub Joško Gvardiol prešao 2023. iz RB Leipziga?",
    "Manchester City",
    ["Chelsea", "Real Madrid", "Bayern München"],
  ),
  q(
    IG,
    "Za koja je dva velika španjolska kluba Ivan Rakitić igrao?",
    "Sevillu i Barcelonu",
    ["Valenciju i Real", "Atlético i Sevillu", "Barcelonu i Valenciju"],
  ),
  q(
    IG,
    "Za koji je talijanski klub Zvonimir Boban igrao gotovo cijelo desetljeće?",
    "AC Milan",
    ["Juventus", "Inter", "Lazio"],
  ),
  q(
    IG,
    "Koji je Hrvat igrao i za Real Madrid i za Barcelonu?",
    "Robert Prosinečki",
    ["Davor Šuker", "Luka Modrić", "Ivan Rakitić"],
  ),
  q(
    IG,
    "U kojem je španjolskom klubu Davor Šuker igrao prije Real Madrida?",
    "U Sevilli",
    ["U Valenciji", "U Betisu", "U Barceloni"],
  ),
  q(
    IG,
    "Kako se zove potez kojim je Johan Cruyff 1974. prevario švedskog braniča?",
    "Cruyffov okret",
    ["Elastico", "Rabona", "Ruleta"],
  ),
  q(
    IG,
    "Koji je igrač Barcelone 2005. dobio pljesak navijača Reala na Bernabéuu?",
    "Ronaldinho",
    ["Lionel Messi", "Samuel Eto'o", "Deco"],
  ),
  q(IG, 'Koji je Portugalac poznat kao „Crna pantera“?', "Eusébio", [
    "Luís Figo",
    "Rui Costa",
    "Nani",
  ]),
  q(
    IG,
    "Za koji je jedini klub Paolo Maldini igrao cijelu karijeru?",
    "AC Milan",
    ["Inter", "Juventus", "Roma"],
  ),
  q(
    IG,
    "Za koji je jedini klub Francesco Totti igrao cijelu karijeru?",
    "Roma",
    ["Lazio", "Fiorentina", "Napoli"],
  ),
  q(
    IG,
    "Koji je nogometaš, dobitnik Zlatne lopte 1995., kasnije postao predsjednik Liberije?",
    "George Weah",
    ["Samuel Eto'o", "Didier Drogba", "Roger Milla"],
  ),
  q(IG, "Koji je vratar osvojio Zlatnu loptu 1963.?", "Lav Jašin", [
    "Gordon Banks",
    "Dino Zoff",
    "Sepp Maier",
  ]),
  q(IG, "Koje je godine Luka Modrić osvojio Zlatnu loptu?", "2018.", [
    "2016.",
    "2017.",
    "2019.",
  ]),
  q(IG, "Tko je 2023. osvojio svoju osmu Zlatnu loptu?", "Lionel Messi", [
    "Cristiano Ronaldo",
    "Erling Haaland",
    "Kylian Mbappé",
  ]),
  q(IG, "Tko je osvojio Zlatnu loptu 2024.?", "Rodri", [
    "Vinícius Júnior",
    "Jude Bellingham",
    "Lamine Yamal",
  ]),
  q(IG, "Tko je osvojio Zlatnu loptu 2022.?", "Karim Benzema", [
    "Lionel Messi",
    "Robert Lewandowski",
    "Sadio Mané",
  ]),
  q(
    IG,
    "Tko je osvojio Zlatnu loptu 2007., posljednju prije ere Messija i Ronalda?",
    "Kaká",
    ["Ronaldinho", "Fabio Cannavaro", "Andrea Pirlo"],
  ),
  q(IG, "Koje godine Zlatna lopta nije dodijeljena zbog pandemije?", "2020.", [
    "2019.",
    "2021.",
    "2022.",
  ]),
  q(
    IG,
    "Po kojem se igraču zove FIFA-ina nagrada za najljepši gol godine?",
    "Ferencu Puskásu",
    ["Peléu", "Diegu Maradoni", "Johanu Cruyffu"],
  ),
  q(IG, "Kako se pravim imenom zvao Pelé?", "Edson Arantes do Nascimento", [
    "Ronaldo Luís Nazário de Lima",
    "Ricardo Izecson dos Santos Leite",
    "Artur Antunes Coimbra",
  ]),
  q(IG, "Kako se pravim imenom zove brazilska legenda Zico?", "Artur Antunes Coimbra", [
    "Edson Arantes do Nascimento",
    "Ricardo Izecson dos Santos Leite",
    "Marcos Evangelista de Morais",
  ]),
  q(IG, 'Koji je trener poznat kao „The Special One“?', "José Mourinho", [
    "Pep Guardiola",
    "Jürgen Klopp",
    "Carlo Ancelotti",
  ]),
  q(
    IG,
    "S kojim je trenerom Barcelona osvojila Ligu prvaka 2009. i 2011.?",
    "Pep Guardiola",
    ["Frank Rijkaard", "Luis Enrique", "Tito Vilanova"],
  ),
  q(
    IG,
    "Koliko je golova Haaland zabio u svojoj prvoj sezoni Premier lige, 2022./23.?",
    "36",
    ["30", "32", "40"],
  ),
  q(IG, "Koji je kultni broj David Beckham nosio u Real Madridu?", "23", [
    "7",
    "10",
    "32",
  ]),

  // ── Rekordi ───────────────────────────────────────────────────────────
  q(
    RE,
    "Koji je igrač na Svjetskom prvenstvu 2002. zabio najbrži gol u povijesti SP-a, nakon 11 sekundi?",
    "Hakan Şükür",
    ["Clint Dempsey", "Bryan Robson", "Miroslav Klose"],
  ),
  q(
    RE,
    "Kojim je rezultatom Australija 2001. pobijedila Američku Samou u kvalifikacijama za SP?",
    "31:0",
    ["17:0", "22:0", "27:0"],
  ),
  q(
    RE,
    "Koliko je golova Lionel Messi zabio u kalendarskoj 2012. godini?",
    "91",
    ["73", "85", "96"],
  ),
  q(
    RE,
    "Čiji je rekord od 109 reprezentativnih golova Cristiano Ronaldo srušio 2021.?",
    "Ali Daeija",
    ["Peléa", "Ferenca Puskása", "Miroslava Klosea"],
  ),
  q(
    RE,
    "Čiji je rekord od 40 golova u sezoni Bundeslige Robert Lewandowski srušio 2021.?",
    "Gerda Müllera",
    ["Jupa Heynckesa", "Klausa Fischera", "Miroslava Klosea"],
  ),
  q(
    RE,
    "Koji je igrač 2015. zabio pet golova Wolfsburgu u devet minuta?",
    "Robert Lewandowski",
    ["Thomas Müller", "Arjen Robben", "Pierre-Emerick Aubameyang"],
  ),
  q(
    RE,
    "Koji je Francuz zabio 13 golova na jednom Svjetskom prvenstvu, 1958.?",
    "Just Fontaine",
    ["Michel Platini", "Raymond Kopa", "Thierry Henry"],
  ),
  q(
    RE,
    "Koji je Rus zabio pet golova Kamerunu na Svjetskom prvenstvu 1994.?",
    "Oleg Salenko",
    ["Andrej Aršavin", "Igor Kolivanov", "Vladimir Beschastnykh"],
  ),
  q(
    RE,
    "Koji je Kamerunac 1994. s 42 godine zabio gol na Svjetskom prvenstvu?",
    "Roger Milla",
    ["Samuel Eto'o", "Patrick Mboma", "Rigobert Song"],
  ),
  q(
    RE,
    "Koji je igrač 2015. zabio najbrži hat-trick u povijesti Premier lige?",
    "Sadio Mané",
    ["Robbie Fowler", "Sergio Agüero", "Mohamed Salah"],
  ),
  q(RE, "Tko je u Premier ligi zabio rekordnih 260 golova?", "Alan Shearer", [
    "Wayne Rooney",
    "Harry Kane",
    "Thierry Henry",
  ]),
  q(RE, "Tko je najbolji strijelac u povijesti Arsenala?", "Thierry Henry", [
    "Ian Wright",
    "Robin van Persie",
    "Dennis Bergkamp",
  ]),
  q(
    RE,
    "Tko je najbolji strijelac u povijesti Manchester Uniteda?",
    "Wayne Rooney",
    ["Bobby Charlton", "Cristiano Ronaldo", "Ryan Giggs"],
  ),
  q(
    RE,
    "Koliko je naslova prvaka Engleske osvojio Alex Ferguson s Manchester Unitedom?",
    "13",
    ["8", "11", "15"],
  ),
  q(
    RE,
    "Koliko je bodova Manchester City osvojio u rekordnoj sezoni Premier lige 2017./18.?",
    "100",
    ["95", "98", "102"],
  ),
  q(
    RE,
    "Koliko je utakmica zaredom Arsenal bio neporažen u Premier ligi od 2003. do 2004.?",
    "49",
    ["38", "44", "52"],
  ),
  q(
    RE,
    "S koliko je godina Pelé zabio u finalu Svjetskog prvenstva 1958.?",
    "17",
    ["16", "18", "19"],
  ),
  q(RE, "Koliko je naslova Lige prvaka osvojio Cristiano Ronaldo?", "5", [
    "4",
    "6",
    "7",
  ]),
  q(
    RE,
    "Koliko je naslova Lige prvaka Lionel Messi osvojio s Barcelonom?",
    "4",
    ["3", "5", "6"],
  ),

  // ── Dresovi i boje ────────────────────────────────────────────────────
  q(
    DR,
    "Kako se zove crveno-bijeli kockasti uzorak na dresu Hrvatske?",
    "Šahovnica",
    ["Karirani", "Pepita", "Mozaik"],
  ),
  q(DR, "Koje je boje domaći dres Brazila?", "Žute", [
    "Zelene",
    "Plave",
    "Bijele",
  ]),
  q(
    DR,
    "Koje je boje dres Brazila bio prije uvođenja žutog 1950-ih?",
    "Bijele",
    ["Plave", "Zelene", "Crne"],
  ),
  q(DR, "Zašto Nizozemska igra u narančastom?", "Zbog kraljevske kuće Oranje", [
    "Zbog boje tulipana",
    "Zbog prvog sponzora",
    "Zbog zastave Amsterdama",
  ]),
  q(
    DR,
    "Koji nadimak talijanska reprezentacija duguje boji dresa?",
    "Azzurri",
    ["Rossoneri", "Bianconeri", "Nerazzurri"],
  ),
  q(
    DR,
    "Kako se zove argentinska reprezentacija po bojama dresa?",
    "Albiceleste",
    ["Canarinha", "La Roja", "Celeste"],
  ),
  q(
    DR,
    'Koje su boje Barcelone, poznate kao „blaugrana“?',
    "Plava i tamnocrvena",
    ["Crvena i bijela", "Plava i bijela", "Žuta i crvena"],
  ),
  q(
    DR,
    'Koji klub nosi nadimak „Los Blancos“ zbog bijelih dresova?',
    "Real Madrid",
    ["Atlético Madrid", "Athletic Bilbao", "Getafe"],
  ),
  q(DR, "Koje su boje dresa AC Milana?", "Crvena i crna", [
    "Plava i crna",
    "Crna i bijela",
    "Crvena i bijela",
  ]),
  q(
    DR,
    'Koje su boje dresa Intera, kluba poznatog kao „Nerazzurri“?',
    "Plava i crna",
    ["Crvena i crna", "Crna i bijela", "Plava i bijela"],
  ),
  q(
    DR,
    "Od kojeg je engleskog kluba Juventus preuzeo crno-bijele pruge?",
    "Notts Countyja",
    ["Newcastlea", "Fulhama", "West Bromwicha"],
  ),
  q(
    DR,
    "Kakve su pruge na prepoznatljivom dresu Celtica?",
    "Vodoravne zeleno-bijele",
    ["Okomite zeleno-bijele", "Vodoravne plavo-bijele", "Zeleno-žute"],
  ),
  q(
    DR,
    "Prema zastavi koje je zemlje Boca Juniors odabrao plavo-žute boje?",
    "Švedske",
    ["Ukrajine", "Kolumbije", "Bosne i Hercegovine"],
  ),
  q(DR, "Koja je prepoznatljiva boja dresova Inter Miamija?", "Ružičasta", [
    "Narančasta",
    "Tirkizna",
    "Ljubičasta",
  ]),
  q(DR, "Koje su boje Borussije Dortmund?", "Žuta i crna", [
    "Crvena i bijela",
    "Plava i bijela",
    "Zelena i bijela",
  ]),
  q(
    DR,
    "Kakav je prepoznatljiv dres Ajaxa?",
    "Bijeli sa širokom crvenom prugom",
    ["Crveno-bijele okomite pruge", "Sav crveni", "Bijeli s crvenim rukavima"],
  ),
  q(
    DR,
    "Kakav je prepoznatljiv domaći dres Arsenala?",
    "Crveni s bijelim rukavima",
    ["Sav crveni", "Crveno-bijele pruge", "Bijeli s crvenim rukavima"],
  ),
  q(DR, "Koje je boje domaći dres Hajduka?", "Bijele", [
    "Plave",
    "Crvene",
    "Zelene",
  ]),
  q(DR, "Koje je boje domaći dres Dinama Zagreb?", "Plave", [
    "Bijele",
    "Crvene",
    "Zelene",
  ]),
  q(DR, "Koji je broj Luka Modrić nosio u Real Madridu od 2017.?", "10", [
    "8",
    "14",
    "19",
  ]),
  q(DR, "S kojim je brojem Messi 2004. službeno debitirao za Barcelonu?", "30", [
    "10",
    "19",
    "7",
  ]),
  q(
    DR,
    "Koji je broj Cristiano Ronaldo nosio u prvoj sezoni u Realu, jer je sedmicu imao Raúl?",
    "9",
    ["11", "17", "28"],
  ),
  q(
    DR,
    "Kojim nadimkom zovu francusku reprezentaciju, po boji dresa?",
    "Les Bleus",
    ["Les Rouges", "Les Coqs", "Les Blancs"],
  ),

  // ── Pravila igre ──────────────────────────────────────────────────────
  q(PR, "Koliko igrača jedne momčadi istodobno igra na terenu?", "11", [
    "9",
    "10",
    "12",
  ]),
  q(PR, "S koje se udaljenosti izvodi jedanaesterac?", "11 metara", [
    "9 metara",
    "12 metara",
    "16,5 metara",
  ]),
  q(PR, "Koliko je širok nogometni gol?", "7,32 m", [
    "6,50 m",
    "7,00 m",
    "7,50 m",
  ]),
  q(PR, "Koliko je visok nogometni gol?", "2,44 m", [
    "2,20 m",
    "2,30 m",
    "2,50 m",
  ]),
  q(PR, "Koliko daleko od lopte mora stajati živi zid?", "9,15 m", [
    "7 m",
    "8,5 m",
    "11 m",
  ]),
  q(PR, "Koliko traje produžetak utakmice?", "2 × 15 minuta", [
    "2 × 10 minuta",
    "1 × 20 minuta",
    "2 × 20 minuta",
  ]),
  q(
    PR,
    "Što igrač dobiva nakon drugog žutog kartona u istoj utakmici?",
    "Crveni karton",
    ["Opomenu", "Plavi karton", "Ništa"],
  ),
  q(PR, "Što je hat-trick?", "Tri gola jednog igrača u utakmici", [
    "Tri asistencije u utakmici",
    "Tri pobjede zaredom",
    "Tri gola glavom",
  ]),
  q(PR, "Na kojem je Svjetskom prvenstvu prvi put korišten VAR?", "2018.", [
    "2010.",
    "2014.",
    "2022.",
  ]),
  q(PR, "Od kojeg Svjetskog prvenstva pobjeda donosi tri boda?", "1994.", [
    "1982.",
    "1990.",
    "1998.",
  ]),
  q(PR, "Koliko bodova donosi neriješena utakmica u ligi?", "1", [
    "0",
    "2",
    "3",
  ]),
  q(PR, "Koliko traje regularni dio nogometne utakmice?", "90 minuta", [
    "80 minuta",
    "85 minuta",
    "100 minuta",
  ]),
  q(
    PR,
    "Tko jedini smije igrati rukom unutar svog kaznenog prostora?",
    "Vratar",
    ["Kapetan", "Zadnji branič", "Nitko"],
  ),
  q(
    PR,
    "Što se dosuđuje kad je napadač pri dodavanju bliže golu od pretposljednjeg protivnika?",
    "Zaleđe",
    ["Kazneni udarac", "Ubacivanje", "Udarac iz kuta"],
  ),
];
