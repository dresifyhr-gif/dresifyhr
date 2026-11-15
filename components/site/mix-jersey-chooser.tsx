"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";

export type MixJersey = { slug: string; klub: string; igrac: string; price: number; image?: string; kind?: "dres" | "trenirka" };

// Korak 1 na /slozi-mix: pretraži i odaberi dres → stranica dresa s otvorenim mixom.
export function MixJerseyChooser({ jerseys }: { jerseys: MixJersey[] }) {
  const [q, setQ] = useState("");
  const list = useMemo(() => {
    const t = q.trim().toLowerCase();
    const hit = t ? jerseys.filter((j) => `${j.klub} ${j.igrac}`.toLowerCase().includes(t)) : jerseys;
    return hit.slice(0, 60);
  }, [q, jerseys]);

  return (
    <div>
      <input
        type="search"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Traži klub ili igrača (npr. Real, Messi, Hrvatska)…"
        className="w-full rounded-[10px] border border-white/15 bg-[#0d0d0d] px-4 py-3.5 text-base text-white placeholder:text-white/35 focus:border-accent focus:outline-none"
      />
      <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {list.map((j) => (
          <Link
            key={j.slug}
            href={`/dres/${j.slug}?mix=1`}
            className="group overflow-hidden rounded-[12px] border border-white/10 bg-[#0d0d0d] transition hover:border-accent"
          >
            <div className="relative aspect-square bg-[#fbfbfb]">
              {j.image && <Image src={j.image} alt={`${j.klub} ${j.igrac}`} fill sizes="(max-width: 640px) 50vw, 25vw" className="object-contain p-2" />}
            </div>
            <div className="p-3">
              <p className="truncate text-xs uppercase tracking-wide text-white/50">{j.klub}</p>
              <p className="truncate text-sm font-semibold text-white">{j.igrac}</p>
              <p className="mt-1 text-xs text-accent">Mix {j.price + 10}–{j.price + 20} € · {j.kind === "trenirka" ? "trenirka" : "dres"} {j.price} €</p>
            </div>
          </Link>
        ))}
      </div>
      {!list.length && <p className="mt-6 text-center text-white/50">Nema rezultata — probaj drugi naziv.</p>}
    </div>
  );
}
