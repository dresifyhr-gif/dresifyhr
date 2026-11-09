import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Check } from "lucide-react";

import { WATERMARK } from "@/lib/watermark-css";
import { WishlistButton } from "@/components/site/wishlist-button";
import type { HomeDrop } from "@/lib/data/home-drop";
import { SHIPPING_PRICE_EUR } from "@/lib/site";
import { repairText } from "@/lib/utils";

// Koncept A "Matchday Drop" — hero. Server komponenta (nula dodatnog JS-a osim
// srca za omiljene). Sve što se mijenja (dres, naslov) dolazi iz HOME_DROP + kataloga.
export function DropHero({ drop }: { drop: HomeDrop }) {
  const klub = repairText(drop.klub);
  const name = repairText(drop.name);
  const sub = [klub, repairText(drop.sub), drop.kidsOnly ? "dres + hlačice" : ""].filter(Boolean).join(" · ");
  const href = `/dres/${drop.slug}`;

  return (
    <section
      className="relative overflow-hidden"
      style={{
        background:
          "radial-gradient(70% 38% at 50% 50%, rgba(255,255,255,.10), transparent 72%), radial-gradient(90% 26% at 50% 100%, rgba(232,255,60,.07), transparent 70%), linear-gradient(180deg, #0b0b0b 0%, #1a1a1a 50%, #0c0c0c 100%)"
      }}
    >
      {/* Dekor: snop svjetla, tanke okomite linije, šahovnica koja se gubi u tami. */}
      <div
        aria-hidden
        className="pointer-events-none absolute left-1/2 top-[-80px] h-[760px] w-[520px] -translate-x-1/2 lg:left-[72%] lg:w-[760px]"
        style={{
          background:
            "conic-gradient(from 180deg at 50% 0%, transparent 160deg, rgba(255,255,255,.06) 172deg, rgba(255,255,255,.10) 180deg, rgba(255,255,255,.06) 188deg, transparent 200deg)"
        }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{ background: "repeating-linear-gradient(90deg, rgba(255,255,255,.025) 0 1px, transparent 1px 48.75px)" }}
      />
      <div
        aria-hidden
        className="chk pointer-events-none absolute -left-8 -right-8 top-[250px] h-[320px] opacity-[0.16] lg:left-[40%] lg:top-[80px] lg:h-[520px]"
        style={{
          WebkitMaskImage: "radial-gradient(60% 55% at 50% 50%, #000 20%, transparent 75%)",
          maskImage: "radial-gradient(60% 55% at 50% 50%, #000 20%, transparent 75%)"
        }}
      />

      <div className="page-shell relative grid pb-6 pt-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)] lg:gap-x-10 lg:pb-16 lg:pt-14">
        {/* ── Gore: oznaka + golemi naslov ── */}
        <div className="relative z-[1] text-center lg:col-start-1 lg:row-start-1 lg:self-end lg:text-left">
          <p className="flex items-center justify-center gap-2 text-[10.5px] font-black uppercase leading-none tracking-[0.16em] text-fg lg:justify-start">
            <i className="inline-block h-[7px] w-[7px] rounded-full bg-accent shadow-[0_0_0_4px_rgba(232,255,60,.18)]" />
            {drop.live}
          </p>
          <p
            className="mt-3 font-display text-[122px] uppercase leading-[0.86] tracking-[-0.005em] sm:text-[160px] lg:text-[clamp(150px,13vw,210px)]"
            style={{
              background: "linear-gradient(180deg, #fff 45%, #a9a9a2)",
              WebkitBackgroundClip: "text",
              backgroundClip: "text",
              color: "transparent"
            }}
          >
            {drop.headline}
          </p>
          <p className="mt-3 text-[10.5px] font-bold uppercase leading-none tracking-[0.42em] text-[#b5b5ae]">
            {drop.kicker}
          </p>
        </div>

        {/* ── Pozornica: pravi katalog dres kao "kartica" + volt naljepnica s cijenom ── */}
        <div className="relative z-[2] mx-auto mt-4 h-[330px] w-full max-w-[400px] sm:h-[400px] sm:max-w-[520px] lg:col-start-2 lg:row-span-2 lg:row-start-1 lg:mt-0 lg:h-[560px] lg:max-w-none">
          {/* svjetleći prsten "poda" */}
          <div
            aria-hidden
            className="absolute bottom-[14px] left-1/2 h-[62px] w-[330px] -translate-x-1/2 rounded-[50%] border border-accent/35 shadow-[0_0_30px_rgba(232,255,60,.15),inset_0_0_20px_rgba(232,255,60,.08)] lg:bottom-[30px] lg:h-[90px] lg:w-[520px]"
          />
          {/* brzinske linije */}
          <div aria-hidden className="absolute -left-5 top-[52%] flex flex-col gap-[7px] lg:left-0">
            <i className="block h-[2px] w-[90px] rounded bg-[linear-gradient(90deg,transparent,rgba(232,255,60,.9))]" />
            <i className="block h-[2px] w-[56px] rounded bg-[linear-gradient(90deg,transparent,rgba(232,255,60,.9))] opacity-60" />
            <i className="block h-[2px] w-[120px] rounded bg-[linear-gradient(90deg,transparent,rgba(232,255,60,.9))] opacity-35" />
          </div>

          <Link
            href={href}
            className="group absolute left-1/2 top-[44%] block w-[318px] -translate-x-1/2 -translate-y-1/2 -rotate-[4deg] transition-transform duration-300 ease-out hover:-rotate-[2deg] sm:w-[420px] lg:w-[min(560px,92%)]"
            aria-label={`${klub} ${name} — odaberi veličinu`}
          >
            <div className="relative aspect-[4/3] overflow-hidden rounded-[4px] bg-white shadow-[0_40px_60px_rgba(0,0,0,.6),0_8px_14px_rgba(0,0,0,.45)] ring-1 ring-white/20">
              {drop.image ? (
                <Image
                  src={drop.image}
                  alt={repairText(drop.imageAlt)}
                  fill
                  priority
                  sizes="(max-width: 640px) 318px, (max-width: 1024px) 420px, 560px"
                  className="object-contain p-2"
                />
              ) : null}
              <div aria-hidden className="pointer-events-none absolute inset-0" style={{ backgroundImage: WATERMARK, backgroundRepeat: "repeat" }} />
            </div>
          </Link>

          {/* Naljepnica s cijenom — jedina cijena u heroju */}
          <Link
            href={href}
            className="absolute right-1 top-[60%] z-[3] grid h-[84px] w-[84px] rotate-12 place-items-center rounded-full bg-accent text-center text-black shadow-[0_10px_24px_rgba(0,0,0,.45)] lg:right-[4%] lg:top-[64%] lg:h-[104px] lg:w-[104px]"
            aria-label={`${drop.price} € — ${klub} ${name}`}
          >
            <span>
              <b className="block font-display text-[30px] font-normal leading-[0.85] lg:text-[38px]">{drop.price}€</b>
              <small className="mt-[3px] block text-[8.5px] font-black uppercase leading-[1.1] tracking-[0.08em] lg:text-[10px]">
                {drop.kidsOnly ? (
                  <>
                    dres +
                    <br />
                    hlačice
                  </>
                ) : (
                  <>
                    fiksna
                    <br />
                    cijena
                  </>
                )}
              </small>
            </span>
          </Link>
        </div>

        {/* ── Dolje: ime, dostava, CTA ── */}
        <div className="relative z-[3] mt-2 lg:col-start-1 lg:row-start-2 lg:mt-8 lg:max-w-[560px]">
          <div className="mb-3.5 flex items-end justify-between gap-3">
            <div className="min-w-0">
              <p className="font-display text-[34px] uppercase leading-[0.9] text-fg lg:text-[44px]">{name}</p>
              <p className="mt-1.5 truncate text-[12px] font-medium leading-[1.3] text-[#c9c9c2] lg:text-[13px]">{sub}</p>
            </div>
            <p className="shrink-0 text-right text-[12px] font-semibold leading-[1.35] text-soft">
              <b className="font-black text-fg">+{SHIPPING_PRICE_EUR} € dostava</b>
              <br />
              plaćaš pri preuzimanju
            </p>
          </div>
          <div className="grid grid-cols-[1fr_56px] gap-2">
            <Link href={href} className="button-primary w-full">
              Odaberi veličinu <ArrowRight className="h-[18px] w-[18px]" strokeWidth={2.2} />
            </Link>
            <WishlistButton
              slug={drop.slug}
              klub={drop.klub}
              igrac={drop.igrac}
              className="!h-14 !w-14 !rounded-[2px] !border-white/[0.18] !bg-transparent"
            />
          </div>
          <div className="mt-3 flex justify-center gap-3.5 text-[10px] font-bold uppercase leading-none tracking-[0.12em] text-[#bdbdb6] lg:justify-start">
            <span className="inline-flex items-center gap-1.5">
              <Check className="h-[13px] w-[13px] text-accent" strokeWidth={2.4} /> Plaćaš kad stigne
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Check className="h-[13px] w-[13px] text-accent" strokeWidth={2.4} /> GLS 2–5 dana
            </span>
          </div>
        </div>
      </div>
    </section>
  );
}

const TAPE_ITEMS = ["Real Madrid", "Barcelona", "Hrvatska", "Argentina", "Portugal", "PSG", "Brazil", "Bayern", "Inter Miami", "Al-Nassr"];

// Nagnuta volt traka s klubovima ispod heroja (CSS marquee, bez JS-a).
export function ClubTape() {
  const row = [...TAPE_ITEMS, ...TAPE_ITEMS];
  return (
    <div aria-hidden className="relative z-[4] mx-[-20px] mt-6 h-11 -rotate-[2.2deg] overflow-hidden bg-accent text-black shadow-[0_10px_30px_rgba(0,0,0,.5)]">
      <div className="marquee h-11 items-center">
        {[...row, ...row].map((club, i) => (
          <span key={i} className="inline-flex items-center gap-5 whitespace-nowrap px-2.5 font-display text-[22px] uppercase leading-none tracking-[0.02em]">
            {club}
            <i className="text-[14px] not-italic">✦</i>
          </span>
        ))}
      </div>
    </div>
  );
}
