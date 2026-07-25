"use client";

import { usePathname } from "next/navigation";
import { GoogleAnalytics } from "@next/third-parties/google";

// GA ne smije brojati admin. Inače Gazdino svakodnevno klikanje po /admin ulazi u
// statistiku (bounce, posjete, "najgledanije") i kvari brojke stvarnih kupaca —
// zato je "Narudžbe — Dresify Admin" ispadalo među najgledanijim stranicama.
export function SiteGoogleAnalytics({ gaId }: { gaId: string }) {
  const pathname = usePathname();
  if (pathname?.startsWith("/admin")) return null;
  return <GoogleAnalytics gaId={gaId} />;
}
