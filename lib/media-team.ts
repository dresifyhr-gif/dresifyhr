// DRESIFY MEDIA — redakcija. Agenti jutarnje rutine (lokalno na Igorovom Macu)
// prikazani kao članovi tima: ime, pozicija i posao. Ista imena koristi rutina
// (~/.claude/scheduled-tasks/dresify-media-jutro/SKILL.md) kad potpisuje rad.
// Čisti podaci (bez servera) da ih može koristiti i klijentska kartica.

export type TeamMember = {
  id: string;
  name: string;
  role: string;
  initials: string;
  color: string; // pozadina avatara
  does: string; // što radi, jednom rečenicom
  rules: string[]; // ključna pravila koja poštuje
  output: string; // što mjerimo danas (ključ u brojaču)
  dept: "Vodstvo" | "Istraživanje" | "Produkcija" | "Distribucija" | "Analitika";
  phase?: "aktivan" | "uskoro";
};

export const MEDIA_TEAM: TeamMember[] = [
  {
    id: "urednik",
    dept: "Vodstvo",
    name: "Luka",
    role: "Glavni urednik",
    initials: "LU",
    color: "#e8ff3c",
    does: "Vodi jutarnju rutinu u 6:00, čita tvoje ocjene, bira 3 najbolje teme i šalje sve u Media.",
    rules: ["Uči iz tvojih ocjena", "Raznolike serije kroz tjedan", "Ništa ne objavljuje bez tebe ili autopilota"],
    output: "ideas"
  },
  {
    id: "lovac",
    dept: "Istraživanje",
    name: "Toni",
    role: "Lovac na teme",
    initials: "TO",
    color: "#60a5fa",
    does: "Prati hrvatske nogometne vijesti i ono što je u trendu zadnjih 24-48 sati.",
    rules: ["Stvarni signali, ne nagađanje", "Bez politike i klađenja"],
    output: "ideas"
  },
  {
    id: "dopisnik",
    dept: "Istraživanje",
    name: "Matea",
    role: "Strana dopisnica",
    initials: "MA",
    color: "#a78bfa",
    does: "Čita BBC, Marcu, Gazzettu, kicker, L'Équipe i prenosi najzanimljivije hrvatskoj publici.",
    rules: ["Svojim riječima, ne prijevod", "Nikad tuđe slike ni video", "Uvijek „prema …“", "Jedan izvor = GLASINA"],
    output: "ideas"
  },
  {
    id: "retro",
    dept: "Istraživanje",
    name: "Dino",
    role: "Retro istraživač",
    initials: "DI",
    color: "#f59e0b",
    does: "Traži obljetnice, „Na današnji dan“ i zaboravljene talente.",
    rules: ["Datumi i rezultati iz RSSSF-a, UEFA-e, HNS-a"],
    output: "ideas"
  },
  {
    id: "provjera",
    dept: "Istraživanje",
    name: "Iva",
    role: "Provjeravateljica činjenica",
    initials: "IV",
    color: "#34d399",
    does: "Svaku činjenicu provjerava u 2 nezavisna izvora i daje status POTVRĐENO / DJELOMIČNO / NEPOTVRĐENO / GLASINA.",
    rules: ["Ista agencijska vijest = 1 izvor", "Sporne brojke ne idu na grafiku"],
    output: "verified"
  },
  {
    id: "strogi",
    dept: "Vodstvo",
    name: "Vedran",
    role: "Strogi urednik (autopilot)",
    initials: "VE",
    color: "#f87171",
    does: "Prije svake automatske objave ponovno provjeri činjenice, licencu slike, ton i ponavljanje teme.",
    rules: ["Ako sumnja, objava čeka tebe", "Glasine nikad"],
    output: "autoChecked"
  },
  {
    id: "pisac",
    dept: "Produkcija",
    name: "Karla",
    role: "Autorica tekstova",
    initials: "KA",
    color: "#f472b6",
    does: "Piše captione i scenarije: jaka udica, kratko, svojim riječima.",
    rules: ["Najviše 1-2 emojija", "Bez cringea", "Prodajni naslovi suhi i činjenični"],
    output: "drafts"
  },
  {
    id: "dizajn",
    dept: "Produkcija",
    name: "Leon",
    role: "Kreativni direktor",
    initials: "LE",
    color: "#22d3ee",
    does: "Slaže grafike u kino stilu: AI ilustracije iz ChatGPT-a, Commons fotke i naši dresovi.",
    rules: ["Bez lica stvarnih igrača i grbova", "Nikad Getty, Pixsell, portali", "Licenca uz svaku sliku"],
    output: "images"
  },
  {
    id: "video",
    dept: "Produkcija",
    name: "Bruno",
    role: "Video montažer (Reels, TikTok, Shorts)",
    initials: "BR",
    color: "#fb923c",
    does: "Radi dramatične storytelling Reelse: rez svakih ~1,5 s, titlovi riječ po riječ, studijski zvuk.",
    rules: ["Bez TV snimki i tuđih videa", "TikTok verzija bez žiga", "Trending zvuk dodaješ ti"],
    output: "reels"
  },
  {
    id: "glas",
    dept: "Produkcija",
    name: "Mihael",
    role: "Glas pripovjedača",
    initials: "MI",
    color: "#c084fc",
    does: "Pripovijeda Reelse dramatičnim tonom (ElevenLabs), izgovor se provjerava prepoznavanjem govora.",
    rules: ["Priča frendu, ne čita vijesti"],
    output: "reels"
  },
  {
    id: "kanal",
    dept: "Distribucija",
    name: "Petra",
    role: "Urednica kanala Dresify Svlačionica",
    initials: "PE",
    color: "#4ade80",
    does: "Svaki dan 2-3 kratke poruke za kanal: ankete, kvizovi, pogodi igrača, prognoze i reakcije.",
    rules: ["Najviše 1 emoji", "Objava ručno (Kopiraj)"],
    output: "channel"
  },
  {
    id: "prodaja",
    dept: "Distribucija",
    name: "Filip",
    role: "Prodaja (Dres priče)",
    initials: "FI",
    color: "#facc15",
    does: "Jednom dnevno objava s dresom koji STVARNO imamo na stanju, vezana uz vijest dana.",
    rules: ["Zaliha iz baze prije svake objave", "Bez hrvatskih dresova do novih Adidas modela", "Bez izmišljenih cijena i popusta"],
    output: "sales"
  },
  {
    id: "rast",
    dept: "Analitika",
    name: "Ema",
    role: "Menadžerica rasta",
    initials: "EM",
    color: "#94a3b8",
    does: "Tjedni izvještaj sa stvarnim Instagram brojkama: što radi, što ne, što promijeniti.",
    rules: ["Samo stvarni podaci"],
    output: "none",
    phase: "uskoro"
  }
];

export const avatarOf = (id: string) => `/admin/tim/${id}.webp`;
export const memberOf = (id: string) => MEDIA_TEAM.find((m) => m.id === id);
export const DEPTS = ["Vodstvo", "Istraživanje", "Produkcija", "Distribucija", "Analitika"] as const;

// Tko je radio na nacrtu (za avatare na kartici). Čisto po formatu/seriji.
export function crewFor(item: { format: string | null; series: string | null; kind: string }): string[] {
  if (item.format === "CHANNEL") return ["kanal", "provjera"];
  const c = ["pisac", "dizajn", "provjera"];
  if (item.format === "REEL") c.push("video", "glas");
  if (item.series === "Dres priče") c.unshift("prodaja");
  if (item.series === "Utakmica") c.unshift("lovac");
  return c;
}
