import type { Metadata, Viewport } from "next";
import { christmasSeasonOpen, currentSeasonDeadline } from "@/lib/christmas";
import { ClerkProvider } from "@clerk/nextjs";
import { hrHR } from "@clerk/localizations";
import { Barlow, Bebas_Neue } from "next/font/google";
import { cookies } from "next/headers";

import { LanguageProvider } from "@/contexts/language-context";
import { ShopSettingsProvider } from "@/contexts/shop-settings-context";
import { getSettings } from "@/lib/settings";
import { LOCALE_COOKIE, type Locale } from "@/lib/i18n";

import "@/app/globals.css";

import { MetaPixel } from "@/components/analytics/meta-pixel";
import { SiteGoogleAnalytics } from "@/components/analytics/google-analytics";
import { SiteProviders } from "@/components/providers/site-providers";
import { WishlistProvider } from "@/components/providers/wishlist-provider";
import { AddToCartModal } from "@/components/site/add-to-cart-modal";
import { AnnouncementBar } from "@/components/site/announcement-bar";
import { BottomNav } from "@/components/site/bottom-nav";
import { CartDrawer } from "@/components/site/cart-drawer";
import { ContentProtection } from "@/components/site/content-protection";
import { ChatWidget } from "@/components/site/chat-widget";
import { Footer } from "@/components/site/footer";
import { CookieNotice } from "@/components/site/cookie-notice";
import { Navbar } from "@/components/site/navbar";
import { SocialProof } from "@/components/site/social-proof";
import { PromoCapture } from "@/components/site/promo-capture";
import { SiteChrome } from "@/components/site/site-chrome";
import { buildOrganizationSchema, buildWebsiteSchema, defaultMetadata } from "@/lib/seo";
import { SITE_DESCRIPTION, SITE_NAME, SITE_URL } from "@/lib/site";

const bebas = Bebas_Neue({
  weight: "400",
  // latin-ext: hrvatski č/ć/š/ž/đ — inače se ti glifovi učitavaju naknadno.
  subsets: ["latin", "latin-ext"],
  variable: "--font-bebas"
});

const barlow = Barlow({
  subsets: ["latin", "latin-ext"],
  // Bez preloada: s latin-ext bi Barlow (4 težine × 2 podskupa) preloadao 8 datoteka.
  // display:swap drži tekst vidljivim; preloada se samo Bebas (naslovi iznad pregiba).
  preload: false,
  weight: ["400", "500", "600", "700"],
  variable: "--font-barlow"
});

// Bez alternates iz defaultMetadata: inače svaka stranica bez vlastitih metapodataka
// (404, /prijava, /kontakt…) naslijedi canonical na naslovnicu. Naslovnica ga
// postavlja sama (app/page.tsx → buildMetadata path "/").
const { alternates: _omitAlternates, ...baseMeta } = defaultMetadata;

export const metadata: Metadata = {
  ...baseMeta,
  metadataBase: new URL(SITE_URL),
  applicationName: SITE_NAME,
  title: {
    default: `${SITE_NAME} | Premium nogometni dresovi`,
    template: `%s | ${SITE_NAME}`
  },
  description: SITE_DESCRIPTION,
  keywords: [
    "dresovi",
    "nogometni dresovi",
    "dresovi hrvatska",
    "kupiti dresove online",
    "football dresovi",
    "dresovi za odrasle",
    "dječji dresovi",
    "dječji nogometni dresovi",
    "hrvatski dresovi",
    "retro dresovi",
    "Dresify",
    "nogometni dresovi Hrvatska"
  ],
  verification: {
    google: "eGjKM--fK6RTerhFtL_stwZKLX1PzO0jmobsShbUq9g"
  },
  icons: {
    icon: [
      { url: "/favicon.png", type: "image/png", sizes: "512x512" },
      { url: "/favicon.svg", type: "image/svg+xml" }
    ],
    apple: "/apple-icon.png"
  }
};

// viewport-fit=cover: bez toga iOS Safari vraća 0 za env(safe-area-inset-bottom),
// pa donja navigacija i trake sjede na crti za povratak na početni zaslon.
export const viewport: Viewport = {
  viewportFit: "cover",
  themeColor: "#0a0a0a"
};

export default async function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  const organizationSchema = buildOrganizationSchema();
  const websiteSchema = buildWebsiteSchema();

  // Javne postavke (WhatsApp, Instagram, kontakt) → klijentskim komponentama
  // kroz context, bez dodatnog mrežnog zahtjeva.
  const s = await getSettings();
  const publicSettings = {
    whatsappNumber: s.whatsappNumber,
    instagramHandle: s.instagramHandle,
    businessName: s.businessName,
    contactPhone: s.contactPhone,
    contactEmail: s.contactEmail,
    announcementActive: s.announcementActive,
    announcementText: s.announcementText,
    heroTitle: s.heroTitle,
    heroSubtitle: s.heroSubtitle,
    // Sama se gasi 27.12. (godina iz roka narudžbe), da nitko ne mora pamtiti.
    christmasOn: (s.christmasActive || (process.env.NODE_ENV !== "production" && process.env.XMAS_PREVIEW === "1")) && christmasSeasonOpen(),
    christmasDeadline: currentSeasonDeadline(s.christmasDeadline)
  };

  const cookieStore = await cookies();
  const rawLocale = cookieStore.get(LOCALE_COOKIE)?.value;
  const locale: Locale = rawLocale === "en" ? "en" : "hr";

  return (
    <ClerkProvider localization={hrHR} signInUrl="/prijava" signUpUrl="/registracija" signInFallbackRedirectUrl="/racun" signUpFallbackRedirectUrl="/racun">
    <html lang={locale} suppressHydrationWarning>
      <body className={`${bebas.variable} ${barlow.variable}`}>
        {/* Donja navigacija (mobitel): oznaka na <html> prije prvog iscrtavanja, da plutajući
            gumb i razmak na dnu ne "skoče" nakon učitavanja. Popis mora odgovarati
            HIDDEN_PREFIXES u components/site/bottom-nav.tsx (ona ga dalje drži u skladu). */}
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var p=location.pathname.replace(/\\/$/,"")||"/";var h=["/dres/","/kosarica","/checkout","/zahvala","/admin","/prijava","/registracija"];for(var i=0;i<h.length;i++){var x=h[i];if(x.slice(-1)==="/"?p.indexOf(x)===0:(p===x||p.indexOf(x+"/")===0))return}document.documentElement.setAttribute("data-bnav","1")}catch(e){}})();`
          }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationSchema) }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteSchema) }}
        />
        <ShopSettingsProvider value={publicSettings}>
        <LanguageProvider initialLocale={locale}>
          <SiteProviders>
            <WishlistProvider>
            <SiteChrome
              header={
                <>
                  <AnnouncementBar />
                  <Navbar />
                </>
              }
              footer={
                <>
                  <Footer />
                  <BottomNav />
                  <CartDrawer />
                  <SocialProof />
                  <AddToCartModal />
                  <ContentProtection />
                  <ChatWidget />
                  <PromoCapture />
                </>
              }
            >
              {children}
            </SiteChrome>
            </WishlistProvider>
          </SiteProviders>
        </LanguageProvider>
        </ShopSettingsProvider>
        <MetaPixel />
        {/* Omotač samo kao CSS kuka: globals.css diže obavijest iznad donje navigacije. */}
        <div className="cookie-slot">
          <CookieNotice />
        </div>
      </body>
      <SiteGoogleAnalytics gaId="G-NKPLWRWPN9" />
    </html>
    </ClerkProvider>
  );
}
