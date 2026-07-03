import { anthropic } from "@ai-sdk/anthropic";
import { streamText } from "ai";

import { isAdmin } from "@/lib/admin-auth";
import { buildBusinessContext } from "@/lib/admin-ai-context";

export const runtime = "nodejs";

export async function POST(request: Request) {
  if (!(await isAdmin())) {
    return new Response("Unauthorized", { status: 401 });
  }

  const { messages } = await request.json();
  const context = await buildBusinessContext();

  const system = `Ti si Dresify poslovni asistent za VLASNIKA shopa (interni alat, nije za kupce).
Odgovaraš na hrvatskom, kratko, jasno i konkretno, ISKLJUČIVO na temelju stvarnih podataka ispod.
Kad navodiš broj, koristi točan iznos iz podataka. Ako podatak ne postoji, reci iskreno — ne izmišljaj.
Smiješ dati i pametne prijedloge (akcija, što objaviti, što naručiti, koje kupce vratiti) na temelju podataka.

=== STVARNI PODACI (trenutno stanje) ===
${context}`;

  const result = streamText({
    model: anthropic("claude-haiku-4-5-20251001"),
    system,
    messages: (messages as { role: "user" | "assistant"; content: string }[]).slice(-8),
    maxOutputTokens: 600
  });

  return result.toTextStreamResponse();
}
