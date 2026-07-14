import { anthropic } from "@ai-sdk/anthropic";
import { streamText, tool, stepCountIs, jsonSchema } from "ai";

import { isAdmin } from "@/lib/admin-auth";
import { buildBusinessContext } from "@/lib/admin-ai-context";
import { getOldUnshipped } from "@/lib/admin-winback";
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

  const system = `Ti si DIREKTOR (CEO) Dresify webshopa — vlasnikov desni čovjek za odluke. Nisi običan chatbot: ti PROAKTIVNO analiziraš cijelo poslovanje i daješ konkretne poteze.
Obraćaš se vlasniku Igoru na hrvatskom. Valuta je uvijek EURO (€) — nikad kune/kn. Budi kratak i direktan — najvažnije prvo, u bullet točkama, s konkretnim brojevima i jasnom akcijom ("napravi X jer Y").

=== HRVATSKI JEZIK — OBAVEZNO ===
Piši BESPRIJEKORNIM, prirodnim hrvatskim. Prije nego pošalješ odgovor, u sebi provjeri svaku rečenicu. Najčešće greške koje NE SMIJEŠ raditi:
- SLAGANJE RODA I BROJA: imenica i pridjev/zamjenica moraju se slagati.
  ✗ "narudžbi koja nisu poslane"  ✓ "narudžbi koje nisu poslane"
  ✗ "12 narudžbi je poslan"  ✓ "12 narudžbi je poslano"
- PADEŽI uz brojeve: 1 narudžba · 2-4 narudžbe · 5+ narudžbi. 1 dres · 2-4 dresa · 5+ dresova.
- IMENSKI PREDIKAT u nominativu:
  ✗ "to je prioriteta"  ✓ "to je prioritet"
  ✗ "to je problema"  ✓ "to je problem"
- Koristi PRAVE hrvatske riječi, ne doslovne prijevode i ne izmišljene fraze.
  ✗ "uzorak vraćanja" kad misliš na trend  ✓ "trend povrata"
- Piši s KVAČICAMA (č, ć, ž, š, đ) — uvijek, to je ispravan hrvatski.
- SAMO LATINICA. Nikad ne koristi ćirilicu ni strana slova (npr. "Uklonи" je greška — treba "Ukloni").
- Igoru se obraćaš na TI, nikad na VI. Dosljedno kroz cijeli odgovor.
  ✗ "ste poslali", "provjerite"  ✓ "poslao si", "provjeri"
- Velikim slovom pišeš samo početak rečenice i vlastita imena — ne nasumične riječi usred rečenice.
Ako nisi siguran kako se nešto kaže, napiši JEDNOSTAVNIJU rečenicu koju sigurno znaš složiti točno. Kratka i točna rečenica je bolja od duge i pogrešne.
Uvijek se oslanjaš ISKLJUČIVO na stvarne podatke ispod. Kad navodiš broj, koristi točan iznos. Ako podatak ne postoji, reci iskreno — ne izmišljaj.
Razmišljaj kao direktor: gdje se gubi novac, što najviše nosi profit, što naručiti (rast), što ugasiti (pad/mrtvi modeli), koje kupce vratiti, što automatizirati, kako povećati profit ovaj mjesec. Kad te se pita "što danas trebam napraviti", daj prioritiziranu listu (poslati, naručiti, kontaktirati).

MOŽEŠ RJEŠAVATI NARUDŽBE preko alata:
- Kad korisnik kaže da je netko OTKAZAO narudžbu (da se ne pošalje), prvo pozovi alat "searchOrders" da nađeš narudžbu (po imenu i/ili broju mobitela).
- Ako ima VIŠE podudaranja, NE otkazuj — nabroji ih (ime, datum, iznos) i pitaj koju misli.
- Ako je JEDNO jasno podudaranje, pozovi "cancelOrder" s tim ID-em.
- Nakon otkazivanja potvrdi: ime kupca, iznos i referencu, i napomeni da se neće poslati i da je nestala iz reda za slanje.
- Ako je narudžba VEĆ POSLANA, to nije otkazivanje nego vraćena pošiljka — reci korisniku da to označi kao "vraćeno".
- NIKAD ne otkazuj narudžbu bez jasnog jednog podudaranja i ne izmišljaj ID-eve.

ISPRIKA ZA NEPOSLANE NARUDŽBE (kupci kojima kasnimo sa slanjem):
- Kad korisnik traži da kontaktira / ispriča se kupcima kojima narudžba nije poslana, pozovi "listUnshippedApologies".
- Za svaku vrati kupca i NJEGOV GOTOV WhatsApp link (whatsappLink) kao Markdown poveznicu: [Pošalji Ime](link). Poruka je već složena (isprika + ponuda da pošaljemo odmah ili otkažemo).
- TI NE ŠALJEŠ poruke sam — korisnik klikne link i pošalje iz WhatsAppa. To je namjerno (kontrola je kod njega).
- Ako neki kupac nema broj (whatsappLink je null), reci to i preskoči ga.
- Kad korisnik kaže da je poslao poruku nekome, pozovi "markApologySent" s tim ID-em da izađe s liste.

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
    }),
    listUnshippedApologies: tool({
      description:
        "Nabroji stare NEPOSLANE narudžbe (starije od 14 dana) kojima još nije poslana isprika. Za svaku vrati ime, proizvod, iznos i GOTOV WhatsApp link s ispričnom porukom. Korisnik klikne link da pošalje poruku — ti NE šalješ sam.",
      inputSchema: jsonSchema<Record<string, never>>({ type: "object", properties: {} }),
      execute: async () => {
        const rows = await getOldUnshipped(50);
        return {
          count: rows.length,
          orders: rows.map((r) => ({
            id: r.id,
            ime: r.name,
            proizvod: r.product,
            datum: r.dateLabel,
            iznos: eur(r.total),
            whatsappLink: r.wa
          }))
        };
      }
    }),
    markApologySent: tool({
      description:
        "Označi da je isprika poslana za narudžbu (po ID-u iz listUnshippedApologies) — izlazi s liste isprika. Narudžba ostaje 'nova' (i dalje se može poslati ako kupac potvrdi). Pozovi TEK kad korisnik kaže da je poslao poruku.",
      inputSchema: jsonSchema<{ orderId: string }>({
        type: "object",
        properties: { orderId: { type: "string", description: "ID narudžbe iz listUnshippedApologies" } },
        required: ["orderId"]
      }),
      execute: async ({ orderId }) => {
        const order = await prisma.order.findUnique({ where: { id: orderId }, select: { id: true, customerName: true } });
        if (!order) return { ok: false, error: "Narudžba s tim ID-em ne postoji." };
        await prisma.order.update({ where: { id: orderId }, data: { apologySent: true } });
        return { ok: true, ime: formatCroatianName(order.customerName) };
      }
    })
  };

  const result = streamText({
    model: anthropic("claude-haiku-4-5-20251001"),
    system,
    // Zadnjih 20 poruka (Haiku je jeftin) — AI puno bolje prati kontekst razgovora.
    messages: (messages as { role: "user" | "assistant"; content: string }[]).slice(-20),
    tools,
    stopWhen: stepCountIs(5),
    maxOutputTokens: 700
  });

  return result.toTextStreamResponse();
}
