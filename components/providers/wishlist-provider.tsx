"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { useAuth } from "@clerk/nextjs";

type Item = { slug: string; klub?: string; igrac?: string };
type Ctx = {
  has: (slug: string) => boolean;
  toggle: (item: Item) => void;
  /** Slugovi omiljenih (redoslijed nije bitan). */
  slugs: string[];
  /** Broj omiljenih (za značku u donjoj navigaciji). */
  count: number;
  /** Lista je učitana (sa servera ili, za gosta, s uređaja). */
  ready: boolean;
  signedIn: boolean;
};

const WishlistCtx = createContext<Ctx>({ has: () => false, toggle: () => {}, slugs: [], count: 0, ready: false, signedIn: false });
export const useWishlist = () => useContext(WishlistCtx);

const LOCAL_KEY = "dresify_wishlist";
function readLocal(): Item[] {
  try {
    const v = JSON.parse(window.localStorage.getItem(LOCAL_KEY) || "[]");
    return Array.isArray(v) ? v.filter((i) => i && typeof i.slug === "string") : [];
  } catch { return []; }
}
function writeLocal(list: Item[]) {
  try { window.localStorage.setItem(LOCAL_KEY, JSON.stringify(list)); } catch {}
}

export function WishlistProvider({ children }: { children: ReactNode }) {
  const { isLoaded, isSignedIn } = useAuth();
  const [slugs, setSlugs] = useState<Set<string>>(new Set());
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!isLoaded) return;
    // Gost: favoriti se čuvaju samo na ovom uređaju.
    if (!isSignedIn) { setSlugs(new Set(readLocal().map((i) => i.slug))); setReady(true); return; }
    let alive = true;
    fetch("/api/account/wishlist/")
      .then((r) => r.json())
      // `ready` samo kad je popis stvarno stigao — inače bi /favoriti nakon greške
      // filtrirao sve kartice i pokazao "Još nemaš omiljenih dresova".
      .then(async (d) => {
        if (!alive || !d?.ok) return;
        const server = new Set(d.slugs as string[]);
        // Prijava nakon spremanja kao gost → prenesi lokalne favorite na račun.
        const pending = readLocal().filter((i) => !server.has(i.slug));
        for (const item of pending) {
          try {
            const r = await fetch("/api/account/wishlist/", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(item) }).then((x) => x.json());
            if (r?.inWishlist) server.add(item.slug);
          } catch {}
        }
        writeLocal([]);
        if (alive) { setSlugs(server); setReady(true); }
      })
      .catch(() => {});
    return () => { alive = false; };
  }, [isLoaded, isSignedIn]);

  const has = useCallback((slug: string) => slugs.has(slug), [slugs]);

  const toggle = useCallback(
    async (item: Item) => {
      if (!isSignedIn) {
        const list = readLocal();
        const exists = list.some((i) => i.slug === item.slug);
        const next = exists ? list.filter((i) => i.slug !== item.slug) : [{ slug: item.slug, klub: item.klub, igrac: item.igrac }, ...list].slice(0, 100);
        writeLocal(next);
        setSlugs(new Set(next.map((i) => i.slug)));
        return;
      }
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
    [isSignedIn]
  );

  const value = useMemo(
    () => ({ has, toggle, slugs: Array.from(slugs), count: slugs.size, ready, signedIn: !!isSignedIn }),
    [has, toggle, slugs, ready, isSignedIn]
  );

  return <WishlistCtx.Provider value={value}>{children}</WishlistCtx.Provider>;
}
