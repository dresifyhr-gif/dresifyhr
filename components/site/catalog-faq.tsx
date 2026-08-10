import { ChevronDown } from "lucide-react";

// Katalog-level FAQ za /dresovi s FAQPage JSON-LD. Hvata komercijalne upite
// (jeftini / dječji / veličine / dostava / kvaliteta) i može dobiti FAQ rich
// snippet u Googleu → veći CTR. Server-side, native <details>, bez client JS.
export function CatalogFaq({ locale = "hr" }: { locale?: "hr" | "en" }) {
  const en = locale === "en";
  const heading = en ? "Frequently asked questions" : "Česta pitanja o dresovima";

  const items = en
    ? [
        { q: "How much do football jerseys cost?", a: "Every jersey is a fixed €20 and full kits are €40 — the same price for all clubs, players and national teams, with no hidden costs." },
        { q: "Do you have cheap football jerseys?", a: "Yes — all our jerseys are €20, among the most affordable in Croatia, with the same fixed price for kids' and adult sizes." },
        { q: "Do you have kids' football jerseys?", a: "Yes, kids' sizes 104–176 (jersey + shorts) for all clubs and national teams, at the same €20 price." },
        { q: "What sizes do you offer?", a: "Kids' 104–176 and adult S–XL (national teams S–XXL)." },
        { q: "How long is delivery and how do I pay?", a: "Delivery is 2–5 business days across Croatia and you pay cash on delivery — €7 shipping, free from €60." },
        { q: "Are the jerseys good quality?", a: "Stitched player name and number, faithful to the original look, made of a light, breathable fabric." }
      ]
    : [
        { q: "Koliko koštaju nogometni dresovi?", a: "Svaki dres je fiksno 20 €, a kompleti 40 € — ista cijena za sve klubove, igrače i reprezentacije, bez skrivenih troškova." },
        { q: "Imate li jeftine nogometne dresove?", a: "Da — svi naši dresovi su 20 €, što je među najpovoljnijima u Hrvatskoj, uz istu fiksnu cijenu za dječje i odrasle veličine." },
        { q: "Imate li dječje nogometne dresove?", a: "Da, dječje veličine 104–176 (dres + hlačice) za sve klubove i reprezentacije, po istoj cijeni od 20 €." },
        { q: "Koje veličine dresova nudite?", a: "Dječje 104–176 i odrasle S–XL (reprezentacije S–XXL)." },
        { q: "Koliko traje dostava i kako plaćam?", a: "Dostava je 2–5 radnih dana po cijeloj Hrvatskoj, a plaćaš pouzećem pri preuzimanju — dostava 7 €, besplatna od 60 €." },
        { q: "Jesu li dresovi kvalitetni?", a: "Ušiveno ime i broj igrača, vjerni originalnom izgledu, izrađeni od laganog i prozračnog materijala." }
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
      <h2 className="font-heading text-2xl uppercase leading-none text-white sm:text-3xl">{heading}</h2>
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
