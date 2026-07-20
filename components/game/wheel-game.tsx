"use client";

import { useMemo, useRef, useState } from "react";

import { PROMO_STORAGE_KEY } from "@/components/site/promo-capture";

// Kolo sreće. Ishod bira SERVER (lib/kolo.ts) — ovdje samo animiramo kolo do
// polja koje nam server javi, pa preglednik ne može namjestiti dobitak.
//
// Brzina: cijelo kolo je JEDAN element koji se vrti preko `transform: rotate`
// (GPU, ne izaziva ponovni izračun stilova). Bez biblioteka i bez sjena na
// poljima — vidi pravila brzine u CLAUDE memoriji.

type Segment = { id: string; label: string };

// Redoslijed mora odgovarati PRIZES u lib/kolo.ts (isti indeksi).
const SEGMENTS: Segment[] = [
  { id: "none", label: "Nema dobitka" },
  { id: "p5", label: "5% popusta" },
  { id: "respin", label: "Ponovno\nokretanje" },
  { id: "p10", label: "10% popusta" },
  { id: "freeship", label: "Besplatna\ndostava" },
  { id: "p20", label: "20% popusta" },
  { id: "dres", label: "GRATIS\nDRES" }
];

const SEG = 360 / SEGMENTS.length;
const SPIN_MS = 4200;

type Result = { prize: string; label: string; code: string | null; left: number };

export function WheelGame() {
  const [phone, setPhone] = useState("");
  const [angle, setAngle] = useState(0);
  const [spinning, setSpinning] = useState(false);
  const [result, setResult] = useState<Result | null>(null);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);
  const turns = useRef(0);

  // Naizmjenične boje polja + istaknuta glavna nagrada.
  const wheelBg = useMemo(() => {
    const stops = SEGMENTS.map((s, i) => {
      const color = s.id === "dres" ? "#e8ff3c" : s.id === "none" ? "#1c1c1e" : i % 2 === 0 ? "#2c2c2e" : "#3a3a3c";
      return `${color} ${i * SEG}deg ${(i + 1) * SEG}deg`;
    });
    return `conic-gradient(from ${-SEG / 2}deg, ${stops.join(", ")})`;
  }, []);

  async function doSpin() {
    if (spinning) return;
    setError("");
    setResult(null);

    const tel = phone.trim();
    if (tel.replace(/\D/g, "").length < 9) {
      setError("Upiši svoj broj mobitela.");
      return;
    }

    setSpinning(true);
    const res = await fetch("/api/kolo/spin/", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ phone: tel })
    }).then((r) => r.json()).catch(() => null);

    if (!res?.ok) {
      setSpinning(false);
      setError(
        res?.reason === "no_spins" ? "Nemaš više vrtnji. Svaka narudžba od 60 € donosi novu 🎁"
          : res?.reason === "off" ? "Kolo trenutno ne radi."
          : "Nešto je pošlo po zlu — pokušaj ponovno."
      );
      return;
    }

    const idx = Math.max(0, SEGMENTS.findIndex((s) => s.id === res.prize));
    // Nekoliko punih krugova pa zaustavljanje na sredini dobivenog polja.
    turns.current += 5;
    setAngle(turns.current * 360 - idx * SEG);

    window.setTimeout(() => {
      setSpinning(false);
      setResult({ prize: res.prize, label: res.label, code: res.code, left: res.left });
    }, SPIN_MS);
  }

  function useCode() {
    if (!result?.code) return;
    try { window.localStorage.setItem(PROMO_STORAGE_KEY, result.code); } catch { /* privatni način rada */ }
    window.location.href = "/dresovi/";
  }

  async function copyCode() {
    if (!result?.code) return;
    try {
      await navigator.clipboard.writeText(result.code);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch { /* bez međuspremnika — kupac može prepisati ručno */ }
  }

  const won = !!result && result.prize !== "none" && result.prize !== "respin";

  return (
    <div className="flex flex-col items-center gap-6">
      {/* Kolo */}
      <div className="relative">
        {/* Kazaljka */}
        <div
          aria-hidden
          className="absolute left-1/2 top-[-6px] z-10 h-0 w-0 -translate-x-1/2"
          style={{ borderLeft: "12px solid transparent", borderRight: "12px solid transparent", borderTop: "20px solid #e8ff3c" }}
        />
        <div
          className="h-[300px] w-[300px] rounded-full border-4 border-[#e8ff3c] sm:h-[360px] sm:w-[360px]"
          style={{
            background: wheelBg,
            transform: `rotate(${angle}deg)`,
            transition: spinning ? `transform ${SPIN_MS}ms cubic-bezier(0.17, 0.67, 0.12, 0.99)` : "none",
            willChange: "transform"
          }}
        >
          {/* Svaki natpis sjedi u punom kvadratu koji se zavrti do sredine svog
              polja; tekst je pri vrhu, pa ispada uz vanjski rub kolo. */}
          {SEGMENTS.map((s, i) => (
            <div key={s.id} className="absolute inset-0" style={{ transform: `rotate(${i * SEG}deg)` }}>
              <span
                className={`absolute left-1/2 top-[7%] w-[74px] -translate-x-1/2 text-center text-[10px] font-bold leading-[1.15] sm:w-[86px] sm:text-[12px] ${
                  s.id === "dres" ? "text-black" : "text-white"
                }`}
                style={{ whiteSpace: "pre-line" }}
              >
                {s.label}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Unos i gumb */}
      {!won && (
        <div className="w-full max-w-sm">
          <label htmlFor="kolo-tel" className="mb-1.5 block text-[13px] text-white/70">
            Broj mobitela (da znamo čija je nagrada)
          </label>
          <input
            id="kolo-tel"
            type="tel"
            inputMode="tel"
            autoComplete="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="09x xxx xxxx"
            disabled={spinning}
            className="w-full rounded-xl border border-white/15 bg-white/5 px-4 py-3 text-white placeholder:text-white/30 focus:border-accent focus:outline-none disabled:opacity-50"
          />
          <button
            type="button"
            onClick={doSpin}
            disabled={spinning}
            className="mt-3 w-full rounded-xl bg-accent px-6 py-3.5 text-[15px] font-bold text-black transition-opacity disabled:opacity-50"
          >
            {spinning ? "Vrti se…" : "Zavrti kolo 🎡"}
          </button>
          {error && <p className="mt-2 text-center text-[13px] text-red-400">{error}</p>}
        </div>
      )}

      {/* Rezultat */}
      {result && !spinning && (
        <div className="w-full max-w-sm rounded-2xl border border-white/10 bg-white/5 p-5 text-center">
          {result.prize === "none" ? (
            <>
              <p className="text-[15px] font-semibold text-white">Ovaj put ništa 😕</p>
              <p className="mt-1 text-[13px] text-white/60">
                Svaka narudžba od 60 € donosi novu vrtnju.
              </p>
            </>
          ) : result.prize === "respin" ? (
            <>
              <p className="text-[15px] font-semibold text-accent">Ponovno okretanje! 🔄</p>
              <p className="mt-1 text-[13px] text-white/60">Imaš još {result.left} vrtnji — zavrti opet.</p>
            </>
          ) : (
            <>
              <p className="text-[13px] text-white/60">Osvojio si</p>
              <p className="mt-1 text-[22px] font-extrabold text-accent">{result.label}</p>
              {result.code && (
                <>
                  <p className="mt-3 text-[13px] text-white/60">Tvoja šifra (vrijedi 48 h):</p>
                  <p className="mt-1 select-all font-mono text-[20px] font-bold tracking-wider text-white">{result.code}</p>
                  <div className="mt-4 flex gap-2">
                    <button type="button" onClick={useCode} className="flex-1 rounded-xl bg-accent px-4 py-3 text-[14px] font-bold text-black">
                      Iskoristi odmah
                    </button>
                    <button type="button" onClick={copyCode} className="rounded-xl border border-white/20 px-4 py-3 text-[14px] font-semibold text-white">
                      {copied ? "Kopirano ✓" : "Kopiraj"}
                    </button>
                  </div>
                </>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
