import type { Metadata } from "next";
import { Barlow, Bebas_Neue } from "next/font/google";
import { GoogleAnalytics } from "@next/third-parties/google";
import { cookies } from "next/headers";

import { LanguageProvider } from "@/contexts/language-context";
import { ShopSettingsProvider } from "@/contexts/shop-settings-context";
import { getSettings } from "@/lib/settings";
import { LOCALE_COOKIE, type Locale } from "@/lib/i18n";

import "@/app/globals.css";

import { MetaPixel } from "@/components/analytics/meta-pixel";
import { SiteProviders } from "@/components/providers/site-providers";
import { AddToCartModal } from "@/components/site/add-to-cart-modal";
import { AnnouncementBar } from "@/components/site/announcement-bar";
import { CartDrawer } from "@/components/site/cart-drawer";
import { ContentProtection } from "@/components/site/content-protection";
import { ChatWidget } from "@/components/site/chat-widget";
import { Footer } from "@/components/site/footer";
import { Navbar } from "@/components/site/navbar";
import { SocialProof } from "@/components/site/social-proof";
import { PromoCapture } from "@/components/site/promo-capture";
import { SiteChrome } from "@/components/site/site-chrome";
import { buildOrganizationSchema, buildWebsiteSchema, defaultMetadata } from "@/lib/seo";
import { SITE_DESCRIPTION, SITE_NAME, SITE_URL } from "@/lib/site";

const bebas = Bebas_Neue({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-bebas"
});

const barlow = Barlow({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-barlow"
});

export const metadata: Metadata = {
  ...defaultMetadata,
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
    icon: "/favicon.svg"
  }
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
    heroSubtitle: s.heroSubtitle
  };

  const cookieStore = await cookies();
  const rawLocale = cookieStore.get(LOCALE_COOKIE)?.value;
  const locale: Locale = rawLocale === "en" ? "en" : "hr";

  return (
    <html lang={locale} suppressHydrationWarning>
      <body className={`${bebas.variable} ${barlow.variable}`}>
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
          </SiteProviders>
        </LanguageProvider>
        </ShopSettingsProvider>
        <MetaPixel />
      </body>
      <GoogleAnalytics gaId="G-NKPLWRWPN9" />
    </html>
  );
}
