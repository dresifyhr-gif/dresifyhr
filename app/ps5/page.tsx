import type { Metadata } from "next";
import Image from "next/image";
import { Gift, UserPlus, ShoppingCart, Send, Gamepad2, Calendar, Trophy, Shield, Instagram, Heart } from "lucide-react";

import { Ps5Counter } from "@/components/site/ps5-counter";
import { getFollowerCount } from "@/lib/ig-stats";
import { prisma } from "@/lib/prisma";
import { buildMetadata } from "@/lib/seo";

export const metadata: Metadata = buildMetadata({
  title: "Osvoji PS5 + EA SPORTS FC 27 — Dresify nagradna igra",
  description:
    "Zaprati @dresify.hr i skupljaj listiće. Kad dođemo do 10.000 pratitelja, jedan sretnik osvaja PlayStation 5 i EA SPORTS FC 27. Besplatno sudjelovanje.",
  path: "/ps5"
});

export const dynamic = "force-dynamic";

const IG_URL = "https://instagram.com/dresify.hr";
const GOAL = 10000;

async function getBuyerCount(): Promise<number> {
  try {
    return await prisma.customer.count({ where: { totalOrders: { gt: 0 } } });
  } catch {
    return 0;
  }
}

export default async function Ps5Page() {
  const [followers, buyers] = await Promise.all([getFollowerCount(), getBuyerCount()]);

  return (
    <div className="bg-[#0a0a0a] text-white">
      {/* HERO */}
      <section className="relative overflow-hidden border-b border-white/5">
        <div className="mx-auto grid max-w-6xl items-center gap-8 px-5 py-12 md:grid-cols-2 md:py-16">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full border border-accent/40 px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.18em] text-accent">
              <Gift className="h-4 w-4" /> Nagradna igra
            </span>
            <h1 className="mt-5 text-5xl font-black uppercase leading-[0.95] tracking-tight sm:text-6xl">
              Osvoji <span className="text-accent">PS5!</span>
              <span className="mt-1 block text-2xl font-bold tracking-normal sm:text-3xl">
                i <span className="text-accent">EA SPORTS FC 27</span>
              </span>
            </h1>
            <p className="mt-4 max-w-md text-base text-white/70">
              Pridruži se, skupljaj listiće i osvoji <b className="text-white">PlayStation 5</b> i{" "}
              <b className="text-accent">EA SPORTS FC 27</b>. Kad dođemo do 10.000 pratitelja — izvlačimo pobjednika.
            </p>
            <a
              href={IG_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-6 inline-flex items-center gap-2.5 rounded-[12px] bg-accent px-6 py-3.5 text-sm font-bold uppercase tracking-wide text-black transition hover:brightness-95"
            >
              <Instagram className="h-5 w-5" /> Započni igru na Instagramu →
            </a>
            <div className="mt-5 flex flex-wrap gap-x-6 gap-y-2 text-[13px] text-white/55">
              <span className="inline-flex items-center gap-1.5"><Shield className="h-4 w-4 text-accent" /> Besplatno sudjelovanje</span>
              <span className="inline-flex items-center gap-1.5"><Trophy className="h-4 w-4 text-accent" /> Kupci imaju veće šanse</span>
            </div>
          </div>
          <div className="relative">
            <Image
              src="/ps5/hero.png"
              alt="PlayStation 5 i EA SPORTS FC 27 s Dresify dresom"
              width={1536}
              height={1024}
              priority
              sizes="(max-width: 768px) 100vw, 600px"
              className="h-auto w-full rounded-[16px]"
            />
          </div>
        </div>
      </section>

      {/* LIVE COUNTER */}
      <section className="border-b border-white/5 py-12">
        <div className="mx-auto max-w-6xl px-5 text-center">
          <div className="text-xs font-semibold uppercase tracking-[0.2em] text-white/45">Put do 10.000</div>
          <div className="mt-6 flex justify-center">
            <Ps5Counter current={followers} goal={GOAL} />
          </div>
        </div>
      </section>

      {/* KAKO SUDJELOVATI */}
      <section className="py-14">
        <div className="mx-auto max-w-6xl px-5">
          <h2 className="text-center text-2xl font-black uppercase tracking-tight sm:text-3xl">Kako sudjelovati?</h2>
          <div className="mt-8 grid gap-4 md:grid-cols-3">
            {[
              { n: 1, Icon: UserPlus, title: "Zaprati", desc: <>Zaprati <b className="text-white">@dresify.hr</b> i prijavi se — <b className="text-accent">1 listić</b></> },
              { n: 2, Icon: ShoppingCart, title: "Kupi dres i dobij", desc: <><b className="text-accent">+5 listića</b> — veća šansa, svaka narudžba +5</> },
              { n: 3, Icon: Send, title: "Podijeli priču", desc: <>Podijeli na story i označi <b className="text-white">@dresify.hr</b> — dodatni listić</> }
            ].map((s) => (
              <div key={s.n} className="rounded-[16px] border border-white/8 bg-[#111] p-6 text-center">
                <div className="mx-auto flex h-8 w-8 items-center justify-center rounded-full bg-accent text-sm font-bold text-black">{s.n}</div>
                <s.Icon className="mx-auto mt-4 h-8 w-8 text-accent" />
                <div className="mt-3 text-lg font-bold uppercase">{s.title}</div>
                <p className="mt-1.5 text-sm text-white/60">{s.desc}</p>
              </div>
            ))}
          </div>
          <div className="mt-6 flex flex-wrap items-center justify-between gap-4 rounded-[16px] border border-accent/25 bg-accent/[0.06] px-6 py-5">
            <div className="text-lg font-bold uppercase leading-tight">
              Što više se uključiš,<br className="hidden sm:block" /> veće su ti šanse za pobjedu!
            </div>
            <div className="text-right">
              <div className="text-[11px] font-semibold uppercase tracking-wide text-white/45">Već skuplja listiće</div>
              <div className="text-3xl font-black text-accent">{buyers.toLocaleString("hr-HR")}</div>
            </div>
          </div>
        </div>
      </section>

      {/* NAGRADE */}
      <section className="border-t border-white/5 py-14">
        <div className="mx-auto max-w-6xl px-5">
          <h2 className="text-center text-2xl font-black uppercase tracking-tight sm:text-3xl">Nagrade</h2>
          <div className="mt-8 flex flex-col items-center justify-center gap-6 sm:flex-row sm:gap-10">
            <div className="flex items-center gap-4 rounded-[16px] border border-white/8 bg-[#111] px-7 py-6">
              <Gamepad2 className="h-10 w-10 text-accent" />
              <div>
                <div className="text-xl font-bold">PlayStation 5</div>
                <div className="text-xs uppercase tracking-wide text-white/45">Glavna nagrada</div>
              </div>
            </div>
            <div className="flex h-10 w-10 items-center justify-center rounded-full border border-accent/40 text-2xl font-bold text-accent">+</div>
            <div className="flex items-center gap-4 rounded-[16px] border border-white/8 bg-[#111] px-7 py-6">
              <span className="text-2xl font-black italic text-accent">FC27</span>
              <div>
                <div className="text-xl font-bold">EA SPORTS FC 27</div>
                <div className="text-xs uppercase tracking-wide text-white/45">Uz PS5</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* TRAJANJE / IZVLAČENJE */}
      <section className="border-t border-white/5 py-12">
        <div className="mx-auto grid max-w-4xl gap-4 px-5 sm:grid-cols-2">
          <div className="flex items-start gap-4 rounded-[16px] border border-white/8 bg-[#111] p-6">
            <Calendar className="h-7 w-7 shrink-0 text-accent" />
            <div>
              <div className="font-bold uppercase">Trajanje igre</div>
              <p className="mt-1 text-sm text-white/60">Igra traje do <b className="text-white">10.000 pratitelja</b>. Nakon toga slijedi izvlačenje.</p>
            </div>
          </div>
          <div className="flex items-start gap-4 rounded-[16px] border border-white/8 bg-[#111] p-6">
            <Trophy className="h-7 w-7 shrink-0 text-accent" />
            <div>
              <div className="font-bold uppercase">Izvlačenje pobjednika</div>
              <p className="mt-1 text-sm text-white/60">Izvlačenje uživo, odmah čim dođemo do 10.000 pratitelja.</p>
            </div>
          </div>
        </div>
      </section>

      {/* FOOTER TRUST */}
      <section className="border-t border-white/5 py-10">
        <div className="mx-auto grid max-w-4xl gap-6 px-5 text-center sm:grid-cols-3">
          <div>
            <Shield className="mx-auto h-6 w-6 text-accent" />
            <div className="mt-2 text-xs font-bold uppercase tracking-wide text-accent">Pošteno i transparentno</div>
            <p className="text-xs text-white/45">Svi listići se provjeravaju</p>
          </div>
          <a href={IG_URL} target="_blank" rel="noopener noreferrer" className="group">
            <Instagram className="mx-auto h-6 w-6 text-accent" />
            <div className="mt-2 text-xs font-bold uppercase tracking-wide text-accent">Službeni Instagram</div>
            <p className="text-xs text-white/45 group-hover:text-white/70">@dresify.hr</p>
          </a>
          <div>
            <Heart className="mx-auto h-6 w-6 text-accent" />
            <div className="mt-2 text-xs font-bold uppercase tracking-wide text-accent">Sretno svima</div>
            <p className="text-xs text-white/45">Neka najbolji osvoji</p>
          </div>
        </div>
      </section>
    </div>
  );
}
