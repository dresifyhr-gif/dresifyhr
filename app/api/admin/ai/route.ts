import { anthropic } from "@ai-sdk/anthropic";
import { streamText, tool, stepCountIs, jsonSchema } from "ai";

import { isAdmin } from "@/lib/admin-auth";
import { buildBusinessContext } from "@/lib/admin-ai-context";
import { getOrderReference } from "@/lib/orders";
import { prisma } from "@/lib/prisma";
import { formatCroatianName } from "@/lib/utils";

export const runtime = "nodejs";

const eur = (n: number) => `${(n ?? 0).toFixed(2).replace(".", ",")} €`;
const digits = (s: string) => String(s || "").replace(/\D/g, "");
const statusHr: Record<string, string> = {
  new: "čeka slanje",
  shipped: "poslano",
  done: "gotovo",
  returned: "vraćeno",
  cancelled: "otkazano"
};

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

MOŽEŠ RJEŠAVATI NARUDŽBE preko alata:
- Kad korisnik kaže da je netko OTKAZAO narudžbu (da se ne pošalje), prvo pozovi alat "searchOrders" da nađeš narudžbu (po imenu i/ili broju mobitela).
- Ako ima VIŠE podudaranja, NE otkazuj — nabroji ih (ime, datum, iznos) i pitaj koju misli.
- Ako je JEDNO jasno podudaranje, pozovi "cancelOrder" s tim ID-em.
- Nakon otkazivanja potvrdi: ime kupca, iznos i referencu, i napomeni da se neće poslati i da je nestala iz reda za slanje.
- Ako je narudžba VEĆ POSLANA, to nije otkazivanje nego vraćena pošiljka — reci korisniku da to označi kao "vraćeno".
- NIKAD ne otkazuj narudžbu bez jasnog jednog podudaranja i ne izmišljaj ID-eve.

=== STVARNI PODACI (trenutno stanje) ===
${context}`;

  const tools = {
    searchOrders: tool({
      description: "Pronađi narudžbe po imenu kupca i/ili broju mobitela. Vrati listu s ID-em, imenom, brojem, datumom, iznosom i statusom.",
      inputSchema: jsonSchema<{ query: string }>({
        type: "object",
        properties: { query: { type: "string", description: "Ime i/ili prezime kupca ili broj mobitela" } },
        required: ["query"]
      }),
      execute: async ({ query }) => {
        const q = String(query || "").trim();
        const d = digits(q);
        const orders = await prisma.order.findMany({
          where: {
            OR: [
              { customerName: { contains: q, mode: "insensitive" } },
              ...(d.length >= 6 ? [{ phone: { contains: d } }] : [])
            ]
          },
          orderBy: { createdAt: "desc" },
          take: 8,
          select: { id: true, customerName: true, phone: true, createdAt: true, total: true, itemCount: true, status: true, reference: true }
        });
        return {
          count: orders.length,
          orders: orders.map((o) => ({
            id: o.id,
            ime: formatCroatianName(o.customerName),
            mobitel: o.phone || "",
            datum: o.createdAt.toLocaleDateString("hr-HR"),
            referenca: o.reference || getOrderReference(o.createdAt.toISOString()),
            iznos: eur(o.total),
            artikala: o.itemCount,
            status: statusHr[o.status] || o.status
          }))
        };
      }
    }),
    cancelOrder: tool({
      description: "Označi narudžbu kao OTKAZANU po ID-u (dobivenom iz searchOrders). Time izlazi iz reda za slanje i neće se poslati.",
      inputSchema: jsonSchema<{ orderId: string }>({
        type: "object",
        properties: { orderId: { type: "string", description: "ID narudžbe iz searchOrders" } },
        required: ["orderId"]
      }),
      execute: async ({ orderId }) => {
        const order = await prisma.order.findUnique({
          where: { id: orderId },
          select: { id: true, customerName: true, total: true, createdAt: true, reference: true, status: true }
        });
        if (!order) return { ok: false, error: "Narudžba s tim ID-em ne postoji." };
        if (order.status === "cancelled") return { ok: false, error: "Narudžba je već otkazana." };
        await prisma.order.update({ where: { id: orderId }, data: { status: "cancelled" } });
        return {
          ok: true,
          ime: formatCroatianName(order.customerName),
          iznos: eur(order.total),
          referenca: order.reference || getOrderReference(order.createdAt.toISOString())
        };
      }
    })
  };

  const result = streamText({
    model: anthropic("claude-haiku-4-5-20251001"),
    system,
    messages: (messages as { role: "user" | "assistant"; content: string }[]).slice(-8),
    tools,
    stopWhen: stepCountIs(5),
    maxOutputTokens: 700
  });

  return result.toTextStreamResponse();
}
