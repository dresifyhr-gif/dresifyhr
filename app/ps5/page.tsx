import type { Metadata } from "next";
import Image from "next/image";
import { Gift, UserPlus, ShoppingCart, Send, Gamepad2, Calendar, Trophy, Shield, Instagram, Heart } from "lucide-react";

import { Ps5Counter } from "@/components/site/ps5-counter";
import { GiveawayEntryForm } from "@/components/site/giveaway-entry-form";
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
              className="ps5-drift h-auto w-full rounded-[16px]"
            />
            {/* Pulsirajući lime neon glow preko slike (screen blend → dodaje svjetlo, ne skriva PS5) */}
            <div
              aria-hidden
              className="ps5-neon pointer-events-none absolute inset-0 rounded-[16px]"
              style={{ background: "radial-gradient(circle at 55% 42%, rgba(232,255,60,0.5), transparent 55%)" }}
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

          <div className="mx-auto mt-10 max-w-lg">
            <div className="text-lg font-bold uppercase tracking-tight text-white">Prijavi se u nagradnu igru</div>
            <p className="mb-4 mt-1 text-sm text-white/55">Zapratio si nas? Upiši svoj Instagram da uđeš u bubanj.</p>
            <GiveawayEntryForm />
          </div>
        </div>
      </section>

      {/* KAKO SUDJELOVATI */}
      <section className="py-14">
        <div className="mx-auto max-w-6xl px-5">
          <h2 className="text-center text-2xl font-black uppercase tracking-tight sm:text-3xl">Kako sudjelovati?</h2>
          <div className="mt-8 grid gap-4 md:grid-cols-3">
            {[
              { n: 1, Icon: UserPlus, title: "Zaprati", desc: <>Zaprati <b className="text-white">@dresify.hr</b> i prijavi se — <b className="text-accent">1 bod</b></> },
              { n: 2, Icon: ShoppingCart, title: "Kupi dres i dobij", desc: <><b className="text-accent">+5 bodova</b> — veća šansa, svaka narudžba +5</> },
              { n: 3, Icon: Send, title: "Podijeli priču", desc: <>Podijeli na story i označi <b className="text-white">@dresify.hr</b> — dodatni bod</> }
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
              <div className="text-[11px] font-semibold uppercase tracking-wide text-white/45">Već skuplja bodove</div>
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
              <p className="mt-1 text-sm text-white/60">
                Čim dođemo do 10.000 pratitelja, <b className="text-white">uživo snimamo nasumično izvlačenje</b> (random picker) i objavljujemo pobjednika na našem Instagram storyju — da svi vide da je pošteno.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* KAKO FUNKCIONIRA / PRAVILA */}
      <section className="border-t border-white/5 py-14">
        <div className="mx-auto max-w-3xl px-5">
          <h2 className="text-center text-2xl font-black uppercase tracking-tight sm:text-3xl">Kako funkcionira</h2>
          <div className="mt-6 space-y-3">
            {[
              { t: "Skupljaš bodove", d: "Svaki bod je jedna prilika u bubnju. Više bodova = veća šansa za pobjedu, ali svi mogu sudjelovati besplatno." },
              { t: "Zaprati + prijavi se = 1 bod", d: "Zaprati @dresify.hr i upiši svoj Instagram na ovoj stranici — time ulaziš u igru." },
              { t: "Kupnja = +5 bodova", d: "Svaka narudžba dresa ti daje dodatnih 5 bodova. Što više naručuješ, to su ti šanse veće." },
              { t: "Registriraj se za automatsko brojanje", d: "Ako imaš Dresify račun i upišeš Instagram u profil, sve tvoje kupnje se same broje — ne moraš ništa raditi." },
              { t: "Izvlačenje na 10.000 pratitelja", d: "Kad dosegnemo cilj, snimamo uživo nasumično izvlačenje i objavljujemo tko je pobijedio. Pobjednik osvaja PlayStation 5 + EA SPORTS FC 27." }
            ].map((r, i) => (
              <div key={i} className="flex gap-3 rounded-[14px] border border-white/8 bg-[#111] p-4">
                <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-accent text-xs font-bold text-black">{i + 1}</div>
                <div>
                  <div className="text-[15px] font-bold text-white">{r.t}</div>
                  <p className="mt-0.5 text-sm text-white/55">{r.d}</p>
                </div>
              </div>
            ))}
          </div>
          <div className="mt-5 rounded-[12px] border border-white/8 bg-white/[0.03] px-4 py-3 text-center text-[13px] text-white/55">
            <b className="text-white/80">Važno:</b> pobjednik <b className="text-white/80">mora pratiti @dresify.hr</b> u trenutku izvlačenja. Ako izvučeni ne prati, dobitak je nevažeći i odmah izvlačimo novog pobjednika.
          </div>
          <p className="mt-3 text-center text-xs text-white/35">
            Nagradna igra nije sponzorirana ni povezana s Instagramom. Kupnja nije obavezna za sudjelovanje.
          </p>
        </div>
      </section>

      {/* FOOTER TRUST */}
      <section className="border-t border-white/5 py-10">
        <div className="mx-auto grid max-w-4xl gap-6 px-5 text-center sm:grid-cols-3">
          <div>
            <Shield className="mx-auto h-6 w-6 text-accent" />
            <div className="mt-2 text-xs font-bold uppercase tracking-wide text-accent">Pošteno i transparentno</div>
            <p className="text-xs text-white/45">Izvlačenje uživo na snimci</p>
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
