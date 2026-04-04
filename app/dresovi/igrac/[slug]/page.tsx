import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { CollectionLandingPage } from "@/components/site/collection-landing-page";
import {
  getFeaturedCategoryCollections,
  getFeaturedClubCollections,
  getJerseyPlayerBySlug,
  getJerseyPlayerCollections
} from "@/lib/data/seo-collections";
import { buildBreadcrumbSchema, buildItemListSchema, buildMetadata } from "@/lib/seo";

type PlayerPageProps = {
  params: {
    slug: string;
  };
};

export function generateStaticParams() {
  return getJerseyPlayerCollections().map((collection) => ({
    slug: collection.slug
  }));
}

export function generateMetadata({ params }: PlayerPageProps): Metadata {
  const collection = getJerseyPlayerBySlug(params.slug);

  if (!collection) {
    return buildMetadata({
      title: "Igrač nije pronađen",
      description: "Traženi igrački katalog nije dostupan.",
      path: `/dresovi/igrac/${params.slug}`
    });
  }

  return buildMetadata({
    title: collection.title,
    description: collection.description,
    path: collection.path,
    keywords: [collection.label.toLowerCase(), "dresovi", "nogometni dresovi"]
  });
}

export default function PlayerPage({ params }: PlayerPageProps) {
  const collection = getJerseyPlayerBySlug(params.slug);

  if (!collection) {
    notFound();
  }

  const breadcrumbSchema = buildBreadcrumbSchema([
    { name: "Početna", path: "/" },
    { name: "Dresovi", path: "/dresovi" },
    { name: collection.label, path: collection.path }
  ]);
  const itemListSchema = buildItemListSchema(collection.title, collection.path, collection.products);

  return (
    <CollectionLandingPage
      collection={collection}
      breadcrumbItems={[
        { label: "Početna", href: "/" },
        { label: "Dresovi", href: "/dresovi" },
        { label: collection.label }
      ]}
      schemas={[breadcrumbSchema, itemListSchema]}
      linkGroups={[
        {
          title: "Najtraženiji klubovi",
          description: "Otvori klubove u kojima se ovaj tip modela najčešće traži i usporedi ponudu.",
          collections: getFeaturedClubCollections(8)
        },
        {
          title: "Kupuj po kategoriji",
          description: "Skoči na retro, dječje i reprezentativne grupe koje dodatno šire long-tail pretrage.",
          collections: getFeaturedCategoryCollections()
        }
      ]}
    />
  );
}
