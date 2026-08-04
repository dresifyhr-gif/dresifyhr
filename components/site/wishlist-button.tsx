"use client";

import { Heart } from "lucide-react";

import { useWishlist } from "@/components/providers/wishlist-provider";

export function WishlistButton({ slug, klub, igrac, className = "" }: { slug: string; klub?: string; igrac?: string; className?: string }) {
  const { has, toggle } = useWishlist();
  const active = has(slug);
  return (
    <button
      type="button"
      aria-label={active ? "Ukloni iz omiljenih" : "Dodaj u omiljene"}
      title={active ? "Ukloni iz omiljenih" : "Dodaj u omiljene"}
      onClick={(e) => { e.preventDefault(); e.stopPropagation(); toggle({ slug, klub, igrac }); }}
      className={`inline-flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-black/60 transition hover:border-accent/50 ${className}`}
    >
      <Heart className={`h-[18px] w-[18px] transition ${active ? "fill-accent text-accent" : "text-white"}`} />
    </button>
  );
}
