import Link from "next/link";
import type { ReactNode } from "react";

import { D_CSS } from "@/components/clean-demo/d/d-css";
import { ePrice } from "@/components/clean-demo/final/e-css";
import { EHome } from "@/components/clean-demo/final/e-home";
import { FCatalog } from "@/components/clean-demo/final/f-catalog";
import { F_BASE } from "@/components/clean-demo/final/f-css";
import { FILM_CSS } from "@/components/clean-demo/final/film/film-css";
import { interleaveByClub } from "@/components/clean-demo/final/film/interleave";
import { IME_CSS } from "@/components/clean-demo/final/ime-const";
import { ZIVE_CSS } from "@/components/clean-demo/final/zive/zive-css";
import { ZiveSection, type ZiveData } from "@/components/clean-demo/final/zive/zive-section";
import { ND_CSS } from "@/components/naslovnica/nd-css";
import { jerseys, type Jersey } from "@/lib/data/jerseys";
import { getOrmarRailItems, type OrmarRailItem } from "@/lib/data/ormar-items";
import { getCatalogProducts, getStreetwearProducts, getTrenirkaProducts } from "@/lib/data/product-overrides";
import type { Locale } from "@/lib/i18n";

import { NoviHomeIntro } from "./home-intro";

/* NOVI DIZAJN — naslovnica (serverska komponenta). Izvor: demo /cisto-demo/final. */

const dresHref = (slug: string) => `${F_BASE}/dres/${slug}/`;

/* ---------------- lakši podaci za klijent (brzina) ---------------- */
/* Prsten i katalog su klijentske komponente: svaki proizvod ide u RSC payload u HTML-u naslovnice
   (prije ~220 kB samo za to). Šaljemo samo polja koja kartice, prsten, filtri i poredak stvarno čitaju:
   imena/liga (imeNames, filtri), cijena, kategorija i zaliha (getJerseySizeOptions → isSoldOut/kidsOnly,
   filter veličina). Bez: id, opis, badge/featured/retro/rating, isCustom i URL-ova slika iz admina
   (katalog gleda samo IMA LI slika — za poredak; prsten ih ne koristi). Undefined ključevi se ne šalju. */
const IMG_FLAG: NonNullable<Jersey["images"]> = [{ src: "" }];
function slimProduct(j: Jersey): Jersey {
  const o: Jersey = { id: 0, slug: j.slug, klub: j.klub, igrac: j.igrac, liga: j.liga, retro: false, vel: j.vel };
  if (j.price !== undefined) o.price = j.price;
  if (j.category !== undefined) o.category = j.category;
  if (j.outOfStock !== undefined) o.outOfStock = j.outOfStock;
  if (j.soldOutSizes?.length) o.soldOutSizes = j.soldOutSizes;
  if (j.customSizes !== undefined) o.customSizes = j.customSizes;
  if (j.sizeStock !== undefined) o.sizeStock = j.sizeStock;
  if (j.stock !== undefined) o.stock = j.stock;
  if (j.hidden !== undefined) o.hidden = j.hidden;
  // samo oznaka "ima sliku" (f-catalog: images.length > 0 u preporučenom poretku), ne stvarni URL-ovi
  if (j.images?.length) o.images = IMG_FLAG;
  return o;
}
const slimItem = (it: OrmarRailItem): OrmarRailItem => ({ ...it, product: slimProduct(it.product) });

/* ---------------- naslovnica ---------------- */

/** Scena (film) + žive kartice + katalog s karticama "ime". Ispod: `below` (živi SEO/sezonski dijelovi). */
export async function NoviHome({ below }: { below?: ReactNode }) {
  const catalog = await getCatalogProducts(jerseys);
  const dresovi = catalog.filter((j) => j.liga !== "Komplet");
  const streetwear = await getStreetwearProducts();
  const trenirke = await getTrenirkaProducts();
  // Šipka = samo dresovi: bez trenirki, kompleta i dječjih hlačica na zasebnoj vješalici.
  const items = interleaveByClub(
    (await getOrmarRailItems())
      .filter((it) => it.img.kind === "dres" && it.group !== "kompleti" && it.group !== "trenirke")
      .map((it) => (it.img.kind === "dres" && it.img.shorts ? { ...it, img: { kind: "dres" as const, back: it.img.back, ...(it.img.front ? { front: it.img.front } : {}) } } : it))
  );

  // Igor 18.11.: šipka počinje Maradonom (Boca Juniors 10) — prvi dres na naslovnici.
  const FIRST = "boca-juniors-maradona-nr10-plavo-zuti";
  const fi = items.findIndex((it) => it.slug === FIRST);
  if (fi > 0) items.unshift(items.splice(fi, 1)[0]);

  // Žive kartice između scene i kataloga: cijene iz podataka proizvoda (ne upisane ručno).
  const all = [...catalog, ...trenirke, ...streetwear];
  const priceOf = (slug: string, fallback: number) => ePrice(all.find((j) => j.slug === slug)?.price ?? fallback);
  const zive: ZiveData = {
    video: { href: dresHref("spanjolska-yamal-nr19-bijeli-2-stars"), price: priceOf("spanjolska-yamal-nr19-bijeli-2-stars", 20), label: "Španjolska · Yamal 19" },
    komplet: { href: dresHref("barcelona-yamal-komplet"), price: priceOf("barcelona-yamal-komplet", 40), label: "Barcelona · Yamal komplet" },
    trenirka: { href: dresHref("argentina-messi-nr10"), price: priceOf("argentina-messi-nr10", 35), label: "Argentina · Messi 10", img: "/ormar/hanger/argentina-messi-nr10--jakna.webp" },
    street: {
      href: dresHref("corteiz-orange-corteiz-wreath-set"),
      price: priceOf("corteiz-orange-corteiz-wreath-set", 50),
      label: "Corteiz Wreath · narančasti",
      top: "/ormar/hanger/corteiz-orange-corteiz-wreath-set--jakna.webp",
      bottom: "/ormar/hanger/corteiz-orange-corteiz-wreath-set--hlace.webp",
    },
  };

  return (
    <>
      <div className="f-root e-root d-root bg-[#0a0a0a] text-white [-webkit-tap-highlight-color:transparent]">
        <style dangerouslySetInnerHTML={{ __html: ND_CSS + D_CSS + IME_CSS + FILM_CSS + ZIVE_CSS }} />
        <EHome items={items.map(slimItem)} title={<NoviHomeIntro />} between={<ZiveSection data={zive} css={false} />}>
          <FCatalog dresovi={dresovi.map(slimProduct)} streetwear={streetwear.map(slimProduct)} trenirke={trenirke.map(slimProduct)} />
        </EHome>
      </div>
      {/* izvan .d-root: živi dijelovi zadržavaju Bebas naslove */}
      {below}
    </>
  );
}

/** Interni linkovi s naslovnice prema landinzima (isti URL-ovi kao CATEGORY_LINKS na živoj naslovnici). */
export function NoviCategoryLinks({ links, locale }: { links: { href: string; hr: string; en: string }[]; locale: Locale }) {
  const en = locale === "en";
  return (
    <nav aria-label={en ? "Shop by category" : "Kupuj po kategoriji"} className="mx-auto max-w-[1680px] border-t border-[#ffffff12] px-4 py-10 sm:px-8 lg:px-10">
      <p className="text-[12px] font-semibold uppercase tracking-[0.14em] text-white/40">{en ? "Shop by category" : "Kupuj po kategoriji"}</p>
      <ul className="mt-4 flex flex-wrap gap-x-8 gap-y-2">
        {links.map((c) => (
          <li key={c.href}>
            <Link href={c.href} className="flex h-10 items-center text-[16px] text-white/75 transition-colors hover:text-[#e8ff3c]">
              {en ? c.en : c.hr}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}

