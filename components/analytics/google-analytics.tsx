"use client";

import Script from "next/script";
import { usePathname } from "next/navigation";

// GA ne smije brojati admin. Inače Gazdino svakodnevno klikanje po /admin ulazi u
// statistiku (bounce, posjete, "najgledanije") i kvari brojke stvarnih kupaca —
// zato je "Narudžbe — Dresify Admin" ispadalo među najgledanijim stranicama.
//
// Bez <GoogleAnalytics> iz @next/third-parties: on u <head> stavlja preload za gtag/js
// (visok prioritet, natječe se s CSS-om/fontovima/hero slikom na mobitelu). Ovdje se
// dataLayer + config postave odmah (sitni inline kod), a sam gtag.js učita se tek kad
// je stranica gotova (lazyOnload) i pokupi sve iz reda. Isti mjerni ID, isti dataLayer.
export function SiteGoogleAnalytics({ gaId }: { gaId: string }) {
  const pathname = usePathname();
  if (pathname?.startsWith("/admin")) return null;
  return (
    <>
      <Script id="ga-init" strategy="afterInteractive">
        {`window.dataLayer=window.dataLayer||[];function gtag(){window.dataLayer.push(arguments);}window.gtag=window.gtag||gtag;gtag('js',new Date());gtag('config','${gaId}');`}
      </Script>
      <Script id="ga-src" src={`https://www.googletagmanager.com/gtag/js?id=${gaId}`} strategy="lazyOnload" />
    </>
  );
}
