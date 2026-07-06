import { NextResponse } from "next/server";
import { generateText } from "ai";
import { anthropic } from "@ai-sdk/anthropic";

import { isAdmin } from "@/lib/admin-auth";

export const runtime = "nodejs";

// Iz naziva dresa AI složi klub, igrača, ligu i opis za novi proizvod.
export async function POST(request: Request) {
  if (!(await isAdmin())) return NextResponse.json({ ok: false }, { status: 401 });

  const body = await request.json().catch(() => ({}));
  const name = String(body?.name || "").trim();
  if (!name) return NextResponse.json({ ok: false, message: "Upiši naziv." }, { status: 400 });

  const system = `Ti si Dresify asistent za katalog nogometnih dresova. Iz korisnikovog naziva složi podatke za novi proizvod.
Vrati ISKLJUČIVO ispravan JSON (bez teksta okolo, bez markdowna) u ovom obliku:
{"klub":"...","igrac":"...","liga":"...","description":"odlomak1\\nodlomak2"}
Pravila:
- "klub": klub ili reprezentacija (npr. "Hrvatska", "Real Madrid").
- "igrac": igrač + broj + sezona/varijanta ako se da iščitati (npr. "Modrić nr10 — 2026").
- "liga": TOČNO jedna od: Reprezentacija, La Liga, Premier Liga, Serie A, Bundesliga, Ligue 1, Saudi Pro, Brazil, MLS, Komplet.
- "description": 2-3 kratka prodajna odlomka na BESPRIJEKORNOM hrvatskom (kvaliteta materijala, dostupne veličine za djecu i odrasle, dostava pouzećem po Hrvatskoj). Odlomci odvojeni s \\n. Bez izmišljanja cijene.`;

  try {
    const { text } = await generateText({
      model: anthropic("claude-sonnet-5"),
      system,
      prompt: `Naziv dresa: ${name}`,
      maxOutputTokens: 600
    });
    const jsonStr = text.slice(text.indexOf("{"), text.lastIndexOf("}") + 1);
    const data = JSON.parse(jsonStr);
    return NextResponse.json({
      ok: true,
      klub: String(data.klub || ""),
      igrac: String(data.igrac || ""),
      liga: String(data.liga || "Reprezentacija"),
      description: String(data.description || "")
    });
  } catch {
    return NextResponse.json({ ok: false, message: "AI nije uspio složiti proizvod, pokušaj ponovno." }, { status: 500 });
  }
}
