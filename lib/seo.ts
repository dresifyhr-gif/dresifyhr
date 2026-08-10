import type { Metadata } from "next";

import type { BlogPost } from "@/lib/data/blog-posts";
import type { Jersey } from "@/lib/data/jerseys";
import { getJerseyGallery } from "@/lib/data/jersey-media";
import { absoluteUrl } from "@/lib/utils";
import {
  CONTACT_PHONE_DISPLAY,
  CURRENCY_LABEL,
  DEFAULT_OG_IMAGE,
  INSTAGRAM_URL,
  SITE_DESCRIPTION,
  SITE_NAME,
  SITE_URL,
  WHATSAPP_URL
} from "@/lib/site";

type MetadataInput = {
  title: string;
  description: string;
  path: string;
  image?: string;
  keywords?: string[];
  noindex?: boolean; // funnel/utility stranice (košarica, checkout) — ne indeksiraj
};

type BreadcrumbItem = {
  name: string;
  path: string;
};

export function buildMetadata({
  title,
  description,
  path,
  image = DEFAULT_OG_IMAGE,
  keywords,
  noindex
}: MetadataInput): Metadata {
  const url = absoluteUrl(path);
  const imageUrl = absoluteUrl(image);

  return {
    title,
    description,
    ...(noindex ? { robots: { index: false, follow: true } } : {}),
    alternates: {
      canonical: url
    },
    openGraph: {
      title,
      description,
      url,
      siteName: SITE_NAME,
      locale: "hr_HR",
      type: "website",
      images: [
        {
          url: imageUrl,
          width: 1200,
          height: 630,
          alt: title
        }
      ]
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [imageUrl]
    },
    keywords
  };
}

// Slike za schema.org: prvo uređene/custom (product.images), pa statička
// galerija po slugu, pa tek onda zadana OG slika kao krajnja rezerva.
function productImages(product: Jersey): string[] {
  const fromProduct = (product.images ?? []).map((i: { src: string }) => i.src).filter(Boolean);
  const urls: string[] = fromProduct.length ? fromProduct : getJerseyGallery(product.slug).map((i) => i.src);
  const abs = urls
    .filter(Boolean)
    .map((src: string) => (src.startsWith("http") ? src : absoluteUrl(src)))
    .slice(0, 5);
  return abs.length ? abs : [absoluteUrl(DEFAULT_OG_IMAGE)];
}

// Glavna (prva) slika proizvoda, apsolutni URL — za og:image na product stranici
// da social share i Google vide PRAVU sliku proizvoda, a ne generični banner.
export function productMainImage(product: Jersey): string {
  return productImages(product)[0];
}

export function buildProductSchema(product: Jersey, stock: number) {
  return {
    "@context": "https://schema.org",
    "@type": "Product",
    name: `${product.klub} - ${product.igrac}`,
    description: `${product.klub} ${product.igrac} nogometni dres za ${CURRENCY_LABEL}. Dostava po cijeloj Hrvatskoj.`,
    // Prava slika proizvoda. Prije je ovdje bilo `/dresovi/{slug}.jpg` — putanja
    // koja NE POSTOJI (slike su u /dresovi/{slug}/front.jpg, a custom proizvodi
    // imaju URL-ove u product.images). Google je zbog 404 slike odbijao većinu
    // proizvoda za Shopping/rich rezultate.
    image: productImages(product),
    brand: {
      "@type": "Brand",
      name: SITE_NAME
    },
    sku: `DRESIFY-${product.id}`,
    category: "Nogometni dresovi",
    ...(product.rating
      ? {
          aggregateRating: {
            "@type": "AggregateRating",
            ratingValue: product.rating.value.toFixed(1),
            reviewCount: String(product.rating.count),
            bestRating: "5",
            worstRating: "1"
          }
        }
      : {}),
    offers: {
      "@type": "Offer",
      priceCurrency: "EUR",
      price: String(product.price ?? 20),
      availability: stock > 0 ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
      url: absoluteUrl(`/dres/${product.slug}`),
      itemCondition: "https://schema.org/NewCondition"
    }
  };
}

export function buildOrganizationSchema() {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: SITE_NAME,
    url: SITE_URL,
    logo: absoluteUrl("/favicon.svg"),
    description: SITE_DESCRIPTION,
    sameAs: [INSTAGRAM_URL, WHATSAPP_URL],
    contactPoint: [
      {
        "@type": "ContactPoint",
        telephone: CONTACT_PHONE_DISPLAY,
        contactType: "customer service",
        areaServed: "HR",
        availableLanguage: ["hr"]
      }
    ]
  };
}

export function buildWebsiteSchema() {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: SITE_NAME,
    url: SITE_URL,
    description: SITE_DESCRIPTION,
    inLanguage: "hr-HR"
  };
}

export function buildBreadcrumbSchema(items: BreadcrumbItem[]) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: absoluteUrl(item.path)
    }))
  };
}

export function buildItemListSchema(title: string, path: string, products: Jersey[]) {
  return {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: title,
    url: absoluteUrl(path),
    numberOfItems: products.length,
    itemListElement: products.map((product, index) => ({
      "@type": "ListItem",
      position: index + 1,
      url: absoluteUrl(`/dres/${product.slug}`),
      name: `${product.klub} ${product.igrac}`
    }))
  };
}

export function buildArticleSchema(post: BlogPost) {
  return {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: post.title,
    description: post.description,
    author: {
      "@type": "Organization",
      name: "Dresify tim"
    },
    publisher: {
      "@type": "Organization",
      name: SITE_NAME
    },
    datePublished: post.publishedAt,
    dateModified: post.publishedAt,
    mainEntityOfPage: absoluteUrl(`/blog/${post.slug}`),
    image: [absoluteUrl(DEFAULT_OG_IMAGE)]
  };
}

export const defaultMetadata = buildMetadata({
  title: `${SITE_NAME} | ${SITE_DESCRIPTION}`,
  description: SITE_DESCRIPTION,
  path: "/"
});
