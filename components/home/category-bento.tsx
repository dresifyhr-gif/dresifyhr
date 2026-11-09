import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";

export type BentoTile = {
  href: string;
  label: string;
  /** npr. "Dres + hlačice" — kratko, istinito */
  note?: string;
  price: string;
  images: string[];
  variant?: "big" | "volt";
};

// Pločica s fotografijom kao nagnutom bijelom karticom na tamnoj pozornici.
function PhotoCard({ src, className, sizes }: { src: string; className: string; sizes: string }) {
  return (
    <div className={`absolute overflow-hidden rounded-[3px] bg-white shadow-[0_14px_22px_rgba(0,0,0,.55)] ${className}`}>
      <Image src={src} alt="" fill sizes={sizes} className="object-contain p-1" />
    </div>
  );
}

function Arrow({ dark = false }: { dark?: boolean }) {
  return (
    <span
      className={`absolute right-3 top-3 z-[2] grid h-8 w-8 place-items-center rounded-full border ${
        dark ? "border-black/30 text-black" : "border-white/[0.18] bg-ink text-fg"
      }`}
    >
      <ArrowUpRight className="h-3.5 w-3.5" strokeWidth={2.2} />
    </span>
  );
}

// Kategorije kao "bento" mreža (koncept A). Server komponenta — nula JS-a.
// Sadrži H1 stranice (ključne riječi ostaju iste), a naslove iz Postavki poštuje.
export function CategoryBento({
  tiles,
  titleLines,
  subtitle
}: {
  tiles: BentoTile[];
  titleLines: string[];
  subtitle: string;
}) {
  return (
    <section className="pb-3 pt-16 lg:pt-24">
      <div className="page-shell">
        <div className="idx">
          <b>01</b>Kategorije
        </div>
        <h1 className="max-w-[900px] font-display text-[44px] uppercase leading-[0.92] text-fg sm:text-6xl lg:text-[84px]">
          {titleLines.map((line, i) => (
            <span key={i} className={`block ${i === titleLines.length - 1 ? "text-accent" : ""}`}>
              {line}
            </span>
          ))}
        </h1>
        <p className="mt-3 text-[14px] font-medium leading-[1.45] text-[#c4c4bd] sm:text-base">{subtitle}</p>

        <div className="mt-6 grid grid-cols-2 gap-2 lg:mt-8 lg:grid-cols-4 lg:gap-3">
          {tiles.map((tile) => {
            const big = tile.variant === "big";
            const volt = tile.variant === "volt";
            return (
              <Link
                key={tile.href}
                href={tile.href}
                className={`group relative overflow-hidden rounded-[2px] ${volt ? "bg-accent text-black" : "stage text-fg"} ${
                  big ? "col-span-2 h-[250px] lg:row-span-2 lg:h-auto lg:min-h-[420px]" : "h-[210px] lg:h-[204px]"
                }`}
              >
                {volt ? (
                  <span
                    aria-hidden
                    className="absolute right-[-6px] top-1.5 text-right font-display text-[92px] uppercase leading-[0.8]"
                    style={{ color: "transparent", WebkitTextStroke: "1.5px rgba(0,0,0,.25)" }}
                  >
                    {tile.label.length > 7 ? (
                      <>
                        {tile.label.slice(0, 6)}
                        <br />
                        {tile.label.slice(6)}
                      </>
                    ) : (
                      tile.label
                    )}
                  </span>
                ) : null}

                {!volt && big && tile.images[0] ? (
                  <>
                    <PhotoCard
                      src={tile.images[0]}
                      sizes="(max-width: 1024px) 48vw, 22vw"
                      className="left-[6%] top-[14%] aspect-square w-[44%] -rotate-[7deg] transition-transform duration-300 group-hover:-rotate-[9deg] lg:top-[16%] lg:w-[46%]"
                    />
                    {tile.images[1] ? (
                      <PhotoCard
                        src={tile.images[1]}
                        sizes="(max-width: 1024px) 48vw, 22vw"
                        className="right-[5%] top-[8%] aspect-square w-[46%] rotate-[6deg] transition-transform duration-300 group-hover:rotate-[8deg] lg:top-[10%] lg:w-[48%]"
                      />
                    ) : null}
                  </>
                ) : null}

                {!volt && !big && tile.images[0] ? (
                  <PhotoCard
                    src={tile.images[0]}
                    sizes="(max-width: 1024px) 40vw, 16vw"
                    className="left-1/2 top-[12px] aspect-square w-[74%] -translate-x-1/2 -rotate-[3deg] transition-transform duration-300 group-hover:rotate-0 lg:w-[44%]"
                  />
                ) : null}

                {!volt ? (
                  <span aria-hidden className="absolute inset-0 z-[1] bg-[linear-gradient(180deg,transparent_45%,rgba(10,10,10,.92))]" />
                ) : null}

                <Arrow dark={volt} />

                <span className="absolute bottom-[13px] left-3.5 z-[2] block">
                  <b className={`block font-display font-normal uppercase leading-[0.95] ${big ? "text-[50px]" : "text-[30px]"}`}>
                    {tile.label}
                  </b>
                  <small className={`mt-1.5 block text-[10.5px] font-bold uppercase leading-none tracking-[0.12em] ${volt ? "text-black" : "text-[#cfcfc8]"}`}>
                    {tile.note ? `${tile.note} · ` : ""}
                    <em className={`not-italic ${volt ? "underline" : "text-accent"}`}>{tile.price}</em>
                  </small>
                </span>
              </Link>
            );
          })}
        </div>
      </div>
    </section>
  );
}
