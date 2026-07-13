import { NextResponse } from "next/server";
import { generateText } from "ai";
import { anthropic } from "@ai-sdk/anthropic";

import { isAdmin } from "@/lib/admin-auth";

// Iz brenda + modela AI složi prodajni opis za streetwear proizvod.
export const runtime = "nodejs";

export async function POST(request: Request) {
  if (!(await isAdmin())) return NextResponse.json({ ok: false }, { status: 401 });

  const body = await request.json().catch(() => ({}));
  const brand = String(body?.brand || "").trim();
  const model = String(body?.model || "").trim();
  const price = String(body?.price || "").trim();
  if (!brand && !model) {
    return NextResponse.json({ ok: false, message: "Upiši brend ili model." }, { status: 400 });
  }

  const system = `Ti si Dresify copywriter za STREETWEAR katalog. Napiši prodajni opis proizvoda.
Vrati ISKLJUČIVO čist tekst opisa (bez JSON-a, bez markdowna, bez naslova) — 2-3 kratka odlomka odvojena praznim redom (znak novog reda).
Pravila:
- BESPRIJEKORAN, prirodan hrvatski — točna gramatika i padeži, bez čudnih fraza.
- Ton: mladenački, ulični, samouvjeren — streetwear atmosfera, ali bez pretjerivanja.
- Fokus: kvaliteta i osjećaj materijala (mekan, gust pamuk), moderan street kroj, kako se nosi (opušteno, uz tenisice, za svaki dan).
- Spomeni dostupne veličine XS, S, M i L (odrasli).
- Spomeni BESPLATNU dostavu i plaćanje pouzećem po cijeloj Hrvatskoj.
- NE tvrdi da je original/službeni proizvod brenda; opiši kao streetwear u tom stilu.
- NE izmišljaj cijenu osim ako je zadana.`;

  const promptParts = [brand && `Brend/stil: ${brand}`, model && `Model: ${model}`, price && `Cijena: ${price}€`]
    .filter(Boolean)
    .join("\n");

  try {
    const { text } = await generateText({
      model: anthropic("claude-sonnet-5"),
      system,
      prompt: promptParts,
      maxOutputTokens: 500
    });
    const description = text.trim();
    if (!description) throw new Error("empty");
    return NextResponse.json({ ok: true, description });
  } catch {
    return NextResponse.json({ ok: false, message: "AI nije uspio složiti opis, pokušaj ponovno." }, { status: 500 });
  }
}
