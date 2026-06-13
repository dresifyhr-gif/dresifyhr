import Image from "next/image";
import Link from "next/link";

const CATEGORIES = [
  {
    label: "Klubovi",
    desc: "100+ dresova",
    image: "/dresovi/milan-modric/front.jpg",
    href: "/dresovi",
  },
  {
    label: "Reprezentacije",
    desc: "50+ dresova",
    image: "/dresovi/argentina-messi-retro/front.jpg",
    href: "/dresovi",
  },
  {
    label: "Retro Dresovi",
    desc: "Posebne kolekcije",
    image: "/dresovi/real-ronaldo-2014/front.jpg",
    href: "/dresovi",
  },
  {
    label: "Dječji Dresovi",
    desc: "Za najmlađe",
    image: "/dresovi/alnassr-ronaldo-zuti/front.jpg",
    href: "/dresovi",
  },
];

export function CategoriesSection() {
  return (
    <section className="section-pad bg-[#0a0a0a]">
      <div className="page-shell">
        <div className="mb-6 flex items-center justify-between sm:mb-8">
          <h2 className="font-heading text-2xl uppercase tracking-[0.04em] text-white sm:text-3xl">
            Popularne kategorije
          </h2>
          <Link
            href="/dresovi"
            className="text-sm font-semibold uppercase tracking-[0.18em] text-accent hover:text-white transition-colors duration-150"
          >
            Pogledaj sve →
          </Link>
        </div>

        <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
          {CATEGORIES.map((cat) => (
            <Link
              key={cat.label}
              href={cat.href}
              className="group relative aspect-[3/4] overflow-hidden rounded-[10px] border border-white/10 bg-[#111111] hover:border-accent/50 transition-all duration-200"
            >
              {/* Jersey image */}
              <div className="absolute inset-0 flex items-end justify-center pb-[30%]">
                <div className="relative h-[65%] w-[65%] transition-transform duration-300 group-hover:scale-105">
                  <Image
                    src={cat.image}
                    alt={cat.label}
                    fill
                    sizes="(max-width: 640px) 45vw, (max-width: 1024px) 22vw, 18vw"
                    className="object-contain object-center"
                  />
                </div>
              </div>

              {/* Bottom gradient + label */}
              <div className="absolute inset-0 bg-[linear-gradient(180deg,transparent_40%,rgba(0,0,0,0.88)_100%)]" />
              <div className="absolute bottom-0 left-0 right-0 p-3.5 sm:p-4">
                <p className="font-heading text-base uppercase leading-none text-white sm:text-lg">
                  {cat.label}
                </p>
                <p className="mt-1 text-[11px] uppercase tracking-[0.2em] text-white/50 sm:text-xs">
                  {cat.desc} →
                </p>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
