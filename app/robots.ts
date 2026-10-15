import type { MetadataRoute } from "next";

import { SITE_URL } from "@/lib/site";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      // Admin i skočni prozor nisu za tražilice. /api/ se NE blokira u cijelosti:
      // Google Merchant i Meta čitaju feedove s /api/google-feed i /api/facebook-feed.
      disallow: ["/admin", "/api/social-proof"]
    },
    host: SITE_URL,
    sitemap: `${SITE_URL}/sitemap.xml`
  };
}
