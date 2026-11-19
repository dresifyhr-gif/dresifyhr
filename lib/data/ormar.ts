// "Ormar" — dresovi na vješalici (naslovnica). Izrezane slike leđa (ime + broj)
// su u public/ormar/<slug>.webp (prozirna pozadina). Redoslijed = redoslijed na šipki.
// Proizvod koji je skriven/ne postoji automatski se preskače (vidi resolveOrmar).
import type { Jersey } from "@/lib/data/jerseys";

export const ORMAR_SLUGS: string[] = [
  "barcelona-yamal-nr10-novi-domaci-2026-27",
  "hrvatska-baturina-nr16-domaci-2026",
  "real-madrid-mbappe-nr10-bijeli-2026-27",
  "portugal-ronaldo-nr7-crveni-domaci",
  "ac-milan-leao-nr10-roza-plavi-gradient",
  "hrvatska-perisic",
  "paris-saint-germain-doue-nr14-novi-domaci-plavo-crveni-2026-",
  "argentina-messi-plavi-sp-2026",
  "barcelona-yamal-nr10-crni-specijalno-izdanje",
  "hrvatska-vuskovic-nr22-sp-2026",
  "real-madrid-courtois-nr1-golmanski-ruzicasti-komplet",
  "manchester-united-ronaldo-nr7-final-moscow-2008-retro",
  "norveska-haaland-nr9-crveni-domaci",
  "hrvatska-stanisic-2026",
  "engleska-bellingham-nr10-bijeli-domaci-komplet",
  "barcelona-ronaldinho-nr10-retro-plavo-bordo",
  "bih-dzeko-sp-2026",
  "njemacka-neuer-nr1-roza-vratarski-2022",
  "real-madrid-mbappe-nr10-plavo-roza-2026",
  "brazil-r-carlos-nr6-zuti-retro-sp-2006",
  "paris-saint-germain-dembele-nr10-bijeli-2025-26",
  "hrvatska-gvardiol-2026",
  "arsenal-gyokeres-nr71-domaci-crveno-bijeli",
  "al-hilal-neymar-jr-nr10-plavi-domaci-komplet",
  "brazil-neymar-jr-nr10-plavi-jesus-edicija",
  "real-madrid-ronaldo-nr7-roza-retro",
  "hrvatska-livakovic",
  "spanjolska-yamal-nr19-djecji-komplet-crveni-2026",
  "barcelona-yamal-nr10-crno-crveni-champions-league-komplet",
  "argentina-messi-nr10-svjetski-prvak-2022"
];

export type OrmarItem = {
  slug: string;
  cutout: string; // /ormar/<slug>.webp — leđa dresa, prozirna pozadina
  klub: string;
  igrac: string;
  price: number;
  href: string; // /dres/<slug>/
  product: Jersey; // cijeli proizvod (za veličine / dodavanje u košaricu)
};

export function resolveOrmar(products: Jersey[], limit = 30): OrmarItem[] {
  const bySlug = new Map(products.map((p) => [p.slug, p]));
  const out: OrmarItem[] = [];
  for (const slug of ORMAR_SLUGS) {
    const p = bySlug.get(slug);
    if (!p || p.hidden || p.outOfStock === "all") continue;
    out.push({ slug, cutout: `/ormar/${slug}.webp`, klub: p.klub, igrac: p.igrac, price: p.price ?? 20, href: `/dres/${slug}/`, product: p });
    if (out.length >= limit) break;
  }
  return out;
}
