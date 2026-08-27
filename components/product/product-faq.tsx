import { ChevronDown } from "lucide-react";

import { isNationalTeam, type Jersey } from "@/lib/data/jerseys";
import { repairText } from "@/lib/utils";

// Product-specific FAQ rendered server-side (native <details>, no client JS) with
// FAQPage JSON-LD. Questions reference the actual club/player and exact sizes
// (S–XL for clubs, S–XXL for national teams) so each page is unique, not duplicate.
export function ProductFaq({ product, locale = "hr" }: { product: Jersey; locale?: "hr" | "en" }) {
  const klub = repairText(product.klub);
  const igrac = repairText(product.igrac);
  const adultRange = isNationalTeam(product) ? "S–XXL" : "S–XL";
  const isKomplet = product.liga === "Komplet";
  const en = locale === "en";

  const heading = en ? "Frequently asked questions" : "Česta pitanja";

  const items = en
    ? [
        {
          q: `What sizes does the ${klub} ${igrac} come in?`,
          a: isKomplet
            ? `The kit is available in kids' sizes 104–176 and adult sizes ${adultRange}, and includes jersey, shorts, ball and cap.`
            : `Available in kids' sizes 104–176 (jersey + shorts) and adult sizes ${adultRange} (jersey only).`
        },
        {
          q: "How much is shipping and how long does it take?",
          a: "Shipping is €7.00 across Croatia (free for orders from €60), dispatched in 2–5 business days via GLS."
        },
        {
          q: `How do I pay for the ${klub} jersey?`,
          a: "Payment is cash on delivery when you receive the parcel — nothing is paid upfront."
        },
        {
          q: "Can I return or exchange a jersey?",
          a: "Yes. If the size doesn't fit or you're not satisfied, message us on WhatsApp and we'll arrange an exchange or return."
        },
        {
          q: `Is the ${klub} ${igrac} jersey good quality?`,
          a: "The jersey has a stitched player name and number, is faithful to the original look, and is made of a light, breathable, comfortable fabric."
        }
      ]
    : [
        {
          q: `Koje veličine ima ${klub} ${igrac}?`,
          a: isKomplet
            ? `Komplet je dostupan u dječjim veličinama 104–176 i odraslim veličinama ${adultRange}, a uključuje dres, hlačice, loptu i kapu.`
            : `Dostupan je u dječjim veličinama 104–176 (dres + hlačice) i odraslim veličinama ${adultRange} (samo dres).`
        },
        {
          q: "Koliko košta dostava i koliko traje?",
          a: "Dostava je 7,00 € po cijeloj Hrvatskoj (besplatna za narudžbe od 60 €), uz isporuku 2–5 radnih dana putem GLS."
        },
        {
          q: `Kako plaćam ${klub} dres?`,
          a: "Plaćaš pouzećem (gotovinom) pri preuzimanju paketa od dostavljača — ništa ne plaćaš unaprijed."
        },
        {
          q: "Mogu li zamijeniti dres za drugu veličinu?",
          a: "Da. Ako ti veličina ne odgovara, javi nam se na WhatsApp i dogovorimo zamjenu za odgovarajuću veličinu."
        },
        {
          q: `Je li ${klub} ${igrac} dres kvalitetan?`,
          a: "Dres ima ušiveno ime i broj igrača i vjeran je originalnom izgledu, izrađen od laganog i prozračnog materijala ugodnog za nošenje."
        }
      ];

  const schema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: items.map((it) => ({
      "@type": "Question",
      name: it.q,
      acceptedAnswer: { "@type": "Answer", text: it.a }
    }))
  };

  return (
    <section className="mt-10 max-w-3xl">
      <h2 className="font-heading text-3xl uppercase leading-none text-white sm:text-4xl">{heading}</h2>
      <div className="mt-5 divide-y divide-white/10 border-y border-white/10">
        {items.map((it) => (
          <details key={it.q} className="group py-4">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-base font-semibold text-white">
              {it.q}
              <ChevronDown className="h-5 w-5 shrink-0 text-accent transition-transform duration-200 group-open:rotate-180" />
            </summary>
            <p className="mt-3 text-sm leading-7 text-white/60 sm:text-[15px]">{it.a}</p>
          </details>
        ))}
      </div>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }} />
    </section>
  );
}
