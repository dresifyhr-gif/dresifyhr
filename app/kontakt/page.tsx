"use client";

import { motion } from "framer-motion";
import { Mail, Phone, MessageCircle, Instagram, Facebook, Music2 } from "lucide-react";
import Link from "next/link";

import { useShopSettings, useWhatsAppUrl, useInstagram } from "@/contexts/shop-settings-context";

const FACEBOOK_URL = "https://facebook.com/dresifyshop";
const TIKTOK_URL = "https://tiktok.com/@dresify.shop";

const buildChannels = (WHATSAPP_URL: string, INSTAGRAM_URL: string, CONTACT_EMAIL: string, CONTACT_PHONE_DISPLAY: string) => [
  {
    icon: MessageCircle,
    label: "WhatsApp Business",
    value: "+385 97 604 7510",
    desc: "Najbrži odgovor — odgovaramo u roku sat vremena",
    href: WHATSAPP_URL,
    cta: "Piši na WhatsApp",
    color: "from-[#25D366]/20 to-[#128C7E]/10",
    border: "border-[#25D366]/30",
    iconBg: "bg-[#25D366]/10",
    iconColor: "text-[#25D366]",
  },
  {
    icon: Instagram,
    label: "Instagram",
    value: "@dresify.hr",
    desc: "Pogledaj katalog i pošalji DM za narudžbu",
    href: INSTAGRAM_URL,
    cta: "Otvori Instagram",
    color: "from-[#E1306C]/20 to-[#833AB4]/10",
    border: "border-[#E1306C]/30",
    iconBg: "bg-[#E1306C]/10",
    iconColor: "text-[#E1306C]",
  },
  {
    icon: Facebook,
    label: "Facebook",
    value: "dresify shop",
    desc: "Pratite nas za novosti, akcije i nova izdanja",
    href: FACEBOOK_URL,
    cta: "Otvori Facebook",
    color: "from-[#1877F2]/20 to-[#0d5cbf]/10",
    border: "border-[#1877F2]/30",
    iconBg: "bg-[#1877F2]/10",
    iconColor: "text-[#1877F2]",
  },
  {
    icon: Music2,
    label: "TikTok",
    value: "@dresify.shop",
    desc: "Pratite nas za kratke videe, unboxinge i nova izdanja",
    href: TIKTOK_URL,
    cta: "Otvori TikTok",
    color: "from-[#010101]/60 to-[#69C9D0]/10",
    border: "border-[#69C9D0]/30",
    iconBg: "bg-[#69C9D0]/10",
    iconColor: "text-[#69C9D0]",
  },
  {
    icon: Mail,
    label: "Email",
    value: CONTACT_EMAIL,
    desc: "Za suradnje, veće narudžbe ili pitanja",
    href: `mailto:${CONTACT_EMAIL}`,
    cta: "Pošalji email",
    color: "from-[#e2ff54]/10 to-[#b8cc30]/5",
    border: "border-[#e2ff54]/20",
    iconBg: "bg-[#e2ff54]/10",
    iconColor: "text-[#e2ff54]",
  },
  {
    icon: Phone,
    label: "Telefon",
    value: CONTACT_PHONE_DISPLAY,
    desc: "Dostupni radnim danima 9–20h",
    href: `tel:+385976047510`,
    cta: "Pozovi",
    color: "from-white/5 to-white/[0.02]",
    border: "border-white/10",
    iconBg: "bg-white/5",
    iconColor: "text-white",
  },
];

export default function KontaktPage() {
  const { contactEmail, contactPhone } = useShopSettings();
  const whatsappUrl = useWhatsAppUrl();
  const ig = useInstagram();
  const channels = buildChannels(whatsappUrl, ig.url, contactEmail, contactPhone);
  return (
    <main className="bg-[#0a0a0a] min-h-screen">

      {/* Hero */}
      <section className="relative pt-24 pb-16 overflow-hidden">
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
              Kontakt
            </span>
            <h1 className="text-4xl md:text-6xl font-black uppercase text-white leading-tight mb-4">
              Tu smo za{" "}
              <span className="text-[#e2ff54]">tebe</span>
            </h1>
            <p className="text-lg text-white/50 max-w-xl mx-auto">
              Odaberi kanal koji ti najviše odgovara — odgovaramo brzo, bez čekanja.
            </p>
          </motion.div>
        </div>
      </section>

      {/* Channels grid */}
      <section className="pb-24">
        <div className="max-w-4xl mx-auto px-6">
          <div className="grid md:grid-cols-2 gap-4">
            {channels.map((ch, i) => (
              <motion.div
                key={ch.label}
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.07 }}
              >
                <Link
                  href={ch.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`group flex flex-col gap-4 p-6 rounded-2xl border bg-gradient-to-br ${ch.color} ${ch.border} hover:scale-[1.02] transition-transform duration-200 block`}
                >
                  <div className="flex items-center gap-4">
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${ch.iconBg}`}>
                      <ch.icon className={`w-6 h-6 ${ch.iconColor}`} />
                    </div>
                    <div>
                      <div className="text-xs font-bold uppercase tracking-widest text-white/40 mb-0.5">
                        {ch.label}
                      </div>
                      <div className="font-bold text-white text-lg leading-tight">
                        {ch.value}
                      </div>
                    </div>
                  </div>

                  <p className="text-sm text-white/50 leading-relaxed">
                    {ch.desc}
                  </p>

                  <div className={`text-sm font-bold uppercase tracking-wider ${ch.iconColor} flex items-center gap-1.5`}>
                    {ch.cta}
                    <span className="group-hover:translate-x-1 transition-transform duration-200">→</span>
                  </div>
                </Link>
              </motion.div>
            ))}
          </div>

          {/* Response time note */}
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            className="mt-10 text-center text-sm text-white/30"
          >
            ⚡ Prosječno vrijeme odgovora: <span className="text-white/60 font-semibold">manje od sat vremena</span>
          </motion.div>
        </div>
      </section>

    </main>
  );
}
