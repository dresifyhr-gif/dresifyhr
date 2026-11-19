import Link from "next/link";

import { D_CSS } from "@/components/clean-demo/d/d-css";
import { IME_CSS } from "@/components/clean-demo/final/ime-const";
import { cardData, imeNames, mainFace, usableHanger } from "@/components/clean-demo/final/ime-lib";
import { ImeProduct } from "@/components/clean-demo/final/ime-product";
import { ProductFaq, displayIgrac } from "@/components/product/product-faq";
import type { JerseyCollection } from "@/lib/data/seo-collections";
import { getJerseyDescription, getRelatedJerseys, jerseys, type Jersey } from "@/lib/data/jerseys";
import { KOMPLET_IMAGES, type HangerImages } from "@/lib/data/ormar-hanger";
import { getCatalogProducts, getStreetwearProducts, getTrenirkaProducts } from "@/lib/data/product-overrides";
import type { Locale } from "@/lib/i18n";
import { productTypeWord } from "@/lib/product-type";
import { repairText } from "@/lib/utils";

/* NOVI DIZAJN — stranica dresa (serverska komponenta). Ruta zadržava metadata/JSON-LD. */

/* ---------------- stranica dresa ---------------- */

type Crumb = { label: string; href?: string };

export async function NoviProduct({
  product,
  locale,
  breadcrumbs,
  explore,
}: {
  product: Jersey;
  locale: Locale;
  breadcrumbs: Crumb[];
  /** "Istraži više": klub, igrač, kategorije — isti interni linkovi kao živa stranica */
  explore: { title: string; collections: JerseyCollection[] }[];
}) {
  const names = imeNames(product);
  // Kompleti: jedna složena slika na vješalici (KOMPLET_IMAGES, tamna pozadina — kao na karticama /kompleti)
  const komplet = KOMPLET_IMAGES[product.slug];
  const hanger: HangerImages | null = usableHanger(product.slug) ?? (komplet ? { kind: "dres", back: komplet.image } : null);
  // Nikad fotografija na bijelom: bez slike na vješalici pozornica crta "Fotografija uskoro".
  // (og:image i Product JSON-LD na ruti i dalje koriste originalnu fotografiju.)
  const image = hanger ? mainFace(hanger) : undefined;
  const description = product.descriptionOverride
    ? product.descriptionOverride.split("\n").map((s) => s.trim()).filter(Boolean)
    : getJerseyDescription(product, locale);

  // Slični: isti igrač, pa isti klub — samo na stanju i sa slikom na vješalici; dopuna iz
  // getRelatedJerseys (kao živa stranica) da odjeljak nikad ne ostane prazan.
  const pool = [...(await getCatalogProducts(jerseys)), ...(await getTrenirkaProducts()), ...(await getStreetwearProducts())].filter(
    (p) => (p.slug !== product.slug && p.liga !== "Komplet") || (p.category === "trenirka" && p.slug !== product.slug)
  );
  const seen = new Set<string>();
  const pick = (list: Jersey[], pred: (p: Jersey) => boolean) =>
    list
      .filter((p) => p.slug !== product.slug && !seen.has(p.slug) && pred(p))
      .map((p) => cardData(p))
      .filter((c): c is NonNullable<typeof c> => !!c && !c.soldOut)
      .map((c) => (seen.add(c.slug), c));
  const kindOf = (p: Jersey) => (p.category === "trenirka" || p.category === "streetwear" ? p.category : "dres");
  const sameKind = (p: Jersey) => kindOf(product) === kindOf(p);
  const samePlayer = names.number || names.surname !== names.club.toLocaleUpperCase("hr") ? pick(pool, (p) => sameKind(p) && imeNames(p).surname === names.surname) : [];
  const sameClub = pick(pool, (p) => sameKind(p) && imeNames(p).club === names.club);
  let similar = [...samePlayer, ...sameClub].slice(0, 4);
  if (similar.length < 4) similar = [...similar, ...pick(pool, sameKind)].slice(0, 4);
  if (similar.length < 4) similar = [...similar, ...pick(getRelatedJerseys(product), () => true)].slice(0, 4);

  // SEO: H1 = klub + igrač + vrsta (isti signal kao <title> i živi ProductDetailPanel),
  // h2 "O proizvodu — {naziv}" kao živa ruta.
  const h1Name = displayIgrac(product.klub, product.igrac);
  const typeWord = productTypeWord(product);
  const h1Type = (typeWord === "trenirka" ? /trenirka/i.test(h1Name) : /dres|komplet|trenirka/i.test(h1Name)) ? "" : typeWord;
  const productName = [repairText(product.klub), h1Name].filter(Boolean).join(" ");

  const en = locale === "en";
  const exploreLinks = explore.filter((g) => g.collections.length);

  return (
    <div className="f-root e-root ime-root min-h-screen bg-[#0a0a0a] text-white [-webkit-tap-highlight-color:transparent]">
      <style dangerouslySetInnerHTML={{ __html: D_CSS + IME_CSS + NOVI_PRODUCT_CSS }} />
      <ImeProduct
        product={product}
        names={names}
        hanger={hanger}
        image={image}
        description={description}
        similar={similar}
        seo={{ typeWord: h1Type, productName, hasName: !!h1Name }}
        breadcrumbs={breadcrumbs}
        faq={<ProductFaq product={product} locale={locale} />}
        after={
          exploreLinks.length ? (
            <section aria-labelledby="nv-explore" className="mt-16 border-t border-[#ffffff14] pt-10 lg:mt-20 lg:pt-14">
              <h2 id="nv-explore" className="text-[32px] text-white lg:text-[38px]">
                <span aria-hidden className="mb-3.5 block h-[2px] w-10 bg-[#e8ff3c]" />
                {en ? "Explore more" : "Istraži više"}
              </h2>
              <div className="mt-6 grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
                {exploreLinks.map((g) => (
                  <div key={g.title}>
                    <p className="text-[12px] font-semibold uppercase tracking-[0.14em] text-white/40">{g.title}</p>
                    <ul className="mt-3">
                      {g.collections.map((c) => (
                        <li key={c.path}>
                          <Link href={c.path} className="flex h-10 items-center text-[15.5px] text-white/75 transition-colors hover:text-[#e8ff3c]">
                            {c.label}
                          </Link>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </section>
          ) : null
        }
      />
    </div>
  );
}

/* živi ProductFaq u stupcu stranice dresa: bez vanjskog razmaka, naslov kao ostali h2 */
const NOVI_PRODUCT_CSS = `
.ime-faq>section{margin-top:0;max-width:none}
.ime-faq>section>h2{font-size:32px;line-height:.95;text-transform:none}
@media (min-width:1024px){.ime-faq>section>h2{font-size:38px}}
.ime-faq>section summary{font-weight:500;font-size:15px;color:rgba(255,255,255,.85)}
.ime-faq>section summary svg{color:rgba(255,255,255,.55)}
`;

