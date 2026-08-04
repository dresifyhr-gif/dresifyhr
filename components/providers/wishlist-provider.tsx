"use client";

import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import { useAuth } from "@clerk/nextjs";
import { useRouter } from "next/navigation";

type Item = { slug: string; klub?: string; igrac?: string };
type Ctx = { has: (slug: string) => boolean; toggle: (item: Item) => void };

const WishlistCtx = createContext<Ctx>({ has: () => false, toggle: () => {} });
export const useWishlist = () => useContext(WishlistCtx);

export function WishlistProvider({ children }: { children: ReactNode }) {
  const { isSignedIn } = useAuth();
  const router = useRouter();
  const [slugs, setSlugs] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!isSignedIn) { setSlugs(new Set()); return; }
    fetch("/api/account/wishlist/")
      .then((r) => r.json())
      .then((d) => { if (d?.ok) setSlugs(new Set(d.slugs as string[])); })
      .catch(() => {});
  }, [isSignedIn]);

  const has = useCallback((slug: string) => slugs.has(slug), [slugs]);

  const toggle = useCallback(
    async (item: Item) => {
      if (!isSignedIn) { router.push("/prijava"); return; }
      // Optimistično prebaci, pa uskladi sa serverom.
      setSlugs((prev) => { const n = new Set(prev); n.has(item.slug) ? n.delete(item.slug) : n.add(item.slug); return n; });
      try {
        const r = await fetch("/api/account/wishlist/", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(item)
        }).then((x) => x.json());
        if (r && typeof r.inWishlist === "boolean") {
          setSlugs((prev) => { const n = new Set(prev); r.inWishlist ? n.add(item.slug) : n.delete(item.slug); return n; });
        }
      } catch {}
    },
    [isSignedIn, router]
  );

  return <WishlistCtx.Provider value={{ has, toggle }}>{children}</WishlistCtx.Provider>;
}
