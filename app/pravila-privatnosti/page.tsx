import type { Metadata } from "next";

import { Breadcrumbs } from "@/components/site/breadcrumbs";
import { buildBreadcrumbSchema, buildMetadata } from "@/lib/seo";
import { getSettings } from "@/lib/settings";

export const metadata: Metadata = buildMetadata({
  title: "Pravila privatnosti i kolačići",
  description:
    "Kako DRESIFY prikuplja i koristi podatke, koje kolačiće koristimo (analitika i marketing) i kako upravljati privolom.",
  path: "/pravila-privatnosti"
});

export const dynamic = "force-dynamic";

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-8">
      <h2 className="font-heading text-2xl uppercase tracking-[0.03em] text-white">{title}</h2>
      <div className="mt-3 space-y-3 text-sm leading-6 text-white/70">{children}</div>
    </section>
  );
}

export default async function PrivacyPage() {
  const s = await getSettings();
  const email = s.contactEmail;

  return (
    <section className="section-pad">
      <div className="page-shell max-w-2xl">
        <Breadcrumbs items={[{ label: "Početna", href: "/" }, { label: "Pravila privatnosti" }]} />
        <h1 className="mt-4 font-heading text-[clamp(2rem,5vw,3rem)] uppercase leading-[0.95] tracking-[0.03em] text-white">
          Pravila privatnosti i kolačići
        </h1>
        <p className="mt-3 text-sm leading-6 text-white/60">
          Ova stranica objašnjava koje podatke prikupljamo, zašto, i koje kolačiće koristimo. Korištenjem
          web-trgovine {s.businessName} prihvaćaš ova pravila.
        </p>

        <Section title="Tko smo">
          <p>
            {s.businessName} (dresifyshop.com) — internetska trgovina nogometnim dresovima i streetwear odjećom.
            Za sva pitanja o privatnosti javi se na{" "}
            <a href={`mailto:${email}`} className="text-accent underline underline-offset-2">{email}</a>.
          </p>
        </Section>

        <Section title="Koje podatke prikupljamo">
          <p>
            Kod narudžbe prikupljamo podatke potrebne za isporuku i kontakt: ime i prezime, adresu dostave,
            broj telefona i e-mail. Te podatke koristimo isključivo za obradu i dostavu narudžbe te za
            komunikaciju vezanu uz nju.
          </p>
          <p>
            Plaćanje je pouzećem (gotovinom kuriru), pa ne prikupljamo niti pohranjujemo podatke o karticama.
          </p>
        </Section>

        <Section title="Kolačići koje koristimo">
          <p>Na stranici koristimo tri vrste kolačića:</p>
          <ul className="ml-4 list-disc space-y-1.5">
            <li>
              <b className="text-white/85">Nužni</b> — osnovni rad stranice (npr. odabir jezika, sadržaj košarice).
              Bez njih stranica ne radi ispravno.
            </li>
            <li>
              <b className="text-white/85">Analitički (Google Analytics)</b> — anonimno mjerimo koliko ljudi
              dolazi, s kojih stranica i uređaja, kako bismo poboljšali trgovinu.
            </li>
            <li>
              <b className="text-white/85">Marketinški (Meta Pixel)</b> — mjerimo učinkovitost oglasa na
              društvenim mrežama i prikazujemo relevantnije oglase.
            </li>
          </ul>
        </Section>

        <Section title="Upravljanje kolačićima">
          <p>
            Kolačiće analitike i marketinga možeš u svakom trenutku onemogućiti u postavkama svog preglednika
            (blokiranje ili brisanje kolačića). Blokiranje nužnih kolačića može utjecati na rad trgovine.
          </p>
        </Section>

        <Section title="Koliko dugo čuvamo podatke">
          <p>
            Podatke o narudžbama čuvamo koliko je potrebno za izvršenje narudžbe i zakonske obveze
            (npr. reklamacije). Kad više nisu potrebni, brišemo ih ili anonimiziramo.
          </p>
        </Section>

        <Section title="Tvoja prava">
          <p>
            U skladu s GDPR-om imaš pravo zatražiti uvid u svoje podatke, njihov ispravak ili brisanje, te
            prigovoriti obradi. Za bilo koji takav zahtjev javi se na{" "}
            <a href={`mailto:${email}`} className="text-accent underline underline-offset-2">{email}</a>.
          </p>
        </Section>
      </div>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(buildBreadcrumbSchema([{ name: "Početna", path: "/" }, { name: "Pravila privatnosti", path: "/pravila-privatnosti" }])) }}
      />
    </section>
  );
}
