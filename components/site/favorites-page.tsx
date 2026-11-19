"use client";

import { useEffect, useMemo, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Heart } from "lucide-react";

import { useWishlist } from "@/components/providers/wishlist-provider";
import { ProductCard } from "@/components/site/product-card";
import type { Jersey } from "@/lib/data/jerseys";
import { NOVI_FLAG } from "@/components/novi/flag";

// 1 dres, 2–4 dresa, 5+ dresova (11–14 uvijek "dresova").
function dresLabel(n: number): string {
  const m10 = n % 10;
  const m100 = n % 100;
  if (m10 === 1 && m100 !== 11) return `${n} dres`;
  if (m10 >= 2 && m10 <= 4 && (m100 < 12 || m100 > 14)) return `${n} dresa`;
  return `${n} dresova`;
}

export function FavoritesPage({ signedIn, products }: { signedIn: boolean; products: Jersey[] }) {
  const router = useRouter();
  const { has, slugs, ready } = useWishlist();

  // Srce maknuto ovdje → kartica odmah nestaje (bez ponovnog učitavanja).
  // Gost dobiva cijeli katalog → prije učitavanja s uređaja ne prikazuj ništa.
  const visible = useMemo(
    () => (ready ? products.filter((p) => has(p.slug)) : signedIn ? products : []),
    [ready, products, has, signedIn]
  );

  // Dodan novi favorit u međuvremenu (npr. Next je stranicu vratio iz klijentskog keša) → osvježi jednom.
  const refreshedFor = useRef("");
  useEffect(() => {
    if (!ready || !signedIn) return;
    const known = new Set(products.map((p) => p.slug));
    const missing = slugs.filter((s) => !known.has(s)).sort().join(",");
    if (missing && refreshedFor.current !== missing) {
      refreshedFor.current = missing;
      router.refresh();
    }
  }, [ready, signedIn, slugs, products, router]);

  return (
    <section className="bg-[#0a0a0a] py-6 sm:py-8 lg:py-10">
      <div className="mx-auto w-full max-w-[1620px] px-3 sm:px-6 lg:px-10">
        <div className="mb-5 flex items-end justify-between gap-3 sm:mb-7">
          <div className="min-w-0">
            <h1 className="font-heading text-[2.4rem] uppercase leading-none text-white sm:text-5xl">Favoriti</h1>
            {visible.length > 0 ? (
              <p className="mt-1.5 text-[13px] text-white/50">{dresLabel(visible.length)}</p>
            ) : null}
          </div>
        </div>

        {!ready && !signedIn ? (
          <div className="min-h-[320px]" />
        ) : visible.length === 0 ? (
          <EmptyState
            title="Još nemaš omiljenih dresova"
            text="Dodirni srce na dresu i spremit ćemo ga ovdje za kasnije."
            primary={{ href: "/dresovi/", label: "Pogledaj dresove" }}
          />
        ) : (
          <div className="grid grid-cols-2 gap-3 md:gap-4 lg:grid-cols-3 xl:grid-cols-4">
            {visible.map((p, i) => (
              <div key={p.slug} className="min-w-0">
                <ProductCard product={p} priority={i < 4} />
              </div>
            ))}
          </div>
        )}
        {!signedIn && visible.length > 0 ? (
          <p className="mt-6 text-center text-[13px] text-white/45">
            Favoriti su spremljeni na ovom uređaju.{" "}
            <Link href="/prijava/" className="text-accent underline underline-offset-4">Prijavi se</Link> da ih imaš svugdje.
          </p>
        ) : null}
      </div>
    </section>
  );
}

function EmptyState({
  title,
  text,
  primary,
  secondary
}: {
  title: string;
  text: string;
  primary: { href: string; label: string };
  secondary?: { href: string; label: string };
}) {
  return (
    <div className={NOVI_FLAG ? "flex flex-col items-center border-y border-white/10 px-6 py-14 text-center sm:py-20" : "flex flex-col items-center rounded-[16px] border border-white/10 bg-[#111] px-6 py-12 text-center sm:py-16"}>
      <span className={NOVI_FLAG ? "flex items-center justify-center text-white/40" : "flex h-14 w-14 items-center justify-center rounded-full border border-accent/30 bg-accent/10 text-accent"}>
        <Heart strokeWidth={1.5} className="h-6 w-6" />
      </span>
      <h2 className="mt-5 font-heading text-[1.75rem] uppercase leading-none text-white sm:text-3xl">{title}</h2>
      <p className="mt-2 max-w-sm text-sm leading-6 text-white/55">{text}</p>
      <div className="mt-6 flex w-full max-w-xs flex-col gap-2.5">
        <Link href={primary.href} className="button-primary w-full">
          {primary.label}
        </Link>
        {secondary ? (
          <Link href={secondary.href} className="button-secondary w-full">
            {secondary.label}
          </Link>
        ) : null}
      </div>
    </div>
  );
}
