"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";

import { SectionHeading } from "@/components/site/section-heading";
import { useLanguage } from "@/contexts/language-context";

const FAQ_HR = [
  {
    q: "Kako plaćam narudžbu?",
    a: "Plaćanje je pouzećem (gotovinom) pri preuzimanju paketa od dostavljača. Ne plaćaš ništa unaprijed — platiš tek kad ti paket stigne na vrata.",
  },
  {
    q: "Koliko košta i traje dostava?",
    a: "Dostava je 7,00 € po cijeloj Hrvatskoj putem GLS kurirske službe. Rok isporuke je 2–5 radnih dana od potvrde narudžbe.",
  },
  {
    q: "Dolaze li dječji dresovi s hlačicama?",
    a: "Da. Dječja varijanta dolazi kao dres + hlačice, dok je varijanta za odrasle samo dres. Kompleti (40 €) uz to uključuju i loptu i kapu.",
  },
  {
    q: "Kako odabrati pravu veličinu?",
    a: "Na svakom proizvodu klikni 'Vodič za veličine' za tablicu s mjerama (dječje 116–176 po visini, odrasle S–XXL po grudima). Ako si između dvije veličine, uzmi veću — ili nam pošalji visinu na WhatsApp i predložit ćemo.",
  },
  {
    q: "Mogu li vratiti ili zamijeniti dres?",
    a: "Da, povrat i zamjena su jednostavni. Ako veličina ne odgovara ili nisi zadovoljan, javi nam se na WhatsApp i dogovorimo zamjenu ili povrat.",
  },
  {
    q: "Jesu li dresovi kvalitetni?",
    a: "Dresovi su vrhunske kvalitete s ušivenim imenom i brojem igrača, vjerni originalnom izgledu. Materijal je lagan i prozračan, ugodan za nošenje.",
  },
  {
    q: "Jesu li slike na stranici stvarne?",
    a: "Da — sve fotografije prikazuju naše stvarne proizvode. Ono što vidiš na slici je ono što ćeš i dobiti.",
  },
  {
    q: "Kako naručujem?",
    a: "Odaberi veličinu, dodaj u košaricu i ispuni narudžbu — ili naruči direktno preko WhatsAppa. Odgovaramo u roku od sat vremena.",
  },
];

const FAQ_EN = [
  {
    q: "How do I pay for my order?",
    a: "Payment is cash on delivery when you receive the package from the courier. You pay nothing upfront — only when the parcel arrives at your door.",
  },
  {
    q: "How much is shipping and how long does it take?",
    a: "Shipping is €7.00 across Croatia via GLS courier. Delivery takes 2–5 business days from order confirmation.",
  },
  {
    q: "Do kids' jerseys come with shorts?",
    a: "Yes. The kids' version comes as jersey + shorts, while the adult version is the jersey only. Full kits (€40) also include a ball and a cap.",
  },
  {
    q: "How do I choose the right size?",
    a: "On every product click 'Size guide' for a measurement table (kids 116–176 by height, adults S–XXL by chest). If you're between sizes, go up — or send us your height on WhatsApp and we'll advise.",
  },
  {
    q: "Can I return or exchange a jersey?",
    a: "Yes, returns and exchanges are simple. If the size doesn't fit or you're not satisfied, message us on WhatsApp and we'll arrange an exchange or return.",
  },
  {
    q: "Are the jerseys good quality?",
    a: "The jerseys are high quality with stitched player name and number, faithful to the original look. The fabric is light and breathable.",
  },
  {
    q: "Are the photos on the site real?",
    a: "Yes — all photos show our actual products. What you see in the photo is what you'll get.",
  },
  {
    q: "How do I order?",
    a: "Pick a size, add to cart and complete the order — or order directly via WhatsApp. We reply within an hour.",
  },
];

export function FaqSection() {
  const { locale } = useLanguage();
  const items = locale === "en" ? FAQ_EN : FAQ_HR;
  const [open, setOpen] = useState<number | null>(0);

  const schema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: items.map((item) => ({
      "@type": "Question",
      name: item.q,
      acceptedAnswer: { "@type": "Answer", text: item.a },
    })),
  };

  return (
    <section className="section-pad bg-[#0a0a0a]">
      <div className="page-shell">
        <SectionHeading
          kicker={locale === "en" ? "FAQ" : "Česta pitanja"}
          title={locale === "en" ? "Frequently asked questions" : "Često postavljana pitanja"}
          description={
            locale === "en"
              ? "Everything you need to know before ordering."
              : "Sve što trebaš znati prije narudžbe."
          }
        />

        <div className="mx-auto mt-8 max-w-3xl divide-y divide-white/10 border-y border-white/10">
          {items.map((item, i) => {
            const isOpen = open === i;
            return (
              <div key={item.q}>
                <button
                  type="button"
                  onClick={() => setOpen(isOpen ? null : i)}
                  className="flex w-full items-center justify-between gap-4 py-5 text-left"
                  aria-expanded={isOpen}
                >
                  <span className="text-base font-semibold text-white sm:text-lg">{item.q}</span>
                  <ChevronDown
                    className={`h-5 w-5 shrink-0 text-accent transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`}
                  />
                </button>
                <div
                  className={`grid transition-all duration-200 ease-out ${
                    isOpen ? "grid-rows-[1fr] pb-5" : "grid-rows-[0fr]"
                  }`}
                >
                  <div className="overflow-hidden">
                    <p className="text-sm leading-6 text-white/60 sm:text-[15px]">{item.a}</p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
      />
    </section>
  );
}
