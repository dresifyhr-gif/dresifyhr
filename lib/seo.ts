import type { Metadata } from "next";

import type { BlogPost } from "@/lib/data/blog-posts";
import { isPurchasable, type Jersey } from "@/lib/data/jerseys";
import { getJerseyGallery } from "@/lib/data/jersey-media";
import { productTypeCategory, productTypeDescription } from "@/lib/product-type";
import { absoluteUrl, repairText } from "@/lib/utils";
import {
  CONTACT_EMAIL,
  CONTACT_PHONE_DISPLAY,
  DEFAULT_OG_IMAGE,
  DEFAULT_OG_IMAGE_SIZE,
  FACEBOOK_URL,
  INSTAGRAM_URL,
  JERSEY_PRICE_EUR,
  SHIPPING_PRICE_EUR,
  SITE_DESCRIPTION,
  SITE_NAME,
  SITE_URL
} from "@/lib/site";

const ORGANIZATION_ID = `${SITE_URL}/#organization`;
const WEBSITE_ID = `${SITE_URL}/#website`;

type MetadataInput = {
  title: string;
  description: string;
  path: string;
  image?: string;
  // Stvarne dimenzije slike — šalju se u og:image:width/height SAMO ako ih pozivatelj zna.
  imageWidth?: number;
  imageHeight?: number;
  keywords?: string[];
  noindex?: boolean; // funnel/utility stranice (košarica, checkout) — ne indeksiraj
};

type BreadcrumbItem = {
  name: string;
  path: string;
};

// og:image za ne-zadane slike ide kroz Next resizer (1200 px, q75): slike proizvoda
// iz admina su PNG-ovi od 1,5–2,5 MB, koje WhatsApp/FB često ne prikažu.
// Resizer prima samo lokalne putanje ili hostove iz next.config images.remotePatterns
// (Vercel Blob); sve ostalo ide izravno. Ne ide kroz absoluteUrl() jer bi on
// kosu crtu stavio iza query stringa.
function ogImageUrl(src: string): string {
  let path = src;
  if (path.startsWith(SITE_URL)) path = path.slice(SITE_URL.length) || "/";
  const isLocal = path.startsWith("/") && !path.startsWith("//");
  let isBlob = false;
  if (!isLocal) {
    try {
      isBlob = new URL(path).hostname.endsWith(".public.blob.vercel-storage.com");
    } catch {
      isBlob = false;
    }
  }
  if (!isLocal && !isBlob) return path;
  // "/_next/image/" s kosom crtom = isti oblik koji Next sam generira uz
  // trailingSlash: true (bez nje dev server radi 308; Vercel vraća 200 za oba).
  return `${SITE_URL}/_next/image/?url=${encodeURIComponent(path)}&w=1200&q=75`;
}

export function buildMetadata({
  title,
  description,
  path,
  image,
  imageWidth,
  imageHeight,
  keywords,
  noindex
}: MetadataInput): Metadata {
  const url = absoluteUrl(path);
  const isDefaultImage = !image || image === DEFAULT_OG_IMAGE;
  const imageUrl = isDefaultImage ? absoluteUrl(DEFAULT_OG_IMAGE) : ogImageUrl(image);
  // Dimenzije samo kad su poznate: zadani banner je točno 1200x630, za ostale
  // samo ako ih pozivatelj preda (prije je svaka slika lažno tvrdila 1200x630).
  const width = isDefaultImage ? DEFAULT_OG_IMAGE_SIZE.width : imageWidth;
  const height = isDefaultImage ? DEFAULT_OG_IMAGE_SIZE.height : imageHeight;

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
          ...(width && height ? { width, height } : {}),
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

// `_stock` se više ne koristi (zadržan radi postojećih poziva): zbroj sizeStock-a
// nije dostupnost — proizvod s praćenim XL:0/XXL:0 i dalje se kupuje u S/L.
export function buildProductSchema(product: Jersey, _stock?: number) {
  const name = `${repairText(product.klub)} ${repairText(product.igrac)}`;
  const price = product.price ?? JERSEY_PRICE_EUR;
  return {
    "@context": "https://schema.org",
    "@type": "Product",
    // Isto kao <title>, og:title, breadcrumb i feed ("Klub Igrač").
    name,
    // Stvarna cijena i vrsta proizvoda (komplet, trenirka, streetwear…).
    description: `${name} ${productTypeDescription(product)} za ${price}€. Dostava po cijeloj Hrvatskoj.`,
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
    category: productTypeCategory(product),
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
      price: String(price),
      // Ista logika kao izbornik veličina i feedovi (isPurchasable).
      availability: isPurchasable(product) ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
      url: absoluteUrl(`/dres/${product.slug}`),
      itemCondition: "https://schema.org/NewCondition",
      // GLS po cijeloj HR (/dostava-i-povrat/): slanje sljedeći radni dan, stiže 2–5
      // radnih dana od potvrde. Prag besplatne dostave (60 €) vrijedi samo za
      // registrirane, pa nije ovdje.
      shippingDetails: {
        "@type": "OfferShippingDetails",
        shippingRate: {
          "@type": "MonetaryAmount",
          value: SHIPPING_PRICE_EUR,
          currency: "EUR"
        },
        shippingDestination: {
          "@type": "DefinedRegion",
          addressCountry: "HR"
        },
        deliveryTime: {
          "@type": "ShippingDeliveryTime",
          handlingTime: {
            "@type": "QuantitativeValue",
            minValue: 0,
            maxValue: 1,
            unitCode: "DAY"
          },
          transitTime: {
            "@type": "QuantitativeValue",
            minValue: 1,
            maxValue: 4,
            unitCode: "DAY"
          }
        }
      }
    }
  };
}

export function buildOrganizationSchema() {
  return {
    "@context": "https://schema.org",
    "@type": ["Organization", "OnlineStore"],
    "@id": ORGANIZATION_ID,
    name: SITE_NAME,
    url: SITE_URL,
    // Raster 512x512 (Google traži min. 112x112; favicon.svg je bio 64px s tekstom).
    logo: {
      "@type": "ImageObject",
      url: absoluteUrl("/icons/icon-512.png"),
      width: 512,
      height: 512
    },
    description: SITE_DESCRIPTION,
    // Samo profili (wa.me je link za chat, ne profil).
    sameAs: [INSTAGRAM_URL, FACEBOOK_URL],
    contactPoint: [
      {
        "@type": "ContactPoint",
        telephone: CONTACT_PHONE_DISPLAY,
        email: CONTACT_EMAIL,
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
    "@id": WEBSITE_ID,
    name: SITE_NAME,
    alternateName: ["Dresify", "dresifyshop.com"],
    url: SITE_URL,
    description: SITE_DESCRIPTION,
    inLanguage: "hr-HR",
    publisher: { "@id": ORGANIZATION_ID }
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
    "@type": "BlogPosting",
    headline: post.title,
    description: post.description,
    author: {
      "@type": "Organization",
      name: SITE_NAME,
      url: SITE_URL
    },
    publisher: { "@id": ORGANIZATION_ID },
    datePublished: post.publishedAt,
    dateModified: post.updatedAt ?? post.publishedAt,
    mainEntityOfPage: absoluteUrl(`/blog/${post.slug}`),
    image: [absoluteUrl(post.image ?? DEFAULT_OG_IMAGE)]
  };
}

export const defaultMetadata = buildMetadata({
  title: `${SITE_NAME} | ${SITE_DESCRIPTION}`,
  description: SITE_DESCRIPTION,
  path: "/"
});
