import type { MetadataRoute } from "next";

import { blogPosts } from "@/lib/data/blog-posts";
import {
  getJerseyCategoryCollections,
  getJerseyClubCollections,
  getJerseyPlayerCollections
} from "@/lib/data/seo-collections";
import { jerseys } from "@/lib/data/jerseys";
import { absoluteUrl } from "@/lib/utils";

export default function sitemap(): MetadataRoute.Sitemap {
  const staticRoutes = ["", "/dresovi", "/kontakt", "/blog", "/o-nama", "/dostava-i-povrat", "/igre", "/igra", "/flappy", "/gadaj"];
  const categoryRoutes = getJerseyCategoryCollections().map((collection) => collection.path);
  const clubRoutes = getJerseyClubCollections().map((collection) => collection.path);
  const playerRoutes = getJerseyPlayerCollections().map((collection) => collection.path);

  return [
    ...staticRoutes.map((route) => ({
      url: absoluteUrl(route || "/"),
      changeFrequency: "weekly" as const,
      priority: route === "" ? 1 : 0.85
    })),
    ...categoryRoutes.map((route) => ({
      url: absoluteUrl(route),
      changeFrequency: "weekly" as const,
      priority: 0.82
    })),
    ...clubRoutes.map((route) => ({
      url: absoluteUrl(route),
      changeFrequency: "weekly" as const,
      priority: 0.8
    })),
    ...playerRoutes.map((route) => ({
      url: absoluteUrl(route),
      changeFrequency: "weekly" as const,
      priority: 0.78
    })),
    ...jerseys.map((product) => ({
      url: absoluteUrl(`/dres/${product.slug}`),
      changeFrequency: "weekly" as const,
      priority: 0.7
    })),
    ...blogPosts.map((post) => ({
      url: absoluteUrl(`/blog/${post.slug}`),
      changeFrequency: "monthly" as const,
      priority: 0.62
    }))
  ];
}
