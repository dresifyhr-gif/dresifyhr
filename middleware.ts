import { clerkMiddleware } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

import { LOCALE_COOKIE, HR_COUNTRIES, type Locale } from "@/lib/i18n";

// Clerk omotava postojeću logiku (host + jezik). Ne štiti rute ovdje — /racun se
// štiti u samoj stranici (redirect na /prijava ako korisnik nije prijavljen).
export default clerkMiddleware((auth, request) => {
  // API rute: Clerk kontekst je već postavljen (da auth() radi u /api/orders),
  // ali host/locale logika im ne treba — preskoči.
  if (request.nextUrl.pathname.startsWith("/api")) return NextResponse.next();

  // Canonicalize host: redirect www.dresifyshop.com -> dresifyshop.com so the
  // same content isn't served on two hostnames (which confuses indexing).
  const host = request.headers.get("host");
  if (host && host.startsWith("www.")) {
    const url = request.nextUrl.clone();
    url.host = host.slice(4);
    return NextResponse.redirect(url, 308);
  }

  // Botovi (Google, Bing, pregledi linkova) uvijek dobivaju HR i NE dobivaju kolačić:
  // bez kolačića layout iscrtava HR — isto što vidi svaki posjetitelj iz HR (nije cloaking).
  // Inače bi Googlebot s američke IP adrese dobio dresify_locale=en i engleski sadržaj.
  const ua = request.headers.get("user-agent") ?? "";
  if (/bot|crawl|spider|slurp|Googlebot|Google-InspectionTool|Storebot-Google|GoogleOther|AdsBot-Google|Mediapartners-Google|bingbot|facebookexternalhit|WhatsApp|Twitterbot|Slackbot|TelegramBot|LinkedInBot/i.test(ua)) {
    return NextResponse.next();
  }

  // If user already has a locale cookie, respect it
  const existingLocale = request.cookies.get(LOCALE_COOKIE)?.value as Locale | undefined;
  if (existingLocale === "hr" || existingLocale === "en") {
    return NextResponse.next();
  }

  // Bez automatskog engleskog po državi: svi dobivaju HR dok sami ne odaberu EN
  // (prekidač HR/EN postavlja kolačić). Jedna jezična verzija po URL-u = čišći SEO.
  return NextResponse.next();
});

export const config = {
  matcher: [
    /*
     * Match all paths except:
     * - _next/static (static files)
     * - _next/image (image optimisation)
     * - favicon.svg / og images / public assets
     * - API routes
     */
    "/((?!_next/static|_next/image|favicon|og-|api/).*)",
    // Uključi API rute da Clerk auth() radi u njima (npr. /api/orders za prijavljene).
    "/(api)(.*)",
  ],
};
