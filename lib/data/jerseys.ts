import { repairText } from "@/lib/utils";

export type Jersey = {
  id: number;
  slug: string;
  klub: string;
  igrac: string;
  liga: string;
  retro: boolean;
  vel: string;
  price?: number;
  badge?: "bestseller" | "novo";
  outOfStock?: "adults" | "kids" | "all";
};

export const jerseys: Jersey[] = [
  { id: 1, slug: "francuska-zidane-sp1998", klub: "Francuska", igrac: "Zidane nr10", liga: "Reprezentacija", retro: true, vel: "Djeca: 104-176 · Odrasli: S-XXL" },
  { id: 11, slug: "barcelona-yamal-rozo", klub: "FC Barcelona", igrac: "Yamal nr10 — rozo/plavi", liga: "La Liga", retro: false, vel: "Djeca: 104-176 · Odrasli: S-XXL" },
  { id: 22, slug: "santos-neymar-bijeli", klub: "Santos", igrac: "Neymar Jr. nr10 — bijeli", liga: "Brazil", retro: false, vel: "Djeca: 104-176 · Odrasli: S-XXL" },
  { id: 23, slug: "barcelona-yamal-sareni", klub: "FC Barcelona", igrac: "Yamal nr11 — šareni", liga: "La Liga", retro: false, vel: "Djeca: 104-176 · Odrasli: S-XXL" },
  { id: 25, slug: "barcelona-neymar-retro-qatar", klub: "FC Barcelona", igrac: "Neymar Jr. nr11 — retro Qatar", liga: "La Liga", retro: true, vel: "Djeca: 104-176 · Odrasli: S-XXL" },
  { id: 26, slug: "barcelona-yamal-domaci", klub: "FC Barcelona", igrac: "Yamal nr10 — domaći", liga: "La Liga", retro: false, vel: "Djeca: 104-176 · Odrasli: S-XXL" },
  { id: 27, slug: "chelsea-palmer", klub: "Chelsea", igrac: "Palmer nr10 — bijeli", liga: "Premier Liga", retro: false, vel: "Djeca: 104-176 · Odrasli: S-XXL" },
  { id: 34, slug: "manutd-ronaldo-crveni-ucl", klub: "Manchester United", igrac: "Ronaldo nr7 — crveni UCL", liga: "Premier Liga", retro: true, vel: "Djeca: 104-176 · Odrasli: S-XXL" },
  { id: 36, slug: "barcelona-raphinha", klub: "FC Barcelona", igrac: "Raphinha nr11 — domaći CL", liga: "La Liga", retro: false, vel: "Djeca: 104-176 · Odrasli: S-XXL" },
  { id: 40, slug: "psg-doue-2526", klub: "PSG", igrac: "D.Doué nr14 — 25/26", liga: "Ligue 1", retro: false, vel: "Djeca: 104-176 · Odrasli: S-XXL" },
  { id: 42, slug: "real-ronaldo-balmain", klub: "Real Madrid", igrac: "Ronaldo nr7 — crni Balmain", liga: "La Liga", retro: false, vel: "Djeca: 104-176 · Odrasli: S-XXL" },
  { id: 44, slug: "barcelona-messi-cl-berlin", klub: "FC Barcelona", igrac: "Messi nr10 — CL Berlin 2015", liga: "La Liga", retro: true, vel: "Djeca: 104-176 · Odrasli: S-XXL" },
  { id: 45, slug: "brazil-ronaldinho-zuti-sp", klub: "Brazil", igrac: "Ronaldinho nr11 — žuti SP", liga: "Reprezentacija", retro: true, vel: "Djeca: 104-176 · Odrasli: S-XXL" },
  { id: 47, slug: "real-mbappe-2526", klub: "Real Madrid", igrac: "Mbappé nr10 — 25/26", liga: "La Liga", retro: false, vel: "Djeca: 104-176 · Odrasli: S-XXL" },
  { id: 48, slug: "alnassr-ronaldo-zuti", klub: "Al-Nassr", igrac: "Ronaldo nr7 — žuti KAFD", liga: "Saudi Pro", retro: false, vel: "Djeca: 104-176 · Odrasli: S-XXL", badge: "bestseller" },
  { id: 49, slug: "brazil-kaka-crni", klub: "Brazil", igrac: "Kaka nr8 — crni posebno", liga: "Reprezentacija", retro: false, vel: "Djeca: 104-176 · Odrasli: S-XXL" },
  { id: 51, slug: "barcelona-yamal-crni-rozi", klub: "FC Barcelona", igrac: "Yamal nr10 — crni/rozi", liga: "La Liga", retro: false, vel: "Djeca: 104-176 · Odrasli: S-XXL" },
  { id: 52, slug: "dortmund-adeyemi", klub: "Borussia Dortmund", igrac: "Adeyemi nr27", liga: "Bundesliga", retro: false, vel: "Djeca: 104-176 · Odrasli: S-XXL", badge: "bestseller" },
  { id: 53, slug: "atletico-griezmann", klub: "Atletico Madrid", igrac: "Griezmann nr7", liga: "La Liga", retro: false, vel: "Djeca: 104-176 · Odrasli: S-XXL", badge: "bestseller" },
  { id: 54, slug: "psg-kvaratskhelia", klub: "PSG", igrac: "Kvaratskhelia nr7", liga: "Ligue 1", retro: false, vel: "Djeca: 104-176 · Odrasli: S-XXL" },
  { id: 55, slug: "real-bellingham", klub: "Real Madrid", igrac: "Bellingham nr5", liga: "La Liga", retro: false, vel: "Djeca: 104-176 · Odrasli: S-XXL", badge: "bestseller" },
  { id: 56, slug: "psg-doue-bijeli", klub: "PSG", igrac: "D.Doué nr14 — bijeli", liga: "Ligue 1", retro: false, vel: "Djeca: 104-176 · Odrasli: S-XXL" },
  { id: 57, slug: "bayern-musiala-crveni", klub: "Bayern München", igrac: "Musiala nr42 — crveni", liga: "Bundesliga", retro: false, vel: "Djeca: 104-176 · Odrasli: S-XXL" },
  { id: 58, slug: "intermiami-messi-rozi", klub: "Inter Miami", igrac: "Messi nr10 — rozi", liga: "MLS", retro: false, vel: "Djeca: 104-176 · Odrasli: S-XXL" },
  { id: 60, slug: "milan-modric", klub: "AC Milan", igrac: "Modrić nr14", liga: "Serie A", retro: false, vel: "Djeca: 104-176 · Odrasli: S-XXL", badge: "bestseller" },
  { id: 61, slug: "alnassr-ronaldo-home", klub: "Al-Nassr", igrac: "Ronaldo nr7 — home", liga: "Saudi Pro", retro: false, vel: "Djeca: 104-176 · Odrasli: S-XXL", badge: "novo" },
  { id: 62, slug: "barcelona-yamal-se-plavi", klub: "FC Barcelona", igrac: "Yamal nr10 — plavo/crveni SE", liga: "La Liga", retro: false, vel: "Djeca: 104-176 · Odrasli: S-XXL" },
  { id: 70, slug: "barcelona-raphinha-zeleni", klub: "FC Barcelona", igrac: "Raphinha nr11 — zeleni SE", liga: "La Liga", retro: false, vel: "Djeca: 104-176 · Odrasli: S-XXL" },
  { id: 71, slug: "barcelona-raphinha-crni", klub: "FC Barcelona", igrac: "Raphinha nr11 — crni", liga: "La Liga", retro: false, vel: "Djeca: 104-176 · Odrasli: S-XXL" },
  { id: 72, slug: "bayern-kane-crveni", klub: "Bayern München", igrac: "Kane nr9 — crveni", liga: "Bundesliga", retro: false, vel: "Djeca: 104-176 · Odrasli: S-XXL", badge: "novo" },
  { id: 73, slug: "real-bellingham-narancasti", klub: "Real Madrid", igrac: "Bellingham nr5 — narančasti", liga: "La Liga", retro: false, vel: "Djeca: 104-176 · Odrasli: S-XXL" },
  { id: 74, slug: "bih-bajraktarevic", klub: "BiH", igrac: "Bajraktarević nr10", liga: "Reprezentacija", retro: false, vel: "Djeca: 104-176 · Odrasli: S-XXL", outOfStock: "adults" },
  { id: 75, slug: "bih-dzeko", klub: "BiH", igrac: "Džeko nr9", liga: "Reprezentacija", retro: false, vel: "Djeca: 104-176 · Odrasli: S-XXL", outOfStock: "adults" },
  { id: 76, slug: "brazil-neymar-domaci", klub: "Brazil", igrac: "Neymar nr10 — domaći žuti", liga: "Reprezentacija", retro: false, vel: "Djeca: 104-176 · Odrasli: S-XXL" },
  { id: 77, slug: "brazil-ronaldinho-posebni", klub: "Brazil", igrac: "Ronaldinho — posebno izdanje", liga: "Reprezentacija", retro: true, vel: "Djeca: 104-176 · Odrasli: S-XXL" },
  { id: 78, slug: "brazil-vinitjr", klub: "Brazil", igrac: "Vinícius Jr nr7 — domaći", liga: "Reprezentacija", retro: false, vel: "Djeca: 104-176 · Odrasli: S-XXL" },
  { id: 79, slug: "hrvatska-modric-2026", klub: "Hrvatska", igrac: "Modrić nr10 — 2026", liga: "Reprezentacija", retro: false, vel: "Djeca: 104-176 · Odrasli: S-XXL", badge: "novo" },
  { id: 80, slug: "barcelona-yamal-plavi", klub: "FC Barcelona", igrac: "Yamal nr10 — plavi", liga: "La Liga", retro: false, vel: "Djeca: 104-176 · Odrasli: S-XXL" },
  { id: 81, slug: "argentina-messi-retro", klub: "Argentina", igrac: "Messi nr10 — retro", liga: "Reprezentacija", retro: true, vel: "Djeca: 104-176 · Odrasli: S-XXL" },
  { id: 82, slug: "intermiami-messi-crni", klub: "Inter Miami", igrac: "Messi nr10 — crni", liga: "MLS", retro: false, vel: "Djeca: 104-176 · Odrasli: S-XXL" },
  { id: 83, slug: "njemacka-wirtz", klub: "Njemačka", igrac: "Wirtz nr10 — domaći", liga: "Reprezentacija", retro: false, vel: "Djeca: 104-176 · Odrasli: S-XXL" },
  { id: 84, slug: "psg-doue-crni", klub: "PSG", igrac: "D.Doué nr14 — crni SE", liga: "Ligue 1", retro: false, vel: "Djeca: 104-176 · Odrasli: S-XXL" },
  { id: 85, slug: "real-mbappe-bijeli-2026", klub: "Real Madrid", igrac: "Mbappé nr10 — bijeli 2026", liga: "La Liga", retro: false, vel: "Djeca: 104-176 · Odrasli: S-XXL", badge: "novo" },
  { id: 87, slug: "portugal-ronaldo-crveni", klub: "Portugal", igrac: "Ronaldo nr7 — crveni", liga: "Reprezentacija", retro: false, vel: "Djeca: 104-176 · Odrasli: S-XXL", badge: "bestseller" },
  { id: 88, slug: "real-ronaldo-2018", klub: "Real Madrid", igrac: "Ronaldo nr7 — 2018", liga: "La Liga", retro: true, vel: "Djeca: 104-176 · Odrasli: S-XXL" },
  { id: 89, slug: "brazil-vinitjr-plavi", klub: "Brazil", igrac: "Vinícius Jr nr7 — plavi", liga: "Reprezentacija", retro: false, vel: "Djeca: 104-176 · Odrasli: S-XXL" },
  { id: 90, slug: "milan-ibrahimovic", klub: "AC Milan", igrac: "Ibrahimović nr11 — retro", liga: "Serie A", retro: true, vel: "Djeca: 104-176 · Odrasli: S-XXL" },
  { id: 91, slug: "milan-maldini-gucci", klub: "AC Milan", igrac: "Maldini nr3 — Gucci edition", liga: "Serie A", retro: true, vel: "Djeca: 104-176 · Odrasli: S-XXL" },
  { id: 92, slug: "bayern-karl", klub: "Bayern München", igrac: "KARL — posebno izdanje", liga: "Bundesliga", retro: false, vel: "Djeca: 104-176 · Odrasli: S-XXL" },
  { id: 93, slug: "bayern-luis-diaz", klub: "Bayern München", igrac: "Luis Díaz", liga: "Bundesliga", retro: false, vel: "Djeca: 104-176 · Odrasli: S-XXL" },
  { id: 94, slug: "brazil-neymar-plavi", klub: "Brazil", igrac: "Neymar nr10 — plavi", liga: "Reprezentacija", retro: false, vel: "Djeca: 104-176 · Odrasli: S-XXL" },
  { id: 95, slug: "brazil-pele-jesus", klub: "Brazil", igrac: "Pelé nr10 — Jesus Edition", liga: "Reprezentacija", retro: true, vel: "Djeca: 104-176 · Odrasli: S-XXL" },
  { id: 96, slug: "barcelona-yamal-bijelo-rozi", klub: "FC Barcelona", igrac: "Yamal nr10 — bijelo/rozi", liga: "La Liga", retro: false, vel: "Djeca: 104-176 · Odrasli: S-XXL" },
  { id: 97, slug: "barcelona-neymar-2015", klub: "FC Barcelona", igrac: "Neymar nr11 — 2015 home", liga: "La Liga", retro: true, vel: "Djeca: 104-176 · Odrasli: S-XXL" },
  { id: 98, slug: "barcelona-ronaldo-r9", klub: "FC Barcelona", igrac: "Ronaldo R9 nr9 — Kappa", liga: "La Liga", retro: true, vel: "Djeca: 104-176 · Odrasli: S-XXL" },
  { id: 101, slug: "hrvatska-gvardiol-2026", klub: "Hrvatska", igrac: "Gvardiol nr4 — 2026", liga: "Reprezentacija", retro: false, vel: "Djeca: 104-176 · Odrasli: S-XXL" },
  { id: 102, slug: "hrvatska-livakovic", klub: "Hrvatska", igrac: "Livaković nr1", liga: "Reprezentacija", retro: false, vel: "Djeca: 104-176 · Odrasli: S-XXL" },
  { id: 103, slug: "hrvatska-perisic", klub: "Hrvatska", igrac: "Perišić nr14", liga: "Reprezentacija", retro: false, vel: "Djeca: 104-176 · Odrasli: S-XXL" },
  { id: 104, slug: "hrvatska-stanisic-2026", klub: "Hrvatska", igrac: "Stanišić nr2 — 2026", liga: "Reprezentacija", retro: false, vel: "Djeca: 104-176 · Odrasli: S-XXL" },
  { id: 105, slug: "juventus-sp10", klub: "Juventus", igrac: "Posebno izdanje nr10", liga: "Serie A", retro: false, vel: "Djeca: 104-176 · Odrasli: S-XXL" },
  { id: 106, slug: "liverpool-ekitike", klub: "Liverpool", igrac: "Ekitikè", liga: "Premier Liga", retro: false, vel: "Djeca: 104-176 · Odrasli: S-XXL" },
  { id: 107, slug: "mancity-cherki", klub: "Manchester City", igrac: "Cherki", liga: "Premier Liga", retro: false, vel: "Djeca: 104-176 · Odrasli: S-XXL" },
  { id: 108, slug: "manutd-sesko", klub: "Manchester United", igrac: "Šeško", liga: "Premier Liga", retro: false, vel: "Djeca: 104-176 · Odrasli: S-XXL" },
  { id: 109, slug: "psg-hakimi", klub: "PSG", igrac: "Hakimi nr2", liga: "Ligue 1", retro: false, vel: "Djeca: 104-176 · Odrasli: S-XXL" },
  { id: 110, slug: "psg-ronaldinho", klub: "PSG", igrac: "Ronaldinho nr10 — retro", liga: "Ligue 1", retro: true, vel: "Djeca: 104-176 · Odrasli: S-XXL" },
  { id: 111, slug: "portugal-ronaldo-2026", klub: "Portugal", igrac: "Ronaldo nr7 — 2026 WC", liga: "Reprezentacija", retro: false, vel: "Djeca: 104-176 · Odrasli: S-XXL" },
  { id: 112, slug: "real-ramos-2018-cl", klub: "Real Madrid", igrac: "Ramos nr4 — 2018 CL Final", liga: "La Liga", retro: true, vel: "Djeca: 104-176 · Odrasli: S-XXL" },
  { id: 113, slug: "real-ronaldo-ljubicasti-cl", klub: "Real Madrid", igrac: "Ronaldo nr7 — ljubičasti CL", liga: "La Liga", retro: true, vel: "Djeca: 104-176 · Odrasli: S-XXL" },
  { id: 114, slug: "real-arda-guler", klub: "Real Madrid", igrac: "Arda Güler nr15", liga: "La Liga", retro: false, vel: "Djeca: 104-176 · Odrasli: S-XXL" },
  { id: 115, slug: "real-ronaldo-bijeli-cl", klub: "Real Madrid", igrac: "Ronaldo nr7 — bijeli CL", liga: "La Liga", retro: true, vel: "Djeca: 104-176 · Odrasli: S-XXL" },
  { id: 59, slug: "hrvatska-modric-komplet", klub: "Hrvatska", igrac: "Modrić nr10 — komplet (dres + hlačice + lopta + kapa)", liga: "Komplet", retro: false, vel: "Djeca: 104-176 · Odrasli: S-XXL", price: 40 },
  { id: 63, slug: "portugal-ronaldo-komplet", klub: "Portugal", igrac: "Ronaldo nr7 — komplet (dres + hlačice + lopta + kapa)", liga: "Komplet", retro: false, vel: "Djeca: 104-176 · Odrasli: S-XXL", price: 40 },
  { id: 64, slug: "barcelona-yamal-komplet", klub: "FC Barcelona", igrac: "Yamal nr10 — komplet (dres + hlačice + lopta + kapa)", liga: "Komplet", retro: false, vel: "Djeca: 104-176 · Odrasli: S-XXL", price: 40 },
  { id: 65, slug: "real-mbappe-komplet", klub: "Real Madrid", igrac: "Mbappé nr10 — komplet (dres + hlačice + lopta + kapa)", liga: "Komplet", retro: false, vel: "Djeca: 104-176 · Odrasli: S-XXL", price: 40 },
  { id: 66, slug: "bayern-kane-komplet", klub: "Bayern München", igrac: "Kane nr9 — komplet (dres + hlačice + lopta + kapa)", liga: "Komplet", retro: false, vel: "Djeca: 104-176 · Odrasli: S-XXL", price: 40 },
  { id: 67, slug: "intermiami-messi-komplet", klub: "Inter Miami", igrac: "Messi nr10 — komplet (dres + hlačice + lopta + kapa)", liga: "Komplet", retro: false, vel: "Djeca: 104-176 · Odrasli: S-XXL", price: 40 },
  { id: 68, slug: "njemacka-wirtz-komplet", klub: "Njemačka", igrac: "Wirtz nr17 — komplet (dres + hlačice + lopta + kapa)", liga: "Komplet", retro: false, vel: "Djeca: 104-176 · Odrasli: S-XXL", price: 40 },
  { id: 69, slug: "milan-modric-komplet", klub: "AC Milan", igrac: "Modrić nr14 — komplet (dres + hlačice + lopta + kapa)", liga: "Komplet", retro: false, vel: "Djeca: 104-176 · Odrasli: S-XXL", price: 40 },
];

// Flagship product — always shown first across the site
export const FLAGSHIP_SLUG = "hrvatska-modric-2026";

export const adultSizes = ["S", "M", "L", "XL", "XXL"] as const;
export const kidSizes = ["104", "116", "128", "140", "152", "164", "176"] as const;

// National-team kits go up to XXL; club kits only up to XL (we don't stock club XXL).
const NATIONAL_TEAMS = new Set(["Hrvatska", "Argentina", "Brazil", "Portugal", "Francuska", "Njemačka", "BiH"]);
const adultSizesNoXXL = adultSizes.filter((s) => s !== "XXL");

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

export function isNationalTeam(product: Jersey) {
  return product.liga === "Reprezentacija" || NATIONAL_TEAMS.has(product.klub);
}

export function getJerseySizeOptions(product: Jersey) {
  const hasKids = product.vel.includes("Djeca");
  const hasAdults = product.vel.includes("Odrasli");
  // Clubs don't carry XXL — only national teams do.
  const adultRange = isNationalTeam(product) ? adultSizes : adultSizesNoXXL;

  return {
    hasKids,
    hasAdults,
    adults: hasAdults ? [...adultRange] : [],
    kids: hasKids ? [...kidSizes] : [],
    adultsOutOfStock: product.outOfStock === "adults" || product.outOfStock === "all",
    kidsOutOfStock: product.outOfStock === "kids" || product.outOfStock === "all",
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
  const isKomplet = product.liga === "Komplet";

  // Best upsell: the full komplet of the same club (unless already viewing one)
  const kompletUpsell = isKomplet
    ? []
    : jerseys.filter(
        (item) => item.slug !== product.slug && item.liga === "Komplet" && item.klub === product.klub
      );

  const sameClub = jerseys.filter(
    (item) => item.slug !== product.slug && item.klub === product.klub && item.liga !== "Komplet"
  );

  const sameLeague = jerseys.filter(
    (item) => item.slug !== product.slug && item.liga === product.liga && item.klub !== product.klub
  );

  const seen = new Set<string>();
  return [...kompletUpsell, ...sameClub, ...sameLeague]
    .filter((item) => (seen.has(item.slug) ? false : (seen.add(item.slug), true)))
    .slice(0, 4);
}

const LEAGUE_PHRASE: Record<string, string> = {
  "La Liga": "španjolske La Lige",
  "Premier Liga": "engleske Premier lige",
  "Bundesliga": "njemačke Bundeslige",
  "Serie A": "talijanske Serie A",
  "Ligue 1": "francuske Ligue 1",
  Reprezentacija: "reprezentativnog nogometa",
  "Saudi Pro": "Saudijske Pro lige",
  Brazil: "brazilskog nogometa",
  MLS: "američke MLS lige"
};

// Builds a unique, per-product description (helps users + search indexing).
export function getJerseyDescription(product: Jersey): string[] {
  const klub = repairText(product.klub);
  const igrac = repairText(product.igrac);
  const isKomplet = product.liga === "Komplet";
  const leaguePhrase = LEAGUE_PHRASE[product.liga] ?? "svjetskog nogometa";

  const intro = isKomplet
    ? `${klub} komplet s motivom igrača ${igrac} dolazi kao zaokružen paket — dres, hlačice, lopta i kapa. Idealan poklon za male navijače jer dijete dobije sve potrebno za igru odmah iz kutije.`
    : `${klub} dres s ušivenim imenom i brojem igrača ${igrac}, vjeran originalnom izgledu. Materijal je lagan i prozračan, ugodan za nošenje i na terenu i u gradu.`;

  const context = product.retro
    ? `Riječ je o retro modelu koji vraća kultni izgled iz ${leaguePhrase} — komad koji nosi priču i prepoznatljivu siluetu.`
    : `Model prati aktualni izgled iz ${leaguePhrase} i jedan je od traženijih u našoj ponudi.`;

  const adultRange = isNationalTeam(product) ? "S–XXL" : "S–XL";
  const sizes = isKomplet
    ? `Dostupno u dječjim (104–176) i odraslim (${adultRange}) veličinama; svaki komplet uključuje dres, hlačice, loptu i kapu.`
    : `Dostupno u dječjim veličinama 104–176 (dres + hlačice) te odraslim veličinama ${adultRange} (dres).`;

  const delivery =
    "Dostava po cijeloj Hrvatskoj uz plaćanje pouzećem, isporuka 2–5 radnih dana. Nisi siguran/na za veličinu? Pošalji nam visinu na WhatsApp i predložit ćemo pravu.";

  return [intro, context, sizes, delivery];
}
