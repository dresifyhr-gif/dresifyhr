"use client";

import { IgreCard, KompletCard, StreetCard, TrenirkaCard, type ZiveProduct } from "./zive-cards";
import { ZIVE_CSS } from "./zive-css";
import { useEText } from "../e-i18n";

export type ZiveData = {
  video: ZiveProduct;
  /** Više se ne prikazuje (Igor 18./19.11.) — neobavezno, da se ne šalje u HTML. */
  mix?: ZiveProduct;
  komplet: ZiveProduct;
  /** img/top/bottom: stari izrezi (više se ne koriste — kadrovi su Blender renderi u /zive/kartice). */
  trenirka: ZiveProduct & { img?: string };
  street: ZiveProduct & { top?: string; bottom?: string };
  mystery?: ZiveProduct;
  igre?: { href: string };
};

/** "Izdvojeno" — kartice ispod 3D garderobe. Svaki kadar je render iz iste mračne garderobe kao naslovnica
 *  (beton, mokri pod, jedan reflektor), s našim pravim fotkama proizvoda kao osvijetljenim plohama u sceni.
 *  css=false: CSS (ZIVE_CSS) već šalje stranica jednom. */
export function ZiveSection({ data, heading = true, css = true }: { data: ZiveData; heading?: boolean; css?: boolean }) {
  const t = useEText();
  return (
    <section className="zv" aria-label={t.featured}>
      {css ? <style dangerouslySetInnerHTML={{ __html: ZIVE_CSS }} /> : null}
      <div className="zv-wrap">
        {heading && (
          <div className="zv-head">
            <h2 className="zv-h2">{t.featured}</h2>
            <p>{t.featuredSub}</p>
          </div>
        )}
        <div className="zv-grid">
          {/* Igor 18.11.: samo 4 male kartice. Video reklama i "Složi svoj mix" maknuti sa stranice
              (svaka stranica dresa već nudi mix) — VideoCard i MixCard ostaju u kodu ako zatrebaju. */}
          <div className="zv-c">
            <TrenirkaCard p={data.trenirka} />
          </div>
          <div className="zv-c">
            <KompletCard p={data.komplet} />
          </div>
          <div className="zv-c">
            <StreetCard p={data.street} />
          </div>
          <div className="zv-c">
            <IgreCard href={data.igre?.href ?? "/igre/"} />
          </div>
        </div>
      </div>
    </section>
  );
}
