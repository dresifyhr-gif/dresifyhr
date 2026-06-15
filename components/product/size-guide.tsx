"use client";

import { useEffect, useState } from "react";
import { Ruler, X } from "lucide-react";

const KIDS = [
  { size: "104", height: "98–104 cm", age: "3–4 god." },
  { size: "116", height: "110–116 cm", age: "5–6 god." },
  { size: "128", height: "116–128 cm", age: "7–8 god." },
  { size: "140", height: "128–140 cm", age: "9–10 god." },
  { size: "152", height: "140–152 cm", age: "11–12 god." },
  { size: "164", height: "152–164 cm", age: "13–14 god." },
  { size: "176", height: "164–176 cm", age: "15–16 god." },
];

const ADULTS = [
  { size: "S", chest: "88–96 cm", length: "70 cm" },
  { size: "M", chest: "96–104 cm", length: "72 cm" },
  { size: "L", chest: "104–112 cm", length: "74 cm" },
  { size: "XL", chest: "112–120 cm", length: "76 cm" },
  { size: "XXL", chest: "120–128 cm", length: "78 cm" },
];

export function SizeGuide() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (typeof document === "undefined") return;
    document.body.style.overflow = open ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-[0.16em] text-accent transition hover:text-white"
      >
        <Ruler className="h-3.5 w-3.5" />
        Vodič za veličine
      </button>

      {open ? (
        <div
          className="fixed inset-0 z-[100] flex items-end justify-center bg-black/70 p-0 sm:items-center sm:p-4"
          onClick={() => setOpen(false)}
        >
          <div
            className="relative w-full max-w-lg overflow-hidden rounded-t-[16px] border border-white/10 bg-[#111111] sm:rounded-[16px]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-white/10 px-5 py-4">
              <h2 className="font-heading text-lg uppercase tracking-[0.04em] text-white">Vodič za veličine</h2>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Zatvori"
                className="flex h-8 w-8 items-center justify-center rounded-[6px] text-white/60 transition hover:bg-white/10 hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="max-h-[70vh] overflow-y-auto px-5 py-5">
              {/* Djeca */}
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-accent">Djeca</p>
              <table className="mt-3 w-full text-sm">
                <thead>
                  <tr className="text-left text-[11px] uppercase tracking-[0.14em] text-white/40">
                    <th className="pb-2 font-medium">Veličina</th>
                    <th className="pb-2 font-medium">Visina</th>
                    <th className="pb-2 font-medium">Dob (okvirno)</th>
                  </tr>
                </thead>
                <tbody className="text-white/80">
                  {KIDS.map((row) => (
                    <tr key={row.size} className="border-t border-white/8">
                      <td className="py-2 font-semibold text-white">{row.size}</td>
                      <td className="py-2">{row.height}</td>
                      <td className="py-2 text-white/55">{row.age}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Odrasli */}
              <p className="mt-6 text-xs font-semibold uppercase tracking-[0.24em] text-accent">Odrasli</p>
              <table className="mt-3 w-full text-sm">
                <thead>
                  <tr className="text-left text-[11px] uppercase tracking-[0.14em] text-white/40">
                    <th className="pb-2 font-medium">Veličina</th>
                    <th className="pb-2 font-medium">Grudi (opseg)</th>
                    <th className="pb-2 font-medium">Dužina</th>
                  </tr>
                </thead>
                <tbody className="text-white/80">
                  {ADULTS.map((row) => (
                    <tr key={row.size} className="border-t border-white/8">
                      <td className="py-2 font-semibold text-white">{row.size}</td>
                      <td className="py-2">{row.chest}</td>
                      <td className="py-2 text-white/55">{row.length}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <p className="mt-6 rounded-[8px] border border-white/10 bg-[#0a0a0a] p-3 text-[13px] leading-5 text-white/55">
                💡 <span className="text-white/75">Savjet:</span> uzmi majicu koja trenutno dobro stoji, raširi je i izmjeri širinu ispod pazuha i dužinu. Ako si između dvije veličine, uzmi veću. Nisi siguran/na? Pošalji nam visinu na WhatsApp i predložit ćemo veličinu.
              </p>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
