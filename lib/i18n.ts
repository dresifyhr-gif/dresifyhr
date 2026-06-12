export type Locale = "hr" | "en";

export const LOCALE_COOKIE = "dresify_locale";

// HR (Croatian) regions — show Croatian UI by default
export const HR_COUNTRIES = new Set(["HR", "BA", "RS", "SI", "ME", "MK"]);

// ─── Translation shape ────────────────────────────────────────────────────────

const hr = {
  announcement: [
    "📦 Dostava pouzećem po cijeloj Hrvatskoj — 7,50€",
    "⚡ Novo svaki tjedan — provjeri katalog",
    "💬 Naruči na WhatsApp — odgovaramo u sat vremena",
  ],

  nav: {
    home: "POČETNA",
    jerseys: "DRESOVI",
    sets: "KOMPLETI",
    blog: "BLOG",
    contact: "KONTAKT",
    about: "O NAMA",
    openCart: "Otvori košaricu",
    openMenu: "Otvori izbornik",
    closeMenu: "Zatvori izbornik",
  },

  cart: {
    label: "Košarica",
    title: "Tvoja košarica",
    close: "Zatvori",
    closeOverlay: "Zatvori košaricu",
    empty: "Košarica je prazna. Odaberi dres, veličinu i dodaj ga u košaricu.",
    items: "Artikli",
    shipping: "Dostava",
    total: "Ukupno",
    viewCart: "VIDI KOŠARICU",
    checkout: "NASTAVAK NA PLAĆANJE",
    clear: "ISPRAZNI KOŠARICU",
    size: "Veličina:",
    removeItem: "Ukloni artikl",
  },

  addedModal: {
    label: "Košarica",
    title: "Uspješno dodano u košaricu!",
    closeOverlay: "Zatvori prozor",
    close: "Zatvori",
    size: "Veličina",
    qty: "Količina",
    total: "Ukupno",
    continueShopping: "NASTAVAK KUPOVINE",
    viewCart: "VIDI KOŠARICU",
    checkout: "NASTAVAK NA PLAĆANJE",
  },

  product: {
    stockWarning: (n: number) => `Ostalo samo ${n} komada!`,
    adults: "Odrasli",
    jersey: "Dres",
    kids: "Djeca",
    jerseyAndShorts: "Dres i hlačice",
    selectSize: "Odaberi veličinu",
    addToCart: "DODAJ U KOŠARICU",
    orderWhatsApp: "NARUČI NA WHATSAPP",
    paymentSummary: (payment: string, shipping: string) =>
      `Plaćanje: ${payment} • Dostava: ${shipping}`,
    benefits: {
      delivery: "Dostava 1–3 dana",
      response: "Odgovor u sat vremena",
      returns: "Jednostavan povrat",
      orderToday: "Naruči danas — šaljemo sutra",
    },
    segmentAdult: "Dres",
    segmentKid: "Dres i hlačice",
  },

  hero: {
    badge: "Novi katalog · 100+ dresova",
    line1: "DRESOVI.",
    line2: "KLUBOVI & REPREZENTACIJE.",
    line3: "ZA DJECU I ODRASLE.",
    subtitle: "Dostava po cijeloj Hrvatskoj • Plaćanje pouzećem",
    cta: "POGLEDAJ DRESOVE",
    stats: { jerseys: "dresova", price: "fiksna cijena", delivery: "dana dostava" },
    trust: {
      delivery: "Dostava 1–3 dana",
      response: "Odgovor u sat vremena",
      returns: "Jednostavan povrat",
      newWeekly: "Novo svaki tjedan",
    },
  },

  home: {
    catalogKicker: "Drop",
    catalogTitle: "Odaberi svoj sljedeći dres",
    catalogDesc:
      "Jedna cijena, jasan izbor i katalog koji kombinira najtraženije aktualne modele i retro favorite.",
  },

  catalog: {
    label: "Katalog",
    title: "Dresovi — Klubovi & Reprezentacije. 20€.",
    desc: "Nogometni dresovi za djecu i odrasle — Barcelona, Real Madrid, Bayern, Hrvatska reprezentacija i retro klasici. Fiksna cijena 20€, dostava pouzećem po cijeloj Hrvatskoj za 1–3 radna dana.",
    filters: "Filteri",
    filterTitle: "Filtriraj katalog",
    filterDesc: "Liga, klub, igrač i veličina.",
    clearAll: "Poništi sve",
    league: "Liga",
    club: "Klub",
    searchClub: "Pretraži klub",
    player: "Igrač",
    size: "Veličina",
    adults: "Odrasli",
    kids: "Djeca",
    retro: "Retro",
    retroToggle: "Prikaži samo retro modele",
    count: (n: number) => `${n} dresova`,
    searchPlaceholder: "Pretraži klub, igrača ili ligu",
    noResults:
      "Nema rezultata za odabrane filtere. Probaj proširiti pretragu ili poništiti dio filtera.",
    closeFilters: "Zatvori filtere",
    select: "Odaberi",
    apply: "PRIMIJENI",
    filtersMobile: "FILTERI",
    byCategory: "Kupuj po kategoriji",
    topClubs: "Najtraženiji klubovi",
    popularPlayers: "Popularni igrači",
    byCategoryDesc:
      "Brzi ulaz za dječje komplete, dresove za odrasle, retro favorite i reprezentativne modele.",
    topClubsDesc:
      "Otvaraj zasebne stranice za klubove koji nose najveći interes i najbolje pokrivaju ključne Google upite.",
    popularPlayersDesc:
      "Messi, Ronaldo, Neymar, Yamal i drugi jaki igrači sada imaju vlastite landing stranice.",
  },

  footer: {
    cta: "Pronašao si dres?",
    ctaSub: "Naruči odmah — šaljemo sutra.",
    ctaBtn: "POGLEDAJ KATALOG",
    desc: "Premium football shop s fiksnom cijenom 20€, dostavom po cijeloj Hrvatskoj i novim modelima svaki tjedan.",
    nav: "Navigacija",
    popular: "Popularno",
    contact: "Kontakt",
    response: "Odgovaramo u roku sat vremena",
    copyright: "© 2026 DRESIFY — Sva prava pridržana",
    madeWith: "Izrađeno s",
    inCroatia: "u Hrvatskoj",
  },

  trust: {
    delivery: "Dostava po cijeloj HR (1-3 dana)",
    response: "Odgovaramo u roku sat vremena",
    returns: "Jednostavan povrat",
    newWeekly: "Novo svaki tjedan",
  },

  newsletter: {
    kicker: "Newsletter",
    title: "Budi prvi koji sazna za nove dresove i akcije.",
    placeholder: "Upiši email adresu",
    submit: "Prijavi se",
    error: "Unesi ispravnu email adresu.",
    success: "Prijava uspješna. Javljamo ti se kad stigne novi drop.",
  },

  reviews: {
    kicker: "Recenzije",
    title: "Što kažu kupci",
    desc: "Kratke poruke iz stvarnih narudžbi koje nam dolaze nakon isporuke.",
    bar: "200+ narudžbi • Dostava 24-48h • WhatsApp podrška • Novo svaki tjedan",
  },

  blog: {
    kicker: "Blog",
    title: "Savjeti & novosti",
    desc: "Kratki vodiči, trendovi i inspiracija za izbor dresa, veličine i retro klasika.",
    readTime: "min čitanja",
    listingTitle: "Savjeti i novosti",
    listingDesc:
      "Praktični članci za kupnju, veličine i odabir dresa koji će stvarno završiti u rotaciji.",
  },

  instagram: {
    kicker: "Instagram",
    title: (handle: string) => `Prati nas ${handle}`,
    desc: "Tamo prvi objavljujemo nove dropove, dostupne veličine i najtraženije retro komade.",
    cta: (handle: string) => `Otvori Instagram ${handle}`,
  },

  socialProof: {
    label: "Upravo kupljeno",
  },

  whatsapp: {
    aria: "Naruči na WhatsApp",
    order: "Naruči odmah",
  },

  productPage: {
    related: "Može te zanima",
    relatedTitle: "Slični dresovi",
    notFound: "Dres nije pronađen",
    notFoundDesc: "Traženi dres nije dostupan.",
    breadcrumb: { home: "Početna", jerseys: "Dresovi" },
  },

  cartPage: {
    kicker: "Košarica",
    title: "Pregledaj odabrane dresove",
    desc: "Provjeri artikle, ukloni što ne treba i nastavi na plaćanje.",
    empty: "Košarica je prazna",
    emptyDesc: "Dodaj dresove u košaricu i vrati se ovdje kad budeš spreman za narudžbu.",
    viewJerseys: "POGLEDAJ DRESOVE",
    summary: "Sažetak narudžbe",
    items: "Artikli",
    shipping: "Dostava",
    total: "Ukupno",
    checkout: "NASTAVAK NA PLAĆANJE",
    size: "Veličina:",
    qty: "Količina:",
    removeItem: "Ukloni artikl",
  },

  checkoutPage: {
    kicker: "Checkout",
    title: "Dovrši narudžbu",
    desc: "Unesi podatke za dostavu i potvrdi narudžbu. Ako je košarica prazna, željeni dres možeš ručno upisati ispod.",
  },

  thankYouPage: {
    title: "HVALA NA NARUDŽBI!",
    message:
      "Potvrđujemo dostupnost u roku sat vremena i javljamo se na odabrani kanal kontakta.",
    cta: "PREGLEDAJ JOŠ DRESOVA",
  },

  notFound: {
    title: "Stranica nije pronađena",
    message: "Traženi sadržaj više nije dostupan ili je link pogrešan.",
    cta: "POVRATAK NA POČETNU",
  },

  stickyCart: {
    selectSize: "Odaberi veličinu",
    add: "DODAJ",
  },

  contactForm: {
    step1: "Kontakt podaci",
    name: "Ime i prezime",
    phone: "Broj mobitela",
    email: "Email adresa",
    step2: "Način dostave",
    deliveryCod: "Dostava pouzećem",
    deliveryCodDesc: "HP Paket24, plaćanje pri preuzimanju",
    street: "Ulica i kućni broj",
    city: "Grad",
    zip: "Poštanski broj",
    note: "Napomena (opcionalno)",
    notePlaceholder: "Npr. poklon pakiranje, kontakt napomena...",
    step3: "Što želiš naručiti?",
    orderPlaceholder: "Npr. Real Madrid - Bellingham, odrasli, veličina L",
    orderSummary: "Sažetak narudžbe",
    cartEmpty: "Košarica je prazna — detalje upiši u koraku 3.",
    items: "Artikli",
    shipping: "Dostava",
    free: "Besplatno",
    total: "Ukupno",
    submit: "POŠALJI NARUDŽBU",
    confirmNote: "Potvrđujemo dostupnost u roku sat vremena.",
    errorGeneral: "Greška pri slanju narudžbe. Pokušaj ponovo.",
    errorNetwork: "Veza nije uspjela. Provjeri internet i pokušaj ponovo.",
  },
};

const en: typeof hr = {
  announcement: [
    "📦 Cash on delivery across Croatia — 7.50€",
    "⚡ New drops every week — check the catalog",
    "💬 Order on WhatsApp — we reply within the hour",
  ],

  nav: {
    home: "HOME",
    jerseys: "JERSEYS",
    sets: "SETS",

    blog: "BLOG",
    contact: "CONTACT",
    about: "ABOUT",
    openCart: "Open cart",
    openMenu: "Open menu",
    closeMenu: "Close menu",
  },

  cart: {
    label: "Cart",
    title: "Your cart",
    close: "Close",
    closeOverlay: "Close cart",
    empty: "Your cart is empty. Pick a jersey, select a size and add it to the cart.",
    items: "Items",
    shipping: "Shipping",
    total: "Total",
    viewCart: "VIEW CART",
    checkout: "PROCEED TO CHECKOUT",
    clear: "CLEAR CART",
    size: "Size:",
    removeItem: "Remove item",
  },

  addedModal: {
    label: "Cart",
    title: "Added to cart!",
    closeOverlay: "Close modal",
    close: "Close",
    size: "Size",
    qty: "Qty",
    total: "Total",
    continueShopping: "CONTINUE SHOPPING",
    viewCart: "VIEW CART",
    checkout: "PROCEED TO CHECKOUT",
  },

  product: {
    stockWarning: (n: number) => `Only ${n} left in stock!`,
    adults: "Adults",
    jersey: "Jersey",
    kids: "Kids",
    jerseyAndShorts: "Jersey & Shorts",
    selectSize: "Select size",
    addToCart: "ADD TO CART",
    orderWhatsApp: "ORDER ON WHATSAPP",
    paymentSummary: (payment: string, shipping: string) =>
      `Payment: ${payment} • Shipping: ${shipping}`,
    benefits: {
      delivery: "Delivery 1–3 days",
      response: "Reply within the hour",
      returns: "Easy returns",
      orderToday: "Order today — ships tomorrow",
    },
    segmentAdult: "Jersey",
    segmentKid: "Jersey & Shorts",
  },

  hero: {
    badge: "New catalog · 100+ jerseys",
    line1: "JERSEYS.",
    line2: "CLUBS & NATIONAL TEAMS.",
    line3: "FOR KIDS & ADULTS.",
    subtitle: "Delivery across Croatia • Cash on delivery",
    cta: "BROWSE JERSEYS",
    stats: { jerseys: "jerseys", price: "fixed price", delivery: "day delivery" },
    trust: {
      delivery: "Delivery 1–3 days",
      response: "Reply within the hour",
      returns: "Easy returns",
      newWeekly: "New every week",
    },
  },

  home: {
    catalogKicker: "Drop",
    catalogTitle: "Pick your next jersey",
    catalogDesc:
      "One price, a clear choice and a catalog that combines the most-wanted current models and retro favourites.",
  },

  catalog: {
    label: "Catalog",
    title: "Jerseys — Clubs & National Teams. 20€.",
    desc: "Football jerseys for kids and adults — Barcelona, Real Madrid, Bayern, Croatia national team and retro classics. Fixed price 20€, cash on delivery across Croatia in 1–3 business days.",
    filters: "Filters",
    filterTitle: "Filter catalog",
    filterDesc: "League, club, player and size.",
    clearAll: "Clear all",
    league: "League",
    club: "Club",
    searchClub: "Search club",
    player: "Player",
    size: "Size",
    adults: "Adults",
    kids: "Kids",
    retro: "Retro",
    retroToggle: "Show retro only",
    count: (n: number) => `${n} jerseys`,
    searchPlaceholder: "Search club, player or league",
    noResults: "No results for selected filters. Try broadening your search or clearing some filters.",
    closeFilters: "Close filters",
    select: "Select",
    apply: "APPLY",
    filtersMobile: "FILTERS",
    byCategory: "Shop by category",
    topClubs: "Top clubs",
    popularPlayers: "Popular players",
    byCategoryDesc: "Quick access for kids' sets, adults' jerseys, retro favourites and national team models.",
    topClubsDesc: "Dedicated pages for the most-searched clubs.",
    popularPlayersDesc: "Messi, Ronaldo, Neymar, Yamal and more — each with their own landing page.",
  },

  footer: {
    cta: "Found your jersey?",
    ctaSub: "Order now — we ship tomorrow.",
    ctaBtn: "BROWSE CATALOG",
    desc: "Premium football shop with a fixed 20€ price, delivery across Croatia and new models every week.",
    nav: "Navigation",
    popular: "Popular",
    contact: "Contact",
    response: "We reply within the hour",
    copyright: "© 2026 DRESIFY — All rights reserved",
    madeWith: "Made with",
    inCroatia: "in Croatia",
  },

  trust: {
    delivery: "Delivery across HR (1-3 days)",
    response: "We reply within the hour",
    returns: "Easy returns",
    newWeekly: "New every week",
  },

  newsletter: {
    kicker: "Newsletter",
    title: "Be the first to know about new jerseys and deals.",
    placeholder: "Enter your email",
    submit: "Subscribe",
    error: "Please enter a valid email address.",
    success: "Subscribed! We'll notify you when the next drop arrives.",
  },

  reviews: {
    kicker: "Reviews",
    title: "What customers say",
    desc: "Short messages from real orders received after delivery.",
    bar: "200+ orders • Delivery 24-48h • WhatsApp support • New every week",
  },

  blog: {
    kicker: "Blog",
    title: "Tips & news",
    desc: "Short guides, trends and inspiration for choosing the right jersey, size and retro classic.",
    readTime: "min read",
    listingTitle: "Tips & news",
    listingDesc: "Practical articles for buying, sizing and picking the jersey that actually gets worn.",
  },

  instagram: {
    kicker: "Instagram",
    title: (handle: string) => `Follow us ${handle}`,
    desc: "We post new drops, available sizes and the most-wanted retro pieces there first.",
    cta: (handle: string) => `Open Instagram ${handle}`,
  },

  socialProof: {
    label: "Just purchased",
  },

  whatsapp: {
    aria: "Order on WhatsApp",
    order: "Order now",
  },

  productPage: {
    related: "You might also like",
    relatedTitle: "Similar jerseys",
    notFound: "Jersey not found",
    notFoundDesc: "The requested jersey is not available.",
    breadcrumb: { home: "Home", jerseys: "Jerseys" },
  },

  cartPage: {
    kicker: "Cart",
    title: "Review your selected jerseys",
    desc: "Check items, remove what you don't need and continue to checkout.",
    empty: "Your cart is empty",
    emptyDesc: "Add jerseys to the cart and come back here when you're ready to order.",
    viewJerseys: "BROWSE JERSEYS",
    summary: "Order summary",
    items: "Items",
    shipping: "Shipping",
    total: "Total",
    checkout: "PROCEED TO CHECKOUT",
    size: "Size:",
    qty: "Qty:",
    removeItem: "Remove item",
  },

  checkoutPage: {
    kicker: "Checkout",
    title: "Complete your order",
    desc: "Enter your delivery details and confirm your order. If the cart is empty you can manually enter the jersey you want below.",
  },

  thankYouPage: {
    title: "THANK YOU FOR YOUR ORDER!",
    message: "We'll confirm availability within the hour and get back to you on your chosen contact channel.",
    cta: "BROWSE MORE JERSEYS",
  },

  notFound: {
    title: "Page not found",
    message: "The requested content is no longer available or the link is incorrect.",
    cta: "BACK TO HOME",
  },

  stickyCart: {
    selectSize: "Select size",
    add: "ADD",
  },

  contactForm: {
    step1: "Contact details",
    name: "Full name",
    phone: "Mobile number",
    email: "Email address",
    step2: "Delivery method",
    deliveryCod: "Cash on delivery",
    deliveryCodDesc: "HP Paket24, pay on receipt",
    street: "Street and house number",
    city: "City",
    zip: "Postal code",
    note: "Note (optional)",
    notePlaceholder: "E.g. gift wrapping, contact note...",
    step3: "What would you like to order?",
    orderPlaceholder: "E.g. Real Madrid - Bellingham, adult, size L",
    orderSummary: "Order summary",
    cartEmpty: "Cart is empty — enter details in step 3.",
    items: "Items",
    shipping: "Shipping",
    free: "Free",
    total: "Total",
    submit: "SEND ORDER",
    confirmNote: "We confirm availability within the hour.",
    errorGeneral: "Error sending order. Please try again.",
    errorNetwork: "Connection failed. Check your internet and try again.",
  },
};

// ─── Exports ──────────────────────────────────────────────────────────────────

export type Translations = typeof hr;

export const translations: Record<Locale, Translations> = { hr, en };
