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

  // If user already has a locale cookie, respect it
  const existingLocale = request.cookies.get(LOCALE_COOKIE)?.value as Locale | undefined;
  if (existingLocale === "hr" || existingLocale === "en") {
    return NextResponse.next();
  }

  // Auto-detect from Vercel's geo header — default to HR if no header (dev / unknown)
  const country = request.headers.get("x-vercel-ip-country");
  const locale: Locale = !country || HR_COUNTRIES.has(country) ? "hr" : "en";

  const response = NextResponse.next();
  response.cookies.set(LOCALE_COOKIE, locale, {
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
    sameSite: "lax",
  });

  return response;
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
