"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";

import { useShopSettings } from "@/contexts/shop-settings-context";
import { deadlineEnd, deadlineLabel } from "@/lib/christmas";

const GOLD = "#E3B85C";
const CARDS = [
  { price: "Do 30 €", text: "Dres + lopta ili kapa", img: "/bozic/pk-dres.webp", w: 700, h: 461, href: "/slozi-mix", pos: "right-[-2%] bottom-[-2%] w-[62%]" },
  { price: "Do 40 €", text: "Dres + lopta + kapa", img: "/bozic/pk-djed.webp", w: 700, h: 1050, href: "/slozi-mix", pos: "right-[-4%] bottom-[-6%] h-[104%] w-auto" },
  { price: "Do 55 €", text: "Trenirka ili dugi rukav + lopta i kapa", img: "/bozic/pk-trenirka.webp", w: 700, h: 595, href: "/slozi-mix?vrsta=trenirka", pos: "right-[-2%] bottom-[-4%] w-[58%]" }
];

function Countdown({ deadline }: { deadline: string }) {
  const [txt, setTxt] = useState("");
  useEffect(() => {
    const tick = () => {
      const left = Math.max(0, Math.floor((deadlineEnd(deadline) - Date.now()) / 1000));
      const d = Math.floor(left / 86400), h = Math.floor((left % 86400) / 3600), m = Math.floor((left % 3600) / 60), s = left % 60;
      setTxt(left ? `${d} d  ${String(h).padStart(2, "0")} h  ${String(m).padStart(2, "0")} min  ${String(s).padStart(2, "0")} s` : "");
    };
    tick();
    const id = window.setInterval(tick, 1000);
    return () => window.clearInterval(id);
  }, [deadline]);
  if (!txt) return null;
  return (
    <div className="mb-6 inline-flex items-center gap-3 rounded-full border px-4 py-2.5 text-[13px] font-semibold text-white sm:mb-7" style={{ borderColor: "rgba(227,184,92,.35)" }}>
      <span className="text-[10.5px] font-extrabold tracking-[0.2em]" style={{ color: GOLD }}>ZADNJI ROK {deadlineLabel(deadline)}</span>
      <span className="tabular-nums tracking-[0.04em]">{txt}</span>
    </div>
  );
}

// "Pokloni po budžetu" — samo dok je uključena božićna tema.
export function GiftsByBudget() {
  const { christmasOn, christmasDeadline } = useShopSettings();
  if (!christmasOn) return null;
  return (
    <section className="bg-black">
      <div className="page-shell py-12 sm:py-14">
        <div className="flex items-center gap-3 text-[11px] font-extrabold tracking-[0.28em]" style={{ color: GOLD }}>
          <span className="h-px w-7" style={{ background: GOLD }} />
          BOŽIĆNI VODIČ ZA POKLONE
        </div>
        <h2 className="mt-3 font-heading text-[clamp(2.2rem,5vw,4rem)] uppercase leading-[0.95] text-white">
          Pokloni po <span className="text-accent">budžetu.</span>
        </h2>
        <p className="mb-3.5 mt-2 text-[15px] text-white/60">Svaki poklon stiže u kutiji — plaćaš tek kad stigne.</p>
        <Countdown deadline={christmasDeadline} />
        <div className="grid gap-4 md:grid-cols-3">
          {CARDS.map((c, i) => (
            <Link
              key={c.price}
              href={c.href}
              className="group relative block h-[320px] overflow-hidden rounded-[20px] border sm:h-[360px]"
              style={{ borderColor: "rgba(227,184,92,.22)", background: "radial-gradient(ellipse 90% 75% at 75% 85%,#1f5a43,#0E2A20 58%,#07170f)" }}
            >
              <span className="absolute inset-x-0 top-0 h-[2px] opacity-70" style={{ background: `linear-gradient(90deg,transparent,${GOLD},transparent)` }} />
              <Image
                src={c.img}
                alt=""
                width={c.w}
                height={c.h}
                sizes="(max-width: 768px) 70vw, 25vw"
                className={`absolute object-contain drop-shadow-[0_22px_30px_rgba(0,0,0,.45)] transition-transform duration-500 ease-out group-hover:-translate-y-1.5 group-hover:scale-[1.03] ${c.pos}`}
              />
              <div className="relative z-[2] max-w-[48%] p-6">
                <div className="text-[11px] font-extrabold tracking-[0.24em]" style={{ color: GOLD }}>POKLON {i + 1}</div>
                <div className="mt-2 whitespace-nowrap font-heading text-[46px] uppercase leading-[0.95] text-white sm:text-[56px]">{c.price}</div>
                <div className="mt-2 text-[14px] leading-snug text-white/70">{c.text}</div>
              </div>
              <span className="absolute bottom-[22px] left-6 z-[3] rounded-full bg-accent px-[18px] py-2.5 text-[13px] font-extrabold text-black">
                Složi poklon →
              </span>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
