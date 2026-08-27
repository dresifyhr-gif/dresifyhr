import type { Metadata } from "next";
import Link from "next/link";
import { Truck, Banknote, RotateCcw, MessageCircle, Clock, MapPin, Mail } from "lucide-react";

import { Breadcrumbs } from "@/components/site/breadcrumbs";
import { buildBreadcrumbSchema, buildMetadata } from "@/lib/seo";
import { getSettings } from "@/lib/settings";

export const metadata: Metadata = buildMetadata({
  title: "Dostava i zamjena",
  description:
    "Sve o dostavi i zamjeni veličine: GLS dostava 2–5 radnih dana, plaćanje pouzećem, besplatna dostava preko 60 €, jednostavna zamjena veličine.",
  path: "/dostava-i-povrat"
});

const deliveryItems = [
  {
    icon: Truck,
    title: "Kako šaljemo",
    text: "Sve narudžbe šaljemo putem GLS kurirske službe na svaku adresu u Hrvatskoj."
  },
  {
    icon: Clock,
    title: "Rok isporuke",
    text: "Narudžbe potvrđene radnim danom u pravilu šaljemo već sljedeći radni dan. Paket stiže za 2–5 radnih dana od potvrde narudžbe."
  },
  {
    icon: Mail,
    title: "Praćenje paketa",
    text: "Čim pošaljemo paket, automatski ti na email stigne broj za praćenje (tracking) i link — pratiš gdje ti je paket u svakom trenutku."
  },
  {
    icon: Banknote,
    title: "Plaćanje",
    text: "Plaćaš pouzećem (gotovinom) pri preuzimanju paketa. Ništa ne plaćaš unaprijed."
  },
  {
    icon: MapPin,
    title: "Cijena dostave",
    text: "Dostava je 7,00 € po cijeloj Hrvatskoj. Za narudžbe preko 60 € dostava je besplatna."
  }
];

export default async function DeliveryReturnsPage() {
  const whatsappUrl = `https://wa.me/${(await getSettings()).whatsappNumber}`;
  const breadcrumbSchema = buildBreadcrumbSchema([
    { name: "Početna", path: "/" },
    { name: "Dostava i zamjena", path: "/dostava-i-povrat" }
  ]);

  return (
    <section className="section-pad">
      <div className="page-shell max-w-4xl">
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }}
        />

        <Breadcrumbs
          items={[
            { label: "Početna", href: "/" },
            { label: "Dostava i zamjena" }
          ]}
        />

        <h1 className="mt-6 font-heading text-[clamp(2.6rem,7vw,4.4rem)] uppercase leading-[0.95] tracking-[0.04em] text-white">
          Dostava i zamjena
        </h1>
        <p className="mt-4 max-w-2xl text-base leading-7 text-white/60">
          Brza dostava po cijeloj Hrvatskoj, plaćanje pri preuzimanju i jednostavna zamjena ako veličina ne odgovara.
        </p>

        {/* Dostava */}
        <div className="mt-10 grid gap-4 sm:grid-cols-2">
          {deliveryItems.map((item) => (
            <div key={item.title} className="panel p-6">
              <div className="inline-flex h-11 w-11 items-center justify-center rounded-[8px] border border-white/10 bg-accent/10 text-accent">
                <item.icon className="h-5 w-5" />
              </div>
              <h2 className="mt-4 font-heading text-xl uppercase tracking-[0.04em] text-white">{item.title}</h2>
              <p className="mt-2 text-sm leading-6 text-white/60">{item.text}</p>
            </div>
          ))}
        </div>

        {/* Povrat i zamjena */}
        <div className="mt-6 panel p-6 sm:p-8">
          <div className="inline-flex h-11 w-11 items-center justify-center rounded-[8px] border border-white/10 bg-accent/10 text-accent">
            <RotateCcw className="h-5 w-5" />
          </div>
          <h2 className="mt-4 font-heading text-2xl uppercase tracking-[0.04em] text-white">Zamjena veličine</h2>
          <ul className="mt-4 space-y-3 text-sm leading-6 text-white/65">
            <li>
              <span className="font-semibold text-white">Ne odgovara veličina?</span> Javi nam se i dogovorimo zamjenu za drugu veličinu — bez komplikacija.
            </li>
            <li>
              <span className="font-semibold text-white">Rok:</span> za zamjenu veličine javi nam se unutar 14 dana od primitka paketa.
            </li>
            <li>
              <span className="font-semibold text-white">Uvjet:</span> dres mora biti nenošen i neoštećen, u originalnom stanju.
            </li>
            <li>
              <span className="font-semibold text-white">Kako:</span> najbrže preko WhatsAppa — dogovorimo sve u par poruka.
            </li>
          </ul>

          <Link
            href={whatsappUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="button-primary mt-6 inline-flex min-h-[52px] items-center justify-center gap-2 px-7"
          >
            <MessageCircle className="h-4 w-4" />
            Javi nam se na WhatsApp
          </Link>
        </div>
      </div>
    </section>
  );
}
