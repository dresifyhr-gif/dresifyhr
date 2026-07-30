"use client";

import { useEffect, useState } from "react";

type Who = "igor" | "ivica";
type Sender = { name: string; address: string; city: string };
type Senders = Record<Who, Sender>;

const DEFAULT_SENDERS: Senders = {
  igor: { name: "Igor Katanić", address: "Dubljevička ulica 91", city: "10040 Zagreb" },
  ivica: { name: "Ivica Karamatić", address: "Katoro 54", city: "52470 Umag" }
};

// Sender block on the shipping label — pick Igor or Ivica (different addresses).
// Remembers the choice per device (Ivica's phone/PC defaults to Ivica).
// Podaci pošiljatelja dolaze iz Postavki (prop); fallback na zadane.
export function LabelSender({ defaultSender, senders }: { defaultSender?: Who; senders?: Senders }) {
  const SENDERS = senders ?? DEFAULT_SENDERS;
  const [who, setWho] = useState<Who>(defaultSender ?? "igor");

  useEffect(() => {
    if (defaultSender) return;
    const saved = typeof window !== "undefined" ? localStorage.getItem("dresify-sender") : null;
    if (saved === "igor" || saved === "ivica") setWho(saved);
  }, [defaultSender]);

  function pick(w: Who) {
    setWho(w);
    try { localStorage.setItem("dresify-sender", w); } catch { /* ignore */ }
  }

  const s = SENDERS[who];

  return (
    <>
      <div className="no-print mb-2 flex gap-1.5">
        <button type="button" onClick={() => pick("igor")} className={`rounded-[10px] px-2.5 py-1 text-[11px] font-semibold ${who === "igor" ? "bg-[var(--a-text)] text-[var(--a-card)]" : "border border-[var(--a-line)] text-[var(--a-text-2)]"}`}>Igor šalje</button>
        <button type="button" onClick={() => pick("ivica")} className={`rounded-[10px] px-2.5 py-1 text-[11px] font-semibold ${who === "ivica" ? "bg-[var(--a-text)] text-[var(--a-card)]" : "border border-[var(--a-line)] text-[var(--a-text-2)]"}`}>Ivica šalje</button>
      </div>
      <div className="text-[12px] font-bold uppercase tracking-wider text-black/60">Šalje</div>
      <div className="mt-0.5 text-[17px] leading-6">
        <div className="font-bold">{s.name}</div>
        <div>{s.address}</div>
        <div>{s.city}</div>
      </div>
    </>
  );
}
