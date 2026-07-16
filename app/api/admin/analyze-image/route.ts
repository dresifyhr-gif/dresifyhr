import { NextResponse } from "next/server";
import { generateText } from "ai";
import { anthropic } from "@ai-sdk/anthropic";

import { isAdmin } from "@/lib/admin-auth";

export const runtime = "nodejs";
export const maxDuration = 60;

const LIGE = ["Reprezentacija", "La Liga", "Premier Liga", "Serie A", "Bundesliga", "Ligue 1", "Saudi Pro", "Brazil", "MLS", "Komplet"];

// Iz SLIKE proizvoda AI pročita sve podatke i popuni formu za novi proizvod.
export async function POST(request: Request) {
  if (!(await isAdmin())) return NextResponse.json({ ok: false }, { status: 401 });

  const body = await request.json().catch(() => ({}));
  const imageUrl = String(body?.imageUrl || "").trim();
  if (!imageUrl || !/^https?:\/\//.test(imageUrl)) {
    return NextResponse.json({ ok: false, message: "Nema slike." }, { status: 400 });
  }

  const system = `Ti si Dresify asistent koji GLEDA sliku proizvoda i iz nje iščita sve podatke za katalog.
Vrati ISKLJUČIVO ispravan JSON (bez teksta okolo, bez markdowna):
{"category":"dres|streetwear","klub":"...","igrac":"...","liga":"...","retro":true|false,"badge":"novo|bestseller|","description":"odlomak1\\n\\nodlomak2","confidence":"high|medium|low","seen":"kratko što vidiš"}

KAKO ČITATI SLIKU:
- Pogledaj GRB/logo, ime i BROJ igrača na leđima, boje, uzorak, proizvođača (Nike, Adidas, Kelme, Puma...) i sponzore.
- Ako je nogometni dres → "category":"dres". Ako je ulična majica/hlačice/komplet bez kluba → "category":"streetwear".

POLJA:
- "klub": klub ili reprezentacija na hrvatskom (npr. "Real Madrid", "Hrvatska", "BiH", "Španjolska", "Francuska"). Za streetwear: brend/stil.
- "igrac": ime igrača + broj + varijanta koju vidiš, u formatu "Prezime nrBROJ — varijanta".
  Primjeri: "Modrić nr10 — plavi 2026", "Džeko nr9 — SP 2026", "Yamal nr10 — crveni".
  Koristi hrvatski pravopis imena (Modrić, Džeko, Šeško, Perišić, Mbappé).
  Ako broja nema, izostavi "nrBROJ". Varijantu opiši po boji/izdanju koje VIDIŠ.
- "liga": TOČNO jedna od: ${LIGE.join(", ")}. Reprezentacije → "Reprezentacija".
- "retro": true samo ako je očito stari/retro model.
- "badge": "novo" za nove modele, inače "".
- "description": 2-3 kratka prodajna odlomka na BESPRIJEKORNOM hrvatskom (izgled i boje koje vidiš, kome odgovara, kvaliteta, dostupne veličine za djecu i odrasle, dostava pouzećem po Hrvatskoj). Bez izmišljanja cijene.
- "confidence": koliko si siguran u klub/igrača.
- "seen": jedna kratka rečenica što vidiš na slici (za provjeru).

VAŽNO: NE IZMIŠLJAJ. Ako ime igrača ili broj ne možeš pročitati, ostavi prazno i stavi "confidence":"low". Bolje prazno nego pogrešno.`;

  try {
    const { text } = await generateText({
      model: anthropic("claude-sonnet-5"),
      system,
      messages: [
        {
          role: "user",
          content: [
            { type: "text", text: "Pročitaj ovu sliku proizvoda i vrati JSON." },
            { type: "image", image: new URL(imageUrl) }
          ]
        }
      ],
      maxOutputTokens: 900
    });

    const jsonStr = text.slice(text.indexOf("{"), text.lastIndexOf("}") + 1);
    const d = JSON.parse(jsonStr);
    const liga = LIGE.includes(String(d.liga)) ? String(d.liga) : "Reprezentacija";
    const category = d.category === "streetwear" ? "streetwear" : "dres";

    return NextResponse.json({
      ok: true,
      category,
      klub: String(d.klub || ""),
      igrac: String(d.igrac || ""),
      liga,
      retro: d.retro === true,
      badge: d.badge === "bestseller" || d.badge === "novo" ? d.badge : "",
      description: String(d.description || ""),
      confidence: ["high", "medium", "low"].includes(String(d.confidence)) ? String(d.confidence) : "medium",
      seen: String(d.seen || "")
    });
  } catch {
    return NextResponse.json({ ok: false, message: "AI nije uspio pročitati sliku, pokušaj ponovno ili upiši ručno." }, { status: 500 });
  }
}
