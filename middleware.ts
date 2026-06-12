import { NextResponse, type NextRequest } from "next/server";

import { LOCALE_COOKIE, HR_COUNTRIES, type Locale } from "@/lib/i18n";

export function middleware(request: NextRequest) {
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
}

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
  ],
};
