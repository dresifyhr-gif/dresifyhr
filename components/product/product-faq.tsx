import { ChevronDown } from "lucide-react";

import { adultSizes, getJerseySizeOptions, kidSizes, streetwearSizes, type Jersey } from "@/lib/data/jerseys";
import { repairText } from "@/lib/utils";

// Popis veličina kao raspon ("104–176") kad je neprekinuti dio kanonskog popisa,
// inače nabrojano ("110/116, 128/134").
const CANONICAL: readonly (readonly string[])[] = [kidSizes, adultSizes, streetwearSizes];
function formatSizes(list: string[]): string {
  if (list.length >= 3) {
    for (const canon of CANONICAL) {
      const i = canon.indexOf(list[0]);
      if (i >= 0 && list.every((s, k) => canon[i + k] === s)) return `${list[0]}–${list[list.length - 1]}`;
    }
  }
  return list.join(", ");
}

// Degenerirana imena iz admina (igrač = klub, prazno, "Prazan"/"Away") → "" pa se
// prikazuje samo klub ("Japan", ne "Japan Japan"). Server-strana kopija; klijentska je
// u components/site/jersey-visual.tsx.
const fold = (v: string) => v.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
export function displayIgrac(klub: string, igrac: string): string {
  const k = repairText(klub);
  const i = repairText(igrac);
  return !i.trim() || fold(i) === fold(k) || /^(prazan|away)$/i.test(i.trim()) ? "" : i;
}

// Product-specific FAQ rendered server-side (native <details>, no client JS) with
// FAQPage JSON-LD. Veličine se grade iz ISTOG popisa koji koristi izbornik veličina
// (getJerseySizeOptions/customSizes), a tekst kaže "izrađuje se u…" — nikad ne tvrdi
// da je rasprodana veličina dostupna (trenutno dostupne su u izborniku iznad).
export function ProductFaq({ product, locale = "hr" }: { product: Jersey; locale?: "hr" | "en" }) {
  const klub = repairText(product.klub);
  const igrac = displayIgrac(product.klub, product.igrac);
  const name = igrac ? `${klub} ${igrac}` : klub;
  const isTrenirka = product.category === "trenirka";
  const isStreetwear = product.category === "streetwear";
  const isKomplet = !isTrenirka && !isStreetwear && product.liga === "Komplet";
  const isLongSleeve = product.category === "dugi-rukav";
  const en = locale === "en";

  const opts = getJerseySizeOptions(product);
  const kids = formatSizes(opts.kids);
  const adults = formatSizes(opts.adults);
  const all = formatSizes([...opts.kids, ...opts.adults]);
  const hasBoth = opts.kids.length > 0 && opts.adults.length > 0;
  const noSizes = opts.kids.length === 0 && opts.adults.length === 0;

  const noun = isTrenirka ? "trenirka" : isStreetwear ? "komplet" : "dres";
  const nounEn = isTrenirka ? "tracksuit" : isStreetwear ? "set" : "jersey";

  const sizeHr = noSizes
    ? "Model dolazi u jednoj veličini."
    : isTrenirka
    ? `Trenirka (jakna + hlače) se izrađuje u veličinama ${all}; trenutno dostupne veličine vidiš iznad.`
    : isStreetwear
    ? `Model se izrađuje u veličinama ${all}; trenutno dostupne veličine vidiš iznad.`
    : isKomplet
    ? hasBoth
      ? `Komplet (dres, hlačice, lopta i kapa) se izrađuje u dječjim veličinama ${kids} i odraslim veličinama ${adults}; trenutno dostupne veličine vidiš iznad.`
      : `Komplet (dres, hlačice, lopta i kapa) se izrađuje u veličinama ${all}; trenutno dostupne veličine vidiš iznad.`
    : isLongSleeve
    ? `Model se izrađuje u veličinama ${hasBoth ? `${kids} (djeca) i ${adults} (odrasli)` : all}. Samo dres dugih rukava, bez hlačica; trenutno dostupne veličine vidiš iznad.`
    : hasBoth
    ? `Model se izrađuje u dječjim veličinama ${kids} (dres + hlačice) i odraslim veličinama ${adults} (samo dres); trenutno dostupne veličine vidiš iznad.`
    : opts.kids.length
    ? `Model se izrađuje u dječjim veličinama ${kids} (dres + hlačice); trenutno dostupne veličine vidiš iznad.`
    : `Model se izrađuje u odraslim veličinama ${adults} (samo dres); trenutno dostupne veličine vidiš iznad.`;

  const sizeEn = noSizes
    ? "This item comes in one size."
    : isTrenirka
    ? `The tracksuit (jacket + trousers) is made in sizes ${all}; sizes currently in stock are shown above.`
    : isStreetwear
    ? `Made in sizes ${all}; sizes currently in stock are shown above.`
    : isKomplet
    ? hasBoth
      ? `The kit (jersey, shorts, ball and cap) is made in kids' sizes ${kids} and adult sizes ${adults}; sizes currently in stock are shown above.`
      : `The kit (jersey, shorts, ball and cap) is made in sizes ${all}; sizes currently in stock are shown above.`
    : isLongSleeve
    ? `Made in sizes ${hasBoth ? `${kids} (youth) and ${adults} (adults)` : all}. Long-sleeve jersey only, no shorts; sizes currently in stock are shown above.`
    : hasBoth
    ? `Made in kids' sizes ${kids} (jersey + shorts) and adult sizes ${adults} (jersey only); sizes currently in stock are shown above.`
    : opts.kids.length
    ? `Made in kids' sizes ${kids} (jersey + shorts); sizes currently in stock are shown above.`
    : `Made in adult sizes ${adults} (jersey only); sizes currently in stock are shown above.`;

  const qualityHr =
    isTrenirka || isStreetwear
      ? "Izrađen je od laganog i ugodnog materijala, vjeran originalnom izgledu."
      : "Dres ima ušiveno ime i broj igrača i vjeran je originalnom izgledu, izrađen od laganog i prozračnog materijala ugodnog za nošenje.";
  const qualityEn =
    isTrenirka || isStreetwear
      ? "It is made of a light, comfortable fabric and is faithful to the original look."
      : "The jersey has a stitched player name and number, is faithful to the original look, and is made of a light, breathable, comfortable fabric.";

  const heading = en ? "Frequently asked questions" : "Česta pitanja";

  const items = en
    ? [
        {
          q: `What sizes does the ${name} come in?`,
          a: sizeEn
        },
        {
          q: "How much is shipping and how long does it take?",
          a: "Shipping is €7.00 across Croatia (free for orders from €60), dispatched in 2–5 business days via GLS."
        },
        {
          q: `How do I pay for the ${klub} ${nounEn}?`,
          a: "Payment is cash on delivery when you receive the parcel — nothing is paid upfront."
        },
        {
          q: `Can I exchange the ${nounEn} for another size?`,
          a: "Yes. If the size doesn't fit, message us on WhatsApp and we'll arrange an exchange for the right size."
        },
        {
          q: `Is the ${name} ${nounEn} good quality?`,
          a: qualityEn
        }
      ]
    : [
        {
          q: `Koje veličine ima ${name}?`,
          a: sizeHr
        },
        {
          q: "Koliko košta dostava i koliko traje?",
          a: "Dostava je 7,00 € po cijeloj Hrvatskoj (besplatna za registrirane kupce na narudžbe od 60 €), uz isporuku 2–5 radnih dana putem GLS."
        },
        {
          q: `Kako plaćam ${klub} ${noun === "trenirka" ? "trenirku" : noun}?`,
          a: "Plaćaš pouzećem (gotovinom) pri preuzimanju paketa od dostavljača — ništa ne plaćaš unaprijed."
        },
        {
          q: `Mogu li zamijeniti ${noun === "trenirka" ? "trenirku" : noun} za drugu veličinu?`,
          a: "Da. Ako ti veličina ne odgovara, javi nam se na WhatsApp i dogovorimo zamjenu za odgovarajuću veličinu."
        },
        {
          q: `Je li ${name} ${noun} ${noun === "trenirka" ? "kvalitetna" : "kvalitetan"}?`,
          a: qualityHr
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
