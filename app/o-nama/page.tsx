"use client";

import { motion } from "framer-motion";
import { Heart, Package, Shirt, Truck, Zap, Shield } from "lucide-react";
import Link from "next/link";

export default function ONamaPage() {
  const stats = [
    { value: "500+", label: "zadovoljnih kupaca" },
    { value: "100+", label: "dresova u katalogu" },
    { value: "20€", label: "fiksna cijena" },
    { value: "2–5 dana", label: "dostava po HR" },
  ];

  const values = [
    {
      icon: Shirt,
      title: "Dresovi koje stvarno nosiš",
      desc: "Nije sve u skupim originalima. Mi nudimo dresove koji izgledaju odlično, po cijeni koja ima smisla.",
    },
    {
      icon: Truck,
      title: "Dostava po cijeloj Hrvatskoj",
      desc: "Šaljemo brzom poštom na svaku adresu u Hrvatskoj. Pakiranje je uredno, dostava brza.",
    },
    {
      icon: Zap,
      title: "Narudžba za 2 minute",
      desc: "Bez registracije, bez komplikacija. Odabereš dres, veličinu, pošalješ upit — gotovo.",
    },
    {
      icon: Shield,
      title: "Jednostavan povrat",
      desc: "Nije ti odgovarala veličina? Bez problema — javi nam se i riješimo to zajedno.",
    },
  ];

  return (
    <main className="bg-[#0a0a0a] min-h-screen">

      {/* Hero */}
      <section className="relative pt-24 pb-16 overflow-hidden">
        {/* Bg glow */}
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[400px] bg-[#e2ff54]/5 rounded-full blur-[120px]" />
        </div>

        <div className="max-w-3xl mx-auto px-6 text-center relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <span className="inline-block text-xs font-bold tracking-widest uppercase text-[#e2ff54] border border-[#e2ff54]/30 px-4 py-1.5 rounded-full mb-6">
              O nama
            </span>

            <h1 className="text-4xl md:text-6xl font-black uppercase text-white leading-tight mb-6">
              Dresovi za{" "}
              <span className="text-[#e2ff54]">prave navijače</span>
            </h1>

            <p className="text-lg text-white/60 leading-relaxed max-w-2xl mx-auto">
              Dresify je nastao iz jednostavne ideje — da svaki navijač
              može imati dres svog idola, bez da troši cijelu plaću.
              Fiksna cijena, brza dostava, bez komplikacija.
            </p>
          </motion.div>
        </div>
      </section>

      {/* Stats */}
      <section className="py-12 border-y border-white/5">
        <div className="max-w-4xl mx-auto px-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {stats.map((s, i) => (
              <motion.div
                key={s.label}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.08 }}
                className="text-center"
              >
                <div className="text-3xl md:text-4xl font-black text-[#e2ff54] mb-1">
                  {s.value}
                </div>
                <div className="text-sm text-white/40 uppercase tracking-wide">
                  {s.label}
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Story */}
      <section className="py-20">
        <div className="max-w-3xl mx-auto px-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="space-y-6 text-white/70 text-lg leading-relaxed"
          >
            <p>
              Tako je nastao Dresify. Ideja je bila jednostavna:{" "}
              <span className="text-white font-semibold">
                jedan dres, jedna cijena, brza dostava
              </span>
              . Bez skrivenih troškova, bez čekanja tjednima, bez
              razočaranja kad paket stigne.
            </p>
            <p>
              Danas imamo više od 100 modela u katalogu — od aktualnih
              zvijezda poput Yamal i Mbappéa do retro klasika koje nosi
              svaka generacija. Svaki dres šaljemo s pažnjom, uredno
              upakiran, na svaku adresu u Hrvatskoj.
            </p>
            <p className="flex items-center gap-2 text-white/50 text-base">
              <Heart className="w-4 h-4 text-[#e2ff54] shrink-0" />
              Izrađeno s ljubavlju prema fudbalu, iz Hrvatske.
            </p>
          </motion.div>
        </div>
      </section>

      {/* Values */}
      <section className="py-16 border-t border-white/5">
        <div className="max-w-4xl mx-auto px-6">
          <motion.h2
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-2xl md:text-3xl font-black uppercase text-white text-center mb-12"
          >
            Zašto <span className="text-[#e2ff54]">Dresify</span>?
          </motion.h2>

          <div className="grid md:grid-cols-2 gap-5">
            {values.map((v, i) => (
              <motion.div
                key={v.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.08 }}
                className="bg-white/[0.03] border border-white/8 rounded-2xl p-6 flex gap-4"
              >
                <div className="w-10 h-10 rounded-xl bg-[#e2ff54]/10 flex items-center justify-center shrink-0">
                  <v.icon className="w-5 h-5 text-[#e2ff54]" />
                </div>
                <div>
                  <h3 className="font-bold text-white mb-1">{v.title}</h3>
                  <p className="text-sm text-white/50 leading-relaxed">{v.desc}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20">
        <div className="max-w-xl mx-auto px-6 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <Package className="w-10 h-10 text-[#e2ff54] mx-auto mb-4" />
            <h2 className="text-2xl md:text-3xl font-black uppercase text-white mb-4">
              Spreman za novi dres?
            </h2>
            <p className="text-white/50 mb-8">
              Pogledaj katalog i pronađi dres koji tražiš.
            </p>
            <Link
              href="/dresovi"
              className="inline-block bg-[#e2ff54] text-black font-black uppercase tracking-wider px-10 py-4 rounded-full hover:bg-[#d4f040] transition-colors"
            >
              Pogledaj dresove
            </Link>
          </motion.div>
        </div>
      </section>

    </main>
  );
}
