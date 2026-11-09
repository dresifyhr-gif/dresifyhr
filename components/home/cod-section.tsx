import { ArrowLeftRight } from "lucide-react";

import type { Translations } from "@/lib/i18n";
import { FREE_SHIPPING_THRESHOLD_EUR, SHIPPING_PRICE_EUR } from "@/lib/site";

// "Bez plaćanja unaprijed. Platiš kad stigne." — najveći strah kupca s reklame je
// platiti unaprijed. Iznosi se računaju iz konstanti (lib/site), ne pišu se ručno.
export function CodSection({ index = "04", basePrice = 20, t }: { index?: string; basePrice?: number; t: Translations["drop"] }) {
  const total = basePrice + SHIPPING_PRICE_EUR;
  const steps = t.codSteps.map((st, i) => ({ ...st, k: String(i + 1).padStart(2, "0"), hl: i === t.codSteps.length - 1 }));
  const [f1, f2, f3] = t.codFacts;

  return (
    <section className="pt-20 lg:pt-28">
      <div className="page-shell grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:gap-16">
        <div>
          <div className="idx">
            <b>{index}</b>
            {t.codKicker}
          </div>
          <h2 className="font-display text-[64px] uppercase leading-[0.95] text-fg lg:text-[96px]">
            <span className="block">{t.codTitle[0]}</span>
            <span className="block">{t.codTitle[1]}</span>
            <span className="block text-accent">{t.codTitle[2]}</span>
            <span className="block text-accent">{t.codTitle[3]}</span>
          </h2>
          <p className="mt-3.5 max-w-[520px] text-[14.5px] font-medium leading-[1.45] text-[#c4c4bd]">
            {t.codText(basePrice, SHIPPING_PRICE_EUR, total)}
          </p>
        </div>

        <div className="lg:pt-8">
          <ol className="border-t border-white/10">
            {steps.map((s) => (
              <li key={s.k} className="grid grid-cols-[46px_1fr_auto] items-center gap-2.5 border-b border-white/10 py-[18px]">
                <span className={`font-display text-[30px] leading-none ${s.hl ? "text-accent" : "text-mute2"}`}>{s.k}</span>
                <div>
                  <b className="block text-[15px] font-black uppercase leading-[1.2] tracking-[0.02em] text-fg">{s.title}</b>
                  <small className="mt-[3px] block text-[12.5px] font-medium leading-[1.35] text-mute">{s.text}</small>
                </div>
                <span
                  className={`whitespace-nowrap rounded-full border px-2 py-[7px] text-[10px] font-black uppercase leading-none tracking-[0.1em] ${
                    s.hl ? "border-accent bg-accent text-black" : "border-white/[0.18] bg-ink3 text-fg"
                  }`}
                >
                  {s.pill}
                </span>
              </li>
            ))}
          </ol>

          <div className="mt-[22px] grid grid-cols-3 border border-white/10">
            <div className="border-r border-white/10 px-2.5 py-4 text-center">
              <b className="block font-display text-[30px] font-normal leading-none text-fg">{SHIPPING_PRICE_EUR} €</b>
              <small className="mt-1.5 block text-[9.5px] font-bold uppercase leading-[1.25] tracking-[0.1em] text-mute">
                {f1[0]}
                <br />
                {f1[1]}
              </small>
            </div>
            <div className="border-r border-white/10 px-2.5 py-4 text-center">
              <b className="block font-display text-[30px] font-normal leading-none text-fg">2–5</b>
              <small className="mt-1.5 block text-[9.5px] font-bold uppercase leading-[1.25] tracking-[0.1em] text-mute">
                {f2[0]}
                <br />
                {f2[1]}
              </small>
            </div>
            <div className="px-2.5 py-4 text-center">
              <b className="flex h-[30px] items-center justify-center text-fg">
                <ArrowLeftRight className="h-7 w-7" strokeWidth={2} />
              </b>
              <small className="mt-1.5 block text-[9.5px] font-bold uppercase leading-[1.25] tracking-[0.1em] text-mute">
                {f3[0]}
                <br />
                {f3[1]}
              </small>
            </div>
          </div>
          <p className="mt-3 text-[12px] font-medium leading-[1.4] text-mute">
            {t.codFree(FREE_SHIPPING_THRESHOLD_EUR)}
          </p>
        </div>
      </div>
    </section>
  );
}
