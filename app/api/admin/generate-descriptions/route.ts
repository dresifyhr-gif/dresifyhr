import { NextResponse } from "next/server";
import { generateText } from "ai";
import { anthropic } from "@ai-sdk/anthropic";
import { revalidateTag } from "next/cache";

import { isAdmin } from "@/lib/admin-auth";
import { prisma } from "@/lib/prisma";
import { jerseys } from "@/lib/data/jerseys";
import { getCatalogProducts, getStreetwearProducts } from "@/lib/data/product-overrides";
import { repairText } from "@/lib/utils";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
// Sonnet piše ~14 s po opisu (izmjereno). Serija mora stati u vrijeme izvođenja,
// inače funkcija istekne (504) i cijela runda propadne.
export const maxDuration = 300;

// Automatski opis je bio ~80% identičan na svim proizvodima (dva od četiri
// odlomka doslovno ista), pa je Google 71 stranicu označio "Discovered –
// currently not indexed". Ovdje AI piše JEDINSTVEN opis po proizvodu.
//
// Radi u serijama (batch) da stane u vrijeme izvođenja: klijent zove više puta
// dok ne javimo da je gotovo.

const SYSTEM = `Ti si copywriter za Dresify, hrvatski webshop nogometnih dresova.
Napiši JEDINSTVEN opis proizvoda na besprijekornom hrvatskom.

OBAVEZNO:
- 3 odlomka, odvojena s \\n. Ukupno 90–140 riječi.
- Prvi odlomak MORA biti specifičan baš za ovaj dres: klub/reprezentacija, igrač,
  boje ili varijanta iz naziva, sezona ako je navedena, kontekst kluba ili igrača.
- Drugi odlomak: kome odgovara i zašto (navijač, poklon, dijete, kolekcionar) —
  vezano uz OVAJ konkretan model, ne općenito.
- Treći odlomak: veličine i dostava, ali napisano drukčije nego kod drugih
  proizvoda (variraj formulaciju).

STROGO ZABRANJENO (krivi podaci su gori od šablone):
- NE izmišljaj ništa o igraču: ni puno ime, ni klub, ni transfere, ni statistiku,
  ni predviđanja ("bit će ključan", "nosit će na turniru"). Ako o igraču ne znaš
  pouzdano, piši o DRESU (boje, varijanta, kome odgovara), ne o karijeri.
- NE izmišljaj cijenu, popuste, materijale ni službena licenciranja.
- NE piši "vjeran originalnom izgledu" ni druge šablonske fraze.
- Bez markdowna, naslova i emojija.

JEZIK: besprijekoran hrvatski, NE srpski/bosanski. Piši "aktualan" (ne
"aktuelan"), "uvjet" (ne "uslov"), "natjecanje" (ne "takmičenje"), "tjedan" (ne
"nedjelja" za sedmicu). Svaka rečenica mora biti gramatički ispravna i prirodna.
Bolje kraće i točno nego dulje i nespretno. Zadnja rečenica MORA biti dovršena.`;

// Streetwear nema klub, igrača ni sezonu — s prompta za dresove model nema o čemu
// pisati. Zato zaseban prompt: dizajn, boja, kroj, prilike za nošenje.
const SYSTEM_STREETWEAR = `Ti si copywriter za Dresify, hrvatski webshop.
Napiši JEDINSTVEN opis streetwear kompleta na besprijekornom hrvatskom.

OBAVEZNO:
- 3 odlomka, odvojena s \\n. Ukupno 90–140 riječi.
- Prvi odlomak: dizajn i boja iz naziva (npr. grafiti print, cvjetni vijenac,
  oblaci), kakav dojam ostavlja, uz kakav stil ide.
- Drugi odlomak: kome odgovara i kada se nosi (ljeto, izlazak, trening, poklon) —
  vezano uz OVAJ konkretan model, ne općenito.
- Treći odlomak: veličine i dostava, napisano drukčije nego kod drugih proizvoda.

STROGO ZABRANJENO:
- NE izmišljaj marku, dizajnera, kolekciju, materijal ni gramaturu.
- NE izmišljaj cijenu ni popuste.
- NE spominji nogomet, klubove ni igrače — ovo NIJE dres.
- Bez markdowna, naslova i emojija.

JEZIK: besprijekoran hrvatski. Bolje kraće i točno nego dulje i nespretno.`;

export async function POST(request: Request) {
  if (!(await isAdmin())) return NextResponse.json({ ok: false }, { status: 401 });

  const body = await request.json().catch(() => ({}));
  const batch = Math.min(3, Math.max(1, Number(body?.batch) || 3)); // 3 × ~14 s = ~42 s, sigurno i uz 60 s limit
  const force = body?.force === true; // prepiši i one koji već imaju opis

  // Streetwear ima svoju stranicu i getCatalogProducts ga izbacuje, ali su to
  // isto tako proizvodne stranice koje Google mora indeksirati — pa idu i oni.
  const [catalog, streetwear] = await Promise.all([
    getCatalogProducts(jerseys),
    getStreetwearProducts()
  ]);
  const streetwearSlugs = new Set(streetwear.map((p) => p.slug));
  const all = [...catalog, ...streetwear];

  // Koji već imaju vlastiti opis (da ne trošimo AI i ne gazimo ručni tekst).
  const [overrides, customs] = await Promise.all([
    prisma.productOverride.findMany({ select: { slug: true, description: true } }),
    prisma.customProduct.findMany({ select: { slug: true, description: true } })
  ]);
  const hasDesc = new Set<string>();
  for (const o of overrides) if (o.description?.trim()) hasDesc.add(o.slug);
  for (const c of customs) if (c.description?.trim()) hasDesc.add(c.slug);
  const customSlugs = new Set(customs.map((c) => c.slug));

  const todo = all.filter((p) => force || !hasDesc.has(p.slug));
  const slice = todo.slice(0, batch);

  let done = 0;
  const written: string[] = [];
  // Prije se greška samo progutala, pa je "0 napisano" izgledalo kao "gotovo".
  // Sad se vraća klijentu da se vidi ŠTO je puklo.
  const errors: { slug: string; error: string }[] = [];

  for (const p of slice) {
    const klub = repairText(p.klub);
    const igrac = repairText(p.igrac);
    const isStreetwear = streetwearSlugs.has(p.slug);
    try {
      const { text } = await generateText({
        model: anthropic("claude-sonnet-5"),
        system: isStreetwear ? SYSTEM_STREETWEAR : SYSTEM,
        prompt: isStreetwear
          ? `Proizvod: ${klub} — ${igrac}
Veličine: ${p.vel}`
          : `Klub/reprezentacija: ${klub}
Igrač i varijanta: ${igrac}
Liga: ${repairText(p.liga)}
Retro: ${p.retro ? "da" : "ne"}
Veličine: ${p.vel}`,
        // 500 je bilo premalo: hrvatski troši puno tokena po riječi, pa je 44%
        // opisa ostalo odrezano nasred rečenice. Plaćamo stvarni izlaz, ne strop.
        maxOutputTokens: 1200
      });
      const desc = text.trim();
      if (!desc) {
        errors.push({ slug: p.slug, error: "model je vratio prazan tekst" });
        continue;
      }
      // Sigurnosna mreža: odrezan tekst ne smije završiti na stranici.
      if (!/[.!?]\s*$/.test(desc)) {
        errors.push({ slug: p.slug, error: "opis je odrezan — preskočeno" });
        continue;
      }

      if (customSlugs.has(p.slug)) {
        await prisma.customProduct.update({ where: { slug: p.slug }, data: { description: desc } });
      } else {
        await prisma.productOverride.upsert({
          where: { slug: p.slug },
          create: { slug: p.slug, description: desc },
          update: { description: desc }
        });
      }
      done++;
      written.push(p.slug);
    } catch (e) {
      // preskoči pojedini proizvod, nastavi dalje — ali zapamti razlog
      errors.push({ slug: p.slug, error: e instanceof Error ? e.message : String(e) });
    }
  }

  if (done > 0) revalidateTag("products");

  return NextResponse.json({
    ok: true,
    done,
    written,
    remaining: Math.max(0, todo.length - done),
    total: all.length,
    errors
  });
}
