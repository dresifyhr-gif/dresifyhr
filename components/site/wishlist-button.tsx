"use client";

import { Heart } from "lucide-react";

import { useWishlist } from "@/components/providers/wishlist-provider";

// Gumb je 40×40 (dovoljno za prst), a vidljivi krug unutra je manji i tiši.
export function WishlistButton({ slug, klub, igrac, className = "" }: { slug: string; klub?: string; igrac?: string; className?: string }) {
  const { has, toggle } = useWishlist();
  const active = has(slug);
  return (
    <button
      type="button"
      aria-label={active ? "Ukloni iz favorita" : "Dodaj u favorite"}
      aria-pressed={active}
      title={active ? "Ukloni iz favorita" : "Dodaj u favorite"}
      onClick={(e) => { e.preventDefault(); e.stopPropagation(); toggle({ slug, klub, igrac }); }}
      className={`group/wish inline-flex h-10 w-10 items-center justify-center ${className}`}
    >
      <span className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-white/10 bg-black/60 transition group-hover/wish:border-accent/50">
        <Heart strokeWidth={1.75} className={`h-4 w-4 transition ${active ? "fill-accent text-accent" : "text-white"}`} />
      </span>
    </button>
  );
}
