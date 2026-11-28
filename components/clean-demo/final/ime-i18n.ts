"use client";

import { useLanguage } from "@/contexts/language-context";

/* Tekstovi stranice dresa (novi dizajn), HR/EN — isti LanguageProvider / kolačić dresify_locale
   kao živa stranica. Engleski izrazi prate živu stranicu (lib/i18n.ts → t.product, ProductDetailPanel,
   cart-i18n): "Select size", "Adults/Kids", "Jersey & Shorts", "Cash on delivery", "Size exchange". */

const HR = {
  // izbor veličine
  adults: "Odrasli",
  kids: "Djeca",
  adultsOrKids: "Odrasli ili djeca",
  soldOutSuffix: " · rasprodano",
  oneSize: "Jedna veličina",
  size: "Veličina",
  selectSize: "Odaberi veličinu",
  sizeGuide: "Tablica veličina",
  sizeSoldOut: (s: string) => `${s}, rasprodano`,
  segSoldOut: (seg: string) => `${seg}: trenutno rasprodano.`,
  soldOutNow: "Trenutno rasprodano.",
  soldOut: "Rasprodano",
  tracksuit: "Trenirka",
  jerseyWord: "Dres",
  // gumb
  addToCart: "Dodaj u košaricu",
  addedOpenCart: "Dodano · Otvori košaricu",
  notifyWa: "Javi mi na WhatsApp",
  waMsg: (what: string, size: string) => `Pozdrav, zanima me: ${what}${size ? `, veličina ${size}` : ""}.`,
  // dostava / zamjena
  codLine: (ship: string) => `Plaćanje pouzećem · Dostava 2–5 dana (${ship})`,
  exchangeLine: "Zamjena veličine u 14 dana od primitka.",
  terms: "Uvjeti",
  photoSoon: "Fotografija uskoro",
  // tablica veličina (list)
  close: "Zatvori",
  closeGuide: "Zatvori tablicu",
  guideTitle: (kids: boolean) => `Tablica veličina · ${kids ? "djeca" : "odrasli"}`,
  colHeight: "Visina",
  colChest: "Grudi",
  colAge: "Dob",
  colLength: "Dužina",
  age: (a: string) => a,
  guideHint: "Između dvije veličine? Uzmi veću. Kriva veličina se mijenja u roku 14 dana.",
  // mix
  mixTitle: "Složi svoj mix",
  mixBody: (tr: boolean, price: number) =>
    `Uz ${tr ? "trenirku" : "dres"} dodaj loptu ili kapu kluba po izboru, ili figuru igrača. Svaki dodatak +${price} €, ide u košaricu zajedno s ${tr ? "trenirkom" : "dresom"}.`,
  ball: "Lopta",
  cap: "Kapa",
  figure: "Figura u kutiji",
  none: "bez",
  pickClub: (title: string) => `${title} — odaberi klub`,
  addons: (n: number) => `Dodaci (${n})`,
  total: "Ukupno",
  totalWithAddons: "Ukupno s dodacima:",
  club: (label: string) => label,
  // ispod pregiba
  about: (tr: boolean) => `O ${tr ? "trenirki" : "dresu"}`,
  aboutNamed: "O proizvodu",
  faqTitle: "Dostava i zamjena",
  similar: (kind: "trenirka" | "streetwear" | "dres"): string => (kind === "trenirka" ? "Slične trenirke" : kind === "streetwear" ? "Sličan streetwear" : "Slični dresovi"),
  // pozornica
  onHanger: "na vješalici",
  and: " i ",
  stageRole: "prikaz na vješalici",
  sideGroup: "Strana — ili povuci lijevo/desno za okret",
  front: "Prednja",
  back: "Leđa",
  face: { front: "Prednja strana", back: "Leđa", shorts: "Dječje hlačice", jakna: "Jakna", jaknaFront: "Jakna sprijeda", hlace: "Hlače" } as Record<string, string>,
  tagSizes: "VELIČINE",
  tagSizesAria: (s: string) => `Veličine ${s}`,
  tagPriceAria: (p: number) => `Cijena ${p} €, dodirni za veličine`,
  // kartica
  number: "BROJ",
  kidsOnly: "Samo dječje",
  // vrsta u nadnaslovu (SEO riječ sa servera: dres / trenirka / streetwear komplet)
  typeWord: (w: string) => w,
};

export type ImeText = typeof HR;

const CLUB_EN: Record<string, string> = {
  Hrvatska: "Croatia",
  "Njemačka": "Germany",
  "Mbappé (Francuska)": "Mbappé (France)",
  "Yamal (Španjolska)": "Yamal (Spain)",
  "Yamal (Barcelona, crni)": "Yamal (Barcelona, black)",
  "Pehar SP 2026": "World Cup 2026 trophy"
};

const EN: ImeText = {
  adults: "Adults",
  kids: "Kids",
  adultsOrKids: "Adults or kids",
  soldOutSuffix: " · sold out",
  oneSize: "One size",
  size: "Size",
  selectSize: "Select size",
  sizeGuide: "Size guide",
  sizeSoldOut: (s: string) => `${s}, sold out`,
  segSoldOut: (seg: string) => `${seg}: currently sold out.`,
  soldOutNow: "Currently sold out.",
  soldOut: "Sold out",
  tracksuit: "Tracksuit",
  jerseyWord: "Jersey",
  addToCart: "Add to cart",
  addedOpenCart: "Added · Open cart",
  notifyWa: "Message us on WhatsApp",
  waMsg: (what: string, size: string) => `Hi, I'm interested in: ${what}${size ? `, size ${size}` : ""}.`,
  // "7,00 €" -> "€7.00" (kao živa EN traka i košarica)
  codLine: (ship: string) => `Cash on delivery · Delivery 2–5 days (${ship.replace(/^(\d+),(\d+)\s*€$/, "€$1.$2")})`,
  exchangeLine: "Size exchange within 14 days of receipt.",
  terms: "Terms",
  photoSoon: "Photo coming soon",
  close: "Close",
  closeGuide: "Close size guide",
  guideTitle: (kids: boolean) => `Size guide · ${kids ? "kids" : "adults"}`,
  colHeight: "Height",
  colChest: "Chest",
  colAge: "Age",
  colLength: "Length",
  age: (a: string) => a.replace("god.", "yrs"),
  guideHint: "Between two sizes? Go for the larger one. Wrong size? We'll exchange it within 14 days.",
  mixTitle: "Build your mix",
  mixBody: (tr: boolean, price: number) =>
    `Add a ball or a cap from the club of your choice, or a player figure, to your ${tr ? "tracksuit" : "jersey"}. Each add-on is +${price} € and goes into the cart together with the ${tr ? "tracksuit" : "jersey"}.`,
  ball: "Ball",
  cap: "Cap",
  figure: "Boxed figure",
  none: "none",
  pickClub: (title: string) => `${title} — choose a club`,
  addons: (n: number) => `Add-ons (${n})`,
  total: "Total",
  totalWithAddons: "Total with add-ons:",
  club: (label: string) => CLUB_EN[label] ?? label,
  about: (tr: boolean) => `About the ${tr ? "tracksuit" : "jersey"}`,
  aboutNamed: "About",
  faqTitle: "Delivery & exchange",
  similar: (kind: "trenirka" | "streetwear" | "dres") => (kind === "trenirka" ? "Similar tracksuits" : kind === "streetwear" ? "Similar streetwear" : "Similar jerseys"),
  onHanger: "on a hanger",
  and: " and ",
  stageRole: "hanger view",
  sideGroup: "Side — or drag left/right to turn",
  front: "Front",
  back: "Back",
  face: { front: "Front", back: "Back", shorts: "Kids' shorts", jakna: "Jacket", jaknaFront: "Jacket front", hlace: "Trousers" },
  tagSizes: "SIZES",
  tagSizesAria: (s: string) => `Sizes ${s}`,
  tagPriceAria: (p: number) => `Price ${p} €, tap for sizes`,
  number: "NO.",
  kidsOnly: "Kids only",
  typeWord: (w: string) => ({ dres: "jersey", trenirka: "tracksuit", "streetwear komplet": "streetwear set" } as Record<string, string>)[w] ?? w,
};

export function useImeText(): ImeText {
  const { locale } = useLanguage();
  return locale === "en" ? EN : HR;
}
