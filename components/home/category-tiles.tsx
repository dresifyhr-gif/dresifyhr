import Image from "next/image";
import Link from "next/link";

export type CategoryTile = {
  href: string;
  label: string;
  price: string;
  image?: string;
  note?: string;
};

// Jedan red kategorija odmah ispod heroa — kupac u jednom pogledu vidi SVE što
// prodajemo (umjesto više velikih traka jedna ispod druge). Mobitel: vodoravni
// scroll; desktop: sve u jednom redu. Server komponenta — nula JS-a.
export function CategoryTiles({ tiles }: { tiles: CategoryTile[] }) {
  if (!tiles.length) return null;
  return (
    <section className="bg-[#0a0a0a] pb-2 pt-6 sm:pt-8">
      <div className="page-shell">
        <h2 className="mb-3 font-heading text-xl uppercase tracking-[0.04em] text-white sm:mb-4 sm:text-2xl">Kategorije</h2>
        <div className="-mx-3 sm:mx-0">
          <div className="flex snap-x gap-3 overflow-x-auto px-3 pb-2 sm:grid sm:grid-cols-5 sm:gap-4 sm:overflow-visible sm:px-0 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {tiles.map((t) => (
              <Link
                key={t.href}
                href={t.href}
                className="group w-[38%] shrink-0 snap-start overflow-hidden rounded-[14px] border border-white/10 bg-[#111111] transition hover:border-accent/60 sm:w-auto"
              >
                <div className="relative aspect-square bg-[#fbfbfb]">
                  {t.image ? (
                    <Image
                      src={t.image}
                      alt={t.label}
                      fill
                      sizes="(min-width: 640px) 20vw, 38vw"
                      className="object-contain p-2 transition-transform duration-300 group-hover:scale-[1.04]"
                    />
                  ) : null}
                  {t.note ? (
                    <span className="absolute left-2 top-2 rounded-full bg-black px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-accent">
                      {t.note}
                    </span>
                  ) : null}
                </div>
                <div className="px-3 py-2.5">
                  <p className="truncate text-sm font-bold uppercase tracking-wide text-white">{t.label}</p>
                  <p className="text-xs text-white/50">
                    od <span className="font-semibold text-accent">{t.price}</span>
                  </p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
