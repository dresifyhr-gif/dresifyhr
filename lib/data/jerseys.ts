export type Jersey = {
  id: number;
  slug: string;
  klub: string;
  igrac: string;
  liga: string;
  retro: boolean;
  vel: string;
  price?: number;
};

export const jerseys: Jersey[] = [
  { id: 1, slug: "francuska-zidane-sp1998", klub: "Francuska", igrac: "Zidane nr10", liga: "Reprezentacija", retro: true, vel: "Djeca: 140-176 · Odrasli: S-XL" },
  { id: 2, slug: "brazil-neymar-crni", klub: "Brazil", igrac: "Neymar Jr. nr10 — crni", liga: "Reprezentacija", retro: false, vel: "Djeca: 140-176 · Odrasli: S-XL" },
  { id: 3, slug: "brazil-neymar-orao", klub: "Brazil", igrac: "Neymar nr10 — orao zeleni", liga: "Reprezentacija", retro: false, vel: "Djeca: 116-176 · Odrasli: S-XL" },
  { id: 4, slug: "bayern-luis-diaz", klub: "Bayern München", igrac: "Luis Diaz nr14", liga: "Bundesliga", retro: false, vel: "Djeca: 116-176 · Odrasli: S-XL" },
  { id: 5, slug: "barcelona-ronaldinho-cl2006", klub: "FC Barcelona", igrac: "Ronaldinho — CL finale 2006", liga: "La Liga", retro: true, vel: "Djeca: 140-176 · Odrasli: S-XL" },
  { id: 6, slug: "liverpool-ekitike", klub: "Liverpool", igrac: "Ekitike nr22", liga: "Premier Liga", retro: false, vel: "Djeca: 140-176 · Odrasli: S-XL" },
  { id: 7, slug: "njemacka-musiala", klub: "Njemačka", igrac: "Musiala nr10", liga: "Reprezentacija", retro: false, vel: "Djeca: 116-176 · Odrasli: S-XL" },
  { id: 8, slug: "santos-retro", klub: "Santos", igrac: "Ronaldo / Neymar retro", liga: "Brazil", retro: true, vel: "Djeca: 116-176 · Odrasli: S-XL" },
  { id: 9, slug: "portugal-zeleni", klub: "Portugal", igrac: "posebno zeleno izdanje", liga: "Reprezentacija", retro: false, vel: "Odrasli: S-XL" },
  { id: 10, slug: "argentina-messi-crni", klub: "Argentina", igrac: "Messi — crno posebno", liga: "Reprezentacija", retro: false, vel: "Djeca: 116-176 · Odrasli: S-XL" },
  { id: 11, slug: "barcelona-yamal-rozo", klub: "FC Barcelona", igrac: "Yamal nr10 — rozo/plavi", liga: "La Liga", retro: false, vel: "Djeca: 116-176 · Odrasli: S-XL" },
  { id: 12, slug: "manchester-city-crni", klub: "Manchester City", igrac: "crni posebno izdanje", liga: "Premier Liga", retro: false, vel: "Djeca: 140-176 · Odrasli: S-XL" },
  { id: 13, slug: "barcelona-kobe", klub: "FC Barcelona", igrac: "crni — Kobe kolaboracija", liga: "La Liga", retro: false, vel: "Djeca: 116-176 · Odrasli: S-XL" },
  { id: 14, slug: "milan-maldini-zlatni", klub: "AC Milan", igrac: "Maldini nr3 — zlatni", liga: "Serie A", retro: false, vel: "Djeca: 116-176 · Odrasli: S-XL" },
  { id: 15, slug: "milan-ibrahimovic", klub: "AC Milan", igrac: "Ibrahimović nr11", liga: "Serie A", retro: false, vel: "Djeca: 140-176 · Odrasli: S-XL" },
  { id: 16, slug: "psg-hakimi-crni", klub: "PSG", igrac: "Hakimi nr2 — crni Jordan", liga: "Ligue 1", retro: false, vel: "Djeca: 140-176 · Odrasli: S-XL" },
  { id: 17, slug: "njemacka-woltemade-retro", klub: "Njemačka", igrac: "Woltemade nr11 — retro", liga: "Reprezentacija", retro: true, vel: "Djeca: 116-176 · Odrasli: S-XL" },
  { id: 18, slug: "hrvatska-modric-bijeli", klub: "Hrvatska", igrac: "Modrić nr10 — bijeli", liga: "Reprezentacija", retro: false, vel: "Djeca: 116-176 · Odrasli: S-XL" },
  { id: 19, slug: "hrvatska-modric-plavi", klub: "Hrvatska", igrac: "Modrić nr10 — plavi", liga: "Reprezentacija", retro: false, vel: "Djeca: 116-176 · Odrasli: S-XL" },
  { id: 20, slug: "bayern-karl-crni", klub: "Bayern München", igrac: "Karl nr42 — crni model", liga: "Bundesliga", retro: false, vel: "Djeca: 116-176 · Odrasli: S-XL" },
  { id: 21, slug: "juventus-michelangelo", klub: "Juventus", igrac: "Michelangelo posebno", liga: "Serie A", retro: false, vel: "Djeca: 116-176 · Odrasli: S-XL" },
  { id: 22, slug: "santos-neymar-bijeli", klub: "Santos", igrac: "Neymar Jr. nr10 — bijeli", liga: "Brazil", retro: false, vel: "Djeca: 140-176 · Odrasli: S-XL" },
  { id: 23, slug: "barcelona-yamal-sareni", klub: "FC Barcelona", igrac: "Yamal nr11 — šareni", liga: "La Liga", retro: false, vel: "Djeca: 116-176 · Odrasli: S-XL" },
  { id: 24, slug: "brazil-ronaldinho-crni", klub: "Brazil", igrac: "Ronaldinho nr11 — crni", liga: "Reprezentacija", retro: false, vel: "Djeca: 140-176 · Odrasli: S-XL" },
  { id: 25, slug: "barcelona-neymar-retro-qatar", klub: "FC Barcelona", igrac: "Neymar Jr. nr11 — retro Qatar", liga: "La Liga", retro: true, vel: "Djeca: 116-176 · Odrasli: S-XL" },
  { id: 26, slug: "barcelona-yamal-domaci", klub: "FC Barcelona", igrac: "Yamal nr10 — domaći", liga: "La Liga", retro: false, vel: "Djeca: 116-176 · Odrasli: S-XL" },
  { id: 27, slug: "chelsea-palmer", klub: "Chelsea", igrac: "Palmer nr10 — bijeli", liga: "Premier Liga", retro: false, vel: "Djeca: 116-176 · Odrasli: S-XL" },
  { id: 28, slug: "real-ramos-cl", klub: "Real Madrid", igrac: "Ramos nr4 — CL finale", liga: "La Liga", retro: true, vel: "Djeca: 116-176 · Odrasli: S-XL" },
  { id: 29, slug: "real-guler", klub: "Real Madrid", igrac: "Arda Güler nr15", liga: "La Liga", retro: false, vel: "Djeca: 116-176 · Odrasli: S-XL" },
  { id: 30, slug: "liverpool-szoboszlai", klub: "Liverpool", igrac: "Szoboszlai nr8", liga: "Premier Liga", retro: false, vel: "Djeca: 116-176 · Odrasli: S-XL" },
  { id: 31, slug: "brazil-pele-crni", klub: "Brazil", igrac: "Pelé nr10 — crni", liga: "Reprezentacija", retro: false, vel: "Djeca: 140-176 · Odrasli: S-XL" },
  { id: 32, slug: "manutd-ronaldo-crni-ucl", klub: "Manchester United", igrac: "Ronaldo nr7 — crni UCL", liga: "Premier Liga", retro: true, vel: "Djeca: 116-176 · Odrasli: S-XL" },
  { id: 33, slug: "barcelona-kappa-retro", klub: "FC Barcelona", igrac: "Kappa retro", liga: "La Liga", retro: true, vel: "Djeca: 140-176 · Odrasli: S-XL" },
  { id: 34, slug: "manutd-ronaldo-crveni-ucl", klub: "Manchester United", igrac: "Ronaldo nr7 — crveni UCL", liga: "Premier Liga", retro: true, vel: "Djeca: 116-176 · Odrasli: S-XL" },
  { id: 35, slug: "barcelona-rivaldo-retro", klub: "FC Barcelona", igrac: "Rivaldo nr11 — retro", liga: "La Liga", retro: true, vel: "Djeca: 140-176 · Odrasli: S-XL" },
  { id: 36, slug: "barcelona-raphinha", klub: "FC Barcelona", igrac: "Raphinha nr11 — domaći CL", liga: "La Liga", retro: false, vel: "Djeca: 116-176 · Odrasli: S-XL" },
  { id: 37, slug: "real-ronaldo-bijeli-cl", klub: "Real Madrid", igrac: "Ronaldo nr7 — bijeli CL finale", liga: "La Liga", retro: true, vel: "Djeca: 116-176 · Odrasli: S-XL" },
  { id: 38, slug: "real-ronaldo-ljubicasti-cl", klub: "Real Madrid", igrac: "Ronaldo nr7 — ljubičasti CL", liga: "La Liga", retro: true, vel: "Djeca: 116-176 · Odrasli: S-XL" },
  { id: 39, slug: "brazil-neymar-plavi-jordan", klub: "Brazil", igrac: "Neymar nr10 — plavi Jordan", liga: "Reprezentacija", retro: false, vel: "Djeca: 116-176 · Odrasli: S-XL" },
  { id: 40, slug: "psg-doue-2526", klub: "PSG", igrac: "D.Doué nr14 — 25/26", liga: "Ligue 1", retro: false, vel: "Djeca: 116-176 · Odrasli: S-XL" },
  { id: 41, slug: "brazil-rcarlos-retro", klub: "Brazil", igrac: "R.Carlos nr6 — retro žuti", liga: "Reprezentacija", retro: true, vel: "Djeca: 116-176 · Odrasli: S-XL" },
  { id: 42, slug: "real-ronaldo-balmain", klub: "Real Madrid", igrac: "Ronaldo nr7 — crni Balmain", liga: "La Liga", retro: false, vel: "Djeca: 116-176 · Odrasli: S-XL" },
  { id: 43, slug: "psg-ronaldinho-retro", klub: "PSG", igrac: "Ronaldinho nr10 — retro Thomson", liga: "Ligue 1", retro: true, vel: "Djeca: 116-176 · Odrasli: S-XL" },
  { id: 44, slug: "barcelona-messi-cl-berlin", klub: "FC Barcelona", igrac: "Messi nr10 — CL Berlin 2015", liga: "La Liga", retro: true, vel: "Djeca: 116-176 · Odrasli: S-XL" },
  { id: 45, slug: "brazil-ronaldinho-zuti-sp", klub: "Brazil", igrac: "Ronaldinho nr11 — žuti SP", liga: "Reprezentacija", retro: true, vel: "Djeca: 116-176 · Odrasli: S-XL" },
  { id: 46, slug: "argentina-messi-sp2022", klub: "Argentina", igrac: "Messi nr10 — SP 2022", liga: "Reprezentacija", retro: false, vel: "Djeca: 116-176 · Odrasli: S-XL" },
  { id: 47, slug: "real-mbappe-2526", klub: "Real Madrid", igrac: "Mbappé nr10 — 25/26", liga: "La Liga", retro: false, vel: "Djeca: 116-176 · Odrasli: S-XL" },
  { id: 48, slug: "alnassr-ronaldo-zuti", klub: "Al-Nassr", igrac: "Ronaldo nr7 — žuti KAFD", liga: "Saudi Pro", retro: false, vel: "Djeca: 116-176 · Odrasli: S-XL" },
  { id: 49, slug: "brazil-kaka-crni", klub: "Brazil", igrac: "Kaka nr8 — crni posebno", liga: "Reprezentacija", retro: false, vel: "Djeca: 116-176 · Odrasli: S-XL" },
  { id: 50, slug: "italija-zeleni-posebni", klub: "Italija", igrac: "posebno zeleno izdanje", liga: "Reprezentacija", retro: false, vel: "Djeca: 116-176 · Odrasli: S-XL" },
  { id: 51, slug: "barcelona-yamal-crni-rozi", klub: "FC Barcelona", igrac: "Yamal nr10 — crni/rozi", liga: "La Liga", retro: false, vel: "Djeca: 116-176 · Odrasli: S-XL" },
  { id: 52, slug: "dortmund-adeyemi", klub: "Borussia Dortmund", igrac: "Adeyemi nr27", liga: "Bundesliga", retro: false, vel: "Djeca: 116-176 · Odrasli: S-XL" },
  { id: 53, slug: "atletico-griezmann", klub: "Atletico Madrid", igrac: "Griezmann nr7", liga: "La Liga", retro: false, vel: "Djeca: 116-176 · Odrasli: S-XL" },
  { id: 54, slug: "psg-kvaratskhelia", klub: "PSG", igrac: "Kvaratskhelia nr7", liga: "Ligue 1", retro: false, vel: "Djeca: 116-176 · Odrasli: S-XL" },
  { id: 55, slug: "real-bellingham", klub: "Real Madrid", igrac: "Bellingham nr5", liga: "La Liga", retro: false, vel: "Djeca: 116-176 · Odrasli: S-XL" },
  { id: 56, slug: "psg-doue-bijeli", klub: "PSG", igrac: "D.Doué nr14 — bijeli", liga: "Ligue 1", retro: false, vel: "Djeca: 116-176 · Odrasli: S-XL" },
  { id: 57, slug: "bayern-musiala-crveni", klub: "Bayern München", igrac: "Musiala nr42 — crveni", liga: "Bundesliga", retro: false, vel: "Djeca: 116-176 · Odrasli: S-XL" },
  { id: 58, slug: "intermiami-messi-rozi", klub: "Inter Miami", igrac: "Messi nr10 — rozi", liga: "MLS", retro: false, vel: "Djeca: 116-176 · Odrasli: S-XL" },
  { id: 59, slug: "hrvatska-modric-komplet", klub: "Hrvatska", igrac: "Modrić nr10 — komplet (dres + lopta + kapa)", liga: "Reprezentacija", retro: false, vel: "Djeca: 116-176 · Odrasli: S-XL", price: 40 },
  { id: 60, slug: "hrvatska-modric-dres-set", klub: "Hrvatska", igrac: "Modrić nr10 — dres + hlačice", liga: "Reprezentacija", retro: false, vel: "Djeca: 116-176 · Odrasli: S-XL", price: 25 },
  { id: 61, slug: "hrvatska-modric-lopta", klub: "Hrvatska", igrac: "Lopta Modrić nr10", liga: "Reprezentacija", retro: false, vel: "", price: 13 },
  { id: 62, slug: "hrvatska-modric-kapa", klub: "Hrvatska", igrac: "Kapa Modrić — Luka Modrić", liga: "Reprezentacija", retro: false, vel: "", price: 13 }
];

export const adultSizes = ["S", "M", "L", "XL"] as const;
export const kidSizes = ["116", "128", "140", "152", "164", "176"] as const;

export const PLAYER_FILTER_OPTIONS = [
  "Messi",
  "Ronaldo",
  "Neymar",
  "Yamal",
  "Ronaldinho",
  "Modrić",
  "Mbappé",
  "Bellingham",
  "Haaland",
  "Ibrahimović",
  "Maldini",
  "Zidane",
  "R.Carlos",
  "Palmer",
  "Szoboszlai",
  "Güler",
  "Ramos"
] as const;

const playerFilterAliases: Record<(typeof PLAYER_FILTER_OPTIONS)[number], string[]> = {
  Messi: ["messi"],
  Ronaldo: ["ronaldo"],
  Neymar: ["neymar"],
  Yamal: ["yamal"],
  Ronaldinho: ["ronaldinho"],
  "Modrić": ["modric", "modrić"],
  "Mbappé": ["mbappe", "mbappé"],
  Bellingham: ["bellingham"],
  Haaland: ["haaland"],
  "Ibrahimović": ["ibrahimovic", "ibrahimović"],
  Maldini: ["maldini"],
  Zidane: ["zidane"],
  "R.Carlos": ["rcarlos", "r.carlos", "carlos nr6"],
  Palmer: ["palmer"],
  Szoboszlai: ["szoboszlai"],
  "Güler": ["guler", "güler"],
  Ramos: ["ramos"]
};

const clubThemes: Record<
  string,
  {
    from: string;
    via: string;
    to: string;
    accent: string;
  }
> = {
  Francuska: { from: "#102553", via: "#1d4ed8", to: "#f5f5f5", accent: "#e8ff3c" },
  Brazil: { from: "#063d1e", via: "#eab308", to: "#163a8a", accent: "#e8ff3c" },
  "Bayern München": { from: "#6b1020", via: "#dc2626", to: "#f5f5f5", accent: "#e8ff3c" },
  "FC Barcelona": { from: "#5b0f16", via: "#1d4ed8", to: "#7c3aed", accent: "#e8ff3c" },
  Liverpool: { from: "#4a0d19", via: "#b91c1c", to: "#f5f5f5", accent: "#e8ff3c" },
  Njemačka: { from: "#111111", via: "#3f3f46", to: "#d4af37", accent: "#e8ff3c" },
  Santos: { from: "#111111", via: "#e5e7eb", to: "#8b8b8b", accent: "#e8ff3c" },
  Portugal: { from: "#052e16", via: "#166534", to: "#ef4444", accent: "#e8ff3c" },
  Argentina: { from: "#0f172a", via: "#38bdf8", to: "#f8fafc", accent: "#e8ff3c" },
  Italija: { from: "#07130f", via: "#14532d", to: "#34d399", accent: "#e8ff3c" },
  "Manchester City": { from: "#0f172a", via: "#38bdf8", to: "#f5f5f5", accent: "#e8ff3c" },
  "AC Milan": { from: "#09090b", via: "#b91c1c", to: "#991b1b", accent: "#e8ff3c" },
  PSG: { from: "#0f172a", via: "#1d4ed8", to: "#ef4444", accent: "#e8ff3c" },
  Hrvatska: { from: "#7f1d1d", via: "#f5f5f5", to: "#991b1b", accent: "#e8ff3c" },
  Juventus: { from: "#111111", via: "#525252", to: "#f5f5f5", accent: "#e8ff3c" },
  Chelsea: { from: "#1e3a8a", via: "#2563eb", to: "#f5f5f5", accent: "#e8ff3c" },
  "Borussia Dortmund": { from: "#111111", via: "#facc15", to: "#f5f5f5", accent: "#e8ff3c" },
  "Atletico Madrid": { from: "#1e3a8a", via: "#ef4444", to: "#f8fafc", accent: "#e8ff3c" },
  "Real Madrid": { from: "#e5e7eb", via: "#a855f7", to: "#111827", accent: "#e8ff3c" },
  "Manchester United": { from: "#450a0a", via: "#dc2626", to: "#f59e0b", accent: "#e8ff3c" },
  "Al-Nassr": { from: "#312e81", via: "#facc15", to: "#1d4ed8", accent: "#e8ff3c" },
  "Inter Miami": { from: "#111111", via: "#f472b6", to: "#f8fafc", accent: "#e8ff3c" }
};

export function normalizeText(value: string) {
  return value
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase();
}

export function getJerseyBySlug(slug: string) {
  return jerseys.find((jersey) => jersey.slug === slug);
}

export function getJerseyStock(id: number) {
  return 2 + ((id * 7) % 5);
}

export function getStockTone(stock: number) {
  if (stock <= 2) {
    return "text-red-400";
  }

  if (stock <= 4) {
    return "text-orange-300";
  }

  return "text-accent";
}

export function getJerseyTheme(club: string) {
  return (
    clubThemes[club] ?? {
      from: "#111111",
      via: "#2b2b2b",
      to: "#e8ff3c",
      accent: "#e8ff3c"
    }
  );
}

export function getJerseyImagePath(slug: string) {
  return `/dresovi/${slug}.jpg`;
}

export function getJerseySizeOptions(product: Jersey) {
  const hasKids = product.vel.includes("Djeca");
  const hasAdults = product.vel.includes("Odrasli");

  return {
    hasKids,
    hasAdults,
    adults: hasAdults ? [...adultSizes] : [],
    kids: hasKids ? [...kidSizes] : []
  };
}

export function productSupportsSize(product: Jersey, size: string) {
  const options = getJerseySizeOptions(product);

  if ((adultSizes as readonly string[]).includes(size)) {
    return options.adults.includes(size as (typeof adultSizes)[number]);
  }

  if ((kidSizes as readonly string[]).includes(size)) {
    return options.kids.includes(size as (typeof kidSizes)[number]);
  }

  return false;
}

export function matchesPlayerFilter(product: Jersey, playerLabel: string) {
  const aliases =
    playerFilterAliases[playerLabel as (typeof PLAYER_FILTER_OPTIONS)[number]] ?? [playerLabel];
  const haystack = normalizeText(`${product.igrac} ${product.slug}`);

  return aliases.some((alias) => haystack.includes(normalizeText(alias)));
}

export function getLeagueOptions() {
  return [...new Set(jerseys.map((item) => item.liga))].sort((a, b) =>
    a.localeCompare(b, "hr")
  );
}

export function getClubOptions() {
  return [...new Set(jerseys.map((item) => item.klub))].sort((a, b) =>
    a.localeCompare(b, "hr")
  );
}

export function getRelatedJerseys(product: Jersey) {
  const sameClub = jerseys.filter((item) => item.slug !== product.slug && item.klub === product.klub);
  const sameLeague = jerseys.filter(
    (item) =>
      item.slug !== product.slug &&
      item.liga === product.liga &&
      item.klub !== product.klub
  );

  return [...sameClub, ...sameLeague].slice(0, 4);
}
