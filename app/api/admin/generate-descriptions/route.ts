import { NextResponse } from "next/server";
import { generateText } from "ai";
import { anthropic } from "@ai-sdk/anthropic";
import { revalidateTag } from "next/cache";

import { isAdmin } from "@/lib/admin-auth";
import { prisma } from "@/lib/prisma";
import { jerseys } from "@/lib/data/jerseys";
import { getCatalogProducts } from "@/lib/data/product-overrides";
import { repairText } from "@/lib/utils";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

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

JEZIK: besprijekoran hrvatski. Svaka rečenica mora biti gramatički ispravna i
prirodna. Bolje kraće i točno nego dulje i nespretno.`;

export async function POST(request: Request) {
  if (!(await isAdmin())) return NextResponse.json({ ok: false }, { status: 401 });

  const body = await request.json().catch(() => ({}));
  const batch = Math.min(8, Math.max(1, Number(body?.batch) || 5));
  const force = body?.force === true; // prepiši i one koji već imaju opis

  const all = await getCatalogProducts(jerseys);

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

  for (const p of slice) {
    const klub = repairText(p.klub);
    const igrac = repairText(p.igrac);
    try {
      const { text } = await generateText({
        model: anthropic("claude-sonnet-5"),
        system: SYSTEM,
        prompt: `Klub/reprezentacija: ${klub}
Igrač i varijanta: ${igrac}
Liga: ${repairText(p.liga)}
Retro: ${p.retro ? "da" : "ne"}
Veličine: ${p.vel}`,
        maxOutputTokens: 500
      });
      const desc = text.trim();
      if (!desc) continue;

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
    } catch {
      // preskoči pojedini proizvod, nastavi dalje
    }
  }

  if (done > 0) revalidateTag("products");

  return NextResponse.json({
    ok: true,
    done,
    written,
    remaining: Math.max(0, todo.length - done),
    total: all.length
  });
}
